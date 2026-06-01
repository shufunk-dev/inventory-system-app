/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase global body limit for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    proxyClientMaxBodySize: '50mb',
  },
  output: 'standalone',
};

export default nextConfig;
