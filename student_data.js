/* ================================================================
   AUS — حفظ إجابات الطالب ونتائجه (لكل حساب)
   • يسجّل كل إجابة يحلّها الطالب + ملخّصات الامتحانات
   • مفصول لكل حساب: aus.results.<email>
   نظام مستقل | يُستدعى من أنظمة الامتحانات | لا يمسّ منطقها
   ================================================================ */
(function () {
  'use strict';

  function _email() { var u = window.ausAuth && ausAuth.user; return u ? u.email : 'anon'; }
  function _key(email) { return 'aus.results.' + (email || _email()); }
  function _load(email) { try { return JSON.parse(localStorage.getItem(_key(email)) || '{}') || {}; } catch (e) { return {}; } }
  function _save(d, email) { try { localStorage.setItem(_key(email), JSON.stringify(d)); _schedulePush(); return true; } catch (e) { return false; } }

  // ── Server sync: upload the student's results so the owner can see them ──
  var _pushTimer = null;
  function _hasSession() { try { return !!(localStorage.getItem('aus_access_token') || localStorage.getItem('aus_refresh_token')); } catch (e) { return false; } }
  function _schedulePush() {
    if (!_hasSession()) return;           // not authenticated to the server → local only
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(function () {
      try {
        var body = { data: _load() };
        // through the shared session gate (aus_52): a token that expired while the server was away is renewed silently, so a result recorded
        // offline still reaches the account once the server is back. Never rejects; a failed upload just waits for the next push.
        if (window.AUS_SESSION) { window.AUS_SESSION.request('POST', '/api/results', body); return; }
        var t = localStorage.getItem('aus_access_token'); if (!t) return;
        var base = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
        fetch(base + '/api/results', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
          body: JSON.stringify(body)
        }).catch(function () {});
      } catch (e) {}
    }, 1500);                             // debounce rapid answers into one upload
  }

  // Record a single answered question (the core "حفظ الإجابة")
  window.recordStudentAnswer = function (system, qtext, chosenText, correct) {
    var d = _load();
    d.answers = d.answers || [];
    d.answers.push({
      system: system || '—',
      q: (qtext || '').toString().replace(/\s+/g, ' ').trim().slice(0, 180),
      a: (chosenText || '').toString().replace(/\s+/g, ' ').trim().slice(0, 140),
      correct: !!correct,
      ts: Date.now()
    });
    if (d.answers.length > 600) d.answers = d.answers.slice(-600);
    _save(d);
  };

  // Record a completed exam summary
  window.recordStudentResult = function (system, title, score, total) {
    var d = _load();
    d.exams = d.exams || [];
    d.exams.push({ system: system || '—', title: title || '', score: score | 0, total: total | 0, pct: total ? Math.round((score / total) * 100) : 0, ts: Date.now() });
    if (d.exams.length > 200) d.exams = d.exams.slice(-200);
    _save(d);
  };

  window.getStudentData = function (email) { return _load(email); };

  window.getStudentStats = function (email) {
    var d = _load(email); var ans = d.answers || [], ex = d.exams || [];
    var correct = ans.filter(function (a) { return a.correct; }).length;
    return {
      answered: ans.length,
      correct: correct,
      accuracy: ans.length ? Math.round((correct / ans.length) * 100) : 0,
      examsCount: ex.length,
      lastExams: ex.slice(-10).reverse(),
      recentAnswers: ans.slice(-15).reverse(),
      bySystem: (function () {
        var m = {};
        ans.forEach(function (a) { m[a.system] = m[a.system] || { n: 0, c: 0 }; m[a.system].n++; if (a.correct) m[a.system].c++; });
        return m;
      })()
    };
  };

  window.clearStudentData = function (email) { try { localStorage.removeItem(_key(email)); } catch (e) {} };

  // Link what was recorded while the server was away: called when the server answers again (the certification trial watches for that) and when
  // the browser regains its network. Everything recorded so far is uploaded in one go.
  window.syncStudentData = function () { _schedulePush(); };
  window.addEventListener('online', function () { _schedulePush(); });
})();
