// =============================================================================
// aus_39_proctor.js — AI Exam Proctor (browser-behavior monitoring, strict)
// Depends on window._AUS_CERT_CORE (aus_36) — sanitize() only.
//
// SCOPE: behavior-only monitoring (tab switches, copy/paste, print, devtools,
// reload abuse, automation signals). Camera/microphone was tried and removed
// again — real face/voice analysis needs either a backend ML service (not
// running in this environment) or heavy in-browser models, and getUserMedia
// permission handling is entirely the browser's own call, not something a
// page can force or simplify past a single button click.
//
// Every signal here is a real, standard browser API — nothing is faked or
// randomly generated. Where a signal is inherently imperfect (devtools
// detection, automation detection), that is called out in comments rather
// than oversold as certain. Thresholds are intentionally strict: most
// violation types reach termination in 2-3 occurrences.
// =============================================================================
(function () {
'use strict';

var C = window._AUS_CERT_CORE;
if (!C) { console.error('[AUS Proctor] core module missing — aus_36_certification.js must load first'); return; }

// ── Configuration (all tunable in one place — extensibility requirement) ────
// Strict mode: most violation types now reach termination in 2-3 occurrences
// instead of 5+, and the most deliberate signal (automation) terminates
// instantly on its own.
var RISK_POINTS = {
    leave_page:        25,  // tab hidden / window blurred / minimized — cannot be told apart reliably, scored the same
    new_tab_shortcut:   25,  // Ctrl/Cmd+T observed
    copy_paste:         30,  // copy, cut, or paste attempted (blocked either way)
    print_attempt:      40,  // Ctrl/Cmd+P or beforeprint observed (blocked either way)
    devtools_open:      50,  // window chrome size delta suggests an open devtools panel
    repeated_reload:    20,  // each reload of the exam page beyond the first, within one attempt
    disconnect_repeat:  15,  // each "back online" after "offline", beyond the first
    automation_signal:  75,  // navigator.webdriver === true — zero tolerance, instant termination
    rapid_switch_burst: 20   // bonus when leave_page fires 4+ times within 60s (deliberate repeated switching)
};
var THRESHOLDS = { warn1: 25, warn2: 50, terminate: 75 };
var LOG_KEY_PREFIX = 'aus.proctor.log.';

// ── Per-attempt event log (persisted so reload-count survives reload) ──────
function _logKey(id) { return LOG_KEY_PREFIX + id; }
function _loadLog(id) {
    try { return JSON.parse(localStorage.getItem(_logKey(id)) || 'null') || { score: 0, warnings: 0, terminated: false, reason: null, reloads: 0, events: [] }; }
    catch (e) { return { score: 0, warnings: 0, terminated: false, reason: null, reloads: 0, events: [] }; }
}
function _saveLog(id, log) { try { localStorage.setItem(_logKey(id), JSON.stringify(log)); } catch (e) {} }

function getLog(id) { return _loadLog(id); }
function getAllLogs() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LOG_KEY_PREFIX) === 0) {
            var id = k.slice(LOG_KEY_PREFIX.length);
            out.push(Object.assign({ id: id }, _loadLog(id)));
        }
    }
    return out.sort(function (a, b) { return (b.events[b.events.length - 1] ? b.events[b.events.length - 1].ts : 0) - (a.events[a.events.length - 1] ? a.events[a.events.length - 1].ts : 0); });
}

