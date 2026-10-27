/* ================================================================
   دكتور AI — UI System  |  AUS Platform
   ================================================================ */

// ── STATE ──────────────────────────────────────────────────────────
var DR_STATE = {
  lectureId: null, sectionIdx: 0, mode: 'list',
  students: [], questionIdx: 0, pickedStudent: null,
  scores: {}, askedStudents: [], sessionDone: false
};
var _drPickInterval = null; // guard against concurrent spin animations

// ── CSS INJECTION ──────────────────────────────────────────────────
(function(){
  var s = document.createElement('style');
  s.textContent = `
  #doctorai { padding: 1rem; }
  .dr-header { text-align:center; padding: 2rem 1rem 1rem; }
  .dr-header h1 { font-size:2.2rem; background:linear-gradient(135deg,#ffd700,#00d4ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:.4rem; }
  .dr-header p { color:rgba(255,255,255,.65); font-size:.95rem; }
  .dr-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1.2rem; margin-top:1.5rem; }
  .dr-card { background:rgba(0,29,61,.45); border:1px solid rgba(0,212,255,.18); border-radius:16px; padding:1.4rem; cursor:pointer; transition:all .3s; position:relative; overflow:hidden; }
  .dr-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,var(--c,#00d4ff),transparent); opacity:0; transition:.3s; }
  .dr-card:hover { transform:translateY(-4px); border-color:rgba(0,212,255,.5); box-shadow:0 12px 32px rgba(0,0,0,.4); }
  .dr-card:hover::before { opacity:.07; }
  .dr-card-icon { font-size:2.2rem; margin-bottom:.6rem; }
  .dr-card-num { position:absolute; top:.8rem; left:1rem; font-size:.72rem; color:rgba(255,255,255,.35); font-family:'Orbitron',sans-serif; }
  .dr-card h3 { font-size:1rem; color:#fff; margin-bottom:.3rem; line-height:1.3; }
  .dr-card p { font-size:.78rem; color:rgba(255,255,255,.5); }
  .dr-card-footer { display:flex; gap:.6rem; margin-top:1rem; flex-wrap:wrap; }
  .dr-badge { background:rgba(0,212,255,.12); border:1px solid rgba(0,212,255,.25); border-radius:20px; padding:2px 10px; font-size:.7rem; color:#00d4ff; }
  /* Room */
  .dr-room { display:grid; grid-template-columns:1fr 300px; gap:1.2rem; align-items:start; }
  @media(max-width:768px){ .dr-room { grid-template-columns:1fr; } }
  .dr-main-panel { display:flex; flex-direction:column; gap:1rem; }
  .dr-side-panel { display:flex; flex-direction:column; gap:1rem; }
  .dr-panel { background:rgba(0,29,61,.5); border:1px solid rgba(0,212,255,.2); border-radius:14px; padding:1.2rem; }
  .dr-lecture-title { font-size:1.3rem; color:#ffd700; font-weight:800; margin-bottom:.3rem; }
  .dr-section-title { font-size:1rem; color:#00d4ff; font-weight:700; margin-bottom:.8rem; }
  .dr-content { font-size:.88rem; line-height:1.9; color:rgba(255,255,255,.85); white-space:pre-line; }
  .dr-progress { display:flex; gap:.4rem; margin-bottom:1rem; flex-wrap:wrap; }
  .dr-prog-dot { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,.2); transition:.3s; cursor:pointer; }
  .dr-prog-dot.active { background:#00d4ff; box-shadow:0 0 8px #00d4ff; }
  .dr-prog-dot.done { background:#00f5d4; }
  .dr-nav-btns { display:flex; gap:.8rem; justify-content:space-between; align-items:center; margin-top:1rem; flex-wrap:wrap; }
  .dr-btn { padding:.55rem 1.2rem; border-radius:10px; border:none; cursor:pointer; font-family:'Tajawal',sans-serif; font-weight:700; font-size:.85rem; transition:all .2s; }
  .dr-btn-primary { background:linear-gradient(135deg,#00d4ff,#0084ff); color:#000; }
  .dr-btn-gold { background:linear-gradient(135deg,#ffd700,#ff9500); color:#000; }
  .dr-btn-outline { background:transparent; border:1px solid rgba(0,212,255,.4); color:#00d4ff; }
  .dr-btn-danger { background:rgba(255,0,110,.15); border:1px solid rgba(255,0,110,.3); color:#ff006e; }
  .dr-btn:hover { transform:translateY(-2px); filter:brightness(1.1); }
  /* Students */
  .dr-student-input { display:flex; gap:.5rem; margin-bottom:.8rem; }
  .dr-student-input input { flex:1; background:rgba(0,212,255,.07); border:1px solid rgba(0,212,255,.25); border-radius:8px; padding:.5rem .8rem; color:#fff; font-family:'Tajawal',sans-serif; font-size:.85rem; }
  .dr-student-input input:focus { outline:none; border-color:#00d4ff; }
  .dr-student-list { display:flex; flex-wrap:wrap; gap:.4rem; max-height:120px; overflow-y:auto; }
  .dr-student-tag { background:rgba(0,212,255,.12); border:1px solid rgba(0,212,255,.3); border-radius:20px; padding:3px 10px 3px 4px; font-size:.75rem; color:#fff; display:flex; align-items:center; gap:.3rem; }
  .dr-student-tag button { background:none; border:none; color:rgba(255,100,100,.7); cursor:pointer; font-size:.8rem; padding:0; line-height:1; }
  /* Random picker */
  .dr-picker { text-align:center; }
  .dr-picked-name { font-size:1.4rem; font-weight:800; color:#ffd700; min-height:2rem; margin:1rem 0; transition:all .3s; animation:dr-glow .8s infinite alternate; }
  @keyframes dr-glow { from{text-shadow:0 0 10px #ffd700;} to{text-shadow:0 0 25px #ffd700,0 0 40px #ff9500;} }
  .dr-picking { animation:dr-spin-text .1s linear infinite; }
  @keyframes dr-spin-text { 0%{opacity:1} 50%{opacity:.3} 100%{opacity:1} }
  /* Q&A */
  .dr-qa-card { background:rgba(157,78,221,.12); border:1px solid rgba(157,78,221,.3); border-radius:14px; padding:1.2rem; }
  .dr-qa-num { font-size:.75rem; color:rgba(255,255,255,.4); margin-bottom:.5rem; }
  .dr-qa-q { font-size:1rem; font-weight:700; color:#fff; margin-bottom:1rem; line-height:1.5; }
  .dr-qa-a { background:rgba(0,245,212,.08); border:1px solid rgba(0,245,212,.25); border-radius:10px; padding:.8rem; font-size:.85rem; color:#00f5d4; display:none; }
  .dr-qa-a.show { display:block; }
  .dr-score-bar { display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,.3); border-radius:8px; padding:.5rem .8rem; font-size:.8rem; color:rgba(255,255,255,.6); }
  .dr-score-val { color:#ffd700; font-weight:700; font-size:.95rem; }
  /* Homework */
  .dr-hw-task { background:rgba(0,212,255,.06); border:1px solid rgba(0,212,255,.15); border-radius:10px; padding:.9rem 1rem; margin-bottom:.7rem; display:flex; gap:.8rem; align-items:flex-start; }
  .dr-hw-num { width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg,#00d4ff,#0084ff); display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; color:#000; flex-shrink:0; }
  .dr-hw-text { font-size:.85rem; color:rgba(255,255,255,.85); line-height:1.6; }
  /* Back btn */
  .dr-back { cursor:pointer; color:rgba(255,255,255,.5); font-size:.85rem; margin-bottom:1rem; display:inline-flex; align-items:center; gap:.4rem; transition:.2s; }
  .dr-back:hover { color:#00d4ff; }
  /* Mode tabs */
  .dr-mode-tabs { display:flex; gap:.5rem; background:rgba(0,0,0,.3); border-radius:10px; padding:4px; }
  .dr-mode-tab { flex:1; text-align:center; padding:.45rem; border-radius:8px; font-size:.78rem; cursor:pointer; transition:.2s; color:rgba(255,255,255,.5); }
  .dr-mode-tab.active { background:rgba(0,212,255,.2); color:#00d4ff; font-weight:700; }
  /* Summary */
  .dr-summary-row { display:flex; justify-content:space-between; padding:.5rem 0; border-bottom:1px solid rgba(255,255,255,.07); font-size:.85rem; }
  `;
  document.head.appendChild(s);
})();

