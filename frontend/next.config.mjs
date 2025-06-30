import { validateNextConfig } from './next.config.validator.mjs';

import path from 'path';
import { fileURLToPath } from 'url';

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
  webpack: (config, { isServer }) => {
    config.resolve.alias['@'] = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
    return config;
  },
}

export default nextConfig
