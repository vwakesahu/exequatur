import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  // The pnpm workspace root (one dir up). Pinned because a stray ~/pnpm-lock.yaml otherwise confuses
  // Next's root inference; the workspace hoists `next` and the SDK here.
  turbopack: { root: resolve(import.meta.dirname, "..") },
  // Keep the firewall SDK a real (server-only) Node package, not bundled, so its dotenv + node APIs
  // run as a normal module. As a workspace package it symlinks to the real sdk/, so paths resolve.
  serverExternalPackages: ["delegation-firewall-sdk"],
};

export default nextConfig;
