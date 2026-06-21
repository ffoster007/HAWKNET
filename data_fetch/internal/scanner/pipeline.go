package scanner

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/hawknet/data_fetch/internal/ai"
	"github.com/hawknet/data_fetch/internal/config"
	"github.com/hawknet/data_fetch/internal/fingerprint"
	"github.com/hawknet/data_fetch/internal/types"
	"github.com/hawknet/data_fetch/internal/vuln"
)

// Pipeline orchestrates a full scan for one ScanTarget.
type Pipeline struct {
	cfg *config.Config
}

func NewPipeline(cfg *config.Config) *Pipeline {
	return &Pipeline{cfg: cfg}
}

// Run executes the full pipeline and returns a ScanResult.
// Partial results are returned even if ctx is cancelled mid-scan.
func (p *Pipeline) Run(ctx context.Context, target types.ScanTarget) types.ScanResult {
	result := types.ScanResult{
		RequestID: target.RequestID,
		Target:    target,
		ScannedAt: time.Now(),
	}

	log.Printf("[pipeline] start: %s (%s)", target.Value, target.Type)

	// ── 1. DNS recon (always, passive) ──────────────────────────────────
	if target.Type == types.TargetDomain {
		dns, err := DNSRecon(ctx, target.Value)
		if err != nil {
			result.Errors = append(result.Errors, "dns: "+err.Error())
		} else {
			result.DNS = dns
			// Promote DNS findings to VulnHits
			for _, f := range dns.Findings {
				result.VulnHits = append(result.VulnHits, types.VulnHit{
					Description:    f.Detail,
					Severity:       f.Severity,
					AttackPatterns: []string{f.PatternName},
					Source:         "dns/" + f.Record,
				})
			}
			log.Printf("[pipeline] dns: %d findings", len(dns.Findings))
		}
	}

	// ── 2. Subdomain enumeration ─────────────────────────────────────────
	if target.Type == types.TargetDomain && !p.cfg.Runtime.PassiveOnly {
		result.Subdomains = p.enumSubdomains(ctx, target.Value)
		log.Printf("[pipeline] subdomains: %d found", len(result.Subdomains))
	}

	// ── 3. Port scan ─────────────────────────────────────────────────────
	if !p.cfg.Runtime.PassiveOnly {
		result.Ports = p.scanPorts(ctx, target.Value)
		log.Printf("[pipeline] ports: %d open", len(result.Ports))
	}

	// ── 4. HTTP fingerprinting ────────────────────────────────────────────
	webPorts := filterWebPorts(result.Ports)
	if len(webPorts) > 0 {
		result.Fingerprints = p.doFingerprint(ctx, target.Value, webPorts)
		log.Printf("[pipeline] fingerprints: %d endpoints", len(result.Fingerprints))
	}

	// ── 5. Rule-based vuln detection (always runs) ───────────────────────
	result = p.ruleBasedAnalysis(result)

	// ── 6. NVD / CISA / EPSS intel ────────────────────────────────────────
	intel := vuln.NewIntelClient(p.cfg)
	keywords := buildKeywords(result.Fingerprints)
	for _, kw := range keywords {
		hits, err := intel.SearchNVD(kw)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("nvd(%s): %v", kw, err))
			continue
		}
		result.VulnHits = append(result.VulnHits, hits...)
	}
	if len(result.VulnHits) > 0 {
		enriched, err := intel.EnrichHits(result.VulnHits)
		if err != nil {
			result.Errors = append(result.Errors, "enrich: "+err.Error())
		} else {
			result.VulnHits = enriched
		}
	}
	result.VulnHits = deduplicateHits(result.VulnHits)
	log.Printf("[pipeline] vuln hits: %d total", len(result.VulnHits))

	// ── 7. AI enhancement (optional) ─────────────────────────────────────
	if p.cfg.AIAvailable() {
		bridge := ai.New(p.cfg)
		enriched, err := bridge.EnhanceResult(ctx, &result)
		if err != nil {
			result.Errors = append(result.Errors, "ai: "+err.Error())
			log.Printf("[pipeline] ai skipped: %v", err)
		} else {
			result.VulnHits = enriched
			result.AIEnhanced = true
			log.Printf("[pipeline] ai enhanced")
		}
	} else {
		log.Printf("[pipeline] ai not available — rule-based only")
	}

	return result
}

