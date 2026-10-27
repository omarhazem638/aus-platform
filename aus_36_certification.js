// =============================================================================
// aus_36_certification.js  —  Professional Certification System
// Attaches automatically to every tool across all 7 specialties (70 tools).
// Two tracks: Knowledge Certificate (5 JOD · 25 Q · 20s/Q) and
//             Practical Certificate (10 JOD · 40 Q · 20s/Q)
// Question generation: template-based (offline, always works) + AI-enhanced
// via window._AUS_AI.askJSON when the backend is reachable.
// =============================================================================

(function () {
'use strict';

// ── Config ───────────────────────────────────────────────────────────────────
var CERT_CONFIG = {
    knowledge: {
        price: 5, questions: 25, seconds: 60, passPercent: 80,
        label: 'شهادة المعرفة', labelEn: 'Knowledge Certificate', icon: '📘',
        passMsg: '🎉 تهانينا، لقد اجتزت اختبار شهادة المعرفة بنجاح.',
        failMsg: 'حظاً أوفر. يمكنك إعادة المحاولة بعد مراجعة المحتوى التعليمي.'
    },
    practical: {
        price: 10, questions: 40, seconds: 60, passPercent: 80,
        label: 'شهادة الممارسة', labelEn: 'Practical Certificate', icon: '🏆',
        passMsg: '🎉 تهانينا، لقد اجتزت شهادة الممارسة.',
        failMsg: 'حظاً أوفر. يمكنك إعادة المحاولة لاحقاً.'
    }
};

var PURCHASED_KEY = 'aus.cert.purchased'; // legacy (credits lived in localStorage) — no longer read or written; the server owns them now
var ATTEMPT_KEY_PREFIX = 'aus.cert.attempt.';
var RESULTS_KEY = 'aus.cert.results';     // legacy (results lived in localStorage) — no longer read or written; the server owns them now
var REQUESTS_KEY = 'aus.cert.requests';
var AI_CACHE_KEY_PREFIX = 'aus.cert.aiExtra.';

function certId(type, specId, toolIdx) { return type + '_' + specId + '_' + toolIdx; }

// ═════════════════════════════════════════════════════════════════════════════
// CREDITS · EXAM · SCORE now live on the SERVER (routes/certificates.py → /api/certificates/exam/*)
// ═════════════════════════════════════════════════════════════════════════════
// They used to be kept in localStorage — so the credit balance, the answer key AND the score were all editable
// from DevTools (`credits[id] = 99`, `percent: 100`). Now:
//   • credits → an append-only ledger on the server. An admin grant (a manual payment checked against the real bank
//               account) or a PayPal order the server itself verified adds one; starting a sitting spends one.
//   • exam    → drawn from a server-side question bank. The browser receives the questions, NEVER the answer key.
//   • score   → computed by the server from the submitted answers and stored there; /issue can verify it.
// What is left below that still looks like "credits" / "results" is only a read-only CACHE of what the server last
// said, used to draw buttons and badges. Editing it from DevTools changes nothing that matters: /exam/start answers
// 402 to a student with no credit, and /exam/<id>/submit ignores any score the browser sends.
var _srvState = { email: null, credits: {}, open: [], results: {}, unlimited: false, loaded: false, ts: 0 };
var _srvConfig = null;       // /exam/config — fetched once per page load
var _refreshPromise = null;  // single-flight: refresh tokens ROTATE, two parallel refreshes would invalidate each other

function _currentEmail() { return (window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || null; }
function _apiBase() { return window.AUS_API_BASE || ((typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'); }
function _getTok(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }

// -> Promise<{ok, status, data}> — never rejects. status 0 = the server could not be reached (no answer at all, or none within
// `timeoutMs`: a request that hangs would otherwise leave "جارٍ تصحيح إجاباتك…" on screen forever).
function _rawFetch(method, path, body, token, timeoutMs) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, timeoutMs || 25000) : null;
    function done(r) { if (timer) clearTimeout(timer); return r; }
    try {
        return fetch(_apiBase() + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined })
            .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return done({ ok: res.ok, status: res.status, data: data || {} }); }); })
            .catch(function () { return done({ ok: false, status: 0, data: { detail: 'network' } }); });
    } catch (e) { return Promise.resolve(done({ ok: false, status: 0, data: { detail: 'network' } })); }
}

function _refreshTokens() {
    // ONE refresher for the whole app (aus_52_session.js): rotating refresh tokens must never be spent by two modules at once
    if (window.AUS_SESSION) return window.AUS_SESSION.refresh();
    if (_refreshPromise) return _refreshPromise;
    var rt = _getTok('aus_refresh_token');
    if (!rt) return Promise.resolve(false);
    _refreshPromise = _rawFetch('POST', '/api/auth/refresh', { refresh_token: rt }).then(function (r) {
        _refreshPromise = null;
        if (!(r.ok && r.data.access_token)) return false;
        try {
            localStorage.setItem('aus_access_token', r.data.access_token);
            if (r.data.refresh_token) localStorage.setItem('aus_refresh_token', r.data.refresh_token);
        } catch (e) {}
        return true;
    });
    return _refreshPromise;
}