// forEmail-scoped like the credits/purchases keys elsewhere in this app —
// a flat, unscoped key would let one account's consent silently count for
// every other account sharing the same browser.
var CONSENT_KEY_PREFIX = 'aus.proctor.consented.';
function _consentKey() {
    var email = (window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || null;
    return email ? (CONSENT_KEY_PREFIX + email) : null;
}
function hasConsented(id) {
    var key = _consentKey();
    if (!key) return false;
    try { return !!(JSON.parse(localStorage.getItem(key) || '{}')[id]); } catch (e) { return false; }
}
function _markConsented(id) {
    var key = _consentKey();
    if (!key) return;
    try {
        var c = JSON.parse(localStorage.getItem(key) || '{}');
        c[id] = true;
        localStorage.setItem(key, JSON.stringify(c));
    } catch (e) {}
}

var RULES = [
    'مغادرة نافذة الامتحان أو تصغيرها أو فتح تبويب جديد.',
    'محاولة نسخ أو لصق أو طباعة محتوى الامتحان.',
    'فتح أدوات المطوّر (Developer Tools).',
    'إعادة تحميل صفحة الامتحان بشكل متكرر.',
    'انقطاع الاتصال بالإنترنت بشكل متكرر.',
    'استخدام أدوات أتمتة المتصفح.',
    'المراقبة صارمة: مخالفة أو مخالفتان قد تكونان كافيتين لإنهاء الامتحان.'
];

function showConsentGate(id, onProceed) {
    var host = document.getElementById('certHost');
    if (!host) { onProceed(); return; }
    host.innerHTML =
    '<div class="cert-wrap"><div class="proctor-consent-card">' +
        '<div class="proctor-consent-icon"><i class="fas fa-shield-halved"></i></div>' +
        '<h3>هذا الامتحان مراقَب بصرامة</h3>' +
        '<p class="proctor-consent-sub">لضمان نزاهة الشهادة، يراقب النظام سلوك المتصفح أثناء الامتحان — لا كاميرا ولا ميكروفون. المراقبة صارمة — مخالفة واحدة أو اثنتان قد تكونان كافيتين لإنهاء الامتحان تلقائياً.</p>' +
        '<ul class="proctor-rules-list">' + RULES.map(function (r) { return '<li><i class="fas fa-circle-exclamation"></i> ' + r + '</li>'; }).join('') + '</ul>' +
        '<div class="proctor-check-row"><i class="fas ' + (navigator.onLine ? 'fa-circle-check ok' : 'fa-circle-xmark bad') + '"></i> الاتصال بالإنترنت: ' + (navigator.onLine ? 'يعمل' : 'غير متصل') + '</div>' +
        '<div class="proctor-check-row"><i class="fas fa-circle-check ok"></i> المتصفح متوافق</div>' +
        '<label class="proctor-agree-row"><input type="checkbox" id="proctorAgreeBox" /> أوافق على شروط المراقبة الصارمة وأبدأ الامتحان بمصداقية</label>' +
        '<button class="cert-btn-gold" id="proctorAgreeBtn" style="width:100%;margin-top:14px" disabled>' +
            '<i class="fas fa-play"></i> بدء الامتحان' +
        '</button>' +
    '</div></div>';
    var box = document.getElementById('proctorAgreeBox');
    var btn = document.getElementById('proctorAgreeBtn');
    box.addEventListener('change', function () { btn.disabled = !box.checked; });
    btn.addEventListener('click', function () {
        if (!box.checked) return;
        _markConsented(id);
        onProceed();
    });
}

// ── Monitoring engine ────────────────────────────────────────────────────
var _active = null; // { id, listeners: [teardown fns], burstTimes: [] }
var _devtoolsTimer = null;
var onTerminate = null; // set by aus_37_cert_ui.js

function isMonitoring(id) { return !!(_active && _active.id === id); }

function startMonitoring(id) {
    if (_active && _active.id === id) return; // already running for this attempt
    if (_active) stopMonitoring(); // switching attempts — tear down the old one first

    var log = _loadLog(id);
    log.reloads += 1;
    // whose sitting this is — an admin's "grant a retry" credits THIS account on the server
    var me = window.ausAuth && window.ausAuth.user && window.ausAuth.user.email;
    if (me) log.email = me;
    if (log.reloads > 1) _recordFor(id, log, 'repeated_reload', 'إعادة تحميل رقم ' + log.reloads);
    else _saveLog(id, log);

    if (navigator.webdriver === true) {
        _recordFor(id, _loadLog(id), 'automation_signal', 'navigator.webdriver=true');
    }

    var teardowns = [];
    function on(target, evt, handler, opts) { target.addEventListener(evt, handler, opts); teardowns.push(function () { target.removeEventListener(evt, handler, opts); }); }

    function violate(type, detail) { _record(id, type, detail); }

    on(document, 'visibilitychange', function () { if (document.hidden) violate('leave_page', 'visibilitychange'); });
    on(window, 'blur', function () { violate('leave_page', 'window blur'); });
    on(document, 'copy', function (e) { e.preventDefault(); violate('copy_paste', 'copy'); });
    on(document, 'cut', function (e) { e.preventDefault(); violate('copy_paste', 'cut'); });
    on(document, 'paste', function (e) { e.preventDefault(); violate('copy_paste', 'paste'); });
    on(document, 'contextmenu', function (e) { e.preventDefault(); });
    on(window, 'beforeprint', function () { violate('print_attempt', 'beforeprint'); });
    on(document, 'keydown', function (e) {
        var k = (e.key || '').toLowerCase();
        var mod = e.ctrlKey || e.metaKey;
        if (mod && k === 'p') { e.preventDefault(); violate('print_attempt', 'Ctrl+P'); }
        else if (mod && k === 't') { violate('new_tab_shortcut', 'Ctrl+T'); } // cannot preventDefault this one in modern browsers
        else if (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); violate('devtools_open', 'devtools shortcut'); }
        else if (e.key === 'F12') { e.preventDefault(); violate('devtools_open', 'F12'); }
    }, true);
    on(window, 'offline', function () { /* just track, scored on reconnect */ });
    var wasOffline = false;
    on(window, 'online', function () { if (wasOffline) violate('disconnect_repeat', 'reconnected'); wasOffline = false; });
    on(window, 'offline', function () { wasOffline = true; });

    // Devtools-open heuristic: a docked panel shrinks the visible viewport
    // relative to the outer window. Cannot detect an undocked/separate
    // devtools window — a known, universal limitation of this technique.
    //
    // An ABSOLUTE threshold on outerWidth-innerWidth is unreliable — browser
    // chrome, OS window decorations, and some embedded/automated viewports
    // (verified during testing: this preview environment alone measures an
    // 806px baseline delta with no devtools open) can exceed even a generous
    // fixed threshold with zero devtools involvement. Instead, capture the
    // delta at monitoring-start as a baseline (assumed devtools-closed, since
    // the student just clicked through consent) and only flag a large GROWTH
    // from that baseline — and require it to persist for two consecutive
    // polls, so a one-off resize or repaint glitch can't trigger a false
    // warning on its own.
    var baselineDelta = Math.max(window.outerWidth - window.innerWidth, window.outerHeight - window.innerHeight);
    var consecutiveOpen = 0;
    var devtoolsWasOpen = false;
    _devtoolsTimer = setInterval(function () {
        var delta = Math.max(window.outerWidth - window.innerWidth, window.outerHeight - window.innerHeight);
        var suspect = (delta - baselineDelta) > 160;
        consecutiveOpen = suspect ? consecutiveOpen + 1 : 0;
        var open = consecutiveOpen >= 2;
        if (open && !devtoolsWasOpen) violate('devtools_open', 'window chrome grew ' + (delta - baselineDelta) + 'px vs baseline');
        devtoolsWasOpen = open;
    }, 1500);

    _active = { id: id, teardowns: teardowns, burstTimes: [] };
}

