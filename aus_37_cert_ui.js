// =============================================================================
// aus_37_cert_ui.js  —  Certification System: exam engine + all rendering
// Depends on window._AUS_CERT_CORE (defined in aus_36_certification.js)
// =============================================================================

(function () {
'use strict';

var C = window._AUS_CERT_CORE;
if (!C) { console.error('[AUS Cert] core module missing — aus_36_certification.js must load first'); return; }

// ── Attempt persistence (the position, timer and answers survive a refresh) ─────────────────────────────
// A stored attempt holds the questions the SERVER sent (never the answer key), the answers given so far, and the
// sitting's own token — the only thing that can submit it (POST /exam/<id>/submit). The whole-exam deadline is
// enforced by the server; the per-question countdown below is only a UX aid.
var SLACK_MS = 10 * 60 * 1000; // forgive client-clock skew when deciding a stored sitting is long dead — the server decides for real

function attemptKey(id) { return C.ATTEMPT_KEY_PREFIX + id; }
function loadAttempt(id) {
    try {
        var raw = localStorage.getItem(attemptKey(id));
        if (!raw) return null;
        var a = JSON.parse(raw);
        // Attempts saved by the old in-browser engine carry the ANSWER KEY (correctIndex …) and no server sitting. They can
        // no longer be graded or submitted, so drop them — and the key with them.
        if (!a || !a.sid || (a.deadlineTs && Date.now() > a.deadlineTs + SLACK_MS)) { clearAttempt(id); return null; }
        return a;
    } catch (e) { return null; }
}
// -> false when the device refused the write (storage full / blocked). While the connection is away this copy is the ONLY one of the answers.
// A local trial (a.trial — see LOCAL TRIAL below) is stored under its OWN key prefix: never where loadAttempt / the background re-send look.
function saveAttempt(a) { try { localStorage.setItem((a.trial ? trialKey(a.id) : attemptKey(a.id)), JSON.stringify(a)); return true; } catch (e) { return false; } }
function clearAttempt(id) { try { localStorage.removeItem(attemptKey(id)); } catch (e) {} }
function _meEmail() { return String((window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || '').toLowerCase().trim(); }

// A local trial sitting: { trial:true, questions[] (what the student sees), key[] (kept only for the local grading — a trial is never official),
// answers[], idx, qStartTs, createdTs, email }. Forgotten after a week; another account's trial on this device is left alone, not shown.
var TRIAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function trialKey(id) { return C.TRIAL_KEY_PREFIX + id; }
function clearTrial(id) { try { localStorage.removeItem(trialKey(id)); } catch (e) {} }
function loadTrial(id) {
    try {
        var raw = localStorage.getItem(trialKey(id));
        if (!raw) return null;
        var t = JSON.parse(raw), n = t && Array.isArray(t.questions) ? t.questions.length : 0;
        if (!t || t.trial !== true || t.id !== id || !n || !Array.isArray(t.key) || t.key.length !== n || !Array.isArray(t.answers) || t.answers.length !== n ||
            !(t.idx >= 0 && t.idx < n && t.idx === Math.floor(t.idx)) || Date.now() - (t.createdTs || 0) > TRIAL_TTL_MS) { clearTrial(id); return null; }
        if (t.email && t.email !== _meEmail()) return null;
        return t;
    } catch (e) { return null; }
}

// `s` is the body of POST /exam/start: { attempt_id, token, questions[], started_ts, deadline_ts, … }.
function createAttemptFromServer(type, specId, toolIdx, s) {
    var a = {
        id: C.certId(type, specId, toolIdx), type: type, specId: specId, toolIdx: toolIdx,
        email: _meEmail(),   // whose sitting this is: a finished sitting is only ever re-sent in the background for the account that took it
        sid: s.attempt_id, token: s.token, deadlineTs: s.deadline_ts,
        questions: s.questions, answers: new Array(s.questions.length).fill(null),
        idx: 0, qStartTs: Date.now(), createdTs: s.started_ts || Date.now(), finished: false
    };
    saveAttempt(a);
    return a;
}

// ── Scoring happens on the SERVER ───────────────────────────────────────────────────────────────────────
// The browser no longer has the answer key, so it can neither grade an exam nor fake a grade. scoreAttempt stays only
// because it is exported on window._AUS_CERT_EXAM: it returns the result the server gave for this attempt, or null.
function scoreAttempt(attempt) { return (attempt && attempt.result) || null; }

// ── Timer-driven exam runner ─────────────────────────────────────────────────
var _timerHandle = null;
var _pendingMatch = { leftSel: null, pairs: [] };   // transient UI state for the current match question
var _pendingOrder = [];                              // transient UI state for the current order question

function stopTimer() { if (_timerHandle) { clearInterval(_timerHandle); _timerHandle = null; } }

// Tracks ids currently being started — without this, clicking "start" twice before the first request answers (an
// impatient double click on the loading screen) would send two /exam/start calls.
var _generatingIds = {};

// A sitting the proctor ended while the server could not be reached: the abort is retried before the next start,
// otherwise POST /exam/start would simply resume that still-open sitting for free.
var PENDING_ABORT_KEY = 'aus.cert.pendingAbort';
function _pendingAborts() { try { return JSON.parse(localStorage.getItem(PENDING_ABORT_KEY) || '{}') || {}; } catch (e) { return {}; } }
function _savePendingAborts(o) { try { localStorage.setItem(PENDING_ABORT_KEY, JSON.stringify(o)); } catch (e) {} }
function _abortOnServer(id, a) {
    if (!a || !a.sid || !a.token) return Promise.resolve();
    return C.serverAbortExam(a.sid, a.token).then(function (r) {
        var p = _pendingAborts();
        if (r.ok || r.status === 403) delete p[id];           // done — or the token is already dead, nothing left to abort
        else p[id] = { sid: a.sid, token: a.token };          // server unreachable: try again at the next start
        _savePendingAborts(p);
    });
}
function _flushPendingAbort(id) {
    var p = _pendingAborts();
    return p[id] ? _abortOnServer(id, p[id]) : Promise.resolve();
}

function startExam(type, specId, toolIdx) {
    var id = C.certId(type, specId, toolIdx);
    var existing = loadAttempt(id);
    if (existing) { if (existing.finished) _finishExam(existing); else _renderExamQuestion(existing); return; }
    // There is deliberately NO payment pre-check here. Whether this student may sit the exam is decided by the SERVER at
    // /exam/start (402 → payment screen). A check in this file could be skipped from DevTools; that one cannot.
    // Consent is required once per attempt, before it's created — resuming an
    // already-created attempt (the branch above) never re-prompts.
    if (window._AUS_PROCTOR && !window._AUS_PROCTOR.hasConsented(id)) {
        window._AUS_PROCTOR.showConsentGate(id, function () { startExam(type, specId, toolIdx); });
        return;
    }
    if (_generatingIds[id]) return; // already starting this exam — ignore the duplicate trigger
    _generatingIds[id] = true;

    var tool = C.getTool(specId, toolIdx);
    var cfg = C.CERT_CONFIG[type];
    _stopWaitUi();
    _renderExamLoading(tool, cfg);

    // Asked up to three times (now, +1.5 s, +4 s) before giving up: a server that is a moment slow, restarting, or behind a proxy that
    // answers 502/503 for a few seconds must not end in a dead end. Repeating /exam/start is safe — it resumes an open sitting.
    _flushPendingAbort(id).then(function () {
        return C.serverStartExamRetrying(type, specId, toolIdx, function (n, total) {
            if (n > 1) _renderExamLoading(tool, cfg, 'تعذّر الوصول إلى الخادم — محاولة ' + n + ' من ' + total + '…');
        });
    }).then(function (res) {
        delete _generatingIds[id];
        if (!res.ok) { _renderStartFailure(res, type, specId, toolIdx); return; }
        var attempt = createAttemptFromServer(type, specId, toolIdx, res.data);
        clearTrial(id); _trialWatchStop();              // the real sitting replaces any local practice of this exam
        if (!res.data.resumed) C.consumeCertCredit(id); // cache only — the server already spent the credit
        C.refreshServerState(true);
        _renderExamQuestion(attempt);
    });
}
window.certStartExam = startExam;

function _renderExamLoading(tool, cfg, note) {
    var host = _certHost();
    if (!host) return;
    host.innerHTML =
    '<div class="cert-wrap"><div class="cert-card" style="text-align:center;padding:60px 30px;">' +
        '<div class="cert-spin"><i class="fas fa-circle-notch fa-spin"></i></div>' +
        '<h3 style="color:#d4af37;margin-top:18px;">جارٍ تحضير أسئلة ' + cfg.label + '...</h3>' +
        '<p style="color:rgba(255,255,255,0.45);font-size:0.85rem;margin-top:8px;">يتم تجهيز ' + cfg.questions + ' سؤالاً لأداة ' + tool.name + ' على الخادم</p>' +
        (note ? '<p style="color:#ffb400;font-size:0.8rem;margin-top:10px;">' + note + '</p>' : '') +
    '</div></div>';
}

// One simple message card for every "the exam could not continue" situation (same classes as the result screens).
function _renderNotice(icon, title, text, buttonsHtml) {
    var host = _certHost();
    if (!host) return;
    host.innerHTML =
    '<div class="cert-wrap"><div class="cert-card cert-result fail">' +
        '<div class="cert-result-icon">' + icon + '</div>' +
        '<h2 class="cert-result-title">' + title + '</h2>' +
        '<p class="cert-result-sub">' + text + '</p>' +
        '<div class="cert-result-actions">' + buttonsHtml + '</div>' +
    '</div></div>';
}
function _noticeButtons(type, specId, toolIdx, withRetry) {
    return (withRetry ? '<button class="cert-btn-gold" onclick="window.certStartExam(\'' + type + '\',\'' + specId + '\',' + toolIdx + ')"><i class="fas fa-rotate-right"></i> إعادة المحاولة</button>' : '') +
           '<button class="cert-btn-ghost" onclick="window.openCertifications(\'' + specId + '\',' + toolIdx + ')"><i class="fas fa-arrow-right"></i> رجوع للشهادات</button>';
}

function _renderStartFailure(res, type, specId, toolIdx) {
    if (res.status === 402) { // no credit → the payment screen, then straight into the exam
        if (typeof showToast === 'function') showToast('يجب الدفع أولاً لبدء هذا الامتحان', 'heart-toast');
        window.openCertifications(specId, toolIdx);
        window.openCertPayment(type, specId, toolIdx, function () { startExam(type, specId, toolIdx); });
        return;
    }
    if (res.status === 401) {
        _renderNotice('🔐', 'يلزم تسجيل الدخول على الخادم',
            'امتحانات الشهادات تُصحَّح على الخادم، لذلك تحتاج إلى حساب مرتبط به. سجّل الخروج ثم سجّل الدخول من جديد (بنفس البريد وكلمة المرور) وحاول مرة أخرى.',
            _noticeButtons(type, specId, toolIdx, true));
    } else if (C.isTransientStatus(res.status) || _foreignServer(res)) {
        // "الامتحان يحتاج اتصالاً بالإنترنت وبخادم AUS لأن الأسئلة والتصحيح عليه" — said once, on a screen that finds out WHY (down / offline /
        // CORS / wrong address) and waits for the server instead of ending in a dead end (a web server that is not AUS's is NOT "no exam bank")
        _serverAway('start', type, specId, toolIdx);
    } else if (res.status === 404) {
        _renderNotice('⚠️', 'هذا الامتحان غير متاح حالياً', 'لم يتم العثور على بنك أسئلة لهذه الأداة على الخادم.', _noticeButtons(type, specId, toolIdx, false));
    } else {
        _renderNotice('⚠️', 'حدث خطأ غير متوقع', 'حاول مرة أخرى بعد قليل — لن يُخصم منك أكثر من محاولة واحدة، وإن كانت المحاولة قد فُتحت فسيُستأنف الامتحان نفسه.', _noticeButtons(type, specId, toolIdx, true));
    }
}

// The server cannot be reached. What the student sees depends on C.trialMode(): 'auto' → the local trial starts AT ONCE, no screen in the way
// (a toast and a strip say what it is); 'choice' → the card below lets them decide; 'off' → the card, without the local button.
// kind: 'start' (the sitting could not be opened) | 'gate' (the credits could not be read) — which check the card goes back to.
function _serverAway(kind, type, specId, toolIdx) {
    if (C.trialMode() === 'auto' && C.getTool(specId, toolIdx)) {
        window._certTrialGo(type, specId, toolIdx, 0, kind);
        if (typeof showToast === 'function') showToast('📡 الخادم غير متاح — تعمل بوضع التجربة المحلية للتدريب (غير معتمدة، ولم يُخصم من رصيدك شيء).', 'heart-toast');
        return;
    }
    _renderServerWait(kind, type, specId, toolIdx);
}
// the start button shows that the connection is being checked (it is the only thing on the page that moves while we ask)
function _gateBusy(on) {
    var host = _certHost(), b = host && host.querySelector('.cert-start-exam-btn');
    if (!b) return;
    if (on) {
        if (!b.hasAttribute('data-label')) b.setAttribute('data-label', b.innerHTML);
        b.disabled = true;
        b.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> جارٍ فحص الاتصال بالخادم…';
    } else if (b.hasAttribute('data-label')) {
        b.innerHTML = b.getAttribute('data-label');
        b.removeAttribute('data-label');
        b.disabled = false;
    }
}

// ── "The server cannot be reached right now": a waiting screen, not a dead end ───────────────────────────────────────────────
// C.probeServer says WHY: the server is down / still starting, the device is offline, or the configuration cannot work from this page at
// all (CORS origin refused, wrong / insecure / local API address). Waiting fixes the first two; the others need the administrator.
// A sitting cannot START without the server (it draws and grades the exam), but it never starts BY ITSELF either: when the server is back
// the student presses the button — the clock only runs from that moment.
// chip / tone = the status chip of the Nano Glass notice (amber: wait for it · red: needs the administrator)
var _DIAG = {
    down:      { icon: '📡', title: 'الخادم لا يستجيب الآن', wait: true, chip: 'الخادم غير متاح', tone: 'amber',
                 text: 'قد يكون قيد التشغيل أو إعادة التشغيل أو الصيانة، أو أن اتصالك به ضعيف. سنفحصه تلقائياً بين الحين والآخر.' },
    offline:   { icon: '📴', title: 'جهازك غير متصل بالإنترنت', wait: true, chip: 'لا يوجد اتصال بالإنترنت', tone: 'amber',
                 text: 'تأكد من الشبكة (Wi-Fi أو بيانات الجوال). سنكمل تلقائياً حالما يعود الاتصال.' },
    cors:      { icon: '🛑', title: 'الخادم يعمل لكنه يرفض هذه الصفحة', wait: false, chip: 'الخادم يرفض هذه الصفحة', tone: 'red',
                 text: 'عنوان هذه الصفحة غير مُدرج في العناوين المسموح بها على الخادم (CORS_ORIGINS). أبلغ الإدارة لإضافته ثم أعد المحاولة — إجاباتك (إن كنت قد بدأت) محفوظة على جهازك.' },
    badbase:   { icon: '⚙️', title: 'عنوان الخادم المضبوط غير صالح', wait: false, chip: 'إعداد الاتصال غير صالح', tone: 'red',
                 text: 'يجب أن يكون عنواناً كاملاً يبدأ بـ http:// أو https:// (يُضبط بالوسم aus-api-base أو في إعدادات النشر). أبلغ الإدارة.' },
    mixed:     { icon: '🔒', title: 'الصفحة آمنة (https) والخادم غير آمن (http)', wait: false, chip: 'اتصال غير آمن محجوب', tone: 'red',
                 text: 'يحجب المتصفح هذا الاتصال. يجب أن يكون عنوان الخادم https:// — أبلغ الإدارة.' },
    localbase: { icon: '🏠', title: 'عنوان الخادم يشير إلى جهازك أنت', wait: false, chip: 'عنوان خادم محلي', tone: 'red',
                 text: 'الإعداد الحالي (127.0.0.1 / localhost) صالح للتطوير فقط، أما على الموقع الحقيقي فيجب أن يشير إلى خادم AUS. أبلغ الإدارة.' },
    notapi:    { icon: '🧭', title: 'العنوان يردّ لكنه ليس خادم AUS', wait: false, chip: 'العنوان ليس خادم AUS', tone: 'red',
                 text: 'استجاب العنوان المضبوط بـ «غير موجود» (HTTP 404/405) — غالباً أن عنوان الخادم (AUS_API_BASE) خاطئ أو أن المسار /api لا يُوجَّه إلى خادم AUS. أبلغ الإدارة (التفاصيل التقنية أدناه).' }
};
var _waitUi = null;   // the one waiting screen that may be on display: {waiter, clock, args, done}
function _stopWaitUi() {
    if (!_waitUi) return;
    try { _waitUi.waiter.cancel(); } catch (e) {}
    clearInterval(_waitUi.clock);
    _waitUi = null;
}
function _el(id) { return document.getElementById(id); }
// An error answer WITHOUT any JSON body from 404 / 405 / 501 is a plain web server (a wrong AUS_API_BASE, or /api not proxied to AUS): the
// API's own errors always carry a JSON body ({detail: …}) — e.g. the 404 {detail:'unknown_exam'} that does mean "no exam bank for this tool".
function _foreignServer(res) { return !!res && (res.status === 404 || res.status === 405 || res.status === 501) && !(res.data && Object.keys(res.data).length); }
function _clock(ts) { try { return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function _techLine(res) {
    res = res || {};
    return 'العنوان: ' + (res.base || '—') + ' (' + (res.source || '') + ')\nالحالة: ' + (res.state || '—') + (res.status ? ' · HTTP ' + res.status : '') +
        (res.timeout ? ' · انتهت المهلة' : '') + (res.ms ? ' · ' + res.ms + ' ms' : '') + '\nصفحة: ' + (window.location ? window.location.origin : '');
}

// The buttons of the "server is away" card. «إعادة محاولة الاتصال» asks again at once. «المتابعة محلياً» opens the LOCAL TRIAL (practice on this
// device — see further down) and is offered only while the server cannot be reached, and only if the trial has not been switched off.
// up = the server answered: the one thing left is to start — the student presses it, so the clock begins when THEY decide.
function _waitButtons(kind, type, specId, toolIdx, up) {
    var args = '\'' + type + '\',\'' + specId + '\',' + toolIdx;
    var back = '<button class="cert-btn-ghost" onclick="window.openCertifications(\'' + specId + '\',' + toolIdx + ')"><i class="fas fa-arrow-right"></i> رجوع للشهادات</button>';
    if (up) {
        return '<button class="cert-btn-gold" onclick="' + (kind === 'gate' ? 'window._certGateAndStart' : 'window.certStartExam') + '(' + args + ')"><i class="fas fa-play"></i> ' +
            (kind === 'gate' ? 'تابع' : 'ابدأ الامتحان') + '</button>' + back;
    }
    return '<button class="cert-btn-gold" id="certWaitRetry" onclick="window._certWaitProbe()"><i class="fas fa-rotate-right"></i> <span>إعادة محاولة الاتصال</span></button>' +
        (C.localTrialEnabled() ? '<button class="cert-btn-outline" id="certWaitLocal" onclick="window._certTrialIntro(\'' + kind + '\',' + args + ')"><i class="fas fa-laptop-code"></i> المتابعة محلياً</button>' : '') +
        back;
}
function _waitBusy(on) {      // the retry button shows that a check is under way
    var b = _el('certWaitRetry');
    if (!b) return;
    b.disabled = !!on;
    b.innerHTML = on ? '<i class="fas fa-circle-notch fa-spin"></i> <span>جارٍ الفحص…</span>' : '<i class="fas fa-rotate-right"></i> <span>إعادة محاولة الاتصال</span>';
}

// kind 'start' → the sitting could not be opened · 'gate' → the credits could not be read (so "pay" vs "start" is unknown: never guess "pay")
function _renderServerWait(kind, type, specId, toolIdx) {
    var host = _certHost();
    if (!host) return;
    _stopWaitUi();
    _trialWatchStop();
    host.innerHTML =
    '<div class="cert-wrap"><div class="cert-ng" id="certWaitCard">' +
        '<span class="cert-ng-chip amber" id="certWaitChip"><i class="cert-ng-dot"></i><span id="certWaitChipText">جارٍ فحص الاتصال</span></span>' +
        '<div class="cert-ng-icon" id="certWaitIcon">📡</div>' +
        '<h2 class="cert-ng-title" id="certWaitTitle">جارٍ فحص الاتصال بالخادم…</h2>' +
        '<p class="cert-ng-text" id="certWaitText"></p>' +
        '<p class="cert-ng-note">امتحان الشهادة الرسمي يُصدَر ويُصحَّح على خادم AUS، لذلك لا يبدأ إلا بوجوده. لن يُخصم منك أكثر من محاولة واحدة — وإن كانت المحاولة قد فُتحت على الخادم فسيُستأنف الامتحان نفسه.</p>' +
        '<p class="cert-ng-line" id="certWaitLine"></p>' +
        '<div class="cert-ng-actions" id="certWaitActions">' + _waitButtons(kind, type, specId, toolIdx, false) + '</div>' +
        (C.localTrialEnabled() ? '<p class="cert-ng-local" id="certWaitLocalNote"><b>المتابعة محلياً</b> تتيح لك التمرّن على جهازك دون خادم: تُحفظ إجاباتك محلياً في المتصفح، لكنها تجربة تدريبية غير معتمدة — لا تُرسل ولا تُحتسب ولا تُصدر شهادة. الامتحان الرسمي يبدأ حين يعود الخادم.</p>' : '') +
        '<details class="cert-wait-tech"><summary>تفاصيل تقنية</summary><div id="certWaitTech"></div></details>' +
    '</div></div>';
    var ui = _waitUi = { args: [kind, type, specId, toolIdx], clock: null, waiter: null, nextAt: 0, attempt: 0, done: false };
    function paint(state, res) {
        var d = _DIAG[state] || _DIAG.down;
        if (_el('certWaitIcon')) _el('certWaitIcon').textContent = d.icon;
        if (_el('certWaitTitle')) _el('certWaitTitle').textContent = d.title;
        if (_el('certWaitText')) _el('certWaitText').textContent = d.text;
        if (_el('certWaitChip')) _el('certWaitChip').className = 'cert-ng-chip ' + (d.tone || 'amber');
        if (_el('certWaitChipText')) _el('certWaitChipText').textContent = d.chip || d.title;
        if (_el('certWaitTech')) { _el('certWaitTech').style.whiteSpace = 'pre-line'; _el('certWaitTech').textContent = _techLine(res); }
    }
    ui.clock = setInterval(function () {
        var line = _el('certWaitLine');
        if (!line || ui.done) return;
        var s = Math.round((ui.nextAt - Date.now()) / 1000);
        line.textContent = ui.nextAt && s > 0 ? 'الفحص رقم ' + ui.attempt + ' — التالي بعد ' + s + ' ثانية' : 'جارٍ الفحص…';   // 0 = the next probe is already under way
    }, 1000);
    ui.waiter = C.waitForServer(function (t) {
        ui.attempt = t.attempt;
        ui.nextAt = t.nextInMs ? Date.now() + t.nextInMs : 0;
        _waitBusy(false);
        paint(t.state, t.res);
        var line = _el('certWaitLine');
        if (line && t.nextInMs) line.textContent = 'الفحص رقم ' + t.attempt + ' — التالي بعد ' + Math.round(t.nextInMs / 1000) + ' ثانية';
    }, { shouldStop: function () { return _waitUi !== ui || !_el('certWaitCard'); } });
    ui.waiter.promise.then(function (res) {
        if (res.cancelled || _waitUi !== ui) return;
        ui.done = true;
        clearInterval(ui.clock);
        var line = _el('certWaitLine'), actions = _el('certWaitActions'), note = _el('certWaitLocalNote');
        if (line) line.textContent = '';
        if (res.ok) {   // the server is back — the student decides when the sitting (and its clock) begins
            if (_el('certWaitChip')) _el('certWaitChip').className = 'cert-ng-chip green';
            if (_el('certWaitChipText')) _el('certWaitChipText').textContent = 'الخادم متاح';
            if (_el('certWaitIcon')) _el('certWaitIcon').textContent = '✅';
            if (_el('certWaitTitle')) _el('certWaitTitle').textContent = 'الخادم متاح الآن';
            if (_el('certWaitText')) _el('certWaitText').textContent = kind === 'gate' ? 'اضغط «تابع» لنتحقق من رصيدك ونبدأ.' : 'اضغط «ابدأ الامتحان» — يبدأ احتساب الوقت لحظة الضغط.';
            if (note && note.parentNode) note.parentNode.removeChild(note);     // nothing left to practise "instead of" the real thing
            if (actions) actions.innerHTML = _waitButtons(kind, type, specId, toolIdx, true);
            return;
        }
        paint(res.state, res);                                   // a configuration problem: waiting cannot fix it
        if (actions) actions.innerHTML = _waitButtons(kind, type, specId, toolIdx, false);
    });
}
window._certWaitProbe = function () {
    if (!_waitUi) return;
    if (_waitUi.done) { _renderServerWait.apply(null, _waitUi.args); return; }       // polling had stopped (configuration problem): look again from scratch
    _waitBusy(true);
    _waitUi.waiter.probeNow();
};

var _saveWarned = {};
// saveAttempt that SAYS so when the device refuses the write — offline, this copy of the answers is the only one
function _saved(attempt) {
    if (saveAttempt(attempt)) return true;
    if (!_saveWarned[attempt.id]) {
        _saveWarned[attempt.id] = true;
        if (typeof showToast === 'function') showToast('⚠️ تعذّر حفظ إجابتك على هذا الجهاز (مساحة التخزين ممتلئة). لا تُحدِّث الصفحة ولا تُغلقها حتى ينتهي الامتحان.', 'heart-toast');
    }
    return false;
}

function _advance(attempt, answerValue) {
    attempt.answers[attempt.idx] = answerValue;
    if (attempt.idx + 1 >= attempt.questions.length) {
        attempt.finished = true;
        _saved(attempt);
        stopTimer();
        _finishExam(attempt);
        return;
    }
    attempt.idx += 1;
    attempt.qStartTs = Date.now();
    _saved(attempt);
    _pendingMatch = { leftSel: null, pairs: new Array(attempt.questions[attempt.idx].qType === 'match' ? attempt.questions[attempt.idx].left.length : 0).fill(null) };
    _pendingOrder = [];
    _renderExamQuestion(attempt);
}

// ── Finishing the exam: the answers go to the server, which grades them against the key it never shared ──────────────────────────
// The sitting stays in localStorage (finished, answers kept) until the server has ANSWERED, so a dropped connection loses nothing: the
// student sees "Offline Exam Mode" and the answers are re-sent AUTOMATICALLY once the server can be reached (C.submitUntilAnswered waits
// for it and asks again; a repeated submission of a graded sitting just returns the stored result). What offline mode does NOT change:
// the grade is the server's alone, and so is the whole-exam deadline — answers that arrive after it are refused (409), so being offline
// never buys extra time.
var _submits = {};   // attempt id → the submit engine running for it (one per sitting)

function _hostVisible() { var h = _certHost(); return !!(h && h.getClientRects().length); }
// is the student looking at THIS sitting's "grading" / "offline" screen? (the ids carry the sitting, so another screen never matches)
function _onAttemptScreen(attempt) {
    var el = _el('certSubmitting') || _el('certSyncCard');
    return !!el && el.getAttribute('data-attempt') === attempt.id;
}

function _finishExam(attempt) {
    if (attempt.trial) { _finishTrial(attempt); return; }   // a local trial is graded here and goes nowhere (see LOCAL TRIAL)
    if (window._AUS_PROCTOR) window._AUS_PROCTOR.stopMonitoring();
    stopTimer();
    _netStop();
    _activeAttempt = attempt;
    attempt.finished = true;
    _saved(attempt);
    var tool = C.getTool(attempt.specId, attempt.toolIdx);
    var host = _certHost();
    if (host) host.innerHTML =
    '<div class="cert-wrap"><div class="cert-card" id="certSubmitting" data-attempt="' + C.sanitize(attempt.id) + '" style="text-align:center;padding:60px 30px;">' +
        '<div class="cert-spin"><i class="fas fa-circle-notch fa-spin"></i></div>' +
        '<h3 style="color:#d4af37;margin-top:18px;">جارٍ تصحيح إجاباتك على الخادم...</h3>' +
    '</div></div>';
    _runSubmit(attempt, tool, true);
}

// screen = the student is watching this sitting (render into #certHost); otherwise (the page was reopened later, or they moved on) only a
// toast says what happened.
function _runSubmit(attempt, tool, screen) {
    var id = attempt.id;
    if (_submits[id]) _submits[id].cancel();
    var eng = _submits[id] = C.submitUntilAnswered(attempt.sid, attempt.token, attempt.answers, {
        onTransient: function () { if (screen && _onAttemptScreen(attempt)) _renderOfflineSync(attempt, tool); },   // first failure to reach the server
        tick: function (t) { _syncTick(attempt, t); }
    });
    eng.promise.then(function (res) {
        if (_submits[id] === eng) delete _submits[id];
        if (res.cancelled) return;
        if (res.problem) {    // CORS / wrong or insecure address: waiting cannot fix it — keep the answers and say what is wrong
            if (screen) _renderOfflineSync(attempt, tool, res.problem);
            else if (typeof showToast === 'function') showToast('⚠️ تعذّر إرسال إجابات امتحانك بسبب إعداد الاتصال بالخادم — إجاباتك محفوظة على جهازك. أبلغ الإدارة.', 'heart-toast');
            return;
        }
        _settle(attempt, tool, res, screen, false);
    });
}

function _renderOfflineSync(attempt, tool, problem) {
    var host = _certHost();
    if (!host) return;
    var total = attempt.questions.length;
    var answered = (attempt.answers || []).filter(function (a) { return a !== null && a !== undefined; }).length;
    var d = problem ? _DIAG[problem] : null;
    host.innerHTML =
    '<div class="cert-wrap"><div class="cert-ng" id="certSyncCard" data-attempt="' + C.sanitize(attempt.id) + '">' +
        '<span class="cert-ng-chip ' + (d ? (d.tone || 'red') : 'amber') + '"><i class="cert-ng-dot"></i>' + (d ? (d.chip || d.title) : 'وضع الامتحان المحلي المؤقت') + '</span>' +
        '<div class="cert-ng-icon">' + (d ? d.icon : '📡') + '</div>' +
        '<h2 class="cert-ng-title">' + (d ? d.title : 'وضع الامتحان المحلي المؤقت') + '</h2>' +
        '<p class="cert-ng-text">' + (d ? d.text : 'تعذّر الوصول إلى الخادم بعد انتهائك من الامتحان. إجاباتك (' + answered + ' من ' + total + ') محفوظة على هذا الجهاز، وسيُرسلها النظام تلقائياً إلى الخادم ليصحّحها فور عودة الاتصال.') + '</p>' +
        '<p class="cert-ng-note">لا يلزمك فعل شيء. وإن أغلقتَ الصفحة فسيُكمل الإرسال عند فتحك المنصة مجدداً.</p>' +
        (attempt.deadlineTs ? '<p class="cert-ng-note">آخر موعد لوصول الإجابات إلى الخادم: <b>' + _clock(attempt.deadlineTs) + '</b> تقريباً — بعده تُغلق المحاولة ولا تُسجَّل نتيجة (الوقت يُحتسب على الخادم ولا يمدّده الانقطاع).</p>' : '') +
        '<p class="cert-ng-line" id="certSyncLine"></p>' +
        '<div class="cert-ng-actions">' +
            '<button class="cert-btn-gold" onclick="window._certSyncNow()"><i class="fas fa-paper-plane"></i> أرسل الآن</button>' +
            '<button class="cert-btn-ghost" onclick="window.openCertifications(\'' + attempt.specId + '\',' + attempt.toolIdx + ')"><i class="fas fa-arrow-right"></i> رجوع للشهادات</button>' +
        '</div>' +
    '</div></div>';
}
function _syncTick(attempt, t) {
    var line = _el('certSyncLine');
    if (!line || !_onAttemptScreen(attempt)) return;
    var d = _DIAG[t.state] || _DIAG.down;
    line.textContent = t.state === 'up' ? 'عاد الاتصال — جارٍ إرسال إجاباتك…'
        : d.title + ' — الفحص رقم ' + t.attempt + (t.nextInMs ? '، التالي بعد ' + Math.round(t.nextInMs / 1000) + ' ثانية' : '');
}
window._certSyncNow = function () {
    var a = _activeAttempt;
    if (!a || !a.finished) return;
    var eng = _submits[a.id];
    if (eng) eng.sendNow(); else _finishExam(a);   // nothing is running (it stopped on a configuration problem): start over
};

var XP_GIVEN_KEY = 'aus.cert.xpGiven';
// XP is awarded once per sitting even if two tabs (or a background re-send and a button press) both receive the same result
function _firstTimeFor(sid) {
    try {
        var list = JSON.parse(localStorage.getItem(XP_GIVEN_KEY) || '[]');
        if (!Array.isArray(list)) list = [];
        if (list.indexOf(sid) !== -1) return false;
        list.push(sid);
        localStorage.setItem(XP_GIVEN_KEY, JSON.stringify(list.slice(-40)));
    } catch (e) {}
    return true;
}
// The server answered "graded": keep the display cache, drop the stored sitting, refresh credits. -> the result in the shape the screens use
function _applyResult(attempt, s) {
    var result = { attemptId: s.attempt_id, correct: s.correct, total: s.total, percent: s.percent, passed: !!s.passed,
                   type: attempt.type, specId: attempt.specId, toolIdx: attempt.toolIdx, ts: s.submitted_ts || Date.now(), verified: true };
    if (!attempt.email || attempt.email === _meEmail()) C.saveResult(attempt.id, result); // cache only (never for another account) — the server has already stored it
    clearAttempt(attempt.id);
    C.refreshServerState(true);
    if (window._AUS_BUS && _firstTimeFor(s.attempt_id)) window._AUS_BUS.emit('XP_AWARDED', { amount: result.passed ? 60 : 10, source: 'cert_exam_' + attempt.type });
    return result;
}
function _toastResult(result) {
    if (typeof showToast !== 'function') return;
    showToast('✅ أُرسلت إجابات امتحانك وصُحِّحت على الخادم — النتيجة ' + result.percent + '% (' + (result.passed ? 'ناجح 🎉' : 'لم تجتز بعد') + '). افتح «الشهادات» لمتابعتها.', result.passed ? 'xp-toast' : 'heart-toast');
}

// What the server's answer to the submission means. screen: see _runSubmit.
function _settle(attempt, tool, res, screen, recovered) {
    var watching = screen && _onAttemptScreen(attempt);
    if (res.ok) {
        var result = _applyResult(attempt, res.data);
        if (watching) _renderExamResults(result, tool);
        if (!watching || !_hostVisible()) _toastResult(result);     // the student is elsewhere (or never was here): tell them
        return;
    }
    var back = _noticeButtons(attempt.type, attempt.specId, attempt.toolIdx, false);
    if (res.status === 409) { // the sitting was closed on the server: out of time, or ended by the proctor
        clearAttempt(attempt.id);
        var expired = res.data && res.data.detail === 'expired';
        if (watching) {
            _renderNotice('⏱️', expired ? 'انتهى وقت الامتحان' : 'أُغلقت هذه المحاولة',
                'لم تُسجَّل نتيجة لهذه المحاولة. الوقت الكلي للامتحان يُحتسب على الخادم. يمكنك التقديم من جديد عند توفّر رصيد.', back);
        }
        if (!watching || !_hostVisible()) {
            if (typeof showToast === 'function') showToast(expired ? '⏱️ انتهى وقت إحدى محاولاتك قبل وصول إجاباتها إلى الخادم، فلم تُسجَّل لها نتيجة.' : '⏱️ أُغلقت إحدى محاولاتك على الخادم ولم تُسجَّل لها نتيجة.', 'heart-toast');
        }
        return;
    }
    if (!screen) return;     // in the background: anything else (403, 500 …) leaves the sitting where it is — the student finds it when they open it
    if (_foreignServer(res)) { _renderOfflineSync(attempt, tool, 'notapi'); return; }   // not AUS's server: keep the answers, say so
    if (res.status === 403 && !recovered && !(attempt.deadlineTs && Date.now() > attempt.deadlineTs)) {
        // The token no longer matches: the same sitting was reopened somewhere else (which issues a fresh token). Reopening
        // it here is free — the server resumes the open sitting — and then the SAME answers are sent again.
        C.serverStartExam(attempt.type, attempt.specId, attempt.toolIdx).then(function (r2) {
            if (r2.ok && r2.data.attempt_id === attempt.sid) {
                attempt.token = r2.data.token;
                saveAttempt(attempt);
                C.serverSubmitExam(attempt.sid, attempt.token, attempt.answers).then(function (r3) {
                    if (C.isTransientStatus(r3.status)) _runSubmit(attempt, tool, true);      // the server went away again meanwhile: keep sending
                    else _settle(attempt, tool, r3, true, true);
                });
            } else {
                clearAttempt(attempt.id);
                _renderNotice('⚠️', 'تعذّر إرسال إجاباتك', 'لم تعد هذه المحاولة متاحة على الخادم. ارجع إلى الشهادات وابدأ الامتحان من جديد.', back);
            }
        });
        return;
    }
    // the server answered with an error that is not a connection problem: keep the answers and let the student resend
    _renderNotice('⚠️', 'تعذّر إرسال إجاباتك',
        'الخادم ردّ بخطأ' + (res.status ? ' (HTTP ' + res.status + ')' : '') + '. إجاباتك محفوظة على هذا الجهاز — اضغط «إعادة الإرسال» بعد قليل ولا تُغلق هذه الصفحة.',
        '<button class="cert-btn-gold" onclick="window._certRetrySubmit()"><i class="fas fa-paper-plane"></i> إعادة الإرسال</button>');
}
window._certRetrySubmit = function () { if (_activeAttempt && _activeAttempt.finished) _finishExam(_activeAttempt); };

// A finished sitting whose answers never reached the server (the connection was away when the exam ended and the page was closed or
// reloaded since) is sent in the background as soon as this account is signed in and the server can be reached — nobody has to come back
// to the exam page. Silent (a toast only). Only the account that took the sitting does this (attempt.email), and it never reopens anything.
function _syncPendingExams() {
    var me = _meEmail();
    if (!me) return;
    var keys = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(C.ATTEMPT_KEY_PREFIX) === 0) keys.push(k); } } catch (e) { return; }
    keys.forEach(function (k) {
        var a = null;
        try { a = JSON.parse(localStorage.getItem(k)); } catch (e) {}
        if (!a || !a.finished || !a.sid || !a.token || !Array.isArray(a.questions) || String(a.email || '').toLowerCase() !== me) return;
        if (_submits[a.id] || (_activeAttempt && _activeAttempt.id === a.id && _onAttemptScreen(a))) return;   // already being sent / being watched
        if (a.deadlineTs && Date.now() > a.deadlineTs + SLACK_MS) {      // long past the server's deadline: it was closed there, nothing to send
            clearAttempt(a.id);
            if (typeof showToast === 'function') showToast('⏱️ انتهى وقت إحدى محاولاتك قبل وصول إجاباتها إلى الخادم، فلم تُسجَّل لها نتيجة.', 'heart-toast');
            return;
        }
        _runSubmit(a, C.getTool(a.specId, a.toolIdx), false);
    });
}
window.addEventListener('online', function () { _syncPendingExams(); });
window.addEventListener('aus-auth-changed', function () { setTimeout(_syncPendingExams, 800); });
setTimeout(_syncPendingExams, 4000);

// ── Connection while the sitting is open ("Offline Exam Mode") ─────────────────────────────────────────────────────────────────
// The questions and every answer so far live on this device, so losing the server in the middle of the exam changes nothing for the
// student: they keep answering, each answer is saved locally, and everything is sent when the exam ends (or as soon as the server is
// back). This only TELLS them which state they are in — a light check (GET /health) every 60 s while connected, every 10 s while not,
// and the browser's offline/online events at once.
var _net = { on: false, id: null, state: 'up', timer: null };
function _netText() { return _net.state === 'down' ? '● وضع الامتحان المحلي المؤقت' : '● متصل بالخادم'; }
function _netHint() {
    if (_net.state !== 'down') return '';
    var a = _activeAttempt;
    return 'Offline Exam Mode — الاتصال بالخادم مقطوع. تتابع الإجابة وتُحفظ إجاباتك على جهازك، وتُرسل تلقائياً عند عودة الاتصال أو عند انتهاء الامتحان.' +
        (a && a.deadlineTs ? ' آخر موعد لوصولها إلى الخادم حوالي ' + _clock(a.deadlineTs) + ' — بعده تُغلق المحاولة.' : '');
}
function _netPill() { return '<span class="cert-net' + (_net.state === 'down' ? ' down' : '') + '" id="certNet" title="' + C.sanitize(_netHint()) + '">' + _netText() + '</span>'; }
function _netApply() {
    var el = _el('certNet');
    if (!el) return;
    el.className = 'cert-net' + (_net.state === 'down' ? ' down' : '');
    el.textContent = _netText();
    el.title = _netHint();
}
function _netSet(state) { if (_net.state !== state) { _net.state = state; _netApply(); } }
function _netBeat() {
    clearTimeout(_net.timer);
    if (!_net.on) return;
    if (document.hidden) { _net.timer = setTimeout(_netBeat, 10000); return; }
    C.probeServer({ force: true, timeoutMs: 5000 }).then(function (r) {
        if (!_net.on) return;
        _netSet(r.ok ? 'up' : 'down');
        _net.timer = setTimeout(_netBeat, _net.state === 'down' ? 10000 : 60000);
    });
}
function _netOffline() { _netSet('down'); clearTimeout(_net.timer); _net.timer = setTimeout(_netBeat, 3000); }
function _netOnline() { _netBeat(); }
function _netStart(attempt) {
    if (_net.on && _net.id === attempt.id) return;           // idempotent: every question re-renders the screen
    _netStop();
    _net.on = true; _net.id = attempt.id;
    _net.state = (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'down' : 'up';
    window.addEventListener('offline', _netOffline);
    window.addEventListener('online', _netOnline);
    _net.timer = setTimeout(_netBeat, 60000);
}
function _netStop() {
    clearTimeout(_net.timer);
    if (_net.on) { window.removeEventListener('offline', _netOffline); window.removeEventListener('online', _netOnline); }
    _net.on = false; _net.id = null;
}

function _certHost() {
    return document.getElementById('certHost');
}

function _renderExamQuestion(attempt) {
    var host = _certHost();
    if (!host) return;
    _activeAttempt = attempt;
    var trial = attempt.trial === true;     // a local practice sitting (see LOCAL TRIAL): not proctored, no connection badge, nothing official
    if (trial) _trialWatchStart(attempt.type, attempt.specId, attempt.toolIdx);
    else {
        if (window._AUS_PROCTOR) window._AUS_PROCTOR.startMonitoring(attempt.id); // idempotent — no-ops if already running
        _netStart(attempt);                                                       // idempotent too — drives the "Offline Exam Mode" badge below
    }
    stopTimer();
    var q = attempt.questions[attempt.idx];
    var cfg = C.CERT_CONFIG[attempt.type];
    var tool = C.getTool(attempt.specId, attempt.toolIdx);
    if (q.qType === 'match' && (!_pendingMatch.pairs || _pendingMatch.pairs.length !== q.left.length)) {
        _pendingMatch = { leftSel: null, pairs: new Array(q.left.length).fill(null) };
    }
    if (q.qType === 'order' && _pendingOrder.length === 0) _pendingOrder = [];

    var progressPct = Math.round((attempt.idx / attempt.questions.length) * 100);
    var body = q.qType === 'mcq' ? _mcqHtml(q) : q.qType === 'order' ? _orderHtml(q) : _matchHtml(q);

    host.innerHTML =
    '<div class="cert-wrap"' + (trial ? ' data-cert-trial="1"' : '') + '>' +
        '<div class="cert-exam-top">' +
            '<span class="cert-exam-badge">' + cfg.icon + ' ' + cfg.label + ' — ' + tool.name + '</span>' +
            '<span class="cert-exam-count">' + (attempt.idx + 1) + ' / ' + attempt.questions.length + ' &middot; ' + progressPct + '%' + (trial ? _trialPill() : _netPill()) + '</span>' +
        '</div>' +
        (trial ? '<div id="certTrialBanner">' + _trialBannerHtml(false) + '</div>' : '') +
        '<div class="cert-progress-track"><i style="width:' + progressPct + '%"></i></div>' +
        '<div class="cert-timer-row">' +
            '<div class="cert-timer-ring" id="certTimerRing"><span id="certTimerNum">' + cfg.seconds + '</span></div>' +
            '<div class="cert-timer-bar-track"><i id="certTimerBar" style="width:100%"></i></div>' +
        '</div>' +
        '<div class="cert-card">' + body + '</div>' +
    '</div>';

    var startTs = attempt.qStartTs;
    var seconds = cfg.seconds;
    _timerHandle = setInterval(function () {
        var remaining = Math.max(0, seconds - (Date.now() - startTs) / 1000);
        var pct = Math.max(0, (remaining / seconds) * 100);
        var numEl = document.getElementById('certTimerNum');
        var barEl = document.getElementById('certTimerBar');
        if (numEl) numEl.textContent = Math.ceil(remaining);
        if (barEl) barEl.style.width = pct + '%';
        if (remaining <= 5 && numEl) numEl.parentElement.classList.add('urgent');
        if (remaining <= 0) {
            stopTimer();
            var currentAnswer = q.qType === 'mcq' ? null : q.qType === 'order' ? _pendingOrder.slice() : _pendingMatch.pairs.slice();
            _advance(attempt, (q.qType !== 'mcq' && currentAnswer.some(function(v){return v!==null && v!==undefined;})) ? currentAnswer : null);
        }
    }, 200);
}

// Defense-in-depth: template questions are 100% static developer data and AI
// questions are already sanitize()'d in validateAIQuestions (aus_36), so this
// isn't exploitable today — but the renderer sanitizing its own inputs means
// a future question source can't reintroduce XSS just by forgetting to
// escape at the generation layer.
function _mcqHtml(q) {
    return '' +
    '<p class="cert-q-prompt">' + C.sanitize(q.prompt) + '</p>' +
    '<div class="cert-q-opts">' + q.options.map(function (o, i) {
        return '<button class="cert-opt" onclick="window._certAnswerMcq(' + i + ')">' +
            '<span class="cert-opt-badge">' + String.fromCharCode(65 + i) + '</span>' + C.sanitize(o) + '</button>';
    }).join('') + '</div>';
}
function _orderHtml(q) {
    var chips = q.items.map(function (item, i) {
        var pos = _pendingOrder.indexOf(i);
        return '<button class="cert-order-chip' + (pos !== -1 ? ' picked' : '') + '" data-i="' + i + '" onclick="window._certPickOrder(' + i + ')">' +
            (pos !== -1 ? '<span class="cert-order-num">' + (pos + 1) + '</span>' : '') + C.sanitize(item) + '</button>';
    }).join('');
    return '' +
    '<p class="cert-q-prompt">' + C.sanitize(q.prompt) + '</p>' +
    '<p class="cert-hint">اضغط العناصر بالترتيب الصحيح من الأول إلى الأخير.</p>' +
    '<div class="cert-order-list">' + chips + '</div>' +
    '<button class="cert-submit-btn" id="certOrderSubmit" ' + (_pendingOrder.length === q.items.length ? '' : 'disabled') + ' onclick="window._certSubmitOrder()">تأكيد الترتيب</button>';
}
function _matchHtml(q) {
    var leftHtml = q.left.map(function (l, i) {
        var matched = _pendingMatch.pairs[i] !== null && _pendingMatch.pairs[i] !== undefined;
        return '<button class="cert-match-item' + (matched ? ' matched' : (_pendingMatch.leftSel === i ? ' selected' : '')) + '" onclick="window._certPickLeft(' + i + ')" ' + (matched ? 'disabled' : '') + '>' +
            (matched ? '<span class="cert-order-num">' + (i + 1) + '</span>' : '') + C.sanitize(l) + '</button>';
    }).join('');
    var usedRight = _pendingMatch.pairs.filter(function (v) { return v !== null && v !== undefined; });
    var rightHtml = q.right.map(function (r, i) {
        var used = usedRight.indexOf(i) !== -1;
        return '<button class="cert-match-item right' + (used ? ' matched' : '') + '" onclick="window._certPickRight(' + i + ')" ' + (used ? 'disabled' : '') + '>' + C.sanitize(r) + '</button>';
    }).join('');
    var allMatched = _pendingMatch.pairs.every(function (v) { return v !== null && v !== undefined; });
    return '' +
    '<p class="cert-q-prompt">' + C.sanitize(q.prompt) + '</p>' +
    '<p class="cert-hint">اختر عنصراً من اليمين ثم عرّفه المطابق من اليسار.</p>' +
    '<div class="cert-match-cols"><div class="cert-match-col">' + leftHtml + '</div><div class="cert-match-col">' + rightHtml + '</div></div>' +
    '<button class="cert-submit-btn" id="certMatchSubmit" ' + (allMatched ? '' : 'disabled') + ' onclick="window._certSubmitMatch()">تأكيد المطابقة</button>';
}

var _activeAttempt = null;
function _currentAttempt() { return _activeAttempt; }

window._certAnswerMcq = function (idx) {
    var a = _currentAttempt(); if (!a) return;
    stopTimer();
    _advance(a, idx);
};
window._certPickOrder = function (i) {
    var pos = _pendingOrder.indexOf(i);
    if (pos !== -1) { _pendingOrder.splice(pos, 1); } else { _pendingOrder.push(i); }
    _renderExamQuestion(_currentAttempt());
};
window._certSubmitOrder = function () {
    var a = _currentAttempt(); if (!a) return;
    stopTimer();
    _advance(a, _pendingOrder.slice());
};
window._certPickLeft = function (i) { _pendingMatch.leftSel = i; _renderExamQuestion(_currentAttempt()); };
window._certPickRight = function (ri) {
    if (_pendingMatch.leftSel === null || _pendingMatch.leftSel === undefined) return;
    _pendingMatch.pairs[_pendingMatch.leftSel] = ri;
    _pendingMatch.leftSel = null;
    _renderExamQuestion(_currentAttempt());
};
window._certSubmitMatch = function () {
    var a = _currentAttempt(); if (!a) return;
    stopTimer();
    _advance(a, _pendingMatch.pairs.slice());
};

// =============================================================================
// LOCAL TRIAL — «المتابعة محلياً»: practice on this device while the server is away
// =============================================================================
// The official exam is drawn, kept and graded by the SERVER, so it cannot start without it (see _renderServerWait). Rather than leave the
// student with nothing, they may sit a LOCAL TRIAL: the same kind of exam (questions, seconds per question, pass mark), drawn in the page from
// the very template generator the server's bank is built from (C.buildTrialSitting) and graded in the page by the server's own rules
// (C.gradeTrialSitting). Every answer is saved under aus.cert.trial.<exam> in localStorage, so a reload loses nothing.
// What a trial is NOT, on purpose: it is never sent to the server, never stored as a result, earns no XP and no certificate, costs no credit
// and is not proctored — a grade the page gives itself could be forged, so it is never allowed to count for anything. When the server is
// back the student is told, and the official exam is one button away.
// Switch it off: <meta name="aus-exam-local-trial" content="off"> or localStorage 'aus.exam.localTrial' = 'off'.
var _tw = { on: false, up: false, args: null, auto: '', timer: null, seq: 0 };   // the watch for "the server is back" while a trial screen is open (auto: 'start'|'gate' when the trial began by itself)

function _trialArgs() { var a = _tw.args; return a ? '\'' + a[0] + '\',\'' + a[1] + '\',' + a[2] : ''; }
function _trialPill() { return '<span class="cert-net trial" id="certTrialPill" title="تجربة تدريبية محلية: لا تُرسل إلى الخادم ولا تُحتسب">● تجربة محلية — غير معتمدة</span>'; }
// plain = the screen already explains what a trial is, so there is nothing to say until the server is back
function _trialBannerHtml(plain) {
    if (_tw.up && _tw.args) {
        return '<div class="cert-ng-strip up"><span><i class="fas fa-circle-check"></i> عاد الخادم — الامتحان الرسمي متاح الآن.</span>' +
            '<button class="cert-btn-gold sm" onclick="window._certTrialToOfficial(' + _trialArgs() + ')">الانتقال للامتحان الرسمي</button></div>';
    }
    if (plain) return '';
    if (_tw.auto && _tw.args) {      // it began by itself: say why, and keep the way back to the connection check one tap away
        return '<div class="cert-ng-strip"><span><i class="fas fa-flask"></i> الخادم غير متاح الآن — تعمل بوضع التجربة المحلية: تدريب على جهازك لا يُرسل ولا يُحتسب ولا يُصدر شهادة.</span>' +
            '<button class="cert-btn-ghost sm" onclick="window._certTrialBack(\'' + _tw.auto + '\',' + _trialArgs() + ')">إعادة محاولة الاتصال</button></div>';
    }
    return '<div class="cert-ng-strip"><span><i class="fas fa-flask"></i> تجربة تدريبية على جهازك — لا تُرسل إلى الخادم ولا تُحتسب ولا تُصدر شهادة.</span></div>';
}
function _trialPaint() { var el = _el('certTrialBanner'); if (el) el.innerHTML = _trialBannerHtml(el.getAttribute('data-plain') === '1'); }

// While any trial screen is open, ask the server now and then (every 15 s, not while the tab is hidden); the first time it answers, say so —
// the student decides when to leave the trial. Stops by itself when the student leaves the trial screens.
function _trialWatchStart(type, specId, toolIdx, auto) {
    _tw.args = [type, specId, toolIdx];
    if (auto !== undefined) _tw.auto = auto;        // only the entry points say how the trial began; every re-render just keeps it
    if (_tw.on) return;
    _tw.on = true; _tw.up = false;
    clearTimeout(_tw.timer);
    _tw.timer = setTimeout(_trialWatchBeat, 6000);
}
function _trialWatchStop() { clearTimeout(_tw.timer); _tw.on = false; _tw.up = false; _tw.auto = ''; _tw.seq++; }
function _trialWatchBeat() {
    clearTimeout(_tw.timer);
    if (!_tw.on) return;
    if (!document.querySelector('[data-cert-trial]')) { _trialWatchStop(); return; }      // the student left the trial screens
    if (document.hidden) { _tw.timer = setTimeout(_trialWatchBeat, 15000); return; }
    var seq = ++_tw.seq;
    C.probeServer({ force: true, timeoutMs: 5000 }).then(function (r) {
        if (!_tw.on || seq !== _tw.seq) return;
        if (r.ok) {
            _tw.up = true;
            _trialPaint();
            if (typeof showToast === 'function') showToast('✅ عاد الخادم — يمكنك الانتقال إلى الامتحان الرسمي.', 'xp-toast');
            if (typeof window.syncStudentData === 'function') window.syncStudentData();     // the practice results recorded meanwhile are linked to the account now
            return;
        }
        _tw.timer = setTimeout(_trialWatchBeat, 15000);
    });
}
window.addEventListener('online', function () { if (_tw.on && !_tw.up) _trialWatchBeat(); });

// Said once, before anything starts: what the trial is and is not (and a saved, unfinished trial can be continued).
// kind = which screen the student came from ('start' | 'gate'), so "back" returns to the same connection check.
window._certTrialIntro = function (kind, type, specId, toolIdx) {
    var host = _certHost();
    if (!host) return;
    var id = C.certId(type, specId, toolIdx);
    if (loadAttempt(id)) { startExam(type, specId, toolIdx); return; }       // an open official sitting always comes first (it needs no server to carry on)
    var tool = C.getTool(specId, toolIdx), cfg = C.CERT_CONFIG[type];
    if (!tool || !cfg || !C.localTrialEnabled()) { _renderServerWait(kind, type, specId, toolIdx); return; }
    _stopWaitUi();
    _trialWatchStart(type, specId, toolIdx, '');
    var saved = loadTrial(id), args = '\'' + type + '\',\'' + specId + '\',' + toolIdx;
    host.innerHTML =
    '<div class="cert-wrap" data-cert-trial="1"><div class="cert-ng" id="certTrialIntro">' +
        '<span class="cert-ng-chip cyan"><i class="cert-ng-dot"></i>وضع التجربة المحلية (Offline)</span>' +
        '<div class="cert-ng-icon">🧪</div>' +
        '<h2 class="cert-ng-title">تجربة محلية — ' + C.sanitize(tool.name) + '</h2>' +
        '<p class="cert-ng-text">الخادم غير متاح الآن، فيمكنك التمرّن على «' + cfg.label + '» على جهازك دون اتصال.</p>' +
        '<ul class="cert-ng-list">' +
            '<li class="ok"><i class="fas fa-check"></i><span>' + cfg.questions + ' سؤالاً من الأنواع نفسها، و' + cfg.seconds + ' ثانية لكل سؤال، والنجاح عند ' + cfg.passPercent + '%.</span></li>' +
            '<li class="ok"><i class="fas fa-check"></i><span>إجاباتك تُحفظ على هذا الجهاز (localStorage) فلا تضيع إن أعدت تحميل الصفحة.</span></li>' +
            '<li class="no"><i class="fas fa-xmark"></i><span>تجربة تدريبية فقط: لا تُرسل إلى الخادم، ولا تُسجَّل نتيجتها، ولا تُصدر عنها شهادة، ولا تستهلك رصيدك.</span></li>' +
            '<li class="info"><i class="fas fa-server"></i><span>الامتحان الرسمي يُصدَر ويُصحَّح على الخادم وحده — سننبّهك هنا فور عودته لتبدأه.</span></li>' +
        '</ul>' +
        '<div id="certTrialBanner" data-plain="1">' + _trialBannerHtml(true) + '</div>' +
        '<div class="cert-ng-actions">' +
            (saved
                ? '<button class="cert-btn-gold" onclick="window._certTrialGo(' + args + ',0)"><i class="fas fa-play"></i> تابع التجربة (السؤال ' + (saved.idx + 1) + ' من ' + saved.questions.length + ')</button>' +
                  '<button class="cert-btn-outline" onclick="window._certTrialGo(' + args + ',1)"><i class="fas fa-rotate-right"></i> تجربة جديدة</button>'
                : '<button class="cert-btn-gold" onclick="window._certTrialGo(' + args + ',1)"><i class="fas fa-play"></i> بدء الامتحان بوضع التجربة المحلية</button>') +
            '<button class="cert-btn-ghost" onclick="window._certTrialBack(\'' + kind + '\',' + args + ')"><i class="fas fa-arrow-right"></i> رجوع</button>' +
        '</div>' +
    '</div></div>';
};

// fresh = 1 → draw a new trial · 0 → carry on the saved one (every question gets its full time again: nothing is at stake in a trial)
// auto = 'start' | 'gate' when the trial begins by itself (mode 'auto', see _serverAway); omitted when the student chose it on the intro screen
window._certTrialGo = function (type, specId, toolIdx, fresh, auto) {
    if (!C.localTrialEnabled()) return;
    var id = C.certId(type, specId, toolIdx);
    if (loadAttempt(id)) { startExam(type, specId, toolIdx); return; }
    var t = fresh ? null : loadTrial(id);
    if (!t) {
        var s = C.buildTrialSitting(type, specId, toolIdx);
        if (!s) { _renderNotice('⚠️', 'تعذّر تجهيز التجربة', 'لا تتوفر أسئلة محلية لهذه الأداة.', _noticeButtons(type, specId, toolIdx, false)); return; }
        t = { id: id, type: type, specId: specId, toolIdx: toolIdx, trial: true, email: _meEmail(), questions: s.questions, key: s.key,
              answers: new Array(s.questions.length).fill(null), idx: 0, createdTs: Date.now(), finished: false };
    }
    t.qStartTs = Date.now();
    _stopWaitUi(); _netStop(); stopTimer();
    var q = t.questions[t.idx];
    _pendingOrder = [];
    _pendingMatch = { leftSel: null, pairs: new Array(q.qType === 'match' ? q.left.length : 0).fill(null) };
    _saved(t);
    _trialWatchStart(type, specId, toolIdx, auto || '');
    _renderExamQuestion(t);
};
window._certTrialBack = function (kind, type, specId, toolIdx) { _trialWatchStop(); _renderServerWait(kind, type, specId, toolIdx); };
window._certTrialToOfficial = function (type, specId, toolIdx) { _trialWatchStop(); window._certGateAndStart(type, specId, toolIdx); };

// The last answer: graded right here and shown. Nothing is submitted for grading, stored as an exam result, awarded XP or certified. The score is
// kept in the student's own record (student_data.js: this device first, linked to the account by its existing sync whenever the server is there),
// labelled as a local trial so nobody reads it as a grade.
function _finishTrial(t) {
    stopTimer();
    _activeAttempt = null;
    var g = C.gradeTrialSitting(t.type, t.questions, t.key, t.answers);
    clearTrial(t.id);
    var tool = C.getTool(t.specId, t.toolIdx), cfg = C.CERT_CONFIG[t.type];
    try { if (typeof window.recordStudentResult === 'function') window.recordStudentResult('تجربة الشهادات (محلية)', (tool ? tool.name : t.specId) + ' — ' + cfg.label + ' (غير معتمدة)', g.correct, g.total); } catch (e) {}
    _renderTrialResult(t, g);
}
function _renderTrialResult(t, g) {
    var host = _certHost();
    if (!host) return;
    var cfg = C.CERT_CONFIG[t.type], args = '\'' + t.type + '\',\'' + t.specId + '\',' + t.toolIdx;
    _trialWatchStart(t.type, t.specId, t.toolIdx);
    host.innerHTML =
    '<div class="cert-wrap" data-cert-trial="1"><div class="cert-ng" id="certTrialResult">' +
        '<span class="cert-ng-chip cyan"><i class="cert-ng-dot"></i>نتيجة تجريبية محلية — غير معتمدة</span>' +
        '<div class="cert-ng-pct">' + g.percent + '%</div>' +
        '<h2 class="cert-ng-title">' + (g.passed ? 'نتيجة تجريبية جيدة' : 'تحتاج إلى مراجعة قبل الامتحان الرسمي') + '</h2>' +
        '<p class="cert-ng-text">' + g.correct + ' إجابة صحيحة من أصل ' + g.total + ' — النسبة المطلوبة للنجاح في الامتحان الرسمي ' + cfg.passPercent + '%.</p>' +
        '<p class="cert-ng-note">هذه تجربة تدريبية على جهازك: لا تُحتسب كنتيجة امتحان، ولا تُصدر عنها شهادة، ولم يُخصم لها رصيد. حُفظت في سجلّك على هذا الجهاز وتُزامَن مع حسابك تلقائياً متى توفّر الخادم (للمتابعة فقط).</p>' +
        '<div id="certTrialBanner" data-plain="1">' + _trialBannerHtml(true) + '</div>' +
        '<div class="cert-ng-actions">' +
            '<button class="cert-btn-gold" onclick="window._certTrialToOfficial(' + args + ')"><i class="fas fa-play"></i> الامتحان الرسمي</button>' +
            '<button class="cert-btn-outline" onclick="window._certTrialGo(' + args + ',1)"><i class="fas fa-rotate-right"></i> أعد التجربة</button>' +
            '<button class="cert-btn-ghost" onclick="window.openCertifications(\'' + t.specId + '\',' + t.toolIdx + ')"><i class="fas fa-arrow-right"></i> رجوع للشهادات</button>' +
        '</div>' +
    '</div></div>';
}

// =============================================================================
// RESULTS SCREEN — pass/fail messaging, certificate request, printable result
// =============================================================================
function _renderExamResults(result, tool) {
    var host = _certHost();
    if (!host) return;
    var cfg = C.CERT_CONFIG[result.type];

    if (result.passed) {
        host.innerHTML =
        '<div class="cert-wrap"><div class="cert-card cert-result pass">' +
            '<div class="cert-result-icon">🎉</div>' +
            '<div class="cert-result-pct">' + result.percent + '%</div>' +
            '<h2 class="cert-result-title">' + cfg.passMsg + '</h2>' +
            '<p class="cert-result-sub">' + result.correct + ' إجابة صحيحة من أصل ' + result.total + '</p>' +
            '<div class="cert-official-box">' +
                '<i class="fas fa-stamp"></i>' +
                '<p>لقد اجتزت الاختبار بنجاح.<br>يمكنك الحصول على الشهادة الرسمية من <b>مركز الريادة والابتكار في جامعة عمان العربية</b> من خلال إكمال إجراءات إصدار الشهادة.</p>' +
            '</div>' +
            '<div class="cert-result-actions">' +
                '<button class="cert-btn-gold" onclick="window._certRequestCertificate(\'' + result.type + '\',\'' + result.specId + '\',' + result.toolIdx + ')"><i class="fas fa-certificate"></i> طلب الشهادة</button>' +
                '<button class="cert-btn-outline" onclick="window._certPrintResult(\'' + result.type + '\',\'' + result.specId + '\',' + result.toolIdx + ')"><i class="fas fa-print"></i> طباعة النتيجة</button>' +
                '<button class="cert-btn-ghost" onclick="window.openCertifications(\'' + result.specId + '\',' + result.toolIdx + ')"><i class="fas fa-arrow-right"></i> رجوع للشهادات</button>' +
            '</div>' +
            '<div id="certRequestMsg"></div>' +
        '</div></div>';
    } else {
        host.innerHTML =
        '<div class="cert-wrap"><div class="cert-card cert-result fail">' +
            '<div class="cert-result-icon">📚</div>' +
            '<div class="cert-result-pct">' + result.percent + '%</div>' +
            '<h2 class="cert-result-title">حظاً أوفر</h2>' +
            '<p class="cert-result-sub">' + cfg.failMsg + '</p>' +
            '<p class="cert-result-detail">' + result.correct + ' إجابة صحيحة من أصل ' + result.total + ' — النسبة المطلوبة للنجاح ' + cfg.passPercent + '%</p>' +
            '<p class="cert-result-detail">إعادة المحاولة تتطلب دفع رسوم التقديم مجدداً (' + cfg.price + ' د.أ).</p>' +
            '<div class="cert-result-actions">' +
                '<button class="cert-btn-gold" onclick="window.openCertLearnPage(\'' + result.type + '\',\'' + result.specId + '\',' + result.toolIdx + ')"><i class="fas fa-book-open"></i> مراجعة المحتوى التعليمي</button>' +
                '<button class="cert-btn-ghost" onclick="window.openCertifications(\'' + result.specId + '\',' + result.toolIdx + ')"><i class="fas fa-arrow-right"></i> رجوع للشهادات</button>' +
            '</div>' +
        '</div></div>';
    }
}

window._certRequestCertificate = function (type, specId, toolIdx) {
    var tool = C.getTool(specId, toolIdx);
    var spec = C.getSpecialty(specId);
    var cfg = C.CERT_CONFIG[type];
    var u = window.ausAuth && window.ausAuth.user;
    var certId = C.certId(type, specId, toolIdx);
    var savedResult = C.getResults()[certId]; // the ≥80% requirement is already enforced structurally — this button only ever renders on the passed branch
    var req = {
        id: certId + '_' + Date.now(),
        type: type, toolName: tool.name, specId: specId, specialtyName: spec ? spec.name : specId,
        certLabel: cfg.label, ts: Date.now(), status: 'pending',
        studentEmail: (u && u.email) || '', studentName: (u && u.full_name) || (u && u.email) || 'طالب',
        percent: savedResult ? savedResult.percent : null,
        // id of the server's own record of the passed sitting: when the admin issues the digital certificate, /issue checks
        // it (really passed, really this student) and takes the score from IT — not from the percent above
        attemptId: savedResult ? (savedResult.attemptId || null) : null
    };
    try {
        var all = JSON.parse(localStorage.getItem(C.REQUESTS_KEY) || '[]');
        all.push(req);
        localStorage.setItem(C.REQUESTS_KEY, JSON.stringify(all));
    } catch (e) {}
    if (window._AUS_BUS) window._AUS_BUS.emit('XP_AWARDED', { amount: 20, source: 'cert_request' });
    var msgEl = document.getElementById('certRequestMsg');
    if (msgEl) {
        msgEl.innerHTML = '<div class="cert-request-confirm"><i class="fas fa-check-circle"></i> تم تسجيل طلبك. توجّه إلى <b>مركز الريادة والابتكار في جامعة عمان العربية</b> لإكمال إجراءات إصدار الشهادة الرسمية.' +
            ' <button class="cert-link-btn" onclick="showSection(\'innovation\');innOpen&&innOpen()">فتح القسم ←</button></div>' +
            '<div class="cert-request-confirm" id="certDigitalMsg" style="margin-top:10px;border-color:rgba(212,175,55,.35)"><i class="fas fa-shield-halved" style="color:#d4af37"></i> بالإضافة إلى ذلك، ستصدر لك <b>AUS</b> شهادة رقمية موثّقة (رقم فريد + رمز QR قابل للتحقق من أي جهة) بعد مراجعة الإدارة لطلبك.' +
            ' <button class="cert-link-btn" onclick="window._certRenderMyDigitalCerts && window._certRenderMyDigitalCerts()">تابع حالتها هنا ←</button></div>';
    }
    if (typeof showToast === 'function') showToast('✅ تم تسجيل طلب الشهادة', 'xp-toast');
    // The digital certificate is issued by the SERVER right now (unique number + verify link + QR): it checks that this really is a
    // passed sitting of this student, then the certificate opens with its QR code. If that cannot happen (offline, not signed in on
    // the server, owner-approval mode) the box above is rewritten with the reason and the old "after admin review" path still works.
    if (window.AUS_CERT_VIEW && req.attemptId) {
        window.AUS_CERT_VIEW.requestDigital({ attemptId: req.attemptId, studentName: u && u.full_name }, document.getElementById('certDigitalMsg'));
    }
};

window._certPrintResult = function (type, specId, toolIdx) {
    var tool = C.getTool(specId, toolIdx);
    var spec = C.getSpecialty(specId);
    var cfg = C.CERT_CONFIG[type];
    var results = C.getResults();
    var result = results[C.certId(type, specId, toolIdx)];
    if (!result) return;
    var d = new Date(result.ts);
    var dateStr = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    var win = window.open('', '_blank');
    if (!win) { if (typeof showToast === 'function') showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'heart-toast'); return; }
    win.document.write(
        '<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>نتيجة ' + cfg.label + '</title><style>' +
        'body{font-family:"Tajawal",Arial,sans-serif;background:#fff;color:#111;padding:60px;text-align:center;}' +
        '.cert-print{border:10px double #d4af37;padding:60px 40px;max-width:720px;margin:0 auto;}' +
        'h1{color:#8a6d00;font-size:1.6rem;margin-bottom:6px;} h2{font-size:2rem;margin:18px 0;}' +
        '.seal{font-size:3rem;margin-bottom:10px;} .name-line{font-size:1.3rem;font-weight:700;margin:24px 0 4px;border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:6px;}' +
        '.meta{color:#555;font-size:0.95rem;margin-top:30px;line-height:1.9;} .pct{font-size:2.6rem;font-weight:900;color:#8a6d00;margin:14px 0;}' +
        '@media print { body{padding:0;} }' +
        '</style></head><body>' +
        '<div class="cert-print">' +
            '<div class="seal">🏅</div>' +
            '<h1>AUS — AI University Simulator</h1>' +
            '<h2>' + cfg.icon + ' ' + cfg.label + '</h2>' +
            '<p>نتيجة اختبار: <b>' + tool.name + '</b> — ' + (spec ? spec.name : '') + '</p>' +
            '<div class="pct">' + result.percent + '%</div>' +
            '<p>' + result.correct + ' إجابة صحيحة من أصل ' + result.total + '</p>' +
            '<div class="meta">تاريخ الإنجاز: ' + dateStr + '<br>' +
            'هذه وثيقة نتيجة داخلية — لإصدار الشهادة الرسمية يُرجى مراجعة قسم الريادة والابتكار داخل المنصة.</div>' +
        '</div>' +
        '<script>window.onload=function(){window.print();}<\/script>' +
        '</body></html>'
    );
    win.document.close();
};

// =============================================================================
// PAYMENT GATE — 5 JOD (Knowledge) / 10 JOD (Practical), PayPal + manual CliQ/IBAN
// Mirrors the UX already established in aus_05_paywall.js, kept as an
// independent modal so it never collides with the existing file-purchase flow.
// =============================================================================
var _certPaySuccessCb = null;
var _certPayCtx = null;

function _closeCertPayment() {
    var bd = document.getElementById('cert-pay-backdrop');
    if (bd) bd.classList.remove('show');
}

// Short code the student must paste into the transfer's memo/description field.
// It's the whole reason manual approval can be fast instead of slow: the admin
// searches their real bank statement for this exact string instead of trying
// to match a name + amount + rough timestamp by eye.
function _genPayRefCode() {
    return 'AUS-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.random().toString(36).toUpperCase().slice(2, 6);
}

window.openCertPayment = function (type, specId, toolIdx, onSuccess) {
    var tool = C.getTool(specId, toolIdx);
    var cfg = C.CERT_CONFIG[type];
    _certPaySuccessCb = onSuccess;
    _certPayCtx = { type: type, specId: specId, toolIdx: toolIdx, refCode: _genPayRefCode() };

    if (!document.getElementById('cert-pay-backdrop')) {
        var bd = document.createElement('div');
        bd.id = 'cert-pay-backdrop';
        bd.className = 'cert-pay-backdrop';
        bd.innerHTML = '<div id="cert-pay-modal" class="cert-pay-modal"></div>';
        document.body.appendChild(bd);
        bd.addEventListener('click', function (e) { if (e.target === bd) _closeCertPayment(); });
    }
    var merchant = (typeof _MERCHANT !== 'undefined') ? _MERCHANT : {};
    var modal = document.getElementById('cert-pay-modal');
    modal.innerHTML =
    '<button class="cert-pay-close" onclick="window._closeCertPaymentModal()">✕</button>' +
    '<div class="cert-pay-head">' +
        '<div class="cert-pay-icon">' + cfg.icon + '</div>' +
        '<h3>' + cfg.label + ' — ' + tool.name + '</h3>' +
        '<div class="cert-pay-price">' + cfg.price + ' <span>د.أ JOD</span></div>' +
    '</div>' +
    '<div class="cert-pay-body">' +
        '<input type="text" id="certPayName" class="cert-pay-input" placeholder="الاسم الكامل (للتحقق)" autocomplete="name" />' +
        '<div id="paypal-cert-button-container" style="margin-top:14px;min-height:45px;"></div>' +
        '<div class="cert-pay-divider"><span>أو الدفع اليدوي (تحويل بنكي / CliQ)</span></div>' +
        '<p style="color:#ffd700;font-size:0.78rem;text-align:center;margin:0 0 10px;line-height:1.7;"><i class="fas fa-triangle-exclamation"></i> تأكد أن الاسم المكتوب في الحقل أعلاه هو نفس اسمك المسجّل في تطبيق CliQ تماماً — يُستخدم لمطابقة التحويل عند المراجعة.</p>' +
        '<div class="cert-pay-refcode">' +
            '<span>اكتب هذا الرمز في خانة الوصف عند التحويل — يسرّع الموافقة لدقائق بدل ساعات</span>' +
            '<div class="cert-pay-refcode-row"><b id="certPayRefCode">' + _certPayCtx.refCode + '</b>' +
            '<button id="copyRefCode" onclick="_copyToClipboard(\'' + _certPayCtx.refCode + '\',\'copyRefCode\')"><i class="fas fa-copy"></i></button></div>' +
        '</div>' +
        (merchant.cliqAlias ? '<div class="cert-pay-manual-row"><span>CliQ: <b>' + merchant.cliqAlias + '</b></span></div>' : '') +
        (merchant.iban ? '<div class="cert-pay-manual-row"><span>IBAN: <b style="direction:ltr;display:inline-block">' + merchant.iban + '</b></span></div>' : '') +
        '<button class="cert-btn-gold" style="width:100%;margin-top:14px;" id="certManualConfirm" onclick="window._confirmCertManualPayment()">' +
            '<i class="fas fa-check"></i> أكّدت التحويل — تفعيل الشهادة' +
        '</button>' +
    '</div>';
    document.getElementById('cert-pay-backdrop').classList.add('show');
    // PayPal is offered only when the SERVER can verify the payment itself (PayPal credentials configured there):
    // otherwise the money would be taken but no credit could ever be issued automatically.
    C.getExamConfig().then(function (conf) {
        if (conf && conf.paypal_verifiable) { _mountCertPayPalButton(tool, cfg); return; }
        var box = document.getElementById('paypal-cert-button-container');
        if (box) box.innerHTML = '<p style="color:rgba(255,255,255,.45);font-size:.75rem;text-align:center;margin:0;line-height:1.7">' +
            (conf && conf.unreachable ? 'تعذّر الاتصال بالخادم — جرّب لاحقاً أو استخدم التحويل اليدوي أدناه.' : 'الدفع الإلكتروني (PayPal) غير مفعّل حالياً — استخدم التحويل اليدوي أدناه.') + '</p>';
    });
};
window._closeCertPaymentModal = _closeCertPayment;

function _mountCertPayPalButton(tool, cfg) {
    var container = document.getElementById('paypal-cert-button-container');
    if (!container || typeof paypal === 'undefined' || !paypal.Buttons) return;
    var usdAmount = (cfg.price * 1.41).toFixed(2);
    try {
        paypal.Buttons({
            style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'paypal', height: 42 },
            createOrder: function (data, actions) {
                var name = document.getElementById('certPayName');
                if (name && name.value.trim().length < 3) {
                    if (typeof showToast === 'function') showToast('الرجاء إدخال اسمك الكامل قبل الدفع', 'heart-toast');
                    return null;
                }
                return actions.order.create({ purchase_units: [{ description: cfg.label + ' — ' + tool.name, amount: { currency_code: 'USD', value: usdAmount } }] });
            },
            onApprove: function (data, actions) {
                // the order id goes to OUR server, which asks PayPal itself whether it is a completed payment of the right amount
                return actions.order.capture().then(function () { _certPaymentSucceeded(data.orderID); });
            },
            onError: function () { if (typeof showToast === 'function') showToast('حدث خطأ أثناء الدفع — حاول مجدداً', 'heart-toast'); },
            onCancel: function () { if (typeof showToast === 'function') showToast('تم إلغاء الدفع', 'heart-toast'); }
        }).render('#paypal-cert-button-container');
    } catch (e) { /* PayPal SDK unavailable — manual path below still works */ }
}

// A name typed into a text box proves nothing was actually paid — this app
// has no way to verify a real bank/CliQ transfer landed. So a manual claim
// can NEVER self-grant a credit; it only files a request that an admin must
// manually approve after checking the real bank account (see the "طلبات
// الدفع المعلّقة" panel below). PayPal is unaffected — that path captures a
// real, verified payment through PayPal's own API.
window._confirmCertManualPayment = function () {
    var name = document.getElementById('certPayName');
    if (!name || name.value.trim().length < 3) {
        if (typeof showToast === 'function') showToast('الرجاء إدخال اسمك الكامل للتحقق', 'heart-toast');
        return;
    }
    if (!_certPayCtx) return;
    var tool = C.getTool(_certPayCtx.specId, _certPayCtx.toolIdx);
    var cfg = C.CERT_CONFIG[_certPayCtx.type];
    var btn = document.getElementById('certManualConfirm');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الإرسال...'; }
    setTimeout(function () {
        C.addPendingPayment({
            certId: C.certId(_certPayCtx.type, _certPayCtx.specId, _certPayCtx.toolIdx),
            type: _certPayCtx.type, specId: _certPayCtx.specId, toolIdx: _certPayCtx.toolIdx,
            toolName: tool.name, certLabel: cfg.label, price: cfg.price,
            payerName: name.value.trim(), refCode: _certPayCtx.refCode,
            payerEmail: (window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || ''
        });
        if (typeof sfxPlay === 'function') sfxPlay('click');
        _renderPendingPaymentNotice();
    }, 900);
};

function _renderPendingPaymentNotice() {
    var modal = document.getElementById('cert-pay-modal');
    if (!modal) return;
    modal.innerHTML =
        '<button class="cert-pay-close" onclick="window._closeCertPaymentModal()">✕</button>' +
        '<div style="text-align:center;padding:6px 0">' +
        '<div style="font-size:2.2rem;margin-bottom:10px">⏳</div>' +
        '<h3 style="color:#fff;font-size:1rem;margin-bottom:10px">طلبك قيد المراجعة</h3>' +
        '<p style="color:rgba(255,255,255,.6);font-size:.85rem;line-height:1.8">لن تُفعَّل الشهادة تلقائياً. سيتحقق فريق الإدارة من استلام التحويل فعلياً في الحساب البنكي، ثم تُفعَّل محاولتك.<br><br>' +
        '<b style="color:#d4af37">عند الموافقة</b> ستصلك رسالة على <b style="color:#00d4ff">الدردشة (Chat)</b> من الإدارة تُعلمك بتفعيل امتحان الشهادة. قد تستغرق المراجعة من <b>5 دقائق كحد أدنى</b> إلى <b>24 ساعة كحد أقصى</b>.</p>' +
        '</div>';
}

// A PayPal order only turns into a credit once the SERVER has verified it with PayPal (right amount, completed, never
// used before). Nothing in the browser can grant it.
var _certPayOrderId = null;
function _certPaymentSucceeded(orderId) {
    if (!_certPayCtx) return;
    if (orderId) _certPayOrderId = orderId;
    var id = C.certId(_certPayCtx.type, _certPayCtx.specId, _certPayCtx.toolIdx);
    var modal = document.getElementById('cert-pay-modal');
    if (modal) modal.innerHTML =
        '<div style="text-align:center;padding:30px 6px"><div class="cert-spin"><i class="fas fa-circle-notch fa-spin"></i></div>' +
        '<p style="color:rgba(255,255,255,.7);font-size:.9rem;margin-top:14px">جارٍ التحقق من دفعتك على الخادم...</p></div>';
    C.redeemPayPal(_certPayOrderId, id).then(function (r) {
        if (!r.ok) { _renderPaymentVerifyFailure(r); return; }
        C.refreshServerState(true);
        if (typeof sfxPlay === 'function') sfxPlay('level');
        if (typeof showToast === 'function') showToast('✅ تم الدفع بنجاح — محاولة واحدة متاحة الآن', 'xp-toast');
        _closeCertPayment();
        var cb = _certPaySuccessCb;
        _certPaySuccessCb = null;
        if (cb) cb();
    });
}
function _renderPaymentVerifyFailure(r) {
    var modal = document.getElementById('cert-pay-modal');
    if (!modal) return;
    var why = r.status === 503 ? 'الخادم غير مُهيّأ للتحقق من PayPal تلقائياً. أرسل رقم العملية أدناه للإدارة ليتم تفعيل محاولتك يدوياً.'
        : r.status === 402 ? 'المبلغ المدفوع أقل من سعر هذه الشهادة، أو لم تكتمل العملية لدى PayPal.'
        : r.status === 404 ? 'لم يُعثر على هذه العملية لدى PayPal.'
        : r.status === 401 ? 'انتهت جلستك على الخادم — سجّل الدخول من جديد ثم اضغط «إعادة التحقق».'
        : r.status === 0 ? 'تعذّر الاتصال بالخادم. احتفظ بالرقم أدناه ثم اضغط «إعادة التحقق» بعد قليل — لن يُحتسب إلا مرة واحدة.'
        : 'تعذّر التحقق من الدفعة حالياً. اضغط «إعادة التحقق» بعد قليل.';
    modal.innerHTML =
        '<button class="cert-pay-close" onclick="window._closeCertPaymentModal()">✕</button>' +
        '<div style="text-align:center;padding:6px 0">' +
        '<div style="font-size:2.2rem;margin-bottom:10px">⚠️</div>' +
        '<h3 style="color:#fff;font-size:1rem;margin-bottom:10px">لم نتمكن من تفعيل محاولتك بعد</h3>' +
        '<p style="color:rgba(255,255,255,.6);font-size:.85rem;line-height:1.8">' + why + '</p>' +
        '<div class="cert-pay-refcode"><span>رقم عملية PayPal</span><div class="cert-pay-refcode-row"><b>' + C.sanitize(_certPayOrderId || '') + '</b></div></div>' +
        '<button class="cert-btn-gold" style="width:100%;margin-top:6px" onclick="window._certRetryRedeem()"><i class="fas fa-rotate-right"></i> إعادة التحقق</button>' +
        '</div>';
}
window._certRetryRedeem = function () { if (_certPayOrderId) _certPaymentSucceeded(_certPayOrderId); };

// =============================================================================
// RICH PRE-EXAM LEARN PAGE — reuses tool.learn + synthesized sections + AI button
// =============================================================================
function _synthWhenNot(tool) {
    return 'تجنّب الاعتماد على "' + tool.name + '" عندما يكون الموقف بعيداً عن سياقها الطبيعي — أي حين لا ينطبق الوصف التالي: «' + tool.learn.useCase + '». في تلك الحالات، الاعتماد الأعمى على الأداة قد يُنتج قرارات مضلَّلة بدلاً من حلول حقيقية.';
}
function _synthBestPractices(tool) {
    var arr = tool.learn.benefits.map(function (b) { return 'استثمر في: ' + b; });
    arr.push('راجع النتائج دورياً لتفادي الوقوع في: ' + tool.learn.pitfall);
    return arr;
}
function _synthComparison(tool, siblings) {
    var others = siblings.slice(0, 3);
    if (!others.length) return 'لا توجد أدوات أخرى ضمن نفس التخصص للمقارنة حالياً.';
    return others.map(function (t) { return '<b>' + t.name + '</b>: ' + t.desc; }).join('<br>');
}
function _aiExtraCacheKey(specId, toolIdx) { return C.AI_CACHE_KEY_PREFIX + specId + '_' + toolIdx; }

window.openCertLearnPage = function (type, specId, toolIdx) {
    var host = _certHost();
    if (!host) return;
    var tool = C.getTool(specId, toolIdx);
    var siblings = C.getSiblingTools(specId, toolIdx);
    var cfg = C.CERT_CONFIG[type];
    var certificateId = C.certId(type, specId, toolIdx);
    // Free to (re)start only if there's an unused paid credit, or an already
    // in-progress attempt to resume — otherwise a fresh payment is required.
    var canStartFree = C.hasAvailableAttempt(certificateId) || !!loadAttempt(certificateId);
    function startLabel() {
        return '<i class="fas fa-play"></i> ' + ((C.hasAvailableAttempt(certificateId) || !!loadAttempt(certificateId)) ? 'ابدأ الامتحان' : 'التقديم — ' + cfg.price + ' د.أ') +
            ' (' + cfg.questions + ' سؤال · ' + cfg.seconds + ' ثانية/سؤال)';
    }
    var cachedExtra = null;
    try { cachedExtra = localStorage.getItem(_aiExtraCacheKey(specId, toolIdx)); } catch (e) {}

    host.innerHTML =
    '<div class="cert-wrap">' +
        '<button class="cert-back-btn" onclick="window.openCertifications(\'' + specId + '\',' + toolIdx + ')"><i class="fas fa-arrow-right"></i> رجوع للشهادات</button>' +
        '<div class="cert-card cert-learn">' +
            '<div class="cert-learn-head">' +
                '<div class="cert-learn-icon">' + tool.icon + '</div>' +
                '<div><h2>' + tool.name + '</h2><span class="cert-learn-badge">' + cfg.icon + ' التحضير لـ ' + cfg.label + '</span></div>' +
            '</div>' +
            '<button class="cert-video-launch-btn" onclick="window.openCertExplainerVideo(\'' + specId + '\',' + toolIdx + ')">' +
                '<i class="fas fa-circle-play"></i> 🎬 مشاهدة الفيديو الشرح المُروّى صوتياً' +
            '</button>' +
            _certSection('fa-book', 'ما هي "' + tool.name + '"؟', '<p>' + tool.learn.intro + '</p>') +
            _certSection('fa-key', 'المكونات والمفاهيم الأساسية', '<ul>' + tool.learn.points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>') +
            _certSection('fa-bullseye', 'متى تُستخدم؟', '<p>' + tool.learn.useCase + '</p>') +
            _certSection('fa-ban', 'متى لا تُستخدم؟', '<p>' + _synthWhenNot(tool) + '</p>') +
            _certSection('fa-gem', 'المزايا', '<ul>' + tool.learn.benefits.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>') +
            _certSection('fa-lightbulb', 'أفضل الممارسات', '<ul>' + _synthBestPractices(tool).map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>') +
            _certSection('fa-exclamation-triangle', 'الأخطاء الشائعة', '<p>' + tool.learn.pitfall + '</p>') +
            _certSection('fa-building', 'مثال ودراسة حالة واقعية', '<p>' + tool.learn.example + '</p>') +
            _certSection('fa-balance-scale', 'مقارنة مع أدوات أخرى في نفس التخصص', '<p>' + _synthComparison(tool, siblings) + '</p>') +
            '<div class="cert-ai-extra-box">' +
                '<button class="cert-ai-btn" onclick="window._certAskAIExtra(this,\'' + specId + '\',' + toolIdx + ')"><i class="fas fa-robot"></i> اطلب أسرار الخبراء ونصائح احترافية إضافية بالذكاء الاصطناعي</button>' +
                '<div id="certAiExtraOut" class="cert-ai-extra-out" style="display:' + (cachedExtra ? 'block' : 'none') + '">' + (cachedExtra ? C.sanitize(cachedExtra) : '') + '</div>' +
            '</div>' +
            '<button class="cert-start-exam-btn" onclick="window._certGateAndStart(\'' + type + '\',\'' + specId + '\',' + toolIdx + ')">' +
                '<i class="fas fa-play"></i> ' + (canStartFree ? 'ابدأ الامتحان' : 'التقديم — ' + cfg.price + ' د.أ') + ' (' + cfg.questions + ' سؤال · ' + cfg.seconds + ' ثانية/سؤال)' +
            '</button>' +
        '</div>' +
    '</div>';
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // the button above was drawn from this tab's cache: correct its label if the server knows better
    C.refreshServerState().then(function (changed) {
        var b = changed && host.querySelector('.cert-start-exam-btn');
        if (b) b.innerHTML = startLabel();
    });
};

function _certSection(icon, title, bodyHtml) {
    return '<section class="cert-learn-section"><h3><i class="fas ' + icon + '"></i> ' + title + '</h3>' + bodyHtml + '</section>';
}

window._certAskAIExtra = function (btn, specId, toolIdx) {
    var tool = C.getTool(specId, toolIdx);
    var out = document.getElementById('certAiExtraOut');
    if (!window._AUS_AI || typeof window._AUS_AI.ask !== 'function') {
        if (out) { out.style.display = 'block'; out.textContent = 'الميزة غير متاحة حالياً — الخادم غير متصل.'; }
        return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ التحضير...'; }
    window._AUS_AI.ask('certification',
        'اذكر 3 أسرار احترافية يستخدمها الخبراء عند تطبيق أداة "' + tool.name + '" في بيئة عمل حقيقية، ومثالاً واحداً إضافياً من سوق العمل، وأهم اختصار أو إعداد عملي متقدم. كن مختصراً ومباشراً (لا تتجاوز 6 أسطر).',
        'أنت مستشار إداري خبير يقدم نصائح عملية دقيقة ومختصرة.',
        function (err, text) {
            if (btn) btn.style.display = 'none';
            if (!out) return;
            out.style.display = 'block';
            out.innerHTML = err ? 'تعذر الحصول على رد الآن.' : C.sanitize(text);
            if (!err) { try { localStorage.setItem(_aiExtraCacheKey(specId, toolIdx), text); } catch (e) {} }
        }
    );
};

window._certGateAndStart = function (type, specId, toolIdx) {
    var id = C.certId(type, specId, toolIdx);
    // Resuming an attempt already in progress never re-charges — the credit
    // for it was already spent the moment that attempt was created.
    if (loadAttempt(id)) { startExam(type, specId, toolIdx); return; }
    // Is the server there at all? Asked FIRST (a few seconds at most): a student must not accept the proctoring terms, wait through retries and
    // only then learn that nothing can start. Not there → the local trial (mode 'auto') or the card (_serverAway). The /health answer is reused for 2 s.
    _gateBusy(true);
    C.probeServer({ timeoutMs: 4000 }).then(function (probe) {
        if (!probe.ok) { _gateBusy(false); _serverAway('gate', type, specId, toolIdx); return; }
        _gateAfterProbe(id, type, specId, toolIdx);
    });
};
function _gateAfterProbe(id, type, specId, toolIdx) {
    // Ask the server (credits live there; this tab's copy may be stale — e.g. an admin approved a payment on
    // another device). The final word is still /exam/start: it answers 402 if there really is no credit.
    C.refreshServerState(true).then(function () {
        _gateBusy(false);
        if (C.hasAvailableAttempt(id)) { startExam(type, specId, toolIdx); return; }
        // The credits could not be READ (the server did not answer, or the address leads somewhere that is not AUS's server): that is not "no
        // credit". Sending the student to pay now could make them pay for something they already own — diagnose and wait instead (the screen
        // offers to continue as soon as it is back). 401 = simply not signed in on the server: the old path (payment → start → sign-in notice).
        var readErr = C.serverStateError();
        if (readErr !== undefined && readErr !== 401) { _serverAway('gate', type, specId, toolIdx); return; }
        window.openCertPayment(type, specId, toolIdx, function () { startExam(type, specId, toolIdx); });
    });
}

// Called right AFTER a screen has been drawn from the cache: re-draws it once if the server's view (credits / results)
// differs — but only if that screen is still the one showing (the student may have moved on, or started an exam).
function _refreshThen(redraw) {
    var host = _certHost(), marker = host && host.firstElementChild;
    C.refreshServerState().then(function (changed) {
        if (changed && host && host.firstElementChild === marker) redraw();
    });
}

// =============================================================================
// CERTIFICATIONS HUB — standalone top-level tab: specialties → tools → tracks
// =============================================================================
function _allResultsStats() {
    var results = C.getResults();
    var ids = Object.keys(results);
    var passed = ids.filter(function (id) { return results[id].passed; }).length;
    return { passed: passed };
}

// The accreditation statement of the hub: Arabic by default, English when the interface language is English. The nav tab carries the same statement as a tooltip (index.html).
function _certAccredText() {
    var en = false;
    try { en = typeof prefs !== 'undefined' && !!prefs && prefs.lang === 'en'; } catch (e) { en = false; }
    return en ? 'Documented certificate, accredited by the university' : 'شهادة موثقة ومعتمدة من الجامعة';
}

window.renderCertificationsHub = function () {
    var host = _certHost();
    if (!host) return;
    var stats = _allResultsStats();
    var specs = (typeof specialties !== 'undefined') ? specialties : [];

    var cards = specs.map(function (s) {
        // tools the owner hid, and tools the owner created (no server exam bank → no certificate), are not counted
        var toolCount = (typeof toolsData !== 'undefined' && toolsData[s.id]) ? toolsData[s.id].filter(function (t) { return !t.hidden && !t._cid; }).length : (s.tools || 0);
        return '' +
        '<div class="cert-spec-card" onclick="window._certBrowseSpecialty(\'' + s.id + '\')">' +
            '<div class="cert-spec-icon">' + s.icon + '</div>' +
            '<h4>' + s.name + '</h4>' +
            '<p>' + s.desc + '</p>' +
            '<span class="cert-spec-count">' + toolCount + ' أداة × شهادتان</span>' +
        '</div>';
    }).join('');

    var isAdmin = !!(window.ausAuth && window.ausAuth.isAdmin);
    var isLoggedIn = !!(window.ausAuth && window.ausAuth.user);
    var pendingCount = isAdmin ? C.getPendingPayments().filter(function (p) { return p.status === 'pending'; }).length : 0;
    var flaggedCount = isAdmin && window._AUS_PROCTOR ? window._AUS_PROCTOR.getAllLogs().filter(function (l) { return l.terminated; }).length : 0;
    var certReqCount = isAdmin ? _certRequestsPending().length : 0;
    var filePendingCount = isAdmin && typeof getPendingFilePayments === 'function' ? getPendingFilePayments().filter(function (p) { return p.status === 'pending'; }).length : 0;

    host.innerHTML =
    '<div class="cert-wrap">' +
        '<div class="cert-hub-head">' +
            (isAdmin ? '<button class="cert-back-btn" style="float:left;border-color:rgba(255,180,0,.4);color:#ffb400" onclick="window._certRenderPendingAdmin()"><i class="fas fa-clock"></i> طلبات الدفع المعلّقة' + (pendingCount ? ' (' + pendingCount + ')' : '') + '</button>' : '') +
            (isAdmin ? '<button class="cert-back-btn" style="float:left;margin-left:10px;border-color:rgba(255,70,70,.4);color:#ff6464" onclick="window._certRenderProctorAdmin()"><i class="fas fa-shield-halved"></i> مراقبة الامتحانات' + (flaggedCount ? ' (' + flaggedCount + ')' : '') + '</button>' : '') +
            (isAdmin ? '<button class="cert-back-btn" style="float:left;margin-left:10px;border-color:rgba(0,212,255,.4);color:#00d4ff" onclick="window._certRenderRequestsAdmin()"><i class="fas fa-graduation-cap"></i> طلبات الشهادات' + (certReqCount ? ' (' + certReqCount + ')' : '') + '</button>' : '') +
            (isAdmin && typeof renderPendingFilePaymentsAdmin === 'function' ? '<button class="cert-back-btn" style="float:left;margin-left:10px;border-color:rgba(168,85,247,.4);color:#a855f7" onclick="renderPendingFilePaymentsAdmin()"><i class="fas fa-book"></i> طلبات الكتب والملفات' + (filePendingCount ? ' (' + filePendingCount + ')' : '') + '</button>' : '') +
            (isAdmin && typeof window._certRenderRegistryAdmin === 'function' ? '<button class="cert-back-btn" style="float:left;margin-left:10px;border-color:rgba(212,175,55,.4);color:#d4af37" onclick="window._certRenderRegistryAdmin()"><i class="fas fa-qrcode"></i> سجل الشهادات الرقمية</button>' : '') +
            (isLoggedIn && typeof window._certRenderMyDigitalCerts === 'function' ? '<button class="cert-back-btn" style="float:left;margin-left:10px;border-color:rgba(212,175,55,.4);color:#d4af37" onclick="window._certRenderMyDigitalCerts()"><i class="fas fa-certificate"></i> شهاداتي الرقمية</button>' : '') +
            '<h2><i class="fas fa-award"></i> الشهادات الاحترافية</h2>' +
            '<p>شهادتان معتمدتان لكل أداة عبر كل التخصصات — شهادة المعرفة وشهادة الممارسة</p>' +
            '<span class="cert-ng-chip gold" id="certAccredChip"><i class="fas fa-shield-halved"></i> ' + _certAccredText() + '</span>' +
            '<p class="cert-promo-line"><i class="fas fa-graduation-cap"></i> احصل على شهادة احترافية من الجامعة الآن</p>' +
            '<div class="cert-stats-bar">' +
                '<div class="cert-stat"><b>' + stats.passed + '</b><span>شهادة مُنجزة</span></div>' +
                '<div class="cert-stat"><b>' + specs.length + '</b><span>تخصص</span></div>' +
            '</div>' +
        '</div>' +
        '<div class="cert-spec-grid">' + cards + '</div>' +
    '</div>';
    _refreshThen(window.renderCertificationsHub); // results are the server's: redraw once if they differ from this tab's cache
};

// ── Admin-only: manually approve/reject "I transferred the money" claims ───
window._certRenderPendingAdmin = function () {
    var host = _certHost();
    if (!host || !(window.ausAuth && window.ausAuth.isAdmin)) return;
    var all = C.getPendingPayments().slice().reverse();

    function row(p) {
        var when = new Date(p.ts).toLocaleString('ar-EG');
        var statusBadge = p.status === 'pending'
            ? '<span class="cert-status new">قيد الانتظار</span>'
            : p.status === 'approved' ? '<span class="cert-status pass">مقبول ✓</span>' : '<span class="cert-status fail">مرفوض ✗</span>';
        return '<div class="cert-track-card" style="text-align:right;cursor:default">' +
            (p.refCode ?
                '<div class="cert-pay-refcode" style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px">' +
                    '<span style="margin:0;color:rgba(255,255,255,.55);font-size:.7rem">ابحث عن هذا الرمز في كشف الحساب البنكي</span>' +
                    '<b style="color:#d4af37;font-family:monospace;font-size:1.1rem;letter-spacing:.04em;direction:ltr">' + C.sanitize(p.refCode) + '</b>' +
                    '<button id="refcbtn_' + p.id + '" onclick="_copyToClipboard(\'' + p.refCode + '\',\'refcbtn_' + p.id + '\')" style="background:rgba(212,175,55,.15);border:1px solid rgba(212,175,55,.4);color:#d4af37;border-radius:8px;width:30px;height:30px;cursor:pointer;flex-shrink:0"><i class="fas fa-copy"></i></button>' +
                '</div>' : '') +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
                '<div>' +
                    '<h4 style="margin-bottom:4px">' + C.sanitize(p.toolName) + ' — ' + C.sanitize(p.certLabel) + '</h4>' +
                    '<div style="font-size:.78rem;color:rgba(255,255,255,.5);line-height:1.7">' +
                        'الاسم المُدخل: <b style="color:#fff">' + C.sanitize(p.payerName) + '</b><br>' +
                        (p.payerEmail ? ('الحساب: ' + C.sanitize(p.payerEmail) + '<br>') : '') +
                        'المبلغ المتوقع: <b style="color:#d4af37">' + p.price + ' د.أ</b><br>' +
                        'التاريخ: ' + when +
                    '</div>' +
                '</div>' + statusBadge +
            '</div>' +
            (p.status === 'pending' ?
                '<div class="cert-result-actions" style="margin-top:12px;justify-content:flex-start">' +
                    '<button class="cert-btn-gold" style="padding:8px 18px;font-size:.8rem" onclick="window._certAdminDecide(\'' + p.id + '\',true)"><i class="fas fa-check"></i> تأكيد الاستلام الفعلي وتفعيل</button>' +
                    '<button class="cert-btn-ghost" style="padding:8px 18px;font-size:.8rem" onclick="window._certAdminDecide(\'' + p.id + '\',false)"><i class="fas fa-times"></i> رفض</button>' +
                '</div>' : '') +
        '</div>';
    }

    host.innerHTML =
    '<div class="cert-wrap">' +
        '<button class="cert-back-btn" onclick="window.renderCertificationsHub()"><i class="fas fa-arrow-right"></i> رجوع</button>' +
        '<div class="cert-hub-head"><h3>🔐 طلبات الدفع اليدوي المعلّقة</h3>' +
        '<p>لا تقبل أي طلب إلا بعد التحقق الفعلي من وصول المبلغ في الحساب البنكي/CliQ.</p></div>' +
        (all.length ? all.map(row).join('') : '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)">لا توجد طلبات حالياً.</div>') +
    '</div>';
};

window._certAdminDecide = function (pendingId, approve) {
    if (!(window.ausAuth && window.ausAuth.isAdmin)) return;
    if (approve) {
        if (!window.confirm('تأكيد: هل تحققت فعلياً من وصول المبلغ في حسابك البنكي/CliQ قبل الموافقة؟')) return;
        // the credit is granted on the SERVER (to the payer's account); the claim only turns "approved" if that succeeded
        C.approvePendingPayment(pendingId).then(function (r) {
            if (typeof showToast === 'function') showToast(r.ok ? '✅ تم التفعيل بعد التحقق' : '❌ ' + (r.message || 'تعذّر التفعيل'), r.ok ? 'xp-toast' : 'heart-toast');
            window._certRenderPendingAdmin();
        });
        return;
    }
    C.rejectPendingPayment(pendingId);
    if (typeof showToast === 'function') showToast('تم رفض الطلب', 'heart-toast');
    window._certRenderPendingAdmin();
};

// ── Admin-only: AI Proctor review dashboard ─────────────────────────────────
function _parseCertId(id) {
    var firstU = id.indexOf('_'), lastU = id.lastIndexOf('_');
    return { type: id.slice(0, firstU), specId: id.slice(firstU + 1, lastU), toolIdx: parseInt(id.slice(lastU + 1), 10) };
}
window._certRenderProctorAdmin = function () {
    var host = _certHost();
    if (!host || !(window.ausAuth && window.ausAuth.isAdmin) || !window._AUS_PROCTOR) return;
    var P = window._AUS_PROCTOR;
    var logs = P.getAllLogs();

    function labelFor(id) {
        try {
            var parts = _parseCertId(id);
            var tool = C.getTool(parts.specId, parts.toolIdx);
            var cfg = C.CERT_CONFIG[parts.type];
            return (tool ? tool.name : id) + ' — ' + (cfg ? cfg.label : parts.type);
        } catch (e) { return id; }
    }

    function statusBadge(log) {
        if (log.terminated) return '<span class="cert-status fail">أُنهي تلقائياً</span>';
        if (log.reviewedAndCleared) return '<span class="cert-status pass">رُوجع ومُنحت محاولة</span>';
        if (log.warnings >= 2) return '<span class="cert-status new">تحذير ثانٍ</span>';
        if (log.warnings >= 1) return '<span class="cert-status new">تحذير أول</span>';
        return '<span class="cert-status pass">طبيعي</span>';
    }

    function row(log) {
        var eventsHtml = log.events.slice().reverse().map(function (e) {
            return '<div class="proctor-event-row"><span>' + new Date(e.ts).toLocaleTimeString('ar-EG') + '</span>' +
                '<span>' + C.sanitize(e.type) + (e.detail ? ' — ' + C.sanitize(e.detail) : '') + '</span>' +
                '<b>+' + e.points + '</b></div>';
        }).join('');
        return '<div class="cert-track-card" style="text-align:right;cursor:default">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
                '<div><h4 style="margin-bottom:4px">' + C.sanitize(labelFor(log.id)) + '</h4>' +
                    '<div style="font-size:.78rem;color:rgba(255,255,255,.5)">مستوى الخطورة: <b style="color:#d4af37">' + log.score + '</b> / ' + P.THRESHOLDS.terminate + ' · ' + log.events.length + ' حدث</div>' +
                '</div>' + statusBadge(log) +
            '</div>' +
            '<details style="margin-top:10px"><summary style="cursor:pointer;color:rgba(255,255,255,.55);font-size:.78rem">سجل الأحداث الكامل</summary>' +
                '<div class="proctor-event-log">' + (eventsHtml || '<div class="proctor-event-row"><span>لا توجد أحداث</span></div>') + '</div>' +
            '</details>' +
            (log.terminated ? '<div class="cert-result-actions" style="margin-top:12px;justify-content:flex-start">' +
                '<button class="cert-btn-gold" style="padding:8px 18px;font-size:.8rem" onclick="window._certProctorGrantRetry(\'' + log.id + '\')"><i class="fas fa-rotate-right"></i> مراجعة يدوية — منح محاولة جديدة</button>' +
            '</div>' : '') +
        '</div>';
    }

    host.innerHTML =
    '<div class="cert-wrap">' +
        '<button class="cert-back-btn" onclick="window.renderCertificationsHub()"><i class="fas fa-arrow-right"></i> رجوع</button>' +
        '<div class="cert-hub-head"><h3>🛡️ مراقبة الامتحانات بالذكاء الاصطناعي</h3>' +
        '<p>مراقبة صارمة لسلوك المتصفح (بدون كاميرا أو ميكروفون) — تبديل النوافذ، النسخ/اللصق، أدوات المطوّر، وإعادة التحميل المتكررة.</p></div>' +
        (logs.length ? logs.map(row).join('') : '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)">لا توجد بيانات مراقبة بعد.</div>') +
    '</div>';
};
window._certProctorGrantRetry = function (id) {
    if (!(window.ausAuth && window.ausAuth.isAdmin) || !window._AUS_PROCTOR) return;
    if (!window.confirm('منح محاولة جديدة مجانية لهذا الطالب بعد المراجعة اليدوية؟')) return;
    window._AUS_PROCTOR.grantReviewRetry(id).then(function (r) {
        if (typeof showToast === 'function') showToast(r.ok ? '✅ تم منح محاولة جديدة' : '❌ ' + (r.message || 'تعذّر منح المحاولة'), r.ok ? 'xp-toast' : 'heart-toast');
        window._certRenderProctorAdmin();
    });
};

// ── Admin-only: students who passed (≥80%, enforced by the button only ever
// rendering on the passed branch) and want their official certificate ──────
function _certAllRequests() { try { return JSON.parse(localStorage.getItem(C.REQUESTS_KEY) || '[]'); } catch (e) { return []; } }
function _certSaveRequests(list) { try { localStorage.setItem(C.REQUESTS_KEY, JSON.stringify(list)); } catch (e) {} }
function _certRequestsPending() { return _certAllRequests().filter(function (r) { return r.status === 'pending'; }); }

window._certRenderRequestsAdmin = function () {
    var host = _certHost();
    if (!host || !(window.ausAuth && window.ausAuth.isAdmin)) return;
    var all = _certAllRequests().slice().reverse();

    function row(r, i) {
        var when = new Date(r.ts).toLocaleString('ar-EG');
        var statusBadge = r.status === 'pending' ? '<span class="cert-status new">قيد الانتظار</span>' : '<span class="cert-status pass">تم التواصل ✓</span>';
        return '<div class="cert-track-card" style="text-align:right;cursor:default">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
                '<div><h4 style="margin-bottom:4px">' + C.sanitize(r.toolName) + ' — ' + C.sanitize(r.certLabel) + '</h4>' +
                    '<div style="font-size:.78rem;color:rgba(255,255,255,.5);line-height:1.7">' +
                        'الطالب: <b style="color:#fff">' + C.sanitize(r.studentName || '') + '</b><br>' +
                        (r.studentEmail ? ('الحساب: ' + C.sanitize(r.studentEmail) + '<br>') : '') +
                        'النتيجة: <b style="color:#d4af37">' + (r.percent != null ? r.percent + '%' : '—') + '</b> · التخصص: ' + C.sanitize(r.specialtyName || '') + '<br>' +
                        // the percent above is what the student's browser claimed; this line is what the SERVER's own record says
                        (r.attemptId ? '<b id="certVf_' + i + '" style="color:rgba(255,255,255,.5)">جارٍ التحقق من سجل الخادم...</b><br>' : '<b style="color:#ffb400">درجة غير موثّقة (امتحان قبل النظام الجديد)</b><br>') +
                        'التاريخ: ' + when +
                    '</div>' +
                '</div>' + statusBadge +
            '</div>' +
            (r.status === 'pending' ? '<div class="cert-result-actions" style="margin-top:12px;justify-content:flex-start">' +
                '<button class="cert-btn-gold" style="padding:8px 18px;font-size:.8rem" onclick="window._certMarkRequestContacted(\'' + r.id + '\')"><i class="fas fa-check"></i> تم التواصل مع الطالب لإصدار الشهادة</button>' +
            '</div>' : '') +
        '</div>';
    }

    host.innerHTML =
    '<div class="cert-wrap">' +
        '<button class="cert-back-btn" onclick="window.renderCertificationsHub()"><i class="fas fa-arrow-right"></i> رجوع</button>' +
        '<div class="cert-hub-head"><h3>🎓 طلبات الشهادات الرسمية</h3>' +
        '<p>طلاب اجتازوا الامتحان ويريدون شهادتهم من مركز الريادة والابتكار في جامعة عمان العربية.</p></div>' +
        (all.length ? all.map(row).join('') : '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)">لا توجد طلبات حالياً.</div>') +
    '</div>';

    // A request lives in the STUDENT's browser, so its percent / attempt id are only claims. Ask the server what its own
    // record of that sitting says, and show the result next to each request (the owner-only /exam/attempt/<id>).
    all.forEach(function (r, i) {
        if (!r.attemptId) return;
        C.serverAttemptSummary(r.attemptId).then(function (res) {
            var el = document.getElementById('certVf_' + i);
            if (!el) return;
            var d = res.data || {};
            if (!res.ok) {
                el.style.color = '#ffb400';
                el.textContent = res.status === 0 ? 'تعذّر التحقق — الخادم غير متاح' : res.status === 401 ? 'تعذّر التحقق — لا توجد جلسة على الخادم ' : 'لا يوجد سجل لهذه المحاولة على الخادم ✗';
                if (res.status === 401 && window.AUS_SESSION) {          // one click: sign in to the server, then draw the list again
                    var a = document.createElement('a'); a.href = '#'; a.textContent = 'تسجيل الدخول للخادم'; a.style.cssText = 'color:#00d4ff;text-decoration:underline;margin-inline-start:6px';
                    a.onclick = function (ev) { ev.preventDefault(); window.AUS_SESSION.signIn({ reason: 'manual' }).then(function (ok) { if (ok) window._certRenderRequestsAdmin(); }); };
                    el.appendChild(a);
                }
                return;
            }
            var sameStudent = (d.student_email || '') === (r.studentEmail || '').toLowerCase().trim();
            if (d.passed && sameStudent) { el.style.color = '#00f5a0'; el.textContent = 'موثّقة من الخادم ✓ — اجتاز بنسبة ' + d.percent + '%'; }
            else { el.style.color = '#ff6464'; el.textContent = 'غير مطابقة لسجل الخادم ✗ — ' + (sameStudent ? 'لم يجتز (' + d.percent + '%)' : 'المحاولة تخص طالباً آخر'); }
        });
    });
};
function _certApiBase() { return window.AUS_API_BASE || ((typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'); }
function _certApiToken() { try { return localStorage.getItem('aus_access_token') || ''; } catch (e) { return ''; } }

// Best-effort — the real, verifiable digital certificate. Runs alongside the
// existing manual partner-institution note above; if the backend is down or
// this admin isn't the owner account the backend recognizes, the local
// "contacted" flag still saves (unchanged behavior) and the registry panel
// (aus_43_cert_registry.js) can retry issuance later.
function _certIssueDigital(r) {
    var body = {
        student_email: r.studentEmail || '', student_name: r.studentName || '',
        tool_name: r.toolName || '', specialty_id: r.specId || '', specialty_name: r.specialtyName || '',
        cert_label: r.certLabel || '', percent: r.percent || 0, attempt_id: r.attemptId || undefined
    };
    if (window.AUS_SESSION) {
        // The shared session gate: Authorization header, early/automatic refresh of the 15-minute token, and — when no server
        // session exists at all — the small "sign in to the server" dialog, after which THIS request continues by itself.
        // (Before, a missing/expired token made this call silently do nothing while the request was already marked "contacted".)
        window.AUS_SESSION.request('POST', '/api/certificates/issue', body, { interactive: true, owner: true }).then(function (res) {
            var d = res.data || {}, c = d.certificate || {};
            if (typeof showToast !== 'function') return;
            if (res.ok) showToast(d.already_issued ? 'ℹ️ للطالب شهادة رقمية صادرة مسبقاً: ' + (c.certificate_number || '') : '✅ أُصدرت الشهادة الرقمية ' + (c.certificate_number || ''), 'xp-toast');
            else if (res.status === 400 && /attempt_not_a_passed_exam/.test(d.detail || '')) showToast('⚠️ رفض الخادم إصدار الشهادة الرقمية: المحاولة المرفقة ليست اجتيازاً مسجّلاً لهذا الطالب', 'heart-toast');
            else if (res.status === 401) showToast('⚠️ لم تُصدر الشهادة الرقمية: يلزم تسجيل الدخول إلى الخادم — أعد المحاولة من «سجل الشهادات»', 'heart-toast');
            else if (res.status === 403) showToast('⚠️ لم تُصدر الشهادة الرقمية: الإصدار لحساب المالك على الخادم فقط', 'heart-toast');
            else if (res.status === 0) showToast('⚠️ تعذّر الاتصال بالخادم — لم تُصدر الشهادة الرقمية بعد، يمكنك إصدارها لاحقاً من «سجل الشهادات»', 'heart-toast');
            else showToast('⚠️ تعذّر إصدار الشهادة الرقمية (' + (typeof d.detail === 'string' ? d.detail : res.status) + ')', 'heart-toast');
        });
        return;
    }
    var t = _certApiToken();                       // fallback when aus_52_session.js is not loaded
    if (!t) return;
    try {
        fetch(_certApiBase() + '/api/certificates/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
            body: JSON.stringify({
                student_email: r.studentEmail || '', student_name: r.studentName || '',
                tool_name: r.toolName || '', specialty_id: r.specId || '', specialty_name: r.specialtyName || '',
                // attempt_id = the server's own record of the passed sitting: when present the server verifies it and uses
                // ITS score; the percent below (which came from the student's browser) is then ignored
                cert_label: r.certLabel || '', percent: r.percent || 0, attempt_id: r.attemptId || undefined
            })
        }).then(function (res) {
            if (res.ok) return;
            return res.json().catch(function () { return {}; }).then(function (d) {
                // the server compared the request with its own exam record and refused — tell the admin why nothing was issued
                if (res.status === 400 && /attempt_not_a_passed_exam/.test(d.detail || '') && typeof showToast === 'function') {
                    showToast('⚠️ رفض الخادم إصدار الشهادة الرقمية: المحاولة المرفقة ليست اجتيازاً مسجّلاً لهذا الطالب', 'heart-toast');
                }
            });
        }).catch(function () {});
    } catch (e) {}
}

window._certMarkRequestContacted = function (reqId) {
    if (!(window.ausAuth && window.ausAuth.isAdmin)) return;
    var list = _certAllRequests();
    var r = list.filter(function (x) { return x.id === reqId; })[0];
    if (!r) return;
    r.status = 'contacted';
    _certSaveRequests(list);
    _certIssueDigital(r);
    if (typeof showToast === 'function') showToast('✓ تم التحديث', 'xp-toast');
    window._certRenderRequestsAdmin();
};

// ── Every logged-in student: self-service view of their own AUS digital
// certificates. This screen only READS (GET /mine, scoped server-side by the
// caller's own authenticated e-mail). Issuing happens elsewhere: right after a
// passed exam (_certRequestCertificate → POST /certificates/request, which
// re-checks the passed sitting on the server) or by the owner (POST /issue).
window._certRenderMyDigitalCerts = function () {
    var host = _certHost();
    var me = window.ausAuth && window.ausAuth.user;
    if (!host || !me) return;

    host.innerHTML =
    '<div class="cert-wrap">' +
        '<button class="cert-back-btn" onclick="window.renderCertificationsHub()"><i class="fas fa-arrow-right"></i> رجوع</button>' +
        '<div class="cert-hub-head"><h3><i class="fas fa-certificate"></i> شهاداتي الرقمية الموثّقة</h3>' +
        '<p>شهادات AUS الرقمية القابلة للتحقق (رقم فريد + رمز QR) — بالإضافة إلى شهادتك الورقية الرسمية من الجامعة.</p></div>' +
        '<div id="myDigitalCertsBody" class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)"><i class="fas fa-spinner fa-spin"></i> جارٍ التحميل...</div>' +
    '</div>';

    var localMine = _certAllRequests().filter(function (r) {
        return (r.studentEmail || '').toLowerCase() === (me.email || '').toLowerCase();
    });

    // status of an issued certificate -> [label, css class]. Only a "verified" one is "ready"; a revoked/suspended one must never look fine.
    var ST = { verified: ['جاهزة ✓', 'pass'], revoked: ['مُلغاة', 'fail'], suspended: ['موقوفة', 'suspended'], expired: ['منتهية', 'expired'], inactive: ['غير فعّالة', 'expired'] };
    var V = window.AUS_CERT_VIEW;

    function issuedCard(toolName, certLabel, cert) {
        var st = ST[cert.status] || ST.verified;
        var link = V ? V.verifyUrl(cert) : (window.location.origin + '/verify.html?id=' + encodeURIComponent(cert.certificate_number));
        return '<div class="cert-track-card" style="text-align:right;cursor:default">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
                '<div><h4 style="margin-bottom:4px">' + C.sanitize(toolName) + ' — ' + C.sanitize(certLabel) + '</h4>' +
                    '<div style="font-size:.78rem;color:rgba(255,255,255,.5)">رقم الشهادة: <b style="direction:ltr;display:inline-block;color:#d4af37;font-family:monospace">' + C.sanitize(cert.certificate_number) + '</b></div>' +
                '</div>' +
                '<span class="cert-status ' + st[1] + '">' + st[0] + '</span>' +
            '</div>' +
            '<div class="cert-result-actions" style="margin-top:12px;justify-content:flex-start">' +
                // the certificate itself, with its QR code, print / save-as-PDF / PNG — drawn by aus_51_cert_view.js
                (V ? '<button class="cert-btn-gold" style="padding:8px 18px;font-size:.8rem" data-acv-open="' + C.sanitize(cert.certificate_number) + '"><i class="fas fa-qrcode"></i> عرض الشهادة وQR</button>' : '') +
                '<button class="' + (V ? 'cert-btn-ghost' : 'cert-btn-gold') + '" style="padding:8px 18px;font-size:.8rem" onclick="window.open(' + C.sanitize(JSON.stringify(link)) + ',\'_blank\')"><i class="fas fa-shield-halved"></i> عرض شهادة التحقق</button>' +
                (cert.pdf_available ? '<button class="cert-btn-ghost" style="padding:8px 18px;font-size:.8rem" onclick="window.open(\'' + _certApiBase() + '/api/certificates/' + encodeURIComponent(cert.certificate_number) + '/download\',\'_blank\')"><i class="fas fa-download"></i> تنزيل PDF</button>' : '') +
            '</div>' +
        '</div>';
    }

    function renderBody(issuedList) {
        var body = document.getElementById('myDigitalCertsBody');
        if (!body) return;
        issuedList = issuedList || [];
        if (V) V.remember(issuedList);                       // so the certificate (and its QR) can be opened again later, even offline
        // Match each local request to a real issued certificate by tool+label; anything unmatched is still waiting for the owner.
        // (A request clicked twice, or two requests for the same certificate, show ONE card.)
        var used = {}, seenReq = {};
        var cards = localMine.map(function (r) {
            var key = r.toolName + '|' + r.certLabel;
            if (seenReq[key]) return '';
            seenReq[key] = true;
            var cert = issuedList.filter(function (c) { return c.tool_name === r.toolName && c.cert_label === r.certLabel; })[0];
            if (cert) { used[cert.certificate_number] = true; return issuedCard(r.toolName, r.certLabel, cert); }
            return '<div class="cert-track-card" style="text-align:right;cursor:default">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
                    '<div><h4 style="margin-bottom:4px">' + C.sanitize(r.toolName) + ' — ' + C.sanitize(r.certLabel) + '</h4>' +
                        '<div style="font-size:.78rem;color:rgba(255,255,255,.5)">النتيجة: ' + (r.percent != null ? r.percent + '%' : '—') + '</div>' +
                    '</div>' +
                    '<span class="cert-status new">قيد المراجعة الإدارية</span>' +
                '</div>' +
            '</div>';
        });
        // Certificates the server issued that were not requested on THIS device (another device, or issued by the owner).
        issuedList.forEach(function (c) { if (!used[c.certificate_number]) cards.push(issuedCard(c.tool_name, c.cert_label, c)); });
        cards = cards.filter(Boolean);
        if (!cards.length) {
            body.outerHTML = '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)">لم تطلب أي شهادة بعد — اجتز أحد الامتحانات ثم اضغط "طلب الشهادة".</div>';
            return;
        }
        body.outerHTML = cards.join('');
    }

    if (!_certApiToken()) { renderBody([]); return; }
    // through the cert core so an expired (15 min) access token is refreshed instead of showing every certificate as "under review"
    var mine = (C.serverMyCertificates ? C.serverMyCertificates()
        : fetch(_certApiBase() + '/api/certificates/mine', { headers: { Authorization: 'Bearer ' + _certApiToken() } })
            .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, data: d }; }); }));
    mine.then(function (r) { renderBody(r && r.ok && r.data ? (r.data.certificates || []) : []); })
        .catch(function () { renderBody([]); });
};

// Same-device live alert when a student requests a certificate — mirrors the
// identical pattern already used for pending payments (_armPendingPaymentAlerts).
var _certReqNotifyArmed = false;
function _armCertRequestAlerts() {
    if (_certReqNotifyArmed || !(window.ausAuth && window.ausAuth.isAdmin)) return;
    _certReqNotifyArmed = true;
    if (window.Notification && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) {}
    }
    window.addEventListener('storage', function (e) {
        if (e.key !== C.REQUESTS_KEY || !e.newValue) return;
        var before, after;
        try { before = JSON.parse(e.oldValue || '[]'); after = JSON.parse(e.newValue || '[]'); } catch (e2) { return; }
        if (!Array.isArray(after) || after.length <= before.length) return;
        var latest = after[after.length - 1];
        if (!latest || latest.status !== 'pending') return;
        if (typeof sfxPlay === 'function') sfxPlay('confirm');
        if (window.Notification && Notification.permission === 'granted') {
            try {
                new Notification('🎓 طالب اجتاز الامتحان وطلب شهادته', {
                    body: (latest.studentName || '') + ' — ' + (latest.toolName || '') + ' (' + (latest.percent != null ? latest.percent + '%' : '') + ')',
                    tag: 'aus-cert-request-' + latest.id
                });
            } catch (e3) {}
        }
        if (typeof showToast === 'function') showToast('🎓 طالب اجتاز الامتحان وطلب شهادته الرسمية', 'xp-toast');
    });
}
window.addEventListener('aus-auth-changed', _armCertRequestAlerts);
_armCertRequestAlerts();

window._certBrowseSpecialty = function (specId) {
    var host = _certHost();
    if (!host) return;
    var spec = C.getSpecialty(specId);
    var tools = (typeof toolsData !== 'undefined' && toolsData[specId]) || [];
    var results = C.getResults();

    var cards = tools.map(function (t, i) {
        if (t.hidden || t._cid) return '';   // hidden by the owner / created by the owner (no exam bank on the server): no certificate to show
        var kResult = results[C.certId('knowledge', specId, i)];
        var pResult = results[C.certId('practical', specId, i)];
        var badge = function (r) { return r ? (r.passed ? '<i class="fas fa-check-circle cert-mini-pass"></i>' : '<i class="fas fa-times-circle cert-mini-fail"></i>') : ''; };
        return '' +
        '<div class="cert-tool-card" onclick="window.openCertifications(\'' + specId + '\',' + i + ')">' +
            '<div class="cert-tool-icon">' + t.icon + '</div>' +
            '<h4>' + t.name + ' ' + badge(kResult) + badge(pResult) + '</h4>' +
            '<p>' + t.desc + '</p>' +
        '</div>';
    }).join('');

    host.innerHTML =
    '<div class="cert-wrap">' +
        '<button class="cert-back-btn" onclick="window.renderCertificationsHub()"><i class="fas fa-arrow-right"></i> كل التخصصات</button>' +
        '<div class="cert-hub-head">' +
            '<h3>' + (spec ? spec.icon + ' ' + spec.name : specId) + '</h3>' +
            '<p>اختر أداة لعرض شهادتيها</p>' +
        '</div>' +
        '<div class="cert-tool-grid">' + cards + '</div>' +
    '</div>';
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    _refreshThen(function () { window._certBrowseSpecialty(specId); });
};

// Entry point for a single tool's two certificate tracks — reachable both from
// the standalone Certifications tab and from the shortcut button inside a
// tool's own learn page (showToolLearn), which is why it re-selects the
// Certifications section itself before rendering.
window.openCertifications = function (specId, toolIdx) {
    if (typeof showSection === 'function' && document.getElementById('certifications') && !document.getElementById('certifications').classList.contains('active')) {
        showSection('certifications');
    }
    var certHost = _certHost();
    if (!certHost) return;
    var tool = C.getTool(specId, toolIdx);
    if (tool && (tool._cid || tool.hidden)) {   // an owner-created tool has no server-side exam bank yet → nothing to buy or sit
        certHost.innerHTML =
        '<div class="cert-wrap">' +
            '<button class="cert-back-btn" onclick="window._certBrowseSpecialty(\'' + specId + '\')"><i class="fas fa-arrow-right"></i> رجوع لأدوات التخصص</button>' +
            '<div class="cert-hub-head"><h3><i class="fas fa-award"></i> ' + tool.name + '</h3>' +
            '<p>لا تتوفر شهادة احترافية لهذه الأداة بعد — يمكنك دراستها وحلّ اختبارها القصير من قسم «الأدوات».</p></div>' +
        '</div>';
        return;
    }
    var results = C.getResults();
    var kResult = results[C.certId('knowledge', specId, toolIdx)];
    var pResult = results[C.certId('practical', specId, toolIdx)];

    function cardHtml(type, result) {
        var cfg = C.CERT_CONFIG[type];
        var statusHtml = result
            ? (result.passed ? '<span class="cert-status pass"><i class="fas fa-check-circle"></i> ناجح — ' + result.percent + '%</span>' : '<span class="cert-status fail"><i class="fas fa-times-circle"></i> لم يُجتز — ' + result.percent + '%</span>')
            : '<span class="cert-status new">جديد</span>';
        return '' +
        '<div class="cert-track-card" onclick="window.openCertLearnPage(\'' + type + '\',\'' + specId + '\',' + toolIdx + ')">' +
            '<div class="cert-track-icon">' + cfg.icon + '</div>' +
            '<h4>' + cfg.label + '</h4>' +
            '<div class="cert-track-meta">' + cfg.questions + ' سؤال · ' + cfg.seconds + ' ث/سؤال · نجاح ' + cfg.passPercent + '%</div>' +
            '<div class="cert-track-price">' + cfg.price + ' د.أ</div>' +
            statusHtml +
        '</div>';
    }

    certHost.innerHTML =
    '<div class="cert-wrap">' +
        '<button class="cert-back-btn" onclick="window._certBrowseSpecialty(\'' + specId + '\')"><i class="fas fa-arrow-right"></i> رجوع لأدوات التخصص</button>' +
        '<div class="cert-hub-head">' +
            '<h3><i class="fas fa-award"></i> الشهادات الاحترافية — ' + tool.name + '</h3>' +
            '<p>أثبت إتقانك لهذه الأداة عبر شهادتين معتمدتين رسمياً من المنصة</p>' +
        '</div>' +
        '<div class="cert-tracks-grid">' + cardHtml('knowledge', kResult) + cardHtml('practical', pResult) + '</div>' +
    '</div>';
    certHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
    _refreshThen(function () { window.openCertifications(specId, toolIdx); });
};

// =============================================================================
// STYLES — professional certification look, gold/dark theme (matches platform)
// =============================================================================
function _addCertStyles() {
    if (document.getElementById('cert-styles')) return;
    var s = document.createElement('style');
    s.id = 'cert-styles';
    s.textContent = [
        '.cert-wrap{max-width:900px;margin:20px auto;padding:0 16px;font-family:"Tajawal",sans-serif;}',
        '.cert-card{background:rgba(0,12,30,0.6);border:1px solid rgba(212,175,55,0.25);border-radius:20px;padding:32px;backdrop-filter:blur(16px);box-shadow:0 20px 50px rgba(0,0,0,0.4);}',
        '.cert-back-btn{background:none;border:1px solid rgba(212,175,55,0.3);color:#d4af37;padding:6px 16px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.82rem;margin-bottom:16px;}',
        '.cert-back-btn:hover{background:rgba(212,175,55,0.1);}',
        // Hub
        '.cert-hub-head{text-align:center;margin-bottom:22px;}',
        '.cert-hub-head h3{color:#d4af37;font-size:1.4rem;margin:0 0 6px;text-shadow:0 0 20px rgba(212,175,55,0.3);}',
        '.cert-hub-head p{color:rgba(255,255,255,0.5);font-size:0.85rem;margin:0;}',
        '.cert-promo-line{color:#d4af37 !important;font-size:0.92rem !important;font-weight:700;margin-top:10px !important;text-shadow:0 0 16px rgba(212,175,55,0.35);}',
        '.cert-promo-line i{margin-inline-end:6px;}',
        '.cert-tracks-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;}',
        // Hub: specialty + tool browsing
        '.cert-hub-head h2{color:#d4af37;font-size:1.6rem;margin:0 0 6px;text-align:center;text-shadow:0 0 20px rgba(212,175,55,0.3);}',
        '.cert-stats-bar{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:18px;}',
        '.cert-stat{background:rgba(0,12,30,0.55);border:1px solid rgba(212,175,55,0.25);border-radius:14px;padding:10px 20px;text-align:center;}',
        '.cert-stat b{display:block;color:#d4af37;font-size:1.3rem;}',
        '.cert-stat span{color:rgba(255,255,255,0.45);font-size:0.72rem;}',
        '.cert-spec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;margin-top:24px;}',
        '.cert-spec-card{background:rgba(0,12,30,0.5);border:1px solid rgba(212,175,55,0.2);border-radius:18px;padding:24px 20px;text-align:center;cursor:pointer;transition:all .25s;}',
        '.cert-spec-card:hover{transform:translateY(-4px);border-color:rgba(212,175,55,0.5);box-shadow:0 12px 30px rgba(212,175,55,0.15);}',
        '.cert-spec-icon{font-size:2.4rem;margin-bottom:10px;}',
        '.cert-spec-card h4{color:#fff;margin:0 0 8px;font-size:1.05rem;}',
        '.cert-spec-card p{color:rgba(255,255,255,0.45);font-size:0.8rem;line-height:1.6;margin:0 0 10px;}',
        '.cert-spec-count{color:#00d4ff;font-size:0.72rem;font-weight:700;}',
        '.cert-tool-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:20px;}',
        '.cert-tool-card{background:rgba(0,12,30,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:18px;cursor:pointer;transition:all .2s;}',
        '.cert-tool-card:hover{border-color:rgba(0,212,255,0.4);transform:translateY(-2px);}',
        '.cert-tool-icon{font-size:1.6rem;margin-bottom:6px;}',
        '.cert-tool-card h4{color:#fff;margin:0 0 6px;font-size:0.92rem;display:flex;align-items:center;gap:6px;}',
        '.cert-tool-card p{color:rgba(255,255,255,0.42);font-size:0.76rem;line-height:1.55;margin:0;}',
        '.cert-mini-pass{color:#00f5a0;font-size:0.75rem;}',
        '.cert-mini-fail{color:#ff8080;font-size:0.75rem;}',
        '.cert-track-card{background:rgba(0,12,30,0.55);border:1px solid rgba(212,175,55,0.22);border-radius:18px;padding:24px;text-align:center;cursor:pointer;transition:all .25s;}',
        '.cert-track-card:hover{transform:translateY(-4px);border-color:rgba(212,175,55,0.55);box-shadow:0 12px 32px rgba(212,175,55,0.15);}',
        '.cert-track-icon{font-size:2.2rem;margin-bottom:8px;}',
        '.cert-track-card h4{color:#fff;margin:0 0 8px;font-size:1.05rem;}',
        '.cert-track-meta{color:rgba(255,255,255,0.45);font-size:0.75rem;margin-bottom:10px;}',
        '.cert-track-price{color:#d4af37;font-weight:800;font-size:1.2rem;margin-bottom:10px;}',
        '.cert-status{display:inline-block;font-size:0.72rem;padding:3px 12px;border-radius:12px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);}',
        '.cert-status.pass{background:rgba(0,245,160,0.12);color:#00f5a0;}',
        '.cert-status.fail{background:rgba(255,70,70,0.12);color:#ff8080;}',
        // Learn page
        '.cert-learn-head{display:flex;align-items:center;gap:16px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.08);}',
        '.cert-learn-icon{font-size:2.4rem;}',
        '.cert-learn-head h2{color:#fff;margin:0 0 4px;font-size:1.3rem;}',
        '.cert-learn-badge{display:inline-block;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3);color:#d4af37;padding:2px 12px;border-radius:12px;font-size:0.72rem;}',
        '.cert-video-launch-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:linear-gradient(135deg,rgba(123,47,255,0.18),rgba(0,212,255,0.18));border:1px solid rgba(0,212,255,0.35);color:#fff;padding:14px;border-radius:14px;cursor:pointer;font-family:inherit;font-size:0.92rem;font-weight:700;margin-bottom:22px;transition:all .2s;}',
        '.cert-video-launch-btn:hover{border-color:rgba(0,212,255,0.6);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,212,255,0.15);}',
        '.cert-learn-section{margin-bottom:20px;}',
        '.cert-learn-section h3{color:#00d4ff;font-size:0.95rem;display:flex;align-items:center;gap:8px;margin-bottom:8px;}',
        '.cert-learn-section p, .cert-learn-section ul{color:rgba(255,255,255,0.68);font-size:0.88rem;line-height:1.8;margin:0;padding-inline-start:20px;}',
        '.cert-ai-extra-box{background:rgba(123,47,255,0.05);border:1px solid rgba(123,47,255,0.2);border-radius:14px;padding:16px;margin:20px 0;text-align:center;}',
        '.cert-ai-btn{background:rgba(123,47,255,0.12);border:1px solid rgba(123,47,255,0.35);color:#c084fc;padding:9px 20px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.82rem;}',
        '.cert-ai-btn:hover{background:rgba(123,47,255,0.2);}',
        '.cert-ai-extra-out{margin-top:12px;color:rgba(255,255,255,0.72);font-size:0.85rem;line-height:1.8;text-align:right;}',
        '.cert-start-exam-btn{display:block;width:100%;margin-top:10px;background:linear-gradient(135deg,#d4af37,#f4d675);color:#0a0812;border:none;font-weight:800;padding:16px;border-radius:16px;cursor:pointer;font-family:inherit;font-size:1rem;box-shadow:0 10px 28px rgba(212,175,55,0.3);}',
        '.cert-start-exam-btn:hover{transform:translateY(-2px);}',
        // Exam
        '.cert-exam-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}',
        '.cert-exam-badge{color:#d4af37;font-size:0.85rem;font-weight:700;}',
        '.cert-exam-count{color:rgba(255,255,255,0.5);font-size:0.8rem;}',
        '.cert-progress-track{height:5px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:16px;}',
        '.cert-progress-track i{display:block;height:100%;background:linear-gradient(90deg,#d4af37,#00d4ff);}',
        '.cert-timer-row{display:flex;align-items:center;gap:12px;margin-bottom:16px;}',
        // Nano Glass notices — the "server is away" cards and the local-trial screens. The platform's ONE glass (bg .06 · blur 24 · border .12 ·
        // radius 18 · shadow); colour lives only in the status chip, never in the glass itself.
        '.cert-ng{max-width:560px;margin:0 auto;box-sizing:border-box;background:rgba(255,255,255,0.06);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,0.4);padding:32px;text-align:center;}',
        '.cert-ng-chip{display:inline-flex;align-items:center;gap:8px;padding:5px 14px;margin-bottom:12px;border-radius:999px;font-size:0.76rem;font-weight:700;color:#ffb400;background:rgba(255,180,0,0.1);border:1px solid rgba(255,180,0,0.35);}',
        '.cert-ng-chip.red{color:#ff7a7a;background:rgba(255,70,70,0.1);border-color:rgba(255,70,70,0.4);}',
        '.cert-ng-chip.green{color:#00f5a0;background:rgba(0,245,160,0.1);border-color:rgba(0,245,160,0.35);}',
        '.cert-ng-chip.cyan{color:#00d4ff;background:rgba(0,212,255,0.1);border-color:rgba(0,212,255,0.35);}',
        '.cert-ng-chip.gold{color:#d4af37;background:rgba(212,175,55,0.1);border-color:rgba(212,175,55,0.4);}',
        '.cert-ng-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor;animation:certPulse 1.4s infinite;}',
        '.cert-ng-icon{font-size:3rem;line-height:1.2;margin-bottom:4px;}',
        '.cert-ng-title{color:#fff;font-size:1.25rem;margin:6px 0 8px;}',
        '.cert-ng-text{color:rgba(255,255,255,0.72);font-size:0.9rem;line-height:1.8;margin:0;}',
        '.cert-ng-note{color:rgba(255,255,255,0.5);font-size:0.8rem;line-height:1.8;margin:12px 0 0;}',
        '.cert-ng-line{color:rgba(255,255,255,0.55);font-size:0.82rem;margin:12px 0 0;min-height:1.2em;}',
        '.cert-ng-pct{font-size:3rem;font-weight:900;color:#d4af37;line-height:1.2;}',
        '.cert-ng-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px;}',
        '.cert-ng-actions button[disabled]{opacity:0.65;cursor:progress;}',
        '.cert-ng-local{margin:16px 0 0;padding:12px 14px;border-radius:14px;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);color:rgba(255,255,255,0.65);font-size:0.78rem;line-height:1.8;text-align:right;}',
        '.cert-ng-local b{color:#00d4ff;}',
        '.cert-ng-list{list-style:none;padding:0;margin:16px 0 0;text-align:right;}',
        '.cert-ng-list li{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;margin-bottom:6px;border-radius:10px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.75);font-size:0.82rem;line-height:1.7;}',
        '.cert-ng-list li i{flex-shrink:0;margin-top:5px;font-size:0.78rem;}',
        '.cert-ng-list li.ok i{color:#00f5a0;}',
        '.cert-ng-list li.no i{color:#ff9d4d;}',
        '.cert-ng-list li.info i{color:#00d4ff;}',
        '.cert-ng-strip{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:9px 14px;border-radius:14px;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);color:rgba(255,255,255,0.7);font-size:0.78rem;line-height:1.7;}',
        '.cert-ng-strip.up{background:rgba(0,245,160,0.08);border-color:rgba(0,245,160,0.3);color:#00f5a0;}',
        '.cert-btn-gold.sm,.cert-btn-ghost.sm{padding:7px 16px;font-size:0.78rem;}',
        '.cert-wait-tech{margin-top:14px;color:rgba(255,255,255,0.4);font-size:0.74rem;text-align:right;}',
        '.cert-wait-tech summary{cursor:pointer;}',
        '.cert-wait-tech div{direction:ltr;text-align:left;font-family:monospace;margin-top:6px;line-height:1.7;word-break:break-all;}',
        // the connection badge in the exam header ("Offline Exam Mode") and its local-trial twin
        '.cert-net{margin-inline-start:8px;font-size:0.72rem;color:#00f5a0;}',
        '.cert-net.down{color:#ffb400;font-weight:700;}',
        '.cert-net.trial{color:#00d4ff;font-weight:700;}',
        '.cert-timer-ring{width:44px;height:44px;border-radius:50%;border:3px solid rgba(0,212,255,0.4);display:flex;align-items:center;justify-content:center;color:#00d4ff;font-weight:800;flex-shrink:0;}',
        '.cert-timer-ring.urgent{border-color:#ff4646;color:#ff4646;animation:certPulse .6s infinite;}',
        '@keyframes certPulse{0%,100%{opacity:1;}50%{opacity:.5;}}',
        '.cert-timer-bar-track{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;}',
        '.cert-timer-bar-track i{display:block;height:100%;background:linear-gradient(90deg,#00d4ff,#d4af37);transition:width .2s linear;}',
        '.cert-q-prompt{color:#fff;font-size:1.05rem;line-height:1.7;margin-bottom:20px;font-weight:600;}',
        '.cert-hint{color:rgba(255,255,255,0.4);font-size:0.78rem;margin-bottom:14px;}',
        '.cert-q-opts{display:flex;flex-direction:column;gap:10px;}',
        '.cert-opt{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:14px 16px;border-radius:12px;cursor:pointer;font-family:inherit;font-size:0.9rem;text-align:right;transition:all .15s;}',
        '.cert-opt:hover{border-color:rgba(0,212,255,0.4);background:rgba(0,212,255,0.06);}',
        '.cert-opt-badge{width:26px;height:26px;border-radius:50%;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.35);color:#d4af37;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;flex-shrink:0;}',
        '.cert-order-list{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;}',
        '.cert-order-chip{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:10px 16px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.85rem;display:flex;align-items:center;gap:8px;}',
        '.cert-order-chip.picked{background:rgba(0,212,255,0.12);border-color:#00d4ff;}',
        '.cert-order-num{width:20px;height:20px;border-radius:50%;background:#00d4ff;color:#000;display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:800;}',
        '.cert-match-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;}',
        '.cert-match-col{display:flex;flex-direction:column;gap:8px;}',
        '.cert-match-item{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:10px 14px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:0.82rem;text-align:right;}',
        '.cert-match-item.selected{border-color:#00d4ff;background:rgba(0,212,255,0.1);}',
        '.cert-match-item.matched{opacity:0.5;cursor:default;}',
        '.cert-submit-btn{display:block;width:100%;background:#d4af37;color:#0a0812;border:none;padding:13px;border-radius:14px;cursor:pointer;font-weight:800;font-family:inherit;}',
        '.cert-submit-btn:disabled{opacity:0.35;cursor:not-allowed;}',
        // Results
        '.cert-result{text-align:center;}',
        '.cert-result.pass{border-color:rgba(0,245,160,0.35);}',
        '.cert-result.fail{border-color:rgba(255,100,100,0.3);}',
        '.cert-result-icon{font-size:3.4rem;margin-bottom:6px;}',
        '.cert-result-pct{font-size:3rem;font-weight:900;color:#d4af37;}',
        '.cert-result-title{color:#fff;font-size:1.2rem;margin:8px 0;}',
        '.cert-result-sub{color:rgba(255,255,255,0.55);font-size:0.9rem;}',
        '.cert-result-detail{color:rgba(255,255,255,0.4);font-size:0.8rem;margin-top:4px;}',
        '.cert-official-box{background:rgba(212,175,55,0.06);border:2px double rgba(212,175,55,0.35);border-radius:14px;padding:18px;margin:22px 0;display:flex;align-items:center;gap:14px;text-align:right;}',
        '.cert-official-box i{font-size:1.8rem;color:#d4af37;flex-shrink:0;}',
        '.cert-official-box p{color:rgba(255,255,255,0.75);font-size:0.88rem;line-height:1.8;margin:0;}',
        '.cert-result-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px;}',
        '.cert-btn-gold{background:linear-gradient(135deg,#d4af37,#f4d675);color:#0a0812;border:none;padding:12px 24px;border-radius:20px;cursor:pointer;font-weight:800;font-family:inherit;font-size:0.88rem;}',
        '.cert-btn-outline{background:none;border:1px solid rgba(0,212,255,0.4);color:#00d4ff;padding:12px 24px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.88rem;}',
        '.cert-btn-ghost{background:none;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);padding:12px 24px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.88rem;}',
        '.cert-request-confirm{margin-top:16px;background:rgba(0,245,160,0.08);border:1px solid rgba(0,245,160,0.25);border-radius:12px;padding:14px;color:rgba(255,255,255,0.75);font-size:0.85rem;line-height:1.7;}',
        '.cert-request-confirm i{color:#00f5a0;margin-left:6px;}',
        '.cert-link-btn{background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.35);color:#00d4ff;border-radius:14px;padding:4px 14px;cursor:pointer;font-family:inherit;font-size:0.78rem;margin-right:8px;}',
        '.cert-spin{font-size:2.4rem;color:#d4af37;}',
        // Payment modal
        '.cert-pay-backdrop{position:fixed;inset:0;background:rgba(0,4,12,0.75);z-index:16000;display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);}',
        '.cert-pay-backdrop.show{display:flex;}',
        '.cert-pay-modal{position:relative;max-width:420px;width:100%;background:rgba(6,4,18,0.95);border:1px solid rgba(212,175,55,0.3);border-radius:20px;padding:28px;font-family:"Tajawal",sans-serif;}',
        '.cert-pay-close{position:absolute;top:14px;left:14px;background:rgba(255,255,255,0.08);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;}',
        '.cert-pay-head{text-align:center;margin-bottom:18px;}',
        '.cert-pay-icon{font-size:2rem;}',
        '.cert-pay-head h3{color:#fff;font-size:1.05rem;margin:6px 0;}',
        '.cert-pay-price{color:#d4af37;font-size:1.8rem;font-weight:900;}',
        '.cert-pay-price span{font-size:0.9rem;color:rgba(255,255,255,0.5);}',
        '.cert-pay-input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:12px 14px;border-radius:12px;font-family:inherit;font-size:0.9rem;box-sizing:border-box;}',
        '.cert-pay-divider{text-align:center;color:rgba(255,255,255,0.35);font-size:0.75rem;margin:16px 0;position:relative;}',
        '.cert-pay-manual-row{background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;margin-bottom:8px;color:rgba(255,255,255,0.7);font-size:0.82rem;}',
        '.cert-pay-refcode{background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.35);border-radius:12px;padding:12px 14px;margin-bottom:10px;}',
        '.cert-pay-refcode span{display:block;color:rgba(255,255,255,0.6);font-size:0.72rem;line-height:1.6;margin-bottom:8px;}',
        '.cert-pay-refcode-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}',
        '.cert-pay-refcode-row b{color:#d4af37;font-family:monospace;font-size:1.05rem;letter-spacing:0.04em;direction:ltr;}',
        '.cert-pay-refcode-row button{background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);color:#d4af37;border-radius:8px;width:34px;height:34px;cursor:pointer;flex-shrink:0;}',
        '@media (max-width:640px){',
        '  .cert-wrap{padding:0 10px;margin:12px auto;}',
        '  .cert-card{padding:18px;border-radius:16px;}',
        '  .cert-exam-top{flex-wrap:wrap;gap:6px;}',
        '  .cert-exam-badge{font-size:0.78rem;}',
        '  .cert-exam-count{font-size:0.72rem;}',
        '  .cert-q-prompt{font-size:0.95rem;}',
        '  .cert-opt{padding:12px 14px;font-size:0.85rem;}',
        '  .cert-match-cols{grid-template-columns:1fr;gap:8px;}',
        '  .cert-learn-head{flex-direction:column;text-align:center;gap:8px;}',
        '  .cert-spec-grid{grid-template-columns:1fr 1fr;gap:10px;}',
        '  .cert-pay-modal{padding:20px;max-width:100%;}',
        '  .cert-result-actions{flex-direction:column;}',
        '  .cert-result-actions button{width:100%;}',
        '  .cert-ng{padding:22px;}',
        '  .cert-ng-actions{flex-direction:column;}',
        '  .cert-ng-actions button{width:100%;}',
        '}',
        '@media (max-width:380px){',
        '  .cert-spec-grid{grid-template-columns:1fr;}',
        '  .cert-timer-ring{width:38px;height:38px;font-size:0.85rem;}',
        '}'
    ].join('\n');
    document.head.appendChild(s);
}
_addCertStyles();

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('certification', { open: function () { showSection('certifications'); } }, {
        name: 'Professional Certifications', icon: '🎓', sectionId: 'certifications', defaultEnabled: true
    });
}

window._AUS_CERT_EXAM = { startExam: startExam, scoreAttempt: scoreAttempt, loadAttempt: loadAttempt };
// Called from showSection() whenever the user navigates to a DIFFERENT
// section — without this, an in-progress exam's countdown keeps ticking in
// the hidden #certifications section, silently auto-submitting blank answers
// and potentially burning the whole exam before the student comes back.
window._certStopActiveTimer = function () { stopTimer(); _stopWaitUi(); _netStop(); _trialWatchStop(); };   // leaving the section: no countdown, no polling for a screen nobody sees (a finished sitting's re-send keeps going)

// ── AI Proctor: what happens when a monitored exam is auto-terminated ──────
// The credit is NOT refunded — a payment buys one sitting, and termination
// for violations is a legitimate outcome of that sitting, same as failing on
// content. An admin can override this from the proctor review dashboard if a
// specific case turns out to be a false positive (see grantReviewRetry).
if (window._AUS_PROCTOR) {
    window._AUS_PROCTOR.onTerminate = function (id, log) {
        stopTimer();
        _netStop();
        var ended = null;
        try { ended = JSON.parse(localStorage.getItem(attemptKey(id)) || 'null'); } catch (e) {}
        clearAttempt(id); // the sitting is over — cannot be resumed
        _abortOnServer(id, ended); // ...and the server must know too, or POST /exam/start would just resume it for free
        var host = _certHost();
        if (host) window._AUS_PROCTOR.renderTerminatedScreen(host, log);
    };
}

// ── Same-device live alert for new pending payments ─────────────────────────
// Fires the instant a new manual-payment claim is written to localStorage,
// via the native `storage` event — which only ever fires in OTHER TABS of the
// SAME browser profile on the SAME device. It cannot reach the admin's phone
// or a different computer; true cross-device push needs a real backend with
// push infrastructure, which isn't running in this environment. This is the
// honest ceiling of "instant" without standing up that server.
var _pendingNotifyArmed = false;
function _armPendingPaymentAlerts() {
    if (_pendingNotifyArmed || !(window.ausAuth && window.ausAuth.isAdmin)) return;
    _pendingNotifyArmed = true;
    if (window.Notification && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) {}
    }
    window.addEventListener('storage', function (e) {
        if (e.key !== C.PENDING_PAY_KEY) return;
        if (!e.newValue) return;
        var before, after;
        try { before = JSON.parse(e.oldValue || '[]'); after = JSON.parse(e.newValue || '[]'); } catch (e2) { return; }
        if (!Array.isArray(after) || after.length <= before.length) return; // not a new addition
        var latest = after[after.length - 1];
        if (!latest || latest.status !== 'pending') return;
        if (typeof sfxPlay === 'function') sfxPlay('confirm');
        if (window.Notification && Notification.permission === 'granted') {
            try {
                new Notification('💰 طلب دفع جديد بانتظار المراجعة', {
                    body: (latest.toolName || '') + ' — ' + (latest.certLabel || '') + ' — الرمز: ' + (latest.refCode || ''),
                    tag: 'aus-pending-payment'
                });
            } catch (e3) {}
        }
        if (typeof showToast === 'function') showToast('💰 طلب دفع جديد بانتظار المراجعة', 'xp-toast');
    });
}
window.addEventListener('aus-auth-changed', _armPendingPaymentAlerts);
_armPendingPaymentAlerts(); // in case auth is already loaded by the time this script runs

