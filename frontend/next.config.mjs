/** @type {import('next').NextConfig} */
const nextConfig = {
  // A static single-page app in out/: any free static host can serve it (Render static sites, Cloudflare Pages,
  // nginx in docker compose). Security headers therefore live in the host's config: render.yaml and nginx.conf.
  output: "export",
  poweredByHeader: false,
};

export default nextConfig;