// ── Sub-steps ────────────────────────────────────────────────────────────────

func (p *Pipeline) enumSubdomains(ctx context.Context, domain string) []types.SubdomainResult {
	enum := NewSubdomainEnumerator()
	ch := make(chan types.SubdomainResult, 200)
	var found []types.SubdomainResult
	go func() {
		defer close(ch)
		_ = enum.Enumerate(ctx, domain, ch)
	}()
	for r := range ch {
		found = append(found, r)
	}
	return found
}

func (p *Pipeline) scanPorts(ctx context.Context, host string) []types.PortResult {
	ps := NewPortScanner()
	ch := make(chan types.PortResult, 50)
	var found []types.PortResult
	go func() {
		defer close(ch)
		ps.Scan(ctx, host, CommonPorts, ch)
	}()
	for r := range ch {
		found = append(found, r)
	}
	return found
}

func (p *Pipeline) doFingerprint(ctx context.Context, host string, ports []int) []types.FingerprintResult {
	fp := fingerprint.New()
	var out []types.FingerprintResult
	for _, port := range ports {
		select {
		case <-ctx.Done():
			return out
		default:
		}
		r, err := fp.Probe(host, port)
		if err != nil {
			continue
		}
		out = append(out, *r)
	}
	return out
}

// ruleBasedAnalysis applies static rules to fingerprint + port findings.
func (p *Pipeline) ruleBasedAnalysis(result types.ScanResult) types.ScanResult {
	for _, fp := range result.Fingerprints {
		for _, tech := range fp.TechStack {
			switch tech {
			case "MISSING:HSTS":
				result.VulnHits = append(result.VulnHits, types.VulnHit{
					Description:    "Strict-Transport-Security header not set",
					Severity:       "MEDIUM",
					AttackPatterns: []string{"Protocol Downgrade"},
					Source:         "fingerprint/header",
				})
			case "MISSING:CSP":
				result.VulnHits = append(result.VulnHits, types.VulnHit{
					Description:    "Content-Security-Policy header not set",
					Severity:       "MEDIUM",
					AttackPatterns: []string{"Client-Side Injection Opportunity"},
					Source:         "fingerprint/header",
				})
			case "MISSING:Clickjacking-Protection":
				result.VulnHits = append(result.VulnHits, types.VulnHit{
					Description:    "No clickjacking protection header detected",
					Severity:       "LOW",
					AttackPatterns: []string{"UI Redress Possibility"},
					Source:         "fingerprint/header",
				})
			}
		}

		if fp.TLSInfo != nil {
			switch fp.TLSInfo.Version {
			case "TLSv1.0", "TLSv1.1":
				result.VulnHits = append(result.VulnHits, types.VulnHit{
					Description:    fmt.Sprintf("Deprecated TLS version detected: %s", fp.TLSInfo.Version),
					Severity:       "HIGH",
					AttackPatterns: []string{"Protocol Downgrade"},
					Source:         "fingerprint/tls",
				})
			}
			if fp.TLSInfo.SelfSigned {
				result.VulnHits = append(result.VulnHits, types.VulnHit{
					Description:    "Self-signed TLS certificate",
					Severity:       "MEDIUM",
					AttackPatterns: []string{"Man-in-the-Middle Opportunity"},
					Source:         "fingerprint/tls",
				})
			}
		}
	}
	return result
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func filterWebPorts(ports []types.PortResult) []int {
	web := map[int]bool{80: true, 443: true, 8080: true, 8443: true, 8888: true}
	var out []int
	for _, p := range ports {
		if web[p.Port] {
			out = append(out, p.Port)
		}
	}
	return out
}

func buildKeywords(fps []types.FingerprintResult) []string {
	seen := map[string]bool{}
	var kw []string
	for _, fp := range fps {
		for _, t := range fp.TechStack {
			if !seen[t] && len(t) > 8 && t[:8] != "MISSING:" {
				seen[t] = true
				kw = append(kw, t)
			}
		}
	}
	return kw
}

func deduplicateHits(hits []types.VulnHit) []types.VulnHit {
	seen := map[string]bool{}
	var out []types.VulnHit
	for _, h := range hits {
		key := h.CVEID + "|" + h.Description
		if !seen[key] {
			seen[key] = true
			out = append(out, h)
		}
	}
	return out
}
