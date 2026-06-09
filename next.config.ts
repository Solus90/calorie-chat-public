import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't pick up a parent-directory lockfile.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
