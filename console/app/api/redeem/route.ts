import { NextResponse } from "next/server";
import { redeemSignedDelegation, type Delegation } from "delegation-firewall-sdk";
import { formatUnits, type Address } from "viem";

const USDC_DECIMALS = 6;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RedeemBody {
  signedDelegation: Delegation;
  recipient: Address;
  amount: string;
  cap: string;
  intent: string;
}

/** Run the firewall (policy verdict -> attestation -> redeem via agent EOA) over a browser-signed delegation. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RedeemBody;
    if (!body.signedDelegation?.signature) {
      return NextResponse.json({ error: "signedDelegation (with signature) required" }, { status: 400 });
    }
    const result = await redeemSignedDelegation(body);
    // PaymentResult.transferred is a bigint in base units; format to a human mUSDC string (6dp) so
    // the UI shows "1", not "1000000". JSON-safe either way.
    return NextResponse.json({
      ...result,
      transferred: result.transferred != null ? formatUnits(result.transferred, USDC_DECIMALS) : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
