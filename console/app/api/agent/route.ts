import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { redelegateAndPay, giftCardOffers, buyGiftCardFromVendor, usdcBalance, env, type Delegation } from "delegation-firewall-sdk";
import { formatUnits, getAddress, isAddress, type Address } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AgentBody {
  messages: UIMessage[];
  delegation: Delegation;
  cap: string;
}

/** Plain text of the most recent user message - the user's real words, used as the firewall intent. */
function latestUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return (last?.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

export async function POST(req: Request) {
  const { messages, delegation, cap } = (await req.json()) as AgentBody;
  if (!delegation?.signature) {
    return new Response(JSON.stringify({ error: "no active delegation" }), { status: 400 });
  }

  const venice = createOpenAI({ name: "venice", baseURL: env.veniceBaseUrl, apiKey: env.veniceApiKey ?? "" });
  const merchant = env.merchant;
  const intent = latestUserText(messages);
  // Give the agent real balance + cap context so it never invents amounts and can resolve
  // "all"/"full"/"everything" to a concrete, spendable number.
  const balance = await usdcBalance(delegation.delegator).catch(() => "0");
  const spendable = Math.min(Number(balance), Number(cap)).toString();

  const result = streamText({
    model: venice.chat(env.veniceAgentModel),
    temperature: 0,
    stopWhen: stepCountIs(4),
    system: [
      "You are the user's autonomous payment agent for an account protected by an on-chain firewall: every",
      "payment is independently reviewed by a policy model and only settles if approved.",
      `Facts: balance ${balance} mUSDC; per-payment cap ${cap} mUSDC (so at most ${spendable} mUSDC per payment); default payee (merchant) ${merchant}.`,
      "PAYMENTS: when the user asks to pay, call `pay` with a concrete mUSDC amount; for all/full/everything",
      `use ${spendable}. Never invent an amount or address - if no amount is given, ask. Add a 0x recipient only if the user names one.`,
      "GIFT CARDS (Apple Store, iTunes, Amazon, Google Play): call `buyGiftCard` to fetch seller offers; it",
      "needs a price in mUSDC, so ask first if none was given. When the user then picks a seller - by name",
      "(VeriCards/FlashDeals), or 'the verified/first one', 'the cheaper one', etc. - call `buyGiftCardFrom`",
      "with seller='verified' or 'flash' and the same brand+price to actually buy it (this issues the code on",
      "approval). Just do it; do not tell the user to click a button, and NEVER use `pay` for a gift card.",
      "DISPLAY RULES: every tool result renders as an interactive card - amounts, addresses, offers, verdicts,",
      "tx links and gift-card codes are already shown there. Reply in ONE short sentence and never re-list or",
      "restate that content. After offers, say only something like 'Found two sellers - pick one below.' After",
      "a result, one line: authorized (with the tx), refused (the reason), or reverted (the error). Never claim",
      "success unless the tool result says executed.",
    ].join(" "),
    messages: await convertToModelMessages(messages),
    tools: {
      // Client-gated tool (no server execute): the browser assesses risk, auto-executes safe
      // payments and pauses risky ones for the user, then runs the firewall via /api/redeem and
      // returns the result with addToolOutput. This is the human-in-the-loop confirmation path.
      pay: tool({
        description:
          "Propose a stablecoin payment. A risky payment (over the allowance/balance, or to an unfamiliar recipient) pauses for the user's confirmation; otherwise it proceeds. Either way the firewall reviews it and redeems on-chain only if approved.",
        inputSchema: z.object({
          amountMusdc: z.string().describe("amount to pay in mUSDC, e.g. '1'"),
          recipient: z.string().optional().describe("recipient 0x address, only if the user named one"),
          reason: z.string().optional().describe("short reason for the payment"),
        }),
      }),
      redelegate: tool({
        description:
          "Delegate a NARROWER spend cap to a worker sub-agent (A2A), then have the worker make a payment within it. Use when the user wants to hand a task to a worker with a tighter limit. A payment over the narrowed cap reverts on-chain.",
        inputSchema: z.object({
          narrowedCap: z.string().describe("the worker's spend cap in mUSDC, tighter than the user's cap"),
          amountMusdc: z.string().describe("amount the worker should pay, in mUSDC"),
          recipient: z.string().optional().describe("recipient 0x address, only if the user named one"),
          reason: z.string().optional().describe("short reason for the worker payment"),
        }),
        execute: async ({ narrowedCap, amountMusdc, recipient, reason }) => {
          const to: Address = recipient && isAddress(recipient) ? getAddress(recipient) : merchant;
          const r = await redelegateAndPay({
            signedRootDelegation: delegation,
            narrowedCap,
            recipient: to,
            amount: amountMusdc,
            intent: intent || reason || "",
          });
          return {
            executed: r.executed,
            verdict: r.brain,
            reason: r.reason,
            riskFlags: r.riskFlags,
            recipient: to,
            amount: amountMusdc,
            narrowedCap: r.narrowedCap,
            txHash: r.txHash ?? null,
            transferred: r.transferred != null ? formatUnits(r.transferred, 6) : null,
            explorerTx: r.txHash ? `https://sepolia.basescan.org/tx/${r.txHash}` : null,
            revertError: r.revertError ?? null,
            screening: r.screening ?? null,
          };
        },
      }),
      buyGiftCard: tool({
        description:
          "Find sellers for a gift card (e.g. Apple Store, iTunes, Amazon, Google Play). Requires the price in mUSDC; if the user did not give a price, ask them first. Returns two competing seller agents - the USER picks which one to pay, and the firewall reviews that payment. Do NOT pay here; just present the offers.",
        inputSchema: z.object({
          brand: z.string().describe("the gift card brand, e.g. 'Apple Store', 'iTunes', 'Amazon'"),
          priceUsdc: z.string().describe("the gift card price in mUSDC the user wants to spend; ask if not specified"),
        }),
        execute: async ({ brand, priceUsdc }) => {
          return { brand, priceUsdc, offers: giftCardOffers(brand, priceUsdc) };
        },
      }),
      buyGiftCardFrom: tool({
        description:
          "Buy the gift card from the seller the user chose. seller is 'verified' (VeriCards) or 'flash' (FlashDeals). Call this when the user names a seller after buyGiftCard showed offers. It runs the firewall and, if approved, issues the code. Never use `pay` for a gift card.",
        inputSchema: z.object({
          brand: z.string(),
          priceUsdc: z.string().describe("the user's agreed price in mUSDC (their budget)"),
          seller: z.enum(["verified", "flash"]).describe("'verified' = VeriCards, 'flash' = FlashDeals"),
        }),
        execute: async ({ brand, priceUsdc, seller }) => {
          const offer = giftCardOffers(brand, priceUsdc).find((o) => o.id === seller);
          if (!offer) {
            return {
              executed: false,
              verdict: "error",
              reason: `unknown seller "${seller}"`,
              riskFlags: [],
              recipient: env.giftCardVendor,
              amount: priceUsdc,
              brand,
              vendorName: seller,
              code: null,
              txHash: null,
              transferred: null,
              explorerTx: null,
              revertError: null,
            };
          }
          const r = await buyGiftCardFromVendor({
            signedDelegation: delegation,
            brand,
            vendorName: offer.vendorName,
            vendor: offer.vendor,
            totalUsdc: offer.totalUsdc,
            budgetUsdc: priceUsdc,
            pitch: offer.pitch,
            cap,
          });
          return {
            executed: r.executed,
            verdict: r.brain,
            reason: r.reason,
            riskFlags: r.riskFlags,
            recipient: offer.vendor,
            amount: offer.totalUsdc,
            brand: r.brand,
            vendorName: r.vendorName,
            code: r.code,
            txHash: r.txHash ?? null,
            transferred: r.transferred != null ? formatUnits(r.transferred, 6) : null,
            explorerTx: r.txHash ? `https://sepolia.basescan.org/tx/${r.txHash}` : null,
            revertError: r.revertError ?? null,
            screening: r.screening ?? null,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
