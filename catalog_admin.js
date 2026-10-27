/* ================================================================
   AUS — إدارة المحتوى والأسعار (للمالك فقط)
   • يعدّل أسعار/نصوص العناصر، ويضيف/يحذف عناصر من الكتالوج
   • يخزّن التعديلات كطبقة overrides فوق الكتالوج الأصلي
   • يطبّقها على LEADERSHIP_FILES فتظهر في المتجر والدفع
   نظام مستقل | المتاجر تقرأ LEADERSHIP_FILES حيّاً فتنعكس التغييرات

   v6 — المزامنة الفورية: التخزين والبثّ صار عبر محرّك المحتوى aus_48_content_sync.js
   (قاعدة البيانات + localStorage + بثّ حيّ لكل المستخدمين). هذا الملف يحتفظ بنفس
   واجهة catalogAdmin القديمة تماماً، لكن كل تعديل يمرّ الآن عبر عمليات (edit / add /
   delete / restore / clear) تُطبَّق فوراً على الشاشة ثم تُحفَظ على الخادم وتُبَثّ.
   إن لم يُحمَّل المحرّك لأي سبب يعمل الملف بالطريقة القديمة (PUT كامل) كما كان.
   ================================================================ */
(function () {
  'use strict';
  if (typeof LEADERSHIP_FILES === 'undefined') return;

  var KEY = 'aus.catalog.overrides';   // نسخة محلية من وثيقة `store` (نفس شكل وثيقة الخادم)
  // Pristine snapshot of the original catalog — taken once, never mutated.
  var _base = JSON.parse(JSON.stringify(LEADERSHIP_FILES));

  function _load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function _save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function _ov() { var o = _load(); o.edits = o.edits || {}; o.added = o.added || []; o.deleted = o.deleted || []; return o; }
  function _isOwner() { return !!(window.ausAuth && ausAuth.isOwner); }
  // emergency switch: ?nocms=1 (or localStorage 'aus.content.off'=1) → the engine is off and the app shows the catalog exactly as shipped
  var _off = !!(window.AUS_CONTENT && AUS_CONTENT.status && AUS_CONTENT.status().disabled);
  function _engine() { return (!_off && window.AUS_CONTENT && typeof AUS_CONTENT.ops === 'function') ? window.AUS_CONTENT : null; }

  // Rebuild LEADERSHIP_FILES in place from base + overrides
  function _rebuild() {
    var o = _ov();
    var del = o.deleted;
    var out = _base
      .filter(function (f) { return del.indexOf(f.id) === -1; })
      .map(function (f) { var e = o.edits[f.id]; return e ? Object.assign({}, f, e) : Object.assign({}, f); });
    o.added.forEach(function (a) {
      if (del.indexOf(a.id) === -1) { var e = o.edits[a.id]; out.push(e ? Object.assign({}, a, e) : Object.assign({}, a)); }
    });
    LEADERSHIP_FILES.length = 0;
    Array.prototype.push.apply(LEADERSHIP_FILES, out);
  }

  // Re-render any visible catalog views after a change (only what is on screen — never a purchase/read flow in progress)
  function _refreshViews() {
    try {
      var lead = document.getElementById('leadership');
      if (lead && lead.classList.contains('active') && typeof showLeadershipDevelopment === 'function') showLeadershipDevelopment();
    } catch (e) {}
    try { if (typeof renderSpecialties === 'function') { var home = document.getElementById('home'); if (home && home.classList.contains('active')) renderSpecialties(); } } catch (e) {}
    try {   // the Store tab: redraw the grids (keeps the search box / filters); the whole hub only when nothing is typed
      var st = document.getElementById('store');
      if (st && st.classList.contains('active')) {
        var typing = document.activeElement && document.activeElement.id === 'store-search-input';
        var hasQuery = !!(window.STORE_STATE && STORE_STATE.search);
        if (typeof window.renderStoreHub === 'function' && !typing && !hasQuery) window.renderStoreHub();
        else if (typeof _storeRenderGrids === 'function') { _storeRenderGrids(); if (typeof _storeApplySearch === 'function') _storeApplySearch(); }
      }
    } catch (e) {}
    try { var lib = document.getElementById('library'); if (lib && lib.classList.contains('active') && typeof libInit === 'function') libInit(); } catch (e) {}
  }

  // ── Server sync (legacy path — used only when the content engine is not loaded) ──
  function _apiBase() { return (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'; }
  function _token() { try { return localStorage.getItem('aus_access_token') || ''; } catch (e) { return ''; } }
  var _pendingPush = false;
  function _pushRemote() {
    if (!_isOwner()) return;
    var t = _token();
    if (!t) { _pendingPush = true; return; }   // token not ready yet → retry when it lands
    _pendingPush = false;
    try {
      fetch(_apiBase() + '/api/catalog/overrides', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
        body: JSON.stringify({ overrides: _ov() })
      }).catch(function () {});
    } catch (e) {}
  }
  function _pullRemote() {
    if (_engine()) { _engine().sync(); return; }
    // Never overwrite an owner edit that hasn't reached the server yet — push it.
    if (_pendingPush && _isOwner()) { _pushRemote(); return; }
    try {
      fetch(_apiBase() + '/api/catalog/overrides', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.overrides) return;
          var rem = d.overrides;
          try { localStorage.setItem(KEY, JSON.stringify({ edits: rem.edits || {}, added: rem.added || [], deleted: rem.deleted || [] })); } catch (e) {}
          _rebuild(); _refreshViews();
        }).catch(function () {});
    } catch (e) {}
  }
  function _commit(o) { _save(o); _rebuild(); _refreshViews(); _pushRemote(); }

  // ── Engine path: a save is an operation, applied to the screen at once and then confirmed by the server ──
  function _toastError(err) {
    var msg = (err && (err.message || err.code)) || 'error';
    try { if (typeof showToast === 'function') showToast('تعذّر الحفظ: ' + msg, 'heart-toast'); } catch (e) {}
  }
  function _send(list) {
    _engine().ops('store', list, 'store').catch(_toastError);   // the optimistic apply already happened synchronously
    return true;
  }

  window.catalogAdmin = {
    list: function () { return JSON.parse(JSON.stringify(LEADERSHIP_FILES)); },
    get: function (id) { return LEADERSHIP_FILES.filter(function (f) { return f.id === id; })[0] || null; },
    editItem: function (id, fields) {
      if (!_isOwner()) return false;
      if (_engine()) return _send([{ op: 'edit', id: id, fields: fields }]);
      var o = _ov(); o.edits[id] = Object.assign({}, o.edits[id] || {}, fields); _commit(o); return true;
    },
    deleteItem: function (id) {
      if (!_isOwner()) return false;
      if (_engine()) return _send([{ op: 'delete', id: id }]);
      var o = _ov();
      // a custom (added) item is removed entirely; a base item is marked deleted
      if (o.added.some(function (a) { return a.id === id; })) { o.added = o.added.filter(function (a) { return a.id !== id; }); }
      else if (o.deleted.indexOf(id) === -1) { o.deleted.push(id); }
      _commit(o); return true;
    },
    restoreItem: function (id) {
      if (!_isOwner()) return false;
      if (_engine()) return _send([{ op: 'restore', id: id }]);
      var o = _ov(); o.deleted = o.deleted.filter(function (x) { return x !== id; }); _commit(o); return true;
    },
    addItem: function (item) {
      if (!_isOwner()) return false;
      item = Object.assign({ type: 'file', archetype: 'autocratic', icon: '📦', price: 10, size: 'PDF', desc: '' }, item || {});
      item.price = +item.price || 0;
      if (_engine()) { item.id = item.id || _engine().newId('custom-'); _send([{ op: 'add', item: item }]); return item.id; }
      var o = _ov();
      item.id = item.id || ('custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      o.added.push(item); _commit(o); return item.id;
    },
    resetAll: function () {
      if (!_isOwner()) return false;
      if (_engine()) return _send([{ op: 'clear' }]);
      try { localStorage.removeItem(KEY); } catch (e) {} _rebuild(); _refreshViews(); _pushRemote(); return true;
    },
    pull: function () { _pullRemote(); },
    deletedBaseItems: function () {
      var del = _ov().deleted;
      return _base.filter(function (f) { return del.indexOf(f.id) !== -1; }).map(function (f) { return { id: f.id, title: f.title }; });
    },
    isCustom: function (id) { return _ov().added.some(function (a) { return a.id === id; }); },
    isEdited: function (id) { return !!_ov().edits[id]; },
    // used by the content engine (aus_48_content_sync.js)
    base: function () { return JSON.parse(JSON.stringify(_base)); },
    applyDoc: function (doc) {
      doc = doc || {};
      _save({ edits: doc.edits || {}, added: doc.added || [], deleted: doc.deleted || [] });
      _rebuild(); _refreshViews();
    }
  };

  var _legacyAtLoad = _ov();   // what this browser held BEFORE the content engine touched it (used by the one-time upgrade below)
  if (!_off) _rebuild();   // apply saved overrides immediately on load
  if (_off) {
    // switched off: no overrides, no network
  } else if (_engine()) {
    // the engine already holds the freshest copy (its cache + server) → start from it
    try { var cur = _engine().get('store'); if (cur && (Object.keys(cur.edits).length || cur.added.length || cur.deleted.length || _engine().rev('store') > 0)) window.catalogAdmin.applyDoc(cur); } catch (e) {}

    // One-time upgrade for an owner whose browser holds store edits that never reached the server in the old model
    // (they were made while the server was down): send them once, but only into an EMPTY server document.
    window.addEventListener('aus-content-status', function once() {
      var st = _engine().status();
      if (st.conn !== 'live' && st.conn !== 'poll') return;
      window.removeEventListener('aus-content-status', once);
      try {
        if (!_isOwner() || localStorage.getItem('aus.catalog.migrated') === '1') return;
        var local = _legacyAtLoad, has = (local.added && local.added.length) || (local.deleted && local.deleted.length) || Object.keys(local.edits || {}).length;
        var srv = _engine().get('store'), srvEmpty = !Object.keys(srv.edits).length && !srv.added.length && !srv.deleted.length;
        if (has && srvEmpty) _engine().ops('store', [{ op: 'replace', data: { edits: local.edits || {}, added: local.added || [], deleted: local.deleted || [] } }], 'migrate').catch(function () {});
        localStorage.setItem('aus.catalog.migrated', '1');
      } catch (e) {}
    });
  } else {
    // legacy path: pull the server's copy shortly after load, and again whenever the account changes
    setTimeout(_pullRemote, 1200);
    window.addEventListener('aus-auth-changed', function () {
      setTimeout(function () {
        if (_pendingPush && _isOwner() && _token()) _pushRemote();
        else _pullRemote();
      }, 200);
    });
  }
})();
