package config

import (
	"bufio"
	"encoding/json"
	"os"
	"strings"
)

// AIConfig holds optional AI provider keys.
type AIConfig struct {
	AnthropicKey string `json:"anthropic_key,omitempty"`
	OpenAIKey    string `json:"openai_key,omitempty"`
	GeminiKey    string `json:"gemini_key,omitempty"`
}

// APIConfig holds external intel API keys and URLs.
type APIConfig struct {
	NVDKey     string `json:"nvd_key,omitempty"`
	CISAKevURL string `json:"cisa_kev_url"`
	EPSSAPIURL string `json:"epss_api_url"`
	ShodanKey  string `json:"shodan_key,omitempty"`
}

// RuntimeFlags are written by the Tauri UI and override .env values.
// Stored at hawknet_runtime.json so both Go and Rust can read them.
type RuntimeFlags struct {
	AIEnabled     bool `json:"ai_enabled"`
	ShodanEnabled bool `json:"shodan_enabled"`
	PassiveOnly   bool `json:"passive_only"`
}

// Config is the single source of truth passed to every module.
type Config struct {
	AI      AIConfig
	APIs    APIConfig
	Runtime RuntimeFlags
}

// Load reads .env first, then overlays hawknet_runtime.json if present.
func Load(envPath string, runtimePath string) (*Config, error) {
	loadDotEnv(envPath)

	cfg := &Config{
		AI: AIConfig{
			AnthropicKey: os.Getenv("ANTHROPIC_API_KEY"),
			OpenAIKey:    os.Getenv("OPENAI_API_KEY"),
			GeminiKey:    os.Getenv("GOOGLE_API_KEY"),
		},
		APIs: APIConfig{
			NVDKey:     os.Getenv("NVD_API_KEY"),
			CISAKevURL: envOrDefault("CISA_KEV_URL", "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"),
			EPSSAPIURL: envOrDefault("EPSS_API_URL", "https://api.first.org/data/v1/epss"),
			ShodanKey:  os.Getenv("SHODAN_API_KEY"),
		},
		Runtime: RuntimeFlags{
			AIEnabled:     hasAnyKey(os.Getenv("ANTHROPIC_API_KEY"), os.Getenv("OPENAI_API_KEY"), os.Getenv("GOOGLE_API_KEY")),
			ShodanEnabled: os.Getenv("SHODAN_API_KEY") != "",
			PassiveOnly:   false,
		},
	}

	// Overlay runtime JSON written by the Tauri UI toggle
	if runtimePath != "" {
		if data, err := os.ReadFile(runtimePath); err == nil {
			var rt RuntimeFlags
			if err := json.Unmarshal(data, &rt); err == nil {
				cfg.Runtime = rt
			}
		}
	}

	return cfg, nil
}

// AIAvailable returns true when AI is enabled AND at least one key is set.
func (c *Config) AIAvailable() bool {
	return c.Runtime.AIEnabled && hasAnyKey(c.AI.AnthropicKey, c.AI.OpenAIKey, c.AI.GeminiKey)
}

// ── Internal helpers ──────────────────────────────────────────────────────

// loadDotEnv parses a .env file and sets env vars (stdlib only, no deps).
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return // .env is optional
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.Trim(strings.TrimSpace(v), `"'`)
		if k != "" && os.Getenv(k) == "" {
			_ = os.Setenv(k, v)
		}
	}
}

func hasAnyKey(keys ...string) bool {
	for _, k := range keys {
		if k != "" {
			return true
		}
	}
	return false
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
