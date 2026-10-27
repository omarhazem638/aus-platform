/* ================================================================
   مكتبتي — تجمع كل الكتب والملفات المشتراة في مكان واحد
   نظام مستقل | لا يمسّ أي نظام قائم | AUS Platform
   ================================================================ */

// ── CSS INJECTION (cinematic gold/dark, RTL) ───────────────────────
(function () {
  if (document.getElementById('lib-styles')) return;
  var s = document.createElement('style');
  s.id = 'lib-styles';
  s.textContent = `
  #library { padding: 1.5rem 0 4rem; }
  .lib-hero { text-align: center; margin-bottom: 1.6rem; }
  .lib-hero h2 { font-family: 'Orbitron','Tajawal',sans-serif; font-size: 1.9rem; margin: 0 0 .4rem;
    background: linear-gradient(135deg,#ffd700,#ff9500); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .lib-hero p { color: rgba(255,255,255,.5); font-size: .95rem; margin: 0; }
  .lib-stats { display: flex; gap: .9rem; flex-wrap: wrap; justify-content: center; margin: 1.4rem auto; max-width: 720px; }
  .lib-stat { flex: 1; min-width: 150px; background: linear-gradient(135deg,rgba(255,215,0,.07),rgba(0,5,25,.5));
    border: 1px solid rgba(255,215,0,.22); border-radius: 16px; padding: 1rem 1.2rem; text-align: center; }
  .lib-stat .v { font-family: 'Orbitron',monospace; font-size: 1.7rem; font-weight: 800; color: #ffd700; line-height: 1; }
  .lib-stat .l { color: rgba(255,255,255,.55); font-size: .8rem; margin-top: .35rem; }
  .lib-controls { display: flex; gap: .7rem; flex-wrap: wrap; align-items: center; justify-content: space-between; max-width: 980px; margin: 0 auto 1.3rem; }
  .lib-search { flex: 1; min-width: 200px; position: relative; }
  .lib-search input { width: 100%; background: rgba(0,10,30,.6); border: 1px solid rgba(255,215,0,.25); border-radius: 12px;
    padding: .7rem 2.4rem .7rem 1rem; color: #fff; font-family: 'Tajawal',sans-serif; font-size: .9rem; outline: none; }
  .lib-search input:focus { border-color: rgba(255,215,0,.55); }
  .lib-search i { position: absolute; inset-inline-start: .8rem; top: 50%; transform: translateY(-50%); color: rgba(255,215,0,.6); }
  .lib-tabs { display: flex; gap: .4rem; background: rgba(0,10,30,.5); padding: .3rem; border-radius: 12px; border: 1px solid rgba(255,255,255,.08); }
  .lib-tab { padding: .55rem 1.1rem; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,.6);
    cursor: pointer; font-family: 'Tajawal',sans-serif; font-weight: 700; font-size: .85rem; transition: all .25s; white-space: nowrap; }
  .lib-tab.active { background: linear-gradient(135deg,#ffd700,#ff9500); color: #1a1000; }
  .lib-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 1rem; max-width: 980px; margin: 0 auto; }
  .lib-card { background: linear-gradient(135deg,rgba(8,12,30,.92),rgba(0,5,20,.95)); border: 1px solid rgba(255,255,255,.1);
    border-radius: 18px; padding: 1.2rem; transition: all .3s; position: relative; overflow: hidden; display: flex; flex-direction: column; }
  .lib-card.book { border-color: rgba(255,215,0,.32); }
  .lib-card:hover { transform: translateY(-4px); border-color: rgba(255,215,0,.55); box-shadow: 0 16px 40px rgba(0,0,0,.5); }
  .lib-card-top { display: flex; gap: .85rem; align-items: flex-start; margin-bottom: .7rem; }
  .lib-cover { width: 54px; height: 54px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
    font-size: 1.7rem; flex-shrink: 0; background: linear-gradient(135deg,#00d4ff,#7b2fff); box-shadow: 0 6px 18px rgba(0,0,0,.4); }
  .lib-card.book .lib-cover { background: linear-gradient(135deg,#ffd700,#ff9500); box-shadow: 0 6px 18px rgba(255,183,0,.4); }
  .lib-card-title { color: #fff; font-weight: 800; font-size: 1rem; line-height: 1.4; margin-bottom: 2px; }
  .lib-card-sub { color: rgba(255,215,0,.7); font-size: .78rem; font-style: italic; }
  .lib-badge { display: inline-block; font-size: .66rem; border-radius: 50px; padding: 2px 10px; font-weight: 800; margin-top: 5px; }
  .lib-badge.book { background: rgba(255,215,0,.18); border: 1px solid rgba(255,215,0,.45); color: #ffd700; }
  .lib-badge.file { background: rgba(0,212,255,.15); border: 1px solid rgba(0,212,255,.4); color: #00d4ff; }
  .lib-card-meta { color: rgba(255,255,255,.45); font-size: .76rem; margin: .3rem 0 .6rem; display: flex; gap: .8rem; flex-wrap: wrap; }
  .lib-gen { background: rgba(0,212,255,.08); border: 1px solid rgba(0,212,255,.22); border-radius: 10px;
    padding: .45rem .7rem; font-size: .74rem; color: rgba(0,212,255,.85); margin-bottom: .7rem; }
  .lib-card-actions { display: flex; gap: .5rem; margin-top: auto; }
  .lib-btn { flex: 1; border: none; border-radius: 11px; padding: .65rem .5rem; cursor: pointer; font-family: 'Tajawal',sans-serif;
    font-weight: 700; font-size: .82rem; transition: all .25s; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .lib-btn.read { background: linear-gradient(135deg,#ffd700,#ff9500); color: #1a1000; }
  .lib-btn.read:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .lib-btn.ai { background: rgba(0,212,255,.12); border: 1px solid rgba(0,212,255,.35); color: #00d4ff; }
  .lib-btn.ai:hover { background: rgba(0,212,255,.2); }
  .lib-empty { text-align: center; padding: 3rem 1.5rem; max-width: 520px; margin: 1rem auto; }
  .lib-empty .ic { font-size: 3.5rem; margin-bottom: 1rem; opacity: .7; }
  .lib-empty h3 { color: #fff; font-size: 1.3rem; margin: 0 0 .6rem; }
  .lib-empty p { color: rgba(255,255,255,.5); line-height: 1.8; margin: 0 0 1.4rem; }
  .lib-empty button { background: linear-gradient(135deg,#ffd700,#ff9500); color: #1a1000; border: none; border-radius: 12px;
    padding: .8rem 1.8rem; font-family: 'Tajawal',sans-serif; font-weight: 800; font-size: .95rem; cursor: pointer; }
  .lib-empty button:hover { filter: brightness(1.1); transform: translateY(-2px); }
  .lib-none { text-align: center; color: rgba(255,255,255,.4); padding: 2rem; grid-column: 1/-1; }
  @media(max-width:640px){ .lib-controls{flex-direction:column;align-items:stretch;} .lib-tabs{justify-content:center;} }
  `;
  document.head.appendChild(s);
})();

