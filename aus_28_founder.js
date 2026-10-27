// =============================================================================
// aus_28_founder.js  —  FOUNDER PROFILE + ENTREPRENEURSHIP LEARNING CENTER
// (Modules 13 + 14) — Profile builder, learning tracks, courses, quizzes
// =============================================================================
(function () {
'use strict';

var _fp = { view: 'profile', profile: null, styleInjected: false };
var _STORE = 'aus.founder.profile';

var _tracks = [
    {
        id:'t1', title:'Startup Fundamentals', icon:'🚀', level:'Beginner', hours:8,
        modules: [
            { title:'Lean Startup Methodology', done:false, xp:20 },
            { title:'Customer Discovery & Validation', done:false, xp:25 },
            { title:'Business Model Canvas', done:false, xp:25 },
            { title:'MVP Design & Testing', done:false, xp:30 },
        ]
    },
    {
        id:'t2', title:'Fundraising Mastery', icon:'💰', level:'Intermediate', hours:12,
        modules: [
            { title:'Types of Startup Funding', done:false, xp:20 },
            { title:'Investor Psychology', done:false, xp:25 },
            { title:'Pitch Deck Essentials', done:false, xp:30 },
            { title:'Term Sheet Negotiation', done:false, xp:35 },
        ]
    },
    {
        id:'t3', title:'Product & Growth', icon:'📈', level:'Intermediate', hours:10,
        modules: [
            { title:'Product-Market Fit Framework', done:false, xp:25 },
            { title:'Growth Hacking Strategies', done:false, xp:30 },
            { title:'Unit Economics & LTV/CAC', done:false, xp:30 },
            { title:'Go-To-Market Planning', done:false, xp:35 },
        ]
    },
    {
        id:'t4', title:'Leadership & Team Building', icon:'👑', level:'Advanced', hours:6,
        modules: [
            { title:'Founder-CEO Transition', done:false, xp:30 },
            { title:'Hiring for Startups', done:false, xp:25 },
            { title:'Building Company Culture', done:false, xp:25 },
            { title:'Managing Investors & Boards', done:false, xp:35 },
        ]
    },
];

var _levelColors = { Beginner: '#00f5a0', Intermediate: '#ffc800', Advanced: '#ff9c4a' };

function _css() {
    if (_fp.styleInjected) return;
    _fp.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#fp-wrap{padding:20px 16px 100px;max-width:900px;margin:0 auto}',
        '.fp-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#e879f9;letter-spacing:.1em;text-align:center;margin-bottom:4px}',
        '.fp-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.fp-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}',
        '.fp-tab{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:.78rem;font-weight:600;transition:all .2s;color:rgba(255,255,255,.4)}',
        '.fp-tab.active{background:rgba(232,121,249,.12);border-color:rgba(232,121,249,.4);color:#e879f9}',
        '.fp-card{background:rgba(255,255,255,.04);border:1px solid rgba(232,121,249,.15);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.fp-card-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#e879f9;margin-bottom:12px;font-weight:700}',
        /* Avatar */
        '.fp-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,rgba(232,121,249,.3),rgba(124,58,237,.3));border:2px solid rgba(232,121,249,.4);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 14px}',
        '.fp-name-big{font-family:Orbitron,sans-serif;font-size:1.1rem;text-align:center;color:#e879f9;margin-bottom:4px}',
        '.fp-tagline{font-size:.78rem;color:rgba(255,255,255,.45);text-align:center;margin-bottom:16px}',
        /* Skills tags */
        '.fp-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}',
        '.fp-tag{font-size:.65rem;padding:3px 10px;border-radius:8px;font-weight:600}',
        '.fp-tag-skill{background:rgba(232,121,249,.1);border:1px solid rgba(232,121,249,.3);color:#e879f9}',
        '.fp-tag-goal{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.25);color:#00d4ff}',
        /* Form */
        '.fp-input,.fp-textarea,.fp-select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;padding:9px 12px;font-size:.85rem;outline:none}',
        '.fp-input:focus,.fp-textarea:focus{border-color:rgba(232,121,249,.4)}',
        '.fp-textarea{min-height:80px;resize:vertical;font-family:inherit}',
        '.fp-label{font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:5px;letter-spacing:.06em}',
        '.fp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}',
        '@media(max-width:600px){.fp-grid{grid-template-columns:1fr}}',
        '.fp-chip{display:inline-flex;align-items:center;gap:5px;font-size:.68rem;padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s;margin:3px;color:rgba(255,255,255,.5)}',
        '.fp-chip.active{background:rgba(232,121,249,.12);border-color:rgba(232,121,249,.4);color:#e879f9}',
        /* Learning track card */
        '.fp-track{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:10px;transition:all .2s}',
        '.fp-track:hover{border-color:rgba(232,121,249,.3)}',
        '.fp-track-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
        '.fp-track-icon{font-size:1.4rem}',
        '.fp-track-title{flex:1;font-size:.9rem;font-weight:700}',
        '.fp-level-badge{font-size:.6rem;padding:2px 8px;border-radius:6px;font-weight:600}',
        '.fp-track-progress{height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden;margin-bottom:10px}',
        '.fp-track-fill{height:100%;background:#e879f9;border-radius:3px;transition:width .8s ease}',
        '.fp-module{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer}',
        '.fp-module:last-child{border-bottom:none}',
        '.fp-module-check{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:.55rem;transition:all .2s;flex-shrink:0}',
        '.fp-module-check.done{background:#e879f9;border-color:#e879f9;color:#fff}',
        '.fp-module-title{flex:1;font-size:.78rem;color:rgba(255,255,255,.7)}',
        '.fp-xp-badge{font-size:.6rem;color:#ffc800;background:rgba(255,200,0,.1);padding:2px 6px;border-radius:6px}',
        /* Btn */
        '.fp-btn{padding:9px 20px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.82rem;font-weight:600;transition:all .2s}',
        '.fp-btn-pink{background:rgba(232,121,249,.15);border-color:rgba(232,121,249,.45);color:#e879f9}',
        '.fp-btn-pink:hover{background:rgba(232,121,249,.28)}',
        '.fp-btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.4)}',
        '.fp-btn-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
    ].join('');
    document.head.appendChild(s);
}

function founderOpen() {
    _css();
    _loadProfile();
    var sec = document.getElementById('founder-profile');
    if (!sec) return;
    var html = '<div id="fp-wrap"><div class="fp-title">👤 Founder Profile & Learning</div>' +
        '<div class="fp-sub">ملفك الشخصي · مسارات التعلم · شهاداتك</div>' +
        '<div class="fp-tabs">' +
        '<div class="fp-tab' + (_fp.view==='profile'?' active':'') + '" onclick="_fpView(\'profile\')">👤 الملف الشخصي</div>' +
        '<div class="fp-tab' + (_fp.view==='learn'?' active':'') + '" onclick="_fpView(\'learn\')">📚 مركز التعلم</div>' +
        '</div><div id="fp-content"></div></div>';
    sec.innerHTML = html;
    _fpRender();
}

window._fpView = function(v) {
    _fp.view = v;
    document.querySelectorAll('.fp-tab').forEach(function(t,i){
        t.classList.toggle('active', (v==='profile'&&i===0)||(v==='learn'&&i===1));
    });
    _fpRender();
};

function _fpRender() {
    var el = document.getElementById('fp-content');
    if (!el) return;
    if (_fp.view === 'learn') el.innerHTML = _learnHTML();
    else el.innerHTML = _profileHTML();
}

function _profileHTML() {
    var p = _fp.profile;

    if (!p) {
        return '<div class="fp-card"><div class="fp-card-title">إنشاء ملفك الشخصي</div>' +
            '<div class="fp-grid">' +
            '<div><div class="fp-label">الاسم الكامل</div><input class="fp-input" id="fp-name" placeholder="اسمك"></div>' +
            '<div><div class="fp-label">المسمى الوظيفي</div><input class="fp-input" id="fp-role" placeholder="مثال: مؤسس ومدير تنفيذي"></div>' +
            '</div>' +
            '<div style="margin-bottom:12px"><div class="fp-label">البيو / نبذة قصيرة</div>' +
            '<textarea class="fp-textarea" id="fp-bio" placeholder="أخبرنا عن تجربتك وطموحاتك..."></textarea></div>' +
            '<div class="fp-grid">' +
            '<div><div class="fp-label">القطاع</div><select class="fp-select" id="fp-sector">' +
            ['EdTech','FinTech','HealthTech','AgriTech','GovTech','E-Commerce','SaaS','أخرى'].map(function(s){ return '<option>' + s + '</option>'; }).join('') +
            '</select></div>' +
            '<div><div class="fp-label">المرحلة</div><select class="fp-select" id="fp-stage">' +
            ['Idea','Pre-Seed','Seed','Series A','Bootstrapped'].map(function(s){ return '<option>' + s + '</option>'; }).join('') +
            '</select></div></div>' +
            '<div class="fp-btn-row"><button class="fp-btn fp-btn-pink" onclick="_fpSaveProfile()">حفظ الملف الشخصي ✓</button></div></div>';
    }

    var totalDone = _tracks.reduce(function(acc, t) {
        return acc + t.modules.filter(function(m){ return m.done; }).length;
    }, 0);
    var totalMods = _tracks.reduce(function(acc,t){ return acc + t.modules.length; }, 0);
    var completionPct = totalMods ? Math.round(totalDone / totalMods * 100) : 0;

    return '<div class="fp-card" style="text-align:center">' +
        '<div class="fp-avatar">👤</div>' +
        '<div class="fp-name-big">' + _AUS_UTILS.sanitize(p.name) + '</div>' +
        '<div class="fp-tagline">' + _AUS_UTILS.sanitize(p.role) + ' · ' + p.sector + ' · ' + p.stage + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">' +
        '<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:10px"><div style="font-family:Orbitron,sans-serif;font-size:1.1rem;color:#e879f9">' + totalDone + '</div><div style="font-size:.6rem;color:rgba(255,255,255,.35)">MODULES</div></div>' +
        '<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:10px"><div style="font-family:Orbitron,sans-serif;font-size:1.1rem;color:#ffc800">' + completionPct + '%</div><div style="font-size:.6rem;color:rgba(255,255,255,.35)">PROGRESS</div></div>' +
        '<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:10px"><div style="font-family:Orbitron,sans-serif;font-size:1.1rem;color:#00f5a0">' + _tracks.filter(function(t){ return t.modules.every(function(m){return m.done;}); }).length + '</div><div style="font-size:.6rem;color:rgba(255,255,255,.35)">TRACKS ✓</div></div>' +
        '</div></div>' +
        '<div class="fp-card"><div class="fp-label">نبذة</div><div style="font-size:.82rem;color:rgba(255,255,255,.65);line-height:1.7;margin-bottom:14px">' + _AUS_UTILS.sanitize(p.bio || 'لم تُضف نبذة بعد.') + '</div>' +
        '<button class="fp-btn fp-btn-ghost" style="font-size:.72rem;padding:5px 14px" onclick="_fp.profile=null;_fpRender()">✏️ تعديل الملف</button></div>';
}

function _learnHTML() {
    var html = '<div class="fp-card"><div class="fp-card-title">📚 مسارات التعلم</div>';
    _tracks.forEach(function(track) {
        var done = track.modules.filter(function(m){ return m.done; }).length;
        var pct = Math.round(done / track.modules.length * 100);
        var lc = _levelColors[track.level] || '#ffc800';
        html += '<div class="fp-track">' +
            '<div class="fp-track-header">' +
            '<div class="fp-track-icon">' + track.icon + '</div>' +
            '<div style="flex:1"><div class="fp-track-title">' + track.title + '</div>' +
            '<div style="font-size:.68rem;color:rgba(255,255,255,.35)">' + track.hours + ' hours · ' + done + '/' + track.modules.length + ' modules</div></div>' +
            '<div class="fp-level-badge" style="color:' + lc + ';background:rgba(0,0,0,.2);border:1px solid ' + lc + '">' + track.level + '</div>' +
            '</div>' +
            '<div class="fp-track-progress"><div class="fp-track-fill" style="width:' + pct + '%"></div></div>';

        track.modules.forEach(function(mod, mi) {
            html += '<div class="fp-module" onclick="_fpToggleModule(\'' + track.id + '\',' + mi + ')">' +
                '<div class="fp-module-check ' + (mod.done?'done':'') + '">' + (mod.done?'✓':'') + '</div>' +
                '<div class="fp-module-title' + (mod.done?'" style="text-decoration:line-through;opacity:.4':'') + '">' + mod.title + '</div>' +
                '<div class="fp-xp-badge">+' + mod.xp + ' XP</div></div>';
        });
        html += '</div>';
    });
    html += '</div>';
    return html;
}

window._fpToggleModule = function(trackId, modIdx) {
    var track = _tracks.find(function(t){ return t.id === trackId; });
    if (!track) return;
    var mod = track.modules[modIdx];
    if (!mod) return;
    mod.done = !mod.done;
    if (mod.done) {
        window._AUS_BUS.emit('XP_AWARDED', { amount: mod.xp });
        window._AUS_BUS.emit('MILESTONE_COMPLETED', { type: 'learning_module', module: mod.title });
        _AUS_UTILS.toast('+' + mod.xp + ' XP — ' + mod.title + ' ✓');
        var track2 = _tracks.find(function(t){ return t.id === trackId; });
        if (track2 && track2.modules.every(function(m){ return m.done; })) {
            _AUS_UTILS.toast('🎓 Track complete: ' + track2.title, 'success');
            window._AUS_BUS.emit('BADGE_UNLOCKED', { badge: track2.title + ' Graduate' });
        }
    }
    _fpRender();
};

window._fpSaveProfile = function() {
    var name = (document.getElementById('fp-name')||{}).value||'';
    if (!name.trim()) { _AUS_UTILS.toast('أدخل اسمك', 'error'); return; }
    _fp.profile = {
        name: name.trim(),
        role: (document.getElementById('fp-role')||{}).value||'Founder',
        bio: (document.getElementById('fp-bio')||{}).value||'',
        sector: (document.getElementById('fp-sector')||{}).value||'',
        stage: (document.getElementById('fp-stage')||{}).value||'',
        createdAt: Date.now()
    };
    _saveProfile();
    window._AUS_BUS.emit('PROFILE_UPDATED', { name: _fp.profile.name });
    window._AUS_BUS.emit('XP_AWARDED', { amount: 30 });
    _AUS_UTILS.toast('تم حفظ ملفك الشخصي ✓');
    _fpRender();
};

function _loadProfile() {
    try { _fp.profile = JSON.parse(localStorage.getItem(_STORE) || 'null'); } catch(e) { _fp.profile = null; }
}
function _saveProfile() {
    try { localStorage.setItem(_STORE, JSON.stringify(_fp.profile)); } catch(e) {}
}

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('founderProfile', { open: founderOpen }, {
        name: 'Founder Profile', icon: '👤', sectionId: 'founder-profile', defaultEnabled: true, sprint: 4
    });
    window._AUS_REGISTRY.register('learningCenter', { open: function(){ _fp.view='learn'; founderOpen(); } }, {
        name: 'Learning Center', icon: '📚', sectionId: 'founder-profile', defaultEnabled: true, sprint: 4
    });
}
window.founderOpen = founderOpen;

})();
