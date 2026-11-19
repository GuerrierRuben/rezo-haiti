import type { NextConfig } from "next";

/**
 * Politique de sécurité des contenus (CSP) en mode observation (Report-Only).
 * Autorise les ressources nécessaires pour Leaflet, OpenStreetMap et Supabase.
 * Pour la passer en mode bloquant, renommer 'Content-Security-Policy-Report-Only'
 * en 'Content-Security-Policy' dans le tableau securityHeaders ci-dessous.
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://unpkg.com;
  img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tile.openstreetmap.org;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`
  .replace(/\s{2,}/g, " ")
  .trim();

/**
 * En-têtes de sécurité HTTP appliqués à l'ensemble des routes de l'application.
 */
const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: cspHeader,
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
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
