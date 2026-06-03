import type { NextConfig } from "next";
import path from "path";

const nextConfig: any = {
  /* config options here */
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        fs: "empty",
        path: "empty",
        crypto: "empty",
      },
    },
  },
};

export default nextConfig;
