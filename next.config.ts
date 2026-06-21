import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: read-only, prebuilt data → free static hosting.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Hide the dev-only on-screen route indicator (the "N" in the bottom-left).
  devIndicators: false,
};

export default nextConfig;
