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
  async redirects() {
    return [
      {
        source: '/estimate/demo-fence-inc/:path*',
        destination: '/estimate/gordon-landscaping/:path*',
        permanent: true,
      },
      {
        source: '/estimate/demo-fence/:path*',
        destination: '/estimate/gordon-landscaping/:path*',
        permanent: true,
      },
    ];
  },
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
