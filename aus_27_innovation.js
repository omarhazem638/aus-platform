// =============================================================================
// aus_27_innovation.js  —  PATENT & INNOVATION CENTER + INNOVATION CHALLENGES
// (Modules 9 + 10) — Idea submission, novelty check, challenge board
// =============================================================================
(function () {
'use strict';

var _inn = { view: 'hub', ideas: [], styleInjected: false };
var _STORE_IDEAS = 'aus.innovation.ideas';

var _challenges = [
    { id:'ch1', title:'تحدي التعليم الرقمي',      prize:'$5,000',  deadline:'2026-08-01', sector:'EdTech',     status:'open',   entries:14, desc:'حلول مبتكرة لتعليم 100 طالب بأقل من $1/يوم في المناطق النائية.' },
    { id:'ch2', title:'تحدي الاستدامة الزراعية',  prize:'$8,000',  deadline:'2026-07-15', sector:'AgriTech',   status:'open',   entries:7,  desc:'تقنية تقلل هدر المياه في الزراعة بنسبة 50% أو أكثر.' },
    { id:'ch3', title:'تحدي الخدمات المالية',     prize:'$10,000', deadline:'2026-09-30', sector:'FinTech',    status:'open',   entries:22, desc:'منتج يوفر الشمول المالي لغير المتعاملين مع البنوك في المنطقة العربية.' },
    { id:'ch4', title:'تحدي الصحة الوقائية',     prize:'$6,000',  deadline:'2026-07-01', sector:'HealthTech', status:'closed', entries:31, desc:'تطبيق أو جهاز للكشف المبكر عن الأمراض المزمنة.' },
];

var _patentSteps = [
    { num:1, title:'تحقق من الفكرة', icon:'🔍', desc:'تحليل الفكرة بالذكاء الاصطناعي للتحقق من التفرد والقيمة التجارية' },
    { num:2, title:'بحث براءات مسبق', icon:'📚', desc:'البحث في قواعد بيانات USPTO, EPO, WIPO عن براءات مشابهة' },
    { num:3, title:'توثيق الاختراع',  icon:'📝', desc:'تعبئة نموذج الاختراع بالتفاصيل التقنية والمطالبات الحصرية' },
    { num:4, title:'استشارة قانونية', icon:'⚖️', desc:'التواصل مع محامي ملكية فكرية لمراجعة التطبيق' },
    { num:5, title:'تقديم البراءة',   icon:'🏛️', desc:'تقديم الطلب لمكتب البراءات المحلي أو دولياً عبر PCT' },
];

function _css() {
    if (_inn.styleInjected) return;
    _inn.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#inn-wrap{padding:20px 16px 100px;max-width:900px;margin:0 auto}',
        '.inn-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#f59e0b;letter-spacing:.1em;text-align:center;margin-bottom:4px}',
        '.inn-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.inn-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}',
        '.inn-tab{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:.78rem;font-weight:600;transition:all .2s;color:rgba(255,255,255,.4)}',
        '.inn-tab.active{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.4);color:#f59e0b}',
        '.inn-card{background:rgba(255,255,255,.04);border:1px solid rgba(245,158,11,.15);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.inn-card-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#f59e0b;margin-bottom:12px;font-weight:700}',
        /* Steps */
        '.inn-steps{display:flex;flex-direction:column;gap:0}',
        '.inn-step{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
        '.inn-step:last-child{border-bottom:none}',
        '.inn-step-num{width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.35);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}',
        '.inn-step-info{flex:1}',
        '.inn-step-title{font-size:.85rem;font-weight:700;margin-bottom:3px}',
        '.inn-step-desc{font-size:.72rem;color:rgba(255,255,255,.45);line-height:1.6}',
        /* Challenges */
        '.inn-challenge{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:10px;transition:all .2s}',
        '.inn-challenge:hover{border-color:rgba(245,158,11,.35)}',
        '.inn-challenge-header{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}',
        '.inn-challenge-title{flex:1;font-size:.9rem;font-weight:700}',
        '.inn-badge{font-size:.6rem;padding:2px 8px;border-radius:6px;font-weight:600}',
        '.inn-badge-open{background:rgba(0,245,160,.12);border:1px solid rgba(0,245,160,.3);color:#00f5a0}',
        '.inn-badge-closed{background:rgba(255,100,100,.1);border:1px solid rgba(255,100,100,.25);color:#ff8080}',
        '.inn-badge-sector{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);color:#f59e0b}',
        '.inn-challenge-meta{display:flex;gap:12px;font-size:.7rem;color:rgba(255,255,255,.4);flex-wrap:wrap}',
        '.inn-prize{font-family:Orbitron,sans-serif;font-size:.8rem;color:#ffc800;font-weight:700}',
        /* Form */
        '.inn-input,.inn-textarea,.inn-select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;padding:9px 12px;font-size:.85rem;outline:none}',
        '.inn-input:focus,.inn-textarea:focus{border-color:rgba(245,158,11,.4)}',
        '.inn-textarea{min-height:90px;resize:vertical;font-family:inherit}',
        '.inn-label{font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:5px;letter-spacing:.06em}',
        '.inn-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}',
        '@media(max-width:600px){.inn-form-grid{grid-template-columns:1fr}}',
        '.inn-btn{padding:9px 20px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.82rem;font-weight:600;transition:all .2s}',
        '.inn-btn-amber{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.45);color:#f59e0b}',
        '.inn-btn-amber:hover{background:rgba(245,158,11,.28)}',
        '.inn-btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.4)}',
        '.inn-btn-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
        /* Analysis result */
        '.inn-analysis{background:rgba(245,158,11,.06);border-left:3px solid rgba(245,158,11,.4);border-radius:0 8px 8px 0;padding:12px 16px;font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.8}',
        /* Ideas list */
        '.inn-idea-item{background:rgba(255,255,255,.03);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,.07)}',
        '.inn-idea-name{font-size:.88rem;font-weight:600;margin-bottom:4px}',
        '.inn-idea-status{font-size:.62rem;padding:2px 8px;border-radius:6px;display:inline-block}',
    ].join('');
    document.head.appendChild(s);
}

function innOpen() {
    _css();
    _loadIdeas();
    var sec = document.getElementById('innovation');
    if (!sec) return;
    var html = '<div id="inn-wrap"><div class="inn-title">💡 Innovation Center</div>' +
        '<div class="inn-sub">أفكارك · ابتكاراتك · براءاتك · تحدياتك</div>' +
        '<div class="inn-tabs">' +
        '<div class="inn-tab' + (_inn.view==='hub'?' active':'') + '" onclick="_innView(\'hub\')">🏠 المركز</div>' +
        '<div class="inn-tab' + (_inn.view==='patent'?' active':'') + '" onclick="_innView(\'patent\')">🏛️ دليل البراءات</div>' +
        '<div class="inn-tab' + (_inn.view==='challenges'?' active':'') + '" onclick="_innView(\'challenges\')">🏆 تحديات الابتكار</div>' +
        '<div class="inn-tab' + (_inn.view==='submit'?' active':'') + '" onclick="_innView(\'submit\')">+ أرسل فكرة</div>' +
        '</div>' +
        '<div id="inn-content"></div></div>';
    sec.innerHTML = html;
    _innRender();
}

window._innView = function(v) {
    _inn.view = v;
    document.querySelectorAll('.inn-tab').forEach(function(t,i){
        t.classList.toggle('active', (v==='hub'&&i===0)||(v==='patent'&&i===1)||(v==='challenges'&&i===2)||(v==='submit'&&i===3));
    });
    _innRender();
};

function _innRender() {
    var el = document.getElementById('inn-content');
    if (!el) return;
    if (_inn.view === 'hub')        el.innerHTML = _hubHTML();
    else if (_inn.view === 'patent')     el.innerHTML = _patentHTML();
    else if (_inn.view === 'challenges') el.innerHTML = _challengesHTML();
    else                            el.innerHTML = _submitHTML();
}

function _hubHTML() {
    var ideasHtml = _inn.ideas.length ?
        _inn.ideas.slice(-3).reverse().map(function(idea) {
            var statusColor = idea.status==='analyzed' ? '#00f5a0' : '#ffc800';
            return '<div class="inn-idea-item">' +
                '<div class="inn-idea-name">' + _AUS_UTILS.sanitize(idea.title) + '</div>' +
                '<div class="inn-idea-status" style="background:rgba(0,0,0,.2);color:' + statusColor + '">' + (idea.status==='analyzed' ? '✓ محلل' : '⏳ بانتظار') + '</div>' +
                '</div>';
        }).join('') :
        '<div style="font-size:.8rem;color:rgba(255,255,255,.3);padding:10px 0">لا توجد أفكار بعد.</div>';

    return '<div class="inn-card"><div class="inn-card-title">📊 ملخص نشاطك</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">' +
        '<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:14px;text-align:center"><div style="font-family:Orbitron,sans-serif;font-size:1.6rem;color:#f59e0b">' + _inn.ideas.length + '</div><div style="font-size:.65rem;color:rgba(255,255,255,.35)">IDEAS</div></div>' +
        '<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:14px;text-align:center"><div style="font-family:Orbitron,sans-serif;font-size:1.6rem;color:#00f5a0">' + _inn.ideas.filter(function(i){return i.status==='analyzed';}).length + '</div><div style="font-size:.65rem;color:rgba(255,255,255,.35)">ANALYZED</div></div>' +
        '<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:14px;text-align:center"><div style="font-family:Orbitron,sans-serif;font-size:1.6rem;color:#ffc800">' + _challenges.filter(function(c){return c.status==='open';}).length + '</div><div style="font-size:.65rem;color:rgba(255,255,255,.35)">CHALLENGES</div></div>' +
        '</div>' +
        '<div class="inn-card-title">آخر الأفكار</div>' + ideasHtml + '</div>';
}

function _patentHTML() {
    var stepsHtml = _patentSteps.map(function(step) {
        return '<div class="inn-step">' +
            '<div class="inn-step-num">' + step.icon + '</div>' +
            '<div class="inn-step-info">' +
            '<div class="inn-step-title">خطوة ' + step.num + ': ' + step.title + '</div>' +
            '<div class="inn-step-desc">' + step.desc + '</div>' +
            '</div></div>';
    }).join('');

    return '<div class="inn-card"><div class="inn-card-title">🏛️ دليل تسجيل البراءة</div>' +
        '<div class="inn-steps">' + stepsHtml + '</div>' +
        '<div style="margin-top:16px;padding:12px;background:rgba(245,158,11,.06);border-radius:10px;font-size:.78rem;color:rgba(255,255,255,.55)">' +
        '⚠️ الدليل تعليمي فقط. تواصل مع محامٍ متخصص في الملكية الفكرية قبل تقديم أي طلب براءة.' +
        '</div></div>';
}

function _challengesHTML() {
    var html = '<div class="inn-card"><div class="inn-card-title">🏆 تحديات الابتكار المفتوحة</div>';
    _challenges.forEach(function(ch) {
        var isOpen = ch.status === 'open';
        html += '<div class="inn-challenge">' +
            '<div class="inn-challenge-header">' +
            '<div class="inn-challenge-title">' + _AUS_UTILS.sanitize(ch.title) + '</div>' +
            '<div class="inn-badge ' + (isOpen?'inn-badge-open':'inn-badge-closed') + '">' + (isOpen?'مفتوح':'مغلق') + '</div>' +
            '</div>' +
            '<div style="font-size:.78rem;color:rgba(255,255,255,.5);margin-bottom:10px;line-height:1.6">' + _AUS_UTILS.sanitize(ch.desc) + '</div>' +
            '<div class="inn-challenge-meta">' +
            '<span class="inn-prize">🏆 ' + ch.prize + '</span>' +
            '<span class="inn-badge inn-badge-sector">' + ch.sector + '</span>' +
            '<span>📅 ' + ch.deadline + '</span>' +
            '<span>👥 ' + ch.entries + ' مشتركين</span>' +
            '</div>' +
            (isOpen ? '<button class="inn-btn inn-btn-amber" style="margin-top:10px;font-size:.72rem;padding:5px 14px" onclick="_innEnter(\'' + ch.id + '\',\'' + _AUS_UTILS.sanitize(ch.title) + '\')">شارك في التحدي</button>' : '') +
            '</div>';
    });
    html += '</div>';
    return html;
}

window._innEnter = function(id, title) {
    _AUS_UTILS.toast('تم تسجيلك في تحدي "' + title + '" ✓');
    window._AUS_BUS.emit('XP_AWARDED', { amount: 30 });
    window._AUS_BUS.emit('MILESTONE_COMPLETED', { type: 'challenge_entry', challenge: title });
};

function _submitHTML() {
    return '<div class="inn-card"><div class="inn-card-title">💡 أرسل فكرة للتحليل</div>' +
        '<div style="margin-bottom:12px"><div class="inn-label">عنوان الفكرة / الاختراع</div>' +
        '<input class="inn-input" id="inn-title" placeholder="اسم فكرتك المبتكرة"></div>' +
        '<div style="margin-bottom:12px"><div class="inn-label">المشكلة التي تحلها</div>' +
        '<textarea class="inn-textarea" id="inn-problem" placeholder="ما هي المشكلة؟ من يعانيها؟ ما حجمها؟"></textarea></div>' +
        '<div style="margin-bottom:12px"><div class="inn-label">حلك المقترح</div>' +
        '<textarea class="inn-textarea" id="inn-solution" placeholder="كيف تحل المشكلة بشكل مختلف ومبتكر؟"></textarea></div>' +
        '<div class="inn-form-grid">' +
        '<div><div class="inn-label">القطاع</div><select class="inn-select" id="inn-sector">' +
        ['EdTech','FinTech','HealthTech','AgriTech','PropTech','HRTech','GovTech','عام'].map(function(s){ return '<option>' + s + '</option>'; }).join('') +
        '</select></div>' +
        '<div><div class="inn-label">نوع الحماية المطلوبة</div><select class="inn-select" id="inn-type">' +
        ['براءة اختراع','علامة تجارية','حقوق تأليف','أسرار تجارية','لا أعرف بعد'].map(function(t){ return '<option>' + t + '</option>'; }).join('') +
        '</select></div></div>' +
        '<div class="inn-btn-row">' +
        '<button class="inn-btn inn-btn-amber" onclick="_innSubmitIdea()">تحليل بالذكاء الاصطناعي ✨</button>' +
        '</div>' +
        '<div id="inn-analysis-result" style="margin-top:16px"></div></div>';
}

window._innSubmitIdea = function() {
    var title = (document.getElementById('inn-title')||{}).value||'';
    var problem = (document.getElementById('inn-problem')||{}).value||'';
    var solution = (document.getElementById('inn-solution')||{}).value||'';
    if (!title.trim()) { _AUS_UTILS.toast('أدخل عنوان الفكرة', 'error'); return; }

    var resEl = document.getElementById('inn-analysis-result');
    if (resEl) resEl.innerHTML = '<div style="font-size:.78rem;color:rgba(255,255,255,.35);font-style:italic">يحلل الذكاء الاصطناعي فكرتك للتفرد والقيمة...</div>';

    _AUS_AI.ask('innovation',
        'Analyze this innovation idea:\nTitle: ' + title + '\nProblem: ' + problem + '\nSolution: ' + solution +
        '\n\nProvide: 1) Novelty assessment (is it truly novel?) 2) Commercial viability score (1-10) 3) Recommended IP protection type 4) Main risks 5) Key differentiators. Be specific.',
        'You are an IP attorney and innovation consultant specializing in MENA startups.',
        function(err, text) {
            var idea = {
                id: 'idea' + Date.now(), title: title.trim(),
                problem: problem, solution: solution,
                sector: (document.getElementById('inn-sector')||{}).value||'عام',
                type: (document.getElementById('inn-type')||{}).value||'',
                analysis: text || '', status: 'analyzed', createdAt: Date.now()
            };
            _inn.ideas.push(idea);
            _saveIdeas();
            var resEl2 = document.getElementById('inn-analysis-result');
            if (resEl2) resEl2.innerHTML = '<div class="inn-analysis">' + _AUS_UTILS.sanitize(text||'تعذّر التحليل.') + '</div>';
            window._AUS_BUS.emit('XP_AWARDED', { amount: 25 });
            window._AUS_BUS.emit('PROJECT_SUBMITTED', { type: 'innovation_idea', title: title });
        });
};

function _loadIdeas() {
    try { _inn.ideas = JSON.parse(localStorage.getItem(_STORE_IDEAS) || '[]'); } catch(e) { _inn.ideas = []; }
}
function _saveIdeas() {
    try { localStorage.setItem(_STORE_IDEAS, JSON.stringify(_inn.ideas)); } catch(e) {}
}

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('innovation', { open: innOpen }, {
        name: 'Innovation Center', icon: '💡', sectionId: 'innovation', defaultEnabled: true, sprint: 4
    });
}
window.innOpen = innOpen;

})();
