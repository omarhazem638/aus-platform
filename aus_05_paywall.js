// ===========================================================================
// =========== PAYWALL — Leadership Premium Files (16 files × 10 JOD) ========
// ===========================================================================

const PAY_KEY = 'aus.purchased.files';

// ── Merchant CliQ / IBAN config (server-side canonical, localStorage cache) ───
var _MERCHANT_API = (typeof CHAT_API_BASE !== 'undefined' ? CHAT_API_BASE : 'http://127.0.0.1:8002') + '/api/merchant/config';
var _MERCHANT_DEFAULTS = {
    cliqAlias:   '',
    cliqPhone:   '',
    iban:        'JO88JIBA0710002429473412400002',
    bankName:    '',
    accountName: 'AUS — AI University Simulator',
};

// Start from localStorage cache so the UI is instant while the server responds
var _MERCHANT = (function() {
    try {
        var c = JSON.parse(localStorage.getItem('aus.merchant.config') || '{}');
        return Object.assign({}, _MERCHANT_DEFAULTS, c);
    } catch { return Object.assign({}, _MERCHANT_DEFAULTS); }
})();

// Async refresh from server — updates _MERCHANT and the admin panel inputs if open
(function _loadMerchantFromServer() {
    fetch(_MERCHANT_API, { cache: 'no-store' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (!data) return;
            _MERCHANT.cliqAlias   = data.cliqAlias   || _MERCHANT_DEFAULTS.cliqAlias;
            _MERCHANT.cliqPhone   = data.cliqPhone   || _MERCHANT_DEFAULTS.cliqPhone;
            _MERCHANT.iban        = data.iban        || _MERCHANT_DEFAULTS.iban;
            _MERCHANT.bankName    = data.bankName    || _MERCHANT_DEFAULTS.bankName;
            _MERCHANT.accountName = data.accountName || _MERCHANT_DEFAULTS.accountName;
            // Refresh localStorage cache
            try { localStorage.setItem('aus.merchant.config', JSON.stringify(_MERCHANT)); } catch (_) {}
            // Re-populate admin inputs if the panel is already open
            if (document.getElementById('m-iban')) _populateMerchantInputs();
        })
        .catch(function() { /* server unavailable — keep localStorage values */ });
})();

function _saveMerchantSettings() {
    // Only the app owner may edit payment/app configuration.
    if (typeof ausAuth !== 'undefined' && ausAuth && !ausAuth.isOwner) {
        var _m = document.getElementById('merchant-save-msg');
        if (_m) { _m.textContent = 'التعديل متاح لمالك التطبيق فقط'; setTimeout(function(){ _m.textContent=''; }, 3000); }
        return;
    }
    var alias    = (document.getElementById('m-cliqAlias')      || {}).value || '';
    var phone    = (document.getElementById('m-cliqPhone')      || {}).value || '';
    var iban     = (document.getElementById('m-iban')           || {}).value || '';
    var bankName = (document.getElementById('m-bankName')       || {}).value || '';
    var accName  = (document.getElementById('m-accountName')    || {}).value || '';
    var paypalId = (document.getElementById('m-paypalClientId') || {}).value || '';

    _MERCHANT.cliqAlias   = alias.trim();
    _MERCHANT.cliqPhone   = phone.trim();
    _MERCHANT.iban        = iban.trim() || _MERCHANT_DEFAULTS.iban;
    _MERCHANT.bankName    = bankName.trim();
    _MERCHANT.accountName = accName.trim() || 'AUS — AI University Simulator';

    var msg = document.getElementById('merchant-save-msg');
    function _showMsg(text) {
        if (msg) { msg.textContent = text; setTimeout(function(){ msg.textContent=''; }, 3500); }
    }

    // Save PayPal Client ID separately (loaded at page-start in HTML)
    try {
        if (paypalId.trim().length > 8) {
            localStorage.setItem('aus.paypal.clientId', paypalId.trim());
        } else {
            localStorage.removeItem('aus.paypal.clientId');
        }
    } catch (_) {}

    // Get auth token for server save
    var token = (typeof ausAuth !== 'undefined' && ausAuth && ausAuth.token) ? ausAuth.token : null;

    // Always save to localStorage as immediate cache
    try { localStorage.setItem('aus.merchant.config', JSON.stringify(_MERCHANT)); } catch (_) {}

    if (token || window.AUS_SESSION) {
        // Save to server (canonical, persistent across devices). Through the shared session gate (aus_52_session.js) when it is loaded:
        // Authorization header + automatic renewal of the 15-minute token (a plain fetch with a stale token answered 401 → "saved locally").
        (window.AUS_SESSION
            ? window.AUS_SESSION.request('PUT', '/api/merchant/config', _MERCHANT, { interactive: true, owner: true }).then(function (r) { return { ok: r.ok, status: r.status, declined: r.session === 'declined' }; })
            : fetch(_MERCHANT_API, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(_MERCHANT),
            })
        ).then(function(r) {
            if (r.ok) {
                _showMsg(paypalId.trim().length > 8
                    ? '✓ تم الحفظ على السيرفر — أعد تحميل الصفحة لتفعيل PayPal الجديد'
                    : '✓ تم الحفظ على السيرفر بنجاح');
            } else {
                _showMsg(r.declined ? '✓ تم الحفظ محلياً فقط — لم تُسجَّل الدخول إلى الخادم فلم تُحفظ عليه'
                    : r.status === 403 ? '✓ تم الحفظ محلياً فقط — الخادم يقبل التعديل من حساب المالك فقط'
                    : '✓ تم حفظ محلياً (السيرفر غير متاح)');
            }
        }).catch(function() {
            _showMsg('✓ تم حفظ محلياً (السيرفر غير متاح)');
        });
    } else {
        _showMsg(paypalId.trim().length > 8
            ? '✓ تم الحفظ — أعد تحميل الصفحة لتفعيل PayPal الجديد'
            : '✓ تم الحفظ بنجاح');
    }
}

function _populateMerchantInputs() {
    var savedPaypal = '';
    try { savedPaypal = localStorage.getItem('aus.paypal.clientId') || ''; } catch (_) {}
    var fields = {
        'm-cliqAlias':      _MERCHANT.cliqAlias,
        'm-cliqPhone':      _MERCHANT.cliqPhone,
        'm-iban':           _MERCHANT.iban,
        'm-bankName':       _MERCHANT.bankName,
        'm-accountName':    _MERCHANT.accountName !== 'AUS — AI University Simulator' ? _MERCHANT.accountName : '',
        'm-paypalClientId': savedPaypal,
    };
    Object.keys(fields).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = fields[id] || '';
    });
}
const PERSONALITY_LABEL_AR = { autocratic: 'القائد الأوتوقراطي', democratic: 'القائد الديمقراطي', transformational: 'القائد التحويلي', delegative: 'القائد التفويضي', analytical: 'الشخصية التحليلية', creative: 'الشخصية الإبداعية', social: 'الشخصية الاجتماعية', operational: 'الشخصية التنفيذية', strategic: 'الشخصية الاستراتيجية' };
const PERSONALITY_EMOJI   = { autocratic: '👑', democratic: '🤝', transformational: '🚀', delegative: '🎯', analytical: '🔬', creative: '🎨', social: '🤲', operational: '⚡', strategic: '♟️' };

