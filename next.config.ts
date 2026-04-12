import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.pexels.com https://i.pravatar.cc https://www.facebook.com",
      "media-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.stripe.com https://api.pexels.com https://connect.facebook.net https://www.facebook.com https://facebook.com",
      "frame-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
  env: {
    PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  },
  serverExternalPackages: ["@anthropic-ai/sdk", "stripe", "@supabase/ssr", "@supabase/supabase-js"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
