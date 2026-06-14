import { NextResponse } from "next/server";
import { usdcBalance, allowanceRemaining, type Delegation } from "delegation-firewall-sdk";
import type { Address } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current MockUSDC balance + (if a delegation+cap are given) the remaining spend allowance. */
export async function POST(req: Request) {
  try {
    const { address, delegation, cap } = (await req.json()) as {
      address: Address;
      delegation?: Delegation;
      cap?: string;
    };
    if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });
    const balance = await usdcBalance(address);
    const remaining = delegation?.signature && cap ? await allowanceRemaining(delegation, cap) : undefined;
    return NextResponse.json({ balance, remaining });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
