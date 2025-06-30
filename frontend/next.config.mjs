import { validateNextConfig } from './next.config.validator.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add webpack configuration to check options
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Log configuration for validation
    if (dev) {
      console.log('Next.js Config Validation:');
      console.log('- ESLint:', nextConfig.eslint);
      console.log('- TypeScript:', nextConfig.typescript);
      console.log('- Images:', nextConfig.images);
    }
    return config;
  },
}

export default nextConfig
