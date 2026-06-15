"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { AlertTriangleIcon } from "lucide-react";
import { AccentButton } from "@/components/ui/accent-button";
import { Orb } from "@/components/console/orb";
import { Onboarding } from "@/components/console/onboarding";
import { Console } from "@/components/console/chat";
import { Sidebar } from "@/components/console/sidebar";
import { fetchJson, type Info } from "@/lib/console-client";
import {
  addToHistory,
  clearSession,
  loadHistory,
  loadSession,
  markRevoked,
  saveSession,
  sessionId,
  sessionMatches,
  type ConsoleSession,
  type StoredSession,
} from "@/lib/session";

export default function Page() {
  // chainId from useAccount() is the *wallet's* actual network (reactive to wallet network switches);
  // useChainId() only reflects the config's chain, so it never detected a wrong network.
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const [info, setInfo] = useState<Info | null>(null);
  const [session, setSession] = useState<ConsoleSession | null>(null);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [composing, setComposing] = useState(false);
  const [balance, setBalance] = useState<string>();
  const [remaining, setRemaining] = useState<string>();
  const [error, setError] = useState<string>();

  const wrongChain = isConnected && chainId != null && chainId !== baseSepolia.id;

  function refreshHistory() {
    if (address) setSessions(loadHistory(address, baseSepolia.id));
  }

  // Balance + remaining allowance for the active session (shown in the sidebar, used by the chat).
  const refreshBalance = useCallback(async () => {
    if (!session) {
      setBalance(undefined);
      setRemaining(undefined);
      return;
    }
    try {
      const r = await fetchJson<{ balance: string; remaining?: string }>("/api/balance", {
        address: session.smartAccount,
        delegation: session.signedDelegation,
        cap: session.cap,
      });
      setBalance(r.balance);
      if (r.remaining != null) setRemaining(r.remaining);
    } catch {
      /* ignore */
    }
  }, [session]);
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const fund = useCallback(async () => {
    if (!session) return;
    await fetchJson("/api/fund", { to: session.smartAccount, amount: "10" });
    await refreshBalance();
  }, [session, refreshBalance]);

  function activate(s: ConsoleSession) {
    saveSession(s);
    addToHistory(s);
    setSession(s);
    setComposing(false);
    refreshHistory();
  }

  function selectSession(s: StoredSession) {
    if (s.revoked) return;
    saveSession(s);
    setSession(s);
    setComposing(false);
  }

  async function revoke(targets: StoredSession[]) {
    const live = targets.filter((s) => !s.revoked);
    if (live.length === 0) return;
    await fetchJson("/api/revoke", { delegations: live.map((s) => s.signedDelegation) });
    markRevoked(live.map((s) => s.id));
    refreshHistory();
    if (session && live.some((s) => s.id === sessionId(session))) {
      clearSession();
      setSession(null);
    }
  }

  useEffect(() => {
    fetchJson<Info>("/api/info").then(setInfo).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!(isConnected && address && !wrongChain && info)) {
      setSession(null);
      setSessions([]);
      setComposing(false);
      return;
    }
    const s = loadSession(address, baseSepolia.id);
    if (s && !sessionMatches(s, info)) {
      clearSession();
      setSession(null);
      setSessions(loadHistory(address, baseSepolia.id));
      return;
    }
    if (s) addToHistory(s);
    setSession(s);
    setSessions(loadHistory(address, baseSepolia.id));
  }, [address, isConnected, wrongChain, info]);

  // Not connected: a focused, full-screen connect.
  if (!isConnected) {
    return (
      <div className="grid h-svh place-items-center px-6">
        <div className="flex max-w-sm flex-col items-center gap-6 text-center">
          <Orb size="lg" state="idle" />
          <div className="space-y-1.5">
            <h1 className="text-lg font-medium">Connect your wallet</h1>
            <p className="text-sm text-muted-foreground">
              Your wallet authorizes the agent once. Every payment it makes is still gated by the on-chain firewall.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {connectors.map((c) => (
              <AccentButton key={c.uid} disabled={isPending} onClick={() => connect({ connector: c })}>
                Connect {c.name}
              </AccentButton>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden text-sm">
      <Sidebar
        sessions={sessions}
        activeId={session ? sessionId(session) : undefined}
        address={address!}
        smartAccount={session?.smartAccount}
        cap={session?.cap}
        balance={balance}
        remaining={remaining}
        explorerAddressBase={info?.explorerAddressBase}
        onSelect={selectSession}
        onNew={() => setComposing(true)}
        onRevoke={(s) => revoke([s])}
        onRevokeAll={() => revoke(sessions)}
        onFund={fund}
        onDisconnect={() => disconnect()}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {!info ? (
          <div className="grid flex-1 place-items-center">{error ? <span className="text-xs text-destructive">{error}</span> : <Orb size="md" />}</div>
        ) : session && !composing ? (
          <Console info={info} session={session} onSession={activate} balance={balance} remaining={remaining} refreshBalance={refreshBalance} fund={fund} />
        ) : (
          <Onboarding info={info} onComplete={activate} onBack={sessions.length > 0 ? () => setComposing(false) : undefined} />
        )}
      </main>

      {wrongChain && <ChainModal onSwitch={() => switchChain({ chainId: baseSepolia.id })} />}
    </div>
  );
}

/** Shown over everything when the wallet is on the wrong network. No action can run until switched. */
function ChainModal({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/95 p-8 text-center shadow-2xl">
        <span className="grid size-12 place-items-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTriangleIcon className="size-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-medium">Wrong network</h2>
          <p className="text-sm text-muted-foreground">Switch your wallet to Base Sepolia to continue.</p>
        </div>
        <AccentButton onClick={onSwitch}>Switch to Base Sepolia</AccentButton>
      </div>
    </div>
  );
}
