/* ================================================================
   AUS — لوحات التحكّم حسب الدور
   • لوحة الطالب  (studentpanel)  — لكل مستخدم مسجَّل
   • لوحة الإدارة (adminpanel)    — للمشرفين فقط
   نظام مستقل | يعتمد على ausAuth | لا يمسّ أي نظام قائم
   ================================================================ */
(function () {
  'use strict';

  // ── CSS (cinematic gold/dark, RTL) ─────────────────────────────────
  (function () {
    if (document.getElementById('cp-styles')) return;
    var s = document.createElement('style');
    s.id = 'cp-styles';
    s.textContent = `
    #studentpanel, #adminpanel { padding: 1.4rem 0 4rem; }
    .cp-hero { display:flex; align-items:center; gap:1.1rem; flex-wrap:wrap; background:linear-gradient(135deg,rgba(255,215,0,.08),rgba(0,5,25,.6));
      border:1px solid rgba(255,215,0,.25); border-radius:20px; padding:1.3rem 1.5rem; margin-bottom:1.5rem; }
    .cp-avatar { width:64px; height:64px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center;
      font-size:1.7rem; font-weight:800; color:#1a1000; background:linear-gradient(135deg,#ffd700,#ff9500); background-size:cover; box-shadow:0 6px 20px rgba(255,183,0,.4); }
    .cp-hero-info { flex:1; min-width:180px; }
    .cp-hero-info h2 { color:#fff; font-size:1.4rem; margin:0 0 .25rem; }
    .cp-hero-info .cp-sub { color:rgba(255,255,255,.55); font-size:.85rem; }
    .cp-chips { display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.5rem; }
    .cp-chip { font-size:.72rem; font-weight:800; border-radius:50px; padding:3px 12px; }
    .cp-chip.role-admin { background:rgba(255,0,110,.18); border:1px solid rgba(255,0,110,.45); color:#ff6ea0; }
    .cp-chip.role-student { background:rgba(0,212,255,.15); border:1px solid rgba(0,212,255,.4); color:#00d4ff; }
    .cp-chip.role-doctor { background:rgba(157,78,221,.18); border:1px solid rgba(157,78,221,.45); color:#c79dff; }
    .cp-chip.plan-pro { background:rgba(255,215,0,.2); border:1px solid rgba(255,215,0,.5); color:#ffd700; }
    .cp-chip.plan-free { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.7); }
    .cp-chip.prov { background:rgba(157,78,221,.15); border:1px solid rgba(157,78,221,.4); color:#c79dff; }
    .cp-hero-actions { display:flex; gap:.5rem; flex-wrap:wrap; }
    .cp-btn { border:none; border-radius:11px; padding:.6rem 1.1rem; cursor:pointer; font-family:'Tajawal',sans-serif; font-weight:700; font-size:.84rem; transition:all .2s; display:inline-flex; align-items:center; gap:7px; }
    .cp-btn.gold { background:linear-gradient(135deg,#ffd700,#ff9500); color:#1a1000; }
    .cp-btn.ghost { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.18); color:#fff; }
    .cp-btn.danger { background:rgba(255,0,110,.14); border:1px solid rgba(255,0,110,.4); color:#ff6ea0; }
    .cp-btn.cyan { background:rgba(0,212,255,.12); border:1px solid rgba(0,212,255,.38); color:#00d4ff; }
    .cp-btn:hover { transform:translateY(-1px); filter:brightness(1.08); }
    .cp-stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:.9rem; margin-bottom:1.5rem; }
    .cp-stat { background:linear-gradient(135deg,rgba(8,12,30,.9),rgba(0,5,20,.95)); border:1px solid rgba(255,255,255,.1); border-radius:16px; padding:1.1rem 1.2rem; }
    .cp-stat .ic { font-size:1.5rem; margin-bottom:.4rem; }
    .cp-stat .v { font-family:'Orbitron',monospace; font-size:1.7rem; font-weight:800; color:#ffd700; line-height:1; }
    .cp-stat .l { color:rgba(255,255,255,.55); font-size:.78rem; margin-top:.35rem; }
    .cp-section-title { color:#fff; font-size:1.05rem; font-weight:800; margin:1.6rem 0 .9rem; display:flex; align-items:center; gap:.6rem; }
    .cp-section-title i { color:#ffd700; }
    .cp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:1rem; }
    .cp-card { background:linear-gradient(135deg,rgba(8,12,30,.9),rgba(0,5,20,.95)); border:1px solid rgba(255,255,255,.1); border-radius:16px; padding:1.2rem; }
    .cp-card h4 { color:#fff; font-size:.95rem; margin:0 0 .7rem; display:flex; align-items:center; gap:.5rem; }
    .cp-card h4 i { color:#00d4ff; }
    .cp-kv { display:flex; justify-content:space-between; gap:.6rem; padding:.4rem 0; border-bottom:1px solid rgba(255,255,255,.06); font-size:.83rem; }
    .cp-kv:last-child { border-bottom:none; }
    .cp-kv .k { color:rgba(255,255,255,.5); } .cp-kv .val { color:#fff; font-weight:700; }
    .cp-quick { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:.7rem; }
    .cp-quick button { background:rgba(0,212,255,.07); border:1px solid rgba(0,212,255,.22); border-radius:12px; padding:.9rem; color:#fff; cursor:pointer; font-family:'Tajawal',sans-serif; font-weight:700; font-size:.85rem; transition:all .2s; display:flex; flex-direction:column; align-items:center; gap:.4rem; }
    .cp-quick button:hover { background:rgba(0,212,255,.15); transform:translateY(-2px); }
    .cp-quick button .qi { font-size:1.4rem; }
    /* Admin table */
    .cp-toolbar { display:flex; gap:.7rem; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-bottom:1rem; }
    .cp-search { flex:1; min-width:200px; background:rgba(0,10,30,.6); border:1px solid rgba(255,215,0,.25); border-radius:11px; padding:.65rem 1rem; color:#fff; font-family:'Tajawal',sans-serif; font-size:.88rem; outline:none; }
    .cp-search:focus { border-color:rgba(255,215,0,.55); }
    .cp-table-wrap { overflow-x:auto; border:1px solid rgba(255,255,255,.1); border-radius:16px; }
    table.cp-table { width:100%; border-collapse:collapse; min-width:760px; }
    .cp-table th { text-align:start; font-size:.74rem; color:rgba(255,255,255,.5); font-weight:700; padding:.8rem 1rem; background:rgba(255,255,255,.03); border-bottom:1px solid rgba(255,255,255,.1); white-space:nowrap; }
    .cp-table td { padding:.7rem 1rem; font-size:.83rem; color:#fff; border-bottom:1px solid rgba(255,255,255,.06); white-space:nowrap; }
    .cp-table tr:hover td { background:rgba(255,215,0,.04); }
    .cp-uname { display:flex; align-items:center; gap:.6rem; }
    .cp-uava { width:30px; height:30px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:800; color:#1a1000; background:linear-gradient(135deg,#ffd700,#ff9500); }
    .cp-badge { font-size:.68rem; font-weight:800; border-radius:50px; padding:2px 9px; }
    .cp-badge.admin { background:rgba(255,0,110,.18); color:#ff6ea0; } .cp-badge.student { background:rgba(0,212,255,.15); color:#00d4ff; }
    .cp-badge.doctor { background:rgba(157,78,221,.18); color:#c79dff; }
    .cp-badge.pro { background:rgba(255,215,0,.2); color:#ffd700; } .cp-badge.free { background:rgba(255,255,255,.08); color:rgba(255,255,255,.65); }
    .cp-badge.on { background:rgba(0,245,120,.16); color:#69f0ae; } .cp-badge.off { background:rgba(255,0,110,.16); color:#ff6ea0; }
    .cp-row-actions { display:flex; gap:.35rem; }
    .cp-ia { width:30px; height:30px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05); color:#fff; cursor:pointer; font-size:.78rem; transition:all .2s; }
    .cp-ia:hover { background:rgba(255,255,255,.14); }
    .cp-ia.danger:hover { background:rgba(255,0,110,.25); border-color:rgba(255,0,110,.5); }
    .cp-empty { text-align:center; padding:3rem 1rem; color:rgba(255,255,255,.5); }
    .cp-empty .ic { font-size:3rem; margin-bottom:.8rem; opacity:.7; }
    .cp-empty h3 { color:#fff; margin:0 0 .5rem; }
    .cp-note { font-size:.72rem; color:rgba(255,255,255,.4); margin-top:.5rem; line-height:1.7; }
    .cp-notif-badge { display:inline-flex; align-items:center; justify-content:center; min-width:20px; height:20px; padding:0 6px; border-radius:50px;
      background:rgba(255,0,110,.85); color:#fff; font-size:.68rem; font-weight:800; margin-inline-start:6px; vertical-align:middle; }
    .cp-notif-item { padding:.9rem 1rem; border-radius:14px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); margin-bottom:.7rem; }
    .cp-notif-item:last-child { margin-bottom:0; }
    .cp-notif-item.unread { border-color:rgba(0,212,255,.4); background:rgba(0,212,255,.05); }
    .cp-notif-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:.4rem; flex-wrap:wrap; gap:.4rem; }
    .cp-notif-sender { color:#c79dff; font-weight:800; font-size:.8rem; }
    .cp-notif-time { color:rgba(255,255,255,.4); font-size:.72rem; }
    .cp-notif-text { color:rgba(255,255,255,.85); font-size:.88rem; line-height:1.7; margin-bottom:.6rem; }
    .cp-notif-like { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.18);
      color:rgba(255,255,255,.7); border-radius:50px; padding:5px 14px; cursor:pointer; font-family:'Tajawal',sans-serif; font-weight:700; font-size:.78rem; transition:all .2s; }
    .cp-notif-like:hover { background:rgba(255,255,255,.12); }
    .cp-notif-like.liked { background:rgba(0,212,255,.18); border-color:rgba(0,212,255,.5); color:#00d4ff; }
    @media(max-width:640px){ .cp-hero{flex-direction:column;text-align:center;} .cp-hero-actions{justify-content:center;} }
    `;
    document.head.appendChild(s);
  })();

  var CP = { search: '' };

  // ── Helpers ────────────────────────────────────────────────────────
  function _esc(t) { return (t || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function _g(name, fb) { try { return (typeof window[name] !== 'undefined' && window[name] != null) ? window[name] : fb; } catch (e) { return fb; } }
  function _date(ts) { if (!ts) return '—'; try { return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return '—'; } }
  function _purchases() { try { return (typeof getPurchased === 'function') ? getPurchased() : []; } catch (e) { return []; } }
  function _catalog() { try { return (typeof LEADERSHIP_FILES !== 'undefined') ? LEADERSHIP_FILES : []; } catch (e) { return []; } }
  function _loginPrompt(sectionId, msg) {
    return '<div class="cp-empty"><div class="ic">🔒</div><h3>' + msg + '</h3>' +
      '<button class="cp-btn gold" onclick="ausAuth.openModal(\'login\')"><i class="fas fa-user"></i> تسجيل الدخول</button></div>';
  }

  // ── Student inbox — read-only messages from doctor/admin, like-only ────
  // Deliberately renders no reply box, no text input, nothing but a single
  // like toggle per message — that's the entire interaction surface allowed.
  function _notifyInboxHtml() {
    if (!window.AusNotify) return '';
    var u = window.ausAuth.user;
    var mine = window.AusNotify.getMine();
    var unread = window.AusNotify.getUnreadCount();
    var rows = mine.length ? mine.map(function (n) {
      var wasUnreadWhenOpened = n.readBy.indexOf(u.email) === -1; // check BEFORE marking read below
      window.AusNotify.markRead(n.id); // viewing the inbox counts as reading it
      var roleBadge = n.senderRole === 'admin' ? '🛡️ الإدارة' : '👨‍🏫 دكتور';
      var liked = n.likedBy.indexOf(u.email) !== -1;
      return '<div class="cp-notif-item' + (wasUnreadWhenOpened ? ' unread' : '') + '">' +
        '<div class="cp-notif-head"><span class="cp-notif-sender">' + roleBadge + ' — ' + _esc(n.senderName) + '</span>' +
        '<span class="cp-notif-time">' + _date(n.ts) + '</span></div>' +
        '<div class="cp-notif-text">' + _esc(n.text) + '</div>' +
        '<button class="cp-notif-like' + (liked ? ' liked' : '') + '" id="notif-like-' + n.id + '" onclick="cpToggleLike(\'' + n.id + '\')">' +
        '<i class="fas fa-thumbs-up"></i> <span>' + n.likedBy.length + '</span></button>' +
        '</div>';
    }).join('') : '<div class="cp-note" style="text-align:center;padding:1rem">لا توجد رسائل بعد.</div>';

    return '<div class="cp-section-title"><i class="fas fa-inbox"></i> صندوق الرسائل' + (unread ? ' <span class="cp-notif-badge">' + unread + '</span>' : '') + '</div>' +
      '<div class="cp-card">' + rows + '</div>';
  }
  window.cpToggleLike = function (notifId) {
    var nowLiked = window.AusNotify.toggleLike(notifId);
    var btn = document.getElementById('notif-like-' + notifId);
    if (!btn) return;
    btn.classList.toggle('liked', nowLiked);
    var span = btn.querySelector('span');
    var count = parseInt(span.textContent, 10) || 0;
    span.textContent = nowLiked ? count + 1 : Math.max(0, count - 1);
  };

  // ── Send-to-student notifications — shared by doctor + admin panels ────
  // Students can only ever like these, never reply — see the inbox card in
  // the student panel, which renders no text input at all for messages.
  function _notifySendBoxHtml(idPrefix) {
    var accounts = (window.ausAuth && window.ausAuth.listAccounts) ? window.ausAuth.listAccounts() : [];
    var students = accounts.filter(function (a) { return a.role === 'student'; });
    var options = '<option value="' + window.AusNotify.BROADCAST_ALL + '">📢 جميع الطلاب</option>' +
      students.map(function (s) { return '<option value="' + _esc(s.email) + '">' + _esc(s.full_name || s.email) + ' (' + _esc(s.email) + ')</option>'; }).join('');
    var sent = window.AusNotify.getSentByMe();
    var sentRows = sent.length ? sent.map(function (n) {
      var to = n.recipientEmail === window.AusNotify.BROADCAST_ALL ? '📢 جميع الطلاب' : _esc(n.recipientEmail);
      return '<div class="cp-kv"><span class="k">' + to + ' <span style="opacity:.5;font-size:.72rem">· ' + _date(n.ts) + '</span><br>' +
        '<span style="color:rgba(255,255,255,.6);font-size:.8rem">' + _esc(n.text) + '</span></span>' +
        '<span class="val">👍 ' + n.likedBy.length + '</span></div>';
    }).join('') : '<div class="cp-note">لا توجد رسائل مرسَلة بعد.</div>';

    return '<div class="cp-section-title"><i class="fas fa-paper-plane"></i> إرسال رسالة لطالب</div>' +
      '<div class="cp-card">' +
      '<div style="display:flex;flex-direction:column;gap:.6rem">' +
      '<select class="cp-search" id="' + idPrefix + '-notify-to">' + options + '</select>' +
      '<textarea class="cp-search" id="' + idPrefix + '-notify-text" rows="3" placeholder="اكتب رسالتك للطالب..." style="resize:vertical;font-family:inherit"></textarea>' +
      '<button class="cp-btn gold" style="align-self:flex-start" onclick="cpSendNotification(\'' + idPrefix + '\')"><i class="fas fa-paper-plane"></i> إرسال</button>' +
      '<div id="' + idPrefix + '-notify-msg" class="cp-note"></div>' +
      '</div>' +
      '<div style="margin-top:1rem"><div style="color:rgba(255,255,255,.6);font-weight:700;margin-bottom:.4rem;font-size:.85rem">الرسائل المرسَلة</div>' + sentRows + '</div>' +
      '</div>';
  }
  window.cpSendNotification = function (idPrefix) {
    var toEl = document.getElementById(idPrefix + '-notify-to');
    var textEl = document.getElementById(idPrefix + '-notify-text');
    var msgEl = document.getElementById(idPrefix + '-notify-msg');
    var text = (textEl.value || '').trim();
    if (!text) { msgEl.style.color = '#ff6ea0'; msgEl.textContent = 'اكتب نص الرسالة أولاً'; return; }
    var entry = window.AusNotify.send(toEl.value, text);
    if (!entry) { msgEl.style.color = '#ff6ea0'; msgEl.textContent = 'تعذّر الإرسال'; return; }
    textEl.value = '';
    msgEl.style.color = '#69f0ae'; msgEl.textContent = '✓ تم الإرسال';
    if (typeof showToast === 'function') showToast('✅ تم إرسال الرسالة', 'xp-toast');
    setTimeout(function () {
      var dp = document.getElementById('doctorpanel'), ap = document.getElementById('adminpanel');
      if (dp && dp.classList.contains('active')) renderDoctorPanel();
      else if (ap && ap.classList.contains('active')) renderAdminPanel();
    }, 1200);
  };

  // ── STUDENT PANEL ──────────────────────────────────────────────────
  function renderStudentPanel() {
    var sec = document.getElementById('studentpanel');
    if (!sec) return;
    var u = (window.ausAuth && ausAuth.user) ? ausAuth.user : null;
    if (!u) { sec.innerHTML = _loginPrompt('studentpanel', 'سجّل الدخول لعرض لوحة الطالب'); return; }

    var purchased = _purchases();
    var owned = _catalog().filter(function (f) { return purchased.indexOf(f.id) !== -1; });
    var books = owned.filter(function (f) { return f.type === 'book'; }).length;
    var files = owned.length - books;
    var xp = _g('userXP', 0), lvl = _g('userLevel', 1), hearts = _g('currentHearts', 3);
    var info = (ausAuth.listAccounts ? ausAuth.listAccounts() : []).filter(function (a) { return a.email === u.email; })[0] || {};
    var roleAr = u.role === 'admin' ? 'مشرف' : (u.role === 'doctor' ? 'دكتور' : 'طالب');
    var roleIc = u.role === 'admin' ? '🛡️ ' : (u.role === 'doctor' ? '👨‍🏫 ' : '🎓 ');
    var provAr = { email: 'بريد', google: 'Google', microsoft: 'Microsoft', apple: 'Apple', guest: 'ضيف' }[u.provider] || u.provider;
    var av = u.avatar ? ' style="background-image:url(' + _esc(u.avatar) + ')"' : '';
    var letter = (u.full_name || u.email || '؟')[0].toUpperCase();

    sec.innerHTML =
      '<div class="cp-hero">' +
      '<div class="cp-avatar"' + av + '>' + (u.avatar ? '' : _esc(letter)) + '</div>' +
      '<div class="cp-hero-info">' +
      '<h2>مرحباً، ' + _esc(u.full_name || 'طالب') + ' 👋</h2>' +
      '<div class="cp-sub">' + _esc(u.email) + '</div>' +
      '<div class="cp-chips">' +
      '<span class="cp-chip role-' + u.role + '">' + roleIc + roleAr + '</span>' +
      '<span class="cp-chip plan-' + (u.plan === 'pro' ? 'pro' : 'free') + '">' + (u.plan === 'pro' ? '⭐ PRO' : 'مجاني') + '</span>' +
      '<span class="cp-chip prov">' + provAr + '</span>' +
      '</div></div>' +
      '<div class="cp-hero-actions">' +
      (u.role === 'admin' ? '<button class="cp-btn ghost" onclick="showSection(\'adminpanel\')"><i class="fas fa-user-shield"></i> لوحة الإدارة</button>' : '') +
      '<button class="cp-btn cyan" onclick="cpEditName()"><i class="fas fa-pen"></i> تعديل الاسم</button>' +
      '<button class="cp-btn danger" onclick="ausAuth.logout()"><i class="fas fa-sign-out-alt"></i> خروج</button>' +
      '</div></div>' +

      '<div class="cp-stats">' +
      _stat('⚡', xp, 'نقاط الخبرة XP') +
      _stat('🏆', 'م' + lvl, 'المستوى') +
      _stat('❤️', hearts + '/3', 'القلوب') +
      _stat('📚', owned.length, 'عناصر مكتبتي') +
      '</div>' +

      '<div class="cp-grid">' +
      // Library card
      '<div class="cp-card"><h4><i class="fas fa-book-bookmark"></i> مكتبتي</h4>' +
      '<div class="cp-kv"><span class="k">📖 كتب</span><span class="val">' + books + '</span></div>' +
      '<div class="cp-kv"><span class="k">📄 ملفات</span><span class="val">' + files + '</span></div>' +
      '<div class="cp-kv"><span class="k">الإجمالي</span><span class="val">' + owned.length + '</span></div>' +
      '<button class="cp-btn gold" style="width:100%;justify-content:center;margin-top:.8rem" onclick="showSection(\'library\')"><i class="fas fa-arrow-left"></i> افتح مكتبتي</button>' +
      '</div>' +
      // Account card
      '<div class="cp-card"><h4><i class="fas fa-id-card"></i> معلومات الحساب</h4>' +
      '<div class="cp-kv"><span class="k">طريقة الدخول</span><span class="val">' + provAr + '</span></div>' +
      '<div class="cp-kv"><span class="k">عضو منذ</span><span class="val">' + _date(info.createdAt) + '</span></div>' +
      '<div class="cp-kv"><span class="k">آخر دخول</span><span class="val">' + _date(info.lastLogin) + '</span></div>' +
      '<div class="cp-kv"><span class="k">الخطة</span><span class="val">' + (u.plan === 'pro' ? 'PRO ⭐' : 'مجانية') + '</span></div>' +
      '</div>' +
      '</div>' +

      _notifyInboxHtml() +

      '<div class="cp-section-title"><i class="fas fa-bolt"></i> متابعة التعلّم</div>' +
      '<div class="cp-quick">' +
      _quick('tools', '🧰', 'الأدوات') +
      _quick('challenges', '🧠', 'التحديات') +
      _quick('ceoai', '🤖', 'CEO AI') +
      _quick('doctorai', '👨‍🏫', 'دكتور AI') +
      _quick('calc', '🧮', 'الحاسبات المالية') +
      _quick('careerdna', '🧬', 'Career DNA') +
      _quick('interview', '🎤', 'مقابلة AI') +
      _quick('dashboard', '📊', 'لوحة المؤشّرات') +
      '</div>' +
      '<div class="cp-section-title"><i class="fas fa-file-pen"></i> واجباتي</div>' +
      '<div id="stu-hw"></div>' +
      _studentResultsHTML();

    if (window.hwRenderStudent) hwRenderStudent('stu-hw');
  }

  // ── Student saved answers / results ────────────────────────────────
  function _studentResultsHTML() {
    var st = (typeof getStudentStats === 'function') ? getStudentStats() : { answered: 0, correct: 0, accuracy: 0, examsCount: 0, lastExams: [], recentAnswers: [], bySystem: {} };
    var html = '<div class="cp-section-title"><i class="fas fa-clipboard-check"></i> إجاباتي ونتائجي</div>';

    if (!st.answered && !st.examsCount) {
      return html + '<div class="cp-card"><div class="cp-note" style="text-align:center;padding:1rem">لم تحلّ أي تمرين بعد. ابدأ من «التحديات» أو «الحاسبات المالية» وستُحفَظ كل إجاباتك هنا تلقائياً.</div></div>';
    }

    html += '<div class="cp-stats" style="margin-bottom:1rem">' +
      _stat('📝', st.answered, 'إجابات محفوظة') +
      _stat('✅', st.correct, 'إجابات صحيحة') +
      _stat('🎯', st.accuracy + '%', 'نسبة الدقّة') +
      _stat('📋', st.examsCount, 'امتحانات مكتملة') +
      '</div>';

    // Per-system accuracy
    var sysKeys = Object.keys(st.bySystem || {});
    if (sysKeys.length) {
      html += '<div class="cp-card" style="margin-bottom:1rem"><h4><i class="fas fa-chart-pie"></i> الدقّة حسب النظام</h4>' +
        sysKeys.map(function (k) {
          var s = st.bySystem[k]; var p = s.n ? Math.round(s.c / s.n * 100) : 0;
          return '<div class="cp-kv"><span class="k">' + _esc(k) + '</span><span class="val">' + s.c + '/' + s.n + ' · ' + p + '%</span></div>';
        }).join('') + '</div>';
    }

    // Completed exams
    if (st.lastExams.length) {
      html += '<div class="cp-card" style="margin-bottom:1rem"><h4><i class="fas fa-award"></i> آخر الامتحانات</h4>' +
        st.lastExams.map(function (e) {
          var clr = e.pct >= 70 ? '#69f0ae' : e.pct >= 50 ? '#ffd60a' : '#ff6ea0';
          return '<div class="cp-kv"><span class="k">' + _esc(e.title || e.system) + ' <span style="opacity:.5;font-size:.74rem">· ' + _date(e.ts) + '</span></span>' +
            '<span class="val" style="color:' + clr + '">' + e.score + '/' + e.total + ' (' + e.pct + '%)</span></div>';
        }).join('') + '</div>';
    }

    // Recent answers
    if (st.recentAnswers.length) {
      html += '<div class="cp-card"><h4><i class="fas fa-history"></i> آخر الإجابات</h4>' +
        st.recentAnswers.map(function (a) {
          return '<div class="cp-kv"><span class="k" style="max-width:70%">' + (a.correct ? '✅' : '❌') + ' ' + _esc((a.q || '').slice(0, 70)) + '</span>' +
            '<span class="val" style="opacity:.7;font-size:.74rem">' + _esc((a.system || '')) + '</span></div>';
        }).join('') +
        '<button class="cp-btn ghost" style="width:100%;justify-content:center;margin-top:.8rem" onclick="cpClearResults()"><i class="fas fa-trash"></i> مسح سجلّ إجاباتي</button>' +
        '</div>';
    }
    return html;
  }
  window.cpClearResults = function () {
    if (!confirm('مسح كل سجلّ إجاباتك ونتائجك؟ لا يمكن التراجع.')) return;
    if (typeof clearStudentData === 'function') clearStudentData();
    renderStudentPanel();
    try { showToast('تم مسح السجلّ', 'heart-toast'); } catch (e) {}
  };
  function _stat(ic, v, l) { return '<div class="cp-stat"><div class="ic">' + ic + '</div><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }
  function _quick(sec, ic, l) { return '<button onclick="showSection(\'' + sec + '\')"><span class="qi">' + ic + '</span>' + l + '</button>'; }

  function cpEditName() {
    var u = window.ausAuth && ausAuth.user; if (!u) return;
    var n = prompt('الاسم الكامل:', u.full_name || '');
    if (n === null) return;
    n = n.trim(); if (!n) return;
    // update via admin helper (works on own account)
    if (ausAuth.adminSetRole) { /* reuse upsert path */ }
    try {
      var key = 'aus.accounts';
      var all = JSON.parse(localStorage.getItem(key) || '[]');
      for (var i = 0; i < all.length; i++) { if (all[i].email === u.email) all[i].full_name = n; }
      localStorage.setItem(key, JSON.stringify(all));
      u.full_name = n; localStorage.setItem('aus.session', JSON.stringify(u));
    } catch (e) {}
    if (typeof ausAuth !== 'undefined') { var p = document.getElementById('authUserName'); if (p) p.textContent = n.substring(0, 16); }
    renderStudentPanel();
    try { showToast('تم تحديث الاسم ✅', 'xp-toast'); } catch (e) {}
  }

  // ── ADMIN PANEL ────────────────────────────────────────────────────
  function renderAdminPanel() {
    var sec = document.getElementById('adminpanel');
    if (!sec) return;
    var u = (window.ausAuth && ausAuth.user) ? ausAuth.user : null;
    if (!u) { sec.innerHTML = _loginPrompt('adminpanel', 'سجّل الدخول بحساب المالك لعرض لوحة الإدارة'); return; }
    if (!ausAuth.isOwner) {
      sec.innerHTML = '<div class="cp-empty"><div class="ic">⛔</div><h3>لوحة الإدارة لمالك التطبيق فقط</h3>' +
        '<p style="color:rgba(255,255,255,.5)">هذه اللوحة وصلاحية التعديل مخصّصة لحساب المالك وحده. حسابك الحالي حساب طالب.</p>' +
        '<button class="cp-btn gold" onclick="showSection(\'studentpanel\')"><i class="fas fa-gauge-high"></i> لوحة الطالب</button></div>';
      return;
    }

    var accounts = ausAuth.listAccounts ? ausAuth.listAccounts() : [];
    var doctors = accounts.filter(function (a) { return a.role === 'doctor'; }).length;
    var admins = accounts.filter(function (a) { return a.role === 'admin'; }).length;
    var students = accounts.length - doctors - admins;
    var pro = accounts.filter(function (a) { return a.plan === 'pro'; }).length;
    var guests = accounts.filter(function (a) { return a.provider === 'guest'; }).length;

    sec.innerHTML =
      '<div class="cp-hero">' +
      '<div class="cp-avatar">🛡️</div>' +
      '<div class="cp-hero-info"><h2>لوحة الإدارة</h2>' +
      '<div class="cp-sub">إدارة الحسابات والصلاحيات والاشتراكات</div></div>' +
      '<div class="cp-hero-actions">' +
      '<button class="cp-btn ghost" onclick="showSection(\'studentpanel\')"><i class="fas fa-gauge-high"></i> لوحتي</button>' +
      '<button class="cp-btn cyan" onclick="toggleSettings()"><i class="fas fa-cog"></i> الإعدادات</button>' +
      '</div></div>' +

      // state of the owner's SERVER session (aus_52_session.js): active & self-renewing, or "sign in to the server" in one click
      '<div id="cp-session-chip" style="margin:.2rem 0 1rem"></div>' +

      '<div class="cp-stats">' +
      _stat('👥', accounts.length, 'إجمالي الحسابات') +
      _stat('🎓', students, 'الطلاب') +
      _stat('👨‍🏫', doctors, 'الدكاترة') +
      _stat('⭐', pro, 'مشتركو PRO') +
      _stat('👤', guests, 'حسابات ضيف') +
      '</div>' +

      '<div class="cp-section-title"><i class="fas fa-users-gear"></i> إدارة الحسابات</div>' +
      '<div class="cp-toolbar">' +
      '<input class="cp-search" id="cp-admin-search" type="text" placeholder="ابحث بالاسم أو البريد..." value="' + _esc(CP.search) + '" oninput="cpAdminSearch(this.value)">' +
      '</div>' +
      '<div id="cp-admin-table"></div>' +

      // Owner CMS — full, instant control of specialties / tools / store & prices / questions / platform settings (aus_49_content_studio.js)
      '<div class="cp-section-title"><i class="fas fa-sliders"></i> استوديو المحتوى — تحكّم كامل ولحظي</div>' +
      '<div id="cs-root"></div>' +

      '<div class="cp-section-title"><i class="fas fa-store"></i> إدارة المحتوى والأسعار</div>' +
      '<div id="cp-catalog"></div>' +

      '<div class="cp-section-title"><i class="fas fa-clipboard-list"></i> إجابات الطلاب (من الخادم)</div>' +
      '<div id="cp-server-results"></div>' +

      '<div class="cp-section-title"><i class="fas fa-user-shield"></i> صلاحية الإدارة</div>' +
      '<div class="cp-card" style="max-width:560px">' +
      '<div class="cp-kv"><span class="k">حساب المالك الوحيد</span><span class="val" style="direction:ltr;font-family:monospace;color:#ffd700">' + _esc(ausAuth.ownerEmail) + '</span></div>' +
      '<div class="cp-note">لوحة الإدارة وكل صلاحيات التعديل مرتبطة بهذا البريد حصراً. يحصل المالك على الصلاحية تلقائياً على <strong>أي جهاز</strong> بمجرّد تسجيل دخوله — لا أحد غيره يمكنه التعديل.</div>' +
      '</div>' +

      '<div class="cp-section-title"><i class="fas fa-lock"></i> تغيير كلمة سرّ المالك</div>' +
      '<div class="cp-card" style="max-width:560px">' +
      '<div class="cp-note">غيّر كلمة سرّك من هنا مباشرة. تُحفظ على الخادم (وملف الإعدادات) فوراً وتعمل على كل الأجهزة.</div>' +
      '<div style="display:flex;flex-direction:column;gap:.6rem;margin-top:.7rem">' +
      '<input class="cp-search" id="cp-cur-pw" type="password" placeholder="كلمة السرّ الحالية" autocomplete="current-password" style="direction:ltr">' +
      '<input class="cp-search" id="cp-new-pw" type="password" placeholder="كلمة السرّ الجديدة (6 أحرف على الأقل)" autocomplete="new-password" style="direction:ltr">' +
      '<button class="cp-btn gold" onclick="cpChangeOwnerPw()" style="justify-content:center"><i class="fas fa-save"></i> حفظ كلمة السرّ</button>' +
      '</div><div id="cp-pw-msg" class="cp-note" style="margin-top:.5rem"></div>' +
      '</div>' +

      '<div class="cp-section-title"><i class="fas fa-user-graduate"></i> رمز الدكتور</div>' +
      '<div class="cp-card" style="max-width:560px">' +
      '<div class="cp-note">من يُدخل هذا الرمز عند إنشاء حساب من لوحة «دكتور» يصبح دكتوراً. شاركه مع أعضاء هيئة التدريس فقط.</div>' +
      '<div class="cp-kv"><span class="k">الرمز الحالي</span><span class="val" style="direction:ltr;font-family:monospace;color:#c79dff">' + _esc(ausAuth.doctorCode || '') + '</span></div>' +
      '<div style="display:flex;gap:.5rem;margin-top:.7rem">' +
      '<input class="cp-search" id="cp-doctor-code" type="text" placeholder="رمز دكتور جديد" style="direction:ltr;font-family:monospace">' +
      '<button class="cp-btn cyan" onclick="cpSaveDoctorCode()"><i class="fas fa-save"></i> حفظ</button>' +
      '</div><div id="cp-doc-msg" class="cp-note" style="color:#69f0ae"></div>' +
      '</div>' +

      _notifySendBoxHtml('adm');

    try { if (window.AUS_SESSION) AUS_SESSION.mountChip(document.getElementById('cp-session-chip')); } catch (e) {}
    renderAdminTable();
    renderCatalogManager();
    renderServerResults();
    try { if (window.AUS_STUDIO) AUS_STUDIO.mount(document.getElementById('cs-root')); } catch (e) { console.warn('Content Studio:', e); }
  }
  window.cpSaveDoctorCode = function () {
    var v = (document.getElementById('cp-doctor-code') || {}).value || '';
    var m = document.getElementById('cp-doc-msg');
    if (!v.trim()) { if (m) { m.style.color = '#ff6ea0'; m.textContent = 'أدخل رمزاً صالحاً'; } return; }
    if (ausAuth.setDoctorCode) ausAuth.setDoctorCode(v.trim());
    if (m) { m.style.color = '#69f0ae'; m.textContent = '✓ تم حفظ رمز الدكتور الجديد'; setTimeout(function () { m.textContent = ''; }, 3000); }
    var inp = document.getElementById('cp-doctor-code'); if (inp) inp.value = '';
    renderAdminPanel();
  };

  // ── Owner view: all students' results from the server ──────────────
  function renderServerResults() {
    var wrap = document.getElementById('cp-server-results');
    if (!wrap) return;
    var S = window.AUS_SESSION;                    // the shared session gate (aus_52_session.js): Authorization header + automatic token renewal
    var signInBtn = S ? ' <button class="cp-btn cyan" style="margin-top:.5rem" onclick="AUS_SESSION.signIn({reason:\'manual\'}).then(function(ok){ if (ok) renderServerResults(); })"><i class="fas fa-right-to-bracket"></i> تسجيل الدخول للخادم</button>' : '';
    var base = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
    var t = ''; try { t = localStorage.getItem('aus_access_token') || ''; } catch (e) {}
    if (!t && !(S && S.status().hasRefresh)) { wrap.innerHTML = '<div class="cp-card"><div class="cp-note" style="padding:.8rem">سجّل دخول المالك مع تشغيل الخادم (START_AUS.bat) لعرض إجابات الطلاب المرفوعة.' + signInBtn + '</div></div>'; return; }
    wrap.innerHTML = '<div class="cp-card"><div class="cp-note">جارٍ جلب نتائج الطلاب من الخادم...</div></div>';
    (S ? S.request('GET', '/api/results/all', undefined, { owner: true }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.data; })
       : fetch(base + '/api/results/all', { headers: { 'Authorization': 'Bearer ' + t }, cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }))
      .then(function (d) {
        var studs = (d && d.students) || [];
        var head = '<div class="cp-toolbar"><div class="cp-note">عدد الطلاب الذين رفعوا نتائج: <strong>' + studs.length + '</strong></div>' +
          '<button class="cp-btn cyan" onclick="renderServerResults()"><i class="fas fa-rotate"></i> تحديث</button></div>';
        if (!studs.length) { wrap.innerHTML = head + '<div class="cp-card"><div class="cp-note" style="text-align:center;padding:1rem">لم يرفع أي طالب نتائج بعد.</div></div>'; return; }
        wrap.innerHTML = head + studs.map(function (s) {
          var data = s.data || {}; var ans = data.answers || [], ex = data.exams || [];
          var correct = ans.filter(function (a) { return a.correct; }).length;
          var acc = ans.length ? Math.round(correct / ans.length * 100) : 0;
          var exHtml = ex.slice(-5).reverse().map(function (e) { return '<div class="cp-kv"><span class="k">' + _esc(e.title || e.system || 'امتحان') + '</span><span class="val">' + e.score + '/' + e.total + ' (' + e.pct + '%)</span></div>'; }).join('');
          return '<div class="cp-card" style="margin-bottom:.8rem"><h4><i class="fas fa-user-graduate"></i> ' + _esc(s.full_name || s.email) +
            ' <span style="color:rgba(255,255,255,.4);font-size:.74rem;font-weight:400">' + _esc(s.email) + '</span></h4>' +
            '<div class="cp-kv"><span class="k">📝 إجابات محفوظة</span><span class="val">' + ans.length + '</span></div>' +
            '<div class="cp-kv"><span class="k">✅ صحيحة</span><span class="val">' + correct + ' · ' + acc + '%</span></div>' +
            '<div class="cp-kv"><span class="k">📋 امتحانات</span><span class="val">' + ex.length + '</span></div>' +
            (exHtml ? ('<div style="margin-top:.4rem">' + exHtml + '</div>') : '') +
            '<div class="cp-note">آخر تحديث: ' + _esc((s.updated_at || '').slice(0, 16).replace('T', ' ')) + '</div></div>';
        }).join('');
      })
      .catch(function () {
        wrap.innerHTML = '<div class="cp-card"><div class="cp-note" style="padding:.8rem">تعذّر جلب النتائج — تأكّد أن الخادم يعمل وأن لك جلسة على الخادم بحساب المالك. ' +
          '<button class="cp-btn cyan" style="margin-top:.5rem" onclick="renderServerResults()">إعادة المحاولة</button>' + signInBtn + '</div></div>';
      });
  }
  window.renderServerResults = renderServerResults;

  // ── Catalog manager (owner edits prices / text / add / delete) ─────
  var _CP_TRAITS = { autocratic: 'أوتوقراطي', democratic: 'ديمقراطي', transformational: 'تحويلي', delegative: 'تفويضي', analytical: 'تحليلي', creative: 'إبداعي', social: 'اجتماعي', strategic: 'استراتيجي', operational: 'تنفيذي' };
  function renderCatalogManager() {
    var wrap = document.getElementById('cp-catalog');
    if (!wrap || typeof catalogAdmin === 'undefined') { if (wrap) wrap.innerHTML = '<div class="cp-note">وحدة الكتالوج غير محمّلة.</div>'; return; }
    var items = catalogAdmin.list();
    var q = (CP.catSearch || '').trim().toLowerCase();
    var list = items.filter(function (f) { return !q || ((f.title || '') + ' ' + (f.desc || '')).toLowerCase().indexOf(q) !== -1; });
    var traitOpts = Object.keys(_CP_TRAITS).map(function (k) { return '<option value="' + k + '">' + _CP_TRAITS[k] + '</option>'; }).join('');

    var addForm =
      '<div class="cp-card" style="margin-bottom:1rem"><h4><i class="fas fa-plus-circle"></i> إضافة عنصر جديد</h4>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.6rem">' +
      '<input class="cp-search" id="cp-add-title" placeholder="العنوان">' +
      '<input class="cp-search" id="cp-add-price" type="number" placeholder="السعر (د.أ)" value="10">' +
      '<select class="cp-search" id="cp-add-type"><option value="file">ملف</option><option value="book">كتاب</option></select>' +
      '<select class="cp-search" id="cp-add-trait">' + traitOpts + '</select>' +
      '<input class="cp-search" id="cp-add-icon" placeholder="أيقونة (إيموجي)" value="📦">' +
      '<input class="cp-search" id="cp-add-size" placeholder="الحجم" value="PDF">' +
      '</div>' +
      '<input class="cp-search" id="cp-add-desc" placeholder="الوصف" style="width:100%;margin-top:.6rem;box-sizing:border-box">' +
      '<button class="cp-btn gold" style="margin-top:.7rem" onclick="cpCatAdd()"><i class="fas fa-plus"></i> إضافة للمتجر</button>' +
      '</div>';

    var rows = list.map(function (f) {
      var custom = catalogAdmin.isCustom(f.id), edited = catalogAdmin.isEdited(f.id);
      var tag = (f.type === 'book') ? '<span class="cp-badge pro">كتاب</span>' : '<span class="cp-badge student">ملف</span>';
      var flags = (custom ? ' <span class="cp-badge on">جديد</span>' : '') + (edited ? ' <span class="cp-badge free">معدّل</span>' : '');
      return '<tr>' +
        '<td><div class="cp-uname"><div class="cp-uava" style="font-size:1rem">' + (f.icon || '📦') + '</div><div style="max-width:240px;white-space:normal">' + _esc(f.title) + flags +
        '<div style="color:rgba(255,255,255,.4);font-size:.72rem">' + _esc((_CP_TRAITS[f.archetype] || '') + ' · ' + (f.size || '')) + '</div></div></div></td>' +
        '<td>' + tag + '</td>' +
        '<td><input type="number" value="' + (f.price != null ? f.price : 0) + '" onchange="cpCatPrice(\'' + f.id + '\',this.value)" style="width:74px;background:rgba(0,10,30,.6);border:1px solid rgba(255,215,0,.3);border-radius:8px;padding:5px 8px;color:#ffd700;font-weight:800;text-align:center;direction:ltr"> <small style="color:rgba(255,255,255,.4)">د.أ</small></td>' +
        '<td><div class="cp-row-actions">' +
        '<button class="cp-ia" title="تعديل النصوص" onclick="cpCatEditText(\'' + f.id + '\')">✏️</button>' +
        '<button class="cp-ia danger" title="حذف" onclick="cpCatDelete(\'' + f.id + '\')">🗑️</button>' +
        '</div></td>' +
        '</tr>';
    }).join('');

    var deleted = catalogAdmin.deletedBaseItems();
    var deletedHtml = deleted.length ? '<div class="cp-card" style="margin-top:1rem"><h4><i class="fas fa-trash-restore"></i> عناصر محذوفة</h4>' +
      deleted.map(function (d) { return '<div class="cp-kv"><span class="k">' + _esc(d.title) + '</span><button class="cp-btn ghost" style="padding:.3rem .8rem" onclick="cpCatRestore(\'' + d.id + '\')">استرجاع</button></div>'; }).join('') + '</div>' : '';

    wrap.innerHTML = addForm +
      '<div class="cp-toolbar"><input class="cp-search" id="cp-cat-search" placeholder="ابحث في المحتوى..." value="' + _esc(CP.catSearch || '') + '" oninput="cpCatSearch(this.value)">' +
      '<button class="cp-btn danger" onclick="cpCatReset()"><i class="fas fa-rotate-left"></i> استرجاع الكل للأصل</button></div>' +
      '<div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>العنصر</th><th>النوع</th><th>السعر</th><th>إجراءات</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="cp-note">إجمالي: ' + list.length + ' عنصر' + (CP.catSearch ? ' (مُرشّح)' : '') + ' — التعديلات تظهر فوراً في المتجر.</div>' +
      deletedHtml;
  }

  window.cpCatSearch = function (v) { CP.catSearch = v; renderCatalogManager(); };
  window.cpCatPrice = function (id, v) { catalogAdmin.editItem(id, { price: +v || 0 }); try { showToast('تم تحديث السعر ✅', 'xp-toast'); } catch (e) {} };
  window.cpCatEditText = function (id) {
    var f = catalogAdmin.get(id); if (!f) return;
    var title = prompt('العنوان:', f.title || ''); if (title === null) return;
    var subtitle = prompt('العنوان الفرعي (اختياري):', f.subtitle || '');
    var desc = prompt('الوصف:', f.desc || ''); if (desc === null) desc = f.desc;
    var fields = { title: title.trim() || f.title, desc: desc };
    if (subtitle !== null) fields.subtitle = subtitle;
    catalogAdmin.editItem(id, fields);
    renderCatalogManager();
    try { showToast('تم تحديث النصوص ✅', 'xp-toast'); } catch (e) {}
  };
  window.cpCatDelete = function (id) {
    var f = catalogAdmin.get(id); if (!f) return;
    if (!confirm('حذف «' + (f.title || id) + '» من المتجر؟ (يمكن استرجاعه لاحقاً)')) return;
    catalogAdmin.deleteItem(id); renderCatalogManager();
    try { showToast('تم الحذف', 'heart-toast'); } catch (e) {}
  };
  window.cpCatRestore = function (id) { catalogAdmin.restoreItem(id); renderCatalogManager(); try { showToast('تم الاسترجاع', 'xp-toast'); } catch (e) {} };
  window.cpCatReset = function () { if (!confirm('استرجاع كامل الكتالوج للحالة الأصلية وحذف كل تعديلاتك؟')) return; catalogAdmin.resetAll(); CP.catSearch = ''; renderCatalogManager(); try { showToast('تمت الاستعادة', 'heart-toast'); } catch (e) {} };
  window.cpCatAdd = function () {
    var title = (document.getElementById('cp-add-title') || {}).value || '';
    if (!title.trim()) { try { showToast('أدخل عنواناً', 'heart-toast'); } catch (e) {} return; }
    var item = {
      title: title.trim(),
      price: +((document.getElementById('cp-add-price') || {}).value) || 0,
      type: (document.getElementById('cp-add-type') || {}).value || 'file',
      archetype: (document.getElementById('cp-add-trait') || {}).value || 'autocratic',
      icon: (document.getElementById('cp-add-icon') || {}).value || '📦',
      size: (document.getElementById('cp-add-size') || {}).value || 'PDF',
      desc: (document.getElementById('cp-add-desc') || {}).value || ''
    };
    var id = catalogAdmin.addItem(item);
    if (id) { CP.catSearch = ''; renderCatalogManager(); try { showToast('تمت الإضافة للمتجر ✅', 'xp-toast'); } catch (e) {} }
  };

  function renderAdminTable() {
    var wrap = document.getElementById('cp-admin-table');
    if (!wrap) return;
    var accounts = ausAuth.listAccounts ? ausAuth.listAccounts() : [];
    var me = (window.ausAuth && ausAuth.user) ? ausAuth.user.email : '';
    var q = (CP.search || '').trim().toLowerCase();
    var list = accounts.filter(function (a) {
      if (!q) return true;
      return ((a.full_name || '') + ' ' + a.email).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });

    if (!list.length) {
      wrap.innerHTML = '<div class="cp-empty"><div class="ic">👥</div><h3>لا توجد حسابات</h3>' +
        '<p style="color:rgba(255,255,255,.5)">' + (accounts.length ? 'لا نتائج مطابقة لبحثك.' : 'لم يسجّل أي مستخدم بعد.') + '</p></div>';
      return;
    }

    var rows = list.map(function (a) {
      var isMe = a.email === me;
      var letter = (a.full_name || a.email || '؟')[0].toUpperCase();
      var provAr = { email: 'بريد', google: 'Google', microsoft: 'MS', apple: 'Apple', guest: 'ضيف' }[a.provider] || a.provider;
      var em = _esc(a.email);
      return '<tr>' +
        '<td><div class="cp-uname"><div class="cp-uava">' + _esc(letter) + '</div><div>' + _esc(a.full_name || '—') +
        (isMe ? ' <span style="color:#ffd700;font-size:.7rem">(أنت)</span>' : '') + '<div style="color:rgba(255,255,255,.45);font-size:.74rem">' + em + '</div></div></div></td>' +
        '<td><span class="cp-badge ' + (a.role === 'admin' ? 'admin' : (a.role === 'doctor' ? 'doctor' : 'student')) + '">' + (a.role === 'admin' ? 'مشرف' : (a.role === 'doctor' ? 'دكتور' : 'طالب')) + '</span></td>' +
        '<td><span class="cp-badge ' + (a.plan === 'pro' ? 'pro' : 'free') + '">' + (a.plan === 'pro' ? 'PRO' : 'مجاني') + '</span></td>' +
        '<td style="color:rgba(255,255,255,.6)">' + provAr + '</td>' +
        '<td><span class="cp-badge ' + (a.active ? 'on' : 'off') + '">' + (a.active ? 'مُفعّل' : 'موقوف') + '</span></td>' +
        '<td style="color:rgba(255,255,255,.55);font-size:.76rem">' + _date(a.createdAt) + '</td>' +
        '<td><div class="cp-row-actions">' +
        '<button class="cp-ia" title="' + (a.plan === 'pro' ? 'إلغاء PRO' : 'منح PRO') + '" onclick="cpTogglePlan(\'' + em + '\')">⭐</button>' +
        '<button class="cp-ia" title="' + (a.active ? 'إيقاف' : 'تفعيل') + '" onclick="cpToggleActive(\'' + em + '\')">' + (a.active ? '⏸️' : '▶️') + '</button>' +
        (a.isOwner ? '<span class="cp-ia" title="حساب المالك — محمي" style="cursor:default;opacity:.7">👑</span>' : '<button class="cp-ia danger" title="حذف" onclick="cpDeleteAccount(\'' + em + '\')">🗑️</button>') +
        '</div></td>' +
        '</tr>';
    }).join('');

    wrap.innerHTML = '<div class="cp-table-wrap"><table class="cp-table">' +
      '<thead><tr><th>المستخدم</th><th>الدور</th><th>الخطة</th><th>الدخول</th><th>الحالة</th><th>التسجيل</th><th>إجراءات</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="cp-note">إجمالي: ' + list.length + ' حساب' + (CP.search ? ' (مُرشّح)' : '') + '</div>';
  }

  // ── Admin actions ──────────────────────────────────────────────────
  function _findAcc(email) { return (ausAuth.listAccounts ? ausAuth.listAccounts() : []).filter(function (a) { return a.email === email; })[0]; }
  window.cpAdminSearch = function (v) { CP.search = v; renderAdminTable(); };
  window.cpTogglePlan = function (email) {
    var a = _findAcc(email); if (!a) return;
    ausAuth.adminSetPlan(email, a.plan === 'pro' ? 'free' : 'pro');
    renderAdminTable();
    try { showToast('تم تحديث الخطة ✅', 'xp-toast'); } catch (e) {}
  };
  window.cpToggleActive = function (email) {
    var a = _findAcc(email); if (!a) return;
    ausAuth.adminSetActive(email, !a.active);
    renderAdminTable();
    try { showToast(a.active ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب', 'heart-toast'); } catch (e) {}
  };
  window.cpDeleteAccount = function (email) {
    if (!confirm('حذف حساب «' + email + '» نهائياً؟ لا يمكن التراجع.')) return;
    ausAuth.adminDeleteAccount(email);
    renderAdminPanel();
    try { showToast('تم حذف الحساب', 'heart-toast'); } catch (e) {}
  };
  window.cpChangeOwnerPw = async function () {
    var cur = (document.getElementById('cp-cur-pw') || {}).value || '';
    var nw = (document.getElementById('cp-new-pw') || {}).value || '';
    var msg = document.getElementById('cp-pw-msg');
    function show(t, ok) { if (msg) { msg.style.color = ok ? '#69f0ae' : '#ff6ea0'; msg.textContent = t; } }
    if (!cur) { show('أدخل كلمة السرّ الحالية', false); return; }
    if (typeof ausAuth.validatePasswordFormat === 'function' && !ausAuth.validatePasswordFormat(nw)) { show(ausAuth.passwordFormatHint, false); return; }
    var S = window.AUS_SESSION;                    // shared session gate: header + automatic renewal (+ the sign-in dialog when no server session exists)
    var t; try { t = localStorage.getItem('aus_access_token'); } catch (e) {}
    if (!t && !S) { show('يلزم اتصال بالخادم. سجّل خروجك ثم ادخل ثانية (والخادم يعمل) ثم أعد المحاولة.', false); return; }
    var base = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
    show('جارٍ الحفظ...', true);
    try {
      var res, d;
      if (S) {
        // NB: this endpoint answers 401 for a WRONG current password — the gate marks that as session:'rejected' (token was fresh)
        var sr = await S.request('POST', '/api/auth/owner-password', { current_password: cur, new_password: nw }, { interactive: true, owner: true });
        res = { ok: sr.ok, status: sr.status }; d = sr.data || {};
        if (sr.status === 401 && sr.session === 'declined') { show('يلزم تسجيل الدخول إلى الخادم لتغيير كلمة السرّ — أعد المحاولة وأدخل كلمة مرور الخادم عند الطلب.', false); return; }
      } else {
        res = await fetch(base + '/api/auth/owner-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
          body: JSON.stringify({ current_password: cur, new_password: nw })
        });
        d = await res.json().catch(function () { return {}; });
      }
      if (res.ok && d.ok) {
        if (typeof ausAuth.updateLocalPassword === 'function') { try { await ausAuth.updateLocalPassword(nw); } catch (e) {} }
        document.getElementById('cp-cur-pw').value = ''; document.getElementById('cp-new-pw').value = '';
        show('✓ تم تغيير كلمة السرّ بنجاح — استخدمها في الدخول القادم على أي جهاز.', true);
        try { showToast('تم تغيير كلمة سرّ المالك ✅', 'xp-toast'); } catch (e) {}
      } else if (res.status === 401) {
        show('كلمة السرّ الحالية غير صحيحة.', false);
      } else {
        show((d && d.detail) ? d.detail : 'تعذّر تغيير كلمة السرّ.', false);
      }
    } catch (e) { show('تعذّر الاتصال بالخادم. تأكّد من تشغيله (START_AUS.bat).', false); }
  };
  window.cpEditName = cpEditName;

  // ════════════════════════════════════════════════════════════════════
  // DOCTOR PANEL — lectures + class roster + attendance (per doctor account)
  // ════════════════════════════════════════════════════════════════════
  function _drpKey(kind) { var u = (window.ausAuth && ausAuth.user) ? ausAuth.user.email : 'anon'; return 'aus.doctor.' + kind + '.' + u; }
  function _drpRoster() { try { var a = JSON.parse(localStorage.getItem(_drpKey('roster')) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function _drpSaveRoster(a) { try { localStorage.setItem(_drpKey('roster'), JSON.stringify(a)); } catch (e) {} }
  function _drpSessions() { try { var a = JSON.parse(localStorage.getItem(_drpKey('attendance')) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function _drpSaveSessions(a) { try { localStorage.setItem(_drpKey('attendance'), JSON.stringify(a)); } catch (e) {} }
  function _drLectures() { try { return (typeof DR_LECTURES !== 'undefined') ? DR_LECTURES : []; } catch (e) { return []; } }

  function renderDoctorPanel() {
    var sec = document.getElementById('doctorpanel');
    if (!sec) return;
    var u = (window.ausAuth && ausAuth.user) ? ausAuth.user : null;
    if (!u) { sec.innerHTML = _loginPrompt('doctorpanel', 'سجّل الدخول بحساب دكتور لعرض لوحة الدكتور'); return; }
    if (u.role !== 'doctor' && u.role !== 'admin') {
      sec.innerHTML = '<div class="cp-empty"><div class="ic">⛔</div><h3>هذه اللوحة للدكاترة فقط</h3>' +
        '<p style="color:rgba(255,255,255,.5)">سجّل الدخول من لوحة «دكتور» برمز الدكتور لتصبح دكتوراً.</p>' +
        '<button class="cp-btn gold" onclick="showSection(\'studentpanel\')"><i class="fas fa-gauge-high"></i> لوحة الطالب</button></div>';
      return;
    }

    var lectures = _drLectures();
    var roster = _drpRoster();
    var sessions = _drpSessions();
    // attendance rate across all sessions
    var totalMarks = 0, presentMarks = 0;
    sessions.forEach(function (s) { totalMarks += (s.total || 0); presentMarks += (s.present ? s.present.length : 0); });
    var attRate = totalMarks ? Math.round(presentMarks / totalMarks * 100) : 0;

    var lecCards = lectures.map(function (l) {
      return '<div class="cp-card" style="border-color:' + (l.color || 'rgba(255,255,255,.1)') + '55">' +
        '<h4 style="color:' + (l.color || '#fff') + '"><i class="fas fa-book"></i> ' + _esc(l.title) + '</h4>' +
        (l.subtitle ? '<div class="cp-note" style="margin:-.3rem 0 .5rem">' + _esc(l.subtitle) + '</div>' : '') +
        '<div class="cp-kv"><span class="k">الأقسام</span><span class="val">' + ((l.sections || []).length) + '</span></div>' +
        '<div class="cp-kv"><span class="k">واجب</span><span class="val">' + (l.homework ? 'نعم' : '—') + '</span></div>' +
        '<button class="cp-btn gold" style="width:100%;justify-content:center;margin-top:.7rem" onclick="drpStartLecture(' + l.id + ')"><i class="fas fa-play"></i> ابدأ المحاضرة</button>' +
        '</div>';
    }).join('');

    // attendance form (roster + per-lecture checkboxes)
    var lecOptions = lectures.map(function (l) { return '<option value="' + l.id + '">' + _esc(l.title) + '</option>'; }).join('');
    var rosterRows = roster.length ? roster.map(function (st) {
      var att = sessions.reduce(function (n, s) { return n + ((s.present || []).indexOf(st.id) !== -1 ? 1 : 0); }, 0);
      var pct = sessions.length ? Math.round(att / sessions.length * 100) : 0;
      return '<div class="cp-kv"><span class="k"><label style="cursor:pointer"><input type="checkbox" class="drp-att" data-id="' + st.id + '" style="margin-inline-end:8px">' + _esc(st.name) + '</label></span>' +
        '<span class="val" style="display:flex;gap:.6rem;align-items:center">' +
        '<span style="font-size:.74rem;color:rgba(255,255,255,.5)">' + att + '/' + sessions.length + ' · ' + pct + '%</span>' +
        '<button class="cp-ia danger" title="حذف" onclick="drpRemoveStudent(\'' + st.id + '\')">🗑️</button></span></div>';
    }).join('') : '<div class="cp-note" style="padding:.6rem">لا يوجد طلاب بعد. أضف طلاباً من الأعلى.</div>';

    var sessRows = sessions.slice(-8).reverse().map(function (s) {
      return '<div class="cp-kv"><span class="k">' + _esc(s.lectureTitle || ('محاضرة ' + s.lectureId)) + ' <span style="opacity:.5;font-size:.74rem">· ' + _date(s.ts) + '</span></span>' +
        '<span class="val">' + (s.present ? s.present.length : 0) + '/' + (s.total || 0) + ' حاضر</span></div>';
    }).join('');

    sec.innerHTML =
      '<div class="cp-hero">' +
      '<div class="cp-avatar">👨‍🏫</div>' +
      '<div class="cp-hero-info"><h2>لوحة الدكتور — ' + _esc(u.full_name || '') + '</h2>' +
      '<div class="cp-sub">إدارة محاضراتك وقائمة طلابك وحضورهم</div></div>' +
      '<div class="cp-hero-actions">' +
      '<button class="cp-btn ghost" onclick="showSection(\'studentpanel\')"><i class="fas fa-gauge-high"></i> لوحتي</button>' +
      '<button class="cp-btn cyan" onclick="showSection(\'doctorai\')"><i class="fas fa-chalkboard-teacher"></i> دكتور AI</button>' +
      '</div></div>' +

      '<div class="cp-stats">' +
      _stat('📚', lectures.length, 'المحاضرات') +
      _stat('👥', roster.length, 'الطلاب') +
      _stat('🗓️', sessions.length, 'جلسات الحضور') +
      _stat('✅', attRate + '%', 'نسبة الحضور') +
      '</div>' +

      '<div class="cp-section-title"><i class="fas fa-book-open"></i> محاضراتي</div>' +
      '<div class="cp-grid">' + (lecCards || '<div class="cp-note">لا توجد محاضرات.</div>') + '</div>' +

      '<div class="cp-section-title"><i class="fas fa-user-plus"></i> قائمة الطلاب</div>' +
      '<div class="cp-card">' +
      '<div style="display:flex;gap:.5rem;margin-bottom:.8rem">' +
      '<input class="cp-search" id="drp-new-student" type="text" placeholder="اسم الطالب" onkeydown="if(event.key===\'Enter\')drpAddStudent()">' +
      '<button class="cp-btn gold" onclick="drpAddStudent()"><i class="fas fa-plus"></i> إضافة</button>' +
      '</div>' + rosterRows + '</div>' +

      '<div class="cp-section-title"><i class="fas fa-clipboard-check"></i> تسجيل الحضور</div>' +
      '<div class="cp-card">' +
      (roster.length ?
        '<div class="cp-note">حدّد المحاضرة، علّم الطلاب الحاضرين من القائمة أعلاه، ثم احفظ الجلسة.</div>' +
        '<div style="display:flex;gap:.5rem;margin-top:.7rem;flex-wrap:wrap">' +
        '<select class="cp-search" id="drp-lecture" style="flex:1;min-width:200px">' + lecOptions + '</select>' +
        '<button class="cp-btn gold" onclick="drpSaveAttendance()"><i class="fas fa-save"></i> حفظ حضور اليوم</button>' +
        '</div><div id="drp-att-msg" class="cp-note" style="color:#69f0ae;margin-top:.5rem"></div>'
        : '<div class="cp-note">أضف طلاباً أولاً لتسجيل الحضور.</div>') +
      (sessRows ? '<div style="margin-top:1rem"><div style="color:rgba(255,255,255,.6);font-weight:700;margin-bottom:.4rem;font-size:.85rem">آخر الجلسات</div>' + sessRows + '</div>' : '') +
      '</div>' +

      _notifySendBoxHtml('drp') +

      '<div class="cp-section-title"><i class="fas fa-file-pen"></i> الواجبات</div>' +
      '<div id="drp-hw"></div>';

    if (window.hwRenderDoctor) hwRenderDoctor('drp-hw');
  }

  window.drpStartLecture = function (id) {
    showSection('doctorai');
    setTimeout(function () { if (typeof drStartLecture === 'function') drStartLecture(id); }, 120);
  };
  window.drpAddStudent = function () {
    var inp = document.getElementById('drp-new-student'); if (!inp) return;
    var name = (inp.value || '').trim(); if (!name) return;
    var roster = _drpRoster();
    roster.push({ id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name });
    _drpSaveRoster(roster); inp.value = '';
    renderDoctorPanel();
  };
  window.drpRemoveStudent = function (id) {
    if (!confirm('حذف هذا الطالب من القائمة؟')) return;
    _drpSaveRoster(_drpRoster().filter(function (s) { return s.id !== id; }));
    renderDoctorPanel();
  };
  window.drpSaveAttendance = function () {
    var lecSel = document.getElementById('drp-lecture');
    var lecId = lecSel ? parseInt(lecSel.value, 10) : 0;
    var lec = _drLectures().filter(function (l) { return l.id === lecId; })[0];
    var present = [].map.call(document.querySelectorAll('.drp-att:checked'), function (c) { return c.getAttribute('data-id'); });
    var total = _drpRoster().length;
    var sessions = _drpSessions();
    sessions.push({ id: 'sess_' + Date.now().toString(36), lectureId: lecId, lectureTitle: lec ? lec.title : '', present: present, total: total, ts: Date.now() });
    _drpSaveSessions(sessions);
    renderDoctorPanel();
    var m = document.getElementById('drp-att-msg'); if (m) { m.textContent = '✓ تم حفظ حضور ' + present.length + ' من ' + total + ' طالباً'; setTimeout(function () { m.textContent = ''; }, 3500); }
    try { showToast('تم حفظ الحضور ✅', 'xp-toast'); } catch (e) {}
  };

  // ── Hook showSection ───────────────────────────────────────────────
  var _cpOrig = window.showSection;
  window.showSection = function (name) {
    if (typeof _cpOrig === 'function') _cpOrig(name);
    if (name === 'studentpanel') setTimeout(renderStudentPanel, 20);
    if (name === 'adminpanel') setTimeout(renderAdminPanel, 20);
    if (name === 'doctorpanel') setTimeout(renderDoctorPanel, 20);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var s = document.getElementById('studentpanel'); if (s && s.classList.contains('active')) renderStudentPanel();
    var a = document.getElementById('adminpanel'); if (a && a.classList.contains('active')) renderAdminPanel();
    var d = document.getElementById('doctorpanel'); if (d && d.classList.contains('active')) renderDoctorPanel();
  });
})();
