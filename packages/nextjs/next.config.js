// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ipfs-utils"],
  },
  reactStrictMode: true,
  // Ignoring TypeScript/ESLint errors during build (deploy won't fail even if there are errors)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: config => {
    config.module.rules.push({
      test: /\.d\.ts(\.map)?$/, 
      use: "null-loader", 
    });

    config.externals.push("pino-pretty", "lokijs", "encoding");

    config.resolve.fallback = { fs: false, net: false, tls: false };

    config.optimization = {
      ...config.optimization,
      minimize: true, 
    };

    return config;
  },
};

module.exports = nextConfig;