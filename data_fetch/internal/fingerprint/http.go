package fingerprint

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hawknet/data_fetch/internal/types"
)

type Fingerprinter struct {
	Timeout     time.Duration
	UserAgent   string
	FollowRedir bool
}

func New() *Fingerprinter {
	return &Fingerprinter{
		Timeout:     8 * time.Second,
		UserAgent:   "Mozilla/5.0 (compatible; HAWKNET-Scanner/0.1)",
		FollowRedir: false,
	}
}

func (f *Fingerprinter) Probe(target string, port int) (*types.FingerprintResult, error) {
	scheme := "http"
	if port == 443 || port == 8443 {
		scheme = "https"
	}
	rawURL := fmt.Sprintf("%s://%s:%d/", scheme, target, port)

	client := f.buildClient()
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", f.UserAgent)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	result := &types.FingerprintResult{
		Target:     fmt.Sprintf("%s:%d", target, port),
		StatusCode: resp.StatusCode,
		Server:     resp.Header.Get("Server"),
		Headers:    extractInterestingHeaders(resp.Header),
		TechStack:  detectTechStack(resp.Header),
	}

	if resp.TLS != nil {
		result.TLSInfo = extractTLSInfo(resp.TLS)
	}

	return result, nil
}

func (f *Fingerprinter) buildClient() *http.Client {
	transport := &http.Transport{
		TLSClientConfig:   &tls.Config{InsecureSkipVerify: true},
		DisableKeepAlives: true,
	}
	return &http.Client{
		Timeout:   f.Timeout,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if !f.FollowRedir {
				return http.ErrUseLastResponse
			}
			if len(via) >= 3 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}
}

var interestingHeaders = []string{
	"Server", "X-Powered-By", "X-AspNet-Version", "X-Generator",
	"X-Frame-Options", "Content-Security-Policy", "Strict-Transport-Security",
	"X-Content-Type-Options", "X-XSS-Protection", "Access-Control-Allow-Origin",
	"WWW-Authenticate", "Via",
}

func extractInterestingHeaders(h http.Header) map[string]string {
	out := make(map[string]string)
	for _, name := range interestingHeaders {
		if v := h.Get(name); v != "" {
			out[name] = v
		}
	}
	return out
}

func detectTechStack(h http.Header) []string {
	var techs []string
	addIfMatch := func(header, contains, label string) {
		if v := strings.ToLower(h.Get(header)); v != "" && strings.Contains(v, strings.ToLower(contains)) {
			techs = append(techs, label)
		}
	}
	addIfMatch("Server", "nginx", "Nginx")
	addIfMatch("Server", "apache", "Apache")
	addIfMatch("Server", "iis", "Microsoft IIS")
	addIfMatch("Server", "cloudflare", "Cloudflare")
	addIfMatch("X-Powered-By", "php", "PHP")
	addIfMatch("X-Powered-By", "asp.net", "ASP.NET")
	addIfMatch("X-Powered-By", "express", "Express.js")
	addIfMatch("X-Generator", "wordpress", "WordPress")
	addIfMatch("X-Generator", "drupal", "Drupal")

	if h.Get("Strict-Transport-Security") == "" {
		techs = append(techs, "MISSING:HSTS")
	}
	if h.Get("X-Frame-Options") == "" && h.Get("Content-Security-Policy") == "" {
		techs = append(techs, "MISSING:Clickjacking-Protection")
	}
	if h.Get("Content-Security-Policy") == "" {
		techs = append(techs, "MISSING:CSP")
	}
	return techs
}

func extractTLSInfo(state *tls.ConnectionState) *types.TLSInfo {
	if len(state.PeerCertificates) == 0 {
		return nil
	}
	cert := state.PeerCertificates[0]
	return &types.TLSInfo{
		Version:    tlsVersionString(state.Version),
		Expiry:     cert.NotAfter,
		Issuer:     cert.Issuer.CommonName,
		SelfSigned: cert.Issuer.CommonName == cert.Subject.CommonName,
	}
}

func tlsVersionString(v uint16) string {
	switch v {
	case tls.VersionTLS10:
		return "TLSv1.0"
	case tls.VersionTLS11:
		return "TLSv1.1"
	case tls.VersionTLS12:
		return "TLSv1.2"
	case tls.VersionTLS13:
		return "TLSv1.3"
	default:
		return "Unknown"
	}
}
