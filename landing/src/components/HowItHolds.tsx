import { ShieldCheck, Fingerprint, Repeat, Eye, CircleSlash, Network } from "lucide-react";

export default function HowItHolds() {
  return (
    <div id="tests" className="mx-auto mt-20 max-w-7xl px-4 pb-24 scroll-mt-24">
      <div className="mb-12 text-center md:mb-24">
        <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          <span className="text-foreground">What actually stops</span>
          <br />
          <span className="bg-gradient-to-b from-indigo-400 to-indigo-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-indigo-500">
            the bad payment.
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Main card */}
        <div className="rounded-3xl bg-gradient-to-b from-indigo-400 to-indigo-600 p-8 md:col-span-2 md:row-span-2">
          <div className="flex h-full flex-col">
            <div>
              <div className="mb-6 flex items-center gap-4">
                <ShieldCheck className="h-8 w-8 text-white" />
                <h3 className="font-display text-2xl font-semibold text-white">The attestation enforcer</h3>
              </div>
              <p className="text-lg text-white/90">
                A redemption only goes through if it carries a fresh policy signature bound to the
                exact action. The off-chain decision becomes impossible to skip.
              </p>
            </div>
            <div className="mt-auto grid grid-cols-1 gap-4 pt-8 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-6">
                <Fingerprint className="mb-4 h-6 w-6 text-white" />
                <h4 className="mb-2 text-lg text-white">Action bound</h4>
                <p className="text-white/80">Chain, target, amount and calldata are all hashed into what gets signed.</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-6">
                <Repeat className="mb-4 h-6 w-6 text-white" />
                <h4 className="mb-2 text-lg text-white">Single use</h4>
                <p className="text-white/80">The nonce is keyed per delegation, so a stale approval cannot be replayed.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Venice card */}
        <div className="rounded-3xl border border-border bg-muted p-8 md:col-span-2">
          <div className="mb-6 flex items-center gap-4">
            <Eye className="h-8 w-8 text-indigo-500" />
            <h3 className="font-display text-2xl font-semibold text-foreground">The Venice policy</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-6">
              <Eye className="mb-4 h-6 w-6 text-indigo-500" />
              <h4 className="mb-2 text-lg text-foreground">Intent match</h4>
              <p className="text-muted-foreground">Judges whether the action serves what you actually asked for.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-6">
              <CircleSlash className="mb-4 h-6 w-6 text-indigo-500" />
              <h4 className="mb-2 text-lg text-foreground">Fails closed</h4>
              <p className="text-muted-foreground">Any error, timeout or malformed output denies, so funds never move on a glitch.</p>
            </div>
          </div>
        </div>

        {/* Stat card */}
        <div className="flex items-center justify-between rounded-3xl border border-border bg-muted p-6">
          <div>
            <p className="font-display text-5xl font-medium text-indigo-500">0</p>
            <p className="mt-2 text-muted-foreground">funds moved on a policy error</p>
          </div>
          <CircleSlash className="h-10 w-10 text-indigo-500" />
        </div>

        {/* A2A card */}
        <div className="rounded-3xl bg-gradient-to-b from-indigo-400 to-indigo-600 p-6">
          <div className="flex h-full items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Network className="h-6 w-6 text-white" />
                <p className="text-xl text-white">A2A redelegation</p>
              </div>
              <p className="mt-2 text-white/80">An agent can hand a tighter scope to a sub-agent. The narrower cap always wins on-chain.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
