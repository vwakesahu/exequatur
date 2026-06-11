# Delegation-Firewall Agent

An on-chain **firewall for autonomous agents**, built on the MetaMask Smart Accounts Kit
(formerly Delegation Toolkit). A user delegates a *scoped* spending permission to an agent;
every redemption must additionally carry a **fresh signed attestation** from an off-chain
policy service that checks the action against the user's intent (using Venice). The check is
made **unbypassable** by a custom on-chain caveat enforcer.

> Status: backend + E2E (no frontend). Tracks targeted: **A2A coordination**, **Best Agent**,
> **Best use of Venice**.

## The idea in one diagram

```
intent ─▶ agent (EOA delegate) ─▶ policy-service ──(Venice verdict)──▶ attestation (ECDSA sig)
                   │                                                          │
                   └────────── redeemDelegations(execution, attestation) ─────┘
                                            │
                                   DelegationManager
                                            │  runs every caveat:
                                   ┌────────┴─────────┐
                          Erc20TransferAmount   AttestationEnforcer  ◀── the firewall
                          (hard spend cap)      (fresh policy sig req'd)
                                            │
                                   delegator smart account moves USDC ─▶ merchant
```

If the agent is hijacked / prompt-injected and tries something outside intent, the policy
service refuses to sign — and with no valid attestation the redemption **reverts on-chain**,
even though it is within the spend cap and "looks" legal.

## Threat model (bounded on purpose)

**Protected against**
- a hijacked / prompt-injected agent acting outside the user's intent or granted scope
- a malicious or low-reputation sub-agent (redelegate)
- replay of a stale approval (single-use attestations, keyed per delegation)

**Not protected against**
- the user signing a bad root delegation themselves
- compromise of the policy service signing key
- a malicious merchant / fulfiller

## How it's built

- **On-chain (Foundry):** [`MockUSDC`](contracts/src/MockUSDC.sol), the custom
  [`AttestationEnforcer`](contracts/src/AttestationEnforcer.sol) caveat, and the audited MetaMask
  **Delegation Framework v1.3.0** (installed, not written).
- **Off-chain (TypeScript):** the real **MetaMask Smart Accounts Kit** (`@metamask/smart-accounts-kit`,
  the package formerly called the Delegation Toolkit), a [policy service](sdk/src/policy-service.ts)
  that gates every action, and a [Venice client](sdk/src/venice.ts) for the verdict.

```
contracts/   Foundry — MockUSDC + AttestationEnforcer + tests (Layer 1, runs offline)
sdk/         TypeScript — create→sign→redeem via the Smart Accounts Kit, policy service, Venice, e2e
docs/        milestone map + the canonical action-hash spec
```

See [docs/MILESTONES.md](docs/MILESTONES.md) for the build order/status and
[docs/ACTION_HASH.md](docs/ACTION_HASH.md) for the canonical hash the off-chain policy service and
the on-chain enforcer must agree on (the most bug-prone seam — guarded by tests in both languages).

## What's verified

**Layer 1 — Foundry (offline, no creds), 16 tests** — `cd contracts && forge test`
- enforcer unit matrix: valid / missing / wrong-signer / expired / replayed / tampered / per-delegation keying / bad terms
- real `DelegationManager.redeemDelegations` integration: happy path, over-cap revert, within-cap-but-unapproved revert
- A2A redelegation: worker within narrowed cap succeeds, over narrowed cap reverts, absent-root chain reverts
- cross-language action-hash parity (golden vector)

**Layer 2 — SDK unit tests, 11 tests** — `cd sdk && pnpm test`
- action-hash parity + field binding; policy service approve/deny + attestation recovery; Venice
  client (mocked transport): `decision` schema, fenced untrusted input, **fail-closed** on
  error/unparseable/unknown-flag, fence stripping

**Layer 2 — end-to-end on a Base Sepolia fork, 6 scenarios** — `cd sdk && ./run-e2e.sh`
- happy path · firewall refuses off-intent transfer · **forged attestation rejected on-chain** ·
  A2A worker within scope · A2A over-cap reverts on-chain

## Quick start

```bash
# 1. on-chain security proofs (offline, no creds)
cd contracts && ./install-deps.sh && forge test -vvv

# 2. SDK unit tests (offline)
cd sdk && pnpm install && pnpm test

# 3. full end-to-end against a Base Sepolia fork (no secrets — fresh keys funded on the fork).
#    Needs `anvil` (Foundry) + `pnpm`. Starts/stops the fork for you.
cd sdk && ./run-e2e.sh
```

To gate payments with **real Venice** (M4) instead of the deterministic stub, set `VENICE_API_KEY`
(and optionally `VENICE_MODEL`, default `qwen3-4b`) in `sdk/.env` before step 3 — see
[.env.example](.env.example). The Venice verdict is load-bearing (it judges intent-match and flags
prompt-injection in untrusted agent context) and **fails closed** — any API error, timeout, or
malformed output denies, so no funds move. Note the account needs inference credits; without them
the API returns `402` and every payment is (correctly) refused.

### Notes for graders

- **No bundler anywhere.** The agent/worker are EOA delegates, so redemption is a plain transaction
  to the DelegationManager via the ERC-7710 wallet action (`sendTransactionWithDelegation`). Only the
  funded *delegator* is a smart account.
- **The e2e generates fresh keys per run.** The well-known Anvil dev addresses carry leftover
  EIP-7702 delegations on real Base Sepolia, which makes the DelegationManager treat an EOA
  *redelegator* as a contract and breaks A2A — a real, documented gotcha we hit and worked around.
