package graph

import (
	"fmt"
	"strings"

	"github.com/hawknet/data_fetch/internal/types"
	"github.com/hawknet/data_fetch/internal/vuln"
)

// ── React Flow compatible types ───────────────────────────────────────────────

type NodeType string

const (
	NodeTarget    NodeType = "target"    // root: the scanned domain/IP
	NodeVuln      NodeType = "vuln"      // a vulnerability finding
	NodeService   NodeType = "service"   // an open port / service
	NodeSubdomain NodeType = "subdomain" // discovered subdomain
	NodePattern   NodeType = "pattern"   // an attack pattern possibility
)

// Node maps directly to a React Flow node.
type Node struct {
	ID       string   `json:"id"`
	Type     NodeType `json:"type"`
	Data     NodeData `json:"data"`
	Position Position `json:"position"` // layout hint; frontend can re-layout
}

type NodeData struct {
	Label          string   `json:"label"`
	Severity       string   `json:"severity,omitempty"` // CRITICAL/HIGH/MEDIUM/LOW
	RiskLevel      int      `json:"risk_level"`         // 0-4 for colour coding
	CVEId          string   `json:"cve_id,omitempty"`
	CVSSScore      float64  `json:"cvss_score,omitempty"`
	EPSSScore      float64  `json:"epss_score,omitempty"`
	InCISAKEV      bool     `json:"in_cisa_kev,omitempty"`
	AttackPatterns []string `json:"attack_patterns,omitempty"`
	Source         string   `json:"source,omitempty"`
	AIEnhanced     bool     `json:"ai_enhanced,omitempty"`
	// NOTE: no exploit detail, no how-to, just the finding + pattern names
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Edge maps directly to a React Flow edge.
type Edge struct {
	ID       string `json:"id"`
	Source   string `json:"source"`
	Target   string `json:"target"`
	Label    string `json:"label,omitempty"` // relationship description
	EdgeType string `json:"type,omitempty"`  // "default" | "step" | "smoothstep"
	Animated bool   `json:"animated"`
}

// VulnGraph is the full graph payload sent to the React Flow frontend.
type VulnGraph struct {
	Nodes      []Node  `json:"nodes"`
	Edges      []Edge  `json:"edges"`
	AIEnhanced bool    `json:"ai_enhanced"`
	Summary    Summary `json:"summary"`
}

type Summary struct {
	TotalVulns  int `json:"total_vulns"`
	Critical    int `json:"critical"`
	High        int `json:"high"`
	Medium      int `json:"medium"`
	Low         int `json:"low"`
	KEVCount    int `json:"kev_count"` // confirmed exploited in wild
	OpenPorts   int `json:"open_ports"`
	Subdomains  int `json:"subdomains"`
	AttackPaths int `json:"attack_paths"` // number of pattern nodes
}

// ── Builder ────────────────────────────────────────────────────────────────────

// Build converts a ScanResult into a VulnGraph ready for React Flow.
func Build(result *types.ScanResult) *VulnGraph {
	g := &VulnGraph{AIEnhanced: result.AIEnhanced}
	idGen := &idGenerator{}

	// ── Root: scan target ────────────────────────────────────────────────
	rootID := "target-root"
	g.Nodes = append(g.Nodes, Node{
		ID:   rootID,
		Type: NodeTarget,
		Data: NodeData{
			Label:  result.Target.Value,
			Source: string(result.Target.Type),
		},
		Position: Position{X: 400, Y: 40},
	})

	// ── Layer 1: Services (open ports) ──────────────────────────────────
	colStep := 180.0
	for i, port := range result.Ports {
		svcID := idGen.next("svc")
		label := fmt.Sprintf(":%d/%s", port.Port, port.Protocol)
		if port.Banner != "" {
			short := port.Banner
			if len(short) > 40 {
				short = short[:40] + "…"
			}
			label += "\n" + short
		}
		g.Nodes = append(g.Nodes, Node{
			ID:   svcID,
			Type: NodeService,
			Data: NodeData{Label: label, Source: "port_scan"},
			Position: Position{
				X: 100 + float64(i)*colStep,
				Y: 160,
			},
		})
		g.Edges = append(g.Edges, Edge{
			ID:       idGen.next("e"),
			Source:   rootID,
			Target:   svcID,
			Label:    "exposes",
			EdgeType: "smoothstep",
			Animated: false,
		})

		// Port-specific vuln nodes
		portVulns := vulnsForPort(port.Port)
		for _, pv := range portVulns {
			pvID := idGen.next("vuln")
			g.Nodes = append(g.Nodes, Node{
				ID:   pvID,
				Type: NodeVuln,
				Data: NodeData{
					Label:          pv.Description,
					Severity:       pv.Severity,
					RiskLevel:      vuln.SeverityToRisk(pv.Severity),
					AttackPatterns: pv.AttackPatterns,
					Source:         "port_rule",
				},
				Position: Position{X: 100 + float64(i)*colStep, Y: 300},
			})
			g.Edges = append(g.Edges, Edge{
				ID:       idGen.next("e"),
				Source:   svcID,
				Target:   pvID,
				Label:    "may expose",
				EdgeType: "smoothstep",
				Animated: true,
			})
			g = appendPatternNodes(g, pvID, pv.AttackPatterns, idGen, 440)
		}
	}

	// ── Layer 1b: Subdomains ─────────────────────────────────────────────
	for i, sub := range result.Subdomains {
		if i >= 20 { // cap UI nodes to avoid overwhelming the graph
			break
		}
		subID := idGen.next("sub")
		g.Nodes = append(g.Nodes, Node{
			ID:   subID,
			Type: NodeSubdomain,
			Data: NodeData{Label: sub.Subdomain, Source: "subdomain_enum"},
			Position: Position{
				X: 100 + float64(i)*150,
				Y: 160,
			},
		})
		g.Edges = append(g.Edges, Edge{
			ID:       idGen.next("e"),
			Source:   rootID,
			Target:   subID,
			Label:    "has subdomain",
			EdgeType: "default",
			Animated: false,
		})
	}

	// ── Layer 2: NVD / fingerprint vuln hits ────────────────────────────
	for i, hit := range result.VulnHits {
		vID := idGen.next("vuln")
		label := hit.Description
		if hit.CVEID != "" {
			label = hit.CVEID + ": " + hit.Description
		}
		nd := NodeData{
			Label:          truncate(label, 80),
			Severity:       hit.Severity,
			RiskLevel:      vuln.SeverityToRisk(hit.Severity),
			CVEId:          hit.CVEID,
			CVSSScore:      hit.CVSSScore,
			EPSSScore:      hit.EPSSScore,
			InCISAKEV:      hit.InCISAKEV,
			AttackPatterns: hit.AttackPatterns,
			Source:         hit.Source,
			AIEnhanced:     result.AIEnhanced,
		}
		g.Nodes = append(g.Nodes, Node{
			ID:       vID,
			Type:     NodeVuln,
			Data:     nd,
			Position: Position{X: 100 + float64(i%6)*190, Y: 520 + float64(i/6)*200},
		})
		g.Edges = append(g.Edges, Edge{
			ID:       idGen.next("e"),
			Source:   rootID,
			Target:   vID,
			Label:    "vulnerability",
			EdgeType: "smoothstep",
			Animated: hit.InCISAKEV, // animate KEV findings (actively exploited)
		})

		// Branch: each vuln spawns attack pattern possibility nodes
		g = appendPatternNodes(g, vID, hit.AttackPatterns, idGen, 700+float64(i/6)*200)

		// Branch: high EPSS score → link to related high-risk findings
		if hit.EPSSScore >= 0.5 {
			for j, other := range result.VulnHits {
				if j != i && other.EPSSScore >= 0.3 && sharedPattern(hit.AttackPatterns, other.AttackPatterns) {
					otherID := fmt.Sprintf("vuln-%d", j+1) // approximate; safe enough for layout
					g.Edges = append(g.Edges, Edge{
						ID:       idGen.next("e"),
						Source:   vID,
						Target:   otherID,
						Label:    "related exploit path",
						EdgeType: "step",
						Animated: true,
					})
				}
			}
		}
	}

	// ── Summary ───────────────────────────────────────────────────────────
	g.Summary = buildSummary(result, g)

	return g
}

// appendPatternNodes adds NodePattern nodes as children of parentID.
func appendPatternNodes(g *VulnGraph, parentID string, patterns []string, idGen *idGenerator, y float64) *VulnGraph {
	for _, p := range patterns {
		if p == "" {
			continue
		}
		pID := idGen.next("pat")
		g.Nodes = append(g.Nodes, Node{
			ID:   pID,
			Type: NodePattern,
			Data: NodeData{
				Label:  p,
				Source: "pattern_inference",
				// Severity/risk intentionally omitted — these are possibilities, not confirmed
			},
			Position: Position{X: 200, Y: y},
		})
		g.Edges = append(g.Edges, Edge{
			ID:       idGen.next("e"),
			Source:   parentID,
			Target:   pID,
			Label:    "possible attack path",
			EdgeType: "step",
			Animated: false,
		})
	}
	return g
}

// vulnsForPort returns rule-based vuln hints for well-known dangerous ports.
func vulnsForPort(port int) []types.VulnHit {
	rules := map[int]types.VulnHit{
		21: {
			Description:    "FTP service detected (cleartext credentials)",
			Severity:       "HIGH",
			AttackPatterns: []string{"Credential Interception", "Anonymous Access Possibility"},
			Source:         "port_rule",
		},
		23: {
			Description:    "Telnet service detected (cleartext protocol)",
			Severity:       "HIGH",
			AttackPatterns: []string{"Credential Interception"},
			Source:         "port_rule",
		},
		2375: {
			Description:    "Docker daemon API (unauthenticated port)",
			Severity:       "CRITICAL",
			AttackPatterns: []string{"Container Escape Possibility", "Privilege Escalation Path"},
			Source:         "port_rule",
		},
		6379: {
			Description:    "Redis port open — check for authentication",
			Severity:       "HIGH",
			AttackPatterns: []string{"Unauthenticated Data Access Possibility"},
			Source:         "port_rule",
		},
		27017: {
			Description:    "MongoDB port open — check for authentication",
			Severity:       "HIGH",
			AttackPatterns: []string{"Unauthenticated Data Access Possibility"},
			Source:         "port_rule",
		},
		9200: {
			Description:    "Elasticsearch port open — check for authentication",
			Severity:       "HIGH",
			AttackPatterns: []string{"Unauthenticated Data Access Possibility"},
			Source:         "port_rule",
		},
		5432: {
			Description:    "PostgreSQL port externally reachable",
			Severity:       "MEDIUM",
			AttackPatterns: []string{"Database Exposure"},
			Source:         "port_rule",
		},
		3306: {
			Description:    "MySQL/MariaDB port externally reachable",
			Severity:       "MEDIUM",
			AttackPatterns: []string{"Database Exposure"},
			Source:         "port_rule",
		},
		1433: {
			Description:    "MSSQL port externally reachable",
			Severity:       "MEDIUM",
			AttackPatterns: []string{"Database Exposure"},
			Source:         "port_rule",
		},
	}
	if h, ok := rules[port]; ok {
		return []types.VulnHit{h}
	}
	return nil
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type idGenerator struct{ n int }

func (g *idGenerator) next(prefix string) string {
	g.n++
	return fmt.Sprintf("%s-%d", prefix, g.n)
}

func sharedPattern(a, b []string) bool {
	set := make(map[string]bool, len(a))
	for _, p := range a {
		set[p] = true
	}
	for _, p := range b {
		if set[p] {
			return true
		}
	}
	return false
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}

func buildSummary(result *types.ScanResult, g *VulnGraph) Summary {
	s := Summary{
		TotalVulns: len(result.VulnHits),
		OpenPorts:  len(result.Ports),
		Subdomains: len(result.Subdomains),
	}
	patternSet := map[string]bool{}
	for _, h := range result.VulnHits {
		switch strings.ToUpper(h.Severity) {
		case "CRITICAL":
			s.Critical++
		case "HIGH":
			s.High++
		case "MEDIUM":
			s.Medium++
		case "LOW":
			s.Low++
		}
		if h.InCISAKEV {
			s.KEVCount++
		}
		for _, p := range h.AttackPatterns {
			patternSet[p] = true
		}
	}
	s.AttackPaths = len(patternSet)
	return s
}
