// =============================================================================
// aus_23_incubator.js  —  STARTUP INCUBATOR  (Module 4)
// Digital incubator: submit idea → form team → track milestones → expert feedback
// =============================================================================
(function () {
'use strict';

var _inc = { projects: [], styleInjected: false, view: 'list', activeProject: null };
var _STORE = 'aus.incubator.projects';

var _stages = ['Idea','Validation','MVP','Traction','Growth','Scale'];
var _milestones = {
    Idea:       ['Define problem statement','Identify target market','Build team of 2+','Complete Lean Canvas'],
    Validation: ['Interview 20 potential customers','Validate willingness to pay','Define success metrics','Create prototype/mockup'],
    MVP:        ['Launch basic product','Onboard 10 beta users','Collect feedback','Iterate 3 times'],
    Traction:   ['Reach 100 active users','Achieve first revenue','Define unit economics','Launch marketing channel'],
    Growth:     ['Scale to 1,000 users','Achieve product-market fit','Raise seed funding','Build team to 5+'],
    Scale:      ['Expand to new market','$10K MRR','Series A preparation','Launch V2.0']
};

function _css() {
    if (_inc.styleInjected) return;
    _inc.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#inc-wrap{padding:20px 16px 100px;max-width:860px;margin:0 auto}',
        '.inc-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#00f5a0;letter-spacing:.1em;text-align:center;margin-bottom:4px}',
        '.inc-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.inc-card{background:rgba(255,255,255,.04);border:1px solid rgba(0,245,160,.18);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.inc-card-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#00f5a0;margin-bottom:12px;font-weight:700}',
        '.inc-project-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;margin-bottom:10px}',
        '.inc-project-card:hover{border-color:rgba(0,245,160,.4);background:rgba(0,245,160,.04)}',
        '.inc-project-name{font-size:.95rem;font-weight:700;margin-bottom:4px}',
        '.inc-project-stage{display:inline-block;font-size:.6rem;padding:2px 8px;border-radius:8px;background:rgba(0,245,160,.1);border:1px solid rgba(0,245,160,.3);color:#00f5a0;margin-bottom:8px}',
        '.inc-progress-bar{height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}',
        '.inc-progress-fill{height:100%;background:#00f5a0;border-radius:3px;transition:width .8s ease}',
        '.inc-stage-track{display:flex;gap:0;margin-bottom:20px;overflow-x:auto}',
        '.inc-stage{flex:1;padding:8px 4px;text-align:center;font-size:.62rem;border-bottom:3px solid rgba(255,255,255,.1);cursor:pointer;white-space:nowrap;min-width:60px;transition:all .2s;color:rgba(255,255,255,.4)}',
        '.inc-stage.active{border-color:#00f5a0;color:#00f5a0;font-weight:700}',
        '.inc-stage.done{border-color:rgba(0,245,160,.5);color:rgba(0,245,160,.6)}',
        '.inc-milestone{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
        '.inc-milestone:last-child{border-bottom:none}',
        '.inc-check{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.2);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.6rem;transition:all .2s;margin-top:1px}',
        '.inc-check.done{background:#00f5a0;border-color:#00f5a0;color:#000}',
        '.inc-m-text{font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.5}',
        '.inc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
        '@media(max-width:600px){.inc-form-grid{grid-template-columns:1fr}}',
        '.inc-input,.inc-textarea,.inc-select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;padding:9px 12px;font-size:.85rem;outline:none}',
        '.inc-input:focus,.inc-textarea:focus{border-color:rgba(0,245,160,.4)}',
        '.inc-textarea{min-height:80px;resize:vertical;font-family:inherit}',
        '.inc-label{font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:4px;letter-spacing:.06em}',
        '.inc-btn{padding:9px 20px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.82rem;font-weight:600;transition:all .2s}',
        '.inc-btn-green{background:rgba(0,245,160,.12);border-color:rgba(0,245,160,.4);color:#00f5a0}',
        '.inc-btn-green:hover{background:rgba(0,245,160,.22)}',
        '.inc-btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.5)}',
        '.inc-btn-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
        '.inc-empty{text-align:center;padding:40px 20px;color:rgba(255,255,255,.3);font-size:.85rem}',
        '.inc-feedback-msg{background:rgba(0,245,160,.06);border-left:3px solid rgba(0,245,160,.4);border-radius:0 8px 8px 0;padding:10px 14px;font-size:.8rem;margin-bottom:8px;color:rgba(255,255,255,.75);line-height:1.7}',
    ].join('');
    document.head.appendChild(s);
}

function incOpen() {
    _css();
    _loadProjects();
    var sec = document.getElementById('incubator');
    if (!sec) return;
    if (_inc.view === 'detail' && _inc.activeProject) { _renderDetail(sec); return; }
    _renderList(sec);
}

function _renderList(sec) {
    var projects = _inc.projects;
    var html = '<div id="inc-wrap"><div class="inc-title">🏗️ Startup Incubator</div>' +
        '<div class="inc-sub">حاضنة رقمية لتحويل أفكارك إلى شركات ناشئة</div>';

    if (!projects.length) {
        html += '<div class="inc-card"><div class="inc-empty">🚀<br><br>لا توجد مشاريع بعد.<br>ابدأ مشروعك الأول!</div></div>';
    } else {
        html += '<div class="inc-card"><div class="inc-card-title">مشاريعك</div>';
        projects.forEach(function(p, i) {
            var stagePct = Math.round((_stages.indexOf(p.stage) / (_stages.length - 1)) * 100);
            var completedMs = (p.completed || []).length;
            var totalMs = (_milestones[p.stage] || []).length;
            html += '<div class="inc-project-card" onclick="_incOpenProject(' + i + ')">' +
                '<div class="inc-project-name">' + _AUS_UTILS.sanitize(p.name) + '</div>' +
                '<div class="inc-project-stage">' + p.stage + '</div>' +
                '<div style="display:flex;align-items:center;gap:10px;font-size:.72rem;color:rgba(255,255,255,.4);margin-bottom:8px">' +
                '<span>📊 ' + completedMs + '/' + totalMs + ' milestones</span>' +
                '<span>👥 ' + (p.teamSize || 1) + ' أعضاء</span></div>' +
                '<div class="inc-progress-bar"><div class="inc-progress-fill" style="width:' + stagePct + '%"></div></div></div>';
        });
        html += '</div>';
    }

    html += '<div class="inc-card"><div class="inc-card-title">+ أضف مشروعاً جديداً</div>' +
        '<div class="inc-form-grid">' +
        '<div><div class="inc-label">اسم المشروع</div><input class="inc-input" id="inc-name" placeholder="اسم شركتك الناشئة"></div>' +
        '<div><div class="inc-label">المرحلة الحالية</div><select class="inc-select" id="inc-stage">' + _stages.map(function(s){ return '<option>' + s + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div style="margin-top:10px"><div class="inc-label">وصف قصير</div><textarea class="inc-textarea" id="inc-desc" placeholder="ما الذي يفعله مشروعك؟"></textarea></div>' +
        '<div class="inc-btn-row">' +
        '<button class="inc-btn inc-btn-green" onclick="_incAddProject()">+ إضافة المشروع</button></div></div></div>';

    sec.innerHTML = html;
}

window._incOpenProject = function(idx) {
    _inc.activeProject = idx;
    _inc.view = 'detail';
    incOpen();
};

function _renderDetail(sec) {
    var p = _inc.projects[_inc.activeProject];
    if (!p) { _inc.view = 'list'; incOpen(); return; }

    var currentStageIdx = _stages.indexOf(p.stage);
    var ms = _milestones[p.stage] || [];

    var stageHtml = _stages.map(function(s, i) {
        var cls = i < currentStageIdx ? 'done' : i === currentStageIdx ? 'active' : '';
        return '<div class="inc-stage ' + cls + '" onclick="_incSetStage(\'' + s + '\')">' + s + '</div>';
    }).join('');

    var msHtml = ms.map(function(m, i) {
        var key = p.stage + ':' + i;
        var done = (p.completed || []).includes(key);
        return '<div class="inc-milestone">' +
            '<div class="inc-check ' + (done?'done':'') + '" onclick="_incToggleMilestone(\'' + key + '\')">' + (done?'✓':'') + '</div>' +
            '<div class="inc-m-text' + (done?'" style="text-decoration:line-through;opacity:.4':'') + '">' + _AUS_UTILS.sanitize(m) + '</div></div>';
    }).join('');

    var html = '<div id="inc-wrap">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">' +
        '<button class="inc-btn inc-btn-ghost" style="font-size:.72rem;padding:5px 12px" onclick="_inc.view=\'list\';incOpen()">← عودة</button>' +
        '<div style="flex:1;font-family:Orbitron,sans-serif;font-size:1.05rem;color:#00f5a0">' + _AUS_UTILS.sanitize(p.name) + '</div></div>' +
        '<div class="inc-stage-track">' + stageHtml + '</div>' +
        '<div class="inc-card"><div class="inc-card-title">Milestones — ' + p.stage + '</div>' + msHtml + '</div>' +
        '<div class="inc-card">' +
        '<div class="inc-card-title">✨ تقييم الخبراء بالذكاء الاصطناعي</div>' +
        '<div id="inc-feedback-area"><button class="inc-btn inc-btn-green" onclick="_incGetFeedback()">احصل على تقييم</button></div>' +
        '</div></div>';

    sec.innerHTML = html;
}

window._incSetStage = function(stage) {
    var p = _inc.projects[_inc.activeProject];
    if (!p) return;
    p.stage = stage;
    _saveProjects();
    _inc.view = 'detail';
    incOpen();
    window._AUS_BUS.emit('MILESTONE_COMPLETED', { project: p.name, stage: stage });
    window._AUS_BUS.emit('XP_AWARDED', { amount: 20 });
};

window._incToggleMilestone = function(key) {
    var p = _inc.projects[_inc.activeProject];
    if (!p) return;
    if (!p.completed) p.completed = [];
    var idx = p.completed.indexOf(key);
    if (idx >= 0) p.completed.splice(idx, 1);
    else { p.completed.push(key); window._AUS_BUS.emit('XP_AWARDED', { amount: 10 }); }
    _saveProjects();
    incOpen();
};

window._incAddProject = function() {
    var name = (document.getElementById('inc-name') || {}).value || '';
    var stage = (document.getElementById('inc-stage') || {}).value || 'Idea';
    var desc = (document.getElementById('inc-desc') || {}).value || '';
    if (!name.trim()) { _AUS_UTILS.toast('أدخل اسم المشروع', 'error'); return; }
    var project = { name: name.trim(), stage: stage, desc: desc.trim(), teamSize: 1, completed: [], createdAt: Date.now() };
    _inc.projects.push(project);
    _saveProjects();
    window._AUS_BUS.emit('PROJECT_SUBMITTED', { name: project.name });
    window._AUS_BUS.emit('XP_AWARDED', { amount: 30 });
    _AUS_UTILS.toast('تم إضافة المشروع! ✓');
    incOpen();
};

window._incGetFeedback = function() {
    var p = _inc.projects[_inc.activeProject];
    if (!p) return;
    var area = document.getElementById('inc-feedback-area');
    if (area) area.innerHTML = '<div style="font-size:.78rem;color:rgba(255,255,255,.4);font-style:italic">يحلل الخبير مشروعك...</div>';
    var completedCount = (p.completed||[]).length;
    var total = (_milestones[p.stage]||[]).length;
    _AUS_AI.ask('incubator',
        'Evaluate this startup project as an experienced incubator mentor.\nProject: ' + p.name + '\nDescription: ' + (p.desc||'Not provided') + '\nStage: ' + p.stage + '\nMilestones completed: ' + completedCount + '/' + total + '\n\nProvide: 1) Key strengths (2 points) 2) Critical gaps (2 points) 3) Top 3 recommended next actions. Be specific and practical.',
        'You are a startup incubator mentor at a Y Combinator-level accelerator.',
        function(err, text) {
            var area2 = document.getElementById('inc-feedback-area');
            if (area2) area2.innerHTML = '<div class="inc-feedback-msg">' + _AUS_UTILS.sanitize(text || 'تعذّر الحصول على التقييم. تحقق من الخادم.') + '</div>';
            window._AUS_BUS.emit('XP_AWARDED', { amount: 15 });
        });
};

function _loadProjects() {
    try { _inc.projects = JSON.parse(localStorage.getItem(_STORE) || '[]'); } catch(e) { _inc.projects = []; }
}
function _saveProjects() {
    try { localStorage.setItem(_STORE, JSON.stringify(_inc.projects)); } catch(e) {}
}

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('incubator', { open: incOpen }, {
        name: 'Startup Incubator', icon: '🏗️', sectionId: 'incubator', defaultEnabled: true, sprint: 3
    });
}
window.incOpen = incOpen;

})();
