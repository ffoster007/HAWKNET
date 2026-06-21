package vuln

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/hawknet/data_fetch/internal/config"
	"github.com/hawknet/data_fetch/internal/types"
)

// IntelClient fetches vulnerability intelligence from NVD, CISA KEV, EPSS.
type IntelClient struct {
	cfg    *config.Config
	client *http.Client
}

func NewIntelClient(cfg *config.Config) *IntelClient {
	return &IntelClient{
		cfg: cfg,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// ─────────────────────────────── NVD ─────────────────────────────────────────

type nvdResponse struct {
	Vulnerabilities []struct {
		CVE struct {
			ID           string `json:"id"`
			Descriptions []struct {
				Lang  string `json:"lang"`
				Value string `json:"value"`
			} `json:"descriptions"`
			Weaknesses []struct {
				Description []struct {
					Value string `json:"value"`
				} `json:"description"`
			} `json:"weaknesses"`
			Metrics struct {
				CVSSMetricV31 []struct {
					CVSSData struct {
						BaseScore    float64 `json:"baseScore"`
						BaseSeverity string  `json:"baseSeverity"`
						AttackVector string  `json:"attackVector"`
					} `json:"cvssData"`
				} `json:"cvssMetricV31"`
				CVSSMetricV2 []struct {
					CVSSData struct {
						BaseScore float64 `json:"baseScore"`
					} `json:"cvssData"`
					BaseSeverity string `json:"baseSeverity"`
				} `json:"cvssMetricV2"`
			} `json:"metrics"`
		} `json:"cve"`
	} `json:"vulnerabilities"`
}

// SearchNVD queries NVD for CVEs matching a keyword (e.g. "nginx 1.24").
// Returns VulnHit slice — description only, no exploit detail.
func (ic *IntelClient) SearchNVD(keyword string) ([]types.VulnHit, error) {
	params := url.Values{}
	params.Set("keywordSearch", keyword)
	params.Set("resultsPerPage", "15")

	req, err := http.NewRequest("GET", "https://services.nvd.nist.gov/rest/json/cves/2.0?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	if ic.cfg.APIs.NVDKey != "" {
		req.Header.Set("apiKey", ic.cfg.APIs.NVDKey)
	}

	resp, err := ic.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("NVD: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NVD status %d", resp.StatusCode)
	}

	var nvd nvdResponse
	if err := json.NewDecoder(resp.Body).Decode(&nvd); err != nil {
		return nil, err
	}

	var hits []types.VulnHit
	for _, v := range nvd.Vulnerabilities {
		hit := types.VulnHit{
			CVEID:  v.CVE.ID,
			Source: "NVD",
		}
		for _, d := range v.CVE.Descriptions {
			if d.Lang == "en" {
				hit.Description = truncate(d.Value, 300)
				break
			}
		}
		if len(v.CVE.Metrics.CVSSMetricV31) > 0 {
			m := v.CVE.Metrics.CVSSMetricV31[0].CVSSData
			hit.CVSSScore = m.BaseScore
			hit.Severity = m.BaseSeverity
			// Map attack vector to pattern names (name only, no technique)
			hit.AttackPatterns = AttackVectorToPatterns(m.AttackVector, v.CVE.ID)
		} else if len(v.CVE.Metrics.CVSSMetricV2) > 0 {
			m := v.CVE.Metrics.CVSSMetricV2[0]
			hit.CVSSScore = m.CVSSData.BaseScore
			hit.Severity = m.BaseSeverity
		}
		// Infer more patterns from CWE tags
		for _, w := range v.CVE.Weaknesses {
			for _, d := range w.Description {
				hit.AttackPatterns = append(hit.AttackPatterns, CWEToPatterns(d.Value)...)
			}
		}
		hit.AttackPatterns = dedupeStrings(hit.AttackPatterns)
		hits = append(hits, hit)
	}
	return hits, nil
}

// ─────────────────────────────── CISA KEV ─────────────────────────────────────

type cisaKEV struct {
	Vulnerabilities []struct {
		CVEID string `json:"cveID"`
	} `json:"vulnerabilities"`
}

// FetchKEVSet returns the set of CVE IDs in CISA's Known Exploited Vulnerabilities list.
func (ic *IntelClient) FetchKEVSet() (map[string]bool, error) {
	resp, err := ic.client.Get(ic.cfg.APIs.CISAKevURL)
	if err != nil {
		return nil, fmt.Errorf("CISA KEV: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var kev cisaKEV
	if err := json.Unmarshal(body, &kev); err != nil {
		return nil, err
	}

	out := make(map[string]bool, len(kev.Vulnerabilities))
	for _, v := range kev.Vulnerabilities {
		out[v.CVEID] = true
	}
	return out, nil
}

// ─────────────────────────────── EPSS ─────────────────────────────────────────

type epssResponse struct {
	Data []struct {
		CVE  string `json:"cve"`
		EPSS string `json:"epss"`
	} `json:"data"`
}

// FetchEPSS returns exploit probability scores (0.0–1.0) for a list of CVE IDs.
func (ic *IntelClient) FetchEPSS(cveIDs []string) (map[string]float64, error) {
	if len(cveIDs) == 0 {
		return nil, nil
	}

	params := url.Values{}
	params.Set("cve", strings.Join(cveIDs, ","))

	resp, err := ic.client.Get(ic.cfg.APIs.EPSSAPIURL + "?" + params.Encode())
	if err != nil {
		return nil, fmt.Errorf("EPSS: %w", err)
	}
	defer resp.Body.Close()

	var epss epssResponse
	if err := json.NewDecoder(resp.Body).Decode(&epss); err != nil {
		return nil, err
	}

	out := make(map[string]float64, len(epss.Data))
	for _, d := range epss.Data {
		var score float64
		fmt.Sscanf(d.EPSS, "%f", &score)
		out[d.CVE] = score
	}
	return out, nil
}

// ─────────────────────────────── Enrich ──────────────────────────────────────

// EnrichHits cross-references hits with CISA KEV + EPSS concurrently.
// Partial failures are tolerated — hits are returned with whatever data was fetched.
func (ic *IntelClient) EnrichHits(hits []types.VulnHit) ([]types.VulnHit, error) {
	var cveIDs []string
	for _, h := range hits {
		if h.CVEID != "" {
			cveIDs = append(cveIDs, h.CVEID)
		}
	}
	if len(cveIDs) == 0 {
		return hits, nil
	}

	type kevResult struct {
		data map[string]bool
		err  error
	}
	type epssResult struct {
		data map[string]float64
		err  error
	}

	kevCh := make(chan kevResult, 1)
	epssCh := make(chan epssResult, 1)

	go func() {
		kev, err := ic.FetchKEVSet()
		kevCh <- kevResult{kev, err}
	}()
	go func() {
		scores, err := ic.FetchEPSS(cveIDs)
		epssCh <- epssResult{scores, err}
	}()

	kr := <-kevCh
	er := <-epssCh

	for i := range hits {
		if kr.data != nil {
			hits[i].InCISAKEV = kr.data[hits[i].CVEID]
			// KEV = actively exploited → add pattern flag
			if hits[i].InCISAKEV {
				hits[i].AttackPatterns = append(hits[i].AttackPatterns, "Active Exploitation Confirmed")
				hits[i].AttackPatterns = dedupeStrings(hits[i].AttackPatterns)
			}
		}
		if er.data != nil {
			hits[i].EPSSScore = er.data[hits[i].CVEID]
		}
	}

	// Return first error if any (non-fatal for caller)
	if kr.err != nil {
		return hits, kr.err
	}
	return hits, er.err
}

// ─────────────────────────────── Helpers ─────────────────────────────────────

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

func dedupeStrings(ss []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range ss {
		if s != "" && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}
