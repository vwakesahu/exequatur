"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

type Mechanic = {
  tag: string;
  title: string;
  body: string;
  src: string;
};

const MECHANICS: Mechanic[] = [
  {
    tag: "on-chain gate",
    title: "The attestation enforcer",
    body: "A redemption only clears if it carries a fresh policy signature bound to the exact action. The off-chain decision becomes impossible to skip.",
    src: "/assets/abstract-1.jpg",
  },
  {
    tag: "the brain",
    title: "The Venice policy",
    body: "It reads your plain-language intent and the untrusted context the agent saw, judges whether they match, and flags injection. Any error or timeout fails closed.",
    src: "/assets/abstract-2.jpg",
  },
  {
    tag: "coordination",
    title: "Agent to agent, still bounded",
    body: "An agent can hand a tighter scope to a sub-agent. The narrowest cap in the chain wins on-chain, every time, no matter what the policy approves.",
    src: "/assets/abstract-3.jpg",
  },
  {
    tag: "safety",
    title: "It fails closed",
    body: "A missing signature, an expired one, a replay, or a Venice outage all resolve to the same outcome. The transaction reverts and no funds move.",
    src: "/assets/abstract-5.jpg",
  },
];

function Card({ i, total, data, progress }: { i: number; total: number; data: Mechanic; progress: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.35, 1]);
  const targetScale = 1 - (total - i) * 0.04;
  const scale = useTransform(progress, [i * 0.2, 1], [1, targetScale]);

  return (
    <div ref={ref} className="sticky top-0 flex h-screen items-center justify-center px-4">
      <motion.div
        style={{ scale, top: `calc(-5vh + ${i * 26}px)` }}
        className="relative flex h-[440px] w-full max-w-5xl origin-top flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_80px_-30px_rgba(79,70,229,0.35)] md:h-[460px] md:flex-row"
      >
        <div className="flex flex-1 flex-col justify-between p-8 md:p-12">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-indigo-500">{data.tag}</p>
            <h3 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              {data.title}
            </h3>
          </div>
          <p className="max-w-md text-muted-foreground">{data.body}</p>
        </div>

        <div className="relative h-44 w-full overflow-hidden md:h-auto md:w-[44%]">
          <motion.div style={{ scale: imageScale }} className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.src} alt="" className="h-full w-full object-cover" />
          </motion.div>
        </div>
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
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-indigo-500">Under the hood</p>
        <h2 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="text-foreground">Four things stand between</span>
          <br />
          <span className="bg-gradient-to-b from-indigo-500 to-indigo-700 bg-clip-text text-transparent">an agent and your funds.</span>
        </h2>
      </div>

      <div ref={container} className="relative">
        {MECHANICS.map((data, i) => (
          <Card key={data.title} i={i} total={MECHANICS.length} data={data} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}
