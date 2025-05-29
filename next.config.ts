// next.config.js
module.exports = {
  webpack: (config: { resolve: { fallback: any; }; externals: { 'zlib-sync': string; bufferutil: string; 'utf-8-validate': string; }[]; }, { isServer }: any) => {
    if (!isServer) {
      // Don't include binary files in client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'zlib-sync': false,
        'bufferutil': false,
        'utf-8-validate': false
      };
    }
    
    // Exclude node files from bundling
    config.externals.push({
      'zlib-sync': 'commonjs zlib-sync',
      'bufferutil': 'commonjs bufferutil',
      'utf-8-validate': 'commonjs utf-8-validate'
    });

    return config;
  },
  
  eslint: {
    ignoreDuringBuilds: true, // Recommended for production builds
  },
};