// ── INIT ───────────────────────────────────────────────────────────
function drInit() {
  var sec = document.getElementById('doctorai');
  if (!sec) return;
  // Only rebuild shell if not already built (preserve state across tab switches)
  if (!document.getElementById('dr-content')) {
    sec.innerHTML = `
      <div class="dr-header">
        <h1>🎓 دكتور AI — السلوك التنظيمي</h1>
        <p>عشر محاضرات تفاعلية · نظام أسئلة عشوائية · واجبات بعد كل حصة</p>
      </div>
      <div id="dr-content"></div>`;
  }
  // Resume active session, otherwise show list
  if (DR_STATE.lectureId && DR_STATE.mode !== 'list') {
    if (DR_STATE.mode === 'qa') drRenderQA();
    else if (DR_STATE.mode === 'homework') drShowHW();
    else drRenderRoom();
  } else {
    drShowMain();
  }
}

// ── MAIN LIST ─────────────────────────────────────────────────────
function drShowMain() {
  DR_STATE.mode = 'list';
  var html = '<div class="dr-grid">';
  DR_LECTURES.forEach(function(lec) {
    html += `<div class="dr-card" onclick="drStartLecture(${lec.id})" onkeydown="if(event.key==='Enter')drStartLecture(${lec.id})" style="--c:${lec.color}" role="button" aria-label="محاضرة ${lec.id}: ${lec.title}" tabindex="0">
      <div class="dr-card-num">${String(lec.id).padStart(2,'0')}</div>
      <div class="dr-card-icon">${lec.icon}</div>
      <h3>${lec.title}</h3>
      <p>${lec.subtitle}</p>
      <div class="dr-card-footer">
        <span class="dr-badge">📖 ${lec.sections.length} أقسام</span>
        <span class="dr-badge">❓ ${lec.questions.length} سؤال</span>
        <span class="dr-badge">📝 واجب</span>
      </div>
    </div>`;
  });
  html += '</div>';
  document.getElementById('dr-content').innerHTML = html;
}

