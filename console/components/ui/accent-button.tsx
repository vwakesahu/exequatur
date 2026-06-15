"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "default" | "lg";

const outerSize: Record<Size, string> = {
  sm: "rounded-[8px]",
  default: "rounded-[11px]",
  lg: "rounded-[12px]",
};
const innerSize: Record<Size, string> = {
  sm: "rounded-[6px] px-3 py-1.5 text-xs",
  default: "rounded-[9px] px-4 py-2 text-sm",
  lg: "rounded-[10px] px-5 py-2.5 text-base",
};

/**
 * The brand CTA button, matching the landing page "Launch app" button (indigo gradient inside a thin
 * indigo ring). No magnetic cursor animation - just a hover lift.
 */
export const AccentButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }
>(function AccentButton({ children, size = "default", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "group inline-flex border border-indigo-400/70 p-px transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        outerSize[size],
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex h-full w-full items-center justify-center gap-2 bg-linear-to-b from-indigo-500 to-indigo-800 font-medium text-white/95 transition group-hover:from-indigo-400 group-hover:to-indigo-700",
          innerSize[size],
        )}
      >
        {children}
      </span>
    </button>
  );
});
