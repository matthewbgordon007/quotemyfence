const withSerwist = require("@serwist/next").default({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

let supabaseImageHost = "";
try {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (u) supabaseImageHost = new URL(u).hostname;
} catch {
  /* ignore */
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Exact project host — wildcards like *.supabase.co are not reliable for next/image in all versions.
      ...(supabaseImageHost
        ? [{ protocol: "https", hostname: supabaseImageHost, pathname: "/storage/**" }]
        : []),
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

module.exports = withSerwist(nextConfig);
