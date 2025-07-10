/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' to enable API routes on Vercel
  images: {
    unoptimized: true
  },
  // Clean config - no deprecated experimental options needed
  
  // ADD SECURITY HEADERS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: http:",
              "connect-src 'self'",
              "frame-src 'none'",
              "object-src 'none'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options', 
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig