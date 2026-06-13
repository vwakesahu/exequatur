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

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:py-32">
      <div className="mb-12 max-w-3xl">
        <h2 className="font-display text-4xl font-semibold leading-[1.03] tracking-tight md:text-[4rem]">
          <span className="text-foreground">Agent spending,</span>{" "}
          <span className="bg-gradient-to-br from-indigo-500 to-violet-600 bg-clip-text text-transparent">permanently bounded.</span>
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          A spend cap stops the obvious drain. exequatur stops the clever one too, by gating every
          payment on a fresh policy decision an agent cannot forge or skip.
        </p>
      </div>

      {/* Focal feature */}
      <div className="relative h-[440px] overflow-hidden rounded-[28px] md:h-[540px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/abstract-2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#160c34] via-[#160c34]/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 max-w-2xl p-8 md:p-14">
          <h3 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-white md:text-5xl">
            Your money never moves on a hunch.
          </h3>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
            Even inside the cap, every transfer clears the policy check and the on-chain enforcer
            before a single token leaves your account.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <span className="font-display text-4xl font-semibold leading-none text-white">16/16</span>
            <span className="text-sm leading-snug text-white/65">
              contract tests green,
              <br />
              the full agent to agent flow included.
            </span>
          </div>
        </div>
      </div>

      {/* Mechanism, editorial columns */}
      <div className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-3 md:gap-y-0">
        {pillars.map((p) => (
          <div key={p.n} className="border-t border-foreground/10 pt-6">
            <div className="font-display text-5xl font-semibold text-indigo-500">{p.n}</div>
            <h4 className="mt-6 text-xl font-medium text-foreground">{p.title}</h4>
            <p className="mt-2 leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
