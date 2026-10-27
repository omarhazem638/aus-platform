/* ================================================================
   AUS — نظام تسجيل الدخول للأفراد (محلي + الخادم) مع مزوّدين
   • يعمل دائماً دون خادم (محلي أولاً) ويُزامن مع الخادم عند توفّره
   • البريد/كلمة المرور (PBKDF2) · Google · Microsoft · Apple · ضيف
   • يحفظ معلومات الحسابات في المتصفح بشكل دائم
   يستبدل window.ausAuth مع الحفاظ على نفس أسماء الدوال للنافذة القائمة
   ================================================================ */
(function () {
  'use strict';

  // Signal the legacy in-file ausAuth IIFE to stand down (set synchronously,
  // before DOMContentLoaded, so the old init() bails out and doesn't fight our UI).
  try { window.__ausAuthV2 = true; } catch (e) {}

  var API_BASE = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
  var LS = {
    accounts: 'aus.accounts',
    session:  'aus.session',
    google:   'aus.google.clientId',
    ms:       'aus.ms.clientId',
    apple:    'aus.apple.clientId'
  };
  // Optional baked-in client IDs (leave empty — user pastes from settings)
  var GOOGLE_DEFAULT = '';
  var MS_DEFAULT     = '';
  var APPLE_DEFAULT  = '';

  var _user = null;          // current session user object
  var _token = null;         // backend access token (if synced)

  // ── CSS for provider buttons (matches dark/gold theme) ─────────────
  (function injectCSS() {
    if (document.getElementById('auth-social-styles')) return;
    var s = document.createElement('style');
    s.id = 'auth-social-styles';
    s.textContent = `
    .auth-divider { display:flex; align-items:center; gap:.7rem; margin:1.1rem 0 .9rem; color:rgba(255,255,255,.35); font-size:.78rem; }
    .auth-divider::before, .auth-divider::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.12); }
    .auth-social { display:flex; flex-direction:column; gap:.55rem; }
    #gsiContainer { display:flex; justify-content:center; min-height:40px; }
    .auth-social-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:.6rem; padding:.7rem 1rem;
      border-radius:11px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.06); color:#fff;
      font-family:'Tajawal',sans-serif; font-weight:700; font-size:.88rem; cursor:pointer; transition:all .22s; }
    .auth-social-btn:hover { background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.3); transform:translateY(-1px); }
    .auth-social-btn .sic { width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
    .auth-social-btn .sic svg { width:18px; height:18px; display:block; }
    .auth-social-btn.ms { border-color:rgba(0,164,239,.35); }
    .auth-social-btn.ms:hover { background:rgba(0,164,239,.12); }
    .auth-social-btn.apple { border-color:rgba(255,255,255,.25); }
    .auth-guest-btn { width:100%; padding:.6rem; margin-top:.2rem; border-radius:11px; border:1px dashed rgba(255,215,0,.4);
      background:transparent; color:rgba(255,215,0,.85); font-family:'Tajawal',sans-serif; font-weight:700; font-size:.84rem; cursor:pointer; transition:all .22s; }
    .auth-guest-btn:hover { background:rgba(255,215,0,.1); }
    .auth-provider-badge { display:inline-flex; align-items:center; gap:5px; font-size:.66rem; padding:1px 8px; border-radius:50px;
      background:rgba(0,212,255,.15); border:1px solid rgba(0,212,255,.35); color:#00d4ff; margin-inline-start:6px; vertical-align:middle; }
    /* Role chooser, back btn, badge — handled by index.html holographic CSS */
    `;
    document.head.appendChild(s);
  })();

  // ── Brand provider logos (inline SVG, official colors) ─────────────
  var BRAND_SVG = {
    google: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>',
    microsoft: '<svg viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>',
    apple: '<svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#ffffff" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>'
  };

  // ── Crypto helpers (PBKDF2 password hashing) ───────────────────────
  function _bytesToHex(b) { return Array.prototype.map.call(b, function (x) { return ('00' + x.toString(16)).slice(-2); }).join(''); }
  function _hexToBytes(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function _genSalt() { var b = new Uint8Array(16); (crypto.getRandomValues ? crypto : window.crypto).getRandomValues(b); return _bytesToHex(b); }

  async function _hashPassword(password, saltHex) {
    try {
      var enc = new TextEncoder();
      var km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      var bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: _hexToBytes(saltHex), iterations: 600000, hash: 'SHA-256' }, km, 256);
      return _bytesToHex(new Uint8Array(bits));
    } catch (e) {
      // Fallback (older browsers) — weak but never plaintext
      var x = 0, str = saltHex + '|' + password;
      for (var i = 0; i < str.length; i++) { x = ((x << 5) - x + str.charCodeAt(i)) | 0; }
      return 'fb' + (x >>> 0).toString(16);
    }
  }

  // ── Account store (localStorage) ───────────────────────────────────
  // If aus.accounts ever holds corrupted JSON (crashed mid-write, an
  // extension touching localStorage, manual tampering, etc.), the old code
  // silently treated that as "zero accounts exist" — which makes a real,
  // previously-registered account look deleted, and (worse) the next write
  // would permanently overwrite the corrupted string with just one account,
  // destroying any chance of recovery. Track corruption explicitly instead,
  // so login/register can tell the user the truth and refuse to overwrite.
  var _accountsCorrupted = false;
  function _loadAccounts() {
    var raw;
    try { raw = localStorage.getItem(LS.accounts); } catch (e) { return []; }
    if (!raw) { _accountsCorrupted = false; return []; }
    try {
      var a = JSON.parse(raw);
      _accountsCorrupted = false;
      return Array.isArray(a) ? a : [];
    } catch (e) {
      _accountsCorrupted = true;
      return [];
    }
  }
  function _saveAccounts(a) {
    if (_accountsCorrupted) return false; // never let a write silently erase corrupted-but-maybe-recoverable data
    try { localStorage.setItem(LS.accounts, JSON.stringify(a)); return true; } catch (e) { return false; }
  }
  function _findAccount(email) { email = (email || '').toLowerCase().trim(); return _loadAccounts().filter(function (u) { return u.email === email; })[0] || null; }
  function _upsertAccount(acc) {
    var all = _loadAccounts();
    if (_accountsCorrupted) return null; // refuse to touch the store until it's readable again
    var idx = -1;
    for (var i = 0; i < all.length; i++) { if (all[i].email === acc.email || all[i].id === acc.id) { idx = i; break; } }
    if (idx >= 0) all[idx] = Object.assign({}, all[idx], acc); else all.push(acc);
    _saveAccounts(all);
    return _findAccount(acc.email);
  }
  function _newId() { return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ── Public user object (shape kept compatible with old ausAuth) ─────
  function _publicUser(acc) {
    return { id: acc.id, email: acc.email, full_name: acc.full_name || acc.email, plan: acc.plan || 'free', provider: acc.provider || 'email', avatar: acc.avatar || '', role: _roleFor(acc) };
  }

  // ── Roles ──────────────────────────────────────────────────────────
  // • admin  → ONLY the hardcoded owner email (can never be faked).
  // • doctor → any account whose stored role is 'doctor' (granted via doctor code).
  // • student→ everyone else.
  var OWNER_EMAIL = 'omar4321hazem@gmail.com';
  function _isOwner(email) { return (email || '').toLowerCase().trim() === OWNER_EMAIL; }
  // Student accounts must use the university-issued id@aus.jo address (e.g.
  // 202420300@aus.jo) — not a free-form email. The owner email is exempt so
  // the admin account can still be registered through the student panel (the
  // only panel that allows self-registration at all — see ROLE_META.admin).
  var STUDENT_EMAIL_REGEX = /^\d{9}@aus\.jo$/;

  // Required password template: 1 uppercase, 1 digit, 1 symbol, 2 lowercase,
  // 3 digits — exactly 8 characters, in that fixed order (e.g. Z3*rg668).
  // A single shared rule used by every place a password gets SET (register,
  // forgot-password reset, owner change-password panel) so they can never
  // drift out of sync with each other.
  var PASSWORD_FORMAT_REGEX = /^[A-Z]\d[!@#$%^&*_\-+=]{1}[a-z]{2}\d{3}$/;
  var PASSWORD_FORMAT_HINT = 'صيغة كلمة المرور غير صحيحة';
  function _validatePasswordFormat(pw) { return PASSWORD_FORMAT_REGEX.test(pw); }

  function _roleFor(acc) {
    var email = (typeof acc === 'string') ? acc : (acc && acc.email);
    if (_isOwner(email)) return 'admin';
    if (acc && typeof acc === 'object' && acc.role === 'doctor') return 'doctor';
    return 'student';
  }
  // Doctor access code (owner-configurable) — gates becoming a doctor
  function _doctorCode() { try { return (localStorage.getItem('aus.doctor.code') || 'aus@dr').trim(); } catch (e) { return 'aus@dr'; } }
  function setDoctorCode(code) { try { (code && code.trim()) ? localStorage.setItem('aus.doctor.code', code.trim()) : localStorage.removeItem('aus.doctor.code'); } catch (e) {} }

  // ── 4-panel login state ────────────────────────────────────────────
  var AUTH_STATE = { role: 'student', mode: 'login' };

  // ── Session ────────────────────────────────────────────────────────
  function _saveSession(acc) {
    _user = _publicUser(acc);
    var sessionOk = false;
    try { localStorage.setItem(LS.session, JSON.stringify(_user)); sessionOk = true; } catch (e) {}
    // Touch lastLogin on the stored account
    _upsertAccount({ email: acc.email, id: acc.id, lastLogin: Date.now() });
    var accountOk = !!_findAccount(acc.email);
    if (!sessionOk || !accountOk) {
      // localStorage is full (or blocked, e.g. private browsing) — every write
      // above just failed SILENTLY (they're wrapped in try/catch). The login
      // still looks successful for this tab because _user is set in memory,
      // but nothing durable was saved, so the next reload — or the next time
      // this person logs in — will show "account not found" again with no
      // obvious reason why. Surface it now instead of letting it resurface
      // later as a confusing mystery.
      _toast('⚠️ تنبيه: مساحة التخزين ممتلئة — قد لا يُحفظ دخولك بعد إغلاق الصفحة. فرّغ بعض البيانات (كتب/محتوى مولّد) من ⚙️ الإعدادات.', 'error');
    }
    return sessionOk && accountOk;
  }
  function _loadSession() {
    try { var raw = localStorage.getItem(LS.session); _user = raw ? JSON.parse(raw) : null; } catch (e) { _user = null; }
  }
  function _clearSession() {
    _user = null; _token = null;
    try {
      localStorage.removeItem(LS.session);
      // clear legacy backend-token keys too
      localStorage.removeItem('aus_access_token'); localStorage.removeItem('aus_refresh_token'); localStorage.removeItem('aus_user_data'); localStorage.removeItem('aus_session_email');
    } catch (e) {}
  }

  // ── UI ─────────────────────────────────────────────────────────────
  function _showError(msg) { var el = document.getElementById('authError'); if (el) { el.textContent = msg; el.classList.add('visible'); } }
  function _hideError() { var el = document.getElementById('authError'); if (el) el.classList.remove('visible'); }
  function _setLoading(btnId, txtId, loading, label) {
    var b = document.getElementById(btnId); var s = document.getElementById(txtId);
    if (b) b.disabled = loading; if (s) s.textContent = loading ? '...' : label;
  }
  var PROVIDER_LABEL = { email: '', google: 'Google', microsoft: 'Microsoft', apple: 'Apple', guest: 'ضيف' };

  function _updateUI() {
    var loginBtn = document.getElementById('authLoginBtn');
    var pill = document.getElementById('userMenuPill');
    var nameEl = document.getElementById('authUserName');
    var avatarEl = document.getElementById('authUserAvatar');
    var badgeEl = document.getElementById('authPlanBadge');
    var upgradeBtn = document.getElementById('upgradeDropdownBtn');
    if (!loginBtn || !pill) return;
    if (_user) {
      loginBtn.style.display = 'none';
      pill.style.display = 'flex';
      var name = _user.full_name || _user.email || '—';
      if (nameEl) nameEl.textContent = name.substring(0, 16);
      if (avatarEl) {
        if (_user.avatar) { avatarEl.textContent = ''; avatarEl.style.backgroundImage = 'url(' + _user.avatar + ')'; avatarEl.style.backgroundSize = 'cover'; }
        else { avatarEl.style.backgroundImage = ''; avatarEl.textContent = (name[0] || '؟').toUpperCase(); }
      }
      if (badgeEl) { badgeEl.textContent = _user.plan === 'pro' ? 'PRO' : 'Free'; badgeEl.className = 'plan-badge ' + (_user.plan === 'pro' ? 'pro' : 'free'); }
      if (upgradeBtn) upgradeBtn.style.display = _user.plan === 'pro' ? 'none' : 'flex';
      // Show admin-panel entry ONLY for the single owner account
      var adminEntry = document.getElementById('adminPanelDropdownBtn');
      if (adminEntry) adminEntry.style.display = _isOwner(_user.email) ? 'flex' : 'none';
      // Show doctor-panel entry for doctors (and the owner)
      var docEntry = document.getElementById('doctorPanelDropdownBtn');
      if (docEntry) docEntry.style.display = (_user.role === 'doctor' || _isOwner(_user.email)) ? 'flex' : 'none';
      // Hide admin-only settings (payments / providers) from everyone else
      _gateAdminSettings();
    } else {
      loginBtn.style.display = 'flex';
      pill.style.display = 'none';
    }
    try { window.dispatchEvent(new Event('aus-auth-changed')); } catch (e) {}
  }

  function _toast(msg, type) {
    if (typeof showToast === 'function') { showToast(msg, type === 'success' ? 'xp-toast' : 'heart-toast'); return; }
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:5rem;left:50%;transform:translateX(-50%);z-index:9800;background:rgba(0,10,30,.95);border:1px solid rgba(0,245,212,.4);border-radius:12px;padding:.7rem 1.3rem;color:#69f0ae;font-family:Tajawal,sans-serif;font-weight:700;font-size:.9rem;';
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2800);
  }

  // ── Modal controls (4-role flow) ───────────────────────────────────
  function _show(id, on) { var el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; }

  function openModal(tab) {
    var o = document.getElementById('authModalOverlay'); if (o) o.classList.add('visible');
    _hideError();
    if (tab === 'upgrade' || tab === 'profile') {
      _show('authRoleStep', false); _show('authFormStep', false); _show('authFormUpgrade', true);
    } else {
      backToRoles();
    }
  }
  function closeModal() { var o = document.getElementById('authModalOverlay'); if (o) o.classList.remove('visible'); }
  function handleOverlayClick(e) { if (e.target === document.getElementById('authModalOverlay')) closeModal(); }

  // Step 1 → role chooser
  function backToRoles() {
    _hideError();
    _show('authFormUpgrade', false);
    _show('authFormStep', false);
    _show('authRoleStep', true);
  }

  var ROLE_META = {
    student: { badge: '🎓 دخول الطالب', social: true,  canRegister: true },
    doctor:  { badge: '👨‍🏫 دخول الدكتور', social: true,  canRegister: true },
    admin:   { badge: '🛡️ دخول الإدارة', social: false, canRegister: false }
  };

  // Step 2 → role-specific form
  function selectRole(role) {
    if (role === 'guest') { loginGuest(); return; }
    AUTH_STATE.role = role;
    AUTH_STATE.mode = 'login';
    _hideError();
    _show('authRoleStep', false);
    _show('authFormUpgrade', false);
    _show('authFormStep', true);
    var meta = ROLE_META[role] || ROLE_META.student;
    var badge = document.getElementById('authRoleBadge'); if (badge) badge.textContent = meta.badge;
    // doctor code field only for the doctor panel
    _show('authDoctorCodeField', role === 'doctor');
    // student accounts use the university-issued id@aus.jo format
    var emLabel = document.getElementById('loginEmailLabel');
    var emInput = document.getElementById('loginEmail');
    if (role === 'student') {
      if (emLabel) emLabel.textContent = 'الرقم الجامعي';
      if (emInput) emInput.setAttribute('placeholder', '202420300@aus.jo');
    } else {
      if (emLabel) emLabel.textContent = 'البريد الإلكتروني';
      if (emInput) emInput.setAttribute('placeholder', 'you@university.edu');
    }
    // admin: login-only + a hint, no social, no register switch
    _show('authModeSwitch', !!meta.canRegister);
    _show('authSocialHolder', !!meta.social);
    var note = document.getElementById('authAdminNote');
    if (note) { note.style.display = role === 'admin' ? 'block' : 'none'; if (role === 'admin') note.textContent = 'ادخل ببريد المالك وكلمة سرّ الإدارة. لا يوجد إنشاء حساب هنا.'; }
    _applyMode();
    if (meta.social) _initGoogle();
    setTimeout(function () { var em = document.getElementById('loginEmail'); if (em) em.focus(); }, 60);
  }

  function toggleMode() { AUTH_STATE.mode = (AUTH_STATE.mode === 'login') ? 'register' : 'login'; _hideError(); _applyMode(); }

  function _applyMode() {
    var reg = AUTH_STATE.mode === 'register';
    _show('authNameField', reg && AUTH_STATE.role !== 'admin');
    var lbl = document.getElementById('loginPasswordLabel'); if (lbl) lbl.textContent = 'كلمة المرور';
    // The format example only makes sense when SETTING a new password
    // (register) — showing it during login would wrongly imply an existing
    // password must match that literal example. Placeholder itself stays
    // generic either way — the exact format only shows in PASSWORD_FORMAT_HINT
    // if what's typed is rejected, never as a plaintext example up front.
    var pwField = document.getElementById('loginPassword');
    if (pwField) pwField.setAttribute('placeholder', reg ? 'password' : '••••••••••••');
    var t = document.getElementById('authSubmitText');
    if (t) t.textContent = reg ? 'إنشاء الحساب' : 'تسجيل الدخول';
    var hint = document.getElementById('authModeHint');
    var link = document.getElementById('authModeLink');
    if (hint) hint.textContent = reg ? 'لديك حساب؟' : 'ليس لديك حساب؟';
    if (link) { link.textContent = reg ? 'سجّل الدخول' : 'أنشئ حساباً'; link.onclick = toggleMode; }
    var meta = ROLE_META[AUTH_STATE.role] || ROLE_META.student;
    _show('authModeSwitch', !!meta.canRegister);
    var pw = document.getElementById('loginPassword'); if (pw) pw.setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
  }

  function toggleDropdown() {
    var pill = document.getElementById('userMenuPill');
    if (pill) pill.classList.toggle('open');
    setTimeout(function () {
      document.addEventListener('click', function _c(e) {
        var p = document.getElementById('userMenuPill');
        if (p && !p.contains(e.target)) { p.classList.remove('open'); document.removeEventListener('click', _c); }
      });
    }, 0);
  }
  function openUpgrade() { var p = document.getElementById('userMenuPill'); if (p) p.classList.remove('open'); openModal('upgrade'); }

  // ── Backend best-effort sync (never blocks local-first flow) ───────
  async function _backend(method, path, body) {
    try {
      var res = await fetch(API_BASE + path, { method: method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      var data = await res.json().catch(function () { return {}; });
      return { ok: res.ok, status: res.status, data: data };
    } catch (e) { return { ok: false, status: 0, data: null }; }
  }
  function _storeBackendTokens(data) {
    if (data && data.access_token) {
      _token = data.access_token;
      try {
        localStorage.setItem('aus_access_token', data.access_token); if (data.refresh_token) localStorage.setItem('aus_refresh_token', data.refresh_token);
        // whose tokens these are — aus_52_session.js never uses them for a DIFFERENT local account
        if (data.user && data.user.email) localStorage.setItem('aus_session_email', String(data.user.email).toLowerCase());
      } catch (e) {}
      try { window.dispatchEvent(new Event('aus-session-changed')); } catch (e) {}
      // Token is now available → let sync modules (catalog/results) flush anything pending
      try { window.dispatchEvent(new Event('aus-auth-changed')); } catch (e) {}
    }
  }
  function _syncRegister(email, password, name) {
    // Best-effort: also create the account on the server so it survives a local
    // cache clear (login falls back to the server when the local copy is gone).
    return _backend('POST', '/api/auth/register', { email: email, password: password, full_name: name || undefined }).then(function (r) {
      if (r.ok) { _storeBackendTokens(r.data); return r; }
      // Already on the server → log in instead to obtain a token (so the owner
      // can sync edits and results upload even after re-registering locally).
      if (r.status === 409) return _backend('POST', '/api/auth/login', { email: email, password: password }).then(function (r2) { if (r2.ok) _storeBackendTokens(r2.data); return r2; });
      return r;
    });
  }
  function _syncLogin(email, password) {
    _backend('POST', '/api/auth/login', { email: email, password: password }).then(function (r) {
      if (r.ok && r.data && r.data.access_token) { _storeBackendTokens(r.data); return; }
      // The local-first sign-in worked but the SERVER did not take this password (or is down). Nothing is lost: the owner's
      // server-side actions (activating a payment, issuing a certificate …) ask for the server password ONCE in a small dialog
      // (aus_52_session.js). Say so now instead of letting it surface later as "your session expired".
      var have = ''; try { have = localStorage.getItem('aus_access_token') || localStorage.getItem('aus_refresh_token') || ''; } catch (e) {}
      if (!have && _isOwner(email)) {
        if (r.status === 401) _toast('دخلتَ محلياً ✓ — لكن كلمة المرور هذه لا تطابق كلمة مرور المالك على الخادم. ستُطلب كلمة مرور الخادم مرة واحدة عند أول إجراء إداري (تفعيل دفعة / إصدار شهادة).', 'info');
        else if (r.status === 0) _toast('دخلتَ محلياً ✓ — الخادم غير متاح الآن؛ إجراءات الإدارة التي تحتاجه تتطلب تشغيله (START_AUS.bat).', 'info');
      }
    });
  }

  // ── Unified submit (4-role flow) ───────────────────────────────────
  function submitAuth() {
    _hideError();
    // Doctor panel: a valid doctor code is required to register as a doctor.
    if (AUTH_STATE.role === 'doctor' && AUTH_STATE.mode === 'register') {
      var code = ((document.getElementById('authDoctorCode') || {}).value || '').trim();
      if (!code) { _showError('أدخل رمز الدكتور للتسجيل كدكتور'); return; }
      if (code !== _doctorCode()) { _showError('رمز الدكتور غير صحيح'); return; }
    }
    if (AUTH_STATE.mode === 'register') doRegister();
    else doLogin();
  }

  function _intendedRole(email) {
    if (_isOwner(email)) return 'admin';
    if (AUTH_STATE.role === 'doctor') {
      var code = ((document.getElementById('authDoctorCode') || {}).value || '').trim();
      if (code && code === _doctorCode()) return 'doctor';
    }
    return 'student';
  }

  // ── Email/password register (local-first) ──────────────────────────
  async function doRegister() {
    _hideError();
    var name = (document.getElementById('regName') || {}).value || '';
    var email = ((document.getElementById('loginEmail') || {}).value || '').toLowerCase().trim();
    // The password format itself never allows whitespace (every character
    // class in PASSWORD_FORMAT_REGEX excludes it), so a stray leading/
    // trailing space can only ever be an accidental keystroke or something
    // autofill inserted — never a real part of the password. Trimming here
    // (and identically in doLogin below) means that accident can't silently
    // change the hash and make a correctly-typed password fail to match.
    var pass = ((document.getElementById('loginPassword') || {}).value || '').trim();
    if (!email || !pass) { _showError('البريد وكلمة المرور مطلوبان'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { _showError('صيغة البريد غير صحيحة'); return; }
    if (AUTH_STATE.role === 'student' && !_isOwner(email) && !STUDENT_EMAIL_REGEX.test(email)) {
      _showError('حساب الطالب يجب أن يكون بصيغة الرقم الجامعي: 9 أرقام ثم ‎@aus.jo (مثال: 202420300@aus.jo)');
      return;
    }
    if (!_validatePasswordFormat(pass)) { _showError(PASSWORD_FORMAT_HINT); return; }
    var existing = _findAccount(email);
    if (_accountsCorrupted) {
      // Refuse to register on top of unreadable data — proceeding would call
      // _upsertAccount, which permanently overwrites the corrupted string with
      // just this one new account, destroying any other accounts still in it.
      _showError('تعذّرت قراءة بيانات الحسابات المحفوظة في هذا المتصفح (قد تكون تالفة). هذا لا يعني أن حسابك غير موجود — لا تُنشئ حساباً جديداً الآن كي لا يُفقد أي حساب سابق. أعد تحميل الصفحة، وإن استمرت المشكلة تواصل مع الدعم قبل المتابعة.');
      return;
    }
    if (existing) { _showError('يوجد حساب بهذا البريد بالفعل — سجّل الدخول'); return; }

    _setLoading('authSubmitBtn', 'authSubmitText', true, '');
    var salt = _genSalt();
    var hash = await _hashPassword(pass, salt);
    var acc = { id: _newId(), email: email, full_name: name.trim() || email.split('@')[0], salt: salt, hash: hash, provider: 'email', plan: 'free', role: _intendedRole(email), avatar: '', createdAt: Date.now() };
    _upsertAccount(acc);
    _saveSession(acc);
    // Verify the account actually persisted (localStorage can fail silently when
    // full — e.g. from large generated books — or in private mode).
    var persistedLocally = !!_findAccount(email);
    _setLoading('authSubmitBtn', 'authSubmitText', false, 'إنشاء الحساب');
    closeModal(); _updateUI();
    if (typeof addXP === 'function') addXP(20);

    if (persistedLocally) {
      _toast('أهلاً وسهلاً ' + acc.full_name + '! حسابك جاهز 🎓', 'success');
      _syncRegister(email, pass, acc.full_name);   // best-effort server copy
    } else {
      // Local write failed → make the server the durable home of this account.
      _toast('التخزين المحلي ممتلئ — جارٍ حفظ حسابك على الخادم...', 'info');
      var r = await _syncRegister(email, pass, acc.full_name);
      if (r && r.ok) {
        _toast('تم حفظ حسابك على الخادم بنجاح ✅', 'success');
      } else {
        _showError('تعذّر حفظ الحساب: التخزين المحلي ممتلئ والخادم غير متاح. فرّغ بعض البيانات (الكتب المولّدة) من ⚙️ الإعدادات وأعد المحاولة.');
      }
    }
  }

  // ── Email/password login (local-first) ─────────────────────────────
  async function doLogin() {
    _hideError();
    var email = ((document.getElementById('loginEmail') || {}).value || '').toLowerCase().trim();
    var pass = ((document.getElementById('loginPassword') || {}).value || '').trim();
    if (!email || !pass) { _showError('يرجى تعبئة جميع الحقول'); return; }
    var acc = _findAccount(email);
    if (!acc && _accountsCorrupted) {
      // Don't tell them "account doesn't exist" — that's not established, the
      // local store is just unreadable right now. Saying so would push them
      // to "create a new account", which then permanently overwrites whatever
      // is left of the original data (see doRegister's matching guard).
      _showError('تعذّرت قراءة بيانات الحسابات المحفوظة في هذا المتصفح (قد تكون تالفة). حسابك ليس بالضرورة مفقوداً. أعد تحميل الصفحة وحاول مجدداً قبل إنشاء حساب جديد.');
      return;
    }
    if (!acc) {
      // Not found locally — the account may still live on the server (local cache
      // was cleared, or storage was full at register time). Try the backend.
      _setLoading('authSubmitBtn', 'authSubmitText', true, '');
      var r = await _backend('POST', '/api/auth/login', { email: email, password: pass });
      _setLoading('authSubmitBtn', 'authSubmitText', false, 'تسجيل الدخول');
      if (r.ok && r.data && r.data.user) {
        _storeBackendTokens(r.data);
        // Re-cache locally so future offline logins work
        var nsalt = _genSalt();
        var nhash = await _hashPassword(pass, nsalt);
        var nacc = { id: r.data.user.id || _newId(), email: email, full_name: r.data.user.full_name || email.split('@')[0], salt: nsalt, hash: nhash, provider: 'email', plan: r.data.user.plan || 'free', avatar: '', createdAt: Date.now() };
        _upsertAccount(nacc); _saveSession(nacc);
        closeModal(); _updateUI();
        _toast('مرحباً ' + nacc.full_name + ' 👋 (استُعيد حسابك من الخادم)', 'success');
        return;
      }
      if (r.status === 0) { _showError('لا يوجد حساب محلي بهذا البريد، والخادم غير متاح. شغّل الخادم (START_AUS.bat) أو أنشئ حساباً جديداً.'); return; }
      _showError('لا يوجد حساب بهذا البريد — أنشئ حساباً جديداً'); return;
    }
    if (acc.provider && acc.provider !== 'email') { _showError('هذا الحساب مرتبط بـ ' + (PROVIDER_LABEL[acc.provider] || acc.provider) + ' — استخدم زرّه'); return; }

    _setLoading('authSubmitBtn', 'authSubmitText', true, '');
    var hash = await _hashPassword(pass, acc.salt);
    _setLoading('authSubmitBtn', 'authSubmitText', false, 'تسجيل الدخول');
    if (hash !== acc.hash) { _showError('كلمة المرور غير صحيحة'); return; }
    _saveSession(acc);
    closeModal(); _updateUI();
    _toast('مرحباً ' + (acc.full_name || acc.email) + ' 👋', 'success');
    _syncLogin(email, pass); // best-effort
  }

  // ── Social / provider login (find or create local account) ─────────
  function _socialLogin(profile, idToken) {
    var email = (profile.email || '').toLowerCase().trim();
    if (!email) { _showError('لم نتمكّن من قراءة البريد من المزوّد'); return; }
    var acc = _findAccount(email);
    if (!acc) {
      acc = { id: _newId(), email: email, full_name: profile.full_name || email.split('@')[0], provider: profile.provider, plan: 'free', role: _roleFor(email), avatar: profile.avatar || '', createdAt: Date.now() };
    } else {
      acc.provider = acc.provider === 'email' ? acc.provider : profile.provider; // keep email-primary if existed
      if (profile.avatar) acc.avatar = profile.avatar;
      if (profile.full_name) acc.full_name = profile.full_name;
    }
    _upsertAccount(acc);
    _saveSession(acc);
    closeModal(); _updateUI();
    _toast('مرحباً ' + acc.full_name + ' — تم الدخول عبر ' + (PROVIDER_LABEL[profile.provider] || profile.provider) + ' ✅', 'success');
    // backend best-effort (store the returned token so the owner can sync edits)
    if (idToken) _backend('POST', '/api/auth/social', { provider: profile.provider, id_token: idToken, email: email, full_name: acc.full_name }).then(function (r) { if (r.ok) _storeBackendTokens(r.data); });
  }

  // ── Guest login ────────────────────────────────────────────────────
  function loginGuest() {
    if (_gate) return;   // the mandatory-login gate (below) has no guest shortcut
    var acc = _findAccount('guest@aus.local');
    if (!acc) acc = { id: _newId(), email: 'guest@aus.local', full_name: 'ضيف', provider: 'guest', plan: 'free', role: 'student', avatar: '', createdAt: Date.now() };
    _upsertAccount(acc); _saveSession(acc);
    closeModal(); _updateUI();
    _toast('مرحباً بك كضيف 👋 — يمكنك ربط حسابك لاحقاً', 'success');
  }

  // ── Mandatory login gate (intro → splash → [login / register] → main app) ──
  // enterMainApp() (aus_02_core.js) calls requireLogin() first. With a real session (e-mail account or social — NOT a guest)
  // it returns true and the app opens as before. Otherwise the existing login/register modal opens in "gate" mode — above the
  // splash, no ✕, no guest shortcut (CSS below) — and `onDone` runs by itself the moment sign-in or sign-up succeeds; the
  // modal's own success cinematic (auth_experience.js) plays on top while the app opens underneath.
  // This app is local-first, so the gate is a UX rule, not security: what must really be protected (exam credits, grading,
  // certificates) is enforced by the server API.
  var _gate = null;                                       // { onDone } while the gate is up, null otherwise
  function _hasSession() {
    if (!_user) _loadSession();                           // init() may not have run yet: read the stored session directly
    return !!(_user && _user.email && _user.provider !== 'guest');
  }
  function requireLogin(onDone) {
    if (_hasSession()) return true;
    _gate = { onDone: onDone };
    document.body.classList.add('auth-gate');
    window.ausAuth.openModal('login');                    // the exported one: auth_experience.js hooks it for its entrance effects
    return false;
  }
  function _passGate() {
    var done = _gate && _gate.onDone;
    _gate = null;                                         // from here on the modal may close, and its success cinematic can run
    setTimeout(function () { document.body.classList.remove('auth-gate'); }, 2200);   // keep the gate styling until that cinematic (~1.8 s) is over
    if (typeof done === 'function') done();
  }
  // _updateUI() fires this after every successful sign-in / sign-up (and on logout, when there is no session yet)
  window.addEventListener('aus-auth-changed', function () { if (_gate && _hasSession()) _passGate(); });

  (function injectGateCSS() {
    if (document.getElementById('auth-gate-styles')) return;
    var s = document.createElement('style');
    s.id = 'auth-gate-styles';
    s.textContent =
      'body.auth-gate #authModalOverlay { z-index: 100000; }' +                            // above the intro (99999) and the splash (99998)
      'body.auth-gate #authModalOverlay .auth-close { display: none; }' +                  // mandatory: nothing to dismiss it with
      'body.auth-gate #authModalOverlay .auth-role-card.guest { display: none; }' +        // …and no guest shortcut
      'body.auth-gate #authModalOverlay .auth-role-card.admin { grid-column: 1 / -1; }';   // 3 cards left: keep the 2-column grid balanced
    document.head.appendChild(s);
  })();

  // ── JWT decode (for Google / MS id_token) ──────────────────────────
  function _decodeJwt(t) {
    try {
      var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var pad = '='.repeat((4 - p.length % 4) % 4);
      var json = decodeURIComponent(atob(p + pad).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  // ── Client-ID getters ──────────────────────────────────────────────
  function _gid() { try { return (localStorage.getItem(LS.google) || GOOGLE_DEFAULT || '').trim(); } catch (e) { return GOOGLE_DEFAULT; } }
  function _msid() { try { return (localStorage.getItem(LS.ms) || MS_DEFAULT || '').trim(); } catch (e) { return MS_DEFAULT; } }
  function _appleid() { try { return (localStorage.getItem(LS.apple) || APPLE_DEFAULT || '').trim(); } catch (e) { return APPLE_DEFAULT; } }

  // ── Google Identity Services ───────────────────────────────────────
  var _gsiLoaded = false, _gsiInitDone = false;
  function _loadScript(src, cb) {
    var ex = document.querySelector('script[src="' + src + '"]');
    if (ex) { if (ex.getAttribute('data-loaded')) cb(); else ex.addEventListener('load', function () { ex.setAttribute('data-loaded', '1'); cb(); }); return; }
    var s = document.createElement('script'); s.src = src; s.async = true; s.defer = true;
    s.onload = function () { s.setAttribute('data-loaded', '1'); cb(); };
    s.onerror = function () { cb(new Error('load failed')); };
    document.head.appendChild(s);
  }
  function _initGoogle() {
    var slot = document.getElementById('gsiContainer');
    if (!slot) return;
    var cid = _gid();
    if (!cid) {
      slot.innerHTML = '<button type="button" class="auth-social-btn" onclick="ausAuth.providerSetup(\'google\')"><span class="sic">' + BRAND_SVG.google + '</span> الدخول عبر Google</button>';
      return;
    }
    _loadScript('https://accounts.google.com/gsi/client', function (err) {
      if (err || !window.google || !google.accounts || !google.accounts.id) {
        slot.innerHTML = '<button type="button" class="auth-social-btn" onclick="ausAuth.providerSetup(\'google\')"><span class="sic">' + BRAND_SVG.google + '</span> الدخول عبر Google</button>';
        return;
      }
      try {
        if (!_gsiInitDone) {
          google.accounts.id.initialize({ client_id: cid, callback: function (resp) {
            var p = _decodeJwt(resp.credential);
            if (!p || !p.email) { _showError('تعذّر تسجيل الدخول عبر Google'); return; }
            _socialLogin({ email: p.email, full_name: p.name || '', avatar: p.picture || '', provider: 'google' }, resp.credential);
          } });
          _gsiInitDone = true;
        }
        slot.innerHTML = '';
        google.accounts.id.renderButton(slot, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center', locale: 'ar' });
      } catch (e) {
        slot.innerHTML = '<button type="button" class="auth-social-btn" onclick="ausAuth.providerSetup(\'google\')"><span class="sic">' + BRAND_SVG.google + '</span> الدخول عبر Google</button>';
      }
    });
  }

  // ── Microsoft (OAuth2 implicit id_token via popup) ─────────────────
  function loginMicrosoft() {
    var cid = _msid();
    if (!cid) { providerSetup('microsoft'); return; }
    var redirect = location.origin + location.pathname;
    var nonce = _genSalt();
    try { sessionStorage.setItem('aus.ms.nonce', nonce); } catch (e) {}
    var url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize' +
      '?client_id=' + encodeURIComponent(cid) +
      '&response_type=id_token' +
      '&redirect_uri=' + encodeURIComponent(redirect) +
      '&response_mode=fragment' +
      '&scope=' + encodeURIComponent('openid email profile') +
      '&nonce=' + encodeURIComponent(nonce);
    _popupAuth(url, 'microsoft');
  }

  // ── Apple (Sign in with Apple JS if configured) ────────────────────
  function loginApple() {
    var cid = _appleid();
    if (!cid) { providerSetup('apple'); return; }
    _loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js', function (err) {
      if (err || !window.AppleID) { providerSetup('apple'); return; }
      try {
        AppleID.auth.init({ clientId: cid, scope: 'name email', redirectURI: location.origin + location.pathname, usePopup: true });
        AppleID.auth.signIn().then(function (data) {
          var p = data && data.authorization && data.authorization.id_token ? _decodeJwt(data.authorization.id_token) : null;
          var email = (p && p.email) || (data && data.user && data.user.email) || '';
          var name = (data && data.user && data.user.name) ? (data.user.name.firstName + ' ' + data.user.name.lastName).trim() : '';
          if (!email) { _showError('لم نتمكّن من قراءة بريد Apple'); return; }
          _socialLogin({ email: email, full_name: name, provider: 'apple' }, (data.authorization || {}).id_token);
        }).catch(function () { _showError('أُلغي تسجيل الدخول عبر Apple'); });
      } catch (e) { providerSetup('apple'); }
    });
  }

  // ── Popup helper for fragment-returning OAuth (Microsoft) ──────────
  function _popupAuth(url, provider) {
    var w = 480, h = 640;
    var left = (screen.width - w) / 2, top = (screen.height - h) / 2;
    var pop = window.open(url, 'aus_oauth_' + provider, 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
    if (!pop) { _showError('فعّل النوافذ المنبثقة لإكمال تسجيل الدخول'); return; }
    var timer = setInterval(function () {
      try {
        if (pop.closed) { clearInterval(timer); return; }
        var hash = pop.location.hash || '';
        if (hash.indexOf('id_token=') !== -1) {
          clearInterval(timer);
          var m = hash.match(/id_token=([^&]+)/);
          var idt = m ? decodeURIComponent(m[1]) : '';
          pop.close();
          var p = _decodeJwt(idt);
          if (!p) { _showError('تعذّرت قراءة استجابة المزوّد'); return; }
          var email = p.email || p.preferred_username || '';
          _socialLogin({ email: email, full_name: p.name || '', provider: provider }, idt);
        }
      } catch (e) { /* cross-origin until redirect back — ignore */ }
    }, 400);
  }

  // ── Catch OAuth fragment if provider redirected the main window ────
  function _catchRedirectFragment() {
    var hash = location.hash || '';
    if (hash.indexOf('id_token=') === -1) return;
    var m = hash.match(/id_token=([^&]+)/);
    if (!m) return;
    var idt = decodeURIComponent(m[1]);
    var p = _decodeJwt(idt);
    if (p && p.email) { _socialLogin({ email: p.email || p.preferred_username, full_name: p.name || '', provider: 'microsoft' }, idt); }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  // ── Provider not-configured guidance ───────────────────────────────
  function providerSetup(provider) {
    var names = { google: 'Google', microsoft: 'Microsoft', apple: 'Apple' };
    var where = {
      google: 'Google Cloud Console → APIs & Services → Credentials → OAuth Client ID (نوع: Web). أضف ' + location.origin + ' في Authorized JavaScript origins.',
      microsoft: 'Azure Portal → App registrations → تطبيق جديد → Redirect URI (SPA): ' + location.origin + location.pathname,
      apple: 'Apple Developer → Identifiers → Services ID، وفعّل Sign in with Apple.'
    };
    _showError('للتفعيل أضف ' + names[provider] + ' Client ID من ⚙️ الإعدادات. مكان الحصول عليه: ' + where[provider]);
  }

  // ── Save provider client IDs (called from settings) ────────────────
  function saveProviderConfig(cfg) {
    try {
      if (typeof cfg.google === 'string') { cfg.google.trim() ? localStorage.setItem(LS.google, cfg.google.trim()) : localStorage.removeItem(LS.google); }
      if (typeof cfg.microsoft === 'string') { cfg.microsoft.trim() ? localStorage.setItem(LS.ms, cfg.microsoft.trim()) : localStorage.removeItem(LS.ms); }
      if (typeof cfg.apple === 'string') { cfg.apple.trim() ? localStorage.setItem(LS.apple, cfg.apple.trim()) : localStorage.removeItem(LS.apple); }
    } catch (e) {}
    _gsiInitDone = false;
    _initGoogle();
  }
  function getProviderConfig() { return { google: _gid(), microsoft: _msid(), apple: _appleid() }; }

  // ── Logout ─────────────────────────────────────────────────────────
  function logout() {
    var pill = document.getElementById('userMenuPill'); if (pill) pill.classList.remove('open');
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    _clearSession(); _updateUI();
    _toast('تم تسجيل الخروج', 'info');
  }

  // ── Profile (account info) ─────────────────────────────────────────
  function accountInfo() { return _user ? Object.assign({}, _user) : null; }

  // Re-hash the current account's password locally (after a password change) so
  // local-first login on THIS device keeps working with the new password.
  async function updateLocalPassword(newPw) {
    if (!_user) return false;
    var acc = _findAccount(_user.email); if (!acc) return false;
    var salt = _genSalt(); var hash = await _hashPassword(newPw, salt);
    _upsertAccount({ email: _user.email, id: acc.id, salt: salt, hash: hash, provider: 'email' });
    return true;
  }

  // ── Admin: account management (all client-side, local-first) ───────
  function listAccounts() {
    // Return safe public views (never expose hash/salt). Role is always derived
    // from the email so a stored role can never grant admin to a non-owner.
    return _loadAccounts().map(function (a) {
      return { id: a.id, email: a.email, full_name: a.full_name || a.email, role: _roleFor(a),
        plan: a.plan || 'free', provider: a.provider || 'email', active: a.active !== false,
        createdAt: a.createdAt || null, lastLogin: a.lastLogin || null, isOwner: _isOwner(a.email) };
    });
  }
  // Hide/show the admin-only settings groups based on owner status
  function _gateAdminSettings() {
    var isOwner = _user && _isOwner(_user.email);
    var nodes = document.querySelectorAll('.cp-admin-only');
    for (var i = 0; i < nodes.length; i++) nodes[i].style.display = isOwner ? '' : 'none';
  }
  function _requireAdmin() { return _user && _isOwner(_user.email); }
  function adminSetPlan(email, plan) {
    if (!_requireAdmin()) return false;
    _upsertAccount({ email: (email || '').toLowerCase().trim(), plan: plan === 'pro' ? 'pro' : 'free' });
    if (_user && _user.email === email) { _user.plan = plan; try { localStorage.setItem(LS.session, JSON.stringify(_user)); } catch (e) {} _updateUI(); }
    return true;
  }
  function adminSetActive(email, active) {
    if (!_requireAdmin()) return false;
    _upsertAccount({ email: (email || '').toLowerCase().trim(), active: !!active });
    return true;
  }
  function adminDeleteAccount(email) {
    if (!_requireAdmin()) return false;
    email = (email || '').toLowerCase().trim();
    if (_isOwner(email)) return false;   // the owner account can never be deleted
    var all = _loadAccounts().filter(function (a) { return a.email !== email; });
    _saveAccounts(all);
    return true;
  }

  // ── Upgrade / checkout (kept, best-effort) ─────────────────────────
  async function startCheckout() {
    if (!_user) { openModal('login'); return; }
    var r = await _backend('POST', '/api/payments/create-checkout', {});
    if (r.ok && r.data && r.data.checkout_url) { window.open(r.data.checkout_url, '_blank'); closeModal(); }
    else { _showError('الترقية عبر الموقع غير مفعّلة حالياً. الدفع متاح عبر CliQ / IBAN.'); }
  }

  // ── Plan gate (kept compatible) ────────────────────────────────────
  function checkGate(feature) {
    if (!_user) { openModal('login'); return false; }
    return true; // local-first: all features open once logged in
  }

  // ── Inject provider UI into the modal (inside the form step) ───────
  function _injectProviderUI() {
    if (document.getElementById('authSocial')) return;
    var holder = document.getElementById('authSocialHolder');
    if (!holder) return;
    var div = document.createElement('div');
    div.id = 'authSocial';
    div.innerHTML =
      '<div class="auth-divider"><span>أو تابع عبر</span></div>' +
      '<div class="auth-social">' +
      '<div id="gsiContainer"></div>' +
      '<button type="button" class="auth-social-btn ms" onclick="ausAuth.loginMicrosoft()"><span class="sic">' + BRAND_SVG.microsoft + '</span> الدخول عبر Microsoft</button>' +
      '<button type="button" class="auth-social-btn apple" onclick="ausAuth.loginApple()"><span class="sic">' + BRAND_SVG.apple + '</span> الدخول عبر Apple</button>' +
      '</div>';
    holder.appendChild(div);
  }

  // ── Strip stale listeners on the inputs + bind Enter → submitAuth ──
  function _refreshInputs() {
    ['loginPassword', 'loginEmail', 'regName', 'authDoctorCode'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { var n = el.cloneNode(true); el.parentNode.replaceChild(n, el); }
    });
    ['loginPassword', 'authDoctorCode'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAuth(); });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    _injectProviderUI();
    _refreshInputs();
    _loadSession();
    _updateUI();
    _catchRedirectFragment();
    setTimeout(function () {
      var b = document.getElementById('authLoginBtn');
      if (b) b.style.display = _user ? 'none' : 'flex';
      _initGoogle();
    }, 1200);
  }

  // ── Replace the global ausAuth (keep method names) ─────────────────
  window.ausAuth = {
    openModal: openModal,
    // while the mandatory-login gate is up the modal cannot be dismissed (✕ / click outside); the success paths inside this
    // file call the internal closeModal() directly, so signing in still closes it normally
    closeModal: function () { if (!_gate) closeModal(); },
    handleOverlayClick: function (e) { if (!_gate) handleOverlayClick(e); },
    requireLogin: requireLogin, get hasSession() { return _hasSession(); },
    selectRole: selectRole, backToRoles: backToRoles, toggleMode: toggleMode, submitAuth: submitAuth,
    switchTab: function () {}, toggleDropdown: toggleDropdown, openUpgrade: openUpgrade,
    doLogin: doLogin, doRegister: doRegister, logout: logout,
    loginGuest: loginGuest, loginGoogle: function () { _initGoogle(); }, loginMicrosoft: loginMicrosoft, loginApple: loginApple,
    providerSetup: providerSetup, saveProviderConfig: saveProviderConfig, getProviderConfig: getProviderConfig,
    setDoctorCode: setDoctorCode, get doctorCode() { return _doctorCode(); },
    startCheckout: startCheckout, checkGate: checkGate, accountInfo: accountInfo,
    listAccounts: listAccounts, adminSetPlan: adminSetPlan,
    adminSetActive: adminSetActive, adminDeleteAccount: adminDeleteAccount,
    gateAdminSettings: _gateAdminSettings, updateLocalPassword: updateLocalPassword,
    validatePasswordFormat: _validatePasswordFormat, get passwordFormatHint() { return PASSWORD_FORMAT_HINT; },
    // after a page reload the in-memory token is gone — the stored one is the same session (kept fresh by aus_52_session.js)
    get user() { return _user; }, get token() { if (_token) return _token; try { return localStorage.getItem('aus_access_token') || null; } catch (e) { return null; } }, get isPro() { return _user && _user.plan === 'pro'; },
    get role() { return _user ? _user.role : null; },
    get isAdmin() { return _user && _isOwner(_user.email); },
    get isOwner() { return _user && _isOwner(_user.email); },
    get isDoctor() { return _user && _user.role === 'doctor'; },
    get ownerEmail() { return OWNER_EMAIL; }
  };

  // ── Settings-panel integration (provider Client IDs) ──────────────
  window._populateSocialInputs = function () {
    _gateAdminSettings();   // hide payment/provider config from non-owners
    var cfg = getProviderConfig();
    var map = { 'm-googleClientId': cfg.google, 'm-msClientId': cfg.microsoft, 'm-appleClientId': cfg.apple };
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = map[id] || ''; });
  };
  window._saveSocialLoginSettings = function () {
    if (!(_user && _isOwner(_user.email))) { var m0 = document.getElementById('social-save-msg'); if (m0) m0.textContent = 'التعديل متاح لمالك التطبيق فقط'; return; }
    saveProviderConfig({
      google:    (document.getElementById('m-googleClientId') || {}).value || '',
      microsoft: (document.getElementById('m-msClientId') || {}).value || '',
      apple:     (document.getElementById('m-appleClientId') || {}).value || ''
    });
    var msg = document.getElementById('social-save-msg');
    if (msg) { msg.textContent = '✓ تم الحفظ — أعد فتح نافذة الدخول لتفعيل الأزرار'; setTimeout(function () { msg.textContent = ''; }, 3500); }
  };

  // ── Settings-panel integration (doctor registration code) ──────────
  window._populateDoctorCodeInput = function () {
    var el = document.getElementById('m-doctorCode');
    if (el) el.value = _doctorCode();
  };
  // Avoids visually ambiguous characters (0/O, 1/I/L) since a human has to
  // read this off a screen and type or forward it correctly.
  window._generateDoctorCode = function () {
    var alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var part = function (len) {
      var b = new Uint8Array(len);
      (crypto.getRandomValues ? crypto : window.crypto).getRandomValues(b);
      return Array.prototype.map.call(b, function (x) { return alphabet[x % alphabet.length]; }).join('');
    };
    var code = 'DR-' + part(4) + '-' + part(4);
    var el = document.getElementById('m-doctorCode');
    if (el) el.value = code;
    var msg = document.getElementById('doctor-code-save-msg');
    if (msg) msg.textContent = 'رمز جديد جاهز — اضغط "حفظ الرمز" لتفعيله';
  };
  window._saveDoctorCodeSettings = function () {
    if (!(_user && _isOwner(_user.email))) { var m0 = document.getElementById('doctor-code-save-msg'); if (m0) m0.textContent = 'التعديل متاح لمالك التطبيق فقط'; return; }
    var val = ((document.getElementById('m-doctorCode') || {}).value || '').trim();
    if (!val) { var m1 = document.getElementById('doctor-code-save-msg'); if (m1) m1.textContent = 'أدخل رمزاً أو وّلد واحداً أولاً'; return; }
    setDoctorCode(val);
    var msg = document.getElementById('doctor-code-save-msg');
    if (msg) { msg.textContent = '✓ تم الحفظ — شاركه الآن مع الدكاترة'; setTimeout(function () { msg.textContent = ''; }, 3500); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 100);
})();
