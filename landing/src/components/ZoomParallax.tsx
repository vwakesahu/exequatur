"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

// 7 zooming tiles (after Olivier Larose). The zoom completes in the first ~55% of the section, then
// the center image stays pinned while a headline reveals over it, then the section releases.
const TILES = [
  { src: "abstract-1", box: "h-[42vh] w-[60vw] md:h-[25vh] md:w-[25vw]", to: 4 },
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

  // Zoom resolves over [0, ZOOM_END], then holds (useTransform clamps to the output range).
  const s4 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 4]);
  const s5 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 5]);
  const s6 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 6]);
  const s8 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 8]);
  const s9 = useTransform(scrollYProgress, [0, ZOOM_END], [1, 9]);
  const scaleFor: Record<number, typeof s4> = { 4: s4, 5: s5, 6: s6, 8: s8, 9: s9 };

  // Pinned reveal phase.
  const overlay = useTransform(scrollYProgress, [ZOOM_END - 0.05, 0.68], [0, 0.66]);
  const textOpacity = useTransform(scrollYProgress, [0.62, 0.8], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.62, 0.8], [48, 0]);
  const eyebrowOpacity = useTransform(scrollYProgress, [0.58, 0.7], [0, 1]);

  return (
    <section ref={container} className="relative h-[340vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {TILES.map((tile, i) => (
          <motion.div key={i} style={{ scale: scaleFor[tile.to] }} className="absolute inset-0 flex items-center justify-center">
            <div className={`relative overflow-hidden rounded-xl ${tile.box}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/${tile.src}.jpg`} alt="" className="h-full w-full object-cover" />
            </div>
          </motion.div>
        ))}

        {/* Darkening layer so the headline reads on the image */}
        <motion.div style={{ opacity: overlay }} className="absolute inset-0 bg-[#0b0820]" />

        {/* Pinned headline reveal */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <motion.p style={{ opacity: eyebrowOpacity }} className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-indigo-300">
            One guarantee
          </motion.p>
          <motion.h2
            style={{ opacity: textOpacity, y: textY }}
            className="max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl"
          >
            An agent you can hand a budget.
          </motion.h2>
          <motion.p style={{ opacity: textOpacity, y: textY }} className="mt-6 max-w-xl text-lg text-white/75">
            Scoped by you, checked by Venice, enforced on-chain. Nothing moves without all three.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
