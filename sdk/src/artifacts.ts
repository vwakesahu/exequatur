import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Abi, Hex } from "viem";

const here = dirname(fileURLToPath(import.meta.url));
// CONTRACTS_OUT lets a consumer pin the Foundry out/ dir absolutely. Needed when this package is
// resolved from a copied location (e.g. a pnpm `file:` store) where the relative path no longer holds.
const OUT = process.env.CONTRACTS_OUT ? resolve(process.env.CONTRACTS_OUT) : resolve(here, "../../contracts/out");

interface ForgeArtifact {
  abi: Abi;
  bytecode: { object: Hex };
}

/** Reads a compiled Foundry artifact (run `forge build` in contracts/ first). */
export function artifact(contract: string): { abi: Abi; bytecode: Hex } {
  const path = resolve(OUT, `${contract}.sol`, `${contract}.json`);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`Missing artifact ${path}. Run \`cd contracts && forge build\` first.`);
  }
  const parsed = JSON.parse(raw) as ForgeArtifact;
  return { abi: parsed.abi, bytecode: parsed.bytecode.object };
}
