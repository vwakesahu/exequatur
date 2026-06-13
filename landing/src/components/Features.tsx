const pillars = [
  {
    n: "01",
    title: "Scoped delegation",
    body: "A capped, token specific allowance from a MetaMask smart account. The agent is a delegate, never a key holder.",
  },
  {
    n: "02",
    title: "Policy attestation",
    body: "Venice checks each action against your intent, then signs only what it actually approves.",
  },
  {
    n: "03",
    title: "On-chain enforcer",
    body: "No fresh policy signature, the redemption reverts. The decision can never be skipped.",
  },
];

const proof = ["No bundler", "EOA delegates", "Single-use attestations", "Live on Base Sepolia"];

const CARD = "rounded-3xl border border-black/[0.06] bg-white shadow-[0_18px_50px_-28px_rgba(79,70,229,0.35)]";

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

      {/* Hero feature: text + image */}
      <div className={`grid overflow-hidden md:grid-cols-2 ${CARD}`}>
        <div className="flex flex-col justify-center gap-6 p-8 md:p-14">
          <h3 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-[2.6rem]">
            Your money never moves on a hunch.
          </h3>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Even inside the cap, every transfer clears the policy check and the on-chain enforcer
            before a single token leaves your account.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <span className="font-display text-5xl font-semibold leading-none text-indigo-600">16/16</span>
            <span className="text-sm leading-snug text-muted-foreground">
              contract tests green,
              <br />
              the full A2A flow included.
            </span>
          </div>
        </div>
        <div className="relative min-h-[320px] md:min-h-[480px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/abstract-2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>

      {/* Three pillars */}
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.n} className={`flex flex-col gap-4 p-8 ${CARD}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 font-display text-lg font-semibold text-indigo-600">
              {p.n}
            </div>
            <h4 className="text-lg font-medium text-foreground">{p.title}</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Proof strip */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {proof.map((p) => (
          <span key={p} className="rounded-full border border-black/[0.06] bg-white px-5 py-2.5 text-sm font-medium text-muted-foreground shadow-sm">
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}
