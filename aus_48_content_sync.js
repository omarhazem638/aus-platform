/* ================================================================
   AUS — Owner CMS · live content engine   (aus_48_content_sync.js)
   ----------------------------------------------------------------
   What the owner changes from the Admin Panel (specialties, tools, store
   items & prices, questions, platform settings …) is a small "override layer"
   on top of the catalogues that ship with the app (aus_01_data.js,
   aus_05_paywall.js).  This module:

     • keeps that layer in sync with the server database (FastAPI
       /api/content/*) and in localStorage;
     • receives every owner save LIVE (Server-Sent Events, with a polling
       fallback, plus BroadcastChannel between tabs of one browser) and merges
       it IN PLACE into the live arrays/objects the rest of the app already
       reads (specialties, toolsData, leadershipQuestions, challengesData,
       actionsData, LEADERSHIP_FILES) — so nothing else had to change shape;
     • re-draws only the screens that are currently visible, and never wipes
       a quiz / exam the student is in the middle of;
     • for the owner: applies a save to the screen at once (optimistic), writes
       it to localStorage, sends it to the server and reconciles with the
       server's authoritative answer; saves made offline wait in a persisted
       queue and are sent when the connection (or the login) comes back.

   Public API (window.AUS_CONTENT):
     ops(key, [ops], label) → Promise     owner write (see content_store.py for ops)
     entries(key, {spec})   → [{id,item,base,custom,edited,hidden,index}]
     get(key)               → current merged override document (copy)
     status()               → {conn, pending, rev, lastSync, canWrite, ...}
     sync()                 → Promise      pull everything now
     whoami() history() revert(id) exportAll()   (owner helpers)
     on(fn)                 → subscribe to changes   off(fn)
   Events (window): 'aus-content-changed' {key, source, rev}  ·  'aus-content-status'

   Safety valve: add  ?nocms=1  to the URL (or localStorage 'aus.content.off' = '1')
   and the app runs exactly as shipped, with no overrides and no network calls.
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_CONTENT) return;

  var KEYS = ['platform', 'specialties', 'tools', 'store', 'questions', 'challenges', 'actions'];
  var LS_CACHE = 'aus.content.v1';
  var LS_PENDING = 'aus.content.pending.v1';
  var LS_OFF = 'aus.content.off';
  var PERSONALITY = ['autocratic', 'democratic', 'transformational', 'delegative'];

  // ── tiny helpers ─────────────────────────────────────────────────
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; }
  function toMap(arr) { var m = Object.create(null); (arr || []).forEach(function (x) { m[x] = true; }); return m; }
  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsRaw(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSetRaw(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function emit(name, detail) { try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {} }
  function uid() { return 'op' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function rnd(n, alphabet) { var s = ''; for (var i = 0; i < n; i++) s += alphabet.charAt(Math.floor(Math.random() * alphabet.length)); return s; }
  function newId(prefix) { return prefix + rnd(8, '0123456789abcdef'); }
  function newSpecId() { return 'cs' + rnd(8, 'abcdefghijklmnopqrstuvwxyz'); }   // letters only: it appears inside certificate ids
  // same neutralisation the server applies (markup becomes inert text) so the optimistic screen equals the confirmed one
  function cleanText(v) { return typeof v === 'string' ? v.replace(/</g, '＜').replace(/>/g, '＞') : v; }
  function cleanDeep(v) {
    if (typeof v === 'string') return cleanText(v);
    if (Array.isArray(v)) return v.map(cleanDeep);
    if (isObj(v)) { var o = {}; Object.keys(v).forEach(function (k) { o[k] = cleanDeep(v[k]); }); return o; }
    return v;
  }
  function empty(key) { return key === 'platform' ? { values: {} } : { edits: {}, added: [], deleted: [] }; }
  function norm(key, d) {
    var e = empty(key);
    if (!isObj(d)) return e;
    if (key === 'platform') { e.values = isObj(d.values) ? d.values : {}; return e; }
    e.edits = isObj(d.edits) ? d.edits : {}; e.added = Array.isArray(d.added) ? d.added : []; e.deleted = Array.isArray(d.deleted) ? d.deleted : [];
    return e;
  }
  function isEmptyDoc(key, d) {
    if (!d) return true;
    if (key === 'platform') return !Object.keys(d.values || {}).length;
    return !Object.keys(d.edits || {}).length && !(d.added || []).length && !(d.deleted || []).length;
  }
  function apiBase() { return window.AUS_API_BASE || ((typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'); }
  function token() { return lsRaw('aus_access_token'); }
  function lang() { var l = (document.documentElement.getAttribute('lang') || 'ar').toLowerCase(); return l.indexOf('ar') === 0 ? 'ar' : 'en'; }
  function activeSection() { var a = document.querySelector('.section.active'); return a ? a.id : ''; }
  function disabled() {
    try { if (/[?&]nocms=1\b/.test(location.search)) return true; } catch (e) {}
    return lsRaw(LS_OFF) === '1';
  }
  function canWrite() { return !!(window.ausAuth && window.ausAuth.isOwner); }

  // ── state ────────────────────────────────────────────────────────
  var S = {
    rev: 0,                 // highest global revision seen
    server: {},             // key -> {rev, data}   last CONFIRMED document
    view: {},               // key -> data          confirmed + the owner's still-unsent saves (what the app displays)
    pending: [],            // owner saves not yet confirmed: [{id,key,ops,ts,tries,label}]
    waiters: {},            // pending id -> {resolve, reject}
    conn: 'idle',           // idle | live | poll | offline
    lastSync: 0,
    es: null, esFails: 0, pollTimer: null, retryTimer: null, flushing: null, refreshing: null,
    authBlocked: false, applied: {}, listeners: [], bc: null, booted: false
  };
  var BASE = {};            // pristine snapshots of what ships with the app (taken once, never mutated)

  // ── pristine snapshots ───────────────────────────────────────────
  function snapBase() {
    try { if (typeof specialties !== 'undefined' && !BASE.specialties) BASE.specialties = clone(specialties); } catch (e) {}
    try { if (typeof toolsData !== 'undefined' && !BASE.tools) BASE.tools = clone(toolsData); } catch (e) {}
    try { if (typeof leadershipQuestions !== 'undefined' && !BASE.questions) BASE.questions = clone(leadershipQuestions); } catch (e) {}
  }

  // ═════════════════════════════════════════════════════════════════
  // 1. The same item-level operations the server applies (optimistic path)
  // ═════════════════════════════════════════════════════════════════
  function applyOpsLocal(key, doc, ops) {
    var d = norm(key, clone(doc || empty(key)));
    (ops || []).forEach(function (op) {
      var id = op.id, i;
      switch (op.op) {
        case 'replace': d = norm(key, clone(op.data || {})); break;
        case 'clear': d = empty(key); break;
        case 'set': d.values[op.key] = cleanDeep(clone(op.value)); break;
        case 'unset': delete d.values[op.key]; break;
        case 'add': {
          var it = cleanDeep(clone(op.item || {}));
          if (!it.id) it.id = newId('x-');
          d.added = d.added.filter(function (a) { return a.id !== it.id; }); d.added.push(it);
          d.deleted = d.deleted.filter(function (x) { return x !== it.id; });
          break;
        }
        case 'edit': {
          var f = cleanDeep(clone(op.fields || {})), idx = -1;
          for (i = 0; i < d.added.length; i++) if (d.added[i].id === id) idx = i;
          if (idx >= 0) {
            Object.keys(f).forEach(function (k) { if (f[k] === null) delete d.added[idx][k]; else d.added[idx][k] = f[k]; });
          } else {
            var cur = assign({}, d.edits[id]);
            Object.keys(f).forEach(function (k) { if (f[k] === null) delete cur[k]; else cur[k] = f[k]; });
            if (Object.keys(cur).length) d.edits[id] = cur; else delete d.edits[id];
          }
          break;
        }
        case 'delete':
          if (d.added.some(function (a) { return a.id === id; })) { d.added = d.added.filter(function (a) { return a.id !== id; }); delete d.edits[id]; }
          else if (d.deleted.indexOf(id) === -1) d.deleted.push(id);
          break;
        case 'restore': d.deleted = d.deleted.filter(function (x) { return x !== id; }); break;
        case 'reset': delete d.edits[id]; break;
      }
    });
    return d;
  }

  function recomputeView(key) {
    var base = S.server[key] ? S.server[key].data : empty(key);
    var d = norm(key, clone(base));
    // the owner's still-unsent saves stay visible on the owner's own screen only — never for another account on this browser
    if (canWrite()) S.pending.forEach(function (p) { if (p.key === key) d = applyOpsLocal(key, d, p.ops); });
    S.view[key] = d;
  }

  // ═════════════════════════════════════════════════════════════════
  // 2. Appliers — merge the override layer into the live data, in place
  // ═════════════════════════════════════════════════════════════════
  function findSpec(id) { for (var i = 0; i < specialties.length; i++) if (specialties[i].id === id) return specialties[i]; return null; }
  function specName(id) {
    var s = findSpec(id); if (s) return s.name;
    var b = (BASE.specialties || []).filter(function (x) { return x.id === id; })[0]; if (b) return b.name;
    var a = ((S.view.specialties || empty('specialties')).added || []).filter(function (x) { return x.id === id; })[0];
    return a ? a.name : id;
  }

  function applySpecialties() {
    var d = S.view.specialties || empty('specialties');
    var isEmpty = isEmptyDoc('specialties', d);
    if (isEmpty && !S.applied.specialties) return;
    S.applied.specialties = !isEmpty;
    var del = toMap(d.deleted), out = [];
    (BASE.specialties || []).forEach(function (s) {
      if (del[s.id]) return;
      var e = d.edits[s.id], o = assign({}, s);
      if (e) ['name', 'icon', 'desc'].forEach(function (f) { if (e[f] != null) o[f] = e[f]; });
      out.push(o);
    });
    d.added.forEach(function (a) { if (!del[a.id]) out.push({ id: a.id, name: a.name, icon: a.icon || '🎓', desc: a.desc || '', tools: 0, custom: true }); });
    specialties.length = 0; Array.prototype.push.apply(specialties, out);
  }

  function visibleToolCount(sid) { return (toolsData[sid] || []).filter(function (t) { return !t.hidden; }).length; }

  function applyTools() {
    var d = S.view.tools || empty('tools');
    var isEmpty = isEmptyDoc('tools', d);
    if (isEmpty && !S.applied.tools) {
      specialties.forEach(function (s) { if (!toolsData[s.id]) toolsData[s.id] = []; });   // a new specialty starts with an empty tool list
      return;
    }
    S.applied.tools = !isEmpty;
    var del = toMap(d.deleted), ids = Object.keys(BASE.tools || {});
    specialties.forEach(function (s) { if (ids.indexOf(s.id) === -1) ids.push(s.id); });
    d.added.forEach(function (a) { if (ids.indexOf(a.spec) === -1) ids.push(a.spec); });
    var built = {};
    ids.forEach(function (sid) {
      var out = [];
      (BASE.tools[sid] || []).forEach(function (t, i) {
        var id = sid + ':' + i, e = d.edits[id], o = clone(t);          // a fresh copy: an edit can never leak back into BASE
        if (e) ['name', 'icon', 'desc', 'learn'].forEach(function (f) { if (e[f] != null) o[f] = clone(e[f]); });
        if (del[id]) o.hidden = true;                                    // soft-hidden: the position (and so its certificate id) is kept
        out.push(o);
      });
      d.added.forEach(function (a) {
        if (a.spec !== sid || del[a.id]) return;
        out.push({ name: a.name, icon: a.icon || '🛠️', desc: a.desc || '', learn: clone(a.learn), _cid: a.id });
      });
      built[sid] = out;
    });
    Object.keys(built).forEach(function (sid) {
      var arr = toolsData[sid] || (toolsData[sid] = []);
      arr.length = 0; Array.prototype.push.apply(arr, built[sid]);
    });
    Object.keys(toolsData).forEach(function (sid) { if (!(BASE.tools || {})[sid] && !built[sid]) delete toolsData[sid]; });
  }

  function genFor(kind, sid) {
    var gen = window[kind === 'challenges' ? 'generateChallenges' : 'generateActions'];
    try { return typeof gen === 'function' ? gen(specName(sid)) : []; } catch (e) { return []; }
  }
  var GEN_FIELDS = { challenges: ['scenario', 'options', 'correct', 'xp'], actions: ['scenario', 'actions'] };

  function applyGenerated(kind, store) {
    var d = S.view[kind] || empty(kind);
    var anyOverride = !isEmptyDoc(kind, d) || !isEmptyDoc('specialties', S.view.specialties || empty('specialties'));
    if (!anyOverride && !S.applied[kind]) return;                       // nothing to change yet: keep the originals untouched
    S.applied[kind] = anyOverride;
    var del = toMap(d.deleted), keep = {};
    specialties.forEach(function (s) {
      var sid = s.id, out = [];
      genFor(kind, sid).forEach(function (it, i) {
        var id = sid + ':' + i; if (del[id]) return;
        var e = d.edits[id], o = it;
        if (e) { o = assign({}, it); GEN_FIELDS[kind].forEach(function (f) { if (e[f] != null) o[f] = clone(e[f]); }); }
        out.push(o);
      });
      d.added.forEach(function (a) {
        if (a.spec !== sid || del[a.id]) return;
        var o = {}; GEN_FIELDS[kind].forEach(function (f) { if (a[f] != null) o[f] = clone(a[f]); }); out.push(o);
      });
      store[sid] = out; keep[sid] = true;
    });
    Object.keys(store).forEach(function (sid) { if (!keep[sid] && !findSpec(sid)) { var isBase = (BASE.specialties || []).some(function (b) { return b.id === sid; }); if (!isBase) delete store[sid]; } });
  }

  function applyQuestions() {
    var d = S.view.questions || empty('questions');
    var isEmpty = isEmptyDoc('questions', d);
    if (isEmpty && !S.applied.questions) return;
    S.applied.questions = !isEmpty;
    var del = toMap(d.deleted), out = [];
    (BASE.questions || []).forEach(function (q, i) {
      var id = 'q' + i; if (del[id]) return;
      var e = d.edits[id], o = clone(q);
      if (e) { if (e.q != null) o.q = e.q; if (e.options != null) o.options = clone(e.options); }
      out.push(o);
    });
    d.added.forEach(function (a) { if (!del[a.id]) out.push({ q: a.q, options: clone(a.options), personality: PERSONALITY.slice() }); });
    leadershipQuestions.length = 0; Array.prototype.push.apply(leadershipQuestions, out);
  }

  function applyData() {   // specialties → tools → challenges → actions → counts (they depend on one another)
    [applySpecialties, applyTools,
      function () { applyGenerated('challenges', challengesData); },
      function () { applyGenerated('actions', actionsData); },
      function () { if (typeof specialties !== 'undefined') specialties.forEach(function (s) { s.tools = visibleToolCount(s.id); }); }
    ].forEach(function (fn) { try { fn(); } catch (e) { warn('apply', e); } });
  }

  function applyStore() {
    var d = S.view.store || empty('store');
    if (window.catalogAdmin && typeof window.catalogAdmin.applyDoc === 'function') window.catalogAdmin.applyDoc(d);
  }

  // ── platform settings (DOM + globals) ────────────────────────────
  var PL = { origTitle: null, dismissed: null };
  function injectStyles() {
    if (document.getElementById('cms-live-styles')) return;
    var s = document.createElement('style'); s.id = 'cms-live-styles';
    s.textContent =
      '.cms-banners{display:flex;flex-direction:column;gap:8px;padding:8px 16px 0;position:relative;z-index:1001}' +
      '.cms-banners:empty{display:none}' +
      '.cms-bar{display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:18px;background:rgba(255,255,255,.06);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);' +
      'border:1px solid rgba(255,255,255,.12);box-shadow:0 20px 50px rgba(0,0,0,.4);color:#fff;font-family:"Tajawal",sans-serif;font-size:.92rem;line-height:1.7;animation:cmsIn .45s ease}' +
      '@keyframes cmsIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}' +
      '.cms-bar .ic{font-size:1.15rem;flex:none}.cms-bar .tx{flex:1;min-width:0;overflow-wrap:anywhere}' +
      '.cms-bar.info{border-color:rgba(0,212,255,.38)}.cms-bar.success{border-color:rgba(105,240,174,.42)}.cms-bar.warning{border-color:rgba(255,215,0,.5)}' +
      '.cms-bar a.go{flex:none;text-decoration:none;color:#1a1000;background:linear-gradient(135deg,#ffd700,#ff9500);border-radius:50px;padding:5px 14px;font-weight:800;font-size:.8rem}' +
      '.cms-bar button.x{flex:none;background:none;border:0;color:rgba(255,255,255,.6);cursor:pointer;font-size:1.2rem;line-height:1;padding:2px 6px}.cms-bar button.x:hover{color:#fff}' +
      '[data-cms-hidden="1"]{display:none!important}' +
      '.nav-tab[data-cms-owner-hidden="1"]{outline:1px dashed rgba(255,215,0,.6);outline-offset:-3px;opacity:.7}';
    document.head.appendChild(s);
  }
  function bannersHost() {
    var host = document.getElementById('cms-banners');
    if (host) return host;
    var app = document.getElementById('main-app'); if (!app) return null;
    host = document.createElement('div'); host.id = 'cms-banners'; host.className = 'cms-banners'; host.setAttribute('aria-live', 'polite');
    app.insertBefore(host, app.firstChild);
    return host;
  }
  function dismissedSet() { if (!PL.dismissed) PL.dismissed = lsGet('aus.cms.dismissed', {}) || {}; return PL.dismissed; }
  function hashText(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'a' + (h >>> 0).toString(36); }
  function pick2(o) { if (!o) return ''; return (o[lang()] || o[lang() === 'ar' ? 'en' : 'ar'] || '').trim(); }

  function applyPlatform() {
    var v = (S.view.platform || empty('platform')).values || {};
    window.AUS_PLATFORM = v;
    injectStyles();
    // brand name + page title
    if (PL.origTitle === null) PL.origTitle = document.title;
    var name = pick2(v.siteName), tag = pick2(v.tagline);
    document.querySelectorAll('[data-cms="siteName"]').forEach(function (el) {
      if (el.dataset.cmsOrig === undefined) el.dataset.cmsOrig = el.textContent;
      el.textContent = name || el.dataset.cmsOrig;
    });
    document.title = name ? (name + (tag ? ' — ' + tag : '')) : PL.origTitle;
    // banners
    var host = bannersHost();
    if (host) {
      var html = '';
      var m = v.maintenance;
      if (m && m.enabled && pick2(m)) html += bar('cms-maint', 'warning', '🛠️', pick2(m), '', false);
      var a = v.announcement;
      if (a && a.enabled && pick2(a) && !(a.expires && Date.parse(a.expires) < Date.now())) {
        var key = hashText(pick2(a) + '|' + (a.level || '') + '|' + (a.url || ''));
        if (!dismissedSet()[key]) html += bar(key, a.level || 'info', a.level === 'warning' ? '⚠️' : a.level === 'success' ? '🎉' : '📢', pick2(a), a.url || '', true);
      }
      if (host.getAttribute('data-sig') !== html) { host.innerHTML = html; host.setAttribute('data-sig', html); }
    }
    // hidden sections (the owner still sees them, marked)
    var hidden = toMap(v.hiddenTabs || []), owner = canWrite();
    document.querySelectorAll('.nav-tab').forEach(function (t) {
      var m2 = /showSection\('([^']+)'\)/.exec(t.getAttribute('onclick') || ''), id = m2 && m2[1];
      var h = !!(id && hidden[id] && id !== 'adminpanel');
      if (h && !owner) { t.setAttribute('data-cms-hidden', '1'); t.removeAttribute('data-cms-owner-hidden'); }
      else { t.removeAttribute('data-cms-hidden'); if (h) t.setAttribute('data-cms-owner-hidden', '1'); else t.removeAttribute('data-cms-owner-hidden'); }
    });
    // certificate prices (display copy — the server enforces its own)
    try {
      var core = window._AUS_CERT_CORE, cp = v.certPrices;
      if (core && core.CERT_CONFIG) {
        if (!PL.certDefaults) PL.certDefaults = { knowledge: core.CERT_CONFIG.knowledge.price, practical: core.CERT_CONFIG.practical.price };
        ['knowledge', 'practical'].forEach(function (t) { core.CERT_CONFIG[t].price = (cp && cp[t] != null) ? +cp[t] : PL.certDefaults[t]; });
      }
    } catch (e) {}
  }
  function bar(id, level, icon, text, url, dismissible) {
    if (!/^(https?:\/\/|#)/i.test(String(url || ''))) url = '';                  // the server only stores http(s) links; never trust a `javascript:` one on screen either
    if (!/^(info|success|warning)$/.test(level)) level = 'info';
    return '<div class="cms-bar ' + level + '" data-id="' + id + '" role="status"><span class="ic">' + icon + '</span><span class="tx">' + escHtml(text) + '</span>' +
      (url ? '<a class="go" href="' + escAttr(url) + '" target="_blank" rel="noopener noreferrer">' + (lang() === 'ar' ? 'التفاصيل' : 'Details') + '</a>' : '') +
      (dismissible ? '<button class="x" type="button" aria-label="' + (lang() === 'ar' ? 'إغلاق' : 'Dismiss') + '" onclick="AUS_CONTENT._dismiss(\'' + id + '\')">×</button>' : '') + '</div>';
  }
  function escHtml(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function escAttr(t) { return escHtml(t).replace(/'/g, '&#39;'); }

  // ── apply one document + redraw what is visible ───────────────────
  function applyKey(key, source) {
    try {
      if (key === 'platform') applyPlatform();
      else if (key === 'store') applyStore();
      else if (key === 'questions') applyQuestions();
      else applyData();
    } catch (e) { warn('apply ' + key, e); }
    try { refreshViews(key); } catch (e) { warn('refresh ' + key, e); }
    emit('aus-content-changed', { key: key, source: source || 'local', rev: S.server[key] ? S.server[key].rev : 0 });
    S.listeners.forEach(function (fn) { try { fn(key, source); } catch (e) {} });
  }
  function warn(what, e) { try { console.warn('[AUS_CONTENT] ' + what + ':', e); } catch (x) {} }

  // Redraw ONLY what the student is looking at, and never over an activity in progress (a quiz, a learn page, an exam).
  function refreshViews(key) {
    var sec = activeSection();
    if (key === 'specialties' || key === 'tools' || key === 'challenges' || key === 'actions') {
      if (sec === 'home' && typeof renderSpecialties === 'function') renderSpecialties();
      else if (sec === 'tools' && typeof renderToolsList === 'function') {
        var area = document.getElementById('toolQuizArea');
        if (!area || !area.children.length) renderToolsList();                 // not while a learn page / quiz is open
      } else if (sec === 'toolsindex' && typeof window.renderToolsIndex === 'function') window.renderToolsIndex();
      else if (sec === 'certifications' && typeof window.renderCertificationsHub === 'function' && document.querySelector('#certifications .cert-spec-card')) window.renderCertificationsHub();
      else if (sec === 'challenges' && typeof renderChallenges === 'function' && typeof currentChallenge !== 'undefined' && !currentChallenge) renderChallenges();
      else if (sec === 'actions' && typeof renderActions === 'function' && typeof currentAction !== 'undefined' && !currentAction) renderActions();
    }
  }

  function applyAll(source) {
    ['platform', 'specialties', 'store', 'questions'].forEach(function (k) { applyKey(k, source); });   // `specialties` also runs tools/challenges/actions
  }

  // ═════════════════════════════════════════════════════════════════
  // 3. Documents: accept, persist, share with other tabs
  // ═════════════════════════════════════════════════════════════════
  function persistCache() {
    var docs = {};
    Object.keys(S.server).forEach(function (k) { docs[k] = { rev: S.server[k].rev, data: S.server[k].data }; });
    lsSet(LS_CACHE, { rev: S.rev, docs: docs, at: Date.now() });
  }
  function savePending() { lsSet(LS_PENDING, S.pending.map(function (p) { return { id: p.id, key: p.key, ops: p.ops, ts: p.ts, tries: p.tries, label: p.label }; })); }

  function acceptDoc(key, rev, data, source, force) {
    if (KEYS.indexOf(key) === -1) return false;
    var cur = S.server[key];
    if (cur && rev <= cur.rev && !force) return false;
    S.server[key] = { rev: rev, data: norm(key, data) };
    if (rev > S.rev || force) S.rev = rev;
    S.lastSync = Date.now();
    persistCache();
    recomputeView(key);
    applyKey(key, source);
    if (source !== 'tab' && source !== 'cache' && S.bc) { try { S.bc.postMessage({ t: 'doc', key: key, rev: rev, data: S.server[key].data }); } catch (e) {} }
    emitStatus();
    return true;
  }

  function loadCache() {
    var c = lsGet(LS_CACHE, null);
    if (c && isObj(c.docs)) {
      S.rev = c.rev || 0;
      Object.keys(c.docs).forEach(function (k) {
        if (KEYS.indexOf(k) !== -1 && c.docs[k] && isObj(c.docs[k].data)) { S.server[k] = { rev: c.docs[k].rev || 0, data: norm(k, c.docs[k].data) }; }
      });
    }
    var p = lsGet(LS_PENDING, []);
    if (Array.isArray(p)) S.pending = p.filter(function (e) { return e && KEYS.indexOf(e.key) !== -1 && Array.isArray(e.ops); });
    KEYS.forEach(recomputeView);
  }

  // ═════════════════════════════════════════════════════════════════
  // 4. Network
  // ═════════════════════════════════════════════════════════════════
  function rawFetch(method, path, body, tok) {
    var headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000) : null;
    return fetch(apiBase() + path, { method: method, headers: headers, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, status: res.status, data: data || {} }; });
      })
      .catch(function () { if (timer) clearTimeout(timer); return { ok: false, status: 0, data: { detail: 'network' } }; });
  }
  function refreshTokens(used) {
    // ONE refresher for the whole app (aus_52_session.js): rotating refresh tokens must never be spent by two modules at once
    if (window.AUS_SESSION) return window.AUS_SESSION.refresh();
    if (S.refreshing) return S.refreshing;
    if (token() && token() !== used) return Promise.resolve(true);        // another module / tab already refreshed (refresh tokens ROTATE)
    var rt = lsRaw('aus_refresh_token'); if (!rt) return Promise.resolve(false);
    S.refreshing = rawFetch('POST', '/api/auth/refresh', { refresh_token: rt }).then(function (r) {
      S.refreshing = null;
      if (!(r.ok && r.data.access_token)) return false;
      lsSetRaw('aus_access_token', r.data.access_token); if (r.data.refresh_token) lsSetRaw('aus_refresh_token', r.data.refresh_token);
      return true;
    });
    return S.refreshing;
  }
  function authed(method, path, body) {
    var t = token();
    return rawFetch(method, path, body, t).then(function (r) {
      if (r.status !== 401) return r;
      return refreshTokens(t).then(function (ok) { return ok ? rawFetch(method, path, body, token()) : r; });
    });
  }

  function setConn(c) { if (S.conn !== c) { S.conn = c; emitStatus(); } }
  function status() {
    return { conn: S.conn, pending: S.pending.length, rev: S.rev, lastSync: S.lastSync, canWrite: canWrite(), authBlocked: S.authBlocked, disabled: disabled() };
  }
  function emitStatus() { emit('aus-content-status', status()); }

  function reconcileManifest(m) {
    if (!m || !isObj(m.docs)) return Promise.resolve();
    var jobs = [];
    Object.keys(m.docs).forEach(function (k) {
      var cur = S.server[k];
      if (KEYS.indexOf(k) !== -1 && (!cur || m.docs[k].rev > cur.rev)) jobs.push(fetchDoc(k));
    });
    return Promise.all(jobs);
  }
  function fetchDoc(key) {
    return rawFetch('GET', '/api/content/doc/' + encodeURIComponent(key)).then(function (r) {
      if (r.ok && r.data && r.data.data) acceptDoc(key, r.data.rev || 0, r.data.data, 'live');
    });
  }

  // First load / resync: ONE request returns every document.
  function sync() {
    return rawFetch('GET', '/api/content/snapshot').then(function (r) {
      if (!r.ok || !isObj(r.data.docs)) { if (r.status === 0) setConn(navigator.onLine === false ? 'offline' : S.conn === 'live' ? 'live' : 'poll'); return false; }
      var snap = r.data, rewind = typeof snap.rev === 'number' && snap.rev < S.rev;   // the server database was reset / restored: follow it
      if (rewind) { S.server = {}; S.rev = 0; }
      KEYS.forEach(function (k) {
        var d = snap.docs[k];
        if (d) acceptDoc(k, d.rev || 0, d.data, 'live', rewind);
        else if (rewind || !S.server[k]) {                                      // the server holds nothing for this document: it is "empty", not "unknown"
          S.server[k] = { rev: 0, data: empty(k) }; recomputeView(k); applyKey(k, 'live');
        }
      });
      persistCache();
      S.rev = Math.max(S.rev, snap.rev || 0); S.lastSync = Date.now(); persistCache();
      if (S.conn === 'idle' || S.conn === 'offline') setConn('poll');
      emitStatus();
      return true;
    });
  }

  // Live stream (Server-Sent Events); polling is the safety net.
  function connectStream() {
    if (S.es || typeof EventSource === 'undefined' || disabled()) { if (!S.es) startPolling(); return; }
    var es;
    try { es = new EventSource(apiBase() + '/api/content/stream'); } catch (e) { startPolling(); return; }
    S.es = es;
    es.addEventListener('hello', function (e) {
      S.esFails = 0; S.lastSync = Date.now(); setConn('live'); stopPolling();
      try { reconcileManifest(JSON.parse(e.data)); } catch (x) {}
      if (S.pending.length) { clearTimeout(S.retryTimer); flush(); }               // the server is back: send what was saved while it was away
    });
    es.addEventListener('change', function (e) {
      var ev; try { ev = JSON.parse(e.data); } catch (x) { return; }
      if (ev.doc) acceptDoc(ev.key, ev.rev, ev.doc, 'live'); else fetchDoc(ev.key);
    });
    es.addEventListener('bye', function () { /* the server rotated / is restarting the stream: EventSource reconnects by itself */ });
    es.onerror = function () {
      S.esFails++;
      setConn(navigator.onLine === false ? 'offline' : 'poll');
      if (es.readyState === 2) {                                          // CLOSED for good (HTTP error from the server): retry later by hand
        try { es.close(); } catch (x) {}
        S.es = null; startPolling();
        clearTimeout(S.retryTimer); S.retryTimer = setTimeout(connectStream, Math.min(60000, 5000 * Math.pow(2, Math.min(S.esFails, 4))));
      } else if (S.esFails >= 3) startPolling();                         // flapping connection: poll while EventSource keeps trying
    };
  }
  function startPolling() {
    if (S.pollTimer || disabled()) return;
    S.pollTimer = setInterval(function () {
      if (document.hidden) return;
      rawFetch('GET', '/api/content/manifest').then(function (r) {
        if (r.ok) { if (S.conn !== 'live') setConn('poll'); reconcileManifest(r.data); if (S.pending.length && !S.flushing) { clearTimeout(S.retryTimer); flush(); } }
        else if (r.status === 0) setConn(navigator.onLine === false ? 'offline' : 'poll');
      });
    }, 15000);
  }
  function stopPolling() { if (S.pollTimer) { clearInterval(S.pollTimer); S.pollTimer = null; } }

  // ═════════════════════════════════════════════════════════════════
  // 5. Owner writes: optimistic → persisted queue → server → reconcile
  // ═════════════════════════════════════════════════════════════════
  function ops(key, list, label) {
    if (KEYS.indexOf(key) === -1) return Promise.reject({ code: 'unknown_key' });
    if (disabled()) return Promise.reject({ code: 'disabled', message: 'the content engine is switched off (?nocms=1)' });
    if (!canWrite()) return Promise.reject({ code: 'owner_only', message: 'only the owner can edit content' });
    if (!Array.isArray(list) || !list.length) return Promise.reject({ code: 'bad_type' });
    var e = { id: uid(), key: key, ops: clone(list), ts: Date.now(), tries: 0, label: label || '' };
    S.pending.push(e); savePending();
    recomputeView(key); applyKey(key, 'local'); persistCache(); emitStatus();   // the screen changes NOW
    var p = new Promise(function (resolve, reject) { S.waiters[e.id] = { resolve: resolve, reject: reject }; });
    flush();
    return p;
  }

  var RETRY_MS = [2000, 5000, 15000, 30000, 60000];
  function flush() {
    if (S.flushing) return S.flushing;
    if (!S.pending.length) return Promise.resolve();
    var run = function () {
      var e = S.pending[0];
      if (!e) return Promise.resolve();
      if (!token()) {                                                         // owner is signed in locally but has no server session yet
        S.authBlocked = true; emitStatus();
        S.pending.forEach(function (p) { var w0 = S.waiters[p.id]; if (w0) { delete S.waiters[p.id]; w0.resolve({ ok: true, queued: true, reason: 'login' }); } });
        return Promise.resolve();
      }
      return authed('POST', '/api/content/ops/' + encodeURIComponent(e.key), { ops: e.ops }).then(function (r) {
        var w = S.waiters[e.id];
        if (r.ok && r.data && r.data.data) {
          S.pending.shift(); delete S.waiters[e.id]; savePending(); S.authBlocked = false;
          acceptDoc(e.key, r.data.rev, r.data.data, 'own');
          if (w) w.resolve({ ok: true, rev: r.data.rev, applied: r.data.applied || [], key: e.key });
          return run();
        }
        if (r.status === 422 || r.status === 404) {                         // the server refused THIS save: drop it, show the truth again
          S.pending.shift(); delete S.waiters[e.id]; savePending();
          recomputeView(e.key); applyKey(e.key, 'local'); persistCache(); emitStatus();
          var err = (r.data && r.data.error) || { code: 'invalid', message: 'rejected by the server' };
          if (w) w.reject(err);
          return run();
        }
        if (r.status === 401 || r.status === 403 || r.status === 503) {      // not signed in on the server / not the owner / gate not armed: keep the save
          S.authBlocked = true; emitStatus();
          var d = r.data && (r.data.detail || r.data.error);
          if (w) { delete S.waiters[e.id]; w.resolve({ ok: true, queued: true, reason: (d && d.code) || ('http' + r.status) }); }
          return Promise.resolve();
        }
        e.tries++; savePending();                                              // network down / server error: keep it, retry with back-off
        if (w) { delete S.waiters[e.id]; w.resolve({ ok: true, queued: true, reason: 'offline' }); }
        setConn(navigator.onLine === false ? 'offline' : S.conn);
        clearTimeout(S.retryTimer); S.retryTimer = setTimeout(flush, RETRY_MS[Math.min(e.tries - 1, RETRY_MS.length - 1)]);
        return Promise.resolve();
      });
    };
    S.flushing = run().then(function () { S.flushing = null; emitStatus(); }, function () { S.flushing = null; });
    return S.flushing;
  }

  // ═════════════════════════════════════════════════════════════════
  // 6. Listing items for the Admin Studio (base + owner layer, hidden ones included)
  // ═════════════════════════════════════════════════════════════════
  function entries(key, o) {
    o = o || {};
    snapBase();
    var d = S.view[key] || empty(key), del = toMap(d.deleted), out = [], base = [], idOf;
    if (key === 'specialties') { base = BASE.specialties || []; idOf = function (it) { return it.id; }; }
    else if (key === 'tools') { base = (BASE.tools || {})[o.spec] || []; idOf = function (it, i) { return o.spec + ':' + i; }; }
    else if (key === 'questions') { base = BASE.questions || []; idOf = function (it, i) { return 'q' + i; }; }
    else if (key === 'challenges' || key === 'actions') { base = o.spec ? genFor(key, o.spec) : []; idOf = function (it, i) { return o.spec + ':' + i; }; }
    else if (key === 'store') { base = window.catalogAdmin && catalogAdmin.base ? catalogAdmin.base() : []; idOf = function (it) { return it.id; }; }
    base.forEach(function (it, i) {
      var id = idOf(it, i), e = d.edits[id];
      out.push({ id: id, item: assign({}, it, e || {}), base: true, custom: false, edited: !!e, hidden: !!del[id], index: i });
    });
    d.added.forEach(function (a) {
      if ((key === 'tools' || key === 'challenges' || key === 'actions') && a.spec !== o.spec) return;
      out.push({ id: a.id, item: assign({}, a), base: false, custom: true, edited: false, hidden: !!del[a.id], index: null });
    });
    return out;
  }

  // ═════════════════════════════════════════════════════════════════
  // 7. Owner helpers
  // ═════════════════════════════════════════════════════════════════
  function whoami() { return authed('GET', '/api/content/whoami').then(function (r) { return r.ok ? r.data : { authenticated: false, is_owner: false, can_write: false, unreachable: r.status === 0 }; }); }
  function history(key, limit) { return authed('GET', '/api/content/history?limit=' + (limit || 40) + (key ? '&key=' + encodeURIComponent(key) : '')); }
  function revert(id) {
    return authed('POST', '/api/content/revert/' + encodeURIComponent(id), undefined).then(function (r) {
      if (r.ok && r.data && r.data.data) acceptDoc(r.data.key, r.data.rev, r.data.data, 'own');
      return r;
    });
  }
  function exportAll() {
    return authed('GET', '/api/content/export').then(function (r) { return r; });
  }

  // ═════════════════════════════════════════════════════════════════
  // 8. Boot
  // ═════════════════════════════════════════════════════════════════
  function boot() {
    if (S.booted) return; S.booted = true;
    if (disabled()) { emitStatus(); return; }
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        S.bc = new BroadcastChannel('aus-content');
        S.bc.onmessage = function (m) { var d = m.data; if (d && d.t === 'doc') acceptDoc(d.key, d.rev, d.data, 'tab'); };
      }
    } catch (e) {}
    window.addEventListener('storage', function (e) {                                 // browsers without BroadcastChannel
      if (e.key !== LS_CACHE || !e.newValue) return;
      try { var c = JSON.parse(e.newValue); Object.keys(c.docs || {}).forEach(function (k) { acceptDoc(k, c.docs[k].rev, c.docs[k].data, 'tab'); }); } catch (x) {}
    });
    window.addEventListener('online', function () { sync().then(function () { connectStream(); flush(); }); });
    window.addEventListener('offline', function () { setConn('offline'); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { sync(); flush(); } });
    window.addEventListener('aus-auth-changed', function () {
      S.authBlocked = false;
      KEYS.forEach(recomputeView); applyAll('auth');                                   // owner ↔ student: unsent owner saves show only for the owner
      setTimeout(function () { flush(); emitStatus(); }, 250);
    });
    try {                                                                            // translator switched the language → banners / brand follow
      new MutationObserver(function () { applyPlatform(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    } catch (e) {}
    // auth_system.js loads AFTER this file, so when the page started `canWrite()` was still false and the owner's unsent saves were
    // left out of the first draw — now that auth is ready, put them back on the owner's screen.
    if (canWrite() && S.pending.length) { KEYS.forEach(recomputeView); applyAll('boot'); }
    sync().then(function () { connectStream(); flush(); });
  }

  // synchronous part: from this moment the app already shows the last known owner content (even offline)
  snapBase();
  if (!disabled()) { loadCache(); try { applyAll('cache'); } catch (e) { warn('first apply', e); } }

  window.AUS_CONTENT = {
    ops: ops, entries: entries, sync: sync, flush: flush, status: status,
    get: function (k) { return clone(S.view[k] || empty(k)); },
    rev: function (k) { return k ? (S.server[k] ? S.server[k].rev : 0) : S.rev; },
    pending: function () { return S.pending.map(function (p) { return { id: p.id, key: p.key, label: p.label, ts: p.ts, tries: p.tries }; }); },
    whoami: whoami, history: history, revert: revert, exportAll: exportAll,
    api: function (method, path, body) { return authed(method, path, body); },     // authenticated call (refreshes an expired token once)
    on: function (fn) { S.listeners.push(fn); }, off: function (fn) { S.listeners = S.listeners.filter(function (f) { return f !== fn; }); },
    newId: newId, newSpecId: newSpecId, canWrite: canWrite, keys: KEYS.slice(),
    disable: function () { lsSetRaw(LS_OFF, '1'); }, enable: function () { try { localStorage.removeItem(LS_OFF); } catch (e) {} },
    _dismiss: function (id) {
      var m = dismissedSet(); m[id] = Date.now(); lsSet('aus.cms.dismissed', m);
      var el = document.querySelector('#cms-banners .cms-bar[data-id="' + id + '"]'); if (el && el.parentNode) { el.parentNode.removeChild(el); var h = document.getElementById('cms-banners'); if (h) h.setAttribute('data-sig', h.innerHTML); }
    },
    _state: S
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { applyPlatform(); setTimeout(boot, 150); });
  else { applyPlatform(); setTimeout(boot, 150); }
})();
