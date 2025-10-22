const CACHE_NAME = 'bolavision-cache-v1';

// On install, pre-cache the main app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icon.svg'
      ]);
    })
  );
});

// On activate, remove any old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// On fetch, use a "cache, falling back to network" strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return; // Don't cache non-GET requests
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Try to find the request in the cache
      const cachedResponse = await cache.match(event.request);
      
      // 2. Define a promise that fetches from the network
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // If the request is successful, clone it and store it in the cache for next time
        if (networkResponse.status === 200) {
           cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      });
      
      // 3. Return the cached response if found, otherwise wait for the network response.
      // This ensures the app works offline if assets have been cached before.
      return cachedResponse || fetchPromise;
    })
  );
});
