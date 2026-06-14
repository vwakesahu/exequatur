import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app's own dir is the workspace root (several lockfiles exist higher up).
  turbopack: { root: import.meta.dirname },
  // Keep the firewall SDK a real Node package at runtime (not bundled) so its dotenv loading and
  // `import.meta.url`-relative Foundry artifact reads resolve against the real sdk/dist path.
  serverExternalPackages: ["delegation-firewall-sdk"],
};

export default nextConfig;
