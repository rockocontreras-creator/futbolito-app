import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Fotos de perfil: el navegador las achica a ~512 px WebP antes de subir, pero dejamos margen.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  partialPrefetching: true,
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