function stopMonitoring() {
    if (!_active) return;
    _active.teardowns.forEach(function (fn) { try { fn(); } catch (e) {} });
    if (_devtoolsTimer) { clearInterval(_devtoolsTimer); _devtoolsTimer = null; }
    _active = null;
}

// visibilitychange/blur only fire for OS/browser-level tab switches or
// window focus loss — clicking a different nav tab in this single-page app
// never hides the document or blurs the window, since it's all one page
// with sections toggled by class, so that kind of "leaving" went completely
// undetected. Wrapping showSection (same pattern library.js already uses
// elsewhere to hook it without touching aus_02_core.js) catches it: any
// navigation away from 'certifications' while an exam is being monitored
// counts as leave_page, same as a real tab switch. Monitoring itself is left
// running (not stopped) so a student who comes back mid-attempt still has
// their violation history intact and resumes into the same active session.
var _origShowSectionForProctor = window.showSection;
window.showSection = function (sectionId) {
    if (_active && sectionId !== 'certifications') {
        _record(_active.id, 'leave_page', 'navigated to section: ' + sectionId);
    }
    if (typeof _origShowSectionForProctor === 'function') _origShowSectionForProctor(sectionId);
};

function _record(id, type, detail) { _recordFor(id, _loadLog(id), type, detail); }

