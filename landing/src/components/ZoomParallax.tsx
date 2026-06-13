"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

// Surrounding tiles fly outward; the center tile settles at ~85% of the viewport (centered, not
// full-bleed). Then it holds while a dark panel + headline reveal over it, then the section releases.
const TILES = [
  { src: "abstract-6", box: "left-[5vw] top-[-30vh] h-[30vh] w-[35vw]", to: 5 },
  { src: "abstract-2", box: "left-[-25vw] top-[-10vh] h-[45vh] w-[20vw]", to: 6 },
  { src: "abstract-5", box: "left-[27.5vw] h-[25vh] w-[25vw]", to: 5 },
  { src: "abstract-3", box: "left-[5vw] top-[27.5vh] h-[25vh] w-[20vw]", to: 6 },
  { src: "abstract-6", box: "left-[-22.5vw] top-[27.5vh] h-[25vh] w-[30vw]", to: 8 },
  { src: "abstract-2", box: "left-[25vw] top-[22.5vh] h-[15vh] w-[15vw]", to: 9 },
];

const ZOOM_END = 0.55;

export default function ZoomParallax() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start start", "end end"] });

  const center = useTransform(scrollYProgress, [0, ZOOM_END], [1, 3.4]); // settles at ~85%
  const s5 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 5]);
  const s6 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 6]);
  const s8 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 8]);
  const s9 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 9]);
  const scaleFor: Record<number, typeof s5> = { 5: s5, 6: s6, 8: s8, 9: s9 };

  const overlay = useTransform(scrollYProgress, [0.5, 0.68], [0, 0.7]);
  const textOpacity = useTransform(scrollYProgress, [0.62, 0.82], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.62, 0.82], [44, 0]);

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

        {/* pinned dark panel + headline, sized to the settled center image */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            style={{ opacity: overlay }}
            className="relative flex h-[85vh] w-[85vw] max-w-[1500px] items-center justify-center overflow-hidden rounded-[40px] bg-[#0b0820]"
          >
            <motion.div style={{ opacity: textOpacity, y: textY }} className="px-6 text-center">
              <h2 className="mx-auto max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">
                An agent you can hand a budget.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
                Scoped by you, checked by Venice, enforced on-chain. Nothing moves without all three.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
