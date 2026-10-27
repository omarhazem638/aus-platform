/* ================================================================
   AUS — مخزن الكتب (aus_53_book_store.js)  ·  window.AUS_BOOKS
   ----------------------------------------------------------------
   المشكلة: الكتب الضخمة (حتى 100,000 كلمة للكتاب عند «ولّد الكتاب الكامل») كانت تُحفظ كمصفوفة JSON واحدة في localStorage —
   حدّه ≈ 5MB لكل المتصفح، وكل فصل جديد يُعيد تسلسل الكتاب كله وكتابته (O(n²))، وخطأ الامتلاء كان يُبتلع بصمت فيضيع الفصل دون
   أن يعلم أحد. ونصوص الكتب الجاهزة (~315KB) كانت مدمجة في aus_05_paywall.js فتُحمَّل مع المتجر لكل زائر، اشترى أم لم يشترِ.

   الحل (فصل النص عن الكتالوج + تحميل عند الطلب + تخزين محلي كبير):
     • الكتالوج LEADERSHIP_FILES بيانات وصفية فقط. نص كل كتاب/ملف «حزمة» على الخادم: GET /api/books/{id}، تُجلب عند فتحه فقط
       وتُحفظ في IndexedDB (الفتح التالي فوري وبلا اتصال). احتياط اختياري: book_packs/{id}.json بجانب الصفحة (نشر ثابت).
     • الفصول المولّدة: سجلّ IndexedDB لكل فصل + عدّادات (فصول/كلمات/بايتات) تُحدَّث في نفس المعاملة ⇒ إضافة فصل O(1) مهما كبر
       الكتاب، والقارئ يقرأ فصلاً واحداً أو نطاقاً صغيراً فقط (لا يبني الكتاب كله).
     • ترحيل آمن لمفاتيح localStorage القديمة  aus.book.generated.<id>: تُنقل ثم يُتحقَّق منها ولا تُحذف إلا بعد التأكد؛ وإن وُجد
       الطرفان يُدمجان دون فقدان أي فصل.
     • بلا IndexedDB (متصفح قديم/وضع خاص): الواجهة نفسها فوق localStorage بالصيغة القديمة نفسها، وإن تعذّر فالذاكرة.

   الواجهة (كلها Promise ولا ترفض إلا عند الامتلاء/الخطأ الفعلي في الكتابة):
     AUS_BOOKS.getContent(id, {refresh})   → Promise<content|null>   {intro, sections[], example, checklist[], conclusion}
     AUS_BOOKS.peekContent(id)             → content|null (ذاكرة فقط، فوري)
     AUS_BOOKS.why(id)                     → 'network'|'auth'|'missing'|'server'|'bad'|''   سبب آخر فشل في getContent
     AUS_BOOKS.warm(ids)                   → Promise<{fetched, current, failed}>   جلب/تحديث الحزم الناقصة أو القديمة (طلب manifest واحد)
     AUS_BOOKS.cachedIds() / evictContent(id)
     AUS_BOOKS.gen.meta(id) / peekMeta(id) / metaMany(ids)   → {id, chapters, words, bytes, themes[], updated}
     AUS_BOOKS.gen.append(id, {theme, body, ts})              → Promise<meta>   (O(1))
     AUS_BOOKS.gen.get(id, i) / peek(id, i) / range(id, from, count) / all(id) / clear(id)      (i = 0-based)
     AUS_BOOKS.storage() → {backend, usage, quota, persisted} · AUS_BOOKS.persist() · AUS_BOOKS.migrateLegacy()
   حدث: window 'aus-books-changed'  detail = {kind:'gen'|'content'|'migrated', id, meta?}
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_BOOKS) return;

  var DB_NAME = 'aus-books', DB_VER = 1;
  var LEGACY_PREFIX = 'aus.book.generated.';
  var ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;       // نفس قاعدة الخادم (routes/books_routes.py)
  function validId(id) { return typeof id === 'string' && ID_RE.test(id); }      // (String(null) هو "null" — يطابق النمط!)
  var MAX_CHAPTER_CHARS = 60000;                  // فصل أطول من هذا يُقصّ (المولّد يكتب 400–550 كلمة)
  var MAX_THEMES = 2000;                          // عناوين الفصول المحفوظة داخل العدّادات (للفهرس)
  var STALE_MS = 6 * 3600 * 1000;                 // بعدها نتحقق — بطلب manifest واحد — أن الحزمة المحفوظة ما زالت الأحدث
  var NET_TIMEOUT = 12000, OPEN_TIMEOUT = 4000, MIGRATE_TIMEOUT = 8000;
  var WARM_CONCURRENCY = 2;

  // ── helpers ────────────────────────────────────────────────────────
  function noop() {}
  function isFn(f) { return typeof f === 'function'; }
  function wordCount(s) { var m = String(s || '').match(/\S+/g); return m ? m.length : 0; }
  var enc = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
  function utf8Len(s) { s = String(s || ''); try { return enc ? enc.encode(s).length : unescape(encodeURIComponent(s)).length; } catch (e) { return s.length * 2; } }
  function hash32(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
  function apiBase() {
    try { if (window.AUS_SESSION && isFn(window.AUS_SESSION.apiBase)) return window.AUS_SESSION.apiBase(); } catch (e) {}
    return window.AUS_API_BASE || ((typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002');
  }
  function emit(detail) { try { window.dispatchEvent(new CustomEvent('aus-books-changed', { detail: detail })); } catch (e) {} }
  function lsOk() { try { var k = '__aus_probe__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } }

  function LRU(max) { this.max = max; this.m = new Map(); }
  LRU.prototype.get = function (k) { if (!this.m.has(k)) return undefined; var v = this.m.get(k); this.m.delete(k); this.m.set(k, v); return v; };
  LRU.prototype.set = function (k, v) { this.m.delete(k); this.m.set(k, v); while (this.m.size > this.max) this.m.delete(this.m.keys().next().value); };
  LRU.prototype.del = function (k) { this.m.delete(k); };
  LRU.prototype.delPrefix = function (p) { var self = this; Array.from(this.m.keys()).forEach(function (k) { if (k.indexOf(p) === 0) self.m.delete(k); }); };

  // ── the counters kept next to a book's chapters ────────────────────
  function blankMeta(id) { return { id: id, chapters: 0, words: 0, bytes: 0, themes: [], updated: 0 }; }
  function bump(m, ch) {                                     // counters after one more chapter (ch = {theme, words, bytes})
    m.chapters += 1; m.words += ch.words; m.bytes += ch.bytes;
    if (m.themes.length < MAX_THEMES) m.themes.push(ch.theme || '');
    m.updated = Date.now();
    return m;
  }
  function metaFromList(id, list) {
    var m = blankMeta(id);
    list.forEach(function (c) { bump(m, { theme: c.theme, words: wordCount(c.body), bytes: utf8Len(c.body) }); });
    if (list.length) m.updated = Number(list[list.length - 1].ts) || m.updated;
    return m;
  }
  function chapterOut(id, n, c) { return { id: id, n: n, theme: c.theme || '', body: c.body || '', ts: Number(c.ts) || 0, words: c.words != null ? c.words : wordCount(c.body) }; }

  // ════════════════════════════════════════════════════════════════════
  //  BACKENDS — one tiny adapter each; everything above them is shared
  // ════════════════════════════════════════════════════════════════════

  // ── IndexedDB ──────────────────────────────────────────────────────
  function idbOpen() {
    return new Promise(function (resolve, reject) {
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VER); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('gen')) db.createObjectStore('gen', { keyPath: ['id', 'n'] });
        if (!db.objectStoreNames.contains('genMeta')) db.createObjectStore('genMeta', { keyPath: 'id' });
      };
      req.onsuccess = function () {
        var db = req.result;
        db.onversionchange = function () { try { db.close(); } catch (e) {} };      // تبويب آخر يرقّي البنية: نترك الاتصال
        resolve(db);
      };
      req.onerror = function () { reject(req.error || new Error('idb open failed')); };
      req.onblocked = function () { reject(new Error('idb blocked')); };
    });
  }

  function makeIdb(db) {
    // one transaction as a Promise; `work(tx, box)` issues requests and puts its answer in box.v; resolves on COMMIT
    function tx(stores, mode, work) {
      return new Promise(function (resolve, reject) {
        var t, box = { v: undefined };
        try { t = db.transaction(stores, mode); } catch (e) { reject(e); return; }
        t.oncomplete = function () { resolve(box.v); };
        t.onabort = function () { reject(t.error || new Error('transaction aborted')); };
        try { work(t, box); } catch (e) { try { t.abort(); } catch (_) {} reject(e); }
      });
    }
    function range(id, from, to) { return IDBKeyRange.bound([id, from], [id, to]); }
    return {
      name: 'idb',
      packGet: function (id) { return tx('packs', 'readonly', function (t, b) { var r = t.objectStore('packs').get(id); r.onsuccess = function () { b.v = r.result || null; }; }); },
      packPut: function (rec) { return tx('packs', 'readwrite', function (t) { t.objectStore('packs').put(rec); }); },
      packDel: function (id) { return tx('packs', 'readwrite', function (t) { t.objectStore('packs').delete(id); }); },
      packKeys: function () { return tx('packs', 'readonly', function (t, b) { var r = t.objectStore('packs').getAllKeys(); r.onsuccess = function () { b.v = r.result || []; }; }); },
      packList: function () {                                                    // metadata only (the text stays in the database)
        return tx('packs', 'readonly', function (t, b) {
          var out = b.v = [], c = t.objectStore('packs').openCursor();
          c.onsuccess = function () {
            var cur = c.result; if (!cur) return;
            var r = cur.value; out.push({ id: r.id, version: r.version || '', hash: r.hash || '', bytes: r.bytes || 0, savedAt: r.savedAt || 0, source: r.source || '' });
            cur.continue();
          };
        });
      },
      genMetaGet: function (id) { return tx('genMeta', 'readonly', function (t, b) { var r = t.objectStore('genMeta').get(id); r.onsuccess = function () { b.v = r.result || null; }; }); },
      genMetaAll: function () { return tx('genMeta', 'readonly', function (t, b) { var r = t.objectStore('genMeta').getAll(); r.onsuccess = function () { b.v = r.result || []; }; }); },
      // the chapter and the counters change in ONE transaction: both happen or neither does (a full disk cannot leave them disagreeing)
      genAppend: function (id, ch) {
        return tx(['gen', 'genMeta'], 'readwrite', function (t, b) {
          var metas = t.objectStore('genMeta'), gens = t.objectStore('gen'), r = metas.get(id);
          r.onsuccess = function () {
            var m = r.result || blankMeta(id);
            gens.put({ id: id, n: m.chapters, theme: ch.theme, body: ch.body, ts: ch.ts, words: ch.words });
            metas.put(bump(m, ch));
            b.v = m;
          };
        });
      },
      genGet: function (id, n) { return tx('gen', 'readonly', function (t, b) { var r = t.objectStore('gen').get([id, n]); r.onsuccess = function () { b.v = r.result ? chapterOut(id, n, r.result) : null; }; }); },
      genRange: function (id, from, count) {
        if (!(count > 0)) return Promise.resolve([]);
        return tx('gen', 'readonly', function (t, b) {
          var r = t.objectStore('gen').getAll(range(id, from, from + count - 1));
          r.onsuccess = function () { b.v = (r.result || []).map(function (c) { return chapterOut(id, c.n, c); }); };
        });
      },
      genClear: function (id) {
        return tx(['gen', 'genMeta'], 'readwrite', function (t) { t.objectStore('gen').delete(range(id, 0, Infinity)); t.objectStore('genMeta').delete(id); });
      },
      genReplaceAll: function (id, list) {
        return tx(['gen', 'genMeta'], 'readwrite', function (t, b) {
          var gens = t.objectStore('gen'), metas = t.objectStore('genMeta'), m = blankMeta(id);
          gens.delete(range(id, 0, Infinity));
          list.forEach(function (c, i) {
            var ch = { theme: String(c.theme || '').slice(0, 200), body: c.body, ts: Number(c.ts) || 0, words: wordCount(c.body), bytes: utf8Len(c.body) };
            gens.put({ id: id, n: i, theme: ch.theme, body: ch.body, ts: ch.ts, words: ch.words });
            bump(m, ch);
          });
          if (list.length) m.updated = Number(list[list.length - 1].ts) || m.updated;
          metas.put(m); b.v = m;
        });
      }
    };
  }

  // ── localStorage fallback: the OLD single-array format, byte for byte (so nothing is lost and old code can still read it) ──
  function makeLs() {
    function load(id) { try { var a = JSON.parse(localStorage.getItem(LEGACY_PREFIX + id) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function save(id, arr) { localStorage.setItem(LEGACY_PREFIX + id, JSON.stringify(arr)); }   // may throw QuotaExceededError → the caller sees it
    function wrap(fn) { return new Promise(function (resolve, reject) { try { resolve(fn()); } catch (e) { reject(e); } }); }
    return {
      name: 'ls',
      packGet: function () { return Promise.resolve(null); }, packPut: function () { return Promise.resolve(); }, packDel: function () { return Promise.resolve(); },
      packKeys: function () { return Promise.resolve([]); }, packList: function () { return Promise.resolve([]); },
      genMetaGet: function (id) { return wrap(function () { var a = load(id); return a.length ? metaFromList(id, a) : null; }); },
      genMetaAll: function () {
        return wrap(function () {
          var out = [];
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(LEGACY_PREFIX) === 0) { var id = k.slice(LEGACY_PREFIX.length), a = load(id); if (a.length) out.push(metaFromList(id, a)); }
          }
          return out;
        });
      },
      genAppend: function (id, ch) { return wrap(function () { var a = load(id); a.push({ theme: ch.theme, body: ch.body, ts: ch.ts }); save(id, a); return metaFromList(id, a); }); },
      genGet: function (id, n) { return wrap(function () { var c = load(id)[n]; return c ? chapterOut(id, n, c) : null; }); },
      genRange: function (id, from, count) { return wrap(function () { return load(id).slice(from, from + Math.max(0, count)).map(function (c, i) { return chapterOut(id, from + i, c); }); }); },
      genClear: function (id) { return wrap(function () { localStorage.removeItem(LEGACY_PREFIX + id); }); },
      genReplaceAll: function (id, list) { return wrap(function () { save(id, list.map(function (c) { return { theme: c.theme, body: c.body, ts: c.ts }; })); return metaFromList(id, list); }); }
    };
  }

  // ── memory (last resort: no IndexedDB and no localStorage) ──
  function makeMem() {
    var packs = {}, gens = {}, metas = {};
    function ok(v) { return Promise.resolve(v); }
    return {
      name: 'mem',
      packGet: function (id) { return ok(packs[id] || null); }, packPut: function (r) { packs[r.id] = r; return ok(); }, packDel: function (id) { delete packs[id]; return ok(); },
      packKeys: function () { return ok(Object.keys(packs)); },
      packList: function () { return ok(Object.keys(packs).map(function (k) { var r = packs[k]; return { id: r.id, version: r.version || '', hash: r.hash || '', bytes: r.bytes || 0, savedAt: r.savedAt || 0, source: r.source || '' }; })); },
      genMetaGet: function (id) { return ok(metas[id] ? JSON.parse(JSON.stringify(metas[id])) : null); },
      genMetaAll: function () { return ok(Object.keys(metas).map(function (k) { return JSON.parse(JSON.stringify(metas[k])); })); },
      genAppend: function (id, ch) {
        var m = metas[id] || (metas[id] = blankMeta(id)), a = gens[id] || (gens[id] = []);
        a.push({ id: id, n: m.chapters, theme: ch.theme, body: ch.body, ts: ch.ts, words: ch.words });
        return ok(JSON.parse(JSON.stringify(bump(m, ch))));
      },
      genGet: function (id, n) { var c = (gens[id] || [])[n]; return ok(c ? chapterOut(id, n, c) : null); },
      genRange: function (id, from, count) { return ok((gens[id] || []).slice(from, from + Math.max(0, count)).map(function (c, i) { return chapterOut(id, from + i, c); })); },
      genClear: function (id) { delete gens[id]; delete metas[id]; return ok(); },
      genReplaceAll: function (id, list) {
        var m = blankMeta(id);
        gens[id] = list.map(function (c, i) { var ch = { theme: String(c.theme || '').slice(0, 200), body: c.body, ts: Number(c.ts) || 0, words: wordCount(c.body), bytes: utf8Len(c.body) }; bump(m, ch); return { id: id, n: i, theme: ch.theme, body: ch.body, ts: ch.ts, words: ch.words }; });
        if (list.length) m.updated = Number(list[list.length - 1].ts) || m.updated;
        metas[id] = m;
        return ok(JSON.parse(JSON.stringify(m)));
      }
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  READY: open the best backend, then move any legacy localStorage chapters
  // ════════════════════════════════════════════════════════════════════
  var B = null, readyP = null;

  function probe(b) { return b.packPut({ id: '__probe__', v: 1, content: { sections: [] }, savedAt: Date.now() }).then(function () { return b.packDel('__probe__'); }).then(function () { return b; }); }
  function pickBackend() {
    var timeout = new Promise(function (r) { setTimeout(function () { r(null); }, OPEN_TIMEOUT); });
    var idb = (typeof indexedDB !== 'undefined' && indexedDB) ? idbOpen().then(makeIdb).then(probe).catch(function () { return null; }) : Promise.resolve(null);
    return Promise.race([idb, timeout]).then(function (b) { return b || (lsOk() ? makeLs() : makeMem()); });
  }

  function legacyKeys() {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(LEGACY_PREFIX) === 0 && validId(k.slice(LEGACY_PREFIX.length))) out.push(k); } } catch (e) {}
    return out;
  }
  function validChapter(c) { return c && typeof c.body === 'string' && c.body.trim().length > 0; }
  function sig(c) { return (Number(c.ts) || 0) + ':' + String(c.body).length; }

  // One book: the legacy array is merged INTO what IndexedDB already holds (never over it), verified, and only then removed.
  function migrateOne(b, key) {
    var id = key.slice(LEGACY_PREFIX.length), arr;
    try { arr = JSON.parse(localStorage.getItem(key)); } catch (e) { return Promise.resolve('unreadable'); }     // left untouched for a human
    if (!Array.isArray(arr)) return Promise.resolve('unreadable');
    var legacy = arr.filter(validChapter);
    if (!legacy.length) { try { localStorage.removeItem(key); } catch (e) {} return Promise.resolve('empty'); }
    return b.genRange(id, 0, 1e9).then(function (have) {
      var seen = {}; have.forEach(function (c) { seen[sig(c)] = true; });
      var missing = legacy.filter(function (c) { return !seen[sig(c)]; });
      if (!missing.length) { try { localStorage.removeItem(key); } catch (e) {} return 'already'; }
      var merged = have.concat(missing).map(function (c, i) { return { c: c, i: i }; })
        .sort(function (x, y) { return ((Number(x.c.ts) || 0) - (Number(y.c.ts) || 0)) || (x.i - y.i); }).map(function (x) { return x.c; });
      return b.genReplaceAll(id, merged).then(function () {
        return Promise.all([b.genMetaGet(id), b.genGet(id, merged.length - 1), b.genGet(id, 0)]).then(function (r) {
          var m = r[0], last = r[1], first = r[2], want = merged[merged.length - 1], wantFirst = merged[0];
          var good = m && m.chapters === merged.length && last && last.body === want.body && first && first.body === wantFirst.body;
          if (good) { try { localStorage.removeItem(key); } catch (e) {} return 'moved'; }
          return 'unverified';                                                   // keep the legacy copy; try again next time
        });
      });
    }).catch(function () { return 'failed'; });
  }

  // every legacy key, one after the other (a tab that loses the Web Lock race simply finds nothing left to do)
  function runMigration(b) {
    var run = function () {
      var moved = [], failed = [];
      return legacyKeys().reduce(function (p, key) {
        return p.then(function () {
          return migrateOne(b, key).then(function (r) {
            var id = key.slice(LEGACY_PREFIX.length);
            if (r === 'moved' || r === 'already') moved.push(id); else if (r !== 'empty') failed.push(id);
          });
        });
      }, Promise.resolve()).then(function () { if (moved.length) emit({ kind: 'migrated', ids: moved }); return { moved: moved, failed: failed }; });
    };
    try { if (navigator.locks && isFn(navigator.locks.request)) return navigator.locks.request('aus-books-migrate', run); } catch (e) {}
    return run();
  }
  function migrateLegacy() {
    return ready().then(function (b) { return b.name === 'ls' ? { moved: [], failed: [], skipped: 'ls' } : runMigration(b); });     // 'ls': the legacy format IS the storage
  }

  function ready() {
    if (readyP) return readyP;
    readyP = pickBackend().then(function (b) {
      B = b;
      if (b.name === 'ls' || !legacyKeys().length) return b;
      // do not let a stuck migration hold the library hostage: give it a while, then carry on (it keeps running)
      return Promise.race([runMigration(b).catch(noop), new Promise(function (r) { setTimeout(r, MIGRATE_TIMEOUT); })]).then(function () { return b; });
    });
    return readyP;
  }

  // ════════════════════════════════════════════════════════════════════
  //  STATIC TEXTS (the purchased book / file itself)
  // ════════════════════════════════════════════════════════════════════
  var memPacks = new LRU(8);          // id → content (opened this session)
  var flights = {};                   // id → Promise (two callers asking for the same book share one load)
  var failWhy = {};                   // id → reason of the last failed load
  var staleChecked = {};              // id → true once we asked the server whether our copy is current (once per page load)
  var manifestVal = null, manifestAt = 0;

  function validPack(p, id) { return !!(p && p.v === 1 && p.id === id && p.content && Array.isArray(p.content.sections)); }
  function parsePack(text, id) { try { var p = JSON.parse(text); return validPack(p, id) ? p : null; } catch (e) { return null; } }
  function reasonOf(status) { return status === 0 ? 'network' : (status === 401 || status === 403) ? 'auth' : status === 404 ? 'missing' : status >= 500 ? 'server' : 'bad'; }

  function httpGet(url, token) {
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, NET_TIMEOUT) : null;
    var headers = token ? { Authorization: 'Bearer ' + token } : {};
    var done = function (r) { if (timer) clearTimeout(timer); return r; };
    try {
      return fetch(url, { cache: 'no-store', headers: headers, signal: ctl ? ctl.signal : undefined }).then(function (res) {
        var etag = ''; try { etag = (res.headers && res.headers.get('ETag')) || ''; } catch (e) {}
        return res.text().then(function (text) { return done({ ok: res.ok, status: res.status, text: text, version: etag.replace(/^W\//, '').replace(/"/g, '') }); });
      }).catch(function () { return done({ ok: false, status: 0, text: '', version: '' }); });
    } catch (e) { return Promise.resolve(done({ ok: false, status: 0, text: '', version: '' })); }
  }
  // the API is open by default; a deployment with AUS_BOOKS_GATE=signed_in answers 401 and we retry with the session token
  function apiGet(path) {
    var url = apiBase() + path;
    return httpGet(url).then(function (r) {
      if (r.status !== 401) return r;
      var S = window.AUS_SESSION; if (!S || !isFn(S.ensure)) return r;
      return S.ensure().then(function () { var t = S.token && S.token(); return t ? httpGet(url, t) : r; }).catch(function () { return r; });
    });
  }

  // → {pack, text, version, source} | {why}
  function fetchPack(id) {
    return apiGet('/api/books/' + id).then(function (r) {
      var pack = r.ok ? parsePack(r.text, id) : null;
      if (pack) return { pack: pack, text: r.text, version: r.version, source: 'api' };
      var why = r.ok ? 'bad' : reasonOf(r.status);
      if (why === 'auth') return { why: why };                                   // the server wants a sign-in: never look for a public copy behind its back
      return httpGet('book_packs/' + id + '.json').then(function (s) {           // optional static copy shipped next to the page
        var sp = s.ok ? parsePack(s.text, id) : null;
        return sp ? { pack: sp, text: s.text, version: '', source: 'static' } : { why: why };
      });
    });
  }
  function toRecord(got) {
    return { id: got.pack.id, v: 1, version: got.version || '', hash: hash32(got.text), bytes: utf8Len(got.text), savedAt: Date.now(), source: got.source, content: got.pack.content };
  }

  function getContent(id, opts) {
    opts = opts || {};
    if (!validId(id)) return Promise.resolve(null);
    if (!opts.refresh) { var hit = memPacks.get(id); if (hit) return Promise.resolve(hit); }
    if (flights[id]) return flights[id];
    var p = ready().then(function (b) {
      return b.packGet(id).catch(function () { return null; }).then(function (rec) {
        var cached = rec && validPack(rec, id) ? rec : null;
        if (cached && !opts.refresh) { memPacks.set(id, cached.content); failWhy[id] = ''; staleCheck(id, cached); return cached.content; }
        return fetchPack(id).then(function (got) {
          if (got.pack) {
            failWhy[id] = ''; memPacks.set(id, got.pack.content);
            b.packPut(toRecord(got)).then(function () { persistOnce(); emit({ kind: 'content', id: id }); }, noop);
            return got.pack.content;
          }
          failWhy[id] = got.why || 'network';
          var keep = cached ? cached.content : memPacks.get(id);                              // refresh failed: the copy we already hold still reads fine
          if (keep) { memPacks.set(id, keep); return keep; }
          return null;
        });
      });
    }).then(function (c) { delete flights[id]; return c; }, function () { delete flights[id]; failWhy[id] = 'network'; return null; });
    flights[id] = p;
    return p;
  }

  // a saved copy older than STALE_MS is compared with the server's manifest once per page load, quietly, after the book is already open
  function staleCheck(id, rec) {
    if (staleChecked[id] || Date.now() - (rec.savedAt || 0) < STALE_MS) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    staleChecked[id] = true;
    setTimeout(function () { warm([id]).catch(noop); }, 1500);
  }

  function manifest(force) {
    if (!force && manifestVal && Date.now() - manifestAt < 60000) return Promise.resolve(manifestVal);
    return apiGet('/api/books').then(function (r) {
      if (!r.ok) return null;
      try { var m = JSON.parse(r.text); if (m && Array.isArray(m.books)) { manifestVal = m; manifestAt = Date.now(); return m; } } catch (e) {}
      return null;
    });
  }

  function pool(items, limit, worker) {
    var i = 0, out = [];
    function next() {
      if (i >= items.length) return Promise.resolve();
      var it = items[i++];
      return Promise.resolve().then(function () { return worker(it); }).then(function (r) { out.push(r); }, function () { out.push({ id: it, ok: false }); }).then(next);
    }
    var runners = []; for (var k = 0; k < Math.min(limit, items.length); k++) runners.push(next());
    return Promise.all(runners).then(function () { return out; });
  }

  // Fetch what is missing or out of date — ONE manifest request tells which. Quiet by design (it runs while the library is idle).
  function warm(ids) {
    var want = []; (ids || []).forEach(function (id) { if (validId(id) && want.indexOf(id) < 0) want.push(id); });
    if (!want.length) return Promise.resolve({ fetched: [], current: [], failed: [] });
    return ready().then(function (b) {
      return Promise.all([b.packList().catch(function () { return []; }), manifest()]).then(function (res) {
        var have = {}; res[0].forEach(function (r) { have[r.id] = r; });
        var remote = {}; if (res[1]) res[1].books.forEach(function (r) { remote[r.id] = r; });
        var todo = [], current = [];
        want.forEach(function (id) {
          var h = have[id], r = remote[id];
          if (!h || (r && r.version && h.version !== r.version)) todo.push(id); else current.push(id);
        });
        return pool(todo, WARM_CONCURRENCY, function (id) {
          return getContent(id, { refresh: true }).then(function (c) { return { id: id, ok: !!c }; });
        }).then(function (done) {
          return { fetched: done.filter(function (d) { return d.ok; }).map(function (d) { return d.id; }), current: current, failed: done.filter(function (d) { return !d.ok; }).map(function (d) { return d.id; }) };
        });
      });
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  GENERATED CHAPTERS
  // ════════════════════════════════════════════════════════════════════
  var metaCache = {};
  var chapters = new LRU(24);                                       // "id:n" → chapter (what the reader just showed / is about to show)
  var persistAsked = false;
  function persistOnce() { if (persistAsked) return; persistAsked = true; persist().catch(noop); }

  function normChapter(ch) {
    if (!ch || typeof ch.body !== 'string') throw new TypeError('chapter.body must be a string');
    var body = ch.body.length > MAX_CHAPTER_CHARS ? ch.body.slice(0, MAX_CHAPTER_CHARS) : ch.body;
    if (!body.trim()) throw new TypeError('chapter.body is empty');
    return { theme: String(ch.theme || '').slice(0, 200), body: body, ts: Number(ch.ts) || Date.now(), words: wordCount(body), bytes: utf8Len(body) };
  }
  function needId(id) { if (!validId(id)) throw new TypeError('bad book id'); }

  var gen = {
    meta: function (id) {
      try { needId(id); } catch (e) { return Promise.resolve(blankMeta(String(id))); }
      return ready().then(function (b) { return b.genMetaGet(id); }).then(function (m) { m = m || blankMeta(id); metaCache[id] = m; return m; });
    },
    peekMeta: function (id) { return metaCache[id] || null; },
    metaMany: function (ids) {
      return ready().then(function (b) { return b.genMetaAll(); }).then(function (list) {
        var out = {}; list.forEach(function (m) { out[m.id] = m; });
        (ids || []).forEach(function (id) { var m = out[id] || blankMeta(id); out[id] = m; metaCache[id] = m; });
        return out;
      });
    },
    append: function (id, ch) {
      var rec; try { needId(id); rec = normChapter(ch); } catch (e) { return Promise.reject(e); }
      return ready().then(function (b) { return b.genAppend(id, rec); }).then(function (m) {
        metaCache[id] = m;
        chapters.set(id + ':' + (m.chapters - 1), chapterOut(id, m.chapters - 1, rec));
        persistOnce();
        emit({ kind: 'gen', id: id, meta: m });
        return m;
      });
    },
    peek: function (id, i) { return chapters.get(id + ':' + i) || null; },
    get: function (id, i) {
      var hit = chapters.get(id + ':' + i); if (hit) return Promise.resolve(hit);
      return ready().then(function (b) { return b.genGet(id, i); }).then(function (c) { if (c) chapters.set(id + ':' + i, c); return c; });
    },
    range: function (id, from, count) {
      return ready().then(function (b) { return b.genRange(id, Math.max(0, from), count); }).then(function (list) { list.forEach(function (c) { chapters.set(id + ':' + c.n, c); }); return list; });
    },
    all: function (id) { return ready().then(function (b) { return b.genRange(id, 0, 1e9); }); },
    clear: function (id) {
      try { needId(id); } catch (e) { return Promise.reject(e); }
      return ready().then(function (b) { return b.genClear(id); }).then(function () {
        delete metaCache[id]; chapters.delPrefix(id + ':');
        emit({ kind: 'gen', id: id, meta: blankMeta(id) });
      });
    }
  };

  // ════════════════════════════════════════════════════════════════════
  //  STORAGE
  // ════════════════════════════════════════════════════════════════════
  function persist() {
    try { if (navigator.storage && isFn(navigator.storage.persist)) return navigator.storage.persist().catch(function () { return false; }); } catch (e) {}
    return Promise.resolve(false);
  }
  function storage() {
    return ready().then(function (b) {
      var est = (navigator.storage && isFn(navigator.storage.estimate)) ? navigator.storage.estimate().catch(function () { return {}; }) : Promise.resolve({});
      var per = (navigator.storage && isFn(navigator.storage.persisted)) ? navigator.storage.persisted().catch(function () { return false; }) : Promise.resolve(false);
      return Promise.all([est, per]).then(function (r) { return { backend: b.name, usage: r[0].usage || 0, quota: r[0].quota || 0, persisted: !!r[1] }; });
    });
  }

  window.AUS_BOOKS = {
    version: '1.0',
    ready: ready,
    get backend() { return B ? B.name : ''; },
    getContent: getContent,
    peekContent: function (id) { return memPacks.get(id) || null; },
    why: function (id) { return failWhy[id] || ''; },
    warm: warm,
    cachedIds: function () { return ready().then(function (b) { return b.packKeys(); }).catch(function () { return []; }); },
    evictContent: function (id) { memPacks.del(id); return ready().then(function (b) { return b.packDel(id); }).then(function () { emit({ kind: 'content', id: id }); }); },
    gen: gen,
    migrateLegacy: migrateLegacy,
    storage: storage,
    persist: persist
  };

  // open the database and move any old localStorage chapters while the page is idle — before the library or the reader needs them
  try {
    var boot = function () { ready().catch(noop); };
    if (document.readyState === 'complete') setTimeout(boot, 600); else window.addEventListener('load', function () { setTimeout(boot, 600); });
  } catch (e) {}
})();
