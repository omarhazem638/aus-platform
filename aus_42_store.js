/* ================================================================
   المتجر — كل الكتب والملفات القابلة للشراء في التطبيق، في مكان واحد
   نظام مستقل | يعيد استخدام نظام الدفع الحالي (aus_05_paywall.js) فقط
   لا يعيد بناء بطاقات الشراء ولا يمسّ أي نظام قائم
   ================================================================ */

// ── CSS INJECTION (نفس لغة الزجاج الذهبي/الداكن المستخدمة في المكتبة، RTL) ──
(function () {
    if (document.getElementById('store-styles')) return;
    var s = document.createElement('style');
    s.id = 'store-styles';
    s.textContent = `
    #store { padding: 1.5rem 0 4rem; }
    .store-hero { text-align: center; margin-bottom: 1.6rem; }
    .store-hero h2 { font-family: 'Orbitron','Tajawal',sans-serif; font-size: 1.9rem; margin: 0 0 .4rem;
        background: linear-gradient(135deg,#ffd700,#ff9500); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .store-hero p { color: rgba(255,255,255,.5); font-size: .95rem; margin: 0; }
    .store-discover-banner { text-align: center; max-width: 780px; margin: 0 auto 1.8rem; }
    .store-discover-text { font-family: 'Tajawal',sans-serif; font-size: 1.4rem; font-weight: 800; color: #ffd700;
        margin: 0 0 1.1rem; letter-spacing: .01em; animation: storeDiscoverGlow 2.6s ease-in-out infinite; }
    @keyframes storeDiscoverGlow {
        0%, 100% { text-shadow: 0 0 10px rgba(255,215,0,.35); }
        50% { text-shadow: 0 0 24px rgba(255,215,0,.8), 0 0 40px rgba(255,215,0,.25); }
    }
    @media(max-width:640px){ .store-discover-text { font-size: 1.15rem; } }
    .store-discover-icons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .store-discover-btn { display: flex; align-items: center; gap: .6rem; background: linear-gradient(135deg,rgba(255,215,0,.09),rgba(0,5,25,.6));
        border: 1px solid rgba(255,215,0,.3); border-radius: 14px; padding: .85rem 1.5rem; color: #fff; cursor: pointer;
        font-family: 'Tajawal',sans-serif; font-weight: 700; font-size: .9rem; transition: all .25s; }
    .store-discover-btn i { font-size: 1.3rem; color: #ffd700; }
    .store-discover-btn:hover { transform: translateY(-3px); border-color: rgba(255,215,0,.6); box-shadow: 0 10px 30px rgba(255,215,0,.15); }
    .store-discover-btn.dna { border-color: rgba(123,47,255,.35); background: linear-gradient(135deg,rgba(123,47,255,.09),rgba(0,5,25,.6)); }
    .store-discover-btn.dna i { color: #7b2fff; }
    .store-discover-btn.dna:hover { border-color: rgba(123,47,255,.6); box-shadow: 0 10px 30px rgba(123,47,255,.15); }
    .store-discover-arrows { display: flex; justify-content: center; gap: 4.5rem; margin: 0 0 .3rem; }
    .store-discover-arrows span { display: inline-block; font-size: 1.5rem; line-height: 1; color: rgba(255,215,0,.75);
        animation: storeArrowBounce 1.5s ease-in-out infinite; }
    .store-discover-arrows span:last-child { animation-delay: .25s; }
    @keyframes storeArrowBounce { 0%, 100% { transform: translateY(-3px); opacity: .5; } 50% { transform: translateY(6px); opacity: 1; } }
    @media(max-width:640px){ .store-discover-arrows { gap: 2.2rem; } }
    .store-stats { display: flex; gap: .9rem; flex-wrap: wrap; justify-content: center; margin: 1.4rem auto; max-width: 780px; }
    .store-stat { flex: 1; min-width: 140px; background: linear-gradient(135deg,rgba(255,215,0,.07),rgba(0,5,25,.5));
        border: 1px solid rgba(255,215,0,.22); border-radius: 16px; padding: 1rem 1.2rem; text-align: center; }
    .store-stat .v { font-family: 'Orbitron',monospace; font-size: 1.7rem; font-weight: 800; color: #ffd700; line-height: 1; }
    .store-stat .l { color: rgba(255,255,255,.55); font-size: .8rem; margin-top: .35rem; }
    .store-controls { display: flex; gap: .7rem; flex-wrap: wrap; align-items: center; justify-content: space-between; max-width: 980px; margin: 0 auto 1rem; }
    .store-search { flex: 1; min-width: 200px; position: relative; }
    .store-search input { width: 100%; background: rgba(0,10,30,.6); border: 1px solid rgba(255,215,0,.25); border-radius: 12px;
        padding: .7rem 2.4rem .7rem 1rem; color: #fff; font-family: 'Tajawal',sans-serif; font-size: .9rem; outline: none; }
    .store-search input:focus { border-color: rgba(255,215,0,.55); }
    .store-search i { position: absolute; inset-inline-start: .8rem; top: 50%; transform: translateY(-50%); color: rgba(255,215,0,.6); }
    .store-type-tabs { display: flex; gap: .4rem; background: rgba(0,10,30,.5); padding: .3rem; border-radius: 12px; border: 1px solid rgba(255,255,255,.08); }
    .store-type-tab { padding: .55rem 1.1rem; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,.6);
        cursor: pointer; font-family: 'Tajawal',sans-serif; font-weight: 700; font-size: .85rem; transition: all .25s; white-space: nowrap; }
    .store-type-tab.active { background: linear-gradient(135deg,#ffd700,#ff9500); color: #1a1000; }
    .store-archetype-tabs { display: flex; gap: .4rem; flex-wrap: wrap; justify-content: center; max-width: 980px; margin: 0 auto 1.6rem; }
    .store-arch-tab { padding: .5rem 1rem; border-radius: 50px; border: 1px solid rgba(255,255,255,.12); background: rgba(0,10,30,.4);
        color: rgba(255,255,255,.6); cursor: pointer; font-family: 'Tajawal',sans-serif; font-weight: 700; font-size: .78rem; transition: all .25s; }
    .store-arch-tab.active { background: linear-gradient(135deg,#00d4ff,#7b2fff); border-color: transparent; color: #fff; }
    .store-section-head { max-width: 980px; margin: 0 auto .8rem; }
    .store-section-head h3 { color: #fff; font-size: 1.1rem; margin: 0 0 .3rem; }
    .store-section-head p { color: rgba(255,255,255,.45); font-size: .82rem; margin: 0; }
    .store-block { max-width: 980px; margin: 0 auto 2.4rem; }
    .store-none { text-align: center; color: rgba(255,255,255,.4); padding: 2rem; grid-column: 1/-1; }
    @media(max-width:640px){ .store-controls{flex-direction:column;align-items:stretch;} .store-type-tabs{justify-content:center;} }
    `;
    document.head.appendChild(s);
})();

