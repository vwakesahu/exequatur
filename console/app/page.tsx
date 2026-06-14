"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Onboarding } from "@/components/console/onboarding";
import { Console } from "@/components/console/chat";
import { Settings } from "@/components/console/settings";
import { fetchJson, short, type Info } from "@/lib/console-client";
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
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const [info, setInfo] = useState<Info | null>(null);
  const [session, setSession] = useState<ConsoleSession | null>(null);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string>();

  const wrongChain = isConnected && chainId !== baseSepolia.id;

  function refreshHistory() {
    if (address) setSessions(loadHistory(address, baseSepolia.id));
  }

  // Record a new grant in history and make it the active session.
  function activate(s: ConsoleSession) {
    saveSession(s);
    addToHistory(s);
    setSession(s);
    refreshHistory();
  }

  async function revoke(targets: StoredSession[]) {
    const live = targets.filter((s) => !s.revoked);
    if (live.length === 0) return;
    await fetchJson("/api/revoke", { delegations: live.map((s) => s.signedDelegation) });
    markRevoked(live.map((s) => s.id));
    refreshHistory();
    // If the active session was just revoked, drop back to onboarding.
    if (session && live.some((s) => s.id === sessionId(session))) {
      clearSession();
      setSession(null);
      setShowSettings(false);
    }
  }

  useEffect(() => {
    fetchJson<Info>("/api/info").then(setInfo).catch((e) => setError(e.message));
  }, []);

  // Detect a returning user: a stored session for this owner + chain skips onboarding - but only if
  // it is still bound to the live agent/policy/enforcer. A rotated key would revert on-chain
  // (InvalidDelegate), so a stale session is cleared and the user re-onboards cleanly.
  useEffect(() => {
    if (!(isConnected && address && !wrongChain && info)) {
      setSession(null);
      setSessions([]);
      setShowSettings(false);
      return;
    }
    const s = loadSession(address, baseSepolia.id);
    if (s && !sessionMatches(s, info)) {
      clearSession();
      setSession(null);
      setSessions(loadHistory(address, baseSepolia.id));
      return;
    }
    if (s) addToHistory(s); // a returning session predating history still shows in Settings
    setSession(s);
    setSessions(loadHistory(address, baseSepolia.id));
  }, [address, isConnected, wrongChain, info]);

  const ready = isConnected && !wrongChain && info && connector;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 font-mono text-sm">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Exequatur</h1>
          <p className="mt-1 text-muted-foreground">Your agent pays under an on-chain firewall.</p>
        </div>
        {isConnected && (
          <div className="flex flex-col items-end gap-2 text-xs">
            <div className="flex items-center gap-2">
              {wrongChain ? <Badge variant="destructive">wrong chain</Badge> : <Badge variant="secondary">Base Sepolia</Badge>}
              <span className="text-muted-foreground">{short(address)}</span>
            </div>
            <div className="flex gap-2">
              {wrongChain && (
                <Button size="sm" variant="outline" onClick={() => switchChain({ chainId: baseSepolia.id })}>
                  Switch
                </Button>
              )}
              {sessions.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setShowSettings((v) => !v)}>
                  {showSettings ? "Back" : "Settings"}
                </Button>
              )}
              {session && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    clearSession();
                    setSession(null);
                  }}
                >
                  Start over
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </header>

      {!isConnected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connect your wallet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {connectors.map((c) => (
              <Button key={c.uid} size="sm" disabled={isPending} onClick={() => connect({ connector: c })}>
                Connect {c.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {isConnected && wrongChain && (
        <p className="text-xs text-muted-foreground">Switch to Base Sepolia to continue.</p>
      )}

      {ready && showSettings && (
        <Settings
          info={info}
          sessions={sessions}
          activeId={session ? sessionId(session) : undefined}
          onRevoke={(s) => revoke([s])}
          onRevokeAll={() => revoke(sessions)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {ready && !showSettings && session && (
        <>
          <div className="mb-4 text-xs text-muted-foreground">
            smart account{" "}
            <a className="underline" href={`${info.explorerAddressBase}${session.smartAccount}`} target="_blank" rel="noreferrer">
              {short(session.smartAccount)}
            </a>{" "}
            · cap {session.cap} mUSDC · agent {short(info.agent)}
          </div>
          <Console info={info} session={session} onSession={activate} />
        </>
      )}

      {ready && !showSettings && !session && <Onboarding info={info} onComplete={activate} />}

      {!info && !error && isConnected && !wrongChain && <p className="text-xs text-muted-foreground">Loading…</p>}
      {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
    </main>
  );
}
