// =============================================================================
// aus_22_coach.js  —  AI ENTREPRENEUR COACH  (Module 3)
// Floating 24/7 coach + full section view · Topic shortcuts · Step-by-step guidance
// =============================================================================
(function () {
'use strict';

var _cc = {
    open: false, history: [], styleInjected: false,
    topic: null, actions: [],
    storageKey: 'aus.coach.history'
};

var _topics = [
    { id:'funding',     icon:'💰', label:'التمويل',         stage:'idea',    prompt:'How do I fund my startup? Give me a step-by-step funding strategy.' },
    { id:'mvp',         icon:'🛠️', label:'بناء MVP',        stage:'idea',    prompt:'How do I build and launch an MVP efficiently and quickly?' },
    { id:'legal',       icon:'⚖️', label:'التأسيس القانوني', stage:'idea',    prompt:'What are the legal steps to register a startup in the Arab world?' },
    { id:'idea',        icon:'💡', label:'التحقق من الفكرة', stage:'idea',    prompt:'How do I validate my startup idea before building? Give me a practical validation framework.' },
    { id:'marketing',   icon:'📣', label:'التسويق',          stage:'launch',  prompt:'Create a marketing strategy for a startup with limited budget.' },
    { id:'pitch',       icon:'🎯', label:'عرض المستثمرين',   stage:'launch',  prompt:'How do I pitch my startup to investors effectively?' },
    { id:'team',        icon:'👥', label:'بناء الفريق',      stage:'launch',  prompt:'How do I build the right founding team for a tech startup?' },
    { id:'pricing',     icon:'💲', label:'التسعير',          stage:'launch',  prompt:'How do I price my product for maximum growth and profitability?' },
    { id:'growth',      icon:'📈', label:'النمو',            stage:'scale',   prompt:'What are the best growth hacking strategies for a B2C startup?' },
    { id:'fundraise',   icon:'🏦', label:'جولات الاستثمار',  stage:'scale',   prompt:'How do I raise a Series A round? Walk me through the full process step by step.' },
    { id:'culture',     icon:'🌟', label:'ثقافة الشركة',     stage:'scale',   prompt:'How do I build a strong company culture as we scale beyond 20 employees?' },
    { id:'exit',        icon:'🚀', label:'الخروج والاستحواذ', stage:'scale',   prompt:'What are my exit strategy options as a startup founder? Compare IPO vs acquisition.' }
];

var _quotes = [
    { text: '"المؤسس الناجح لا يجد الطريق — بل يبنيه."', author: 'Reid Hoffman' },
    { text: '"الفشل ليس عكس النجاح — بل هو جزء منه."', author: 'Arianna Huffington' },
    { text: '"ابدأ صغيراً، فكّر كبيراً، تحرّك بسرعة."', author: 'Mark Zuckerberg' },
    { text: '"المنتج الذي يحبه 100 شخص أفضل من منتج يقبله 10,000."', author: 'Paul Graham' },
    { text: '"لا تنتظر الظروف المثالية — ابدأ بما لديك الآن."', author: 'Napoleon Hill' },
    { text: '"التسويق الجيد يجعل الشركة تبدو ذكية. المنتج الجيد يجعل المستخدم يشعر بذلك."', author: 'Joe Chernov' },
    { text: '"كل مشكلة كبيرة هي فرصة تجارية كبيرة غير مستغلة."', author: 'Marc Andreessen' }
];

var _frameworks = [
    { id:'lean',   icon:'🗂️', label:'Lean Canvas',   desc:'9 خانات تصف نموذج عملك في صفحة واحدة',  prompt:'Explain the Lean Canvas framework and how to fill it out for my startup step by step.' },
    { id:'swot',   icon:'🔲', label:'SWOT Analysis',  desc:'تحليل القوة والضعف والفرص والمخاطر',    prompt:'Walk me through how to do a thorough SWOT analysis for a startup, with examples for each quadrant.' },
    { id:'okr',    icon:'🎯', label:'OKR Framework',  desc:'أهداف ونتائج قابلة للقياس',              prompt:'How do I implement OKRs in an early-stage startup? Give me examples of good OKRs for a SaaS product.' },
    { id:'5why',   icon:'🔍', label:'5 Whys',         desc:'اكتشف جذر المشكلة بـ 5 أسئلة',          prompt:'Explain the 5 Whys problem-solving technique and walk me through applying it to a real startup problem.' }
];

var _sys = 'You are an expert AI Entrepreneur Coach with 20+ years of experience in startups, venture capital, and business building. You have mentored 500+ founders. Provide practical, actionable, step-by-step guidance. Be direct and specific. Mix English and Arabic naturally when helpful. Structure answers with clear numbered steps when appropriate.';

// ─── CSS ──────────────────────────────────────────────────────────────────────
function _css() {
    if (_cc.styleInjected) return;
    _cc.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        /* Floating button */
        '#coach-fab{position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#9d4edd,#6b21a8);border:none;color:#fff;font-size:1.3rem;cursor:pointer;z-index:4999;box-shadow:0 4px 20px rgba(157,78,221,.5);transition:transform .2s;display:none}',
        '#coach-fab:hover{transform:scale(1.1)}',
        /* Floating panel */
        '#coach-float{position:fixed;bottom:88px;right:24px;width:340px;max-height:60vh;background:rgba(5,10,25,.98);border:1px solid rgba(157,78,221,.4);border-radius:16px;z-index:4999;display:none;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.8),0 0 0 1px rgba(157,78,221,.15);backdrop-filter:blur(20px)}',
        '@media(max-width:600px){#coach-float{width:calc(100vw - 20px);right:10px;bottom:80px}}',
        '.cfl-header{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:8px;flex-shrink:0}',
        '.cfl-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#9d4edd,#6b21a8);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0}',
        '.cfl-name{font-size:.82rem;font-weight:700;color:#c084fc;flex:1}',
        '.cfl-close{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1.1rem;padding:2px 6px}',
        '.cfl-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}',
        '.cfl-msg{max-width:88%;padding:9px 12px;border-radius:12px;font-size:.78rem;line-height:1.6}',
        '.cfl-msg-ai{background:rgba(157,78,221,.15);border:1px solid rgba(157,78,221,.25);color:rgba(255,255,255,.85);align-self:flex-start;border-radius:4px 12px 12px 12px}',
        '.cfl-msg-user{background:rgba(212,175,55,.12);border:1px solid rgba(212,175,55,.25);color:#f0d080;align-self:flex-end;text-align:right;border-radius:12px 4px 12px 12px}',
        '.cfl-topics{display:flex;flex-wrap:wrap;gap:5px;padding:8px 12px;border-top:1px solid rgba(255,255,255,.06)}',
        '.cfl-topic{font-size:.65rem;padding:3px 8px;background:rgba(157,78,221,.1);border:1px solid rgba(157,78,221,.25);border-radius:8px;color:#c084fc;cursor:pointer;transition:all .2s;white-space:nowrap}',
        '.cfl-topic:hover{background:rgba(157,78,221,.2)}',
        '.cfl-input-row{padding:10px 12px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:6px;flex-shrink:0}',
        '.cfl-input{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#fff;padding:7px 10px;font-size:.78rem;outline:none}',
        '.cfl-input:focus{border-color:rgba(157,78,221,.5)}',
        '.cfl-send{background:rgba(157,78,221,.2);border:1px solid rgba(157,78,221,.4);color:#c084fc;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.78rem;transition:all .2s}',
        '.cfl-send:hover{background:rgba(157,78,221,.35)}',
        '.cfl-typing{font-size:.72rem;color:rgba(255,255,255,.3);padding:4px 12px;font-style:italic}',
        /* Full section */
        '#coach-wrap{padding:20px 16px 100px;max-width:800px;margin:0 auto}',
        '.cc-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#c084fc;letter-spacing:.1em;margin-bottom:4px;text-align:center}',
        '.cc-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.cc-card{background:rgba(255,255,255,.04);border:1px solid rgba(157,78,221,.2);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.cc-topics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}',
        '@media(max-width:600px){.cc-topics-grid{grid-template-columns:repeat(2,1fr)}}',
        '.cc-topic-card{background:rgba(157,78,221,.08);border:1px solid rgba(157,78,221,.2);border-radius:12px;padding:14px;text-align:center;cursor:pointer;transition:all .2s}',
        '.cc-topic-card:hover{background:rgba(157,78,221,.18);transform:translateY(-2px)}',
        '.cc-topic-icon{font-size:1.4rem;margin-bottom:5px}',
        '.cc-topic-label{font-size:.75rem;font-weight:600;color:#c084fc}',
        '.cc-chat-area{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px;min-height:200px;max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;margin-bottom:12px}',
        '.cc-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:.83rem;line-height:1.7}',
        '.cc-msg-ai{background:rgba(157,78,221,.12);border:1px solid rgba(157,78,221,.2);color:rgba(255,255,255,.85);align-self:flex-start;white-space:pre-wrap}',
        '.cc-msg-user{background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.2);color:#f0d080;align-self:flex-end;text-align:right}',
        '.cc-action-row{display:flex;gap:8px}',
        '.cc-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;padding:10px 14px;font-size:.84rem;outline:none}',
        '.cc-input:focus{border-color:rgba(157,78,221,.5)}',
        '.cc-btn-send{background:rgba(157,78,221,.15);border:1px solid rgba(157,78,221,.4);color:#c084fc;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:.84rem;font-weight:600;transition:all .2s}',
        '.cc-btn-send:hover{background:rgba(157,78,221,.28)}',
        '.cc-actions{background:rgba(0,245,160,.05);border:1px solid rgba(0,245,160,.15);border-radius:10px;padding:12px 14px;margin-top:12px}',
        '.cc-action-item{font-size:.78rem;color:rgba(255,255,255,.7);padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
        '.cc-action-item:last-child{border-bottom:none}',
        /* Quote card */
        '.cc-quote{background:linear-gradient(135deg,rgba(157,78,221,.12),rgba(107,33,168,.08));border:1px solid rgba(157,78,221,.25);border-radius:14px;padding:16px 20px;margin-bottom:18px;text-align:center}',
        '.cc-quote-text{font-size:.88rem;color:rgba(255,255,255,.8);font-style:italic;line-height:1.7;margin-bottom:6px}',
        '.cc-quote-author{font-size:.7rem;color:#c084fc;font-weight:700;letter-spacing:.06em}',
        /* Stage selector */
        '.cc-stages{display:flex;gap:8px;margin-bottom:18px;justify-content:center;flex-wrap:wrap}',
        '.cc-stage-btn{padding:6px 18px;border-radius:20px;border:1px solid rgba(157,78,221,.3);background:rgba(157,78,221,.06);color:rgba(255,255,255,.5);font-size:.75rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:Tajawal,sans-serif}',
        '.cc-stage-btn:hover{background:rgba(157,78,221,.15);color:#c084fc}',
        '.cc-stage-btn.active{background:rgba(157,78,221,.22);border-color:rgba(157,78,221,.6);color:#c084fc;box-shadow:0 0 12px rgba(157,78,221,.2)}',
        /* Frameworks */
        '.cc-fw-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}',
        '@media(max-width:600px){.cc-fw-grid{grid-template-columns:repeat(2,1fr)}}',
        '.cc-fw-card{background:rgba(0,245,160,.05);border:1px solid rgba(0,245,160,.15);border-radius:12px;padding:14px;cursor:pointer;transition:all .2s;text-align:center}',
        '.cc-fw-card:hover{background:rgba(0,245,160,.1);transform:translateY(-2px);border-color:rgba(0,245,160,.3)}',
        '.cc-fw-icon{font-size:1.3rem;margin-bottom:5px}',
        '.cc-fw-label{font-size:.75rem;font-weight:700;color:#34d399;margin-bottom:3px}',
        '.cc-fw-desc{font-size:.65rem;color:rgba(255,255,255,.4);line-height:1.4}',
        /* Section label */
        '.cc-section-label{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.3);font-weight:700;margin-bottom:10px}',
    ].join('');
    document.head.appendChild(s);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
var _currentStage = 'all';

function _todayQuote() {
    var idx = (new Date().getDate()) % _quotes.length;
    return _quotes[idx];
}

function _topicsForStage(stage) {
    if (stage === 'all') return _topics;
    return _topics.filter(function(t) { return t.stage === stage; });
}

function _topicsGridHtml(stage) {
    return _topicsForStage(stage).map(function(t) {
        return '<div class="cc-topic-card" onclick="_ccAskTopic(\'' + t.id + '\')">' +
            '<div class="cc-topic-icon">' + t.icon + '</div>' +
            '<div class="cc-topic-label">' + t.label + '</div></div>';
    }).join('');
}

// ─── Section View ─────────────────────────────────────────────────────────────
function coachOpen() {
    _css();
    var sec = document.getElementById('coach');
    if (!sec) return;

    var q  = _todayQuote();
    var fwHtml = _frameworks.map(function(f) {
        return '<div class="cc-fw-card" onclick="_ccAskFramework(\'' + f.id + '\')" title="' + f.desc + '">' +
            '<div class="cc-fw-icon">' + f.icon + '</div>' +
            '<div class="cc-fw-label">' + f.label + '</div>' +
            '<div class="cc-fw-desc">' + f.desc + '</div></div>';
    }).join('');

    var stagesHtml = [
        { id:'all',    label:'🌐 الكل' },
        { id:'idea',   label:'💡 مرحلة الفكرة' },
        { id:'launch', label:'🚀 التأسيس والإطلاق' },
        { id:'scale',  label:'📈 النمو والتوسع' }
    ].map(function(s) {
        return '<button class="cc-stage-btn' + (s.id === _currentStage ? ' active' : '') +
               '" onclick="_ccSetStage(\'' + s.id + '\')">' + s.label + '</button>';
    }).join('');

    sec.innerHTML = '<div id="coach-wrap">' +
        '<div class="cc-title">🧠 AI Entrepreneur Coach</div>' +
        '<div class="cc-sub">مدرب أعمال ذكي متاح 24/7 · خطوة بخطوة · تخصيص كامل</div>' +
        /* Daily quote */
        '<div class="cc-quote">' +
            '<div class="cc-quote-text">' + q.text + '</div>' +
            '<div class="cc-quote-author">— ' + q.author + '</div>' +
        '</div>' +
        /* Stage selector */
        '<div class="cc-card">' +
            '<div class="cc-section-label">مرحلة شركتك</div>' +
            '<div class="cc-stages">' + stagesHtml + '</div>' +
            /* Topics grid */
            '<div class="cc-section-label" style="margin-top:4px">المواضيع السريعة</div>' +
            '<div class="cc-topics-grid" id="cc-topics-grid">' + _topicsGridHtml(_currentStage) + '</div>' +
        '</div>' +
        /* Frameworks */
        '<div class="cc-card">' +
            '<div class="cc-section-label">أدوات ريادية سريعة</div>' +
            '<div class="cc-fw-grid">' + fwHtml + '</div>' +
        '</div>' +
        /* Chat */
        '<div class="cc-card">' +
            '<div class="cc-section-label">المحادثة مع المدرب</div>' +
            '<div id="cc-chat-box" class="cc-chat-area">' + _renderHistory() + '</div>' +
            '<div class="cc-action-row" style="margin-top:10px">' +
            '<input class="cc-input" id="cc-input" placeholder="اسأل أي سؤال عن ريادة الأعمال..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();_ccSend()}">' +
            '<button class="cc-btn-send" onclick="_ccSend()">إرسال</button>' +
            '</div>' +
        '</div>' +
        '<div id="cc-actions-panel"></div>' +
        '</div>';

    if (!_cc.history.length) _addAIMsg('مرحباً! 👋 أنا مدرب الأعمال الذكي.\n\nيمكنني مساعدتك في:\n• تأسيس شركتك الناشئة من الصفر\n• استراتيجية التمويل ورفع رأس المال\n• التسويق والنمو السريع\n• بناء الفريق والثقافة المؤسسية\n• الأطر الريادية (Lean Canvas، OKR...)\n\nاختر موضوعاً، أداةً، أو اسألني مباشرة!', false);
}

window._ccSetStage = function(stage) {
    _currentStage = stage;
    /* Update active button */
    document.querySelectorAll('.cc-stage-btn').forEach(function(b) {
        b.classList.toggle('active', b.textContent.includes(
            stage === 'all' ? 'الكل' : stage === 'idea' ? 'الفكرة' : stage === 'launch' ? 'التأسيس' : 'النمو'
        ));
    });
    var grid = document.getElementById('cc-topics-grid');
    if (grid) grid.innerHTML = _topicsGridHtml(stage);
};

window._ccAskFramework = function(id) {
    var f = _frameworks.find(function(fw){ return fw.id === id; });
    if (!f) return;
    _addUserMsg(f.icon + ' ' + f.label);
    _callAI(f.prompt);
    /* Scroll to chat */
    var chat = document.getElementById('cc-chat-box');
    if (chat) setTimeout(function(){ chat.scrollIntoView({ behavior:'smooth', block:'center' }); }, 200);
};

function _renderHistory() {
    return _cc.history.map(function(m) {
        return '<div class="cc-msg ' + (m.role === 'user' ? 'cc-msg-user' : 'cc-msg-ai') + '">' + _AUS_UTILS.sanitize(m.content) + '</div>';
    }).join('');
}

window._ccAskTopic = function(id) {
    var t = _topics.find(function(tp){ return tp.id === id; });
    if (!t) return;
    _addUserMsg(t.icon + ' ' + t.label);
    _callAI(t.prompt);
};

window._ccSend = function() {
    var input = document.getElementById('cc-input');
    if (!input || !input.value.trim()) return;
    var msg = input.value.trim();
    input.value = '';
    _addUserMsg(msg);
    _callAI(msg);
};

function _addUserMsg(text) {
    _cc.history.push({ role: 'user', content: text });
    _refreshChat();
}

function _addAIMsg(text, save) {
    if (save !== false) _cc.history.push({ role: 'assistant', content: text });
    _refreshChat();
    // Extract action items
    var actions = [];
    text.split('\n').forEach(function(line) {
        if (/^\d+\.|^•|^-/.test(line.trim())) actions.push(line.replace(/^\d+\.|^•|^-\s*/,'').trim());
    });
    if (actions.length > 0) {
        var panel = document.getElementById('cc-actions-panel');
        if (panel) {
            panel.innerHTML = '<div class="cc-actions"><div style="font-size:.65rem;color:#00f5a0;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;font-weight:700">✅ خطوات الإجراء</div>' +
                actions.slice(0,5).map(function(a){ return '<div class="cc-action-item">→ ' + _AUS_UTILS.sanitize(a) + '</div>'; }).join('') +
                '</div>';
        }
    }
    _saveHistory();
}

/* ── Offline knowledge base ───────────────────────────────────────────────── */
var _offlineKB = [
    {
        keys: ['fund','تمويل','invest','مستثمر','bootstrap','angel','vc','seed','رأس المال'],
        answer: '💰 استراتيجية التمويل — خطوات عملية:\n\n1. Bootstrap أولاً — اثبت الفكرة بمواردك الخاصة قبل طلب أي تمويل\n2. Friends & Family — الجولة الأولى عادةً $10K–$50K من المقربين\n3. Angel Investors — ابحث عن angels عبر منصات مثل AngelList وشبكتك الجامعية\n4. Accelerators — Y Combinator، 500 Startups، Flat6Labs (للمنطقة العربية) تعطيك تمويلاً ومنتورشيب\n5. Seed Round — بعد التحقق من الـ PMF، ارفع $500K–$2M مقابل 15–25%\n\n⚡ نصيحة: لا تبحث عن تمويل حتى تكون لديك أرقام تثبت النمو. المستثمر يشتري المستقبل بناءً على ماضيك.'
    },
    {
        keys: ['market','تسويق','brand','growth','نمو','عملاء','customer','acquisition','ديجيتال'],
        answer: '📣 استراتيجية التسويق للـ Startups:\n\n1. حدّد ICP (Ideal Customer Profile) أولاً — من هو عميلك المثالي بالضبط؟\n2. اختر قناة واحدة وأتقنها — لا تشتت نفسك في كل القنوات\n3. Content Marketing — ابنِ ثقة مجانية عبر محتوى يحل مشاكل جمهورك\n4. Referral Programs — العملاء الحاليون أفضل مصدر لعملاء جدد\n5. SEO + Paid Ads — SEO للمدى البعيد، Ads للنتائج الفورية\n\n⚡ نصيحة: The best marketing is a product people love. ركّز على المنتج أولاً، التسويق يأتي بعده.'
    },
    {
        keys: ['mvp','prototype','product','منتج','بناء','launch','إطلاق','develop'],
        answer: '🛠️ كيف تبني وتطلق MVP بسرعة:\n\n1. عرّف المشكلة الواحدة التي تحلها — امنع Scope Creep\n2. رسم wireframes خلال 48 ساعة — قبل أي كود\n3. اختبر الـ prototype مع 10 مستخدمين حقيقيين\n4. ابنِ فقط الـ core loop — ما الذي يجعل المستخدم يعود؟\n5. أطلق بعد 6–8 أسابيع كحد أقصى — الإطلاق المبكر أفضل من الكمال المتأخر\n\n⚡ نصيحة: "If you are not embarrassed by the first version of your product, you launched too late." — Reid Hoffman'
    },
    {
        keys: ['team','فريق','hire','توظيف','cofounder','مؤسس','culture','ثقافة','موظف'],
        answer: '👥 بناء الفريق المؤسسي:\n\n1. Co-founder يكمّلك — ابحث عن مهارات مختلفة، قيم متشابهة\n2. الأوائل العشرة يحددون ثقافتك — تعامل مع كل توظيف كقرار استراتيجي\n3. Culture Fit لا يعني Clone — تنوع الأفكار يقوي الشركة\n4. Equity Table — خصص 10–20% لـ Employee Stock Option Pool من البداية\n5. اطرد بسرعة — التأخر في إنهاء موظف لا يناسب يضر بالفريق كله\n\n⚡ نصيحة: Hire slow, fire fast. والأهم: hire for attitude, train for skill.'
    },
    {
        keys: ['pitch','عرض','investor','presentation','deck','مستثمرين','مبيعات'],
        answer: '🎯 عرض المستثمرين — هيكل الـ Pitch المثالي:\n\n1. Problem — مشكلة واضحة وقابلة للقياس (30 ثانية)\n2. Solution — كيف تحلها بشكل مختلف\n3. Market Size — TAM / SAM / SOM بأرقام\n4. Traction — ما حققته حتى الآن (أرقام، عملاء، نمو)\n5. Business Model — كيف تجني المال؟\n6. Team — لماذا أنتم تحديداً؟\n7. Ask — كم تطلب ولماذا؟\n\n⚡ نصيحة: المستثمر يستثمر في الفريق أولاً، ثم السوق، ثم المنتج. أظهر شغفك وكفاءتك.'
    },
    {
        keys: ['legal','قانون','تأسيس','register','شركة','incorporation','contract','ترخيص'],
        answer: '⚖️ التأسيس القانوني للشركة الناشئة:\n\n1. اختر الكيان القانوني — LLC أو SPC (للسعودية) أو Free Zone (الإمارات)\n2. Shareholder Agreement — وثّق حصص المؤسسين من اليوم الأول\n3. IP Assignment — تأكد أن كل الملكية الفكرية للشركة لا للأفراد\n4. Terms of Service + Privacy Policy — إلزامي قبل الإطلاق\n5. Vesting Schedule — 4 سنوات مع cliff سنة لحماية الفريق\n\n⚡ نصيحة: لا تؤجل التوثيق القانوني — النزاعات بين المؤسسين تقتل الشركات أكثر من المنافسة.'
    },
    {
        keys: ['lean canvas','lean','canvas','swot','okr','framework','5 why','نموذج','أداة'],
        answer: '📊 الأطر الريادية الأساسية:\n\n🗂️ Lean Canvas — 9 خانات: Problem / Solution / UVP / Channels / Customer Segments / Revenue / Cost / Key Metrics / Unfair Advantage\n\n🔲 SWOT — حلل: Strengths (داخلي) / Weaknesses (داخلي) / Opportunities (خارجي) / Threats (خارجي)\n\n🎯 OKRs — Objective: هدف نوعي طموح + Key Results: 3 نتائج قابلة للقياس بنسب مئوية\n\n🔍 5 Whys — اسأل "لماذا؟" 5 مرات متتالية للوصول لجذر المشكلة الحقيقية\n\n⚡ اختر الأداة المناسبة للمرحلة — Lean Canvas للبداية، OKR للنمو.'
    },
    {
        keys: ['price','تسعير','pricing','revenue','إيراد','subscription','freemium','model'],
        answer: '💲 استراتيجية التسعير الذكي:\n\n1. Value-Based Pricing — سعّر بناءً على القيمة للعميل، لا التكلفة\n2. Freemium — مجاني للدخول، مدفوع للقيمة المتقدمة\n3. Tiered Pricing — 3 مستويات (Basic / Pro / Enterprise) يزيد ARPU\n4. Annual vs Monthly — ادفع سنوياً بخصم 20% = تدفق نقدي أفضل لك\n5. اختبر A/B على الأسعار — ارفع السعر حتى تجد مقاومة\n\n⚡ نصيحة: معظم الـ startups تسعّر أقل من اللازم. ارفع سعرك بجرأة وراقب الـ conversion rate.'
    },
    {
        keys: ['exit','acquisition','ipo','استحواذ','خروج','بيع','scale','توسع'],
        answer: '🚀 خيارات الخروج وإستراتيجية التوسع:\n\nأنواع الخروج:\n1. Acquisition — شركة كبرى تشتريك (الأكثر شيوعاً للـ startups)\n2. IPO — طرح عام في البورصة (يتطلب $50M+ revenue عادةً)\n3. Management Buyout — الفريق يشتري حصص المستثمرين\n4. Merger — اندماج مع شركة مماثلة\n\nمتى تفكر في الخروج؟\n• عندما تصل لـ PMF قوي ونمو مستدام\n• أو عندما يكون الـ strategic acquirer أقدر على تنمية المنتج\n\n⚡ نصيحة: ابنِ الشركة وكأنك تحتفظ بها للأبد — هذا ما يجعلها تُباع بأعلى سعر.'
    }
];

function _offlineAnswer(msg) {
    var q = (msg || '').toLowerCase();
    for (var i = 0; i < _offlineKB.length; i++) {
        var kb = _offlineKB[i];
        for (var j = 0; j < kb.keys.length; j++) {
            if (q.indexOf(kb.keys[j].toLowerCase()) !== -1) {
                return kb.answer;
            }
        }
    }
    /* Generic fallback */
    return '🧠 مدرب الأعمال — وضع عدم الاتصال\n\nيمكنني مساعدتك في هذه المواضيع حالياً:\n\n💰 التمويل وجذب المستثمرين\n📣 التسويق والنمو\n🛠️ بناء MVP وإطلاق المنتج\n👥 بناء الفريق والتوظيف\n🎯 عرض المستثمرين (Pitch)\n⚖️ التأسيس القانوني\n💲 استراتيجية التسعير\n🚀 الخروج والاستحواذ\n\nاسأل عن أي من هذه المواضيع للحصول على إجابة مفصّلة.';
}

function _callAI(userMsg) {
    var box = document.getElementById('cc-chat-box');
    if (box) { var typing = document.createElement('div'); typing.className = 'cfl-typing'; typing.id='cc-typing'; typing.textContent='يكتب...'; box.appendChild(typing); box.scrollTop = box.scrollHeight; }
    _AUS_AI.ask('coach', userMsg, _sys, function(err, text) {
        var t = document.getElementById('cc-typing'); if (t) t.remove();
        _addAIMsg(text || _offlineAnswer(userMsg));
        window._AUS_BUS.emit('XP_AWARDED', { amount: 5, source: 'coach_ask' });
    });
}

function _refreshChat() {
    var box = document.getElementById('cc-chat-box');
    if (!box) return;
    box.innerHTML = _renderHistory();
    box.scrollTop = box.scrollHeight;
}

function _saveHistory() {
    try { localStorage.setItem(_cc.storageKey, JSON.stringify(_cc.history.slice(-40))); } catch(e){}
}

// ─── Floating Coach Button ─────────────────────────────────────────────────────
function _mountFAB() {
    if (document.getElementById('coach-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'coach-fab'; fab.title = 'AI Coach';
    fab.textContent = '🧠';
    fab.onclick = function() { _toggleFloat(); };
    document.body.appendChild(fab);

    var panel = document.createElement('div');
    panel.id = 'coach-float';
    panel.innerHTML = '<div class="cfl-header"><div class="cfl-avatar">🧠</div>' +
        '<span class="cfl-name">AI Coach</span>' +
        '<button class="cfl-close" onclick="_toggleFloat()">×</button></div>' +
        '<div class="cfl-msgs" id="cfl-msgs"><div class="cfl-msg cfl-msg-ai">كيف يمكنني مساعدتك اليوم؟</div></div>' +
        '<div class="cfl-topics">' + _topics.slice(0,4).map(function(t){ return '<span class="cfl-topic" onclick="_cflTopic(\'' + t.id + '\')">' + t.icon + ' ' + t.label + '</span>'; }).join('') + '</div>' +
        '<div class="cfl-input-row"><input class="cfl-input" id="cfl-input" placeholder="اسأل..." onkeydown="if(event.key===\'Enter\'){_cflSend()}"><button class="cfl-send" onclick="_cflSend()">↑</button></div>';
    document.body.appendChild(panel);
}

function _toggleFloat() {
    _css();
    _mountFAB();
    var panel = document.getElementById('coach-float');
    if (!panel) return;
    _cc.open = !_cc.open;
    panel.style.display = _cc.open ? 'flex' : 'none';
}

window._cflTopic = function(id) {
    var t = _topics.find(function(tp){ return tp.id === id; });
    if (!t) return;
    _cflAddMsg(t.label, true);
    _cflCallAI(t.prompt);
};

window._cflSend = function() {
    var inp = document.getElementById('cfl-input');
    if (!inp || !inp.value.trim()) return;
    var msg = inp.value.trim(); inp.value = '';
    _cflAddMsg(msg, true);
    _cflCallAI(msg);
};

function _cflAddMsg(text, isUser) {
    var msgs = document.getElementById('cfl-msgs');
    if (!msgs) return;
    var d = document.createElement('div');
    d.className = 'cfl-msg ' + (isUser ? 'cfl-msg-user' : 'cfl-msg-ai');
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
}

function _cflCallAI(msg) {
    var msgs = document.getElementById('cfl-msgs');
    if (msgs) { var t = document.createElement('div'); t.className = 'cfl-typing'; t.id = 'cfl-typing'; t.textContent = 'يكتب...'; msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight; }
    _AUS_AI.ask('coach', msg, _sys, function(err, text) {
        var t2 = document.getElementById('cfl-typing'); if (t2) t2.remove();
        _cflAddMsg(text || _offlineAnswer(msg), false);
    });
}

// Show FAB when app is in main view (outside section pages)
window._AUS_BUS.on('XP_AWARDED', function() {
    var fab = document.getElementById('coach-fab');
    if (fab) fab.style.display = 'block';
});

// Load history
try {
    var saved = localStorage.getItem('aus.coach.history');
    if (saved) _cc.history = JSON.parse(saved).slice(-40);
} catch(e) {}

// Register
if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('coach', { open: coachOpen, toggleFloat: _toggleFloat }, {
        name: 'AI Coach', icon: '🧠', sectionId: 'coach',
        defaultEnabled: true, sprint: 2
    });
}
window.coachOpen = coachOpen;
window.coachToggle = _toggleFloat;

// Mount FAB after DOM ready
if (document.readyState === 'complete') { _css(); _mountFAB(); }
else { window.addEventListener('load', function(){ _css(); _mountFAB(); }); }

})();
