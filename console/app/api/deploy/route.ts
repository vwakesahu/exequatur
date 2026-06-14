import { NextResponse } from "next/server";
import { sponsorDeploy } from "delegation-firewall-sdk";
import type { Address, Hex } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sponsor the deploy of the user's counterfactual smart account from the deployer key. */
export async function POST(req: Request) {
  try {
    const { factory, factoryData } = (await req.json()) as { factory: Address; factoryData: Hex };
    if (!factory || !factoryData) {
      return NextResponse.json({ error: "factory and factoryData required" }, { status: 400 });
    }
    return NextResponse.json(await sponsorDeploy({ factory, factoryData }));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
