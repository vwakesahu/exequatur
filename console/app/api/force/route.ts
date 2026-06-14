import { NextResponse } from "next/server";
import { forceRedeem, type Delegation } from "delegation-firewall-sdk";
import type { Address } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Force anyway": submit a redemption that skips the off-chain policy. The on-chain
 * AttestationEnforcer rejects it - the point is to show the firewall holds even when the authorizer
 * is bypassed.
 */
export async function POST(req: Request) {
  try {
    const { delegation, recipient, amount } = (await req.json()) as {
      delegation: Delegation;
      recipient: Address;
      amount: string;
    };
    if (!delegation?.signature) {
      return NextResponse.json({ error: "no delegation" }, { status: 400 });
    }
    return NextResponse.json(await forceRedeem({ signedDelegation: delegation, recipient, amount }));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