// ── State ──────────────────────────────────────────────────────────
var LIB_STATE = { filter: 'all', search: '', cached: {} };      // cached: ids whose full text is already saved on this device (IndexedDB)

// ── Helpers ────────────────────────────────────────────────────────
function _libOwnedItems() {
  if (typeof LEADERSHIP_FILES === 'undefined' || typeof getPurchased !== 'function') return [];
  var owned = getPurchased();
  return LEADERSHIP_FILES.filter(function (f) { return owned.indexOf(f.id) !== -1; });
}

// Chapters / words of a book's AI-generated chapters. They are kept as counters next to the chapters (AUS_BOOKS, IndexedDB), so this is a
// lookup — it used to JSON.parse the whole 100,000-word book from localStorage for every card, on every render and every keystroke.
function _libGenInfo(id) {
  var m = window.AUS_BOOKS ? AUS_BOOKS.gen.peekMeta(id) : null;
  return m && m.chapters > 0 ? { chapters: m.chapters, words: m.words } : null;
}

// The counters and the offline list live in IndexedDB, so they arrive a moment after the first paint: ask once, repaint only if they changed.
function _libStorageSig() {
  var ids = _libOwnedItems().filter(function (f) { return f.type === 'book'; }).map(function (f) { return f.id; });
  return JSON.stringify([ids.map(function (id) { var m = AUS_BOOKS.gen.peekMeta(id); return m ? m.chapters + ':' + m.words : ''; }), Object.keys(LIB_STATE.cached).sort()]);
}
function _libRefreshStorage() {
  if (!window.AUS_BOOKS) return;
  var before = _libStorageSig();
  var ids = _libOwnedItems().filter(function (f) { return f.type === 'book'; }).map(function (f) { return f.id; });
  Promise.all([AUS_BOOKS.gen.metaMany(ids), AUS_BOOKS.cachedIds()]).then(function (r) {
    var c = {};
    r[1].forEach(function (id) { c[id] = true; });
    LIB_STATE.cached = c;
    if (_libStorageSig() !== before) libRenderGrid();
  }).catch(function () {});
}

