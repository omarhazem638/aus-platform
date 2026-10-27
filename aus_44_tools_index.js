/* ================================================================
   AUS — دليل الأدوات (Tools Index / Directory)
   فهرس شامل لكل أدوات الأعمال (7 تخصصات × 10 أدوات = 70 أداة) مأخوذ مباشرة من
   aus_01_data.js (specialties + toolsData) — لا توجد بيانات مكرّرة هنا.

   • تبويب "دليل الأدوات" أول شريط .nav-tabs (قبل "الرئيسية") ← showSection('toolsindex')
   • بحث فوري (يفهم العربية والإنجليزية) + فلترة بالتخصص + بطاقات مجمّعة حسب التخصص
   • نقر على أي أداة ← نافذة Nano Glass فيها: شرح الأداة · المكوّنات · كيف تُستخدم في بيئة الأعمال
     + مثال واقعي · ما يميّزها (المزايا) · تحدٍّ شائع · أدوات أخرى في نفس التخصص
   • زرّان في النافذة يعيدان استخدام المنظومة الموجودة بدون نسخها:
        ابدأ التعلّم  → selectSpecialty() + showToolLearn()   (aus_02_core.js)
        اختبر نفسك   → selectSpecialty() + startToolQuiz()   (10 أسئلة)
   • الأداء: لا شيء يُرسم قبل أول فتح · مستمع واحد لكل قسم (event delegation) · بلا backdrop-filter على البطاقات
   • CSS يُحقن من هنا (لا يعتمد على نسخة styles.css) · RTL/LTR عبر خصائص منطقية · AR/EN لواجهة الدليل
   ================================================================ */
