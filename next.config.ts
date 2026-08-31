import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@glideapps/glide-data-grid',
      'papaparse',
      'date-fns',
      'xlsx',
      'clsx',
      'tailwind-merge',
      'sonner',
    ],
  },
};

export default nextConfig;
