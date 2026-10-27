/* ================================================================
   قارئ AI — يقرأ ويشرح ويوسّع كل الكتب والملفات عند الطلب
   مطابق لكل شخصية قيادية | AUS Platform
   ================================================================ */

var AIR_STATE = {
  fileId: null,
  archetype: null,
  busy: false,
  generatedChapters: 0,
  chatHistory: [],
  autoGen: false,        // is the full-book generator running?
  targetWords: 100000,   // word target per book
  themeIdx: 0
};

// ── Diverse chapter theme pool (50 distinct angles) so each generated ──
// ── chapter has a unique focus → no repetition even over hundreds. ──
var AIR_THEMES = [
  'اتخاذ القرار تحت الضغط', 'بناء الثقة مع الفريق', 'إدارة الأزمات المفاجئة',
  'التواصل القيادي الفعّال', 'تحفيز الفرق المتعبة', 'إدارة الصراعات الداخلية',
  'التفويض الذكي للمهام', 'بناء ثقافة مؤسسية قوية', 'القيادة عن بُعد',
  'إدارة التغيير ومقاومته', 'تطوير قادة الصف الثاني', 'الذكاء العاطفي في القيادة',
  'اتخاذ قرارات في ظل الغموض', 'إدارة الوقت والأولويات', 'بناء الرؤية الاستراتيجية',
  'التعامل مع الفشل والتعلّم منه', 'إدارة الموارد المحدودة', 'القيادة في النمو السريع',
  'التفاوض وكسب التأييد', 'بناء شبكة العلاقات المهنية', 'إدارة أصحاب المصلحة',
  'القيادة الأخلاقية والنزاهة', 'تطوير الذات المستمر', 'إدارة فرق متعددة الثقافات',
  'الابتكار وكسر الجمود', 'قياس الأداء بذكاء', 'بناء المساءلة دون خوف',
  'إدارة المواهب والاحتفاظ بها', 'القيادة في المنافسة الشرسة', 'صناعة القرارات الكبرى',
  'التعامل مع النقد والمعارضة', 'بناء الزخم والاستدامة', 'إدارة التوقعات',
  'القيادة بالقدوة', 'التخطيط للمستقبل البعيد', 'إدارة المخاطر المحسوبة',
  'بناء فرق عالية الأداء', 'القيادة في التحوّل الرقمي', 'إدارة الضغوط النفسية',
  'صناعة الإجماع الفعّال', 'التعامل مع الموظفين الصعبين', 'بناء الولاء المؤسسي',
  'القيادة الملهمة', 'إدارة الميزانيات بحكمة', 'التعلّم من المنافسين',
  'بناء العلامة القيادية الشخصية', 'إدارة الاجتماعات بكفاءة', 'القيادة في الركود',
  'صناعة الإرث القيادي', 'التوازن بين الحزم والمرونة'
];