// ── START LECTURE ─────────────────────────────────────────────────
function drStartLecture(id) {
  var lec = DR_LECTURES.find(function(l){return l.id===id;});
  if (!lec) return;
  DR_STATE.lectureId = id; DR_STATE.sectionIdx = 0;
  DR_STATE.mode = 'content'; DR_STATE.questionIdx = 0;
  DR_STATE.scores = {}; DR_STATE.askedStudents = [];
  drRenderRoom(lec);
}

// ── RENDER ROOM ───────────────────────────────────────────────────
function drRenderRoom(lec) {
  lec = lec || DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  var sec = lec.sections[DR_STATE.sectionIdx];
  var dots = lec.sections.map(function(s,i){
    var cls = i < DR_STATE.sectionIdx ? 'done' : i === DR_STATE.sectionIdx ? 'active' : '';
    return `<div class="dr-prog-dot ${cls}" onclick="drGoSection(${i})" title="${s.title}" aria-label="${s.title}"></div>`;
  }).join('');

  var c = document.getElementById('dr-content');
  c.innerHTML = `
    <div class="dr-back" onclick="drShowMain()" onkeydown="if(event.key==='Enter')drShowMain()" role="button" tabindex="0" aria-label="العودة للمحاضرات">
      ← العودة للمحاضرات
    </div>
    <div class="dr-room">
      <div class="dr-main-panel">
        <div class="dr-panel">
          <div class="dr-lecture-title">${lec.icon} ${lec.title}</div>
          <div class="dr-progress" role="tablist" aria-label="أقسام المحاضرة">${dots}</div>
          <div id="dr-mode-area">${drContentHTML(sec)}</div>
        </div>
      </div>
      <div class="dr-side-panel">
        <!-- Students -->
        <div class="dr-panel">
          <div class="dr-section-title">👩‍🎓 الطلاب الحاضرون</div>
          <div class="dr-student-input">
            <input type="text" id="dr-name-input" placeholder="اسم الطالب..." aria-label="اسم الطالب"
              onkeydown="if(event.key==='Enter')drAddStudent()">
            <button class="dr-btn dr-btn-primary" onclick="drAddStudent()" aria-label="إضافة طالب">+</button>
          </div>
          <div class="dr-student-list" id="dr-students" aria-label="قائمة الطلاب"></div>
          <div style="margin-top:.6rem;font-size:.72rem;color:rgba(255,255,255,.35)" id="dr-student-count">لا يوجد طلاب</div>
        </div>
        <!-- Random Picker -->
        <div class="dr-panel dr-picker">
          <div class="dr-section-title">🎲 اختيار عشوائي</div>
          <div class="dr-picked-name" id="dr-picked" aria-live="polite">—</div>
          <button class="dr-btn dr-btn-gold" onclick="drPickRandom()" style="width:100%" aria-label="اختر طالباً عشوائياً">
            🎯 اختر طالباً
          </button>
        </div>
        <!-- Q&A -->
        <div class="dr-panel">
          <div class="dr-section-title">❓ الأسئلة والواجب</div>
          <button class="dr-btn dr-btn-outline" onclick="drShowQA()" style="width:100%;margin-bottom:.5rem">
            🧠 ابدأ الأسئلة (${lec.questions.length})
          </button>
          <button class="dr-btn dr-btn-outline" onclick="drShowHW()" style="width:100%">
            📝 عرض الواجب
          </button>
        </div>
      </div>
    </div>`;
  drRenderStudents();
}

