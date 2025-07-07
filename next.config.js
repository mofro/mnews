/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Enable API routes for webhook
  experimental: {
    appDir: false // Use pages directory for now
  }
}

module.exports = nextConfig