// ── CSS INJECTION ──────────────────────────────────────────────────
(function () {
  var s = document.createElement('style');
  s.textContent = `
  #air-panel {
    position: fixed; top: 0; inset-inline-end: -440px; width: 420px; max-width: 92vw; height: 100vh;
    background: linear-gradient(160deg, rgba(0,12,32,.98), rgba(0,5,20,.99));
    border-inline-start: 1px solid rgba(0,212,255,.25);
    box-shadow: -20px 0 60px rgba(0,0,0,.6);
    z-index: 100000; transition: inset-inline-end .4s cubic-bezier(.16,1,.3,1);
    display: flex; flex-direction: column; backdrop-filter: blur(12px);
  }
  #air-panel.open { inset-inline-end: 0; }
  .air-head { padding: 1.2rem 1.3rem; border-bottom: 1px solid rgba(0,212,255,.15); display: flex; align-items: center; gap: .8rem; }
  .air-avatar { width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle, rgba(0,212,255,.3), rgba(157,78,221,.15)); border: 2px solid rgba(0,212,255,.4); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
  .air-head-info h4 { color: #fff; font-size: 1rem; margin: 0; }
  .air-head-info p { color: rgba(255,255,255,.5); font-size: .76rem; margin: 0; }
  .air-close { margin-inline-start: auto; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: #fff; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; font-size: 1rem; }
  .air-close:hover { background: rgba(255,0,110,.2); }
  .air-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; padding: 1rem 1.3rem; }
  .air-act { background: rgba(0,212,255,.07); border: 1px solid rgba(0,212,255,.2); border-radius: 12px; padding: .8rem .5rem; cursor: pointer; transition: all .25s; text-align: center; color: rgba(255,255,255,.9); font-family: 'Tajawal', sans-serif; }
  .air-act:hover:not(:disabled) { background: rgba(0,212,255,.14); border-color: rgba(0,212,255,.45); transform: translateY(-2px); }
  .air-act:disabled { opacity: .4; cursor: not-allowed; }
  .air-act .ic { font-size: 1.5rem; display: block; margin-bottom: .3rem; }
  .air-act .lbl { font-size: .82rem; font-weight: 700; }
  .air-act .hint { font-size: .66rem; color: rgba(255,255,255,.45); margin-top: 2px; }
  .air-body { flex: 1; overflow-y: auto; padding: 0 1.3rem 1rem; }
  .air-body::-webkit-scrollbar { width: 6px; }
  .air-body::-webkit-scrollbar-thumb { background: rgba(0,212,255,.3); border-radius: 6px; }
  .air-msg { margin-bottom: 1rem; animation: cdnaSlideIn .35s both; }
  .air-msg.user { text-align: start; }
  .air-msg.user .air-bubble { background: rgba(0,212,255,.12); border: 1px solid rgba(0,212,255,.25); display: inline-block; border-radius: 14px 14px 4px 14px; }
  .air-msg.ai .air-bubble { background: linear-gradient(135deg, rgba(157,78,221,.1), rgba(0,212,255,.05)); border: 1px solid rgba(157,78,221,.22); border-radius: 14px 14px 14px 4px; }
  .air-bubble { padding: .85rem 1.05rem; font-size: .93rem; line-height: 1.85; color: rgba(255,255,255,.9); }
  .air-bubble strong { color: #00d4ff; }
  .air-bubble em { color: #ffd700; font-style: italic; }
  .air-typing { display: inline-flex; gap: 4px; padding: 4px 0; }
  .air-typing span { width: 7px; height: 7px; border-radius: 50%; background: #9d4edd; animation: airDot 1.2s infinite; }
  .air-typing span:nth-child(2){animation-delay:.2s;} .air-typing span:nth-child(3){animation-delay:.4s;}
  @keyframes airDot { 0%,80%,100%{transform:scale(.6);opacity:.4;} 40%{transform:scale(1);opacity:1;} }
  .air-msg-label { font-size: .68rem; color: rgba(0,212,255,.7); font-family: 'Orbitron', sans-serif; letter-spacing: .05em; margin-bottom: .3rem; }
  .air-input-row { padding: .9rem 1.3rem; border-top: 1px solid rgba(0,212,255,.12); display: flex; gap: .6rem; }
  .air-input { flex: 1; background: rgba(0,10,30,.6); border: 1px solid rgba(0,212,255,.2); border-radius: 11px; padding: .7rem .9rem; color: #fff; font-family: 'Tajawal', sans-serif; font-size: .9rem; outline: none; resize: none; }
  .air-input:focus { border-color: rgba(0,212,255,.5); }
  .air-send { width: 44px; flex-shrink: 0; background: linear-gradient(135deg, #00d4ff, #0084ff); border: none; border-radius: 11px; color: #001; cursor: pointer; font-size: 1rem; }
  .air-send:disabled { opacity: .4; cursor: not-allowed; }
  .air-empty { text-align: center; color: rgba(255,255,255,.4); padding: 2rem 1rem; font-size: .9rem; line-height: 1.8; }
  #air-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 99999; opacity: 0; pointer-events: none; transition: opacity .3s; }
  #air-backdrop.show { opacity: 1; pointer-events: auto; }
  .ai-reader-trigger { background: linear-gradient(135deg, rgba(0,212,255,.18), rgba(157,78,221,.12)) !important; border-color: rgba(0,212,255,.4) !important; }
  /* Full-book generator */
  .air-fullgen { padding: 0 1.3rem 1rem; }
  .air-fullgen-btn { width: 100%; background: linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,124,67,.1)); border: 1px solid rgba(255,215,0,.35); border-radius: 12px; padding: .8rem; color: #ffd700; font-family: 'Tajawal', sans-serif; font-weight: 700; font-size: .9rem; cursor: pointer; transition: all .25s; }
  .air-fullgen-btn:hover { background: linear-gradient(135deg, rgba(255,215,0,.25), rgba(255,124,67,.18)); transform: translateY(-1px); }
  .air-fullgen-btn.running { background: linear-gradient(135deg, rgba(255,0,110,.2), rgba(255,0,110,.1)); border-color: rgba(255,0,110,.4); color: #ff6ea0; }
  .air-progress-wrap { margin-top: .7rem; }
  .air-progress { height: 8px; background: rgba(255,255,255,.08); border-radius: 4px; overflow: hidden; }
  .air-progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #00d4ff, #ffd700); border-radius: 4px; transition: width .5s; box-shadow: 0 0 12px rgba(255,215,0,.5); }
  .air-progress-meta { font-family: 'Orbitron', sans-serif; font-size: .7rem; color: rgba(255,255,255,.6); margin-top: .4rem; text-align: center; }
  .air-progress-meta span { color: #ffd700; font-weight: 700; }
  @media(max-width:640px){ #air-panel{width:100vw;} .air-input{font-size:16px;} }
  `;
  document.head.appendChild(s);
})();

