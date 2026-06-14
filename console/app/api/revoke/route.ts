import { NextResponse } from "next/server";
import { revokeDelegations, type Delegation } from "delegation-firewall-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RevokeBody {
  /** The signed delegations to revoke. Revoke-all just sends the whole set. */
  delegations: Delegation[];
}

/**
 * Revoke one or more delegations. After this the firewall refuses to authorize them (the policy
 * issues no fresh attestation), so any redemption reverts on-chain via the AttestationEnforcer.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RevokeBody;
    const delegations = (body.delegations ?? []).filter((d) => d?.signature);
    if (delegations.length === 0) {
      return NextResponse.json({ error: "delegations (with signatures) required" }, { status: 400 });
    }
    const { revoked } = revokeDelegations(delegations);
    return NextResponse.json({ ok: true, count: delegations.length, revoked });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
