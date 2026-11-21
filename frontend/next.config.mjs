import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// A hosted build without the API URL would silently point every visitor's browser at localhost.
if ((process.env.VERCEL || process.env.RENDER) && !process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error("Set NEXT_PUBLIC_API_BASE_URL (the Go API's public URL) in the hosting dashboard, then redeploy.");
}

/** @type {(phase: string) => import('next').NextConfig} */
export default (phase) => ({
  // Builds a static single-page app in out/ that any static host can serve (Vercel, Render static sites,
  // Cloudflare Pages, nginx in docker compose). Security headers and the SPA fallback therefore live in the
  // host's config: vercel.json, render.yaml and nginx.conf.
  // Not in `next dev`: there, export mode rejects every path except "/", so opening or refreshing a page
  // like /sign-up would crash. The dev server renders the catch-all route on demand instead.
  output: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "export",
  poweredByHeader: false,
});
