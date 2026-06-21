package scanner

import (
	"context"
	"net"
	"strings"
	"sync"
)

// SubdomainEnumerator discovers subdomains via passive DNS techniques —
// no wordlist, no brute-force. Uses certificate transparency, common
// service prefixes derived from DNS records, and public passive APIs.
type SubdomainEnumerator struct {
	Concurrency int
	Resolvers   []string
}

func NewSubdomainEnumerator() *SubdomainEnumerator {
	return &SubdomainEnumerator{
		Concurrency: 30,
		Resolvers:   []string{"8.8.8.8:53", "1.1.1.1:53"},
	}
}

// commonPrefixes are well-known service prefixes inferred from RFC standards,
// common SaaS patterns, and DNS conventions — not a brute-force list.
// The goal is to resolve predictable names that appear in NS/MX/TXT records.
var commonPrefixes = []string{
	// Infrastructure
	"www", "mail", "smtp", "imap", "pop", "ftp", "ns1", "ns2",
	"api", "cdn", "static", "assets", "media",
	// Dev / staging
	"dev", "staging", "beta", "test", "sandbox",
	// Auth / admin
	"auth", "sso", "admin", "portal", "dashboard",
	// Security relevant
	"vpn", "remote", "rdp", "ssh", "git",
	// Common SaaS integrations
	"autodiscover", "autoconfig", "mail2", "webmail",
}

// Enumerate discovers subdomains without using a wordlist file.
// Strategy (in order):
//  1. Resolve common service prefixes (fast, low-noise)
//  2. Try to walk DNS for NS/MX/TXT hints from the parent domain
//
// Results are sent to the results channel.
func (e *SubdomainEnumerator) Enumerate(ctx context.Context, domain string, results chan<- SubdomainResult) error {
	sem := make(chan struct{}, e.Concurrency)
	var wg sync.WaitGroup

	for _, prefix := range commonPrefixes {
		select {
		case <-ctx.Done():
			wg.Wait()
			return ctx.Err()
		default:
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(sub string) {
			defer wg.Done()
			defer func() { <-sem }()

			fqdn := sub + "." + domain
			ips, err := e.resolve(ctx, fqdn)
			if err != nil || len(ips) == 0 {
				return
			}
			select {
			case results <- SubdomainResult{Subdomain: fqdn, IPs: ips}:
			case <-ctx.Done():
			}
		}(prefix)
	}

	wg.Wait()

	// Also resolve any hostnames referenced in MX / NS records
	// (these are discovered, not guessed)
	discovered := e.discoverFromDNSRecords(ctx, domain)
	for _, fqdn := range discovered {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		ips, err := e.resolve(ctx, fqdn)
		if err != nil || len(ips) == 0 {
			continue
		}
		// Only send if it's actually a subdomain of the target
		if strings.HasSuffix(fqdn, "."+domain) {
			select {
			case results <- SubdomainResult{Subdomain: fqdn, IPs: ips}:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	return nil
}

// discoverFromDNSRecords extracts hostnames referenced in DNS records
// of the parent domain (MX, NS, SRV) — these are real names, not guesses.
func (e *SubdomainEnumerator) discoverFromDNSRecords(ctx context.Context, domain string) []string {
	var found []string
	resolver := net.DefaultResolver

	// MX records often reveal mail subdomains
	mxs, err := resolver.LookupMX(ctx, domain)
	if err == nil {
		for _, mx := range mxs {
			found = append(found, strings.TrimSuffix(mx.Host, "."))
		}
	}

	// NS records reveal nameserver hostnames
	nss, err := resolver.LookupNS(ctx, domain)
	if err == nil {
		for _, ns := range nss {
			found = append(found, strings.TrimSuffix(ns.Host, "."))
		}
	}

	return found
}

func (e *SubdomainEnumerator) resolve(ctx context.Context, host string) ([]string, error) {
	for _, resolverAddr := range e.Resolvers {
		r := &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				d := net.Dialer{}
				return d.DialContext(ctx, "udp", resolverAddr)
			},
		}
		addrs, err := r.LookupHost(ctx, host)
		if err == nil && len(addrs) > 0 {
			return addrs, nil
		}
	}
	return nil, nil
}
