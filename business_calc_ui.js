/* ================================================================
   نظام الحاسبات المالية — UI  |  AUS Platform
   ================================================================ */

var BC_STATE = {
  mode: 'list',      // list | lesson | exam | results
  calcId: null,
  qIdx: 0,
  questions: [],     // shuffled questions with remapped correct
  answers: [],       // selected index per question
  answered: false
};

// ── CSS INJECTION ──────────────────────────────────────────────────
(function () {
  var s = document.createElement('style');
  s.textContent = `
  #calc { padding: 1rem; }
  .bc-header { text-align:center; padding:2rem 1rem 1rem; }
  .bc-header h1 { font-size:2.2rem; background:linear-gradient(135deg,#ffd700,#00d4ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:.4rem; }
  .bc-header p { color:rgba(255,255,255,.65); font-size:.95rem; }
  .bc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:1.2rem; margin-top:1.5rem; max-width:1100px; margin-inline:auto; }
  .bc-card { background:rgba(0,29,61,.45); border:1px solid rgba(0,212,255,.18); border-radius:16px; padding:1.4rem; cursor:pointer; transition:all .3s; position:relative; overflow:hidden; }
  .bc-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,var(--c,#00d4ff),transparent); opacity:0; transition:.3s; }
  .bc-card:hover { transform:translateY(-4px); border-color:var(--c,rgba(0,212,255,.5)); box-shadow:0 12px 32px rgba(0,0,0,.4); }
  .bc-card:hover::before { opacity:.08; }
  .bc-card-num { position:absolute; top:.8rem; left:1rem; font-size:.72rem; color:rgba(255,255,255,.35); font-family:'Orbitron',sans-serif; }
  .bc-card-icon { font-size:2.3rem; margin-bottom:.6rem; }
  .bc-card h3 { font-size:1.05rem; color:#fff; margin-bottom:.25rem; line-height:1.3; position:relative; }
  .bc-card .bc-sub { font-size:.74rem; color:rgba(255,255,255,.45); font-family:'Orbitron',sans-serif; }
  .bc-card-foot { margin-top:1rem; display:flex; align-items:center; gap:.5rem; font-size:.78rem; color:var(--c,#00d4ff); }

  /* Lesson screen */
  .bc-lesson { max-width:780px; margin:0 auto; animation:cdnaSlideIn .4s both; }
  .bc-back { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:rgba(255,255,255,.8); padding:.5rem 1.1rem; border-radius:10px; cursor:pointer; font-family:'Tajawal',sans-serif; font-size:.85rem; margin-bottom:1.2rem; }
  .bc-back:hover { background:rgba(255,255,255,.12); }
  .bc-lesson-hero { text-align:center; padding:2rem 1.5rem; background:linear-gradient(135deg,rgba(0,29,61,.6),rgba(0,5,20,.4)); border:1px solid var(--c,rgba(0,212,255,.3)); border-radius:18px; margin-bottom:1.5rem; }
  .bc-lesson-hero .ic { font-size:3.5rem; margin-bottom:.6rem; }
  .bc-lesson-hero h2 { font-size:1.7rem; color:#fff; margin-bottom:.3rem; }
  .bc-lesson-hero .sub { color:var(--c,#00d4ff); font-family:'Orbitron',sans-serif; font-size:.85rem; letter-spacing:.05em; }
  .bc-block { background:rgba(0,10,30,.45); border:1px solid rgba(0,212,255,.14); border-radius:14px; padding:1.3rem 1.5rem; margin-bottom:1.1rem; }
  .bc-block-title { font-size:1.05rem; font-weight:700; color:var(--c,#00d4ff); margin-bottom:.7rem; display:flex; align-items:center; gap:8px; }
  .bc-block p, .bc-block li { font-size:.95rem; line-height:1.9; color:rgba(255,255,255,.85); }
  .bc-formula { background:linear-gradient(135deg,rgba(255,215,0,.1),rgba(0,212,255,.05)); border:1px dashed rgba(255,215,0,.4); border-radius:12px; padding:1.1rem 1.3rem; font-size:1.05rem; color:#ffd700; text-align:center; font-weight:700; line-height:2; white-space:pre-line; direction:ltr; }
  .bc-steps { list-style:none; counter-reset:bcstep; padding:0; }
  .bc-steps li { counter-increment:bcstep; padding:.6rem 0 .6rem 0; padding-inline-start:2.4rem; position:relative; border-bottom:1px dashed rgba(255,255,255,.07); }
  .bc-steps li::before { content:counter(bcstep); position:absolute; inset-inline-start:0; top:.5rem; width:1.7rem; height:1.7rem; background:var(--c,#00d4ff); color:#001; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:.85rem; font-family:'Orbitron',sans-serif; }
  .bc-example { background:rgba(0,245,212,.06); border-inline-start:3px solid #00f5d4; border-radius:0 12px 12px 0; padding:1rem 1.3rem; white-space:pre-line; line-height:1.9; font-size:.93rem; color:rgba(255,255,255,.9); }
  .bc-tips { list-style:none; padding:0; }
  .bc-tips li { padding:.5rem 0; padding-inline-start:1.8rem; position:relative; line-height:1.7; }
  .bc-tips li::before { content:'💡'; position:absolute; inset-inline-start:0; }
  .bc-start-btn { display:block; width:100%; margin-top:1.5rem; padding:1.1rem; background:linear-gradient(135deg,var(--c,#00d4ff),#0084ff); border:none; border-radius:14px; color:#001; font-family:'Tajawal',sans-serif; font-size:1.15rem; font-weight:800; cursor:pointer; transition:all .3s; box-shadow:0 8px 24px rgba(0,212,255,.3); }
  .bc-start-btn:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(0,212,255,.5); }

  /* Exam screen */
  .bc-exam { max-width:720px; margin:0 auto; animation:cdnaSlideIn .35s both; }
  .bc-exam-bar { height:6px; background:rgba(255,255,255,.08); border-radius:3px; overflow:hidden; margin-bottom:.6rem; }
  .bc-exam-fill { height:100%; background:linear-gradient(90deg,#00d4ff,#ffd700); border-radius:3px; transition:width .4s; }
  .bc-exam-meta { display:flex; justify-content:space-between; font-size:.8rem; color:rgba(255,255,255,.6); margin-bottom:1.2rem; font-family:'Orbitron',sans-serif; }
  .bc-q-card { background:rgba(0,29,61,.5); border:1px solid rgba(0,212,255,.2); border-radius:16px; padding:1.5rem; margin-bottom:1.2rem; }
  .bc-q-num { font-family:'Orbitron',sans-serif; font-size:.72rem; color:var(--c,#00d4ff); letter-spacing:.1em; margin-bottom:.6rem; }
  .bc-q-text { font-size:1.12rem; color:#fff; line-height:1.8; font-weight:600; }
  .bc-opts { display:flex; flex-direction:column; gap:.7rem; }
  .bc-opt { display:flex; align-items:center; gap:.8rem; background:rgba(0,10,30,.5); border:1px solid rgba(0,212,255,.15); border-radius:12px; padding:.9rem 1.1rem; cursor:pointer; transition:all .25s; font-size:1.05rem; color:rgba(255,255,255,.9); font-family:'Tajawal',sans-serif; text-align:start; }
  .bc-opt:hover:not(.answered) { border-color:var(--c,#00d4ff); background:rgba(0,212,255,.06); transform:translateX(-3px); }
  .bc-opt .lt { width:2rem; height:2rem; flex-shrink:0; border-radius:8px; background:rgba(0,212,255,.12); display:flex; align-items:center; justify-content:center; font-weight:800; font-family:'Orbitron',sans-serif; font-size:.9rem; }
  .bc-opt.correct { border-color:#00f5d4; background:rgba(0,245,212,.12); }
  .bc-opt.correct .lt { background:#00f5d4; color:#001; }
  .bc-opt.wrong { border-color:#ff006e; background:rgba(255,0,110,.1); }
  .bc-opt.wrong .lt { background:#ff006e; color:#fff; }
  .bc-opt.answered { cursor:default; }
  .bc-explain { background:rgba(255,215,0,.07); border:1px solid rgba(255,215,0,.25); border-radius:12px; padding:1rem 1.2rem; margin-top:1rem; font-size:.95rem; color:rgba(255,255,255,.88); line-height:1.8; direction:ltr; text-align:right; animation:cdnaSlideIn .3s both; }
  .bc-explain .lbl { color:#ffd700; font-weight:700; margin-inline-end:6px; }
  .bc-next { display:block; width:100%; margin-top:1.2rem; padding:.95rem; background:linear-gradient(135deg,var(--c,#00d4ff),#0084ff); border:none; border-radius:12px; color:#001; font-family:'Tajawal',sans-serif; font-size:1.05rem; font-weight:800; cursor:pointer; transition:all .3s; }
  .bc-next:hover { transform:translateY(-2px); }
  .bc-next:disabled { opacity:.4; cursor:not-allowed; transform:none; }

  /* Results */
  .bc-results { max-width:560px; margin:0 auto; text-align:center; animation:cdnaSlideIn .5s both; }
  .bc-score-ring { width:160px; height:160px; margin:1.5rem auto; border-radius:50%; display:flex; align-items:center; justify-content:center; position:relative; }
  .bc-score-inner { width:128px; height:128px; border-radius:50%; background:rgba(0,5,20,.92); display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .bc-score-pct { font-family:'Orbitron',sans-serif; font-size:2.4rem; font-weight:900; }
  .bc-score-lbl { font-size:.8rem; color:rgba(255,255,255,.55); }
  .bc-results h2 { font-size:1.6rem; color:#fff; margin-bottom:.5rem; }
  .bc-results-grade { font-size:1.05rem; margin-bottom:1.5rem; font-weight:700; }
  .bc-results-actions { display:flex; gap:.8rem; justify-content:center; flex-wrap:wrap; }
  .bc-results-actions button { padding:.85rem 1.5rem; border-radius:12px; cursor:pointer; font-family:'Tajawal',sans-serif; font-weight:700; font-size:.95rem; border:none; }
  .bc-btn-primary { background:linear-gradient(135deg,#00d4ff,#0084ff); color:#001; }
  .bc-btn-ghost { background:rgba(255,255,255,.08); color:#fff; border:1px solid rgba(255,255,255,.15) !important; }
  @media(max-width:640px){ .bc-grid{grid-template-columns:1fr;} .bc-lesson-hero h2{font-size:1.4rem;} }
  `;
  document.head.appendChild(s);
})();

