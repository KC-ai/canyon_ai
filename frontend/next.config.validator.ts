import type { NextConfig } from 'next';

export function validateNextConfig(config: NextConfig): NextConfig {
  // Validate eslint configuration
  if (config.eslint && typeof config.eslint.ignoreDuringBuilds !== 'boolean') {
    throw new Error('eslint.ignoreDuringBuilds must be a boolean');
  }

  // Validate typescript configuration
  if (config.typescript && typeof config.typescript.ignoreBuildErrors !== 'boolean') {
    throw new Error('typescript.ignoreBuildErrors must be a boolean');
  }

  // Validate images configuration
  if (config.images && typeof config.images.unoptimized !== 'boolean') {
    throw new Error('images.unoptimized must be a boolean');
  }

  return config;
} 