// ── State ──────────────────────────────────────────────────────────
var STORE_STATE = { search: '', typeFilter: 'all', archetypeTab: 'all' };

// ── Helpers ────────────────────────────────────────────────────────
function _storeArchetypes() {
    return Object.keys(typeof PERSONALITY_LABEL_AR !== 'undefined' ? PERSONALITY_LABEL_AR : {});
}
function _storeArchTabLabel(t) {
    if (t === 'all') return 'كل الأنماط';
    var emoji = (typeof PERSONALITY_EMOJI !== 'undefined' && PERSONALITY_EMOJI[t]) || '';
    var label = (typeof PERSONALITY_LABEL_AR !== 'undefined' && PERSONALITY_LABEL_AR[t]) || t;
    return emoji + ' ' + label;
}
function _storeMatchesSearch(text) {
    var q = (STORE_STATE.search || '').trim().toLowerCase();
    if (!q) return true;
    return (text || '').toLowerCase().indexOf(q) !== -1;
}
// Filters the already-rendered cards by text match instead of re-rendering —
// keeps this file from ever having to know the card's HTML shape, so it can
// never drift out of sync with renderPremiumGrid's markup.
function _storeApplySearch() {
    ['storeGridBooks', 'storeGridFiles'].forEach(function (gridId) {
        var grid = document.getElementById(gridId);
        if (!grid) return;
        var cards = grid.querySelectorAll('.premium-file');
        var visibleCount = 0;
        cards.forEach(function (card) {
            var match = _storeMatchesSearch(card.textContent);
            card.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });
        var noneEl = grid.parentElement ? grid.parentElement.querySelector('.store-none') : null;
        if (cards.length && !visibleCount) {
            if (!noneEl) {
                noneEl = document.createElement('div');
                noneEl.className = 'store-none';
                noneEl.textContent = 'لا توجد نتائج مطابقة لبحثك.';
                grid.parentElement.appendChild(noneEl);
            }
            noneEl.style.display = '';
        } else if (noneEl) {
            noneEl.style.display = 'none';
        }
    });
}
function _storeSyncControlsUI() {
    document.querySelectorAll('.store-type-tab').forEach(function (t) {
        t.classList.toggle('active', t.getAttribute('data-t') === STORE_STATE.typeFilter);
    });
    document.querySelectorAll('.store-arch-tab').forEach(function (t) {
        t.classList.toggle('active', t.getAttribute('data-a') === STORE_STATE.archetypeTab);
    });
    var booksBlock = document.getElementById('storeBooksBlock');
    var filesBlock = document.getElementById('storeFilesBlock');
    var archTabsBlock = document.getElementById('storeArchTabs');
    if (booksBlock) booksBlock.style.display = (STORE_STATE.typeFilter === 'all' || STORE_STATE.typeFilter === 'book') ? '' : 'none';
    if (filesBlock) filesBlock.style.display = (STORE_STATE.typeFilter === 'all' || STORE_STATE.typeFilter === 'file') ? '' : 'none';
    // Books aren't archetype-filtered by renderPremiumGrid (all 8 always show),
    // so the archetype tabs only ever affect the files grid — hide them when
    // books-only view is active to avoid implying they'd narrow the books list.
    if (archTabsBlock) archTabsBlock.style.display = (STORE_STATE.typeFilter === 'book') ? 'none' : '';
}
// The section headers used to say "20 د.أ لكل كتاب" / "10 د.أ لكل ملف". Prices are owner-editable now (Content Studio), so
// the hint is derived from the live catalog: one price → "N د.أ لكل …", several → "من A إلى B د.أ".
function _storePriceHint(list, noun) {
    var ps = list.map(function (f) { return +f.price || 0; });
    if (!ps.length) return '';
    var lo = Math.min.apply(null, ps), hi = Math.max.apply(null, ps);
    return lo === hi ? (lo + ' د.أ لكل ' + noun) : ('من ' + lo + ' إلى ' + hi + ' د.أ');
}
// Re-renders both grids via the paywall's own renderPremiumGrid — same cards,
// same buy/read buttons, same purchase state. activePremiumTab is a shared
// global from aus_05_paywall.js; syncing it here is what makes the reused
// file-filtering logic respect the store's own archetype tab selection.
function _storeRenderGrids() {
    if (typeof renderPremiumGrid !== 'function') return;
    activePremiumTab = STORE_STATE.archetypeTab;
    var booksGrid = document.getElementById('storeGridBooks');
    var filesGrid = document.getElementById('storeGridFiles');
    if (booksGrid) booksGrid.innerHTML = renderPremiumGrid('book');
    if (filesGrid) filesGrid.innerHTML = renderPremiumGrid('file');
}

