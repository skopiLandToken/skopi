import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/affiliate",
        destination: "/marketing-partners",
        permanent: true,
      },
      {
        source: "/affiliate/:path*",
        destination: "/marketing-partners/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
