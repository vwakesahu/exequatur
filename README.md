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

## Layout

```
contracts/   Foundry — MockUSDC + AttestationEnforcer + unit tests (Layer 1, runs offline)
sdk/         TypeScript — create→sign→redeem flow, policy service, Venice, e2e (Layer 2)
docs/        threat model, action-hash spec, milestone map
```

See [docs/MILESTONES.md](docs/MILESTONES.md) for the build order and
[docs/ACTION_HASH.md](docs/ACTION_HASH.md) for the canonical hash that the off-chain policy
service and the on-chain enforcer must agree on (the most bug-prone seam).

## Quick start

```bash
# 1. enforcer unit tests (offline, no creds — proves the security claims)
cd contracts && forge test -vvv

# 2. TS integration (needs RPC_URL + funded keys in .env)
cd sdk && pnpm install
cp ../.env.example ../.env   # fill it in
pnpm e2e
```
