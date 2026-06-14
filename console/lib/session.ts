import type { Delegation } from "@metamask/smart-accounts-kit";
import type { Address } from "viem";

/**
 * The activated console session: the user's smart account and the delegation they signed once
 * during onboarding. Persisted in localStorage so a returning user skips onboarding and lands in
 * the chat. The signed delegation is not a secret - it is gated by the on-chain firewall - so the
 * browser is an acceptable home for the demo.
 */
export interface ConsoleSession {
  owner: Address;
  chainId: number;
  smartAccount: Address;
  cap: string;
  signedDelegation: Delegation;
}

const KEY = "exequatur.session.v1";

export function loadSession(owner?: Address, chainId?: number): ConsoleSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ConsoleSession;
    if (!s.signedDelegation?.signature) return null;
    // Only valid for the currently connected owner + chain.
    if (owner && s.owner.toLowerCase() !== owner.toLowerCase()) return null;
    if (chainId && s.chainId !== chainId) return null;
    return s;
  } catch {
    return null;
  }
}

/**
 * A stored delegation is only redeemable if it is still bound to the live agent EOA, policy signer,
 * and enforcer. Those rotate if keys regenerate (e.g. a dev restart without pinned keys), which the
 * DelegationManager rejects at redemption with InvalidDelegate. Detect the mismatch up front and
 * force a clean re-onboard instead of letting a doomed payment reach the chain.
 */
export function sessionMatches(
  s: ConsoleSession,
  cfg: { agent: string; policySigner: string; attestationEnforcer: string | null },
): boolean {
  if (!cfg.attestationEnforcer) return false; // contracts not configured
  if (s.signedDelegation.delegate.toLowerCase() !== cfg.agent.toLowerCase()) return false;
  const enforcer = cfg.attestationEnforcer.toLowerCase();
  const caveat = s.signedDelegation.caveats.find((c) => c.enforcer.toLowerCase() === enforcer);
  if (!caveat) return false; // enforcer rotated (contracts changed)
  // The attestation caveat's terms are the policy signer address.
  return caveat.terms.toLowerCase() === cfg.policySigner.toLowerCase();
}

export function saveSession(session: ConsoleSession): void {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  window.localStorage.removeItem(KEY);
}

/**
 * A grant in the session history, shown in Settings. Every delegation the user has signed is appended
 * here (the active session is the most recent one), so the user can review and revoke any of them.
 * `id` is the delegation salt - unique per grant, since onboarding signs with a random salt.
 */
export interface StoredSession extends ConsoleSession {
  id: string;
  createdAt: number;
  revoked?: boolean;
}

const HISTORY_KEY = "exequatur.sessions.v1";

function readHistory(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(all: StoredSession[]): void {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
}

/** A delegation's stable id within the history (its salt, unique per grant). */
export function sessionId(s: ConsoleSession): string {
  return String(s.signedDelegation.salt);
}

/** All grants for the connected owner + chain, newest first. */
export function loadHistory(owner?: Address, chainId?: number): StoredSession[] {
  return readHistory()
    .filter((s) => (!owner || s.owner.toLowerCase() === owner.toLowerCase()) && (!chainId || s.chainId === chainId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Append a grant to the history. Idempotent: an already-recorded grant keeps its timestamp/revoked flag. */
export function addToHistory(session: ConsoleSession): void {
  const id = sessionId(session);
  const all = readHistory();
  if (all.some((s) => s.id === id)) return;
  all.push({ ...session, id, createdAt: Date.now() });
  writeHistory(all);
}

/** Mark a grant revoked in the history (the firewall enforces the revoke server-side). */
export function markRevoked(ids: string[]): void {
  const set = new Set(ids);
  writeHistory(readHistory().map((s) => (set.has(s.id) ? { ...s, revoked: true } : s)));
}
