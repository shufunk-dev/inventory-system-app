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
  allowedDevOrigins: [
    '192.168.1.107',
    '192.168.1.*',
    '192.168.0.*',
    '10.0.0.*',
    'localhost:3000'
  ],
};

export default nextConfig;
