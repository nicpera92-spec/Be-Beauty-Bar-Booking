/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-ppg", "@prisma/ppg"],
  outputFileTracingIncludes: {
    "/*": [
      "./src/generated/prisma/**/*",
      "./node_modules/@prisma/client/runtime/**/*",
      "./node_modules/@prisma/adapter-ppg/**/*",
      "./node_modules/@prisma/ppg/**/*",
    ],
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
