/* ================================================================
   AUS — نظام الواجبات (الدكتور يكلّف · الطالب يسلّم · الدكتور يصحّح)
   عبر الخادم لتصل بين الحسابات | يعتمد ausAuth + DR_LECTURES
   ================================================================ */
(function () {
  'use strict';

  function _base() { return (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'; }
  function _tok() { try { return localStorage.getItem('aus_access_token'); } catch (e) { return null; } }
  function _me() { return (window.ausAuth && ausAuth.user) ? ausAuth.user : null; }
  function _esc(t) { return (t || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function _lectures() { try { return (typeof DR_LECTURES !== 'undefined') ? DR_LECTURES : []; } catch (e) { return []; } }
  function _date(ts) { if (!ts) return ''; try { return new Date(ts).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }); } catch (e) { return ''; } }

  async function _api(method, path, body) {
    var t = _tok();
    var headers = { 'Content-Type': 'application/json' };
    if (t) headers.Authorization = 'Bearer ' + t;
    try {
      var res = await fetch(_base() + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
      var d = await res.json().catch(function () { return {}; });
      return { ok: res.ok, status: res.status, data: d };
    } catch (e) { return { ok: false, status: 0, data: null }; }
  }

  function _needServerMsg() {
    return '<div class="cp-card"><div class="cp-note" style="text-align:center;padding:1rem">' +
      'نظام الواجبات يحتاج اتصالاً بالخادم. شغّل الخادم (START_AUS.bat) وسجّل دخولك، ثم افتح هذه اللوحة من جديد.</div></div>';
  }

  // ── DOCTOR view ────────────────────────────────────────────────────
  window.hwRenderDoctor = async function (containerId) {
    var box = document.getElementById(containerId); if (!box) return;
    var me = _me(); if (!me) return;
    if (!_tok()) { box.innerHTML = _needServerMsg(); return; }
    box.innerHTML = '<div class="cp-note" style="padding:.6rem">جارٍ التحميل...</div>';

    var ra = await _api('GET', '/api/homework/assignments');
    var rs = await _api('GET', '/api/homework/submissions');
    if (!ra.ok) { box.innerHTML = _needServerMsg(); return; }
    var emLower = (me.email || '').toLowerCase();
    var mine = (ra.data.assignments || []).filter(function (a) { return (a.by_email || '').toLowerCase() === emLower || ausAuth.isOwner; });
    var subs = (rs.ok && rs.data.submissions) ? rs.data.submissions : [];

    // assign form
    var lecOpts = '<option value="0">— عامّ (بدون محاضرة) —</option>' +
      _lectures().map(function (l) { return '<option value="' + l.id + '" data-hw="' + _esc((l.homework && l.homework.title) || l.title) + '">' + _esc(l.title) + '</option>'; }).join('');

    var html = '<div class="cp-card">' +
      '<h4><i class="fas fa-plus-circle"></i> تكليف واجب جديد</h4>' +
      '<div style="display:flex;flex-direction:column;gap:.55rem">' +
      '<select class="cp-search" id="hw-lec" onchange="hwLecChanged()">' + lecOpts + '</select>' +
      '<input class="cp-search" id="hw-title" type="text" placeholder="عنوان الواجب">' +
      '<textarea class="cp-search" id="hw-note" rows="2" placeholder="تفاصيل / تعليمات (اختياري)" style="resize:vertical"></textarea>' +
      '<input class="cp-search" id="hw-due" type="date">' +
      '<button class="cp-btn gold" onclick="hwAssign()" style="justify-content:center"><i class="fas fa-paper-plane"></i> تكليف الطلاب</button>' +
      '<div id="hw-assign-msg" class="cp-note" style="color:#69f0ae"></div>' +
      '</div></div>';

    if (!mine.length) {
      html += '<div class="cp-card" style="margin-top:1rem"><div class="cp-note" style="text-align:center;padding:.6rem">لم تكلّف أي واجب بعد.</div></div>';
    } else {
      html += mine.map(function (a) {
        var aSubs = subs.filter(function (s) { return s.assignment_id === a.id; });
        var graded = aSubs.filter(function (s) { return s.grade; }).length;
        var rows = aSubs.length ? aSubs.map(function (s) {
          return '<div style="border-top:1px solid rgba(255,255,255,.08);padding:.6rem 0">' +
            '<div style="display:flex;justify-content:space-between;gap:.5rem"><strong style="color:#fff">' + _esc(s.student_name) + '</strong>' +
            '<span style="font-size:.72rem;color:rgba(255,255,255,.45)">' + _date(s.ts) + '</span></div>' +
            '<div style="color:rgba(255,255,255,.8);font-size:.85rem;margin:.3rem 0;white-space:pre-wrap">' + _esc(s.text || '—') + '</div>' +
            '<div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">' +
            '<input class="cp-search" style="max-width:90px" id="grade-' + a.id + '-' + _esc(s.student_email) + '" type="text" placeholder="الدرجة" value="' + _esc(s.grade || '') + '">' +
            '<input class="cp-search" style="flex:1;min-width:120px" id="fb-' + a.id + '-' + _esc(s.student_email) + '" type="text" placeholder="ملاحظة" value="' + _esc(s.feedback || '') + '">' +
            '<button class="cp-btn cyan" onclick="hwGrade(\'' + a.id + '\',\'' + _esc(s.student_email) + '\')"><i class="fas fa-check"></i> حفظ</button>' +
            '</div></div>';
        }).join('') : '<div class="cp-note" style="padding:.4rem">لا تسليمات بعد.</div>';
        return '<div class="cp-card" style="margin-top:1rem">' +
          '<div style="display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start">' +
          '<h4 style="margin:0"><i class="fas fa-file-pen"></i> ' + _esc(a.title) + '</h4>' +
          '<button class="cp-ia danger" title="حذف" onclick="hwDeleteAssignment(\'' + a.id + '\')">🗑️</button></div>' +
          (a.note ? '<div class="cp-note" style="margin:.2rem 0">' + _esc(a.note) + '</div>' : '') +
          '<div class="cp-kv"><span class="k">الموعد</span><span class="val">' + (_esc(a.due_date) || '—') + '</span></div>' +
          '<div class="cp-kv"><span class="k">التسليمات</span><span class="val">' + aSubs.length + ' · صُحّح ' + graded + '</span></div>' +
          rows + '</div>';
      }).join('');
    }
    box.innerHTML = html;
  };

  window.hwLecChanged = function () {
    var sel = document.getElementById('hw-lec'); var title = document.getElementById('hw-title');
    if (!sel || !title) return;
    var opt = sel.options[sel.selectedIndex];
    var hw = opt ? opt.getAttribute('data-hw') : '';
    if (hw && !title.value.trim()) title.value = hw;
  };
  window.hwAssign = async function () {
    var title = (document.getElementById('hw-title') || {}).value || '';
    var note = (document.getElementById('hw-note') || {}).value || '';
    var due = (document.getElementById('hw-due') || {}).value || '';
    var lec = parseInt((document.getElementById('hw-lec') || {}).value || '0', 10) || 0;
    var msg = document.getElementById('hw-assign-msg');
    if (!title.trim()) { if (msg) { msg.style.color = '#ff6ea0'; msg.textContent = 'أدخل عنوان الواجب'; } return; }
    var r = await _api('POST', '/api/homework/assignments', { lecture_id: lec, title: title.trim(), note: note.trim(), due_date: due });
    if (r.ok) { try { showToast('تم تكليف الواجب ✅', 'xp-toast'); } catch (e) {} hwRenderDoctor('drp-hw'); }
    else if (msg) { msg.style.color = '#ff6ea0'; msg.textContent = 'تعذّر التكليف — تأكّد من الخادم.'; }
  };
  window.hwDeleteAssignment = async function (id) {
    if (!confirm('حذف هذا الواجب وكل تسليماته؟')) return;
    await _api('DELETE', '/api/homework/assignments/' + id);
    hwRenderDoctor('drp-hw');
  };
  window.hwGrade = async function (aid, email) {
    var g = (document.getElementById('grade-' + aid + '-' + email) || {}).value || '';
    var fb = (document.getElementById('fb-' + aid + '-' + email) || {}).value || '';
    var r = await _api('POST', '/api/homework/grade', { assignment_id: aid, student_email: email, grade: g, feedback: fb });
    if (r.ok) { try { showToast('تم حفظ الدرجة ✅', 'xp-toast'); } catch (e) {} hwRenderDoctor('drp-hw'); }
  };

  // ── STUDENT view ───────────────────────────────────────────────────
  window.hwRenderStudent = async function (containerId) {
    var box = document.getElementById(containerId); if (!box) return;
    var me = _me(); if (!me) return;
    if (!_tok()) { box.innerHTML = _needServerMsg(); return; }
    box.innerHTML = '<div class="cp-note" style="padding:.6rem">جارٍ التحميل...</div>';

    var ra = await _api('GET', '/api/homework/assignments');
    var rs = await _api('GET', '/api/homework/submissions');
    if (!ra.ok) { box.innerHTML = _needServerMsg(); return; }
    var assignments = ra.data.assignments || [];
    var mySubs = {};
    if (rs.ok && rs.data.submissions) rs.data.submissions.forEach(function (s) { if ((s.student_email || '').toLowerCase() === (me.email || '').toLowerCase()) mySubs[s.assignment_id] = s; });

    if (!assignments.length) {
      box.innerHTML = '<div class="cp-card"><div class="cp-note" style="text-align:center;padding:.8rem">لا توجد واجبات مكلَّفة حالياً.</div></div>';
      return;
    }
    box.innerHTML = assignments.map(function (a) {
      var sub = mySubs[a.id];
      var graded = sub && sub.grade;
      var statusChip = graded
        ? '<span class="cp-chip" style="background:rgba(0,245,120,.16);color:#69f0ae">صُحّح: ' + _esc(sub.grade) + '</span>'
        : (sub ? '<span class="cp-chip" style="background:rgba(255,215,0,.18);color:#ffd700">سُلّم — بانتظار التصحيح</span>'
               : '<span class="cp-chip" style="background:rgba(255,0,110,.16);color:#ff6ea0">لم يُسلَّم</span>');
      return '<div class="cp-card" style="margin-bottom:1rem">' +
        '<div style="display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start">' +
        '<h4 style="margin:0"><i class="fas fa-file-pen"></i> ' + _esc(a.title) + '</h4>' + statusChip + '</div>' +
        (a.note ? '<div class="cp-note" style="margin:.3rem 0">' + _esc(a.note) + '</div>' : '') +
        '<div class="cp-kv"><span class="k">من</span><span class="val">' + _esc(a.by_name || 'الدكتور') + '</span></div>' +
        (a.due_date ? '<div class="cp-kv"><span class="k">الموعد</span><span class="val">' + _esc(a.due_date) + '</span></div>' : '') +
        (graded && sub.feedback ? '<div class="cp-note" style="color:#69f0ae;margin-top:.4rem">ملاحظة الدكتور: ' + _esc(sub.feedback) + '</div>' : '') +
        '<textarea class="cp-search" id="hwsub-' + a.id + '" rows="3" placeholder="اكتب إجابتك هنا..." style="resize:vertical;margin-top:.6rem">' + _esc(sub ? sub.text : '') + '</textarea>' +
        '<button class="cp-btn gold" style="width:100%;justify-content:center;margin-top:.5rem" onclick="hwSubmit(\'' + a.id + '\')"><i class="fas fa-upload"></i> ' + (sub ? 'تحديث التسليم' : 'تسليم الواجب') + '</button>' +
        '</div>';
    }).join('');
  };
  window.hwSubmit = async function (aid) {
    var text = (document.getElementById('hwsub-' + aid) || {}).value || '';
    if (!text.trim()) { try { showToast('اكتب إجابتك أولاً', 'heart-toast'); } catch (e) {} return; }
    var r = await _api('POST', '/api/homework/submissions', { assignment_id: aid, text: text.trim() });
    if (r.ok) { try { showToast('تم تسليم الواجب ✅', 'xp-toast'); } catch (e) {} hwRenderStudent('stu-hw'); }
    else { try { showToast('تعذّر التسليم — تأكّد من الخادم', 'heart-toast'); } catch (e) {} }
  };
})();
