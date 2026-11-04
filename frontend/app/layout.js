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
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
