"use client";

import { useRef, useState, type ReactElement } from "react";
import { motion } from "motion/react";

// Cursor-follow magnetic wrapper (after Olivier Larose). Wrap a single interactive child.
export default function Magnetic({ children }: { children: ReactElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    setPos({ x: clientX - (left + width / 2), y: clientY - (top + height / 2) });
  };
  const reset = () => setPos({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      className="relative inline-block"
      onMouseMove={onMove}
      onMouseLeave={reset}
      animate={{ x: pos.x * 0.35, y: pos.y * 0.35 }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  );
}