// ── Build panel DOM once ───────────────────────────────────────────
function _airEnsurePanel() {
  if (document.getElementById('air-panel')) return;
  var bd = document.createElement('div');
  bd.id = 'air-backdrop';
  bd.onclick = closeAIReader;
  document.body.appendChild(bd);

  var p = document.createElement('div');
  p.id = 'air-panel';
  p.innerHTML =
    '<div class="air-head">' +
    '<div class="air-avatar">🤖</div>' +
    '<div class="air-head-info"><h4 id="air-title">قارئ AI</h4><p id="air-subtitle">يقرأ ويشرح ويوسّع</p></div>' +
    '<button class="air-close" onclick="closeAIReader()">✕</button>' +
    '</div>' +
    '<div class="air-actions">' +
    '<button class="air-act" id="air-listen" onclick="airListen()"><span class="ic">🔊</span><span class="lbl">استمع</span><span class="hint">اقرأ الصفحة</span></button>' +
    '<button class="air-act" id="air-explain" onclick="airExplain()"><span class="ic">💡</span><span class="lbl">اشرح أكثر</span><span class="hint">تعمّق في الصفحة</span></button>' +
    '<button class="air-act" id="air-expand" onclick="airExpand()"><span class="ic">📑</span><span class="lbl">وسّع الكتاب</span><span class="hint">فصل جديد</span></button>' +
    '<button class="air-act" id="air-summary" onclick="airSummarize()"><span class="ic">📋</span><span class="lbl">لخّص</span><span class="hint">أهم النقاط</span></button>' +
    '</div>' +
    '<div class="air-fullgen">' +
    '<button class="air-fullgen-btn" id="air-fullgen-btn" onclick="airToggleFullGen()"><i class="fas fa-book"></i> <span id="air-fullgen-label">ولّد الكتاب الكامل (100 ألف كلمة)</span></button>' +
    '<div class="air-progress-wrap" id="air-progress-wrap" style="display:none">' +
    '<div class="air-progress"><div class="air-progress-fill" id="air-progress-fill"></div></div>' +
    '<div class="air-progress-meta"><span id="air-word-count">0</span> / 100,000 كلمة · <span id="air-chap-count">0</span> فصل</div>' +
    '<div style="text-align:center;margin-top:.5rem"><a href="javascript:void(0)" id="air-reset-link" onclick="airResetGenerated()" style="color:rgba(255,110,160,.85);font-size:.72rem;text-decoration:none;font-family:\'Tajawal\',sans-serif">🗑 امسح الفصول المولّدة وابدأ من جديد</a></div>' +
    '</div>' +
    '</div>' +
    '<div class="air-body" id="air-body"><div class="air-empty">👋 أنا قارئك الذكي.<br>اختر إجراءً من الأعلى، أو اسألني أي شيء عن الكتاب.</div></div>' +
    '<div class="air-input-row">' +
    '<textarea class="air-input" id="air-input" rows="1" placeholder="اسأل عن الكتاب..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();airAsk();}"></textarea>' +
    '<button class="air-send" id="air-send" onclick="airAsk()"><i class="fas fa-paper-plane"></i></button>' +
    '</div>';
  document.body.appendChild(p);
}

// ── Open / Close ───────────────────────────────────────────────────
function openAIReader(fileId) {
  _airEnsurePanel();
  var file = (typeof LEADERSHIP_FILES !== 'undefined') ? LEADERSHIP_FILES.find(function (f) { return f.id === fileId; }) : null;
  AIR_STATE.fileId = fileId;
  AIR_STATE.archetype = file ? (file.archetype || file.cdnaType) : null;
  AIR_STATE.busy = false;
  AIR_STATE.generatedChapters = 0;
  AIR_STATE.chatHistory = [];
  var t = document.getElementById('air-title');
  var st = document.getElementById('air-subtitle');
  if (t) t.textContent = file ? file.title : 'قارئ AI';
  if (st && file) {
    var label = (typeof PERSONALITY_LABEL_AR !== 'undefined' && PERSONALITY_LABEL_AR[AIR_STATE.archetype]) || '';
    st.textContent = label ? 'قارئ مخصّص لـ' + label : 'يقرأ ويشرح ويوسّع';
  }
  // Reset body
  var body = document.getElementById('air-body');
  if (body) body.innerHTML = '<div class="air-empty">👋 أنا قارئك الذكي لكتاب «' + (file ? file.title : '') + '».<br>اختر إجراءً من الأعلى، أو اسألني أي شيء.</div>';
  // Restore saved full-gen progress on the button + bar — from the book's counters (chapters / words), never by loading its chapters
  AIR_STATE.autoGen = false;
  var btn2 = document.getElementById('air-fullgen-btn');
  if (btn2) btn2.classList.remove('running');
  _airShowSaved(fileId);
  document.getElementById('air-panel').classList.add('open');
  document.getElementById('air-backdrop').classList.add('show');
}

function closeAIReader() {
  var p = document.getElementById('air-panel');
  var bd = document.getElementById('air-backdrop');
  if (p) p.classList.remove('open');
  if (bd) bd.classList.remove('show');
  try { window.speechSynthesis.cancel(); } catch (e) {}
}

// ── Helpers ────────────────────────────────────────────────────────
function _airCurrentPageText() {
  var active = document.querySelector('#bookPages .book-page.active');
  if (!active) active = document.querySelector('#bookPages .book-page');
  if (!active) return '';
  return (active.textContent || '').replace(/\s+/g, ' ').trim();
}

function _airPersonaContext() {
  var label = (typeof PERSONALITY_LABEL_AR !== 'undefined' && PERSONALITY_LABEL_AR[AIR_STATE.archetype]) || 'قائد';
  var prof = (typeof _bookProfile === 'function') ? _bookProfile(AIR_STATE.archetype) : null;
  var tagline = prof ? prof.tagline : '';
  return 'القارئ هو ' + label + (tagline ? ' — شعاره: "' + tagline + '"' : '') + '.';
}

