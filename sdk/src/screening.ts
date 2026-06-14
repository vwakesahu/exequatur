import type { Address } from "viem";

/** Result of a recipient address risk / sanctions screen. */
export interface ScreeningResult {
  provider: string;
  address: Address;
  status: "clear" | "flagged";
  /** 0 (clean) to 100 (sanctioned/critical). */
  riskScore: number;
  sanctioned: boolean;
  /** Risk categories the address matched, e.g. ["sanctions"], ["mixer"], ["burn_address"]. */
  categories: string[];
  /** Provider screening reference id. */
  reference: string;
}

const SCREENING_PROVIDER = process.env.SCREENING_PROVIDER ?? "Chainproof Risk API";

// Addresses that fail screening. The burn address is always non-recoverable; extra demo addresses
// can be added via SCREENING_WATCHLIST (comma-separated). A live integration replaces this with a
// provider lookup, not a static set.
const WATCHLIST = new Map<string, string[]>([
  ["0x000000000000000000000000000000000000dead", ["burn_address", "non_recoverable"]],
  ...(process.env.SCREENING_WATCHLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((a) => [a, ["sanctions"]] as [string, string[]]),
]);

/**
 * Screen a recipient address for sanctions / risk before a payment is authorized. This is a stub:
 * it returns a deterministic verdict with no live network call, but is shaped like a real screening
 * integration (provider, risk score, sanction categories, a screening reference) so the data and
 * flow are production-realistic. To go live, replace the body with a provider call (e.g. Chainalysis,
 * TRM, Elliptic) keyed by SCREENING_API_KEY and keep this return shape.
 */
export async function screenAddress(address: Address): Promise<ScreeningResult> {
  await new Promise((resolve) => setTimeout(resolve, 500)); // provider round-trip
  const categories = WATCHLIST.get(address.toLowerCase()) ?? [];
  const sanctioned = categories.length > 0;
  return {
    provider: SCREENING_PROVIDER,
    address,
    status: sanctioned ? "flagged" : "clear",
    riskScore: sanctioned ? 95 : 0,
    sanctioned,
    categories,
    reference: `scr_${address.toLowerCase().slice(2, 12)}`,
  };
}
