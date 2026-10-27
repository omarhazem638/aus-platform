/* ================================================================
   AUS — جلسة الخادم (aus_52_session.js)
   ----------------------------------------------------------------
   المشكلة: رمز الدخول للخادم (Access Token) يعيش 15 دقيقة، وكانت كل وحدة (الشهادات، المحتوى، سجل الشهادات، لوحة الإدارة …)
   تقرأه من localStorage بنفسها — بعضها يجدّده وبعضها لا، وبعضها يتسابق مع غيره على «رمز التحديث» الدوّار فيُبطل أحدها الآخر.
   وحساب المالك قد يكون «محلياً فقط»: كلمة مرور الدخول المحلي تختلف عن كلمة مرور الخادم (AUS_OWNER_PASSWORD) فلا يحصل على
   رمز أصلاً. النتيجة: «❌ انتهت جلستك على الخادم — سجّل الدخول بحساب المالك من جديد» عند اعتماد دفعة أو إصدار شهادة.

   الحل: بوابة واحدة لكل طلب موثَّق، يستعملها الجميع:

     AUS_SESSION.request(method, path, body, opts) → Promise<{ok, status, data, session?}>   (لا يرفض أبداً؛ status 0 = لا اتصال)
        session عند 401:  'none' = لا توجد جلسة · 'declined' = أغلق المستخدم نافذة الدخول · 'rejected' = الرمز جديد والمسار نفسه ردّ 401
        1) يُرفق  Authorization: Bearer <token>  من مصدر واحد.
        2) يجدّد الرمز مسبقاً قبل انتهائه (أقل من 90 ث)، وعند 401 يجدّد مرة واحدة ويعيد الطلب نفسه — دون أي رسالة.
        3) التجديد واحد فقط في المتصفح كله (قفل Web Locks بين التبويبات + وعد مشترك داخل الصفحة)، ويقرأ الرمز المخزَّن قبل أن يعلن
           الفشل: رموز التحديث دوّارة، ومن سبقك إلى التجديد غيّر الرمز، فلا يُعدّ ذلك انتهاءً للجلسة.
        4) إن تعذّر التجديد نهائياً (لا رمز تحديث / أُلغي / الحساب المحفوظ لا يخص المالك) وكان الطلب تفاعلياً (إجراءات المالك:
           {interactive:true}) تُفتح نافذة صغيرة لتسجيل الدخول إلى الخادم بكلمة مرور الخادم، ثم يُكمل الطلب نفسه تلقائياً.
        opts: { interactive:false, owner:false (طلب للمالك فقط: عند 403 يتحقق أن الرمز المحفوظ ليس لحساب آخر), auth:true, timeoutMs:20000 }

     AUS_SESSION.signIn({reason, email})   → Promise<boolean>   نافذة «تسجيل الدخول إلى الخادم» (كلمة المرور لا تُخزَّن أبداً)
     AUS_SESSION.refresh() / ensure() / token() / status() / me() / mountChip(el) / dropTokens()
     أحداث: aus-session-changed (حفظ/إسقاط رموز) · aus-auth-changed (بعد تسجيل دخول ناجح — كما في بقية التطبيق)
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_SESSION) return;

  var K_ACCESS = 'aus_access_token', K_REFRESH = 'aus_refresh_token', K_EMAIL = 'aus_session_email';
  var EARLY = 90;                           // ثوانٍ: نجدّد قبل الانتهاء بهذا القدر
  var S = { skew: false, lastRefreshAt: 0, me: { t: 0, v: null }, dialog: null, timer: null };

  // ── helpers ────────────────────────────────────────────────────────
  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function isAr() { try { return String(document.documentElement.getAttribute('lang') || 'ar').toLowerCase().indexOf('ar') === 0; } catch (e) { return true; } }
  function L(a, e) { return isAr() ? a : e; }
  function apiBase() { return window.AUS_API_BASE || ((typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'); }
  function toast(m, kind) { try { if (typeof showToast === 'function') showToast(m, kind || 'xp-toast'); } catch (e) {} }
  function fire(name) { try { window.dispatchEvent(new Event(name)); } catch (e) {} }
  function localUser() { try { return (window.ausAuth && window.ausAuth.user) || null; } catch (e) { return null; } }
  function localEmail() { var u = localUser(); return u && u.email ? String(u.email).toLowerCase().trim() : ''; }
  function localIsOwner() { try { return !!(window.ausAuth && window.ausAuth.isOwner); } catch (e) { return false; } }

  function access() { return ls(K_ACCESS); }
  function refreshToken() { return ls(K_REFRESH); }
  function jwtExp(tok) {                    // seconds since epoch, 0 when unreadable (the SERVER still validates every token)
    try {
      var p = String(tok || '').split('.')[1]; if (!p) return 0;
      p = p.replace(/-/g, '+').replace(/_/g, '/'); while (p.length % 4) p += '=';
      return Number(JSON.parse(atob(p)).exp) || 0;
    } catch (e) { return 0; }
  }
  function secondsLeft(tok) { var x = jwtExp(tok); return x ? x - Date.now() / 1000 : Infinity; }
  // tokens that belong to ANOTHER account than the one signed in on this device must never be used for this one
  function foreign() { var e = ls(K_EMAIL).toLowerCase(), u = localEmail(); return !!(e && u && e !== u); }

  // `ttl` = the lifetime the SERVER announced for this access token (expires_in). Comparing it with what the token's own `exp` says
  // reveals a client clock that is minutes off — then early renewal would loop, so it is switched off (a 401 still renews).
  function saveTokens(a, r, email, ttl) {
    lsSet(K_ACCESS, a); if (r) lsSet(K_REFRESH, r); if (email) lsSet(K_EMAIL, String(email).toLowerCase());
    S.lastRefreshAt = Date.now(); S.me = { t: 0, v: null };
    ttl = Number(ttl) || 0;
    if (ttl > 0) { S.ttl = ttl; S.skew = isFinite(secondsLeft(a)) && Math.abs(secondsLeft(a) - ttl) > 120; } else S.skew = false;
    schedule(); fire('aus-session-changed');
  }
  // how long before expiry we renew: 90 s for the normal 15-minute token, proportionally less for a short-lived one
  function margin() { return Math.min(EARLY, Math.max(10, (S.ttl || 900) * 0.3)); }
  function dropTokens() {
    lsDel(K_ACCESS); lsDel(K_REFRESH); lsDel(K_EMAIL);
    S.me = { t: 0, v: null }; clearTimeout(S.timer); fire('aus-session-changed');
  }

  // ── raw network (never rejects) ────────────────────────────────────
  function post(method, path, body, token, timeoutMs) {
    var headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, timeoutMs || 20000) : null;
    try {
      return fetch(apiBase() + path, { method: method, headers: headers, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (res) {
          if (timer) clearTimeout(timer);
          return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, status: res.status, data: data || {} }; });
        })
        .catch(function () { if (timer) clearTimeout(timer); return { ok: false, status: 0, data: { detail: 'network' } }; });
    } catch (e) { if (timer) clearTimeout(timer); return Promise.resolve({ ok: false, status: 0, data: { detail: 'network' } }); }
  }

  // ── refresh: ONE at a time in the whole browser ────────────────────
  var inflight = null;
  function lock(fn) {
    try { if (navigator.locks && navigator.locks.request) return navigator.locks.request('aus-session-refresh', fn); } catch (e) {}
    return Promise.resolve().then(fn);
  }
  function doRefresh(used, depth) {
    var cur = access();
    if (cur && cur !== used && secondsLeft(cur) > 20) return Promise.resolve(true);   // another tab / module refreshed while we waited
    var rt = refreshToken();
    if (!rt) return Promise.resolve(false);
    return post('POST', '/api/auth/refresh', { refresh_token: rt }).then(function (r) {
      if (r.ok && r.data && r.data.access_token) { saveTokens(r.data.access_token, r.data.refresh_token, undefined, r.data.expires_in); return true; }
      if (r.status === 401 || r.status === 403) {
        // rotating refresh tokens: when somebody else rotated it meanwhile the stored one differs — that is not a dead session,
        // and the tokens they stored are fresh: just use them (spending the new refresh token again would only rotate it once more)
        var rt2 = refreshToken(), cur2 = access();
        if (rt2 && rt2 !== rt) {
          if (cur2 && secondsLeft(cur2) > 20) return true;
          if ((depth || 0) < 2) return doRefresh(cur2, (depth || 0) + 1);
        }
        dropTokens();                                    // revoked / unknown / account disabled / server secret changed: it really is dead
      }
      return false;
    });
  }
  function refresh() {
    if (inflight) return inflight;
    var used = access();
    inflight = lock(function () { return doRefresh(used, 0); }).then(function (ok) { inflight = null; return !!ok; }, function () { inflight = null; return false; });
    return inflight;
  }
  // Resolves true when a usable-looking token is available after (possibly) refreshing it a little before it expires.
  function ensure() {
    if (foreign()) { dropTokens(); return Promise.resolve(false); }
    var a = access();
    if (!a && !refreshToken()) return Promise.resolve(false);
    if (a && (S.skew || secondsLeft(a) > margin())) return Promise.resolve(true);
    if (!refreshToken()) return Promise.resolve(!!a);
    if (Date.now() - S.lastRefreshAt < 15000 && a) return Promise.resolve(true);      // just refreshed: no loops
    return refresh();
  }
  // Keep a long admin session alive in the background: renew a little before each expiry (margin() seconds).
  function schedule() {
    clearTimeout(S.timer);
    var a = access(); if (!a || !refreshToken() || S.skew) return;
    var left = secondsLeft(a); if (!isFinite(left)) return;
    S.timer = setTimeout(function () { refresh().then(schedule); }, Math.min(Math.max(3, left - margin()) * 1000, 2147000000));
  }

  // ── authenticated request (the one gate) ───────────────────────────
  function send(method, path, body, auth, timeoutMs) { return post(method, path, body, auth ? access() : '', timeoutMs); }
  function mark(r, why) { try { r.session = why; } catch (e) {} return r; }

  function askAndRetry(method, path, body, opts, reason, last) {
    return API.signIn({ reason: reason }).then(function (ok) {
      if (!ok) return mark(last, 'declined');
      return send(method, path, body, true, opts.timeoutMs);
    });
  }
  function recover(method, path, body, opts, first, wasForeign) {
    var had = !!(access() || refreshToken());                       // did a server session exist before we tried to renew it?
    return refresh().then(function (ok) {
      if (ok) {
        // a FRESH token and still 401: the endpoint itself answered 401 (e.g. "wrong current password") — not an expired session
        return send(method, path, body, true, opts.timeoutMs).then(function (r2) { return r2.status === 401 ? mark(r2, 'rejected') : r2; });
      }
      return opts.interactive ? askAndRetry(method, path, body, opts, wasForeign ? 'foreign' : had ? 'expired' : 'none', first) : mark(first, 'none');
    });
  }
  function request(method, path, body, opts) {
    opts = opts || {};
    var auth = opts.auth !== false, wasForeign = auth && foreign();
    return (auth ? ensure() : Promise.resolve(true)).then(function () {
      return send(method, path, body, auth, opts.timeoutMs);
    }).then(function (r) {
      if (!auth) return r;
      if (r.status === 401) return recover(method, path, body, opts, r, wasForeign);
      if (r.status === 403 && opts.owner && opts.interactive && localIsOwner()) {
        // an owner-only call was refused: is the saved server session really the OWNER's, or is it another account's (stale) one?
        return me(true).then(function (who) {
          if (who && who.is_owner === false) { dropTokens(); return askAndRetry(method, path, body, opts, 'not-owner', r); }
          return r;
        });
      }
      return r;
    });
  }

  // who does the SERVER think I am?  → {email, is_owner|null} | null
  function me(force) {
    if (!force && S.me.v && Date.now() - S.me.t < 60000) return Promise.resolve(S.me.v);
    if (!access()) return Promise.resolve(null);
    return send('GET', '/api/auth/me', undefined, true).then(function (r) {
      var v = r.ok ? { email: String(r.data.email || '').toLowerCase(), is_owner: (typeof r.data.is_owner === 'boolean') ? r.data.is_owner : null } : null;
      S.me = { t: Date.now(), v: v };
      return v;
    });
  }

  function status() {
    var a = access(), rt = refreshToken();
    return { state: (!a && !rt) ? 'none' : foreign() ? 'foreign' : 'ok', hasAccess: !!a, hasRefresh: !!rt, expiresIn: a && isFinite(secondsLeft(a)) ? Math.round(secondsLeft(a)) : 0, email: ls(K_EMAIL) };
  }

  // ── the sign-in dialog (Nano Glass) ────────────────────────────────
  function styles() {
    if (document.getElementById('ases-styles')) return;
    var s = document.createElement('style'); s.id = 'ases-styles';
    s.textContent = [
      '.ases-ov{position:fixed;inset:0;z-index:100070;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,6,20,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:"Tajawal",sans-serif;color:#fff}',
      '.ases-box{width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;background:rgba(255,255,255,.06);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4);padding:22px 22px 18px}',
      '.ases-ic{font-size:2rem;text-align:center;line-height:1;margin-bottom:6px}',
      '.ases-box h3{margin:0 0 6px;font-size:1.05rem;color:#ffd700;text-align:center}',
      '.ases-why{font-size:.84rem;line-height:1.8;color:rgba(255,255,255,.74);margin:0 0 10px;text-align:center}',
      '.ases-box label.f{display:block;font-size:.76rem;color:rgba(255,255,255,.62);margin:10px 0 4px}',
      '.ases-box input[type=email],.ases-box input[type=password]{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:12px;background:rgba(0,10,30,.6);border:1px solid rgba(0,212,255,.3);color:#fff;font:inherit;font-size:.92rem;direction:ltr;text-align:left;outline:none}',
      '.ases-box input:focus{border-color:#00d4ff;box-shadow:0 0 0 3px rgba(0,212,255,.15)}',
      '.ases-box input[readonly]{opacity:.7}',
      '.ases-chk{display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:.78rem;line-height:1.7;color:rgba(255,255,255,.72);cursor:pointer}',
      '.ases-chk input{margin-top:5px;flex:none}',
      '.ases-err{min-height:1.3em;margin-top:8px;font-size:.8rem;line-height:1.6;color:#ff8fb3;text-align:center}',
      '.ases-btns{display:flex;gap:10px;margin-top:10px}',
      '.ases-btns button{flex:1;padding:11px;border-radius:12px;font:700 .9rem "Tajawal",sans-serif;cursor:pointer;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;transition:filter .2s}',
      '.ases-btns button:hover{filter:brightness(1.2)}.ases-btns button:disabled{opacity:.6;cursor:default}',
      '.ases-btns .gold{background:linear-gradient(135deg,#ffd700,#ff9500);color:#1a1000;border-color:transparent}',
      '.ases-hint{margin:12px 0 0;font-size:.72rem;line-height:1.8;color:rgba(255,255,255,.48);text-align:center}',
      '.ases-hint code{direction:ltr;unicode-bidi:isolate;color:#9fe9ff;font-size:.74rem}',
      '.ases-chip{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);font-size:.82rem;line-height:1.7;color:rgba(255,255,255,.82)}',
      '.ases-chip.ok{border-color:rgba(105,240,174,.4)}.ases-chip.warn{border-color:rgba(255,180,0,.55)}.ases-chip.bad{border-color:rgba(255,110,160,.55)}',
      '.ases-chip button{margin-inline-start:auto;padding:7px 14px;border-radius:10px;border:1px solid rgba(255,215,0,.5);background:rgba(255,215,0,.1);color:#ffd700;font:700 .78rem "Tajawal",sans-serif;cursor:pointer}',
      '.ases-chip button:hover{background:rgba(255,215,0,.2)}',
      '@media(max-width:480px){.ases-box{padding:18px 16px 14px}}'
    ].join('');
    document.head.appendChild(s);
  }
  var WHY = {
    none: ['حسابك الحالي مفتوح على هذا الجهاز فقط ولا توجد له جلسة على الخادم، والإجراء الذي طلبتَه يحتاج الخادم (تفعيل دفعة، إصدار شهادة …).', 'You are signed in on this device only — there is no session on the server, and this action needs it (activating a payment, issuing a certificate …).'],
    expired: ['انتهت جلسة الخادم وتعذّر تجديدها تلقائياً (رمز التحديث لم يعد صالحاً).', 'Your server session ended and could not be renewed automatically (the refresh token is no longer valid).'],
    'not-owner': ['الجلسة المحفوظة على الخادم تخص حساباً آخر غير المالك، فرفض الخادم هذا الإجراء. سجّل الدخول بحساب المالك.', 'The session saved for the server belongs to another account, not the owner, so the server refused this action. Sign in as the owner.'],
    foreign: ['الجلسة المحفوظة على الخادم تخص حساباً آخر غير الحساب المفتوح الآن.', 'The saved server session belongs to a different account than the one signed in now.'],
    manual: ['سجّل الدخول إلى الخادم لتفعيل إجراءات الإدارة التي تحتاجه.', 'Sign in to the server to enable the admin actions that need it.']
  };
  function signIn(o) {
    o = o || {};
    if (S.dialog) return S.dialog.promise;                         // one dialog for any number of waiting requests
    styles();
    var why = WHY[o.reason] || WHY.manual, mail = localEmail() || String(o.email || '').toLowerCase(), locked = !!localEmail();
    var canSync = typeof (window.ausAuth && window.ausAuth.updateLocalPassword) === 'function' && locked;
    var prevFocus = document.activeElement;
    var ov = document.createElement('div'); ov.className = 'ases-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('dir', isAr() ? 'rtl' : 'ltr');
    ov.innerHTML =
      '<form class="ases-box" autocomplete="on" novalidate>' +
        '<div class="ases-ic">🔐</div><h3>' + L('تسجيل الدخول إلى الخادم', 'Sign in to the server') + '</h3>' +
        '<p class="ases-why">' + esc(L(why[0], why[1])) + '</p>' +
        '<label class="f">' + L('البريد الإلكتروني', 'E-mail') + '<input type="email" name="email" autocomplete="username" value="' + esc(mail) + '"' + (locked ? ' readonly' : '') + '></label>' +
        '<label class="f">' + L('كلمة مرور الخادم', 'Server password') + '<input type="password" name="password" autocomplete="current-password" required></label>' +
        (canSync ? '<label class="ases-chk"><input type="checkbox" name="sync"' + (localIsOwner() ? ' checked' : '') + '> <span>' + L('اجعل كلمة مرور الدخول المحلي على هذا الجهاز هي نفسها (موصى به — حتى لا يُطلب هذا مجدداً بعد كل تسجيل خروج).', 'Make the sign-in password on this device the same (recommended — so this is not asked again after every sign-out).') + '</span></label>' : '') +
        '<div class="ases-err" role="alert"></div>' +
        '<div class="ases-btns"><button type="submit" class="gold">' + L('تسجيل الدخول', 'Sign in') + '</button><button type="button" data-x="1">' + L('إلغاء', 'Cancel') + '</button></div>' +
        (localIsOwner() ? '<p class="ases-hint">' + L('حساب المالك على الخادم يستخدم كلمة السرّ المضبوطة في <code>AUS_OWNER_PASSWORD</code> داخل ملف <code>.env</code> — وقد تختلف عن كلمة مرور الدخول المحلي.', 'The owner account on the server uses the password set as <code>AUS_OWNER_PASSWORD</code> in the <code>.env</code> file — it may differ from the local sign-in password.') + '</p>' : '') +
      '</form>';
    document.body.appendChild(ov);
    var form = ov.firstChild, pw = form.elements.password, err = ov.querySelector('.ases-err'), done, busy = false;
    var promise = new Promise(function (res) { done = res; });
    S.dialog = { promise: promise };
    function close(ok) {
      try { pw.value = ''; } catch (e) {}                          // the password never outlives the dialog
      document.removeEventListener('keydown', onKey, true);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      S.dialog = null; try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {}
      done(!!ok);
    }
    function onKey(e) { if (e.key === 'Escape' && !busy) { e.stopPropagation(); close(false); } }
    document.addEventListener('keydown', onKey, true);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov && !busy) close(false); });
    form.querySelector('[data-x]').addEventListener('click', function () { if (!busy) close(false); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); if (busy) return;
      var email = String(form.elements.email.value || '').trim().toLowerCase(), pass = String(pw.value || '');
      if (!email || !pass) { err.textContent = L('أدخل كلمة المرور.', 'Enter the password.'); return; }
      busy = true; err.textContent = ''; var btn = form.querySelector('.gold'); btn.disabled = true; btn.textContent = '…';
      post('POST', '/api/auth/login', { email: email, password: pass }).then(function (r) {
        var u = r.data && r.data.user;
        if (!(r.ok && r.data && r.data.access_token)) {
          busy = false; btn.disabled = false; btn.textContent = L('تسجيل الدخول', 'Sign in');
          err.textContent = r.status === 0 ? L('تعذّر الاتصال بالخادم — تأكّد أنه يعمل (START_AUS.bat).', 'Could not reach the server — make sure it is running.')
            : r.status === 401 ? L('كلمة مرور الخادم غير صحيحة.', 'Wrong server password.')
            : r.status === 429 || (r.data && r.data.error === 'ip_blocked') ? L('محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة.', 'Too many attempts — wait a moment and try again.')
            : (r.data && typeof r.data.detail === 'string' && r.data.detail) || L('تعذّر تسجيل الدخول.', 'Sign-in failed.');
          try { pw.focus(); pw.select(); } catch (e) {}          // typing again replaces the rejected password
          return null;
        }
        // an owner on this device must not end up attached to a NON-owner server account
        if (localIsOwner() && u && u.is_owner === false) {
          busy = false; btn.disabled = false; btn.textContent = L('تسجيل الدخول', 'Sign in');
          err.textContent = L('هذا الحساب على الخادم ليس حساب المالك (البريد لا يطابق AUS_OWNER_EMAIL).', 'This server account is not the owner (its e-mail does not match AUS_OWNER_EMAIL).');
          return null;
        }
        saveTokens(r.data.access_token, r.data.refresh_token, (u && u.email) || email, r.data.expires_in);
        var sync = form.elements.sync && form.elements.sync.checked;
        var after = sync ? Promise.resolve().then(function () { return window.ausAuth.updateLocalPassword(pass); }).catch(function () {}) : Promise.resolve();
        return after.then(function () { fire('aus-auth-changed'); close(true); toast(L('✅ تم تسجيل الدخول إلى الخادم', '✅ Signed in to the server')); });
      });
    });
    setTimeout(function () { try { (locked ? pw : form.elements.email).focus(); } catch (e) {} }, 40);
    return promise;
  }

  // ── status chip for the admin panel ────────────────────────────────
  function mountChip(el) {
    if (!el) return;
    function draw() {
      var s = status();
      function paint(cls, html, btn) {
        el.innerHTML = '<div class="ases-chip ' + cls + '"><span>' + html + '</span>' + (btn ? '<button type="button" data-ases-signin="1">' + btn + '</button>' : '') + '</div>';
      }
      styles();
      if (s.state === 'none') return paint('warn', L('⚠️ لا توجد جلسة على الخادم — إجراءات الإدارة التي تحتاج الخادم (تفعيل الدفعات، إصدار الشهادات) ستطلب كلمة مرور الخادم عند استخدامها.', '⚠️ No session on the server — admin actions that need it (activating payments, issuing certificates) will ask for the server password.'), L('تسجيل الدخول للخادم', 'Sign in to the server'));
      if (s.state === 'foreign') return paint('bad', L('⚠️ جلسة الخادم المحفوظة تخص حساباً آخر.', '⚠️ The saved server session belongs to another account.'), L('تسجيل الدخول للخادم', 'Sign in to the server'));
      paint('ok', L('✅ جلسة الخادم فعّالة وتُجدَّد تلقائياً.', '✅ Server session is active and renews itself.'));
      me(false).then(function (who) {
        if (!who || !el.isConnected) return;
        if (localIsOwner() && who.is_owner === false) return paint('bad', L('⛔ الحساب المسجَّل على الخادم ليس حساب المالك — سجّل الدخول للخادم بحساب المالك.', '⛔ The account signed in on the server is not the owner — sign in with the owner account.'), L('تسجيل الدخول للخادم', 'Sign in to the server'));
        if (who.is_owner === true) paint('ok', L('✅ جلسة الخادم فعّالة بحساب المالك وتُجدَّد تلقائياً.', '✅ Server session is active as the owner and renews itself.'));
      });
    }
    if (el.__asesBound) { draw(); return; }
    el.__asesBound = true; el.__asesDraw = draw;
    el.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-ases-signin]')) API.signIn({ reason: 'manual' }).then(function (ok) { if (ok) draw(); });
    });
    chips.push(el);                                       // ONE window listener redraws every live chip (the panel is re-rendered often)
    draw();
  }
  var chips = [];
  function redrawChips() {
    chips = chips.filter(function (el) { return el.isConnected; });
    chips.forEach(function (el) { try { el.__asesDraw(); } catch (e) {} });
  }

  // ── wiring ─────────────────────────────────────────────────────────
  try {
    document.addEventListener('visibilitychange', function () { if (!document.hidden) ensure().then(schedule); });
    window.addEventListener('online', function () { ensure().then(schedule); });
    window.addEventListener('storage', function (e) { if (e.key === K_ACCESS || e.key === K_REFRESH) { S.me = { t: 0, v: null }; schedule(); } });
    window.addEventListener('aus-auth-changed', function () { schedule(); });
    window.addEventListener('aus-session-changed', redrawChips);
    setTimeout(schedule, 0);
  } catch (e) {}

  var API = window.AUS_SESSION = {
    version: '1.0',
    request: request, refresh: refresh, ensure: ensure, signIn: signIn, me: me, status: status, mountChip: mountChip, dropTokens: dropTokens,
    token: access, apiBase: apiBase, _save: saveTokens
  };
})();