// ── Render ─────────────────────────────────────────────────────────
window.renderStoreHub = function () {
    var sec = document.getElementById('store');
    if (!sec || typeof LEADERSHIP_FILES === 'undefined' || typeof renderPremiumGrid !== 'function') return;

    var purchased = (typeof getPurchased === 'function') ? getPurchased() : [];
    var allIds = LEADERSHIP_FILES.map(function (f) { return f.id; });
    var ownedValid = purchased.filter(function (id) { return allIds.indexOf(id) !== -1; });
    var books = LEADERSHIP_FILES.filter(function (f) { return f.type === 'book'; });
    var files = LEADERSHIP_FILES.filter(function (f) { return f.type === 'file'; });
    var archetypes = ['all'].concat(_storeArchetypes());

    sec.innerHTML =
        '<div class="store-hero"><h2>🛍️ المتجر</h2><p>كل الكتب والملفات القابلة للشراء في التطبيق — في مكان واحد</p></div>' +
        '<div class="store-discover-banner">' +
            '<p class="store-discover-text">تعرف على شخصيتك القيادية ثم طورها من القراءة</p>' +
            '<div class="store-discover-arrows"><span>↘</span><span>↙</span></div>' +
            '<div class="store-discover-icons">' +
                '<button class="store-discover-btn" onclick="showSection(\'leadership\')"><i class="fas fa-crown"></i><span>الشخصية القيادية</span></button>' +
                '<button class="store-discover-btn dna" onclick="showSection(\'careerdna\')"><i class="fas fa-dna"></i><span>DNA CAREER</span></button>' +
            '</div>' +
        '</div>' +
        '<div class="store-stats">' +
            '<div class="store-stat"><div class="v">' + LEADERSHIP_FILES.length + '</div><div class="l">إجمالي المنتجات</div></div>' +
            '<div class="store-stat"><div class="v">' + books.length + '</div><div class="l">📖 كتب</div></div>' +
            '<div class="store-stat"><div class="v">' + files.length + '</div><div class="l">📄 ملفات</div></div>' +
            '<div class="store-stat"><div class="v">' + ownedValid.length + '</div><div class="l">✓ مملوكة لك</div></div>' +
        '</div>' +
        '<div class="store-controls">' +
            '<div class="store-search"><i class="fas fa-search"></i>' +
            '<input id="store-search-input" type="text" placeholder="ابحث عن كتاب أو ملف..." oninput="storeOnSearch(this.value)"></div>' +
            '<div class="store-type-tabs">' +
                '<button class="store-type-tab" data-t="all" onclick="storeSetTypeFilter(\'all\')">الكل</button>' +
                '<button class="store-type-tab" data-t="book" onclick="storeSetTypeFilter(\'book\')">الكتب</button>' +
                '<button class="store-type-tab" data-t="file" onclick="storeSetTypeFilter(\'file\')">الملفات</button>' +
            '</div>' +
        '</div>' +
        '<div class="store-archetype-tabs" id="storeArchTabs">' +
            archetypes.map(function (a) {
                return '<button class="store-arch-tab" data-a="' + a + '" onclick="storeSetArchetypeTab(\'' + a + '\')">' + _storeArchTabLabel(a) + '</button>';
            }).join('') +
        '</div>' +
        '<div class="store-block" id="storeBooksBlock">' +
            '<div class="store-section-head"><h3>📚 الكتب الكاملة</h3><p>' + books.length + ' كتاب شامل · ' + _storePriceHint(books, 'كتاب') + ' · ' + ownedValid.filter(function(id){return id.indexOf('book-') === 0;}).length + '/' + books.length + ' مفعّل</p></div>' +
            '<div class="premium-grid" id="storeGridBooks"></div>' +
        '</div>' +
        '<div class="store-block" id="storeFilesBlock">' +
            '<div class="store-section-head"><h3>📄 الملفات المتقدّمة</h3><p>' + files.length + ' ملف متقدّم · ' + _storePriceHint(files, 'ملف') + '</p></div>' +
            '<div class="premium-grid" id="storeGridFiles"></div>' +
        '</div>';

    _storeRenderGrids();
    _storeSyncControlsUI();
    _storeApplySearch();
};

