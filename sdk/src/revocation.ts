/**
 * Server-side delegation revocation.
 *
 * Revoking a delegation makes the firewall refuse to authorize it: the policy stops issuing fresh
 * attestations for that delegation's hash, so any redemption reverts on-chain via the
 * AttestationEnforcer (which requires a fresh policy signature per redemption). That makes this a
 * real, on-chain-ENFORCED revoke with no UserOp / bundler required - which matters because this
 * design has the delegate (an EOA) redeem directly, and there is no bundler to send the smart
 * account's `disableDelegation` call.
 *
 * Persisted to a JSON file (REVOCATIONS_PATH) so a revoke survives a server restart. On an ephemeral
 * serverless filesystem the write is best-effort; a production deployment backs this with a database.
 *
 * Server-only (imported by console.ts and the /api/revoke route).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Delegation } from "@metamask/smart-accounts-kit";
import { leafHash } from "./delegation.js";

function revocationsPath(): string {
  return process.env.REVOCATIONS_PATH ?? join(process.cwd(), "revocations.json");
}

// Cache the set for the process lifetime; reload lazily so a fresh serverless invocation still sees
// previously-persisted revocations.
let cache: Set<string> | null = null;

function load(): Set<string> {
  if (cache) return cache;
  try {
    const arr = JSON.parse(readFileSync(revocationsPath(), "utf8")) as string[];
    cache = new Set(arr.map((h) => h.toLowerCase()));
  } catch {
    cache = new Set();
  }
  return cache;
}

function persist(set: Set<string>): void {
  try {
    writeFileSync(revocationsPath(), JSON.stringify([...set], null, 2));
  } catch (e) {
    console.warn("revocation: could not persist revocations.json:", (e as Error).message);
  }
}

/** True if this delegation has been revoked (matched by its leaf hash). */
export function isRevoked(delegation: Delegation): boolean {
  return load().has(leafHash(delegation).toLowerCase());
}

/** Revoke one or more delegations (idempotent). Returns the full set of revoked hashes. */
export function revokeDelegations(delegations: Delegation[]): { revoked: string[] } {
  const set = load();
  for (const d of delegations) set.add(leafHash(d).toLowerCase());
  persist(set);
  return { revoked: [...set] };
}

/** Every revoked delegation hash known to this server. */
export function listRevoked(): string[] {
  return [...load()];
}
