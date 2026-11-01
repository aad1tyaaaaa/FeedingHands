import Script from "next/script";
import { Fredoka } from "next/font/google";
import "./globals.css";

// Fredoka (variable weight 300–700), self-hosted by Next at build time; exposed as --font-fredoka.
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
});

export const metadata = {
  title: "FeedingHands",
  manifest: "/manifest.json",
  icons: { icon: "/logo/logo.png", apple: "/logo/logo.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fredoka.variable}>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div id="root">{children}</div>

        {/* Google Maps API: replace YOUR_API_KEY (carried over from the old index.html) */}
        <Script
          src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"
          strategy="afterInteractive"
        />

        {/* Chatbase chatbot (same snippet as the old index.html) */}
        <Script id="chatbase-init" strategy="afterInteractive">
          {`(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="yjdpcsT5vE7OpzrkI5BYv";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();`}
        </Script>
      </body>
    </html>
  );
}
