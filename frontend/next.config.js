/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Static export for Hostinger
  // No basePath - serve from root
  // Files deployed to public_html/ directly
  images: {
    unoptimized: true, // Required for static export
    domains: ['localhost', 'secrets.gatvia.com', 'www.secrets.gatvia.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    NEXT_PUBLIC_TABBY_PUBLIC_KEY: process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || '',
  },
  trailingSlash: true, // For better compatibility with static hosting
  // Disable static optimization for dynamic routes
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Disable edge runtime to avoid WebAssembly memory issues on server builds
  // This is only needed for static export, so it's safe to disable
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Disable edge runtime features that use WebAssembly
      config.resolve.alias = {
        ...config.resolve.alias,
        '@edge-runtime/primitives': false,
        '@edge-runtime/primitives/streams': false,
        '@edge-runtime/primitives/crypto': false,
      };
      
      // Reduce memory usage during build
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
      };
      
      // Exclude edge runtime from compilation entirely
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('@edge-runtime/primitives');
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = (context, request, callback) => {
          if (request && request.includes('@edge-runtime')) {
            return callback(null, 'commonjs ' + request);
          }
          return originalExternals(context, request, callback);
        };
      }
    }
    return config;
  },
}

module.exports = nextConfig
