/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Prevent webpack from bundling ws — it has a native C++ addon that breaks when bundled
    config.externals = [...(config.externals ?? []), { ws: "commonjs ws" }];

    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "7777",
      },
    ],
  },
};

export default nextConfig;