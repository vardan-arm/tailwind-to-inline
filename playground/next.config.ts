import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // The playground uses the package's source from the repository root, so it always runs the latest code
    externalDir: true,
  },
};

export default nextConfig;
