import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['react-big-calendar'],
  // @react-pdf/renderer debe quedar fuera del bundling del servidor (fontkit y
  // módulos internos), de lo contrario renderToBuffer falla en runtime.
  serverExternalPackages: ['@react-pdf/renderer'],
  // Turbopack is currently the default in some environments, 
  // but if it's causing issues, we can try to ensure standard webpack build if needed.
  // However, Next.js 15+ uses Turbopack by default for dev, but for build it's still being rolled out.
  async redirects() {
    return [
      { source: '/dashboard/settings', destination: '/dashboard/settings/team', permanent: false },
    ]
  },
};

export default nextConfig;
