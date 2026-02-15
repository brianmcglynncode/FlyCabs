const CACHE_NAME = 'flycabs-v20';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './version.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
                );
            }),
            // Take control of all pages immediately 
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // Network-First Strategy: Try network, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
    // --- Web Push ---
    self.addEventListener('push', event => {
        const text = event.data ? event.data.text() : 'No Data';
        console.log('[SW] Push Received!', text);

        // Broadcast to Window for UI Debugging
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({
                type: 'DEBUG_LOG',
                msg: `[SW] Push Received: ${text.substring(0, 20)}...`
            }));
        });

        const data = event.data ? event.data.json() : {};
        const title = data.title || 'FlyCabs Update';
        const options = {
            body: data.body || 'New activity on FlyCabs.',
            icon: './icon.png',
            badge: './icon.png',
            data: { url: data.url || '/' }
        };

        event.waitUntil(self.registration.showNotification(title, options)
            .then(() => {
                console.log('[SW] Notification Shown');
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage({
                        type: 'DEBUG_LOG',
                        msg: `[SW] Notification Request Sent to OS`
                    }));
                });
            })
            .catch(err => {
                console.error('[SW] Notification Error:', err);
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage({
                        type: 'DEBUG_LOG',
                        msg: `[SW] Show Error: ${err.message}`
                    }));
                });
            })
        );
    });

    self.addEventListener('notificationclick', event => {
        event.notification.close();
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                // Focus existing window or open new
                for (let client of windowClients) {
                    if (client.url && 'focus' in client) return client.focus();
                }
                if (clients.openWindow) return clients.openWindow(event.notification.data.url);
            })
        );
    });
