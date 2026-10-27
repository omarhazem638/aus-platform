/* ================================================================
   AUS — الشهادة الرقمية بتصميمها الكامل ورمز QR  (aus_51_cert_view.js)
   ----------------------------------------------------------------
   يعرض شهادة النجاح كتصميم جاهز للطباعة (A4 أفقي) عليه: اسم الطالب، الأداة والمسار، النتيجة، التاريخ،
   رقم الشهادة الفريد (AUS-BUS-2026-XXXXXXX) و«رمز QR» يُولَّد لحظياً في المتصفح (aus_50_qr.js) من رابط
   التحقق  verify.html?id=<الرقم> — فيمسحه أي شخص ويرى سجل الشهادة الحقيقي من الخادم (صالحة / مُلغاة …).

   • طباعة / حفظ PDF : window.print() — يطبع الشهادة وحدها (ورق أبيض، حدود ذهبية) ويدعم العربية كاملة.
   • تنزيل PNG       : تُرسم الشهادة على canvas داخل المتصفح (تعمل دون اتصال).
   • PDF من الخادم   : زر إضافي إن كان الملف موجوداً (reportlab لا يشكّل الحروف العربية — الأفضل «حفظ PDF» من هنا).

   الواجهة (window.AUS_CERT_VIEW):
     open(cert)                    يفتح الشهادة (cert = كائن الشهادة من الخادم: certificate_number, student_name, …)
     openByNumber(number)          يفتح شهادة محفوظة محلياً (بعد /mine أو سجل الشهادات)
     requestDigital(req, boxEl)    يطلب إصدار الشهادة من الخادم بعد اجتياز الامتحان ثم يعرضها
     remember(certs) / recall(n)   ذاكرة محلية (localStorage) لتعرض الشهادة وQR حتى دون اتصال
     verifyUrl(cert)               عنوان التحقق الذي يحمله الـQR
     downloadPNG(cert) · print() · close()
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_CERT_VIEW) return;

  var LS = 'aus.cert.issued.v1';
  var W = 1123, H = 794;                    // A4 أفقي بالبكسل (96dpi): يُطبع بحجمه الطبيعي دون تحجيم
  var PUBLIC_FIELDS = ['certificate_number', 'student_name', 'tool_name', 'specialization', 'specialization_code', 'cert_label', 'score', 'level',
    'training_hours', 'issue_date', 'completion_date', 'status', 'issuer', 'verify_url', 'pdf_available', 'qr_available'];

  var TRACK_EN = { 'شهادة المعرفة': 'Knowledge Certificate', 'شهادة الممارسة': 'Practical Certificate' };
  var SPEC_EN = { BUS: 'Business Administration', ACC: 'Accounting', HR: 'Human Resources', MKT: 'Digital Marketing', FIN: 'Fintech & Finance', MIS: 'Management Information Systems', LOG: 'Logistics & Supply Chain' };
  var STATUS = {
    verified: ['موثّقة', 'Verified', 'ok'], revoked: ['مُلغاة', 'Revoked', 'bad'], suspended: ['موقوفة', 'Suspended', 'warn'],
    expired: ['منتهية', 'Expired', 'mute'], inactive: ['غير فعّالة', 'Inactive', 'mute']
  };

  // ── helpers ────────────────────────────────────────────────────────
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function ar() { return String(document.documentElement.getAttribute('lang') || 'ar').toLowerCase().indexOf('ar') === 0; }
  function L(a, e) { return ar() ? a : e; }
  function toast(m, k) { try { if (typeof showToast === 'function') showToast(m, k || 'xp-toast'); } catch (e) {} }
  function apiBase() { return window.AUS_API_BASE || ((typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'); }
  function core() { return window._AUS_CERT_CORE || null; }
  function day(iso) { return iso ? String(iso).slice(0, 10) : '—'; }

  // ── ذاكرة محلية: الشهادة (بياناتها العامة فقط) تبقى قابلة للعرض والطباعة دون اتصال ──
  var CACHE_MAX = 150;                      // the owner's registry can hold thousands — keep only the most recently shown ones
  function loadAll() { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } }
  function remember(list) {
    var all = loadAll();
    (Array.isArray(list) ? list : [list]).forEach(function (c) {
      if (!c || !c.certificate_number) return;
      var o = {}; PUBLIC_FIELDS.forEach(function (k) { if (c[k] !== undefined) o[k] = c[k]; });   // never the e-mail / ids the owner's registry also returns
      var key = String(c.certificate_number).toUpperCase();
      delete all[key]; all[key] = o;                                                                 // re-insert = "most recent" (keys keep insertion order)
    });
    var keys = Object.keys(all);
    for (var i = 0; i < keys.length - CACHE_MAX; i++) delete all[keys[i]];
    try { localStorage.setItem(LS, JSON.stringify(all)); } catch (e) {}
  }
  function recall(n) { return loadAll()[String(n || '').toUpperCase()] || null; }

  // ── عنوان التحقق الذي يحمله الـQR ───────────────────────────────────
  // أولوية: (1) عنوان النشر العام المضبوط في الصفحة (<meta name="aus-public-base"> أو window.AUS_PUBLIC_BASE)
  //         (2) الرابط الذي أرسله الخادم (APP_BASE_URL) إن لم يكن عنواناً محلياً — هو العنوان الرسمي للموقع
  //         (3) الموقع الذي تعمل عليه الصفحة الآن (مفيد للتجربة على الشبكة المحلية)
  //         (4) رابط الخادم أياً كان (للصفحة المفتوحة من file://).
  function isLocalUrl(u) {
    try { var h = new URL(u).hostname; return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '0.0.0.0' || /\.localhost$/.test(h) || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h); } catch (e) { return true; }
  }
  function publicBase() {
    var m = document.querySelector('meta[name="aus-public-base"]'), b = window.AUS_PUBLIC_BASE || (m && m.getAttribute('content')) || '';
    b = String(b || '').trim().replace(/\/+$/, '');
    return /^https?:\/\/[^\s\/?#]+/i.test(b) ? b : '';
  }
  function verifyUrl(cert) {
    var n = encodeURIComponent(String(cert.certificate_number || '').toUpperCase()), pb = publicBase();
    if (pb) return pb + '/verify.html?id=' + n;
    if (cert.verify_url && !isLocalUrl(cert.verify_url)) return cert.verify_url;
    if (location.protocol === 'http:' || location.protocol === 'https:') { try { return new URL('verify.html?id=' + n, document.baseURI).href; } catch (e) {} }
    return cert.verify_url || ('verify.html?id=' + n);
  }

  // ── الأنماط (تُحقن مرة واحدة) ────────────────────────────────────────
  function styles() {
    if (document.getElementById('acv-styles')) return;
    var s = document.createElement('style'); s.id = 'acv-styles';
    s.textContent = [
      '.acv-overlay{position:fixed;inset:0;z-index:100050;background:rgba(0,6,20,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;flex-direction:column;align-items:center;overflow:auto;padding:12px 12px 28px;font-family:"Tajawal",sans-serif;color:#fff}',
      'html.acv-open,html.acv-open body{overflow:hidden}',
      '.acv-toolbar{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:4px 0 12px;max-width:1123px}',
      '.acv-btn{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;border-radius:12px;padding:8px 14px;cursor:pointer;font:700 .82rem "Tajawal",sans-serif;display:inline-flex;align-items:center;gap:6px;transition:filter .2s,transform .2s;text-decoration:none}',
      '.acv-btn:hover{filter:brightness(1.2);transform:translateY(-1px)}.acv-btn.gold{background:linear-gradient(135deg,#ffd700,#ff9500);color:#1a1000;border-color:transparent}',
      '.acv-btn.cyan{border-color:rgba(0,212,255,.5);color:#00d4ff}.acv-btn.red{border-color:rgba(255,110,160,.5);color:#ff8fb3}',
      '.acv-stage{width:100%;max-width:1123px;position:relative;flex:none}',
      '.acv-rot{display:none;max-width:420px;margin:0 0 10px;padding:8px 12px;border:1px solid rgba(0,212,255,.35);border-radius:12px;background:rgba(0,212,255,.07);color:#9fe9ff;font-size:.78rem;line-height:1.7;text-align:center}',
      '@media(max-width:760px) and (orientation:portrait){.acv-rot{display:block}}',
      '.acv-note{max-width:900px;margin-top:14px;font-size:.78rem;line-height:1.8;color:rgba(255,255,255,.55);text-align:center}.acv-note.warn{color:#ffd27a}',
      /* ── الشهادة ── */
      '.acv-sheet{--bg1:#0a1b44;--bg2:#000814;--fg:#fff;--muted:rgba(255,255,255,.66);--gold:#ffd700;--gold2:#d4af37;--line:rgba(212,175,55,.75);--soft:rgba(255,255,255,.06);--ok:#69f0ae;--bad:#ff6b8a;--warn:#ffc94d;--mute:#aab0bf;',
      '--pad:42px 70px 40px;--nm:48px;--tl:32px;position:absolute;top:0;left:50%;margin-left:-561.5px;width:1123px;height:794px;transform-origin:top center;box-sizing:border-box;overflow:hidden;color:var(--fg);',
      'background:radial-gradient(ellipse at 50% 0%,var(--bg1) 0%,var(--bg2) 70%);box-shadow:0 20px 50px rgba(0,0,0,.4);border-radius:6px;',
      'display:grid;grid-template-rows:auto minmax(0,1fr) auto;row-gap:6px;padding:var(--pad);font-family:"Tajawal",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
      '.acv-frame{position:absolute;inset:20px;border:3px solid var(--gold2);pointer-events:none}',
      '.acv-frame::before{content:"";position:absolute;inset:9px;border:1px solid var(--line)}',
      '.acv-corner{position:absolute;width:34px;height:34px;border:3px solid var(--gold);pointer-events:none}',
      '.acv-corner.tl{top:11px;left:11px;border-right:0;border-bottom:0}.acv-corner.tr{top:11px;right:11px;border-left:0;border-bottom:0}',
      '.acv-corner.bl{bottom:11px;left:11px;border-right:0;border-top:0}.acv-corner.br{bottom:11px;right:11px;border-left:0;border-top:0}',
      '.acv-head{text-align:center}.acv-seal{width:60px;height:60px;margin:0 auto 2px;display:block}',
      '.acv-brand{font:900 21px/1.3 "Orbitron","Tajawal",sans-serif;letter-spacing:.18em;color:var(--gold)}',
      '.acv-kicker{margin-top:3px;font-size:17px;line-height:1.4;font-weight:800;color:var(--fg)}.acv-kicker small{display:block;font:600 11.5px/1.4 "Orbitron","Tajawal",sans-serif;letter-spacing:.1em;color:var(--muted);margin-top:1px;direction:ltr}',
      '.acv-main{display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden}',
      '.acv-in{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;max-width:100%}',
      '.acv-lead{font-size:16px;line-height:1.35;color:var(--muted)}.acv-lead small{display:block;font-size:11.5px;direction:ltr;opacity:.85}',
      '.acv-name{font:900 var(--nm)/1.2 "Tajawal","Orbitron",sans-serif;color:var(--gold);margin:2px 0;max-width:930px;overflow-wrap:anywhere;text-shadow:0 0 28px rgba(255,215,0,.25)}',
      '.acv-tool{font:900 var(--tl)/1.25 "Tajawal","Orbitron",sans-serif;color:var(--fg);max-width:930px;overflow-wrap:anywhere;direction:ltr;unicode-bidi:plaintext}',
      '.acv-track{font-size:16px;line-height:1.4;font-weight:700;color:var(--fg);margin-top:1px}.acv-track small{display:block;font-size:12px;color:var(--muted);direction:ltr;font-weight:600}',
      '.acv-stats{display:flex;gap:16px;margin-top:10px;justify-content:center}',
      '.acv-stat{min-width:150px;padding:6px 14px;border:1px solid var(--line);border-radius:14px;background:var(--soft)}',
      '.acv-stat .k{font-size:11.5px;line-height:1.4;color:var(--muted)}.acv-stat .k small{opacity:.8;direction:ltr;unicode-bidi:isolate}',
      '.acv-stat .v{font:900 22px/1.3 "Orbitron","Tajawal",sans-serif;color:var(--gold);direction:ltr}.acv-stat .v.s{font:800 16px/1.4 "Tajawal",sans-serif;color:var(--fg);padding-top:3px}.acv-stat .v.st{direction:rtl}',
      '.acv-stat .v.ok{color:var(--ok)}.acv-stat .v.bad{color:var(--bad)}.acv-stat .v.warn{color:var(--warn)}.acv-stat .v.mute{color:var(--mute)}',
      '.acv-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}',
      '.acv-meta{flex:1;min-width:0;text-align:start;font-size:12.5px;color:var(--muted);line-height:1.7}',
      '.acv-meta .num{display:block;font:800 20px/1.4 "Orbitron",monospace;letter-spacing:.06em;color:var(--gold);direction:ltr;text-align:right;margin:0 0 3px}',
      '.acv-meta b{color:var(--fg);font-weight:800}.acv-meta .fine{display:block;font-size:11px;line-height:1.6;opacity:.8;margin-top:4px;max-width:540px}',
      '.acv-qr{flex:none;text-align:center;width:176px}',
      '.acv-qrbox{position:relative;z-index:2;background:#fff;border-radius:14px;padding:7px;box-shadow:0 8px 22px rgba(0,0,0,.35);border:2px solid var(--gold2)}.acv-qrbox svg{display:block;width:100%;height:auto}',
      '.acv-qr .cap{margin-top:6px;font-size:12.5px;font-weight:800;color:var(--fg)}.acv-qr .cap small{display:block;font-size:10.5px;font-weight:600;color:var(--muted);direction:ltr}',
      '.acv-qr code{display:block;margin-top:3px;font:600 9px monospace;color:var(--muted);direction:ltr;word-break:break-all;line-height:1.35}',
      '.acv-wm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-18deg);font:900 120px "Orbitron","Tajawal",sans-serif;letter-spacing:.06em;opacity:.16;pointer-events:none;white-space:nowrap}',
      '.acv-wm.bad{color:#ff6b8a}.acv-wm.warn{color:#ffc94d}.acv-wm.mute{color:#aab0bf}',
      /* ── الطباعة: الشهادة وحدها، ورق أبيض، حجم A4 أفقي بلا هوامش ── */
      '@media print{',
      '@page{size:A4 landscape;margin:0}',
      'html,body{background:#fff!important;overflow:visible!important;height:auto!important}',
      'body>*:not(.acv-overlay){display:none!important}',
      '.acv-overlay{position:static!important;inset:auto!important;background:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:0!important;display:block!important;overflow:visible!important}',
      '.acv-toolbar,.acv-note,.acv-rot{display:none!important}',
      '.acv-stage{width:297mm!important;height:210mm!important;max-width:none!important;margin:0!important;overflow:hidden}',
      '.acv-sheet{--bg1:#fff;--bg2:#fff;--fg:#14161c;--muted:#4b5160;--gold:#8a6d00;--gold2:#b8860b;--line:#b8860b;--soft:rgba(0,0,0,.035);--ok:#1b7a3d;--bad:#b3203f;--warn:#9a6a00;--mute:#666;',
      'transform:none!important;left:0!important;margin:0!important;width:297mm!important;height:210mm!important;box-shadow:none!important;border-radius:0!important;background:#fff!important}',
      '.acv-name{text-shadow:none!important}.acv-qrbox{box-shadow:none!important}',
      '}',
      '@media(max-width:700px){.acv-btn{padding:7px 10px;font-size:.74rem}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ── تصميم الشهادة ───────────────────────────────────────────────────
  function sealSVG() {
    return '<svg class="acv-seal" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="acvG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#c8961e"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="46" fill="none" stroke="url(#acvG)" stroke-width="3"/><circle cx="50" cy="50" r="38" fill="none" stroke="url(#acvG)" stroke-width="1" stroke-dasharray="2 3"/>' +
      '<path d="M50 24 L56.5 40.5 L74 41.6 L60.6 53 L64.9 70 L50 60.5 L35.1 70 L39.4 53 L26 41.6 L43.5 40.5 Z" fill="url(#acvG)"/>' +
      '<text x="50" y="86" text-anchor="middle" font-family="Orbitron,Tajawal,sans-serif" font-weight="800" font-size="11" fill="#d4af37" letter-spacing="2">AUS</text></svg>';
  }
  function sheetHTML(cert) {
    var st = STATUS[cert.status] || [cert.status || '—', cert.status || '—', 'mute'], url = verifyUrl(cert);
    var qr = ''; try { qr = window.AUS_QR ? AUS_QR.svg(url, { ecc: 'Q', border: 4, label: 'QR — ' + cert.certificate_number }) : ''; } catch (e) { qr = ''; }
    var track = cert.cert_label || '', trackEn = TRACK_EN[track] || '';
    var specEn = SPEC_EN[cert.specialization_code] || '';
    var enLine = [trackEn, specEn].filter(Boolean).join(' · ');
    // printed fallback under the QR: host + path on one line, "?id=<number>" on the next (never cut in the middle of the number)
    var shortUrl = url.replace(/^https?:\/\//, ''), shortQ = '';
    try { var uo = new URL(url); shortUrl = uo.host + uo.pathname; shortQ = uo.search; } catch (e) {}
    return '' +
      '<div class="acv-frame"></div><i class="acv-corner tl"></i><i class="acv-corner tr"></i><i class="acv-corner bl"></i><i class="acv-corner br"></i>' +
      (cert.status && cert.status !== 'verified' ? '<div class="acv-wm ' + st[2] + '">' + esc(st[1].toUpperCase()) + '</div>' : '') +
      '<header class="acv-head">' + sealSVG() + '<div class="acv-brand">AUS · AI UNIVERSITY SIMULATOR</div>' +
        '<div class="acv-kicker">شهادة اجتياز موثّقة<small>VERIFIED CERTIFICATE OF ACHIEVEMENT</small></div></header>' +
      '<main class="acv-main"><div class="acv-in">' +
        '<div class="acv-lead">تشهد منصة AUS بأن<small>This is to certify that</small></div>' +
        '<div class="acv-name">' + esc(cert.student_name) + '</div>' +
        '<div class="acv-lead">قد اجتاز بنجاح اختبار<small>has successfully passed the exam</small></div>' +
        '<div class="acv-tool">' + esc(cert.tool_name) + '</div>' +
        '<div class="acv-track">' + esc(track) + (cert.specialization ? ' — ' + esc(cert.specialization) : '') + (enLine ? '<small>' + esc(enLine) + '</small>' : '') + '</div>' +
        '<div class="acv-stats">' +
          '<div class="acv-stat"><div class="k">النتيجة <small>Score</small></div><div class="v">' + (cert.score != null ? esc(cert.score) + '%' : '—') + '</div></div>' +
          '<div class="acv-stat"><div class="k">تاريخ الإصدار <small>Issued</small></div><div class="v s">' + esc(day(cert.issue_date)) + '</div></div>' +
          '<div class="acv-stat"><div class="k">الحالة <small>Status</small></div><div class="v s st ' + st[2] + '">' + esc(st[0]) + ' · ' + esc(st[1]) + '</div></div>' +
        '</div>' +
      '</div></main>' +
      '<footer class="acv-foot">' +
        '<div class="acv-meta">رقم الشهادة · <span dir="ltr">Certificate No.</span><span class="num">' + esc(cert.certificate_number) + '</span>' +
          'الجهة المصدرة · <span dir="ltr">Issued by <b>' + esc(cert.issuer || 'AUS — AI University Simulator') + '</b></span>' +
          '<span class="fine">يمكن لأي جهة التحقق من صحة هذه الشهادة فوراً بمسح الرمز أو بزيارة الرابط أسفله — الشهادة الصحيحة تظهر بياناتها مطابقة تماماً لما هو مطبوع هنا.<br>' +
          '<span dir="ltr">Anyone can verify this certificate instantly: scan the code or open the link — a genuine certificate shows exactly the details printed here.</span></span></div>' +
        '<div class="acv-qr"><div class="acv-qrbox" id="acvQr">' + qr + '</div>' +
          '<div class="cap">امسح للتحقق<small>Scan to verify</small></div><code>' + esc(shortUrl) + (shortQ ? '<br>' + esc(shortQ) : '') + '</code></div>' +
      '</footer>';
  }

  // ── العرض ───────────────────────────────────────────────────────────
  // The name and the tool title are the only free-length texts on the sheet: shrink them (in small steps, never below a readable
  // size) until the centred block fits its row, so nothing can ever collide with the header or the QR footer.
  function fitSheet(sheet) {
    var main = sheet && sheet.querySelector('.acv-main'), inner = main && main.querySelector('.acv-in'); if (!inner) return;
    var nm = 48, tl = 32;
    sheet.style.setProperty('--nm', nm + 'px'); sheet.style.setProperty('--tl', tl + 'px');
    for (var i = 0; i < 16 && inner.offsetHeight > main.clientHeight - 2 && (nm > 24 || tl > 17); i++) {
      nm = Math.max(24, Math.round(nm * 0.93)); tl = Math.max(17, Math.round(tl * 0.95));
      sheet.style.setProperty('--nm', nm + 'px'); sheet.style.setProperty('--tl', tl + 'px');
    }
  }
  var cur = null, resizeFn = null, keyFn = null;
  function fit() {
    var stage = document.getElementById('acvStage'), sheet = document.getElementById('acvSheet'); if (!stage || !sheet) return;
    var s = Math.min(1, Math.max(0.28, (stage.clientWidth || W) / W));
    sheet.style.transform = 'scale(' + s + ')'; stage.style.height = Math.ceil(H * s) + 'px';
  }
  function close() {
    var o = document.getElementById('acvOverlay'); if (o && o.parentNode) o.parentNode.removeChild(o);
    document.documentElement.classList.remove('acv-open');
    if (resizeFn) window.removeEventListener('resize', resizeFn); if (keyFn) document.removeEventListener('keydown', keyFn);
    resizeFn = keyFn = null; cur = null;
  }
  function open(cert, opts) {
    if (!cert || !cert.certificate_number) return;
    styles(); close(); cur = cert; remember(cert);
    var url = verifyUrl(cert), urlHost = '', pdf = cert.pdf_available ? apiBase() + '/api/certificates/' + encodeURIComponent(cert.certificate_number) + '/download' : '';
    try { urlHost = new URL(url).host; } catch (e) {}
    var o = document.createElement('div'); o.id = 'acvOverlay'; o.className = 'acv-overlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-label', L('الشهادة الرقمية', 'Digital certificate'));
    o.innerHTML =
      '<div class="acv-toolbar">' +
        '<button class="acv-btn gold" data-a="print"><i class="fas fa-print"></i> ' + L('طباعة / حفظ PDF', 'Print / Save as PDF') + '</button>' +
        '<button class="acv-btn" data-a="png"><i class="fas fa-image"></i> ' + L('تنزيل صورة PNG', 'Download PNG') + '</button>' +
        (pdf ? '<a class="acv-btn" href="' + esc(pdf) + '" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> ' + L('PDF من الخادم', 'Server PDF') + '</a>' : '') +
        '<button class="acv-btn cyan" data-a="copy"><i class="fas fa-link"></i> ' + L('نسخ رابط التحقق', 'Copy verify link') + '</button>' +
        '<a class="acv-btn cyan" href="' + esc(url) + '" target="_blank" rel="noopener"><i class="fas fa-shield-halved"></i> ' + L('فتح صفحة التحقق', 'Open verification') + '</a>' +
        (navigator.share ? '<button class="acv-btn" data-a="share"><i class="fas fa-share-nodes"></i> ' + L('مشاركة', 'Share') + '</button>' : '') +
        '<button class="acv-btn red" data-a="close"><i class="fas fa-xmark"></i> ' + L('إغلاق', 'Close') + '</button>' +
      '</div>' +
      '<div class="acv-rot">📱 ' + L('أدِر الهاتف أفقياً لعرض الشهادة بحجم أكبر، أو قرّب الصورة بإصبعين.', 'Rotate your phone for a larger view, or pinch to zoom.') + '</div>' +
      '<div class="acv-stage" id="acvStage"><div class="acv-sheet" id="acvSheet" dir="rtl" lang="ar">' + sheetHTML(cert) + '</div></div>' +
      '<div class="acv-note">' + L('يحتوي الرمز على رابط التحقق الرسمي فقط، وأي شخص يمسحه يرى سجل الشهادة الحقيقي من خادم AUS (صالحة / مُلغاة / موقوفة). الشهادة المزوَّرة لن تجد رقمها في السجل.',
        'The code carries only the official verification link; whoever scans it sees the real record on the AUS server (valid / revoked / suspended). A forged certificate will not be found in the register.') + '</div>' +
      (isLocalUrl(url) ? '<div class="acv-note warn">⚠️ ' + L('الرابط الذي يحمله الرمز محلي (' + esc(urlHost) + ') ولن يُفتح من هاتف آخر. عند النشر اضبط عنوان الموقع العام: <code dir="ltr">&lt;meta name="aus-public-base" content="https://yourdomain.com"&gt;</code> وAPP_BASE_URL في الخادم.',
        'The link inside the code is local (' + esc(urlHost) + ') and will not open from another phone. When deploying set the public site address: <code dir="ltr">&lt;meta name="aus-public-base" content="https://yourdomain.com"&gt;</code> and APP_BASE_URL on the server.') + '</div>' : '');
    document.body.appendChild(o); document.documentElement.classList.add('acv-open');
    o.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'close') close(); else if (a === 'print') print(); else if (a === 'png') downloadPNG(cur);
      else if (a === 'copy') copyLink(url); else if (a === 'share') { try { navigator.share({ title: 'AUS — ' + cert.certificate_number, url: url }).catch(function () {}); } catch (e) {} }
    });
    resizeFn = fit; window.addEventListener('resize', resizeFn);
    keyFn = function (e) { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', keyFn);
    var sheetEl = document.getElementById('acvSheet');
    fit(); fitSheet(sheetEl); setTimeout(fit, 60);
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitSheet(sheetEl); }); } catch (e) {}   // web-font metrics arrive late
    var first = o.querySelector('button'); if (first) try { first.focus(); } catch (e) {}
    if (opts && opts.autoPrint) setTimeout(print, 250);
  }
  function openByNumber(n) {
    var c = recall(n);
    if (c) return open(c);
    toast(L('تعذّر العثور على الشهادة محلياً — حدّث القائمة أولاً', 'Certificate not found locally — refresh the list first'), 'heart-toast');
  }
  function print() { try { window.print(); } catch (e) { toast(L('تعذّرت الطباعة', 'Printing failed'), 'heart-toast'); } }
  function copyLink(url) {
    function done() { toast(L('🔗 تم نسخ رابط التحقق', '🔗 Verification link copied')); }
    try { navigator.clipboard.writeText(url).then(done, function () { window.prompt(L('انسخ الرابط:', 'Copy the link:'), url); }); } catch (e) { window.prompt(L('انسخ الرابط:', 'Copy the link:'), url); }
  }

  // ── تنزيل PNG: ترسم الشهادة على canvas (تعمل دون اتصال) — نفس تخطيط التصميم: الرمز يساراً والبيانات يميناً ──────────
  function drawPNG(cert) {
    var S = 2, cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    var g = cv.getContext('2d'); g.scale(S, S);
    var st = STATUS[cert.status] || [cert.status || '—', cert.status || '—', 'mute'];
    var stColor = { ok: '#69f0ae', bad: '#ff6b8a', warn: '#ffc94d', mute: '#aab0bf' }[st[2]];
    var FA = '"Tajawal", sans-serif', FO = '"Orbitron", "Tajawal", sans-serif';
    function text(t, x, y, font, color, align, dir) {
      g.font = font; g.fillStyle = color; g.textAlign = align || 'center'; g.textBaseline = 'alphabetic'; g.direction = dir || 'rtl'; g.fillText(t, x, y);
    }
    function spacing(px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }
    function fitPx(t, weight, maxPx, minPx, maxW, fam) {                       // largest font size (maxPx..minPx) whose width fits maxW
      var px = maxPx; g.font = weight + ' ' + px + 'px ' + fam;
      while (px > minPx && g.measureText(t).width > maxW) { px -= 2; g.font = weight + ' ' + px + 'px ' + fam; }
      return px;
    }
    // Arabic part on the right, "·", English part to its left — the same reading order as the HTML design (RTL page)
    function pairRight(ar, en, xr, y, fAr, fEn, cAr, cEn) {
      g.font = fAr; g.direction = 'rtl'; var w = g.measureText(ar).width;
      text(ar, xr, y, fAr, cAr, 'right', 'rtl'); text('·', xr - w - 8, y, fAr, cAr, 'center', 'ltr'); text(en, xr - w - 16, y, fEn, cEn, 'right', 'ltr');
    }
    // paper
    var gr = g.createRadialGradient(W / 2, 0, 20, W / 2, 0, 820); gr.addColorStop(0, '#0a1b44'); gr.addColorStop(0.7, '#000814'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#d4af37'; g.lineWidth = 3; g.strokeRect(20, 20, W - 40, H - 40); g.lineWidth = 1; g.strokeStyle = 'rgba(212,175,55,.75)'; g.strokeRect(29, 29, W - 58, H - 58);
    g.strokeStyle = '#ffd700'; g.lineWidth = 3;
    [[11, 11, 1, 1], [W - 11, 11, -1, 1], [11, H - 11, 1, -1], [W - 11, H - 11, -1, -1]].forEach(function (c) {
      g.beginPath(); g.moveTo(c[0], c[1] + 34 * c[3]); g.lineTo(c[0], c[1]); g.lineTo(c[0] + 34 * c[2], c[1]); g.stroke();
    });
    // seal + heading
    g.save(); g.translate(W / 2, 72); g.strokeStyle = '#d4af37'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 28, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e8c04a'; g.beginPath(); for (var i = 0; i < 10; i++) { var r = i % 2 ? 10 : 20, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore();
    spacing(3); text('AUS · AI UNIVERSITY SIMULATOR', W / 2, 132, '900 21px ' + FO, '#ffd700', 'center', 'ltr'); spacing(0);
    text('شهادة اجتياز موثّقة', W / 2, 160, '800 17px ' + FA, '#ffffff');
    spacing(1); text('VERIFIED CERTIFICATE OF ACHIEVEMENT', W / 2, 178, '600 11.5px ' + FO, 'rgba(255,255,255,.66)', 'center', 'ltr'); spacing(0);
    // body
    text('تشهد منصة AUS بأن', W / 2, 232, '600 16px ' + FA, 'rgba(255,255,255,.7)');
    text('This is to certify that', W / 2, 249, '600 11.5px ' + FA, 'rgba(255,255,255,.55)', 'center', 'ltr');
    var name = String(cert.student_name || '');
    text(name, W / 2, 312, '900 ' + fitPx(name, 900, 50, 24, 900, FA) + 'px ' + FA, '#ffd700');
    text('قد اجتاز بنجاح اختبار', W / 2, 356, '600 16px ' + FA, 'rgba(255,255,255,.7)');
    text('has successfully passed the exam', W / 2, 373, '600 11.5px ' + FA, 'rgba(255,255,255,.55)', 'center', 'ltr');
    var tool = String(cert.tool_name || '');
    text(tool, W / 2, 415, '900 ' + fitPx(tool, 900, 32, 17, 900, FA) + 'px ' + FA, '#ffffff', 'center', 'ltr');
    text((cert.cert_label || '') + (cert.specialization ? ' — ' + cert.specialization : ''), W / 2, 449, '700 16px ' + FA, '#ffffff');
    var enLine = [TRACK_EN[cert.cert_label], SPEC_EN[cert.specialization_code]].filter(Boolean).join(' · ');
    if (enLine) text(enLine, W / 2, 467, '600 12px ' + FA, 'rgba(255,255,255,.62)', 'center', 'ltr');
    // result cards
    var cards = [['النتيجة', 'Score', cert.score != null ? cert.score + '%' : '—', '#ffd700', true, 'ltr'], ['تاريخ الإصدار', 'Issued', day(cert.issue_date), '#ffffff', false, 'ltr'],
      ['الحالة', 'Status', st[0] + ' · ' + st[1], stColor, false, 'rtl']];
    cards.forEach(function (c, i) {
      var cx = W / 2 + (1 - i) * 176, x = cx - 80, y = 492, w = 160, h = 58;       // RTL: the first card is on the right
      g.fillStyle = 'rgba(255,255,255,.06)'; g.strokeStyle = 'rgba(212,175,55,.75)'; g.lineWidth = 1; g.beginPath();
      if (g.roundRect) g.roundRect(x, y, w, h, 12); else g.rect(x, y, w, h); g.fill(); g.stroke();
      g.font = '600 11px ' + FA; g.direction = 'rtl'; var wAr = g.measureText(c[0]).width, wEn = g.measureText(c[1]).width, tot = wAr + wEn + 14, left = cx - tot / 2;
      text(c[1], left, y + 18, '600 11px ' + FA, 'rgba(255,255,255,.62)', 'left', 'ltr'); text('·', left + wEn + 7, y + 18, '600 11px ' + FA, 'rgba(255,255,255,.62)', 'center', 'ltr');
      text(c[0], left + tot, y + 18, '600 11px ' + FA, 'rgba(255,255,255,.62)', 'right', 'rtl');
      text(c[2], cx, y + 46, (c[4] ? '900 22px ' + FO : '800 16px ' + FA), c[3], 'center', c[5]);
    });
    // footer: QR (left) on a white panel with a quiet zone of 4 modules, details (right)
    var url = verifyUrl(cert), q = window.AUS_QR ? AUS_QR.encode(url, { ecc: 'Q' }) : null, xr = W - 92;
    if (q) {
      var mods = q.size + 8, pad = 7, unit = Math.max(2, Math.min(3.5, Math.floor(150 / mods * 2) / 2)), box = Math.round(mods * unit + pad * 2), bx = 92, by = 704 - box;
      g.fillStyle = '#fff'; g.strokeStyle = '#d4af37'; g.lineWidth = 2; g.beginPath(); if (g.roundRect) g.roundRect(bx, by, box, box, 12); else g.rect(bx, by, box, box); g.fill(); g.stroke();
      g.fillStyle = '#000';
      for (var y2 = 0; y2 < q.size; y2++) for (var x2 = 0; x2 < q.size; x2++) if (q.get(x2, y2)) g.fillRect(bx + pad + (x2 + 4) * unit, by + pad + (y2 + 4) * unit, unit, unit);
      text('امسح للتحقق', bx + box / 2, 704 + 20, '800 12.5px ' + FA, '#ffffff');
      text('Scan to verify', bx + box / 2, 704 + 34, '600 10.5px ' + FA, 'rgba(255,255,255,.62)', 'center', 'ltr');
    }
    pairRight('رقم الشهادة', 'Certificate No.', xr, 622, '600 12.5px ' + FA, '600 12.5px ' + FA, 'rgba(255,255,255,.66)', 'rgba(255,255,255,.66)');
    spacing(1); text(String(cert.certificate_number), xr, 652, '800 21px ' + FO, '#ffd700', 'right', 'ltr'); spacing(0);
    pairRight('الجهة المصدرة', 'Issued by ' + (cert.issuer || 'AUS — AI University Simulator'), xr, 680, '600 12.5px ' + FA, '700 12.5px ' + FA, 'rgba(255,255,255,.66)', '#ffffff');
    text(url.replace(/^https?:\/\//, ''), xr, 702, '600 10.5px monospace', 'rgba(255,255,255,.55)', 'right', 'ltr');
    if (cert.status && cert.status !== 'verified') {
      g.save(); g.translate(W / 2, H / 2); g.rotate(-0.31); g.globalAlpha = 0.16;
      text(st[1].toUpperCase(), 0, 40, '900 120px ' + FO, { bad: '#ff6b8a', warn: '#ffc94d', mute: '#aab0bf' }[st[2]] || '#aab0bf', 'center', 'ltr'); g.restore();
    }
    return cv;
  }
  function downloadPNG(cert) {
    cert = cert || cur; if (!cert) return;
    var go = function () {
      try {
        var cv = drawPNG(cert), a = document.createElement('a');
        a.download = String(cert.certificate_number) + '.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click();
        setTimeout(function () { a.remove(); }, 300); toast(L('تم تنزيل صورة الشهادة ✅', 'Certificate image downloaded ✅'));
      } catch (e) { toast(L('تعذّر إنشاء الصورة', 'Could not create the image'), 'heart-toast'); }
    };
    try { if (document.fonts && document.fonts.load) { Promise.all([document.fonts.load('900 40px Tajawal'), document.fonts.load('800 20px Tajawal'), document.fonts.load('800 20px Orbitron')]).then(go, go); return; } } catch (e) {}
    go();
  }

  // ── طلب الشهادة من الخادم بعد اجتياز الامتحان ───────────────────────
  // req = {attemptId, studentName, toolName, certLabel}; boxEl = العنصر الذي تُكتب فيه الحالة (اختياري)
  function requestDigital(req, boxEl) {
    function show(html) { if (boxEl) boxEl.innerHTML = html; }
    var C = core();
    if (!req || !req.attemptId || !C || typeof C.serverRequestCertificate !== 'function') return Promise.resolve(null);
    show('<i class="fas fa-spinner fa-spin"></i> ' + L('جارٍ إصدار شهادتك الرقمية وتوليد رمز QR…', 'Issuing your digital certificate and generating its QR code…'));
    return C.serverRequestCertificate(req.attemptId, req.studentName).then(function (r) {
      var d = r.data || {};
      if (r.ok && d.certificate) {
        remember(d.certificate);
        show('<i class="fas fa-circle-check" style="color:#69f0ae"></i> ' + L('صدرت شهادتك الرقمية الموثّقة رقم ', 'Your verified digital certificate was issued: ') +
          '<b dir="ltr" style="font-family:monospace;color:#d4af37">' + esc(d.certificate.certificate_number) + '</b> ' +
          '<button class="cert-link-btn" data-acv-open="' + esc(d.certificate.certificate_number) + '">' + L('عرض الشهادة وQR ←', 'View certificate & QR →') + '</button>');
        open(d.certificate);
        return d.certificate;
      }
      var msg;
      // 202 = owner-approval mode; 404/405 = an older server without POST /certificates/request — the owner's manual issuing still works
      if (r.status === 202 || r.status === 404 || r.status === 405) msg = L('تم تسجيل طلبك — ستُصدر الإدارة شهادتك الرقمية بعد المراجعة.', 'Your request was recorded — the administration will issue your digital certificate after review.') +
        ' <button class="cert-link-btn" data-acv-mine="1">' + L('تابع حالتها هنا ←', 'Follow it here →') + '</button>';
      else if (r.status === 409) msg = L('هذه الشهادة أُلغيت من الإدارة — راجع الإدارة لإصدار شهادة جديدة.', 'This certificate was revoked by the administration — contact them for a new one.');
      else if (r.status === 400) msg = L('لم يجد الخادم اجتيازاً مسجّلاً لهذا الامتحان على حسابك — أعد تسجيل الدخول وحاول مجدداً.', 'The server has no passed sitting of this exam on your account — sign in again and retry.');
      else if (r.status === 401) msg = L('سجّل الدخول بحسابك على الخادم لتُصدَر شهادتك الرقمية.', 'Sign in with your server account to get your digital certificate.');
      else msg = L('تعذّر الاتصال بالخادم الآن — ستُصدَر شهادتك الرقمية عند توفّره.', 'The server is unreachable right now — your digital certificate will be issued when it is back.');
      show('<i class="fas fa-shield-halved" style="color:#d4af37"></i> ' + msg + ((r.status === 0 || r.status === 401) ? ' <button class="cert-link-btn" data-acv-retry="1">' + L('إعادة المحاولة ←', 'Retry →') + '</button>' : ''));
      lastReq = { req: req, box: boxEl };
      return null;
    });
  }
  var lastReq = null;

  // Buttons rendered by other files carry data-acv-* attributes instead of inline JS (no data is ever put inside an onclick string).
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-acv-open],[data-acv-mine],[data-acv-retry]') : null;
    if (!t) return;
    if (t.hasAttribute('data-acv-open')) { ev.preventDefault(); openByNumber(t.getAttribute('data-acv-open')); }
    else if (t.hasAttribute('data-acv-mine')) { if (typeof window._certRenderMyDigitalCerts === 'function') window._certRenderMyDigitalCerts(); }
    else if (t.hasAttribute('data-acv-retry') && lastReq) requestDigital(lastReq.req, lastReq.box);
  });

  window.AUS_CERT_VIEW = {
    open: open, close: close, print: print, openByNumber: openByNumber, requestDigital: requestDigital,
    remember: remember, recall: recall, verifyUrl: verifyUrl, downloadPNG: downloadPNG, sheetHTML: sheetHTML, version: '1.0'
  };
})();
