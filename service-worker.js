const CACHE_NAME = "solo-leveling-cache-v24";
const ASSETS = [
  "./",
  "./index.html",
  "./app-shell.html",
  "./class-select.html",
  "./next-step.html",
  "./profile.html",
  "./chatbot.html",
  "./manifest.json",
  "./css/style.css",
  "./css/flow.css",
  "./css/shell.css",
  "./js/sfx.js",
  "./js/script.js",
  "./js/class-select.js",
  "./js/page-switch.js",
  "./js/next-step.js",
  "./js/profile.js",
  "./js/chatbot.js",
  "./js/app-shell.js",
  "./js/shell-guard.js",
  "./assets/audio/bgm-main.mp3",
  "./assets/audio/status-open.mp3",
  "./assets/audio/rankup-special.mp3",
  "./assets/audio/penalty-hit.mp3",
  "./assets/video/site-bg.mp4",
  "./icons/barra.png",
  "./icons/cerebro.png",
  "./icons/coracao.png",
  "./icons/corrida.png",
  "./icons/cruz.png",
  "./icons/pocao.png",
  "./icons/percepcao.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;

          const url = new URL(request.url);
          if (url.origin !== self.location.origin) return response;

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
