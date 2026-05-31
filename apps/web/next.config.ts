import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: ['192.168.100.234', '192.168.100.234:3000', 'localhost:3000'],
} as any;

export default nextConfig;
