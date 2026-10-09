import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Static export (`next build` -> ./out).
   * The whole app is client-side (every page/component is a client component
   * that talks to the NestJS API over fetch), so it can be shipped as plain
   * static files. `output: "export"` removes the need for a Node/SSR runtime
   * on the host, and `trailingSlash` makes every route a folder containing an
   * index.html, so deep links such as /dashboard/users resolve without any
   * rewrite rules.
   *
   * NOTE: `cacheComponents` (PPR) and `partialPrefetching` are intentionally
   * NOT enabled: Next.js rejects them in export mode
   * ("Invariant: PPR cannot be enabled in export mode") and this app uses no
   * `use cache` / partial prerendering features.
   */
  output: "export",
  trailingSlash: true,

  // Static export cannot use the built-in Image Optimization server.
  // (No `next/image` usages today, this just keeps the config honest.)
  images: { unoptimized: true },
};

export default nextConfig;
