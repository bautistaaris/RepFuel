/* RepFuel service worker. Multi-user cache strategy. */
const CACHE_STATIC = "repfuel-static-v2";
const CACHE_FONTS = "repfuel-fonts-v2";

const PRECACHE_STATIC = ["/manifest.webmanifest", "/robots.txt"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((c) => c.addAll(PRECACHE_STATIC)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_FONTS)
          .map((k) => caches.delete(k)),
      );
    })(),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // NEVER cache API or auth endpoints
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/data/")) return;

  // Auth pages: network-only (do not cache, no leakage)
  if (
    url.pathname === "/login" ||
    url.pathname === "/register" ||
    url.pathname === "/forgot-password" ||
    url.pathname.startsWith("/verify-email") ||
    url.pathname.startsWith("/reset-password")
  ) {
    event.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
    return;
  }

  // Navigation: network-first, fallback to cached only for same GET navigation
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_STATIC).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r ?? Response.error())),
    );
    return;
  }

  // Google Fonts CSS + woff2 — cache-first for performance
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_FONTS).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          }).catch(() => cached),
      ),
    );
    return;
  }

  // Other static assets: cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE_STATIC).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => cached ?? Response.error()),
    ),
  );
});

// Helper to clear private caches on logout (called from client)
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_CACHE") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_FONTS).map((k) => caches.delete(k)));
        await caches.delete(CACHE_STATIC);
        await caches.delete(CACHE_FONTS);
      })(),
    );
  }
});