// ── Fisher-Yates shuffle ───────────────────────────────────────────
function _bcShuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// ── ENTRY ──────────────────────────────────────────────────────────
function bcInit() {
  BC_STATE.mode = 'list';
  bcRender();
}

function bcRender() {
  var el = document.getElementById('calc');
  if (!el) return;
  if (BC_STATE.mode === 'list') el.innerHTML = bcRenderList();
  else if (BC_STATE.mode === 'lesson') el.innerHTML = bcRenderLesson();
  else if (BC_STATE.mode === 'exam') el.innerHTML = bcRenderExam();
  else if (BC_STATE.mode === 'results') el.innerHTML = bcRenderResults();
}

// ── LIST ───────────────────────────────────────────────────────────
function bcRenderList() {
  var cards = BIZ_CALCS.map(function (c, i) {
    return '<div class="bc-card" style="--c:' + c.color + '" onclick="bcOpenLesson(\'' + c.id + '\')">' +
      '<div class="bc-card-num">' + String(i + 1).padStart(2, '0') + '</div>' +
      '<div class="bc-card-icon">' + c.icon + '</div>' +
      '<h3>' + c.title + '</h3>' +
      '<div class="bc-sub">' + c.subtitle + '</div>' +
      '<div class="bc-card-foot"><i class="fas fa-book-open"></i> شرح + 10 أسئلة واقعية</div>' +
      '</div>';
  }).join('');
  return '<div class="bc-header">' +
    '<h1>🧮 العمليات الحسابية في عالم الأعمال</h1>' +
    '<p>10 عمليات مالية أساسية · شرح مفصّل قبل كل امتحان · 100 سؤال واقعي</p>' +
    '</div>' +
    '<div class="bc-grid">' + cards + '</div>';
}

