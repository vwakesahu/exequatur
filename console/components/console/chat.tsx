"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import {
  ArrowUpIcon,
  BanIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ExternalLinkIcon,
  GiftIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccentButton } from "@/components/ui/accent-button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { Orb } from "@/components/console/orb";
import type { AgentState } from "@/components/agents-ui/agent-state";
import { fetchJson, short, type Info } from "@/lib/console-client";
import { grantDelegation } from "@/lib/grant";
import type { ConsoleSession } from "@/lib/session";

/** Static (non-WebGL) avatar for assistant messages - keeps WebGL to the orb loaders. */
function AssistantAvatar() {
  return (
    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/90 text-white">
      <SparklesIcon className="size-3.5" />
    </span>
  );
}

/** The shape the firewall returns for a pay/redelegate (mirrors /api/redeem + the cancel marker). */
interface ActionOutput {
  executed: boolean;
  verdict: string;
  reason: string;
  riskFlags: string[];
  recipient: string;
  amount: string;
  narrowedCap?: string;
  brand?: string;
  vendorName?: string;
  code?: string | null;
  cancelled?: boolean;
  screening?: Screening | null;
  txHash: string | null;
  transferred: string | null;
  explorerTx: string | null;
  revertError: string | null;
}
interface Screening {
  provider: string;
  status: "clear" | "flagged";
  riskScore: number;
  categories: string[];
}
interface RedeemResp {
  executed: boolean;
  reason: string;
  brain: string;
  riskFlags?: string[];
  txHash?: string | null;
  transferred?: string | null;
  revertError?: string | null;
  screening?: Screening | null;
}
interface PayInput {
  amountMusdc?: string;
  recipient?: string;
  reason?: string;
}
type ToolPart = { state: string; input?: unknown; output?: unknown; toolCallId: string };

/** Client-side risk signals that gate a payment for confirmation (over remaining allowance / over balance / unfamiliar recipient). */
function assessRisk(input: PayInput, available: string, balance: string | undefined, merchant: string): string[] {
  const reasons: string[] = [];
  const amt = Number(input.amountMusdc ?? "0");
  if (Number.isFinite(amt)) {
    if (amt > Number(available)) reasons.push(`${input.amountMusdc} mUSDC exceeds your ${available} mUSDC remaining allowance`);
    if (balance != null && amt > Number(balance)) reasons.push(`${input.amountMusdc} mUSDC exceeds your ${balance} mUSDC balance`);
  }
  const r = input.recipient;
  if (r && r.toLowerCase() !== merchant.toLowerCase()) reasons.push("recipient is not your known merchant");
  return reasons;
}

