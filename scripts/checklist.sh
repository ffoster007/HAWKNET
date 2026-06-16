#!/usr/bin/env bash
set -euo pipefail

GREEN=$'\e[32m'
RED=$'\e[31m'
RESET=$'\e[0m'

check_cmd() {
  local name="$1"
  local candidates="$2"

  local found=0
  for cmd in $candidates; do
    if command -v "$cmd" >/dev/null 2>&1; then
      found=1
      break
    fi
  done
  

  if [[ "$found" -eq 1 ]]; then
    printf "%-20s [%sON DEVICE%s]\n" "$name" "$GREEN" "$RESET"
  else
    printf "%-20s [%sNOT FOUND%s]\n" "$name" "$RED" "$RESET"
  fi
}



tools=(
  "Nmap|nmap"
  "SQLMap|sqlmap"
  "Nuclei|nuclei"
  "ffuf|ffuf"
  "Gobuster|gobuster"
  "Dirsearch|dirsearch"
  "WhatWeb|whatweb"
  "Nikto|nikto"
  "Feroxbuster|feroxbuster"
  "Wfuzz|wfuzz"
  "Subfinder|subfinder"
  "Amass|amass"
  "Assetfinder|assetfinder"
  "httpx|httpx"
  "naabu|naabu"
  "gau|gau"
  "waybackurls|waybackurls"
  "hakrawler|hakrawler"
  "katana|katana"
  "Dirb|dirb"
  "Hydra|hydra"
  "John the Ripper|john"
  "Hashcat|hashcat"
)

echo "== Web Pentest Tool Check =="
echo

for item in "${tools[@]}"; do
  IFS='|' read -r name cmds <<< "$item"
  check_cmd "$name" "$cmds"
done