/* ExpectException Service Worker — cache-first for static assets, network-first for API */
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `expexc-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `expexc-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/logo192.png',
    '/logo512.png',
    '/offline.html',
];

// Install — cache static shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin
    if (request.method !== 'GET') return;
    if (url.origin !== location.origin) return;

    // API — network first, no cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() =>
                new Response(JSON.stringify({ error: 'Offline — no network connection' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503,
                })
            )
        );
        return;
    }

    // Static JS/CSS chunks — cache first (they are content-hashed)
    if (url.pathname.startsWith('/static/')) {
        event.respondWith(
            caches.match(request).then(cached =>
                cached || fetch(request).then(response => {
                    const clone = response.clone();
                    caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
                    return response;
                })
            )
        );
        return;
    }

    // HTML nav — network first, fall back to cached index.html (SPA)
    event.respondWith(
        fetch(request)
            .then(response => {
                const clone = response.clone();
                caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
                return response;
            })
            .catch(() =>
                caches.match('/') ||
                caches.match('/offline.html') ||
                new Response('<h1>You are offline</h1>', { headers: { 'Content-Type': 'text/html' } })
            )
    );
});
