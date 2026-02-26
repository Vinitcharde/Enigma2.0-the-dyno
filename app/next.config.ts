import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '.',
  },
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