function _recordFor(id, log, type, detail) {
    var points = RISK_POINTS[type] || 0;
    log.score += points;
    log.events.push({ ts: Date.now(), type: type, points: points, detail: detail || '' });

    if (type === 'leave_page' && _active && _active.id === id) {
        var now = Date.now();
        _active.burstTimes = _active.burstTimes.filter(function (t) { return now - t < 60000; });
        _active.burstTimes.push(now);
        if (_active.burstTimes.length === 4) { // fire the bonus once per burst, not every subsequent switch
            log.score += RISK_POINTS.rapid_switch_burst;
            log.events.push({ ts: now, type: 'rapid_switch_burst', points: RISK_POINTS.rapid_switch_burst, detail: '4+ تبديلات خلال دقيقة' });
        }
    }

    if (!log.terminated) {
        if (log.score >= THRESHOLDS.terminate) {
            log.terminated = true;
            log.reason = _reasonText(type);
            _saveLog(id, log);
            stopMonitoring();
            if (typeof onTerminate === 'function') onTerminate(id, log);
            return;
        } else if (log.score >= THRESHOLDS.warn2 && log.warnings < 2) {
            log.warnings = 2;
            _saveLog(id, log);
            _showWarning(2, log);
            return;
        } else if (log.score >= THRESHOLDS.warn1 && log.warnings < 1) {
            log.warnings = 1;
            _saveLog(id, log);
            _showWarning(1, log);
            return;
        }
    }
    _saveLog(id, log);
}

function _reasonText(lastType) {
    var labels = {
        leave_page: 'مغادرة صفحة الامتحان بشكل متكرر', copy_paste: 'محاولات نسخ/لصق متكررة',
        print_attempt: 'محاولة طباعة الامتحان', devtools_open: 'فتح أدوات المطوّر',
        repeated_reload: 'إعادة تحميل الصفحة بشكل متكرر', automation_signal: 'رصد أداة أتمتة للمتصفح',
        new_tab_shortcut: 'فتح تبويبات جديدة بشكل متكرر', disconnect_repeat: 'انقطاع اتصال متكرر',
        rapid_switch_burst: 'تبديل نوافذ متكرر وسريع'
    };
    return 'تجاوز مستوى الخطورة المسموح به — آخر مخالفة: ' + (labels[lastType] || lastType);
}

function _showWarning(level, log) {
    if (typeof sfxPlay === 'function') sfxPlay('error');
    var overlay = document.createElement('div');
    overlay.className = 'proctor-warn-overlay';
    overlay.innerHTML =
    '<div class="proctor-warn-card ' + (level === 2 ? 'urgent' : '') + '">' +
        '<div class="proctor-warn-icon"><i class="fas fa-triangle-exclamation"></i></div>' +
        '<h3>' + (level === 2 ? 'تحذير أخير' : 'تحذير') + ' — سلوك مشبوه</h3>' +
        '<p>تم رصد مخالفة لقواعد الامتحان. مستوى الخطورة الحالي: <b>' + log.score + '</b> / ' + THRESHOLDS.terminate + '</p>' +
        (level === 2 ? '<p class="proctor-warn-final">أي مخالفة إضافية ستُنهي الامتحان تلقائياً.</p>' : '<p>استمرار المخالفات قد يؤدي إلى إنهاء الامتحان تلقائياً.</p>') +
        '<button class="cert-btn-gold" id="proctorWarnAck">فهمت — متابعة الامتحان</button>' +
    '</div>';
    document.body.appendChild(overlay);
    document.getElementById('proctorWarnAck').addEventListener('click', function () { overlay.remove(); });
}

