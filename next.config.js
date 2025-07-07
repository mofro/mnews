/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' to enable API routes on Vercel
  images: {
    unoptimized: true
  },
  // Clean config - no deprecated experimental options needed
}

module.exports = nextConfig