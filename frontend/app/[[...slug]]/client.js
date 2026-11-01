"use client";

import React from "react";
import PropTypes from "prop-types";
import dynamic from "next/dynamic";
import "fast-text-encoding";

// react-scratchcard (GiftCard) still reads React.PropTypes, removed in React 16.
// CRA let it load its own nested React 15; Next uses one React, so restore the field.
React.PropTypes ??= PropTypes;

// The existing app uses window/document/leaflet/tfjs at import time, so render it only in the browser.
const App = dynamic(() => import("../../src/components/App"), { ssr: false });

export default function ClientApp() {
  return <App />;
}
