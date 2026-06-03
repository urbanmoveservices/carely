/** @type {import('next').NextConfig} */
const {
  buildContentSecurityPolicy,
  buildPermissionsPolicy,
} = require("./lib/security-headers.js");

const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  reactStrictMode: true,

  // PDFKit loads Helvetica.afm from disk; must not be bundled into C:\ROOT paths
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/reports/[id]/pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/reports/[id]/doctor-pack/pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/admin/reports/[id]/pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/family-members/[id]/emergency-card/pdf": [
      "./node_modules/pdfkit/js/data/**/*",
    ],
  },

  ...(isDev && {
    allowedDevOrigins: [
      "*.ngrok-free.dev",
      "*.ngrok-free.app",
      "*.ngrok.app",
    ],
  }),

  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: buildPermissionsPolicy(),
          },
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(isDev),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
