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
};

export default nextConfig;
