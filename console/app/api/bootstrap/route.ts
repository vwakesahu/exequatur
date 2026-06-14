import { NextResponse } from "next/server";
import { ensureContracts } from "delegation-firewall-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time deploy of MockUSDC + AttestationEnforcer (if not pinned in env) + agent gas top-up,
 * sponsored by the deployer. Idempotent and cached for the process. Kept off `/api/info` so the
 * page loads instantly; the browser calls this explicitly before building a delegation.
 */
export async function POST() {
  try {
    return NextResponse.json(await ensureContracts());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