(function () {
    'use strict';
    if (window.__ausToolsIndexLoaded) return;
    window.__ausToolsIndexLoaded = true;

    /* ───────────────────────── data access ─────────────────────────
       aus_01_data.js declares these with top-level const → global lexical bindings (not window.* props). */
    function _specs() { return (typeof specialties !== 'undefined' && Array.isArray(specialties)) ? specialties : []; }
    function _toolsOf(id) { return (typeof toolsData !== 'undefined' && toolsData && Array.isArray(toolsData[id])) ? toolsData[id] : []; }
    // tools the owner hid from the Admin Panel stay in the array (their position is part of the certificate id) but are not listed
    function _shownCount(id) { return _toolsOf(id).filter(function (t) { return !t.hidden; }).length; }
    function _$(id) { return document.getElementById(id); }
    function _esc(t) {
        return (t == null ? '' : String(t)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ───────────────────────── look-up tables ───────────────────────── */
    // per-specialty accent: [css colour, "r,g,b"]  (cyan + gold stay the brand colours; the rest are neighbours on the same wheel)
    var ACCENT = {
        business:   ['#00d4ff', '0,212,255'],
        accounting: ['#d4af37', '212,175,55'],
        hr:         ['#c77dff', '199,125,255'],
        marketing:  ['#ff4d94', '255,77,148'],
        fintech:    ['#00f5d4', '0,245,212'],
        mis:        ['#4d9bff', '77,155,255'],
        logistics:  ['#ffd60a', '255,214,10']
    };
    var SPEC_EN = {
        business: 'Business Administration', accounting: 'Accounting', hr: 'Human Resources',
        marketing: 'Digital Marketing', fintech: 'Finance & FinTech', mis: 'Management Information Systems',
        logistics: 'Logistics & Supply Chain'
    };
    // nav-tab label for every language the app can switch to (setLang → <html lang>)
    var TAB_LABEL = {
        ar: 'دليل الأدوات', en: 'Tools Index', de: 'Werkzeug-Index', fr: 'Index des outils', es: 'Índice de herramientas',
        tr: 'Araç Dizini', ja: 'ツール一覧', zh: '工具索引', ko: '도구 색인', ru: 'Указатель инструментов', it: 'Indice strumenti'
    };
    // directory chrome — Arabic first, English for every other language (the tool texts themselves are Arabic data)
    var UI = {
        ar: {
            title: 'دليل الأدوات',
            sub: 'فهرس شامل لأدوات الأعمال في AUS — اختر أداة لتعرف كيف تُستخدم وما الذي يميّزها، ثم ابدأ تعلّمها أو اختبر نفسك فوراً',
            ph: 'ابحث عن أداة أو مفهوم…',
            filterLbl: 'تصفية حسب التخصص',
            all: 'الكل',
            count: 'عرض {n} من {t} أداة',
            none: 'لا توجد أداة تطابق «{q}»',
            noneHint: 'جرّب كلمة أخرى أو اختر تخصصاً مختلفاً',
            clear: 'مسح البحث',
            close: 'إغلاق',
            secWhat: 'ما هي هذه الأداة؟',
            secParts: 'المكوّنات والمفاهيم الأساسية',
            secHow: 'كيف تُستخدم في بيئة الأعمال؟',
            secExample: 'مثال واقعي',
            secUvp: 'ما يميّز هذه الأداة',
            secPitfall: 'تحدٍّ شائع',
            secRelated: 'أدوات أخرى في {spec}',
            learn: 'ابدأ التعلّم',
            quiz: 'اختبر نفسك',
            quizSub: '10 أسئلة'
        },
        en: {
            title: 'Tools Index',
            sub: 'A complete directory of the business tools in AUS — pick one to see how it is used and what makes it stand out, then start learning or test yourself right away',
            ph: 'Search tools or concepts…',
            filterLbl: 'Filter by specialty',
            all: 'All',
            count: 'Showing {n} of {t} tools',
            none: 'No tool matches “{q}”',
            noneHint: 'Try another word or pick a different specialty',
            clear: 'Clear search',
            close: 'Close',
            secWhat: 'What is it?',
            secParts: 'Core components & concepts',
            secHow: 'How is it used in business?',
            secExample: 'Real-world example',
            secUvp: 'What makes it stand out',
            secPitfall: 'Common pitfall',
            secRelated: 'More tools in {spec}',
            learn: 'Start learning',
            quiz: 'Test yourself',
            quizSub: '10 questions'
        }
    };

    function _langCode() { return String(document.documentElement.lang || 'ar').slice(0, 2).toLowerCase(); }
    function _isAr() { return _langCode() === 'ar'; }
    function _ui() { return _isAr() ? UI.ar : UI.en; }
    function _specName(s) { return _isAr() ? s.name : (SPEC_EN[s.id] || s.name); }
    function _accent(id) { return ACCENT[id] || ACCENT.business; }
    function _fmt(str, vars) { return str.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
    function _nTools(n) {
        if (!_isAr()) return n + (n === 1 ? ' tool' : ' tools');
        if (n === 1) return 'أداة واحدة';
        if (n === 2) return 'أداتان';
        return n + (n <= 10 ? ' أدوات' : ' أداة');
    }
    function _reduced() {
        try { return document.body.classList.contains('reduce-motion') || window.__AUS_FX_ON === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
        catch (e) { return false; }
    }
    // same folding the rest of the app uses for Arabic search (alef/ya/ta-marbuta/diacritics) — falls back to plain lower-casing
    function _norm(s) {
        s = (s == null ? '' : String(s));
        if (typeof window.normalizeAr === 'function') { try { return window.normalizeAr(s); } catch (e) {} }
        return s.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    /* ───────────────────────── state + search index ───────────────────────── */
    var state = { q: '', spec: 'all', cur: null, lastFocus: null, builtLang: null, timer: 0, closeTimer: 0 };
    var idx = [];      // one entry per tool: { s: specialtyId, i: indexInSpecialty, tool, n: name, d: desc, r: the rest of the text }

    function _buildIndex() {
        if (idx.length) return;
        _specs().forEach(function (sp) {
            _toolsOf(sp.id).forEach(function (t, i) {
                if (t.hidden) return;
                var l = t.learn || {};
                idx.push({
                    s: sp.id, i: i, tool: t,
                    n: _norm(t.name),
                    d: _norm(t.desc),
                    r: _norm([sp.name, SPEC_EN[sp.id] || '', l.intro || '', (l.points || []).join(' '), l.useCase || ''].join(' '))
                });
            });
        });
    }
    // AND over the search words; a hit in the name outranks one in the description, which outranks one in the body text
    function _score(e, terms) {
        var total = 0;
        for (var k = 0; k < terms.length; k++) {
            var w = terms[k];
            if (e.n.indexOf(w) !== -1) total += 3;
            else if (e.d.indexOf(w) !== -1) total += 2;
            else if (e.r.indexOf(w) !== -1) total += 1;
            else return 0;
        }
        return total;
    }

    /* ───────────────────────── styles (injected once) ───────────────────────── */
    function _ensureStyles() {
        if (_$('ti-styles')) return;
        var css = [
            'html{--ti-s:1}',
            'html[dir="rtl"]{--ti-s:-1}',

            /* ── nav tab: same angled pill as its neighbours, plus a cyan→violet glass tint and a slow holographic sheen ── */
            '.nav-tab.ti-tab{position:relative;overflow:hidden;flex:0 0 auto}',      /* overflow:hidden lets a flex item shrink to 0 → pin its size like its neighbours */
            '.nav-tab.ti-tab:not(.active):not(:hover){border-color:rgba(0,212,255,.5);background:linear-gradient(135deg,rgba(0,212,255,.13),rgba(157,78,221,.12))}',
            '.nav-tab.ti-tab:not(.active)>i{color:#00d4ff;filter:drop-shadow(0 0 6px rgba(0,212,255,.85))}',
            '.nav-tab.ti-tab::after{content:"";position:absolute;inset:0;pointer-events:none;',
            '  background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.22) 50%,transparent 62%);',
            '  transform:translateX(calc(var(--ti-s) * -130%));animation:ti-sheen 6.5s ease-in-out infinite}',
            '.nav-tab.ti-tab.active::after{animation:none;opacity:0}',
            '@keyframes ti-sheen{0%,70%{transform:translateX(calc(var(--ti-s) * -130%))}100%{transform:translateX(calc(var(--ti-s) * 130%))}}',

            /* ── toolbar ── */
            '#toolsindex .ti-toolbar{max-width:1100px;margin:0 auto 1.6rem;display:flex;flex-direction:column;gap:14px}',
            '.ti-search{position:relative;display:flex;align-items:center}',
            '.ti-search>i{position:absolute;inset-inline-start:18px;color:rgba(255,255,255,.45);pointer-events:none}',
            '.ti-search input{width:100%;padding:14px 18px;padding-inline-start:48px;font:600 1rem "Tajawal",sans-serif;color:#fff;',
            '  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px;outline:none;',
            '  transition:border-color .25s,box-shadow .25s,background .25s}',
            '.ti-search input::placeholder{color:rgba(255,255,255,.42)}',
            '.ti-search input:focus{border-color:rgba(0,212,255,.6);background:rgba(255,255,255,.08);box-shadow:0 0 0 3px rgba(0,212,255,.14),0 0 26px rgba(0,212,255,.14)}',
            '.ti-chips{display:flex;flex-wrap:wrap;gap:8px}',
            '.ti-chip{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;cursor:pointer;touch-action:manipulation;',
            '  font:700 .85rem "Tajawal",sans-serif;color:rgba(255,255,255,.82);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);',
            '  transition:background .2s,border-color .2s,color .2s,transform .2s;-webkit-tap-highlight-color:transparent}',
            '.ti-chip b{font-weight:800;font-size:.72rem;padding:1px 8px;border-radius:999px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.75)}',
            '.ti-chip:hover{border-color:rgba(0,212,255,.55);color:#fff;transform:translateY(-1px)}',
            '.ti-chip.active{color:#0a0812;background:linear-gradient(135deg,#d4af37,#f4d675);border-color:transparent;box-shadow:0 6px 20px rgba(212,175,55,.28)}',
            '.ti-chip.active b{background:rgba(10,8,18,.16);color:#0a0812}',
            '.ti-count{font-size:.85rem;color:rgba(255,255,255,.55);min-height:1.3em}',

            /* ── groups + cards ── */
            '.ti-group{max-width:1100px;margin:0 auto 2.2rem}',
            '.ti-group-h{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.1)}',
            '.ti-group-ico{font-size:1.5rem;filter:drop-shadow(0 0 8px rgba(var(--ti-rgb),.7))}',
            '.ti-group-h h2{margin:0;font-size:1.15rem;font-weight:800;color:#fff}',
            '.ti-group-n{margin-inline-start:auto;font-size:.78rem;font-weight:700;color:rgba(255,255,255,.55)}',
            '.ti-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}',
            '.ti-card{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;text-align:start;cursor:pointer;touch-action:manipulation;',
            '  color:#fff;font-family:"Tajawal",sans-serif;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px;',
            '  transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease,background .2s ease;-webkit-tap-highlight-color:transparent}',
            '.ti-card:hover,.ti-card:focus-visible{transform:translateY(-3px);outline:none;border-color:var(--ti-c);background:rgba(255,255,255,.09);',
            '  box-shadow:0 14px 34px rgba(0,0,0,.4),0 0 22px rgba(var(--ti-rgb),.3)}',
            '.ti-card:active{transform:translateY(-1px)}',
            '.ti-card-ico{flex:0 0 auto;width:46px;height:46px;display:grid;place-items:center;font-size:1.5rem;border-radius:14px;',
            '  background:rgba(var(--ti-rgb),.14);border:1px solid rgba(var(--ti-rgb),.38);box-shadow:inset 0 0 14px rgba(var(--ti-rgb),.18)}',
            '.ti-card-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
            '.ti-card-name{font-weight:800;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '.ti-card-desc{font-size:.8rem;line-height:1.55;color:rgba(255,255,255,.62);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
            '.ti-card-go{flex:0 0 auto;font-size:.8rem;color:rgba(255,255,255,.35);transition:color .2s,transform .2s}',
            'html[dir="rtl"] .ti-card-go i{display:inline-block;transform:scaleX(-1)}',
            '.ti-card:hover .ti-card-go,.ti-card:focus-visible .ti-card-go{color:var(--ti-c);transform:translateX(calc(var(--ti-s) * 3px))}',
            '.ti-empty{max-width:520px;margin:2rem auto;padding:2rem 1.5rem;text-align:center;color:rgba(255,255,255,.75);',
            '  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px}',
            '.ti-empty .ti-empty-ico{font-size:2.2rem;margin-bottom:.6rem;filter:drop-shadow(0 0 14px rgba(0,212,255,.6))}',
            '.ti-empty p{margin:.3rem 0 1rem;font-size:.9rem;color:rgba(255,255,255,.55)}',

            /* ── detail modal (Nano Glass) ── */
            'html.ti-lock{overflow:hidden;scrollbar-gutter:stable}',
            '.ti-modal{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:18px}',
            '.ti-modal.open{display:flex}',
            '.ti-backdrop{position:absolute;inset:0;background:rgba(0,4,12,.74);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:ti-fade .22s ease both}',
            '.ti-sheet{position:relative;width:min(720px,100%);max-height:min(88vh,860px);display:flex;flex-direction:column;overflow:hidden;outline:none;',
            '  color:#fff;font-family:"Tajawal",sans-serif;',
            '  background:linear-gradient(rgba(255,255,255,.06),rgba(255,255,255,.06)),rgba(5,10,26,.86);',
            '  -webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);',
            '  border:1px solid rgba(255,255,255,.12);border-radius:18px;',
            '  box-shadow:0 20px 50px rgba(0,0,0,.4),0 0 60px rgba(var(--ti-rgb),.14);animation:ti-pop .26s cubic-bezier(.2,.9,.3,1.08) both}',
            '.ti-sheet::before{content:"";position:absolute;top:0;inset-inline:0;height:2px;background:linear-gradient(90deg,transparent,rgba(var(--ti-rgb),.95),#d4af37,transparent)}',
            '.ti-modal.closing .ti-sheet{animation:ti-pop-out .16s ease both}',
            '.ti-modal.closing .ti-backdrop{animation:ti-fade-out .16s ease both}',
            '.ti-x{position:absolute;top:12px;inset-inline-end:12px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer;z-index:2;',
            '  color:rgba(255,255,255,.8);font-size:1rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;',
            '  transition:background .2s,color .2s,border-color .2s;-webkit-tap-highlight-color:transparent}',
            '.ti-x:hover{background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.3)}',
            '.ti-head{display:flex;gap:16px;align-items:flex-start;padding:24px 24px 14px;padding-inline-end:62px}',      /* end padding keeps the title clear of the ✕ */
            '.ti-head-ico{flex:0 0 auto;width:64px;height:64px;display:grid;place-items:center;font-size:2rem;border-radius:18px;',
            '  background:rgba(var(--ti-rgb),.14);border:1px solid rgba(var(--ti-rgb),.45);box-shadow:inset 0 0 18px rgba(var(--ti-rgb),.2),0 0 26px rgba(var(--ti-rgb),.22)}',
            '.ti-head-txt{min-width:0}',
            '.ti-head h3{margin:0 0 6px;font-size:1.4rem;font-weight:900;line-height:1.3;overflow-wrap:anywhere}',
            '.ti-spec{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:700;padding:3px 11px;border-radius:999px;',
            '  background:rgba(var(--ti-rgb),.15);border:1px solid rgba(var(--ti-rgb),.42);color:#fff}',
            '.ti-head p{margin:9px 0 0;font-size:.92rem;line-height:1.65;color:rgba(255,255,255,.72)}',
            '.ti-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:6px 24px 20px;display:flex;flex-direction:column;gap:16px;',
            '  scrollbar-width:thin;scrollbar-color:rgba(var(--ti-rgb),.4) transparent}',
            '.ti-sec h4{display:flex;align-items:center;gap:8px;margin:0 0 7px;font-size:.95rem;font-weight:800;color:var(--ti-c)}',
            '.ti-sec p{margin:0;font-size:.93rem;line-height:1.9;color:rgba(255,255,255,.84)}',
            '.ti-sec ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}',
            '.ti-sec li{position:relative;padding-inline-start:22px;font-size:.9rem;line-height:1.75;color:rgba(255,255,255,.84)}',
            '.ti-sec li::before{content:"";position:absolute;inset-inline-start:3px;top:.72em;width:7px;height:7px;border-radius:50%;background:var(--ti-c);box-shadow:0 0 8px var(--ti-c)}',
            '.ti-box{padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05)}',
            '.ti-uvp{background:linear-gradient(135deg,rgba(212,175,55,.14),rgba(212,175,55,.04));border-color:rgba(212,175,55,.4)}',
            '.ti-uvp h4{color:#f4d675}',
            '.ti-uvp li::before{content:"\\2713";top:0;width:auto;height:auto;border-radius:0;background:none;box-shadow:none;color:#f4d675;font-weight:900;font-size:.85rem;inset-inline-start:2px}',
            '.ti-example{background:linear-gradient(135deg,rgba(0,212,255,.1),rgba(0,212,255,.03));border-color:rgba(0,212,255,.3)}',
            '.ti-pitfall{background:linear-gradient(135deg,rgba(255,120,80,.1),rgba(255,120,80,.03));border-color:rgba(255,120,80,.32)}',
            '.ti-pitfall h4{color:#ff9d7a}',
            '.ti-rels{display:flex;flex-wrap:wrap;gap:8px}',
            '.ti-rel{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;cursor:pointer;touch-action:manipulation;',
            '  font:700 .8rem "Tajawal",sans-serif;color:rgba(255,255,255,.82);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);',
            '  transition:border-color .2s,background .2s,color .2s}',
            '.ti-rel:hover,.ti-rel:focus-visible{outline:none;border-color:var(--ti-c);background:rgba(var(--ti-rgb),.14);color:#fff}',
            '.ti-foot{flex:0 0 auto;display:flex;gap:10px;padding:14px 24px calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2)}',
            '.ti-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border-radius:14px;border:1px solid transparent;cursor:pointer;touch-action:manipulation;',
            '  font:800 .98rem "Tajawal",sans-serif;transition:transform .2s,box-shadow .2s,filter .2s;-webkit-tap-highlight-color:transparent}',
            '.ti-btn small{font-size:.72rem;font-weight:700;opacity:.75}',
            '.ti-btn:hover{transform:translateY(-2px)}',
            '.ti-btn:active{transform:translateY(0)}',
            '.ti-btn-gold{color:#0a0812;background:linear-gradient(135deg,#d4af37,#f4d675);box-shadow:0 8px 24px rgba(212,175,55,.3)}',
            '.ti-btn-gold:hover{box-shadow:0 12px 30px rgba(212,175,55,.45)}',
            '.ti-btn-cyan{color:#00d4ff;background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.55);box-shadow:0 0 18px rgba(0,212,255,.14)}',
            '.ti-btn-cyan:hover{background:rgba(0,212,255,.2);box-shadow:0 0 26px rgba(0,212,255,.3)}',
            '.ti-x:focus-visible,.ti-btn:focus-visible,.ti-chip:focus-visible,.ti-search input:focus-visible{outline:2px solid #00f5d4;outline-offset:2px}',
            '@keyframes ti-fade{from{opacity:0}to{opacity:1}}',
            '@keyframes ti-fade-out{from{opacity:1}to{opacity:0}}',
            '@keyframes ti-pop{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}',
            '@keyframes ti-pop-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(12px) scale(.98)}}',

            /* ── phones: the sheet becomes a bottom sheet, the grid a single column ── */
            '@media (max-width:640px){',
            '  .ti-grid{grid-template-columns:1fr}',
            '  .ti-chips{flex-wrap:nowrap;overflow-x:auto;margin-inline:-2px;padding:2px;scrollbar-width:none}',
            '  .ti-chips::-webkit-scrollbar{display:none}',
            '  .ti-chip{flex:0 0 auto}',
            '  .ti-modal{padding:0;align-items:flex-end}',
            '  .ti-sheet{width:100%;max-height:92vh;max-height:92dvh;border-radius:18px 18px 0 0}',
            '  .ti-head{padding:20px 18px 12px;padding-inline-end:56px;gap:12px}',
            '  .ti-head-ico{width:54px;height:54px;font-size:1.7rem;border-radius:16px}',
            '  .ti-head h3{font-size:1.2rem}',
            '  .ti-body{padding-inline:18px}',
            '  .ti-foot{padding-inline:18px}',
            '}',
            '@media (max-width:480px){.ti-btn{white-space:nowrap;padding-inline:10px}.ti-btn small{display:none}}',      /* two buttons side by side: keep each on one line */

            /* ── motion off: OS setting or the app\'s own "reduce motion" switch ── */
            '@media (prefers-reduced-motion:reduce){',
            '  .nav-tab.ti-tab::after{animation:none;opacity:0}',
            '  .ti-backdrop,.ti-sheet,.ti-modal.closing .ti-sheet,.ti-modal.closing .ti-backdrop{animation:none}',
            '  .ti-card,.ti-chip,.ti-btn{transition:none}',
            '}',
            'body.reduce-motion .nav-tab.ti-tab::after{animation:none;opacity:0}',
            'body.reduce-motion .ti-backdrop,body.reduce-motion .ti-sheet,body.reduce-motion .ti-modal.closing .ti-sheet,body.reduce-motion .ti-modal.closing .ti-backdrop{animation:none}'
        ].join('\n');
        var s = document.createElement('style');
        s.id = 'ti-styles';
        s.textContent = css;
        document.head.appendChild(s);
    }

    /* ───────────────────────── section: shell + results ───────────────────────── */
    function _shellHTML(U) {
        var chips = '<button type="button" class="ti-chip" data-f="all" aria-pressed="false">' + _esc(U.all) + ' <b>' + idx.length + '</b></button>' +
            _specs().map(function (sp) {
                return '<button type="button" class="ti-chip" data-f="' + _esc(sp.id) + '" aria-pressed="false">' +
                    '<span aria-hidden="true">' + _esc(sp.icon) + '</span> ' + _esc(_specName(sp)) + ' <b>' + _shownCount(sp.id) + '</b></button>';
            }).join('');
        return '<div class="section-title"><h1>🗂️ ' + _esc(U.title) + '</h1><p>' + _esc(U.sub) + '</p></div>' +
            '<div class="ti-toolbar">' +
                '<label class="ti-search"><i class="fas fa-search" aria-hidden="true"></i>' +
                    '<input id="tiSearch" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" ' +
                        'placeholder="' + _esc(U.ph) + '" aria-label="' + _esc(U.ph) + '" value="' + _esc(state.q) + '"></label>' +
                '<div class="ti-chips" role="group" aria-label="' + _esc(U.filterLbl) + '">' + chips + '</div>' +
                '<div class="ti-count" id="tiCount" aria-live="polite"></div>' +
            '</div>' +
            '<div id="tiResults"></div>';
    }

    function _cardHTML(e) {
        var t = e.tool;
        return '<button type="button" class="ti-card" data-s="' + _esc(e.s) + '" data-i="' + e.i + '" aria-haspopup="dialog">' +
            '<span class="ti-card-ico" aria-hidden="true">' + _esc(t.icon) + '</span>' +
            '<span class="ti-card-main"><span class="ti-card-name">' + _esc(t.name) + '</span><span class="ti-card-desc">' + _esc(t.desc) + '</span></span>' +
            '<span class="ti-card-go" aria-hidden="true"><i class="fas fa-chevron-right"></i></span></button>';
    }

    function _groupHTML(sp, rows) {
        var a = _accent(sp.id);
        return '<div class="ti-group" style="--ti-c:' + a[0] + ';--ti-rgb:' + a[1] + '">' +
            '<div class="ti-group-h"><span class="ti-group-ico" aria-hidden="true">' + _esc(sp.icon) + '</span>' +
            '<h2>' + _esc(_specName(sp)) + '</h2><span class="ti-group-n">' + _esc(_nTools(rows.length)) + '</span></div>' +
            '<div class="ti-grid">' + rows.map(_cardHTML).join('') + '</div></div>';
    }

    function _paint() {
        var host = _$('tiResults');
        if (!host) return;
        var U = _ui();
        var valid = state.spec === 'all' || _specs().some(function (s) { return s.id === state.spec; });
        if (!valid) state.spec = 'all';
        var terms = _norm(state.q).split(' ').filter(Boolean);
        var groups = [], shown = 0;
        _specs().forEach(function (sp) {
            if (state.spec !== 'all' && state.spec !== sp.id) return;
            var rows = idx.filter(function (e) { return e.s === sp.id; }), best = 0;
            if (terms.length) {
                var scored = rows.map(function (e) { return { e: e, sc: _score(e, terms) }; })
                    .filter(function (r) { return r.sc > 0; })
                    .sort(function (a, b) { return (b.sc - a.sc) || (a.e.i - b.e.i); });
                best = scored.length ? scored[0].sc : 0;
                rows = scored.map(function (r) { return r.e; });
            }
            if (!rows.length) return;
            shown += rows.length;
            groups.push({ sp: sp, rows: rows, best: best });
        });
        // while searching, the specialty holding the strongest hit comes first (stable: ties keep the normal order)
        if (terms.length) groups = groups.map(function (g, k) { g.k = k; return g; }).sort(function (a, b) { return (b.best - a.best) || (a.k - b.k); });
        var out = groups.map(function (g) { return _groupHTML(g.sp, g.rows); }).join('');
        host.innerHTML = out || ('<div class="ti-empty"><div class="ti-empty-ico" aria-hidden="true">🔎</div>' +
            '<strong>' + _esc(_fmt(U.none, { q: state.q })) + '</strong><p>' + _esc(U.noneHint) + '</p>' +
            '<button type="button" class="ti-btn ti-btn-cyan" data-ti-clear style="flex:none;margin:0 auto">' + _esc(U.clear) + '</button></div>');
        var cnt = _$('tiCount');
        if (cnt) cnt.textContent = out ? _fmt(U.count, { n: shown, t: idx.length }) : '';
        var chips = document.querySelectorAll('#toolsindex .ti-chip');
        for (var c = 0; c < chips.length; c++) {
            var on = chips[c].getAttribute('data-f') === state.spec;
            chips[c].classList.toggle('active', on);
            chips[c].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
    }

    function _bindHost(host) {
        if (host._tiBound) return;
        host._tiBound = true;
        host.addEventListener('click', function (ev) {
            var card = ev.target.closest('.ti-card');
            if (card) { openToolDetail(card.getAttribute('data-s'), card.getAttribute('data-i')); return; }
            var chip = ev.target.closest('.ti-chip');
            if (chip) { state.spec = chip.getAttribute('data-f') || 'all'; _paint(); return; }
            if (ev.target.closest('[data-ti-clear]')) {
                state.q = '';
                var inp = _$('tiSearch');
                if (inp) { inp.value = ''; inp.focus(); }
                _paint();
            }
        });
        host.addEventListener('input', function (ev) {
            if (ev.target.id !== 'tiSearch') return;
            state.q = ev.target.value;
            clearTimeout(state.timer);
            state.timer = setTimeout(_paint, 110);           // one repaint per pause in typing, not per key
        });
        host.addEventListener('keydown', function (ev) {
            if (ev.target.id !== 'tiSearch') return;
            if (ev.key === 'Escape' && ev.target.value) { ev.target.value = ''; state.q = ''; _paint(); ev.stopPropagation(); }
            else if (ev.key === 'Enter') ev.target.blur();   // phones: dismiss the keyboard, results are already live
        });
    }

    // Called by showSection('toolsindex'). Nothing is built before the first visit; later visits only re-sync.
    function renderToolsIndex() {
        var host = _$('toolsindex');
        if (!host) return;
        _buildIndex();
        var lang = _langCode();
        if (state.builtLang !== lang || !_$('tiResults')) {
            host.innerHTML = _shellHTML(_ui());
            state.builtLang = lang;
            _bindHost(host);
        }
        _paint();
    }

    // programmatic entry: openToolsIndex() or openToolsIndex('fintech') — optional specialty pre-filter
    function openToolsIndex(specId) {
        if (specId) state.spec = String(specId);
        if (typeof window.showSection === 'function') window.showSection('toolsindex');
    }

    /* ───────────────────────── detail modal ───────────────────────── */
    function _list(items, cls) {
        items = (items || []).filter(Boolean);
        return items.length ? '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + items.map(function (x) { return '<li>' + _esc(x) + '</li>'; }).join('') + '</ul>' : '';
    }

    function _detailHTML(sid, i, U) {
        var sp = _specs().filter(function (s) { return s.id === sid; })[0];
        var tools = _toolsOf(sid), t = tools[i];
        if (!sp || !t) return '';
        var l = t.learn || {};
        var sections = '';
        if (l.intro) sections += '<div class="ti-sec"><h4><i class="fas fa-book" aria-hidden="true"></i> ' + _esc(U.secWhat) + '</h4><p>' + _esc(l.intro) + '</p></div>';
        if (l.points && l.points.length) sections += '<div class="ti-sec"><h4><i class="fas fa-key" aria-hidden="true"></i> ' + _esc(U.secParts) + '</h4>' + _list(l.points) + '</div>';
        if (l.useCase) sections += '<div class="ti-sec"><h4><i class="fas fa-bullseye" aria-hidden="true"></i> ' + _esc(U.secHow) + '</h4><p>' + _esc(l.useCase) + '</p></div>';
        if (l.example) sections += '<div class="ti-sec ti-box ti-example"><h4><i class="fas fa-building" aria-hidden="true"></i> ' + _esc(U.secExample) + '</h4><p>' + _esc(l.example) + '</p></div>';
        if (l.benefits && l.benefits.length) sections += '<div class="ti-sec ti-box ti-uvp"><h4><i class="fas fa-gem" aria-hidden="true"></i> ' + _esc(U.secUvp) + '</h4>' + _list(l.benefits) + '</div>';
        if (l.pitfall) sections += '<div class="ti-sec ti-box ti-pitfall"><h4><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ' + _esc(U.secPitfall) + '</h4><p>' + _esc(l.pitfall) + '</p></div>';
        var rels = tools.map(function (o, j) {
            return j === i ? '' : '<button type="button" class="ti-rel" data-s="' + _esc(sid) + '" data-i="' + j + '"><span aria-hidden="true">' + _esc(o.icon) + '</span> ' + _esc(o.name) + '</button>';
        }).join('');
        if (rels) sections += '<div class="ti-sec"><h4><i class="fas fa-layer-group" aria-hidden="true"></i> ' + _esc(_fmt(U.secRelated, { spec: _specName(sp) })) + '</h4><div class="ti-rels">' + rels + '</div></div>';

        return '<button type="button" class="ti-x" data-ti-close aria-label="' + _esc(U.close) + '"><i class="fas fa-times" aria-hidden="true"></i></button>' +
            '<div class="ti-head"><div class="ti-head-ico" aria-hidden="true">' + _esc(t.icon) + '</div>' +
                '<div class="ti-head-txt"><h3 id="tiTitle">' + _esc(t.name) + '</h3>' +
                '<span class="ti-spec"><span aria-hidden="true">' + _esc(sp.icon) + '</span> ' + _esc(_specName(sp)) + '</span>' +
                '<p>' + _esc(t.desc) + '</p></div></div>' +
            '<div class="ti-body">' + sections + '</div>' +
            '<div class="ti-foot">' +
                '<button type="button" class="ti-btn ti-btn-gold" data-go="learn"><i class="fas fa-book-open" aria-hidden="true"></i> ' + _esc(U.learn) + '</button>' +
                '<button type="button" class="ti-btn ti-btn-cyan" data-go="quiz"><i class="fas fa-bolt" aria-hidden="true"></i> ' + _esc(U.quiz) + ' <small>· ' + _esc(U.quizSub) + '</small></button>' +
            '</div>';
    }

    function _ensureModal() {
        var m = _$('tiModal');
        if (m) return m;
        m = document.createElement('div');
        m.id = 'tiModal';
        m.className = 'ti-modal';
        m.innerHTML = '<div class="ti-backdrop" data-ti-close></div>' +
            '<div class="ti-sheet" role="dialog" aria-modal="true" aria-labelledby="tiTitle" tabindex="-1"></div>';
        document.body.appendChild(m);                       // body level: must sit above #main-app's stacking context and the floating widgets
        m.addEventListener('click', function (ev) {
            if (ev.target.closest('[data-ti-close]')) { closeToolDetail(); return; }
            var rel = ev.target.closest('.ti-rel');
            if (rel) { openToolDetail(rel.getAttribute('data-s'), rel.getAttribute('data-i')); return; }
            var go = ev.target.closest('[data-go]');
            if (go) _goTo(go.getAttribute('data-go'));
        });
        return m;
    }

    function _onKey(ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeToolDetail(); return; }
        if (ev.key !== 'Tab') return;
        var sheet = document.querySelector('#tiModal .ti-sheet');
        if (!sheet) return;
        var f = sheet.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1], act = document.activeElement;
        if (!sheet.contains(act) || (ev.shiftKey && (act === first || act === sheet))) { ev.preventDefault(); (ev.shiftKey ? last : first).focus(); }
        else if (!ev.shiftKey && act === last) { ev.preventDefault(); first.focus(); }
    }

    function openToolDetail(sid, i) {
        i = Number(i);
        var tools = _toolsOf(sid);
        if (!tools[i]) return false;
        var m = _ensureModal(), sheet = m.querySelector('.ti-sheet'), a = _accent(sid);
        clearTimeout(state.closeTimer);
        var wasOpen = m.classList.contains('open') && !m.classList.contains('closing');
        sheet.style.setProperty('--ti-c', a[0]);
        sheet.style.setProperty('--ti-rgb', a[1]);
        sheet.innerHTML = _detailHTML(sid, i, _ui());
        state.cur = { s: sid, i: i };
        if (!wasOpen) {
            state.lastFocus = document.activeElement;
            m.classList.remove('closing');
            m.classList.add('open');
            document.documentElement.classList.add('ti-lock');
            document.addEventListener('keydown', _onKey, true);
        }
        var body = sheet.querySelector('.ti-body');
        if (body) body.scrollTop = 0;
        try { sheet.focus({ preventScroll: true }); } catch (e) {}
        return true;
    }

    // immediate: skip the 160 ms fade · keepFocus: do not hand focus back to the card (we are leaving the section)
    function closeToolDetail(immediate, keepFocus) {
        var m = _$('tiModal');
        if (!m || !m.classList.contains('open')) return;
        document.removeEventListener('keydown', _onKey, true);
        document.documentElement.classList.remove('ti-lock');
        var f = state.lastFocus;
        state.lastFocus = null;
        clearTimeout(state.closeTimer);
        var done = function () { m.classList.remove('open', 'closing'); state.cur = null; };
        if (immediate === true || _reduced()) done();
        else { m.classList.add('closing'); state.closeTimer = setTimeout(done, 170); }
        if (!keepFocus && f && typeof f.focus === 'function' && document.contains(f)) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    }

    // hand the chosen tool to the existing learn / quiz screens (aus_02_core.js) — nothing is duplicated here
    function _goTo(kind) {
        var cur = state.cur;
        if (!cur) return;
        closeToolDetail(true, true);
        if (typeof window.selectSpecialty !== 'function' || typeof window.showToolLearn !== 'function') {
            if (typeof window.showSection === 'function') window.showSection('tools');
            return;
        }
        window.selectSpecialty(cur.s);                       // sets selectedSpecialty, opens #tools and renders its list
        if (kind === 'quiz' && typeof window.startToolQuiz === 'function') {
            window.startToolQuiz(cur.i);                     // renders question 1 into #toolQuizArea
            var area = _$('toolQuizArea');
            if (area && area.scrollIntoView) area.scrollIntoView({ behavior: _reduced() ? 'auto' : 'smooth', block: 'start' });
        } else {
            window.showToolLearn(cur.i);                     // renders the learn screen and scrolls to it
        }
    }

    /* ───────────────────────── nav tab label + language changes ───────────────────────── */
    function _syncTab() {
        var el = document.querySelector('.nav-tab.ti-tab .ti-tab-label');
        if (!el) return;
        var label = TAB_LABEL[_langCode()] || TAB_LABEL.en;
        if (el.textContent !== label) el.textContent = label;
    }

    function _onLangChange() {
        _syncTab();
        var sec = _$('toolsindex');
        if (sec && sec.classList.contains('active')) renderToolsIndex();     // rebuild the visible directory in the new language
        else state.builtLang = null;                                          // …or rebuild on the next visit
        if (state.cur && _$('tiModal') && _$('tiModal').classList.contains('open')) openToolDetail(state.cur.s, state.cur.i);
    }

    // Owner edits (Content Studio → aus_48_content_sync.js): the search index and the specialty chips are rebuilt, live.
    function _onContentChange(ev) {
        var k = ev && ev.detail && ev.detail.key;
        if (k && k !== 'specialties' && k !== 'tools') return;
        idx.length = 0; state.builtLang = null;
        var sec = _$('toolsindex');
        if (sec && sec.classList.contains('active')) renderToolsIndex();
    }

    function _init() {
        _ensureStyles();
        _syncTab();
        try {
            new MutationObserver(_onLangChange).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
        } catch (e) {}
        window.addEventListener('aus-content-changed', _onContentChange);
        if (window._AUS_REGISTRY) {
            window._AUS_REGISTRY.register('toolsIndex', { open: openToolsIndex }, {
                name: 'Tools Index', icon: '🗂️', sectionId: 'toolsindex', defaultEnabled: true
            });
        }
    }

    window.renderToolsIndex = renderToolsIndex;
    window.openToolsIndex = openToolsIndex;
    window.openToolDetail = openToolDetail;
    window.closeToolDetail = closeToolDetail;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
    else _init();
})();
