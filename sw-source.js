// Service Worker — منصة آيات الرضا v6.1
const CACHE = 'ayat-rida-v6.1';
const PRECACHE = ['./', './index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

// المضيفون المسموح بتخزينهم مؤقتاً: المكتبات والخطوط فقط.
// لا تُخزَّن أبداً واجهات Google للبيانات (www.googleapis.com) ولا طلبات الإذن (accounts.google.com).
const CACHEABLE_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache =>
            Promise.allSettled(PRECACHE.map(url => cache.add(url)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// هل يجوز اعتراض هذا الطلب وتخزينه؟
function isCacheable(req, url) {
    // أي طلب يحمل ترويسة Authorization (مثل طلبات Google Drive) يمر مباشرة إلى الشبكة
    if (req.headers && req.headers.get && req.headers.get('authorization')) return false;
    if (url.origin === self.location.origin) return true;
    return CACHEABLE_HOSTS.includes(url.hostname);
}

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // الصفحة الرئيسية: الشبكة أولاً ثم الكاش عند انقطاع الاتصال
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy));
                    return res;
                })
                .catch(() => caches.match(req).then(r => r || caches.match('./')))
        );
        return;
    }

    // ما لا يُسمح بتخزينه لا يُعترض: يذهب المتصفح إليه مباشرة
    if (!isCacheable(req, url)) return;

    // المكتبات والملفات المحلية: الكاش أولاً ثم الشبكة
    event.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(res => {
            if (res.ok || res.type === 'opaque') {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
        }))
    );
});
