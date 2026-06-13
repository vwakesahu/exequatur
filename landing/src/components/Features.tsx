import Link from "next/link";
import { ArrowRight } from "lucide-react";

const REPO = "https://github.com/vwakesahu/exequatur";

export default function Features() {
  return (
    <div className="mx-auto max-w-7xl pb-24">
      <div className="mb-6 grid h-[40vh] w-full grid-cols-1 place-items-center gap-6">
        <h2 className="text-center font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          <span className="text-foreground">Agent spending,</span>
          <br />
          <span className="bg-gradient-to-b from-indigo-400 to-indigo-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-indigo-500">
            permanently bounded.
          </span>
        </h2>
      </div>

      <div className="mx-auto max-w-7xl p-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6">
            <div className="aspect-square rounded-3xl bg-gradient-to-b from-indigo-400 to-indigo-600 p-8">
              <div className="flex h-full flex-col justify-between">
                <div className="font-display text-7xl font-medium text-white md:text-8xl">01</div>
                <div>
                  <h3 className="mb-2 text-xl text-white">Scoped delegation</h3>
                  <p className="text-white/75">
                    A MetaMask smart account grants a capped, token specific allowance. The agent is
                    a delegate, never a key holder.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted p-8">
              <div className="font-display text-7xl font-medium text-foreground md:text-8xl">02</div>
              <div className="mt-6">
                <h3 className="mb-2 text-xl text-foreground">Policy attestation</h3>
                <p className="text-muted-foreground">
                  Every action is checked against your intent by Venice. Approve and it gets signed,
                  deny and nothing moves.
                </p>
              </div>
            </div>
          </div>

          {/* Center column */}
          <div className="flex h-full flex-col justify-between space-y-6">
            <div className="hidden lg:block" />
            <div className="rounded-3xl p-8">
              <div className="relative flex h-full items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="exequatur mark" width={176} height={176} className="relative h-44 w-44" />
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-b from-indigo-400 to-indigo-600 p-8">
              <div className="flex items-center justify-between gap-4">
                <Link href={REPO} target="_blank" rel="noreferrer">
                  <button className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:bg-neutral-100">
                    See it run
                  </button>
                </Link>
                <Link
                  href={REPO}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white transition-all duration-300 hover:bg-neutral-100"
                >
                  <ArrowRight className="h-5 w-5 text-black" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-muted p-8">
              <div className="font-display text-7xl font-medium text-foreground md:text-8xl">03</div>
              <div className="mt-6">
                <h3 className="mb-2 text-xl text-foreground">On-chain enforcer</h3>
                <p className="text-muted-foreground">
                  A custom caveat checks that signature inside the redemption. No fresh signature,
                  the transaction reverts.
                </p>
              </div>
            </div>

            <div className="aspect-square rounded-3xl bg-gradient-to-b from-indigo-400 to-indigo-600 p-8">
              <div className="flex h-full flex-col justify-between">
                <div className="font-display text-6xl font-medium text-white md:text-7xl">16/16</div>
                <p className="text-lg text-white/90">
                  Contract tests green, including the full agent to sub-agent redelegation flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
