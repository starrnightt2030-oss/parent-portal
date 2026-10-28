/* بوابة ولي الأمر — عامل الخدمة
   الواجهة من الذاكرة أولًا (تفتح بلا إنترنت)، والبيانات من الشبكة أولًا
   (أحدث ما رُفع)، فإن انقطعت الشبكة عُرض آخر ما حُفظ. */
const V = 'pp-e6a67d6bee';
const SHELL = ['./', 'index.html', 'app.css?v=e6a67d6bee', 'app.js?v=e6a67d6bee', 'manifest.webmanifest',
               'icons/logo.png', 'icons/icon-192.png', 'icons/favicon.png'];

self.addEventListener('install', (e) => {
  /* لا يحلّ الإصدارُ الجديد محلّ القديم من تلقاء نفسه: ينتظر حتى يضغط
     وليُّ الأمر «تحديث الآن» في الرسالة التي يعرضها التطبيق */
  /* من الشبكة مباشرةً (cache: reload) — لا من ذاكرة المتصفح التي قد تحمل الإصدارَ القديم */
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
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
    /* صفحةُ البداية من الشبكة دائمًا (no-store) — فتُحمِّل ملفَّ التطبيق بإصداره الأحدث */
    e.respondWith(fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).then(r => r.ok ? r : fetch(req))
      .catch(() => caches.match('index.html').then(m => m || caches.match('./'))));
    return;
  }

  /* ما عدا ذلك (ملفّات الواجهة والخطوط): الذاكرة أولًا */
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(V).then(ca => ca.put(req, c)); }
    return r;
  })));
});

/* ============================================================================
   الإشعارات (Web Push) — تصل والتطبيقُ مغلق
   ----------------------------------------------------------------------------
   الإشعارُ يصل بلا نصّ (لا يمرّ نصُّ رسالةٍ بخدمة الإشعارات). فيسحب عاملُ الخدمة
   الجديدَ من صندوق البريد بمفتاح كلّ طالبٍ محفوظ على الجهاز، ويفكّه، ويعرضه:
   ردُّ الإدارة · رسالتُها · مستجدّاتُ الطالب (غياب · إنذار · فصل) · خبرٌ جديد.
   ويُرسل إيصالَ «وصل» للإدارة — فترى ✓✓ ولو لم يُفتح التطبيق بعد.
   ============================================================================ */
const kv = (() => {
  let p = null;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('pp-sw', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => {
    const t = db.transaction('kv', mode); const q = fn(t.objectStore('kv'));
    t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return { get: (k) => tx('readonly', (s) => s.get(k)).catch(() => undefined),
           set: (k, v) => tx('readwrite', (s) => s.put(v, k)).catch(() => {}) };
})();
const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

async function pullKid(mbox, kid) {
  const since = Number(await kv.get('seq.' + kid.id)) || 0;
  const r = await fetch(`${mbox}/p/inbox?since=${since}&_=${Date.now()}`, { cache: 'no-store',
    headers: { 'X-Fid': kid.id, 'X-Tok': kid.tok } });
  if (!r.ok) return [];
  const j = await r.json();
  const key = await crypto.subtle.importKey('raw', b64d(kid.k), 'AES-GCM', false, ['decrypt']);
  const out = [], acks = [];
  let seq = since;
  for (const it of j.items || []) {
    seq = Math.max(seq, it.seq);
    if (it.del || !it.ct) continue;
    try {
      const o = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(it.iv) }, key, b64d(it.ct))));
      if (o.type === 'post') { out.push({ k: 'c/' + o.tl, t: 'ردّ من الإدارة: ' + clip(o.b, 140) }); acks.push(it.id); }
      else if (o.type === 'msg' && !o.ed) { out.push({ k: 'msg', t: 'رسالة من الإدارة: ' + clip(o.b, 140) }); acks.push(it.id); }
      else if (o.type === 'note') out.push({ k: 'sum', t: clip(o.b, 160), imp: !!o.imp });
      else if (o.type === 'ticket' && o.status === 'closed') out.push({ k: 'c/' + o.lid, t: `أُغلق طلبك رقم ${o.no || ''}` });
    } catch (_) { /* لا يُفكّ */ }
  }
  await kv.set('seq.' + kid.id, seq);
  if (acks.length) fetch(`${mbox}/p/ack`, { method: 'POST', headers: { 'X-Fid': kid.id, 'X-Tok': kid.tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: acks.map((id) => ({ id, s: 'd', at: new Date().toISOString() })) }) }).catch(() => {});
  return out;
}