// ── Tell the STUDENT once their own claim is approved/rejected ─────────────
// The admin usually decides long after the student has closed the tab (often
// on a different device entirely), so this can't just be a live event at
// decision time. Instead: every time this student's own browser has the app
// open — on load, after login, or when visiting the certifications hub — it
// checks their own not-yet-seen decided claims and surfaces them once each.
function _checkMyPaymentDecisions() {
    if (!(window.ausAuth && window.ausAuth.user)) return;
    var decisions = C.getMyUnseenDecisions();
    decisions.forEach(function (p) {
        if (p.status === 'approved') {
            if (typeof sfxPlay === 'function') sfxPlay('level');
            if (typeof showToast === 'function') showToast('✅ تمت الموافقة على دفعتك لـ ' + (p.toolName || '') + ' — ' + (p.certLabel || '') + '! يمكنك بدء الامتحان الآن.', 'xp-toast');
            if (window.Notification && Notification.permission === 'granted') {
                try { new Notification('✅ تمت الموافقة على دفعتك', { body: (p.toolName || '') + ' — ' + (p.certLabel || '') + ' — يمكنك بدء الامتحان الآن.', tag: 'aus-payment-decision-' + p.id }); } catch (e) {}
            }
        } else if (p.status === 'rejected') {
            if (typeof showToast === 'function') showToast('❌ تم رفض طلب الدفع لـ ' + (p.toolName || '') + ' — تواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.', 'heart-toast');
        }
        C.markDecisionSeen(p.id);
    });
}
// Same-device live version: if the student's own tab happens to be open at
// the moment an admin (on the SAME device/browser) decides their claim.
var _decisionNotifyArmed = false;
function _armMyDecisionAlerts() {
    if (_decisionNotifyArmed || !(window.ausAuth && window.ausAuth.user)) return;
    _decisionNotifyArmed = true;
    if (window.Notification && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) {}
    }
    window.addEventListener('storage', function (e) {
        if (e.key !== C.PENDING_PAY_KEY) return;
        _checkMyPaymentDecisions();
    });
    _checkMyPaymentDecisions(); // catch anything decided while this student was away
}
window.addEventListener('aus-auth-changed', _armMyDecisionAlerts);
_armMyDecisionAlerts();

})();
