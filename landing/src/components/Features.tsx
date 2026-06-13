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
];

export default function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-10">
      <div className="mb-12 max-w-2xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-indigo-500">The firewall</p>
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          <span className="text-foreground">Agent spending,</span>
          <br />
          <span className="bg-gradient-to-b from-indigo-500 to-indigo-700 bg-clip-text text-transparent">permanently bounded.</span>
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          A spend cap stops the obvious drain. exequatur stops the clever one too, by gating every
          payment on a fresh policy decision that an agent cannot forge or skip.
        </p>
      </div>

      <div className="grid auto-rows-auto grid-cols-1 gap-4 md:auto-rows-[210px] md:grid-cols-6">
        {/* Showcase image (big) */}
        <div className="group relative col-span-1 row-span-1 min-h-[280px] overflow-hidden rounded-3xl md:col-span-4 md:row-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/abstract-6.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-8 md:p-10">
            <h3 className="max-w-md font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
              Your money never moves on a hunch.
            </h3>
            <p className="mt-3 max-w-md text-white/80">
              Even inside the cap, a transfer still clears the policy check and the on-chain enforcer
              before a single token leaves your account.
            </p>
          </div>
        </div>

        {/* Stat */}
        <Link
          href={`${REPO}#tests`}
          target="_blank"
          rel="noreferrer"
          className="group col-span-1 flex min-h-[180px] flex-col justify-between rounded-3xl border border-border bg-card p-7 transition-colors hover:border-indigo-300 md:col-span-2"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">verified</span>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-indigo-500" />
          </div>
          <div>
            <div className="font-display text-5xl font-medium text-foreground">16/16</div>
            <p className="mt-1 text-sm text-muted-foreground">contract tests green, A2A included.</p>
          </div>
        </Link>

        {/* Pillar 01 (beside the showcase) */}
        <div className="col-span-1 flex min-h-[180px] flex-col rounded-3xl border border-border bg-card p-7 md:col-span-2">
          <div className="font-display text-4xl font-medium text-indigo-500">{pillars[0].n}</div>
          <h3 className="mb-1 mt-4 text-lg text-foreground">{pillars[0].title}</h3>
          <p className="text-sm text-muted-foreground">{pillars[0].body}</p>
        </div>

        {/* Pillar 02 */}
        <div className="col-span-1 flex min-h-[180px] flex-col rounded-3xl border border-border bg-card p-7 md:col-span-2">
          <div className="font-display text-4xl font-medium text-indigo-500">{pillars[1].n}</div>
          <h3 className="mb-1 mt-4 text-lg text-foreground">{pillars[1].title}</h3>
          <p className="text-sm text-muted-foreground">{pillars[1].body}</p>
        </div>

        {/* On-chain enforcer (text) */}
        <div className="col-span-1 flex min-h-[180px] flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-7 md:col-span-2">
          <div className="font-display text-4xl font-medium text-white/90">03</div>
          <div>
            <h3 className="mb-1 text-lg text-white">On-chain enforcer</h3>
            <p className="text-sm text-white/80">No fresh policy signature, the redemption reverts. The decision cannot be skipped.</p>
          </div>
        </div>

        {/* Network image accent */}
        <div className="group relative col-span-1 min-h-[180px] overflow-hidden rounded-3xl md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/abstract-3.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
          <div className="relative flex h-full flex-col justify-end p-7">
            <h3 className="text-lg text-white">Agent to agent</h3>
            <p className="text-sm text-white/75">The narrowest cap in a redelegation chain always wins on-chain.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