async function onPush() {
  const mbox = await kv.get('mbox'), kids = (await kv.get('kids')) || [];
  const shown = [];
  let news = [];
  if (mbox && kids.length) {
    for (const kid of kids) {
      try { const it = await pullKid(mbox, kid); if (it.length) shown.push({ kid, it }); } catch (_) {}
    }
    try {
      const bs = Number(await kv.get('bseq')) || 0, k0 = kids[0];
      const r = await fetch(`${mbox}/p/bcast?since=${bs}&_=${Date.now()}`, { cache: 'no-store', headers: { 'X-Fid': k0.id, 'X-Tok': k0.tok } });
      if (r.ok) { const j = await r.json(); if (bs) news = j.items || []; await kv.set('bseq', j.max || bs); }
    } catch (_) {}
  }
  /* إشعارٌ تجريبيّ طلبه وليُّ الأمر من الإعدادات: يُعرض ولو كان التطبيقُ أمامه */
  const fs = Number(await kv.get('forceShow')) || 0;
  const test = fs && Date.now() - fs < 90000;
  if (test) await kv.set('forceShow', 0);

  /* التطبيقُ مفتوحٌ أمامه: يُبلَّغ فيسحب ويُسمِع — بلا إشعارٍ مكرّر */
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const upd = news.filter((n) => n.kind === 'update');
  news = news.filter((n) => n.kind !== 'update');
  for (const c of wins) c.postMessage({ type: 'push', news: news.length > 0, update: upd.length > 0 });
  const base = self.registration.scope;
  if (test && !shown.length && !news.length)
    return self.registration.showNotification('✅ الإشعارات تعمل', { body: 'سيصلك هنا ردُّ الإدارة ورسائلُها وأيُّ غيابٍ أو إنذار — حتى والتطبيق مغلق.',
      tag: 'pp-test', dir: 'rtl', lang: 'ar', icon: base + 'icons/icon-192.png', badge: base + 'icons/favicon.png', vibrate: [200, 100, 200], data: { hash: '#/home' } });
  if (!test && wins.some((c) => c.visibilityState === 'visible' && c.focused)) return;

  const opts = (body, tag, hash) => ({ body, tag, renotify: true, dir: 'rtl', lang: 'ar',
    icon: base + 'icons/icon-192.png', badge: base + 'icons/favicon.png', vibrate: [200, 100, 200, 100, 300],
    requireInteraction: false, data: { hash } });
  const jobs = [];
  for (const { kid, it } of shown) {
    /* تنبيهُ الانضباط (إنذار · فصل · إيقاف · عقوبة): إشعارٌ بارزٌ مستقلّ يبقى على
       الشاشة حتى يُفتح، باهتزازٍ طويل — ونغمةُ الإشعار نفسُها نغمةُ الهاتف
       (لا يملك تطبيقُ الويب تغييرها)؛ وفي التطبيق نافذةٌ بصوت تنبيه حتى «قرأت». */
    const imp = it.filter((x) => x.imp);
    if (imp.length) {
      jobs.push(self.registration.showNotification(`⚠️ تنبيه مهم — ${kid.name ? kid.name.split(' ').slice(0, 2).join(' ') : 'بوابة ولي الأمر'}`,
        Object.assign(opts(imp.map((x) => x.t).join('\n'), 'pp-imp-' + kid.id, `#/open/${kid.id}/sum`),
          { requireInteraction: true, vibrate: [600, 200, 600, 200, 900, 300, 900], silent: false })));
      it.splice(0, it.length, ...it.filter((x) => !x.imp));
      if (!it.length) continue;
    }
    const first = it[0];
    const body = it.length === 1 ? first.t : it.slice(0, 3).map((x) => '• ' + x.t).join('\n') + (it.length > 3 ? `\n+ ${it.length - 3} أخرى` : '');
    const tab = first.k.startsWith('c/') ? 'c/' + first.k.slice(2) : first.k;
    jobs.push(self.registration.showNotification(kid.name ? `بوابة ولي الأمر — ${kid.name.split(' ').slice(0, 2).join(' ')}` : 'بوابة ولي الأمر',
      opts(body, 'pp-' + kid.id, `#/open/${kid.id}/${tab}`)));
  }
  if (upd.length) jobs.push(self.registration.showNotification('🔄 تحديث جديد — بوابة ولي الأمر',
    opts('اضغط لفتح التطبيق وتحديثه إلى أحدث إصدار', 'pp-update', '#/home')));
  for (const n of news.slice(0, 2))
    jobs.push(self.registration.showNotification('خبر جديد — بوابة ولي الأمر', opts(clip(n.title, 160), 'pp-news-' + n.id, '#/news')));
  /* لا شيءَ جديدٌ يُعرض (سبق سحبُه) — والمتصفح يشترط إشعارًا لكلّ إيقاظ */
  if (!jobs.length) jobs.push(self.registration.showNotification('بوابة ولي الأمر', opts('مستجدّاتٌ من المركز — اضغط للعرض', 'pp-gen', '#/home')));
  try { if (self.navigator.setAppBadge) self.navigator.setAppBadge(shown.reduce((n, x) => n + x.it.length, 0) + news.length || undefined); } catch (_) {}
  await Promise.all(jobs);
}

self.addEventListener('push', (e) => { e.waitUntil(onPush().catch(() =>
  self.registration.showNotification('بوابة ولي الأمر', { body: 'مستجدّاتٌ من المركز — اضغط للعرض', tag: 'pp-gen', data: { hash: '#/home' } }))); });

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.hash) || '#/home';
  e.waitUntil((async () => {
    try { if (self.navigator.clearAppBadge) self.navigator.clearAppBadge(); } catch (_) {}
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find((c) => c.url.startsWith(self.registration.scope));
    if (w) { await w.focus(); w.postMessage({ type: 'open', hash }); return; }
    await self.clients.openWindow(self.registration.scope + hash);
  })());
});

/* المتصفح جدّد الاشتراك (تغيّر مفتاحُه): يُسجَّل الجديدُ في الصندوق لكلّ طالب */
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    const mbox = await kv.get('mbox'), kids = (await kv.get('kids')) || [];
    const sub = e.newSubscription || await self.registration.pushManager.getSubscription();
    if (!mbox || !sub) return;
    const sj = sub.toJSON();
    for (const k of kids) await fetch(`${mbox}/p/sub`, { method: 'POST', headers: { 'X-Fid': k.id, 'X-Tok': k.tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sj.endpoint, keys: sj.keys }) }).catch(() => {});
  })());
});
