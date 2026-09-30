/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5001',
  },
  // Pin the workspace root to this app so the dev server watches the right
  // files (a stray lockfile in the home folder otherwise widens the root).
  turbopack: { root: __dirname },
};

module.exports = nextConfig;

