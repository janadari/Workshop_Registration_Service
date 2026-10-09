import type { NextConfig } from "next";

/*
 * Netlify guard: `NEXT_PUBLIC_API_URL` is inlined into the JS bundle at build
 * time (see frontend/src/lib/api.ts, which falls back to http://localhost:3001
 * when the variable is absent). A Netlify build that runs without it therefore
 * ships a site that can only reach a backend running on the visitor's own
 * machine - which is exactly how a deploy ends up "working" on the developer's
 * laptop and nowhere else.
 *
 * Netlify sets NETLIFY=true in its build environment, so on Netlify we refuse to
 * build with a missing/localhost value and print the value we did use. Local
 * `npm run build` (which reads frontend/.env.local) is unaffected.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const onNetlify = Boolean(process.env.NETLIFY);

if (onNetlify && (!apiUrl || /localhost|127\.0\.0\.1/.test(apiUrl))) {
  /*
   * Names only, never values: if the variable *is* configured but under a
   * slightly different key (NEXT_PUBLIC_API_URI, NEXT_PUBLIC_APP_URL, ...),
   * having the candidates in the log makes the typo obvious instead of
   * sending you back to the dashboard to compare strings by eye.
   */
  const candidates = Object.keys(process.env)
    .filter((key) => /NEXT_PUBLIC|API|BACKEND|RENDER/i.test(key))
    .sort();

  throw new Error(
    [
      "",
      "================================================================",
      " Netlify build stopped: NEXT_PUBLIC_API_URL is not usable",
      ` Current value: ${apiUrl ? `"${apiUrl}"` : "(not set at all)"}`,
      "",
      " Fix it once, here:",
      "   Netlify -> Project configuration -> Environment variables",
      "   -> Add a variable -> NEXT_PUBLIC_API_URL",
      "      = https://<your-render-service>.onrender.com",
      "   Scopes: tick 'Builds' (a static export needs it at build time).",
      "   Deploy contexts: 'All deploy contexts' (or at least Production -",
      "   a value scoped to Deploy previews/Branch deploys is NOT used here).",
      " Then: Deploys -> Trigger deploy -> Clear cache and deploy site.",
      "",
      " Env var NAMES visible to this build that look related (values are",
      " never printed) - if your variable shows up here under a different",
      " spelling, rename it; if this list is empty, it never reached the",
      " build (wrong project, missing 'Builds' scope, or a sensitive",
      " variable stripped by the site's sensitive variable policy):",
      candidates.length
        ? candidates.slice(0, 30).map((key) => `   ${key}`).join("\n")
        : "   (none)",
      "",
      " Verify what the build will actually see, then redeploy:",
      "   npx netlify env:list --context production --scope builds --plain",
      "================================================================",
      "",
    ].join("\n"),
  );
}

if (apiUrl) {
  console.log(`[next.config] API base URL baked into this bundle: ${apiUrl}`);
} else {
  console.log(
    "[next.config] NEXT_PUBLIC_API_URL is not set - the bundle will call http://localhost:3001 (local dev only).",
  );
}

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
