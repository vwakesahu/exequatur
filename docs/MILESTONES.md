# Milestones & status

Build order from the plan, with current status. "Green" = automated checks pass.

| # | Milestone | What it proves | Status |
|---|-----------|----------------|--------|
| **M0** | Setup: contracts project, deploy MockUSDC, create accounts, deploy delegator smart account | infra works, no bundler needed | ✅ green |
| **M1** | Built-in spend-limit caveat only: create → sign → redeem; happy path + over-cap revert | **Best Agent** qualification — scoped delegation redeemed by an agent | ✅ green |
| **M2** | Custom `AttestationEnforcer` + policy service (stub Venice); unapproved-within-cap reverts | the firewall: off-chain decision made unbypassable on-chain | ✅ green |
| **M3** | Redelegation agent → worker with a narrowed scope; A2A matrix | **A2A** qualification — redelegation enforced on-chain | ✅ green |
| **M4** | Real Venice replaces the stub in the policy service | **Best use of Venice** — verdict gates real money movement | ✅ green (live, `qwen3-4b`) |

## Where each milestone is verified

- **M1–M3 on-chain (Layer 1, offline):** `contracts/test/` — 16 Foundry tests against the real
  `DelegationManager` v1.3.0. Run `cd contracts && forge test`.
- **M1–M3 end-to-end (Layer 2):** `sdk/src/e2e.ts` — 6 scenarios against a Base Sepolia *fork*
  using the real MetaMask Smart Accounts Kit. Run `sdk/run-e2e.sh`.
- **M4 (Venice):** `sdk/src/venice.ts` is the real client; `buildPolicyService` swaps it in
  automatically when `VENICE_API_KEY` is set. The verdict is **load-bearing** — it judges whether
  the action serves the user's natural-language intent and flags prompt-injection in the untrusted
  agent context — and it **fails closed** (any error/timeout/malformed output → deny). Its
  request/parse/validation logic is unit-tested offline with a mocked transport
  (`sdk/test/venice.test.ts`, 6 tests). The deterministic stub (`makeRuleBrain`) is used when no key
  is present so the matrix stays reproducible.

  **Live run (green):** all 6 e2e scenarios pass through real Venice (`qwen3-4b`). The verdict is
  genuinely model-driven — Scenario 1 approves ("matches the user's intent to settle order #4471
  within the 100 mUSDC limit"); Scenario 2 denies an off-intent transfer and, from the injection
  text planted in the untrusted `AGENT_CONTEXT`, raises `intent_mismatch, amount_exceeds_intent,
  unknown_recipient, prompt_injection` on its own. Reasoning models need `venice_parameters.
  disable_thinking` so the JSON verdict lands in `content` (with a `reasoning_content` fallback);
  fail-closed was also confirmed live (a credit-less account returns `402`, which denies).

## Stop-loss (from the plan)

If redelegation (M3) had proven unstable near the deadline, M1 + M2 + M4 alone still qualify for
**Best Agent** + **Best use of Venice**. M3 is green, so A2A is in.

## Out of scope this phase

No frontend, no 1Shot mainnet relayer, no EIP-7702 upgrades through 1Shot, no x402, nothing FHE.
(1Shot + 7702 only matter for the separate 1Shot mainnet prize.)
