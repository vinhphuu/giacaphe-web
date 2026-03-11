import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/gia-ca-phe-:region/:date",
        destination: "/gia-ca-phe/:region/:date",
      },
    ];
  },
};

export default nextConfig;
