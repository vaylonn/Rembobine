import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TMDB sert déjà des affiches redimensionnées : pas besoin de consommer
    // le quota d'optimisation d'images de Vercel.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
