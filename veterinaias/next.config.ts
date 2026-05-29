import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['react-big-calendar'],
  // Turbopack is currently the default in some environments, 
  // but if it's causing issues, we can try to ensure standard webpack build if needed.
  // However, Next.js 15+ uses Turbopack by default for dev, but for build it's still being rolled out.
  async redirects() {
    return [
      { source: '/dashboard/settings', destination: '/dashboard/settings/clinica', permanent: false },
    ]
  },
};

export default nextConfig;
