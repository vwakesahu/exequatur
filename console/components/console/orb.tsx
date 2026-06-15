"use client";

import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import type { AgentState } from "@/components/agents-ui/agent-state";

/**
 * The brand agent orb (WebGL). Doubles as the universal loading indicator - instead of "loading…"
 * text anywhere, render this in its `thinking` state. Keep instances few (each is a WebGL context).
 */
export function Orb({
  size = "icon",
  state = "speaking",
  className,
}: {
  size?: "icon" | "sm" | "md" | "lg" | "xl";
  state?: AgentState;
  className?: string;
}) {
  return (
    <AgentAudioVisualizerAura state={state} color="#8b5cf6" colorShift={0.12} themeMode="dark" size={size} className={className} />
  );
}
