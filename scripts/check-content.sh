#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .reports
python3 -I tests/fixtures/approved-seed/check-content.py --root apps/site/dist --report .reports/content-parity.json --strict-metadata
