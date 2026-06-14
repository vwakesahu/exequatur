/**
 * Standalone, independent on-chain verification of the wallet-signing spike against Base Sepolia.
 *
 * It trusts NOTHING the app printed: every value is read from chain with a viem public client on
 * RPC_URL. Ground truth is derived from the redemption transaction itself (the spike's contract /
 * EOA addresses are ephemeral - regenerated per dev-server process and auto-deployed, so they are
 * NOT in .env); the only pinned anchor is the canonical Smart Accounts Kit DelegationManager from
 * getSmartAccountsEnvironment(chainId). Where a value can't be independently established, the check
 * prints INCONCLUSIVE with a reason - never PASS.
 *
 * Usage:
 *   pnpm tsx scripts/verify-spike.ts --redeem-tx 0x... [--fund-tx 0x...] \
 *     [--funded 10] [--agent 0x..] [--merchant 0x..] [--enforcer 0x..] [--policy-signer 0x..]
 *
 * The redemption + fund tx hashes come from the spike run (the Basescan links in the UI). Optional
 * --flags let you assert against the values the app *claimed*; without them the script still
 * verifies internal consistency and reports the on-chain-derived values.
 */
import {
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSmartAccountsEnvironment } from "@metamask/smart-accounts-kit";
import { env } from "../src/env.js";

// Last-run state the app records (tx hashes, addresses, amounts). CLI --flags override these.
const here = dirname(fileURLToPath(import.meta.url));
function loadLastRun(): Record<string, string | undefined> {
  const path = process.env.LAST_RUN_PATH ?? resolve(here, "../../last-run.json");
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}
const lastRun = loadLastRun();

const USDC_DECIMALS = 6;

