import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Bagholder Simulator is a static Vite build copied into public/trading/game/
  // (source: github.com/dukesky/allpath-trading-game, scripts/sync-to-site.sh).
  async rewrites() {
    return [
      { source: "/trading/game", destination: "/trading/game/index.html" },
      { source: "/trading/game/", destination: "/trading/game/index.html" }
    ];
  }
};

export default nextConfig;
