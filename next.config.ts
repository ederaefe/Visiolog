import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@glideapps/glide-data-grid',
      'papaparse',
      'date-fns',
      'xlsx',
      'clsx',
      'tailwind-merge',
    ],
  },
};

export default nextConfig;
