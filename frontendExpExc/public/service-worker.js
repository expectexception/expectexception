// ExpectException Service Worker
// Enables offline functionality and PWA installation

const CACHE_NAME = 'expectexception-v1';
const RUNTIME_CACHE = 'expectexception-runtime';

// Assets to cache immediately on install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/logo192.png',
    '/logo512.png'
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Precaching app shell');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // API requests - Network first, then cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone the response before caching
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(request);
                })
        );
        return;
    }

    // Static assets - Cache first, then network
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    // Clone and cache for future use
                    const responseClone = response.clone();

                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });

                    return response;
                });
            })
            .catch(() => {
                // Offline fallback for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Offline - Please check your connection', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Handle messages from the application
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// =============================================================================
// Push Notification Handlers
// =============================================================================

// Listen for push notifications
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push notification received');

    if (!event.data) {
        console.log('[Service Worker] Push event has no data');
        return;
    }

    try {
        const data = event.data.json();

        const title = data.title || 'ExpectException';
        const options = {
            body: data.body || 'New notification',
            icon: data.icon || '/logo192.png',
            badge: data.badge || '/logo192.png',
            vibrate: [200, 100, 200],
            data: data.data || {},
            actions: data.actions || [],
            tag: data.tag || 'default',
            requireInteraction: data.requireInteraction || false,
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (error) {
        console.error('[Service Worker] Error handling push event:', error);
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');

    event.notification.close();

    // Get the URL to open from notification data
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }

                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Handle notification close event (for analytics)
self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification closed:', event.notification.tag);

    // Optional: Track notification dismissal
    // You could send analytics data here if needed
});
