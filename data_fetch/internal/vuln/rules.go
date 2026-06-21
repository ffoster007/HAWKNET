package vuln

import "strings"

// AttackVectorToPatterns maps CVSSv3 attackVector field to attack pattern names.
// Returns pattern NAMES only — never technique details or PoC steps.
func AttackVectorToPatterns(vector, cveID string) []string {
	switch strings.ToUpper(vector) {
	case "NETWORK":
		return []string{"Remote Attack Surface"}
	case "ADJACENT":
		return []string{"Adjacent Network Attack Surface"}
	case "LOCAL":
		return []string{"Local Access Required"}
	case "PHYSICAL":
		return []string{"Physical Access Required"}
	default:
		return nil
	}
}

// CWEToPatterns maps CWE identifiers to human-readable attack pattern category names.
// This is the core of the non-AI pattern inference — covers the OWASP Top 10
// and most common CWEs seen in web/API targets.
func CWEToPatterns(cwe string) []string {
	// Normalise: "CWE-79" or "79" both work
	cwe = strings.TrimPrefix(strings.ToUpper(cwe), "CWE-")

	patterns, ok := cwePatternMap[cwe]
	if !ok {
		return nil
	}
	return patterns
}

// cwePatternMap maps CWE number → slice of attack pattern category names.
// Only names — no exploit steps, no payloads.
var cwePatternMap = map[string][]string{
	// Injection
	"89":  {"SQL Injection Possibility"},
	"564": {"SQL Injection Possibility"},
	"943": {"NoSQL Injection Possibility"},
	"77":  {"Command Injection Possibility"},
	"78":  {"OS Command Injection Possibility"},
	"917": {"Expression Language Injection Possibility"},
	"94":  {"Code Injection Possibility"},
	"95":  {"Code Injection Possibility"},

	// XSS
	"79": {"Client-Side Injection Opportunity"},
	"80": {"Client-Side Injection Opportunity"},
	"83": {"Client-Side Injection Opportunity"},

	// Broken Access Control
	"284": {"Broken Access Control"},
	"285": {"Broken Access Control"},
	"639": {"Insecure Direct Object Reference"},
	"862": {"Missing Authorization Check"},
	"863": {"Incorrect Authorization"},
	"732": {"Excessive Permission Scope"},

	// Cryptographic Failures
	"326": {"Weak Cryptography"},
	"327": {"Weak Cryptography"},
	"328": {"Weak Hash Algorithm"},
	"330": {"Weak Randomness"},
	"311": {"Sensitive Data Transmitted in Cleartext"},
	"319": {"Sensitive Data Transmitted in Cleartext"},
	"295": {"Certificate Validation Bypass Possibility"},

	// Insecure Design
	"209": {"Information Disclosure Possibility"},
	"200": {"Information Disclosure Possibility"},
	"213": {"Information Disclosure Possibility"},

	// Security Misconfiguration
	"16":   {"Security Misconfiguration"},
	"693":  {"Security Misconfiguration"},
	"1021": {"UI Redress Possibility"},

	// Authentication & Session
	"287": {"Authentication Bypass Possibility"},
	"288": {"Authentication Bypass Possibility"},
	"306": {"Missing Authentication"},
	"307": {"Brute Force Opportunity"},
	"384": {"Session Fixation Possibility"},
	"613": {"Session Management Weakness"},
	"620": {"Weak Credential Policy"},

	// SSRF / CSRF
	"918": {"Server-Side Request Forgery Possibility"},
	"352": {"Cross-Site Request Forgery Possibility"},

	// Path / File
	"22":  {"Path Traversal Possibility"},
	"23":  {"Path Traversal Possibility"},
	"434": {"Unrestricted File Upload Possibility"},
	"552": {"File Exposure Possibility"},

	// Deserialization
	"502": {"Insecure Deserialization Possibility"},

	// XXE / Template
	"611":  {"XML External Entity Possibility"},
	"776":  {"XML External Entity Possibility"},
	"1336": {"Template Injection Possibility"},

	// Buffer / Memory
	"119": {"Memory Corruption Possibility"},
	"120": {"Buffer Overflow Possibility"},
	"125": {"Out-of-Bounds Read Possibility"},
	"787": {"Out-of-Bounds Write Possibility"},

	// DoS
	"400": {"Resource Exhaustion Possibility"},
	"770": {"Resource Exhaustion Possibility"},

	// Race Conditions
	"362": {"Race Condition Possibility"},

	// Supply Chain / Dependencies
	"1104": {"Vulnerable Dependency"},

	// Privilege Escalation
	"269": {"Privilege Escalation Path"},
	"250": {"Privilege Escalation Path"},

	// Open Redirect
	"601": {"Open Redirect Possibility"},

	// Prototype Pollution
	"1321": {"Prototype Pollution Possibility"},
}

// SeverityToRisk converts CVSS severity string to a simple 0–4 risk level
// used for node colouring in the React Flow graph.
func SeverityToRisk(severity string) int {
	switch strings.ToUpper(severity) {
	case "CRITICAL":
		return 4
	case "HIGH":
		return 3
	case "MEDIUM":
		return 2
	case "LOW":
		return 1
	default:
		return 0
	}
}
