import { NextResponse } from "next/server";
import { publicInfo } from "delegation-firewall-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public addresses + chain config the browser needs to build a smart account and a delegation. */
export async function GET() {
  try {
    return NextResponse.json(await publicInfo());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
