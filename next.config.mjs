/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  rewrites: async () => {
    return [
      {
        source: '/api/py/:path*',
        destination: 'http://127.0.0.1:5328/api/py/:path*',
      },
    ];
  },
};

export default nextConfig;
