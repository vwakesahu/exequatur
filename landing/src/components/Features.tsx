import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const REPO = "https://github.com/vwakesahu/exequatur";

const CARD = "rounded-2xl border border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_10px_40px_-20px_rgba(79,70,229,0.25)]";

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <div className="mb-14 max-w-2xl">
        <p className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-indigo-500">The firewall</p>
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          <span className="text-foreground">Agent spending,</span>{" "}
          <span className="bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text text-transparent">permanently bounded.</span>
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          A spend cap stops the obvious drain. exequatur stops the clever one too, by gating every
          payment on a fresh policy decision that an agent cannot forge or skip.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:auto-rows-[200px] md:grid-cols-4 md:[grid-auto-flow:dense]">
        {/* Anchor: the focal 2x2 image cell */}
        <div className="group relative min-h-[300px] overflow-hidden rounded-2xl md:col-span-2 md:row-span-2 md:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/abstract-2.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f3d]/90 via-[#1a0f3d]/30 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-8 md:p-10">
            <h3 className="max-w-sm font-display text-3xl font-semibold leading-tight text-white md:text-[2.5rem]">
              Your money never moves on a hunch.
            </h3>
            <p className="mt-4 max-w-sm text-white/80">
              Even inside the cap, a transfer still clears the policy check and the on-chain enforcer
              before a single token leaves your account.
            </p>
          </div>
        </div>

        {/* Wide stat */}
        <Link
          href={`${REPO}#tests`}
          target="_blank"
          rel="noreferrer"
          className={`group flex flex-col justify-between p-7 transition-shadow hover:shadow-[0_16px_50px_-20px_rgba(79,70,229,0.4)] md:col-span-2 ${CARD}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">verified</span>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-indigo-500" />
          </div>
          <div className="mt-6 flex items-end gap-4">
            <div className="font-display text-6xl font-semibold leading-none text-foreground">16/16</div>
            <p className="pb-1 text-sm text-muted-foreground">contract tests green, the full A2A flow included.</p>
          </div>
        </Link>

        {/* Pillar 01 */}
        <div className={`flex flex-col justify-between p-6 ${CARD}`}>
          <div className="font-display text-3xl font-semibold text-indigo-500">01</div>
          <div>
            <h3 className="mb-1 text-base font-medium text-foreground">Scoped delegation</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">A capped, token specific allowance. The agent is a delegate, never a key holder.</p>
          </div>
        </div>

        {/* Pillar 02 */}
        <div className={`flex flex-col justify-between p-6 ${CARD}`}>
          <div className="font-display text-3xl font-semibold text-indigo-500">02</div>
          <div>
            <h3 className="mb-1 text-base font-medium text-foreground">Policy attestation</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">Venice checks each action against your intent, then signs only what it approves.</p>
          </div>
        </div>

        {/* Enforcer (indigo) */}
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-7 shadow-[0_10px_40px_-15px_rgba(99,102,241,0.5)] md:col-span-2">
          <div className="font-display text-3xl font-semibold text-white/90">03</div>
          <div>
            <h3 className="mb-1 text-lg font-medium text-white">On-chain enforcer</h3>
            <p className="text-sm text-white/80">No fresh policy signature, the redemption reverts. The decision can never be skipped.</p>
          </div>
        </div>

        {/* Network image accent */}
        <div className="group relative min-h-[220px] overflow-hidden rounded-2xl md:col-span-2 md:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/abstract-3.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1530]/85 to-[#0c1530]/10" />
          <div className="relative flex h-full flex-col justify-end p-7">
            <h3 className="text-lg font-medium text-white">Agent to agent, still bounded</h3>
            <p className="text-sm text-white/75">The narrowest cap in a redelegation chain always wins on-chain.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
