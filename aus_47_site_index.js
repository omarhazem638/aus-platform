/* ================================================================
   AUS — الفهرس (System Directory / Site Map)
   دليل تعريفي لكل نظام رئيسي في المنصة: ما هو؟ · كيف يعمل وظيفياً وتقنياً؟ · ما الفائدة التعليمية والتطبيقية منه؟

   • المحتوى (AR + EN) في aus_46_site_index_data.js — هذا الملف يعرضه فقط.
   • التبويب «الفهرس» أول شريط .nav-tabs (قبل «دليل الأدوات») ← showSection('siteindex') ← renderSiteIndex()
   • واجهة: بطاقات قابلة للطيّ مجمّعة بالفئات + بحث + مرشّح فئات + «رحلة الطالب» + توسيع/طيّ الكل
   • الأداء: لا شيء يُبنى قبل أول زيارة · محتوى كل بطاقة يُبنى عند فتحها لأول مرة · مستمع واحد للقسم (event delegation)
   • الأرقام داخل النصوص حيّة: {{tools}} {{specialties}} … تُقرأ من بيانات المنصة نفسها (LIVE) وتُستخدم قيمة احتياطية إن غابت
   • زرّ «افتح» يضغط تبويب النظام نفسه فيعمل بكل سلوكه (تفعيل التبويب، دوال الفتح) بدل نسخه
   • CSS يُحقن من هنا · RTL/LTR بخصائص منطقية · AR/EN (بقية اللغات تعرض الإنجليزية)
   ================================================================ */