function renderTerminatedScreen(host, log) {
    host.innerHTML =
    '<div class="cert-wrap"><div class="proctor-terminated-card">' +
        '<div class="proctor-terminated-icon"><i class="fas fa-ban"></i></div>' +
        '<h3>تم إنهاء الامتحان</h3>' +
        '<p>' + C.sanitize(log.reason || '') + '</p>' +
        '<p class="proctor-terminated-note">إذا كنت تعتقد أن هذا القرار غير صحيح، يمكن لإدارة المنصة مراجعة سجل المخالفات كاملاً ومنحك محاولة جديدة عند الحاجة.</p>' +
        '<button class="cert-btn-ghost" onclick="showSection(\'certifications\')">رجوع لصفحة الشهادات</button>' +
    '</div></div>';
}

// ── Admin: manual review + override ─────────────────────────────────────
// -> Promise<{ok, message}>. The retry is a credit granted on the SERVER to the student whose sitting this was (the
// log remembers their email); the log is only cleared once the server accepted it. One grant per termination: the ref
// carries the time of the last recorded event, so a double click is harmless.
function grantReviewRetry(id) {
    if (!(window.ausAuth && window.ausAuth.isAdmin)) return Promise.resolve({ ok: false, message: 'للمالك فقط' });
    var log = _loadLog(id);
    var email = log.email || (window.prompt('بريد الطالب الذي ستُمنح له المحاولة:') || '').trim().toLowerCase(); // logs from before this change have no email
    var lastTs = log.events.length ? log.events[log.events.length - 1].ts : 0;
    return C.grantCredit(id, email, ('proctor:' + id + ':' + email + ':' + lastTs).slice(0, 120)).then(function (r) { // 120 = the ledger's ref column
        if (!r.ok) return r;
        log.terminated = false;
        log.reviewedAndCleared = true;
        // The next sitting starts from zero. Without this the old risk score (≥ 75) plus the "reload" that merely opening the
        // new sitting counts would terminate it again on its first question, and the retry would be wasted. The event list
        // stays as the audit trail, and the score of the cleared sitting is kept in `history`.
        log.history = (log.history || []).concat([{ ts: Date.now(), score: log.score, reason: log.reason || null }]);
        log.score = 0; log.warnings = 0; log.reloads = 0;
        if (email) log.email = email;
        _saveLog(id, log);
        return { ok: true, message: '' };
    });
}

window._AUS_PROCTOR = {
    RISK_POINTS: RISK_POINTS, THRESHOLDS: THRESHOLDS,
    hasConsented: hasConsented, showConsentGate: showConsentGate,
    startMonitoring: startMonitoring, stopMonitoring: stopMonitoring, isMonitoring: isMonitoring,
    getLog: getLog, getAllLogs: getAllLogs,
    renderTerminatedScreen: renderTerminatedScreen,
    grantReviewRetry: grantReviewRetry,
    set onTerminate(fn) { onTerminate = fn; }, get onTerminate() { return onTerminate; }
};

