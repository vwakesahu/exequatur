"use client";

import { useState } from "react";
import { LogOutIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Orb } from "@/components/console/orb";
import { short } from "@/lib/console-client";
import type { StoredSession } from "@/lib/session";

/** Open-source generated avatar (DiceBear) seeded by the wallet address - unique per wallet. */
function avatarUrl(address: string): string {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${address}`;
}

export function Sidebar({
  sessions,
  activeId,
  address,
  smartAccount,
  cap,
  balance,
  remaining,
  explorerAddressBase,
  onSelect,
  onNew,
  onRevoke,
  onRevokeAll,
  onFund,
  onDisconnect,
}: {
  sessions: StoredSession[];
  activeId?: string;
  address: string;
  smartAccount?: string;
  cap?: string;
  balance?: string;
  remaining?: string;
  explorerAddressBase?: string;
  onSelect: (s: StoredSession) => void;
  onNew: () => void;
  onRevoke: (s: StoredSession) => Promise<void>;
  onRevokeAll: () => Promise<void>;
  onFund: () => Promise<void>;
  onDisconnect: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const live = sessions.filter((s) => !s.revoked);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border/50 bg-card/30 md:flex">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/orb.png" alt="" className="size-6 rounded-md" />
          exequatur
        </span>
        <button
          onClick={onNew}
          title="New grant"
          className="grid size-7 place-items-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-4 pb-1">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Sessions</span>
        {live.length > 1 &&
          (busy === "all" ? (
            <Orb size="icon" className="size-4" />
          ) : (
            <button onClick={() => run("all", onRevokeAll)} className="text-[11px] text-muted-foreground transition hover:text-destructive">
              revoke all
            </button>
          ))}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 && <p className="px-2.5 py-1 text-xs text-muted-foreground">No grants yet.</p>}
        {sessions.map((s) => {
          const isActive = s.id === activeId && !s.revoked;
          return (
            <div
              key={s.id}
              className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition ${isActive ? "bg-primary/10" : "hover:bg-muted/40"}`}
            >
              <button
                disabled={s.revoked}
                onClick={() => onSelect(s)}
                className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
              >
                <div className={`flex items-center gap-1.5 text-xs ${s.revoked ? "text-muted-foreground line-through" : ""}`}>
                  <span className="font-medium">{s.cap} mUSDC</span>
                  {s.revoked && <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 no-underline">revoked</span>}
                </div>
                <div className="truncate pt-0.5 text-[11px] text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString()} · agent {short(s.signedDelegation.delegate)}
                </div>
              </button>
              {!s.revoked &&
                (busy === s.id ? (
                  <Orb size="icon" className="size-4" />
                ) : (
                  <button
                    onClick={() => run(s.id, () => onRevoke(s))}
                    title="Revoke"
                    className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      {/* active-session account */}
      {smartAccount && (
        <div className="space-y-2 border-t border-border/50 px-4 py-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">account</span>
            <a
              href={explorerAddressBase ? `${explorerAddressBase}${smartAccount}` : undefined}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-foreground/75 transition hover:text-foreground"
            >
              {short(smartAccount)}
            </a>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">balance</span>
            <span className="font-mono text-foreground/80">{balance ?? "…"} mUSDC</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">allowance</span>
            <span className="font-mono text-foreground/80">
              {remaining ?? "…"}/{cap} mUSDC
            </span>
          </div>
          {busy === "fund" ? (
            <div className="flex justify-center py-0.5">
              <Orb size="icon" className="size-5" />
            </div>
          ) : (
            <button
              onClick={() => run("fund", onFund)}
              className="w-full rounded-lg border border-border/60 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              Fund +10 mUSDC
            </button>
          )}
        </div>
      )}

      {/* profile */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-3 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(address)} alt="account" className="size-8 shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1 font-mono text-xs text-foreground/80">{short(address)}</div>
        <button
          onClick={onDisconnect}
          title="Disconnect"
          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
        >
          <LogOutIcon className="size-4" />
        </button>
      </div>
    </aside>
  );
}
