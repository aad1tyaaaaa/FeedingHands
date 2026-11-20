import ClientApp from "./client";

// Every URL lands here; react-router inside the existing App picks the screen.
// Static export builds this once as /index.html and the host serves it for every path (see render.yaml, nginx.conf).
// ponytail: SPA mode per Next's CRA migration guide. Move routes to app/ one at a time to get SSR.
export function generateStaticParams() {
  return [{ slug: [""] }];
}

export default function Page() {
  return <ClientApp />;
}