// Combined catalog — 4 books (20 JOD each) + 16 files (10 JOD each) = 20 products + 4 CDNA books
const LEADERSHIP_FILES = [
    // ===== CAREER DNA BOOKS — 4 books (20 JOD each) — كتاب تطوير الشخصية القيادية =====
    { id: 'book-cdna-cre', type: 'book', archetype: 'creative',   cdnaType: 'creative',   icon: '🎨', title: 'كتاب الشخصية القيادية الإبداعية',   subtitle: 'المنهج الكامل لتطوير القائد المبدع',         desc: 'الدليل الشامل لتطوير الشخصية القيادية الإبداعية: فهم طبيعتك الإبداعية العميقة، بناء بيئة ابتكار حقيقية، تحويل الأفكار إلى مشاريع تُغيّر المؤسسات، وصناعة تأثير قيادي يدوم — مع 40 تمريناً وحالات دراسية من أبرز القادة الإبداعيين في العالم.', size: '50 صفحة · PDF + EPUB', price: 20 },
    { id: 'book-cdna-soc', type: 'book', archetype: 'social',     cdnaType: 'social',     icon: '🤝', title: 'كتاب الشخصية القيادية الاجتماعية',   subtitle: 'فنّ القيادة بالإنسانية والتأثير',           desc: 'الدليل الشامل لتطوير الشخصية القيادية الاجتماعية: بناء تأثير إنساني عميق، إتقان فنّ الاستماع والتواصل، تحويل العلاقات إلى أصل استراتيجي، وبناء فرق تعمل بولاء حقيقي — مع منهجية عملية مُختبرة من أكثر القادة تأثيراً في العالم.', size: '50 صفحة · PDF + EPUB', price: 20 },
    { id: 'book-cdna-str', type: 'book', archetype: 'strategic',  cdnaType: 'strategic',  icon: '♟️', title: 'كتاب الشخصية القيادية الاستراتيجية', subtitle: 'منهجية القائد الذي يصنع المستقبل',         desc: 'الدليل الشامل لتطوير الشخصية القيادية الاستراتيجية: تطوير التفكير بعيد المدى، قراءة إشارات المستقبل، صنع قرارات كبيرة في ظل الغموض، وبناء مؤسسات تدوم لعقود — منهجية شاملة من تجارب قادة Fortune 500 وصانعي التاريخ.', size: '50 صفحة · PDF + EPUB', price: 20 },
    { id: 'book-cdna-ops', type: 'book', archetype: 'operational', cdnaType: 'operational', icon: '⚡', title: 'كتاب الشخصية القيادية التنفيذية',   subtitle: 'فنّ الإنجاز والتميّز التشغيلي',             desc: 'الدليل الشامل لتطوير الشخصية القيادية التنفيذية: بناء نظام تنفيذ لا يقبل الأعذار، زرع ثقافة الإتقان في فريقك، تحويل الأهداف الضبابية إلى إنجازات ملموسة، وبناء انضباط قيادي صارم — الكتاب الذي يجعلك تُنجز ضعف ما كنت تُنجزه.', size: '50 صفحة · PDF + EPUB', price: 20 },

    // ===== 4 BOOKS — 20 JOD =====
    { id: 'book-aut', type: 'book', archetype: 'autocratic',       icon: '👑', title: 'كتاب القائد الأوتوقراطي',  subtitle: 'فنّ الحزم في القرار',  desc: 'كتاب شامل: متى تتخذ القرار وحدك، إدارة الأزمات بأسلوب الكابتن، بناء انضباط فريق عالي الأداء، ومتى تتراجع عن الحزم.', size: '50 صفحة · PDF + EPUB', price: 20 },
    { id: 'book-dem', type: 'book', archetype: 'democratic',       icon: '🤝', title: 'كتاب القائد الديمقراطي',   subtitle: 'فنّ بناء التوافق',     desc: 'دليل عملي: تيسير الاجتماعات الذكية، بناء الإجماع دون تأخير، إدارة فرق متنوعة عن بُعد، وتطوير قادة الصف الثاني في 90 يوماً.', size: '50 صفحة · PDF + EPUB', price: 20 },
    { id: 'book-tra', type: 'book', archetype: 'transformational', icon: '🚀', title: 'كتاب القائد التحويلي',     subtitle: 'فنّ تغيير العالم',     desc: 'منهج كامل: صياغة الرؤية الملهمة، نقل المؤسسات من نموذج 1.0 إلى 3.0، بناء ثقافة ابتكار مستدامة، وفنّ Storytelling التنفيذي.', size: '50 صفحة · PDF + EPUB', price: 20 },
    { id: 'book-del', type: 'book', archetype: 'delegative',       icon: '🎯', title: 'كتاب القائد التفويضي',     subtitle: 'فنّ الثقة الذكية',     desc: 'دليل التفويض الفعّال: مصفوفة RACI المتقدّمة، إدارة فرق الخبراء المستقلين، OKRs قائمة على الثقة، وبناء قادة يخلفونك.', size: '50 صفحة · PDF + EPUB', price: 20 },

    // ===== 16 FILES — 10 JOD =====
    // --- Autocratic (4) ---
    { id: 'aut-1', type: 'file', archetype: 'autocratic', icon: '⚡',  title: 'دليل اتخاذ القرارات الحاسمة',     desc: 'إطار من 12 خطوة لاتخاذ قرارات صارمة تحت الضغط مع تقليل المخاطر.',          size: '11 صفحة · PDF', price: 10 },
    { id: 'aut-2', type: 'file', archetype: 'autocratic', icon: '🛡️', title: 'إدارة الأزمات بأسلوب الكابتن',    desc: 'بروتوكولات Crisis Command و checklists لقيادة الفرق في اللحظات الحرجة.',   size: '12 صفحة · PDF', price: 10 },
    { id: 'aut-3', type: 'file', archetype: 'autocratic', icon: '📐', title: 'بناء انضباط فريق عالي الأداء',     desc: 'كيف تبني ثقافة دقّة دون قمع الإبداع — مع نماذج تقييم وOKR صارمة.',         size: '12 صفحة · PDF', price: 10 },
    { id: 'aut-4', type: 'file', archetype: 'autocratic', icon: '🎯', title: 'متى تتراجع عن الحزم؟',             desc: 'مصفوفة قرار: 8 إشارات تخبرك متى تتحوّل من الأوتوقراطية إلى أسلوب آخر.',     size: '11 صفحة · PDF', price: 10 },

    // --- Democratic (4) ---
    { id: 'dem-1', type: 'file', archetype: 'democratic', icon: '🗣️', title: 'فنّ تيسير الاجتماعات الذكية',     desc: 'تقنيات Liberating Structures + قوالب اجتماعات تنتج قرارات لا جلسات.',     size: '12 صفحة · PDF', price: 10 },
    { id: 'dem-2', type: 'file', archetype: 'democratic', icon: '⚖️', title: 'بناء الإجماع دون تأخير القرار',   desc: 'منهج 1-3-Decide لاختصار زمن التوافق من أيام إلى ساعة واحدة.',             size: '11 صفحة · PDF', price: 10 },
    { id: 'dem-3', type: 'file', archetype: 'democratic', icon: '🌐', title: 'إدارة الفرق المتنوعة عن بُعد',     desc: 'كيف تخلق ثقافة تشاركية في فرق موزّعة عبر 3 قارات و4 لغات.',                 size: '12 صفحة · PDF', price: 10 },
    { id: 'dem-4', type: 'file', archetype: 'democratic', icon: '🧭', title: 'تطوير قادة الصف الثاني',            desc: 'برنامج 90 يوماً لتدريب نوّابك على القرار المستقل والمسؤولية.',              size: '12 صفحة · PDF', price: 10 },

    // --- Transformational (4) ---
    { id: 'tra-1', type: 'file', archetype: 'transformational', icon: '🚀', title: 'صياغة الرؤية الملهمة',       desc: 'إطار 5 طبقات لرؤية تبقى لعقد كامل — مع 12 مثالاً من شركات قائدة.',         size: '12 صفحة · PDF', price: 10 },
    { id: 'tra-2', type: 'file', archetype: 'transformational', icon: '🔥', title: 'قيادة التحوّل الكبير',        desc: 'كيف تنقل مؤسسة من نموذج 1.0 إلى 3.0 دون فقدان أفضل المواهب.',             size: '13 صفحة · PDF', price: 10 },
    { id: 'tra-3', type: 'file', archetype: 'transformational', icon: '💡', title: 'ثقافة الابتكار المستدام',     desc: 'بناء Innovation Lab داخلي بميزانية أقل من 5% من الإيراد.',                 size: '12 صفحة · PDF', price: 10 },
    { id: 'tra-4', type: 'file', archetype: 'transformational', icon: '🎤', title: 'فنّ Storytelling التنفيذي',  desc: 'بنية الحكاية في 3 فصول + نماذج خطابات لإطلاق المنتجات والأزمات.',           size: '12 صفحة · PDF', price: 10 },

    // --- Delegative (4) ---
    { id: 'del-1', type: 'file', archetype: 'delegative', icon: '🎯', title: 'تفويض ذكي بلا فقدان السيطرة',     desc: 'مصفوفة RACI متقدّمة + 6 آليات للرقابة الذكية على المخرجات.',                size: '13 صفحة · PDF', price: 10 },
    { id: 'del-2', type: 'file', archetype: 'delegative', icon: '🔑', title: 'إدارة فرق الخبراء المستقلين',     desc: 'كيف تقود علماء بيانات ومهندسي سيليكون فالي بلا micromanagement.',           size: '12 صفحة · PDF', price: 10 },
    { id: 'del-3', type: 'file', archetype: 'delegative', icon: '📊', title: 'OKRs قائمة على الثقة',             desc: 'صياغة أهداف يملكها الفريق ويقيس نفسه بها — Buffett-style.',                  size: '12 صفحة · PDF', price: 10 },
    { id: 'del-4', type: 'file', archetype: 'delegative', icon: '🌱', title: 'بناء قادة يخلفونك',                desc: 'خطة Succession Planning عملية في 6 أشهر — للأدوار الحرجة.',                size: '12 صفحة · PDF', price: 10 },

    // ===== CAREER DNA COURSES — 20 files (10 JOD each) — تطوير الشخصية القيادية =====

    // --- الشخصية القيادية التحليلية (4) ---
    { id: 'cdna-ana-1', type: 'file', archetype: 'analytical', cdnaType: 'analytical', icon: '🧠', title: 'دليل تطوير الشخصية القيادية التحليلية',      desc: 'الدليل الشامل لفهم طبيعة القائد التحليلي وتعزيز قدراته: كيف تفكر، تقرر، وتقود بالعقل والمنطق دون فقدان الإنسانية.',          size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-ana-2', type: 'file', archetype: 'analytical', cdnaType: 'analytical', icon: '🔍', title: 'التفكير النقدي: سلاح القائد التحليلي',         desc: 'كيف تطوّر عقلاً قادراً على رؤية ما يخفى على الآخرين — تمارين يومية لبناء التحليل العميق والحكم الدقيق.',                     size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-ana-3', type: 'file', archetype: 'analytical', cdnaType: 'analytical', icon: '⚖️', title: 'القرار المبني على الدليل لا على الحدس',        desc: 'منهجية القائد التحليلي في صنع القرار: متى تثق بالأرقام ومتى تضيف الحكمة الإنسانية — 8 نماذج قرار مُختبرة.',                size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-ana-4', type: 'file', archetype: 'analytical', cdnaType: 'analytical', icon: '📡', title: 'من التحليل إلى الإلهام: القيادة بالأرقام',      desc: 'كيف تحوّل نقطة ضعف القائد التحليلي — الجفاف العاطفي — إلى قوة: فنّ ترجمة البيانات إلى قصص تحفّز الفرق.',                   size: '11 صفحة · PDF', price: 10 },

    // --- الشخصية القيادية الإبداعية (4) ---
    { id: 'cdna-cre-1', type: 'file', archetype: 'creative',   cdnaType: 'creative',   icon: '🎨', title: 'دليل تطوير الشخصية القيادية الإبداعية',       desc: 'الدليل الشامل لفهم القائد الإبداعي وصقل هويته: كيف تحوّل خيالك وجرأتك إلى رؤية تُحرّك المؤسسات وتصنع المستقبل.',           size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-cre-2', type: 'file', archetype: 'creative',   cdnaType: 'creative',   icon: '💡', title: 'إشعال الإبداع: بناء عقلية القائد المبتكر',      desc: 'تمارين يومية وأُطر تفكير تُحرّر عقلك من القيود المعتادة — كيف يرى القائد الإبداعي المشكلة فرصة لم يلاحظها أحد.',            size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-cre-3', type: 'file', archetype: 'creative',   cdnaType: 'creative',   icon: '🌊', title: 'الشخصية الإبداعية تحت الضغط',                  desc: 'كيف تحافظ على إبداعك في بيئات الأزمات والقيود — سر القادة الإبداعيين في تحويل المحدودية إلى وقود للابتكار.',                 size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-cre-4', type: 'file', archetype: 'creative',   cdnaType: 'creative',   icon: '🚀', title: 'من الفكرة إلى التغيير: رحلة القائد الإبداعي',   desc: 'خطوات عملية لتحويل أفكارك الإبداعية إلى مشاريع حقيقية — كيف تبيع رؤيتك لفريقك والإدارة والعالم.',                           size: '11 صفحة · PDF', price: 10 },

    // --- الشخصية القيادية الاجتماعية (4) ---
    { id: 'cdna-soc-1', type: 'file', archetype: 'social',     cdnaType: 'social',     icon: '🤝', title: 'دليل تطوير الشخصية القيادية الاجتماعية',       desc: 'الدليل الشامل للقائد الاجتماعي: كيف تبني تأثيراً إنسانياً عميقاً وتُحوّل العلاقات إلى أصل استراتيجي حقيقي.',                size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-soc-2', type: 'file', archetype: 'social',     cdnaType: 'social',     icon: '❤️', title: 'فنّ التأثير الإنساني: القائد الذي يُلهم',        desc: 'كيف تلمس قلوب فريقك وتحرّك سلوكهم بالاتصال العاطفي الحقيقي — الفرق بين القائد المحبوب والقائد المحترم.',                   size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-soc-3', type: 'file', archetype: 'social',     cdnaType: 'social',     icon: '🌐', title: 'بناء الثقة والتعاون: قوة القائد الاجتماعي',     desc: 'كيف تبني بيئة عمل يثق فيها الناس ببعضهم ويتعاونون بلا مراسيم — السر في تطوير رأس المال الاجتماعي للمؤسسة.',               size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-soc-4', type: 'file', archetype: 'social',     cdnaType: 'social',     icon: '💬', title: 'التواصل الفعّال: لغة القائد الاجتماعي',          desc: 'إتقان الاستماع العميق والحوار المؤثر والتفاوض بالتعاطف — 12 تقنية لبناء علاقات تدوم عقوداً في بيئة الأعمال.',               size: '11 صفحة · PDF', price: 10 },

    // --- الشخصية القيادية التنفيذية (4) ---
    { id: 'cdna-ops-1', type: 'file', archetype: 'operational', cdnaType: 'operational', icon: '⚡', title: 'دليل تطوير الشخصية القيادية التنفيذية',     desc: 'الدليل الشامل للقائد التنفيذي: كيف تحوّل الخطط إلى إنجازات ملموسة وتبني ثقافة تنفيذ لا تقبل الأعذار.',                      size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-ops-2', type: 'file', archetype: 'operational', cdnaType: 'operational', icon: '🎯', title: 'فنّ الإنجاز: كيف يفكر القائد التنفيذي',      desc: 'طريقة تفكير القادة التنفيذيين العظماء: كيف يحوّلون الأهداف الضبابية إلى خطوات واضحة وفِرَق منضبطة ونتائج مضمونة.',           size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-ops-3', type: 'file', archetype: 'operational', cdnaType: 'operational', icon: '🏆', title: 'بناء ثقافة التميّز التنفيذي في فريقك',       desc: 'كيف تزرع في فريقك حبّ الإتقان والمبادرة وإنهاء المهام — تحويل الجماعة العادية إلى فريق تنفيذي استثنائي.',                    size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-ops-4', type: 'file', archetype: 'operational', cdnaType: 'operational', icon: '🔥', title: 'الانضباط القيادي: سر القائد التنفيذي',       desc: 'الفرق بين الانشغال والإنتاجية — كيف يبني القائد التنفيذي نظاماً شخصياً صارماً يجعله يُنجز ضعف الآخرين بنصف الجهد.',           size: '11 صفحة · PDF', price: 10 },

    // --- الشخصية القيادية الاستراتيجية (4) ---
    { id: 'cdna-str-1', type: 'file', archetype: 'strategic',  cdnaType: 'strategic',  icon: '♟️', title: 'دليل تطوير الشخصية القيادية الاستراتيجية',    desc: 'الدليل الشامل للقائد الاستراتيجي: كيف تطوّر عقلية الشطرنج التي ترى ما بعد 5 خطوات وتبني مؤسسات تدوم لعقود.',                size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-str-2', type: 'file', archetype: 'strategic',  cdnaType: 'strategic',  icon: '🌍', title: 'التفكير الاستراتيجي: رؤية ما لا يراه الآخرون', desc: 'كيف تطوّر نظرة ثاقبة للمستقبل وتقرأ إشارات التغيير قبل أن تصبح أزمات — منهجية القائد الاستراتيجي في التفكير بعيد المدى.',     size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-str-3', type: 'file', archetype: 'strategic',  cdnaType: 'strategic',  icon: '🎯', title: 'قراءة المستقبل وصناعة القرار الاستراتيجي',     desc: 'كيف تتعامل مع الغموض وتتخذ قرارات كبيرة بمعلومات ناقصة — أُطر التفكير التي يستخدمها قادة Fortune 500.',                    size: '11 صفحة · PDF', price: 10 },
    { id: 'cdna-str-4', type: 'file', archetype: 'strategic',  cdnaType: 'strategic',  icon: '💎', title: 'بناء الإرث: القائد الاستراتيجي الذي يُذكر',    desc: 'كيف تبني مؤسسة ورؤية أكبر منك — تحويل الاستراتيجية من خطة إلى ثقافة تستمر بعد رحيلك وتصنع قادة يخلفونك.',                   size: '11 صفحة · PDF', price: 10 }
];

// ── Build CDNA courses HTML — all 5 personality types, 4 files each ───────────────
var _CDNA_TRAIT_ORDER = ['analytical', 'creative', 'social', 'operational', 'strategic'];
var _CDNA_ICON2 = {
    analytical:  '#7b2fff',
    creative:    '#ff6b9d',
    social:      '#00f5d4',
    operational: '#ff9500',
    strategic:   '#9d4edd'
};

function _buildCDNACoursesHTML(dominantTrait) {
    var html = '';
    // price badge + file count come from the LIVE catalog (the owner can change prices / add / delete items from the Admin Panel)
    var _cc = LEADERSHIP_FILES.filter(function (f) { return f.cdnaType && f.type === 'file'; });
    var _cps = _cc.map(function (f) { return +f.price || 0; });
    var _cLo = _cps.length ? Math.min.apply(null, _cps) : 0, _cHi = _cps.length ? Math.max.apply(null, _cps) : 0;
    var _cBadge = _cLo === _cHi ? (_cLo + ' د.أ / ملف') : ('من ' + _cLo + ' إلى ' + _cHi + ' د.أ');

    // Section wrapper title
    html +=
        '<div class="cdna-traits-card" style="border-color:rgba(255,183,0,0.3);background:linear-gradient(135deg,rgba(10,5,0,0.9),rgba(0,5,25,0.9));">' +
        '<div class="cdna-section-header" style="color:#ffd700;display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">' +
        '<i class="fas fa-graduation-cap"></i> دورات تطوير الشخصية القيادية' +
        '<span style="margin-right:auto;font-size:0.72rem;background:rgba(255,183,0,0.15);border:1px solid rgba(255,183,0,0.35);color:#ffd700;border-radius:50px;padding:2px 14px;font-family:\'Orbitron\',monospace;font-weight:700;">' + _cBadge + '</span>' +
        '</div>' +
        '<p style="color:rgba(255,255,255,0.45);font-size:0.84rem;margin:0.4rem 0 1.4rem;line-height:1.7;">' + _cc.length + ' ملف PDF متخصص — 4 ملفات لكل شخصية قيادية. اشترِ ما يناسب بصمتك أو طوّر الأبعاد الأخرى.</p>';

    // One sub-section per personality type
    for (var ti = 0; ti < _CDNA_TRAIT_ORDER.length; ti++) {
        var trait   = _CDNA_TRAIT_ORDER[ti];
        var meta    = CDNA_TRAIT_META[trait] || {};
        var color   = meta.color  || '#00d4ff';
        var color2  = _CDNA_ICON2[trait] || '#7b2fff';
        var label   = meta.label  || trait;
        var isDom   = (trait === dominantTrait);
        var courses = LEADERSHIP_FILES.filter(function(f) { return f.cdnaType === trait; });

        var cards = '';
        for (var ci = 0; ci < courses.length; ci++) {
            var c     = courses[ci];
            var owned = isPurchased(c.id);
            cards +=
                '<div class="premium-file' + (owned ? ' owned' : '') + '" style="margin:0;">' +
                '<div class="pf-head">' +
                '<div class="pf-icon" style="background:linear-gradient(135deg,' + color + ',' + color2 + ');">' + c.icon + '</div>' +
                '<div>' +
                '<div class="pf-title">' + c.title + '</div>' +
                '<div class="pf-meta"><span>' + c.size + '</span></div>' +
                '</div>' +
                '</div>' +
                '<p class="pf-desc">' + c.desc + '</p>' +
                '<div class="pf-foot">' +
                '<div class="pf-price">10 <small>د.أ</small></div>' +
                (owned
                    ? '<button class="pf-owned-btn" onclick="openPurchasedFile(\'' + c.id + '\')"><i class="fas fa-book-open"></i> اقرأ الآن</button>'
                    : '<button class="pf-buy-btn" onclick="openPayment(\'' + c.id + '\')"><i class="fas fa-lock"></i> اشترِ الآن</button>'
                ) +
                '</div>' +
                '</div>';
        }

        // Find the book for this personality type
        var book = LEADERSHIP_FILES.find(function(f) { return f.type === 'book' && f.cdnaType === trait; });
        var bookHtml = '';
        if (book) {
            var bookOwned = isPurchased(book.id);
            bookHtml =
                '<div class="premium-file' + (bookOwned ? ' owned' : '') + '" style="margin:0 0 0.85rem;border-color:' + (bookOwned ? 'rgba(0,245,212,0.55)' : 'rgba(255,215,0,0.45)') + ';background:linear-gradient(135deg,rgba(255,215,0,0.06),rgba(255,150,0,0.04));">' +
                '<div class="pf-head">' +
                '<div class="pf-icon" style="background:linear-gradient(135deg,#ffd700,#ff9500);box-shadow:0 6px 20px rgba(255,183,0,0.5);font-size:1.5rem;width:52px;height:52px;">' + book.icon + '</div>' +
                '<div style="flex:1;">' +
                '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:3px;">' +
                '<div class="pf-title" style="font-size:1.05rem;">' + book.title + '</div>' +
                '<span style="font-size:0.68rem;background:rgba(255,215,0,0.2);border:1px solid rgba(255,215,0,0.5);color:#ffd700;border-radius:50px;padding:1px 10px;white-space:nowrap;font-weight:800;">📖 كتاب</span>' +
                '</div>' +
                '<div style="font-size:0.8rem;color:rgba(255,215,0,0.7);font-style:italic;">' + book.subtitle + '</div>' +
                '<div class="pf-meta" style="margin-top:4px;"><span>' + book.size + '</span></div>' +
                '</div>' +
                '</div>' +
                '<p class="pf-desc">' + book.desc + '</p>' +
                '<div class="pf-foot">' +
                '<div class="pf-price">20 <small>د.أ</small></div>' +
                (bookOwned
                    ? '<button class="pf-owned-btn" onclick="openPurchasedFile(\'' + book.id + '\')"><i class="fas fa-book-open"></i> اقرأ الكتاب</button>'
                    : '<button class="pf-buy-btn" onclick="openPayment(\'' + book.id + '\')" style="padding:0.6rem 1.4rem;font-size:0.9rem;"><i class="fas fa-book"></i> اشترِ الكتاب</button>'
                ) +
                '</div>' +
                '</div>';
        }

        html +=
            '<div style="margin-bottom:1.6rem;">' +
            // Sub-header with personality badge
            '<div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.9rem;padding:0.6rem 1rem;background:' + color + '11;border-radius:10px;border-right:3px solid ' + color + ';">' +
            '<span style="font-size:1.2rem;">' + (meta.icon || '🧠') + '</span>' +
            '<span style="font-weight:800;color:' + color + ';font-size:0.95rem;">شخصية ' + label + '</span>' +
            (isDom ? '<span style="margin-right:auto;font-size:0.7rem;background:' + color + ';color:#000;border-radius:50px;padding:2px 10px;font-weight:800;">✦ شخصيتك الغالبة</span>' : '<span style="margin-right:auto;"></span>') +
            '<span style="font-size:0.75rem;color:rgba(255,255,255,0.4);">' + (book ? 'كتاب + ' : '') + '4 ملفات</span>' +
            '</div>' +
            bookHtml +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:0.85rem;">' +
            cards +
            '</div>' +
            '</div>';
    }

    html += '</div>';
    return html;
}

// PAY_KEY alone (no per-user scoping) meant EVERY account sharing this
// browser saw the exact same "purchased" list — one student's purchase
// silently unlocked the same file for free on any other account that ever
// logged in here. Scope the actual storage slot by the logged-in email.
// forEmail lets an admin action (approving someone else's payment) target the
// PAYER's storage slot explicitly — without it, this always fell back to
// whoever is currently logged in, which silently granted the purchase to the
// approving ADMIN instead of the student who actually paid.
function _purchasedKey(forEmail) {
    var email = forEmail || (window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || null;
    return email ? (PAY_KEY + '.' + email) : null;
}
function getPurchased(forEmail) {
    var key = _purchasedKey(forEmail);
    if (!key) return []; // no one logged in — nothing to own yet
    try {
        const a = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(a) ? a : [];
    } catch { return []; }
}
function savePurchased(arr, forEmail) {
    var key = _purchasedKey(forEmail);
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
}
// The platform owner's own account always has unlimited free access to every
// book/course — reuses the SAME isOwner check the admin dashboards already
// gate on, rather than a second parallel privilege system.
function isPurchased(id) {
    if (window.ausAuth && window.ausAuth.isOwner) return true;
    return getPurchased().includes(id);
}
function markPurchased(id, forEmail) {
    const a = getPurchased(forEmail);
    if (!a.includes(id)) { a.push(id); savePurchased(a, forEmail); }
}

// ── Manual "bank transfer" payment claims — NEVER self-grant a purchase. ────
// Typing a name and clicking confirm proves nothing was actually paid; there
// is no way for this client-side app to verify a real CliQ/IBAN transfer
// landed. So a manual claim only files a PENDING request; only an admin who
// checked the real bank account can approve it and unlock the file. Mirrors
// the exact same pattern already used (and tested) for certification
// payments in aus_36_certification.js.
var FILE_PAY_PENDING_KEY = 'aus.paywall.pendingPayments';
var FILE_PAY_SEEN_KEY = 'aus.paywall.seenPaymentDecisions';
function getPendingFilePayments() { try { return JSON.parse(localStorage.getItem(FILE_PAY_PENDING_KEY) || '[]'); } catch (e) { return []; } }
function savePendingFilePayments(list) { try { localStorage.setItem(FILE_PAY_PENDING_KEY, JSON.stringify(list)); } catch (e) {} }
function _genFilePayRefCode() { return 'AUS-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.random().toString(36).toUpperCase().slice(2, 6); }
function addPendingFilePayment(entry) {
    var list = getPendingFilePayments();
    entry = Object.assign({
        id: 'pend_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        status: 'pending', ts: Date.now()
    }, entry);
    list.push(entry);
    savePendingFilePayments(list);
    return entry;
}
function approvePendingFilePayment(pendingId) {
    var list = getPendingFilePayments();
    var entry = list.find(function (p) { return p.id === pendingId; });
    if (!entry || entry.status !== 'pending') return false;
    entry.status = 'approved';
    entry.decidedTs = Date.now();
    markPurchased(entry.fileId, entry.payerEmail); // grant to the PAYER — not whichever admin happens to be reviewing this
    savePendingFilePayments(list);
    // Sent as a real chat message (not just the notification inbox) so the
    // student can ask the admin a follow-up question directly in the same
    // thread — on top of the toast/Notification alert that already fires
    // when the student next opens the app (_checkMyFilePaymentDecisions below).
    if (window.AusChat && entry.payerEmail) {
        var payerAccount = (window.ausAuth && window.ausAuth.listAccounts ? window.ausAuth.listAccounts() : []).filter(function (a) { return a.email === entry.payerEmail; })[0];
        var payerName = (payerAccount && payerAccount.full_name) || entry.payerName || entry.payerEmail;
        window.AusChat.sendMessage(entry.payerEmail, payerName, '✅ تمت الموافقة على دفعتك لـ ' + (entry.fileTitle || '') + '! يمكنك فتحه الآن في مكتبتك.');
    }
    return true;
}
function rejectPendingFilePayment(pendingId) {
    var list = getPendingFilePayments();
    var entry = list.find(function (p) { return p.id === pendingId; });
    if (!entry || entry.status !== 'pending') return false;
    entry.status = 'rejected';
    entry.decidedTs = Date.now();
    savePendingFilePayments(list);
    return true;
}
function _filePaySeenIds() { try { return JSON.parse(localStorage.getItem(FILE_PAY_SEEN_KEY) || '[]'); } catch (e) { return []; } }
function markFilePayDecisionSeen(pendingId) {
    var seen = _filePaySeenIds();
    if (seen.indexOf(pendingId) === -1) { seen.push(pendingId); try { localStorage.setItem(FILE_PAY_SEEN_KEY, JSON.stringify(seen)); } catch (e) {} }
}
function getMyUnseenFileDecisions() {
    var email = (window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || '';
    if (!email) return [];
    var seen = _filePaySeenIds();
    return getPendingFilePayments().filter(function (p) {
        return p.payerEmail === email && p.status !== 'pending' && seen.indexOf(p.id) === -1;
    });
}

// --- Override showLeadershipDevelopment with paywall library ---
const _origShowLeadershipDevelopment = (typeof showLeadershipDevelopment === 'function') ? showLeadershipDevelopment : null;
let activePremiumTab = 'all';
showLeadershipDevelopment = function() {
    const content = document.getElementById('leadershipContent');
    if (!content) return;
    const purchased = getPurchased();
    const allIds = LEADERSHIP_FILES.map(f => f.id);
    const ownedValid = purchased.filter(id => allIds.includes(id));
    const ownedBooks = ownedValid.filter(id => id.startsWith('book-')).length;
    const ownedFiles = ownedValid.length - ownedBooks;
    const tabs = ['all', 'autocratic', 'democratic', 'transformational', 'delegative'];
    const tabLabel = (t) => t === 'all' ? 'كل الملفات' : `${PERSONALITY_EMOJI[t]} ${PERSONALITY_LABEL_AR[t]}`;
    // counts + price hints come from the LIVE catalog (owner-editable from the Admin Panel), not from fixed numbers
    const _bk = LEADERSHIP_FILES.filter(f => f.type === 'book'), _fl = LEADERSHIP_FILES.filter(f => f.type === 'file');
    const _hint = (l, noun) => { const ps = l.map(f => +f.price || 0); if (!ps.length) return ''; const lo = Math.min(...ps), hi = Math.max(...ps); return lo === hi ? `${lo} د.أ لكل ${noun}` : `من ${lo} إلى ${hi} د.أ`; };

    content.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 0;">
            <h2 style="margin-bottom: 0.6rem;">🎯 خطة تطوير شخصيتك القيادية</h2>
            <p style="color: rgba(255,255,255,0.7); line-height: 1.8;">
                مكتبة قيادية متكاملة — ${_bk.length} كتب شاملة + ${_fl.length} ملف متقدّم — يحوّلون نمطك من نظرية إلى ممارسة يومية.
            </p>
        </div>

        <!-- ===== BOOKS (4 × 20 JOD) ===== -->
        <div class="premium-section">
            <div class="premium-head">
                <h3>📚 الكتب الكاملة</h3>
                <p>${_bk.length} كتب شاملة · كتاب لكل شخصية قيادية · ${_hint(_bk, 'كتاب')} · ${ownedBooks}/${_bk.length} مفعّل</p>
            </div>
            <div class="premium-grid" id="premiumGridBooks">
                ${renderPremiumGrid('book')}
            </div>
        </div>

        <!-- ===== FILES (16 × 10 JOD) ===== -->
        <div class="premium-section" style="margin-top: 3rem;">
            <div class="premium-head">
                <h3>📄 الملفات المتقدّمة</h3>
                <p>${_fl.length} ملف متقدّم · 4 ملفات لكل شخصية · ${_hint(_fl, 'ملف')} · ${ownedFiles}/${_fl.length} مفعّل</p>
            </div>
            <div class="premium-tabs">
                ${tabs.map(t => `
                    <button class="premium-tab ${t === activePremiumTab ? 'active' : ''}" onclick="setPremiumTab('${t}')">${tabLabel(t)}</button>
                `).join('')}
            </div>
            <div class="premium-grid" id="premiumGridFiles">
                ${renderPremiumGrid('file')}
            </div>
        </div>

        <div style="text-align: center; margin-top: 2rem;">
            <button class="btn-secondary" onclick="currentLeadershipQ=0; renderLeadership();">العودة للاختبار</button>
        </div>
    `;
};
function renderPremiumGrid(typeFilter) {
    const purchased = getPurchased();
    let list = LEADERSHIP_FILES;
    if (typeFilter === 'book') list = list.filter(f => f.type === 'book');
    if (typeFilter === 'file') list = list.filter(f => f.type === 'file' && (activePremiumTab === 'all' || f.archetype === activePremiumTab));
    return list.map(f => {
        const owned = purchased.includes(f.id);
        const isBook = f.type === 'book';
        const sub = f.subtitle ? `<div style="font-size:0.78rem; color: rgba(255,255,255,0.55); font-style: italic; margin-top: 2px;">${f.subtitle}</div>` : '';
        const typeBadge = isBook
            ? `<span style="display:inline-block; padding:2px 9px; border-radius:50px; background:rgba(255,215,0,0.18); border:1px solid rgba(255,215,0,0.4); color:#ffd700; font-size:0.65rem; font-family:'Orbitron',sans-serif; letter-spacing:0.15em; margin-inline-start:6px;">كتاب</span>`
            : `<span style="display:inline-block; padding:2px 9px; border-radius:50px; background:rgba(0,212,255,0.12); border:1px solid rgba(0,212,255,0.35); color:#00d4ff; font-size:0.65rem; font-family:'Orbitron',sans-serif; letter-spacing:0.15em; margin-inline-start:6px;">ملف</span>`;
        const ownedLabel = isBook ? 'اقرأ الكتاب' : 'اقرأ الملف';
        const buyLabel = isBook ? 'اشترِ الكتاب' : 'اشترِ الملف';
        return `
            <div class="premium-file ${owned ? 'owned' : ''}" data-type="${f.type}">
                <div class="pf-head">
                    <div class="pf-icon">${f.icon}</div>
                    <div style="flex:1; min-width:0;">
                        <div class="pf-title">${f.title}${typeBadge}</div>
                        ${sub}
                        <div class="pf-meta" style="margin-top: 5px;">
                            <span>${PERSONALITY_EMOJI[f.archetype]} ${PERSONALITY_LABEL_AR[f.archetype]}</span>
                            <span>${f.size}</span>
                        </div>
                    </div>
                </div>
                <div class="pf-desc">${f.desc}</div>
                <div class="pf-foot">
                    ${owned ? `
                        <span style="color: var(--success); font-weight: 700; font-size: 0.85rem;"><i class="fas fa-check-circle"></i> مُفعّل</span>
                        <button class="pf-owned-btn" onclick="openPurchasedFile('${f.id}')"><i class="fas fa-book-open"></i> ${ownedLabel}</button>
                    ` : `
                        <div class="pf-price">${f.price}<small>د.أ</small></div>
                        <button class="pf-buy-btn" onclick="openPayment('${f.id}')"><i class="fas fa-lock"></i> ${buyLabel}</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}
function setPremiumTab(t) {
    activePremiumTab = t;
    document.querySelectorAll('.premium-tab').forEach(b => b.classList.toggle('active', b.textContent.includes(t === 'all' ? 'كل الملفات' : PERSONALITY_LABEL_AR[t])));
    const filesGrid = document.getElementById('premiumGridFiles');
    if (filesGrid) filesGrid.innerHTML = renderPremiumGrid('file');
    sfxPlay('hover');
}

// --- Checkout modal ---
let activeBuyId = null;
let activePayMethod = 'cliq';
let activePayRefCode = null;
function openPayment(fileId) {
    const file = LEADERSHIP_FILES.find(f => f.id === fileId);
    if (!file) return;
    // A fresh code per checkout — the student pastes it into the transfer
    // memo so the admin can find it fast in their real bank statement instead
    // of matching by name + amount + rough timestamp alone.
    activePayRefCode = _genFilePayRefCode();
    activeBuyId = fileId;
    activePayMethod = 'cliq';
    if (!document.getElementById('pay-backdrop')) {
        const bd = document.createElement('div'); bd.id = 'pay-backdrop';
        bd.innerHTML = `<div id="pay-modal"></div>`;
        bd.addEventListener('click', (e) => { if (e.target === bd) closePayment(); });
        document.body.appendChild(bd);
    }
    renderPaymentModal(file);
    document.body.classList.add('pay-open');
    document.getElementById('pay-backdrop').classList.add('show');
    sfxPlay('click');
}
function closePayment() {
    document.body.classList.remove('pay-open');
    const bd = document.getElementById('pay-backdrop');
    if (bd) bd.classList.remove('show');
}
function setPayMethod(m) {
    // Toggle confirm button — PayPal has its own button
    setTimeout(function() {
        var cbtn = document.querySelector('.pay-confirm');
        if (cbtn) cbtn.style.display = (m === 'paypal') ? 'none' : '';
    }, 30);
    activePayMethod = m;
    document.querySelectorAll('.pay-method').forEach(b => b.classList.toggle('active', b.dataset.method === m));
    const host = document.getElementById('payFieldsHost');
    if (host) host.innerHTML = renderPayFields(m);
    sfxPlay('hover');
}
function renderPaymentModal(file) {
    const modal = document.querySelector('#pay-backdrop #pay-modal');
    if (!modal) return;
    modal.innerHTML = `
        <button class="pay-close" onclick="closePayment()">✕</button>
        <div class="pay-head">
            <div class="pay-icon">${file.icon}</div>
            <h3>إتمام عملية الدفع</h3>
            <p>دفع آمن — معاملتك مُشفّرة</p>
        </div>
        <div class="pay-summary">
            <div class="pay-item">${file.title}</div>
            <div class="pay-amount">${file.price}.00 <small style="font-size:0.75rem; opacity:0.7;">JOD</small></div>
        </div>
        <div class="pay-methods">
            <div class="pay-methods-label">طريقة الدفع</div>
            <div class="pay-method-row">
                <button class="pay-method active" data-method="cliq" onclick="setPayMethod('cliq')">🇯🇴 CliQ <span style="font-size:0.65rem;color:#00f5d4;">(الأسرع)</span></button>
                <button class="pay-method" data-method="iban" onclick="setPayMethod('iban')">🏦 تحويل بنكي IBAN</button>
                <button class="pay-method" data-method="visa" onclick="setPayMethod('visa')">💳 Visa / Mastercard</button>
                <button class="pay-method" data-method="apple" onclick="setPayMethod('apple')"> Apple Pay</button>
            </div>
        </div>
        <div id="payFieldsHost">${renderPayFields(activePayMethod)}</div>
        <button class="pay-confirm" onclick="confirmPayment()">
            <i class="fas fa-check-circle"></i> تأكيد التحويل — ${file.price} د.أ
        </button>
        <div class="pay-secured">
            <i class="fas fa-shield-alt"></i> جميع المدفوعات تُحوَّل لـ IBAN JO88JIBA···2
        </div>
    `;
    // re-render fields when method changes
    document.querySelectorAll('.pay-method').forEach(b => b.addEventListener('click', () => {
        document.getElementById('payFieldsHost').innerHTML = renderPayFields(b.dataset.method);
    }));
}
function _copyToClipboard(text, btnId) {
    navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById(btnId);
        if (btn) { var orig = btn.innerHTML; btn.innerHTML = '✓ تم النسخ'; setTimeout(function() { btn.innerHTML = orig; }, 1800); }
    });
}
function _refCodeBlockHtml() {
    return '<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.35);border-radius:12px;padding:0.75rem 0.9rem;margin-bottom:0.7rem;">' +
        '<div style="font-size:0.7rem;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:6px;">اكتب هذا الرمز في خانة الوصف عند التحويل — يسرّع الموافقة لدقائق بدل ساعات</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
        '<b id="payRefCodeDisplay" style="color:#ffd700;font-family:monospace;font-size:1.05rem;letter-spacing:0.04em;direction:ltr;">' + activePayRefCode + '</b>' +
        '<button id="copyPayRefBtn" onclick="_copyToClipboard(\'' + activePayRefCode + '\',\'copyPayRefBtn\')" style="background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);color:#ffd700;border-radius:8px;width:30px;height:30px;cursor:pointer;flex-shrink:0;">📋</button>' +
        '</div></div>';
}
function renderPayFields(method) {
    var file = LEADERSHIP_FILES.find(function(f) { return f.id === activeBuyId; });
    var amount = file ? file.price : '?';

    if (method === 'cliq') {
        var hasCliq   = _MERCHANT.cliqAlias || _MERCHANT.cliqPhone;
        var hasIban   = _MERCHANT.iban;
        if (!hasCliq && !hasIban) {
            return '<div style="padding:1.2rem;background:rgba(255,100,0,0.08);border:1px solid rgba(255,100,0,0.3);border-radius:12px;text-align:center;color:rgba(255,255,255,0.7);font-size:0.85rem;">' +
                   '⚠️ لم يتم إعداد بيانات CliQ بعد.<br>يرجى إدخال بياناتك من <strong>لوحة الأدمن → إعدادات الدفع</strong>.</div>';
        }
        var cliqLine = '';
        if (_MERCHANT.cliqAlias) {
            cliqLine += '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.3);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.6rem;">' +
                '<div><div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:2px;">CliQ Alias</div>' +
                '<div style="font-weight:800;color:#00d4ff;font-size:1.05rem;letter-spacing:0.05em;">' + _MERCHANT.cliqAlias + '</div></div>' +
                '<button id="copyAlias" onclick="_copyToClipboard(\'' + _MERCHANT.cliqAlias + '\',\'copyAlias\')" style="background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.78rem;font-family:\'Tajawal\',sans-serif;">📋 نسخ</button>' +
                '</div>';
        }
        if (_MERCHANT.cliqPhone) {
            cliqLine += '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.6rem;">' +
                '<div><div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:2px;">رقم الهاتف (CliQ)</div>' +
                '<div style="font-weight:800;color:#00d4ff;font-size:1.05rem;">' + _MERCHANT.cliqPhone + '</div></div>' +
                '<button id="copyPhone" onclick="_copyToClipboard(\'' + _MERCHANT.cliqPhone + '\',\'copyPhone\')" style="background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.78rem;font-family:\'Tajawal\',sans-serif;">📋 نسخ</button>' +
                '</div>';
        }
        var ibanLine = '';
        if (hasIban) {
            ibanLine = '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(123,47,255,0.07);border:1px solid rgba(123,47,255,0.25);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.6rem;">' +
                '<div style="flex:1;min-width:0;"><div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:2px;">IBAN' + (_MERCHANT.bankName ? ' — ' + _MERCHANT.bankName : '') + '</div>' +
                '<div style="font-weight:700;color:#c0a0ff;font-size:0.85rem;word-break:break-all;">' + _MERCHANT.iban + '</div></div>' +
                '<button id="copyIban" onclick="_copyToClipboard(\'' + _MERCHANT.iban.replace(/\s/g,'') + '\',\'copyIban\')" style="margin-right:0.6rem;background:rgba(123,47,255,0.15);border:1px solid rgba(123,47,255,0.4);color:#c0a0ff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.78rem;font-family:\'Tajawal\',sans-serif;flex-shrink:0;">📋 نسخ</button>' +
                '</div>';
        }
        return '<div style="background:rgba(0,212,255,0.04);border:1px dashed rgba(0,212,255,0.2);border-radius:14px;padding:1rem;margin-bottom:0.8rem;">' +
            '<div style="font-size:0.8rem;color:rgba(255,255,255,0.55);margin-bottom:0.8rem;text-align:center;">📲 حوّل المبلغ لهذا الحساب عبر تطبيق بنكك</div>' +
            cliqLine + ibanLine +
            '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:0.75rem 1rem;">' +
            '<div><div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:2px;">المبلغ المطلوب</div>' +
            '<div style="font-weight:900;color:#ffd700;font-size:1.2rem;font-family:\'Orbitron\',sans-serif;">' + amount + '.00 <span style="font-size:0.7rem;">JOD</span></div></div>' +
            '<div style="font-size:0.75rem;color:rgba(255,255,255,0.4);text-align:left;">' + (_MERCHANT.accountName || 'AUS Platform') + '</div>' +
            '</div>' +
            '</div>' +
            '<div style="font-size:0.78rem;color:rgba(255,255,255,0.45);text-align:center;margin-bottom:0.8rem;line-height:1.6;">بعد إتمام التحويل اضغط "تأكيد التحويل" أدناه<br>وسيتم تفعيل المحتوى فوراً في مكتبتك</div>' +
            _refCodeBlockHtml() +
            '<div style="color:#ffd700;font-size:0.72rem;text-align:center;margin-bottom:8px;line-height:1.7;"><i class="fas fa-triangle-exclamation"></i> تأكد أن الاسم أدناه هو نفس اسمك المسجّل في تطبيق CliQ تماماً — يُستخدم لمطابقة التحويل عند المراجعة.</div>' +
            '<label class="pay-field">' +
            '<div class="pay-field-label">اسمك كما في تطبيق CliQ (للتحقق)</div>' +
            '<input type="text" placeholder="الاسم المسجّل في CliQ بالضبط" id="payName" autocomplete="name">' +
            '</label>';
    }
    if (method === 'iban') {
        if (!_MERCHANT.iban) {
            return '<div style="padding:1rem;background:rgba(255,100,0,0.08);border:1px solid rgba(255,100,0,0.3);border-radius:12px;text-align:center;color:rgba(255,255,255,0.7);font-size:0.85rem;">⚠️ لم يتم إعداد IBAN بعد.</div>';
        }
        return '<div style="background:rgba(123,47,255,0.06);border:1px solid rgba(123,47,255,0.25);border-radius:12px;padding:1rem;margin-bottom:0.8rem;">' +
            '<div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:4px;">IBAN' + (_MERCHANT.bankName ? ' — ' + _MERCHANT.bankName : '') + '</div>' +
            '<div style="font-weight:700;color:#c0a0ff;font-size:0.9rem;word-break:break-all;margin-bottom:0.6rem;">' + _MERCHANT.iban + '</div>' +
            '<button onclick="_copyToClipboard(\'' + _MERCHANT.iban.replace(/\s/g,'') + '\',\'copyIbanDirect\')" id="copyIbanDirect" style="width:100%;background:rgba(123,47,255,0.2);border:1px solid rgba(123,47,255,0.4);color:#c0a0ff;border-radius:8px;padding:8px;cursor:pointer;font-family:\'Tajawal\',sans-serif;">📋 نسخ IBAN</button>' +
            '</div>' +
            _refCodeBlockHtml() +
            '<label class="pay-field"><div class="pay-field-label">اسمك الكامل</div><input type="text" placeholder="للتحقق من التحويل" id="payName" autocomplete="name"></label>';
    }
    // ── PayPal → DISABLED for Jordan (PayPal does not support full merchant payments here) ──
    if (method === 'paypal') {
        return '<div style="background:linear-gradient(135deg,rgba(255,100,0,0.1),rgba(255,165,0,0.05));border:1px solid rgba(255,165,0,0.35);border-radius:14px;padding:1.2rem 1rem;margin-bottom:0.8rem;text-align:center;">' +
               '<div style="font-size:2rem;margin-bottom:0.5rem;">⚠️</div>' +
               '<div style="font-size:0.95rem;color:#ffcc80;font-weight:700;margin-bottom:0.4rem;">PayPal غير متاح في الأردن للتجار</div>' +
               '<div style="font-size:0.8rem;color:rgba(255,255,255,0.6);line-height:1.7;">PayPal لا يدعم استقبال المدفوعات التجارية في الأردن.<br>استخدم <strong style="color:#00d4ff;">CliQ</strong> أو <strong style="color:#c0a0ff;">IBAN</strong> أو <strong style="color:#ffd700;">إثبات تحويل بنكي</strong> أدناه.</div>' +
               '</div>' +
               '<div style="display:flex;gap:8px;justify-content:center;margin-top:0.8rem;">' +
               '<button onclick="setPayMethod(\'cliq\')" style="flex:1;background:linear-gradient(135deg,rgba(0,212,255,0.15),rgba(0,132,255,0.1));border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:10px;padding:10px;cursor:pointer;font-family:\'Tajawal\',sans-serif;font-weight:700;">🇯🇴 تحويل عبر CliQ</button>' +
               '<button onclick="setPayMethod(\'iban\')" style="flex:1;background:linear-gradient(135deg,rgba(123,47,255,0.15),rgba(157,78,221,0.1));border:1px solid rgba(123,47,255,0.4);color:#c0a0ff;border-radius:10px;padding:10px;cursor:pointer;font-family:\'Tajawal\',sans-serif;font-weight:700;">🏦 تحويل IBAN</button>' +
               '</div>';
    }
    // ── Visa / Apple → IBAN transfer fallback ──────────────────────
    if (method === 'visa' || method === 'apple') {
        var methodIcon = method === 'visa' ? '💳' : '';
        var methodName = method === 'visa' ? 'Visa / Mastercard' : 'Apple Pay';
        return '<div style="background:rgba(255,165,0,0.06);border:1px solid rgba(255,165,0,0.25);border-radius:12px;padding:0.75rem 1rem;margin-bottom:0.7rem;text-align:center;">' +
               '<div style="font-size:0.78rem;color:rgba(255,200,100,0.8);">' + methodIcon + ' ' + methodName + ' غير متاح حالياً — يرجى الدفع عبر تحويل بنكي مباشر</div>' +
               '</div>' +
               '<div style="background:rgba(0,212,255,0.04);border:1px dashed rgba(0,212,255,0.2);border-radius:14px;padding:1rem;margin-bottom:0.8rem;">' +
               '<div style="font-size:0.8rem;color:rgba(255,255,255,0.55);margin-bottom:0.8rem;text-align:center;">📲 حوّل المبلغ لهذا الحساب عبر تطبيق بنكك</div>' +
               '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(123,47,255,0.07);border:1px solid rgba(123,47,255,0.25);border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.6rem;">' +
               '<div style="flex:1;min-width:0;"><div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:2px;">IBAN</div>' +
               '<div style="font-weight:700;color:#c0a0ff;font-size:0.85rem;word-break:break-all;">' + _MERCHANT.iban + '</div></div>' +
               '<button id="copyIban2" onclick="_copyToClipboard(\'' + _MERCHANT.iban.replace(/\s/g,'') + '\',\'copyIban2\')" style="margin-right:0.6rem;background:rgba(123,47,255,0.15);border:1px solid rgba(123,47,255,0.4);color:#c0a0ff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.78rem;font-family:\'Tajawal\',sans-serif;flex-shrink:0;">📋 نسخ</button>' +
               '</div>' +
               '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:0.75rem 1rem;">' +
               '<div><div style="font-size:0.72rem;color:rgba(255,255,255,0.5);margin-bottom:2px;">المبلغ المطلوب</div>' +
               '<div style="font-weight:900;color:#ffd700;font-size:1.2rem;font-family:\'Orbitron\',sans-serif;">' + amount + '.00 <span style="font-size:0.7rem;">JOD</span></div></div>' +
               '<div style="font-size:0.75rem;color:rgba(255,255,255,0.4);text-align:left;">' + (_MERCHANT.accountName || 'AUS Platform') + '</div>' +
               '</div></div>' +
               '<div style="font-size:0.78rem;color:rgba(255,255,255,0.45);text-align:center;margin-bottom:0.8rem;line-height:1.6;">بعد إتمام التحويل اضغط "تأكيد التحويل" أدناه<br>وسيتم تفعيل المحتوى فوراً في مكتبتك</div>' +
               _refCodeBlockHtml() +
               '<label class="pay-field"><div class="pay-field-label">اسمك الكامل (للتحقق)</div>' +
               '<input type="text" placeholder="الاسم كما في تطبيق البنك" id="payName" autocomplete="name"></label>';
    }
    return '';
}

// ── Mount PayPal button using the SDK ─────────────────────────────────────────────
function _mountPayPalButton() {
    var container = document.getElementById('paypal-button-container');
    var fallback  = document.getElementById('paypal-fallback');
    if (!container) return;
    // Check if SDK loaded
    if (typeof paypal === 'undefined' || !paypal.Buttons) {
        // Retry up to 8 times with increasing delays (total ~10 seconds)
        var tries = parseInt(container.dataset.tries || '0', 10);
        if (tries < 8) {
            container.dataset.tries = String(tries + 1);
            // Show loading state on first try
            if (tries === 0) {
                container.innerHTML = '<div style="text-align:center;padding:1rem;color:rgba(0,212,255,0.7);font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل PayPal من PayPal.com... (' + (tries+1) + '/8)</div>';
            } else {
                var loadDot = document.querySelector('#paypal-button-container div');
                if (loadDot) loadDot.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تحميل PayPal... (' + (tries+1) + '/8)';
            }
            setTimeout(_mountPayPalButton, 1500);
            return;
        }
        // After 8 retries (~12 sec) — give up
        if (fallback) fallback.style.display = 'block';
        container.innerHTML = '<div style="text-align:center;padding:1rem;color:rgba(255,200,150,0.8);font-size:0.85rem;line-height:1.7;">' +
            '⚠️ تعذّر تحميل PayPal SDK من الإنترنت<br>' +
            '<span style="font-size:0.75rem;color:rgba(255,255,255,0.5)">تحقق من اتصالك أو AdBlocker — أو استخدم CliQ / IBAN</span><br><br>' +
            '<button onclick="(function(){var c=document.getElementById(\'paypal-button-container\');c.dataset.tries=\'0\';c.dataset.mounted=\'\';c.innerHTML=\'\';_mountPayPalButton();})()" style="background:rgba(0,156,222,0.15);border:1px solid rgba(0,156,222,0.4);color:#9bc7ff;border-radius:8px;padding:6px 16px;cursor:pointer;font-family:\'Tajawal\',sans-serif;font-size:0.8rem;"><i class="fas fa-redo"></i> أعد المحاولة</button>' +
            '</div>';
        return;
    }
    // Clear loading state
    container.dataset.tries = '0';
    // Avoid double-render
    if (container.dataset.mounted === '1') return;
    container.dataset.mounted = '1';
    container.innerHTML = ''; // clear placeholder

    var file = LEADERSHIP_FILES.find(function(f) { return f.id === activeBuyId; });
    if (!file) return;
    var jodAmount = parseFloat(file.price || 0);
    var usdAmount = (jodAmount * 1.41).toFixed(2); // approx JOD→USD

    try {
        paypal.Buttons({
            style: {
                shape: 'rect',
                color: 'gold',
                layout: 'vertical',
                label: 'paypal',
                height: 45,
            },
            createOrder: function(data, actions) {
                var name = document.getElementById('payName');
                if (name && name.value.trim().length < 3) {
                    showToast('الرجاء إدخال اسمك الكامل قبل الدفع', 'heart-toast');
                    return null;
                }
                return actions.order.create({
                    purchase_units: [{
                        description: file.title + ' — AUS Platform',
                        amount: { currency_code: 'USD', value: usdAmount },
                    }],
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    // Server-side verification (anti-tampering)
                    var apiBase = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
                    return fetch(apiBase + '/api/paypal/verify-order', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ orderId: data.orderID, fileId: file.id }),
                    }).then(function(r) { return r.json(); }).then(function(v) {
                        if (v && v.ok) {
                            markPurchased(file.id);
                            sfxPlay('level');
                            var msg = v.demo
                                ? '✅ تم الدفع — (تحقق العميل فقط، أضف Secret للأمان الكامل)'
                                : '✅ تم الدفع وتحقق السيرفر — ' + (v.amount || '') + ' ' + (v.currency || 'USD');
                            showToast(msg, 'xp-toast');
                            renderPaymentSuccess(file);
                        } else {
                            // Verification failed but PayPal captured — still unlock but warn
                            console.error('[AUS] Verify failed:', v);
                            markPurchased(file.id);
                            sfxPlay('level');
                            showToast('⚠️ تم الدفع لكن فشل التحقق من السيرفر — تواصل مع الدعم', 'heart-toast');
                            renderPaymentSuccess(file);
                        }
                    }).catch(function(err) {
                        // Network error — fallback: trust client capture
                        console.warn('[AUS] Verify fetch failed:', err);
                        markPurchased(file.id);
                        sfxPlay('level');
                        showToast('✅ تم الدفع عبر PayPal بنجاح', 'xp-toast');
                        renderPaymentSuccess(file);
                    });
                });
            },
            onError: function(err) {
                console.error('[AUS] PayPal error:', err);
                showToast('حدث خطأ في معالجة الدفع — حاول مجدداً', 'heart-toast');
            },
            onCancel: function() {
                showToast('تم إلغاء الدفع', 'heart-toast');
            },
        }).render('#paypal-button-container').catch(function(err) {
            console.error('[AUS] PayPal render failed:', err);
            if (fallback) fallback.style.display = 'block';
        });
    } catch (err) {
        console.error('[AUS] PayPal init exception:', err);
        if (fallback) fallback.style.display = 'block';
    }
}
function confirmPayment() {
    const file = LEADERSHIP_FILES.find(f => f.id === activeBuyId);
    if (!file) return;
    // validation — all methods now use name verification (all route to IBAN)
    const name = document.getElementById('payName')?.value?.trim() || '';
    if (name.length < 3) { showToast('الرجاء إدخال اسمك الكامل للتحقق', 'heart-toast'); sfxPlay('error'); return; }
    const btn = document.querySelector('.pay-confirm');
    if (btn) { btn.classList.add('processing'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الإرسال...'; btn.disabled = true; }
    sfxPlay('click');
    setTimeout(() => {
        addPendingFilePayment({
            fileId: file.id, fileTitle: file.title, price: file.price,
            payerName: name, refCode: activePayRefCode,
            payerEmail: (window.ausAuth && window.ausAuth.user && window.ausAuth.user.email) || ''
        });
        renderPaymentPending(file);
    }, 900);
}
function renderPaymentPending(file) {
    const modal = document.querySelector('#pay-backdrop #pay-modal');
    if (!modal) return;
    modal.innerHTML = `
        <button class="pay-close" onclick="closePayment()">✕</button>
        <div class="pay-success-screen">
            <div class="pay-success-icon" style="color:#ffd700">⏳</div>
            <h3 style="color:#ffd700;font-family:'Orbitron',sans-serif;margin-bottom:0.4rem;">طلبك قيد المراجعة</h3>
            <p style="color:rgba(255,255,255,0.7);margin-bottom:1.4rem;font-size:0.92rem;line-height:1.8;">
                لن يُفعَّل <strong style="color:var(--light)">${file.title}</strong> تلقائياً. سيتحقق فريق الإدارة من استلام التحويل فعلياً في الحساب البنكي، ثم يُفعَّل تلقائياً في مكتبتك — وستصلك رسالة عند الموافقة.
            </p>
        </div>
    `;
}

// ── Admin-only: manually approve/reject "I transferred the money" claims ───
// Locally scoped (not relying on the global _esc from aus_10_voice_reader.js
// — that one turned out not to be reliably registered by the time this runs).
function _filePaySanitize(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Self-heal: earlier builds of approvePendingFilePayment granted the purchase
// to whichever admin was logged in at approval time instead of the actual
// payer. Ownership here is a permanent one-time unlock (never consumed), so
// it's always safe to re-check every already-approved claim and grant it to
// its real payer if that step never actually landed for them.
function _repairApprovedFilePayments() {
    getPendingFilePayments().forEach(function (p) {
        if (p.status === 'approved' && p.payerEmail && p.fileId) markPurchased(p.fileId, p.payerEmail);
    });
}
// Consolidated into the certifications hub alongside the other admin review
// panels (cert-exam payments, proctor review, cert requests) — admin now has
// one place for every pending purchase, instead of hunting through leadership.
function renderPendingFilePaymentsAdmin() {
    const content = document.getElementById('certHost');
    if (!content || !(window.ausAuth && window.ausAuth.isAdmin)) return;
    _repairApprovedFilePayments();
    const all = getPendingFilePayments().slice().reverse();

    function row(p) {
        const when = new Date(p.ts).toLocaleString('ar-EG');
        const statusBadge = p.status === 'pending'
            ? '<span class="cert-status new">قيد الانتظار</span>'
            : p.status === 'approved' ? '<span class="cert-status pass">مقبول ✓</span>' : '<span class="cert-status fail">مرفوض ✗</span>';
        return `
            <div class="cert-track-card" style="text-align:right;cursor:default">
                ${p.refCode ? `
                <div class="cert-pay-refcode" style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px">
                    <span style="margin:0;color:rgba(255,255,255,.55);font-size:.7rem">ابحث عن هذا الرمز في كشف الحساب البنكي</span>
                    <b style="color:#d4af37;font-family:monospace;font-size:1.1rem;letter-spacing:.04em;direction:ltr">${_filePaySanitize(p.refCode)}</b>
                    <button id="refcbtn_${p.id}" onclick="_copyToClipboard('${p.refCode}','refcbtn_${p.id}')" style="background:rgba(212,175,55,.15);border:1px solid rgba(212,175,55,.4);color:#d4af37;border-radius:8px;width:30px;height:30px;cursor:pointer;flex-shrink:0"><i class="fas fa-copy"></i></button>
                </div>` : ''}
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                    <div>
                        <h4 style="margin-bottom:4px">${_filePaySanitize(p.fileTitle || '')}</h4>
                        <div style="font-size:.78rem;color:rgba(255,255,255,.5);line-height:1.7">
                            الاسم المُدخل: <b style="color:#fff">${_filePaySanitize(p.payerName || '')}</b><br>
                            ${p.payerEmail ? `الحساب: ${_filePaySanitize(p.payerEmail)}<br>` : ''}
                            المبلغ المتوقع: <b style="color:#d4af37">${p.price} د.أ</b><br>
                            التاريخ: ${when}
                        </div>
                    </div>
                    ${statusBadge}
                </div>
                ${p.status === 'pending' ? `
                <div class="cert-result-actions" style="margin-top:12px;justify-content:flex-start">
                    <button class="cert-btn-gold" style="padding:8px 18px;font-size:.8rem" onclick="filePayAdminDecide('${p.id}',true)"><i class="fas fa-check"></i> تأكيد الاستلام الفعلي وتفعيل</button>
                    <button class="cert-btn-ghost" style="padding:8px 18px;font-size:.8rem" onclick="filePayAdminDecide('${p.id}',false)"><i class="fas fa-times"></i> رفض</button>
                </div>` : ''}
            </div>`;
    }

    content.innerHTML = `
        <div class="cert-wrap">
            <button class="cert-back-btn" onclick="window.renderCertificationsHub()"><i class="fas fa-arrow-right"></i> رجوع</button>
            <div class="cert-hub-head"><h3>🔐 طلبات الدفع اليدوي المعلّقة — كتب وملفات</h3>
            <p>لا تقبل أي طلب إلا بعد التحقق الفعلي من وصول المبلغ في الحساب البنكي/CliQ.</p></div>
            ${all.length ? all.map(row).join('') : '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)">لا توجد طلبات حالياً.</div>'}
        </div>
    `;
}
function filePayAdminDecide(pendingId, approve) {
    if (!(window.ausAuth && window.ausAuth.isAdmin)) return;
    if (approve) {
        if (!window.confirm('تأكيد: هل تحققت فعلياً من وصول المبلغ في حسابك البنكي/CliQ قبل الموافقة؟')) return;
        approvePendingFilePayment(pendingId);
        showToast('✅ تم التفعيل بعد التحقق', 'xp-toast');
    } else {
        rejectPendingFilePayment(pendingId);
        showToast('تم رفض الطلب', 'heart-toast');
    }
    renderPendingFilePaymentsAdmin();
}
function renderPaymentSuccess(file) {
    const modal = document.querySelector('#pay-backdrop #pay-modal');
    if (!modal) return;
    modal.innerHTML = `
        <button class="pay-close" onclick="closePayment()">✕</button>
        <div class="pay-success-screen">
            <div class="pay-success-icon">✓</div>
            <h3 style="color: var(--success); font-family: 'Orbitron', sans-serif; margin-bottom: 0.4rem;">تم الدفع بنجاح</h3>
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.4rem; font-size: 0.92rem;">تم تفعيل <strong style="color: var(--light);">${file.title}</strong> في مكتبتك. يمكنك الوصول له في أي وقت.</p>
            <div style="background: rgba(0,245,212,0.06); border: 1px solid rgba(0,245,212,0.3); border-radius: 12px; padding: 1rem; margin-bottom: 1.4rem; text-align: start;">
                <div style="font-size: 0.78rem; color: rgba(255,255,255,0.55); margin-bottom: 0.4rem;">رقم الإيصال</div>
                <div style="font-family: 'Orbitron', sans-serif; color: var(--accent); font-size: 0.95rem;">#AUS-${Date.now().toString(36).toUpperCase()}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem;">
                <button class="btn-secondary" style="padding: 0.8rem;" onclick="closePayment()">إغلاق</button>
                <button class="btn-primary" style="padding: 0.8rem;" onclick="closePayment(); openPurchasedFile('${file.id}')"><i class="fas fa-download"></i> فتح الملف</button>
            </div>
        </div>
    `;
    // Refresh grid to show the file as owned
    const grid = document.getElementById('premiumGrid');
    if (grid) grid.innerHTML = renderPremiumGrid();
}

// ===========================================================================
// ===== BOOK / FILE TEXTS — no longer part of this script ===================
// ===========================================================================
// LEADERSHIP_FILES above is the CATALOG: title, price, description, cover — nothing else. The text of each of the 44 books / files
// (intro, sections, example, checklist, conclusion — about 315 KB that used to ship inside this script for every visitor, buyer or not)
// is one JSON "pack" per id on the server: _aus_backend/book_packs/<id>.json, served as GET /api/books/<id>. A reader fetches it the first
// time the book is opened and it is kept in IndexedDB from then on (instant and offline afterwards) — see aus_53_book_store.js,
// window.AUS_BOOKS.getContent(id). The reader below renders from that; nothing in this file holds a book's text any more.

// --- Open the rich Reader modal for a purchased file ---
var _readerOpenSeq = 0;      // a slow download of one book must never paint over a book opened (or a reader closed) after it
async function openPurchasedFile(fileId) {
    const file = LEADERSHIP_FILES.find(f => f.id === fileId);
    if (!file) return;
    if (!isPurchased(fileId)) { openPayment(fileId); return; }
    if (!window.AUS_BOOKS) { showToast('تعذّر تحميل مخزن الكتب — أعد تحميل الصفحة', 'heart-toast'); return; }
    const seq = ++_readerOpenSeq;
    // remove pay backdrop if any
    const existingPay = document.getElementById('pay-backdrop');
    if (existingPay) existingPay.classList.remove('show');
    document.body.classList.remove('pay-open');
    // build / refresh reader
    let bd = document.getElementById('reader-backdrop');
    if (!bd) {
        bd = document.createElement('div');
        bd.id = 'reader-backdrop';
        bd.innerHTML = '<div id="reader-modal"></div>';
        bd.addEventListener('click', (e) => { if (e.target === bd) closeReader(); });
        document.body.appendChild(bd);
    }
    const modal = bd.querySelector('#reader-modal');
    modal.innerHTML = `
        <div class="reader-head">
            <div class="reader-icon">${file.icon}</div>
            <div class="reader-info">
                <h3>${file.title}</h3>
                <div class="reader-meta">
                    <span>${PERSONALITY_EMOJI[file.archetype]} ${PERSONALITY_LABEL_AR[file.archetype]}</span>
                    <span>${file.size}</span>
                    <span><i class="fas fa-shield-check"></i> ملف مفعّل</span>
                </div>
            </div>
            <div class="reader-actions">
                <button class="reader-btn ai-reader-trigger" onclick="openAIReader('${file.id}')"><i class="fas fa-robot"></i> قارئ AI</button>
                <button class="reader-btn" onclick="downloadFileContent('${file.id}')"><i class="fas fa-download"></i> تحميل</button>
                <button class="reader-btn" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
                <button class="reader-btn primary" onclick="closeReader()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
        <div class="reader-body" id="readerBody"><div class="rd-loading"><i class="fas fa-circle-notch fa-spin"></i> جارٍ فتح الكتاب…</div></div>
    `;
    document.body.classList.add('reader-open');
    requestAnimationFrame(() => bd.classList.add('show'));
    sfxPlay('confirm');

    // The text is fetched on demand — instantly when it is already saved on this device (AUS_BOOKS keeps it in IndexedDB) — and so are the
    // counters of AI-generated chapters; the chapters themselves are read one page at a time while the reader turns pages.
    const wantGen = file.type === 'book';
    const [content, gen] = await Promise.all([
        AUS_BOOKS.getContent(fileId),
        wantGen ? AUS_BOOKS.gen.meta(fileId).catch(function() { return null; }) : Promise.resolve(null)
    ]);
    if (seq !== _readerOpenSeq) return;            // closed, or another book opened, while this one was loading
    const body = document.getElementById('readerBody');
    if (!body) return;
    if (!content) {
        const why = AUS_BOOKS.why(fileId);
        const msg = why === 'missing' ? 'المحتوى قيد التحضير'
            : why === 'auth' ? 'قراءة الكتب تتطلب تسجيل الدخول إلى الخادم أولاً.'
            : (why === 'network' || navigator.onLine === false) ? 'لم يُحفظ هذا الكتاب على جهازك بعد، ولا يمكن الوصول إلى الخادم الآن. اتصل بالإنترنت وافتحه مرة واحدة — ثم تقرأه بدون اتصال.'
            : 'تعذّر تحميل الكتاب الآن. حاول مرة أخرى بعد قليل.';
        body.innerHTML = '<div class="rd-error"><p>' + msg + '</p>' +
            (why === 'missing' ? '' : '<button class="reader-btn primary" onclick="openPurchasedFile(\'' + file.id + '\')"><i class="fas fa-redo"></i> إعادة المحاولة</button>') + '</div>';
        if (why === 'missing') showToast('المحتوى قيد التحضير', 'heart-toast');
        return;
    }
    let html = null;
    try { html = renderFileContent(file, content, gen); } catch (e) { console.error('[reader] could not render ' + file.id, e); }      // the text now comes from outside: a damaged pack must not leave a spinner
    if (html === null) {
        body.innerHTML = '<div class="rd-error"><p>تعذّر عرض هذا الكتاب — ملف المحتوى غير سليم. أبلغ الإدارة بهذه المشكلة.</p></div>';
        return;
    }
    body.innerHTML = html;
    // Activate first page after DOM render
    setTimeout(function() {
        if (seq !== _readerOpenSeq) return;
        _bookAfterRender(file, gen);
    }, 50);
}

// First page, keyboard, checklist ticks and live chapter updates — everything that needs the book's DOM to exist.
function _bookAfterRender(file, gen) {
    var host = document.getElementById('bookPages');
    if (!host) return;
    _BOOK_CTX = {
        id: file.id, title: file.title, S: parseInt(host.dataset.static || '0', 10),
        gen: gen ? gen.chapters : 0, words: gen ? gen.words : 0, themes: gen && gen.themes ? gen.themes : []
    };
    _bookStyles();
    _bookGo(0, true);
    // Bind keyboard arrows
    if (!window._bookKeyBound) {
        window._bookKeyBound = true;
        document.addEventListener('keydown', function(e) {
            if (!document.getElementById('bookPages') || !document.body.classList.contains('reader-open')) return;
            if (document.activeElement && /input|textarea/i.test(document.activeElement.tagName)) return;
            var step = e.shiftKey ? 10 : 1;             // Shift + arrow: ten pages at a time (a book can run to hundreds)
            if (e.key === 'ArrowLeft')  _bookNav(step);   // RTL: left = next
            if (e.key === 'ArrowRight') _bookNav(-step);  // RTL: right = prev
        });
        // chapters generated while the book is open (قارئ AI → ولّد الكتاب الكامل) appear without reopening it
        window.addEventListener('aus-books-changed', function(e) {
            var d = e && e.detail;
            if (!d || d.kind !== 'gen' || !_BOOK_CTX || d.id !== _BOOK_CTX.id || !d.meta) return;
            _bookSyncGen(d.meta);
        });
    }
    // Add checkbox toggle for checklist items
    document.querySelectorAll('#bookPages .cl-list li').forEach(function(li) {
        li.addEventListener('click', function() {
            this.classList.toggle('checked');
            var check = this.querySelector('.cl-check');
            if (check) check.textContent = this.classList.contains('checked') ? '☑' : '☐';
        });
    });
}

// ── Personalized book bonus content per leadership archetype ──────────
function _bookProfile(archetype) {
    var profiles = {
        autocratic: {
            color: '#ff006e',
            tagline: 'الحزم في القرار، الوضوح في القيادة',
            insight: 'القائد الحازم لا يبحث عن الإجماع — يبحث عن الصواب. الإجماع يأتي لاحقاً عبر النتائج.',
            tip: 'في كل قرار صعب، حدّد أنت معايير النجاح أولاً، ثم اتخذ القرار. التراجع بعد القرار يدمّر هيبة القيادة.',
            reflections: [
                'متى كانت آخر مرة اتخذت فيها قراراً صعباً بمفردك؟ كيف كانت النتيجة؟',
                'هل تخاف من اتخاذ قرارات غير شعبية؟ ما الذي يمنعك من الحزم؟',
                'كيف تتعامل مع الفريق الذي لا يوافق على قراراتك؟',
                'ما القرار الذي أجّلته لأنك بحثت عن إجماع غير ممكن؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'وضوح المعايير', desc:'حدّد بدقة معايير اتخاذ قرارك في 3 مجالات حرجة. لا تتفاوض على المعايير، تفاوض على التطبيق.'},
                {num:'الأسبوع 2', title:'القرار السريع', desc:'تدرّب على اتخاذ قرارات صغيرة خلال 24 ساعة بدلاً من تأجيلها. السرعة عضلة تنمو بالتمرين.'},
                {num:'الأسبوع 3', title:'التواصل الحازم', desc:'بلّغ قراراتك بوضوح: ماذا، ولماذا، ومتى. لا تترك مجالاً للتأويل أو إعادة فتح النقاش.'},
                {num:'الأسبوع 4', title:'المساءلة الصارمة', desc:'حدّد مساءلة لكل قرار. القرار بلا مساءلة فكرة لطيفة، مع المساءلة قيادة حقيقية.'}
            ],
            mistakes: [
                '<strong>الحزم بدون استماع:</strong> القائد الحازم يستمع أولاً، ثم يقرر — لا يقرر دون فهم.',
                '<strong>الخلط بين الحزم والقسوة:</strong> الحزم وضوح، القسوة إهانة. الأول يبني، الثاني يدمّر.',
                '<strong>التمسّك بالقرار الخاطئ:</strong> الحزم في القرار الصحيح فضيلة، في القرار الخاطئ كارثة.',
                '<strong>إصدار قرارات بلا سياق:</strong> فريقك يحتاج "لماذا"، لا "ماذا" فقط.',
                '<strong>تجنّب المحادثات الصعبة:</strong> القائد الحازم يبدأ المحادثة الصعبة، لا يهرب منها.',
                '<strong>عدم تفويض الصلاحيات الكاملة:</strong> الحزم مع الجميع يخلق الاعتمادية المطلقة.',
                '<strong>التركيز على السلطة بدل التأثير:</strong> السلطة مؤقتة، التأثير دائم.'
            ],
            resources: {
                books: ['<strong>The Decision Book</strong> — Mikael Krogerus','<strong>Thinking, Fast and Slow</strong> — Daniel Kahneman','<strong>Extreme Ownership</strong> — Jocko Willink','<strong>Principles</strong> — Ray Dalio'],
                podcasts:['<strong>Jocko Podcast</strong> — Discipline & Leadership','<strong>The Knowledge Project</strong> — Decision making','<strong>Akimbo</strong> — Seth Godin'],
                courses:['<strong>Harvard — High-Stakes Decisions</strong>','<strong>Wharton — Strategic Decision Making</strong>']
            },
            glossary: [
                ['الحزم القيادي','اتخاذ قرارات صعبة بسرعة ووضوح، دون التضحية بالإنصات.'],
                ['نطاق السلطة','الحدود الواضحة لمن يقرر ماذا، ومتى يحتاج إلى تصعيد.'],
                ['عقلية المخاطر المحسوبة','التمييز بين المخاطرة الحمقاء والمحسوبة قبل القرار.'],
                ['الانضباط القيادي','الثبات على القرارات الصحيحة حتى في وجه الضغط الاجتماعي.'],
                ['وضوح المعايير','تحديد معايير القرار قبل تقييم الخيارات.'],
                ['شفافية التفكير','شرح السبب وراء القرار، لا فقط القرار نفسه.'],
                ['الحاسمية المسؤولة','اتخاذ القرار مع تحمّل كامل لنتائجه.'],
                ['وقت الحسم','اللحظة التي يجب فيها إنهاء النقاش والقرار.']
            ],
            letter: ['عزيزي القائد الحازم،','وصلت لنهاية هذا الكتاب — وهذا في حدّ ذاته دليل على شيء يميّزك: أنت تنهي ما تبدأه. هذه الصفة وحدها تجعلك في الـ 10٪ الأعلى.','الحزم في القرار ليس قسوة، وليس عناداً. هو ببساطة احترام لوقت فريقك. كل قرار مؤجَّل هو فريق معطَّل.','تذكّر دائماً: القرار الجيد المُتخَذ اليوم أفضل من القرار المثالي المُتخَذ غداً.','— فريق AUS'],
            commitments: ['أهم قرار سأتخذه دون تأجيل هذا الأسبوع:','المحادثة الصعبة التي سأبدأها بنفسي:','المعايير التي سأوضّحها لفريقي:','الحد الذي لن أتفاوض عليه بعد اليوم:','المراجعة التالية لأدائي الحازم بتاريخ:']
        },
        democratic: {
            color: '#00d4ff',
            tagline: 'القيادة بالتشارك، النجاح بالجماعة',
            insight: 'الديمقراطية في القيادة ليست تصويتاً على كل شيء — هي إيمان عميق بأن الحكمة موزّعة بين الناس.',
            tip: 'قبل أي اجتماع، حدّد أي قرارات تستحق النقاش وأيها تحتاج تصويتاً وأيها قرارك أنت. الخلط بينها يُفسد العملية.',
            reflections: [
                'متى استمعت آخر مرة لرأي عارَض رأيك بعمق وتراجعت؟',
                'كيف تتعامل مع الفريق الصامت في الاجتماعات؟',
                'هل تفرّق بين الإجماع والتوافق؟ متى تكتفي بأيهما؟',
                'من في فريقك يستحق صوتاً أعلى مما يأخذ حالياً؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'تنشيط الأصوات الصامتة', desc:'في كل اجتماع، اطلب رأي شخصين لم يتحدّثا. الحكمة الأكبر غالباً تكون في الزاوية الصامتة.'},
                {num:'الأسبوع 2', title:'تيسير لا توجيه', desc:'في 3 اجتماعات هذا الأسبوع، تحدّث آخراً لا أولاً. أعطِ مساحة للأفكار قبل أن تشكّلها بكلامك.'},
                {num:'الأسبوع 3', title:'بناء الإجماع', desc:'استخدم تقنية Dot Voting أو Fist-to-Five لقياس مدى الالتزام بعد كل قرار جماعي.'},
                {num:'الأسبوع 4', title:'توثيق المخالفين', desc:'في كل قرار، وثّق آراء المخالفين رسمياً. الديمقراطية الحقّة تحترم المخالفة لا تخفيها.'}
            ],
            mistakes: [
                '<strong>الديمقراطية في الأزمات:</strong> الأزمات لا تحتاج تصويتاً — تحتاج قراراً سريعاً وقائداً واضحاً.',
                '<strong>الخلط بين المشاركة والإجماع:</strong> الجميع يشارك في الرأي، لكن ليس الجميع يقرر.',
                '<strong>تأجيل القرارات بانتظار الإجماع المستحيل:</strong> أحياناً 70٪ موافقة كافية للمضيّ قدماً.',
                '<strong>إعطاء وزن متساوٍ لكل الآراء:</strong> الخبرة المتخصصة تستحق وزناً أعلى في مجالها.',
                '<strong>الاجتماعات بلا أجندة:</strong> الديمقراطية مع الفوضى تنتج اجتماعات بلا قرار.',
                '<strong>تجاهل الأقليات:</strong> الأغلبية تقرر، لكن صوت الأقلية يجب أن يُسمَع ويُحتَرم.',
                '<strong>إعادة فتح القرارات المُتَّخَذَة:</strong> بعد القرار الجماعي، التزم به علناً حتى لو خالف رأيك.'
            ],
            resources: {
                books: ['<strong>The Five Dysfunctions of a Team</strong> — Patrick Lencioni','<strong>Death by Meeting</strong> — Patrick Lencioni','<strong>Crucial Conversations</strong> — Kerry Patterson','<strong>The Wisdom of Crowds</strong> — James Surowiecki'],
                podcasts:['<strong>Coaching for Leaders</strong> — Dave Stachowiak','<strong>HBR IdeaCast</strong> — Team Dynamics','<strong>WorkLife</strong> — Adam Grant'],
                courses:['<strong>Coursera — Inspiring Leadership through Emotional Intelligence</strong>','<strong>edX — Collaborative Leadership</strong>']
            },
            glossary: [
                ['الإدارة التشاركية','إشراك الفريق في القرارات التي تؤثر فيهم.'],
                ['الإجماع التشغيلي','مستوى التوافق الكافي للمضيّ قدماً (عادة 70٪+).'],
                ['تيسير الاجتماعات','إدارة النقاش بحياد دون فرض الرأي.'],
                ['التفكير الجماعي السلبي','خطر الاتفاق دون تفكير نقدي.'],
                ['المحامي الشيطاني','دور تعيينه لتحدّي الفكرة قبل القرار.'],
                ['الذكاء الجماعي','الحكمة الناتجة عن تفاعل وجهات نظر متنوعة.'],
                ['التفويض الديمقراطي','إعطاء الفريق صلاحية القرار في نطاقه.'],
                ['التغذية الراجعة الدائرية','نظام يجمع آراء كل المستويات.']
            ],
            letter: ['عزيزي القائد الديمقراطي،','أكملت هذا الكتاب، وهذا يعني أنك تؤمن بأن القيادة فنّ، لا منصب.','الديمقراطية في القيادة لا تعني الضعف. تعني الثقة العميقة بأن فريقك يملك حكمة لا تملكها وحدك. لكنها تتطلب شجاعة من نوع نادر: شجاعة قبول النقد، وشجاعة التراجع عن الرأي، وشجاعة منح المساحة للآخرين.','كل اجتماع تيسّره بحكمة هو خطوة نحو بناء فريق يفكّر، لا فريق ينتظر تعليماتك.','— فريق AUS'],
            commitments: ['الشخص الذي سأمنحه صوتاً أعلى في الفريق:','الاجتماع الذي سأيسّره بدل أن أقوده هذا الأسبوع:','القرار الذي سأشرك الفريق فيه قبل اتخاذه:','التغذية الراجعة التي سأطلبها بصدق:','تقييم تشاركية قيادتي في تاريخ:']
        },
        transformational: {
            color: '#9d4edd',
            tagline: 'صياغة الرؤية، تغيير الواقع',
            insight: 'القائد التحويلي لا يدير الحاضر — يصمّم المستقبل. ومن يصمّم المستقبل يلهم الناس لبنائه معه.',
            tip: 'كرّر رؤيتك في كل اتصال — اجتماع، إيميل، محادثة. الرؤية التي لا تُذكَر 100 مرة، لم تُسمَع أصلاً.',
            reflections: [
                'ما الرؤية التي تحملها لمؤسستك بعد 10 سنوات؟ هل يعرفها فريقك؟',
                'متى آخر مرة ألهمت أحداً للتغيير؟ كيف فعلت ذلك؟',
                'ما القصة التي ترويها لفريقك عن "لماذا" تعمل ما تعمله؟',
                'كيف تتعامل مع المقاومة الطبيعية للتغيير؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'صياغة الرؤية', desc:'اكتب رؤيتك في جملة واحدة. لو لم تستطع تلخيصها في جملة، فهي ضبابية.'},
                {num:'الأسبوع 2', title:'القصة المُلهِمة', desc:'صُغ قصة شخصية تشرح "لماذا" هذه الرؤية تهمّك. ارويها 5 مرات في 5 سياقات.'},
                {num:'الأسبوع 3', title:'الفرسان الأوائل', desc:'حدّد 3 أشخاص في فريقك سيكونون حاملي راية التغيير. أعطهم ملكية حقيقية.'},
                {num:'الأسبوع 4', title:'الانتصارات السريعة', desc:'حقّق نجاحاً صغيراً مرئياً يثبت أن الرؤية ممكنة. الناس يصدّقون النتائج، لا الكلمات.'}
            ],
            mistakes: [
                '<strong>رؤية بلا تنفيذ:</strong> الأحلام دون خطة عمل هي تأمّلات لا قيادة.',
                '<strong>التغيير دون شرح "لماذا":</strong> الفريق ينفّذ "ماذا" فقط عندما يفهم "لماذا".',
                '<strong>تجاهل المقاومة:</strong> المقاومة معلومات، لا عدوّ. استمع لها قبل تجاوزها.',
                '<strong>التحوّل بسرعة مفرطة:</strong> الناس يتغيّرون بسرعة قلوبهم، لا بسرعة خططك.',
                '<strong>الإلهام بدون مساءلة:</strong> الكلام الملهم بلا متابعة دقيقة يفقد مصداقيته.',
                '<strong>إهمال الانتصارات الصغيرة:</strong> النصر الكبير سلسلة انتصارات صغيرة احتفلت بها.',
                '<strong>الاكتفاء بقصة واحدة:</strong> الجمهور متعدد — كل قطاع يحتاج قصة تخاطبه.'
            ],
            resources: {
                books: ['<strong>Start with Why</strong> — Simon Sinek','<strong>Leading Change</strong> — John Kotter','<strong>Switch</strong> — Heath Brothers','<strong>The Innovator\'s Dilemma</strong> — Clayton Christensen'],
                podcasts:['<strong>Masters of Scale</strong> — Reid Hoffman','<strong>How I Built This</strong> — Guy Raz','<strong>The Tim Ferriss Show</strong>'],
                courses:['<strong>Harvard Online — Leading Change</strong>','<strong>MIT Sloan — Leading Transformation</strong>']
            },
            glossary: [
                ['الرؤية التحويلية','صورة قوية ومُلهِمة للمستقبل تدفع الناس للعمل.'],
                ['نموذج Kotter','منهج من 8 خطوات لقيادة التغيير المؤسسي.'],
                ['Storytelling قيادي','استخدام القصة لنقل الرؤية والقيم.'],
                ['الانتصارات السريعة','إنجازات مرئية تثبت إمكانية التغيير.'],
                ['الإلحاحية الإيجابية','شعور بضرورة التغيير دون ذعر.'],
                ['التحالف القيادي','مجموعة قادة يقودون التغيير معاً.'],
                ['ثقافة الابتكار','بيئة تشجّع التجريب وتسمح بالفشل المُتعلَّم منه.'],
                ['نظرية U','منهج لقيادة التغيير من الداخل للخارج.']
            ],
            letter: ['عزيزي القائد التحويلي،','وصلت لنهاية الكتاب، وهذا يعكس صفة جوهرية فيك: الالتزام بإتمام ما تبدأه.','القيادة التحويلية ليست هواية للحالمين — هي وظيفة لمن يجمعون بين الرؤية البعيدة والانضباط اليومي.','الرؤية بلا انضباط هلوسة. الانضباط بلا رؤية روتين. اجمعهما، تصبح قائداً يُغيّر العالم.','ابدأ بشيء واحد فقط هذا الأسبوع — لكن ابدأ.','— فريق AUS'],
            commitments: ['الرؤية التي سأبلّغها لفريقي بوضوح:','القصة التي سأرويها أكثر من غيرها:','الفرسان الأوائل الذين سأبني معهم:','الانتصار الصغير الذي سأحقّقه خلال 30 يوماً:','مراجعة تقدّم رؤيتي في تاريخ:']
        },
        delegative: {
            color: '#ffd60a',
            tagline: 'الثقة الذكية، التفويض الحقيقي',
            insight: 'التفويض الحقيقي ليس تخلّياً عن المسؤولية، بل توزيعها بحكمة على من يستحقها.',
            tip: 'فوّض النتيجة المطلوبة، لا الطريقة. الطريقة تخصّ المُنفِّذ، النتيجة تخصّك أنت.',
            reflections: [
                'ما المهام التي تقوم بها أنت ويستطيع غيرك القيام بها بنسبة 80٪؟',
                'متى آخر مرة منحت شخصاً صلاحية كاملة دون تدخّل؟',
                'هل تخاف من التفويض لأنك تخاف من الفشل أم من فقدان السيطرة؟',
                'من في فريقك جاهز لمسؤولية أكبر لكنك لم تمنحه إياها بعد؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'تخطيط ما تفوّضه', desc:'اكتب قائمة بكل ما تفعله يومياً. ضع نجمة على ما يجب أن تفعله أنت فقط — كل ما عداه قابل للتفويض.'},
                {num:'الأسبوع 2', title:'مصفوفة RACI', desc:'لكل مشروع، حدّد: المسؤول، المُحاسَب، المُستشار، المُطّلَع. هذه المصفوفة تنهي الفوضى نهائياً.'},
                {num:'الأسبوع 3', title:'التفويض الفعلي', desc:'فوّض 3 مهام كاملة هذا الأسبوع. لا تنوب عنهم، حتى لو رأيت طريقتك "أفضل".'},
                {num:'الأسبوع 4', title:'المراجعة بالقدر', desc:'فوّض ولكن راجع. ليس كل يوم، ولكن في نقاط ارتكاز محدّدة بوضوح.'}
            ],
            mistakes: [
                '<strong>التفويض دون تأهيل:</strong> فوّض لمن يستطيع، أو علّمه أولاً.',
                '<strong>التفويض دون موارد:</strong> المهمة بلا أدوات وميزانية = تفويض الفشل.',
                '<strong>المراقبة المفرطة:</strong> فوّضت ثم تتدخّل كل ساعة = لم تُفوِّض حقاً.',
                '<strong>التفويض دون مساءلة:</strong> الصلاحية بلا مسؤولية = فوضى.',
                '<strong>الخلط بين التفويض والتخلّي:</strong> أنت ما زلت المسؤول النهائي عن النتيجة.',
                '<strong>تفويض المهام السهلة فقط:</strong> الناس ينمون بالتحدّيات، لا بالأعمال الروتينية.',
                '<strong>عدم الاحتفال بنجاحات المُفوَّض إليه:</strong> الفضل لمن نفّذ، لا لمن فوّض.'
            ],
            resources: {
                books: ['<strong>The One Minute Manager Meets the Monkey</strong> — Ken Blanchard','<strong>Multipliers</strong> — Liz Wiseman','<strong>Turn the Ship Around!</strong> — David Marquet','<strong>Drive</strong> — Daniel Pink'],
                podcasts:['<strong>Coaching for Leaders</strong>','<strong>The Eblin Group Leadership Podcast</strong>','<strong>Manager Tools</strong>'],
                courses:['<strong>LinkedIn Learning — Delegation Mastery</strong>','<strong>Coursera — High Performance Collaboration</strong>']
            },
            glossary: [
                ['مصفوفة RACI','أداة لتحديد الأدوار: Responsible, Accountable, Consulted, Informed.'],
                ['التفويض الكامل','منح الصلاحية والمسؤولية معاً.'],
                ['نطاق الحرية','مدى السلطة المسموح بها للمُفوَّض إليه.'],
                ['المراجعة الإيقاعية','مراجعات منتظمة دون مراقبة لحظية.'],
                ['التمكين','إعطاء الفريق الأدوات والثقة للقرار.'],
                ['OKRs','أهداف ونتائج رئيسية يفوَّض الفريق لتحقيقها.'],
                ['القيادة بالثقة','منح المساحة قبل فحص الكفاءة.'],
                ['Span of Control','عدد المرؤوسين الأمثل لتفويض فعّال.']
            ],
            letter: ['عزيزي القائد المُفوِّض،','أكملت هذا الكتاب — صفة تتقاطع مع جوهر التفويض: الالتزام بإتمام ما تبدأه، حتى وأنت تترك الآخرين يُتمّونه.','أعظم تحدٍّ في التفويض ليس تقنياً، بل نفسياً: التحرّر من وهم أنك "الأقدر دائماً". أنت لست — لكنك القائد الذي يبني الأقدرين.','تذكّر: المؤسسة العظيمة هي التي تستمر بعد رحيل قادتها. وهذا لا يحدث إلا بالتفويض الذكي.','— فريق AUS'],
            commitments: ['المهمة التي سأفوّضها كاملة هذا الأسبوع:','الشخص الذي سأرفع مستوى تأهيله للتفويض:','نطاق الحرية الذي سأمنحه:','إيقاع المراجعة الذي سألتزم به:','تقييم نسبة تفويضي في تاريخ:']
        },
        creative: {
            color: '#9d4edd',
            tagline: 'الابتكار في الفكر، التميّز في الأثر',
            insight: 'الإبداع ليس موهبة — هو عادة. القائد المبدع يصنع بيئة تنتج أفكاراً، لا ينتظر إلهاماً.',
            tip: 'قبل أن ترفض فكرة جديدة، اسأل: "كيف يمكن أن تنجح؟" بدل "لماذا ستفشل؟". هذا التحوّل البسيط يغيّر كل شيء.',
            reflections: [
                'متى آخر مرة جرّبت شيئاً جديداً قد يفشل؟',
                'كيف تتعامل مع الفكرة الغريبة من فريقك؟ ترفضها أم تستكشفها؟',
                'ما الذي يقتل الإبداع في بيئة عملك حالياً؟',
                'هل تحتفل بالمحاولات الفاشلة كما تحتفل بالنجاحات؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'بيئة الإبداع', desc:'أسّس "جلسة إبداع" أسبوعية مدتها ساعة. قاعدتها الذهبية: ممنوع رفض أي فكرة في الجلسة الأولى.'},
                {num:'الأسبوع 2', title:'النموذج الخام', desc:'لكل فكرة كبيرة، ابنِ نموذجاً صغيراً خلال أسبوع. النماذج تتحدّث بلغة لا يفهمها العرض التقديمي.'},
                {num:'الأسبوع 3', title:'تنوّع المدخلات', desc:'اقرأ كتاباً خارج مجالك. حضّر اجتماعاً مع شخص من صناعة مختلفة. الإبداع يولد من التقاطع.'},
                {num:'الأسبوع 4', title:'احتفال بالفشل المُتعلَّم منه', desc:'اعقد جلسة Postmortem لآخر مشروع. لا للوم، بل للدروس. الفشل المُحلَّل ذكاء مؤسسي.'}
            ],
            mistakes: [
                '<strong>الإبداع بلا تنفيذ:</strong> الأفكار العظيمة دون تنفيذ هي ثرثرة فكرية.',
                '<strong>قتل الفكرة قبل تطويرها:</strong> أعطِ كل فكرة 48 ساعة قبل الرفض.',
                '<strong>الإفراط في الإبداع:</strong> الفريق يحتاج استقراراً أيضاً، لا تغييراً مستمراً.',
                '<strong>الإبداع كاستعراض:</strong> الإبداع الحقيقي يحل مشاكل، لا يثير الإعجاب فقط.',
                '<strong>إهمال التفاصيل:</strong> الفكرة العبقرية بتنفيذ سيء = منتج رديء.',
                '<strong>الخوف من السرقة الفكرية:</strong> الأفكار رخيصة، التنفيذ نادر.',
                '<strong>عدم بناء فريق إبداعي:</strong> الإبداع الفردي محدود، الإبداع الجماعي بلا حدود.'
            ],
            resources: {
                books: ['<strong>Creative Confidence</strong> — Tom & David Kelley','<strong>Steal Like an Artist</strong> — Austin Kleon','<strong>The War of Art</strong> — Steven Pressfield','<strong>Originals</strong> — Adam Grant'],
                podcasts:['<strong>The Creative Independent</strong>','<strong>99% Invisible</strong>','<strong>Akimbo</strong> — Seth Godin'],
                courses:['<strong>IDEO U — Design Thinking</strong>','<strong>Stanford d.school — Innovation</strong>']
            },
            glossary: [
                ['Design Thinking','منهجية لحلّ المشاكل بتركيز على المستخدم.'],
                ['SCAMPER','تقنية لتوليد الأفكار: استبدل، اربط، عدّل، إلخ.'],
                ['Prototyping','بناء نسخة بسيطة لاختبار الفكرة.'],
                ['Brainstorming','جلسة توليد أفكار دون نقد.'],
                ['Lateral Thinking','تفكير خارج المسار التقليدي.'],
                ['Innovation Lab','مساحة مخصصة للتجريب والإبداع.'],
                ['Pivot','تغيير اتجاه استراتيجي مبني على تعلّم.'],
                ['Postmortem','جلسة تحليل بعد المشروع لاستخلاص الدروس.']
            ],
            letter: ['عزيزي القائد المُبدِع،','أكملت هذا الكتاب — وهذا في حد ذاته دليل على أنك لا تكتفي بالكلام عن الإبداع، بل تستثمر فيه.','الإبداع في القيادة ليس رفاهية فنية — هو الميزة التنافسية الوحيدة الباقية في عالم تتشابه فيه الاستراتيجيات.','تذكّر: أنت لا تحتاج أن تكون فناناً لتكون مبدعاً. تحتاج فقط أن تكون شجاعاً بما يكفي لتجريب ما لم يجربه غيرك.','— فريق AUS'],
            commitments: ['الفكرة الجديدة التي سأجرّبها بدون انتظار الكمال:','جلسة الإبداع الأسبوعية التي سأؤسّسها:','مصدر الإلهام الجديد الذي سأستكشفه:','الفشل الذي سأحتفل بدروسه:','مراجعة إبداع فريقي في تاريخ:']
        },
        social: {
            color: '#00f5d4',
            tagline: 'القيادة بالإنسانية، التأثير بالأصالة',
            insight: 'الناس لا يتبعون الرؤى — يتبعون من يجعلهم يشعرون بأنهم مهمّون. هذا أعمق سرّ في القيادة.',
            tip: 'في كل لقاء، اسأل سؤالاً يكشف ما يهمّ الشخص فعلاً — لا فقط ما يفعله. الاتصال الحقيقي لا يحدث على سطح الأدوار.',
            reflections: [
                'من في فريقك تشعر أنك لا تعرفه بعمق رغم العمل اليومي؟',
                'متى آخر مرة طلبت تغذية راجعة صادقة وتقبّلتها دون دفاع؟',
                'هل تجعل الناس يشعرون بأهميتهم أم بفائدتهم فقط؟',
                'ما الكلمة التي يصفك بها فريقك خلف ظهرك؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'الاستماع الكامل', desc:'في 5 محادثات هذا الأسبوع، لا تقاطع، لا تفكّر بردّك، لا تنصح إلا إذا طُلب. فقط استمع.'},
                {num:'الأسبوع 2', title:'الاهتمام بالتفاصيل', desc:'تذكّر تفصيلاً شخصياً عن كل عضو في فريقك واسأله عنه. ابنه يشعر بأنك تراه إنساناً.'},
                {num:'الأسبوع 3', title:'الضعف الواعي', desc:'شارك تحدّياً تواجهه أو خطأ ارتكبته. هذا يكسر الجدران ويبني الثقة الحقيقية.'},
                {num:'الأسبوع 4', title:'الاحتفاء الصامت', desc:'في كل أسبوع، أرسل رسالة شخصية لشخص أحدث فرقاً دون انتظار شيء بالمقابل.'}
            ],
            mistakes: [
                '<strong>الاهتمام الزائف:</strong> الناس يشعرون فوراً بالفرق بين الاهتمام الحقيقي والمصطنع.',
                '<strong>الاستماع لتردّ:</strong> الاستماع الحقيقي هو لتفهم، لا لتجهّز ردّك.',
                '<strong>التعاطف بلا حدود:</strong> القائد المتعاطف يحفظ نفسه ليبقى قادراً على العطاء.',
                '<strong>تجنّب المحادثات الصعبة:</strong> الحب الحقيقي يشمل الصراحة المحرجة أحياناً.',
                '<strong>الخلط بين العلاقات والإدارة:</strong> الصداقة مهمة، لكنها لا تلغي المعايير.',
                '<strong>عدم وضع حدود:</strong> القائد بلا حدود يصبح مُستنزَفاً ثم غير فعّال.',
                '<strong>الإهمال الانتقائي:</strong> الانتباه لبعض الفريق فقط يخلق دوائر داخلية تدمّر الثقة.'
            ],
            resources: {
                books: ['<strong>How to Win Friends and Influence People</strong> — Dale Carnegie','<strong>Dare to Lead</strong> — Brené Brown','<strong>The Art of Listening</strong> — Erich Fromm','<strong>Emotional Intelligence 2.0</strong> — Travis Bradberry'],
                podcasts:['<strong>WorkLife</strong> — Adam Grant','<strong>Brené Brown — Unlocking Us</strong>','<strong>The Tim Ferriss Show</strong>'],
                courses:['<strong>Yale — The Science of Wellbeing</strong>','<strong>Harvard — EQ for Leaders</strong>']
            },
            glossary: [
                ['الذكاء العاطفي (EQ)','القدرة على إدراك المشاعر وإدارتها لدى الذات والآخرين.'],
                ['الاستماع الفعّال','استماع لفهم الرسالة الكاملة، لا فقط الكلمات.'],
                ['التعاطف القيادي','الشعور مع الآخرين دون فقدان البوصلة القيادية.'],
                ['Vulnerability','الشجاعة على إظهار الضعف بطريقة بنّاءة.'],
                ['Psychological Safety','بيئة يشعر فيها الناس بأمان للتعبير.'],
                ['Servant Leadership','نموذج قيادة محوره خدمة الفريق.'],
                ['Building Rapport','بناء انسجام في العلاقة المهنية.'],
                ['شبكة الدعم','علاقات تبادل المساعدة المهنية والشخصية.']
            ],
            letter: ['عزيزي القائد الاجتماعي،','وصلت لنهاية هذا الكتاب — وهذا في حد ذاته احترام لوقت من كتبه ولرحلتك أنت.','القيادة الاجتماعية لا تُقاس بالأرباح فقط — تُقاس بعدد القلوب التي لمستها، وعدد المهن التي ساهمت في صناعتها.','تذكّر: الناس ينسون كلامك، لكنهم لا ينسون كيف جعلتهم يشعرون. هذا ميراثك الحقيقي.','— فريق AUS'],
            commitments: ['الشخص الذي سأعطيه وقتي الكامل بدون تشتّت:','المحادثة الصعبة التي سأبدأها بصراحة:','الاعتراف الذي سأقدّمه دون انتظار مقابل:','الحدّ الذي سأضعه لحماية طاقتي:','مراجعة جودة علاقاتي في تاريخ:']
        },
        strategic: {
            color: '#ff006e',
            tagline: 'الرؤية البعيدة، القرار الحاسم',
            insight: 'الاستراتيجية ليست التخطيط لما سيحدث — هي الاستعداد لكل ما قد يحدث، مع الاحتفاظ بحرية الحركة.',
            tip: 'كل أسبوع، خصّص ساعة كاملة بلا أجندة للتفكير في "ماذا لو؟". هذه الساعة ستُغيّر مؤسستك تدريجياً.',
            reflections: [
                'ما الإشارات الضعيفة التي تراها في صناعتك ولا يراها الآخرون؟',
                'لو تغيّر مجالك جذرياً خلال 5 سنوات، هل أنت مستعد؟',
                'ما القرار الذي تؤجّله لأنك لا تملك معلومات كاملة؟',
                'كم وقتاً تقضي في التفكير الاستراتيجي مقارنة بالتنفيذي؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'ساعة التفكير المقدّسة', desc:'خصّص ساعة أسبوعية محمية بلا اجتماعات. اطرح أسئلة، لا اجابات.'},
                {num:'الأسبوع 2', title:'سيناريوهات بديلة', desc:'ابنِ 3 سيناريوهات لمستقبل مؤسستك: المتوقّع، الأفضل، الأسوأ. حضّر استجابة لكل منها.'},
                {num:'الأسبوع 3', title:'إشارات ضعيفة', desc:'رصد 5 إشارات صغيرة في صناعتك قد تكون مؤشّرات تحوّل كبير قادم.'},
                {num:'الأسبوع 4', title:'القرار الكبير', desc:'حدّد قراراً استراتيجياً تؤجّله. اتخذه هذا الأسبوع بعد دراسة منهجية.'}
            ],
            mistakes: [
                '<strong>الاستراتيجية بلا تنفيذ:</strong> أكثر من 70٪ من الاستراتيجيات تفشل لا بسبب سوءها، بل بسبب التنفيذ.',
                '<strong>التخطيط للمستقبل المتوقّع فقط:</strong> الاستراتيجي يستعد لما لا يتوقّعه أحد.',
                '<strong>الالتزام بخطة جامدة:</strong> الخطة وثيقة حيّة، لا عقد إذعان.',
                '<strong>تجاهل المنافسين الصغار:</strong> الثورات تأتي من الهوامش، لا من المركز.',
                '<strong>التفكير قصير المدى:</strong> الربح هذا الربع على حساب القيمة بعد 5 سنوات.',
                '<strong>عدم مراجعة الافتراضات:</strong> ما كان صحيحاً قبل 5 سنوات قد لا يكون اليوم.',
                '<strong>الإفراط في التحليل:</strong> الشلل التحليلي يقتل الفرص أكثر من القرارات السيئة.'
            ],
            resources: {
                books: ['<strong>Good Strategy / Bad Strategy</strong> — Richard Rumelt','<strong>Playing to Win</strong> — A.G. Lafley','<strong>Blue Ocean Strategy</strong> — W. Chan Kim','<strong>The Art of Strategy</strong> — Avinash Dixit'],
                podcasts:['<strong>HBR IdeaCast</strong>','<strong>McKinsey Strategy & Corporate Finance</strong>','<strong>The Knowledge Project</strong> — Shane Parrish'],
                courses:['<strong>HBS Online — Strategy Execution</strong>','<strong>MIT Sloan — Strategic Decision Making</strong>']
            },
            glossary: [
                ['Porter 5 Forces','إطار لتحليل ديناميكيات الصناعة.'],
                ['SWOT','تحليل نقاط القوة والضعف والفرص والتهديدات.'],
                ['Blue Ocean','استراتيجية تخلق مساحة سوقية جديدة.'],
                ['Scenario Planning','بناء سيناريوهات بديلة للمستقبل.'],
                ['OKRs','أهداف ونتائج رئيسية لترجمة الاستراتيجية.'],
                ['Pivot','تغيير استراتيجي مبني على تعلّم.'],
                ['Moat','ميزة تنافسية يصعب تقليدها.'],
                ['First Principles','تفكيك المشكلة لأساسياتها الأولية.']
            ],
            letter: ['عزيزي القائد الاستراتيجي،','أنهيت هذا الكتاب — هذا انعكاس للصفة الأهم في الاستراتيجي: القدرة على إكمال ما يبدأه دون تشتّت.','الاستراتيجية الحقيقية لا تُبنى في غرف الاجتماعات، تُبنى في سنوات من التفكير الجاد والقراءة المتعدّدة والتأمّل الصامت.','تذكّر: أنت لا تتنبّأ بالمستقبل — أنت تصمّمه. ابدأ بفكرة واحدة استراتيجية تُطبّقها هذا الشهر.','— فريق AUS'],
            commitments: ['ساعة التفكير الاستراتيجي الأسبوعية بتاريخ:','القرار الاستراتيجي الذي لن أؤجّله أكثر:','الإشارات الضعيفة التي سأرصدها:','الافتراض القديم الذي سأراجعه:','مراجعة استراتيجيتي في تاريخ:']
        },
        operational: {
            color: '#00d4ff',
            tagline: 'التنفيذ المتقن، الانضباط الصارم',
            insight: 'الفكرة بلا تنفيذ هي هلوسة. التنفيذ المتقن يحوّل الأفكار العادية إلى نتائج استثنائية.',
            tip: 'كل صباح، حدّد 3 مهام لا أكثر. إنجاز 3 مهام حقيقية أهم من قائمة طويلة لم تُلمس.',
            reflections: [
                'ما العملية في فريقك التي تستهلك وقتاً أكثر من قيمتها؟',
                'متى آخر مرة قست النتائج وغيّرت العملية بناءً على القياس؟',
                'هل تركّز على ما يبدو إنجازاً أم على ما يحقّق الهدف؟',
                'ما الذي يمنع فريقك من تسليم النتائج المتوقّعة؟'
            ],
            planWeeks: [
                {num:'الأسبوع 1', title:'رسم العملية', desc:'ارسم خطوة بخطوة عملية واحدة مهمة. ستجد فيها 30٪ هدراً يمكن إزالته فوراً.'},
                {num:'الأسبوع 2', title:'مؤشّرات الأداء', desc:'حدّد 3 مؤشّرات حقيقية تقيس النجاح في عملك. قس أسبوعياً، لا شهرياً.'},
                {num:'الأسبوع 3', title:'التبسيط الصارم', desc:'احذف خطوة من كل عملية. إذا لم يحدث شيء سيء، فالخطوة كانت زائدة.'},
                {num:'الأسبوع 4', title:'ثقافة الإنجاز', desc:'احتفل بالإنجاز الحقيقي علناً. الفريق الذي يرى الإنجاز يتعلّم أنه ممكن.'}
            ],
            mistakes: [
                '<strong>التنفيذ بلا استراتيجية:</strong> التنفيذ السريع للخطّة الخاطئة كارثة سريعة.',
                '<strong>قياس النشاط لا النتيجة:</strong> "8 اجتماعات اليوم" لا يعني شيئاً مفيداً.',
                '<strong>الإفراط في العمليات:</strong> العمليات تخدم الناس، لا العكس.',
                '<strong>إهمال البساطة:</strong> العملية المعقدة تموت في التنفيذ.',
                '<strong>التركيز على السرعة فقط:</strong> السرعة بلا جودة = إعادة عمل مكلفة.',
                '<strong>تأجيل المراجعة:</strong> العملية تُصبح متهالكة بدون مراجعة دورية.',
                '<strong>عدم توثيق المعرفة:</strong> المعرفة في رؤوس الأفراد تموت بمغادرتهم.'
            ],
            resources: {
                books: ['<strong>The Goal</strong> — Eliyahu Goldratt','<strong>Atomic Habits</strong> — James Clear','<strong>Getting Things Done</strong> — David Allen','<strong>Lean Startup</strong> — Eric Ries'],
                podcasts:['<strong>Manager Tools</strong>','<strong>Drift — Seeking Wisdom</strong>','<strong>The Productivity Show</strong>'],
                courses:['<strong>edX — Operations Management</strong>','<strong>MIT — Lean Six Sigma</strong>']
            },
            glossary: [
                ['KPIs','مؤشّرات أداء رئيسية لقياس النجاح.'],
                ['Lean','منهجية إزالة الهدر من العمليات.'],
                ['Six Sigma','منهجية تقليل الأخطاء لـ 3.4 في المليون.'],
                ['Kanban','نظام مرئي لإدارة المهام والتدفّق.'],
                ['SOPs','إجراءات تشغيل قياسية موثّقة.'],
                ['Continuous Improvement','تحسين مستمر تدريجي للعمليات.'],
                ['Bottleneck','نقطة الاختناق في العملية.'],
                ['Throughput','معدّل إنتاج المخرجات في وحدة الزمن.']
            ],
            letter: ['عزيزي القائد التنفيذي،','أكملت هذا الكتاب — وهذا انعكاس لصفتك الأهم: لا تترك ما تبدأه.','التنفيذ المتقن ليس مهارة — هو فلسفة حياة. القائد التنفيذي يثبت كل يوم أن الأفكار الكبيرة قابلة للتطبيق إذا كان هناك من يلتزم بإتمامها.','تذكّر: العالم يحتاج أناساً يُتمّون أكثر مما يحتاج أناساً يحلمون.','— فريق AUS'],
            commitments: ['العملية التي سأبسّطها هذا الأسبوع:','المؤشّر الذي سأقيسه أسبوعياً:','الخطوة الزائدة التي سأحذفها:','الإنجاز الذي سأحتفل به مع فريقي:','مراجعة كفاءتي التشغيلية في تاريخ:']
        }
    };
    return profiles[archetype] || profiles.transformational;
}

// ── Generate extra sub-pages for books to reach 50-page target ──
function _bookSubPages(file, sectionIdx, section, startPage) {
    // Each section becomes 5 sub-pages, each with UNIQUE content from the rich body.
    // The rich body (1000-1800 chars) is split into 4 distinct chunks distributed
    // across 4 content pages — NO repeated insight/tip across sections.
    var bookTitle = file.title;
    var sec = section || {};
    var body = (sec.body || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    var title = _bookEsc(sec.title || ('الفصل ' + (sectionIdx + 1)));        // the text now arrives as DATA (server / IndexedDB), not as code: escaped where it meets the page
    var prof = _bookProfile(file.archetype || file.cdnaType);

    // Split body into sentences (Arabic + Latin punctuation)
    var sentences = body.split(/(?<=[.!?؟])\s+/).filter(function(s){ return s.trim().length > 0; });

    // Distribute sentences into 4 roughly-equal chunks
    var nChunks = 4;
    var perChunk = Math.max(1, Math.ceil(sentences.length / nChunks));
    var chunks = [];
    for (var ci = 0; ci < nChunks; ci++) {
        var slice = sentences.slice(ci * perChunk, (ci + 1) * perChunk).join(' ').trim();
        if (slice) chunks.push(slice);
    }
    // Ensure at least 1 chunk
    if (chunks.length === 0) chunks = [body || 'محتوى هذا الفصل قيد الإعداد.'];

    // Sub-titles for each content page (varied, not repeated structure-labels)
    var pageLabels = ['الفكرة الأساسية', 'التحليل العميق', 'التطبيق العملي', 'الإتقان والترسيخ'];
    var pageIcons  = ['📖', '🔍', '⚙️', '🎯'];

    var subPages = [];

    // SUB-PAGE 1: Chapter opener (large title)
    subPages.push(
        '<div class="book-page chapter-opener">' +
        '<div class="page-header"><span class="page-section">الفصل ' + (sectionIdx + 1) + '</span><span class="page-book">' + bookTitle + '</span></div>' +
        '<div class="chapter-big-number">' + String(sectionIdx + 1).padStart(2, '0') + '</div>' +
        '<div class="chapter-small-label">الفصل ' + (sectionIdx + 1) + ' من ' + 7 + '</div>' +
        '<h1 class="chapter-big-title">' + title + '</h1>' +
        '<div class="chapter-big-divider"></div>' +
        '<div class="chapter-tagline">' + prof.tagline + '</div>' +
        '<div class="page-footer"><span>صفحة ' + (startPage) + '</span></div>' +
        '</div>'
    );

    // SUB-PAGES 2-5: Each shows a UNIQUE chunk of the section body
    for (var p = 0; p < 4; p++) {
        var chunkText = chunks[p] || chunks[chunks.length - 1] || '';
        // Build paragraph(s) — split long chunk into 2 paras for readability
        var chunkSentences = chunkText.split(/(?<=[.!?؟])\s+/).filter(Boolean);
        var halfC = Math.ceil(chunkSentences.length / 2);
        var paraA = chunkSentences.slice(0, halfC).join(' ');
        var paraB = chunkSentences.slice(halfC).join(' ');
        var bodyHtml = '<p>' + _bookEsc(paraA) + '</p>' + (paraB ? '<p>' + _bookEsc(paraB) + '</p>' : '');

        var pageNo = startPage + 1 + p;
        var headingTag = (p === 0) ? 'h1' : 'h2';
        var headingCls = (p === 0) ? 'page-h1' : 'page-h2';
        var headingTxt = (p === 0) ? title : (pageIcons[p] + ' ' + pageLabels[p]);

        subPages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">' + title + '</span><span class="page-book">' + bookTitle + '</span></div>' +
            '<div class="chapter-marker">الفصل <span>' + (sectionIdx + 1) + '</span> · ' + pageLabels[p] + '</div>' +
            '<' + headingTag + ' class="' + headingCls + '">' + headingTxt + '</' + headingTag + '>' +
            '<div class="page-body">' + bodyHtml + '</div>' +
            '<div class="page-footer"><span>صفحة ' + pageNo + '</span></div>' +
            '</div>'
        );
    }

    return subPages;
}

// `gen` = the counters of this book's AI-generated chapters ({chapters, words, themes}) — the chapters themselves are NOT rendered here (see below).
function renderFileContent(file, c, gen) {
    // ── Books get the 50-page expanded layout, files stay compact ──────────
    var isBook = (file && file.type === 'book');
    var pages = [];

    // PAGE 1: COVER
    pages.push(
        '<div class="book-page cover-page">' +
        '<div class="cover-decoration"></div>' +
        '<div class="cover-badge">AUS LEADERSHIP LIBRARY</div>' +
        '<div class="cover-icon">' + (file.icon || '📖') + '</div>' +
        '<h1 class="cover-title">' + file.title + '</h1>' +
        (file.subtitle ? '<div class="cover-subtitle">' + file.subtitle + '</div>' : '') +
        '<div class="cover-divider"></div>' +
        '<div class="cover-author">' + (PERSONALITY_EMOJI[file.archetype] || '') + ' ' + (PERSONALITY_LABEL_AR[file.archetype] || '') + '</div>' +
        '<div class="cover-meta">' + (file.size || '') + '</div>' +
        '<div class="cover-footer">© ' + new Date().getFullYear() + ' · AUS Platform</div>' +
        '</div>'
    );

    // PAGE 2: TABLE OF CONTENTS
    var tocItems = '';
    if (c.intro)        tocItems += '<li><span class="toc-num">i</span><span class="toc-title">مقدمة</span><span class="toc-page">3</span></li>';
    (c.sections || []).forEach(function(s, i) {
        tocItems += '<li><span class="toc-num">' + (i + 1) + '</span><span class="toc-title">' + _bookEsc(s.title) + '</span><span class="toc-page">' + (4 + i) + '</span></li>';
    });
    if (c.example)   tocItems += '<li><span class="toc-num">◆</span><span class="toc-title">مثال واقعي</span><span class="toc-page">' + (4 + (c.sections || []).length) + '</span></li>';
    if (c.checklist) tocItems += '<li><span class="toc-num">✓</span><span class="toc-title">قائمة تنفيذية</span><span class="toc-page">' + (5 + (c.sections || []).length) + '</span></li>';
    if (c.conclusion)tocItems += '<li><span class="toc-num">∎</span><span class="toc-title">الخلاصة</span><span class="toc-page">' + (6 + (c.sections || []).length) + '</span></li>';

    pages.push(
        '<div class="book-page">' +
        '<div class="page-header"><span class="page-section">الفهرس</span><span class="page-book">' + file.title + '</span></div>' +
        '<h1 class="page-h1">📑 فهرس المحتويات</h1>' +
        '<ul class="toc-list">' + tocItems + '</ul>' +
        '<div class="page-footer"><span>صفحة 2</span></div>' +
        '</div>'
    );

    // PAGE 3: INTRO
    if (c.intro) {
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">مقدمة</span><span class="page-book">' + file.title + '</span></div>' +
            '<h1 class="page-h1">💎 مقدمة الكتاب</h1>' +
            '<div class="page-intro">' + _bookEsc(c.intro) + '</div>' +
            '<div class="page-quote">"كل قارئ يبدأ هذا الكتاب وحده، لكن لا أحد يُنهيه نفس الشخص."</div>' +
            '<div class="page-footer"><span>صفحة 3</span></div>' +
            '</div>'
        );
    }

    // PAGES 4+: sections
    // For books: exactly 7 sections × 5 sub-pages = 35 pages (50-page target)
    // For files: each section = 1 page
    var pagesBeforeSections = 4; // cover(1) + toc(2) + intro(3) = 3 pages, next starts at 4
    if (isBook) {
        // Cap or pad sections to exactly 7 for consistent 50-page books
        var bookSections = (c.sections || []).slice(0, 7);
        // If book has fewer than 7 sections, repeat/pad with generic content
        while (bookSections.length < 7) {
            var idx = bookSections.length;
            bookSections.push({
                title: 'تطبيقات متقدمة — الجزء ' + (idx + 1),
                body: 'في هذا الفصل نتعمّق في تطبيقات أكثر تقدماً لما تعلّمناه سابقاً. نأخذ المبادئ ونحوّلها إلى ممارسة يومية. القائد الذي لا يطبّق ما يعرف، يعرف لكنه لا يقود.'
            });
        }
        bookSections.forEach(function(s, i) {
            var startPage = pagesBeforeSections + (i * 5);
            var subPages = _bookSubPages(file, i, s, startPage);
            pages = pages.concat(subPages);
        });
    } else {
        (c.sections || []).forEach(function(s, i) {
            var pageNum = pagesBeforeSections + i;
            pages.push(
                '<div class="book-page">' +
                '<div class="page-header"><span class="page-section">الفصل ' + (i + 1) + '</span><span class="page-book">' + file.title + '</span></div>' +
                '<div class="chapter-marker">الفصل <span>' + (i + 1) + '</span></div>' +
                '<h1 class="page-h1">' + _bookEsc(s.title) + '</h1>' +
                '<div class="page-body">' + s.body.split('\n').map(function(p) { return '<p>' + _bookEsc(p.trim()) + '</p>'; }).join('') + '</div>' +
                '<div class="page-footer"><span>صفحة ' + pageNum + '</span></div>' +
                '</div>'
            );
        });
    }

    // EXAMPLE PAGE
    if (c.example) {
        var exPage = 4 + (c.sections || []).length;
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">حالة دراسية</span><span class="page-book">' + file.title + '</span></div>' +
            '<h1 class="page-h1">📍 مثال واقعي</h1>' +
            '<div class="ex-card">' +
            '<div class="ex-company-name">' + _bookEsc(c.example.company || '') + '</div>' +
            '<div class="ex-divider"></div>' +
            '<p class="ex-summary">' + _bookEsc(c.example.summary || '') + '</p>' +
            '</div>' +
            '<div class="page-footer"><span>صفحة ' + exPage + '</span></div>' +
            '</div>'
        );
    }

    // CHECKLIST PAGE
    if (c.checklist && c.checklist.length) {
        var clPage = 5 + (c.sections || []).length;
        var clHtml = c.checklist.map(function(item, idx) {
            return '<li><span class="cl-check">☐</span><span class="cl-num">' + String(idx + 1).padStart(2, '0') + '</span><span class="cl-text">' + _bookEsc(item) + '</span></li>';
        }).join('');
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">قائمة تنفيذية</span><span class="page-book">' + file.title + '</span></div>' +
            '<h1 class="page-h1">✓ قائمة الإنجاز التنفيذية</h1>' +
            '<div class="cl-intro">طبّق هذه النقاط واحدة تلو الأخرى — كل نقطة تنفّذها تُقرّبك للقائد الذي تريد أن تكون.</div>' +
            '<ul class="cl-list">' + clHtml + '</ul>' +
            '<div class="page-footer"><span>صفحة ' + clPage + '</span></div>' +
            '</div>'
        );
    }

    // CONCLUSION PAGE
    if (c.conclusion) {
        var conPage = 6 + (c.sections || []).length;
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">الخلاصة</span><span class="page-book">' + file.title + '</span></div>' +
            '<h1 class="page-h1">∎ الخلاصة</h1>' +
            '<div class="page-body">' + c.conclusion.split('\n').map(function(p) { return '<p>' + _bookEsc(p.trim()) + '</p>'; }).join('') + '</div>' +
            '<div class="page-footer"><span>صفحة ' + conPage + '</span></div>' +
            '</div>'
        );
    }

    // ── BONUS PAGES (books only, personalized per archetype) ──────────────────
    if (isBook) {
        var basePg = pages.length + 1;
        var prof = _bookProfile(file.archetype || file.cdnaType);
        var headerBook = file.title;

        // BONUS 1: 30-Day Plan (archetype-specific)
        var planHtml = prof.planWeeks.map(function(w){
            return '<div class="plan-week"><span class="plan-week-num">' + w.num + '</span><span class="plan-week-title">' + w.title + '</span><span class="plan-week-desc">' + w.desc + '</span></div>';
        }).join('');
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">خطة التطبيق</span><span class="page-book">' + headerBook + '</span></div>' +
            '<h1 class="page-h1">📅 خطة الـ 30 يوماً</h1>' +
            '<div class="page-body"><p><em>"' + prof.tagline + '"</em></p><p>هذا الكتاب ليس للقراءة فقط — هو للتطبيق. ما يلي هو خطّتك المُخصَّصة لنمطك القيادي.</p></div>' +
            planHtml +
            '<div class="page-footer"><span>صفحة ' + basePg + '</span></div>' +
            '</div>'
        );

        // BONUS 2: Self-Assessment (archetype-specific reflections as rating items)
        var reflItems = prof.reflections.map(function(r){
            return '<div class="rating-item"><span>' + r + '</span><div class="rating-scale">1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10</div></div>';
        }).join('');
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">تقييم ذاتي</span><span class="page-book">' + headerBook + '</span></div>' +
            '<h1 class="page-h1">📊 تقييم ذاتي مُخصَّص</h1>' +
            '<div class="page-intro">قيّم نفسك بصدق على المقاييس التالية — كل سؤال مصمَّم لنمطك القيادي.</div>' +
            '<div class="rating-grid">' + reflItems + '</div>' +
            '<div class="page-footer"><span>صفحة ' + (basePg + 1) + '</span></div>' +
            '</div>'
        );

        // BONUS 3: Common Mistakes (archetype-specific)
        var mistakesHtml = prof.mistakes.map(function(m, i){
            return '<div class="mistake-item"><span class="mistake-num">' + (i + 1) + '</span>' + m + '</div>';
        }).join('');
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">أخطاء شائعة</span><span class="page-book">' + headerBook + '</span></div>' +
            '<h1 class="page-h1">⚠️ أخطاء نمطك القيادي</h1>' +
            '<div class="page-intro">هذه الأخطاء يقع فيها القادة من نمطك تحديداً. الوعي بها نصف الحماية منها.</div>' +
            mistakesHtml +
            '<div class="page-footer"><span>صفحة ' + (basePg + 2) + '</span></div>' +
            '</div>'
        );

        // BONUS 4: Recommended Resources (archetype-specific)
        var resHtml =
            '<div class="resource-block"><div class="resource-label">📖 كتب لنمطك</div><ul>' + prof.resources.books.map(function(b){return '<li>' + b + '</li>';}).join('') + '</ul></div>' +
            '<div class="resource-block"><div class="resource-label">🎙️ بودكاست</div><ul>' + prof.resources.podcasts.map(function(p){return '<li>' + p + '</li>';}).join('') + '</ul></div>' +
            '<div class="resource-block"><div class="resource-label">🎓 دورات</div><ul>' + prof.resources.courses.map(function(c){return '<li>' + c + '</li>';}).join('') + '</ul></div>';
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">موارد إضافية</span><span class="page-book">' + headerBook + '</span></div>' +
            '<h1 class="page-h1">📚 موارد لنمطك القيادي</h1>' +
            '<div class="page-intro">هذه الموارد منتقاة خصيصاً لنمطك القيادي — ستأخذك أعمق فيما تعلّمته.</div>' +
            resHtml +
            '<div class="page-footer"><span>صفحة ' + (basePg + 3) + '</span></div>' +
            '</div>'
        );

        // BONUS 5: Glossary (archetype-specific)
        var glossHtml = prof.glossary.map(function(g){
            return '<div class="glossary-item"><strong>' + g[0] + ':</strong> ' + g[1] + '</div>';
        }).join('');
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">مفاهيم</span><span class="page-book">' + headerBook + '</span></div>' +
            '<h1 class="page-h1">📓 مسرد المفاهيم</h1>' +
            '<div class="page-intro">المفاهيم الجوهرية في نمطك القيادي — أتقنها وأنت تتقن لغة قيادتك.</div>' +
            glossHtml +
            '<div class="page-footer"><span>صفحة ' + (basePg + 4) + '</span></div>' +
            '</div>'
        );

        // BONUS 6: Personal Letter (archetype-specific)
        var letterHtml = prof.letter.map(function(l, i){
            if (i === 0)                     return '<p><strong style="color:#ffd700">' + l + '</strong></p>';
            if (i === prof.letter.length-1)  return '<p class="letter-signature">' + l + '</p>';
            return '<p>' + l + '</p>';
        }).join('');
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">رسالة ختامية</span><span class="page-book">' + headerBook + '</span></div>' +
            '<h1 class="page-h1">💌 رسالة شخصية إليك</h1>' +
            '<div class="letter-body">' + letterHtml + '</div>' +
            '<div class="page-footer"><span>صفحة ' + (basePg + 5) + '</span></div>' +
            '</div>'
        );

        // BONUS 7: Personal Commitment (archetype-specific questions)
        var commitHtml = prof.commitments.map(function(q){
            return '<div class="commitment-item"><div class="commitment-q">' + q + '</div><div class="commitment-line"></div></div>';
        }).join('');
        pages.push(
            '<div class="book-page">' +
            '<div class="page-header"><span class="page-section">التزام شخصي</span><span class="page-book">' + headerBook + '</span></div>' +
            '<h1 class="page-h1">✍️ التزامي الشخصي</h1>' +
            '<div class="page-intro">القراءة بلا التزام مجرّد ترفيه فكري. هذه الالتزامات مصمّمة خصيصاً لنمطك القيادي.</div>' +
            commitHtml +
            '<div class="page-footer"><span>صفحة ' + (basePg + 6) + '</span></div>' +
            '</div>'
        );
        // BONUS 8: Certificate of Completion
        pages.push(
            '<div class="book-page certificate-page">' +
            '<div class="page-header"><span class="page-section">شهادة</span><span class="page-book">' + file.title + '</span></div>' +
            '<div class="cert-frame">' +
            '<div class="cert-badge">AUS</div>' +
            '<div class="cert-title">شهادة إتمام</div>' +
            '<div class="cert-subtitle">Certificate of Completion</div>' +
            '<div class="cert-divider"></div>' +
            '<div class="cert-text">يشهد هذا المستند بأن القارئ قد أتمّ بنجاح كتاب</div>' +
            '<div class="cert-book-title">' + file.title + '</div>' +
            '<div class="cert-divider"></div>' +
            '<div class="cert-date">' + new Date().toLocaleDateString('ar-EG', {year:'numeric', month:'long', day:'numeric'}) + '</div>' +
            '<div class="cert-signature">AUS · AI University Simulator</div>' +
            '</div>' +
            '<div class="page-footer"><span>صفحة ' + (basePg + 7) + '</span></div>' +
            '</div>'
        );
    }

    // ── AI-GENERATED CHAPTERS (from قارئ AI "ولّد الكتاب الكامل") ──────────
    // A book can carry 200+ of them (100,000 words). They are NOT built here any more: each is its own record in IndexedDB, and ONE page
    // slot below shows whichever chapter is on screen (_bookGo → _bookShowVirtual): an index page, then one page per chapter. Opening a
    // book therefore costs the same whether it has 0 or 250 generated chapters, and nothing is parsed or rendered until a page is turned to.
    var staticCount = pages.length;
    var genCount = (isBook && gen && gen.chapters > 0) ? gen.chapters : 0;
    var virtualCount = genCount ? genCount + 1 : 0;
    if (virtualCount) pages.push('<div class="book-page gen-slot" id="bookGenSlot"></div>');

    // END PAGE
    pages.push(
        '<div class="book-page end-page">' +
        '<div class="end-seal">∎</div>' +
        '<h2 class="end-title">' + (isBook ? 'انتهى الكتاب' : 'انتهى المحتوى') + '</h2>' +
        '<div class="end-msg">شكراً لقراءتك. أتمنى أن يكون هذا ' + (isBook ? 'الكتاب' : 'المحتوى') + ' نقطة تحوّل في رحلتك القيادية.</div>' +
        '<div class="end-divider"></div>' +
        '<div class="end-brand">AUS · CERTIFIED LEADERSHIP CONTENT</div>' +
        '<div class="end-copyright">© ' + new Date().getFullYear() + ' AI University Simulator</div>' +
        '</div>'
    );

    var totalPages = staticCount + virtualCount + 1;      // normal pages + [index + chapters] + the end page

    return (
        '<div class="book-wrap">' +
        '<div class="book-controls">' +
        '<button class="bk-nav-btn" id="bkPrev" onclick="_bookNav(-1)" disabled><i class="fas fa-chevron-right"></i> السابق</button>' +
        '<div class="bk-progress" onclick="_bookSeek(event)"><div class="bk-progress-fill" id="bkProgressFill"></div></div>' +
        '<div class="bk-counter">صفحة <span id="bkCurPage" onclick="_bookPrompt()" title="انتقل إلى صفحة">1</span> من <span id="bkTotalPages">' + totalPages + '</span></div>' +
        '<button class="bk-nav-btn primary" id="bkNext" onclick="_bookNav(1)">التالي <i class="fas fa-chevron-left"></i></button>' +
        '</div>' +
        '<div class="book-pages" id="bookPages" data-current="0" data-total="' + totalPages + '" data-static="' + staticCount + '" data-virtual="' + virtualCount + '">' + pages.join('') + '</div>' +
        '</div>'
    );
}

// ── Book page navigation ───────────────────────────────────────────────────────
// Logical pages 0 … total-1:  [0, S) normal pages already in the DOM · [S, S+V) the lazy block (index page + AI-generated chapters,
// painted into the single #bookGenSlot on demand) · the last one is the end page.
var _BOOK_CTX = null;     // {id, title, S, gen (chapters), words, themes[]} of the book on screen

function _bookEsc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function _bookStyles() {
    if (document.getElementById('book-reader-extra-css')) return;
    var s = document.createElement('style');
    s.id = 'book-reader-extra-css';
    s.textContent =
        '.bk-progress{cursor:pointer}' +
        '.bk-counter #bkCurPage{cursor:pointer;border-bottom:1px dotted rgba(0,212,255,.55)}' +
        '.bk-counter #bkJump{width:3.8em;box-sizing:border-box;background:rgba(0,10,30,.7);border:1px solid rgba(0,212,255,.45);border-radius:6px;color:#fff;font:inherit;text-align:center;padding:0 2px;outline:none}' +
        '.gen-toc li{cursor:pointer}' +
        '.rd-loading,.rd-error{text-align:center;padding:4rem 1.5rem;color:rgba(255,255,255,.62);font-family:"Tajawal",sans-serif;line-height:1.9}' +
        '.rd-error p{margin:0 0 1.1rem}';
    document.head.appendChild(s);
}

// move to logical page `target`.  silent = no click sound (first page) · soft = only refresh counters / the index page, do not replay the page animation
function _bookGo(target, silent, soft) {
    var c = document.getElementById('bookPages');
    if (!c) return;
    var total = parseInt(c.dataset.total || '1', 10);
    var S = parseInt(c.dataset.static || String(total - 1), 10);
    var V = parseInt(c.dataset.virtual || '0', 10);
    var next = Math.max(0, Math.min(total - 1, target));
    c.dataset.current = String(next);
    var kids = c.children;                                  // every child is a .book-page: the normal pages, [the lazy slot], the end page
    var slot = V ? document.getElementById('bookGenSlot') : null;
    var inSlot = !!slot && next >= S && next < S + V;
    var shown = next < S ? kids[next] : inSlot ? null : kids[kids.length - 1];
    if (!soft || !inSlot) {
        for (var i = 0; i < kids.length; i++) kids[i].classList.toggle('active', kids[i] === shown);
    }
    if (inSlot) _bookShowVirtual(c, slot, next - S, soft);
    var prev = document.getElementById('bkPrev');
    var nxt  = document.getElementById('bkNext');
    if (prev) prev.disabled = (next === 0);
    if (nxt)  nxt.disabled  = (next === total - 1);
    var curEl = document.getElementById('bkCurPage');
    if (curEl && !curEl.querySelector('input')) curEl.textContent = String(next + 1);
    var totEl = document.getElementById('bkTotalPages');
    if (totEl) totEl.textContent = String(total);
    var fill = document.getElementById('bkProgressFill');
    if (fill) fill.style.width = (((next + 1) / total) * 100) + '%';
    if (!soft) {
        // Scroll to top of reader
        var body = document.getElementById('readerBody');
        if (body) body.scrollTop = 0;
        if (!silent) { try { sfxPlay('hover'); } catch (_) {} }
    }
}

function _bookNav(delta) {
    var container = document.getElementById('bookPages');
    if (!container) return;
    _bookGo(parseInt(container.dataset.current || '0', 10) + delta);
}

// click on the progress bar → jump there (RTL: the bar fills from the right)
function _bookSeek(ev) {
    var c = document.getElementById('bookPages');
    var bar = ev && ev.currentTarget;
    if (!c || !bar) return;
    var r = bar.getBoundingClientRect();
    if (!r.width) return;
    var frac = (ev.clientX - r.left) / r.width;
    try { if (getComputedStyle(bar).direction === 'rtl') frac = 1 - frac; } catch (_) {}
    var total = parseInt(c.dataset.total || '1', 10);
    _bookGo(Math.floor(Math.max(0, Math.min(0.999999, frac)) * total));
}

// click on the page number → type a page number (a 250-chapter book cannot be read with "next" alone)
function _bookPrompt() {
    var c = document.getElementById('bookPages');
    var el = document.getElementById('bkCurPage');
    if (!c || !el || el.querySelector('input')) return;
    var total = parseInt(c.dataset.total || '1', 10);
    el.innerHTML = '<input id="bkJump" type="number" min="1" max="' + total + '" value="' + (parseInt(c.dataset.current || '0', 10) + 1) + '">';
    var inp = document.getElementById('bkJump');
    var finished = false;
    function finish(go) {
        if (finished) return;
        finished = true;
        var v = parseInt(inp.value, 10);
        el.textContent = String(parseInt(c.dataset.current || '0', 10) + 1);
        if (go && v >= 1) _bookGo(v - 1);
    }
    inp.addEventListener('keydown', function(e) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    inp.addEventListener('blur', function() { finish(false); });
    inp.focus();
    inp.select();
}

// ── The lazy block: index page + one page per AI-generated chapter ──────────
function _bookGenIndexHtml(ctx) {
    var items = '';
    for (var i = 0; i < ctx.gen; i++) {
        items += '<li onclick="_bookGo(' + (ctx.S + 1 + i) + ')"><span class="toc-num">' + (i + 1) + '</span><span class="toc-title">' +
            _bookEsc(ctx.themes[i] || ('فصل ' + (i + 1))) + '</span><span class="toc-page">' + (ctx.S + 2 + i) + '</span></li>';
    }
    return '<div class="page-header"><span class="page-section">فصول مولّدة</span><span class="page-book">' + _bookEsc(ctx.title) + '</span></div>' +
        '<h1 class="page-h1">🤖 الفصول المولّدة بالذكاء الاصطناعي</h1>' +
        '<div class="page-intro">هذه الفصول وَلّدها قارئ AI خصيصاً لنمطك القيادي — ' + ctx.gen + ' فصلاً · ' + ctx.words.toLocaleString('en-US') + ' كلمة إضافية.</div>' +
        '<div class="page-quote">"الكتاب الذي ينمو معك أعظم من كتاب يجمد في مكانه."</div>' +
        '<ul class="toc-list gen-toc">' + items + '</ul>';
}

function _bookChapterHtml(ctx, ch, i) {
    var body = (typeof _studyMd === 'function') ? _studyMd(ch.body) : _bookEsc(ch.body).replace(/\n/g, '<br>');
    return '<div class="page-header"><span class="page-section">فصل مولّد ' + (i + 1) + '</span><span class="page-book">' + _bookEsc(ctx.title) + '</span></div>' +
        '<div class="chapter-marker">🤖 مولّد · ' + _bookEsc(ch.theme || '') + '</div>' +
        '<div class="page-body">' + body + '</div>';
}

// v = 0 → the index page; v = n → generated chapter n (1-based)
function _bookShowVirtual(c, slot, v, soft) {
    var ctx = _BOOK_CTX;
    if (!ctx || !window.AUS_BOOKS) return;
    if (soft && v > 0) return;                           // a chapter already on screen does not change when more chapters arrive
    var seq = (c._navSeq = (c._navSeq || 0) + 1);       // quick page-turning: only the page asked for LAST gets painted
    function paint(html) {
        if (c._navSeq !== seq) return;
        slot.innerHTML = html;
        if (!soft) { slot.classList.remove('active'); void slot.offsetWidth; }     // restart the page-in animation
        slot.classList.add('active');
    }
    if (v === 0) { paint(_bookGenIndexHtml(ctx)); return; }
    var i = v - 1;
    function prefetch() {                                // the neighbours are read now, so turning the page finds them in memory
        if (i + 1 < ctx.gen) AUS_BOOKS.gen.range(ctx.id, Math.max(0, i - 1), 4).catch(function() {});
    }
    var hit = AUS_BOOKS.gen.peek(ctx.id, i);
    if (hit) { paint(_bookChapterHtml(ctx, hit, i)); prefetch(); return; }
    if (!soft) { slot.classList.remove('active'); }
    AUS_BOOKS.gen.get(ctx.id, i).then(function(ch) {
        paint(ch ? _bookChapterHtml(ctx, ch, i)
                 : '<div class="rd-error"><p>تعذّر قراءة هذا الفصل من مخزن الجهاز.</p></div>');
        if (ch) prefetch();
    }).catch(function() {
        paint('<div class="rd-error"><p>تعذّر قراءة هذا الفصل من مخزن الجهاز.</p></div>');
    });
}

// chapters appeared (or were cleared) while the book is open: make the pager match without reopening anything
function _bookSyncGen(meta) {
    var c = document.getElementById('bookPages');
    var ctx = _BOOK_CTX;
    if (!c || !ctx) return;
    var S = parseInt(c.dataset.static || '0', 10);
    var oldTotal = parseInt(c.dataset.total || '1', 10);
    var cur = parseInt(c.dataset.current || '0', 10);
    var atEnd = cur === oldTotal - 1;
    var n = meta.chapters || 0;
    var newV = n ? n + 1 : 0;
    ctx.gen = n; ctx.words = meta.words || 0; ctx.themes = meta.themes || [];
    var slot = document.getElementById('bookGenSlot');
    if (newV && !slot) {
        slot = document.createElement('div');
        slot.className = 'book-page gen-slot';
        slot.id = 'bookGenSlot';
        c.insertBefore(slot, c.lastElementChild);      // just before the end page
    } else if (!newV && slot) {
        slot.remove();
    }
    var total = S + newV + 1;
    c.dataset.virtual = String(newV);
    c.dataset.total = String(total);
    var next = atEnd ? total - 1 : Math.min(cur, total - 1);
    _bookGo(next, true, true);                         // soft: counters, and the index page if it is the one on screen
}

function closeReader() {
    _readerOpenSeq++;                                   // a book still loading must not open behind the closed reader
    const bd = document.getElementById('reader-backdrop');
    if (bd) bd.classList.remove('show');
    document.body.classList.remove('reader-open');
    sfxPlay('click');
}

async function downloadFileContent(fileId) {
    const file = LEADERSHIP_FILES.find(f => f.id === fileId);
    const c = window.AUS_BOOKS ? await AUS_BOOKS.getContent(fileId) : null;
    if (!file || !c) { showToast('المحتوى غير متاح للتحميل الآن', 'heart-toast'); return; }
    let text = '';
    text += '═══════════════════════════════════════════════\n';
    text += '   AUS · مكتبة القيادة الاحترافية\n';
    text += '═══════════════════════════════════════════════\n\n';
    text += file.title + '\n';
    text += PERSONALITY_EMOJI[file.archetype] + ' ' + PERSONALITY_LABEL_AR[file.archetype] + ' · ' + file.size + '\n\n';
    text += '── المقدّمة ──\n' + c.intro + '\n\n';
    c.sections.forEach((s, i) => {
        text += '── الفصل ' + (i + 1) + ': ' + s.title + ' ──\n';
        text += s.body + '\n\n';
    });
    text += '── مثال واقعي: ' + c.example.company + ' ──\n';
    text += c.example.summary + '\n\n';
    text += '── قائمة تنفيذية ──\n';
    c.checklist.forEach(item => { text += '  ☐ ' + item + '\n'; });
    text += '\n── الخلاصة ──\n' + c.conclusion + '\n\n';
    text += '═══════════════════════════════════════════════\n';
    text += 'AUS · CERTIFIED LEADERSHIP CONTENT\n';
    text += '© ' + new Date().getFullYear() + ' AI University Simulator\n';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.id + '_' + (file.title.replace(/[^؀-ۿ\w]+/g, '-')) + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    sfxPlay('confirm');
    showToast('📥 تم بدء التنزيل', 'xp-toast');
}

// Backwards-compat alias
function downloadMockFile(fileId) { downloadFileContent(fileId); }

// ── Tell the STUDENT once their own file/book claim is approved/rejected ───
// The admin usually decides long after the student has closed the tab (often
// on a different device), so this can't be a live event at decision time.
// Instead: every time this student's browser has the app open — on load or
// after login — it checks their own not-yet-seen decided claims and shows
// each one once. Mirrors the identical, already-tested pattern used for
// certification payments in aus_37_cert_ui.js.
function _checkMyFilePaymentDecisions() {
    if (!(window.ausAuth && window.ausAuth.user)) return;
    var decisions = getMyUnseenFileDecisions();
    decisions.forEach(function (p) {
        if (p.status === 'approved') {
            sfxPlay('level');
            showToast('✅ تمت الموافقة على دفعتك لـ ' + (p.fileTitle || '') + '! يمكنك فتحه الآن في مكتبتك.', 'xp-toast');
            if (window.Notification && Notification.permission === 'granted') {
                try { new Notification('✅ تمت الموافقة على دفعتك', { body: (p.fileTitle || '') + ' — يمكنك فتحه الآن.', tag: 'aus-file-payment-decision-' + p.id }); } catch (e) {}
            }
        } else if (p.status === 'rejected') {
            showToast('❌ تم رفض طلب الدفع لـ ' + (p.fileTitle || '') + ' — تواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.', 'heart-toast');
        }
        markFilePayDecisionSeen(p.id);
    });
}
// Same-device live version: if the student's own tab happens to be open at
// the moment an admin (on the SAME device/browser) decides their claim. Does
// not reach a different physical device — that needs a real backend with
// push infrastructure, which isn't running in this environment.
var _fileDecisionNotifyArmed = false;
function _armMyFileDecisionAlerts() {
    if (_fileDecisionNotifyArmed || !(window.ausAuth && window.ausAuth.user)) return;
    _fileDecisionNotifyArmed = true;
    if (window.Notification && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) {}
    }
    window.addEventListener('storage', function (e) {
        if (e.key !== FILE_PAY_PENDING_KEY) return;
        _checkMyFilePaymentDecisions();
    });
    _checkMyFilePaymentDecisions(); // catch anything decided while this student was away
}
window.addEventListener('aus-auth-changed', _armMyFileDecisionAlerts);
_armMyFileDecisionAlerts();


