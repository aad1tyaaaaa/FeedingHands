// A hosted build without the API URL would silently point every visitor's browser at localhost.
if ((process.env.VERCEL || process.env.RENDER) && !process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error("Set NEXT_PUBLIC_API_BASE_URL (the Go API's public URL) in the hosting dashboard, then redeploy.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A static single-page app in out/: any static host can serve it (Vercel, Render static sites, Cloudflare Pages,
  // nginx in docker compose). Security headers and the SPA fallback therefore live in the host's config:
  // vercel.json, render.yaml and nginx.conf.
  output: "export",
  poweredByHeader: false,
};

export default nextConfig;