function drContentHTML(sec) {
  var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  var isLast = DR_STATE.sectionIdx >= lec.sections.length - 1;
  return `
    <div class="dr-section-title">${sec.title}</div>
    <div class="dr-content">${sec.content}</div>
    <div class="dr-nav-btns">
      <button class="dr-btn dr-btn-outline" onclick="drPrevSection()" ${DR_STATE.sectionIdx===0?'disabled style="opacity:.4"':''} aria-label="القسم السابق">← السابق</button>
      <span style="font-size:.75rem;color:rgba(255,255,255,.4)">${DR_STATE.sectionIdx+1} / ${lec.sections.length}</span>
      ${isLast
        ? `<button class="dr-btn dr-btn-gold" onclick="drShowQA()" aria-label="انتقل للأسئلة">ابدأ الأسئلة 🧠</button>`
        : `<button class="dr-btn dr-btn-primary" onclick="drNextSection()" aria-label="القسم التالي">التالي ←</button>`}
    </div>`;
}

// ── NAVIGATION ────────────────────────────────────────────────────
function drNextSection() {
  var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  if (DR_STATE.sectionIdx < lec.sections.length - 1) {
    DR_STATE.sectionIdx++;
    document.getElementById('dr-mode-area').innerHTML = drContentHTML(lec.sections[DR_STATE.sectionIdx]);
    drUpdateDots(lec);
    drPickRandom();
  }
}
function drPrevSection() {
  if (DR_STATE.sectionIdx > 0) {
    DR_STATE.sectionIdx--;
    var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
    document.getElementById('dr-mode-area').innerHTML = drContentHTML(lec.sections[DR_STATE.sectionIdx]);
    drUpdateDots(lec);
  }
}
function drGoSection(i) {
  DR_STATE.sectionIdx = i;
  var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  document.getElementById('dr-mode-area').innerHTML = drContentHTML(lec.sections[i]);
  drUpdateDots(lec);
  drPickRandom();
}
function drUpdateDots(lec) {
  var dots = document.querySelectorAll('.dr-prog-dot');
  dots.forEach(function(d,i){ d.className='dr-prog-dot'+(i<DR_STATE.sectionIdx?' done':i===DR_STATE.sectionIdx?' active':''); });
}

