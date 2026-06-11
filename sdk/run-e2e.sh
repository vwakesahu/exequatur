#!/usr/bin/env bash
# Run the full delegation-firewall e2e against a local Anvil fork of Base Sepolia.
# No secrets required: fresh keys are generated and funded on the fork via anvil_setBalance.
set -euo pipefail

FORK_URL="${FORK_URL:-https://sepolia.base.org}"
PORT="${PORT:-8545}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [-r FORK_RPC_URL] [-p PORT] [-h]

  -r  Base Sepolia RPC to fork (default: ${FORK_URL})
  -p  local anvil port           (default: ${PORT})
  -h  show this help

Set VENICE_API_KEY in ../.env to gate payments with the real Venice brain (M4);
otherwise the deterministic stub is used.
EOF
}

while getopts ":r:p:h" opt; do
  case "$opt" in
    r) FORK_URL="$OPTARG" ;;
    p) PORT="$OPTARG" ;;
    h) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done

cd "$(dirname "$0")"

# ---- preflight ----
for bin in anvil node pnpm; do
  command -v "$bin" >/dev/null 2>&1 || { echo "✗ missing dependency: $bin"; exit 1; }
done
[ -d node_modules ] || { echo "· installing sdk deps"; pnpm install; }
if [ ! -f ../contracts/out/AttestationEnforcer.sol/AttestationEnforcer.json ]; then
  echo "· building contracts"; ( cd ../contracts && forge build >/dev/null )
fi

# ---- start fork ----
echo "· starting anvil fork of ${FORK_URL} on port ${PORT}"
anvil --fork-url "$FORK_URL" --port "$PORT" --silent >/tmp/anvil-firewall.log 2>&1 &
ANVIL_PID=$!

teardown() {
  kill "$ANVIL_PID" >/dev/null 2>&1 || true
}
trap teardown EXIT INT TERM

# wait for the node to answer
for _ in $(seq 1 30); do
  if cast chain-id --rpc-url "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

# ---- run ----
RPC_URL="http://127.0.0.1:${PORT}" npx tsx src/e2e.ts