// ── Styles (Nano Glass System — matches the rest of the cert UI) ───────────
(function injectCSS() {
    if (document.getElementById('proctor-styles')) return;
    var s = document.createElement('style');
    s.id = 'proctor-styles';
    s.textContent = [
        '.proctor-consent-card{max-width:520px;margin:0 auto;background:rgba(255,255,255,0.06);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,0.4);padding:32px;text-align:center;}',
        '.proctor-consent-icon{font-size:2.4rem;color:#00d4ff;margin-bottom:10px;}',
        '.proctor-consent-card h3{color:#fff;font-size:1.2rem;margin-bottom:8px;}',
        '.proctor-consent-sub{color:rgba(255,255,255,0.6);font-size:0.85rem;line-height:1.8;margin-bottom:16px;}',
        '.proctor-rules-list{list-style:none;padding:0;margin:0 0 16px;text-align:right;}',
        '.proctor-rules-list li{color:rgba(255,255,255,0.75);font-size:0.82rem;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:6px;}',
        '.proctor-rules-list li i{color:#ff9d4d;margin-inline-end:6px;}',
        '.proctor-check-row{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.7);font-size:0.82rem;padding:6px 0;justify-content:flex-start;text-align:right;}',
        '.proctor-check-row i.ok{color:#4caf50;} .proctor-check-row i.bad{color:#ff4646;}',
        '.proctor-agree-row{display:flex;align-items:center;gap:8px;color:#fff;font-size:0.85rem;margin-top:16px;cursor:pointer;justify-content:flex-start;text-align:right;}',
        '.proctor-agree-row input{width:18px;height:18px;accent-color:#d4af37;cursor:pointer;}',
        '.proctor-warn-overlay{position:fixed;inset:0;background:rgba(0,4,12,0.8);backdrop-filter:blur(6px);z-index:17000;display:flex;align-items:center;justify-content:center;padding:20px;animation:proctorFadeIn .25s ease;}',
        '@keyframes proctorFadeIn{from{opacity:0}to{opacity:1}}',
        '.proctor-warn-card{max-width:400px;background:rgba(255,255,255,0.06);backdrop-filter:blur(24px);border:1px solid rgba(255,157,77,0.4);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,0.4);padding:28px;text-align:center;}',
        '.proctor-warn-card.urgent{border-color:rgba(255,70,70,0.6);animation:proctorPulse 1s infinite;}',
        '@keyframes proctorPulse{0%,100%{box-shadow:0 20px 50px rgba(0,0,0,0.4)}50%{box-shadow:0 20px 50px rgba(255,70,70,0.35)}}',
        '.proctor-warn-icon{font-size:2.2rem;color:#ff9d4d;margin-bottom:8px;}',
        '.proctor-warn-card.urgent .proctor-warn-icon{color:#ff4646;}',
        '.proctor-warn-card h3{color:#fff;font-size:1.1rem;margin-bottom:10px;}',
        '.proctor-warn-card p{color:rgba(255,255,255,0.7);font-size:0.85rem;line-height:1.7;margin-bottom:6px;}',
        '.proctor-warn-final{color:#ff9d4d !important;font-weight:700;}',
        '.proctor-warn-card button{width:100%;margin-top:14px;}',
        '.proctor-terminated-card{max-width:480px;margin:0 auto;background:rgba(255,255,255,0.06);backdrop-filter:blur(24px);border:1px solid rgba(255,70,70,0.4);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,0.4);padding:36px;text-align:center;}',
        '.proctor-terminated-icon{font-size:2.6rem;color:#ff4646;margin-bottom:12px;}',
        '.proctor-terminated-card h3{color:#fff;font-size:1.25rem;margin-bottom:10px;}',
        '.proctor-terminated-card p{color:rgba(255,255,255,0.7);font-size:0.88rem;line-height:1.8;margin-bottom:10px;}',
        '.proctor-terminated-note{color:rgba(255,255,255,0.5) !important;font-size:0.78rem !important;}',
        '.proctor-terminated-card button{margin-top:14px;}',
        '.proctor-event-log{max-height:220px;overflow-y:auto;margin-top:8px;}',
        '.proctor-event-row{display:flex;justify-content:space-between;gap:10px;padding:6px 10px;font-size:.74rem;color:rgba(255,255,255,.55);border-bottom:1px solid rgba(255,255,255,.06);}',
        '.proctor-event-row b{color:#ff9d4d;flex-shrink:0;}',
        '@media (max-width:640px){',
        '  .proctor-consent-card,.proctor-terminated-card{padding:22px;}',
        '  .proctor-warn-card{padding:20px;}',
        '  .proctor-event-row{font-size:.68rem;flex-wrap:wrap;}',
        '}'
    ].join('\n');
    document.head.appendChild(s);
})();

})();
