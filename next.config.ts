import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Bagholder Simulator is a static Vite build copied into public/trading/game/
  // (source: github.com/dukesky/allpath-trading-game, scripts/sync-to-site.sh).
  // Game code is content-hashed (safe to cache forever); art changes rarely.
  async headers() {
    return [
      {
        source: "/trading/game/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/trading/game/art/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }]
      }
    ];
  },
  async rewrites() {
    return [
      { source: "/trading/game", destination: "/trading/game/index.html" },
      { source: "/trading/game/", destination: "/trading/game/index.html" }
    ];
  }
};

export default nextConfig;
