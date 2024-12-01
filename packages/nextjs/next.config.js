// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ipfs-utils"],
  },
  reactStrictMode: true,
  // 忽略 TypeScript 和 ESLint 错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: config => {
    // 忽略 .d.ts 和 .d.ts.map 文件
    config.module.rules.push({
      test: /\.d\.ts(\.map)?$/,
      use: "null-loader",
    });

    // 忽略所有 .d.ts 文件
    config.module.rules.push({
      test: /\.d\.ts$/,
      use: "null-loader",
    });

    // 外部依赖
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // 添加 fallback
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};

module.exports = nextConfig;