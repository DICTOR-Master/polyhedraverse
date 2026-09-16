import type { NextConfig } from "next";

/**
 * Security headers (2026-09-17, header-hygiene scan fix). Tailored to
 * what this app actually does, checked directly rather than copied from
 * a generic template:
 * - No `eval`/`new Function`/WASM anywhere in `app/` -> no `unsafe-eval`
 *   needed in `script-src`, even though this app uses three.js/WebGL.
 * - No Web Workers/OffscreenCanvas anywhere -> no `worker-src` needed.
 * - `next/font/google` (Geist/Geist Mono, `app/layout.tsx`) self-hosts
 *   fonts as static files at build time; no runtime fetch to
 *   fonts.googleapis.com/fonts.gstatic.com, so `font-src 'self'` alone
 *   is correct.
 * - No analytics package (`@vercel/analytics`, `@vercel/speed-insights`)
 *   and no other external API calls from `app/` -> `connect-src 'self'`
 *   alone is correct; the only external URLs anywhere in `app/` are
 *   plain `<a href>` links to github.com/rhombiverse.vercel.app, not
 *   fetched resources.
 * `'unsafe-inline'` stays on `script-src`/`style-src`: Next's own
 * hydration data and React's inline `style={{}}` props need it, and
 * this app has no nonce plumbing to avoid it.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "font-src 'self' data:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
