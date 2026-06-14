"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import type { Hex } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function Onboarding({ info, onComplete }: { info: Info; onComplete: (s: ConsoleSession) => void }) {
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activate your agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Create a smart account you control, set a spend allowance, and grant your agent scoped access
            under the on-chain firewall. You sign once. Deploy, funding, and gas are sponsored.
          </p>
          <label className="block space-y-1">
            <span className="text-muted-foreground">Spend allowance (mUSDC)</span>
            <Input value={cap} onChange={(e) => setCap(e.target.value)} inputMode="decimal" className="max-w-40" />
          </label>
          <Button onClick={activate} disabled={running || !address} className="w-full">
            {running ? "Activating…" : "Activate, set policy & grant"}
          </Button>
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s) => (
              <div key={s.key} className="flex items-start gap-3">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    s.status === "done"
                      ? "bg-green-500"
                      : s.status === "running"
                        ? "bg-yellow-500 animate-pulse"
                        : s.status === "error"
                          ? "bg-destructive"
                          : "bg-muted-foreground/30"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div>{s.label}</div>
                  {s.detail && <div className="truncate text-xs text-muted-foreground">{s.detail}</div>}
                  {s.txHash && (
                    <a className="text-xs underline" href={`${info.explorerTxBase}${s.txHash}`} target="_blank" rel="noreferrer">
                      {short(s.txHash)} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