// ── STUDENTS ──────────────────────────────────────────────────────
function drAddStudent() {
  var inp = document.getElementById('dr-name-input');
  var name = (inp.value||'').trim();
  if (!name || DR_STATE.students.indexOf(name) !== -1) { inp.value=''; return; }
  DR_STATE.students.push(name);
  inp.value = '';
  drRenderStudents();
}
function drRemoveStudent(name) {
  DR_STATE.students = DR_STATE.students.filter(function(s){return s!==name;});
  drRenderStudents();
}
function drRenderStudents() {
  var list = document.getElementById('dr-students');
  var count = document.getElementById('dr-student-count');
  if (!list) return;
  list.innerHTML = DR_STATE.students.map(function(n){
    return `<div class="dr-student-tag"><span>${n}</span><button onclick="drRemoveStudent('${n.replace(/'/g,"\\'")}')" aria-label="حذف ${n}">✕</button></div>`;
  }).join('');
  if (count) count.textContent = DR_STATE.students.length ? DR_STATE.students.length + ' طالب' : 'لا يوجد طلاب';
}

// ── RANDOM PICKER ─────────────────────────────────────────────────
function drPickRandom() {
  if (!DR_STATE.students.length) {
    var el = document.getElementById('dr-picked');
    if (el) el.textContent = 'أضف طلاباً أولاً';
    return;
  }
  var el = document.getElementById('dr-picked');
  if (!el) return;
  // Guard: clear any running animation before starting a new one
  if (_drPickInterval) { clearInterval(_drPickInterval); _drPickInterval = null; el.classList.remove('dr-picking'); }
  var remaining = DR_STATE.students.filter(function(s){return DR_STATE.askedStudents.indexOf(s)===-1;});
  if (!remaining.length) { DR_STATE.askedStudents = []; remaining = DR_STATE.students.slice(); }
  var i = 0, pick = remaining[0];
  el.classList.add('dr-picking');
  _drPickInterval = setInterval(function(){
    el.textContent = remaining[Math.floor(Math.random()*remaining.length)];
    i++;
    if (i > 14) {
      clearInterval(_drPickInterval); _drPickInterval = null;
      pick = remaining[Math.floor(Math.random()*remaining.length)];
      el.textContent = pick;
      el.classList.remove('dr-picking');
      DR_STATE.pickedStudent = pick;
      if (DR_STATE.askedStudents.indexOf(pick) === -1) DR_STATE.askedStudents.push(pick);
    }
  }, 80);
}

// ── Q&A ──────────────────────────────────────────────────────────
function drShowQA() {
  DR_STATE.mode = 'qa'; DR_STATE.questionIdx = 0;
  drRenderQA();
}
function drRenderQA() {
  var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  var qa = lec.questions[DR_STATE.questionIdx];
  var totalScore = Object.values(DR_STATE.scores).reduce(function(a,b){return a+b;},0);
  var area = document.getElementById('dr-mode-area');
  if (!area) return;
  area.innerHTML = `
    <div class="dr-score-bar" style="margin-bottom:.8rem">
      <span>سؤال ${DR_STATE.questionIdx+1} من ${lec.questions.length}</span>
      <span>النقاط الكلية: <span class="dr-score-val">${totalScore}</span></span>
    </div>
    <div class="dr-qa-card">
      <div class="dr-qa-num">❓ السؤال ${DR_STATE.questionIdx+1}</div>
      <div class="dr-qa-q">${qa.q}</div>
      <button class="dr-btn dr-btn-outline" onclick="drRevealAnswer()" style="margin-bottom:.8rem;font-size:.8rem" aria-label="إظهار الإجابة">👁️ إظهار الإجابة</button>
      <div class="dr-qa-a" id="dr-answer" role="alert">${qa.a}</div>
    </div>
    <div class="dr-nav-btns" style="margin-top:1rem">
      <div style="display:flex;gap:.5rem">
        <button class="dr-btn dr-btn-primary" onclick="drScoreQ(${qa.points})" style="font-size:.78rem" aria-label="إجابة صحيحة">✅ صحيحة (+${qa.points})</button>
        <button class="dr-btn dr-btn-danger" onclick="drScoreQ(0)" style="font-size:.78rem" aria-label="إجابة خاطئة">❌ خاطئة</button>
      </div>
      <button class="dr-btn dr-btn-outline" onclick="drShowMain()" style="font-size:.78rem">🏠 القائمة</button>
    </div>`;
  drPickRandom();
}
function drRevealAnswer() {
  var el = document.getElementById('dr-answer');
  if (el) el.classList.toggle('show');
}
function drScoreQ(pts) {
  var student = DR_STATE.pickedStudent;
  if (!student) {
    // No student picked — prompt user and do nothing
    var el = document.getElementById('dr-picked');
    if (el) { el.textContent = '← اختر طالباً أولاً'; el.style.color = '#ff006e'; setTimeout(function(){ el.style.color = ''; }, 1500); }
    return;
  }
  DR_STATE.scores[student] = (DR_STATE.scores[student]||0) + pts;
  var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  if (DR_STATE.questionIdx < lec.questions.length - 1) {
    DR_STATE.questionIdx++;
    drRenderQA();
  } else {
    drShowSessionSummary();
  }
}

