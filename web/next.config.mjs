/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase global body limit for API routes to 1GB for large ZIP imports
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb',
    },
    proxyClientMaxBodySize: '1000mb',
  },
  serverExternalPackages: ['tesseract.js', 'pdf-parse', '@napi-rs/canvas', 'better-sqlite3'],
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': [
      'electron/**/*',
      'dist/**/*',
      'Archive/**/*',
      'uploads/**/*',
      'public/uploads/**/*',
      'scratch/**/*',
      'tests/**/*',
      'scripts/**/*',
      'inventory.db',
      'database.sqlite',
      '*.sqlite',
      '*.sqlite-journal',
      '*.sqlite-wal',
      '*.db',
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
