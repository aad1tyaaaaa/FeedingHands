self.addEventListener("install", (event) => {
  console.log("Service Worker Installed");
  event.waitUntil(
    caches.open("app-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/logo192.png",
        "/logo512.png",
        "/manifest.json",
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
