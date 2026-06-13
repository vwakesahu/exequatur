"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

const PHRASES = ["scoped delegation", "venice policy check", "on-chain enforcer", "agent to agent"];

function Row({ x, outlined }: { x: MotionValue<string>; outlined?: boolean }) {
  return (
    <motion.div style={{ x }} className="flex w-max flex-nowrap whitespace-nowrap">
      {Array.from({ length: 3 }).map((_, group) => (
        <div key={group} className="flex items-center">
          {PHRASES.map((phrase) => (
            <span key={phrase} className="flex items-center">
              <span
                className="px-6 font-display text-[8vw] font-semibold leading-none md:text-[6vw]"
                style={
                  outlined
                    ? { color: "transparent", WebkitTextStroke: "1px rgba(129,140,248,0.45)" }
                    : { color: "white" }
                }
              >
                {phrase}
              </span>
              <span className="h-3 w-3 shrink-0 rounded-full bg-indigo-500 md:h-4 md:w-4" />
            </span>
          ))}
        </div>
      ))}
    </motion.div>
  );
}

export default function StatementMarquee() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start end", "end start"] });
  const x1 = useTransform(scrollYProgress, [0, 1], ["2%", "-22%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-20%", "4%"]);

  return (
    <section ref={container} className="flex flex-col gap-4 overflow-hidden border-y border-border/60 py-20 md:py-28">
      <Row x={x1} />
      <Row x={x2} outlined />
    </section>
  );
}
