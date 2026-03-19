import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['tailwind-to-inline'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