// ── LESSON ─────────────────────────────────────────────────────────
function bcOpenLesson(id) {
  BC_STATE.calcId = id;
  BC_STATE.mode = 'lesson';
  bcRender();
  var sec = document.getElementById('calc');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _bcGet(id) {
  for (var i = 0; i < BIZ_CALCS.length; i++) if (BIZ_CALCS[i].id === id) return BIZ_CALCS[i];
  return null;
}

function bcRenderLesson() {
  var c = _bcGet(BC_STATE.calcId);
  if (!c) return bcRenderList();
  var L = c.lesson;
  var stepsHtml = L.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('');
  var tipsHtml = L.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('');
  return '<div class="bc-lesson" style="--c:' + c.color + '">' +
    '<button class="bc-back" onclick="bcInit()"><i class="fas fa-arrow-right"></i> كل العمليات</button>' +
    '<div class="bc-lesson-hero">' +
    '<div class="ic">' + c.icon + '</div>' +
    '<h2>' + c.title + '</h2>' +
    '<div class="sub">' + c.subtitle + '</div>' +
    '</div>' +
    '<div class="bc-block"><div class="bc-block-title">📖 ما هي هذه العملية؟</div><p>' + L.intro + '</p></div>' +
    '<div class="bc-block"><div class="bc-block-title">🔢 المعادلة</div><div class="bc-formula">' + L.formula + '</div></div>' +
    '<div class="bc-block"><div class="bc-block-title">⚙️ خطوات الحساب</div><ol class="bc-steps">' + stepsHtml + '</ol></div>' +
    '<div class="bc-block"><div class="bc-block-title">📍 مثال محلول</div><div class="bc-example">' + L.example + '</div></div>' +
    '<div class="bc-block"><div class="bc-block-title">💡 نصائح وأخطاء شائعة</div><ul class="bc-tips">' + tipsHtml + '</ul></div>' +
    '<button class="bc-start-btn" onclick="bcStartExam()"><i class="fas fa-play"></i> ابدأ الامتحان (10 أسئلة)</button>' +
    '</div>';
}

// ── EXAM ───────────────────────────────────────────────────────────
function bcStartExam() {
  var c = _bcGet(BC_STATE.calcId);
  if (!c) return;
  // Shuffle questions order AND shuffle each question's options (remap correct)
  var qs = _bcShuffle(c.questions).map(function (q) {
    var pairs = q.opts.map(function (opt, idx) { return { opt: opt, isCorrect: idx === q.correct }; });
    var shuffled = _bcShuffle(pairs);
    return {
      q: q.q,
      opts: shuffled.map(function (p) { return p.opt; }),
      correct: shuffled.findIndex(function (p) { return p.isCorrect; }),
      explanation: q.explanation
    };
  });
  BC_STATE.questions = qs;
  BC_STATE.qIdx = 0;
  BC_STATE.answers = [];
  BC_STATE.answered = false;
  BC_STATE.recorded = false;
  BC_STATE.mode = 'exam';
  bcRender();
  var sec = document.getElementById('calc');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bcRenderExam() {
  var c = _bcGet(BC_STATE.calcId);
  var q = BC_STATE.questions[BC_STATE.qIdx];
  var total = BC_STATE.questions.length;
  var pct = Math.round(((BC_STATE.qIdx) / total) * 100);
  var letters = ['أ', 'ب', 'ج', 'د'];
  var sel = BC_STATE.answers[BC_STATE.qIdx];

  var optsHtml = q.opts.map(function (opt, i) {
    var cls = 'bc-opt';
    if (BC_STATE.answered) {
      cls += ' answered';
      if (i === q.correct) cls += ' correct';
      else if (i === sel) cls += ' wrong';
    }
    var onclick = BC_STATE.answered ? '' : ' onclick="bcAnswer(' + i + ')"';
    return '<button class="' + cls + '"' + onclick + '>' +
      '<span class="lt">' + letters[i] + '</span><span>' + opt + '</span></button>';
  }).join('');

  var explainHtml = BC_STATE.answered
    ? '<div class="bc-explain"><span class="lbl">✓ الحل:</span>' + q.explanation + '</div>'
    : '';

  var isLast = BC_STATE.qIdx + 1 >= total;
  var nextLabel = isLast ? '<i class="fas fa-flag-checkered"></i> عرض النتيجة' : 'السؤال التالي <i class="fas fa-arrow-left"></i>';
  var nextBtn = BC_STATE.answered
    ? '<button class="bc-next" onclick="bcNext()">' + nextLabel + '</button>'
    : '<button class="bc-next" disabled>اختر إجابة للمتابعة</button>';

  return '<div class="bc-exam" style="--c:' + c.color + '">' +
    '<button class="bc-back" onclick="bcOpenLesson(\'' + c.id + '\')"><i class="fas fa-arrow-right"></i> العودة للشرح</button>' +
    '<div class="bc-exam-bar"><div class="bc-exam-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="bc-exam-meta"><span>' + c.title + '</span><span>سؤال ' + (BC_STATE.qIdx + 1) + ' / ' + total + '</span></div>' +
    '<div class="bc-q-card">' +
    '<div class="bc-q-num">⬡ سؤال ' + (BC_STATE.qIdx + 1) + '</div>' +
    '<div class="bc-q-text">' + q.q + '</div>' +
    '</div>' +
    '<div class="bc-opts">' + optsHtml + '</div>' +
    explainHtml +
    nextBtn +
    '</div>';
}

function bcAnswer(i) {
  if (BC_STATE.answered) return;
  BC_STATE.answers[BC_STATE.qIdx] = i;
  BC_STATE.answered = true;
  var _q = BC_STATE.questions[BC_STATE.qIdx];
  try { sfxPlay(i === _q.correct ? 'correct' : 'error'); } catch (e) {}
  try { if (typeof recordStudentAnswer === 'function') recordStudentAnswer('الحاسبات المالية', _q.q, (_q.opts && _q.opts[i]) || '', i === _q.correct); } catch (e) {}
  bcRender();
}

function bcNext() {
  if (BC_STATE.qIdx + 1 >= BC_STATE.questions.length) {
    BC_STATE.mode = 'results';
  } else {
    BC_STATE.qIdx++;
    BC_STATE.answered = false;
  }
  bcRender();
  var sec = document.getElementById('calc');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── RESULTS ────────────────────────────────────────────────────────
function bcRenderResults() {
  var c = _bcGet(BC_STATE.calcId);
  var total = BC_STATE.questions.length;
  var score = 0;
  for (var i = 0; i < total; i++) {
    if (BC_STATE.answers[i] === BC_STATE.questions[i].correct) score++;
  }
  var pct = Math.round((score / total) * 100);
  var clr = pct >= 80 ? '#00f5d4' : pct >= 60 ? '#00d4ff' : pct >= 40 ? '#ffd60a' : '#ff006e';
  var grade = pct >= 90 ? 'ممتاز 🌟 أتقنت العملية!' : pct >= 70 ? 'جيد جداً 👏 أداء قوي' :
    pct >= 50 ? 'جيد 👍 راجع النقاط الصعبة' : 'يحتاج مراجعة 📖 ارجع للشرح';

  // Award XP if available
  try {
    if (typeof addXP === 'function') addXP(score * 3);
  } catch (e) {}

  // Save the exam result to the student's record (once per attempt)
  if (!BC_STATE.recorded) {
    BC_STATE.recorded = true;
    try { if (typeof recordStudentResult === 'function') recordStudentResult('الحاسبات المالية', c.title, score, total); } catch (e) {}
  }

  return '<div class="bc-results" style="--c:' + c.color + '">' +
    '<div class="bc-score-ring" style="background:conic-gradient(' + clr + ' ' + (pct * 3.6) + 'deg, rgba(255,255,255,.08) 0)">' +
    '<div class="bc-score-inner"><div class="bc-score-pct" style="color:' + clr + '">' + pct + '%</div><div class="bc-score-lbl">' + score + ' / ' + total + '</div></div>' +
    '</div>' +
    '<h2>' + c.icon + ' ' + c.title + '</h2>' +
    '<div class="bc-results-grade" style="color:' + clr + '">' + grade + '</div>' +
    '<div class="bc-results-actions">' +
    '<button class="bc-btn-primary" onclick="bcStartExam()"><i class="fas fa-redo"></i> إعادة الامتحان</button>' +
    '<button class="bc-btn-ghost" onclick="bcOpenLesson(\'' + c.id + '\')"><i class="fas fa-book-open"></i> مراجعة الشرح</button>' +
    '<button class="bc-btn-ghost" onclick="bcInit()"><i class="fas fa-th-large"></i> عمليات أخرى</button>' +
    '</div>' +
    '</div>';
}

// ── HOOK INTO showSection ──────────────────────────────────────────
var _bcOrigShowSection = window.showSection;
window.showSection = function (name) {
  if (typeof _bcOrigShowSection === 'function') _bcOrigShowSection(name);
  if (name === 'calc') setTimeout(bcInit, 50);
};

document.addEventListener('DOMContentLoaded', function () {
  var sec = document.getElementById('calc');
  if (sec && sec.classList.contains('active')) bcInit();
});
