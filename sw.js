// Network-first. Requests to /api, non-GET requests and other origins are never touched.
const CACHE = "joke-v1";

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/assets/logo.svg",
  "/assets/mascot-idle.svg",
  "/assets/mascot-think.svg",
  "/assets/mascot-joke.svg",
  "/assets/mascot-error.svg",
  "/assets/bg-dots.svg",
  "/assets/bg-doodles.svg",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const page = await cache.match("/");
      if (page) return page;
    }
    throw err;
  }
}
