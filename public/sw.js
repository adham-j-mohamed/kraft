const CACHE_NAME = 'kraft-shell-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-icon.png', OFFLINE]))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple helper to open IndexedDB in service worker
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('kraft-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueRequest(req) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    const id = crypto.randomUUID();
    const reader = req.clone().arrayBuffer();
    reader.then((buf) => {
      store.add({ id, url: req.url, method: req.method, headers: Array.from(req.headers.entries()), body: buf });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // POSTs to /api/* when offline: queue them
  if (request.method !== 'GET' && request.method !== 'HEAD' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          if (!self.navigator || !self.navigator.onLine) throw new Error('offline');
          return await fetch(request);
        } catch (err) {
          await queueRequest(request);
          return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { 'Content-Type': 'application/json' } });
        }
      })()
    );
    return;
  }

  // For navigation, try network first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE)))
    );
    return;
  }

  // For other GETs, cache-first
  if (request.method === 'GET') {
    event.respondWith(caches.match(request).then((r) => r || fetch(request)));
  }
});

// Flushing outbox: try to send queued requests in order
async function flushOutbox() {
  const db = await idbOpen();
  const tx = db.transaction('outbox', 'readonly');
  const store = tx.objectStore('outbox');
  const all = await new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

  for (const item of all) {
    try {
      const headers = new Headers(item.headers);
      const resp = await fetch(item.url, { method: item.method, headers, body: item.body });
      if (!resp.ok) continue;
      // delete if successful
      const tx2 = db.transaction('outbox', 'readwrite');
      tx2.objectStore('outbox').delete(item.id);
      await new Promise((res) => (tx2.oncomplete = res));
    } catch (e) {
      // network error: stop trying
      return;
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'kraft-sync') event.waitUntil(flushOutbox());
});

// Also try to flush when connection returns
self.addEventListener('message', (event) => {
  if (event.data === 'flush') event.waitUntil(flushOutbox());
});
