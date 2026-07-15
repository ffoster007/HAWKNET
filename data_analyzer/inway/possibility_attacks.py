# web_vulnerability_tools.py

possibility_attacks = {
    "Reconnaissance / Subdomain Enumeration": [
        "Amass",
        "Subfinder",
        "Assetfinder",
        "crt.sh",
        "Sublist3r",
        "theHarvester",
        "Shodan",
        "Censys",
        "URLScan.io",
        "AlienVault OTX"
    ],
    "Web Crawling / Content Discovery": [
        "Gobuster",
        "ffuf",
        "Dirsearch",
        "Feroxbuster",
        "Wfuzz",
        "Katana",
        "Gau (GetAllUrls)",
        "Waybackurls",
        "LinkFinder"
    ],
    "Vulnerability Scanners": [
        "Burp Suite",
        "OWASP ZAP",
        "Nikto",
        "Nuclei",
        "Acunetix",
        "Nessus",
        "Wapiti",
        "Arachni"
    ],
    "Port / Service Scanning": [
        "Nmap",
        "RustScan",
        "Masscan",
        "Naabu"
    ],
    "SQL Injection": [
        "SQLmap",
        "NoSQLMap"
    ],
    "XSS": [
        "XSStrike",
        "Dalfox",
        "BruteXSS"
    ],
    "CMS / Framework Specific": [
        "WPScan (WordPress)",
        "Droopescan (Drupal/Joomla)",
        "JoomScan"
    ],
    "SSL/TLS Testing": [
        "SSLyze",
        "testssl.sh"
    ],
    "API / GraphQL Testing": [
        "Postman",
        "GraphQL Voyager",
        "InQL",
        "Kiterunner"
    ],
    "Proxy / Traffic Interception": [
        "Burp Suite Proxy",
        "OWASP ZAP Proxy",
        "mitmproxy"
    ],
    "Fuzzing": [
        "ffuf",
        "Wfuzz",
        "Radamsa"
    ],
    "Source Map / JS Analysis": [
        "SourceMapper",
        "JSParser",
        "LinkFinder"
    ],
    "Misc / Exploitation Frameworks": [
        "Metasploit Framework",
        "SearchSploit (Exploit-DB)"
    ],
    "Cloud / Infrastructure Recon": [
        "CloudEnum",
        "S3Scanner",
        "ScoutSuite"
    ]
}