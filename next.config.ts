import type { NextConfig } from 'next'
import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

const config: NextConfig = {
  // Optimize chunk loading
  webpack: (config, { isServer }) => {
    // Optimize client-side chunk loading
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minSize: 0,
              minChunks: 2,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
            },
          },
        },
      }
    }

    return config
  },
  // Increase chunk load timeout
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 30 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  // Add performance optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@/components/ui'],
  },
  // Increase timeout for static generation
  staticPageGenerationTimeout: 120,
}

export default withPWA(config)