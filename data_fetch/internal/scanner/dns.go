package scanner

import (
	"context"
	"fmt"
	"net"
	"strings"
)

// DNSRecord holds one DNS record finding.
type DNSRecord struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// DNSReconResult contains all passive DNS findings for a domain.
type DNSReconResult struct {
	Target      string   `json:"target"`
	ARecords    []string `json:"a_records,omitempty"`
	AAAARecords []string `json:"aaaa_records,omitempty"`
	MXRecords   []string `json:"mx_records,omitempty"`
	NSRecords   []string `json:"ns_records,omitempty"`
	TXTRecords  []string `json:"txt_records,omitempty"`
	CNAMEs      []string `json:"cnames,omitempty"`
	// Parsed security-relevant TXT findings
	SPF     string `json:"spf,omitempty"`
	DMARC   string `json:"dmarc,omitempty"`
	HasDKIM bool   `json:"has_dkim"`
	// Vuln flags derived from DNS
	Findings []DNSFinding `json:"findings,omitempty"`
}

// DNSFinding is a security-relevant observation from DNS — pattern name only.
type DNSFinding struct {
	Record      string `json:"record"`       // which record triggered this
	PatternName string `json:"pattern_name"` // e.g. "Email Spoofing Possibility"
	Severity    string `json:"severity"`
	Detail      string `json:"detail"` // what was found, not how to exploit
}

// DNSRecon performs passive DNS reconnaissance on a domain.
// Uses the system resolver — no active port scanning.
func DNSRecon(ctx context.Context, domain string) (*DNSReconResult, error) {
	result := &DNSReconResult{Target: domain}
	resolver := net.DefaultResolver

	// A records
	addrs, err := resolver.LookupHost(ctx, domain)
	if err == nil {
		for _, a := range addrs {
			if strings.Contains(a, ":") {
				result.AAAARecords = append(result.AAAARecords, a)
			} else {
				result.ARecords = append(result.ARecords, a)
			}
		}
	}

	// CNAME
	cname, err := resolver.LookupCNAME(ctx, domain)
	if err == nil && cname != domain+"." && cname != "" {
		result.CNAMEs = append(result.CNAMEs, strings.TrimSuffix(cname, "."))
		// Dangling CNAME check
		if isDanglingCNAME(cname) {
			result.Findings = append(result.Findings, DNSFinding{
				Record:      "CNAME",
				PatternName: "Subdomain Takeover Possibility",
				Severity:    "HIGH",
				Detail:      fmt.Sprintf("CNAME points to potentially unclaimed service: %s", cname),
			})
		}
	}

	// MX records
	mxs, err := resolver.LookupMX(ctx, domain)
	if err == nil {
		for _, mx := range mxs {
			result.MXRecords = append(result.MXRecords, fmt.Sprintf("%d %s", mx.Pref, strings.TrimSuffix(mx.Host, ".")))
		}
	}

	// NS records
	nss, err := resolver.LookupNS(ctx, domain)
	if err == nil {
		for _, ns := range nss {
			result.NSRecords = append(result.NSRecords, strings.TrimSuffix(ns.Host, "."))
		}
	}

	// TXT records (SPF, DMARC, DKIM hints)
	txts, err := resolver.LookupTXT(ctx, domain)
	if err == nil {
		for _, t := range txts {
			result.TXTRecords = append(result.TXTRecords, t)
			if strings.HasPrefix(t, "v=spf1") {
				result.SPF = t
			}
		}
	}

	// DMARC (_dmarc.<domain>)
	dmarcTXTs, err := resolver.LookupTXT(ctx, "_dmarc."+domain)
	if err == nil && len(dmarcTXTs) > 0 {
		result.DMARC = dmarcTXTs[0]
	}

	// DKIM hint (check common selector)
	for _, sel := range []string{"default", "google", "mail", "k1", "dkim"} {
		_, err := resolver.LookupTXT(ctx, sel+"._domainkey."+domain)
		if err == nil {
			result.HasDKIM = true
			break
		}
	}

	// ── Derive security findings from DNS data ──────────────────────────

	// Missing SPF
	if result.SPF == "" && len(result.MXRecords) > 0 {
		result.Findings = append(result.Findings, DNSFinding{
			Record:      "TXT",
			PatternName: "Email Spoofing Possibility",
			Severity:    "MEDIUM",
			Detail:      "No SPF record found despite MX records existing",
		})
	}

	// Weak SPF (~all or ?all instead of -all)
	if result.SPF != "" && (strings.Contains(result.SPF, "~all") || strings.Contains(result.SPF, "?all")) {
		result.Findings = append(result.Findings, DNSFinding{
			Record:      "TXT/SPF",
			PatternName: "Email Spoofing Possibility",
			Severity:    "LOW",
			Detail:      "SPF policy is not strict (softfail or neutral)",
		})
	}

	// Missing DMARC
	if result.DMARC == "" && len(result.MXRecords) > 0 {
		result.Findings = append(result.Findings, DNSFinding{
			Record:      "TXT/_dmarc",
			PatternName: "Email Spoofing Possibility",
			Severity:    "MEDIUM",
			Detail:      "No DMARC record found",
		})
	}

	// DMARC policy check (p=none = no enforcement)
	if result.DMARC != "" && strings.Contains(result.DMARC, "p=none") {
		result.Findings = append(result.Findings, DNSFinding{
			Record:      "TXT/_dmarc",
			PatternName: "Email Spoofing Possibility",
			Severity:    "LOW",
			Detail:      "DMARC policy is p=none (monitoring only, not enforced)",
		})
	}

	// Missing DKIM
	if !result.HasDKIM && len(result.MXRecords) > 0 {
		result.Findings = append(result.Findings, DNSFinding{
			Record:      "TXT/_domainkey",
			PatternName: "Email Integrity Weakness",
			Severity:    "LOW",
			Detail:      "No common DKIM selector found",
		})
	}

	// Too few NS records (single point of failure / takeover risk)
	if len(result.NSRecords) == 1 {
		result.Findings = append(result.Findings, DNSFinding{
			Record:      "NS",
			PatternName: "DNS Single Point of Failure",
			Severity:    "LOW",
			Detail:      "Only one NS record found",
		})
	}

	return result, nil
}

// isDanglingCNAME checks if a CNAME points to well-known cloud services
// that could be unclaimed (subdomain takeover candidates).
func isDanglingCNAME(cname string) bool {
	danglingSuffixes := []string{
		".s3.amazonaws.com.",
		".s3-website",
		".azurewebsites.net.",
		".cloudapp.azure.com.",
		".trafficmanager.net.",
		".github.io.",
		".netlify.app.",
		".vercel.app.",
		".firebaseapp.com.",
		".web.app.",
		".ondigitalocean.app.",
		".pantheonsite.io.",
		".helpscoutdocs.com.",
		".zendesk.com.",
		".freshdesk.com.",
		".myshopify.com.",
		".surge.sh.",
	}
	lower := strings.ToLower(cname)
	for _, suffix := range danglingSuffixes {
		if strings.HasSuffix(lower, suffix) {
			return true
		}
	}
	return false
}
