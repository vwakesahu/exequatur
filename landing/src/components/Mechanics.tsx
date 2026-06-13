"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

type Mechanic = {
  tag: string;
  title: string;
  body: string;
  gradient: string;
  visual: ReactNode;
};

function Spec({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5 font-mono text-xs md:text-sm">
      {rows.map(([label, value], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-1.5">
          <span className="text-white/40">{label}</span>
          <span className="text-right text-indigo-200">{value}</span>
        </div>
      ))}
    </div>
  );
}

const MECHANICS: Mechanic[] = [
  {
    tag: "on-chain gate",
    title: "The attestation enforcer",
    body: "A redemption only clears if it carries a fresh policy signature bound to the exact action. The off-chain decision becomes impossible to skip.",
    gradient: "bg-gradient-to-br from-indigo-600 to-indigo-800",
    visual: (
      <Spec
        rows={[
          ["binds", "chainId"],
          ["", "delegationHash"],
          ["", "target, value"],
          ["", "keccak(callData)"],
          ["", "nonce, expiry"],
          ["signed by", "the policy key"],
        ]}
      />
    ),
  },
  {
    tag: "the brain",
    title: "The Venice policy",
    body: "It reads your plain-language intent and the untrusted context the agent saw, judges whether they match, and flags injection. Any error or timeout fails closed.",
    gradient: "bg-gradient-to-br from-neutral-900 to-neutral-950",
    visual: (
      <Spec
        rows={[
          ["decision", "deny"],
          ["flag", "prompt_injection"],
          ["flag", "intent_mismatch"],
          ["flag", "unknown_recipient"],
          ["result", "no signature issued"],
        ]}
      />
    ),
  },
  {
    tag: "coordination",
    title: "Agent to agent, still bounded",
    body: "An agent can hand a tighter scope to a sub-agent. The narrowest cap in the chain wins on-chain, every time, no matter what the policy approves.",
    gradient: "bg-gradient-to-br from-neutral-900 to-neutral-950",
    visual: (
      <Spec
        rows={[
          ["user", "cap 100"],
          ["agent", "redelegates"],
          ["worker", "cap 20"],
          ["worker pays 15", "ok"],
          ["worker tries 21", "revert"],
        ]}
      />
    ),
  },
  {
    tag: "safety",
    title: "It fails closed",
    body: "A missing signature, an expired one, a replay, or a Venice outage all resolve to the same outcome. The transaction reverts and no funds move.",
    gradient: "bg-gradient-to-br from-neutral-900 to-neutral-950",
    visual: (
      <Spec
        rows={[
          ["no signature", "revert"],
          ["wrong signer", "revert"],
          ["expired", "revert"],
          ["replay", "revert"],
          ["venice down", "deny"],
        ]}
      />
    ),
  },
];

function Card({ i, total, mechanic, progress }: { i: number; total: number; mechanic: Mechanic; progress: MotionValue<number> }) {
  const targetScale = 1 - (total - i) * 0.04;
  const scale = useTransform(progress, [i * 0.18, 1], [1, targetScale]);

  return (
    <div className="sticky top-0 flex h-screen items-center justify-center px-4">
      <motion.div
        style={{ scale, top: `calc(-6vh + ${i * 28}px)` }}
        className={`relative flex w-full max-w-4xl origin-top flex-col gap-8 overflow-hidden rounded-3xl border border-white/10 p-8 md:flex-row md:items-center md:p-12 ${mechanic.gradient}`}
      >
        <div className="flex-1">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-indigo-300">{mechanic.tag}</p>
          <h3 className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl">{mechanic.title}</h3>
          <p className="mt-4 max-w-md text-white/75">{mechanic.body}</p>
        </div>
        <div className="md:w-72">{mechanic.visual}</div>
      </motion.div>
    </div>
  );
}

export default function Mechanics() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start start", "end end"] });

  return (
    <section id="tests" className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 pt-24 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-indigo-400">Under the hood</p>
        <h2 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="text-foreground">Four things stand between</span>
          <br />
          <span className="bg-gradient-to-b from-indigo-300 to-indigo-500 bg-clip-text text-transparent">an agent and your funds.</span>
        </h2>
      </div>

      <div ref={container} className="relative">
        {MECHANICS.map((mechanic, i) => (
          <Card key={mechanic.title} i={i} total={MECHANICS.length} mechanic={mechanic} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}
