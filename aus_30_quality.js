// =============================================================================
// aus_30_quality.js  —  GLOBAL QUALITY STANDARDS MODULE  (Module 17)
// ISO Center · Quality Assessment · Startup Readiness · Compliance Dashboard
// ESG Assessment · SDG Alignment · Risk Engine · Improvement Tracker
// Quality Certifications · Benchmarking System
// =============================================================================
(function () {
'use strict';

var _q = { view: 'hub', data: {}, styleInjected: false };
var _STORE = 'aus.quality.data';

// ── ISO Standards catalog ────────────────────────────────────────────────────
var _isoStandards = [
    { code:'ISO 9001:2015',  title:'Quality Management Systems',         sector:'All',      score:null, icon:'⭐' },
    { code:'ISO 14001:2015', title:'Environmental Management Systems',   sector:'All',      score:null, icon:'🌱' },
    { code:'ISO 27001:2022', title:'Information Security Management',    sector:'Tech',     score:null, icon:'🔒' },
    { code:'ISO 45001:2018', title:'Occupational Health & Safety',       sector:'All',      score:null, icon:'⛑️' },
    { code:'ISO 26000:2010', title:'Social Responsibility',              sector:'All',      score:null, icon:'🤝' },
    { code:'ISO 31000:2018', title:'Risk Management',                    sector:'All',      score:null, icon:'⚠️' },
    { code:'ISO 50001:2018', title:'Energy Management Systems',          sector:'Industry', score:null, icon:'⚡' },
    { code:'ISO 13485:2016', title:'Medical Devices Quality',            sector:'Health',   score:null, icon:'🏥' },
];

// ── SDG Goals ────────────────────────────────────────────────────────────────
var _sdgs = [
    { num:1,  name:'No Poverty',          icon:'🎯', color:'#e5243b' },
    { num:2,  name:'Zero Hunger',         icon:'🌾', color:'#dda63a' },
    { num:3,  name:'Good Health',         icon:'💊', color:'#4c9f38' },
    { num:4,  name:'Quality Education',   icon:'📚', color:'#c5192d' },
    { num:5,  name:'Gender Equality',     icon:'⚧️', color:'#ff3a21' },
    { num:6,  name:'Clean Water',         icon:'💧', color:'#26bde2' },
    { num:7,  name:'Clean Energy',        icon:'☀️', color:'#fcc30b' },
    { num:8,  name:'Decent Work',         icon:'💼', color:'#a21942' },
    { num:9,  name:'Industry & Innovation',icon:'🏭',color:'#fd6925' },
    { num:10, name:'Reduced Inequalities',icon:'⚖️', color:'#dd1367' },
    { num:11, name:'Sustainable Cities',  icon:'🏙️', color:'#fd9d24' },
    { num:12, name:'Responsible Consumption',icon:'♻️',color:'#bf8b2e' },
    { num:13, name:'Climate Action',      icon:'🌍', color:'#3f7e44' },
    { num:17, name:'Partnerships',        icon:'🤝', color:'#19486a' },
];

// ── ESG Criteria ─────────────────────────────────────────────────────────────
var _esgCriteria = {
    E: [
        { id:'e1', q:'هل لديك سياسة بيئية موثقة؟' },
        { id:'e2', q:'هل تقيس انبعاثات الكربون؟' },
        { id:'e3', q:'هل تستخدم طاقة متجددة؟' },
        { id:'e4', q:'هل لديك برنامج لإدارة النفايات؟' },
    ],
    S: [
        { id:'s1', q:'هل لديك سياسة للتنوع والشمول؟' },
        { id:'s2', q:'هل توفر ساعات عمل مرنة / عمل عن بُعد؟' },
        { id:'s3', q:'هل تدعم مجتمعك المحلي بشكل منظّم؟' },
        { id:'s4', q:'هل لديك برامج لتطوير الموظفين؟' },
    ],
    G: [
        { id:'g1', q:'هل لديك مجلس إدارة مستقل؟' },
        { id:'g2', q:'هل تنشر تقارير مالية بانتظام؟' },
        { id:'g3', q:'هل لديك سياسة لمكافحة الفساد؟' },
        { id:'g4', q:'هل لديك قناة لمعالجة شكاوى أصحاب المصلحة؟' },
    ],
};

// ── Risk Categories ──────────────────────────────────────────────────────────
var _riskCategories = [
    { id:'r1', name:'المخاطر التشغيلية',  icon:'⚙️', items:['فشل العمليات','نقص الكفاءات','مشاكل التوريد'] },
    { id:'r2', name:'المخاطر المالية',    icon:'💰', items:['نفاد السيولة','تقلبات العملة','الديون المتعثرة'] },
    { id:'r3', name:'المخاطر التقنية',    icon:'💻', items:['الاختراق الأمني','فشل البنية التحتية','التعطل'] },
    { id:'r4', name:'المخاطر السوقية',    icon:'📊', items:['تحولات الطلب','دخول منافسين','تغيير الأسعار'] },
    { id:'r5', name:'المخاطر التنظيمية', icon:'⚖️', items:['تغيير القوانين','غرامات الامتثال','الترخيص'] },
    { id:'r6', name:'المخاطر السمعة',    icon:'🗣️', items:['أزمة PR','سلبية وسائل التواصل','رضا العملاء'] },
];

function _css() {
    if (_q.styleInjected) return;
    _q.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#q-wrap{padding:20px 16px 100px;max-width:960px;margin:0 auto}',
        '.q-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#10b981;letter-spacing:.1em;text-align:center;margin-bottom:4px}',
        '.q-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:20px}',
        '.q-tabs{display:flex;gap:5px;margin-bottom:18px;flex-wrap:wrap}',
        '.q-tab{padding:7px 13px;border-radius:9px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:.72rem;font-weight:600;transition:all .2s;color:rgba(255,255,255,.4)}',
        '.q-tab.active{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.4);color:#10b981}',
        '.q-card{background:rgba(255,255,255,.04);border:1px solid rgba(16,185,129,.15);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.q-card-title{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:#10b981;margin-bottom:12px;font-weight:700}',
        /* ISO grid */
        '.q-iso-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}',
        '@media(max-width:600px){.q-iso-grid{grid-template-columns:1fr}}',
        '.q-iso-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:13px;transition:all .2s}',
        '.q-iso-card:hover{border-color:rgba(16,185,129,.3)}',
        '.q-iso-code{font-family:Orbitron,sans-serif;font-size:.68rem;color:#10b981;margin-bottom:4px}',
        '.q-iso-title{font-size:.78rem;font-weight:600;margin-bottom:6px}',
        '.q-iso-sector{font-size:.6rem;color:rgba(255,255,255,.35)}',
        /* SDG grid */
        '.q-sdg-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}',
        '@media(max-width:600px){.q-sdg-grid{grid-template-columns:repeat(4,1fr)}}',
        '.q-sdg-item{border-radius:8px;padding:8px 4px;text-align:center;cursor:pointer;border:2px solid transparent;transition:all .2s}',
        '.q-sdg-item.active{border-color:#fff;transform:scale(1.05)}',
        '.q-sdg-num{font-size:.62rem;font-weight:700;margin-top:2px}',
        '.q-sdg-name{font-size:.45rem;color:rgba(255,255,255,.7);margin-top:1px;line-height:1.3}',
        /* ESG */
        '.q-esg-section{margin-bottom:14px}',
        '.q-esg-header{font-size:.82rem;font-weight:700;margin-bottom:10px;padding:6px 10px;border-radius:8px}',
        '.q-esg-e{background:rgba(0,200,100,.12);color:#00c864}',
        '.q-esg-s{background:rgba(59,130,246,.12);color:#60a5fa}',
        '.q-esg-g{background:rgba(245,158,11,.12);color:#f59e0b}',
        '.q-radio-row{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:.78rem;color:rgba(255,255,255,.7)}',
        '.q-radio-lbl{flex:1}',
        '.q-radio-opts{display:flex;gap:6px}',
        '.q-radio-opt{font-size:.65rem;padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .15s;color:rgba(255,255,255,.4)}',
        '.q-radio-opt.yes{background:rgba(0,200,100,.15);border-color:rgba(0,200,100,.4);color:#00c864}',
        '.q-radio-opt.no{background:rgba(255,100,100,.1);border-color:rgba(255,100,100,.25);color:#ff8080}',
        '.q-radio-opt.partial{background:rgba(255,200,0,.1);border-color:rgba(255,200,0,.3);color:#ffc800}',
        /* Risk matrix */
        '.q-risk-row{background:rgba(255,255,255,.03);border-radius:10px;padding:12px;margin-bottom:8px}',
        '.q-risk-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
        '.q-risk-icon{font-size:1.1rem}',
        '.q-risk-name{font-size:.85rem;font-weight:600;flex:1}',
        '.q-risk-items{display:flex;gap:6px;flex-wrap:wrap}',
        '.q-risk-item{font-size:.62rem;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.5)}',
        '.q-risk-level{display:flex;gap:4px}',
        '.q-risk-dot{width:10px;height:10px;border-radius:50%;cursor:pointer;transition:all .15s;opacity:.3;border:1px solid rgba(255,255,255,.2)}',
        '.q-risk-dot.active{opacity:1}',
        /* Score gauges */
        '.q-gauge-row{display:flex;align-items:center;gap:10px;margin-bottom:9px}',
        '.q-gauge-lbl{width:100px;font-size:.72rem;color:rgba(255,255,255,.55)}',
        '.q-gauge-track{flex:1;height:7px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden}',
        '.q-gauge-fill{height:100%;border-radius:4px;transition:width 1s ease}',
        '.q-gauge-val{width:35px;font-size:.72rem;text-align:right;font-weight:700}',
        /* Benchmark */
        '.q-benchmark-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
        '@media(max-width:600px){.q-benchmark-grid{grid-template-columns:1fr 1fr}}',
        '.q-bench-card{background:rgba(255,255,255,.03);border-radius:10px;padding:12px;text-align:center}',
        '.q-bench-val{font-family:Orbitron,sans-serif;font-size:1.2rem;font-weight:900;margin-bottom:2px}',
        '.q-bench-lbl{font-size:.6rem;color:rgba(255,255,255,.35)}',
        /* Tracker */
        '.q-tracker-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}',
        '.q-tracker-item:last-child{border-bottom:none}',
        '.q-tracker-check{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.6rem;cursor:pointer;transition:all .2s}',
        '.q-tracker-check.done{background:#10b981;border-color:#10b981;color:#000}',
        '.q-tracker-text{font-size:.8rem;color:rgba(255,255,255,.7);flex:1;line-height:1.6}',
        '.q-tracker-cat{font-size:.58rem;padding:2px 7px;border-radius:5px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:#10b981;margin-left:auto;flex-shrink:0}',
        /* Buttons */
        '.q-btn{padding:9px 18px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.8rem;font-weight:600;transition:all .2s}',
        '.q-btn-green{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.45);color:#10b981}',
        '.q-btn-green:hover{background:rgba(16,185,129,.28)}',
        '.q-btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.4)}',
        '.q-btn-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
        '.q-score-big{font-family:Orbitron,sans-serif;font-size:3rem;font-weight:900;text-align:center}',
        '.q-score-grade{font-size:1rem;text-align:center;font-weight:700;margin-bottom:4px}',
    ].join('');
    document.head.appendChild(s);
}

function qualityOpen() {
    _css();
    _loadData();
    var sec = document.getElementById('quality');
    if (!sec) return;
    sec.innerHTML = '<div id="q-wrap"><div class="q-title">🏆 Global Quality Standards</div>' +
        '<div class="q-sub">ISO · ESG · SDG · Risk · Compliance · Benchmarking</div>' +
        '<div class="q-tabs">' +
        ['hub','iso','esg','sdg','risk','tracker','benchmark'].map(function(v) {
            var labels = { hub:'🏠 Hub', iso:'📋 ISO', esg:'🌱 ESG', sdg:'🌍 SDG', risk:'⚠️ Risk', tracker:'📈 Tracker', benchmark:'🏆 Benchmark' };
            return '<div class="q-tab' + (v===_q.view?' active':'') + '" onclick="_qView(\'' + v + '\')">' + labels[v] + '</div>';
        }).join('') +
        '</div><div id="q-content"></div></div>';
    _qRender();
}

window._qView = function(v) {
    _q.view = v;
    document.querySelectorAll('.q-tab').forEach(function(t,i){
        var views = ['hub','iso','esg','sdg','risk','tracker','benchmark'];
        t.classList.toggle('active', views[i] === v);
    });
    _qRender();
};

function _qRender() {
    var el = document.getElementById('q-content');
    if (!el) return;
    var map = { hub:_hubHTML, iso:_isoHTML, esg:_esgHTML, sdg:_sdgHTML, risk:_riskHTML, tracker:_trackerHTML, benchmark:_benchmarkHTML };
    el.innerHTML = (map[_q.view] || _hubHTML)();
}

function _hubHTML() {
    var overallScore = _calcOverall();
    var grade = overallScore >= 80 ? 'A — World-Class' : overallScore >= 65 ? 'B — Advanced' : overallScore >= 50 ? 'C — Developing' : 'D — Early Stage';
    var gradeColor = overallScore >= 80 ? '#10b981' : overallScore >= 65 ? '#ffc800' : overallScore >= 50 ? '#ff9c4a' : '#ff6b6b';
    var esgScore = _calcESG();
    var riskScore = _calcRisk();
    var sdgCount = (_q.data.sdgs || []).length;

    return '<div class="q-card" style="text-align:center">' +
        '<div class="q-score-big" style="color:' + gradeColor + '">' + overallScore + '</div>' +
        '<div class="q-score-grade" style="color:' + gradeColor + '">' + grade + '</div>' +
        '<div style="font-size:.68rem;color:rgba(255,255,255,.35);margin-bottom:16px">Overall Quality Score</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
        _kpi('ESG', esgScore, '#10b981') +
        _kpi('Risk Mgmt', riskScore, '#ffc800') +
        _kpi('SDGs', sdgCount + '/14', '#3b82f6') +
        _kpi('ISO Ready', (_q.data.isoScores ? Object.keys(_q.data.isoScores).length : 0) + '/8', '#a78bfa') +
        '</div></div>' +
        '<div class="q-card"><div class="q-card-title">📊 الأبعاد الرئيسية</div>' +
        _gauge('ISO Compliance', _calcISO(), '#10b981') +
        _gauge('ESG Score', esgScore, '#00c864') +
        _gauge('Risk Management', riskScore, '#ffc800') +
        _gauge('SDG Alignment', Math.round(sdgCount / 14 * 100), '#3b82f6') +
        _gauge('Continuous Improvement', _calcTracker(), '#a78bfa') +
        '</div>';
}

function _kpi(lbl, val, color) {
    return '<div style="background:rgba(255,255,255,.04);border-radius:9px;padding:12px">' +
        '<div style="font-family:Orbitron,sans-serif;font-size:1rem;color:' + color + '">' + val + '</div>' +
        '<div style="font-size:.6rem;color:rgba(255,255,255,.3)">' + lbl + '</div></div>';
}
function _gauge(lbl, pct, color) {
    return '<div class="q-gauge-row"><div class="q-gauge-lbl">' + lbl + '</div>' +
        '<div class="q-gauge-track"><div class="q-gauge-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '<div class="q-gauge-val" style="color:' + color + '">' + pct + '%</div></div>';
}

function _isoHTML() {
    var html = '<div class="q-card"><div class="q-card-title">📋 معايير ISO — تقييم الاستعداد</div>' +
        '<div class="q-iso-grid">';
    _isoStandards.forEach(function(iso) {
        var stored = (_q.data.isoScores || {})[iso.code] || 0;
        var color = stored >= 75 ? '#10b981' : stored >= 50 ? '#ffc800' : stored > 0 ? '#ff9c4a' : 'rgba(255,255,255,.2)';
        html += '<div class="q-iso-card">' +
            '<div class="q-iso-code">' + iso.icon + ' ' + iso.code + '</div>' +
            '<div class="q-iso-title">' + iso.title + '</div>' +
            '<div class="q-iso-sector" style="margin-bottom:8px">Sector: ' + iso.sector + '</div>' +
            '<input type="range" min="0" max="100" value="' + stored + '" step="5" ' +
            'style="width:100%;accent-color:' + color + '" ' +
            'oninput="_qISOScore(\'' + iso.code + '\',this.value)">' +
            '<div style="display:flex;justify-content:space-between;font-size:.62rem;color:rgba(255,255,255,.4);margin-top:3px">' +
            '<span>0%</span><span style="color:' + color + ';font-weight:700">' + stored + '%</span><span>100%</span></div></div>';
    });
    html += '</div></div>';
    return html;
}

window._qISOScore = function(code, val) {
    if (!_q.data.isoScores) _q.data.isoScores = {};
    _q.data.isoScores[code] = parseInt(val);
    _saveData();
    window._AUS_BUS.emit('XP_AWARDED', { amount: 2 });
};

function _esgHTML() {
    var answers = _q.data.esgAnswers || {};
    var html = '<div class="q-card"><div class="q-card-title">🌱 تقييم ESG</div>';
    var cats = { E:'البيئة (Environmental)', S:'الاجتماعي (Social)', G:'الحوكمة (Governance)' };
    var headers = { E:'q-esg-e', S:'q-esg-s', G:'q-esg-g' };
    Object.keys(_esgCriteria).forEach(function(cat) {
        html += '<div class="q-esg-section"><div class="q-esg-header ' + headers[cat] + '">' + cat + ' — ' + cats[cat] + '</div>';
        _esgCriteria[cat].forEach(function(q) {
            var ans = answers[q.id] || '';
            html += '<div class="q-radio-row"><div class="q-radio-lbl">' + q.q + '</div>' +
                '<div class="q-radio-opts">' +
                '<div class="q-radio-opt' + (ans==='yes'?' yes':'') + '" onclick="_qESG(\'' + q.id + '\',\'yes\')">✓ نعم</div>' +
                '<div class="q-radio-opt' + (ans==='partial'?' partial':'') + '" onclick="_qESG(\'' + q.id + '\',\'partial\')">~ جزئياً</div>' +
                '<div class="q-radio-opt' + (ans==='no'?' no':'') + '" onclick="_qESG(\'' + q.id + '\',\'no\')">✗ لا</div>' +
                '</div></div>';
        });
        html += '</div>';
    });
    var score = _calcESG();
    html += '<div style="margin-top:12px;padding:12px;background:rgba(16,185,129,.06);border-radius:10px;text-align:center">' +
        '<div style="font-family:Orbitron,sans-serif;font-size:1.5rem;color:#10b981">' + score + '/100</div>' +
        '<div style="font-size:.68rem;color:rgba(255,255,255,.4)">ESG Score</div></div>' +
        '</div>';
    return html;
}

window._qESG = function(qid, ans) {
    if (!_q.data.esgAnswers) _q.data.esgAnswers = {};
    _q.data.esgAnswers[qid] = ans;
    _saveData();
    _qRender();
};

function _sdgHTML() {
    var selected = _q.data.sdgs || [];
    var html = '<div class="q-card"><div class="q-card-title">🌍 أهداف التنمية المستدامة SDGs</div>' +
        '<div style="font-size:.75rem;color:rgba(255,255,255,.45);margin-bottom:14px">اختر الأهداف التي يتوافق معها مشروعك:</div>' +
        '<div class="q-sdg-grid">';
    _sdgs.forEach(function(sdg) {
        var active = selected.indexOf(sdg.num) >= 0;
        html += '<div class="q-sdg-item' + (active?' active':'') + '" style="background:' + sdg.color + (active?'':'44') + ';opacity:' + (active?'1':'.55') + '" onclick="_qSDG(' + sdg.num + ')">' +
            '<div style="font-size:1.1rem">' + sdg.icon + '</div>' +
            '<div class="q-sdg-num">' + sdg.num + '</div>' +
            '<div class="q-sdg-name">' + sdg.name + '</div></div>';
    });
    html += '</div>' +
        '<div style="margin-top:12px;font-size:.75rem;color:rgba(16,185,129,.8)">' + selected.length + ' / ' + _sdgs.length + ' أهداف مُختارة</div></div>';
    return html;
}

window._qSDG = function(num) {
    if (!_q.data.sdgs) _q.data.sdgs = [];
    var idx = _q.data.sdgs.indexOf(num);
    if (idx >= 0) _q.data.sdgs.splice(idx, 1);
    else _q.data.sdgs.push(num);
    _saveData();
    window._AUS_BUS.emit('XP_AWARDED', { amount: 3 });
    _qRender();
};

function _riskHTML() {
    var riskLevels = _q.data.riskLevels || {};
    var html = '<div class="q-card"><div class="q-card-title">⚠️ مصفوفة تقييم المخاطر</div>';
    _riskCategories.forEach(function(cat) {
        var level = riskLevels[cat.id] || 0;
        var dots = [1,2,3,4,5].map(function(d) {
            var color = d <= 2 ? '#10b981' : d <= 3 ? '#ffc800' : '#ff6b6b';
            return '<div class="q-risk-dot' + (level >= d?' active':'') + '" style="background:' + (level >= d ? color : 'transparent') + ';border-color:' + color + '" onclick="_qRisk(\'' + cat.id + '\',' + d + ')"></div>';
        }).join('');
        html += '<div class="q-risk-row">' +
            '<div class="q-risk-header"><div class="q-risk-icon">' + cat.icon + '</div>' +
            '<div class="q-risk-name">' + cat.name + '</div>' +
            '<div class="q-risk-level">' + dots + '</div>' +
            '<div style="font-size:.62rem;color:rgba(255,255,255,.3);margin-left:6px">' + ['','منخفض','منخفض','متوسط','عالٍ','حرج'][level] + '</div></div>' +
            '<div class="q-risk-items">' + cat.items.map(function(i){ return '<span class="q-risk-item">' + i + '</span>'; }).join('') + '</div>' +
            '</div>';
    });
    html += '<div class="q-btn-row"><button class="q-btn q-btn-green" onclick="_qRiskAI()">🤖 تحليل المخاطر بالذكاء الاصطناعي</button></div>' +
        '<div id="q-risk-ai"></div></div>';
    return html;
}

window._qRisk = function(id, level) {
    if (!_q.data.riskLevels) _q.data.riskLevels = {};
    _q.data.riskLevels[id] = level;
    _saveData();
    _qRender();
};

window._qRiskAI = function() {
    var el = document.getElementById('q-risk-ai');
    if (el) el.innerHTML = '<div style="font-size:.78rem;color:rgba(255,255,255,.4);margin-top:10px;font-style:italic">يحلل مستشار المخاطر...</div>';
    var levels = _q.data.riskLevels || {};
    var summary = _riskCategories.map(function(c){ return c.name + ': ' + (levels[c.id]||0) + '/5'; }).join(', ');
    _AUS_AI.ask('quality',
        'Risk assessment for a startup: ' + summary + '\nProvide: 1) Top 3 risks needing immediate attention 2) Mitigation strategies for each 3) Overall risk posture (Low/Medium/High/Critical)',
        'You are an enterprise risk management consultant.',
        function(err, text) {
            var el2 = document.getElementById('q-risk-ai');
            if (el2) el2.innerHTML = '<div style="background:rgba(255,200,0,.06);border-left:3px solid rgba(255,200,0,.4);border-radius:0 8px 8px 0;padding:12px 14px;font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.8;margin-top:10px">' + _AUS_UTILS.sanitize(text||'') + '</div>';
            window._AUS_BUS.emit('XP_AWARDED', { amount: 15 });
        });
};

function _trackerHTML() {
    var improvements = [
        { id:'t1', text:'توثيق جميع العمليات الأساسية في دليل تشغيلي', cat:'ISO' },
        { id:'t2', text:'إجراء مراجعة داخلية للجودة كل ربع سنة', cat:'ISO' },
        { id:'t3', text:'قياس وتحليل انبعاثات الكربون لعام كامل', cat:'ESG' },
        { id:'t4', text:'إنشاء تقرير استدامة سنوي وفق GRI Standards', cat:'ESG' },
        { id:'t5', text:'وضع سياسة تنوع وشمول موقّعة من الإدارة', cat:'ESG' },
        { id:'t6', text:'بناء خريطة المخاطر وتحديثها كل 6 أشهر', cat:'Risk' },
        { id:'t7', text:'الحصول على شهادة ISO 9001:2015', cat:'ISO' },
        { id:'t8', text:'وضع نظام شكاوى ومقترحات مع SLA واضح', cat:'Quality' },
        { id:'t9', text:'تدريب الفريق على إدارة الجودة الشاملة TQM', cat:'Quality' },
        { id:'t10',text:'ربط مؤشرات الأداء KPIs بأهداف SDG المختارة', cat:'SDG' },
    ];
    var done = _q.data.trackerDone || [];
    var html = '<div class="q-card"><div class="q-card-title">📈 متتبع التحسين المستمر</div>';
    improvements.forEach(function(item) {
        var isDone = done.indexOf(item.id) >= 0;
        html += '<div class="q-tracker-item">' +
            '<div class="q-tracker-check ' + (isDone?'done':'') + '" onclick="_qTrack(\'' + item.id + '\')">' + (isDone?'✓':'') + '</div>' +
            '<div class="q-tracker-text' + (isDone?'" style="text-decoration:line-through;opacity:.4':'') + '">' + item.text + '</div>' +
            '<div class="q-tracker-cat">' + item.cat + '</div></div>';
    });
    var pct = Math.round(done.length / improvements.length * 100);
    html += '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:6px"><span>التقدم</span><span>' + done.length + '/' + improvements.length + '</span></div>' +
        '<div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:#10b981;border-radius:3px;transition:width .8s ease"></div></div></div>' +
        '</div>';
    return html;
}

window._qTrack = function(id) {
    if (!_q.data.trackerDone) _q.data.trackerDone = [];
    var idx = _q.data.trackerDone.indexOf(id);
    if (idx >= 0) _q.data.trackerDone.splice(idx, 1);
    else { _q.data.trackerDone.push(id); window._AUS_BUS.emit('XP_AWARDED', { amount: 10 }); }
    _saveData();
    _qRender();
};

function _benchmarkHTML() {
    var benchmarks = [
        { label:'ISO Adoption', yours:_calcISO(), industry:72, top:95, color:'#10b981' },
        { label:'ESG Score',    yours:_calcESG(), industry:58, top:88, color:'#00c864' },
        { label:'Risk Mgmt',    yours:_calcRisk(), industry:65, top:90, color:'#ffc800' },
        { label:'SDG Align',    yours:Math.round((_q.data.sdgs||[]).length/14*100), industry:45, top:80, color:'#3b82f6' },
        { label:'Quality Improvement',yours:_calcTracker(), industry:50, top:85, color:'#a78bfa' },
    ];
    var html = '<div class="q-card"><div class="q-card-title">🏆 Benchmarking — مقارنة بالمعيار الصناعي</div>';
    benchmarks.forEach(function(b) {
        html += '<div class="q-gauge-row">' +
            '<div class="q-gauge-lbl">' + b.label + '</div>' +
            '<div class="q-gauge-track" style="position:relative">' +
            '<div class="q-gauge-fill" style="width:' + b.yours + '%;background:' + b.color + '"></div>' +
            '<div style="position:absolute;top:50%;transform:translateY(-50%);left:' + b.industry + '%;width:2px;height:12px;background:rgba(255,200,0,.6);margin-top:-3px"></div>' +
            '<div style="position:absolute;top:50%;transform:translateY(-50%);left:' + b.top + '%;width:2px;height:12px;background:rgba(0,245,160,.6);margin-top:-3px"></div>' +
            '</div>' +
            '<div class="q-gauge-val" style="color:' + b.color + '">' + b.yours + '%</div></div>';
    });
    html += '<div style="display:flex;gap:14px;margin-top:10px;font-size:.65rem;color:rgba(255,255,255,.4)">' +
        '<span><span style="display:inline-block;width:8px;height:8px;background:rgba(255,200,0,.6);border-radius:1px;margin-left:4px"></span>Industry Avg</span>' +
        '<span><span style="display:inline-block;width:8px;height:8px;background:rgba(0,245,160,.6);border-radius:1px;margin-left:4px"></span>Top 10%</span>' +
        '</div></div>' +
        '<div class="q-benchmark-grid">' +
        _benchKPI('🌍 MENA Rank', '#' + Math.max(1, 100 - _calcOverall()), '#10b981') +
        _benchKPI('📊 Percentile', Math.min(99, _calcOverall()) + 'th', '#ffc800') +
        _benchKPI('⭐ Quality Tier', _calcOverall()>=80?'Gold':_calcOverall()>=65?'Silver':'Bronze', '#a78bfa') +
        '</div>';
    return html;
}

function _benchKPI(label, val, color) {
    return '<div class="q-bench-card"><div class="q-bench-val" style="color:' + color + '">' + val + '</div>' +
        '<div class="q-bench-lbl">' + label + '</div></div>';
}

// ── Score calculators ─────────────────────────────────────────────────────────
function _calcISO() {
    var scores = _q.data.isoScores || {};
    var vals = Object.values(scores);
    return vals.length ? Math.round(vals.reduce(function(a,b){return a+b;}, 0) / _isoStandards.length) : 0;
}
function _calcESG() {
    var ans = _q.data.esgAnswers || {};
    var total = 0, count = 0;
    Object.values(ans).forEach(function(v){ total += v==='yes'?100:v==='partial'?50:0; count++; });
    return count ? Math.round(total / Object.values(_esgCriteria).reduce(function(a,b){return a+b.length;}, 0)) : 0;
}
function _calcRisk() {
    var levels = _q.data.riskLevels || {};
    var vals = Object.values(levels);
    if (!vals.length) return 0;
    var avg = vals.reduce(function(a,b){return a+b;}, 0) / vals.length;
    return Math.round((1 - avg / 5) * 100);
}
function _calcTracker() {
    var done = (_q.data.trackerDone || []).length;
    return Math.round(done / 10 * 100);
}
function _calcOverall() {
    return Math.round((_calcISO() * 0.25 + _calcESG() * 0.25 + _calcRisk() * 0.25 + Math.round((_q.data.sdgs||[]).length/14*100) * 0.15 + _calcTracker() * 0.10));
}

function _loadData() {
    try { _q.data = JSON.parse(localStorage.getItem(_STORE) || '{}'); } catch(e) { _q.data = {}; }
}
function _saveData() {
    try { localStorage.setItem(_STORE, JSON.stringify(_q.data)); } catch(e) {}
}

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('qualityStandards', { open: qualityOpen }, {
        name: 'Global Quality Standards', icon: '🏆', sectionId: 'quality', defaultEnabled: true, sprint: 5
    });
}
window.qualityOpen = qualityOpen;

})();
