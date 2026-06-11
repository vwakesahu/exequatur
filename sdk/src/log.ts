/* Minimal labeled stdout — keeps the e2e output readable and demo-friendly. */
const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export const log = {
  section: (title: string) => console.log(`\n${c.bold(c.cyan(`━━ ${title} ━━`))}`),
  step: (msg: string) => console.log(`  ${c.dim("·")} ${msg}`),
  pass: (msg: string) => console.log(`  ${c.green("✓")} ${msg}`),
  fail: (msg: string) => console.log(`  ${c.red("✗")} ${msg}`),
  note: (msg: string) => console.log(`  ${c.yellow("›")} ${msg}`),
  policy: (msg: string) => console.log(`  ${c.yellow("⚖")} ${msg}`),
  link: (msg: string) => console.log(`    ${c.dim(msg)}`),
};

/** Basescan (Base Sepolia) explorer links — only meaningful on the real network. */
export const explorer = {
  tx: (hash: string) => `https://sepolia.basescan.org/tx/${hash}`,
  address: (addr: string) => `https://sepolia.basescan.org/address/${addr}`,
};
