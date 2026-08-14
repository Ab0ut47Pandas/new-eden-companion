import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["node:sqlite"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.evetech.net" },
    ],
  },
};

export default nextConfig;
