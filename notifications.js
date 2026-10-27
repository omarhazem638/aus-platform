/* ================================================================
   AUS — إشعارات الطالب
   • واجب جديد مكلَّف  • تصحيح/رصد درجة واجب
   جرس في الأعلى + عدّاد + قائمة | يعتمد ausAuth + نقاط الواجبات
   ================================================================ */
(function () {
  'use strict';

  function _base() { return (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'; }
  function _tok() { try { return localStorage.getItem('aus_access_token'); } catch (e) { return null; } }
  function _me() { return (window.ausAuth && ausAuth.user) ? ausAuth.user : null; }
  function _esc(t) { return (t || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _key() { var m = _me(); return 'aus.notif.' + (m ? m.email : 'anon'); }
  function _seen() { try { return JSON.parse(localStorage.getItem(_key()) || '{}') || {}; } catch (e) { return {}; } }
  function _saveSeen(s) { try { localStorage.setItem(_key(), JSON.stringify(s)); } catch (e) {} }
  function _date(ts) { if (!ts) return ''; try { return new Date(ts).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }); } catch (e) { return ''; } }

  var _unread = [], _prevKeys = {}, _lastData = { assignments: [], mysubs: [] };

  // ── CSS ────────────────────────────────────────────────────────────
  (function () {
    if (document.getElementById('aus-notif-styles')) return;
    var s = document.createElement('style'); s.id = 'aus-notif-styles';
    s.textContent = `
    #authHeaderArea { display:flex; align-items:center; gap:.5rem; }
    #aus-bell { position:relative; display:none; align-items:center; }
    #aus-bell-btn { position:relative; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:#fff;
      width:40px; height:40px; border-radius:12px; font-size:1.1rem; cursor:pointer; transition:all .2s; }
    #aus-bell-btn:hover { background:rgba(255,215,0,.12); border-color:rgba(255,215,0,.4); }
    .aus-bell-badge { position:absolute; top:-5px; inset-inline-end:-5px; min-width:18px; height:18px; padding:0 4px; display:none;
      align-items:center; justify-content:center; background:#ff006e; color:#fff; border-radius:50px; font-size:.66rem; font-weight:800;
      font-family:'Orbitron',monospace; box-shadow:0 0 8px rgba(255,0,110,.6); animation:ausBellPulse 1.6s infinite; }
    @keyframes ausBellPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.18);} }
    .aus-bell-dd { position:absolute; top:48px; inset-inline-end:0; width:320px; max-width:84vw; max-height:60vh; overflow-y:auto;
      background:linear-gradient(160deg,rgba(0,12,32,.99),rgba(0,5,20,.99)); border:1px solid rgba(255,215,0,.25); border-radius:16px;
      box-shadow:0 18px 50px rgba(0,0,0,.6); padding:.6rem; z-index:10600; display:none; }
    .aus-bell-dd.open { display:block; animation:ausDdIn .2s ease both; }
    @keyframes ausDdIn { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }
    .aus-notif-head { color:#ffd700; font-weight:800; font-size:.9rem; padding:.4rem .5rem .6rem; font-family:'Tajawal',sans-serif; }
    .aus-notif-item { display:flex; gap:.6rem; align-items:flex-start; padding:.6rem .55rem; border-radius:10px; transition:background .15s; }
    .aus-notif-item + .aus-notif-item { border-top:1px solid rgba(255,255,255,.06); }
    .aus-notif-item:hover { background:rgba(255,255,255,.04); }
    .aus-notif-item .ni-ic { font-size:1.1rem; flex-shrink:0; }
    .aus-notif-item .ni-tx { color:rgba(255,255,255,.9); font-size:.84rem; line-height:1.6; font-family:'Tajawal',sans-serif; }
    .aus-notif-item .ni-dt { color:rgba(255,255,255,.4); font-size:.68rem; margin-top:2px; }
    .aus-notif-empty { text-align:center; color:rgba(255,255,255,.45); padding:1.4rem 1rem; font-size:.86rem; font-family:'Tajawal',sans-serif; }
    `;
    document.head.appendChild(s);
  })();

  function _ensureBell() {
    if (document.getElementById('aus-bell')) return;
    var area = document.getElementById('authHeaderArea');
    if (!area) return;
    var bell = document.createElement('div');
    bell.id = 'aus-bell';
    bell.innerHTML = '<button id="aus-bell-btn" onclick="ausNotifToggle(event)" title="الإشعارات" aria-label="الإشعارات">🔔<span id="aus-bell-badge" class="aus-bell-badge"></span></button>' +
      '<div id="aus-bell-dd" class="aus-bell-dd"></div>';
    // Insert INSIDE authHeaderArea, as first child, so it groups with login/pill
    area.insertBefore(bell, area.firstChild);
  }

  async function _api(path) {
    var t = _tok(); if (!t) return null;
    try { var r = await fetch(_base() + path, { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' }); if (!r.ok) return null; return await r.json(); }
    catch (e) { return null; }
  }

  function _renderBadge() {
    var b = document.getElementById('aus-bell-badge'); if (!b) return;
    if (_unread.length) { b.textContent = _unread.length > 9 ? '9+' : ('' + _unread.length); b.style.display = 'flex'; }
    else b.style.display = 'none';
  }

  // Compute unread notifications (assignments + graded submissions) for students
  async function notifCheck(toastNew) {
    _ensureBell();
    var bell = document.getElementById('aus-bell');
    var me = _me();
    // Only students (and guests, role 'student') get homework notifications
    if (!me || me.role !== 'student' || !_tok()) { if (bell) bell.style.display = 'none'; return; }
    if (bell) bell.style.display = 'flex';

    var asg = await _api('/api/homework/assignments');
    if (!asg) return;
    var sub = await _api('/api/homework/submissions');
    var assignments = asg.assignments || [];
    var amap = {}; assignments.forEach(function (a) { amap[a.id] = a; });
    var emLower = (me.email || '').toLowerCase();
    var mysubs = (sub && sub.submissions) ? sub.submissions.filter(function (s) { return (s.student_email || '').toLowerCase() === emLower; }) : [];

    var seen = _seen(); seen.seenAssignments = seen.seenAssignments || []; seen.seenGrades = seen.seenGrades || {};
    var unread = [];
    assignments.forEach(function (a) {
      if (seen.seenAssignments.indexOf(a.id) === -1) unread.push({ key: 'a:' + a.id, icon: '📋', text: 'واجب جديد: ' + a.title, ts: a.ts });
    });
    mysubs.forEach(function (s) {
      if (s.grade) {
        var k = s.assignment_id + '|' + emLower;
        if (seen.seenGrades[k] !== s.grade) {
          var t = (amap[s.assignment_id] || {}).title || 'واجب';
          unread.push({ key: 'g:' + k, icon: '✅', text: 'صُحّح واجبك «' + t + '» — الدرجة: ' + s.grade, ts: s.ts });
        }
      }
    });
    unread.sort(function (x, y) { return ('' + (y.ts || '')).localeCompare('' + (x.ts || '')); });

    if (toastNew) {
      unread.forEach(function (n) { if (!_prevKeys[n.key]) { try { if (typeof showToast === 'function') showToast(n.icon + ' ' + n.text, 'xp-toast'); } catch (e) {} } });
    }
    _prevKeys = {}; unread.forEach(function (n) { _prevKeys[n.key] = 1; });
    _unread = unread;
    _lastData = { assignments: assignments, mysubs: mysubs };
    _renderBadge();
  }

  function _renderDropdown() {
    var dd = document.getElementById('aus-bell-dd'); if (!dd) return;
    var body = _unread.length
      ? _unread.map(function (n) { return '<div class="aus-notif-item"><span class="ni-ic">' + n.icon + '</span><span><span class="ni-tx">' + _esc(n.text) + '</span><div class="ni-dt">' + _date(n.ts) + '</div></span></div>'; }).join('')
      : '<div class="aus-notif-empty">لا إشعارات جديدة 🔕</div>';
    dd.innerHTML = '<div class="aus-notif-head">🔔 الإشعارات</div>' + body;
  }

  function _markAllSeen() {
    var seen = _seen(); seen.seenAssignments = seen.seenAssignments || []; seen.seenGrades = seen.seenGrades || {};
    var em = (_me() ? _me().email : '').toLowerCase();
    (_lastData.assignments || []).forEach(function (a) { if (seen.seenAssignments.indexOf(a.id) === -1) seen.seenAssignments.push(a.id); });
    (_lastData.mysubs || []).forEach(function (s) { if (s.grade) seen.seenGrades[s.assignment_id + '|' + em] = s.grade; });
    _saveSeen(seen);
    _unread = []; _renderBadge();
  }

  window.ausNotifToggle = function (ev) {
    if (ev) ev.stopPropagation();
    var dd = document.getElementById('aus-bell-dd'); if (!dd) return;
    var willOpen = !dd.classList.contains('open');
    if (willOpen) {
      _renderDropdown();
      dd.classList.add('open');
      _markAllSeen();   // opening = acknowledging
      setTimeout(function () {
        document.addEventListener('click', function _c(e) {
          var bell = document.getElementById('aus-bell');
          if (bell && !bell.contains(e.target)) { dd.classList.remove('open'); document.removeEventListener('click', _c); }
        });
      }, 0);
    } else { dd.classList.remove('open'); }
  };
  window.ausNotifCheck = function () { notifCheck(false); };

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    _ensureBell();
    setTimeout(function () { notifCheck(false); }, 1600);
    setInterval(function () { notifCheck(true); }, 60000);   // poll every 60s, toast new ones
    window.addEventListener('aus-auth-changed', function () { setTimeout(function () { notifCheck(false); }, 400); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 200);
})();
