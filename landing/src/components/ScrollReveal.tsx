"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

// Word-by-word opacity reveal on scroll (after Olivier Larose, "text-opacity-scroll").
const TEXT = "An agent can move your money. exequatur decides whether it should, before it ever can.";

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.1, 1]);
  return (
    <span className="mr-[0.25em] inline-block">
      <motion.span style={{ opacity }} className="text-foreground">
        {children}
      </motion.span>
    </span>
  );
}

export default function ScrollReveal() {
  const container = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.85", "start 0.3"] });
  const words = TEXT.split(" ");

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-6 py-24 md:py-36">
      <p
        ref={container}
        className="flex max-w-4xl flex-wrap justify-center text-center font-display text-3xl font-medium leading-snug tracking-tight md:text-[3.25rem] md:leading-[1.18]"
      >
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return (
            <Word key={i} progress={scrollYProgress} range={[start, end]}>
              {word}
            </Word>
          );
        })}
      </p>
    </section>
  );
}
