#!/usr/bin/env python3
"""
attack_patterns.py

Post‑reconnaissance attack pattern engine.
Consumes passive reconnaissance data (from HAWKNET data_fetch) and enriches it
with NVD, CISA KEV and EPSS intelligence to generate categorised attack paths:
- Likely   (known exploited, high EPSS)
- Possible (plausible but not actively targeted)
- Unexpected (low severity / unusual chains that still lead to compromise)

Environment variables:
    NVD_API_KEY   – API key for NIST NVD (optional, higher rate limit)
    CISA_KEV_URL  – Override URL for CISA KEV JSON feed
    EPSS_API_URL  – Override base URL for EPSS API
    EPSS_BATCH_SIZE – Max CVEs per EPSS request (default 100)
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Dict, Iterator, List, Optional, Tuple
from urllib.parse import quote

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("attack_patterns")


# ── Configuration ──────────────────────────────────────────────────────────
NVD_API_KEY = os.getenv("NVD_API_KEY", "")
CISA_KEV_URL = os.getenv(
    "CISA_KEV_URL",
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
)
EPSS_API_URL = os.getenv("EPSS_API_URL", "https://api.first.org/data/v1/epss")
EPSS_BATCH_SIZE = int(os.getenv("EPSS_BATCH_SIZE", "100"))


# ── Robust HTTP session ───────────────────────────────────────────────────
def _session() -> requests.Session:
    s = requests.Session()
    retries = Retry(total=5, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    s.headers.update({"User-Agent": "HAWKNET-attack_patterns/1.0"})
    return s


# ── Data Models ────────────────────────────────────────────────────────────
@dataclass
class Service:
    port: int
    protocol: str  # tcp / udp
    name: str      # e.g. 'http', 'ssh'
    product: Optional[str] = None
    version: Optional[str] = None
    extra_info: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Asset:
    id: str
    ip: str
    hostname: Optional[str] = None
    tags: List[str] = field(default_factory=list)  # e.g. 'internet-facing', 'database'
    services: List[Service] = field(default_factory=list)


@dataclass
class Connection:
    source_id: str
    target_id: str
    protocol: str
    port: int
    description: Optional[str] = None


@dataclass
class Vulnerability:
    cve_id: str
    description: str
    cvss_score: float
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    is_known_exploited: bool = False
    epss_score: Optional[float] = None
    epss_percentile: Optional[float] = None
    affected_product: Optional[str] = None
    references: List[str] = field(default_factory=list)


@dataclass
class AttackStep:
    asset_id: str
    service: Service
    vulnerability: Vulnerability
    step_type: str  # 'initial_access', 'lateral_movement', 'privilege_escalation'
    likelihood: str  # 'likely', 'possible', 'unexpected'


@dataclass
class AttackPath:
    steps: List[AttackStep]
    overall_likelihood: str
    title: str
    description: str = ""


# ── External API Clients ──────────────────────────────────────────────────

class NVDClient:
    BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.session = _session()

    def search_by_product(
        self, product: str, version: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search NVD CVEs by product and optional version using keyword search."""
        keyword = product
        if version:
            keyword += f" {version}"
        params = {
            "keywordSearch": keyword,
            "resultsPerPage": 20,
            "startIndex": 0,
        }
        if self.api_key:
            params["apiKey"] = self.api_key

        try:
            resp = self.session.get(self.BASE_URL, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data.get("vulnerabilities", [])
        except requests.RequestException as e:
            logger.error(f"NVD request failed: {e}")
            return []

    def parse_cve_item(self, item: Dict[str, Any]) -> Optional[Vulnerability]:
        cve = item.get("cve", {})
        cve_id = cve.get("id")
        if not cve_id:
            return None

        descriptions = cve.get("descriptions", [])
        desc = next((d["value"] for d in descriptions if d.get("lang") == "en"), str(descriptions))

        metrics = cve.get("metrics", {})
        cvss_score = 0.0
        severity = "NONE"
        # Prefer CVSS v3.1
        cvss_v3 = metrics.get("cvssMetricV31", []) or metrics.get("cvssMetricV30", [])
        if cvss_v3:
            cvss_data = cvss_v3[0].get("cvssData", {})
            cvss_score = cvss_data.get("baseScore", 0.0)
            severity = cvss_data.get("baseSeverity", "NONE")
        else:
            # Fallback to v2
            cvss_v2 = metrics.get("cvssMetricV2", [])
            if cvss_v2:
                cvss_data = cvss_v2[0].get("cvssData", {})
                cvss_score = cvss_data.get("baseScore", 0.0)
                severity = cvss_data.get("baseSeverity", "NONE")

        references = [ref["url"] for ref in cve.get("references", []) if "url" in ref]

        return Vulnerability(
            cve_id=cve_id,
            description=desc,
            cvss_score=cvss_score,
            severity=severity,
            references=references,
        )


class CISAClient:
    def __init__(self, feed_url: str = CISA_KEV_URL):
        self.feed_url = feed_url
        self.session = _session()
        self._kev_data: Optional[dict] = None

    def fetch_kev(self) -> dict:
        if self._kev_data is None:
            try:
                resp = self.session.get(self.feed_url, timeout=30)
                resp.raise_for_status()
                self._kev_data = resp.json()
            except requests.RequestException as e:
                logger.error(f"CISA KEV fetch failed: {e}")
                self._kev_data = {}
        return self._kev_data

    def is_known_exploited(self, cve_id: str) -> bool:
        kev = self.fetch_kev()
        vulnerabilities = kev.get("vulnerabilities", [])
        return any(v.get("cveID") == cve_id for v in vulnerabilities)


class EPSSClient:
    def __init__(self, api_url: str = EPSS_API_URL):
        self.api_url = api_url
        self.session = _session()

    def fetch_scores(self, cve_ids: List[str]) -> Dict[str, Tuple[float, float]]:
        """Return dict: cve_id -> (epss_score, percentile). Supports batching."""
        result: Dict[str, Tuple[float, float]] = {}
        if not cve_ids:
            return result

        # Batch requests
        for i in range(0, len(cve_ids), EPSS_BATCH_SIZE):
            batch = cve_ids[i : i + EPSS_BATCH_SIZE]
            cve_param = ",".join(batch)
            params = {"cve": cve_param}
            try:
                resp = self.session.get(self.api_url, params=params, timeout=30)
                resp.raise_for_status()
                data = resp.json()
                items = data.get("data", [])
                for item in items:
                    cve = item.get("cve")
                    epss = item.get("epss")
                    percentile = item.get("percentile")
                    if cve and epss is not None and percentile is not None:
                        result[cve] = (float(epss), float(percentile))
            except requests.RequestException as e:
                logger.error(f"EPSS request failed: {e}")
            time.sleep(0.5)  # polite delay between batches
        return result


# ── Enrichment Engine ─────────────────────────────────────────────────────

def enrich_vulnerabilities(
    vulns: List[Vulnerability],
    cisa_client: CISAClient,
    epss_client: EPSSClient,
) -> List[Vulnerability]:
    """Annotate vulnerabilities with CISA KEV and EPSS data."""
    cve_ids = [v.cve_id for v in vulns]
    epss_scores = epss_client.fetch_scores(cve_ids) if cve_ids else {}

    for v in vulns:
        v.is_known_exploited = cisa_client.is_known_exploited(v.cve_id)
        if v.cve_id in epss_scores:
            v.epss_score, v.epss_percentile = epss_scores[v.cve_id]
    return vulns


def match_service_vulnerabilities(
    service: Service,
    nvd_client: NVDClient,
    cisa_client: CISAClient,
    epss_client: EPSSClient,
) -> List[Vulnerability]:
    """Find vulnerabilities relevant to a service."""
    if not service.product:
        return []

    raw_items = nvd_client.search_by_product(service.product, service.version)
    vulns = []
    for item in raw_items:
        v = nvd_client.parse_cve_item(item)
        if v:
            v.affected_product = service.product
            vulns.append(v)

    return enrich_vulnerabilities(vulns, cisa_client, epss_client)


# ── Attack Path Generator ─────────────────────────────────────────────────

def _determine_likelihood(vuln: Vulnerability) -> str:
    """Classify a single vulnerability step."""
    if vuln.is_known_exploited:
        return "likely"
    if vuln.epss_score is not None and vuln.epss_score > 0.1:
        return "likely"
    if vuln.cvss_score >= 7.0:
        return "possible"
    # Low severity but still exploitable -> unexpected
    return "unexpected"


def _overall_likelihood(steps: List[AttackStep]) -> str:
    """Overall likelihood of a path is the most dangerous step."""
    if any(s.likelihood == "likely" for s in steps):
        return "likely"
    if any(s.likelihood == "possible" for s in steps):
        return "possible"
    return "unexpected"


def generate_attack_paths(
    assets: List[Asset],
    connections: List[Connection],
    nvd_client: NVDClient,
    cisa_client: CISAClient,
    epss_client: EPSSClient,
    max_path_length: int = 5,
) -> List[AttackPath]:
    """Build multi-step attack paths from internet-facing assets to internal targets."""
    # Build asset index
    asset_by_id: Dict[str, Asset] = {a.id: a for a in assets}
    # Adjacency mapping: asset -> list of (neighbor_id, connection)
    adjacency: Dict[str, List[Tuple[str, Connection]]] = defaultdict(list)
    for conn in connections:
        adjacency[conn.source_id].append((conn.target_id, conn))
        adjacency[conn.target_id].append((conn.source_id, conn))

    # Identify internet-facing assets (entry points)
    entry_ids = {a.id for a in assets if "internet-facing" in a.tags}
    if not entry_ids:
        logger.warning("No internet-facing assets tagged – using all assets as entry points")
        entry_ids = {a.id for a in assets}

    # Pre-compute vulnerabilities for all assets
    asset_vuln_map: Dict[str, List[AttackStep]] = {}
    for asset in assets:
        steps: List[AttackStep] = []
        for svc in asset.services:
            vulns = match_service_vulnerabilities(svc, nvd_client, cisa_client, epss_client)
            for v in vulns:
                step_type = "initial_access" if asset.id in entry_ids else "lateral_movement"
                step = AttackStep(
                    asset_id=asset.id,
                    service=svc,
                    vulnerability=v,
                    step_type=step_type,
                    likelihood=_determine_likelihood(v),
                )
                steps.append(step)
        asset_vuln_map[asset.id] = steps

    # BFS from each entry point to find paths to "valuable" assets (e.g., tagged 'database')
    target_tags = {"database", "critical", "domain-controller"}
    target_ids = {a.id for a in assets if set(a.tags) & target_tags}
    if not target_ids:
        # if no explicit targets, treat any internal asset as target
        target_ids = {a.id for a in assets if a.id not in entry_ids}

    all_paths: List[AttackPath] = []

    for entry_id in entry_ids:
        # BFS storing (current_asset_id, step_history)
        queue: deque = deque()
        queue.append((entry_id, []))
        visited_states = set()  # avoid loops: (asset, tuple of step cve_ids)

        while queue:
            current, path_steps = queue.popleft()
            current_asset = asset_by_id.get(current)
            if not current_asset:
                continue

            # If we reached a target and have at least one step, record path
            if current in target_ids and path_steps:
                path = AttackPath(
                    steps=path_steps,
                    overall_likelihood=_overall_likelihood(path_steps),
                    title=f"Attack from {entry_id} to {current}",
                    description=f"Compromised via {len(path_steps)} step(s)",
                )
                all_paths.append(path)
                continue  # stop expanding after reaching target (or continue for longer paths)

            if len(path_steps) >= max_path_length:
                continue

            # Attempt lateral movement via vulnerabilities on current asset
            # Vulnerability exploitation grants control of the host,
            # then we can pivot to any adjacent asset reachable.
            # Use vulnerabilities of current asset to justify moving to neighbours
            for step in asset_vuln_map.get(current, []):
                for neighbor_id, conn in adjacency.get(current, []):
                    # Skip if neighbor already in path (loop prevention)
                    if any(s.asset_id == neighbor_id for s in path_steps):
                        continue
                    # Create a new step for lateral movement
                    new_step = AttackStep(
                        asset_id=current,
                        service=step.service,
                        vulnerability=step.vulnerability,
                        step_type="lateral_movement",
                        likelihood=step.likelihood,
                    )
                    new_history = path_steps + [new_step]
                    state_key = (neighbor_id, tuple(s.vulnerability.cve_id for s in new_history))
                    if state_key not in visited_states:
                        visited_states.add(state_key)
                        queue.append((neighbor_id, new_history))

    return all_paths


# ── Main Orchestration ────────────────────────────────────────────────────

def process_recon_data(recon_data: dict) -> dict:
    """
    Entry point: takes dictionary from HAWKNET data_fetch passive recon.
    Expected structure (minimal):
    {
      "assets": [
        { "id": "...", "ip": "...", "hostname": "...", "tags": [...], "services": [...] },
        ...
      ],
      "connections": [
        { "source_id": "...", "target_id": "...", "protocol": "...", "port": ..., "description": "..." },
        ...
      ]
    }
    Returns a dictionary with 'attack_paths' key containing list of AttackPath (serialized).
    """
    assets_raw = recon_data.get("assets", [])
    connections_raw = recon_data.get("connections", [])

    assets = [
        Asset(
            id=a["id"],
            ip=a["ip"],
            hostname=a.get("hostname"),
            tags=a.get("tags", []),
            services=[Service(**s) for s in a.get("services", [])],
        )
        for a in assets_raw
    ]
    connections = [Connection(**c) for c in connections_raw]

    nvd = NVDClient(NVD_API_KEY)
    cisa = CISAClient()
    epss = EPSSClient()

    paths = generate_attack_paths(assets, connections, nvd, cisa, epss)
    result_paths = []
    for p in paths:
        result_paths.append(
            {
                "overall_likelihood": p.overall_likelihood,
                "title": p.title,
                "description": p.description,
                "steps": [
                    {
                        "asset_id": s.asset_id,
                        "service": f"{s.service.name}:{s.service.port}",
                        "cve": s.vulnerability.cve_id,
                        "cvss": s.vulnerability.cvss_score,
                        "likelihood": s.likelihood,
                        "description": s.vulnerability.description[:120],
                    }
                    for s in p.steps
                ],
            }
        )
    return {"attack_paths": result_paths}


# ── CLI Entry Point ──────────────────────────────────────────────────────
def main():
    import argparse

    parser = argparse.ArgumentParser(description="HAWKNET Attack Pattern Engine")
    parser.add_argument(
        "input", nargs="?", help="Path to JSON recon file (default: stdin)", default="-"
    )
    parser.add_argument(
        "-o", "--output", help="Output JSON file (default: stdout)", default="-"
    )
    args = parser.parse_args()

    if args.input == "-":
        raw = sys.stdin.read()
    else:
        with open(args.input, "r") as f:
            raw = f.read()

    try:
        recon_data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid input JSON: {e}")
        sys.exit(1)

    result = process_recon_data(recon_data)

    output_json = json.dumps(result, indent=2)
    if args.output == "-":
        print(output_json)
    else:
        with open(args.output, "w") as f:
            f.write(output_json)
        logger.info(f"Written to {args.output}")


if __name__ == "__main__":
    main()