import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Abi, Hex } from "viem";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../../contracts/out");

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
