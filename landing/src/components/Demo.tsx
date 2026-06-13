type Line = { kind: "step" | "ok" | "deny" | "revert" | "head"; text: string };

const LINES: Line[] = [
  { kind: "head", text: "$ pnpm e2e   # real Base Sepolia, policy by Venice qwen3-4b" },
  { kind: "step", text: "scenario 1  agent pays 25 mUSDC to the merchant" },
  { kind: "ok", text: "venice APPROVE  matches intent, within the 100 cap  -> paid" },
  { kind: "step", text: "scenario 2  hijacked agent tries to pay an attacker" },
  { kind: "deny", text: "venice DENY  flags: prompt_injection, intent_mismatch  -> no signature" },
  { kind: "step", text: "scenario 2b  agent forges its own attestation" },
  { kind: "revert", text: "reverts on-chain  AttestationEnforcer.PolicySignatureMismatch" },
  { kind: "step", text: "scenario 3  agent redelegates a 20 cap to a worker, worker pays 15" },
  { kind: "ok", text: "venice APPROVE  within the narrowed scope  -> paid" },
  { kind: "step", text: "scenario 3b  worker tries 21, over the narrowed cap" },
  { kind: "revert", text: "reverts on-chain  ERC20TransferAmountEnforcer:allowance-exceeded" },
  { kind: "ok", text: "all scenarios passed  firewall + A2A verified end to end" },
];

const color: Record<Line["kind"], string> = {
  head: "text-indigo-300",
  step: "text-neutral-500",
  ok: "text-emerald-400",
  deny: "text-amber-400",
  revert: "text-rose-400",
};

const prefix: Record<Line["kind"], string> = {
  head: "",
  step: "·  ",
  ok: "✓  ",
  deny: "⚖  ",
  revert: "✗  ",
};

export default function Demo() {
  return (
    <div className="mx-auto max-w-7xl px-4 md:py-24">
      <div className="mb-10 text-center md:mb-14">
        <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          <span className="text-foreground">Watch it refuse </span>
          <span className="bg-gradient-to-b from-indigo-400 to-indigo-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-indigo-500">
            the bad payment.
          </span>
        </h2>
      </div>

      <div className="rounded-[36px] border border-border bg-muted p-3 md:rounded-[50px] md:p-6">
        <div className="overflow-hidden rounded-[28px] border border-neutral-800 bg-neutral-950 md:rounded-[38px]">
          <div className="flex items-center gap-2 border-b border-neutral-800 px-5 py-4">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-3 font-mono text-xs text-neutral-500">exequatur / sdk / e2e</span>
          </div>
          <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed md:p-8 md:text-sm">
            {LINES.map((line, i) => (
              <div key={i} className={color[line.kind]}>
                {prefix[line.kind]}
                {line.text}
              </div>
            ))}
            <div className="pt-3 text-neutral-500">
              proof on Base Sepolia:{" "}
              <a
                className="text-indigo-400 underline-offset-2 hover:underline"
                href="https://sepolia.basescan.org/tx/0x3f4e8c0b160f4540d659a980710b1bcba7cd0e9a667d3dc5c39f0cb2397ebfdf"
                target="_blank"
                rel="noreferrer"
              >
                happy path tx
              </a>
              {"  "}
              <a
                className="text-indigo-400 underline-offset-2 hover:underline"
                href="https://sepolia.basescan.org/tx/0x0dfff0d31fac997930e0ae8f8833aaf51013a1e0b1330ef38adf016e9af3b95f"
                target="_blank"
                rel="noreferrer"
              >
                A2A worker tx
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
