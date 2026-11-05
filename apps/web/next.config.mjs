/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['gsap'],
  reactStrictMode: false, // Prevents duplicate canvas/WebGL & GSAP remount collisions during HMR
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // 1. Polling file watcher: fixes missed or delayed file updates on Windows & OneDrive
      config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };

      // 2. In-memory cache in development: prevents corrupted disk cache & EPERM file locks on Windows
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
  // Ensure Next.js dev server keeps active pages in memory cleanly
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
