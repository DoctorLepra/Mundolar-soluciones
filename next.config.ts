import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'bipjineolzejsdtgpygg.supabase.co' },
      { protocol: 'https', hostname: 'pub-8888d3ee5ecf4742ba1dd7036923162b.r2.dev' },
    ],
  },
};

export default nextConfig;
