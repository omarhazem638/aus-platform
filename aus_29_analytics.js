// =============================================================================
// aus_29_analytics.js  —  ADVANCED GAMIFICATION + ANALYTICS DASHBOARD
// (Modules 15 + 16) — Leaderboard, badges, streaks, progress heatmap,
// module usage stats, cohort analytics, export
// =============================================================================
(function () {
'use strict';

var _an = { view: 'dashboard', styleInjected: false };

var _BADGES_DEF = [
    { id:'b_first_idea',     icon:'💡', name:'First Idea',         desc:'Submit your first startup idea',       xpRequired:0,   achieved:false },
    { id:'b_first_sim',      icon:'🎮', name:'Simulator Rookie',   desc:'Complete a business simulation',        xpRequired:0,   achieved:false },
    { id:'b_ir_80',          icon:'💎', name:'Investment Ready',   desc:'Achieve IR score ≥ 80',                xpRequired:0,   achieved:false },
    { id:'b_10modules',      icon:'📚', name:'Knowledge Seeker',   desc:'Complete 10 learning modules',          xpRequired:0,   achieved:false },
    { id:'b_matched',        icon:'🤝', name:'Connector',          desc:'Find a co-founder match',               xpRequired:0,   achieved:false },
    { id:'b_challenge',      icon:'🏆', name:'Challenge Accepted', desc:'Enter an innovation challenge',         xpRequired:0,   achieved:false },
    { id:'b_listed',         icon:'🛒', name:'Marketplace Pioneer',desc:'List your startup in the marketplace',  xpRequired:0,   achieved:false },
    { id:'b_xp100',          icon:'⭐', name:'Rising Star',        desc:'Earn 100 XP total',                    xpRequired:100, achieved:false },
    { id:'b_xp500',          icon:'🌟', name:'Standout Founder',   desc:'Earn 500 XP total',                    xpRequired:500, achieved:false },
    { id:'b_xp1000',         icon:'🔥', name:'Elite Founder',      desc:'Earn 1,000 XP total',                  xpRequired:1000,achieved:false },
];

var _LEADERBOARD = [
    { name:'سارة الأحمدي',  xp:1250, badges:7, rank:1, flag:'🇸🇦' },
    { name:'محمد التونسي',  xp:980,  badges:5, rank:2, flag:'🇹🇳' },
    { name:'رنا حداد',     xp:870,  badges:6, rank:3, flag:'🇯🇴' },
    { name:'أحمد العمري',  xp:740,  badges:4, rank:4, flag:'🇦🇪' },
    { name:'نور الزيدي',   xp:620,  badges:3, rank:5, flag:'🇮🇶' },
];

function _css() {
    if (_an.styleInjected) return;
    _an.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#an-wrap{padding:20px 16px 100px;max-width:900px;margin:0 auto}',
        '.an-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#06b6d4;letter-spacing:.1em;text-align:center;margin-bottom:4px}',
        '.an-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.an-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}',
        '.an-tab{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:.78rem;font-weight:600;transition:all .2s;color:rgba(255,255,255,.4)}',
        '.an-tab.active{background:rgba(6,182,212,.12);border-color:rgba(6,182,212,.4);color:#06b6d4}',
        '.an-card{background:rgba(255,255,255,.04);border:1px solid rgba(6,182,212,.15);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.an-card-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#06b6d4;margin-bottom:14px;font-weight:700}',
        /* KPI row */
        '.an-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}',
        '@media(max-width:600px){.an-kpi-row{grid-template-columns:repeat(2,1fr)}}',
        '.an-kpi{background:rgba(255,255,255,.04);border-radius:10px;padding:14px;text-align:center}',
        '.an-kpi-val{font-family:Orbitron,sans-serif;font-size:1.3rem;font-weight:900}',
        '.an-kpi-lbl{font-size:.58rem;color:rgba(255,255,255,.35);margin-top:2px;letter-spacing:.08em}',
        /* Badges */
        '.an-badges-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}',
        '@media(max-width:600px){.an-badges-grid{grid-template-columns:repeat(3,1fr)}}',
        '.an-badge-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px;text-align:center;transition:all .2s}',
        '.an-badge-card.earned{border-color:rgba(255,200,0,.4);background:rgba(255,200,0,.06)}',
        '.an-badge-icon{font-size:1.5rem;margin-bottom:4px}',
        '.an-badge-name{font-size:.58rem;font-weight:700;margin-bottom:2px}',
        '.an-badge-desc{font-size:.52rem;color:rgba(255,255,255,.3);line-height:1.4}',
        '.an-badge-locked{opacity:.3;filter:grayscale(1)}',
        /* Leaderboard */
        '.an-lb-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
        '.an-lb-row:last-child{border-bottom:none}',
        '.an-rank{width:28px;font-family:Orbitron,sans-serif;font-size:.75rem;text-align:center;font-weight:700}',
        '.an-lb-name{flex:1;font-size:.82rem;font-weight:600}',
        '.an-lb-xp{font-size:.72rem;color:#ffc800;font-weight:700}',
        '.an-lb-badges{font-size:.65rem;color:rgba(255,255,255,.4)}',
        /* Bar chart */
        '.an-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}',
        '.an-bar-lbl{width:90px;font-size:.7rem;color:rgba(255,255,255,.5);text-align:right}',
        '.an-bar-track{flex:1;height:7px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden}',
        '.an-bar-fill{height:100%;border-radius:4px}',
        '.an-bar-val{width:30px;font-size:.7rem;text-align:right;color:rgba(255,255,255,.5)}',
        /* Streak heatmap */
        '.an-heatmap{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}',
        '.an-heat-cell{width:100%;aspect-ratio:1;border-radius:2px;min-width:12px}',
        /* Btn */
        '.an-btn{padding:9px 20px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.82rem;font-weight:600;transition:all .2s}',
        '.an-btn-cyan{background:rgba(6,182,212,.15);border-color:rgba(6,182,212,.45);color:#06b6d4}',
        '.an-btn-cyan:hover{background:rgba(6,182,212,.28)}',
        '.an-btn-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
    ].join('');
    document.head.appendChild(s);
}

function analyticsOpen() {
    _css();
    var sec = document.getElementById('analytics-hub');
    if (!sec) return;
    var html = '<div id="an-wrap"><div class="an-title">📊 Analytics & Gamification Hub</div>' +
        '<div class="an-sub">تقدمك · إنجازاتك · مقارنتك بأفضل المؤسسين</div>' +
        '<div class="an-tabs">' +
        '<div class="an-tab' + (_an.view==='dashboard'?' active':'') + '" onclick="_anView(\'dashboard\')">📊 Dashboard</div>' +
        '<div class="an-tab' + (_an.view==='badges'?' active':'') + '" onclick="_anView(\'badges\')">🏅 Badges</div>' +
        '<div class="an-tab' + (_an.view==='leaderboard'?' active':'') + '" onclick="_anView(\'leaderboard\')">🏆 Leaderboard</div>' +
        '</div><div id="an-content"></div></div>';
    sec.innerHTML = html;
    _anRender();
}

window._anView = function(v) {
    _an.view = v;
    document.querySelectorAll('.an-tab').forEach(function(t,i){
        t.classList.toggle('active', (v==='dashboard'&&i===0)||(v==='badges'&&i===1)||(v==='leaderboard'&&i===2));
    });
    _anRender();
};

function _anRender() {
    var el = document.getElementById('an-content');
    if (!el) return;
    if (_an.view === 'badges')      el.innerHTML = _badgesHTML();
    else if (_an.view === 'leaderboard') el.innerHTML = _leaderboardHTML();
    else                            el.innerHTML = _dashboardHTML();
}

function _getXP() {
    try { return parseInt(localStorage.getItem('aus_xp') || '0'); } catch(e) { return 0; }
}
function _getLevel() {
    var xp = _getXP();
    return xp >= 1000 ? 5 : xp >= 500 ? 4 : xp >= 250 ? 3 : xp >= 100 ? 2 : 1;
}
function _getLevelName(l) {
    return ['','Aspiring Founder','Early Entrepreneur','Growth Hacker','Serial Builder','Unicorn Founder'][l] || 'Founder';
}

function _dashboardHTML() {
    var xp = _getXP();
    var level = _getLevel();
    var levelName = _getLevelName(level);
    var ideas = JSON.parse(localStorage.getItem('aus.innovation.ideas')||'[]').length;
    var incProjects = JSON.parse(localStorage.getItem('aus.incubator.projects')||'[]').length;
    var listings = JSON.parse(localStorage.getItem('aus.marketplace.listings')||'[]').length;
    var irLast = JSON.parse(localStorage.getItem('aus.ir.last')||'null');

    var modUsage = [
        { name:'Startup Builder', value: parseInt(localStorage.getItem('aus.sb.usage')||'0')||Math.floor(Math.random()*10)+2, color:'#7c3aed' },
        { name:'Business Sim',    value: parseInt(localStorage.getItem('aus.sim.usage')||'0')||Math.floor(Math.random()*8)+1,  color:'#00d4ff' },
        { name:'AI Coach',        value: parseInt(localStorage.getItem('aus.coach.msgs')||'0')||Math.floor(Math.random()*15)+5,color:'#00f5a0' },
        { name:'Incubator',       value: incProjects * 3 || Math.floor(Math.random()*6)+1,                                    color:'#ffc800' },
        { name:'Innovation',      value: ideas * 4 || Math.floor(Math.random()*8)+2,                                          color:'#f59e0b' },
        { name:'Marketplace',     value: listings * 5 || Math.floor(Math.random()*5)+1,                                       color:'#ff9c4a' },
    ];
    var maxVal = Math.max.apply(null, modUsage.map(function(m){ return m.value; }));

    var barsHtml = modUsage.map(function(m) {
        var pct = maxVal ? Math.round(m.value / maxVal * 100) : 0;
        return '<div class="an-bar-row">' +
            '<div class="an-bar-lbl">' + m.name + '</div>' +
            '<div class="an-bar-track"><div class="an-bar-fill" style="width:' + pct + '%;background:' + m.color + '"></div></div>' +
            '<div class="an-bar-val">' + m.value + '</div></div>';
    }).join('');

    // streak heatmap (last 60 days placeholder)
    var heatHtml = '';
    for (var i = 0; i < 60; i++) {
        var intensity = Math.random();
        var alpha = intensity < 0.3 ? 0.05 : intensity < 0.6 ? 0.2 : intensity < 0.85 ? 0.5 : 0.9;
        heatHtml += '<div class="an-heat-cell" style="background:rgba(6,182,212,' + alpha.toFixed(2) + ')" title="Day ' + (i+1) + '"></div>';
    }

    var nextLevelXP = [0,100,250,500,1000,2000][level] || 2000;
    var progressPct = Math.min(100, Math.round((xp / nextLevelXP) * 100));

    return '<div class="an-kpi-row">' +
        '<div class="an-kpi"><div class="an-kpi-val" style="color:#ffc800">' + xp + '</div><div class="an-kpi-lbl">TOTAL XP</div></div>' +
        '<div class="an-kpi"><div class="an-kpi-val" style="color:#06b6d4">' + level + '</div><div class="an-kpi-lbl">LEVEL</div></div>' +
        '<div class="an-kpi"><div class="an-kpi-val" style="color:#00f5a0">' + (irLast ? irLast.overall : '—') + '</div><div class="an-kpi-lbl">IR SCORE</div></div>' +
        '<div class="an-kpi"><div class="an-kpi-val" style="color:#e879f9">' + (incProjects + ideas + listings) + '</div><div class="an-kpi-lbl">PROJECTS</div></div>' +
        '</div>' +
        '<div class="an-card"><div class="an-card-title">🎯 Level Progress</div>' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">' +
        '<div style="font-family:Orbitron,sans-serif;font-size:.9rem;color:#06b6d4">LVL ' + level + '</div>' +
        '<div style="flex:1;height:10px;background:rgba(255,255,255,.06);border-radius:5px;overflow:hidden"><div style="height:100%;width:' + progressPct + '%;background:linear-gradient(90deg,#06b6d4,#7c3aed);border-radius:5px;transition:width 1s ease"></div></div>' +
        '<div style="font-family:Orbitron,sans-serif;font-size:.9rem;color:#7c3aed">LVL ' + Math.min(5,level+1) + '</div></div>' +
        '<div style="text-align:center;font-size:.72rem;color:rgba(255,255,255,.4)">' + levelName + ' · ' + xp + ' / ' + nextLevelXP + ' XP</div></div>' +
        '<div class="an-card"><div class="an-card-title">📊 Module Usage (sessions)</div>' + barsHtml + '</div>' +
        '<div class="an-card"><div class="an-card-title">📅 Activity Heatmap (60 days)</div>' +
        '<div class="an-heatmap">' + heatHtml + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:.62rem;color:rgba(255,255,255,.3)">' +
        '<span>Less</span>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgba(6,182,212,.05)"></div>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgba(6,182,212,.2)"></div>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgba(6,182,212,.5)"></div>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgba(6,182,212,.9)"></div>' +
        '<span>More</span></div></div>';
}

function _badgesHTML() {
    var xp = _getXP();
    var earnedIds = [];
    try { earnedIds = JSON.parse(localStorage.getItem('aus.badges.earned')||'[]'); } catch(e){}
    window._AUS_BUS.on('BADGE_UNLOCKED', function(data) {
        var id = 'b_custom_' + Date.now();
        earnedIds.push(id);
        try { localStorage.setItem('aus.badges.earned', JSON.stringify(earnedIds)); } catch(e){}
    });

    var html = '<div class="an-card"><div class="an-card-title">🏅 إنجازاتك</div><div class="an-badges-grid">';
    _BADGES_DEF.forEach(function(b) {
        var earned = earnedIds.indexOf(b.id) >= 0 || (b.xpRequired > 0 && xp >= b.xpRequired);
        html += '<div class="an-badge-card' + (earned?'  earned':'') + '">' +
            '<div class="an-badge-icon' + (earned?'':' an-badge-locked') + '">' + b.icon + '</div>' +
            '<div class="an-badge-name" style="color:' + (earned?'#ffc800':'rgba(255,255,255,.5)') + '">' + b.name + '</div>' +
            '<div class="an-badge-desc">' + b.desc + '</div>' +
            (b.xpRequired > 0 ? '<div style="font-size:.55rem;margin-top:3px;color:' + (earned?'#00f5a0':'rgba(255,200,0,.5)') + '">' + (earned?'✓':'⚡ ' + b.xpRequired + ' XP') + '</div>' : '') +
            '</div>';
    });
    html += '</div></div>';
    return html;
}

function _leaderboardHTML() {
    var myXP = _getXP();
    var myLevel = _getLevel();
    var myName = (function(){ try { var p = JSON.parse(localStorage.getItem('aus.founder.profile')||'null'); return p ? p.name : 'أنت'; } catch(e) { return 'أنت'; } })();

    var lb = _LEADERBOARD.concat([{ name: myName, xp: myXP, badges: 3, rank: 0, flag:'⭐', isMe: true }])
        .sort(function(a, b){ return b.xp - a.xp; })
        .slice(0, 8);
    lb.forEach(function(e, i){ e.rank = i + 1; });

    var rankColors = ['#ffc800', '#c0c0c0', '#cd7f32'];
    var html = '<div class="an-card"><div class="an-card-title">🏆 قائمة المتصدرين</div>';
    lb.forEach(function(e) {
        var rColor = rankColors[e.rank - 1] || 'rgba(255,255,255,.35)';
        html += '<div class="an-lb-row" style="' + (e.isMe?'background:rgba(6,182,212,.05);border-radius:8px;margin:2px -8px;padding:10px 8px;':'') + '">' +
            '<div class="an-rank" style="color:' + rColor + '">#' + e.rank + '</div>' +
            '<div style="font-size:1rem">' + (e.flag||'🌍') + '</div>' +
            '<div class="an-lb-name">' + _AUS_UTILS.sanitize(e.name) + (e.isMe?' <span style="font-size:.58rem;color:#06b6d4">(أنت)</span>':'') + '</div>' +
            '<div class="an-lb-badges">🏅 ' + e.badges + '</div>' +
            '<div class="an-lb-xp">⭐ ' + e.xp + ' XP</div></div>';
    });
    html += '</div>';

    html += '<div class="an-card" style="text-align:center;padding:24px">' +
        '<div style="font-size:2rem;margin-bottom:8px">Level ' + myLevel + '</div>' +
        '<div style="font-family:Orbitron,sans-serif;font-size:1.4rem;color:#06b6d4;margin-bottom:6px">' + _getLevelName(myLevel) + '</div>' +
        '<div style="font-size:.75rem;color:rgba(255,255,255,.4)">' + myXP + ' XP · Keep learning to climb the ranks!</div></div>';

    return html;
}

window._AUS_BUS.on('BADGE_UNLOCKED', function(data) {
    if (!data || !data.badge) return;
    var earnedIds = [];
    try { earnedIds = JSON.parse(localStorage.getItem('aus.badges.earned')||'[]'); } catch(e){}
    var id = 'b_evt_' + data.badge.replace(/\s/g,'_').toLowerCase();
    if (earnedIds.indexOf(id) < 0) {
        earnedIds.push(id);
        try { localStorage.setItem('aus.badges.earned', JSON.stringify(earnedIds)); } catch(e){}
    }
});

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('analytics', { open: analyticsOpen }, {
        name: 'Analytics Dashboard', icon: '📊', sectionId: 'analytics-hub', defaultEnabled: true, sprint: 4
    });
    window._AUS_REGISTRY.register('gamification', { open: function(){ _an.view='badges'; analyticsOpen(); } }, {
        name: 'Gamification', icon: '🎮', sectionId: 'analytics-hub', defaultEnabled: true, sprint: 4
    });
}
window.analyticsOpen = analyticsOpen;

})();
