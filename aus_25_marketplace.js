// =============================================================================
// aus_25_marketplace.js  —  STARTUP MARKETPLACE + INVESTOR HUB  (Module 6+7)
// Browse/list startups · Find investors · Investment pipeline · IR scores
// =============================================================================
(function () {
'use strict';

var _mp = { view: 'browse', listings: [], myListing: null, styleInjected: false };
var _STORE = 'aus.marketplace.listings';

// No seed/demo projects — every listing here comes from a real student or
// doctor account submitting their own project through the form below.
function _mpCurrentUser() { return (window.ausAuth && window.ausAuth.user) || null; }
function _mpCanSubmit() {
    var u = _mpCurrentUser();
    return !!u && (u.role === 'student' || u.role === 'doctor');
}

var _investors = [
    { name:'Raed Ventures',        focus:'B2B SaaS, FinTech',    stage:'Seed-Series A', ticket:'$250K–$2M',  flag:'🇸🇦' },
    { name:'500 Global MENA',      focus:'All sectors',           stage:'Pre-Seed-Seed', ticket:'$100K–$500K', flag:'🌍' },
    { name:'STV',                  focus:'Technology, Digital',   stage:'Series A-B',   ticket:'$5M+',        flag:'🇸🇦' },
    { name:'Wamda Capital',        focus:'EdTech, HealthTech',    stage:'Seed',          ticket:'$500K–$2M',   flag:'🇦🇪' },
    { name:'Global Ventures',      focus:'B2B, MarketTech',       stage:'Series A',      ticket:'$3M–$10M',    flag:'🇦🇪' },
    { name:'Arzan VC',             focus:'FinTech, Consumer',     stage:'Pre-Seed',      ticket:'$50K–$300K',  flag:'🇰🇼' },
];

var _sectors = ['All','EdTech','FinTech','HealthTech','AgriTech','PropTech','HRTech','RetailTech','GovTech','Logistics'];

function _css() {
    if (_mp.styleInjected) return;
    _mp.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#mp-wrap{padding:20px 16px 100px;max-width:900px;margin:0 auto}',
        '.mp-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#ffc800;letter-spacing:.1em;text-align:center;margin-bottom:4px}',
        '.mp-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.mp-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}',
        '.mp-tab{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:.78rem;font-weight:600;transition:all .2s;color:rgba(255,255,255,.5)}',
        '.mp-tab.active{background:rgba(255,200,0,.12);border-color:rgba(255,200,0,.4);color:#ffc800}',
        '.mp-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,200,0,.15);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.mp-card-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#ffc800;margin-bottom:12px;font-weight:700}',
        /* Filter bar */
        '.mp-filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}',
        '.mp-filter{font-size:.68rem;padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer;transition:all .2s}',
        '.mp-filter.active{background:rgba(255,200,0,.12);border-color:rgba(255,200,0,.4);color:#ffc800}',
        /* Listing card */
        '.mp-listing{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;margin-bottom:10px;transition:all .2s;cursor:pointer}',
        '.mp-listing:hover{border-color:rgba(255,200,0,.35);background:rgba(255,200,0,.04)}',
        '.mp-listing-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px}',
        '.mp-listing-logo{width:42px;height:42px;border-radius:10px;background:rgba(255,200,0,.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}',
        '.mp-listing-info{flex:1}',
        '.mp-listing-name{font-size:.92rem;font-weight:700;margin-bottom:3px}',
        '.mp-listing-tag{font-size:.65rem;color:rgba(255,255,255,.45)}',
        '.mp-listing-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:.68rem;color:rgba(255,255,255,.4)}',
        '.mp-badge{display:inline-block;font-size:.6rem;padding:2px 8px;border-radius:6px}',
        '.mp-badge-stage{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.25);color:#00d4ff}',
        '.mp-badge-sector{background:rgba(157,78,221,.1);border:1px solid rgba(157,78,221,.25);color:#c084fc}',
        '.mp-ir-badge{background:rgba(0,245,160,.1);border:1px solid rgba(0,245,160,.25);font-weight:700}',
        /* IR bar */
        '.mp-ir-row{display:flex;align-items:center;gap:8px}',
        '.mp-ir-track{flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}',
        '.mp-ir-fill{height:100%;border-radius:2px}',
        /* Investor cards */
        '.mp-inv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}',
        '@media(max-width:600px){.mp-inv-grid{grid-template-columns:1fr}}',
        '.mp-inv-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,200,0,.15);border-radius:12px;padding:14px}',
        '.mp-inv-name{font-size:.88rem;font-weight:700;margin-bottom:4px}',
        '.mp-inv-row{font-size:.7rem;color:rgba(255,255,255,.5);margin-bottom:3px;display:flex;gap:6px}',
        '.mp-inv-lbl{color:rgba(255,200,0,.7);min-width:55px}',
        /* Form */
        '.mp-input,.mp-textarea,.mp-select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;padding:9px 12px;font-size:.85rem;outline:none}',
        '.mp-input:focus,.mp-textarea:focus{border-color:rgba(255,200,0,.4)}',
        '.mp-label{font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:5px;letter-spacing:.06em}',
        '.mp-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}',
        '@media(max-width:600px){.mp-form-grid{grid-template-columns:1fr}}',
        '.mp-btn{padding:9px 18px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.8rem;font-weight:600;transition:all .2s}',
        '.mp-btn-gold{background:rgba(255,200,0,.12);border-color:rgba(255,200,0,.4);color:#ffc800}',
        '.mp-btn-gold:hover{background:rgba(255,200,0,.22)}',
        '.mp-btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.5)}',
        '.mp-btn-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
        '.mp-detail-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:6000;display:flex;align-items:center;justify-content:center;padding:20px}',
        '.mp-detail-box{background:#080e20;border:1px solid rgba(255,200,0,.3);border-radius:16px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;padding:24px}',
    ].join('');
    document.head.appendChild(s);
}

function marketOpen() {
    _css();
    _loadListings();
    var sec = document.getElementById('marketplace');
    if (!sec) return;
    sec.innerHTML = '<div id="mp-wrap"><div class="mp-title">🛒 Startup Marketplace</div>' +
        '<div class="mp-sub">اعرض مشروعك · ابحث عن مستثمر · تواصل مع الفرق</div>' +
        '<div class="mp-tabs">' +
        '<div class="mp-tab' + (_mp.view==='browse'?' active':'') + '" onclick="_mpView(\'browse\')">🔍 تصفح المشاريع</div>' +
        '<div class="mp-tab' + (_mp.view==='investors'?' active':'') + '" onclick="_mpView(\'investors\')">💼 مركز المستثمرين</div>' +
        '<div class="mp-tab' + (_mp.view==='list'?' active':'') + '" onclick="_mpView(\'list\')">+ اعرض مشروعك</div>' +
        '</div>' +
        '<div id="mp-content"></div></div>';
    _renderView();
}

window._mpView = function(v) {
    _mp.view = v;
    document.querySelectorAll('.mp-tab').forEach(function(t,i){
        t.classList.toggle('active', (v==='browse'&&i===0)||(v==='investors'&&i===1)||(v==='list'&&i===2));
    });
    _renderView();
};

function _renderView() {
    var el = document.getElementById('mp-content');
    if (!el) return;
    if (_mp.view === 'browse') el.innerHTML = _browseHTML();
    else if (_mp.view === 'investors') el.innerHTML = _investorsHTML();
    else el.innerHTML = _listHTML();
}

var _activeFilter = 'All';

function _roleBadgeHtml(submitter) {
    if (!submitter) return '';
    var isDoctor = submitter.role === 'doctor';
    return '<span class="mp-badge" style="background:' + (isDoctor ? 'rgba(0,245,160,.1);border:1px solid rgba(0,245,160,.25);color:#00f5a0' : 'rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.25);color:#00d4ff') + '">' +
        (isDoctor ? '👨‍🏫 دكتور' : '🎓 طالب') + ' — ' + _AUS_UTILS.sanitize(submitter.name || '') + '</span>';
}

function _browseHTML() {
    var allListings = _mp.listings || [];
    var filtered = _activeFilter === 'All' ? allListings : allListings.filter(function(l){ return l.sector === _activeFilter; });

    var filtersHtml = _sectors.map(function(s) {
        return '<div class="mp-filter' + (s===_activeFilter?' active':'') + '" onclick="_mpFilter(\'' + s + '\')">' + s + '</div>';
    }).join('');

    var listingsHtml = filtered.map(function(l) {
        var irColor = l.irScore >= 75 ? '#00f5a0' : l.irScore >= 55 ? '#ffc800' : '#ff9999';
        return '<div class="mp-listing" onclick="_mpDetail(\'' + l.id + '\')">' +
            '<div class="mp-listing-header">' +
            '<div class="mp-listing-logo">🚀</div>' +
            '<div class="mp-listing-info">' +
            '<div class="mp-listing-name">' + _AUS_UTILS.sanitize(l.name) + '</div>' +
            '<div class="mp-listing-tag">' + _AUS_UTILS.sanitize(l.tagline) + '</div>' +
            '</div>' +
            '<div style="text-align:right;flex-shrink:0">' +
            '<div class="mp-badge mp-ir-badge" style="color:' + irColor + '">IR: ' + l.irScore + '</div>' +
            '<div style="font-size:.68rem;color:rgba(255,200,0,.7);margin-top:4px">Ask: ' + _AUS_UTILS.currency(l.ask) + '</div>' +
            '</div></div>' +
            '<div class="mp-listing-meta">' +
            '<span class="mp-badge mp-badge-stage">' + l.stage + '</span>' +
            '<span class="mp-badge mp-badge-sector">' + l.sector + '</span>' +
            '<span>👥 ' + l.team + ' team</span>' +
            '</div>' +
            '<div style="margin-top:8px">' + _roleBadgeHtml(l.submittedBy) + '</div>' +
            '<div class="mp-ir-row" style="margin-top:8px">' +
            '<span style="font-size:.6rem;color:rgba(255,255,255,.3);width:50px">IR Score</span>' +
            '<div class="mp-ir-track"><div class="mp-ir-fill" style="width:' + l.irScore + '%;background:' + irColor + '"></div></div>' +
            '</div></div>';
    }).join('');

    return '<div class="mp-card"><div class="mp-card-title">' + filtered.length + ' مشاريع مدرجة من الطلاب والدكاترة</div>' +
        '<div class="mp-filters">' + filtersHtml + '</div>' +
        (listingsHtml || '<div style="text-align:center;padding:30px;color:rgba(255,255,255,.3)">لا توجد مشاريع بعد.<br>كن أول طالب أو دكتور يعرض مشروعه! ← تبويب "اعرض مشروعك"</div>') +
        '</div>';
}

window._mpFilter = function(sector) {
    _activeFilter = sector;
    var el = document.getElementById('mp-content');
    if (el) el.innerHTML = _browseHTML();
};

// ── Company profile (full detail view for one student/doctor-submitted project) ──
window._mpDetail = function(id) {
    var listing = (_mp.listings || []).find(function(l){ return l.id === id; });
    if (!listing) return;
    var overlay = document.createElement('div');
    overlay.className = 'mp-detail-overlay';
    overlay.id = 'mp-overlay';
    overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
    var irColor = listing.irScore >= 75 ? '#00f5a0' : listing.irScore >= 55 ? '#ffc800' : '#ff9999';
    var sub = listing.submittedBy;
    var listedDate = listing.listed ? new Date(listing.listed).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' }) : '';

    overlay.innerHTML = '<div class="mp-detail-box">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
        '<div style="font-family:Orbitron,sans-serif;font-size:1.05rem;color:#ffc800;flex:1">🚀 ' + _AUS_UTILS.sanitize(listing.name) + '</div>' +
        '<button style="background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:1.2rem" onclick="document.getElementById(\'mp-overlay\').remove()">×</button></div>' +
        '<div style="font-size:.78rem;color:rgba(255,255,255,.4);margin-bottom:14px">' + _AUS_UTILS.sanitize(listing.tagline||'') + '</div>' +

        '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,200,0,.15);border-radius:10px;padding:12px;margin-bottom:14px">' +
        '<div style="font-size:.6rem;letter-spacing:.1em;color:rgba(255,200,0,.6);margin-bottom:6px">👤 ملف المؤسس / مقدّم المشروع</div>' +
        (sub ? _roleBadgeHtml(sub) : '<span style="font-size:.75rem;color:rgba(255,255,255,.4)">غير معروف</span>') +
        (listedDate ? '<div style="font-size:.65rem;color:rgba(255,255,255,.3);margin-top:6px">تاريخ الإدراج: ' + listedDate + '</div>' : '') +
        '</div>' +

        '<div style="font-size:.6rem;letter-spacing:.1em;color:rgba(255,200,0,.6);margin-bottom:6px">📄 نبذة عن المشروع</div>' +
        '<div style="font-size:.85rem;color:rgba(255,255,255,.65);margin-bottom:14px;line-height:1.7">' + _AUS_UTILS.sanitize(listing.desc||'—') + '</div>' +

        '<div class="mp-listing-meta" style="margin-bottom:14px">' +
        '<span class="mp-badge mp-badge-stage">' + _AUS_UTILS.sanitize(listing.stage) + '</span>' +
        '<span class="mp-badge mp-badge-sector">' + _AUS_UTILS.sanitize(listing.sector) + '</span>' +
        '<span>👥 ' + listing.team + ' أعضاء الفريق</span>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
        '<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:10px;text-align:center"><div style="font-family:Orbitron,sans-serif;font-size:1rem;color:' + irColor + '">' + listing.irScore + '</div><div style="font-size:.6rem;color:rgba(255,255,255,.35)">IR SCORE</div></div>' +
        '<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:10px;text-align:center"><div style="font-family:Orbitron,sans-serif;font-size:1rem;color:#ffc800">' + _AUS_UTILS.currency(listing.ask) + '</div><div style="font-size:.6rem;color:rgba(255,255,255,.35)">التمويل المطلوب</div></div>' +
        '</div>' +
        '<button class="mp-btn mp-btn-gold" style="width:100%" onclick="_mpExpressInterest(\'' + _AUS_UTILS.sanitize(listing.name) + '\');document.getElementById(\'mp-overlay\').remove()">💼 أبدِ اهتمامك بهذا المشروع</button>' +
        '</div>';
    document.body.appendChild(overlay);
};

window._mpExpressInterest = function(name) {
    _AUS_UTILS.toast('تم إرسال اهتمامك في ' + name + ' ✓');
    window._AUS_BUS.emit('INVESTOR_INTERESTED', { project: name });
    window._AUS_BUS.emit('XP_AWARDED', { amount: 10 });
};

function _investorsHTML() {
    var invHtml = _investors.map(function(inv) {
        return '<div class="mp-inv-card">' +
            '<div class="mp-inv-name">' + inv.flag + ' ' + _AUS_UTILS.sanitize(inv.name) + '</div>' +
            '<div class="mp-inv-row"><span class="mp-inv-lbl">Focus:</span><span>' + inv.focus + '</span></div>' +
            '<div class="mp-inv-row"><span class="mp-inv-lbl">Stage:</span><span>' + inv.stage + '</span></div>' +
            '<div class="mp-inv-row"><span class="mp-inv-lbl">Ticket:</span><span style="color:#ffc800">' + inv.ticket + '</span></div>' +
            '<button class="mp-btn mp-btn-ghost" style="font-size:.65rem;padding:4px 12px;margin-top:8px" onclick="_mpContactInvestor(\'' + inv.name + '\')">تدرّب على التواصل (محاكاة)</button>' +
            '</div>';
    }).join('');

    return '<div class="mp-card">' +
        '<div class="mp-card-title">💼 خريطة مستثمري MENA — للتعرّف التعليمي فقط</div>' +
        '<div style="background:rgba(255,200,0,.06);border:1px solid rgba(255,200,0,.2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:.75rem;color:rgba(255,255,255,.6);line-height:1.7">' +
        'ℹ️ هذه أسماء جهات استثمار معروفة في المنطقة لأغراض التوعية التعليمية بخريطة السوق فقط — بدون أرقام هواتف أو روابط تواصل مباشرة، لأننا لا نملك علاقة أو تفويضاً حقيقياً معهم لنشر بيانات تواصل باسمهم. زر "تدرّب على التواصل" هو تمرين محاكاة داخل المنصة فقط ولا يرسل أي رسالة حقيقية.' +
        '</div>' +
        '<div class="mp-inv-grid">' + invHtml + '</div></div>';
}

window._mpContactInvestor = function(name) {
    _AUS_UTILS.toast('محاكاة: تم "إرسال" طلب تواصل تدريبي مع ' + name + ' ✓ (لا يصل لأي جهة حقيقية)');
    window._AUS_BUS.emit('XP_AWARDED', { amount: 5 });
};

function _listHTML() {
    if (!_mpCanSubmit()) {
        return '<div class="mp-card" style="text-align:center;padding:30px">' +
            '<div style="font-size:2rem;margin-bottom:10px">🔒</div>' +
            '<div class="mp-card-title" style="justify-content:center">إدراج المشاريع متاح للطلاب والدكاترة فقط</div>' +
            '<div style="font-size:.8rem;color:rgba(255,255,255,.45);line-height:1.7">سجّل دخولك بحساب طالب أو دكتور لتتمكن من عرض مشروعك في السوق.</div>' +
            '</div>';
    }
    return '<div class="mp-card"><div class="mp-card-title">+ إدراج مشروعك</div>' +
        '<div class="mp-form-grid">' +
        '<div><div class="mp-label">اسم المشروع</div><input class="mp-input" id="mp-name" placeholder="اسم شركتك"></div>' +
        '<div><div class="mp-label">القطاع</div><select class="mp-select" id="mp-sector">' + _sectors.slice(1).map(function(s){ return '<option>' + s + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div style="margin-bottom:12px"><div class="mp-label">وصف مختصر</div>' +
        '<input class="mp-input" id="mp-tagline" placeholder="جملة واحدة تصف مشروعك"></div>' +
        '<div class="mp-form-grid">' +
        '<div><div class="mp-label">المرحلة</div><select class="mp-select" id="mp-stage"><option>Idea</option><option>Validation</option><option>MVP</option><option>Traction</option><option>Growth</option></select></div>' +
        '<div><div class="mp-label">حجم الفريق</div><input class="mp-input" id="mp-team" type="number" min="1" value="2"></div>' +
        '</div>' +
        '<div style="margin-bottom:12px"><div class="mp-label">التمويل المطلوب (USD)</div>' +
        '<input class="mp-input" id="mp-ask" type="number" placeholder="500000"></div>' +
        '<div style="margin-bottom:12px"><div class="mp-label">وصف تفصيلي</div>' +
        '<textarea class="mp-textarea" id="mp-desc" placeholder="اشرح مشروعك بالتفصيل: المشكلة، الحل، التقدم..."></textarea></div>' +
        '<div class="mp-btn-row"><button class="mp-btn mp-btn-gold" onclick="_mpSubmitListing()">نشر المشروع ✓</button></div></div>';
}

window._mpSubmitListing = function() {
    if (!_mpCanSubmit()) { _AUS_UTILS.toast('إدراج المشاريع متاح للطلاب والدكاترة فقط', 'error'); return; }
    var name = (document.getElementById('mp-name')||{}).value||'';
    if (!name.trim()) { _AUS_UTILS.toast('أدخل اسم المشروع', 'error'); return; }
    var user = _mpCurrentUser();
    var listing = {
        id: 'u' + Date.now(),
        name: name.trim(),
        sector: (document.getElementById('mp-sector')||{}).value||'Technology',
        tagline: (document.getElementById('mp-tagline')||{}).value||'',
        stage: (document.getElementById('mp-stage')||{}).value||'Idea',
        team: parseInt((document.getElementById('mp-team')||{}).value||'2'),
        ask: parseInt((document.getElementById('mp-ask')||{}).value||'0'),
        desc: (document.getElementById('mp-desc')||{}).value||'',
        irScore: 60, listed: Date.now(),
        submittedBy: { name: user.full_name || user.email, role: user.role, userId: user.id }
    };
    _mp.listings.push(listing);
    _saveListings();
    window._AUS_BUS.emit('LISTING_CREATED', { name: listing.name });
    window._AUS_BUS.emit('XP_AWARDED', { amount: 25 });
    _AUS_UTILS.toast('تم إدراج مشروعك في السوق! ✓');
    _mp.view = 'browse'; marketOpen();
};

function _loadListings() {
    try { _mp.listings = JSON.parse(localStorage.getItem(_STORE) || '[]'); } catch(e) { _mp.listings = []; }
}
function _saveListings() {
    try { localStorage.setItem(_STORE, JSON.stringify(_mp.listings)); } catch(e) {}
}

if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('marketplace', { open: marketOpen }, {
        name: 'Startup Marketplace', icon: '🛒', sectionId: 'marketplace', defaultEnabled: true, sprint: 3
    });
    window._AUS_REGISTRY.register('investorHub', { open: function(){ _mp.view='investors'; marketOpen(); } }, {
        name: 'Investor Hub', icon: '💼', sectionId: 'marketplace', defaultEnabled: true, sprint: 3
    });
}
window.marketOpen = marketOpen;

})();
