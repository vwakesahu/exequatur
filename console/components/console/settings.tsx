"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { short, type Info } from "@/lib/console-client";
import type { StoredSession } from "@/lib/session";

/**
 * Settings: the user's delegation history (every allowance they have granted) with per-grant Revoke
 * and a Revoke all. Revoking tells the firewall to stop authorizing that delegation; any further
 * payment on it is refused, and a direct on-chain redemption reverts (no fresh attestation is issued).
 */
export function Settings({
  info,
  sessions,
  activeId,
  onRevoke,
  onRevokeAll,
  onClose,
}: {
  info: Info;
  sessions: StoredSession[];
  activeId?: string;
  onRevoke: (s: StoredSession) => Promise<void>;
  onRevokeAll: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const liveCount = sessions.filter((s) => !s.revoked).length;

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Sessions</CardTitle>
        <div className="flex items-center gap-2">
          {liveCount > 1 && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy !== null}
              onClick={() => run("all", onRevokeAll)}
            >
              {busy === "all" ? "Revoking all…" : "Revoke all"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sessions.length === 0 && <p className="text-xs text-muted-foreground">No grants yet.</p>}

        {sessions.map((s) => {
          const isActive = s.id === activeId && !s.revoked;
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.cap} mUSDC cap</span>
                  {s.revoked ? (
                    <Badge variant="destructive">revoked</Badge>
                  ) : isActive ? (
                    <Badge>active</Badge>
                  ) : (
                    <Badge variant="secondary">inactive</Badge>
                  )}
                </div>
                <div className="text-muted-foreground">
                  <a
                    className="underline"
                    href={`${info.explorerAddressBase}${s.smartAccount}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {short(s.smartAccount)}
                  </a>{" "}
                  · agent {short(s.signedDelegation.delegate)} · {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
              {!s.revoked && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => run(s.id, () => onRevoke(s))}
                >
                  {busy === s.id ? "Revoking…" : "Revoke"}
                </Button>
              )}
            </div>
          );
        })}

        <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Revoking stops the firewall from authorizing a delegation. Payments on it are refused, and a
          direct on-chain redemption reverts because the policy no longer signs a fresh attestation.
        </p>
      </CardContent>
    </Card>
  );
}
