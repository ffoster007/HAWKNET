package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hawknet/data_fetch/internal/config"
	"github.com/hawknet/data_fetch/internal/types"
)

// Bridge sends scan findings to AI providers and returns enriched attack pattern names.
// If no provider is available or all calls fail, it returns nil and the caller
// falls back to rule-based analysis — no error is surfaced to the user.
type Bridge struct {
	cfg    *config.Config
	client *http.Client
}

func New(cfg *config.Config) *Bridge {
	return &Bridge{
		cfg: cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// EnhanceResult asks available AI providers to correlate findings and
// suggest additional attack pattern names. Returns updated VulnHits.
// Never returns exploit details — the prompt enforces this.
func (b *Bridge) EnhanceResult(ctx context.Context, result *types.ScanResult) ([]types.VulnHit, error) {
	if !b.cfg.AIAvailable() {
		return result.VulnHits, nil
	}

	prompt := buildPrompt(result)

	// Try providers in priority order: Claude → GPT → Gemini
	var patterns []string
	var err error

	if b.cfg.AI.AnthropicKey != "" {
		patterns, err = b.callClaude(ctx, prompt)
	}
	if (err != nil || len(patterns) == 0) && b.cfg.AI.OpenAIKey != "" {
		patterns, err = b.callGPT(ctx, prompt)
	}
	if (err != nil || len(patterns) == 0) && b.cfg.AI.GeminiKey != "" {
		patterns, err = b.callGemini(ctx, prompt)
	}

	if len(patterns) == 0 {
		return result.VulnHits, err // graceful fallback
	}

	// Merge AI-suggested patterns into existing hits (deduplicated)
	return mergePatterns(result.VulnHits, patterns), nil
}

// ── Prompt ────────────────────────────────────────────────────────────────────

func buildPrompt(result *types.ScanResult) string {
	var sb strings.Builder
	sb.WriteString("You are a security analysis assistant helping categorise vulnerability findings.\n")
	sb.WriteString("Given the following scan findings, identify additional ATTACK PATTERN NAMES that may be relevant.\n\n")
	sb.WriteString("RULES:\n")
	sb.WriteString("- Return ONLY a JSON array of short attack pattern category names (strings).\n")
	sb.WriteString("- Do NOT include exploit techniques, payloads, PoC steps, or how-to details.\n")
	sb.WriteString("- Do NOT describe how to attack. Only name the category of risk.\n")
	sb.WriteString("- Maximum 15 pattern names. Be concise.\n\n")
	sb.WriteString("FINDINGS:\n")

	for _, h := range result.VulnHits {
		sb.WriteString(fmt.Sprintf("- [%s] %s", h.Severity, h.Description))
		if h.CVEID != "" {
			sb.WriteString(fmt.Sprintf(" (%s, CVSS %.1f, EPSS %.2f)", h.CVEID, h.CVSSScore, h.EPSSScore))
		}
		if h.InCISAKEV {
			sb.WriteString(" [ACTIVELY EXPLOITED IN WILD]")
		}
		sb.WriteString("\n")
	}

	for _, fp := range result.Fingerprints {
		sb.WriteString(fmt.Sprintf("- Tech stack: %s\n", strings.Join(fp.TechStack, ", ")))
	}

	sb.WriteString("\nRespond with ONLY a JSON array, example: [\"Pattern Name\", \"Another Pattern\"]\n")
	return sb.String()
}

// ── Claude (Anthropic) ────────────────────────────────────────────────────────

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []claudeMessage `json:"messages"`
}
type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

func (b *Bridge) callClaude(ctx context.Context, prompt string) ([]string, error) {
	body, _ := json.Marshal(claudeRequest{
		Model:     "claude-sonnet-4-6",
		MaxTokens: 512,
		Messages:  []claudeMessage{{Role: "user", Content: prompt}},
	})

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", b.cfg.AI.AnthropicKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := b.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("claude: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("claude: status %d", resp.StatusCode)
	}

	var cr claudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return nil, err
	}
	if len(cr.Content) == 0 {
		return nil, nil
	}
	return parsePatternArray(cr.Content[0].Text), nil
}

// ── GPT (OpenAI) ──────────────────────────────────────────────────────────────

type gptRequest struct {
	Model    string       `json:"model"`
	Messages []gptMessage `json:"messages"`
}
type gptMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type gptResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (b *Bridge) callGPT(ctx context.Context, prompt string) ([]string, error) {
	body, _ := json.Marshal(gptRequest{
		Model:    "gpt-4o-mini",
		Messages: []gptMessage{{Role: "user", Content: prompt}},
	})

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+b.cfg.AI.OpenAIKey)

	resp, err := b.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gpt: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gpt: status %d", resp.StatusCode)
	}

	var gr gptResponse
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, err
	}
	if len(gr.Choices) == 0 {
		return nil, nil
	}
	return parsePatternArray(gr.Choices[0].Message.Content), nil
}

// ── Gemini (Google) ───────────────────────────────────────────────────────────

type geminiRequest struct {
	Contents []geminiContent `json:"contents"`
}
type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}
type geminiPart struct {
	Text string `json:"text"`
}
type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func (b *Bridge) callGemini(ctx context.Context, prompt string) ([]string, error) {
	body, _ := json.Marshal(geminiRequest{
		Contents: []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
	})

	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s",
		b.cfg.AI.GeminiKey,
	)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gemini: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini: status %d", resp.StatusCode)
	}

	var gr geminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, err
	}
	if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
		return nil, nil
	}
	return parsePatternArray(gr.Candidates[0].Content.Parts[0].Text), nil
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// parsePatternArray extracts a string array from AI JSON response.
// Strips markdown fences if present.
func parsePatternArray(raw string) []string {
	raw = strings.TrimSpace(raw)
	// Strip ```json ... ``` fences
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	// Find first [ ... ]
	start := strings.Index(raw, "[")
	end := strings.LastIndex(raw, "]")
	if start == -1 || end == -1 || end <= start {
		return nil
	}
	raw = raw[start : end+1]

	var patterns []string
	if err := json.Unmarshal([]byte(raw), &patterns); err != nil {
		return nil
	}

	// Sanitise: reject any entry that looks like an exploit step
	var safe []string
	for _, p := range patterns {
		p = strings.TrimSpace(p)
		if p != "" && len(p) < 80 && !looksLikeExploit(p) {
			safe = append(safe, p)
		}
	}
	return safe
}

// looksLikeExploit rejects AI outputs that contain exploit-like language.
func looksLikeExploit(s string) bool {
	lower := strings.ToLower(s)
	banned := []string{
		"payload", "exploit", "inject this", "execute", "run the",
		"use the following", "curl ", "wget ", "nc ", "bash -",
		"python -", "<?php", "<script", "' or 1=1", "union select",
	}
	for _, b := range banned {
		if strings.Contains(lower, b) {
			return true
		}
	}
	return false
}

// mergePatterns adds AI-suggested patterns to hits that share relevant keywords.
func mergePatterns(hits []types.VulnHit, aiPatterns []string) []types.VulnHit {
	if len(aiPatterns) == 0 {
		return hits
	}
	// Append AI patterns to every hit (they are global correlation results)
	for i := range hits {
		existing := make(map[string]bool, len(hits[i].AttackPatterns))
		for _, p := range hits[i].AttackPatterns {
			existing[p] = true
		}
		for _, p := range aiPatterns {
			if !existing[p] {
				hits[i].AttackPatterns = append(hits[i].AttackPatterns, p)
				existing[p] = true
			}
		}
	}
	return hits
}
