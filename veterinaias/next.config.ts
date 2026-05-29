import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['react-big-calendar'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