// ── HOMEWORK ──────────────────────────────────────────────────────
function drShowHW() {
  DR_STATE.mode = 'homework';
  var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  var hw = lec.homework;
  var area = document.getElementById('dr-mode-area');
  if (!area) return;
  area.innerHTML = `
    <div class="dr-section-title">📝 ${hw.title}</div>
    <div style="background:rgba(255,215,0,.07);border:1px solid rgba(255,215,0,.2);border-radius:8px;padding:.6rem .9rem;font-size:.78rem;color:#ffd700;margin-bottom:1rem">
      ⏰ ${hw.dueNote}
    </div>
    ${hw.tasks.map(function(t,i){
      return `<div class="dr-hw-task"><div class="dr-hw-num">${i+1}</div><div class="dr-hw-text">${t}</div></div>`;
    }).join('')}
    <div class="dr-nav-btns" style="margin-top:1rem">
      <button class="dr-btn dr-btn-outline" onclick="drRenderRoom()" aria-label="العودة للمحاضرة">← المحاضرة</button>
      <button class="dr-btn dr-btn-gold" onclick="drShowMain()" aria-label="محاضرة أخرى">محاضرة أخرى 🎓</button>
    </div>`;
}

// ── SESSION SUMMARY ───────────────────────────────────────────────
function drShowSessionSummary() {
  var lec = DR_LECTURES.find(function(l){return l.id===DR_STATE.lectureId;});
  var rows = Object.entries(DR_STATE.scores).map(function(e){
    return `<div class="dr-summary-row"><span>${e[0]}</span><span class="dr-score-val">${e[1]} نقطة</span></div>`;
  }).join('') || '<div style="color:rgba(255,255,255,.4);font-size:.85rem;text-align:center">لم يتم تسجيل نقاط</div>';
  var area = document.getElementById('dr-mode-area');
  if (!area) return;
  area.innerHTML = `
    <div style="text-align:center;padding:1rem 0">
      <div style="font-size:2.5rem;margin-bottom:.5rem">🏆</div>
      <div style="font-size:1.3rem;font-weight:800;color:#ffd700;margin-bottom:.3rem">انتهت المحاضرة!</div>
      <div style="font-size:.85rem;color:rgba(255,255,255,.5)">${lec.title}</div>
    </div>
    <div class="dr-panel" style="margin:1rem 0">
      <div class="dr-section-title">📊 نتائج الطلاب</div>
      ${rows}
    </div>
    <div class="dr-nav-btns">
      <button class="dr-btn dr-btn-outline" onclick="drShowHW()" aria-label="عرض الواجب">📝 الواجب</button>
      <button class="dr-btn dr-btn-gold" onclick="drShowMain()" aria-label="العودة للقائمة">🎓 محاضرة أخرى</button>
    </div>`;
}

// ── HOOK INTO showSection ─────────────────────────────────────────
var _drOrigShowSection = window.showSection;
window.showSection = function(name) {
  if (typeof _drOrigShowSection === 'function') _drOrigShowSection(name);
  if (name === 'doctorai') setTimeout(drInit, 50);
};

// Auto-init if section already active
document.addEventListener('DOMContentLoaded', function() {
  var sec = document.getElementById('doctorai');
  if (sec && sec.classList.contains('active')) drInit();
});
