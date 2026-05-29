import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['react-big-calendar'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      { source: '/dashboard/settings', destination: '/dashboard/settings/clinica', permanent: false },
    ]
  },
};

export default nextConfig;
