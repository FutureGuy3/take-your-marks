// Take Your Marks — Service Worker
// 更新したら VERSION を上げる（古いキャッシュが消えて新しい版に切り替わる）
const VERSION = 'tym-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // ページ本体：ネット優先（GitHubの更新をすぐ反映）、つながらなければキャッシュ
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 同じサイトのファイルとGoogle Fonts：キャッシュ優先＋裏で更新
  if(url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if(res && (res.ok || res.type === 'opaque')){
            const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
