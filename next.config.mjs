import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Configure TypeScript
  typescript: {
    // Enable TypeScript type checking during build
    ignoreBuildErrors: false,
  },
  
  // Configure webpack
  webpack: (config, { isServer }) => {
    // Add .ts and .tsx to the list of extensions to resolve
    config.resolve.extensions = ['.tsx', '.ts', '.js', '.jsx', '.mjs', '.cjs'];
    
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
    };
    
    // Handle ESM packages
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    // Handle .js extensions in imports for ES modules
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });
    
    // For development, enable source maps
    if (!isServer) {
      config.devtool = 'source-map';
    }
    
    return config;
  },
  
  // Enable SWC minification
  swcMinify: true,
  
  // Configure images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enable React strict mode
  reactStrictMode: true,
  
  // Enable ESM support
  experimental: {
    esmExternals: true,
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
    externalDir: true,
    // Enable modularizeImports for better tree-shaking
    modularizeImports: {
      'lucide-react': {
        transform: 'lucide-react/dist/esm/icons/{{member}}',
      },
    },
    // Enable experimental features for better TypeScript support
    externalDir: true,
    // Enable SWC minification
    swcMinify: true,
  },
  
  // Configure webpack to handle TypeScript files with .js extensions
  webpack: (config, { isServer }) => {
    // Add .ts and .tsx to the list of extensions to resolve
    config.resolve.extensions.push('.ts', '.tsx');
    
    // Configure module resolution to match tsconfig paths
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
    };
    
    // For development, enable source maps
    if (!isServer) {
      config.devtool = 'source-map';
    }
    
    return config;
  },
  
  // Enable TypeScript type checking
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  
  // Configure webpack
  webpack: (config, { isServer }) => {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/components": path.resolve(__dirname, "./components"),
      "@/utils": path.resolve(__dirname, "./utils"),
      "@/types": path.resolve(__dirname, "./types"),
    };

    // Configure extensions and module resolution
    config.resolve.extensions = [
      '.mjs',
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.json',
      '.wasm'
    ];

    // Configure extension aliases for module resolution
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
      '.mjs': ['.mjs', '.js', '.ts'],
      '.cjs': ['.cjs', '.js']
    };
    
    // Add support for .mjs files
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    // Ignore scripts directory
    config.module.rules.push({
      test: /\/scripts\//,
      use: 'null-loader'
    });
    
    // Fixes npm packages that depend on `node:` protocol (not available in webpack 4)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      worker_threads: false,
    };
    
    // Handle ESM packages
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };
    
    // Fix for node modules that don't support ESM
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });
    
    return config;
  },
  // Configure image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 1 week
    formats: ["image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Clean config - no deprecated experimental options needed

  // ADD SECURITY HEADERS
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: http:",
              "connect-src 'self'",
              "frame-src 'none'",
              "object-src 'none'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
