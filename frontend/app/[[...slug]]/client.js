"use client";

import dynamic from "next/dynamic";
import "fast-text-encoding";

// The existing app uses window/document/leaflet/tfjs at import time, so render it only in the browser.
const App = dynamic(() => import("../../src/components/App"), { ssr: false });

export default function ClientApp() {
  return <App />;
}
