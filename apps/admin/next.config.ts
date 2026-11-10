import type { NextConfig } from "next";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (process.env.NODE_ENV === "production" && (!url || !anon)) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const nextConfig: NextConfig = {
  transpilePackages: ["@scoot/design-system"],
};

export default nextConfig;