// Authenticated call. The access token lasts 15 minutes and an exam can last 40, so a 401 silently refreshes once.
// With aus_52_session.js loaded it goes through the shared gate (Authorization header, early refresh, one refresh at a time,
// and — for owner actions, opts = {interactive:true, owner:true} — a small "sign in to the server" dialog instead of a dead end).
function _srv(method, path, body, opts) {
    if (window.AUS_SESSION) return window.AUS_SESSION.request(method, path, body, opts);
    return _rawFetch(method, path, body, _getTok('aus_access_token')).then(function (r) {
        if (r.status !== 401) return r;
        return _refreshTokens().then(function (ok) {
            return ok ? _rawFetch(method, path, body, _getTok('aus_access_token')) : r;
        });
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// REACHING THE SERVER — what "can't connect" really means, and not giving up at the first failure
// ═════════════════════════════════════════════════════════════════════════════
// The exam is drawn and graded on the server, so a sitting cannot START without it. What used to happen: the first call (POST /exam/start)
// failing for ANY reason — a server still booting (uvicorn --reload needs ~30 s), a proxy answering 502/503 while it restarts, a page origin
// the server's CORS list refuses, a wrong API address for this deployment, the student's own Wi-Fi — ended in the same dead-end message.
// The helpers below tell those cases apart (probeServer), wait for the server instead of giving up (waitForServer) and repeat only what is
// safe to repeat: /exam/start RESUMES an open sitting instead of opening (or charging) a second one, and /exam/<id>/submit answers a repeated
// submission with the stored result — so a lost response can simply be asked again. Nothing here grades, scores or keeps a key: that stays
// on the server; a sitting that is already open simply keeps working locally while the connection is away (see aus_37_cert_ui.js).
var HEALTH_PATH = '/health';
function isTransientStatus(s) { return s === 0 || s === 502 || s === 503 || s === 504; }   // no answer at all / a proxy with no backend behind it right now

function _cleanBase(u) { u = String(u == null ? '' : u).trim().replace(/\/+$/, ''); return /^https?:\/\/[^\s\/?#]+/i.test(u) ? u : ''; }
function _isLoopbackHost(h) { return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h); }

// Where requests really go, and whether that address can possibly work from THIS page. The dynamic address is window.AUS_API_BASE (decided in
// aus_00_registry.js: loopback dev server on localhost, the page's own origin on a real server, or <meta name="aus-api-base">).
// -> {base, source: 'AUS_API_BASE'|'CHAT_API_BASE'|'default', problem: ''|'badbase'|'mixed'|'localbase'}
function apiTarget() {
    var raw = window.AUS_API_BASE, source = 'AUS_API_BASE';
    if (!raw) { raw = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : ''; source = raw ? 'CHAT_API_BASE' : 'default'; }
    if (!raw) raw = 'http://127.0.0.1:8002';
    var base = _cleanBase(raw), problem = '';
    if (!base) problem = 'badbase';                                  // not an absolute http(s) address
    else {
        var m = /^(https?):\/\/(\[[^\]]+\]|[^\/:?#]+)/i.exec(base), proto = m[1].toLowerCase(), host = m[2].toLowerCase();
        var loc = window.location || {}, pageHost = String(loc.hostname || '').toLowerCase();
        var pageLocal = !pageHost || loc.protocol === 'file:' || _isLoopbackHost(pageHost);
        if (loc.protocol === 'https:' && proto === 'http' && !_isLoopbackHost(host)) problem = 'mixed';   // the browser blocks http calls from an https page
        else if (_isLoopbackHost(host) && !pageLocal) problem = 'localbase';                             // every student would be calling their OWN computer
    }
    return { base: base || String(raw), source: source, problem: problem };
}

// fetch that gives up after `ms` (AbortController where there is one, a timer race everywhere)
function _fetchWithin(url, init, ms) {
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null, timer = null;
    if (ctl) init = Object.assign({}, init, { signal: ctl.signal });
    var timeout = new Promise(function (_, reject) { timer = setTimeout(function () { try { if (ctl) ctl.abort(); } catch (e) {} reject(new Error('timeout')); }, ms); });
    return Promise.race([Promise.resolve().then(function () { return fetch(url, init); }), timeout]).then(
        function (r) { clearTimeout(timer); return r; },
        function (e) { clearTimeout(timer); throw e; });
}

var _probeFlight = null, _probeLast = null;
// Asks GET /health and says what it found. -> Promise<{ok, state, status, ms, base, source, timeout?}> (never rejects)
//   state: 'up'        the server answered 2xx
//          'down'      nothing (or only an error page) answered — still starting, restarting, unreachable or too slow
//          'offline'   nothing answered AND the browser itself says it has no network
//          'cors'      the server is there but refuses THIS page's origin (CORS_ORIGINS on the server) — waiting will not help
//          'notapi'    something answered 404/405 at /health: the address (or the /api route of the proxy) leads to a web server that is not AUS's
//          'badbase' | 'mixed' | 'localbase'   the configured address cannot work from this page (see apiTarget) — no request is made
// One probe at a time (callers share it); a success is reused for 2 s unless opts.force.
function probeServer(opts) {
    opts = opts || {};
    var t = apiTarget();
    if (t.problem) return Promise.resolve({ ok: false, state: t.problem, status: 0, ms: 0, base: t.base, source: t.source });
    if (!opts.force && _probeLast && Date.now() - _probeLast.at < 2000) return Promise.resolve(_probeLast.res);
    if (_probeFlight) return _probeFlight;
    var t0 = Date.now(), timeoutMs = opts.timeoutMs || 6000, url = t.base + HEALTH_PATH;
    function out(state, extra) { return Object.assign({ ok: state === 'up', state: state, status: 0, ms: Date.now() - t0, base: t.base, source: t.source }, extra || {}); }
    _probeFlight = _fetchWithin(url, { cache: 'no-store' }, timeoutMs).then(function (res) {
        // ANY HTTP answer proves something is listening. 404/405 on a health URL means it is NOT the AUS server (a wrong address, or a proxy
        // that does not send /health to it) — waiting cannot fix that. Everything else that is not 2xx (5xx, 429, 403 from an abuse block) passes.
        return out(res.ok ? 'up' : (res.status === 404 || res.status === 405) ? 'notapi' : 'down', { status: res.status });
    }, function (err) {
        var timedOut = !!(err && err.message === 'timeout');
        // The browser reports a network error and a CORS refusal alike. A no-cors request gets through (opaque answer) whenever something is
        // listening, so: it got through while the real one failed quickly = the server is up and turns this origin away.
        return _fetchWithin(url, { mode: 'no-cors', cache: 'no-store' }, Math.min(timeoutMs, 4000)).then(function () {
            return timedOut ? out('down', { timeout: true }) : out('cors');
        }, function () {
            var offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
            return out(offline ? 'offline' : 'down', timedOut ? { timeout: true } : {});
        });
    }).then(function (res) {
        _probeFlight = null;
        if (res.ok) _probeLast = { at: Date.now(), res: res };
        return res;
    });
    return _probeFlight;
}

// Polls until the server answers: 2 → 4 → 8 → 15 s apart (±20 % so a whole class does not knock together), earlier when the browser says
// `online` or the tab becomes visible again. A configuration problem ends the wait at once — time
// cannot fix it (cors / badbase / mixed / localbase / notapi). onTick({state, attempt, nextInMs, res}) after every probe; opts.shouldStop() is asked before each one.
// -> {promise: Promise<res of the last probe | {cancelled:true}>, cancel(), probeNow()}
function waitForServer(onTick, opts) {
    opts = opts || {};
    var delays = [2000, 4000, 8000, 15000], attempt = 0, stopped = false, timer = null, resolveFn;
    var promise = new Promise(function (resolve) { resolveFn = resolve; });
    function cleanup() {
        clearTimeout(timer);
        try { window.removeEventListener('online', wake); } catch (e) {}
        try { document.removeEventListener('visibilitychange', onVisible); } catch (e) {}
    }
    function finish(res) { if (stopped) return; stopped = true; cleanup(); resolveFn(res); }
    function wake() { if (!stopped) { clearTimeout(timer); run(); } }
    function onVisible() { if (!document.hidden) wake(); }
    function run() {
        if (stopped) return;
        if (opts.shouldStop && opts.shouldStop()) { finish({ ok: false, state: 'cancelled', cancelled: true }); return; }
        attempt++;
        probeServer({ force: true }).then(function (res) {
            if (stopped) return;
            var config = res.state === 'cors' || res.state === 'badbase' || res.state === 'mixed' || res.state === 'localbase' || res.state === 'notapi';
            var next = res.ok || config ? 0 : Math.round(delays[Math.min(attempt - 1, delays.length - 1)] * (0.8 + Math.random() * 0.4));
            if (onTick) { try { onTick({ state: res.state, attempt: attempt, nextInMs: next, res: res }); } catch (e) {} }
            if (res.ok || config) { finish(res); return; }
            timer = setTimeout(run, next);
        });
    }
    try { window.addEventListener('online', wake); } catch (e) {}
    try { document.addEventListener('visibilitychange', onVisible); } catch (e) {}
    run();
    return { promise: promise, cancel: function () { if (!stopped) { stopped = true; cleanup(); resolveFn({ ok: false, state: 'cancelled', cancelled: true }); } }, probeNow: wake };
}

function _stateOf(email) { return (email && _srvState.email === email) ? _srvState : null; }
function _blankState(email) { return { email: email, credits: {}, open: [], results: {}, unlimited: false, loaded: false, ts: Date.now() }; }

function _normResult(r) {
    return { attemptId: r.attempt_id, correct: r.correct, total: r.total, percent: r.percent, passed: !!r.passed,
             type: r.type, specId: r.spec_id, toolIdx: r.tool_idx, ts: r.submitted_ts || Date.now(), verified: true };
}
function _sig(s) { return s ? JSON.stringify([s.credits, s.open, s.results, s.unlimited]) : ''; }

// Re-reads the caller's credits and best results from the server. -> Promise<boolean> "did anything change?".
// `force` skips the 5 s throttle (used right before deciding who has to pay).
function refreshServerState(force) {
    var email = _currentEmail();
    if (!email) { _srvState = _blankState(null); return Promise.resolve(false); }
    if (!force && _srvState.email === email && _srvState.loaded && Date.now() - _srvState.ts < 5000) return Promise.resolve(false);
    var before = _sig(_stateOf(email));
    return Promise.all([_srv('GET', '/api/certificates/exam/credits'), _srv('GET', '/api/certificates/exam/results')]).then(function (rs) {
        if (_currentEmail() !== email) return false; // the user switched accounts while this was in flight
        if (!(rs[0].ok && rs[1].ok)) {
            // not signed in on the server, or the server is down: show nothing rather than stale data of another account
            if (_srvState.email !== email) _srvState = _blankState(email);
            _srvState.error = rs[0].status || rs[1].status || 0;
            return false;
        }
        var results = {};
        var raw = rs[1].data.results || {};
        Object.keys(raw).forEach(function (id) { results[id] = _normResult(raw[id]); });
        _srvState = { email: email, credits: rs[0].data.credits || {}, open: rs[0].data.open || [], results: results,
                      unlimited: !!rs[0].data.unlimited, loaded: true, ts: Date.now() };
        return before !== _sig(_srvState);
    });
}
if (window.addEventListener) window.addEventListener('aus-auth-changed', function () { refreshServerState(true); });

// CACHE reads (display only — the server decides at /exam/start).
function getCredits() { var s = _stateOf(_currentEmail()); return s ? s.credits : {}; }
// The platform owner's own account always has unlimited free access to every exam — the server enforces the real
// rule (_is_owner there); this client flag only chooses which button to draw.
function hasAvailableAttempt(id) {
    if (window.ausAuth && window.ausAuth.isOwner) return true;
    var s = _stateOf(_currentEmail());
    if (!s) return false;
    return s.unlimited || (s.credits[id] || 0) > 0 || s.open.indexOf(id) !== -1; // an open (paid) sitting is resumed, not re-bought
}
// Cache-only: reflects a credit the server just spent at /exam/start. Changes nothing on the server.
function consumeCertCredit(id) {
    var s = _stateOf(_currentEmail());
    if (s && s.credits[id] > 0) s.credits[id] -= 1;
}

// Owner-only (the server refuses everyone else, so DevTools can't self-grant): add ONE credit for `email`.
// `ref` makes it idempotent — the same ref never grants twice (e.g. a double-clicked "approve").
function grantCredit(id, email, ref) {
    if (!email) return Promise.resolve({ ok: false, message: 'لا يوجد بريد للطالب في هذا الطلب' });
    // interactive: if there is no usable server session (and it cannot be renewed silently) the owner is asked for the server
    // password in a small dialog and THIS grant then continues by itself; owner: a 403 is checked against who the server thinks we are.
    return _srv('POST', '/api/certificates/exam/credits/grant', { student_email: email, cert_id: id, ref: ref || undefined }, { interactive: true, owner: true }).then(function (r) {
        var msg = r.ok ? '' : r.status === 0 ? 'تعذّر الاتصال بالخادم — لم يتم التفعيل'
            : r.status === 401 ? (r.session === 'declined' ? 'لم يتم التفعيل: يلزم تسجيل الدخول إلى الخادم — اضغط التأكيد مرة أخرى وأدخل كلمة مرور الخادم عند الطلب'
                                                           : 'لا توجد جلسة صالحة على الخادم — سجّل الدخول إلى الخادم ثم أعد المحاولة')
            : r.status === 403 ? 'التفعيل متاح لحساب المالك فقط — الحساب المسجَّل على الخادم ليس حساب المالك (يجب أن يطابق بريده AUS_OWNER_EMAIL)'
            : 'تعذّر التفعيل (' + (r.data && typeof r.data.detail === 'string' ? r.data.detail : r.status) + ')';
        return { ok: r.ok, status: r.status, already: !!(r.data && r.data.already_granted), message: msg };
    });
}
// Old name kept for callers that still use it; it is now the same owner-only server grant (a no-op for everyone else).
function addCertCredit(id, forEmail, ref) { return grantCredit(id, forEmail || _currentEmail(), ref); }

function getExamConfig() {
    if (_srvConfig) return Promise.resolve(_srvConfig);
    return _rawFetch('GET', '/api/certificates/exam/config').then(function (r) {
        if (r.ok) _srvConfig = r.data;
        return r.ok ? r.data : { paypal_verifiable: false, unreachable: true };
    });
}
function serverStartExam(type, specId, toolIdx) { return _srv('POST', '/api/certificates/exam/start', { type: type, spec_id: specId, tool_idx: toolIdx }); }
// Submit/abort are authenticated by the sitting's own token (a JWT may expire mid-exam), so no Authorization header.
function serverSubmitExam(sid, token, answers) { return _rawFetch('POST', '/api/certificates/exam/' + encodeURIComponent(sid) + '/submit', { token: token, answers: answers }, undefined, 30000); }
function serverAbortExam(sid, token) { return _rawFetch('POST', '/api/certificates/exam/' + encodeURIComponent(sid) + '/abort', { token: token }); }

// POST /exam/start, asked again (now, +1.5 s, +4 s) while no answer arrives. Safe to repeat: if the first request DID reach the server and
// only its answer got lost, the next one finds the sitting it opened and resumes it — no second sitting, no second charge. Anything the
// server actually answers (402 no credit, 401, 404 …) is returned at once. -> Promise<{ok, status, data, attempts}>
function serverStartExamRetrying(type, specId, toolIdx, onAttempt) {
    var delays = [0, 1500, 4000], i = 0;
    function go() {
        if (onAttempt) { try { onAttempt(i + 1, delays.length); } catch (e) {} }
        return serverStartExam(type, specId, toolIdx).then(function (r) {
            if (!isTransientStatus(r.status) || i + 1 >= delays.length) { r.attempts = i + 1; return r; }
            i++;
            return new Promise(function (res) { setTimeout(res, delays[i]); }).then(go);
        });
    }
    return go();
}

// Sends the finished sitting's answers and, while the server cannot be reached, WAITS for it and sends them again — until it ANSWERS.
// The answers never leave the device unless the server is asked to grade them; the grade is the server's alone (a repeated submission of
// a graded sitting returns the stored result, and one past its deadline is refused 409 — being offline never buys extra time).
//   hooks.onTransient(res)   once, at the first failure to reach the server (the screen can switch to "offline exam mode")
//   hooks.tick(info)         after every probe while waiting: {state, attempt, nextInMs, tries}
// -> {promise: Promise<{ok, status, data} | {cancelled:true} | {problem:'cors'|'badbase'|'mixed'|'localbase'}>, cancel(), sendNow()}
function submitUntilAnswered(sid, token, answers, hooks) {
    hooks = hooks || {};
    var cancelled = false, waiter = null, tries = 0, announced = false;
    var gone = { ok: false, status: 0, data: {}, cancelled: true };
    var promise = new Promise(function (resolve) {
        function send() {
            if (cancelled) { resolve(gone); return; }
            tries++;
            serverSubmitExam(sid, token, answers).then(function (res) {
                if (cancelled) { resolve(gone); return; }
                if (!isTransientStatus(res.status)) { resolve(res); return; }
                if (!announced) { announced = true; if (hooks.onTransient) { try { hooks.onTransient(res); } catch (e) {} } }
                wait();
            });
        }
        function wait() {
            waiter = waitForServer(function (t) { if (hooks.tick) { try { hooks.tick({ state: t.state, attempt: t.attempt, nextInMs: t.nextInMs, tries: tries }); } catch (e) {} } },
                                   { shouldStop: function () { return cancelled; } });
            waiter.promise.then(function (p) {
                if (cancelled || p.cancelled) { resolve(gone); return; }
                if (!p.ok) { resolve({ ok: false, status: 0, data: { detail: 'config' }, problem: p.state }); return; }   // CORS / wrong address: waiting cannot fix it
                send();
            });
        }
        send();
    });
    return {
        promise: promise,
        cancel: function () { cancelled = true; if (waiter) waiter.cancel(); },
        sendNow: function () { if (waiter) waiter.probeNow(); }
    };
}
// The status of the last attempt to read this account's state from the server (0 = unreachable, 401 = no server session), or undefined.
function serverStateError() { var s = _stateOf(_currentEmail()); return s ? s.error : undefined; }
function redeemPayPal(orderId, id) { return _srv('POST', '/api/certificates/exam/credits/paypal', { order_id: orderId, cert_id: id }); }
// Owner-only: the server's own record of one sitting (student, status, score — never the questions or answers).
function serverAttemptSummary(attemptId) { return _srv('GET', '/api/certificates/exam/attempt/' + encodeURIComponent(attemptId)); }
// The student asks for the certificate of a sitting THEY passed. The server looks the sitting up itself (it must be submitted,
// passed and belong to the caller — no score or e-mail travels from here), issues the unique number AUS-<SPEC>-<YEAR>-<RAND>
// and answers with the public record (number, verify_url, qr_url …). Idempotent: asking twice returns the same certificate.
// -> Promise<{ok, status, data}>  (200 issued / already_issued · 202 waits for the owner · 400 · 401 · 409 revoked · 0 offline)
function serverRequestCertificate(attemptId, studentName) {
    return _srv('POST', '/api/certificates/request', { attempt_id: attemptId, student_name: studentName || undefined });
}
// The caller's own digital certificates (public fields only). Through _srv so an expired 15-minute token is refreshed silently.
function serverMyCertificates() { return _srv('GET', '/api/certificates/mine'); }

// ── Manual "bank transfer" payment claims — NEVER self-grant a credit. ──────
// A student typing their name and clicking "I transferred the money" proves
// nothing; there is no way for this client-side app to verify a real bank
// transfer actually landed. So a manual claim only creates a PENDING request;
// only an admin who checked the real bank account can approve it and release
// the credit. PayPal is exempt from this — that flow captures a real,
// verifiable payment through PayPal's API, not a self-reported claim.
var PENDING_PAY_KEY = 'aus.cert.pendingPayments';
function getPendingPayments() { try { return JSON.parse(localStorage.getItem(PENDING_PAY_KEY) || '[]'); } catch (e) { return []; } }
function savePendingPayments(list) { try { localStorage.setItem(PENDING_PAY_KEY, JSON.stringify(list)); } catch (e) {} }
function addPendingPayment(entry) {
    var list = getPendingPayments();
    entry = Object.assign({
        id: 'pend_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        status: 'pending', ts: Date.now()
    }, entry);
    list.push(entry);
    savePendingPayments(list);
    return entry;
}
// -> Promise<{ok, message}>. The credit is granted on the SERVER, to the PAYER's account (not whichever admin happens
// to be reviewing this); the claim is only marked approved once the server accepted the grant. The ref makes a
// double-click harmless (the server never grants the same ref twice).
function approvePendingPayment(pendingId) {
    var entry = getPendingPayments().find(function (p) { return p.id === pendingId; });
    if (!entry || entry.status !== 'pending') return Promise.resolve({ ok: false, message: 'الطلب غير موجود أو تم البتّ فيه' });
    return grantCredit(entry.certId, entry.payerEmail, 'pending:' + pendingId).then(function (r) {
        if (!r.ok) return r;
        var list = getPendingPayments(); // re-read: the list may have changed while the request was in flight
        var fresh = list.find(function (p) { return p.id === pendingId; });
        if (fresh) { fresh.status = 'approved'; fresh.decidedTs = Date.now(); savePendingPayments(list); }
        // Sent as a real chat message (not just the notification inbox) so the
        // student can ask the admin a follow-up question directly in the same
        // thread — on top of the toast/Notification alert that already fires
        // when the student next opens the app (_checkMyPaymentDecisions in
        // aus_37_cert_ui.js).
        if (window.AusChat && entry.payerEmail) {
            var payerAccount = (window.ausAuth && window.ausAuth.listAccounts ? window.ausAuth.listAccounts() : []).filter(function (a) { return a.email === entry.payerEmail; })[0];
            var payerName = (payerAccount && payerAccount.full_name) || entry.payerName || entry.payerEmail;
            window.AusChat.sendMessage(entry.payerEmail, payerName, '✅ تمت الموافقة على دفعتك لـ ' + (entry.toolName || '') + ' — ' + (entry.certLabel || '') + '! يمكنك بدء الامتحان الآن.');
        }
        return { ok: true, message: '' };
    });
}
function rejectPendingPayment(pendingId) {
    var list = getPendingPayments();
    var entry = list.find(function (p) { return p.id === pendingId; });
    if (!entry || entry.status !== 'pending') return false;
    entry.status = 'rejected';
    entry.decidedTs = Date.now();
    savePendingPayments(list);
    return true;
}

// ── Tell the student once their claim has been decided ─────────────────────
// The admin may approve/reject long after the student has left, possibly from
// a different device entirely — so this can't rely on a live event firing at
// decision time. Instead every decided-but-unseen claim belonging to the
// CURRENTLY LOGGED IN user surfaces the next time they open the app on their
// own device/browser (where their claim + its status already live locally).
var SEEN_DECISION_KEY = 'aus.cert.seenPaymentDecisions';
function _seenDecisionIds() { try { return JSON.parse(localStorage.getItem(SEEN_DECISION_KEY) || '[]'); } catch (e) { return []; } }
function markDecisionSeen(pendingId) {
    var seen = _seenDecisionIds();
    if (seen.indexOf(pendingId) === -1) { seen.push(pendingId); try { localStorage.setItem(SEEN_DECISION_KEY, JSON.stringify(seen)); } catch (e) {} }
}
function getMyUnseenDecisions() {
    var email = (window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || '';
    if (!email) return [];
    var seen = _seenDecisionIds();
    return getPendingPayments().filter(function (p) {
        return p.payerEmail === email && p.status !== 'pending' && seen.indexOf(p.id) === -1;
    });
}

// Results are the SERVER's record (best submitted sitting per exam, see refreshServerState). These two are the
// read-only cache the UI draws from: nothing is written to localStorage any more, so a result can't be edited
// there, and one account's result can't show up for another account sharing the browser.
function getResults() { var s = _stateOf(_currentEmail()); return s ? s.results : {}; }
// Cache-only: shows the result the server just returned for a sitting (the best one wins, like /exam/results).
function saveResult(id, result) {
    var email = _currentEmail();
    if (!email) return;
    if (_srvState.email !== email) _srvState = _blankState(email);
    var prev = _srvState.results[id];
    if (!prev || (result.percent || 0) >= (prev.percent || 0)) _srvState.results[id] = result;
}

function getTool(specId, toolIdx) {
    var tools = (typeof toolsData !== 'undefined' && toolsData[specId]) || [];
    return tools[toolIdx];
}
function getSpecialty(specId) {
    return (typeof specialties !== 'undefined' ? specialties : []).find(function (s) { return s.id === specId; });
}
function getSiblingTools(specId, excludeIdx) {
    var tools = (typeof toolsData !== 'undefined' && toolsData[specId]) || [];
    return tools.filter(function (t, i) { return i !== excludeIdx; });
}

// ── Small local utilities (self-contained — do not rely on private helpers
//    defined inside other files' closures) ──────────────────────────────────
function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}
function pick(arr, n) { return shuffle(arr).slice(0, n); }
function sanitize(str) {
    if (window._AUS_UTILS && typeof window._AUS_UTILS.sanitize === 'function') return window._AUS_UTILS.sanitize(str);
    return String(str || '').replace(/[<>"'`&]/g, function (c) {
        return { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '&': '&amp;' }[c];
    });
}
// Splits a "Term — Definition" style point string used throughout toolsData.
function parsePointPair(pointStr, fallbackTerm) {
    var idx = pointStr.indexOf('—');
    if (idx === -1) idx = pointStr.indexOf('-');
    if (idx > 0 && idx < pointStr.length - 1) {
        return { term: pointStr.slice(0, idx).trim(), def: pointStr.slice(idx + 1).trim() };
    }
    return { term: fallbackTerm || pointStr.slice(0, 18), def: pointStr };
}

// Generic anti-pattern statements — plausible-sounding but wrong distractors,
// reused across both certificate tracks (mirrors the pattern already proven
// in aus_01_data.js's generateToolQuestions, expanded for exam-scale volume).
var WRONG_POOL = [
    'يعتمد كلياً على الحدس الشخصي ويتجاهل البيانات والتحليل الموضوعي',
    'يضيف طبقات معقّدة من الإجراءات البيروقراطية دون قيمة عملية حقيقية',
    'يقطع قنوات التواصل بين الأقسام ويعزل كل فريق على حدة',
    'يركّز على كمية المخرجات السريعة على حساب جودتها وأثرها الفعلي',
    'يقلّل من المساءلة ويترك النتائج دون قياس أو متابعة منتظمة',
    'يحصر كل سلطة اتخاذ القرار في شخص واحد دون تفويض أو مشاركة',
    'يؤجّل القرارات الحاسمة لأجل غير مسمّى انتظاراً لظروف مثالية',
    'يتجنّب الاستثمار في تدريب الفريق ويعتمد على المهارات الحالية فقط',
    'يلغي التقييم المستمر للأداء ويكتفي بمراجعة سنوية واحدة شاملة',
    'يفرض نظاماً صارماً جامداً دون أي مرونة أو مراجعة دورية للتحسين',
    'يستجيب متأخراً لتغيّرات السوق بعد أن يفوت أوان المعالجة المناسبة',
    'يخفي المعلومات الحرجة عن الفريق ويشاركها فقط عند وقوع الأزمات',
    'يستبعد الإدارة العليا من القرار ويتجاوز التسلسل الإداري المعتمد',
    'يطبّق حلولاً جاهزة منسوخة دون فهم جذور المشكلة وسياقها الخاص',
    'يعتمد على تقنية واحدة في كل المواقف دون مراعاة اختلاف الحالات',
    'يبدأ بالتنفيذ الفوري دون تحليل مسبق للمخاطر أو الموارد المتاحة',
    'يعتمد فقط على رأي المدير التنفيذي دون إشراك أصحاب الخبرة الفنية',
    'يقيس النجاح بردود الفعل الفورية بدلاً من الأثر على المدى الطويل',
    'يهمل توثيق القرارات مما يصعّب مراجعتها أو التعلم منها لاحقاً',
    'ينسخ تجربة شركة أخرى حرفياً دون تكييفها مع سياق المؤسسة'
];

// ── No-repeat-until-exhausted index picker — prevents the same source fact
//    (e.g. the same point/benefit) from being asked about twice in one exam
//    until every other option has already been used at least once. ─────────
function makeIndexPicker(arr) {
    var n = (arr || []).length;
    var queue = [];
    function refill() { queue = shuffle(Array.from({ length: n }, function (_, i) { return i; })); }
    if (n) refill();
    return function () {
        if (!n) return 0;
        if (!queue.length) refill();
        return queue.pop();
    };
}
function pickTemplate(templates) { return templates[Math.floor(Math.random() * templates.length)]; }

// =============================================================================
// QUESTION GENERATORS — Knowledge track (recall + comprehension + reasoning)
// Every generator takes (tool, siblings, ctx) for a uniform signature, even
// when it doesn't need every argument — this keeps the cycling loop simple.
// =============================================================================
function qMcqConcept(tool, siblings) {
    var wrongs = pick(siblings.map(function (t) { return t.learn.intro; }).concat(WRONG_POOL), 3);
    var prompt = pickTemplate([
        'ما هو "' + tool.name + '" باختصار؟',
        'أي وصف يطابق بدقة مفهوم "' + tool.name + '"؟',
        'كيف تُعرَّف "' + tool.name + '" في الإدارة الحديثة؟'
    ]);
    return mkMcq(prompt, tool.learn.intro, wrongs, tool.learn.intro);
}
function qMcqComponent(tool, siblings, ctx) {
    var idx = ctx.pointPicker();
    var correct = tool.learn.points[idx];
    var siblingPoints = [];
    siblings.forEach(function (t) { siblingPoints = siblingPoints.concat(t.learn.points); });
    var wrongs = pick(siblingPoints, 3);
    var prompt = pickTemplate([
        'أي مما يلي يُعدّ من المكونات أو المفاهيم الأساسية لـ "' + tool.name + '"؟',
        'أي عنصر تالٍ ينتمي فعلياً إلى بنية "' + tool.name + '"؟',
        'حدّد المفهوم الذي يشكّل جزءاً أصيلاً من "' + tool.name + '":'
    ]);
    return mkMcq(prompt, correct, wrongs, 'المكونات الأساسية لـ ' + tool.name + ': ' + tool.learn.points.join(' • '));
}
function qMcqUseCase(tool, siblings) {
    var wrongs = pick(siblings.map(function (t) { return t.learn.useCase; }), 3);
    var prompt = pickTemplate([
        'متى يكون استخدام "' + tool.name + '" الأكثر فائدة؟',
        'في أي سياق عملي يُنصح بتطبيق "' + tool.name + '"؟'
    ]);
    return mkMcq(prompt, tool.learn.useCase, wrongs, tool.learn.useCase);
}
function qCounterUseCase(tool, siblings) {
    // Tests the boundary explicitly — "when NOT to use" — a distinct angle from qMcqUseCase.
    var correct = 'حين يبتعد الموقف عن سياقها الطبيعي: ' + tool.learn.useCase + ' — عندها يصبح تطبيقها غير ملائم.';
    var wrongs = pick(siblings.map(function (t) { return t.learn.useCase; }).concat(WRONG_POOL), 3);
    return mkMcq('متى لا يُنصح باستخدام "' + tool.name + '"؟', correct, wrongs, tool.learn.useCase);
}
function qMcqBenefit(tool, siblings, ctx) {
    var idx = ctx.benefitPicker();
    var correct = tool.learn.benefits[idx];
    var siblingBenefits = [];
    siblings.forEach(function (t) { siblingBenefits = siblingBenefits.concat(t.learn.benefits); });
    var wrongs = pick(siblingBenefits.concat(WRONG_POOL), 3);
    var prompt = pickTemplate([
        'أي مما يلي يُعدّ فائدة حقيقية من فوائد "' + tool.name + '"؟',
        'أي أثر إيجابي تالٍ ينتج فعلياً عن تطبيق "' + tool.name + '"؟'
    ]);
    return mkMcq(prompt, correct, wrongs, 'فوائد ' + tool.name + ': ' + tool.learn.benefits.join(' • '));
}
function qMcqPitfall(tool, siblings) {
    var wrongs = pick(siblings.map(function (t) { return t.learn.pitfall; }).concat(WRONG_POOL), 3);
    return mkMcq('ما أكبر تحدٍ أو خطأ شائع عند تطبيق "' + tool.name + '"؟', tool.learn.pitfall, wrongs, tool.learn.pitfall);
}
function qAnalyticalNegation(tool) {
    var realBenefits = pick(tool.learn.benefits, Math.min(3, tool.learn.benefits.length));
    while (realBenefits.length < 3) realBenefits.push(tool.learn.points[realBenefits.length % tool.learn.points.length]);
    var fake = pick(WRONG_POOL, 1)[0];
    var options = shuffle(realBenefits.concat([fake]));
    return {
        qType: 'mcq',
        prompt: 'أي مما يلي ليس صحيحاً بخصوص "' + tool.name + '"؟',
        options: options,
        correctIndex: options.indexOf(fake),
        explanation: 'كل الخيارات الأخرى تصف فوائد أو مكونات حقيقية لـ ' + tool.name + '، بينما هذا الخيار يصف ممارسة خاطئة لا علاقة لها بالأداة.'
    };
}
function qReasoning(tool, siblings) {
    var otherTool = siblings.length ? siblings[Math.floor(Math.random() * siblings.length)] : null;
    var options = shuffle([
        { t: 'نعم، لأن الموقف يطابق تماماً الحالات التي صُمم لها "' + tool.name + '": ' + tool.learn.useCase, ok: true },
        { t: 'لا، لأن ' + tool.name + ' غير مناسب إطلاقاً لأي قرار استراتيجي', ok: false },
        { t: 'لا فرق، فكل أدوات الإدارة تُعطي نفس النتيجة بغض النظر عن السياق', ok: false },
        { t: otherTool ? ('الأنسب هو استخدام "' + otherTool.name + '" بدلاً منه في كل الحالات') : 'يُفضَّل تجاهل التحليل والاعتماد على الحدس فقط', ok: false }
    ]);
    var correctIdx = options.findIndex(function (o) { return o.ok; });
    return {
        qType: 'mcq',
        prompt: 'فريق يواجه موقفاً يتطلب: "' + tool.learn.useCase + '" — هل يُعدّ "' + tool.name + '" الخيار الصحيح هنا؟ ولماذا؟',
        options: options.map(function (o) { return o.t; }),
        correctIndex: correctIdx,
        explanation: tool.learn.useCase
    };
}
function qSiblingDistinction(tool, siblings) {
    if (!siblings.length) return null;
    var other = siblings[Math.floor(Math.random() * siblings.length)];
    var correct = tool.learn.benefits[0];
    var wrongs = pick([other.learn.benefits[0]].concat(other.learn.benefits.slice(1)).concat(WRONG_POOL), 3);
    return mkMcq('ما الذي يميّز "' + tool.name + '" تحديداً مقارنة بأداة أخرى مثل "' + other.name + '"؟', correct, wrongs,
        tool.name + ': ' + tool.learn.benefits[0] + ' — بينما ' + other.name + ' يركّز على: ' + other.desc);
}
function qDefinitionSingle(tool, siblings, ctx) {
    var idx = ctx.pointPicker();
    var pair = parsePointPair(tool.learn.points[idx]);
    var otherDefs = tool.learn.points.filter(function (_, i) { return i !== idx; }).map(function (p) { return parsePointPair(p).def; });
    var wrongs = pick(otherDefs.concat(WRONG_POOL), 3);
    return mkMcq('ما المقصود بمصطلح "' + pair.term + '" ضمن سياق "' + tool.name + '"؟', pair.def, wrongs, pair.term + ' = ' + pair.def);
}
function qOrdering(tool) {
    var items = tool.learn.points.map(function (p) { return parsePointPair(p).term; });
    if (items.length < 3) items = tool.learn.points.slice();
    var order = shuffle(items);
    return {
        qType: 'order',
        prompt: 'رتّب العناصر التالية بالترتيب المعتمد ضمن منهجية "' + tool.name + '":',
        items: order,
        correctOrder: items.slice(),
        explanation: 'الترتيب المعتمد: ' + items.join(' ← ')
    };
}
function qMatching(tool) {
    var pairs = tool.learn.points.map(function (p) { return parsePointPair(p); }).filter(function (p) { return p.term && p.def; });
    if (pairs.length < 3) {
        pairs = [
            { term: tool.name, def: tool.learn.intro },
            { term: 'أفضل استخدام', def: tool.learn.useCase },
            { term: 'أبرز فائدة', def: tool.learn.benefits[0] },
            { term: 'أكبر تحدٍ', def: tool.learn.pitfall }
        ];
    }
    pairs = pairs.slice(0, 4);
    return {
        qType: 'match',
        prompt: 'طابق كل مفهوم ضمن "' + tool.name + '" بتعريفه الصحيح:',
        left: pairs.map(function (p) { return p.term; }),
        right: shuffle(pairs.map(function (p) { return p.def; })),
        correctPairs: pairs.map(function (p) { return p.def; }), // right-side answer aligned to left index
        explanation: pairs.map(function (p) { return p.term + ' = ' + p.def; }).join(' | ')
    };
}
function mkMcq(prompt, correct, wrongs, explanation) {
    while (wrongs.length < 3) wrongs = wrongs.concat(pick(WRONG_POOL, 3 - wrongs.length));
    wrongs = wrongs.slice(0, 3).filter(function (w) { return w !== correct; });
    while (wrongs.length < 3) wrongs.push(pick(WRONG_POOL.filter(function (w) { return w !== correct && wrongs.indexOf(w) === -1; }), 1)[0]);
    var options = shuffle([correct].concat(wrongs));
    return { qType: 'mcq', prompt: prompt, options: options, correctIndex: options.indexOf(correct), explanation: explanation };
}

var KNOWLEDGE_GENERATORS = [
    qMcqConcept, qMcqComponent, qMcqUseCase, qCounterUseCase, qMcqBenefit, qMcqPitfall,
    qAnalyticalNegation, qReasoning, qSiblingDistinction, qDefinitionSingle, qOrdering, qMatching
];

// =============================================================================
// QUESTION GENERATORS — Practical track (scenarios, decisions, risk, application)
// =============================================================================
// NOTE: every generator below embeds the specific fact it is testing (the
// point/benefit text itself) directly into the visible prompt — not just the
// hidden correct answer. Several tools only have one pitfall/example/useCase
// to draw from, so those generators instead rotate through 2-3 distinct
// scenario framings via pickTemplate(). Both techniques matter for the same
// reason: a repeated prompt is what makes the exam feel "patterned" to the
// student, not just an internal duplicate-detection concern.
function qScenarioDecision(tool, siblings, ctx) {
    var point = parsePointPair(tool.learn.points[ctx.pointPicker()]);
    var correct = 'تطبيق مبدأ "' + point.term + '" أولاً: ' + tool.learn.useCase;
    var wrongs = pick(WRONG_POOL, 3);
    var prompt = pickTemplate([
        'أنت مسؤول عن مشروع يعاني من مشكلة تستدعي تفعيل مبدأ "' + point.term + '" ضمن "' + tool.name + '". ما أفضل إجراء مهني أول؟',
        'فريقك يواجه تحدياً يتطلب تطبيق "' + point.term + '" عبر "' + tool.name + '". كيف تبدأ عملياً؟'
    ]);
    return mkMcq(prompt, correct, wrongs, point.term + ' — ' + tool.learn.useCase);
}
function qRiskAssessment(tool, siblings) {
    var wrongs = pick(siblings.map(function (t) { return t.learn.pitfall; }).concat(WRONG_POOL), 3);
    var prompt = pickTemplate([
        'ما أكبر خطر يجب الانتباه إليه عند تطبيق "' + tool.name + '" في مشروع حقيقي داخل شركة؟',
        'أي مخاطرة تالية هي الأكثر ترجيحاً عند إساءة تطبيق "' + tool.name + '"؟',
        'لو طُلب منك تقييم مخاطر مشروع يعتمد على "' + tool.name + '"، ما أول خطر تُحذّر منه؟'
    ]);
    return mkMcq(prompt, tool.learn.pitfall, wrongs, 'تفادي هذا الخطر يتطلب: ' + tool.learn.benefits[0]);
}
function qBestSolution(tool, siblings, ctx) {
    var point = parsePointPair(tool.learn.points[ctx.pointPicker()]);
    var correct = 'تطبيق "' + point.term + '" بشكل صحيح: ' + point.def;
    var wrongs = pick(WRONG_POOL, 3);
    var prompt = pickTemplate([
        'بين الخيارات التالية، أي نهج يمثّل التطبيق الاحترافي الصحيح لمبدأ "' + point.term + '" ضمن "' + tool.name + '"؟',
        'كيف يُطبَّق مبدأ "' + point.term + '" بشكل احترافي عند استخدام "' + tool.name + '"؟'
    ]);
    return mkMcq(prompt, correct, wrongs, point.term + ' — ' + point.def);
}
function qCaseAnalysis(tool, siblings, ctx) {
    var benefit = tool.learn.benefits[ctx.benefitPicker()];
    var correct = 'الدرس الأهم: ' + benefit;
    var wrongs = pick(WRONG_POOL, 3);
    var prompt = pickTemplate([
        'بناءً على الحالة الواقعية التالية — "' + tool.learn.example + '" — أي درس أهم يرتبط بتحقيق "' + benefit + '"؟',
        'في ضوء الحالة الواقعية: "' + tool.learn.example + '" — كيف تفسّر تحقيق فائدة مثل "' + benefit + '"؟'
    ]);
    return mkMcq(prompt, correct, wrongs, tool.learn.example);
}
function qWorkplaceSimulation(tool, siblings, ctx) {
    var benefit = tool.learn.benefits[ctx.benefitPicker()];
    var correct = 'تصحيح المسار عبر: ' + benefit;
    var wrongs = pick(WRONG_POOL, 3);
    var prompt = pickTemplate([
        'فريقك يستخدم "' + tool.name + '" لكنه وقع في هذا الخطأ الشائع: "' + tool.learn.pitfall + '". كخبير محترف، ما الحل الفوري الأنسب؟',
        'خلال تطبيق "' + tool.name + '" في مشروع حقيقي، لاحظت وقوع الفريق في: "' + tool.learn.pitfall + '". كمستشار، بماذا تنصح فوراً؟',
        'مديرك يسألك عن سبب تعثّر مبادرة "' + tool.name + '" بسبب: "' + tool.learn.pitfall + '". ما ردّك المهني؟'
    ]);
    return mkMcq(prompt, correct, wrongs, tool.learn.pitfall);
}
function qTradeoffChoice(tool, siblings, ctx) {
    var point = parsePointPair(tool.learn.points[ctx.pointPicker()]);
    var correct = 'الموازنة الصحيحة: تطبيق "' + point.term + '" مع مراعاة السياق، بدل تعميم قاعدة واحدة على كل الحالات.';
    var wrongs = pick(WRONG_POOL, 3);
    var prompt = pickTemplate([
        'يتردد فريقك بين نهجين لتطبيق "' + point.term + '" ضمن "' + tool.name + '" تحت ضغط زمني حقيقي. ما القرار الأكثر احترافية؟',
        'عليك الاختيار بين تطبيق سريع أو دقيق لمبدأ "' + point.term + '" في "' + tool.name + '". أي قرار تتخذ ولماذا؟'
    ]);
    return mkMcq(prompt, correct, wrongs, point.term + ' — ' + point.def);
}
function qStakeholderImpact(tool) {
    var correct = 'تأثير سلبي مباشر على الثقة والنتائج: ' + tool.learn.pitfall;
    var wrongs = pick(WRONG_POOL, 3);
    var prompt = pickTemplate([
        'كيف يؤثر تطبيق "' + tool.name + '" بطريقة خاطئة على أصحاب المصلحة (العملاء، الفريق، الإدارة)؟',
        'ما الأثر المحتمل على ثقة أصحاب المصلحة إذا أُسيء تطبيق "' + tool.name + '"؟',
        'إدارتك تسأل عن مخاطر سوء تطبيق "' + tool.name + '" على العلاقة مع العملاء والفريق. بماذا تجيب؟'
    ]);
    return mkMcq(prompt, correct, wrongs, tool.learn.pitfall);
}
function qRiskRanking(tool, siblings) {
    var siblingPicks = pick(siblings, 2);
    var risks = [tool.learn.pitfall].concat(siblingPicks.map(function (t) { return t.learn.pitfall; }));
    var prompt = pickTemplate([
        'رتّب المخاطر التالية حسب الأولوية عند إدارة مشروع يعتمد على "' + tool.name + '" (الأخطر أولاً):',
        'بالمقارنة مع مخاطر أدوات أخرى، رتّب هذه المخاطر من الأخطر للأقل خطورة عند تطبيق "' + tool.name + '":'
    ]);
    return {
        qType: 'order',
        prompt: prompt,
        items: shuffle(risks),
        correctOrder: risks,
        explanation: 'الأولوية القصوى لتفادي: ' + tool.learn.pitfall
    };
}
function qImplementationSteps(tool) {
    var items = tool.learn.points.map(function (p) { return parsePointPair(p).term; });
    if (items.length < 3) return null;
    var prompt = pickTemplate([
        'رتّب خطوات التنفيذ الاحترافي التالية عند تطبيق "' + tool.name + '" في مشروع حقيقي:',
        'ما التسلسل الصحيح لتطبيق مكونات "' + tool.name + '" في بيئة عمل فعلية؟'
    ]);
    return {
        qType: 'order',
        prompt: prompt,
        items: shuffle(items),
        correctOrder: items.slice(),
        explanation: 'تسلسل التنفيذ المعتمد: ' + items.join(' ← ')
    };
}
function qDecisionUnderPressure(tool, siblings, ctx) {
    var point = parsePointPair(tool.learn.points[ctx.pointPicker()]);
    var correct = 'التمسك بمبدأ "' + point.term + '" حتى تحت الضغط، لأنه أساس نجاح "' + tool.name + '".';
    var wrongs = pick(WRONG_POOL, 3);
    return mkMcq(
        'موعد التسليم اقترب ويقترح أحد الزملاء تجاوز خطوة "' + point.term + '" ضمن "' + tool.name + '" لتوفير الوقت. ما القرار الصحيح؟',
        correct, wrongs, point.term + ' — ' + point.def
    );
}
function qClientPushback(tool) {
    var correct = 'التوضيح المهني: التحدي المتوقع هنا هو "' + tool.learn.pitfall + '"، ويُدار بالشفافية لا بالتجاهل.';
    var wrongs = pick(WRONG_POOL, 3);
    return mkMcq(
        'عميل يشكك في جدوى استخدام "' + tool.name + '" بعد سماعه عن تحدٍّ شائع يتعلق بـ "' + tool.learn.pitfall + '". كيف تردّ باحترافية؟',
        correct, wrongs, tool.learn.pitfall
    );
}

var PRACTICAL_GENERATORS = [
    qScenarioDecision, qRiskAssessment, qBestSolution, qCaseAnalysis, qWorkplaceSimulation,
    qTradeoffChoice, qStakeholderImpact, qRiskRanking, qImplementationSteps,
    qDecisionUnderPressure, qClientPushback
];

// ── Template-based question builder (offline fallback — always available) ──
// Randomizes generator order every full cycle (no fixed sequential pattern),
// gives each generator a no-repeat-until-exhausted picker for points/benefits,
// and rejects exact-duplicate prompts so no two questions in one exam collide.
// A duplicate is "same prompt AND same underlying content" — checking prompt
// text alone would wrongly reject legitimately different order/match
// questions that happen to reuse one of a handful of framing sentences.
function questionSignature(q) {
    if (q.qType === 'order') return q.prompt + '||' + q.correctOrder.join('~');
    if (q.qType === 'match') return q.prompt + '||' + q.left.join('~') + '::' + q.correctPairs.join('~');
    // Key on prompt + the actual correct answer, NOT the full shuffled option
    // set — two mcq's with the same question and same correct answer are the
    // same question to a student even if the wrong-answer decoys differ.
    return q.prompt + '||' + q.options[q.correctIndex];
}
function buildTemplateQuestions(tool, siblings, type, count) {
    var basePool = (type === 'practical') ? PRACTICAL_GENERATORS : KNOWLEDGE_GENERATORS;
    var pool = shuffle(basePool);
    var ctx = { pointPicker: makeIndexPicker(tool.learn.points), benefitPicker: makeIndexPicker(tool.learn.benefits) };
    var out = [];
    var seen = {};
    var cyclePos = 0;
    var guard = 0;
    while (out.length < count && guard < count * 15) {
        guard++;
        if (cyclePos >= pool.length) { pool = shuffle(basePool); cyclePos = 0; }
        var gen = pool[cyclePos++];
        var q = null;
        try { q = gen(tool, siblings, ctx); } catch (e) { /* generator unsuitable for this tool's data shape */ }
        if (!q) continue;
        var sig = questionSignature(q);
        if (!seen[sig]) { seen[sig] = true; out.push(q); }
    }
    return shuffle(out).slice(0, count);
}

// ── AI-enhanced question generation (optional layer on top of templates) ────
function buildAIPrompt(tool, type, count) {
    var isPractical = type === 'practical';
    var sys = 'أنت خبير في تصميم امتحانات شهادات مهنية عالمية المستوى. أعد فقط مصفوفة JSON صالحة بدون أي نص إضافي.';
    var schema = '[{"qType":"mcq","prompt":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}, ...]';
    var user = 'أنشئ ' + count + ' سؤال امتحان ' + (isPractical ? 'عملي متقدم (سيناريوهات واقعية، اتخاذ قرار، تحليل مخاطر، تطبيق عملي — بدون أي سؤال سهل أو يعتمد على الحفظ)' : 'معرفي (فهم وتحليل وتفكير، وليس حفظاً)') +
        ' حول أداة إدارية اسمها "' + tool.name + '".\n' +
        'معلومات الأداة:\n- الشرح: ' + tool.learn.intro + '\n- المكونات: ' + tool.learn.points.join(' | ') +
        '\n- الاستخدام: ' + tool.learn.useCase + '\n- الفوائد: ' + tool.learn.benefits.join(' | ') +
        '\n- مثال واقعي: ' + tool.learn.example + '\n- تحدٍّ شائع: ' + tool.learn.pitfall +
        '\nكل الأسئلة يجب أن ترتبط بهذه الأداة فقط. أعد الناتج بالضبط بهذا الشكل (JSON فقط، كل سؤال qType="mcq" مع 4 خيارات وcorrectIndex):\n' + schema;
    return { sys: sys, user: user };
}
function validateAIQuestions(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (q) {
        return q && q.qType === 'mcq' && typeof q.prompt === 'string' && Array.isArray(q.options) &&
               q.options.length >= 2 && typeof q.correctIndex === 'number' &&
               q.correctIndex >= 0 && q.correctIndex < q.options.length;
    }).map(function (q) {
        return { qType: 'mcq', prompt: sanitize(q.prompt), options: q.options.map(sanitize), correctIndex: q.correctIndex, explanation: sanitize(q.explanation || '') };
    });
}

// callback(questions[]) — always resolves, never throws; template fallback guarantees completion.
function generateExamQuestions(tool, siblings, type, count, callback) {
    var templateQs = buildTemplateQuestions(tool, siblings, type, count);
    if (!window._AUS_AI || typeof window._AUS_AI.askJSON !== 'function') { callback(templateQs); return; }

    var p = buildAIPrompt(tool, type, count);
    var settled = false;
    var timeoutId = setTimeout(function () { if (!settled) { settled = true; callback(templateQs); } }, 28000);
    window._AUS_AI.askJSON('certification', p.user, p.sys, function (err, json) {
        if (settled) return;
        clearTimeout(timeoutId);
        settled = true;
        if (err) { callback(templateQs); return; }
        var aiQs = validateAIQuestions(json);
        if (aiQs.length >= Math.floor(count * 0.6)) {
            // Fill any shortfall with template questions so the count always matches exactly.
            var merged = aiQs.slice(0, count);
            if (merged.length < count) merged = merged.concat(templateQs.slice(0, count - merged.length));
            callback(shuffle(merged));
        } else {
            callback(templateQs);
        }
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// LOCAL TRIAL («التجربة المحلية») — practice on this device while the server cannot be reached. It is NOT an exam sitting.
// ═════════════════════════════════════════════════════════════════════════════
// The real exam still starts only on the server, which draws it, keeps the key, grades it and owns the clock. When the server is down the
// student may instead TRY the exam here: the questions come from the SAME template generator the server's bank is built from, the answers
// are kept in localStorage, and a score is worked out on the device. By construction that score is worth nothing outside the trial
// screens: it is never sent anywhere, never touches a credit, the results cache or XP, and no certificate can come out of it —
// /certificates/request needs the id of a passed sitting that the SERVER recorded, and a trial has none.
// How it is offered is a setting (trialMode below): started at once with no screen in the way, offered on the "server is away" card, or off.
var TRIAL_KEY_PREFIX = 'aus.cert.trial.';   // never the same prefix as ATTEMPT_KEY_PREFIX: a trial is invisible to loadAttempt / the background re-send

// <meta name="aus-exam-local-trial" content="auto|choice|off"> (the whole site) or localStorage 'aus.exam.localTrial' (this browser: it wins over the
// meta, except that 'off' from either source wins over everything):
//   'auto'    the local trial starts by itself the moment the server cannot be reached — nothing blocks the student. The default on a developer's
//             machine (localhost / 127.0.0.1 / file://).
//   'choice'  the "server is away" card offers «المتابعة محلياً» and the student decides. The default on a real site, where a student who has
//             paid must be told it is only practice before they spend half an hour on it.
//   'off'     no local trial at all.
function trialMode() {
    function read(v) {
        v = String(v == null ? '' : v).trim().toLowerCase();
        return /^(off|0|false|no)$/.test(v) ? 'off' : v === 'auto' ? 'auto' : /^(choice|ask|on|1|true|yes)$/.test(v) ? 'choice' : '';
    }
    var site = '', mine = '';
    try { var m = document.querySelector('meta[name="aus-exam-local-trial"]'); if (m) site = read(m.getAttribute('content')); } catch (e) {}
    try { mine = read(localStorage.getItem('aus.exam.localTrial')); } catch (e) {}
    if (site === 'off' || mine === 'off') return 'off';
    if (mine || site) return mine || site;
    var loc = window.location || {}, host = String(loc.hostname || '').toLowerCase();
    return (!host || loc.protocol === 'file:' || _isLoopbackHost(host)) ? 'auto' : 'choice';
}
function localTrialEnabled() { return trialMode() !== 'off'; }

// The same rules tools/build_exam_bank.js applies before a question may enter the server's bank (so a trial never shows a broken question).
function _isStr(v) { return typeof v === 'string' && v.trim().length > 0; }
function _validQuestion(q) {
    if (!q || !_isStr(q.prompt)) return false;
    if (q.qType === 'mcq')
        return Array.isArray(q.options) && q.options.length === 4 && q.options.every(_isStr) && new Set(q.options).size === 4 &&
               Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4;
    if (q.qType === 'order')
        return Array.isArray(q.items) && q.items.length >= 3 && q.items.every(_isStr) && Array.isArray(q.correctOrder) &&
               q.correctOrder.length === q.items.length && q.items.slice().sort().join('\u0001') === q.correctOrder.slice().sort().join('\u0001');
    if (q.qType === 'match')
        return Array.isArray(q.left) && q.left.length >= 3 && q.left.every(_isStr) && Array.isArray(q.right) && q.right.length === q.left.length &&
               Array.isArray(q.correctPairs) && q.correctPairs.length === q.left.length && q.correctPairs.every(function (p) { return q.right.indexOf(p) !== -1; });
    return false;
}
// what the student SEES is shuffled and the key follows the new positions — cert_exam_engine._reshuffle, line for line
function _trialReshuffle(src) {
    var q = JSON.parse(JSON.stringify(src));
    if (q.qType === 'mcq') {
        var correct = q.options[q.correctIndex];
        q.options = shuffle(q.options);
        q.correctIndex = q.options.indexOf(correct);
    } else if (q.qType === 'order') {
        for (var i = 0; i < 6; i++) {                                  // never served already in the correct order
            q.items = shuffle(q.items);
            if (q.items.join('\u0001') !== q.correctOrder.join('\u0001')) break;
        }
    } else if (q.qType === 'match') {
        q.right = shuffle(q.right);                                    // correctPairs are strings aligned to `left`, so they stay valid
    }
    return q;
}
function _trialPublic(q) {                                             // cert_exam_engine.public_view: the question, never the key
    if (q.qType === 'mcq') return { qType: 'mcq', prompt: q.prompt, options: q.options.slice() };
    if (q.qType === 'order') return { qType: 'order', prompt: q.prompt, items: q.items.slice() };
    return { qType: 'match', prompt: q.prompt, left: q.left.slice(), right: q.right.slice() };
}
function _trialKey(q) {
    if (q.qType === 'mcq') return { correctIndex: q.correctIndex };
    if (q.qType === 'order') return { correctOrder: q.correctOrder.slice() };
    return { correctPairs: q.correctPairs.slice() };
}

// -> {questions: [public view], key: [{correctIndex}|{correctOrder}|{correctPairs}]} | null (a tool with no usable data)
function buildTrialSitting(type, specId, toolIdx) {
    var cfg = CERT_CONFIG[type], tool = getTool(specId, toolIdx);
    if (!cfg || !tool || !tool.learn) return null;
    var siblings = getSiblingTools(specId, toolIdx), seen = {}, pool = [];
    for (var round = 0; round < 6 && pool.length < cfg.questions; round++) {   // one draw can fall short of a full exam for a tool with thin data
        buildTemplateQuestions(tool, siblings, type, cfg.questions * 2).forEach(function (q) {
            if (!_validQuestion(q)) return;
            var sig = questionSignature(q);
            if (!seen[sig]) { seen[sig] = true; pool.push(q); }
        });
    }
    var picked = shuffle(pool).slice(0, cfg.questions).map(_trialReshuffle);
    return picked.length ? { questions: picked.map(_trialPublic), key: picked.map(_trialKey) } : null;
}

function _isIndex(v, upper) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= 0 && v < upper; }
// Same rules as cert_exam_engine.is_correct (the SERVER's grader), so a trial scores exactly as the real exam would for the same answers.
// Defensive like it: a malformed answer is simply wrong.
function _trialCorrect(q, k, a) {
    try {
        if (a === null || a === undefined) return false;
        if (q.qType === 'mcq') return _isIndex(a, q.options.length) && a === k.correctIndex;
        if (q.qType === 'order') {
            if (!Array.isArray(a) || a.length !== q.items.length || !a.every(function (i) { return _isIndex(i, q.items.length); })) return false;
            var want = k.correctOrder;
            return Array.isArray(want) && want.length === a.length && a.every(function (i, n) { return q.items[i] === want[n]; });   // [items[i] for i in answer] == correctOrder
        }
        if (q.qType === 'match') {
            if (!Array.isArray(a) || a.length !== q.left.length || !a.every(function (i) { return _isIndex(i, q.right.length); })) return false;
            return q.left.every(function (_, i) { return q.right[a[i]] === k.correctPairs[i]; });
        }
    } catch (e) {}
    return false;
}
// -> {correct, total, percent, passed} — percent rounds half UP like JavaScript's Math.round and cert_exam_engine.percent_of
function gradeTrialSitting(type, questions, key, answers) {
    var cfg = CERT_CONFIG[type] || { passPercent: 80 };
    if (!Array.isArray(answers)) answers = [];
    var correct = 0, total = questions.length;
    for (var i = 0; i < total; i++) if (_trialCorrect(questions[i], key[i] || {}, i < answers.length ? answers[i] : null)) correct++;
    var percent = total ? Math.floor(correct / total * 100 + 0.5) : 0;
    return { correct: correct, total: total, percent: percent, passed: percent >= cfg.passPercent };
}

// Expose internals needed by the rest of this module (loaded next) via a
// private namespace — kept off `window` except for the one public entry point.
window._AUS_CERT_CORE = {
    CERT_CONFIG: CERT_CONFIG,
    certId: certId, hasAvailableAttempt: hasAvailableAttempt, addCertCredit: addCertCredit, consumeCertCredit: consumeCertCredit,
    getCredits: getCredits, grantCredit: grantCredit,
    getPendingPayments: getPendingPayments, addPendingPayment: addPendingPayment,
    approvePendingPayment: approvePendingPayment, rejectPendingPayment: rejectPendingPayment,
    getMyUnseenDecisions: getMyUnseenDecisions, markDecisionSeen: markDecisionSeen,
    getResults: getResults, saveResult: saveResult,
    // server-authoritative exam layer (see the comment block above getCredits)
    refreshServerState: refreshServerState, getExamConfig: getExamConfig,
    serverStartExam: serverStartExam, serverSubmitExam: serverSubmitExam, serverAbortExam: serverAbortExam, redeemPayPal: redeemPayPal,
    // reaching the server: address check + diagnosis, waiting for it, and retrying what is safe to repeat
    apiTarget: apiTarget, probeServer: probeServer, waitForServer: waitForServer, isTransientStatus: isTransientStatus,
    serverStartExamRetrying: serverStartExamRetrying, submitUntilAnswered: submitUntilAnswered, serverStateError: serverStateError,
    serverAttemptSummary: serverAttemptSummary, serverRequestCertificate: serverRequestCertificate, serverMyCertificates: serverMyCertificates,
    getTool: getTool, getSpecialty: getSpecialty, getSiblingTools: getSiblingTools,
    shuffle: shuffle, pick: pick, sanitize: sanitize, parsePointPair: parsePointPair,
    generateExamQuestions: generateExamQuestions,
    // local trial (practice on the device while the server is down — never a sitting, never counted, never certifying)
    trialMode: trialMode, localTrialEnabled: localTrialEnabled, buildTrialSitting: buildTrialSitting, gradeTrialSitting: gradeTrialSitting, TRIAL_KEY_PREFIX: TRIAL_KEY_PREFIX, validTrialQuestion: _validQuestion,
    ATTEMPT_KEY_PREFIX: ATTEMPT_KEY_PREFIX, REQUESTS_KEY: REQUESTS_KEY, AI_CACHE_KEY_PREFIX: AI_CACHE_KEY_PREFIX,
    PENDING_PAY_KEY: PENDING_PAY_KEY
};

})();
