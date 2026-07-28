import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) dynamically resolves its own worker module at
  // runtime — bundling it breaks that lookup ("Setting up fake worker
  // failed: Cannot find module '.../pdf.worker.mjs'"). Keep it external so
  // Node's own module resolution handles it instead of Turbopack's bundler.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
