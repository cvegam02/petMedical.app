import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['react-big-calendar'],
  async redirects() {
    return [
      { source: '/dashboard/settings', destination: '/dashboard/settings/clinica', permanent: false },
    ]
  },
};

export default nextConfig;