function _airMd(t) {
  return (t || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•]\s+(.+)$/gm, '◆ $1<br>')
    .replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
}

function _airAddMsg(role, label) {
  var body = document.getElementById('air-body');
  if (!body) return null;
  var empty = body.querySelector('.air-empty');
  if (empty) empty.remove();
  var id = 'airm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  var html = '<div class="air-msg ' + role + '">' +
    (label ? '<div class="air-msg-label">' + label + '</div>' : '') +
    '<div class="air-bubble" id="' + id + '">' +
    (role === 'ai' ? '<span class="air-typing"><span></span><span></span><span></span></span>' : '') +
    '</div></div>';
  body.insertAdjacentHTML('beforeend', html);
  body.scrollTop = body.scrollHeight;
  return id;
}

async function _airTypeInto(elId, text, speed) {
  var el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';
  var body = document.getElementById('air-body');
  for (var i = 0; i < text.length; i++) {
    el.innerHTML = _airMd(text.slice(0, i + 1));
    if (i % 4 === 0) { await new Promise(function (r) { setTimeout(r, speed || 8); }); if (body) body.scrollTop = body.scrollHeight; }
  }
  if (body) body.scrollTop = body.scrollHeight;
}

// ── Core AI call (backend + local fallback) ────────────────────────
async function _airAsk(prompt, fallbackFn) {
  var base = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
  try {
    var res = await fetch(base + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, language: 'ar' })
    });
    if (!res.ok) throw new Error();
    var data = await res.json();
    var txt = ((data.text || data.response || data.content || '') + '').trim();
    if (txt.length > 10) return txt;
    throw new Error();
  } catch (e) {
    return fallbackFn ? fallbackFn() : 'تعذّر توليد المحتوى الآن.';
  }
}

function _airSetBusy(b) {
  AIR_STATE.busy = b;
  ['air-listen', 'air-explain', 'air-expand', 'air-summary', 'air-send'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.disabled = b;
  });
}

// ── ACTION: Listen (TTS of current page) ───────────────────────────
function airListen() {
  if (!('speechSynthesis' in window)) { try { showToast('المتصفح لا يدعم القراءة الصوتية', 'heart-toast'); } catch (e) {} return; }
  var text = _airCurrentPageText();
  if (!text) { try { showToast('افتح صفحة من الكتاب أولاً', 'heart-toast'); } catch (e) {} return; }
  window.speechSynthesis.cancel();
  var label = _airAddMsg('ai', '🔊 يقرأ الصفحة الحالية');
  if (label) _airTypeInto(label, 'أقرأ لك الصفحة الحالية الآن... (يمكنك إيقاف الصوت بإغلاق القارئ)', 12);
  var u = new SpeechSynthesisUtterance(text.slice(0, 2500));
  u.lang = 'ar-SA'; u.rate = 0.95; u.pitch = 1;
  window.speechSynthesis.speak(u);
}

// ── ACTION: Explain current page deeper ────────────────────────────
async function airExplain() {
  if (AIR_STATE.busy) return;
  var pageText = _airCurrentPageText();
  if (!pageText) { try { showToast('افتح صفحة من الكتاب أولاً', 'heart-toast'); } catch (e) {} return; }
  _airSetBusy(true);
  var id = _airAddMsg('ai', '💡 شرح أعمق');
  var prompt = 'أنت قارئ ذكي يشرح كتاباً قيادياً. ' + _airPersonaContext() +
    '\n\nوسّع واشرح الفقرة التالية من الكتاب بعمق أكبر، مع مثال عملي واحد يناسب هذا النمط القيادي تحديداً. لا تتجاوز 140 كلمة:\n\n"' + pageText.slice(0, 900) + '"';
  var txt = await _airAsk(prompt, function () {
    return '**شرح أعمق**: هذه الفكرة جوهرية في رحلتك القيادية. التطبيق العملي: ابدأ بتحديد موقف حقيقي تواجهه، ثم طبّق المبدأ خطوة بخطوة، وراقب النتيجة بعد أسبوع.\n\nℹ️ شغّل خادم AI لشرح أعمق ومخصّص.';
  });
  await _airTypeInto(id, txt, 8);
  _airSetBusy(false);
}

// ── ACTION: Expand book — generate new chapter ─────────────────────
async function airExpand() {
  if (AIR_STATE.busy) return;
  var file = (typeof LEADERSHIP_FILES !== 'undefined') ? LEADERSHIP_FILES.find(function (f) { return f.id === AIR_STATE.fileId; }) : null;
  var title = file ? file.title : 'الكتاب';
  AIR_STATE.generatedChapters++;
  _airSetBusy(true);
  var id = _airAddMsg('ai', '📑 فصل جديد #' + AIR_STATE.generatedChapters);
  var prompt = 'أنت مؤلف خبير. ' + _airPersonaContext() +
    '\n\nاكتب فصلاً جديداً عميقاً واحترافياً لكتاب «' + title + '» (الفصل الإضافي رقم ' + AIR_STATE.generatedChapters + ').' +
    ' يجب أن يكون مطابقاً لهذا النمط القيادي، يقدّم فكرة جديدة لم تُذكر، مع: عنوان الفصل، فكرة محورية، مثال من شركة حقيقية، و3 خطوات تطبيقية. 200-260 كلمة.';
  var txt = await _airAsk(prompt, function () {
    return '**الفصل الإضافي ' + AIR_STATE.generatedChapters + ': الإتقان المتقدّم**\n\nبعد إتقان الأساسيات، تأتي مرحلة التميّز. القائد المتقدّم لا يكتفي بتطبيق المبادئ، بل يطوّعها لسياقه الفريد.\n\n**مثال**: شركة عالمية طبّقت هذا المبدأ بأسلوبها الخاص فحقّقت نمواً مضاعفاً.\n\n**خطوات**:\n- حدّد موقفاً يتطلّب تطبيقاً متقدّماً\n- صمّم نهجك الخاص المستوحى من المبدأ\n- قِس الأثر وحسّن باستمرار\n\nℹ️ شغّل خادم AI لتوليد فصول مخصّصة بالكامل.';
  });
  await _airTypeInto(id, txt, 6);
  _airSetBusy(false);
}

