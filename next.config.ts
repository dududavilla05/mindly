import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "stripe", "@supabase/ssr", "@supabase/supabase-js"],
};

export default nextConfig;
