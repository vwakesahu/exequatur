import { Check, ShieldCheck, ShieldOff, X } from "lucide-react";

const holds = [
  "A hijacked or prompt-injected agent acting outside your intent or scope",
  "A malicious sub-agent you redelegated a narrower budget to",
  "Replay of a stale approval, even a valid one reused later",
];

const doesnt = [
  "You signing a bad root delegation in the first place",
  "The policy service signing key being compromised",
  "A merchant you chose to pay turning out to be malicious",
];

export default function ThreatModel() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <div className="mb-12 max-w-2xl">
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          <span className="text-foreground">What it stops.</span>{" "}
          <span className="bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text text-transparent">And what it doesn&apos;t.</span>
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          A bounded claim beats a vague one. Here is exactly where the firewall holds, and where it
          does not pretend to.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-8 shadow-[0_18px_50px_-28px_rgba(79,70,229,0.35)] md:p-10">
          <div className="mb-7 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg font-medium text-foreground">Holds against</h3>
          </div>
          <ul className="space-y-5">
            {holds.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                <span className="text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-[#f6f5fb] p-8 md:p-10">
          <div className="mb-7 flex items-center gap-3">
            <ShieldOff className="h-6 w-6 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">Does not cover</h3>
          </div>
          <ul className="space-y-5">
            {doesnt.map((item) => (
              <li key={item} className="flex gap-3">
                <X className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
