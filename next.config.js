/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14.2 only honours these under `experimental`. Top-level names are Next 15+.
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "@prisma/adapter-ppg",
      "@prisma/ppg",
    ],
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/.prisma/client/**/*",
        "./node_modules/@prisma/client/**/*",
        "./node_modules/@prisma/adapter-ppg/**/*",
        "./node_modules/@prisma/ppg/**/*",
      ],
      "/admin/**/*": [
        "./node_modules/.prisma/client/**/*",
        "./node_modules/@prisma/client/**/*",
        "./node_modules/@prisma/adapter-ppg/**/*",
        "./node_modules/@prisma/ppg/**/*",
      ],
      "/book/**/*": [
        "./node_modules/.prisma/client/**/*",
        "./node_modules/@prisma/client/**/*",
        "./node_modules/@prisma/adapter-ppg/**/*",
        "./node_modules/@prisma/ppg/**/*",
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(({ request }, callback) => {
        if (
          request &&
          (request === "@prisma/client" ||
            request.startsWith("@prisma/client/") ||
            request.startsWith("@prisma/adapter-ppg") ||
            request.startsWith("@prisma/ppg"))
        ) {
          return callback(null, "commonjs " + request);
        }
        callback();
      });
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