// ── ACTION: Summarize the book ─────────────────────────────────────
async function airSummarize() {
  if (AIR_STATE.busy) return;
  var file = (typeof LEADERSHIP_FILES !== 'undefined') ? LEADERSHIP_FILES.find(function (f) { return f.id === AIR_STATE.fileId; }) : null;
  var title = file ? file.title : 'الكتاب';
  var content = window.AUS_BOOKS ? await AUS_BOOKS.getContent(AIR_STATE.fileId) : null;      // the open reader already loaded it: memory hit
  var ctx = '';
  if (content && content.sections) {
    ctx = content.sections.map(function (s) { return s.title; }).join('، ');
  }
  _airSetBusy(true);
  var id = _airAddMsg('ai', '📋 ملخّص الكتاب');
  var prompt = 'لخّص كتاب «' + title + '». ' + _airPersonaContext() +
    (ctx ? '\nفصوله: ' + ctx : '') +
    '\n\nاكتب ملخّصاً منظّماً بأهم 5 نقاط جوهرية + نصيحة ختامية واحدة. لا تتجاوز 130 كلمة.';
  var txt = await _airAsk(prompt, function () {
    return '**ملخّص ' + title + '**\n\n' +
      '- الفكرة الرئيسية: إطار متكامل لتطوير شخصيتك القيادية.\n' +
      '- كل فصل يبني على سابقه نحو الإتقان.\n' +
      '- التطبيق العملي أهم من الحفظ النظري.\n' +
      '- القيادة قرار يومي متجدّد.\n' +
      '- ابدأ بتغيير واحد هذا الأسبوع.\n\n' +
      '**نصيحة**: راجع الكتاب كل 3 أشهر — ستجد فيه ما لم تره أول مرة.';
  });
  await _airTypeInto(id, txt, 8);
  _airSetBusy(false);
}

