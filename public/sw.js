const CACHE_NAME = 'kraft-shell-v2';
const OFFLINE = '/offline.html';
const OUTBOX_DB = 'kraft-offline';
const OUTBOX_STORE = 'outbox';
const MAX_RETRIES = 5;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-icon.png', OFFLINE])).catch(() => {
      // ignore individual cache failures during install to avoid blocking
      return Promise.resolve();
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim clients and remove old caches with different names
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    })()
  );
});

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function broadcast(msg) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) {
    try {
      c.postMessage(msg);
    } catch {
      /* ignore */
    }
  }
}

function shouldQueue(url, method) {
  if (method === 'GET' || method === 'HEAD') return false;
  if (!url.pathname.startsWith('/api/')) return false;
  // Queue only the user-facing write endpoints: sessions (start/sets), foods (create/edit/delete of personal foods), weight and water
  if (url.pathname === '/api/sessions') return true;
  if (url.pathname.startsWith('/api/sessions/') && url.pathname.includes('/sets')) return true;
  if (url.pathname.startsWith('/api/foods')) return true;
  if (url.pathname === '/api/weight' || url.pathname === '/api/water') return true;
  return false;
}

async function queueRequest(req) {
  const url = new URL(req.url);
  if (!shouldQueue(url, req.method)) return;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    const store = tx.objectStore(OUTBOX_STORE);
    const id = crypto.randomUUID();
    req.clone()
      .arrayBuffer()
      .then((buf) => {
        const item = {
          id,
          url: req.url,
          method: req.method,
          headers: Array.from(req.headers.entries()),
          body: buf,
          createdAt: Date.now(),
          retries: 0,
        };
        store.add(item);
      })
      .catch((e) => {
        // If body can't be read, still add basic record for idempotent endpoints without body
        const item = { id, url: req.url, method: req.method, headers: Array.from(req.headers.entries()), body: null, createdAt: Date.now(), retries: 0 };
        store.add(item);
      });
    tx.oncomplete = async () => {
      // notify clients about queued count
      try {
        const tx2 = db.transaction(OUTBOX_STORE, 'readonly');
        const all = await new Promise((res, rej) => {
          const r = tx2.objectStore(OUTBOX_STORE).getAll();
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        broadcast({ type: 'queue', queued: all.length });
      } catch {}
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // For write requests to selected API endpoints: try network, otherwise queue
  if (request.method !== 'GET' && request.method !== 'HEAD' && url.pathname.startsWith('/api/')) {
    if (!shouldQueue(url, request.method)) {
      // Not queueable: attempt network and return error to client if offline
      event.respondWith((async () => {
        try {
          return await fetch(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })());
      return;
    }

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

  // API GETs should be network-first (no stale data for logged-in views)
  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() => caches.match(request).then((r) => r || new Response(null, { status: 503 })))
    );
    return;
  }

  // Static GETs: cache-first
  if (request.method === 'GET') {
    event.respondWith(caches.match(request).then((r) => r || fetch(request)));
  }
});

async function updateRetryCount(db, id, nextRetries) {
  const tx = db.transaction(OUTBOX_STORE, 'readwrite');
  const store = tx.objectStore(OUTBOX_STORE);
  const getReq = store.get(id);
  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const v = getReq.result;
      if (!v) return resolve();
      v.retries = nextRetries;
      store.put(v);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushOutbox() {
  const db = await idbOpen();
  const tx = db.transaction(OUTBOX_STORE, 'readonly');
  const store = tx.objectStore(OUTBOX_STORE);
  const all = await new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result.sort((a, b) => a.createdAt - b.createdAt));
    r.onerror = () => rej(r.error);
  });

  if (all.length === 0) {
    broadcast({ type: 'queue', queued: 0 });
    return;
  }

  broadcast({ type: 'sync-start', queued: all.length });

  for (const item of all) {
    try {
      broadcast({ type: 'sync-item', id: item.id, url: item.url, retries: item.retries });
      const headers = new Headers(item.headers);
      const opts = { method: item.method, headers };
      if (item.body) opts.body = item.body;
      const resp = await fetch(item.url, opts);

      if (resp.ok) {
        const tx2 = db.transaction(OUTBOX_STORE, 'readwrite');
        tx2.objectStore(OUTBOX_STORE).delete(item.id);
        await new Promise((res) => (tx2.oncomplete = res));
        broadcast({ type: 'sync-success', id: item.id });
        continue;
      }

      // Permanent client error: remove and inform clients
      if (resp.status >= 400 && resp.status < 500) {
        const tx2 = db.transaction(OUTBOX_STORE, 'readwrite');
        tx2.objectStore(OUTBOX_STORE).delete(item.id);
        await new Promise((res) => (tx2.oncomplete = res));
        broadcast({ type: 'sync-failed', id: item.id, status: resp.status });
        continue;
      }

      // Server error: increment retry count and back off
      const next = (item.retries || 0) + 1;
      if (next > MAX_RETRIES) {
        const tx2 = db.transaction(OUTBOX_STORE, 'readwrite');
        tx2.objectStore(OUTBOX_STORE).delete(item.id);
        await new Promise((res) => (tx2.oncomplete = res));
        broadcast({ type: 'sync-giveup', id: item.id });
        continue;
      }

      await updateRetryCount(db, item.id, next);
      const backoff = Math.min(30_000, 1000 * Math.pow(2, next));
      await new Promise((res) => setTimeout(res, backoff));
      // continue with next items after backoff
    } catch (e) {
      // Network error: stop processing and let the next sync/message/online trigger try again
      broadcast({ type: 'sync-network-error' });
      return;
    }
  }

  // Final queued count
  const txFinal = db.transaction(OUTBOX_STORE, 'readonly');
  const remaining = await new Promise((res, rej) => {
    const r = txFinal.objectStore(OUTBOX_STORE).getAll();
    r.onsuccess = () => res(r.result.length);
    r.onerror = () => rej(r.error);
  });
  broadcast({ type: 'sync-done', queued: remaining });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'kraft-sync') event.waitUntil(flushOutbox());
});

self.addEventListener('message', (event) => {
  if (event.data === 'flush') event.waitUntil(flushOutbox());
});
