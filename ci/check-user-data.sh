#!/usr/bin/env bash
# ci/check-user-data.sh — Guarantee G5
# SPDX-License-Identifier: Apache-2.0
# Delegates to validators/check-user-data-blocklist.sh (same logic).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
exec "$ROOT/validators/check-user-data-blocklist.sh"
