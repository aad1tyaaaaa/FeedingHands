import ClientApp from "./client";

// Every URL lands here; react-router inside the existing App picks the screen.
// ponytail: SPA mode per Next's CRA migration guide. Move routes to app/ one at a time to get SSR.
export default function Page() {
  return <ClientApp />;
}
