"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, X } from "lucide-react";

type Outcome = "paid" | "blocked" | "reverted";
type StepState = "ok" | "deny" | "revert" | "skip" | "pending" | "idle";

const CAP = 100;
const STEPS = [
  "Agent proposes the payment",
  "Venice checks it against your intent",
  "Policy signs a fresh attestation",
  "On-chain enforcer redeems it",
];

function statusesFor(outcome: Outcome): StepState[] {
  if (outcome === "blocked") return ["ok", "deny", "skip", "skip"];
  if (outcome === "reverted") return ["ok", "ok", "ok", "revert"];
  return ["ok", "ok", "ok", "ok"];
}

const ICON: Record<StepState, React.ReactNode> = {
  ok: <Check className="h-4 w-4 text-indigo-600" />,
  deny: <X className="h-4 w-4 text-amber-500" />,
  revert: <X className="h-4 w-4 text-rose-500" />,
  skip: <Minus className="h-4 w-4 text-neutral-300" />,
  pending: <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />,
  idle: <span className="h-2 w-2 rounded-full bg-neutral-300" />,
};

export default function Playground() {
  const [recipient, setRecipient] = useState<"merchant" | "unknown">("merchant");
  const [amount, setAmount] = useState(25);
  const [inject, setInject] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const result: Outcome = recipient === "unknown" || inject ? "blocked" : amount > CAP ? "reverted" : "paid";
    const total = result === "blocked" ? 2 : 4;
    setOutcome(result);
    setRevealed(0);
    setDone(false);
    setRunning(true);
    for (let i = 1; i <= total; i++) {
      timers.current.push(
        setTimeout(() => {
          setRevealed(i);
          if (i === total) {
            setRunning(false);
            setDone(true);
          }
        }, 230 + i * 520),
      );
    }
  };

  const statuses = outcome ? statusesFor(outcome) : [];
  const stepState = (i: number): StepState => {
    if (!outcome) return "idle";
    if (i < revealed) return statuses[i];
    if (done && statuses[i] === "skip") return "skip";
    return "pending";
  };

  const segBtn = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
      active ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <section className="mx-auto max-w-5xl px-4 py-24 md:py-32">
      <div className="mb-12 max-w-2xl">
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          <span className="text-foreground">See it</span>{" "}
          <span className="bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text text-transparent">decide.</span>
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Send a payment the way the agent would, and watch the firewall respond. Try paying an
          unknown wallet, going over the cap, or poisoning what the agent saw.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Controls */}
        <div className="rounded-3xl border border-black/[0.06] bg-white p-7 shadow-[0_18px_50px_-28px_rgba(79,70,229,0.35)] md:p-9">
          <div className="space-y-7">
            <div>
              <label className="mb-2.5 block text-sm font-medium text-foreground">Pay</label>
              <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
                <button className={segBtn(recipient === "merchant")} onClick={() => setRecipient("merchant")}>
                  the merchant
                </button>
                <button className={segBtn(recipient === "unknown")} onClick={() => setRecipient("unknown")}>
                  an unknown wallet
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Amount</label>
                <span className={`text-sm font-semibold ${amount > CAP ? "text-rose-500" : "text-foreground"}`}>{amount} mUSDC</span>
              </div>
              <input
                type="range"
                min={1}
                max={120}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">Spend cap: {CAP} mUSDC</p>
            </div>

            <button
              type="button"
              onClick={() => setInject((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-black/[0.06] px-4 py-3 text-left"
            >
              <span className="pr-4 text-sm text-foreground">
                The agent read a &quot;send everything now&quot; instruction
              </span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${inject ? "bg-indigo-600" : "bg-neutral-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${inject ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>

            <button
              onClick={run}
              disabled={running}
              className="w-full rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3.5 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.6)] transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {running ? "Checking…" : "Request payment"}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="flex flex-col rounded-3xl border border-black/[0.06] bg-white p-7 shadow-[0_18px_50px_-28px_rgba(79,70,229,0.35)] md:p-9">
          {!outcome ? (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              Configure a payment and hit <span className="mx-1 font-medium text-foreground">Request payment</span>.
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="space-y-1">
                {STEPS.map((label, i) => {
                  const s = stepState(i);
                  const dim = s === "idle" || s === "skip";
                  return (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={{ opacity: s === "pending" || s === "idle" ? 0.45 : 1 }}
                      className="flex items-center gap-3 py-2"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.06] bg-neutral-50">
                        {ICON[s]}
                      </span>
                      <span className={`text-sm ${dim ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
                    </motion.div>
                  );
                })}
              </div>

              <AnimatePresence>
                {done && outcome && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-auto pt-6"
                  >
                    {outcome === "paid" && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                        <p className="font-display text-lg font-semibold text-indigo-700">Paid {amount} mUSDC to the merchant.</p>
                        <p className="mt-1 text-sm text-indigo-700/70">Intent matched, attestation signed, redemption cleared.</p>
                      </div>
                    )}
                    {outcome === "blocked" && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                        <p className="font-display text-lg font-semibold text-amber-700">Blocked by the policy.</p>
                        <p className="mt-1 text-sm text-amber-700/80">Venice denied it, so no attestation was ever signed. Nothing moved.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {["intent_mismatch", inject ? "prompt_injection" : "unknown_recipient"].map((f) => (
                            <span key={f} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {outcome === "reverted" && (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5">
                        <p className="font-display text-lg font-semibold text-rose-700">Reverted on-chain.</p>
                        <p className="mt-1 text-sm text-rose-700/80">
                          Venice approved it, but {amount} mUSDC is over the {CAP} cap, so the enforcer refused the redemption.
                        </p>
                        <p className="mt-3 font-mono text-xs text-rose-700/70">ERC20TransferAmountEnforcer: allowance-exceeded</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
