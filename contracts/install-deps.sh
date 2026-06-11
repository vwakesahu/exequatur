#!/usr/bin/env bash
# Install the Foundry dependencies at pinned versions.
# Deps are not vendored into git; this restores lib/ deterministically by tag.
set -euo pipefail
cd "$(dirname "$0")"

forge install foundry-rs/forge-std@v1.16.1
forge install MetaMask/delegation-framework@v1.3.0

echo "deps installed. run: forge test -vvv"