// ════════════════════════════════════════════════════════════════════
// FULL-BOOK GENERATOR — auto-generates chapters toward 100,000 words
// Persists chapter by chapter in IndexedDB (AUS_BOOKS) so content stays permanently.
// ════════════════════════════════════════════════════════════════════
// Varied local chapter builder (offline fallback when backend is fully down).
// Combines large pools so chapters differ even over hundreds.
function _airPick(a) { return a[Math.floor(Math.random() * a.length)]; }
function _airLocalChapter(theme, themeFull) {
  var openers = [
    'يمثّل "' + theme + '" محطّة جوهرية في رحلة كل قائد طموح',
    'لا يكتمل نضج القائد دون إتقان "' + theme + '" بعمق ووعي',
    'من أصعب ما يواجه القادة وأكثره أثراً: "' + theme + '"',
    'القائد الذي يتقن "' + theme + '" يتفوّق على من يهمله بمراحل',
    'حين يُتقَن "' + theme + '" يتحوّل من عبء يومي إلى مصدر قوة دائم',
    'قليلون يدركون أنّ "' + theme + '" هو الخطّ الفاصل بين قائد عادي وآخر استثنائي'
  ];
  var cores = [
    'النجاح في ' + theme + ' لا يأتي بالصدفة، بل عبر منهجية: وعي بالموقف، تخطيط دقيق، تنفيذ منضبط، ثم قياس وتحسين.',
    'جوهر ' + theme + ' هو التوازن بين الحزم والمرونة: متى تتمسّك بالمبدأ ومتى تتكيّف مع الواقع.',
    'الأساس في ' + theme + ' أن تبدأ من "لماذا" قبل "كيف"؛ الوضوح في الغاية يصنع وضوحاً في القرار.',
    'يقوم ' + theme + ' على مبدأ بسيط عميق: القرارات الصغيرة المتكرّرة تصنع النتائج الكبرى.',
    'مفتاح ' + theme + ' تحويل الانفعال إلى استجابة مدروسة؛ المسافة بينهما تميّز القائد الناضج.'
  ];
  var examples = [
    ['Netflix', 'حين فصلت البثّ عن الـDVD عام 2011 بدا قراراً انتحارياً لكنه صنع أعظم تحوّل في تاريخها'],
    ['Toyota', 'بنت الإنتاج الرشيق على التحسين المستمرّ فصارت الأكفأ عالمياً لعقود'],
    ['Apple', 'قتلت 70٪ من منتجاتها للتركيز على القليل المتقن فأنقذت نفسها من الإفلاس'],
    ['Microsoft', 'تحوّلت من "أعرف كل شيء" إلى "أتعلّم كل شيء" فتضاعفت قيمتها عشر مرّات'],
    ['NVIDIA', 'راهنت مبكراً أنّ معالج الرسوميات يصلح للذكاء الاصطناعي فصارت أغلى شركة'],
    ['Pixar', 'بنت ثقافة "أفضل فكرة تفوز بغضّ النظر عن المنصب" فحقّقت 27 نجاحاً متتالياً']
  ];
  var ex = _airPick(examples);
  var stepSets = [
    ['حدّد موقفاً حقيقياً يتطلّب ' + theme + ' الآن', 'صمّم خطّة بأهداف قابلة للقياس', 'نفّذ بثقة وراقب المؤشّرات أسبوعياً', 'حسّن باستمرار بناءً على النتائج'],
    ['اسأل فريقك قبل أن تخبره — الإصغاء أوّل الأدوات', 'فكّك المشكلة إلى خطوة تبدأ اليوم', 'اختر مؤشّراً واحداً واضحاً للنجاح', 'احتفل بالتقدّم الصغير علناً'],
    ['اكتب القرار وأسبابه قبل تنفيذه', 'استشر من يخالفك لتكشف نقاطك العمياء', 'ضع سقفاً زمنياً يمنع التحليل الزائد', 'راجع الأثر بعد أسبوعين'],
    ['عرّف "النجاح" بوضوح قبل التحرّك', 'وزّع الأدوار بدقّة', 'أزل عائقاً واحداً أمام فريقك', 'أغلق الحلقة بالتغذية الراجعة']
  ];
  var steps = _airPick(stepSets);
  var pitfalls = [
    'الخطأ الأشيع: التحرّك بسرعة قبل فهم جذر المشكلة؛ السرعة بلا وضوح تضاعف الضرر.',
    'فخّ إرضاء الجميع ينتهي بقرار باهت لا يخدم أحداً.',
    'لا تخلط بين النشاط والإنتاجية؛ الانشغال قد يكون قناعاً لتجنّب القرار الصعب.',
    'ما لم يُقَل بوضوح لم يُفهَم؛ لا تفترض أنّ الآخرين يرون ما تراه.'
  ];
  var conclusions = [
    theme + ' ممارسة تُصقل بالتكرار لا مهارة تُكتسب مرّة. ابدأ بتطبيق واحد هذا الأسبوع.',
    'يتجلّى ' + theme + ' في خياراتك حين لا يراك أحد. اختر بحكمة اليوم.',
    'لن يتغيّر شيء بقراءة الفصل؛ التغيير يبدأ حين تغلقه وتتصرّف.',
    'اجعل ' + theme + ' جزءاً من هويّتك لا قائمة مهامّك.'
  ];
  return '**' + themeFull + '**\n\n' +
    _airPick(openers) + '. هذا الفصل ينقلك من النظرية إلى الإتقان العملي.\n\n' +
    '**الفكرة المحورية**: ' + _airPick(cores) + '\n\n' +
    '**مثال واقعي · ' + ex[0] + '**: ' + ex[1] + '.\n\n' +
    '**خطوات التطبيق**:\n- ' + steps.join('\n- ') + '\n\n' +
    '**خطأ شائع**: ' + _airPick(pitfalls) + '\n\n' +
    '**الخلاصة**: ' + _airPick(conclusions);
}

// Every chapter is its own record in IndexedDB (window.AUS_BOOKS.gen — aus_53_book_store.js) next to running counters {chapters, words,
// bytes, themes}, written in the SAME transaction. Adding chapter 300 therefore costs what chapter 1 did. This used to rewrite the whole
// book as one JSON string in localStorage after every chapter (O(n²), ≈5 MB shared by the entire site) and swallowed the error when it
// filled up — the chapter simply vanished. Nothing below ever loads the chapters: only the counters.
function _airWordCount(text) {
  return (text || '').split(/\s+/).filter(Boolean).length;
}

var _AIR_ZERO = { chapters: 0, words: 0, bytes: 0, themes: [] };
function _airMeta(id) {
  if (!window.AUS_BOOKS) return Promise.resolve(_AIR_ZERO);
  return AUS_BOOKS.gen.meta(id || AIR_STATE.fileId).catch(function () { return _AIR_ZERO; });
}

function _airUpdateProgress(meta) {
  var words = meta.words || 0;
  var pct = Math.min(100, Math.round((words / AIR_STATE.targetWords) * 100));
  var fill = document.getElementById('air-progress-fill');
  var wc = document.getElementById('air-word-count');
  var cc = document.getElementById('air-chap-count');
  if (fill) fill.style.width = pct + '%';
  if (wc) wc.textContent = words.toLocaleString('en-US');
  if (cc) cc.textContent = meta.chapters || 0;
  return words;
}

