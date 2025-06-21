import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Mejoras de build y dev
  experimental: {
    turbo: false, // Desactiva Turbopack, usa Webpack (más estable en Windows)
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: false, // Desactiva sourcemaps en producción
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
