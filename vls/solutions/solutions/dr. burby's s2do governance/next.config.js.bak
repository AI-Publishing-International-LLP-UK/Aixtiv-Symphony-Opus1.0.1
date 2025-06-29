/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },
  transpilePackages: [
    '@mui/material',
    '@mui/system',
    '@mui/icons-material',
    '@mui/lab',
    '@emotion/react',
    '@emotion/styled',
  ],
  // Uncomment to configure image domains if needed
  // images: {
  //   domains: ['example.com'],
  // },
  // Uncomment if you need to configure rewrites or redirects
  // async rewrites() {
  //   return [];
  // },
};

module.exports = nextConfig;

