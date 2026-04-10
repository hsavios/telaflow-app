import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@telaflow/shared-contracts"],
};

export default nextConfig;