// Everything bought is fetched once, quietly, while the library is open: the first reading is then instant and works offline.
// (One small manifest request tells which texts are missing or changed — see AUS_BOOKS.warm.)
var _libWarmed = false;
function _libWarmOwned() {
  if (_libWarmed || !window.AUS_BOOKS || navigator.onLine === false) return;
  try { if (navigator.connection && navigator.connection.saveData) return; } catch (e) {}
  _libWarmed = true;
  var ids = _libOwnedItems().map(function (f) { return f.id; });
  setTimeout(function () { AUS_BOOKS.warm(ids).then(_libRefreshStorage).catch(function () {}); }, 800);
}

function _libEsc(t) { return (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;'); }

// ── Render ─────────────────────────────────────────────────────────
function libInit() {
  var sec = document.getElementById('library');
  if (!sec) return;
  var items = _libOwnedItems();

  // Empty state — nothing purchased yet
  if (!items.length) {
    sec.innerHTML =
      '<div class="lib-hero"><h2>📚 مكتبتي</h2><p>كل ما تشتريه من كتب وملفات يُجمع هنا تلقائياً</p></div>' +
      '<div class="lib-empty">' +
      '<div class="ic">🗄️</div>' +
      '<h3>مكتبتك فارغة الآن</h3>' +
      '<p>لم تشترِ أي كتاب أو ملف بعد. تصفّح المتجر واقتنِ ما يناسب شخصيتك القيادية — وسيظهر هنا مباشرة بعد الشراء.</p>' +
      '<button onclick="showSection(\'store\')"><i class="fas fa-store"></i> تصفّح المتجر</button>' +
      '</div>';
    return;
  }

  var books = items.filter(function (f) { return f.type === 'book'; });
  var files = items.filter(function (f) { return f.type !== 'book'; });
  var spent = items.reduce(function (s, f) { return s + (f.price || 0); }, 0);

  sec.innerHTML =
    '<div class="lib-hero"><h2>📚 مكتبتي</h2><p>كل كتبك وملفاتك المشتراة في مكان واحد</p></div>' +
    '<div class="lib-stats">' +
    '<div class="lib-stat"><div class="v">' + items.length + '</div><div class="l">إجمالي العناصر</div></div>' +
    '<div class="lib-stat"><div class="v">' + books.length + '</div><div class="l">📖 كتب</div></div>' +
    '<div class="lib-stat"><div class="v">' + files.length + '</div><div class="l">📄 ملفات</div></div>' +
    '<div class="lib-stat"><div class="v">' + spent + '</div><div class="l">د.أ أُنفقت</div></div>' +
    '</div>' +
    '<div class="lib-controls">' +
    '<div class="lib-search"><i class="fas fa-search"></i>' +
    '<input id="lib-search-input" type="text" placeholder="ابحث في مكتبتك..." oninput="libOnSearch(this.value)"></div>' +
    '<div class="lib-tabs">' +
    '<button class="lib-tab" data-f="all" onclick="libSetFilter(\'all\')">الكل</button>' +
    '<button class="lib-tab" data-f="book" onclick="libSetFilter(\'book\')">الكتب</button>' +
    '<button class="lib-tab" data-f="file" onclick="libSetFilter(\'file\')">الملفات</button>' +
    '</div>' +
    '</div>' +
    '<div class="lib-grid" id="lib-grid"></div>';

  libRenderGrid();
  _libRefreshStorage();
  _libWarmOwned();
}

function libRenderGrid() {
  var grid = document.getElementById('lib-grid');
  if (!grid) return;
  var items = _libOwnedItems();
  var q = (LIB_STATE.search || '').trim().toLowerCase();

  var list = items.filter(function (f) {
    if (LIB_STATE.filter === 'book' && f.type !== 'book') return false;
    if (LIB_STATE.filter === 'file' && f.type === 'book') return false;
    if (q) {
      var hay = ((f.title || '') + ' ' + (f.subtitle || '') + ' ' + (f.desc || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  // Books first, then files
  list.sort(function (a, b) { return (a.type === 'book' ? 0 : 1) - (b.type === 'book' ? 0 : 1); });

  // Sync tab + search UI state
  document.querySelectorAll('.lib-tab').forEach(function (t) {
    t.classList.toggle('active', t.getAttribute('data-f') === LIB_STATE.filter);
  });

  if (!list.length) {
    grid.innerHTML = '<div class="lib-none">لا توجد عناصر مطابقة لبحثك.</div>';
    return;
  }

  var labelAr = (typeof PERSONALITY_LABEL_AR !== 'undefined') ? PERSONALITY_LABEL_AR : {};
  var emoji = (typeof PERSONALITY_EMOJI !== 'undefined') ? PERSONALITY_EMOJI : {};

  grid.innerHTML = list.map(function (f) {
    var isBook = f.type === 'book';
    var persona = labelAr[f.archetype] ? ((emoji[f.archetype] || '') + ' ' + labelAr[f.archetype]) : '';
    var gen = isBook ? _libGenInfo(f.id) : null;
    var genHtml = gen
      ? '<div class="lib-gen">🤖 ' + gen.chapters + ' فصل مولّد · ' + gen.words.toLocaleString('en-US') + ' كلمة إضافية</div>'
      : '';
    var aiBtn = (typeof openAIReader === 'function')
      ? '<button class="lib-btn ai" onclick="openAIReader(\'' + f.id + '\')"><i class="fas fa-robot"></i> قارئ AI</button>'
      : '';
    return '<div class="lib-card ' + (isBook ? 'book' : 'file') + '">' +
      '<div class="lib-card-top">' +
      '<div class="lib-cover">' + (f.icon || (isBook ? '📖' : '📄')) + '</div>' +
      '<div style="flex:1;min-width:0">' +
      '<div class="lib-card-title">' + _libEsc(f.title) + '</div>' +
      (f.subtitle ? '<div class="lib-card-sub">' + _libEsc(f.subtitle) + '</div>' : '') +
      '<span class="lib-badge ' + (isBook ? 'book' : 'file') + '">' + (isBook ? '📖 كتاب' : '📄 ملف') + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="lib-card-meta">' +
      (persona ? '<span>' + persona + '</span>' : '') +
      (f.size ? '<span>' + _libEsc(f.size) + '</span>' : '') +
      (LIB_STATE.cached[f.id] ? '<span title="النص محفوظ على جهازك">📶 يُقرأ بدون اتصال</span>' : '') +
      '</div>' +
      genHtml +
      '<div class="lib-card-actions">' +
      '<button class="lib-btn read" onclick="openPurchasedFile(\'' + f.id + '\')"><i class="fas fa-book-open"></i> ' + (isBook ? 'اقرأ الكتاب' : 'افتح الملف') + '</button>' +
      aiBtn +
      '</div>' +
      '</div>';
  }).join('');
}

// ── Controls ───────────────────────────────────────────────────────
function libSetFilter(f) { LIB_STATE.filter = f; libRenderGrid(); }
function libOnSearch(v) { LIB_STATE.search = v; libRenderGrid(); }

// ── HOOK INTO showSection ──────────────────────────────────────────
var _libOrigShowSection = window.showSection;
window.showSection = function (name) {
  if (typeof _libOrigShowSection === 'function') _libOrigShowSection(name);
  if (name === 'library') setTimeout(libInit, 30);
};

document.addEventListener('DOMContentLoaded', function () {
  var sec = document.getElementById('library');
  if (sec && sec.classList.contains('active')) libInit();
});

// a text was saved / a generated chapter arrived / old chapters were moved to the new store: refresh the badges if the library is on screen
var _libStorageTimer = null;
window.addEventListener('aus-books-changed', function () {
  var sec = document.getElementById('library');
  if (!sec || !sec.classList.contains('active')) return;
  clearTimeout(_libStorageTimer);
  _libStorageTimer = setTimeout(_libRefreshStorage, 300);
});
