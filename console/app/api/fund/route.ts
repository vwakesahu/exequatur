import { NextResponse } from "next/server";
import { fundUsdc } from "delegation-firewall-sdk";
import type { Address } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mint MockUSDC to the user's smart account so it has a real balance to spend. */
export async function POST(req: Request) {
  try {
    const { to, amount } = (await req.json()) as { to: Address; amount: string };
    if (!to || !amount) {
      return NextResponse.json({ error: "to and amount required" }, { status: 400 });
    }
    return NextResponse.json(await fundUsdc({ to, amount }));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
