"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

// 7 zooming tiles (after Olivier Larose). Position + scale taken from the original recipe,
// rebuilt in Tailwind with the violet asset set.
const TILES = [
  { src: "abstract-1", box: "h-[42vh] w-[60vw] md:h-[25vh] md:w-[25vw]", to: 4 },
  { src: "abstract-6", box: "left-[5vw] top-[-30vh] h-[30vh] w-[35vw]", to: 5 },
  { src: "abstract-2", box: "left-[-25vw] top-[-10vh] h-[45vh] w-[20vw]", to: 6 },
  { src: "abstract-5", box: "left-[27.5vw] h-[25vh] w-[25vw]", to: 5 },
  { src: "abstract-3", box: "left-[5vw] top-[27.5vh] h-[25vh] w-[20vw]", to: 6 },
  { src: "abstract-6", box: "left-[-22.5vw] top-[27.5vh] h-[25vh] w-[30vw]", to: 8 },
  { src: "abstract-2", box: "left-[25vw] top-[22.5vh] h-[15vh] w-[15vw]", to: 9 },
];

export default function ZoomParallax() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start start", "end end"] });

  // One transform per distinct end-scale, reused across tiles (hooks stay top-level + stable).
  const s4 = useTransform(scrollYProgress, [0, 1], [1, 4]);
  const s5 = useTransform(scrollYProgress, [0, 1], [1, 5]);
  const s6 = useTransform(scrollYProgress, [0, 1], [1, 6]);
  const s8 = useTransform(scrollYProgress, [0, 1], [1, 8]);
  const s9 = useTransform(scrollYProgress, [0, 1], [1, 9]);
  const scaleFor: Record<number, typeof s4> = { 4: s4, 5: s5, 6: s6, 8: s8, 9: s9 };

  return (
    <section ref={container} className="relative h-[280vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {TILES.map((tile, i) => (
          <motion.div key={i} style={{ scale: scaleFor[tile.to] }} className="absolute inset-0 flex items-center justify-center">
            <div className={`relative overflow-hidden rounded-xl ${tile.box}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/${tile.src}.jpg`} alt="" className="h-full w-full object-cover" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
