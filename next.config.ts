import type { NextConfig } from "next";

/**
 * Static site for GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH is "/<repo-name>" for https://<user>.github.io/<repo-name>/
 * (set automatically by .github/workflows/deploy.yml), or "" for a root site.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
