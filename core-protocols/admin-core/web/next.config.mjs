/** @type {import('next').NextConfig} */
const nextConfig = {
output: 'standalone',
basePath: process.env.BASEPATH,
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/users',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
