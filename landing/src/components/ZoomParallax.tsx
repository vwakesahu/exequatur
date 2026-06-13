"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

// Surrounding tiles fly outward; the center tile settles at ~85% of the viewport (centered, not
// full-bleed). The image stays the hero; only a soft bottom scrim fades in and the headline rises
// line by line from behind a mask as you scroll.
const TILES = [
  { src: "abstract-6", box: "left-[5vw] top-[-30vh] h-[30vh] w-[35vw]", to: 5 },
  { src: "abstract-2", box: "left-[-25vw] top-[-10vh] h-[45vh] w-[20vw]", to: 6 },
  { src: "abstract-5", box: "left-[27.5vw] h-[25vh] w-[25vw]", to: 5 },
  { src: "abstract-3", box: "left-[5vw] top-[27.5vh] h-[25vh] w-[20vw]", to: 6 },
  { src: "abstract-6", box: "left-[-22.5vw] top-[27.5vh] h-[25vh] w-[30vw]", to: 8 },
  { src: "abstract-2", box: "left-[25vw] top-[22.5vh] h-[15vh] w-[15vw]", to: 9 },
];

const ZOOM_END = 0.55;

// One masked line that slides up into view across a scroll range.
function Line({ progress, range, className, children }: { progress: MotionValue<number>; range: [number, number]; className?: string; children: ReactNode }) {
  const y = useTransform(progress, range, ["115%", "0%"]);
  return (
    <span className="block overflow-hidden pb-[0.12em]">
      <motion.span style={{ y }} className={`block ${className ?? ""}`}>
        {children}
      </motion.span>
    </span>
  );
}

export default function ZoomParallax() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start start", "end end"] });

  const center = useTransform(scrollYProgress, [0, ZOOM_END], [1, 3.4]); // settles at ~85%
  const s5 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 5]);
  const s6 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 6]);
  const s8 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 8]);
  const s9 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 9]);
  const scaleFor: Record<number, typeof s5> = { 5: s5, 6: s6, 8: s8, 9: s9 };

  const scrim = useTransform(scrollYProgress, [0.5, 0.68], [0, 1]);

  return (
    <section ref={container} className="relative h-[340vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* surrounding tiles */}
        {TILES.map((tile, i) => (
          <motion.div key={i} style={{ scale: scaleFor[tile.to] }} className="absolute inset-0 flex items-center justify-center">
            <div className={`relative overflow-hidden rounded-xl ${tile.box}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/${tile.src}.jpg`} alt="" className="h-full w-full object-cover" />
            </div>
          </motion.div>
        ))}

        {/* center tile, settles at ~85% */}
        <motion.div style={{ scale: center }} className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[42vh] w-[60vw] overflow-hidden rounded-xl md:h-[25vh] md:w-[25vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/abstract-1.jpg" alt="" className="h-full w-full object-cover" />
          </div>
        </motion.div>

        {/* scrim + masked headline, sized to the settled image */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[85vh] w-[88vw] max-w-[1500px] overflow-hidden rounded-[40px]">
            <motion.div style={{ opacity: scrim }} className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-16">
              <h2 className="font-display text-3xl font-semibold leading-[1.04] tracking-tight text-white md:text-7xl">
                <Line progress={scrollYProgress} range={[0.6, 0.72]}>An agent you can</Line>
                <Line progress={scrollYProgress} range={[0.65, 0.78]}>hand a budget.</Line>
              </h2>
              <Line progress={scrollYProgress} range={[0.75, 0.88]} className="mt-5 max-w-md text-base text-white/70 md:text-xl">
                Scoped by you, checked by Venice, enforced on-chain.
              </Line>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
