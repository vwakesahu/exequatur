import { NextResponse } from "next/server";
import { buyGiftCardFromVendor, type Delegation } from "delegation-firewall-sdk";
import { formatUnits, type Address } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BuyBody {
  signedDelegation: Delegation;
  brand: string;
  vendorName: string;
  vendor: Address;
  totalUsdc: string;
  budgetUsdc: string;
  pitch: string;
  cap: string;
}

/** Pay a chosen gift-card seller agent through the firewall; on success the vendor issues a code. */
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as BuyBody;
    if (!b.signedDelegation?.signature) {
      return NextResponse.json({ error: "no active delegation" }, { status: 400 });
    }
    const r = await buyGiftCardFromVendor(b);
    return NextResponse.json({
      executed: r.executed,
      verdict: r.brain,
      reason: r.reason,
      riskFlags: r.riskFlags,
      recipient: b.vendor,
      amount: b.totalUsdc,
      brand: r.brand,
      vendorName: r.vendorName,
      code: r.code,
      txHash: r.txHash ?? null,
      transferred: r.transferred != null ? formatUnits(r.transferred, 6) : null,
      explorerTx: r.txHash ? `https://sepolia.basescan.org/tx/${r.txHash}` : null,
      revertError: r.revertError ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
