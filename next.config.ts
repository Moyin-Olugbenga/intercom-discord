import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
module.exports = {
  webpack: (config: { externals: string[]; }) => {
    config.externals.push('bufferutil', 'utf-8-validate');
    return config;
  }
};