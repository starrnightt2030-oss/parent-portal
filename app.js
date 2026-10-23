/* ============================================================================
   بوابة ولي الأمر — مركز تدريب شركة ترسانة الإسكندرية
   إدارة جودة وتكنولوجيا التعليم · App designed & developed by mohamed_eldawly
   ----------------------------------------------------------------------------
   تطبيقٌ ثابت بلا خادم: بيانات كلّ طالبٍ ملفٌّ مشفَّر (AES-256-GCM) اسمُه
   ومفتاحُه مشتقّان من رقمه القومي (PBKDF2-SHA256)، ويُفكّ هنا في المتصفح.
   الرقم القومي نفسه لا يُحفظ ولا يُرسل إلى أيّ مكان.
   ============================================================================ */
'use strict';
(function () {
  const BUILD = '6acb964728';
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ------------------------------------------------ تخزين آمن */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} },
  };
  const SS = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (_) {} },
  };

  /* ------------------------------------------------ الأصوات
     نغماتٌ تُولَّد في المتصفح (Web Audio) — بلا ملفّات تُحمَّل.
     المتصفح لا يسمح بالصوت قبل أوّل لمسة، فما طُلب قبلها يُعزف عندها. */
  const SND = (() => {
    let ctx = null, pending = null;
    const on = () => LS.get('pp.sound', true) !== false;
    const ac = () => {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
      return ctx;
    };
    const SEQ = {
      open:   { n: [523.25, 659.25, 783.99, 1046.5], d: 0.13, g: 0.05, t: 'sine' },
      data:   { n: [783.99, 1046.5], d: 0.11, g: 0.045, t: 'triangle' },
      msg:    { n: [880, 1318.5, 880, 1318.5], d: 0.12, g: 0.05, t: 'sine' },
      update: { n: [659.25, 783.99, 987.77, 1318.5], d: 0.12, g: 0.05, t: 'triangle' },
      fresh:  { n: [1046.5, 1318.5, 1568], d: 0.1, g: 0.04, t: 'sine' },
      tap:    { n: [1400], d: 0.035, g: 0.018, t: 'sine' },
      error:  { n: [392, 261.63], d: 0.18, g: 0.05, t: 'triangle' },
    };
    function play(name) {
      if (!on()) return;
      const c = ac(); if (!c) return;
      if (c.state === 'suspended') {
        pending = name;
        c.resume().then(() => { if (c.state === 'running' && pending === name) { pending = null; play(name); } }).catch(() => {});
        return;
      }
      const q = SEQ[name]; if (!q) return;
      const t0 = c.currentTime + 0.02;
      q.n.forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = q.t; o.frequency.value = f;
        const t = t0 + i * q.d;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(q.g, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + q.d * 1.8);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + q.d * 2);
      });
    }
    /* أوّل لمسة تفتح الصوت وتعزف ما كان ينتظر */
    const unlock = () => {
      const c = ac(); if (!c) return;
      c.resume().then(() => { if (pending) { const p = pending; pending = null; play(p); } }).catch(() => {});
    };
    document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    document.addEventListener('keydown', unlock, { capture: true });
    return { play, on, set: (v) => LS.set('pp.sound', !!v) };
  })();

  /* ------------------------------------------------ أيقونات */
  const svg = (d, o = {}) => `<svg class="ic" aria-hidden="true" width="${o.s || 22}" height="${o.s || 22}" viewBox="0 0 24 24" fill="none"
    stroke="${o.c || 'currentColor'}" stroke-width="${o.w || 2}" stroke-linecap="round" stroke-linejoin="round"${o.st ? ` style="${o.st}"` : ''}>${d}</svg>`;
  const I = {
    back: (c) => svg('<path d="M9 6l6 6-6 6"/>', { c, w: 2.2, s: 20 }),
    next: (c) => svg('<path d="M15 6l-6 6 6 6"/>', { c, w: 2.2, s: 20 }),
    gear: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z"/><circle cx="12" cy="10" r="2.6"/><path d="M7.8 16.5c.9-1.8 2.4-2.8 4.2-2.8s3.3 1 4.2 2.8"/>',
    paper: '<path d="M4 5h13a2 2 0 0 1 2 2v12a1 1 0 0 0 2 0V9h-2"/><path d="M4 5v13a2 2 0 0 0 2 2h14"/><path d="M8 9h7M8 13h7M8 17h4"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    sync: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.3"/>',
    alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.3 1.7-2 3-2s2.4.7 3 2M14.5 10h4M14.5 13.5h3"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    out: '<path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    dl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    mute: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>',
  };
  const ic = (name, o) => svg(I[name], o);

  const CREDIT = `<div class="credit"><b>إدارة جودة وتكنولوجيا التعليم</b><span dir="ltr">App designed &amp; developed by mohamed_eldawly</span></div>`;
  const ORG_DEFAULT = 'مركز تدريب شركة ترسانة الإسكندرية';
  const ORG_LINE = 'مركز التدريب — شركة ترسانة الإسكندرية';

  /* ------------------------------------------------ التواريخ */
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const WDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const pd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
  const fDate = (s) => { const p = pd(s); return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : ''; };
  const wday = (s) => { const p = pd(s); return p ? WDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] : ''; };
  const fTime = (s) => { const m = /(\d{2}):(\d{2})/.exec(String(s || '').slice(10)); if (!m) return '';
    let h = +m[1]; const ap = h < 12 ? 'ص' : 'م'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; };
  const fDT = (s) => s ? `${fDate(s)}${fTime(s) ? ' · ' + fTime(s) : ''}` : '';
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const ago = (s) => {
    const p = pd(s); if (!p) return '';
    const t = pd(todayStr());
    const n = Math.round((Date.UTC(t.y, t.m - 1, t.d) - Date.UTC(p.y, p.m - 1, p.d)) / 864e5);
    if (n <= 0) return 'اليوم'; if (n === 1) return 'أمس'; if (n === 2) return 'منذ يومين';
    if (n <= 10) return `منذ ${n} أيام`; return fDate(s);
  };
  const daysAr = (n) => n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : (n >= 3 && n <= 10) ? `${n} أيام` : `${n} يومًا`;
  const YEAR = { 1: 'الصف الأول', 2: 'الصف الثاني', 3: 'الصف الثالث' };

  /* ------------------------------------------------ الشبكة */
  const fresh = (p) => `${p}${p.includes('?') ? '&' : '?'}t=${Date.now()}`;
  async function getJSON(p) {
    const r = await fetch(fresh(p), { cache: 'no-store' });
    if (r.status === 404) { const e = new Error('notfound'); e.code = 404; throw e; }
    if (!r.ok) { const e = new Error('net'); e.code = r.status; throw e; }
    return r.json();
  }
  const S = { meta: null, news: null, kid: null, data: null, loadedAt: 0, splashDone: false };

  async function loadMeta(force) {
    if (S.meta && !force) return S.meta;
    try { S.meta = await getJSON('data/meta.json'); } catch (_) { S.meta = S.meta || null; }
    checkVersion();
    return S.meta;
  }
  async function loadNews(force) {
    if (S.news && !force) return S.news;
    try { const j = await getJSON('data/news.json'); S.news = (j && j.items) || []; } catch (_) { S.news = S.news || []; }
    return S.news;
  }

  /* ------------------------------------------------ التشفير */
  const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const b64e = (u) => btoa(String.fromCharCode.apply(null, Array.from(u)));
  const hex = (u) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');
  const normNid = (v) => String(v || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/\D/g, '');

  async function derive(nid, meta) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(nid), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: b64d(meta.salt), iterations: meta.iter }, base, 384));
    return { id: hex(bits.slice(32, 48)), k: b64e(bits.slice(0, 32)), salt: meta.salt };
  }
  async function openFile(kid) {
    const j = await getJSON(`data/s/${kid.id}.json`);
    const key = await crypto.subtle.importKey('raw', b64d(kid.k), 'AES-GCM', false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(j.iv) }, key, b64d(j.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* ------------------------------------------------ الطلاب المحفوظون */
  const kids = () => LS.get('pp.kids', []);
  const saveKid = (k) => { const l = kids().filter((x) => x.id !== k.id); l.unshift(k); LS.set('pp.kids', l.slice(0, 6)); };
  const dropKid = (id) => LS.set('pp.kids', kids().filter((x) => x.id !== id));
  function currentKid() {
    if (S.kid) return S.kid;
    const s = SS.get('pp.cur', null);
    if (s) return (S.kid = s);
    return null;
  }

  /* ------------------------------------------------ واجهة عامة */
  let toastT = null;
  function toast(m) {
    const t = $('#toast'); t.textContent = m; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function sheet(html) {
    const s = $('#sheet');
    s.innerHTML = `<div class="pn" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    s.hidden = false;
    s.onclick = (e) => { if (e.target === s) closeSheet(); };
  }
  const closeSheet = () => { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; };
  const offlineBar = () => navigator.onLine === false ? '<div class="offline">لا يوجد اتصال بالإنترنت — تُعرض آخر بيانات محفوظة على الجهاز</div>' : '';
  const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

  /* ------------------------------------------------ تثبيت التطبيق */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (route()[0] === 'home') render(); });
  window.addEventListener('appinstalled', () => { installEvt = null; toast('تمّ تثبيت التطبيق'); });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function doInstall() {
    if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (_) {} installEvt = null; render(); return; }
    sheet(`<h2>تثبيت التطبيق</h2>
      <div class="note">${ic('info', { s: 20, st: 'margin-top:3px' })}<span>${isIOS()
        ? 'على iPhone: افتح الصفحة في Safari، ثم اضغط زرّ المشاركة أسفل الشاشة، واختر «إضافة إلى الشاشة الرئيسية».'
        : 'من قائمة المتصفح (النقاط الثلاث أعلى الشاشة) اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'}</span></div>
      <button class="btn" data-a="close">حسنًا</button>`);
  }

  /* ============================================================================
     الشاشات
     ============================================================================ */
  function route() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    return h ? h.split('/') : [''];
  }

  /* ١. البداية */
  function vSplash() {
    const org = (S.meta && S.meta.org) || ORG_DEFAULT;
    app.innerHTML = `<section class="screen splash">
      <div class="flag" aria-hidden="true"><i style="flex:2;background:#1E6FD9"></i><i style="flex:1;background:#fff"></i><i style="flex:1;background:#D62839"></i></div>
      <div class="deco" style="top:-120px;left:-120px;width:300px;height:300px"></div>
      <div class="deco" style="bottom:-160px;right:-140px;width:380px;height:380px"></div>
      <div class="mid">
        <div class="logo-wrap">
          <div class="ring" aria-hidden="true"></div><div class="ring d2" aria-hidden="true"></div><div class="ring d3" aria-hidden="true"></div>
          <div class="logo-big"><img src="icons/logo.png" alt="شعار ${esc(org)}"><div class="shine" aria-hidden="true"></div></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
          <div class="org up1">${ORG_LINE}</div>
          <h1 class="up2">بوابة ولي الأمر</h1>
          <p class="up3">تابع انتظام ابنك وغيابه وكل ما يخصّه — أولًا بأول</p>
        </div>
      </div>
      <div class="bot">
        <div class="bar" aria-hidden="true"><i></i></div>
        <button class="btn-start" data-go="#/home">ابدأ ${I.next('#0B1F44')}</button>
        ${CREDIT}
      </div>
    </section>`;
    SND.play('open');
    clearTimeout(vSplash.t);
    vSplash.t = setTimeout(() => { if (!route()[0]) { S.splashDone = true; location.replace('#/home'); } }, 3600);
  }

  /* ٢. الرئيسية */
  async function vHome() {
    const draw = () => {
      const m = S.meta, news = S.news || [];
      const seen = LS.get('pp.seenNews', 0);
      const nNew = news.filter((n) => n.id > seen).length;
      const latest = news[0];
      app.innerHTML = `<section class="screen">
        ${offlineBar()}
        <header class="hero">
          <div class="row">
            <img class="lg" src="icons/logo.png" alt="شعار المركز">
            <div style="display:flex;flex-direction:column;flex:1;min-width:0">
              <span class="t1">مركز التدريب — ترسانة الإسكندرية</span>
              <span class="t2">بوابة ولي الأمر</span>
            </div>
            <button class="ibtn" data-a="settings" aria-label="الإعدادات">${ic('gear', { s: 20 })}</button>
          </div>
          <div class="hi">أهلًا بك</div>
        </header>
        <main class="wrap lift" style="flex:1">
          <button class="big-card" data-go="#/login">
            <div class="bi" style="background:#0B1F44">${ic('shield', { s: 30, c: '#fff', w: 1.8 })}</div>
            <div class="bt"><b>بوابة ولي الأمر</b><span>الغياب والإنذارات والعقوبات ورسائل الإدارة الخاصة بابنك</span></div>
            ${I.next('#1E6FD9')}
          </button>
          <button class="big-card" data-go="#/news" style="box-shadow:0 10px 30px rgba(11,31,68,.06)">
            <div class="bi" style="background:#E8F1FD">${ic('paper', { s: 30, c: '#1E6FD9', w: 1.8 })}</div>
            <div class="bt"><b>آخر الأخبار والتعليمات</b><span>مواعيد ومستجدات وتعليمات من إدارة المركز</span></div>
            ${nNew ? `<span class="count" aria-label="${nNew} جديد">${nNew}</span>` : I.next('#1E6FD9')}
          </button>
          ${installEvt && !standalone() ? `<button class="install" data-a="install">${ic('dl', { s: 20 })}<span style="flex:1">ثبّت التطبيق على هاتفك ليفتح بلمسة واحدة</span></button>` : ''}
          ${latest ? `<section style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
            <div class="sec-h"><h2>أحدث ما نُشر</h2><button class="link" data-go="#/news">عرض الكل</button></div>
            ${newsMini(latest)}
          </section>` : ''}
        </main>
        <footer class="foot">
          ${m && m.at ? `<div class="sync">${ic('sync', { s: 14 })} آخر تحديث للبيانات: ${esc(fDT(m.at))}</div>` : ''}
          <div class="sep">${CREDIT}</div>
        </footer>
      </section>`;
    };
    draw();
    await Promise.all([loadMeta(), loadNews()]);
    if (route()[0] === 'home') draw();
  }
  const KIND = { ins: 'تعليمات', news: 'أخبار', dates: 'مواعيد' };
  function newsMini(n) {
    return `<button class="news-mini" data-go="#/news/${n.id}">
      <div class="th">${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy">` : ic('cal', { s: 34, c: '#fff', w: 1.6 })}</div>
      <div class="tx"><span class="kick">${esc(KIND[n.k] || 'أخبار')} · ${esc(ago(n.at))}</span>
        <span class="tt">${esc(n.t)}</span><span class="ts">اضغط لقراءة التفاصيل</span></div>
    </button>`;
  }

  /* ٣. الأخبار */
  async function vNews() {
    const f = SS.get('pp.newsF', 'all');
    const draw = () => {
      const all = S.news;
      const seen = LS.get('pp.seenNews', 0);
      const list = (all || []).filter((n) => f === 'all' || n.k === f);
      const feat = list.find((n) => n.imp) || list[0];
      const rest = list.filter((n) => n !== feat);
      const T = [['all', 'الكل'], ['ins', 'تعليمات'], ['news', 'أخبار'], ['dates', 'مواعيد']];
      app.innerHTML = `<section class="screen">
        ${offlineBar()}
        <header class="bar-top">
          <div class="row"><button class="back" data-go="#/home" aria-label="رجوع">${I.back('#0E1726')}</button><h1>آخر الأخبار والتعليمات</h1></div>
          <div class="chips" role="tablist">${T.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" role="tab" aria-selected="${f === k}" data-nf="${k}">${l}</button>`).join('')}</div>
        </header>
        <main class="list" style="flex:1">
          ${all == null ? '<div class="empty">جارٍ التحميل…</div>'
            : !list.length ? `<div class="empty"><div class="ei" style="background:#E8F1FD">${ic('paper', { s: 30, c: '#1E6FD9' })}</div>لا توجد أخبار هنا بعد</div>`
            : `<button class="feat" data-go="#/news/${feat.id}">
                ${feat.img ? `<div class="ph"><img src="${esc(feat.img)}" alt=""></div>` : ''}
                <div class="bd">
                  <div class="meta">${feat.imp ? '<span class="tag-imp">هام</span>' : ''}${feat.id > seen ? '<span class="tag-new">جديد</span>' : ''}
                    <span>${esc(KIND[feat.k] || 'أخبار')} · ${esc(ago(feat.at))}</span></div>
                  <h2>${esc(feat.t)}</h2>${feat.b ? `<p>${esc(feat.b)}</p>` : ''}
                </div></button>
              ${rest.map((n) => `<button class="item" data-go="#/news/${n.id}">
                <div class="ii">${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy">` : ic('info', { s: 24, c: '#1E6FD9', w: 1.8 })}</div>
                <div class="ix"><span class="kick">${n.imp ? '<span class="tag-imp" style="margin-inline-end:6px">هام</span>' : ''}${esc(KIND[n.k] || 'أخبار')} · ${esc(ago(n.at))}${n.id > seen ? ' · <b style="color:#D62839">جديد</b>' : ''}</span>
                  <span class="t">${esc(n.t)}</span>${n.b ? `<span class="s">${esc(n.b)}</span>` : ''}</div></button>`).join('')}`}
          ${S.meta && S.meta.at ? `<div class="sync" style="padding-top:4px">${ic('sync', { s: 14 })} آخر مزامنة: ${esc(fDT(S.meta.at))}</div>` : ''}
          <div class="sep" style="margin-bottom:calc(14px + var(--sab))">${CREDIT}</div>
        </main>
      </section>`;
    };
    draw();
    await Promise.all([loadNews(), loadMeta()]);
    if (route()[0] !== 'news' || route()[1]) return;
    draw();
    const max = Math.max(0, ...(S.news || []).map((n) => n.id));
    setTimeout(() => LS.set('pp.seenNews', Math.max(LS.get('pp.seenNews', 0), max)), 1500);
  }

  async function vArticle(id) {
    await loadNews();
    const n = (S.news || []).find((x) => String(x.id) === String(id));
    app.innerHTML = `<section class="screen">
      <header class="bar-top"><div class="row"><button class="back" data-go="#/news" aria-label="رجوع">${I.back('#0E1726')}</button>
        <h1>${n ? esc(KIND[n.k] || 'أخبار') : 'الخبر'}</h1></div></header>
      <main class="scroll article" style="background:#fff">
        ${!n ? '<div class="empty">هذا الخبر لم يعد متاحًا</div>' : `
          ${n.img ? `<div class="ph"><img src="${esc(n.img)}" alt=""></div>` : ''}
          <div class="bd">
            <div class="meta">${n.imp ? '<span class="tag-imp">هام</span>' : ''}<span>${esc(fDT(n.at))}</span></div>
            <h2>${esc(n.t)}</h2>
            ${n.b ? `<div class="txt">${esc(n.b)}</div>` : ''}
          </div>`}
        <div class="foot"><div class="sep">${CREDIT}</div></div>
      </main>
    </section>`;
  }

  /* ٤. الدخول */
  function vLogin(errMsg) {
    const list = kids().filter((k) => !S.meta || k.salt === S.meta.salt);
    app.innerHTML = `<section class="screen">
      ${offlineBar()}
      <header style="padding:calc(16px + var(--sat)) 18px 0;display:flex"><button class="back w" data-go="#/home" aria-label="رجوع">${I.back('#0E1726')}</button></header>
      <main class="login">
        <div class="head">
          <img src="icons/logo.png" alt="شعار المركز">
          <h1>بوابة ولي الأمر</h1>
          <p>اكتب الرقم القومي لابنك لعرض غيابه وإنذاراته وعقوباته ورسائل الإدارة إليك</p>
        </div>
        ${list.length ? `<div class="saved"><h2>محفوظ على هذا الجهاز</h2>${list.map((k) => `
          <div class="kid"><div class="av">${esc((k.name || '؟').trim().charAt(0))}</div>
            <button class="nm" data-kid="${esc(k.id)}"><b>${esc(k.name || 'طالب')}</b><span>${esc(k.sub || 'اضغط للعرض')}</span></button>
            <button class="x" data-unkid="${esc(k.id)}" aria-label="إزالة ${esc(k.name || '')} من هذا الجهاز">${ic('x', { s: 18 })}</button></div>`).join('')}</div>` : ''}
        <form class="form" id="lf" autocomplete="off" novalidate>
          <label class="l" for="nid">الرقم القومي للطالب</label>
          <div class="nid" id="nidBox">${ic('card', { c: '#5B6577', w: 1.8 })}
            <input id="nid" name="nid" inputmode="numeric" maxlength="20" dir="ltr" placeholder="14 رقمًا" autocomplete="off" aria-describedby="nidCnt">
          </div>
          <div class="cnt" id="nidCnt"><span id="cN">0 / 14</span><span id="cH">أرقام فقط</span></div>
          ${errMsg ? `<div class="note err" role="alert">${ic('alert', { s: 20, st: 'margin-top:3px' })}<span>${esc(errMsg)}</span></div>` : ''}
          <button class="btn" id="go" type="submit">عرض بيانات الطالب ${I.next('#fff')}</button>
          <label class="chk"><input type="checkbox" id="rem" ${LS.get('pp.remember', true) ? 'checked' : ''}> تذكّر هذا الطالب على هذا الجهاز</label>
        </form>
        <div class="note">${ic('lock', { s: 20, c: '#1658AE', st: 'margin-top:2px' })}<span>بيانات كل طالب محفوظة مشفّرة، ولا تُفتح إلا برقمه القومي. الرقم لا يُحفظ على الجهاز ولا يُرسل إلى أيّ جهة. لا تشارك الرقم القومي لابنك مع أحد.</span></div>
      </main>
      <footer class="foot">${CREDIT}</footer>
    </section>`;
    const inp = $('#nid'), box = $('#nidBox');
    const upd = () => {
      const v = normNid(inp.value).slice(0, 14);
      if (inp.value !== v) inp.value = v;
      $('#cN').textContent = `${v.length} / 14`;
      const ok = /^[23]\d{13}$/.test(v);
      box.classList.toggle('full', ok);
      box.classList.toggle('bad', v.length === 14 && !ok);
      $('#cH').textContent = ok ? 'جاهز' : v.length === 14 ? 'الرقم غير صحيح' : 'أرقام فقط';
    };
    inp.addEventListener('input', upd);
    $('#lf').addEventListener('submit', (e) => { e.preventDefault(); doLogin(); });
    if (!list.length) setTimeout(() => inp.focus(), 300);
  }

  let busy = false;
  async function doLogin() {
    if (busy) return;
    const nid = normNid($('#nid').value);
    if (!/^[23]\d{13}$/.test(nid)) { $('#nidBox').classList.add('bad'); toast('اكتب الرقم القومي كاملًا: 14 رقمًا'); return; }
    const rem = $('#rem').checked;
    LS.set('pp.remember', rem);
    const btn = $('#go');
    busy = true; btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span> جارٍ التحقق…';
    try {
      const meta = await loadMeta(true);
      if (!meta || !meta.salt) throw Object.assign(new Error(), { code: 'nometa' });
      const kid = await derive(nid, meta);
      const data = await openFile(kid);
      kid.name = data.s && data.s.n;
      kid.sub = [YEAR[data.s && data.s.y], data.s && data.s.sp].filter(Boolean).join(' · ');
      S.kid = kid; S.data = data; S.loadedAt = Date.now();
      SS.set('pp.cur', kid);
      if (rem) saveKid(kid);
      busy = false;
      S.greet = true;
      go('#/s');
    } catch (e) {
      busy = false;
      const m = e.code === 404 ? 'لا توجد بيانات بهذا الرقم القومي. تأكّد من الرقم، أو راجع شؤون الطلاب بالمركز.'
        : e.code === 'nometa' || e.code === 503 || navigator.onLine === false ? 'تعذّر الاتصال — تأكّد من اتصالك بالإنترنت ثم حاول مرة أخرى.'
        : e.name === 'OperationError' ? 'تعذّر فتح البيانات — حاول مرة أخرى بعد قليل.'
        : 'حدث خطأ غير متوقّع — حاول مرة أخرى.';
      SND.play('error');
      vLogin(m);
      const i = $('#nid'); i.value = nid; i.dispatchEvent(new Event('input'));
    }
  }

  async function openKid(id) {
    const k = kids().find((x) => x.id === id);
    if (!k) return vLogin();
    S.kid = k; S.data = null; S.greet = true; SS.set('pp.cur', k);
    go('#/s');
  }

  /* ٥. صفحة الطالب — تحميل */
  async function ensureData(force) {
    const kid = currentKid();
    if (!kid) return null;
    if (S.data && !force && Date.now() - S.loadedAt < 5 * 60e3) return S.data;
    try {
      const d = await openFile(kid);
      S.data = d; S.loadedAt = Date.now();
      if (d.s && d.s.n && kid.name !== d.s.n) { kid.name = d.s.n; if (kids().some((x) => x.id === kid.id)) saveKid(kid); }
      return d;
    } catch (e) {
      if (S.data) return S.data;
      throw e;
    }
  }

  const ST = {
    ok: { t: 'منتظم', ink: '#0E7A4C', soft: '#E5F6EE', icon: 'ok' },
    warn: { t: 'عليه إنذار غياب', ink: '#9A5B00', soft: '#FFF4E0', icon: 'alert' },
    dismissed: { t: 'مفصول', ink: '#B3192B', soft: '#FDECEE', icon: 'ban' },
    withdrawn: { t: 'تمّ سحب الملف', ink: '#39424F', soft: '#EEF2F8', icon: 'file' },
  };
  const DAY = {
    a: ['غياب', '#FDECEE', '#B3192B'], e: ['هروب', '#F1E8FD', '#6B2FBF'],
    x: ['بإذن', '#FFF4E0', '#9A5B00'], s: ['مرضي', '#E8F1FD', '#1658AE'],
    d: ['إيقاف تأديبي', '#E6EAF2', '#0B1F44'], l: ['فترة فصل', '#EEF2F8', '#39424F'],
  };
  const unreadMsgs = (d, kid) => (d.m || []).filter((m) => m.id > LS.get(`pp.seenMsg.${kid.id}`, 0)).length;
  const ruleTxt = (r) => r === 'متصل' ? 'غياب متصل' : r === 'منفصل' ? 'غياب منفصل' : (r || '');

  function stHead(d) {
    const s = d.s || {};
    return `<header class="shead">
      <div class="row">
        <img class="lg" src="icons/logo.png" alt="شعار المركز">
        <span class="ttl">بوابة ولي الأمر</span>
        <button class="out" data-a="logout" aria-label="تغيير الطالب أو الخروج">${ic('out', { s: 16, c: '#fff' })} خروج</button>
      </div>
      <div class="who">
        <div class="av">${esc((s.n || '؟').trim().charAt(0))}</div>
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
          <span class="n">${esc(s.n || '')}</span>
          <span class="d">${esc([YEAR[s.y], s.sp, s.f ? `ملف ${s.f}` : ''].filter(Boolean).join(' · '))}</span>
        </div>
      </div>
    </header>`;
  }
  function stNav(on, d, kid) {
    const u = unreadMsgs(d, kid);
    const b = (k, h, icon, l, extra = '') => `<button class="${on === k ? 'on' : ''}" data-go="${h}" ${on === k ? 'aria-current="page"' : ''}>
      ${ic(icon)}${l}${extra}</button>`;
    return `<nav class="nav" aria-label="أقسام صفحة الطالب">
      ${b('sum', '#/s', 'home', 'الملخّص')}
      ${b('abs', '#/s/abs', 'cal', 'الغياب')}
      ${b('msg', '#/s/msg', 'chat', 'الرسائل والعقوبات', u ? `<span class="dot">${u}</span>` : '')}
    </nav>`;
  }
  const stFoot = () => `<div class="sync" style="padding-top:4px">${ic('sync', { s: 14 })} آخر تحديث: ${esc((S.meta && fDT(S.meta.at)) || '—')}</div>
    <div style="padding-top:4px">${CREDIT}</div>`;

  async function vStudent(tab) {
    const kid = currentKid();
    if (!kid) return go('#/login');
    if (!S.data) app.innerHTML = `<section class="screen" style="align-items:center;justify-content:center;gap:14px;color:#5B6577">
      <img src="icons/logo.png" alt="" style="width:84px;height:84px;border-radius:50%"><div>جارٍ تحميل البيانات…</div></section>`;
    let d;
    try { [d] = await Promise.all([ensureData(), loadMeta()]); }
    catch (e) {
      SS.del('pp.cur'); S.kid = null; S.data = null;
      if (e.code === 404) dropKid(kid.id);
      return vLogin(e.code === 404 ? 'لم تعد بيانات هذا الطالب متاحة على البوابة — راجع شؤون الطلاب بالمركز.'
        : 'تعذّر تحميل البيانات — تأكّد من اتصالك بالإنترنت ثم حاول مرة أخرى.');
    }
    const r = route();
    if (r[0] !== 's') return;
    if (tab === 'abs') return vAbsence(d, kid);
    if (tab === 'msg' || tab === 'pen') return vNotices(d, kid, tab);
    return vSummary(d, kid);
  }

  function vSummary(d, kid) {
    if (S.greet !== false) { S.greet = false; SND.play(unreadMsgs(d, kid) ? 'msg' : 'data'); }
    const st = ST[d.st] || ST.ok;
    const c = d.c || {};
    let sub = '';
    if (d.st === 'ok') sub = 'لا إنذارات ولا قرارات فصل — استمرّ في متابعته';
    else if (d.st === 'warn') sub = `صدر إنذار${d.sd ? ` بتاريخ ${fDate(d.sd)}` : ''}${d.sr ? ` — ${ruleTxt(d.sr)}` : ''}. تواصل مع شؤون الطلاب`;
    else if (d.st === 'dismissed') sub = `قرار فصل${d.sd ? ` بتاريخ ${fDate(d.sd)}` : ''} لتجاوز حدّ الغياب — لإعادة القيد راجع شؤون الطلاب`;
    else sub = 'لمعرفة التفاصيل راجع شؤون الطلاب بالمركز';
    const abs = (c.a || 0) + (c.e || 0);
    const msgs = d.m || [];
    const u = unreadMsgs(d, kid);
    const bar = (n, lim, warnAt) => {
      const pct = Math.min(100, lim ? Math.round(n / lim * 100) : 0);
      const col = n >= lim ? '#D62839' : (warnAt && n >= warnAt) ? '#D98A00' : pct >= 70 ? '#D98A00' : '#1E6FD9';
      return `<div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="${lim}" aria-valuenow="${n}"><i style="width:${pct}%;background:${col}"></i></div>`;
    };
    app.innerHTML = `<section class="screen">
      ${offlineBar()}
      ${stHead(d)}
      <main class="smain">
        <section class="status">
          <div class="si" style="background:${st.soft}">${ic(st.icon, { s: 28, c: st.ink, w: 2.2 })}</div>
          <div class="sx"><span class="k">حالة الانتظام</span><span class="v" style="color:${st.ink}">${esc(st.t)}</span>
            <span class="d">${esc(sub)}</span></div>
        </section>
        ${c.p != null ? (() => {
          const rec = (c.p || 0) + abs + (c.x || 0) + (c.s || 0) + (c.d || 0) + (c.l || 0);
          const pct = rec ? Math.round((c.p || 0) / rec * 100) : 0;
          return `<section class="card presence">
            <div class="pi">${ic('ok', { s: 28, c: '#0E7A4C', w: 2.2 })}</div>
            <div class="px"><span class="l">أيام الحضور</span>
              <span class="n">${c.p || 0} <small>${rec ? `من ${rec} ${rec >= 3 && rec <= 10 ? 'أيام' : 'يومًا'} مسجّلًا` : 'لم يُسجَّل حضورٌ بعد'}</small></span>
              ${rec ? `<div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%;background:#0E7A4C"></i></div>` : ''}
            </div>
            ${rec ? `<b class="pct">${pct}%</b>` : ''}
          </section>`; })() : ''}
        <section class="stats">
          <button class="stat" data-go="#/s/abs" data-f="a"><span class="n" style="color:#B3192B">${abs}</span><span class="l">أيام الغياب</span>
            <span class="h">${c.e ? `منها ${c.e} هروب` : 'بدون إذن'}</span></button>
          <button class="stat" data-go="#/s/abs" data-f="e"><span class="n" style="color:#6B2FBF">${c.e || 0}</span><span class="l">هروب</span><span class="h">يُحسب غيابًا</span></button>
          <button class="stat" data-go="#/s/abs" data-f="x"><span class="n" style="color:#9A5B00">${c.x || 0}</span><span class="l">بإذن</span></button>
          <button class="stat" data-go="#/s/abs" data-f="s"><span class="n" style="color:#1658AE">${c.s || 0}</span><span class="l">مرضي</span></button>
          ${c.d ? `<button class="stat" data-go="#/s/abs" data-f="d" style="grid-column:1/-1;flex-direction:row;align-items:center;gap:12px">
            <span class="n" style="color:#0B1F44">${c.d}</span><span style="display:flex;flex-direction:column"><span class="l">أيام إيقاف تأديبي</span><span class="h">تُحتسب غيابًا</span></span></button>` : ''}
        </section>
        ${d.lim ? `<section class="card prog">
          <h2>القرب من حدّ الفصل</h2>
          <div class="prow"><div class="pl"><span>أطول غياب متصل في الفترة الحالية</span><b>${d.lim.cons[0]} من ${d.lim.cons[1]} أيام</b></div>${bar(d.lim.cons[0], d.lim.cons[1], d.lim.wc)}</div>
          <div class="prow"><div class="pl"><span>الغياب المنفصل في الفترة الحالية</span><b>${d.lim.sep[0]} من ${d.lim.sep[1]} يومًا</b></div>${bar(d.lim.sep[0], d.lim.sep[1], d.lim.ws)}</div>
          <div class="phint">يصدر الإنذار عند ${d.lim.wc} أيام غياب متصلة أو ${d.lim.ws} منفصلة، والفصل عند ${d.lim.cons[1]} متصلة أو ${d.lim.sep[1]} منفصلة.</div>
        </section>` : ''}
        ${msgs.length ? `<button class="msgcta" data-go="#/s/msg">
          <div class="mi">${ic('chat', { c: '#fff' })}${u ? `<span class="dot">${u}</span>` : ''}</div>
          <div style="flex:1;display:flex;flex-direction:column;gap:2px;min-width:0">
            <span class="mk">${u ? 'رسالة جديدة من الإدارة' : 'آخر رسالة من الإدارة'}</span>
            <span class="mt">${esc(msgs[0].b)}</span></div></button>` : ''}
        ${stFoot(d)}
      </main>
      ${stNav('sum', d, kid)}
    </section>`;
  }

  function vAbsence(d, kid) {
    const f = SS.get('pp.absF', 'all');
    const days = d.days || [];
    const present = new Set(days.map((x) => x[1]));
    const T = [['all', 'الكل'], ['a', 'غياب'], ['e', 'هروب'], ['x', 'بإذن'], ['s', 'مرضي'], ['d', 'إيقاف'], ['l', 'فترة فصل']]
      .filter(([k]) => k === 'all' || present.has(k) || ['a', 'x', 's'].includes(k));
    const list = days.filter((x) => f === 'all' || x[1] === f);
    const months = [];
    for (const x of list) {
      const p = pd(x[0]); const key = `${MONTHS[p.m - 1]} ${p.y}`;
      let g = months[months.length - 1];
      if (!g || g.k !== key) { g = { k: key, m: MONTHS[p.m - 1], items: [] }; months.push(g); }
      g.items.push(x);
    }
    const w = (d.w || [])[0];
    app.innerHTML = `<section class="screen">
      ${offlineBar()}
      <header class="bar-top">
        <div class="row"><button class="back" data-go="#/s" aria-label="رجوع">${I.back('#0E1726')}</button>
          <div style="display:flex;flex-direction:column;flex:1"><h1>سجل الغياب</h1><span class="sub">${esc(d.s && d.s.n || '')}${d.yr ? ` · العام الدراسي ${esc(d.yr)}` : ''}</span></div></div>
        <div class="chips" role="tablist">${T.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" role="tab" aria-selected="${f === k}" data-af="${k}">${l}</button>`).join('')}</div>
      </header>
      <main class="list" style="flex:1;padding:14px 16px">
        ${d.st === 'dismissed' ? `<section class="banner red">${ic('ban', { s: 24, c: '#B3192B', w: 2.2 })}<div><b>قرار فصل${d.sd ? ` — ${esc(fDate(d.sd))}` : ''}</b><span>${esc(ruleTxt(d.sr) || 'لتجاوز حدّ الغياب')}</span></div></section>`
          : w ? `<section class="banner">${ic('alert', { s: 24, c: '#9A5B00', w: 2.2 })}<div><b>إنذار غياب — ${esc(fDate(w.d))}</b><span>${esc([w.n ? `${daysAr(w.n)} غياب` : '', ruleTxt(w.r)].filter(Boolean).join(' · '))}</span></div></section>` : ''}
        ${!list.length ? `<div class="empty"><div class="ei">${ic('ok', { s: 30, c: '#0E7A4C' })}</div>${f === 'all' ? (d.c && d.c.p ? `لا توجد أيام غياب هذا العام — حضر ${d.c.p} ${d.c.p >= 3 && d.c.p <= 10 ? 'أيام' : d.c.p === 1 ? 'يومًا واحدًا' : d.c.p === 2 ? 'يومين' : 'يومًا'} من ${d.c.p} مسجّلًا` : 'لا توجد أيام غياب مسجّلة هذا العام') : 'لا توجد أيام من هذا النوع'}</div>`
          : months.map((g) => `<section class="month"><h2>${esc(g.k)}</h2><div class="days">${g.items.map((x) => {
              const p = pd(x[0]); const k = DAY[x[1]] || DAY.a;
              return `<div class="day"><div class="dd"><b>${p.d}</b><span>${esc(g.m)}</span></div><span class="wd">${esc(wday(x[0]))}</span>
                <span class="badge" style="background:${k[1]};color:${k[2]}">${k[0]}</span></div>`;
            }).join('')}</div></section>`).join('')}
        ${stFoot(d)}
      </main>
      ${stNav('abs', d, kid)}
    </section>`;
  }

  function vNotices(d, kid, tab) {
    const seen = LS.get(`pp.seenMsg.${kid.id}`, 0);
    const msgs = d.m || [], pens = d.p || [];
    const isMsg = tab !== 'pen';
    const u = unreadMsgs(d, kid);
    const today = todayStr();
    app.innerHTML = `<section class="screen">
      ${offlineBar()}
      <header class="bar-top">
        <div class="row"><button class="back" data-go="#/s" aria-label="رجوع">${I.back('#0E1726')}</button>
          <div style="display:flex;flex-direction:column;flex:1"><h1>الرسائل والعقوبات</h1><span class="sub">${esc(d.s && d.s.n || '')}</span></div></div>
        <div class="seg" role="tablist">
          <button class="${isMsg ? 'on' : ''}" role="tab" aria-selected="${isMsg}" data-go="#/s/msg">معلومات هامة${u && !isMsg ? ` <span class="dot">${u}</span>` : ''}</button>
          <button class="${!isMsg ? 'on' : ''}" role="tab" aria-selected="${!isMsg}" data-go="#/s/pen">العقوبات${pens.length ? ` (${pens.length})` : ''}</button>
        </div>
      </header>
      <main class="list" style="flex:1;padding:14px 16px;gap:12px">
        ${isMsg ? (!msgs.length ? `<div class="empty"><div class="ei" style="background:#E8F1FD">${ic('chat', { s: 30, c: '#1E6FD9' })}</div>لا توجد رسائل من الإدارة لهذا الطالب</div>`
          : msgs.map((m) => `<article class="msg ${m.id > seen ? 'new' : ''}">
              <div class="mh"><img src="icons/logo.png" alt=""><div><b>إدارة جودة وتكنولوجيا التعليم</b><span>${esc(fDT(m.at))}</span></div>
                ${m.id > seen ? '<span class="tag-new">جديد</span>' : ''}</div>
              <p>${esc(m.b)}</p></article>`).join(''))
        : `<div class="note">${ic('info', { s: 20, c: '#1658AE', st: 'margin-top:3px' })}<span>أيام الإيقاف تُحتسب غيابًا. للاستفسار أو تقديم التماس راجع شؤون الطلاب بالمركز.</span></div>
          ${!pens.length ? `<div class="empty"><div class="ei">${ic('ok', { s: 30, c: '#0E7A4C' })}</div>لا توجد عقوبات مسجّلة</div>`
            : pens.map((p) => {
              const C = p.k === 'suspension' ? ['#B3192B', '#FDECEE'] : p.k === 'warning' ? ['#9A5B00', '#FFF4E0']
                : p.k === 'subject_ban' ? ['#6B2FBF', '#F1E8FD'] : ['#0B1F44', '#E6EAF2'];
              const live = p.k === 'suspension' && p.to ? (p.to >= today ? ['نافذ', '#B3192B', '#FDECEE'] : ['انتهى', '#39424F', '#EEF2F8']) : null;
              const when = p.k === 'suspension' && p.f ? `من ${fDate(p.f)}${p.to && p.to !== p.f ? ` إلى ${fDate(p.to)}` : ''}` : fDate(p.d);
              return `<article class="pen"><div class="pi" style="background:${C[1]}">${ic('shield', { s: 24, c: C[0] })}</div>
                <div class="px"><b style="color:${C[0]}">${esc(p.t)}</b><span>${esc(when)}</span></div>
                ${live ? `<span class="badge" style="background:${live[2]};color:${live[1]};font-size:11.5px;padding:3px 10px">${live[0]}</span>` : ''}</article>`;
            }).join('')}`}
        ${stFoot(d)}
      </main>
      ${stNav('msg', d, kid)}
    </section>`;
    if (isMsg && msgs.length) {
      const max = Math.max(...msgs.map((m) => m.id));
      setTimeout(() => LS.set(`pp.seenMsg.${kid.id}`, Math.max(seen, max)), 1200);
    }
  }

  /* ------------------------------------------------ الإعدادات */
  function vSettings() {
    const n = kids().length;
    sheet(`<h2>الإعدادات</h2>
      ${!standalone() ? `<button class="opt" data-a="install">${ic('dl', { c: '#1E6FD9' })}<span>تثبيت التطبيق<small>أضِفه إلى الشاشة الرئيسية ليفتح كتطبيق</small></span></button>` : ''}
      <button class="opt" data-a="sound">${ic(SND.on() ? 'bell' : 'mute', { c: '#1E6FD9' })}<span>أصوات التطبيق: ${SND.on() ? 'تعمل' : 'متوقّفة'}<small>نغمة عند الفتح وعرض البيانات ووصول رسالة أو تحديث</small></span></button>
      <button class="opt" data-a="update">${ic('dl', { c: '#1E6FD9' })}<span>البحث عن تحديث للتطبيق<small>الإصدار الحالي ${esc(BUILD)}</small></span></button>
      <button class="opt" data-a="refresh">${ic('sync', { c: '#1E6FD9' })}<span>تحديث البيانات الآن<small>${S.meta && S.meta.at ? `آخر تحديث: ${esc(fDT(S.meta.at))}` : 'جلب أحدث الأخبار والبيانات'}</small></span></button>
      ${n ? `<button class="opt danger" data-a="forget">${ic('trash', { c: '#B3192B' })}<span>إزالة الطلاب المحفوظين (${n})<small>يُطلب الرقم القومي عند الدخول التالي</small></span></button>` : ''}
      <div class="note" style="margin-top:4px">${ic('info', { s: 20, c: '#1658AE', st: 'margin-top:3px' })}<span>بيانات الطالب تُحدَّث من نظام المركز عند كل مزامنة. لأي استفسار راجع شؤون الطلاب بالمركز.</span></div>
      <div style="text-align:center;font-size:11px;color:#8A93A3" dir="ltr">v ${esc(BUILD)}</div>
      ${CREDIT}`);
  }

  /* ============================================================================
     التوجيه والأحداث
     ============================================================================ */
  async function render() {
    closeSheet();
    const r = route();
    window.scrollTo(0, 0);
    try {
      if (!r[0]) { if (S.splashDone) return location.replace('#/home'); loadMeta(); return vSplash(); }
      if (r[0] === 'home') return vHome();
      if (r[0] === 'news') return r[1] ? vArticle(r[1]) : vNews();
      if (r[0] === 'login') { if (!S.meta) await loadMeta(); return vLogin(); }
      if (r[0] === 's') return vStudent(r[1] || 'sum');
      location.replace('#/home');
    } catch (e) {
      app.innerHTML = `<section class="screen" style="padding:40px 22px;gap:16px"><div class="note err">${ic('alert', { s: 20 })}<span>حدث خطأ — أعد فتح التطبيق.</span></div>
        <button class="btn" data-go="#/home">الرئيسية</button>${CREDIT}</section>`;
    }
  }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-go],[data-a],[data-nf],[data-af],[data-kid],[data-unkid]');
    if (!t) return;
    if (t.dataset.f) SS.set('pp.absF', t.dataset.f);
    if (t.dataset.go) {
      if (t.closest('.nav,.seg,.chips')) SND.play('tap');
      if (t.dataset.go === '#/home') S.splashDone = true;
      if (t.dataset.go === '#/s/abs' && !t.dataset.f && route()[1] !== 'abs') SS.set('pp.absF', 'all');
      return go(t.dataset.go);
    }
    if (t.dataset.nf) { SND.play('tap'); SS.set('pp.newsF', t.dataset.nf); return vNews(); }
    if (t.dataset.af) { SND.play('tap'); SS.set('pp.absF', t.dataset.af); return vAbsence(S.data, currentKid()); }
    if (t.dataset.kid) return openKid(t.dataset.kid);
    if (t.dataset.unkid) { dropKid(t.dataset.unkid); toast('أُزيل من هذا الجهاز'); return vLogin(); }
    const a = t.dataset.a;
    if (a === 'settings') return vSettings();
    if (a === 'install') { closeSheet(); return doInstall(); }
    if (a === 'close') return closeSheet();
    if (a === 'refresh') { closeSheet(); await Promise.all([loadMeta(true), loadNews(true)]); if (S.kid) await ensureData(true).catch(() => {});
      SND.play('fresh'); toast('تمّ تحديث البيانات'); return render(); }
    if (a === 'sound') { SND.set(!SND.on()); if (SND.on()) SND.play('data'); return vSettings(); }
    if (a === 'update') { closeSheet(); return checkUpdateNow(true); }
    if (a === 'do-update') return applyUpdate();
    if (a === 'later') { hideUpd(); S.updLater = true; return; }
    if (a === 'forget') { LS.set('pp.kids', []); closeSheet(); toast('أُزيلت البيانات المحفوظة'); return; }
    if (a === 'logout') { SS.del('pp.cur'); S.kid = null; S.data = null; return go('#/login'); }
  });

  window.addEventListener('hashchange', render);
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && route()[0] === 's' && Date.now() - S.loadedAt > 5 * 60e3) {
      ensureData(true).then(() => render()).catch(() => {});
    }
  });

  /* ============================================================================
     التحديث — رسالةٌ تطلب من وليّ الأمر تحديث التطبيق حين يُرفع إصدارٌ أحدث
     ----------------------------------------------------------------------------
     طريقان يكشفانه: عاملُ الخدمة يجد sw.js جديدًا فينتظر (لا يحلّ وحده)،
     أو meta.json يحمل رقمَ إصدارٍ غير الذي يعمل الآن.
     ============================================================================ */
  let REG = null, reloading = false;
  const swOK = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost');

  function showUpd() {
    if (S.updLater || $('#upd')) return;
    const el = document.createElement('div');
    el.id = 'upd'; el.className = 'upd'; el.setAttribute('role', 'alertdialog');
    el.innerHTML = `<div class="upd-c">
      <div class="upd-i">${ic('dl', { s: 26, c: '#fff' })}</div>
      <div class="upd-t"><b>يتوفّر تحديثٌ جديد للتطبيق</b><span>حدِّث الآن لتحصل على أحدث المزايا والبيانات</span></div>
      <div class="upd-b"><button class="btn" data-a="do-update">تحديث الآن</button><button class="link" data-a="later">لاحقًا</button></div>
    </div>`;
    document.body.appendChild(el);
    SND.play('update');
  }
  const hideUpd = () => { const e = $('#upd'); if (e) e.remove(); };

  function checkVersion() {
    if (!S.meta) return;
    /* بياناتٌ أحدث من آخر ما رآه هذا الجهاز */
    const last = LS.get('pp.lastAt', null);
    if (S.meta.at && last && S.meta.at > last && !S.freshShown) {
      S.freshShown = true;
      setTimeout(() => { SND.play('fresh'); toast('وصلت بيانات جديدة من المركز'); }, 900);
    }
    if (S.meta.at) LS.set('pp.lastAt', S.meta.at);
    /* إصدارٌ أحدث من الذي يعمل */
    if (S.meta.build && BUILD.indexOf('__') !== 0 && S.meta.build !== BUILD) showUpd();
  }

  async function checkUpdateNow(manual) {
    try { if (REG) await REG.update(); } catch (_) {}
    await loadMeta(true);
    const newer = (REG && REG.waiting) || (S.meta && S.meta.build && S.meta.build !== BUILD);
    if (REG && REG.waiting) { S.updLater = false; showUpd(); }
    else if (newer) { S.updLater = false; showUpd(); }
    else if (manual) { SND.play('data'); toast('التطبيق على أحدث إصدار'); }
  }

  async function applyUpdate() {
    const b = $('#upd [data-a="do-update"]');
    if (b) { b.disabled = true; b.innerHTML = '<span class="spin" aria-hidden="true"></span> جارٍ التحديث…'; }
    LS.set('pp.justUpdated', true);
    if (REG && REG.waiting) { REG.waiting.postMessage({ type: 'skip' }); setTimeout(() => location.reload(), 4000); return; }
    /* لا عاملَ ينتظر (متصفح بلا دعم، أو لم يُكتشف بعد): نُفرغ ذاكرة الواجهة ونعيد التحميل */
    try { if (REG) await REG.update(); } catch (_) {}
    if (REG && REG.waiting) { REG.waiting.postMessage({ type: 'skip' }); return; }
    try { const ks = await caches.keys(); await Promise.all(ks.filter((k) => k.startsWith('pp-') && k !== 'pp-data').map((k) => caches.delete(k))); } catch (_) {}
    location.reload();
  }

  if (swOK) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      REG = reg;
      if (reg.waiting && navigator.serviceWorker.controller) showUpd();
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) showUpd();
        });
      });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !LS.get('pp.justUpdated', false)) return;
      reloading = true; location.reload();
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkUpdateNow(false).catch(() => {});
  });
  if (LS.get('pp.justUpdated', false)) {
    LS.del('pp.justUpdated');
    setTimeout(() => { SND.play('update'); toast('تمّ تحديث التطبيق إلى أحدث إصدار'); }, 1200);
  }

  if (!window.crypto || !crypto.subtle) {
    app.innerHTML = `<section class="screen" style="padding:40px 22px;gap:16px"><div class="note err">${ic('alert', { s: 20 })}
      <span>هذا المتصفح قديم ولا يدعم فتح البيانات المشفّرة. حدّث المتصفح أو استخدم Chrome أو Safari حديثًا.</span></div>${CREDIT}</section>`;
    return;
  }
  /* الرجوع إلى صفحة الطالب بعد إعادة الفتح إن كان محفوظًا للجلسة */
  render();
})();
