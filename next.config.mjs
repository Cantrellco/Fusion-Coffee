// Optional subpath for project-style hosting (e.g. GitHub Pages at
// /<repo>/). Only takes effect when GH_PAGES_BASE is set at build time,
// so the default (root-domain) build is completely unaffected.
const basePath = process.env.GH_PAGES_BASE || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static output so the site deploys anywhere and can be wrapped
  // into a native iOS/Android app later (e.g. via Capacitor) with no rewrite.
  output: 'export',
  reactStrictMode: true,
  images: {
    // Required for `output: 'export'` — we ship the source images directly.
    unoptimized: true,
  },
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
