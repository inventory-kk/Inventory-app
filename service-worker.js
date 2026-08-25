const CACHE_NAME = 'inventory-app-v2';
const urlsToCache = ['index.html','style.css','db.js','app.js','manifest.webmanifest'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(cacheNames => Promise.all(
        cacheNames.map(cacheName => cacheName !== CACHE_NAME ? caches.delete(cacheName) : undefined)
    )));
});