(function () {
    'use strict';
    if (window.__ausSiteIndexLoaded) return;
    window.__ausSiteIndexLoaded = true;

    /* ───────────────────────── helpers ───────────────────────── */
    function _$(id) { return document.getElementById(id); }
    function _esc(t) {
        return (t == null ? '' : String(t)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function _data() { return window.AUS_SITE_INDEX || null; }
    function _langCode() { return String(document.documentElement.lang || 'ar').slice(0, 2).toLowerCase(); }
    function _isAr() { return _langCode() === 'ar'; }
    function _L() { return _isAr() ? 'ar' : 'en'; }
    function _reduced() {
        try { return document.body.classList.contains('reduce-motion') || window.__AUS_FX_ON === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
        catch (e) { return false; }
    }
    function _norm(s) {
        s = (s == null ? '' : String(s));
        if (typeof window.normalizeAr === 'function') { try { return window.normalizeAr(s); } catch (e) {} }
        return s.toLowerCase().replace(/\s+/g, ' ').trim();
    }
    function _rgb(hex) {
        var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
        if (!m) return '0,212,255';
        var n = parseInt(m[1], 16);
        return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }
    function _fmtVars(str, vars) { return String(str == null ? '' : str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }

    /* ───────────────────────── live numbers ─────────────────────────
       Every {{name}} in the content is replaced by the value computed here from the platform's own data;
       if a data source is missing, the fallback in AUS_SITE_INDEX.vars is used. */
    function _num(fn) { try { var v = fn(); return (typeof v === 'number' && isFinite(v) && v > 0) ? v : null; } catch (e) { return null; } }
    var LIVE = {
        specialties: function () { return specialties.length; },
        tools: function () { var n = 0; Object.keys(toolsData).forEach(function (k) { n += toolsData[k].length; }); return n; },
        certKQ: function () { return window._AUS_CERT_CORE.CERT_CONFIG.knowledge.questions; },
        certPQ: function () { return window._AUS_CERT_CORE.CERT_CONFIG.practical.questions; },
        certKP: function () { return window._AUS_CERT_CORE.CERT_CONFIG.knowledge.price; },
        certPP: function () { return window._AUS_CERT_CORE.CERT_CONFIG.practical.price; },
        certSec: function () { return window._AUS_CERT_CORE.CERT_CONFIG.knowledge.seconds; },
        certPass: function () { return window._AUS_CERT_CORE.CERT_CONFIG.knowledge.passPercent; },
        lectures: function () { return DR_LECTURES.length; },
        lectureSections: function () { return DR_LECTURES[0].sections.length; },
        lectureQ: function () { return DR_LECTURES[0].questions.length; },
        engLevels: function () { return _engLevels.length; },
        vocabLevels: function () { return _VOCAB_LEVELS.length; },
        vocabWords: function () { var n = 0; _VOCAB_LEVELS.forEach(function (l) { n += (l.words || []).length; }); return n; },
        calcs: function () { return BIZ_CALCS.length; },
        calcQ: function () { return BIZ_CALCS[0].questions.length; },
        premium: function () { return LEADERSHIP_FILES.length; },
        books: function () { return LEADERSHIP_FILES.filter(function (f) { return f.type === 'book'; }).length; },
        files: function () { return LEADERSHIP_FILES.filter(function (f) { return f.type === 'file'; }).length; },
        bookPrice: function () { return LEADERSHIP_FILES.filter(function (f) { return f.type === 'book'; })[0].price; },
        filePrice: function () { return LEADERSHIP_FILES.filter(function (f) { return f.type === 'file'; })[0].price; },
        crises: function () { return Object.keys(CRISIS_DATA).length; },
        crisisStages: function () { return CRISIS_DATA[Object.keys(CRISIS_DATA)[0]].stages.length; },
        interviewCats: function () { return Object.keys(INTV_CATEGORIES).length; },
        interviewQ: function () { return INTV_CATEGORIES[Object.keys(INTV_CATEGORIES)[0]].questions.length; },
        cdnaQ: function () { return CDNA_QUESTIONS.length; },
        achievements: function () { return ACHIEVEMENTS.length; },
        campus: function () { return CAMPUS_BUILDINGS.length; },
        demoSteps: function () { return DEMO_SEQUENCE.length; },
        langs: function () { return Object.keys(I18N).length; }
    };
    var _varCache = null;
    function _v(k) {
        if (_varCache && k in _varCache) return _varCache[k];
        var val = LIVE[k] ? _num(LIVE[k]) : null;
        if (val == null) { var d = _data(); val = d && d.vars && d.vars[k] != null ? d.vars[k] : null; }
        if (_varCache) _varCache[k] = val;
        return val;
    }
    function _t(s) { return String(s == null ? '' : s).replace(/\{\{(\w+)\}\}/g, function (m, k) { var v = _v(k); return v == null ? m : v; }); }

    /* ───────────────────────── strings ───────────────────────── */
    var UI = {
        ar: {
            title: 'الفهرس',
            sub: 'الدليل التعريفي الشامل لمنصة AUS — ما هو كل نظام، وكيف يعمل، وماذا تستفيد منه.',
            lead: 'AUS (AI University Simulator) منصة تعليمية ذكية لطلاب كلية الأعمال: تتعلّم أدوات المهنة، وتتدرّب على القرار والقيادة، وتحصل على شهادات قابلة للتحقق، وتبني مشروعك الريادي. تعمل المنصة محلياً أولاً دون إنترنت، وتستعين بخادم FastAPI للذكاء الاصطناعي والامتحانات والمزامنة.',
            stSystems: 'نظاماً رئيسياً', stSpecs: 'تخصصات', stTools: 'أداة', stLangs: 'لغة',
            legend: 'مفتاح الاتصال:',
            journey: 'رحلة الطالب في خمس خطوات',
            search: 'ابحث في الأنظمة… (مثال: شهادة، أزمة، حاضنة)',
            all: 'الكل',
            expandAll: 'توسيع الكل', collapseAll: 'طيّ الكل',
            count: 'عرض {n} من {t} نظاماً',
            none: 'لا يوجد نظام يطابق «{q}»', noneHint: 'جرّب كلمة أخرى أو اختر فئة مختلفة', clear: 'مسح البحث',
            what: 'ما هو هذا النظام؟', howFn: 'كيف يعمل وظيفياً؟', howTech: 'كيف يعمل تقنياً؟',
            benefit: 'الفائدة للطالب', edu: 'تعليمياً', app: 'تطبيقياً',
            parts: 'مكوّنات النظام', files: 'الملفات التقنية', open: 'افتح',
            modeOffline: 'يعمل دون إنترنت', modeHybrid: 'محلي أولاً + الخادم عند توفّره', modeServer: 'يحتاج الخادم',
            roleDoctor: 'للدكاترة فقط', roleOwner: 'للمالك فقط',
            filterLbl: 'تصفية بحسب الفئة',
            noData: 'تعذّر تحميل بيانات الفهرس.', retry: 'إعادة المحاولة'
        },
        en: {
            title: 'Directory',
            sub: 'The complete introductory guide to the AUS platform — what each system is, how it works and what you gain from it.',
            lead: 'AUS (AI University Simulator) is a smart learning platform for business-school students: learn the tools of the profession, practise decisions and leadership, earn verifiable certificates and build your own venture. The platform works local-first, with no internet needed, and uses a FastAPI server for AI, exams and synchronisation.',
            stSystems: 'main systems', stSpecs: 'specialties', stTools: 'tools', stLangs: 'languages',
            legend: 'Connectivity key:',
            journey: 'The student journey in five steps',
            search: 'Search the systems… (e.g. certificate, crisis, incubator)',
            all: 'All',
            expandAll: 'Expand all', collapseAll: 'Collapse all',
            count: 'Showing {n} of {t} systems',
            none: 'No system matches “{q}”', noneHint: 'Try another word or pick a different category', clear: 'Clear search',
            what: 'What is it?', howFn: 'How does it work — functionally?', howTech: 'How does it work — technically?',
            benefit: 'What the student gains', edu: 'Educational', app: 'Applied',
            parts: 'System components', files: 'Technical files', open: 'Open',
            modeOffline: 'Works offline', modeHybrid: 'Local-first, server-enhanced', modeServer: 'Needs the server',
            roleDoctor: 'Doctors only', roleOwner: 'Owner only',
            filterLbl: 'Filter by category',
            noData: 'The directory data could not be loaded.', retry: 'Try again'
        }
    };
    function _ui() { return UI[_L()]; }
    var TAB_LABEL = {
        ar: 'الفهرس', en: 'Directory', de: 'Verzeichnis', fr: 'Répertoire', es: 'Directorio',
        tr: 'Dizin', ja: 'ディレクトリ', zh: '总目录', ko: '디렉터리', ru: 'Каталог', it: 'Indice'
    };

    /* ───────────────────────── state ───────────────────────── */
    var state = { q: '', cat: 'all', open: {}, firstDone: false, focus: null, builtLang: null, timer: 0, hay: null, hayLang: null };

    /* ───────────────────────── styles (injected once) ───────────────────────── */
    function _ensureStyles() {
        if (_$('si-styles')) return;
        var css = [
            'html{--si-s:1}',
            'html[dir="rtl"]{--si-s:-1}',

            /* ── nav tab: same angled pill, gold→cyan glass tint, slow sheen ── */
            '.nav-tab.si-tab{position:relative;overflow:hidden;flex:0 0 auto}',
            '.nav-tab.si-tab:not(.active):not(:hover){border-color:rgba(212,175,55,.55);background:linear-gradient(135deg,rgba(212,175,55,.17),rgba(0,212,255,.10))}',
            '.nav-tab.si-tab:not(.active)>i{color:#f4d675;filter:drop-shadow(0 0 6px rgba(212,175,55,.85))}',
            '.nav-tab.si-tab::after{content:"";position:absolute;inset:0;pointer-events:none;',
            '  background:linear-gradient(115deg,transparent 38%,rgba(255,236,170,.26) 50%,transparent 62%);',
            '  transform:translateX(calc(var(--si-s) * -130%));animation:si-sheen 7.5s ease-in-out 1.6s infinite}',
            '.nav-tab.si-tab.active::after{animation:none;opacity:0}',
            '@keyframes si-sheen{0%,72%{transform:translateX(calc(var(--si-s) * -130%))}100%{transform:translateX(calc(var(--si-s) * 130%))}}',

            /* ── hero ── */
            '#siteindex .si-wrap{max-width:1100px;margin:0 auto}',
            '.si-hero{position:relative;overflow:hidden;padding:22px 24px;margin-bottom:1.4rem;border-radius:18px;',
            '  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);box-shadow:0 20px 50px rgba(0,0,0,.4);',
            '  -webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px)}',
            '.si-hero::before{content:"";position:absolute;top:0;inset-inline:0;height:2px;background:linear-gradient(90deg,transparent,#d4af37,#00d4ff,transparent)}',
            '.si-hero p{margin:0;font-size:.97rem;line-height:1.95;color:rgba(255,255,255,.84)}',
            '.si-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}',
            '.si-stat{padding:12px 8px;text-align:center;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}',
            '.si-stat b{display:block;font-family:"Orbitron","Tajawal",sans-serif;font-size:1.45rem;font-weight:800;color:#f4d675;text-shadow:0 0 14px rgba(212,175,55,.45)}',
            '.si-stat span{font-size:.78rem;color:rgba(255,255,255,.65)}',
            '.si-legend{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:14px;font-size:.78rem;color:rgba(255,255,255,.6)}',

            /* ── journey ── */
            '.si-journey{margin-bottom:1.5rem}',
            '.si-journey h2{margin:0 0 .7rem;font-size:1rem;font-weight:800;color:#f4d675;display:flex;align-items:center;gap:8px}',
            '.si-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}',
            '.si-step{position:relative;display:flex;gap:11px;align-items:flex-start;padding:13px 14px;text-align:start;cursor:pointer;touch-action:manipulation;',
            '  color:#fff;font-family:"Tajawal",sans-serif;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);',
            '  transition:transform .2s,border-color .2s,background .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}',
            '.si-step:hover,.si-step:focus-visible{outline:none;transform:translateY(-3px);border-color:rgba(212,175,55,.6);background:rgba(212,175,55,.08);box-shadow:0 12px 30px rgba(0,0,0,.35),0 0 20px rgba(212,175,55,.18)}',
            '.si-step-n{flex:0 0 auto;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;font-size:1.05rem;',
            '  background:rgba(212,175,55,.14);border:1px solid rgba(212,175,55,.5);box-shadow:inset 0 0 12px rgba(212,175,55,.18)}',
            '.si-step-t b{display:block;font-size:.95rem;font-weight:800;margin-bottom:2px}',
            '.si-step-t>span{font-size:.76rem;line-height:1.5;color:rgba(255,255,255,.62)}',

            /* ── toolbar ── */
            '.si-toolbar{display:flex;flex-direction:column;gap:12px;margin-bottom:1.4rem}',
            '.si-searchrow{display:flex;gap:10px;align-items:stretch}',
            '.si-search{position:relative;flex:1;display:flex;align-items:center}',
            '.si-search>i{position:absolute;inset-inline-start:18px;color:rgba(255,255,255,.45);pointer-events:none}',
            '.si-search input{width:100%;padding:14px 18px;padding-inline-start:48px;font:600 1rem "Tajawal",sans-serif;color:#fff;',
            '  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px;outline:none;transition:border-color .25s,box-shadow .25s,background .25s}',
            '.si-search input::placeholder{color:rgba(255,255,255,.42)}',
            '.si-search input:focus{border-color:rgba(212,175,55,.65);background:rgba(255,255,255,.08);box-shadow:0 0 0 3px rgba(212,175,55,.14),0 0 24px rgba(212,175,55,.12)}',
            '.si-allbtn{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:0 18px;cursor:pointer;touch-action:manipulation;',
            '  font:700 .88rem "Tajawal",sans-serif;color:rgba(255,255,255,.85);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px;',
            '  transition:border-color .2s,color .2s,background .2s}',
            '.si-allbtn:hover{border-color:rgba(0,212,255,.55);color:#fff;background:rgba(0,212,255,.08)}',
            '.si-chips{display:flex;flex-wrap:wrap;gap:8px}',
            '.si-chip{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;cursor:pointer;touch-action:manipulation;',
            '  font:700 .84rem "Tajawal",sans-serif;color:rgba(255,255,255,.82);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);',
            '  transition:background .2s,border-color .2s,color .2s,transform .2s;-webkit-tap-highlight-color:transparent}',
            '.si-chip b{font-weight:800;font-size:.72rem;padding:1px 8px;border-radius:999px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.75)}',
            '.si-chip:hover{border-color:rgba(0,212,255,.55);color:#fff;transform:translateY(-1px)}',
            '.si-chip[aria-pressed="true"]{color:#0a0812;background:linear-gradient(135deg,#d4af37,#f4d675);border-color:transparent;box-shadow:0 6px 20px rgba(212,175,55,.28)}',
            '.si-chip[aria-pressed="true"] b{background:rgba(10,8,18,.16);color:#0a0812}',
            '.si-count{font-size:.85rem;color:rgba(255,255,255,.55);min-height:1.3em}',

            /* ── category group ── */
            '.si-cat{margin-bottom:2rem}',
            '.si-cat-h{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.1)}',
            '.si-cat-ico{flex:0 0 auto;width:42px;height:42px;display:grid;place-items:center;font-size:1.35rem;border-radius:14px;',
            '  background:rgba(var(--si-rgb),.14);border:1px solid rgba(var(--si-rgb),.4);box-shadow:inset 0 0 14px rgba(var(--si-rgb),.18)}',
            '.si-cat-h h2{margin:0;font-size:1.15rem;font-weight:800;color:#fff}',
            '.si-cat-h p{margin:2px 0 0;font-size:.8rem;color:rgba(255,255,255,.55)}',
            '.si-cat-n{margin-inline-start:auto;flex:0 0 auto;font-size:.78rem;font-weight:700;color:rgba(255,255,255,.55)}',
            '.si-list{display:flex;flex-direction:column;gap:12px}',

            /* ── system card ── */
            '.si-card{position:relative;overflow:hidden;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);scroll-margin-top:110px;',
            '  transition:border-color .25s,box-shadow .25s,background .25s}',
            '.si-card::before{content:"";position:absolute;top:0;bottom:0;inset-inline-start:0;width:3px;background:var(--si-c);box-shadow:0 0 14px var(--si-c);opacity:.85}',
            '.si-card:hover{border-color:rgba(var(--si-rgb),.5)}',
            '.si-card[data-open]{border-color:rgba(var(--si-rgb),.55);background:rgba(255,255,255,.075);box-shadow:0 20px 50px rgba(0,0,0,.4),0 0 40px rgba(var(--si-rgb),.1)}',
            '.si-card[data-pulse]{animation:si-pulse 1.5s ease-out}',
            '@keyframes si-pulse{0%{box-shadow:0 0 0 0 rgba(var(--si-rgb),.7)}100%{box-shadow:0 0 0 22px rgba(var(--si-rgb),0)}}',
            '.si-h{margin:0;font:inherit}',
            '.si-head{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:14px;width:100%;padding:16px 18px;text-align:start;cursor:pointer;touch-action:manipulation;',
            '  color:#fff;font-family:"Tajawal",sans-serif;background:transparent;border:0;-webkit-tap-highlight-color:transparent}',
            '.si-head:focus-visible{outline:2px solid #00f5d4;outline-offset:-3px;border-radius:18px}',
            '.si-ico{width:52px;height:52px;display:grid;place-items:center;font-size:1.7rem;border-radius:16px;',
            '  background:rgba(var(--si-rgb),.14);border:1px solid rgba(var(--si-rgb),.42);box-shadow:inset 0 0 16px rgba(var(--si-rgb),.2),0 0 22px rgba(var(--si-rgb),.16)}',
            '.si-title{min-width:0;display:flex;flex-direction:column;gap:3px}',
            '.si-name{font-size:1.08rem;font-weight:800;line-height:1.35}',
            '.si-subn{font:600 .68rem "Orbitron","Tajawal",sans-serif;letter-spacing:.08em;color:rgba(var(--si-rgb),.95);direction:ltr;text-align:start;unicode-bidi:plaintext}',
            '.si-tag{font-size:.84rem;line-height:1.6;color:rgba(255,255,255,.7)}',
            '.si-meta{display:flex;flex-direction:column;align-items:flex-end;gap:7px}',
            '.si-facts{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}',
            '.si-fact{display:inline-flex;align-items:baseline;gap:5px;padding:3px 10px;border-radius:999px;font-size:.72rem;color:rgba(255,255,255,.72);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}',
            '.si-fact b{font-family:"Orbitron","Tajawal",sans-serif;font-size:.8rem;font-weight:800;color:#f4d675}',
            '.si-mode{display:inline-flex;align-items:center;gap:6px;font-size:.7rem;font-weight:700;color:rgba(255,255,255,.7)}',
            '.si-mode::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--mc);box-shadow:0 0 8px var(--mc)}',
            '.si-mode-offline{--mc:#00f5a0}.si-mode-hybrid{--mc:#ffd60a}.si-mode-server{--mc:#4d9bff}',
            '.si-chev{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;color:rgba(255,255,255,.7);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);transition:transform .3s,background .2s,color .2s}',
            '.si-head:hover .si-chev{background:rgba(var(--si-rgb),.18);color:#fff}',
            '.si-head[aria-expanded="true"] .si-chev{transform:rotate(180deg);background:rgba(var(--si-rgb),.22);color:#fff}',

            /* body: height animates via grid rows (0fr → 1fr) */
            '.si-body-wrap{display:grid;grid-template-rows:0fr;visibility:hidden;transition:grid-template-rows .32s ease,visibility 0s linear .32s}',
            '.si-card[data-open] .si-body-wrap{grid-template-rows:1fr;visibility:visible;transition-delay:0s}',
            '.si-body{min-height:0;overflow:hidden}',
            '.si-body-in{padding:2px 20px 20px;display:flex;flex-direction:column;gap:16px;border-top:1px solid rgba(255,255,255,.08);margin:0 0 0}',
            '.si-sec h4{display:flex;align-items:center;gap:8px;margin:14px 0 8px;font-size:.95rem;font-weight:800;color:var(--si-c)}',
            '.si-sec p{margin:0;font-size:.94rem;line-height:1.95;color:rgba(255,255,255,.86)}',
            '.si-sec ol,.si-sec ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px}',
            '.si-sec li{position:relative;padding-inline-start:28px;font-size:.9rem;line-height:1.85;color:rgba(255,255,255,.84)}',
            '.si-sec ul li::before{content:"";position:absolute;inset-inline-start:7px;top:.8em;width:7px;height:7px;border-radius:50%;background:var(--si-c);box-shadow:0 0 8px var(--si-c)}',
            '.si-sec ol{counter-reset:si}',
            '.si-sec ol li{counter-increment:si}',
            '.si-sec ol li::before{content:counter(si);position:absolute;inset-inline-start:0;top:.2em;width:21px;height:21px;display:grid;place-items:center;border-radius:50%;',
            '  font:800 .72rem "Orbitron","Tajawal",sans-serif;color:#0a0812;background:var(--si-c)}',
            '.si-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}',
            '.si-cols .si-sec h4{margin-top:0}',
            '.si-tech li{font-size:.84rem;color:rgba(255,255,255,.78)}',
            '.si-benefit{padding:14px 16px;border-radius:16px;background:linear-gradient(135deg,rgba(212,175,55,.14),rgba(212,175,55,.04));border:1px solid rgba(212,175,55,.38)}',
            '.si-benefit h4{margin:0 0 10px;color:#f4d675}',
            '.si-ben-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}',
            '.si-ben-grid>div>b{display:block;margin-bottom:6px;font-size:.82rem;color:#f4d675}',
            '.si-ben-grid ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}',
            '.si-ben-grid li{position:relative;padding-inline-start:22px;font-size:.88rem;line-height:1.8;color:rgba(255,255,255,.86)}',
            '.si-ben-grid li::before{content:"\\2713";position:absolute;inset-inline-start:2px;top:0;font-weight:900;font-size:.85rem;color:#f4d675}',
            '.si-parts{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}',
            '.si-part{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}',
            '.si-part-h{display:flex;align-items:center;gap:9px;font-weight:800;font-size:.9rem}',
            '.si-part-h span{display:grid;place-items:center;width:32px;height:32px;font-size:1.05rem;border-radius:10px;background:rgba(var(--si-rgb),.14);border:1px solid rgba(var(--si-rgb),.38)}',
            '.si-part p{margin:0;font-size:.8rem;line-height:1.7;color:rgba(255,255,255,.68)}',
            '.si-part .si-open{align-self:flex-start;margin-top:2px}',
            '.si-files{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
            '.si-files>span{font-size:.74rem;font-weight:700;color:rgba(255,255,255,.5);margin-inline-end:4px}',
            '.si-files code{padding:2px 9px;border-radius:8px;font:500 .72rem "Consolas","Courier New",monospace;color:rgba(255,255,255,.7);background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.08);direction:ltr}',
            '.si-actions{display:flex;flex-wrap:wrap;gap:10px;padding-top:4px}',
            '.si-open{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;cursor:pointer;touch-action:manipulation;font:800 .86rem "Tajawal",sans-serif;',
            '  color:#0a0812;background:linear-gradient(135deg,#d4af37,#f4d675);border:1px solid transparent;border-radius:13px;box-shadow:0 8px 22px rgba(212,175,55,.26);',
            '  transition:transform .2s,box-shadow .2s,filter .2s;-webkit-tap-highlight-color:transparent}',
            '.si-open:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(212,175,55,.42)}',
            '.si-open[disabled]{cursor:not-allowed;color:rgba(255,255,255,.5);background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);box-shadow:none;transform:none}',
            '.si-open:focus-visible,.si-step:focus-visible,.si-chip:focus-visible,.si-allbtn:focus-visible,.si-search input:focus-visible{outline:2px solid #00f5d4;outline-offset:2px}',
            '.si-part .si-open{padding:6px 12px;font-size:.78rem;border-radius:10px;box-shadow:none}',
            '.si-empty{max-width:520px;margin:2rem auto;padding:2rem 1.5rem;text-align:center;color:rgba(255,255,255,.75);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:18px}',
            '.si-empty .si-empty-ico{font-size:2.2rem;margin-bottom:.6rem;filter:drop-shadow(0 0 14px rgba(212,175,55,.6))}',
            '.si-empty p{margin:.3rem 0 1rem;font-size:.9rem;color:rgba(255,255,255,.55)}',

            /* ── tablets / phones ── */
            '@media (max-width:900px){.si-cols,.si-ben-grid{grid-template-columns:1fr}.si-stats{grid-template-columns:repeat(2,1fr)}}',
            '@media (max-width:640px){',
            '  .si-hero{padding:18px 16px}',
            '  .si-head{grid-template-columns:auto 1fr auto;gap:12px;padding:14px}',
            '  .si-meta{grid-column:1 / -1;grid-row:2;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}',
            '  .si-facts{justify-content:flex-start}',
            '  .si-ico{width:44px;height:44px;font-size:1.45rem;border-radius:14px}',
            '  .si-body-in{padding:2px 14px 16px}',
            '  .si-searchrow{flex-direction:column}',
            '  .si-allbtn{padding:11px 18px;justify-content:center}',
            '  .si-chips{flex-wrap:nowrap;overflow-x:auto;margin-inline:-2px;padding:2px;scrollbar-width:none}',
            '  .si-chips::-webkit-scrollbar{display:none}',
            '  .si-chip{flex:0 0 auto}',
            '  .si-actions .si-open{flex:1 1 100%;justify-content:center}',
            '}',

            /* ── motion off: OS setting, the app switch, or Calm performance mode ── */
            '@media (prefers-reduced-motion:reduce){.nav-tab.si-tab::after{animation:none;opacity:0}.si-body-wrap,.si-chev,.si-step,.si-open{transition:none}.si-card[data-pulse]{animation:none}}',
            'body.reduce-motion .nav-tab.si-tab::after,html.aus-fx-off .nav-tab.si-tab::after{animation:none;opacity:0}',
            'body.reduce-motion .si-card[data-pulse],html.aus-fx-off .si-card[data-pulse]{animation:none}'
        ].join('\n');
        var s = document.createElement('style');
        s.id = 'si-styles';
        s.textContent = css;
        document.head.appendChild(s);
    }

    /* ───────────────────────── search index ─────────────────────────
       Both languages are indexed, so a search finds a system whichever language the page is in. Four tiers: name · tagline · description/parts/entries · detail text. */
    function _buildHay() {
        var d = _data();
        state.hay = {};
        (d.systems || []).forEach(function (s) {
            var nm = [s.sub, s.id], tg = [], rest = [], det = [];
            ['ar', 'en'].forEach(function (l) {
                var o = s[l] || {};
                nm.push(o.n); tg.push(o.t); rest.push(o.w);
                (s.open || []).forEach(function (e) { rest.push(e[l]); });
                (s.facts || []).forEach(function (f) { rest.push(f[l]); });
                (s.parts || []).forEach(function (p) { if (p[l]) rest.push(p[l].t, p[l].d); });
                ['h', 'x', 'e', 'a'].forEach(function (k) { (o[k] || []).forEach(function (x) { det.push(x); }); });
            });
            (s.files || []).forEach(function (f) { det.push(f); });
            state.hay[s.id] = { n: _norm(_t(nm.join(' '))), t: _norm(_t(tg.join(' '))), r: _norm(_t(rest.join(' '))), d: _norm(_t(det.join(' '))) };
        });
    }
    // "الشهادة" must also find "الشهادات": try the word, without the leading ال, and without a final ه (folded ة) or ات
    function _variants(t) {
        var v = [t], core = t;
        if (t.length > 4 && t.indexOf('ال') === 0) { core = t.slice(2); v.push(core); }
        if (core.length > 3 && /ه$/.test(core)) v.push(core.slice(0, -1));
        if (core.length > 4 && /ات$/.test(core)) v.push(core.slice(0, -2));
        return v;
    }
    // 0 = no match (every search word must match); higher = better (name 5 · tagline 3 · description 2 · detail 1, summed over the words)
    function _score(sys, terms) {
        if (!terms.length) return 1;
        var h = state.hay[sys.id], total = 0;
        for (var i = 0; i < terms.length; i++) {
            var vs = _variants(terms[i]), sc = 0;
            for (var k = 0; k < vs.length && !sc; k++) {
                if (h.n.indexOf(vs[k]) !== -1) sc = 5;
                else if (h.t.indexOf(vs[k]) !== -1) sc = 3;
                else if (h.r.indexOf(vs[k]) !== -1) sc = 2;
                else if (h.d.indexOf(vs[k]) !== -1) sc = 1;
            }
            if (!sc) return 0;
            total += sc;
        }
        return total;
    }

    /* ───────────────────────── rendering ───────────────────────── */
    function _catOf(id) { var cs = _data().cats || []; for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i]; return null; }
    function _sysById(id) { var ss = _data().systems || []; for (var i = 0; i < ss.length; i++) if (ss[i].id === id) return ss[i]; return null; }

    function _roleOk(role) {
        if (!role) return true;
        var u = window.ausAuth && window.ausAuth.user;
        if (!u) return false;
        if (role === 'doctor') return u.role === 'doctor' || u.role === 'admin';
        if (role === 'owner') return !!window.ausAuth.isOwner;
        return true;
    }

    function _openBtn(entry, sysId, ref, U, extraCls) {
        var label = entry[_L()] || entry.en || entry.ar || U.open;
        var allowed = _roleOk(entry.role);
        var lockTxt = entry.role === 'owner' ? U.roleOwner : U.roleDoctor;
        return '<button type="button" class="si-open' + (extraCls ? ' ' + extraCls : '') + '" data-sys="' + _esc(sysId) + '" data-ref="' + _esc(ref) + '"' +
            (allowed ? '' : ' disabled title="' + _esc(lockTxt) + '" aria-label="' + _esc(label + ' — ' + lockTxt) + '"') + '>' +
            '<i class="fas ' + (allowed ? 'fa-arrow-up-right-from-square' : 'fa-lock') + '" aria-hidden="true"></i> ' +
            _esc(label) + (allowed ? '' : ' · ' + _esc(lockTxt)) + '</button>';
    }

    function _list(items, tag) {
        items = (items || []).filter(Boolean);
        if (!items.length) return '';
        return '<' + tag + '>' + items.map(function (x) { return '<li>' + _esc(_t(x)) + '</li>'; }).join('') + '</' + tag + '>';
    }

    function _bodyHTML(sys, U) {
        var L = _L(), o = sys[L] || sys.en || {};
        var html = '<div class="si-body-in">';
        html += '<div class="si-sec"><h4><i class="fas fa-circle-info" aria-hidden="true"></i> ' + _esc(U.what) + '</h4><p>' + _esc(_t(o.w)) + '</p></div>';
        html += '<div class="si-cols">' +
            '<div class="si-sec"><h4><i class="fas fa-gears" aria-hidden="true"></i> ' + _esc(U.howFn) + '</h4>' + _list(o.h, 'ol') + '</div>' +
            '<div class="si-sec si-tech"><h4><i class="fas fa-microchip" aria-hidden="true"></i> ' + _esc(U.howTech) + '</h4>' + _list(o.x, 'ul') + '</div>' +
            '</div>';
        html += '<div class="si-benefit"><h4><i class="fas fa-graduation-cap" aria-hidden="true"></i> ' + _esc(U.benefit) + '</h4><div class="si-ben-grid">' +
            '<div><b>' + _esc(U.edu) + '</b>' + _list(o.e, 'ul') + '</div>' +
            '<div><b>' + _esc(U.app) + '</b>' + _list(o.a, 'ul') + '</div></div></div>';
        if (sys.parts && sys.parts.length) {
            html += '<div class="si-sec"><h4><i class="fas fa-layer-group" aria-hidden="true"></i> ' + _esc(U.parts) + '</h4><div class="si-parts">' +
                sys.parts.map(function (p, i) {
                    var po = p[L] || p.en || {};
                    return '<div class="si-part"><div class="si-part-h"><span aria-hidden="true">' + _esc(p.icon) + '</span>' + _esc(po.t) + '</div>' +
                        '<p>' + _esc(_t(po.d)) + '</p>' +
                        (p.open ? _openBtn({ ar: U.open, en: U.open, role: p.open.role }, sys.id, 'p' + i, U) : '') + '</div>';
                }).join('') + '</div></div>';
        }
        if (sys.files && sys.files.length) {
            html += '<div class="si-files"><span>' + _esc(U.files) + '</span>' + sys.files.map(function (f) { return '<code>' + _esc(f) + '</code>'; }).join('') + '</div>';
        }
        if (sys.open && sys.open.length) {
            html += '<div class="si-actions">' + sys.open.map(function (e, i) { return _openBtn(e, sys.id, 'o' + i, U); }).join('') + '</div>';
        }
        return html + '</div>';
    }

    function _cardHTML(sys, U, openNow) {
        var L = _L(), o = sys[L] || sys.en || {};
        var rgb = _rgb(sys.c);
        var modeCls = 'si-mode si-mode-' + (sys.mode || 'offline');
        var modeTxt = sys.mode === 'server' ? U.modeServer : sys.mode === 'hybrid' ? U.modeHybrid : U.modeOffline;
        var facts = (sys.facts || []).map(function (f) {
            return '<span class="si-fact"><b>' + _esc(_t(f.v)) + '</b>' + _esc(f[L] || f.en || '') + '</span>';
        }).join('');
        return '<article class="si-card" id="si-sys-' + _esc(sys.id) + '" data-id="' + _esc(sys.id) + '"' + (openNow ? ' data-open' : '') + ' style="--si-c:' + _esc(sys.c) + ';--si-rgb:' + rgb + '">' +
            '<h3 class="si-h"><button type="button" class="si-head" data-toggle aria-expanded="' + (openNow ? 'true' : 'false') + '" aria-controls="si-body-' + _esc(sys.id) + '">' +
                '<span class="si-ico" aria-hidden="true">' + _esc(sys.icon) + '</span>' +
                '<span class="si-title"><span class="si-name">' + _esc(_t(o.n)) + '</span><span class="si-subn">' + _esc(sys.sub || '') + '</span><span class="si-tag">' + _esc(_t(o.t)) + '</span></span>' +
                '<span class="si-meta"><span class="si-facts">' + facts + '</span><span class="' + modeCls + '">' + _esc(modeTxt) + '</span></span>' +
                '<span class="si-chev" aria-hidden="true"><i class="fas fa-chevron-down"></i></span>' +
            '</button></h3>' +
            '<div class="si-body-wrap" id="si-body-' + _esc(sys.id) + '" role="region" aria-label="' + _esc(_t(o.n)) + '"><div class="si-body" data-built="' + (openNow ? '1' : '0') + '">' + (openNow ? _bodyHTML(sys, U) : '') + '</div></div>' +
            '</article>';
    }

    function _shellHTML(U) {
        var d = _data(), L = _L();
        var chips = '<button type="button" class="si-chip" data-cat="all" aria-pressed="false">' + _esc(U.all) + ' <b data-n="all"></b></button>' +
            (d.cats || []).map(function (c) {
                return '<button type="button" class="si-chip" data-cat="' + _esc(c.id) + '" aria-pressed="false"><span aria-hidden="true">' + _esc(c.icon) + '</span> ' + _esc(c[L].n) + ' <b data-n="' + _esc(c.id) + '"></b></button>';
            }).join('');
        var steps = (d.journey || []).map(function (j, i) {
            var jl = j[L] || j.en || {};
            return '<button type="button" class="si-step" data-journey="' + _esc(j.sys) + '"><span class="si-step-n" aria-hidden="true">' + _esc(j.icon) + '</span>' +
                '<span class="si-step-t"><b>' + (i + 1) + '. ' + _esc(jl.t) + '</b><span>' + _esc(jl.d) + '</span></span></button>';
        }).join('');
        return '<div class="section-title"><h1>🧭 ' + _esc(U.title) + '</h1><p>' + _esc(U.sub) + '</p></div>' +
            '<div class="si-wrap">' +
                '<div class="si-hero"><p>' + _esc(U.lead) + '</p>' +
                    '<div class="si-stats">' +
                        '<div class="si-stat"><b>' + (d.systems || []).length + '</b><span>' + _esc(U.stSystems) + '</span></div>' +
                        '<div class="si-stat"><b>' + _esc(_v('specialties')) + '</b><span>' + _esc(U.stSpecs) + '</span></div>' +
                        '<div class="si-stat"><b>' + _esc(_v('tools')) + '</b><span>' + _esc(U.stTools) + '</span></div>' +
                        '<div class="si-stat"><b>' + _esc(_v('langs')) + '</b><span>' + _esc(U.stLangs) + '</span></div>' +
                    '</div>' +
                    '<div class="si-legend"><span>' + _esc(U.legend) + '</span>' +
                        '<span class="si-mode si-mode-offline">' + _esc(U.modeOffline) + '</span>' +
                        '<span class="si-mode si-mode-hybrid">' + _esc(U.modeHybrid) + '</span>' +
                        '<span class="si-mode si-mode-server">' + _esc(U.modeServer) + '</span></div>' +
                '</div>' +
                '<div class="si-journey"><h2><i class="fas fa-route" aria-hidden="true"></i> ' + _esc(U.journey) + '</h2><div class="si-steps">' + steps + '</div></div>' +
                '<div class="si-toolbar">' +
                    '<div class="si-searchrow">' +
                        '<label class="si-search"><i class="fas fa-search" aria-hidden="true"></i>' +
                            '<input id="siSearch" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="' + _esc(U.search) + '" aria-label="' + _esc(U.search) + '" value="' + _esc(state.q) + '"></label>' +
                        '<button type="button" class="si-allbtn" id="siAllBtn" data-allbtn></button>' +
                    '</div>' +
                    '<div class="si-chips" role="group" aria-label="' + _esc(U.filterLbl) + '">' + chips + '</div>' +
                    '<div class="si-count" id="siCount" aria-live="polite"></div>' +
                '</div>' +
                '<div id="siResults"></div>' +
            '</div>';
    }

    function _paint() {
        var host = _$('siResults'), d = _data();
        if (!host || !d) return;
        var U = _ui(), L = _L();
        _varCache = {};
        if (!state.hay || state.hayLang !== L) { _buildHay(); state.hayLang = L; }
        var terms = _norm(state.q).split(' ').filter(Boolean);
        var all = d.systems || [];
        var counts = { all: 0 };
        (d.cats || []).forEach(function (c) { counts[c.id] = 0; });
        var visible = [], sc = {};
        all.forEach(function (s, i) {
            var v = _score(s, terms);
            if (!v) return;
            sc[s.id] = { v: v, i: i };
            counts.all++; counts[s.cat] = (counts[s.cat] || 0) + 1;
            if (state.cat === 'all' || state.cat === s.cat) visible.push(s);
        });
        // while searching: strongest hit first inside a category, and the category holding the strongest hit first (ties keep the normal order)
        var cats = (d.cats || []).map(function (c, i) { c = Object.create(c); c.__i = i; c.__best = 0; return c; });
        visible.forEach(function (s) { cats.forEach(function (c) { if (c.id === s.cat && sc[s.id].v > c.__best) c.__best = sc[s.id].v; }); });
        if (terms.length) cats.sort(function (a, b) { return (b.__best - a.__best) || (a.__i - b.__i); });
        var out = '';
        cats.forEach(function (c) {
            var rows = visible.filter(function (s) { return s.cat === c.id; });
            if (terms.length) rows.sort(function (a, b) { return (sc[b.id].v - sc[a.id].v) || (sc[a.id].i - sc[b.id].i); });
            if (!rows.length) return;
            out += '<section class="si-cat" style="--si-rgb:' + _rgb(c.c) + '"><div class="si-cat-h"><span class="si-cat-ico" aria-hidden="true">' + _esc(c.icon) + '</span>' +
                '<div><h2>' + _esc(c[L].n) + '</h2><p>' + _esc(c[L].d) + '</p></div><span class="si-cat-n">' + rows.length + '</span></div>' +
                '<div class="si-list">' + rows.map(function (s) { return _cardHTML(s, U, !!state.open[s.id]); }).join('') + '</div></section>';
        });
        host.innerHTML = out || ('<div class="si-empty"><div class="si-empty-ico" aria-hidden="true">🔎</div><strong>' + _esc(_fmtVars(U.none, { q: state.q })) + '</strong><p>' + _esc(U.noneHint) + '</p>' +
            '<button type="button" class="si-open" data-ti-clear>' + _esc(U.clear) + '</button></div>');
        var cnt = _$('siCount');
        if (cnt) cnt.textContent = out ? _fmtVars(U.count, { n: visible.length, t: all.length }) : '';
        var chips = document.querySelectorAll('#siteindex .si-chip');
        for (var i = 0; i < chips.length; i++) {
            var id = chips[i].getAttribute('data-cat');
            chips[i].setAttribute('aria-pressed', id === state.cat ? 'true' : 'false');
            var b = chips[i].querySelector('b'); if (b) b.textContent = counts[id] != null ? counts[id] : 0;
        }
        _syncAllBtn();
    }

    function _syncAllBtn() {
        var btn = _$('siAllBtn'); if (!btn) return;
        var cards = document.querySelectorAll('#siResults .si-card');
        var anyClosed = false;
        for (var i = 0; i < cards.length; i++) if (cards[i].querySelector('.si-head').getAttribute('aria-expanded') !== 'true') { anyClosed = true; break; }
        var U = _ui();
        btn.setAttribute('data-mode', anyClosed ? 'expand' : 'collapse');
        btn.innerHTML = '<i class="fas ' + (anyClosed ? 'fa-up-right-and-down-left-from-center' : 'fa-down-left-and-up-right-to-center') + '" aria-hidden="true"></i> ' + _esc(anyClosed ? U.expandAll : U.collapseAll);
    }

    /* ───────────────────────── interactions ───────────────────────── */
    function _setOpen(card, open) {
        var head = card.querySelector('.si-head'), body = card.querySelector('.si-body'), id = card.getAttribute('data-id');
        if (open && body.getAttribute('data-built') !== '1') {          // build the heavy part lazily, on first open
            body.innerHTML = _bodyHTML(_sysById(id), _ui());
            body.setAttribute('data-built', '1');
        }
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) card.setAttribute('data-open', ''); else card.removeAttribute('data-open');
        if (open) state.open[id] = true; else delete state.open[id];
    }

    function _findTab(prefix) {
        var tabs = document.querySelectorAll('.nav-tab');
        for (var i = 0; i < tabs.length; i++) if ((tabs[i].getAttribute('onclick') || '').indexOf(prefix) === 0) return tabs[i];
        return null;
    }
    function _resolveFn(path) {
        var parts = String(path).split('.'), ctx = window;
        for (var i = 0; i < parts.length - 1; i++) { ctx = ctx && ctx[parts[i]]; }
        var fn = ctx && ctx[parts[parts.length - 1]];
        return typeof fn === 'function' ? { fn: fn, ctx: ctx } : null;
    }
    // Pressing the system's own nav tab keeps every behaviour it already has (active tab, simOpen()/vocabOpen() …) — nothing is copied here.
    function _openEntry(e) {
        if (!e || !_roleOk(e.role)) return;
        if (e.tab) { var t = _findTab(e.tab); if (t) { t.click(); return; } }
        if (e.section && typeof window.showSection === 'function') { window.showSection(e.section); return; }
        if (e.call) { var r = _resolveFn(e.call); if (r) r.fn.apply(r.ctx, e.args || []); }
    }

    function focusSystem(id) {
        var sys = _sysById(id);
        if (!sys) return false;
        var d = _data(), terms = _norm(state.q).split(' ').filter(Boolean);
        if (state.cat !== 'all' || (terms.length && !_score(sys, terms))) { state.cat = 'all'; state.q = ''; var inp = _$('siSearch'); if (inp) inp.value = ''; _paint(); }
        var card = _$('si-sys-' + id);
        if (!card) return false;
        _setOpen(card, true);
        _syncAllBtn();
        card.setAttribute('data-pulse', '');
        setTimeout(function () { card.removeAttribute('data-pulse'); }, 1600);
        try { card.scrollIntoView({ behavior: _reduced() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { card.scrollIntoView(); }
        return true;
    }

    function _bind(host) {
        if (host._siBound) return;
        host._siBound = true;
        host.addEventListener('click', function (ev) {
            var t = ev.target;
            var head = t.closest('[data-toggle]');
            if (head) { var card = head.closest('.si-card'); _setOpen(card, head.getAttribute('aria-expanded') !== 'true'); _syncAllBtn(); return; }
            var ob = t.closest('.si-open[data-sys]');
            if (ob) {
                if (ob.disabled) return;
                var sys = _sysById(ob.getAttribute('data-sys')), ref = ob.getAttribute('data-ref') || '';
                if (!sys) return;
                var entry = ref.charAt(0) === 'o' ? (sys.open || [])[+ref.slice(1)] : (sys.parts || [])[+ref.slice(1)] && sys.parts[+ref.slice(1)].open;
                _openEntry(entry);
                return;
            }
            var chip = t.closest('.si-chip');
            if (chip) { state.cat = chip.getAttribute('data-cat') || 'all'; _paint(); return; }
            var j = t.closest('[data-journey]');
            if (j) { focusSystem(j.getAttribute('data-journey')); return; }
            if (t.closest('[data-allbtn]')) {
                var expand = _$('siAllBtn').getAttribute('data-mode') === 'expand';
                document.querySelectorAll('#siResults .si-card').forEach(function (c) { _setOpen(c, expand); });
                _syncAllBtn();
                return;
            }
            if (t.closest('[data-ti-clear]')) { state.q = ''; var i2 = _$('siSearch'); if (i2) { i2.value = ''; i2.focus(); } _paint(); }
        });
        host.addEventListener('input', function (ev) {
            if (ev.target.id !== 'siSearch') return;
            state.q = ev.target.value;
            clearTimeout(state.timer);
            state.timer = setTimeout(_paint, 120);
        });
        host.addEventListener('keydown', function (ev) {
            if (ev.target.id !== 'siSearch') return;
            if (ev.key === 'Escape' && ev.target.value) { ev.target.value = ''; state.q = ''; _paint(); ev.stopPropagation(); }
            else if (ev.key === 'Enter') ev.target.blur();
        });
    }

    // Called by showSection('siteindex'). Nothing is built before the first visit; later visits only re-sync.
    function renderSiteIndex() {
        var host = _$('siteindex');
        if (!host) return;
        _ensureStyles();
        var d = _data(), U = _ui();
        if (!d) {
            host.innerHTML = '<div class="si-wrap"><div class="si-empty"><div class="si-empty-ico" aria-hidden="true">⚠️</div><strong>' + _esc(U.noData) + '</strong><p></p>' +
                '<button type="button" class="si-open" id="siRetry">' + _esc(U.retry) + '</button></div></div>';
            var r = _$('siRetry'); if (r) r.onclick = renderSiteIndex;
            state.builtLang = null;
            return;
        }
        _varCache = {};
        var lang = _langCode();
        if (state.builtLang !== lang || !_$('siResults')) {
            if (!state.firstDone && !state.focus) { state.open.tools = true; }   // first visit: the first system is open so the page never looks empty
            state.firstDone = true;
            host.innerHTML = _shellHTML(U);
            state.builtLang = lang;
            state.hay = null;
            _bind(host);
        }
        _paint();
        if (state.focus) { var f = state.focus; state.focus = null; setTimeout(function () { focusSystem(f); }, 60); }
    }

    // programmatic entry: openSiteIndex() or openSiteIndex('certs') — opens the page and that system's card
    function openSiteIndex(systemId) {
        if (systemId) state.focus = String(systemId);
        if (typeof window.showSection === 'function') window.showSection('siteindex');
    }

    /* ───────────────────────── nav tab label + language / login changes ───────────────────────── */
    function _syncTab() {
        var el = document.querySelector('.nav-tab.si-tab .si-tab-label');
        if (!el) return;
        var label = TAB_LABEL[_langCode()] || TAB_LABEL.en;
        if (el.textContent !== label) el.textContent = label;
    }
    function _active() { var s = _$('siteindex'); return !!(s && s.classList.contains('active')); }
    function _onLangChange() {
        _syncTab();
        state.builtLang = null; state.hay = null;
        if (_active()) renderSiteIndex();
    }
    function _onAuthChange() { if (_active() && _$('siResults')) _paint(); }       // role-locked «افتح» buttons follow the login state

    function _init() {
        _ensureStyles();
        _syncTab();
        try { new MutationObserver(_onLangChange).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}
        window.addEventListener('aus-auth-changed', _onAuthChange);
        if (window._AUS_REGISTRY) {
            window._AUS_REGISTRY.register('siteIndex', { open: openSiteIndex }, { name: 'System Directory', icon: '🧭', sectionId: 'siteindex', defaultEnabled: true });
        }
    }

    window.renderSiteIndex = renderSiteIndex;
    window.openSiteIndex = openSiteIndex;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
    else _init();
})();