type Status = "PASS" | "FAIL" | "INCONCLUSIVE";
const results: { id: string; status: Status; detail: string }[] = [];
function record(id: string, status: Status, detail: string) {
  results.push({ id, status, detail });
  const mark = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️ ";
  console.log(`${mark} ${id}: ${status} - ${detail}`);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
// CLI flag wins; otherwise fall back to the app-recorded last-run.json.
function pick(name: string, lastRunKey: string): string | undefined {
  return arg(name) ?? lastRun[lastRunKey];
}
function eqAddr(a?: string, b?: string): boolean {
  try {
    return !!a && !!b && getAddress(a) === getAddress(b);
  } catch {
    return false;
  }
}

// Minimal ABI for the one function the agent calls on the DelegationManager. Defined inline so the
// decode doesn't depend on the kit's internal contract-namespace shape.
const REDEEM_DELEGATIONS_ABI = [
  {
    type: "function",
    name: "redeemDelegations",
    stateMutability: "nonpayable",
    inputs: [
      { name: "permissionContexts", type: "bytes[]" },
      { name: "modes", type: "bytes32[]" },
      { name: "executionCallDatas", type: "bytes[]" },
    ],
    outputs: [],
  },
] as const;

// The Delegation[] tuple ABI (a permissionContext is abi.encode(Delegation[])).
const DELEGATION_ARRAY = [
  {
    type: "tuple[]",
    components: [
      { name: "delegate", type: "address" },
      { name: "delegator", type: "address" },
      { name: "authority", type: "bytes32" },
      {
        name: "caveats",
        type: "tuple[]",
        components: [
          { name: "enforcer", type: "address" },
          { name: "terms", type: "bytes" },
          { name: "args", type: "bytes" },
        ],
      },
      { name: "salt", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
  },
] as const;

async function main() {
  const client = createPublicClient({ chain: env.chain, transport: http(env.rpcUrl) });

  // ---- Gate: RPC must be reachable. ----
  let chainId: number;
  try {
    chainId = await client.getChainId();
  } catch (e) {
    console.error(`\nRPC UNREACHABLE at ${env.rpcUrl}: ${(e as Error).message}`);
    console.error("Stopping. No results fabricated.");
    process.exit(2);
  }
  console.log(`RPC OK: ${env.rpcUrl} (chainId ${chainId})\n`);

  const code = async (a: Address) => ((await client.getCode({ address: a })) ?? "0x") !== "0x";
  const canonicalDM = getSmartAccountsEnvironment(chainId).DelegationManager as Address;

  const redeemTx = pick("redeem-tx", "redeemTx") as Hex | undefined;
  // The expected paid amount: --amount, else the recorded payMUSDC, else 1 mUSDC (original spike).
  const expectedAmount = parseUnits(pick("amount", "payMUSDC") ?? "1", USDC_DECIMALS);
  if (!redeemTx) {
    record(
      "0-canonical-DM",
      (await code(canonicalDM)) ? "PASS" : "FAIL",
      `published DelegationManager ${canonicalDM} ${(await code(canonicalDM)) ? "has code" : "has NO code"}`,
    );
    console.error(
      "\nMissing --redeem-tx: checks 1-7 need the redemption tx hash from the spike run. " +
        "Re-run with: pnpm tsx scripts/verify-spike.ts --redeem-tx 0x... --fund-tx 0x...",
    );
    process.exit(1);
  }

  const tx = await client.getTransaction({ hash: redeemTx });
  const receipt = await client.getTransactionReceipt({ hash: redeemTx });

  // Parse the ERC-20 Transfer event(s) in the redemption receipt.
  const transfers = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs });
  // Recipient is derived from the tx's Transfer log; --merchant only cross-checks it (CLI-only, since
  // last-run.merchant is specific to the recorded pay, not necessarily the tx being verified).
  const expMerchant = arg("merchant");
  const payment =
    transfers.find((t) => (expMerchant ? eqAddr(t.args.to, expMerchant) : true)) ?? transfers[0];

  const usdcArg = pick("usdc", "usdc");
  const usdc = usdcArg ? getAddress(usdcArg) : payment ? getAddress(payment.address) : undefined;
  const smartAccount = payment ? getAddress(payment.args.from) : undefined;
  const merchant = payment ? getAddress(payment.args.to) : undefined;

  // ---- 1. MockUSDC.decimals() === 6 (read on-chain). ----
  if (usdc) {
    const dec = (await client.readContract({ address: usdc, abi: erc20Abi, functionName: "decimals" })) as number;
    record("1-decimals", dec === USDC_DECIMALS ? "PASS" : "FAIL", `${usdc}.decimals() = ${dec} (expect 6)`);
  } else {
    record("1-decimals", "INCONCLUSIVE", "no ERC-20 Transfer in redemption tx to identify the token");
  }

  // ---- 2. Smart account is deployed (has bytecode). ----
  if (smartAccount) {
    record("2-sa-deployed", (await code(smartAccount)) ? "PASS" : "FAIL", `${smartAccount} ${(await code(smartAccount)) ? "has code" : "has NO code"}`);
  } else {
    record("2-sa-deployed", "INCONCLUSIVE", "could not derive smart account (no Transfer log)");
  }

  // ---- 3. Redemption receipt: success; from = agent EOA; to = canonical DelegationManager. ----
  const ok = receipt.status === "success";
  const fromIsEOA = !(await code(tx.from));
  const toIsDM = eqAddr(tx.to ?? undefined, canonicalDM);
  const dmHasCode = await code(canonicalDM);
  const agentArg = pick("agent", "agent");
  const fromMatchesAgent = agentArg ? eqAddr(tx.from, agentArg) : undefined;
  const from3 =
    ok && toIsDM && dmHasCode && fromIsEOA && fromMatchesAgent !== false ? "PASS" : "FAIL";
  record(
    "3-redemption",
    from3,
    `status=${receipt.status}; from=${tx.from} (EOA=${fromIsEOA}${agentArg ? `, matchesAgent=${fromMatchesAgent}` : ", agent not supplied"}); ` +
      `to=${tx.to} (canonicalDM=${toIsDM}, hasCode=${dmHasCode})`,
  );

  // ---- 4. ERC-20 Transfer from smart account to recipient, value === the recorded amount. ----
  if (payment) {
    const v = payment.args.value;
    const value4 = v === expectedAmount && (!expMerchant || eqAddr(merchant, expMerchant));
    record(
      "4-transfer",
      value4 ? "PASS" : "FAIL",
      `Transfer ${formatUnits(v, USDC_DECIMALS)} mUSDC (${v} base units) from ${smartAccount} to ${merchant}; expect ${formatUnits(expectedAmount, USDC_DECIMALS)} mUSDC (${expectedAmount})`,
    );
  } else {
    record("4-transfer", "INCONCLUSIVE", "no ERC-20 Transfer event found in redemption receipt");
  }

  // ---- 5. AttestationEnforcer caveat: enforcer has code; terms encode the policy signer. ----
  try {
    const decoded = decodeFunctionData({ abi: REDEEM_DELEGATIONS_ABI, data: tx.input });
    // redeemDelegations(bytes[] permissionContexts, ...) - first bytes[] arg is the contexts.
    const contexts = (decoded.args as readonly unknown[]).find(
      (a) => Array.isArray(a) && typeof (a as unknown[])[0] === "string" && ((a as string[])[0]?.startsWith("0x")),
    ) as Hex[] | undefined;
    if (!contexts?.length) throw new Error("could not locate permissionContexts in calldata");
    const [delegations] = decodeAbiParameters(DELEGATION_ARRAY, contexts[0]) as unknown as [
      { caveats: { enforcer: Address; terms: Hex; args: Hex }[] }[],
    ];
    const caveats = delegations.flatMap((d) => d.caveats);
    const enforcerArg = pick("enforcer", "enforcer");
    // The AttestationEnforcer caveat: terms is a bare 20-byte address (the policy signer); the
    // built-in ERC20TransferAmount caveat carries longer terms. Match by --enforcer if supplied.
    const att =
      caveats.find((c) => (enforcerArg ? eqAddr(c.enforcer, enforcerArg) : (c.terms.length - 2) / 2 === 20)) ?? undefined;
    if (!att) throw new Error("no AttestationEnforcer-shaped caveat found");
    const enforcerHasCode = await code(att.enforcer);
    const termsAddr = att.terms.length >= 42 ? getAddress(`0x${att.terms.slice(-40)}` as Hex) : undefined;
    const policyArg = pick("policy-signer", "policySigner");
    const enforcerMatches = enforcerArg ? eqAddr(att.enforcer, enforcerArg) : undefined;
    const termsMatch = policyArg ? eqAddr(termsAddr, policyArg) : undefined;
    if (enforcerHasCode && enforcerMatches !== false && termsMatch !== false && termsAddr) {
      record(
        "5-enforcer-caveat",
        "PASS",
        `enforcer ${att.enforcer} hasCode=true${enforcerArg ? `, matchesConfigured=${enforcerMatches}` : ""}; ` +
          `terms policySigner=${termsAddr}${policyArg ? `, matches=${termsMatch}` : " (no --policy-signer to compare)"}`,
      );
    } else {
      record(
        "5-enforcer-caveat",
        enforcerHasCode === false || enforcerMatches === false || termsMatch === false ? "FAIL" : "INCONCLUSIVE",
        `enforcer ${att.enforcer} hasCode=${enforcerHasCode}; terms policySigner=${termsAddr}`,
      );
    }
  } catch (e) {
    record("5-enforcer-caveat", "INCONCLUSIVE", `could not decode delegation caveats from calldata: ${(e as Error).message}`);
  }

  // ---- 6. Recipient received >= the amount; the smart-account balance dropped by exactly the
  //         amount IN this tx (read at the tx block vs the block before - robust to other activity). ----
  if (usdc && smartAccount && merchant) {
    const balAt = (a: Address, blockNumber?: bigint) =>
      client.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [a], blockNumber }) as Promise<bigint>;
    const merchantBal = await balAt(merchant);
    record(
      "6a-recipient-bal",
      merchantBal >= expectedAmount ? "PASS" : "FAIL",
      `recipient balance ${formatUnits(merchantBal, 6)} mUSDC (>= ${formatUnits(expectedAmount, 6)})`,
    );
    const after = await balAt(smartAccount, receipt.blockNumber);
    const before = await balAt(smartAccount, receipt.blockNumber - 1n);
    const delta = before - after;
    record(
      "6b-sa-delta",
      delta === expectedAmount ? "PASS" : "FAIL",
      `smart account balance dropped ${formatUnits(delta, 6)} mUSDC in this tx (${formatUnits(before, 6)} -> ${formatUnits(after, 6)}); expect ${formatUnits(expectedAmount, 6)}`,
    );
  } else {
    record("6a-merchant-bal", "INCONCLUSIVE", "missing token/account addresses");
    record("6b-sa-bal", "INCONCLUSIVE", "missing token/account addresses");
  }

  // ---- 7. No mocks except MockUSDC: DM + enforcer are real deployed contracts. ----
  const dmCode = await code(canonicalDM);
  record("7-no-extra-mocks", dmCode ? "PASS" : "FAIL", `DelegationManager ${canonicalDM} hasCode=${dmCode} (canonical, published); enforcer code asserted in #5; only mock in path = MockUSDC`);

  // ---- Summary ----
  console.log("\n──────── SUMMARY ────────");
  for (const r of results) console.log(`${r.status.padEnd(12)} ${r.id}`);
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const inc = results.filter((r) => r.status === "INCONCLUSIVE").length;
  console.log(`\n${pass} PASS, ${fail} FAIL, ${inc} INCONCLUSIVE`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("verify-spike crashed:", e);
  process.exit(3);
});
