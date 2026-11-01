/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old index.html set this as a <meta> tag, which browsers ignore for frame-ancestors; a real header enforces it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://www.google.com https://recaptcha.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