// ── Controls ───────────────────────────────────────────────────────
window.storeSetTypeFilter = function (t) {
    STORE_STATE.typeFilter = t;
    _storeSyncControlsUI();
    if (typeof sfxPlay === 'function') sfxPlay('hover');
};
window.storeSetArchetypeTab = function (t) {
    STORE_STATE.archetypeTab = t;
    activePremiumTab = t;
    var filesGrid = document.getElementById('storeGridFiles');
    if (filesGrid) filesGrid.innerHTML = renderPremiumGrid('file');
    _storeSyncControlsUI();
    _storeApplySearch();
    if (typeof sfxPlay === 'function') sfxPlay('hover');
};
window.storeOnSearch = function (v) {
    STORE_STATE.search = v;
    _storeApplySearch();
};

// Refresh the store's own grids right after an instant (PayPal) purchase so
// "buy" flips to "read" without leaving the tab. Wraps rather than edits
// aus_05_paywall.js's renderPaymentSuccess — same pattern library.js uses to
// hook showSection without touching the core file.
var _storeOrigRenderPaymentSuccess = window.renderPaymentSuccess;
window.renderPaymentSuccess = function (file) {
    if (typeof _storeOrigRenderPaymentSuccess === 'function') _storeOrigRenderPaymentSuccess(file);
    if (document.getElementById('storeGridBooks') || document.getElementById('storeGridFiles')) {
        _storeRenderGrids();
        _storeApplySearch();
    }
};

document.addEventListener('DOMContentLoaded', function () {
    var sec = document.getElementById('store');
    if (sec && sec.classList.contains('active')) window.renderStoreHub();
});
