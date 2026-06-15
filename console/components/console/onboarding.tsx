"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import type { Hex } from "viem";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { AccentButton } from "@/components/ui/accent-button";
import { Orb } from "@/components/console/orb";
import { fetchJson, short, type Info } from "@/lib/console-client";
import { buildSmartAccount, signGrant } from "@/lib/grant";
import type { ConsoleSession } from "@/lib/session";

type StepStatus = "idle" | "running" | "done" | "error";
type StepKey = "prepare" | "activate" | "deploy" | "grant" | "fund";
interface Step {
  key: StepKey;
  label: string;
  status: StepStatus;
  detail?: string;
  txHash?: Hex;
}
const STEP_LABELS: Record<StepKey, string> = {
  prepare: "Resolve pinned contracts, top up agent gas",
  activate: "Activate smart account (connected wallet as signatory)",
  deploy: "Deploy smart account (sponsored)",
  grant: "Grant access (sign delegation in MetaMask)",
  fund: "Fund with MockUSDC (sponsored)",
};
const STEP_ORDER: StepKey[] = ["prepare", "activate", "deploy", "grant", "fund"];

export function Onboarding({
  info,
  onComplete,
  onBack,
}: {
  info: Info;
  onComplete: (s: ConsoleSession) => void;
  onBack?: () => void;
}) {
  const { address, connector } = useAccount();
  const [cap, setCap] = useState("5");
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string>();
  const [running, setRunning] = useState(false);

  const patch = useCallback((key: StepKey, p: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...p } : s)));
  }, []);

  const activate = useCallback(async () => {
    if (!address || !connector) return;
    setError(undefined);
    setRunning(true);
    setSteps(STEP_ORDER.map((key) => ({ key, label: STEP_LABELS[key], status: "idle" })));
    try {
      patch("prepare", { status: "running" });
      const { usdc, enforcer } = await fetchJson<{ usdc: Hex; enforcer: Hex }>("/api/bootstrap", {});
      patch("prepare", { status: "done", detail: `USDC ${short(usdc)} · enforcer ${short(enforcer)}` });

      patch("activate", { status: "running" });
      const account = await buildSmartAccount(connector, address, info.rpcUrl);
      patch("activate", { status: "done", detail: account.address });

      patch("deploy", { status: "running" });
      if (await account.isDeployed()) {
        patch("deploy", { status: "done", detail: "already deployed" });
      } else {
        const { factory, factoryData } = await account.getFactoryArgs();
        const { txHash } = await fetchJson<{ txHash: Hex }>("/api/deploy", { factory, factoryData });
        patch("deploy", { status: "done", txHash });
      }

      patch("grant", { status: "running" });
      const session = await signGrant(account, address, info, cap);
      patch("grant", { status: "done", detail: `signature ${short(session.signedDelegation.signature)}` });

      patch("fund", { status: "running" });
      const { txHash: fundTx } = await fetchJson<{ txHash: Hex }>("/api/fund", { to: account.address, amount: "10" });
      patch("fund", { status: "done", txHash: fundTx });

      onComplete(session);
    } catch (e) {
      setError((e as Error).message);
      setSteps((prev) => prev.map((s) => (s.status === "running" ? { ...s, status: "error", detail: (e as Error).message } : s)));
    } finally {
      setRunning(false);
    }
  }, [address, connector, info, cap, patch, onComplete]);

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto px-6 py-12">
      <div className="m-auto w-full max-w-md space-y-6 pb-32">

        <div className="flex flex-col items-center gap-4 text-center">
          <Orb size="md" state="idle" />
          <div className="space-y-1.5">
            <h1 className="text-lg font-medium">Activate your agent</h1>
            <p className="text-sm text-muted-foreground">
              Create a smart account you control, set a spend allowance, and grant your agent scoped access under the on-chain firewall. You
              sign once; deploy, funding, and gas are sponsored.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-5">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Spend allowance (mUSDC)</span>
            <input
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <AccentButton onClick={activate} disabled={running || !address} size="lg" className="w-full">
            {running ? <Orb size="icon" className="size-5" /> : "Activate, set policy & grant"}
          </AccentButton>
        </div>

        {steps.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-5">
            {steps.map((s) => (
              <div key={s.key} className="flex items-start gap-3">
                <StepIcon status={s.status} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{s.label}</div>
                  {s.detail && <div className="truncate text-xs text-muted-foreground">{s.detail}</div>}
                  {s.txHash && (
                    <a
                      className="text-xs text-foreground/70 underline-offset-2 hover:underline"
                      href={`${info.explorerTxBase}${s.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(s.txHash)} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <Orb size="icon" className="mt-0.5 size-4 shrink-0" />;
  if (status === "done") return <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-400" />;
  if (status === "error") return <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />;
  return <span className="mt-1.5 size-2 shrink-0 rounded-full border border-border" />;
}
