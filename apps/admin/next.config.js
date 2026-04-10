/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: false,
  },
  transpilePackages: ["@feconecta/admin"],
};

module.exports = nextConfig;
