/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // MarketTime product images
        protocol: 'https',
        hostname: '**.markettime.com',
      },
      {
        protocol: 'http',
        hostname: '**.markettime.com',
      },
      {
        protocol: 'https',
        hostname: 'reptime-prod-item-images.s3.us-east-2.amazonaws.com',
      },
      {
        // MarketTime manufacturer logos (path-style S3 URL)
        protocol: 'https',
        hostname: 's3.us-east-2.amazonaws.com',
        pathname: '/reptime-prod-logos/**',
      },
      {
        protocol: 'https',
        hostname: 'reptime-prod-logos.s3.us-east-2.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