// button label + progress bar for the book now open in the panel (what is saved, or the empty state)
function _airShowSaved(fileId) {
  var lbl = document.getElementById('air-fullgen-label');
  var wrap = document.getElementById('air-progress-wrap');
  if (lbl) lbl.textContent = 'ولّد الكتاب الكامل (100 ألف كلمة)';
  if (wrap) wrap.style.display = 'none';
  return _airMeta(fileId).then(function (m) {
    if (AIR_STATE.fileId !== fileId || AIR_STATE.autoGen || !(m.words > 0)) return m;      // moved to another book / already generating / nothing saved
    if (lbl) lbl.textContent = 'متابعة التوليد (' + m.words.toLocaleString('en-US') + ' كلمة)';
    if (wrap) wrap.style.display = 'block';
    _airUpdateProgress(m);
    return m;
  });
}

function airToggleFullGen() {
  if (AIR_STATE.autoGen) {
    airStopFullGen();
  } else {
    airStartFullGen();
  }
}

function airStartFullGen() {
  if (!window.AUS_BOOKS) { try { showToast('مخزن الكتب غير متاح — أعد تحميل الصفحة', 'heart-toast'); } catch (e) {} return; }
  AIR_STATE.autoGen = true;
  var fileId = AIR_STATE.fileId;
  var btn = document.getElementById('air-fullgen-btn');
  var lbl = document.getElementById('air-fullgen-label');
  var wrap = document.getElementById('air-progress-wrap');
  if (btn) btn.classList.add('running');
  if (lbl) lbl.textContent = 'إيقاف التوليد ⏸';
  if (wrap) wrap.style.display = 'block';
  // Load existing progress (the counters only)
  _airMeta(fileId).then(function (m) {
    if (!AIR_STATE.autoGen || AIR_STATE.fileId !== fileId) return;       // stopped (or the panel moved to another book) before the counters came back
    AIR_STATE.themeIdx = m.chapters;
    _airUpdateProgress(m);
    var startWords = m.words;
    _airAddMsg('ai', '📖 مولّد الكتاب الكامل');
    var bubbles = document.querySelectorAll('#air-body .air-msg.ai .air-bubble');
    if (bubbles.length) bubbles[bubbles.length - 1].innerHTML = _airMd(
      'بدأت توليد الكتاب الكامل (هدف 100,000 كلمة).' +
      (startWords > 0 ? ' لديك بالفعل ' + startWords.toLocaleString('en-US') + ' كلمة محفوظة — أكمل من حيث توقّفت.' : '') +
      '\n\nكل فصل يُحفظ تلقائياً ويصبح جزءاً دائماً من الكتاب. يمكنك الإيقاف في أي وقت.'
    );
    _airGenLoop(fileId, m);
  });
}

// Clear all generated chapters for this book and reset, so the user can
// regenerate fresh, varied content (fixes the old repetitive-content books).
function airResetGenerated() {
  var fileId = AIR_STATE.fileId;
  _airMeta(fileId).then(function (saved) {
    if (!saved.chapters) { try { showToast('لا توجد فصول مولّدة لمسحها', 'heart-toast'); } catch (e) {} return; }
    if (!confirm('سيتم مسح ' + saved.chapters + ' فصلاً مولّداً لهذا الكتاب نهائياً والبدء من جديد. متابعة؟')) return;
    AIR_STATE.autoGen = false;
    return AUS_BOOKS.gen.clear(fileId).then(function () {
      AIR_STATE.themeIdx = 0;
      AIR_STATE.generatedChapters = 0;
      _airUpdateProgress(_AIR_ZERO);
      var btn = document.getElementById('air-fullgen-btn');
      var lbl = document.getElementById('air-fullgen-label');
      var wrap = document.getElementById('air-progress-wrap');
      if (btn) btn.classList.remove('running');
      if (lbl) lbl.textContent = 'ولّد الكتاب الكامل (100 ألف كلمة)';
      if (wrap) wrap.style.display = 'none';
      _airAddMsg('ai', '🗑 تم المسح');
      var bs = document.querySelectorAll('#air-body .air-msg.ai .air-bubble');
      if (bs.length) bs[bs.length - 1].innerHTML = _airMd('تم مسح كل الفصول المولّدة السابقة. اضغط «ولّد الكتاب الكامل» لإنشاء محتوى جديد ومتنوّع.');
      try { showToast('تم مسح الفصول المولّدة', 'heart-toast'); } catch (e) {}
    }, function () { try { showToast('تعذّر مسح الفصول المولّدة من مخزن الجهاز', 'heart-toast'); } catch (e) {} });
  });
}

function airStopFullGen() {
  AIR_STATE.autoGen = false;
  var btn = document.getElementById('air-fullgen-btn');
  var lbl = document.getElementById('air-fullgen-label');
  if (btn) btn.classList.remove('running');
  _airMeta().then(function (m) {
    if (AIR_STATE.autoGen) return;                                       // started again meanwhile
    if (lbl) lbl.textContent = m.words > 0 ? 'متابعة التوليد (' + m.words.toLocaleString('en-US') + ' كلمة)' : 'ولّد الكتاب الكامل (100 ألف كلمة)';
  });
}

