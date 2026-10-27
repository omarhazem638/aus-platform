// =============================================================================
// aus_26_invest_ready.js  —  INVESTMENT READINESS ENGINE  (Module 8)
// 7-dimension AI scoring: Team · Market · Innovation · Scalability ·
// Business Model · Financials · Traction — with detailed action plans
// =============================================================================
(function () {
'use strict';

var _ir = { state: 'form', results: null, inputs: {}, company: { name:'', desc:'', sector:'' }, styleInjected: false };
var _STORE = 'aus.ir.last';
var _COMPANY_STORE = 'aus.ir.company';

var _dims = [
    { key:'team',          label:'الفريق',            icon:'👥', weight:20, desc:'خبرة الفريق، التنوع، المهارات التكميلية' },
    { key:'market',        label:'السوق',             icon:'📊', weight:20, desc:'حجم TAM/SAM/SOM، معدل النمو، التوقيت' },
    { key:'innovation',    label:'الابتكار',           icon:'💡', weight:15, desc:'التفرد، الحماية، الميزة التنافسية' },
    { key:'scalability',   label:'قابلية التوسع',     icon:'📈', weight:15, desc:'البنية التقنية، عمليات القياس' },
    { key:'businessModel', label:'نموذج العمل',        icon:'🏗️', weight:15, desc:'وضوح الإيرادات، هوامش الربح، الاستدامة' },
    { key:'financials',    label:'الأداء المالي',     icon:'💰', weight:10, desc:'المبيعات الحالية، كفاءة الإنفاق، التوقعات' },
    { key:'traction',      label:'قوة الزخم',         icon:'🚀', weight:5,  desc:'المستخدمون، MRR، نمو شهري موثق' },
];

var _questions = {
    team: [
        { id:'tq1', label:'هل الفريق المؤسس متكامل التخصصات (تقني + تجاري + تسويقي)؟',      opts:['نعم، بالكامل','جزئياً','لا، نعمل على ذلك'] },
        { id:'tq2', label:'هل لأحد المؤسسين تجربة سابقة في بناء شركات ناشئة؟',              opts:['نعم، أكثر من مرة','نعم، مرة واحدة','لا'] },
        { id:'tq3', label:'هل الفريق يعمل بدوام كامل على المشروع؟',                         opts:['جميع الأعضاء','أغلبهم','بعضهم فقط'] },
    ],
    market: [
        { id:'mq1', label:'ما حجم السوق المستهدف (TAM)؟',                                   opts:['أكثر من $1B','$100M–$1B','أقل من $100M'] },
        { id:'mq2', label:'هل السوق في مرحلة نمو؟',                                         opts:['ينمو بسرعة (>20%/year)','نمو معتدل','ثابت أو متراجع'] },
        { id:'mq3', label:'هل عرّفت شريحة مستهدفة محددة بوضوح؟',                            opts:['نعم، محددة جداً','تقريباً','لا تزال واسعة'] },
    ],
    innovation: [
        { id:'iq1', label:'ما مستوى صعوبة تقليد حلك من المنافسين؟',                         opts:['صعب جداً (براءة/ملكية)','متوسط','سهل'] },
        { id:'iq2', label:'هل لديك ميزة تقنية واضحة؟',                                      opts:['نعم، متقدمة','نعم، بسيطة','لا'] },
        { id:'iq3', label:'هل المشكلة التي تحلها لم يحلها أحد بشكل كافٍ؟',                 opts:['نعم بالكامل','جزئياً','المنافسة عالية'] },
    ],
    scalability: [
        { id:'sq1', label:'هل البنية التقنية قابلة للتوسع بدون إعادة بناء؟',               opts:['نعم، مُصممة للتوسع','يحتاج تحسينات','لا'] },
        { id:'sq2', label:'هل تكلفة خدمة عميل إضافي منخفضة (unit economics)؟',            opts:['منخفضة جداً','معقولة','مرتفعة'] },
        { id:'sq3', label:'هل تستطيع الوصول لأسواق دولية بتعديلات بسيطة؟',                opts:['نعم','بتعديلات متوسطة','يحتاج إعادة بناء'] },
    ],
    businessModel: [
        { id:'bq1', label:'هل نموذج الإيرادات واضح ومُختبر؟',                               opts:['واضح ومُثبت','واضح غير مُختبر','قيد التطوير'] },
        { id:'bq2', label:'ما طبيعة إيراداتك؟',                                             opts:['متكررة (SaaS/Sub)','شبه متكررة','لمرة واحدة'] },
        { id:'bq3', label:'هل تكاليف الاستحواذ على العميل (CAC) معقولة مقارنة بـ LTV؟',    opts:['LTV/CAC > 3','LTV/CAC = 1–3','ما زلنا نقيس'] },
    ],
    financials: [
        { id:'fq1', label:'هل لديك إيرادات حقيقية حتى الآن؟',                              opts:['نعم، منتظمة','نعم، متقطعة','لا بعد'] },
        { id:'fq2', label:'كم شهراً من الـ Runway المالي المتبقي؟',                         opts:['+18 شهراً','6–18 شهراً','أقل من 6 شهور'] },
        { id:'fq3', label:'هل لديك توقعات مالية مدروسة لـ 3 سنوات؟',                       opts:['نعم، مبنية على بيانات','نعم، تقديرية','لا بعد'] },
    ],
    traction: [
        { id:'trq1',label:'كم عدد المستخدمين/العملاء النشطين حالياً؟',                      opts:['1,000+','100–1,000','1–100'] },
        { id:'trq2',label:'هل لديك نمو شهري موثق؟',                                         opts:['+20% شهرياً','5–20% شهرياً','أقل أو ثابت'] },
        { id:'trq3',label:'هل حصلت على تزكيات من عملاء راضين؟',                            opts:['نعم، موثقة','نعم، غير رسمية','لا بعد'] },
    ],
};

var _qScore = {0: 100, 1: 60, 2: 25};

function _css() {
    if (_ir.styleInjected) return;
    _ir.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#ir-wrap{padding:20px 16px 100px;max-width:860px;margin:0 auto}',
        '.ir-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#7c3aed;letter-spacing:.1em;text-align:center;margin-bottom:4px}',
        '.ir-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.ir-card{background:rgba(255,255,255,.04);border:1px solid rgba(124,58,237,.2);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.ir-card-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#a78bfa;margin-bottom:14px;font-weight:700}',
        /* Dim sections */
        '.ir-dim-header{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer}',
        '.ir-dim-icon{font-size:1.2rem}',
        '.ir-dim-label{flex:1;font-size:.9rem;font-weight:600}',
        '.ir-dim-weight{font-size:.65rem;color:rgba(255,255,255,.35);background:rgba(255,255,255,.06);padding:2px 6px;border-radius:6px}',
        '.ir-question{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}',
        '.ir-question:last-child{border-bottom:none}',
        '.ir-q-text{font-size:.8rem;color:rgba(255,255,255,.75);margin-bottom:8px;line-height:1.6}',
        '.ir-opts{display:flex;flex-direction:column;gap:5px}',
        '.ir-opt{display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.07);font-size:.78rem;color:rgba(255,255,255,.55);transition:all .2s}',
        '.ir-opt:hover{border-color:rgba(124,58,237,.4);background:rgba(124,58,237,.05)}',
        '.ir-opt.selected{background:rgba(124,58,237,.12);border-color:rgba(124,58,237,.5);color:#a78bfa}',
        '.ir-opt input{margin:0}',
        /* Results */
        '.ir-score-big{font-family:Orbitron,sans-serif;font-size:3.5rem;font-weight:900;text-align:center;margin:12px 0}',
        '.ir-grade{font-size:1.5rem;text-align:center;font-weight:700;margin-bottom:6px}',
        '.ir-dim-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}',
        '.ir-dim-bar-lbl{width:110px;font-size:.72rem;color:rgba(255,255,255,.55);text-align:right}',
        '.ir-dim-bar-track{flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}',
        '.ir-dim-bar-fill{height:100%;border-radius:3px;transition:width 1s ease}',
        '.ir-dim-score-lbl{width:35px;font-size:.72rem;text-align:right;font-weight:700}',
        '.ir-action-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}',
        '.ir-action-item:last-child{border-bottom:none}',
        '.ir-action-num{width:22px;height:22px;border-radius:50%;background:rgba(124,58,237,.25);border:1px solid rgba(124,58,237,.5);display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;color:#a78bfa;flex-shrink:0;margin-top:1px}',
        '.ir-action-text{font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.6}',
        /* Btn */
        '.ir-btn{padding:9px 20px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.82rem;font-weight:600;transition:all .2s}',
        '.ir-btn-purple{background:rgba(124,58,237,.15);border-color:rgba(124,58,237,.45);color:#a78bfa}',
        '.ir-btn-purple:hover{background:rgba(124,58,237,.28)}',
        '.ir-btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.4)}',
        '.ir-btn-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}',
        '.ir-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;padding:9px 12px;font-size:.85rem;outline:none;font-family:inherit;box-sizing:border-box}',
        '.ir-input:focus{border-color:rgba(124,58,237,.4)}',
    ].join('');
    document.head.appendChild(s);
}

function irOpen() {
    _css();
    var sec = document.getElementById('invest-ready');
    if (!sec) return;
    if (_ir.state === 'results' && _ir.results) { _renderResults(sec); return; }
    _renderForm(sec);
}

function _renderForm(sec) {
    var html = '<div id="ir-wrap"><div class="ir-title">💎 Investment Readiness Engine</div>' +
        '<div class="ir-sub">قيّم جاهزيتك للاستثمار في 7 أبعاد أساسية</div>' +
        '<div class="ir-card">' +
        '<div class="ir-card-title">📋 نبذة عن مشروعك (لتحليل واقعي ومخصص)</div>' +
        '<div style="margin-bottom:10px"><input class="ir-input" id="ir-co-name" placeholder="اسم الشركة/المشروع" value="' + _AUS_UTILS.sanitize(_ir.company.name) + '"></div>' +
        '<div style="margin-bottom:10px"><input class="ir-input" id="ir-co-sector" placeholder="القطاع (مثال: FinTech, EdTech, HealthTech)" value="' + _AUS_UTILS.sanitize(_ir.company.sector) + '"></div>' +
        '<div><textarea class="ir-input" id="ir-co-desc" rows="2" placeholder="وصف مختصر: ما المشكلة التي تحلها ولمن؟" style="resize:vertical">' + _AUS_UTILS.sanitize(_ir.company.desc) + '</textarea></div>' +
        '</div>';

    _dims.forEach(function(dim) {
        html += '<div class="ir-card">' +
            '<div class="ir-dim-header"><div class="ir-dim-icon">' + dim.icon + '</div>' +
            '<div><div class="ir-dim-label">' + dim.label + '</div>' +
            '<div style="font-size:.65rem;color:rgba(255,255,255,.3)">' + dim.desc + '</div></div>' +
            '<div class="ir-dim-weight">' + dim.weight + '%</div></div>';

        (_questions[dim.key] || []).forEach(function(q) {
            html += '<div class="ir-question"><div class="ir-q-text">' + q.label + '</div><div class="ir-opts">';
            q.opts.forEach(function(opt, oi) {
                var stored = (_ir.inputs[q.id] !== undefined) ? _ir.inputs[q.id] : -1;
                html += '<label class="ir-opt' + (stored===oi?' selected':'') + '">' +
                    '<input type="radio" name="' + q.id + '" value="' + oi + '" onchange="_irSelect(\'' + q.id + '\',' + oi + ')" style="display:none">' +
                    opt + '</label>';
            });
            html += '</div></div>';
        });
        html += '</div>';
    });

    html += '<div class="ir-btn-row">' +
        '<button class="ir-btn ir-btn-purple" onclick="_irScore()">احسب نقاط الاستعداد ✦</button>' +
        '</div></div>';

    sec.innerHTML = html;
}

window._irSelect = function(qid, val) {
    _ir.inputs[qid] = val;
    var opts = document.querySelectorAll('[name="' + qid + '"]');
    opts.forEach(function(o) {
        o.closest('.ir-opt').classList.toggle('selected', parseInt(o.value) === val);
    });
};

window._irScore = function() {
    _ir.company = {
        name: (document.getElementById('ir-co-name')||{}).value || '',
        sector: (document.getElementById('ir-co-sector')||{}).value || '',
        desc: (document.getElementById('ir-co-desc')||{}).value || ''
    };
    try { localStorage.setItem(_COMPANY_STORE, JSON.stringify(_ir.company)); } catch(e){}

    var scores = {};
    _dims.forEach(function(dim) {
        var qs = _questions[dim.key] || [];
        var total = 0;
        var answered = 0;
        qs.forEach(function(q) {
            if (_ir.inputs[q.id] !== undefined) {
                total += _qScore[_ir.inputs[q.id]] || 0;
                answered++;
            }
        });
        scores[dim.key] = answered > 0 ? Math.round(total / qs.length) : 50;
    });

    var overall = Math.round(_dims.reduce(function(acc, dim) {
        return acc + scores[dim.key] * dim.weight / 100;
    }, 0));

    _ir.results = { scores: scores, overall: overall };
    _ir.state = 'results';
    try { localStorage.setItem(_STORE, JSON.stringify(_ir.results)); } catch(e){}
    window._AUS_BUS.emit('IR_SCORE_UPDATED', { score: overall });
    window._AUS_BUS.emit('XP_AWARDED', { amount: 20 });
    var sec = document.getElementById('invest-ready');
    if (sec) _renderResults(sec);
};

function _renderResults(sec) {
    var r = _ir.results;
    var overall = r.overall;
    var grade = overall >= 80 ? 'A - جاهز للتمويل' : overall >= 65 ? 'B - قريب جداً' : overall >= 50 ? 'C - تحتاج تطوير' : 'D - مرحلة مبكرة';
    var gradeColor = overall >= 80 ? '#00f5a0' : overall >= 65 ? '#ffc800' : overall >= 50 ? '#ff9c4a' : '#ff6b6b';

    var barsHtml = _dims.map(function(dim) {
        var score = r.scores[dim.key] || 0;
        var fillColor = score >= 80 ? '#00f5a0' : score >= 55 ? '#ffc800' : '#ff9c4a';
        return '<div class="ir-dim-bar-row">' +
            '<div class="ir-dim-bar-lbl">' + dim.icon + ' ' + dim.label + '</div>' +
            '<div class="ir-dim-bar-track"><div class="ir-dim-bar-fill" style="width:' + score + '%;background:' + fillColor + '"></div></div>' +
            '<div class="ir-dim-score-lbl" style="color:' + fillColor + '">' + score + '</div></div>';
    }).join('');

    var weakDims = _dims.filter(function(d){ return (r.scores[d.key]||0) < 65; })
        .sort(function(a,b){ return (r.scores[a.key]||0) - (r.scores[b.key]||0); })
        .slice(0, 4);

    var actions = weakDims.map(function(d, i) {
        var suggestions = {
            team:          'أضف عضواً متخصصاً في الجانب التقني أو التجاري لتكملة الفريق',
            market:        'أجرِ تحليل TAM/SAM/SOM مدعوماً بمصادر موثوقة (Statista, IBISWorld)',
            innovation:    'استشر محامي ملكية فكرية حول براءات الاختراع وحماية الحل',
            scalability:   'راجع البنية التقنية مع مهندس معماري متخصص في الـ Cloud',
            businessModel: 'اختبر نموذجين للإيرادات مع 10 عملاء وقرر بناءً على البيانات',
            financials:    'ابنِ نموذجاً مالياً شاملاً (P&L, Cash Flow) بمساعدة CFO أو مستشار',
            traction:      'أطلق حملة مكثفة لاكتساب أول 100 مستخدم وثّق معدل النمو أسبوعياً',
        };
        return '<div class="ir-action-item"><div class="ir-action-num">' + (i+1) + '</div>' +
            '<div class="ir-action-text"><strong style="color:#a78bfa">' + d.icon + ' ' + d.label + ':</strong> ' +
            (suggestions[d.key] || 'راجع هذا البُعد وضع خطة تحسين واضحة.') + '</div></div>';
    }).join('');

    var html = '<div id="ir-wrap"><div class="ir-title">💎 نتيجة الاستعداد الاستثماري</div>' +
        '<div class="ir-card">' +
        '<div class="ir-score-big" style="color:' + gradeColor + '">' + overall + '</div>' +
        '<div class="ir-grade" style="color:' + gradeColor + '">' + grade + '</div>' +
        '<div style="font-size:.72rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:18px">من أصل 100 نقطة عبر 7 محاور</div>' +
        barsHtml + '</div>';

    if (actions) {
        html += '<div class="ir-card"><div class="ir-card-title">🎯 أولويات التحسين</div>' + actions + '</div>';
    }

    html += '<div class="ir-card" id="ir-ai-section"><div class="ir-card-title">🤖 تقييم الذكاء الاصطناعي</div>' +
        '<button class="ir-btn ir-btn-purple" onclick="_irAIAnalysis()">احصل على تحليل مفصّل</button></div>';

    html += '<div class="ir-btn-row">' +
        '<button class="ir-btn ir-btn-ghost" onclick="_ir.state=\'form\';irOpen()">← إعادة التقييم</button>' +
        '</div></div>';

    sec.innerHTML = html;
}

// Full question-by-question transcript (not just the aggregate percentage per
// dimension) — this is what lets any analysis, AI or fallback, reference what
// the founder actually answered instead of reasoning from bare numbers.
function _buildQATranscript(r) {
    return _dims.map(function(d) {
        var lines = (_questions[d.key] || []).map(function(q) {
            var idx = _ir.inputs[q.id];
            var answer = (idx !== undefined) ? q.opts[idx] : '(لم تتم الإجابة)';
            return '  - ' + q.label + ' → ' + answer;
        }).join('\n');
        return d.icon + ' ' + d.label + ' (' + (r.scores[d.key]||0) + '/100):\n' + lines;
    }).join('\n\n');
}

function _fundingStageAdvice(r) {
    var traction = r.scores.traction || 0, financials = r.scores.financials || 0;
    var team = r.scores.team || 0, market = r.scores.market || 0;
    if (r.overall >= 75 && traction >= 60 && financials >= 60) {
        return { stage:'Seed أو Series A مبكرة', reason:'الزخم والأداء المالي الموثّق يكفيان لإقناع صناديق استثمار مؤسسية، وليس فقط مستثمرين أفراد.' };
    }
    if (r.overall >= 60 && team >= 60 && market >= 60) {
        return { stage:'Pre-Seed مع مستثمرين ملائكيين (Angels)', reason:'الفريق وفهم السوق قويان، لكن الزخم والأرقام المالية بحاجة لمزيد من الإثبات قبل صناديق Seed المؤسسية.' };
    }
    return { stage:'التمويل الذاتي (Bootstrapping) أو الانضمام لحاضنة أعمال أولاً', reason:'عدة أبعاد أساسية ما زالت مبكرة جداً لجذب مستثمرين خارجيين بثقة — الوقت الحالي أنسب لبناء إثباتات ملموسة أولاً.' };
}

// Genuine data-driven fallback — used when the AI backend is unreachable.
// It reasons over the SAME real answers the founder gave (weakest/strongest
// specific questions per dimension), not a fixed canned paragraph, so two
// different assessments produce two genuinely different analyses.
function _buildFallbackAnalysis(r) {
    var sorted = _dims.slice().sort(function(a,b){ return (r.scores[b.key]||0) - (r.scores[a.key]||0); });
    // A real analyst wouldn't call a 25/100 dimension a "strength" just because
    // it's the least-bad one when everything is weak — require an actual
    // minimum score before something qualifies as a strength, and likewise
    // only flag genuinely weak dimensions as red flags (not just "bottom 2").
    var strongDims = sorted.filter(function(d){ return (r.scores[d.key]||0) >= 65; }).slice(0, 2);
    var weakDims = sorted.filter(function(d){ return (r.scores[d.key]||0) < 55; }).slice(-2).reverse();

    function bestAnswer(dimKey) {
        var best = null;
        (_questions[dimKey]||[]).forEach(function(q) {
            var idx = _ir.inputs[q.id];
            if (idx === undefined) return;
            if (!best || _qScore[idx] > _qScore[best.idx]) best = { q:q, idx:idx };
        });
        return best;
    }
    function worstAnswer(dimKey) {
        var worst = null;
        (_questions[dimKey]||[]).forEach(function(q) {
            var idx = _ir.inputs[q.id];
            if (idx === undefined) return;
            if (!worst || _qScore[idx] < _qScore[worst.idx]) worst = { q:q, idx:idx };
        });
        return worst;
    }

    var strengths = strongDims.map(function(d) {
        var a = bestAnswer(d.key);
        return '<li><b>' + d.icon + ' ' + d.label + '</b> (' + r.scores[d.key] + '/100)' +
            (a ? ' — إجابتك على "' + a.q.label + '" كانت "' + a.q.opts[a.idx] + '"، وهذه نقطة قوة حقيقية يبني عليها أي مستثمر ثقته.' : '') + '</li>';
    }).join('');

    var flags = weakDims.map(function(d) {
        var a = worstAnswer(d.key);
        return '<li><b>' + d.icon + ' ' + d.label + '</b> (' + r.scores[d.key] + '/100)' +
            (a ? ' — إجابتك على "' + a.q.label + '" كانت "' + a.q.opts[a.idx] + '"، وهذا بالضبط ما سيسأل عنه أي مستثمر جاد بإلحاح قبل التوقيع.' : '') + '</li>';
    }).join('');

    var fs = _fundingStageAdvice(r);
    var co = _ir.company || {};
    var coLine = co.name ? ('بالنسبة لـ<b>' + _AUS_UTILS.sanitize(co.name) + '</b>' + (co.sector ? (' في قطاع ' + _AUS_UTILS.sanitize(co.sector)) : '') + '، ') : '';

    return '<div style="font-size:.6rem;letter-spacing:.08em;color:rgba(255,180,255,.5);margin-bottom:10px">⚠ وضع عدم اتصال — تحليل مبني على إجاباتك الفعلية مباشرة (بدون نموذج لغوي خارجي)</div>' +
        '<div style="margin-bottom:12px"><b style="color:#00f5a0">✅ نقاط القوة الحقيقية:</b><ul style="margin:6px 0 0;padding-inline-start:20px;line-height:1.8">' + (strengths||'<li>لا توجد نقطة قوة واضحة بعد — كل الأبعاد بحاجة لعمل إضافي قبل أن تصبح نقطة بيع حقيقية أمام مستثمر.</li>') + '</ul></div>' +
        '<div style="margin-bottom:12px"><b style="color:#ff6b6b">🚩 الإشارات التحذيرية للمستثمر:</b><ul style="margin:6px 0 0;padding-inline-start:20px;line-height:1.8">' + (flags||'<li>لا توجد إشارات تحذيرية حادة — أداء متوازن نسبياً عبر الأبعاد.</li>') + '</ul></div>' +
        '<div><b style="color:#a78bfa">🎯 التوصية:</b> ' + coLine + 'المرحلة الأنسب حالياً هي <b>' + fs.stage + '</b>. ' + fs.reason + '</div>';
}

window._irAIAnalysis = function() {
    var r = _ir.results;
    var co = _ir.company || {};
    var el = document.getElementById('ir-ai-section');
    if (el) el.innerHTML = '<div class="ir-card-title">🤖 تحليل الذكاء الاصطناعي</div>' +
        '<div style="font-size:.78rem;color:rgba(255,255,255,.4);font-style:italic">يحلل المستثمر الاصطناعي مشروعك...</div>';

    var prompt = (co.name ? ('Company: ' + co.name + (co.sector ? (' | Sector: ' + co.sector) : '') + (co.desc ? ('\nDescription: ' + co.desc) : '') + '\n\n') : '') +
        'Investment Readiness Assessment — Overall score: ' + r.overall + '/100\n\n' +
        'Full question-by-question responses from the founder (this is the real evidence — reason from THESE, not just the percentages):\n\n' +
        _buildQATranscript(r) +
        '\n\nAs a seasoned VC analyst, provide, referencing SPECIFIC answers above (quote them) rather than generic statements:\n' +
        '1) What this company genuinely does well (2 points, each citing a specific answer)\n' +
        '2) Critical red flags an investor would raise (2 points, each citing a specific answer)\n' +
        '3) A specific funding strategy recommendation (pre-seed vs seed vs Series A vs bootstrapping) with reasoning tied to the traction/financials/team answers.\n' +
        'Be direct, specific, and avoid generic startup-advice platitudes that could apply to any company.';

    _AUS_AI.ask('investReadiness', prompt,
        'You are a seasoned VC analyst with 15 years of experience evaluating MENA startups. Always ground your analysis in the specific facts given — never give generic advice that ignores the actual answers provided.',
        function(err, text) {
            var el2 = document.getElementById('ir-ai-section');
            if (!el2) return;
            if (!err && text) {
                el2.innerHTML = '<div class="ir-card-title">🤖 تحليل المستثمر الاصطناعي</div>' +
                    '<div style="font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.8;white-space:pre-line">' +
                    _AUS_UTILS.sanitize(text) + '</div>';
            } else {
                el2.innerHTML = '<div class="ir-card-title">🤖 تحليل المستثمر الاصطناعي</div>' +
                    '<div style="font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.8">' + _buildFallbackAnalysis(r) + '</div>';
            }
            window._AUS_BUS.emit('XP_AWARDED', { amount: 15 });
        });
};

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('investReadiness', { open: irOpen }, {
        name: 'Investment Readiness', icon: '💎', sectionId: 'invest-ready', defaultEnabled: true, sprint: 4
    });
}
window.irOpen = irOpen;

})();
