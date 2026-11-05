const CACHE = "ucc-class-alert-v1";
const SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.webmanifest",
    "./js/config.js",
    "./js/app.js",
    "./js/store.js",
    "./js/time.js",
    "./js/scheduler.js",
    "./js/notify.js",
    "./js/ml.js",
    "./js/sync.js",
    "./js/dom.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./data/timetable.json",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") {
        return;
    }
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }
            return fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match("./index.html"));
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ("focus" in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow("./");
            }
            return undefined;
        })
    );
});
