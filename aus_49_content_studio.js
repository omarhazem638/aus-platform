/* ================================================================
   AUS — Content Studio  (aus_49_content_studio.js)
   ----------------------------------------------------------------
   The owner's control room, mounted inside the Admin Panel
   (control_panel.js → renderAdminPanel → <div id="cs-root">).
   From here the owner can edit, add, hide/delete and restore:
     التخصصات · الأدوات · المتجر والكتب والأسعار · أسئلة القيادة ·
     التحديات · أفضل التصرفات · إعدادات المنصة (اسم، إعلان، صيانة،
     تواصل، إخفاء أقسام، أسعار الشهادات)
   — and review / undo every change (سجل التغييرات) or download a backup.

   Every save goes through window.AUS_CONTENT (aus_48_content_sync.js):
   it changes the owner's screen at once, is written to localStorage,
   is stored in the database by FastAPI (/api/content/ops/*, owner-only,
   enforced on the server) and is pushed LIVE to every open browser.

   Vanilla JS · Nano Glass · Arabic RTL first with English (L('ar','en')).
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_STUDIO) return;

  var ST = { root: null, tab: 'specialties', spec: 'business', q: '', who: null, hist: null, histBusy: false, modal: null, bound: false };

  // ── helpers ──────────────────────────────────────────────────────
  function lang() { return ((document.documentElement.getAttribute('lang') || 'ar').toLowerCase().indexOf('ar') === 0) ? 'ar' : 'en'; }
  function L(ar, en) { return lang() === 'ar' ? ar : (en == null ? ar : en); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); }
  function C() { return window.AUS_CONTENT; }
  function toast(msg, kind) { try { if (typeof showToast === 'function') showToast(msg, kind || 'xp-toast'); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function hex(n) { var s = ''; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16); return s; }
  function get(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function put(o, path, v) { var ks = path.split('.'), last = ks.pop(), cur = o; ks.forEach(function (k) { if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }); cur[last] = v; }

  var TRAITS = { autocratic: 'أوتوقراطي', democratic: 'ديمقراطي', transformational: 'تحويلي', delegative: 'تفويضي', analytical: 'تحليلي', creative: 'إبداعي', social: 'اجتماعي', operational: 'تنفيذي', strategic: 'استراتيجي' };
  var TRAITS_EN = { autocratic: 'Autocratic', democratic: 'Democratic', transformational: 'Transformational', delegative: 'Delegative', analytical: 'Analytical', creative: 'Creative', social: 'Social', operational: 'Operational', strategic: 'Strategic' };
  function traitName(k) { return lang() === 'ar' ? TRAITS[k] : TRAITS_EN[k]; }
  var QSTYLE = ['autocratic', 'democratic', 'transformational', 'delegative'];

  var TABS = [
    { k: 'specialties', ar: 'التخصصات', en: 'Specialties', ic: 'fa-graduation-cap' },
    { k: 'tools', ar: 'الأدوات', en: 'Tools', ic: 'fa-tools' },
    { k: 'store', ar: 'المتجر والكتب', en: 'Store & books', ic: 'fa-store' },
    { k: 'questions', ar: 'أسئلة القيادة', en: 'Leadership questions', ic: 'fa-crown' },
    { k: 'challenges', ar: 'التحديات', en: 'Challenges', ic: 'fa-brain' },
    { k: 'actions', ar: 'أفضل التصرفات', en: 'Best actions', ic: 'fa-lightbulb' },
    { k: 'exams', ar: 'بنك أسئلة الشهادات', en: 'Certificate exam banks', ic: 'fa-award' },
    { k: 'platform', ar: 'إعدادات المنصة', en: 'Platform settings', ic: 'fa-gear' },
    { k: 'history', ar: 'سجل التغييرات', en: 'Change history', ic: 'fa-clock-rotate-left' }
  ];

  // ── styles (Nano Glass: bg .06 · blur 24 · border .12 · radius 18 · shadow 0 20 50 .4) ──
  function styles() {
    if ($('#cs-styles')) return;
    var s = document.createElement('style'); s.id = 'cs-styles';
    s.textContent = [
      '.cs-wrap{max-width:1100px;margin:0 auto 2rem;font-family:"Tajawal",sans-serif;color:#fff}',
      '.cs-head{display:flex;flex-wrap:wrap;align-items:center;gap:.8rem;margin-bottom:.8rem}',
      '.cs-title{font-weight:900;font-size:1.15rem;display:flex;align-items:center;gap:.5rem;color:#ffd700}',
      '.cs-title small{color:rgba(255,255,255,.5);font-weight:500;font-size:.78rem}',
      '.cs-head-actions{margin-inline-start:auto;display:flex;gap:.5rem;flex-wrap:wrap}',
      '.cs-pill{display:inline-flex;align-items:center;gap:.45rem;padding:5px 14px;border-radius:50px;font-size:.78rem;font-weight:700;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}',
      '.cs-pill i{font-size:.55rem}.cs-pill.live{color:#69f0ae;border-color:rgba(105,240,174,.4)}.cs-pill.poll{color:#ffd700;border-color:rgba(255,215,0,.4)}',
      '.cs-pill.off{color:#ff6ea0;border-color:rgba(255,110,160,.4)}.cs-pill.pend{color:#00d4ff;border-color:rgba(0,212,255,.4)}',
      '.cs-note{border-radius:14px;padding:.6rem 1rem;font-size:.84rem;line-height:1.7;margin-bottom:.8rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}',
      '.cs-note.ok{border-color:rgba(105,240,174,.35)}.cs-note.warn{border-color:rgba(255,215,0,.45);color:#ffe9a8}.cs-note.bad{border-color:rgba(255,110,160,.5);color:#ffb3cc}',
      '.cs-tabs{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem}',
      '.cs-tab{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);border-radius:50px;padding:.45rem 1rem;cursor:pointer;font-family:inherit;font-weight:700;font-size:.82rem;display:inline-flex;align-items:center;gap:.4rem;transition:all .2s}',
      '.cs-tab:hover{border-color:rgba(255,215,0,.5);color:#fff}.cs-tab.on{background:linear-gradient(135deg,#ffd700,#ff9500);color:#1a1000;border-color:transparent}',
      '.cs-card{background:rgba(255,255,255,.06);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4);padding:1rem 1.2rem;margin-bottom:1rem}',
      '.cs-card h4{margin:0 0 .6rem;font-size:.98rem;color:#ffd700;display:flex;align-items:center;gap:.5rem}',
      '.cs-bar{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-bottom:.8rem}',
      '.cs-bar .cs-in{flex:1;min-width:180px}',
      '.cs-in,.cs-sel,.cs-ta{width:100%;box-sizing:border-box;background:rgba(0,10,30,.6);border:1px solid rgba(255,215,0,.25);border-radius:12px;padding:.55rem .8rem;color:#fff;font-family:inherit;font-size:.88rem;outline:none}',
      '.cs-in:focus,.cs-sel:focus,.cs-ta:focus{border-color:rgba(255,215,0,.65)}.cs-ta{resize:vertical;min-height:70px;line-height:1.7}',
      '.cs-sel option{background:#0a1228;color:#fff}',
      '.cs-btn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#fff;border-radius:12px;padding:.5rem 1rem;cursor:pointer;font-family:inherit;font-weight:700;font-size:.82rem;display:inline-flex;align-items:center;gap:.4rem;transition:all .2s}',
      '.cs-btn:hover{filter:brightness(1.2);transform:translateY(-1px)}.cs-btn.gold{background:linear-gradient(135deg,#ffd700,#ff9500);color:#1a1000;border-color:transparent}',
      '.cs-btn.cyan{border-color:rgba(0,212,255,.45);color:#00d4ff}.cs-btn.red{border-color:rgba(255,110,160,.5);color:#ff8fb3}.cs-btn[disabled]{opacity:.5;pointer-events:none}',
      '.cs-list{display:flex;flex-direction:column;gap:.55rem}',
      '.cs-row{display:flex;align-items:center;gap:.8rem;padding:.65rem .9rem;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09)}',
      '.cs-row.hid{opacity:.55;border-style:dashed}.cs-ico{flex:none;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;background:rgba(255,255,255,.07)}',
      '.cs-main{flex:1;min-width:0}.cs-name{font-weight:800;font-size:.92rem;overflow-wrap:anywhere}.cs-sub{color:rgba(255,255,255,.5);font-size:.76rem;margin-top:2px;overflow-wrap:anywhere}',
      '.cs-badge{display:inline-block;font-size:.64rem;font-weight:800;padding:1px 9px;border-radius:50px;margin-inline-start:6px;vertical-align:middle;border:1px solid rgba(255,255,255,.2)}',
      '.cs-badge.new{color:#69f0ae;border-color:rgba(105,240,174,.5)}.cs-badge.ed{color:#ffd700;border-color:rgba(255,215,0,.5)}.cs-badge.hid{color:#ff8fb3;border-color:rgba(255,110,160,.5)}.cs-badge.k{color:#00d4ff;border-color:rgba(0,212,255,.45)}',
      '.cs-acts{flex:none;display:flex;gap:.3rem;flex-wrap:wrap;justify-content:flex-end}',
      '.cs-ia{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;padding:.35rem .6rem;cursor:pointer;font-size:.78rem;font-family:inherit}.cs-ia:hover{border-color:#ffd700}',
      '.cs-ia.red:hover{border-color:#ff6ea0}.cs-price{width:84px!important;text-align:center;direction:ltr;color:#ffd700;font-weight:800;padding:.35rem .4rem!important}',
      '.cs-empty{text-align:center;color:rgba(255,255,255,.45);padding:2rem 1rem;font-size:.88rem}',
      '.cs-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.7rem}',
      '.cs-f{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.7rem}.cs-f>label{font-size:.78rem;font-weight:700;color:rgba(255,255,255,.7)}',
      '.cs-f .hint{font-size:.7rem;color:rgba(255,255,255,.4)}.cs-f .req{color:#ff6ea0}',
      '.cs-sw{display:flex;align-items:center;gap:.6rem;font-size:.86rem;font-weight:700;cursor:pointer}.cs-sw input{width:18px;height:18px;accent-color:#ffd700}',
      '.cs-chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.4rem}.cs-chk label{display:flex;gap:.5rem;align-items:center;font-size:.8rem;padding:.35rem .6rem;border-radius:10px;background:rgba(255,255,255,.04);cursor:pointer}',
      '.cs-modal{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,4,16,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
      '.cs-sheet{width:min(720px,100%);max-height:92vh;overflow:auto;background:rgba(10,16,36,.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4);padding:1.2rem 1.4rem}',
      '.cs-sheet h3{margin:0 0 1rem;color:#ffd700;font-size:1.05rem;display:flex;align-items:center;gap:.5rem}',
      '.cs-err{background:rgba(255,110,160,.12);border:1px solid rgba(255,110,160,.5);color:#ffb3cc;border-radius:12px;padding:.6rem .9rem;margin-bottom:.8rem;font-size:.84rem;line-height:1.7}',
      '.cs-foot{display:flex;gap:.6rem;justify-content:flex-end;margin-top:.6rem;flex-wrap:wrap}',
      '.cs-opt{display:flex;gap:.5rem;align-items:center;margin-bottom:.4rem}.cs-opt>span{flex:none;min-width:84px;font-size:.72rem;color:rgba(255,255,255,.55)}',
      '.cs-act-box{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:.7rem .8rem;margin-bottom:.6rem;background:rgba(255,255,255,.03)}',
      '.cs-hist{display:flex;gap:.8rem;align-items:center;padding:.55rem .8rem;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);margin-bottom:.45rem;font-size:.8rem}',
      '.cs-hist .t{flex:none;min-width:118px;color:rgba(255,255,255,.5);direction:ltr;text-align:start}.cs-hist .s{flex:1;min-width:0;overflow-wrap:anywhere}',
      '@media(max-width:640px){.cs-row{flex-wrap:wrap}.cs-acts{width:100%;justify-content:flex-start}.cs-head-actions{margin-inline-start:0}.cs-hist{flex-wrap:wrap}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ═════════════════════════════════════════════════════════════════
  // Field definitions (limits mirror content_store.py — the server remains the authority)
  // ═════════════════════════════════════════════════════════════════
  function specOptions() {
    var seen = {}, out = [];
    (typeof specialties !== 'undefined' ? specialties : []).forEach(function (s) { seen[s.id] = 1; out.push({ v: s.id, t: (s.icon || '') + ' ' + s.name }); });
    C().entries('specialties').forEach(function (e) { if (!seen[e.id]) out.push({ v: e.id, t: (e.item.icon || '') + ' ' + e.item.name + ' (' + L('مخفي', 'hidden') + ')' }); });
    return out;
  }
  function defs(tab) {
    var D = {
      specialties: [
        { k: 'name', ar: 'الاسم', en: 'Name', type: 'text', max: 80, req: 1 },
        { k: 'icon', ar: 'الأيقونة (إيموجي)', en: 'Icon (emoji)', type: 'text', max: 8, def: '🎓' },
        { k: 'desc', ar: 'الوصف', en: 'Description', type: 'textarea', max: 300, rows: 3 }
      ],
      tools: [
        { k: 'spec', ar: 'التخصص', en: 'Specialty', type: 'select', opts: specOptions, req: 1, addOnly: 1 },
        { k: 'name', ar: 'اسم الأداة', en: 'Tool name', type: 'text', max: 80, req: 1 },
        { k: 'icon', ar: 'الأيقونة (إيموجي)', en: 'Icon (emoji)', type: 'text', max: 8, def: '🛠️' },
        { k: 'desc', ar: 'وصف قصير', en: 'Short description', type: 'text', max: 300, req: 1 },
        { k: 'learn.intro', ar: 'ما هي الأداة؟ (التعريف)', en: 'What is it?', type: 'textarea', max: 2000, rows: 4, req: 1 },
        { k: 'learn.points', ar: 'المكوّنات والمفاهيم الأساسية (سطر لكل مكوّن، من 2 إلى 12)', en: 'Core components (one per line, 2–12)', type: 'lines', min: 2, maxItems: 12, itemMax: 300, req: 1 },
        { k: 'learn.useCase', ar: 'متى تُستخدم؟', en: 'When to use it', type: 'textarea', max: 1200, rows: 3, req: 1 },
        { k: 'learn.benefits', ar: 'الفوائد الرئيسية (سطر لكل فائدة، من 2 إلى 12)', en: 'Key benefits (one per line, 2–12)', type: 'lines', min: 2, maxItems: 12, itemMax: 300, req: 1 },
        { k: 'learn.example', ar: 'مثال واقعي', en: 'Real-world example', type: 'textarea', max: 1500, rows: 3, req: 1 },
        { k: 'learn.pitfall', ar: 'تحدٍّ شائع / فخ', en: 'Common pitfall', type: 'textarea', max: 1200, rows: 3, req: 1 }
      ],
      store: [
        { k: 'title', ar: 'العنوان', en: 'Title', type: 'text', max: 120, req: 1 },
        { k: 'subtitle', ar: 'العنوان الفرعي (اختياري)', en: 'Subtitle (optional)', type: 'text', max: 160 },
        { k: 'type', ar: 'النوع', en: 'Type', type: 'select', opts: [{ v: 'file', t: L('ملف', 'File') }, { v: 'book', t: L('كتاب', 'Book') }], def: 'file' },
        { k: 'price', ar: 'السعر (د.أ)', en: 'Price (JOD)', type: 'number', min: 0, maxv: 1000, step: 0.5, def: 10, req: 1 },
        { k: 'archetype', ar: 'النمط القيادي', en: 'Leadership style', type: 'select', opts: function () { return Object.keys(TRAITS).map(function (k) { return { v: k, t: traitName(k) }; }); }, def: 'autocratic' },
        { k: 'icon', ar: 'الأيقونة (إيموجي)', en: 'Icon (emoji)', type: 'text', max: 8, def: '📦' },
        { k: 'size', ar: 'الحجم / الصيغة', en: 'Size / format', type: 'text', max: 60, def: 'PDF' },
        { k: 'desc', ar: 'الوصف', en: 'Description', type: 'textarea', max: 1200, rows: 4 }
      ],
      questions: [
        { k: 'q', ar: 'نص السؤال', en: 'Question', type: 'textarea', max: 300, rows: 2, req: 1 },
        { k: 'options', ar: 'الخيارات الأربعة (كل خيار يقيس نمطاً قيادياً ثابتاً)', en: 'The four options (each maps to a fixed leadership style)', type: 'opts4', itemMax: 200, labels: QSTYLE, req: 1 }
      ],
      challenges: [
        { k: 'spec', ar: 'التخصص', en: 'Specialty', type: 'select', opts: specOptions, req: 1, addOnly: 1 },
        { k: 'scenario', ar: 'السيناريو', en: 'Scenario', type: 'textarea', max: 500, rows: 3, req: 1 },
        { k: 'options', ar: 'الخيارات الأربعة', en: 'The four options', type: 'opts4', itemMax: 300, req: 1 },
        { k: 'correct', ar: 'رقم الإجابة الأفضل', en: 'Best answer', type: 'select', opts: [{ v: 0, t: '1' }, { v: 1, t: '2' }, { v: 2, t: '3' }, { v: 3, t: '4' }], def: 1, num: 1, req: 1 },
        { k: 'xp', ar: 'نقاط XP لكل خيار', en: 'XP per option', type: 'nums4', min: 0, maxv: 1000 }
      ],
      actions: [
        { k: 'spec', ar: 'التخصص', en: 'Specialty', type: 'select', opts: specOptions, req: 1, addOnly: 1 },
        { k: 'scenario', ar: 'السيناريو', en: 'Scenario', type: 'textarea', max: 500, rows: 3, req: 1 },
        { k: 'actions', ar: 'التصرفات الأربعة', en: 'The four actions', type: 'acts4', req: 1 }
      ]
    };
    return D[tab] || [];
  }

  // ═════════════════════════════════════════════════════════════════
  // Mount / shell
  // ═════════════════════════════════════════════════════════════════
  function mount(el) {
    if (!el || !C()) return;
    styles();
    ST.root = el;
    el.innerHTML =
      '<div class="cs-wrap">' +
        '<div class="cs-head">' +
          '<div class="cs-title"><i class="fas fa-sliders"></i> ' + L('استوديو المحتوى', 'Content Studio') + ' <small>' + L('تحكّم كامل ولحظي — بلا برمجة', 'full & instant control — no code') + '</small></div>' +
          '<span class="cs-pill" id="cs-pill"></span>' +
          '<div class="cs-head-actions">' +
            '<button class="cs-btn cyan" data-act="export"><i class="fas fa-download"></i> ' + L('نسخة احتياطية', 'Backup') + '</button>' +
            '<button class="cs-btn" data-act="sync"><i class="fas fa-rotate"></i> ' + L('مزامنة الآن', 'Sync now') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="cs-note" id="cs-auth"></div>' +
        '<div class="cs-tabs" role="tablist" id="cs-tabs"></div>' +
        '<div id="cs-body"></div>' +
      '</div>';
    if (!ST.bound) {
      ST.bound = true;
      window.addEventListener('aus-content-status', function () { if (alive()) renderStatus(); });
      window.addEventListener('aus-content-changed', function () { if (alive()) renderBody(true); });
      try {   // the app language changed (AR ⇄ EN …): redraw the Studio in it
        new MutationObserver(function () { if (alive() && !ST.modal) { ST.builtTab = null; mount(ST.root); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      } catch (e) {}
    }
    if (!el.__csBound) {                                  // one set of listeners per element (re-mounting must not double every click)
      el.__csBound = true;
      el.addEventListener('click', onClick);
      el.addEventListener('change', onChange);
      el.addEventListener('input', onInput);
    }
    renderTabs(); renderStatus(); renderAuth(); renderBody();
    C().whoami().then(function (w) { ST.who = w; if (alive()) renderAuth(); });
  }
  function alive() { return ST.root && document.body.contains(ST.root); }

  function renderTabs() {
    var h = $('#cs-tabs', ST.root); if (!h) return;
    h.innerHTML = TABS.map(function (t) {
      return '<button class="cs-tab' + (ST.tab === t.k ? ' on' : '') + '" role="tab" aria-selected="' + (ST.tab === t.k) + '" data-act="tab" data-v="' + t.k + '"><i class="fas ' + t.ic + '"></i> ' + esc(L(t.ar, t.en)) + '</button>';
    }).join('');
  }

  function renderStatus() {
    var p = $('#cs-pill', ST.root); if (!p || !C()) return;
    var s = C().status(), cls, txt;
    if (s.pending) { cls = 'pend'; txt = '<i class="fas fa-circle"></i> ' + L('بانتظار الإرسال: ', 'Waiting to send: ') + s.pending; }
    else if (s.conn === 'live') { cls = 'live'; txt = '<i class="fas fa-circle"></i> ' + L('مباشر', 'Live') + ' · rev ' + s.rev; }
    else if (s.conn === 'poll') { cls = 'poll'; txt = '<i class="fas fa-circle"></i> ' + L('مزامنة دورية', 'Periodic sync') + ' · rev ' + s.rev; }
    else if (s.conn === 'offline') { cls = 'off'; txt = '<i class="fas fa-circle"></i> ' + L('بلا اتصال', 'Offline'); }
    else { cls = 'poll'; txt = '<i class="fas fa-circle"></i> ' + L('جارٍ الاتصال…', 'Connecting…'); }
    p.className = 'cs-pill ' + cls; p.innerHTML = txt;
    if (s.authBlocked) renderAuth();
  }

  function renderAuth() {
    var box = $('#cs-auth', ST.root); if (!box || !C()) return;
    var w = ST.who, s = C().status(), cls = 'ok', html;
    if (!w) { html = L('جارٍ التحقق من صلاحيتك على الخادم…', 'Checking your authority on the server…'); cls = ''; }
    else if (w.unreachable) { cls = 'warn'; html = '⚠️ ' + L('الخادم غير متاح الآن — تُحفَظ تعديلاتك محلياً وتُرسَل تلقائياً فور عودته.', 'The server is unreachable — your edits are saved locally and sent automatically when it is back.'); }
    else if (!w.authenticated) { cls = 'warn'; html = '🔒 ' + L('لست مسجَّلاً على الخادم. سجّل الخروج ثم الدخول بحساب المالك (مع تشغيل الخادم) ليُخزَّن ما تعدّله في قاعدة البيانات ويصل للمستخدمين لحظياً. حتى ذلك الحين تُحفَظ تعديلاتك على هذا الجهاز وتُرسَل لاحقاً.', 'You are not signed in on the server. Sign out and back in with the owner account (server running) so edits are stored in the database and reach users instantly. Until then they are kept on this device and sent later.'); }
    else if (!w.is_owner) { cls = 'bad'; html = '⛔ ' + L('حسابك على الخادم ليس حساب المالك المعتمد (AUS_OWNER_EMAIL) — الخادم سيرفض أي تعديل. تأكّد من أنك دخلت بحساب المالك.', 'Your server account is not the configured owner (AUS_OWNER_EMAIL) — the server will refuse every edit. Make sure you signed in with the owner account.'); }
    else if (!w.can_write) { cls = 'bad'; html = '⚠️ ' + L('الخادم يعرفك كمالك لكن بوابة المالك غير مفعّلة: اضبط AUS_OWNER_PASSWORD على الخادم.', 'The server knows you as the owner but the owner gate is not armed: set AUS_OWNER_PASSWORD on the server.'); }
    else { html = '✅ ' + L('الخادم يتعرّف عليك كمالك ومتحكّم رئيسي — كل حفظ يُطبَّق فوراً، يُخزَّن في قاعدة البيانات وlocalStorage، ويظهر لكل المستخدمين لحظياً دون إعادة تحميل.', 'The server recognises you as the owner and super admin — every save applies instantly, is stored in the database and localStorage, and appears for all users live with no reload.'); }
    if (s.authBlocked && w && w.is_owner) { cls = 'warn'; html += ' <br>🔒 ' + L('بعض التعديلات تنتظر جلسة الخادم — سجّل الدخول من جديد.', 'Some edits are waiting for the server session — sign in again.'); }
    box.className = 'cs-note ' + cls; box.innerHTML = html;
  }

  // ═════════════════════════════════════════════════════════════════
  // Body
  // ═════════════════════════════════════════════════════════════════
  function renderBody(soft) {
    var body = $('#cs-body', ST.root); if (!body || !C()) return;
    var t = ST.tab;
    if (t === 'exams') { if (!soft) renderExams(); return; }
    if (t === 'platform') { if (!soft || !$('#cs-plat', body)) body.innerHTML = platformHTML(); return; }
    if (t === 'history') { if (!soft) loadHistory(); else if (ST.hist) renderHistory(); return; }
    // list tabs: keep the toolbar (and the search box focus) and redraw only the list
    if (!$('#cs-list', body) || ST.builtTab !== t) {
      body.innerHTML = toolbarHTML(t) + '<div class="cs-list" id="cs-list"></div><div class="cs-note" style="margin-top:.8rem" id="cs-foot"></div>';
      ST.builtTab = t;
    }
    var list = listItems(t), host = $('#cs-list', body);
    host.innerHTML = list.length ? list.map(function (e) { return rowHTML(t, e); }).join('') : '<div class="cs-empty">' + L('لا توجد عناصر مطابقة.', 'Nothing matches.') + '</div>';
    var foot = $('#cs-foot', body);
    if (foot) foot.innerHTML = footHTML(t, list);
  }

  function toolbarHTML(t) {
    var sel = '';
    if (t === 'tools' || t === 'challenges' || t === 'actions') {
      sel = '<select class="cs-sel" style="max-width:260px" data-act="spec" id="cs-spec">' + specOptions().map(function (o) {
        return '<option value="' + esc(o.v) + '"' + (o.v === ST.spec ? ' selected' : '') + '>' + esc(o.t) + '</option>';
      }).join('') + '</select>';
    }
    return '<div class="cs-bar">' + sel +
      '<input class="cs-in" id="cs-q" type="search" placeholder="' + esc(L('ابحث…', 'Search…')) + '" value="' + esc(ST.q) + '" data-act="q">' +
      '<button class="cs-btn gold" data-act="add"><i class="fas fa-plus"></i> ' + L('إضافة', 'Add') + '</button>' +
      '<button class="cs-btn red" data-act="clear" title="' + esc(L('إرجاع هذا القسم كله لما شُحن مع التطبيق', 'Return this whole section to what shipped with the app')) + '"><i class="fas fa-rotate-left"></i> ' + L('إرجاع للأصل', 'Reset all') + '</button>' +
    '</div>';
  }

  function listItems(t) {
    var o = (t === 'tools' || t === 'challenges' || t === 'actions') ? { spec: ST.spec } : {};
    var q = (ST.q || '').trim().toLowerCase();
    return C().entries(t, o).filter(function (e) {
      if (!q) return true;
      var it = e.item;
      return [it.name, it.title, it.desc, it.q, it.scenario, it.subtitle].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }

  function badges(e) {
    return (e.custom ? '<span class="cs-badge new">' + L('جديد', 'new') + '</span>' : '') +
      (e.edited ? '<span class="cs-badge ed">' + L('معدّل', 'edited') + '</span>' : '') +
      (e.hidden ? '<span class="cs-badge hid">' + L('مخفي', 'hidden') + '</span>' : '');
  }
  function acts(e, extra) {
    var b = '';
    if (e.hidden) b += '<button class="cs-ia" data-act="restore" data-id="' + esc(e.id) + '"><i class="fas fa-rotate-left"></i> ' + L('استرجاع', 'Restore') + '</button>';
    else {
      b += '<button class="cs-ia" data-act="edit" data-id="' + esc(e.id) + '"><i class="fas fa-pen"></i> ' + L('تعديل', 'Edit') + '</button>';
      if (e.edited) b += '<button class="cs-ia" data-act="reset" data-id="' + esc(e.id) + '" title="' + esc(L('إرجاع هذا العنصر لأصله', 'Back to the original')) + '"><i class="fas fa-eraser"></i></button>';
      b += '<button class="cs-ia red" data-act="del" data-id="' + esc(e.id) + '"><i class="fas fa-trash"></i> ' + (e.custom ? L('حذف', 'Delete') : L('إخفاء', 'Hide')) + '</button>';
    }
    return '<div class="cs-acts">' + (extra || '') + b + '</div>';
  }
  function trunc(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }

  function rowHTML(t, e) {
    var it = e.item, h = e.hidden ? ' hid' : '';
    if (t === 'specialties') {
      var n = (typeof toolsData !== 'undefined' && toolsData[e.id]) ? toolsData[e.id].filter(function (x) { return !x.hidden; }).length : 0;
      return '<div class="cs-row' + h + '"><div class="cs-ico">' + esc(it.icon || '🎓') + '</div><div class="cs-main"><div class="cs-name">' + esc(it.name) + badges(e) +
        '<span class="cs-badge k">' + n + ' ' + L(n <= 10 ? 'أدوات' : 'أداة', 'tools') + '</span></div><div class="cs-sub">' + esc(trunc(it.desc, 140)) + '</div></div>' + acts(e) + '</div>';
    }
    if (t === 'tools') {
      return '<div class="cs-row' + h + '"><div class="cs-ico">' + esc(it.icon || '🛠️') + '</div><div class="cs-main"><div class="cs-name">' + esc(it.name) + badges(e) +
        (e.base ? '<span class="cs-badge k">#' + (e.index + 1) + '</span>' : '') + '</div><div class="cs-sub">' + esc(trunc(it.desc, 140)) + '</div></div>' + acts(e) + '</div>';
    }
    if (t === 'store') {
      var price = '<input class="cs-in cs-price" type="number" min="0" max="1000" step="0.5" value="' + esc(it.price != null ? it.price : 0) + '" data-act="price" data-id="' + esc(e.id) + '" aria-label="' + esc(L('السعر', 'Price')) + '"> <small style="color:rgba(255,255,255,.45)">' + L('د.أ', 'JOD') + '</small>';
      return '<div class="cs-row' + h + '"><div class="cs-ico">' + esc(it.icon || '📦') + '</div><div class="cs-main"><div class="cs-name">' + esc(it.title) + badges(e) +
        '<span class="cs-badge k">' + (it.type === 'book' ? L('كتاب', 'book') : L('ملف', 'file')) + '</span></div><div class="cs-sub">' + esc(traitName(it.archetype) || '') + ' · ' + esc(it.size || '') + '</div></div>' +
        (e.hidden ? '' : '<div style="flex:none">' + price + '</div>') + acts(e) + '</div>';
    }
    if (t === 'questions') {
      return '<div class="cs-row' + h + '"><div class="cs-ico">❓</div><div class="cs-main"><div class="cs-name">' + esc(trunc(it.q, 160)) + badges(e) + '</div><div class="cs-sub">' +
        esc((it.options || []).map(function (o) { return trunc(o, 28); }).join(' · ')) + '</div></div>' + acts(e) + '</div>';
    }
    if (t === 'challenges') {
      return '<div class="cs-row' + h + '"><div class="cs-ico">🧠</div><div class="cs-main"><div class="cs-name">' + esc(trunc(it.scenario, 170)) + badges(e) + '</div><div class="cs-sub">' + L('الأفضل: ', 'Best: ') + esc(trunc((it.options || [])[it.correct] || '', 80)) + '</div></div>' + acts(e) + '</div>';
    }
    if (t === 'actions') {
      var best = (it.actions || []).filter(function (a) { return a.best; })[0];
      return '<div class="cs-row' + h + '"><div class="cs-ico">💡</div><div class="cs-main"><div class="cs-name">' + esc(trunc(it.scenario, 170)) + badges(e) + '</div><div class="cs-sub">' + L('الأفضل: ', 'Best: ') + esc(trunc(best ? best.text : '', 80)) + '</div></div>' + acts(e) + '</div>';
    }
    return '';
  }

  function footHTML(t, list) {
    var all = C().entries(t, (t === 'tools' || t === 'challenges' || t === 'actions') ? { spec: ST.spec } : {});
    var vis = all.filter(function (e) { return !e.hidden; }).length, hid = all.length - vis;
    var msg = L('المعروض للمستخدمين الآن: ', 'Shown to users now: ') + '<b>' + vis + '</b>' + (hid ? ' · ' + L('مخفي: ', 'hidden: ') + '<b>' + hid + '</b>' : '') + ' — ' + L('كل تعديل ينعكس عند المستخدمين لحظياً.', 'every change reaches users instantly.');
    if (t === 'tools') msg += '<br>' + L('ملاحظة: الأدوات الأصلية تُخفى ولا تُحذف حتى تبقى أرقام شهاداتها ثابتة. الأداة الجديدة تظهر في الدراسة والاختبار القصير؛ شهادتها الاحترافية تحتاج بنك أسئلة على الخادم (exam_bank).', 'Note: built-in tools are hidden, never removed, so their certificate ids stay stable. A new tool appears in study and its short quiz; its professional certificate needs a server-side question bank (exam_bank).');
    if (t === 'specialties') msg += '<br>' + L('التخصص الجديد يحصل تلقائياً على تحديات وتصرفات مولَّدة باسمه، وتستطيع إضافة أدواته من تبويب «الأدوات».', 'A new specialty automatically gets generated challenges and actions with its name; add its tools from the "Tools" tab.');
    if (t === 'store') msg += '<br>' + L('تغيير السعر يسري فوراً على المتجر وعلى فحص الدفع في الخادم (PayPal) — والعناصر الجديدة تصبح قابلة للشراء.', 'A price change applies at once to the store and to the server-side payment check (PayPal); new items become purchasable.');
    return msg;
  }

  // ═════════════════════════════════════════════════════════════════
  // Clicks
  // ═════════════════════════════════════════════════════════════════
  function onClick(ev) {
    var b = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!b || !ST.root.contains(b)) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (a === 'price' || a === 'q' || a === 'spec' || a === 'ex-q' || a === 'ex-spec') return;     // handled by input/change
    ev.preventDefault();
    if (a === 'tab') { ST.tab = b.getAttribute('data-v'); ST.q = ''; ST.builtTab = null; renderTabs(); renderBody(); return; }
    if (a === 'add') return openEditor(null);
    if (a === 'edit') return openEditor(findEntry(id));
    if (a === 'del') return doDelete(findEntry(id));
    if (a === 'restore') return send([{ op: 'restore', id: id }], L('تم الاسترجاع ✅', 'Restored ✅'));
    if (a === 'reset') { if (confirm(L('إرجاع هذا العنصر لأصله وإلغاء تعديلاتك عليه؟', 'Return this item to the original and drop your edits?'))) send([{ op: 'reset', id: id }], L('عاد للأصل ✅', 'Back to original ✅')); return; }
    if (a === 'clear') return doClear();
    if (a === 'export') return doExport();
    if (a === 'sync') { C().sync().then(function () { toast(L('تمت المزامنة ✅', 'Synced ✅')); }); return; }
    if (a === 'plat-save') return savePlatform(b.getAttribute('data-v'));
    if (a === 'plat-reset') return resetPlatform(b.getAttribute('data-v'));
    if (a === 'revert') return doRevert(+id);
    if (a === 'hist-more') return loadHistory(true);
    if (a === 'ex-open') return openBank(id);
    if (a === 'ex-back') { EX.bank = null; EX.q = ''; return renderExams(); }
    if (a === 'ex-filter') { EX.filter = id; EX.page = 0; return renderExams(); }
    if (a === 'ex-page') { EX.page = +id; return renderExams(); }
    if (a === 'ex-add') return exEditor(id, null);
    if (a === 'ex-edit') return exEditor(null, +id);
    if (a === 'ex-del') {
      var q = EX.bank.questions[+id]; if (!q) return;
      if (confirm(L('حذف هذا السؤال من البنك؟ (تُحفَظ نسخة احتياطية)\n\n', 'Delete this question from the bank? (a backup is kept)\n\n') + trunc(q.prompt, 120))) {
        exSend([{ op: 'delete', i: +id }], L('تم حذف السؤال ✅', 'Question deleted ✅')).then(function (r) { if (!r.ok && !r.closed) toast('⚠️ ' + r.error, 'heart-toast'); });
      }
      return;
    }
    if (a === 'ex-rename') {
      var nn = prompt(L('اسم الأداة كما يظهر في الشهادة والامتحان:', 'Tool name as shown in the certificate and exam:'), EX.bank.tool_name);
      if (nn && nn.trim() && nn.trim() !== EX.bank.tool_name) exSend([{ op: 'rename', tool_name: nn.trim() }], L('تمت إعادة التسمية ✅', 'Renamed ✅')).then(function (r) { if (!r.ok && !r.closed) toast('⚠️ ' + r.error, 'heart-toast'); });
      return;
    }
    if (a === 'ex-backups') { exApi('GET', '/' + encodeURIComponent(EX.bank.id) + '/backups').then(function (r) { EX.backups = (r.ok && r.data.backups) || []; if (!EX.backups.length) toast(L('لا توجد نسخ احتياطية بعد', 'No backups yet')); renderExams(); }); return; }
    if (a === 'ex-restore') {
      var nm = ($('#ex-bk', ST.root) || {}).value; if (!nm) { toast(L('اختر نسخة أولاً', 'Pick a backup first'), 'heart-toast'); return; }
      if (!confirm(L('استرجاع هذه النسخة؟ (النسخة الحالية تُحفَظ أولاً)', 'Restore this backup? (the current version is backed up first)'))) return;
      exApi('POST', '/' + encodeURIComponent(EX.bank.id) + '/restore', { name: nm }).then(function (r) {
        if (r.ok && r.data.bank) { EX.bank = r.data.bank; EX.list = null; EX.backups = null; toast(L('تم الاسترجاع ✅', 'Restored ✅')); renderExams(); }
        else toast('⚠️ ' + exErr(r), 'heart-toast');
      });
      return;
    }
  }
  function onChange(ev) {
    var t = ev.target;
    if (t.matches && t.matches('[data-act="price"]')) {
      var v = +t.value; if (!(v >= 0 && v <= 1000)) { toast(L('السعر بين 0 و1000', 'Price must be 0–1000'), 'heart-toast'); renderBody(true); return; }
      send([{ op: 'edit', id: t.getAttribute('data-id'), fields: { price: v } }], L('تم تحديث السعر ✅ — ظهر للمستخدمين فوراً', 'Price updated ✅ — live for users'));
    } else if (t.matches && t.matches('[data-act="spec"]')) { ST.spec = t.value; ST.builtTab = null; renderBody(); }
    else if (t.matches && t.matches('[data-act="ex-spec"]')) { EX.spec = t.value; renderExams(); }
  }
  var qTimer = 0;
  function onInput(ev) {
    var t = ev.target;
    if (t.matches && t.matches('[data-act="q"]')) { ST.q = t.value; clearTimeout(qTimer); qTimer = setTimeout(function () { renderBody(true); }, 120); }
    else if (t.matches && t.matches('[data-act="ex-q"]')) {
      EX.q = t.value; EX.page = 0; clearTimeout(qTimer);
      qTimer = setTimeout(function () { var had = document.activeElement && document.activeElement.id === 'ex-q', pos = had ? document.activeElement.selectionStart : 0; renderExams(); var el = $('#ex-q', ST.root); if (had && el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }, 150);
    }
  }

  function findEntry(id) {
    var t = ST.tab, o = (t === 'tools' || t === 'challenges' || t === 'actions') ? { spec: ST.spec } : {};
    return C().entries(t, o).filter(function (e) { return e.id === id; })[0] || null;
  }

  // The optimistic apply happens inside ops() — the lists behind already show the change when this returns.
  function send(ops, okMsg, label) {
    var p = C().ops(ST.tab, ops, label).then(function (r) {
      if (okMsg) toast(r && r.queued ? L('حُفظ على هذا الجهاز وسيُرسَل عند توفّر الاتصال/الجلسة 📥', 'Saved on this device — will be sent when the connection/session is back 📥') : okMsg);
      return r;
    }, function (err) {
      toast('⚠️ ' + L('رفض الخادم التعديل: ', 'Server refused: ') + ((err && (err.message || err.code)) || ''), 'heart-toast');
      throw err;
    });
    p.catch(function () {});          // callers that only fire-and-forget (delete, restore, price…) must not raise "unhandled rejection"
    return p;
  }

  function doDelete(e) {
    if (!e) return;
    var name = e.item.name || e.item.title || trunc(e.item.q || e.item.scenario, 40) || e.id;
    var msg = e.custom ? L('حذف «' + name + '» نهائياً؟', 'Delete "' + name + '" permanently?') : L('إخفاء «' + name + '» عن المستخدمين؟ (يمكنك استرجاعه لاحقاً)', 'Hide "' + name + '" from users? (you can restore it later)');
    if (!confirm(msg)) return;
    send([{ op: 'delete', id: e.id }], e.custom ? L('تم الحذف ✅', 'Deleted ✅') : L('تم الإخفاء ✅', 'Hidden ✅'));
  }
  function doClear() {
    var mine = C().get(ST.tab), n = Object.keys(mine.edits || {}).length + (mine.added || []).length + (mine.deleted || []).length;
    if (!n) { toast(L('لا توجد تعديلات في هذا القسم', 'No changes in this section')); return; }
    if (!confirm(L('سيُلغى كل ما عدّلته أو أضفته أو أخفيته في هذا القسم (' + n + ' تعديل) ويرجع لما شُحن مع التطبيق. متأكد؟', 'Everything you edited, added or hid in this section (' + n + ' changes) will be dropped. Sure?'))) return;
    send([{ op: 'clear' }], L('عاد القسم للأصل ✅', 'Section reset ✅'));
  }
  function doExport() {
    C().exportAll().then(function (r) {
      if (!r.ok) { toast('⚠️ ' + L('تعذّر التصدير — تأكّد من تسجيل الدخول على الخادم', 'Export failed — sign in on the server'), 'heart-toast'); return; }
      try {
        var blob = new Blob([JSON.stringify(r.data, null, 1)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'aus-content-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        toast(L('تم تنزيل النسخة الاحتياطية ✅', 'Backup downloaded ✅'));
      } catch (e) {}
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // Editor modal (generic, driven by defs())
  // ═════════════════════════════════════════════════════════════════
  function fieldHTML(d, val, isNew) {
    var id = 'csf-' + d.k.replace(/\./g, '-'), lab = L(d.ar, d.en) + (d.req ? ' <span class="req">*</span>' : ''), inner = '';
    if (d.addOnly && !isNew) return '';
    if (d.type === 'text') inner = '<input class="cs-in" id="' + id + '" type="text" maxlength="' + (d.max || 200) + '" value="' + esc(val) + '">';
    else if (d.type === 'textarea') inner = '<textarea class="cs-ta" id="' + id + '" rows="' + (d.rows || 3) + '" maxlength="' + (d.max || 1000) + '">' + esc(val) + '</textarea>';
    else if (d.type === 'number') inner = '<input class="cs-in" id="' + id + '" type="number" min="' + d.min + '" max="' + d.maxv + '" step="' + (d.step || 1) + '" value="' + esc(val) + '" style="direction:ltr">';
    else if (d.type === 'select') {
      var opts = typeof d.opts === 'function' ? d.opts() : d.opts;
      inner = '<select class="cs-sel" id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(val) ? ' selected' : '') + '>' + esc(o.t) + '</option>'; }).join('') + '</select>';
    } else if (d.type === 'lines') inner = '<textarea class="cs-ta" id="' + id + '" rows="5">' + esc((val || []).join('\n')) + '</textarea>';
    else if (d.type === 'opts4') {
      var v4 = val || ['', '', '', ''];
      inner = [0, 1, 2, 3].map(function (i) {
        return '<div class="cs-opt"><span>' + (d.labels ? esc(traitName(d.labels[i])) : (L('خيار ', 'Option ') + (i + 1))) + '</span><input class="cs-in" data-o="' + i + '" maxlength="' + (d.itemMax || 200) + '" value="' + esc(v4[i]) + '"></div>';
      }).join('');
    } else if (d.type === 'nums4') {
      var n4 = val || [0, 20, 0, 0];
      inner = '<div class="cs-grid2">' + [0, 1, 2, 3].map(function (i) { return '<div class="cs-opt"><span>' + L('خيار ', 'Option ') + (i + 1) + '</span><input class="cs-in" type="number" min="0" max="1000" data-n="' + i + '" value="' + esc(n4[i]) + '" style="direction:ltr"></div>'; }).join('') + '</div>';
    } else if (d.type === 'acts4') {
      var a4 = val && val.length === 4 ? val : [0, 1, 2, 3].map(function (i) { return { text: '', pros: [], cons: [], best: i === 2 }; });
      inner = a4.map(function (a, i) {
        return '<div class="cs-act-box" data-a="' + i + '"><div class="cs-opt"><span><label class="cs-sw"><input type="radio" name="csbest" value="' + i + '"' + (a.best ? ' checked' : '') + '> ' + L('الأفضل', 'Best') + '</label></span>' +
          '<input class="cs-in" data-f="text" maxlength="300" placeholder="' + esc(L('نص التصرف ' + (i + 1), 'Action ' + (i + 1))) + '" value="' + esc(a.text) + '"></div>' +
          '<div class="cs-grid2"><div><div class="hint" style="font-size:.7rem;color:rgba(255,255,255,.4)">' + L('إيجابيات (سطر لكل نقطة)', 'Pros (one per line)') + '</div><textarea class="cs-ta" data-f="pros" rows="2">' + esc((a.pros || []).join('\n')) + '</textarea></div>' +
          '<div><div class="hint" style="font-size:.7rem;color:rgba(255,255,255,.4)">' + L('سلبيات (سطر لكل نقطة)', 'Cons (one per line)') + '</div><textarea class="cs-ta" data-f="cons" rows="2">' + esc((a.cons || []).join('\n')) + '</textarea></div></div></div>';
      }).join('');
    }
    return '<div class="cs-f"><label for="' + id + '">' + lab + '</label>' + inner + '</div>';
  }

  function openEditor(e) {
    var tab = ST.tab, isNew = !e, D = defs(tab), item = isNew ? {} : clone(e.item);
    if (isNew) {
      D.forEach(function (d) { if (d.def !== undefined) put(item, d.k, d.def); });
      if (tab === 'tools' || tab === 'challenges' || tab === 'actions') item.spec = ST.spec;
    }
    var title = (isNew ? L('إضافة', 'Add') : L('تعديل', 'Edit')) + ' — ' + L((TABS.filter(function (x) { return x.k === tab; })[0] || {}).ar, (TABS.filter(function (x) { return x.k === tab; })[0] || {}).en);
    var m = document.createElement('div'); m.className = 'cs-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="cs-sheet"><h3><i class="fas fa-pen-to-square"></i> ' + esc(title) + '</h3><div id="cs-err"></div>' +
      '<form id="cs-form" autocomplete="off">' + D.map(function (d) { return fieldHTML(d, get(item, d.k), isNew); }).join('') +
      '<div class="cs-foot"><button type="button" class="cs-btn" data-m="cancel">' + L('إلغاء', 'Cancel') + '</button><button type="submit" class="cs-btn gold" id="cs-save"><i class="fas fa-floppy-disk"></i> ' + L('حفظ وتطبيق فوراً', 'Save & apply now') + '</button></div></form></div>';
    document.body.appendChild(m);
    ST.modal = { el: m, entry: e, isNew: isNew, D: D, orig: item };
    var first = $('input,textarea,select', m); if (first) setTimeout(function () { try { first.focus(); } catch (x) {} }, 30);
    m.addEventListener('mousedown', function (ev) { if (ev.target === m) closeEditor(); });
    $('[data-m="cancel"]', m).addEventListener('click', closeEditor);
    m.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeEditor(); });
    $('#cs-form', m).addEventListener('submit', function (ev) { ev.preventDefault(); saveEditor(); });
  }
  function closeEditor() { if (ST.modal && ST.modal.el.parentNode) ST.modal.el.parentNode.removeChild(ST.modal.el); ST.modal = null; }
  function showErr(msg) { var b = ST.modal && $('#cs-err', ST.modal.el); if (b) { b.innerHTML = msg ? '<div class="cs-err">⚠️ ' + esc(msg) + '</div>' : ''; if (msg) b.scrollIntoView({ block: 'nearest' }); } }

  function linesOf(v) { return String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function collect() {
    var M = ST.modal, vals = {}, err = null;
    M.D.forEach(function (d) {
      if (d.addOnly && !M.isNew) return;
      var id = 'csf-' + d.k.replace(/\./g, '-'), el = $('#' + id, M.el), v;
      if (d.type === 'text' || d.type === 'textarea') { v = (el.value || '').replace(/\s+$/g, ''); if (d.type === 'text') v = v.replace(/\s+/g, ' ').trim(); }
      else if (d.type === 'number') { v = el.value === '' ? NaN : +el.value; if (!(v >= d.min && v <= d.maxv)) err = err || (L(d.ar, d.en) + ': ' + L('رقم بين ', 'a number between ') + d.min + ' – ' + d.maxv); }
      else if (d.type === 'select') v = d.num ? +el.value : el.value;
      else if (d.type === 'lines') { v = linesOf(el.value); if (v.length < (d.min || 0) || v.length > d.maxItems) err = err || (L(d.ar, d.en) + ': ' + L('عدد البنود يجب أن يكون بين ', 'items must be between ') + d.min + ' – ' + d.maxItems); v.forEach(function (x) { if (x.length > d.itemMax) err = err || (L(d.ar, d.en) + ': ' + L('بند أطول من ', 'an item is longer than ') + d.itemMax); }); }
      else if (d.type === 'opts4') { v = $$('[data-o]', M.el).map(function (x) { return x.value.replace(/\s+/g, ' ').trim(); }); if (v.some(function (x) { return !x; })) err = err || (L(d.ar, d.en) + ': ' + L('أكمل الخيارات الأربعة', 'fill all four options')); }
      else if (d.type === 'nums4') { v = $$('[data-n]', M.el).map(function (x) { return Math.round(+x.value || 0); }); }
      else if (d.type === 'acts4') {
        v = $$('.cs-act-box', M.el).map(function (box) {
          return { text: $('[data-f="text"]', box).value.replace(/\s+/g, ' ').trim(), pros: linesOf($('[data-f="pros"]', box).value).slice(0, 4), cons: linesOf($('[data-f="cons"]', box).value).slice(0, 4), best: false };
        });
        var bi = $('input[name="csbest"]:checked', M.el); if (bi) v[+bi.value].best = true;
        if (v.some(function (x) { return !x.text; })) err = err || (L(d.ar, d.en) + ': ' + L('أكمل نص التصرفات الأربعة', 'fill all four actions'));
      }
      if (d.req && (v === '' || v == null || (Array.isArray(v) && !v.length) || (typeof v === 'number' && isNaN(v)))) err = err || (L(d.ar, d.en) + ': ' + L('مطلوب', 'required'));
      if (d.max && typeof v === 'string' && v.length > d.max) err = err || (L(d.ar, d.en) + ': ' + L('أطول من ', 'longer than ') + d.max);
      if (v !== undefined) put(vals, d.k, v);
    });
    return { vals: vals, err: err };
  }

  function saveEditor() {
    var M = ST.modal; if (!M) return;
    var r = collect(); if (r.err) { showErr(r.err); return; }
    var tab = ST.tab, vals = r.vals, ops, okMsg;
    // challenges: sensible default XP when the owner leaves them untouched
    if (tab === 'challenges' && !vals.xp) vals.xp = [0, 1, 2, 3].map(function (i) { return i === vals.correct ? 20 : 0; });
    if (M.isNew) {
      var prefix = { tools: 't-', store: 'custom-', questions: 'qc-', challenges: 'ch-', actions: 'ac-' }[tab];
      vals.id = tab === 'specialties' ? C().newSpecId() : prefix + hex(8);
      ops = [{ op: 'add', item: vals }];
      okMsg = L('تمت الإضافة ✅ — ظهرت للمستخدمين فوراً', 'Added ✅ — live for users');
    } else {
      var fields = {};
      Object.keys(vals).forEach(function (k) {
        var cur = M.orig[k];
        if (k === 'learn') { if (!same(cur, vals.learn)) fields.learn = vals.learn; }
        else if (!same(cur, vals[k])) fields[k] = vals[k];
      });
      if (tab === 'challenges' && (('correct' in fields) || ('xp' in fields))) { fields.correct = vals.correct; fields.xp = vals.xp; }
      delete fields.spec;
      if (!Object.keys(fields).length) { closeEditor(); toast(L('لا توجد تغييرات', 'No changes')); return; }
      ops = [{ op: 'edit', id: M.entry.id, fields: fields }];
      okMsg = L('تم الحفظ ✅ — ظهر للمستخدمين فوراً', 'Saved ✅ — live for users');
    }
    var btn = $('#cs-save', M.el); if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + L('جارٍ الحفظ…', 'Saving…'); }
    showErr('');
    send(ops, okMsg).then(function () { closeEditor(); }, function (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-floppy-disk"></i> ' + L('حفظ وتطبيق فوراً', 'Save & apply now'); }
      showErr((err && err.message) || (err && err.code) || L('رفض الخادم هذا التعديل', 'The server refused this edit'));
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // Platform settings
  // ═════════════════════════════════════════════════════════════════
  function navTabs() {
    var out = [];
    $$('.nav-tab').forEach(function (t) {
      var m = /showSection\('([^']+)'\)/.exec(t.getAttribute('onclick') || '');
      if (!m || m[1] === 'adminpanel') return;
      var label = (t.textContent || '').replace(/\s+/g, ' ').trim();
      if (!out.some(function (x) { return x.id === m[1]; })) out.push({ id: m[1], label: label || m[1] });
    });
    return out;
  }
  function pv() { return (C().get('platform').values) || {}; }
  function sw(id, label, on) { return '<label class="cs-sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> ' + label + '</label>'; }
  function inp(id, label, val, max, ph, dir) { return '<div class="cs-f"><label for="' + id + '">' + label + '</label><input class="cs-in" id="' + id + '" maxlength="' + max + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"' + (dir ? ' style="direction:' + dir + '"' : '') + '></div>'; }
  function pcard(key, icon, title, inner, hint) {
    return '<div class="cs-card" data-pk="' + key + '"><h4><i class="fas ' + icon + '"></i> ' + title + '</h4>' + (hint ? '<div class="cs-note" style="font-size:.78rem">' + hint + '</div>' : '') + inner +
      '<div class="cs-foot" style="justify-content:flex-start"><button class="cs-btn gold" data-act="plat-save" data-v="' + key + '"><i class="fas fa-floppy-disk"></i> ' + L('حفظ وتطبيق فوراً', 'Save & apply now') + '</button>' +
      '<button class="cs-btn" data-act="plat-reset" data-v="' + key + '"><i class="fas fa-rotate-left"></i> ' + L('الافتراضي', 'Default') + '</button></div></div>';
  }
  var CARD_ORDER = ['brand', 'announcement', 'maintenance', 'contact', 'tabs', 'certprices'];
  function cardHTML(k) {
    var v = pv(), sn = v.siteName || {}, tg = v.tagline || {}, an = v.announcement || {}, mt = v.maintenance || {}, ct = v.contact || {}, hid = v.hiddenTabs || [], cp = v.certPrices || {};
    var core = window._AUS_CERT_CORE && window._AUS_CERT_CORE.CERT_CONFIG;
    return ({
      brand: function () { return pcard('brand', 'fa-signature', L('اسم المنصة والشعار النصي', 'Platform name & tagline'),
        '<div class="cs-grid2">' + inp('cs-sn-ar', L('الاسم (عربي)', 'Name (Arabic)'), sn.ar, 60) + inp('cs-sn-en', L('الاسم (إنجليزي)', 'Name (English)'), sn.en, 60, '', 'ltr') +
        inp('cs-tg-ar', L('الشعار (عربي)', 'Tagline (Arabic)'), tg.ar, 160) + inp('cs-tg-en', L('الشعار (إنجليزي)', 'Tagline (English)'), tg.en, 160, '', 'ltr') + '</div>',
        L('يظهر الاسم في ترويسة التطبيق وعنوان الصفحة. اتركه فارغاً للاسم الأصلي.', 'Shown in the app header and page title. Leave empty for the original name.')); },
      announcement: function () { return pcard('announcement', 'fa-bullhorn', L('إعلان عام للمستخدمين', 'Announcement banner'),
        sw('cs-an-on', L('إظهار الإعلان', 'Show the announcement'), an.enabled) +
        '<div class="cs-grid2" style="margin-top:.7rem"><div class="cs-f"><label>' + L('النوع', 'Style') + '</label><select class="cs-sel" id="cs-an-lv">' +
        ['info', 'success', 'warning'].map(function (x) { return '<option value="' + x + '"' + ((an.level || 'info') === x ? ' selected' : '') + '>' + ({ info: L('معلومة', 'Info'), success: L('خبر سار', 'Good news'), warning: L('تنبيه', 'Warning') })[x] + '</option>'; }).join('') + '</select></div>' +
        inp('cs-an-exp', L('ينتهي في (اختياري)', 'Expires (optional)'), an.expires, 32, 'YYYY-MM-DD', 'ltr') + '</div>' +
        '<div class="cs-grid2">' + inp('cs-an-ar', L('النص (عربي)', 'Text (Arabic)'), an.ar, 400) + inp('cs-an-en', L('النص (إنجليزي)', 'Text (English)'), an.en, 400, '', 'ltr') + '</div>' +
        inp('cs-an-url', L('رابط «التفاصيل» (اختياري، https فقط)', 'Details link (optional, https only)'), an.url, 480, 'https://…', 'ltr'),
        L('يظهر أعلى التطبيق لكل المستخدمين لحظياً، ويستطيع كل مستخدم إغلاقه.', 'Appears at the top of the app for every user, live; each user can dismiss it.')); },
      maintenance: function () { return pcard('maintenance', 'fa-screwdriver-wrench', L('وضع الصيانة', 'Maintenance notice'),
        sw('cs-mt-on', L('إظهار شريط الصيانة', 'Show the maintenance bar'), mt.enabled) +
        '<div class="cs-grid2" style="margin-top:.7rem">' + inp('cs-mt-ar', L('الرسالة (عربي)', 'Message (Arabic)'), mt.ar, 300) + inp('cs-mt-en', L('الرسالة (إنجليزي)', 'Message (English)'), mt.en, 300, '', 'ltr') + '</div>',
        L('شريط تنبيه فقط — لا يمنع أحداً من استخدام التطبيق.', 'A notice bar only — nobody is blocked from using the app.')); },
      contact: function () { return pcard('contact', 'fa-address-book', L('بيانات التواصل', 'Contact details'),
        '<div class="cs-grid2">' + inp('cs-ct-em', L('البريد', 'E-mail'), ct.email, 190, 'support@…', 'ltr') + inp('cs-ct-wa', L('واتساب', 'WhatsApp'), ct.whatsapp, 30, '+962…', 'ltr') + inp('cs-ct-site', L('الموقع', 'Website'), ct.site, 480, 'https://…', 'ltr') + '</div>'); },
      tabs: function () { return pcard('tabs', 'fa-eye-slash', L('إخفاء أقسام عن المستخدمين', 'Hide sections from users'),
        '<div class="cs-chk">' + navTabs().map(function (t) { return '<label><input type="checkbox" data-hide="' + esc(t.id) + '"' + (hid.indexOf(t.id) !== -1 ? ' checked' : '') + '> ' + esc(t.label) + '</label>'; }).join('') + '</div>',
        L('الأقسام المحدّدة تختفي من شريط التنقل عند الجميع إلا أنت (تظهر لك بإطار متقطّع).', 'Ticked sections disappear from the navigation for everyone but you (shown to you with a dashed outline).')); },
      certprices: function () { return pcard('certprices', 'fa-award', L('أسعار الشهادات الاحترافية', 'Professional certificate prices'),
        '<div class="cs-grid2"><div class="cs-f"><label for="cs-cp-k">' + L('شهادة المعرفة (د.أ)', 'Knowledge certificate (JOD)') + '</label><input class="cs-in" id="cs-cp-k" type="number" min="0" max="1000" step="0.5" style="direction:ltr" value="' + esc(cp.knowledge != null ? cp.knowledge : (core ? core.knowledge.price : 5)) + '"></div>' +
        '<div class="cs-f"><label for="cs-cp-p">' + L('شهادة الممارسة (د.أ)', 'Practical certificate (JOD)') + '</label><input class="cs-in" id="cs-cp-p" type="number" min="0" max="1000" step="0.5" style="direction:ltr" value="' + esc(cp.practical != null ? cp.practical : (core ? core.practical.price : 10)) + '"></div></div>',
        L('السعر المعروض والسعر الذي يتحقق منه الخادم في دفع PayPal يتغيّران معاً.', 'The displayed price and the one the server checks on PayPal payments change together.')); }
    })[k]();
  }
  function platformHTML() { return '<div id="cs-plat">' + CARD_ORDER.map(cardHTML).join('') + '</div>'; }
  // after a save only THAT card is redrawn, so what the owner has typed (but not yet saved) in the other cards is never lost
  function redrawCard(k) {
    var el = $('[data-pk="' + k + '"]', ST.root); if (!el) return;
    var t = document.createElement('div'); t.innerHTML = cardHTML(k); el.parentNode.replaceChild(t.firstChild, el);
  }
  function val(id) { var e = $('#' + id, ST.root); return e ? e.value.replace(/\s+/g, ' ').trim() : ''; }
  function chk(id) { var e = $('#' + id, ST.root); return !!(e && e.checked); }
  function savePlatform(k) {
    var op;
    if (k === 'brand') {
      var ops = [];
      var sn = { ar: val('cs-sn-ar'), en: val('cs-sn-en') }, tg = { ar: val('cs-tg-ar'), en: val('cs-tg-en') };
      ops.push((sn.ar || sn.en) ? { op: 'set', key: 'siteName', value: sn } : { op: 'unset', key: 'siteName' });
      ops.push((tg.ar || tg.en) ? { op: 'set', key: 'tagline', value: tg } : { op: 'unset', key: 'tagline' });
      return platSend(ops, 'brand');
    }
    if (k === 'announcement') op = { op: 'set', key: 'announcement', value: { enabled: chk('cs-an-on'), level: val('cs-an-lv') || 'info', ar: val('cs-an-ar'), en: val('cs-an-en'), url: val('cs-an-url'), expires: val('cs-an-exp') } };
    else if (k === 'maintenance') op = { op: 'set', key: 'maintenance', value: { enabled: chk('cs-mt-on'), ar: val('cs-mt-ar'), en: val('cs-mt-en') } };
    else if (k === 'contact') op = { op: 'set', key: 'contact', value: { email: val('cs-ct-em'), whatsapp: val('cs-ct-wa'), site: val('cs-ct-site') } };
    else if (k === 'tabs') { var ids = $$('[data-hide]', ST.root).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-hide'); }); op = ids.length ? { op: 'set', key: 'hiddenTabs', value: ids } : { op: 'unset', key: 'hiddenTabs' }; }
    else if (k === 'certprices') {
      var kn = +val('cs-cp-k'), pr = +val('cs-cp-p');
      if (!(kn >= 0 && kn <= 1000 && pr >= 0 && pr <= 1000)) { toast(L('الأسعار بين 0 و1000', 'Prices must be 0–1000'), 'heart-toast'); return; }
      op = { op: 'set', key: 'certPrices', value: { knowledge: kn, practical: pr } };
    }
    if (op) platSend([op], k);
  }
  function platSend(ops, card) { return send(ops, L('تم الحفظ والتطبيق ✅ — ظهر للمستخدمين فوراً', 'Saved ✅ — live for users')).then(function () { redrawCard(card); }, function () {}); }
  function resetPlatform(k) {
    var keys = { brand: ['siteName', 'tagline'], announcement: ['announcement'], maintenance: ['maintenance'], contact: ['contact'], tabs: ['hiddenTabs'], certprices: ['certPrices'] }[k] || [];
    platSend(keys.map(function (x) { return { op: 'unset', key: x }; }), k);
  }

  // ═════════════════════════════════════════════════════════════════
  // History (audit trail + revert)
  // ═════════════════════════════════════════════════════════════════
  var DOCLABEL = { specialties: ['التخصصات', 'Specialties'], tools: ['الأدوات', 'Tools'], store: ['المتجر', 'Store'], questions: ['أسئلة القيادة', 'Questions'], challenges: ['التحديات', 'Challenges'], actions: ['التصرفات', 'Actions'], platform: ['المنصة', 'Platform'] };
  function loadHistory() {
    var body = $('#cs-body', ST.root); if (!body) return;
    if (!ST.hist) body.innerHTML = '<div class="cs-empty"><i class="fas fa-spinner fa-spin"></i> ' + L('جارٍ جلب السجل من الخادم…', 'Loading history from the server…') + '</div>';
    C().history(null, 60).then(function (r) {
      if (ST.tab !== 'history') return;
      if (!r.ok) { body.innerHTML = '<div class="cs-note bad">⚠️ ' + L('تعذّر جلب السجل — يلزم تسجيل دخول المالك على الخادم.', 'Could not load history — owner sign-in on the server is required.') + '</div>'; return; }
      ST.hist = (r.data && r.data.changes) || []; renderHistory();
    });
  }
  function renderHistory() {
    var body = $('#cs-body', ST.root); if (!body || ST.tab !== 'history') return;
    var rows = ST.hist.map(function (c) {
      var lab = DOCLABEL[c.key] || [c.key, c.key], d = c.at ? new Date(c.at) : null;
      var when = d ? d.toLocaleString(lang() === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '';
      return '<div class="cs-hist"><span class="t">' + esc(when) + '</span><span class="cs-badge k">' + esc(L(lab[0], lab[1])) + '</span><span class="s">' + esc(c.summary || c.action) + ' <span style="color:rgba(255,255,255,.4)">· ' + esc(c.actor === 'system' ? 'system' : (c.actor || '')) + '</span></span>' +
        (c.revertible ? '<button class="cs-ia" data-act="revert" data-id="' + c.id + '" title="' + esc(L('إرجاع هذا المستند لما كان عليه قبل هذا التغيير', 'Put this document back to how it was before this change')) + '"><i class="fas fa-rotate-left"></i> ' + L('تراجع', 'Undo') + '</button>' : '') + '</div>';
    }).join('');
    body.innerHTML = '<div class="cs-note">' + L('آخر التغييرات المحفوظة على الخادم. «تراجع» يُرجع المستند كله لما كان قبل ذلك التغيير (ويُسجَّل كتغيير جديد، فلا يضيع شيء).', 'The latest changes stored on the server. "Undo" puts the whole document back to how it was before that change (recorded as a new change, so nothing is lost).') + '</div>' +
      (rows || '<div class="cs-empty">' + L('لا توجد تغييرات بعد.', 'No changes yet.') + '</div>');
  }
  function doRevert(id) {
    if (!confirm(L('التراجع عن التغيير #' + id + '؟ سيرجع المستند لحالته قبله ويظهر ذلك للمستخدمين فوراً.', 'Undo change #' + id + '? The document returns to how it was before it, live for users.'))) return;
    C().revert(id).then(function (r) {
      if (r.ok) { toast(L('تم التراجع ✅', 'Undone ✅')); ST.hist = null; loadHistory(); }
      else toast('⚠️ ' + ((r.data && r.data.error && r.data.error.message) || L('تعذّر التراجع', 'Could not undo')), 'heart-toast');
    });
  }


  // ═════════════════════════════════════════════════════════════════
  // Certificate exam banks — the server-sealed question pools behind the professional certificates.
  // Not a live CMS document (the answer keys never leave the server except to the owner): its own owner-only API,
  // /api/content/exam-bank/*, with an etag so two tabs can never overwrite each other, and a backup of every version.
  // ═════════════════════════════════════════════════════════════════
  var EX = { list: null, bank: null, spec: '', q: '', filter: 'all', page: 0, backups: null, busy: false };
  var EX_PER = 15;
  var TRACK = { knowledge: ['شهادة المعرفة', 'Knowledge'], practical: ['شهادة الممارسة', 'Practical'] };
  var QT = { mcq: ['اختيار من متعدد', 'Multiple choice', '🔘'], order: ['ترتيب', 'Ordering', '🔢'], match: ['مطابقة', 'Matching', '🔗'] };

  function exApi(m, p, b) { return C().api(m, '/api/content/exam-bank' + p, b); }
  function exErr(r) { var e = r.data && (r.data.error || r.data.detail); return (e && (e.message || (typeof e === 'string' ? e : e.code))) || ('HTTP ' + r.status); }
  function specLabel(id) { var o = specOptions().filter(function (x) { return x.v === id; })[0]; return o ? o.t : id; }

  function loadExList() {
    var body = $('#cs-body', ST.root); if (!body) return;
    body.innerHTML = '<div class="cs-empty"><i class="fas fa-spinner fa-spin"></i> ' + L('جارٍ جلب بنوك الأسئلة من الخادم…', 'Loading the exam banks from the server…') + '</div>';
    exApi('GET', '').then(function (r) {
      if (ST.tab !== 'exams') return;
      if (!r.ok) { body.innerHTML = '<div class="cs-note bad">⚠️ ' + esc(exErr(r)) + ' — ' + L('يلزم تسجيل دخول المالك على الخادم.', 'owner sign-in on the server is required.') + '</div>'; return; }
      EX.list = r.data.banks || []; renderExams();
    });
  }

  function renderExams() {
    var body = $('#cs-body', ST.root); if (!body) return;
    if (EX.bank) return renderBank(body);
    if (!EX.list) return loadExList();
    var specs = {};
    EX.list.forEach(function (b) { (specs[b.spec_id] = specs[b.spec_id] || []).push(b); });
    var ids = Object.keys(specs);
    if (!ids.length) { body.innerHTML = '<div class="cs-empty">' + L('لا توجد بنوك أسئلة على الخادم.', 'No exam banks on the server.') + '</div>'; return; }
    if (!EX.spec || ids.indexOf(EX.spec) === -1) EX.spec = ids[0];
    var byIdx = {};
    specs[EX.spec].forEach(function (b) { (byIdx[b.tool_idx] = byIdx[b.tool_idx] || {})[b.type] = b; });
    var q = (EX.q || '').toLowerCase();
    var rows = Object.keys(byIdx).map(Number).sort(function (a, b) { return a - b; }).filter(function (i) {
      return !q || ((byIdx[i].knowledge || byIdx[i].practical).tool_name || '').toLowerCase().indexOf(q) !== -1;
    }).map(function (i) {
      var k = byIdx[i].knowledge, p = byIdx[i].practical;
      function cell(b, t) {
        return b ? '<button class="cs-btn cyan" data-act="ex-open" data-id="' + esc(b.id) + '" title="' + esc(L('فتح البنك', 'Open the bank')) + '"><i class="fas fa-award"></i> ' + esc(L(TRACK[t][0], TRACK[t][1])) + ' · ' + b.pool_size + '</button>' : '';
      }
      return '<div class="cs-row"><div class="cs-ico">#' + (i + 1) + '</div><div class="cs-main"><div class="cs-name">' + esc((k || p).tool_name) + '</div>' +
        '<div class="cs-sub">' + L('أسئلة الامتحان تُسحَب عشوائياً من هذا البنك', 'Exam questions are drawn at random from this bank') + '</div></div><div class="cs-acts">' + cell(k, 'knowledge') + cell(p, 'practical') + '</div></div>';
    }).join('');
    body.innerHTML = '<div class="cs-note">🔒 ' + L('بنوك أسئلة الشهادات الاحترافية محفوظة على الخادم مع مفاتيح الإجابة، ولا تصل إلى المتصفح إلا إليك. كل حفظ يُنشئ نسخة احتياطية، وتبدأ الامتحانات التالية بالأسئلة الجديدة فوراً.', 'The professional-certificate question banks live on the server with their answer keys and reach no browser but yours. Every save keeps a backup, and the very next exams use the new questions.') + '</div>' +
      '<div class="cs-bar"><select class="cs-sel" style="max-width:260px" data-act="ex-spec">' + ids.map(function (id) { return '<option value="' + esc(id) + '"' + (id === EX.spec ? ' selected' : '') + '>' + esc(specLabel(id)) + '</option>'; }).join('') + '</select>' +
      '<input class="cs-in" id="ex-q" type="search" placeholder="' + esc(L('ابحث باسم الأداة…', 'Search by tool…')) + '" value="' + esc(EX.q) + '" data-act="ex-q"></div>' +
      '<div class="cs-list">' + (rows || '<div class="cs-empty">' + L('لا توجد نتائج.', 'No results.') + '</div>') + '</div>';
  }

  function openBank(id) {
    var body = $('#cs-body', ST.root);
    if (body) body.innerHTML = '<div class="cs-empty"><i class="fas fa-spinner fa-spin"></i> ' + L('جارٍ فتح البنك…', 'Opening the bank…') + '</div>';
    EX.page = 0; EX.filter = 'all'; EX.q = ''; EX.backups = null;
    return exApi('GET', '/' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok) { toast('⚠️ ' + exErr(r), 'heart-toast'); EX.bank = null; renderExams(); return; }
      EX.bank = r.data; renderExams();
    });
  }

  function exAnswer(q) {
    if (q.qType === 'mcq') return L('الصحيح: ', 'Correct: ') + trunc((q.options || [])[q.correctIndex], 90);
    if (q.qType === 'order') return L('الترتيب: ', 'Order: ') + trunc((q.correctOrder || []).join(' ← '), 100);
    return L('أزواج: ', 'Pairs: ') + (q.left || []).length + ' — ' + trunc((q.left || []).map(function (l, i) { return l + '→' + (q.correctPairs || [])[i]; }).join(' · '), 90);
  }

  function renderBank(body) {
    var b = EX.bank, f = EX.filter, q = (EX.q || '').toLowerCase();
    var items = b.questions.map(function (x, i) { return { q: x, i: i }; }).filter(function (e) {
      return (f === 'all' || e.q.qType === f) && (!q || (e.q.prompt || '').toLowerCase().indexOf(q) !== -1);
    });
    var pages = Math.max(1, Math.ceil(items.length / EX_PER)); if (EX.page >= pages) EX.page = pages - 1;
    var slice = items.slice(EX.page * EX_PER, EX.page * EX_PER + EX_PER);
    var counts = { mcq: 0, order: 0, match: 0 }; b.questions.forEach(function (x) { counts[x.qType] = (counts[x.qType] || 0) + 1; });
    var chips = ['all', 'mcq', 'order', 'match'].map(function (t) {
      return '<button class="cs-tab' + (f === t ? ' on' : '') + '" data-act="ex-filter" data-id="' + t + '">' + (t === 'all' ? L('الكل', 'All') + ' ' + b.questions.length : QT[t][2] + ' ' + esc(L(QT[t][0], QT[t][1])) + ' ' + counts[t]) + '</button>';
    }).join('');
    var rows = slice.map(function (e) {
      return '<div class="cs-row"><div class="cs-ico">' + QT[e.q.qType][2] + '</div><div class="cs-main"><div class="cs-name">' + esc(trunc(e.q.prompt, 200)) + '<span class="cs-badge k">#' + (e.i + 1) + '</span></div>' +
        '<div class="cs-sub">' + esc(exAnswer(e.q)) + '</div></div><div class="cs-acts"><button class="cs-ia" data-act="ex-edit" data-id="' + e.i + '"><i class="fas fa-pen"></i> ' + L('تعديل', 'Edit') + '</button>' +
        '<button class="cs-ia red" data-act="ex-del" data-id="' + e.i + '"><i class="fas fa-trash"></i> ' + L('حذف', 'Delete') + '</button></div></div>';
    }).join('');
    var pager = pages > 1 ? '<div class="cs-bar" style="justify-content:center;margin-top:.8rem"><button class="cs-btn" data-act="ex-page" data-id="' + (EX.page - 1) + '"' + (EX.page === 0 ? ' disabled' : '') + '>‹</button>' +
      '<span style="font-size:.82rem;color:rgba(255,255,255,.6)">' + (EX.page + 1) + ' / ' + pages + '</span><button class="cs-btn" data-act="ex-page" data-id="' + (EX.page + 1) + '"' + (EX.page >= pages - 1 ? ' disabled' : '') + '>›</button></div>' : '';
    var bk = EX.backups ? '<select class="cs-sel" style="max-width:260px" id="ex-bk"><option value="">' + L('النسخ الاحتياطية…', 'Backups…') + '</option>' + EX.backups.map(function (x) {
      var d = x.name.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).*$/, '$1-$2-$3 $4:$5:$6 UTC');
      return '<option value="' + esc(x.name) + '">' + esc(d) + ' · ' + x.questions + '</option>'; }).join('') + '</select><button class="cs-btn" data-act="ex-restore"><i class="fas fa-clock-rotate-left"></i> ' + L('استرجاع', 'Restore') + '</button>'
      : '<button class="cs-btn" data-act="ex-backups"><i class="fas fa-clock-rotate-left"></i> ' + L('النسخ الاحتياطية', 'Backups') + '</button>';
    body.innerHTML =
      '<div class="cs-bar"><button class="cs-btn" data-act="ex-back"><i class="fas fa-arrow-right"></i> ' + L('كل البنوك', 'All banks') + '</button>' +
      '<div class="cs-name" style="font-size:1rem">🏆 ' + esc(b.tool_name) + ' <span class="cs-badge k">' + esc(L(TRACK[b.type][0], TRACK[b.type][1])) + '</span></div>' +
      '<button class="cs-btn" data-act="ex-rename"><i class="fas fa-pen"></i> ' + L('إعادة تسمية', 'Rename') + '</button></div>' +
      '<div class="cs-note">' + L('عدد الأسئلة: ', 'Questions: ') + '<b>' + b.pool_size + '</b> · ' + L('الامتحان يسحب ', 'an exam draws ') + '<b>' + b.exam_length + '</b> ' + L('سؤالاً عشوائياً', 'random questions') + ' · ' + L('الحد الأدنى للبنك: ', 'minimum bank size: ') + b.min_pool + '</div>' +
      '<div class="cs-bar">' + chips + '</div>' +
      '<div class="cs-bar"><input class="cs-in" id="ex-q" type="search" placeholder="' + esc(L('ابحث في نص السؤال…', 'Search the question text…')) + '" value="' + esc(EX.q) + '" data-act="ex-q">' +
      ['mcq', 'order', 'match'].map(function (t) { return '<button class="cs-btn gold" data-act="ex-add" data-id="' + t + '"><i class="fas fa-plus"></i> ' + QT[t][2] + ' ' + esc(L(QT[t][0], QT[t][1])) + '</button>'; }).join('') + '</div>' +
      '<div class="cs-bar">' + bk + '</div>' +
      '<div class="cs-list">' + (rows || '<div class="cs-empty">' + L('لا توجد أسئلة مطابقة.', 'No matching questions.') + '</div>') + '</div>' + pager;
  }

  function exSend(ops, okMsg) {
    var b = EX.bank;
    return exApi('POST', '/' + encodeURIComponent(b.id) + '/ops', { ops: ops, base_etag: b.etag }).then(function (r) {
      if (r.ok && r.data && r.data.bank) { EX.bank = r.data.bank; EX.list = null; EX.backups = null; toast(okMsg || L('تم الحفظ ✅ — تستخدمه الامتحانات القادمة فوراً', 'Saved ✅ — the next exams use it right away')); renderExams(); return { ok: true }; }
      if (r.status === 409) { toast('⚠️ ' + L('تغيّر هذا البنك من مكان آخر — أُعيد تحميله، كرّر التعديل.', 'This bank changed elsewhere — it was reloaded, please repeat the edit.'), 'heart-toast'); openBank(b.id); return { ok: false, error: exErr(r), closed: true }; }
      return { ok: false, error: exErr(r) };
    });
  }

  function exEditor(type, i) {
    var b = EX.bank, isNew = i == null, cur = isNew ? { qType: type, prompt: '' } : b.questions[i];
    type = cur.qType;
    var f = '<div class="cs-f"><label for="ex-prompt">' + L('نص السؤال', 'Question') + ' <span class="req">*</span></label><textarea class="cs-ta" id="ex-prompt" rows="2" maxlength="600">' + esc(cur.prompt) + '</textarea></div>';
    if (type === 'mcq') {
      f += '<div class="cs-f"><label for="ex-opts">' + L('الخيارات (سطر لكل خيار، من 2 إلى 8، مختلفة)', 'Options (one per line, 2–8, all different)') + ' <span class="req">*</span></label><textarea class="cs-ta" id="ex-opts" rows="5">' + esc((cur.options || []).join('\n')) + '</textarea></div>' +
        '<div class="cs-f"><label for="ex-correct">' + L('رقم الخيار الصحيح', 'Number of the correct option') + ' <span class="req">*</span></label><input class="cs-in" id="ex-correct" type="number" min="1" max="8" value="' + ((cur.correctIndex != null ? cur.correctIndex : 0) + 1) + '" style="direction:ltr;max-width:120px"></div>';
    } else if (type === 'order') {
      f += '<div class="cs-f"><label for="ex-order">' + L('العناصر بالترتيب الصحيح (سطر لكل عنصر، من 3 إلى 10) — سيُخلَط العرض تلقائياً', 'Items in the CORRECT order (one per line, 3–10) — the display is shuffled automatically') + ' <span class="req">*</span></label><textarea class="cs-ta" id="ex-order" rows="6">' + esc((cur.correctOrder || []).join('\n')) + '</textarea></div>';
    } else {
      var lines = (cur.left || []).map(function (l, k) { return l + ' :: ' + (cur.correctPairs || [])[k]; }).join('\n');
      f += '<div class="cs-f"><label for="ex-pairs">' + L('الأزواج الصحيحة (سطر لكل زوج بالصيغة: المفهوم :: التعريف، من 2 إلى 8)', 'Correct pairs (one per line as: term :: definition, 2–8)') + ' <span class="req">*</span></label><textarea class="cs-ta" id="ex-pairs" rows="6">' + esc(lines) + '</textarea></div>';
    }
    var title = (isNew ? L('إضافة سؤال', 'Add a question') : L('تعديل السؤال #', 'Edit question #') + (i + 1)) + ' — ' + L(QT[type][0], QT[type][1]);
    var m = document.createElement('div'); m.className = 'cs-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="cs-sheet"><h3><i class="fas fa-pen-to-square"></i> ' + esc(title) + '</h3><div id="cs-err"></div><form id="cs-form" autocomplete="off">' + f +
      '<div class="cs-foot"><button type="button" class="cs-btn" data-m="cancel">' + L('إلغاء', 'Cancel') + '</button><button type="submit" class="cs-btn gold" id="cs-save"><i class="fas fa-floppy-disk"></i> ' + L('حفظ', 'Save') + '</button></div></form></div>';
    document.body.appendChild(m);
    ST.modal = { el: m };
    var first = $('textarea,input', m); if (first) setTimeout(function () { try { first.focus(); } catch (x) {} }, 30);
    m.addEventListener('mousedown', function (ev) { if (ev.target === m) closeEditor(); });
    $('[data-m="cancel"]', m).addEventListener('click', closeEditor);
    m.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeEditor(); });
    $('#cs-form', m).addEventListener('submit', function (ev) {
      ev.preventDefault();
      var prompt = $('#ex-prompt', m).value.replace(/\s+/g, ' ').trim(), qn, err = null;
      if (!prompt) err = L('نص السؤال مطلوب', 'The question text is required');
      if (type === 'mcq') {
        var opts = linesOf($('#ex-opts', m).value), ci = (+$('#ex-correct', m).value) - 1;
        if (opts.length < 2 || opts.length > 8) err = err || L('الخيارات بين 2 و8', 'Between 2 and 8 options');
        else if (opts.filter(function (x, k) { return opts.indexOf(x) !== k; }).length) err = err || L('الخيارات يجب أن تكون مختلفة', 'Options must all be different');
        else if (!(ci >= 0 && ci < opts.length)) err = err || L('رقم الخيار الصحيح خارج النطاق', 'The correct-option number is out of range');
        qn = { qType: 'mcq', prompt: prompt, options: opts, correctIndex: ci };
      } else if (type === 'order') {
        var items = linesOf($('#ex-order', m).value);
        if (items.length < 3 || items.length > 10) err = err || L('العناصر بين 3 و10', 'Between 3 and 10 items');
        else if (items.filter(function (x, k) { return items.indexOf(x) !== k; }).length) err = err || L('العناصر يجب أن تكون مختلفة', 'Items must all be different');
        qn = { qType: 'order', prompt: prompt, correctOrder: items };
      } else {
        var pairs = linesOf($('#ex-pairs', m).value).map(function (l) { var k = l.indexOf('::'); return k < 0 ? null : [l.slice(0, k).trim(), l.slice(k + 2).trim()]; });
        if (pairs.length < 2 || pairs.length > 8 || pairs.some(function (p) { return !p || !p[0] || !p[1]; })) err = err || L('2 إلى 8 أزواج بالصيغة: المفهوم :: التعريف', '2–8 pairs written as: term :: definition');
        qn = { qType: 'match', prompt: prompt, pairs: pairs };
      }
      if (err) { showErr(err); return; }
      var btn = $('#cs-save', m); btn.disabled = true; showErr('');
      exSend([isNew ? { op: 'add', q: qn } : { op: 'edit', i: i, q: qn }]).then(function (res) {
        if (res.ok || res.closed) closeEditor(); else { btn.disabled = false; showErr(res.error); }
      });
    });
  }

  window.AUS_STUDIO = { mount: mount, refresh: function () { if (alive()) { renderStatus(); renderAuth(); renderBody(true); } } };
})();
