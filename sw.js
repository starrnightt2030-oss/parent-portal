/* بوابة ولي الأمر — عامل الخدمة
   الواجهة من الذاكرة أولًا (تفتح بلا إنترنت)، والبيانات من الشبكة أولًا
   (أحدث ما رُفع)، فإن انقطعت الشبكة عُرض آخر ما حُفظ. */
const V = 'pp-084b52410b';
const SHELL = ['./', 'index.html', 'app.css?v=084b52410b', 'app.js?v=084b52410b', 'manifest.webmanifest',
               'icons/logo.png', 'icons/icon-192.png', 'icons/favicon.png'];

self.addEventListener('install', (e) => {
  /* لا يحلّ الإصدارُ الجديد محلّ القديم من تلقاء نفسه: ينتظر حتى يضغط
     وليُّ الأمر «تحديث الآن» في الرسالة التي يعرضها التطبيق */
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'skip') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('pp-') && k !== V && k !== 'pp-data').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isData = (u) => u.origin === location.origin && /\/data\//.test(u.pathname);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  /* طلباتُ النطاقات الأخرى (صندوق البريد خصوصًا) لا تمرّ بالذاكرة أبدًا —
     وإلّا حُفظ ردُّ «لا جديد» وأُعيد إلى الأبد فلا يصل ردُّ الإدارة.
     الخطوطُ وحدها تُحفظ ليعمل التطبيق بلا إنترنت. */
  if (u.origin !== location.origin && !/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;

  /* البيانات: الشبكة أولًا، ويُحفظ المفتاح بلا معامل الوقت */
  if (isData(u)) {
    const key = u.origin + u.pathname;
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open('pp-data').then(ca => ca.put(key, c)); }
      return r;
    }).catch(() => caches.open('pp-data').then(ca => ca.match(key))
      .then(m => m || new Response('', { status: 503, statusText: 'offline' }))));
    return;
  }

  /* التنقّل: الشبكة أولًا ثم الصفحة المحفوظة */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('index.html').then(m => m || caches.match('./'))));
    return;
  }

  /* ما عدا ذلك (ملفّات الواجهة والخطوط): الذاكرة أولًا */
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(V).then(ca => ca.put(req, c)); }
    return r;
  })));
});
