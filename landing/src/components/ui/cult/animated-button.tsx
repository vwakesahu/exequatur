"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

type Variant = "primary" | "accent" | "destructive" | "secondary";
type Size = "sm" | "default" | "lg";

export interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const outer: Record<Variant, string> = {
  primary:
    "w-full border border-black/10 dark:border-black bg-gradient-to-b from-black/70 to-black dark:from-white dark:to-white/80 p-[1px] will-change-transform",
  accent: "w-full border border-indigo-400 p-[1px]",
  destructive:
    "w-full border border-black/10 dark:border-neutral-950 bg-gradient-to-b from-red-300/90 to-red-500 p-[1px] will-change-transform",
  secondary:
    "w-full border border-black/20 bg-white/50 dark:border-neutral-950 dark:bg-neutral-600/50 p-[1px] will-change-transform",
};

const inner: Record<Variant, string> = {
  primary:
    "gap-2 bg-gradient-to-b from-neutral-800 to-black dark:from-neutral-200 dark:to-neutral-50 text-white/90 dark:text-black/80",
  accent: "gap-2 bg-gradient-to-b from-indigo-500 to-indigo-800 text-white/90",
  destructive: "gap-2 bg-gradient-to-b from-red-400/60 to-red-500/60 text-white/90",
  secondary:
    "bg-gradient-to-b from-neutral-100/80 to-neutral-200/50 dark:from-neutral-800 dark:to-neutral-700/50",
};

const sizeOuter: Record<Size, string> = {
  sm: "rounded-[6px]",
  default: "rounded-[12px]",
  lg: "rounded-[12px]",
};

const sizeInner: Record<Size, string> = {
  sm: "text-xs rounded-[4px] px-4 py-1",
  default: "text-sm rounded-[10px] px-4 py-2",
  lg: "text-base rounded-[10px] px-5 py-2.5",
};

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, variant = "primary", size = "default", className, ...props }, ref) => {
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const frame = React.useRef<number | null>(null);
    const target = React.useRef({ x: 0, y: 0 });
    const current = React.useRef({ x: 0, y: 0 });
    const hovered = React.useRef(false);

    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    React.useEffect(() => {
      return () => {
        if (frame.current) cancelAnimationFrame(frame.current);
      };
    }, []);

    const animate = () => {
      current.current.x = lerp(current.current.x, target.current.x, 0.15);
      current.current.y = lerp(current.current.y, target.current.y, 0.15);
      if (buttonRef.current) {
        buttonRef.current.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`;
      }
      if (
        Math.abs(target.current.x - current.current.x) > 0.01 ||
        Math.abs(target.current.y - current.current.y) > 0.01
      ) {
        frame.current = requestAnimationFrame(animate);
      } else {
        frame.current = null;
      }
    };

    const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current || !hovered.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      target.current.x = (e.clientX - (rect.left + rect.width / 2)) * 0.2;
      target.current.y = (e.clientY - (rect.top + rect.height / 2)) * 0.2;
      if (!frame.current) frame.current = requestAnimationFrame(animate);
    };

    const onEnter = () => {
      hovered.current = true;
    };
    const onLeave = () => {
      hovered.current = false;
      target.current = { x: 0, y: 0 };
      if (!frame.current) frame.current = requestAnimationFrame(animate);
    };

    return (
      <button
        ref={buttonRef}
        className={cn(outer[variant], sizeOuter[size], className)}
        onMouseMove={onMove}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        {...props}
      >
        <span className={cn("flex h-full w-full items-center justify-center", inner[variant], sizeInner[size])}>
          {children}
        </span>
      </button>
    );
  },
);
AnimatedButton.displayName = "AnimatedButton";

export default AnimatedButton;
