import { type Address, erc20Abi, formatUnits, parseUnits } from "viem";
import { attemptPayment } from "./agent.js";
import { createRootDelegation, createWorkerRedelegation } from "./delegation.js";
import { log } from "./log.js";
import { buildPolicyService } from "./policy.js";
import { PolicyService, makeAllowAllBrain } from "./policy-service.js";
import { setup } from "./setup.js";

let failures = 0;
function check(label: string, ok: boolean) {
  if (ok) log.pass(label);
  else {
    log.fail(label);
    failures += 1;
  }
}

async function main() {
  log.section("Setup");
  const ctx = await setup();
  const { service, mode } = buildPolicyService(ctx);
  log.step(`Policy brain: ${mode === "venice" ? service.brainName : "deterministic stub (set VENICE_API_KEY for real Venice)"}`);
  log.step(`Policy signer: ${ctx.policySigner}`);

  const usdc = ctx.usdc;
  const bal = (a: Address) => ctx.pub.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [a] });

  // ───────────────────────────── Scenario 1: happy path (single agent)
  log.section("Scenario 1 — happy path: agent pays an approved merchant within cap");
  const root = await createRootDelegation(ctx, parseUnits("100", 6));
  log.step("user signed root delegation: smart account → agent, cap 100 mUSDC + firewall caveat");
  const m0 = await bal(ctx.merchant);
  const r1 = await attemptPayment({
    ctx,
    service,
    actor: "agent",
    redeemerKey: ctx.agentKey,
    chain: [root],
    intent: "Pay the merchant up to 100 mUSDC to settle the order.",
    recipient: ctx.merchant,
    amount: parseUnits("25", 6),
  });
  const m1 = await bal(ctx.merchant);
  check("agent executed the approved payment", r1.executed);
  check(`merchant received 25 mUSDC (Δ ${formatUnits(m1 - m0, 6)})`, m1 - m0 === parseUnits("25", 6));

  // ───────────────────────────── Scenario 2: hijacked agent blocked
  log.section("Scenario 2 — firewall: a hijacked agent's off-intent transfer is refused");
  const a0 = await bal(ctx.attacker);
  const r2 = await attemptPayment({
    ctx,
    service,
    actor: "agent",
    redeemerKey: ctx.agentKey,
    chain: [root],
    intent: "Pay the merchant up to 100 mUSDC to settle the order.",
    recipient: ctx.attacker, // within cap, but NOT the intended recipient
    amount: parseUnits("10", 6),
  });
  const a1 = await bal(ctx.attacker);
  check("payment to attacker was NOT executed (no attestation issued)", !r2.executed);
  check("attacker balance stayed 0", a1 === a0 && a1 === 0n);

  log.section("Scenario 2b — unbypassable: a self-forged attestation is rejected on-chain");
  // Model an attacker who runs their OWN rogue policy that signs with the agent's key (not the real
  // policy key) and approves anything. The redemption carries a well-formed attestation — but the
  // enforcer's terms pin the real policy signer, so it reverts on-chain.
  const rogue = new PolicyService(ctx.agentKey, makeAllowAllBrain());
  const r2b = await attemptPayment({
    ctx,
    service: rogue,
    actor: "agent",
    redeemerKey: ctx.agentKey,
    chain: [root],
    intent: "(rogue) drain to attacker",
    recipient: ctx.attacker,
    amount: parseUnits("10", 6),
  });
  const a2 = await bal(ctx.attacker);
  check("forged (wrong-signer) attestation reverted on-chain", !r2b.executed && !!r2b.revertError);
  check("attacker balance still 0 after forgery attempt", a2 === 0n);

  // ───────────────────────────── Scenario 3: A2A redelegation
  log.section("Scenario 3 — A2A: agent redelegates a narrower scope to a worker sub-agent");
  const redeleg = await createWorkerRedelegation(ctx, root, parseUnits("20", 6));
  log.step("agent signed redelegation: agent → worker, narrowed cap 20 mUSDC + firewall caveat");
  const m2 = await bal(ctx.merchant);
  const r3 = await attemptPayment({
    ctx,
    service,
    actor: "worker",
    redeemerKey: ctx.workerKey,
    chain: [redeleg, root], // leaf → root
    intent: "Pay the merchant up to 100 mUSDC to settle the order.",
    recipient: ctx.merchant,
    amount: parseUnits("15", 6),
  });
  const m3 = await bal(ctx.merchant);
  check("worker executed within the narrowed scope", r3.executed);
  check(`merchant received 15 mUSDC from the worker (Δ ${formatUnits(m3 - m2, 6)})`, m3 - m2 === parseUnits("15", 6));

  log.section("Scenario 3b — A2A bound: worker over the narrowed cap reverts on-chain");
  const m4 = await bal(ctx.merchant);
  const r3b = await attemptPayment({
    ctx,
    service,
    actor: "worker",
    redeemerKey: ctx.workerKey,
    chain: [redeleg, root],
    intent: "Pay the merchant up to 100 mUSDC to settle the order.",
    recipient: ctx.merchant,
    amount: parseUnits("21", 6), // policy-approved (< 100) but exceeds the narrowed 20 cap
  });
  const m5 = await bal(ctx.merchant);
  check("worker's over-cap payment reverted on-chain despite policy approval", !r3b.executed && !!r3b.revertError);
  check("merchant balance unchanged by the reverted attempt", m5 === m4);

  log.section("Summary");
  if (failures === 0) {
    log.pass(`all scenarios passed — firewall + A2A verified end-to-end via the MetaMask Smart Accounts Kit (${mode})`);
  } else {
    log.fail(`${failures} check(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  log.fail(`e2e crashed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exitCode = 1;
});
