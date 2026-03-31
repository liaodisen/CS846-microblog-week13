/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  compression: true,
  poweredByHeader: false,
  swcMinify: true,
};

module.exports = nextConfig;
