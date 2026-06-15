/**
 * Local mirror of the agent lifecycle states the Agents UI visualizers animate to. Originally these
 * came from `@livekit/components-react` (a voice session). We have no voice/room, so we define the
 * union here and drive it from our text agent's state (see lib mapping in the console).
 */
export type AgentState =
  | "idle"
  | "connecting"
  | "initializing"
  | "listening"
  | "pre-connect-buffering"
  | "thinking"
  | "speaking"
  | "failed"
  | "disconnected";
