package scanner

import "github.com/hawknet/data_fetch/internal/types"

// Re-export shared types so existing code using scanner.X still works
type (
	TargetType        = types.TargetType
	ScanTarget        = types.ScanTarget
	PortResult        = types.PortResult
	SubdomainResult   = types.SubdomainResult
	TLSInfo           = types.TLSInfo
	FingerprintResult = types.FingerprintResult
	VulnHit           = types.VulnHit
	ScanResult        = types.ScanResult
)

const (
	TargetDomain = types.TargetDomain
	TargetIP     = types.TargetIP
)