async function _airGenLoop(fileId, meta) {
  var file = (typeof LEADERSHIP_FILES !== 'undefined') ? LEADERSHIP_FILES.find(function (f) { return f.id === fileId; }) : null;
  var title = file ? file.title : 'الكتاب';

  while (AIR_STATE.autoGen && AIR_STATE.fileId === fileId) {
    var words = meta.words;
    if (words >= AIR_STATE.targetWords) {
      airStopFullGen();
      _airAddMsg('ai', '🎉 اكتمل الكتاب');
      var bs = document.querySelectorAll('#air-body .air-msg.ai .air-bubble');
      if (bs.length) bs[bs.length - 1].innerHTML = _airMd('**مبروك!** وصل الكتاب إلى ' + words.toLocaleString('en-US') + ' كلمة في ' + meta.chapters + ' فصلاً. كل المحتوى محفوظ ويظهر عند قراءة الكتاب.');
      break;
    }
    // Pick a diverse theme (rotate, then cycle with variation)
    var theme = AIR_THEMES[AIR_STATE.themeIdx % AIR_THEMES.length];
    var cycle = Math.floor(AIR_STATE.themeIdx / AIR_THEMES.length);
    var themeFull = theme + (cycle > 0 ? ' — منظور متقدّم ' + (cycle + 1) : '');
    AIR_STATE.themeIdx++;

    var prompt = 'أنت مؤلف خبير في القيادة. ' + _airPersonaContext() +
      '\n\nاكتب فصلاً كاملاً واحترافياً لكتاب «' + title + '» بعنوان موضوعه: "' + themeFull + '".' +
      ' يجب أن يكون مطابقاً لهذا النمط القيادي تحديداً، عميقاً وأصلياً، يتضمّن: عنوان الفصل، مقدّمة، فكرة محورية، مثال من شركة حقيقية، 3-4 خطوات تطبيقية، وخلاصة. اكتب 400-550 كلمة. لا تكرّر فصولاً سابقة.';

    var txt = await _airAsk(prompt, function () {
      return _airLocalChapter(theme, themeFull);
    });

    if (!AIR_STATE.autoGen || AIR_STATE.fileId !== fileId) break; // stopped mid-generation

    // Save the chapter: one record + the counters, in one transaction (O(1) — never the whole book)
    try {
      meta = await AUS_BOOKS.gen.append(fileId, { theme: themeFull, body: txt, ts: Date.now() });
    } catch (e) {
      // the device refused the write (storage full / blocked). The old code swallowed this and the chapter just vanished — say so, and stop.
      airStopFullGen();
      _airAddMsg('ai', '⚠️ تعذّر حفظ الفصل');
      var eb = document.querySelectorAll('#air-body .air-msg.ai .air-bubble');
      if (eb.length) eb[eb.length - 1].innerHTML = _airMd('**توقّف التوليد:** تعذّر حفظ الفصل على هذا الجهاز' + (e && e.name === 'QuotaExceededError' ? ' (مساحة التخزين ممتلئة)' : '') + '. فصولك السابقة سليمة ومحفوظة — حرّر بعض المساحة ثم اضغط «متابعة التوليد».');
      break;
    }
    var newTotal = _airUpdateProgress(meta);

    // Show a compact log entry
    var logId = _airAddMsg('ai', '✓ فصل ' + meta.chapters + ' · ' + themeFull);
    if (logId) {
      var el = document.getElementById(logId);
      if (el) el.innerHTML = _airMd(txt.slice(0, 160) + '…\n\n*أُضيف ' + _airWordCount(txt) + ' كلمة · الإجمالي ' + newTotal.toLocaleString('en-US') + '*');
    }
    // Small pause between chapters
    await new Promise(function (r) { setTimeout(r, 400); });
  }
}

// ── ACTION: Ask a question ─────────────────────────────────────────
async function airAsk() {
  if (AIR_STATE.busy) return;
  var inp = document.getElementById('air-input');
  if (!inp) return;
  var q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  _airAddMsg('user', null);
  var ub = document.querySelectorAll('#air-body .air-msg.user .air-bubble');
  if (ub.length) ub[ub.length - 1].textContent = q;
  AIR_STATE.chatHistory.push('س: ' + q);

  var file = (typeof LEADERSHIP_FILES !== 'undefined') ? LEADERSHIP_FILES.find(function (f) { return f.id === AIR_STATE.fileId; }) : null;
  var title = file ? file.title : 'الكتاب';
  var pageText = _airCurrentPageText();
  _airSetBusy(true);
  var id = _airAddMsg('ai', null);
  var prompt = 'أنت قارئ خبير لكتاب «' + title + '». ' + _airPersonaContext() +
    (pageText ? '\nالصفحة الحالية: "' + pageText.slice(0, 500) + '"' : '') +
    '\nسجل: ' + AIR_STATE.chatHistory.slice(-4).join(' | ') +
    '\n\nأجب عن سؤال القارئ بدقّة وبما يناسب نمطه القيادي. لا تتجاوز 130 كلمة. السؤال: ' + q;
  var txt = await _airAsk(prompt, function () {
    if (typeof _studyLocalAnswer === 'function') return _studyLocalAnswer(q, title);
    return 'سؤال ممتاز. الإجابة تعتمد على سياقك الخاص — راجع الفصل ذا الصلة وطبّق المبدأ على موقفك الحالي.\n\nℹ️ شغّل خادم AI لإجابات مخصّصة.';
  });
  AIR_STATE.chatHistory.push('ج: ' + txt.slice(0, 120));
  await _airTypeInto(id, txt, 7);
  _airSetBusy(false);
}
