/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase global body limit for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    proxyClientMaxBodySize: '50mb',
  },
  serverExternalPackages: ['tesseract.js', 'pdf-parse', '@napi-rs/canvas', 'better-sqlite3'],
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': [
      'electron/**/*',
      'dist/**/*',
      'Archive/**/*',
    ],
  },
};

export default nextConfig;
