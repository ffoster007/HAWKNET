package types

import "time"

type TargetType string

const (
	TargetDomain TargetType = "domain"
	TargetIP     TargetType = "ip"
)

type ScanTarget struct {
	Value     string     `json:"value"`
	Type      TargetType `json:"type"`
	RequestID string     `json:"request_id"`
}

type PortResult struct {
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
	State    string `json:"state"`
	Banner   string `json:"banner,omitempty"`
}

type SubdomainResult struct {
	Subdomain string   `json:"subdomain"`
	IPs       []string `json:"ips"`
}

type TLSInfo struct {
	Version    string    `json:"version"`
	Expiry     time.Time `json:"expiry"`
	Issuer     string    `json:"issuer"`
	SelfSigned bool      `json:"self_signed"`
}

type FingerprintResult struct {
	Target     string            `json:"target"`
	StatusCode int               `json:"status_code,omitempty"`
	Server     string            `json:"server,omitempty"`
	TechStack  []string          `json:"tech_stack,omitempty"`
	Headers    map[string]string `json:"headers,omitempty"`
	TLSInfo    *TLSInfo          `json:"tls_info,omitempty"`
}

type VulnHit struct {
	CVEID          string   `json:"cve_id,omitempty"`
	Description    string   `json:"description"`
	Severity       string   `json:"severity"`
	CVSSScore      float64  `json:"cvss_score,omitempty"`
	EPSSScore      float64  `json:"epss_score,omitempty"`
	InCISAKEV      bool     `json:"in_cisa_kev"`
	AttackPatterns []string `json:"attack_patterns"`
	Source         string   `json:"source"`
}

type ScanResult struct {
	RequestID    string              `json:"request_id"`
	Target       ScanTarget          `json:"target"`
	DNS          interface{}         `json:"dns,omitempty"` // *scanner.DNSReconResult
	Subdomains   []SubdomainResult   `json:"subdomains,omitempty"`
	Ports        []PortResult        `json:"ports,omitempty"`
	Fingerprints []FingerprintResult `json:"fingerprints,omitempty"`
	VulnHits     []VulnHit           `json:"vuln_hits,omitempty"`
	AIEnhanced   bool                `json:"ai_enhanced"`
	ScannedAt    time.Time           `json:"scanned_at"`
	Errors       []string            `json:"errors,omitempty"`
}
