import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const REPO = "https://github.com/vwakesahu/exequatur";

const pillars = [
  {
    n: "01",
    title: "Scoped delegation",
    body: "A capped, token specific allowance from a MetaMask smart account. The agent is a delegate, never a key holder.",
  },
  {
    n: "02",
    title: "Policy attestation",
    body: "Venice checks each action against your intent. Approve and it gets signed, deny and nothing moves.",
  },
  {
    n: "03",
    title: "On-chain enforcer",
    body: "A custom caveat verifies that signature during redemption. No fresh signature, the transaction reverts.",
  },
];

const chips = ["No bundler", "EOA delegates", "Single-use attestations", "Live on Base Sepolia"];

export default function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-10">
      <div className="mb-12 max-w-2xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-indigo-400">The firewall</p>
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          <span className="text-foreground">Agent spending,</span>
          <br />
          <span className="bg-gradient-to-b from-indigo-300 to-indigo-500 bg-clip-text text-transparent">permanently bounded.</span>
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          A spend cap stops the obvious drain. exequatur stops the clever one too, by gating every
          payment on a fresh policy decision that an agent cannot forge or skip.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* wide statement card */}
        <div className="flex min-h-[260px] flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 md:col-span-2">
          <h3 className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
            Your money never moves on a hunch.
          </h3>
          <p className="max-w-md text-white/80">
            Even when a transfer sits comfortably inside the cap, it still has to clear the policy
            check and the on-chain enforcer before a single token leaves your account.
          </p>
        </div>

        {/* stat card */}
        <Link
          href={`${REPO}#tests`}
          target="_blank"
          rel="noreferrer"
          className="group flex min-h-[260px] flex-col justify-between rounded-3xl border border-border bg-card p-8 transition-colors hover:border-indigo-500/50"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">verified</span>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-indigo-400" />
          </div>
          <div>
            <div className="font-display text-6xl font-medium text-foreground">16/16</div>
            <p className="mt-2 text-muted-foreground">contract tests green, full A2A flow included.</p>
          </div>
        </Link>

        {/* pillars */}
        {pillars.map((p) => (
          <div key={p.n} className="flex flex-col rounded-3xl border border-border bg-card p-8">
            <div className="font-display text-5xl font-medium text-indigo-400">{p.n}</div>
            <h3 className="mb-2 mt-6 text-xl text-foreground">{p.title}</h3>
            <p className="text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      {/* content chips */}
      <div className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-4">
        {chips.map((c) => (
          <div
            key={c}
            className="rounded-2xl border border-border bg-card/60 px-5 py-4 text-center text-sm font-medium text-muted-foreground"
          >
            {c}
          </div>
        ))}
      </div>
    </section>
  );
}