export function Console({
  info,
  session,
  onSession,
  balance,
  remaining,
  refreshBalance,
  fund,
}: {
  info: Info;
  session: ConsoleSession;
  onSession: (s: ConsoleSession) => void;
  balance?: string;
  remaining?: string;
  refreshBalance: () => Promise<void>;
  fund: () => Promise<void>;
}) {
  const { address, connector } = useAccount();
  const [input, setInput] = useState("");
  const [liveSession, setLiveSession] = useState(session);
  const liveRef = useRef(session);
  const intentRef = useRef("");

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        body: () => ({ delegation: liveRef.current.signedDelegation, cap: liveRef.current.cap }),
      }),
  );
  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready") refreshBalance();
  }, [status, refreshBalance]);
  // Selecting a different session in the sidebar swaps the live delegation the chat pays with.
  useEffect(() => {
    liveRef.current = session;
    setLiveSession(session);
  }, [session]);

  const applySession = useCallback(
    (s: ConsoleSession) => {
      liveRef.current = s;
      setLiveSession(s);
      onSession(s);
    },
    [onSession],
  );
  const onGrant = useCallback(
    async (newCap: string) => {
      if (!address || !connector) throw new Error("wallet not connected");
      applySession(await grantDelegation(connector, address, info, newCap));
    },
    [address, connector, info, applySession],
  );

  // Run the firewall (Venice + on-chain) for a confirmed/safe payment, then report the result to the agent.
  const executePay = useCallback(
    async (pay: PayInput, toolCallId: string) => {
      const recipient = pay.recipient && isAddress(pay.recipient) ? pay.recipient : info.merchant;
      try {
        const r = await fetchJson<RedeemResp>("/api/redeem", {
          signedDelegation: liveRef.current.signedDelegation,
          recipient,
          amount: pay.amountMusdc ?? "0",
          cap: liveRef.current.cap,
          intent: intentRef.current,
        });
        addToolOutput({
          tool: "pay",
          toolCallId,
          output: {
            executed: r.executed,
            verdict: r.brain,
            reason: r.reason,
            riskFlags: r.riskFlags ?? [],
            recipient,
            amount: pay.amountMusdc ?? "0",
            screening: r.screening ?? null,
            txHash: r.txHash ?? null,
            transferred: r.transferred ?? null,
            explorerTx: r.txHash ? `${info.explorerTxBase}${r.txHash}` : null,
            revertError: r.revertError ?? null,
          } satisfies ActionOutput,
        });
      } catch (e) {
        addToolOutput({
          tool: "pay",
          toolCallId,
          output: {
            executed: false,
            verdict: "error",
            reason: (e as Error).message,
            riskFlags: [],
            recipient,
            amount: pay.amountMusdc ?? "0",
            txHash: null,
            transferred: null,
            explorerTx: null,
            revertError: null,
          } satisfies ActionOutput,
        });
      }
      await refreshBalance();
    },
    [addToolOutput, refreshBalance, info.merchant, info.explorerTxBase],
  );

  const cancelPay = useCallback(
    (pay: PayInput, toolCallId: string) => {
      addToolOutput({
        tool: "pay",
        toolCallId,
        output: {
          executed: false,
          cancelled: true,
          verdict: "you",
          reason: "you cancelled this payment",
          riskFlags: [],
          recipient: pay.recipient ?? info.merchant,
          amount: pay.amountMusdc ?? "0",
          txHash: null,
          transferred: null,
          explorerTx: null,
          revertError: null,
        } satisfies ActionOutput,
      });
    },
    [addToolOutput, info.merchant],
  );

  // Smooth flowing orb while the agent works (never the pulsing "thinking" state, which reads as a blink).
  const agentState: AgentState = busy ? "speaking" : "idle";
  const examples = [
    "pay the merchant 1 mUSDC for invoice 4471",
    "buy me a $5 Apple gift card",
    "give a worker a 2 mUSDC budget and pay 1 mUSDC to the merchant",
  ];

  const renderParts = (m: (typeof messages)[number]) =>
    m.parts.map((part, i) => {
      if (part.type === "text") {
        return part.text ? <MessageResponse key={i}>{part.text}</MessageResponse> : null;
      }
      if (part.type === "tool-pay") {
        return (
          <PayCard
            key={i}
            part={part as ToolPart}
            info={info}
            session={liveSession}
            cap={liveSession.cap}
            remaining={remaining}
            balance={balance}
            executePay={executePay}
            cancelPay={cancelPay}
            onGrant={onGrant}
            onFund={fund}
          />
        );
      }
      if (part.type === "tool-redelegate") return <RedelegateCard key={i} part={part as ToolPart} info={info} />;
      if (part.type === "tool-buyGiftCard") {
        return (
          <GiftCardCard key={i} part={part as ToolPart} info={info} session={liveSession} cap={liveSession.cap} onGrant={onGrant} onFund={fund} />
        );
      }
      if (part.type === "tool-buyGiftCardFrom") {
        return <GiftCardBuyCard key={i} part={part as ToolPart} info={info} cap={liveSession.cap} onGrant={onGrant} onFund={fund} />;
      }
      return null;
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* slim agent header */}
      <header className="flex items-center gap-2.5 border-b border-border/50 px-4 py-2">
        <Orb size="sm" state={agentState} className="size-8 shrink-0" />
        <span className="text-sm font-medium">Agent</span>
      </header>

      {/* transcript (stick-to-bottom; the newest action card sits just above the input) */}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-8 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-4 text-center">
              <h2 className="text-lg font-medium">What should your agent pay?</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Instruct it in plain language. Safe payments go straight to the firewall; risky ones pause for your confirmation.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setInput(ex)}
                    className="rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] wrap-break-word rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5 text-sm">{renderParts(m)}</div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-3">
                  <AssistantAvatar />
                  <div className="min-w-0 flex-1 space-y-3 pt-0.5">{renderParts(m)}</div>
                </div>
              ),
            )
          )}
          {status === "submitted" && (
            <div className="flex items-start">
              <Orb size="sm" className="size-7" />
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* input pinned to the bottom */}
      <div className="border-t border-border/50 bg-background/50">
        <form
          className="relative mx-auto w-full max-w-3xl px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || busy) return;
            intentRef.current = input;
            sendMessage({ text: input });
            setInput("");
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell your agent what to pay…"
            disabled={busy}
            className="w-full rounded-2xl border border-border/60 bg-card/60 py-3.5 pl-4 pr-14 text-sm shadow-sm transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="absolute right-6 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl border border-indigo-400/70 bg-linear-to-b from-indigo-500 to-indigo-800 text-white transition hover:from-indigo-400 hover:to-indigo-700 disabled:opacity-30"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- */
/* Shared card chrome                                                                              */
/* ----------------------------------------------------------------------------------------------- */

type Tone = "ok" | "bad" | "muted" | "pending";
const TONE: Record<Tone, { ring: string; icon: string; badge: string }> = {
  ok: { ring: "border-emerald-500/30", icon: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-300" },
  bad: { ring: "border-destructive/40", icon: "text-destructive", badge: "bg-destructive/15 text-destructive" },
  muted: { ring: "border-border/60", icon: "text-muted-foreground", badge: "bg-muted/60 text-muted-foreground" },
  pending: { ring: "border-primary/30", icon: "text-primary", badge: "bg-primary/15 text-primary" },
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[tone].badge}`}>{children}</span>;
}

function CardShell({
  tone,
  icon,
  title,
  subtitle,
  badge,
  children,
}: {
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border ${TONE[tone].ring} bg-card/60`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`grid size-5 shrink-0 place-items-center ${TONE[tone].icon}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-tight">{title}</div>
          {subtitle != null && <div className="truncate pt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        {badge}
      </div>
      {children ? <div className="space-y-3 px-4 pb-4">{children}</div> : null}
    </div>
  );
}

/** A recipient address screen result, shown inside the collapsible logs. */
function ScreeningLine({ screening }: { screening: Screening }) {
  const clear = screening.status === "clear";
  return (
    <div className="flex items-start gap-1.5">
      {clear ? (
        <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
      ) : (
        <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
      )}
      <span>
        <span className="text-foreground/70">{screening.provider}</span>:{" "}
        {clear
          ? `cleared, no risk flags (${screening.riskScore}/100)`
          : `flagged ${screening.categories.join(", ")} (${screening.riskScore}/100)`}
      </span>
    </div>
  );
}

/** Collapsible technical trail: screening, model verdict + reasoning, risk flags, revert reason. */
function AgentLogs({ out }: { out: ActionOutput }) {
  return (
    <details className="group rounded-lg border border-border/50 bg-muted/15">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground">
        <span className="flex items-center gap-1.5">
          <ScrollTextIcon className="size-3.5" /> Agent logs
        </span>
        <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
        {out.screening && <ScreeningLine screening={out.screening} />}
        <div>
          <span className="text-foreground/70">verdict</span> · {out.verdict}
          <div className="mt-0.5 whitespace-pre-wrap text-foreground/90">{out.reason}</div>
        </div>
        {out.riskFlags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {out.riskFlags.map((f) => (
              <span key={f} className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
                {f}
              </span>
            ))}
          </div>
        )}
        {out.revertError && <div className="text-destructive">reverted: {out.revertError}</div>}
      </div>
    </details>
  );
}

function TxLink({ href, hash }: { href: string; hash: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs text-foreground/80 transition hover:border-primary/40 hover:text-foreground"
    >
      <ExternalLinkIcon className="size-3.5" /> on-chain {short(hash)}
    </a>
  );
}

/** The outcome body shared by Payment + Redelegated cards: concise headline, tx link, collapsible logs. */
function FirewallResult({ out, info }: { out: ActionOutput; info: Info }) {
  const refused = !out.executed && !out.cancelled;
  return (
    <>
      {refused && out.reason && <p className="text-sm text-foreground/90">{out.reason}</p>}
      {out.cancelled && <p className="text-sm text-muted-foreground">{out.reason}</p>}
      {out.executed && out.txHash && <TxLink href={`${info.explorerTxBase}${out.txHash}`} hash={out.txHash} />}
      <AgentLogs out={out} />
    </>
  );
}

/* ----------------------------------------------------------------------------------------------- */
/* Action cards                                                                                    */
/* ----------------------------------------------------------------------------------------------- */

function payVisual(
  out: ActionOutput | undefined,
  awaiting: boolean,
  risky: boolean,
): { tone: Tone; icon: React.ReactNode; badge: React.ReactNode } {
  if (out?.executed) return { tone: "ok", icon: <CheckCircle2Icon className="size-5" />, badge: <Pill tone="ok">authorized</Pill> };
  if (out?.cancelled) return { tone: "muted", icon: <BanIcon className="size-5" />, badge: <Pill tone="muted">cancelled</Pill> };
  if (out?.revertError) return { tone: "bad", icon: <ShieldAlertIcon className="size-5" />, badge: <Pill tone="bad">reverted on-chain</Pill> };
  if (out) return { tone: "bad", icon: <XCircleIcon className="size-5" />, badge: <Pill tone="bad">refused</Pill> };
  if (awaiting && risky) return { tone: "pending", icon: <ShieldAlertIcon className="size-5" />, badge: <Pill tone="pending">needs confirmation</Pill> };
  return { tone: "pending", icon: <Orb size="icon" className="size-5" />, badge: <Pill tone="pending">reviewing</Pill> };
}

/** Pay lifecycle: proposed -> (auto-submit if safe | Continue/Cancel if risky) -> authorized / refused / reverted / cancelled. */
function PayCard({
  part,
  info,
  session,
  cap,
  remaining,
  balance,
  executePay,
  cancelPay,
  onGrant,
  onFund,
}: {
  part: ToolPart;
  info: Info;
  session: ConsoleSession;
  cap: string;
  remaining: string | undefined;
  balance: string | undefined;
  executePay: (pay: PayInput, toolCallId: string) => Promise<void>;
  cancelPay: (pay: PayInput, toolCallId: string) => void;
  onGrant: (newCap: string) => Promise<void>;
  onFund: () => Promise<void>;
}) {
  const payInput = (part.input ?? {}) as PayInput;
  const out = part.state === "output-available" ? (part.output as ActionOutput) : undefined;
  const available = remaining ?? cap;
  const reasons = assessRisk(payInput, available, balance, info.merchant);
  const risky = reasons.length > 0;
  const awaiting = part.state === "input-streaming" || part.state === "input-available";
  const fired = useRef(false);

  // Auto-submit a safe payment once its inputs are available; risky ones wait for the user.
  useEffect(() => {
    if (part.state === "input-available" && !risky && !fired.current) {
      fired.current = true;
      void executePay(payInput, part.toolCallId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part.state, risky]);

  const insufficient = !!out && !out.executed && (out.riskFlags?.includes("insufficient_balance") ?? false);
  const allowanceIssue =
    !!out &&
    !out.executed &&
    !out.cancelled &&
    !insufficient &&
    ((out.riskFlags?.includes("allowance_exceeded") ?? false) ||
      (out.revertError?.includes("allowance-exceeded") ?? false) ||
      Number(out.amount) > Number(available));
  // A fresh delegation resets the cumulative allowance; grant enough to cover the payment.
  const grantCap = out ? String(Math.max(Number(out.amount), Number(cap))) : cap;

  const { tone, icon, badge } = payVisual(out, awaiting, risky);
  const amount = out?.amount ?? payInput.amountMusdc ?? "?";
  const recipient = out?.recipient ?? payInput.recipient ?? info.merchant;
  const subtitle = (
    <>
      <span className="font-mono text-foreground/80">{amount} mUSDC</span> → <span className="font-mono">{short(recipient)}</span>
    </>
  );

  const body =
    awaiting && risky ? (
      <ConfirmPay
        payInput={payInput}
        reasons={reasons}
        onConfirm={() => executePay(payInput, part.toolCallId)}
        onCancel={() => cancelPay(payInput, part.toolCallId)}
      />
    ) : out ? (
      <>
        <FirewallResult out={out} info={info} />
        {insufficient && <FundRow onFund={onFund} />}
        {allowanceIssue && <GrantMore grantCap={grantCap} onGrant={onGrant} />}
        {!out.executed && !out.cancelled && !out.revertError && !insufficient && !allowanceIssue && (
          <ForceAnyway info={info} session={session} out={out} />
        )}
      </>
    ) : null;

  return (
    <CardShell tone={tone} icon={icon} title="Payment" subtitle={subtitle} badge={badge}>
      {body}
    </CardShell>
  );
}

/** A2A redelegation runs server-side; just show its lifecycle. */
function RedelegateCard({ part, info }: { part: ToolPart; info: Info }) {
  const out = part.state === "output-available" ? (part.output as ActionOutput) : undefined;
  const tone: Tone = out ? (out.executed ? "ok" : "bad") : "pending";
  const icon = out?.executed ? (
    <CheckCircle2Icon className="size-5" />
  ) : out?.revertError ? (
    <ShieldAlertIcon className="size-5" />
  ) : out ? (
    <XCircleIcon className="size-5" />
  ) : (
    <Orb size="icon" className="size-5" />
  );
  const badge = out?.executed ? (
    <Pill tone="ok">authorized</Pill>
  ) : out?.revertError ? (
    <Pill tone="bad">reverted on-chain</Pill>
  ) : out ? (
    <Pill tone="bad">refused</Pill>
  ) : (
    <Pill tone="pending">reviewing</Pill>
  );
  const subtitle = out ? (
    <>
      <span className="font-mono text-foreground/80">{out.amount} mUSDC</span> → <span className="font-mono">{short(out.recipient)}</span>
      {out.narrowedCap ? ` · worker cap ${out.narrowedCap}` : ""}
    </>
  ) : (
    "delegating to a worker…"
  );
  return (
    <CardShell tone={tone} icon={icon} title="Redelegated payment (A2A)" subtitle={subtitle} badge={badge}>
      {out ? <FirewallResult out={out} info={info} /> : null}
    </CardShell>
  );
}

interface GiftCardOfferUI {
  id: string;
  vendorName: string;
  vendor: string;
  totalUsdc: string;
  pitch: string;
  badActor: boolean;
}

/** Two competing seller agents for a gift card; the user picks one and the firewall judges that payment. */
function GiftCardCard({
  part,
  info,
  session,
  cap,
  onGrant,
  onFund,
}: {
  part: ToolPart;
  info: Info;
  session: ConsoleSession;
  cap: string;
  onGrant: (newCap: string) => Promise<void>;
  onFund: () => Promise<void>;
}) {
  const reviewing = part.state === "input-streaming" || part.state === "input-available";
  const out =
    part.state === "output-available"
      ? (part.output as { brand: string; priceUsdc: string; offers: GiftCardOfferUI[] })
      : undefined;

  return (
    <CardShell
      tone={reviewing ? "pending" : "muted"}
      icon={reviewing ? <Orb size="icon" className="size-5" /> : <GiftIcon className="size-5" />}
      title={`Gift card${out ? ` · ${out.brand}` : ""}`}
      subtitle={reviewing ? "finding sellers" : out ? "Two sellers found. Pick one - the firewall reviews your choice." : undefined}
      badge={reviewing ? <Pill tone="pending">searching</Pill> : undefined}
    >
      {out ? (
        <div className="space-y-2">
          {out.offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              brand={out.brand}
              budgetUsdc={out.priceUsdc}
              info={info}
              session={session}
              cap={cap}
              onGrant={onGrant}
              onFund={onFund}
            />
          ))}
        </div>
      ) : null}
    </CardShell>
  );
}

/** One seller offer: shows its pitch + price, then runs the firewall on the user's click and shows the verdict. */
function OfferRow({
  offer,
  brand,
  budgetUsdc,
  info,
  session,
  cap,
  onGrant,
  onFund,
}: {
  offer: GiftCardOfferUI;
  brand: string;
  budgetUsdc: string;
  info: Info;
  session: ConsoleSession;
  cap: string;
  onGrant: (newCap: string) => Promise<void>;
  onFund: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "reviewing" | "done">("idle");
  const [out, setOut] = useState<ActionOutput>();

  const buy = async () => {
    setState("reviewing");
    try {
      const r = await fetchJson<ActionOutput>("/api/giftcard/buy", {
        signedDelegation: session.signedDelegation,
        brand,
        vendorName: offer.vendorName,
        vendor: offer.vendor,
        totalUsdc: offer.totalUsdc,
        budgetUsdc,
        pitch: offer.pitch,
        cap: session.cap,
      });
      setOut(r);
    } catch (e) {
      setOut({
        executed: false,
        verdict: "error",
        reason: (e as Error).message,
        riskFlags: [],
        recipient: offer.vendor,
        amount: offer.totalUsdc,
        txHash: null,
        transferred: null,
        explorerTx: null,
        revertError: null,
      });
    }
    setState("done");
  };

  const ring = out
    ? out.executed
      ? "border-emerald-500/30"
      : "border-destructive/40"
    : offer.badActor
      ? "border-amber-500/30"
      : "border-border/60";

  return (
    <div className={`space-y-2 rounded-lg border ${ring} bg-background/30 p-3`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{offer.vendorName}</span>
        <span className="font-mono text-xs text-foreground/80">{offer.totalUsdc} mUSDC</span>
      </div>
      <p className="text-xs text-muted-foreground">{offer.pitch}</p>

      {state === "idle" ? (
        <Button size="sm" variant="outline" className="h-7" onClick={buy}>
          Buy via {offer.vendorName.split(" ")[0]}
        </Button>
      ) : (
        <PurchaseFlow
          active={state === "reviewing"}
          result={out}
          vendorName={offer.vendorName}
          brand={brand}
          info={info}
          cap={cap}
          onGrant={onGrant}
          onFund={onFund}
        />
      )}
    </div>
  );
}

/** Chat-driven gift-card purchase (the agent calls buyGiftCardFrom when the user names a seller). */
function GiftCardBuyCard({
  part,
  info,
  cap,
  onGrant,
  onFund,
}: {
  part: ToolPart;
  info: Info;
  cap: string;
  onGrant: (newCap: string) => Promise<void>;
  onFund: () => Promise<void>;
}) {
  const active = part.state === "input-streaming" || part.state === "input-available";
  const out = part.state === "output-available" ? (part.output as ActionOutput) : undefined;
  const proposed = (part.input ?? {}) as { brand?: string; seller?: string };
  const vendorName = out?.vendorName ?? (proposed.seller === "flash" ? "FlashDeals" : "VeriCards");
  const brand = out?.brand ?? proposed.brand ?? "gift card";
  const tone: Tone = out ? (out.executed ? "ok" : "bad") : "pending";
  const icon = out?.executed ? (
    <CheckCircle2Icon className="size-5" />
  ) : out ? (
    <XCircleIcon className="size-5" />
  ) : (
    <Orb size="icon" className="size-5" />
  );
  const badge = out?.executed ? <Pill tone="ok">issued</Pill> : out ? <Pill tone="bad">refused</Pill> : <Pill tone="pending">buying</Pill>;
  return (
    <CardShell tone={tone} icon={icon} title={`Gift card · ${brand}`} subtitle={vendorName} badge={badge}>
      <PurchaseFlow active={active} result={out} vendorName={vendorName} brand={brand} info={info} cap={cap} onGrant={onGrant} onFund={onFund} />
    </CardShell>
  );
}

/** One status line with a state icon. */
function StatusLine({ state, children }: { state: "active" | "done" | "bad"; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {state === "active" ? (
        <Orb size="icon" className="size-4 shrink-0" />
      ) : state === "bad" ? (
        <XCircleIcon className="size-3.5 shrink-0 text-destructive" />
      ) : (
        <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-400" />
      )}
      {children}
    </div>
  );
}

/** Live, transparent purchase status: connecting -> screening -> firewall reviewing -> issued+code / refused. */
function PurchaseFlow({
  active,
  result,
  vendorName,
  brand,
  info,
  cap,
  onGrant,
  onFund,
}: {
  active: boolean;
  result: ActionOutput | undefined;
  vendorName: string;
  brand: string;
  info: Info;
  cap: string;
  onGrant: (newCap: string) => Promise<void>;
  onFund: () => Promise<void>;
}) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!active || result) return;
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 600);
    const t2 = setTimeout(() => setStage(2), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, result]);

  if (!result) {
    const steps = [`Connecting to ${vendorName}`, "Screening recipient address", "Firewall (Venice) reviewing"];
    return (
      <div className="space-y-1.5">
        {steps.map((s, i) => (i <= stage ? <StatusLine key={i} state={i < stage ? "done" : "active"}>{s}</StatusLine> : null))}
      </div>
    );
  }

  const insufficient = !result.executed && (result.riskFlags?.includes("insufficient_balance") ?? false);
  const allowanceIssue =
    !result.executed &&
    !insufficient &&
    ((result.riskFlags?.includes("allowance_exceeded") ?? false) || (result.revertError?.includes("allowance-exceeded") ?? false));
  const grantCap = String(Math.max(Number(result.amount), Number(cap)));
  const screenFlagged = result.screening?.status === "flagged";

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5">
        <StatusLine state="done">Connected to {vendorName}</StatusLine>
        {result.screening && (
          <StatusLine state={screenFlagged ? "bad" : "done"}>
            {screenFlagged ? `Screening flagged the recipient (${result.screening.categories.join(", ")})` : "Recipient screened, cleared"}
          </StatusLine>
        )}
        {!screenFlagged && (
          <StatusLine state={result.executed ? "done" : "bad"}>Firewall {result.executed ? "approved" : "refused"} the payment</StatusLine>
        )}
        {result.executed && <StatusLine state="done">Settled on-chain</StatusLine>}
      </div>

      {!result.executed && result.reason && <p className="text-sm text-foreground/90">{result.reason}</p>}
      {result.executed && result.txHash && <TxLink href={`${info.explorerTxBase}${result.txHash}`} hash={result.txHash} />}
      {result.executed && result.code && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">your {brand} code</div>
          <div className="mt-1 font-mono text-base tracking-widest text-emerald-300">{result.code}</div>
        </div>
      )}
      <AgentLogs out={result} />
      {insufficient && <FundRow onFund={onFund} />}
      {allowanceIssue && <GrantMore grantCap={grantCap} onGrant={onGrant} />}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- */
/* Small actions                                                                                   */
/* ----------------------------------------------------------------------------------------------- */

/** Risky-payment confirmation: the human-in-the-loop gate. */
function ConfirmPay({
  payInput,
  reasons,
  onConfirm,
  onCancel,
}: {
  payInput: PayInput;
  reasons: string[];
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [working, setWorking] = useState(false);
  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="text-sm">
        Confirm payment of {payInput.amountMusdc} mUSDC{payInput.recipient ? ` to ${short(payInput.recipient)}` : ""}?
      </div>
      <ul className="list-inside list-disc text-xs text-muted-foreground">
        {reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <AccentButton
          size="sm"
          disabled={working}
          onClick={async () => {
            setWorking(true);
            await onConfirm();
          }}
        >
          {working ? <Orb size="icon" className="size-4" /> : "Continue"}
        </AccentButton>
        <Button size="sm" variant="ghost" className="h-7" disabled={working} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** On an allowance refusal, sign a fresh delegation that resets the cumulative allowance to a new cap. */
function GrantMore({ grantCap, onGrant }: { grantCap: string; onGrant: (newCap: string) => Promise<void> }) {
  const [state, setState] = useState<"idle" | "granting" | "done" | "error">("idle");
  const [err, setErr] = useState<string>();
  if (state === "done") {
    return <div className="text-xs text-emerald-400">Allowance reset to {grantCap} mUSDC. Ask me to pay again.</div>;
  }
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground">The allowance is cumulative and used up. Sign a fresh one to continue.</div>
      <AccentButton
        size="sm"
        disabled={state === "granting"}
        onClick={async () => {
          setState("granting");
          setErr(undefined);
          try {
            await onGrant(grantCap);
            setState("done");
          } catch (e) {
            setErr((e as Error).message);
            setState("error");
          }
        }}
      >
        {state === "granting" ? <Orb size="icon" className="size-4" /> : `Raise allowance to ${grantCap} mUSDC`}
      </AccentButton>
      {state === "error" && err && <div className="text-xs text-destructive">{err}</div>}
    </div>
  );
}

/** "Fund the account, then try again" helper row. */
function FundRow({ onFund }: { onFund: () => Promise<void> }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Fund the account, then ask again.</span>
      <FundButton onFund={onFund} />
    </div>
  );
}

/** Mint 10 mUSDC to the smart account (sponsored) and refresh the balance. */
function FundButton({ onFund, label = "Fund +10 mUSDC" }: { onFund: () => Promise<void>; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onFund();
        } catch {
          /* ignore */
        }
        setBusy(false);
      }}
    >
      {busy ? <Orb size="icon" className="size-4" /> : label}
    </Button>
  );
}

/** On a policy refusal, attempt redemption anyway (skipping the policy) to show the on-chain firewall holds. */
function ForceAnyway({ info, session, out }: { info: Info; session: ConsoleSession; out: ActionOutput }) {
  const [state, setState] = useState<"idle" | "forcing" | "done">("idle");
  const [result, setResult] = useState<{ reverted: boolean; revertError?: string; txHash?: string }>();

  if (state === "done" && result) {
    return result.reverted ? (
      <div className="text-xs text-destructive">
        Firewall held: the on-chain enforcer reverted the forced redemption ({(result.revertError ?? "").slice(0, 80)})
      </div>
    ) : (
      <div className="text-xs">
        Forced redemption settled: {result.txHash && <TxLink href={`${info.explorerTxBase}${result.txHash}`} hash={result.txHash} />}
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7"
      disabled={state === "forcing"}
      onClick={async () => {
        setState("forcing");
        try {
          const r = await fetchJson<{ reverted: boolean; revertError?: string; txHash?: string }>("/api/force", {
            delegation: session.signedDelegation,
            recipient: out.recipient,
            amount: out.amount,
          });
          setResult(r);
        } catch (e) {
          setResult({ reverted: true, revertError: (e as Error).message });
        }
        setState("done");
      }}
    >
      {state === "forcing" ? <Orb size="icon" className="size-4" /> : "force anyway (bypass policy)"}
    </Button>
  );
}
