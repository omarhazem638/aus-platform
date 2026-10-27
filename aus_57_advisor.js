/* ================================================================
   AUS — CEO AI: المستشار التنفيذي (aus_57_advisor.js)            window.AUS_ADVISOR
   ----------------------------------------------------------------
   يستبدل مسار الدردشة القديم (sendMessage ← AUSAgent ← /api/chat/stream) بمسار المستشار (/api/advisor/stream) دون تغيير شكل الدردشة:
   نفس الفقاعات والأصناف (message ai، ai-meta، ai-stream-text، ai-actions، smart-suggestions) فتبقى أشرطة الحالة والطوابع الزمنية في aus_07 تعمل.

   ما الذي تغيّر ولماذا:
     • الصدق: القديم كان يعرض عند فشل الخادم ردّاً «محلياً» جاهزاً كأنه جواب. الآن تظهر بطاقة خطأ واضحة (غير مفعّل / لا اتصال / مهلة / حدّ الطلبات…) مع إعادة المحاولة،
       وقاعدة المعرفة المحلية متاحة بزرّ صريح معنون «ليست من الذكاء الاصطناعي».
     • الأمان: الردود تُعرض عبر AUS_MD (تهريب كامل) لا بتعابير نمطية على innerHTML؛ لا onclick يحمل نص المستخدم؛ والذاكرة المحفوظة لا تُعاد كـ HTML خام.
     • السياق: يستعين المستشار فقط بما هو مسجَّل فعلاً على هذا الجهاز (اختبار القيادة، Career DNA، نتائج الاختبارات والمقابلات، نتائج الأدوات التنفيذية) ويُرسَل
       مصنَّفاً «غير مُتحقَّق منه»؛ زرّ «السياق» يوقفه كلياً، ويُعرض لكل ردّ ما استعمله الخادم فعلاً.
     • المحادثات: عدة محادثات محفوظة لكل حساب، محادثة جديدة، سجلّ، إعادة تسمية وحذف، إيقاف الردّ أثناء البثّ، إعادة التوليد، نسخ الردّ كما كُتب (Markdown).
     • الميكروفون: الإملاء الصوتي في خانة الكتابة يمرّ عبر AUS_MIC (نفس الأخطاء الواضحة والإلغاء وتحرير الميكروفون).
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_ADVISOR) return;

  var W = window, D = document;
  var MAX_MSG = 4000, MAX_CONVS = 30, MAX_MSGS = 80, MAX_CONTENT = 12000, HISTORY_TURNS = 24, IDLE_MS = 60000, PAYLOAD_LIMIT = 30000;
  var SECTION_KEYS = ['profile', 'leadership', 'career_dna', 'quiz_stats', 'recent_results', 'interviews', 'progress', 'tool_outputs'];

  // ═══ النصوص ═════════════════════════════════════════════════════════════════════════════════════
  var L = {
    ar: {
      newChat: 'محادثة جديدة', history: 'السجل', tools: 'أدوات تنفيذية', ctx: 'السياق', ctxOnTip: 'CEO AI يستعين بنتائجك المحفوظة على هذا الجهاز ({s}). اضغط لإيقافه.',
      ctxOffTip: 'السياق متوقف: CEO AI لا يرى أي شيء من نتائجك. اضغط لتفعيله.', ctxNone: 'لا توجد نتائج محفوظة بعد (جرّب اختبار القيادة أو Career DNA أو مقابلة).',
      ctxNote: 'يستعين CEO AI بنتائجك المحفوظة على جهازك ليخصّص النصيحة، ويُرسلها إلى الخادم مع سؤالك غير مُتحقَّق منها. للإيقاف اضغط «السياق».', gotIt: 'فهمت',
      sub_live: 'متصل بالذكاء الاصطناعي', sub_off: 'الذكاء الاصطناعي غير مفعّل على الخادم', sub_down: 'الخادم غير متاح', sub_check: 'جارٍ الاتصال…',
      thinking: 'يفكّر…', stopped: 'أُوقف الردّ قبل اكتماله.', stop: 'إيقاف', send: 'إرسال', retry: 'إعادة المحاولة', copy: 'نسخ', copied: 'تم النسخ', speak: 'استمع', regen: 'إعادة التوليد', up: 'مفيد', down: 'غير مناسب',
      used: 'سياقك المستعمل: {s}', usedNone: 'دون أي سياق من حسابك', trace: '⚡ CEO AI · مستشار',
      errNoAi: 'خدمة CEO AI غير مفعّلة على الخادم لأن مفتاح الذكاء الاصطناعي لم يُضبط (ANTHROPIC_API_KEY في ملف .env).', errNetwork: 'تعذّر الاتصال بالخادم. تأكد أنه يعمل ثم أعد المحاولة.',
      errTimeout: 'استغرق الردّ وقتاً أطول من المسموح. أعد المحاولة.', errIdle: 'انقطع وصول الردّ (لا بيانات منذ دقيقة). أعد المحاولة.', errRate: 'مزوّد الذكاء الاصطناعي أو الخادم مشغول بطلبات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
      errBudget: 'استُنفدت حصة الذكاء الاصطناعي المسموحة لهذا الشهر.', errTooLong: 'الرسالة أطول من الحدّ المسموح ({n} حرف).', errBusy: 'انتظر انتهاء الردّ الحالي أو اضغط «إيقاف».', errGeneric: 'تعذّر الحصول على ردّ ({code}). أعد المحاولة.',
      errBroken: 'انقطع الاتصال أثناء وصول الردّ. هذا ما وصل قبل الانقطاع.', errTooBig: 'المحادثة كبيرة جداً لإرسالها. ابدأ محادثة جديدة.',
      kbOffer: 'اعرض ما في قاعدة المعرفة المحلية', kbTitle: '📚 من قاعدة المعرفة المحلية', kbNote: 'نص جاهز من قاعدة المعرفة المحفوظة في الموقع — ليس ردّاً من الذكاء الاصطناعي ولا يراعي سياقك.',
      histTitle: 'محادثاتك', histEmpty: 'لا توجد محادثات محفوظة بعد.', open: 'فتح', rename: 'إعادة تسمية', del: 'حذف', confirm: 'اضغط للتأكيد', delAll: 'حذف كل المحادثات', copyChat: 'نسخ المحادثة الحالية',
      untitled: 'محادثة بلا عنوان', nMsgs: '{n} رسالة', oldChat: 'المحادثة السابقة', save: 'حفظ', cancel: 'إلغاء', back: 'العودة إلى الدردشة',
      toolsMissing: 'وحدة الأدوات التنفيذية لم تُحمَّل.', inputHint: 'Enter للإرسال · Shift+Enter سطر جديد',
      s_profile: 'الاسم', s_leadership: 'اختبار القيادة', s_career_dna: 'Career DNA', s_quiz_stats: 'إحصاءات الاختبارات', s_recent_results: 'آخر النتائج', s_interviews: 'مقابلاتك', s_progress: 'تقدّمك', s_tool_outputs: 'نتائج الأدوات',
      micStart: 'اضغط للتحدّث', micListening: 'جارٍ الاستماع — تحدّث الآن (اضغط الميكروفون للإيقاف).', micPerm: 'بانتظار إذن الميكروفون…', micProcessing: 'جارٍ تحويل الكلام إلى نص…', micEmpty: 'لم يُلتقط أي كلام.',
      kbHint: 'تعذّر الردّ من الذكاء الاصطناعي. يمكنك إعادة المحاولة، أو عرض ما تحويه قاعدة المعرفة المحلية.'
    },
    en: {
      newChat: 'New chat', history: 'History', tools: 'Executive tools', ctx: 'Context', ctxOnTip: 'CEO AI uses the results saved on this device ({s}). Click to turn it off.',
      ctxOffTip: 'Context is off: CEO AI sees nothing from your results. Click to turn it on.', ctxNone: 'No saved results yet (try the leadership test, Career DNA or an interview).',
      ctxNote: 'CEO AI uses the results saved on your device to tailor its advice, and sends them to the server with your question, unverified. To stop, press “Context”.', gotIt: 'Got it',
      sub_live: 'Connected to the AI', sub_off: 'AI is not enabled on the server', sub_down: 'Server unavailable', sub_check: 'Connecting…',
      thinking: 'Thinking…', stopped: 'The reply was stopped before it finished.', stop: 'Stop', send: 'Send', retry: 'Try again', copy: 'Copy', copied: 'Copied', speak: 'Listen', regen: 'Regenerate', up: 'Helpful', down: 'Not helpful',
      used: 'Your context used: {s}', usedNone: 'No context from your account', trace: '⚡ CEO AI · advisor',
      errNoAi: 'CEO AI is not enabled on the server because the AI key is not configured (ANTHROPIC_API_KEY in the .env file).', errNetwork: 'Could not reach the server. Make sure it is running, then try again.',
      errTimeout: 'The answer took longer than allowed. Please try again.', errIdle: 'The answer stopped arriving (no data for a minute). Please try again.', errRate: 'The AI provider or the server is busy. Wait a moment and try again.',
      errBudget: 'This month’s AI allowance has been used up.', errTooLong: 'The message is longer than the limit ({n} characters).', errBusy: 'Wait for the current answer to finish or press “Stop”.', errGeneric: 'Could not get an answer ({code}). Try again.',
      errBroken: 'The connection dropped while the answer was arriving. This is what arrived before it did.', errTooBig: 'The conversation is too large to send. Start a new chat.',
      kbOffer: 'Show what the local knowledge base has', kbTitle: '📚 From the local knowledge base', kbNote: 'Ready-made text from the knowledge base stored in the site — not an answer from the AI and it does not take your context into account.',
      histTitle: 'Your chats', histEmpty: 'No saved chats yet.', open: 'Open', rename: 'Rename', del: 'Delete', confirm: 'Press to confirm', delAll: 'Delete all chats', copyChat: 'Copy this chat',
      untitled: 'Untitled chat', nMsgs: '{n} messages', oldChat: 'Previous conversation', save: 'Save', cancel: 'Cancel', back: 'Back to the chat',
      toolsMissing: 'The executive tools module did not load.', inputHint: 'Enter to send · Shift+Enter for a new line',
      s_profile: 'Name', s_leadership: 'Leadership test', s_career_dna: 'Career DNA', s_quiz_stats: 'Quiz statistics', s_recent_results: 'Recent results', s_interviews: 'Your interviews', s_progress: 'Your progress', s_tool_outputs: 'Tool results',
      micStart: 'Press to speak', micListening: 'Listening — speak now (press the microphone to stop).', micPerm: 'Waiting for microphone permission…', micProcessing: 'Turning speech into text…', micEmpty: 'No speech was captured.',
      kbHint: 'The AI could not answer. You can try again, or show what the local knowledge base has.'
    }
  };
  function lang() { var l = String(D.documentElement.lang || 'ar').slice(0, 2).toLowerCase(); return l === 'ar' ? 'ar' : 'en'; }
  function T(key, vars) {
    var s = (L[lang()] || L.ar)[key];
    if (s == null) s = L.ar[key];
    if (s == null) return key;
    return vars ? String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? m : vars[k]; }) : s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clip(s, n) { s = String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ''); return s.length > n ? s.slice(0, n) : s; }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function $(id) { return D.getElementById(id); }
  function apiBase() { return String(W.AUS_API_BASE || 'http://127.0.0.1:8002').replace(/\/+$/, ''); }
  function userKey() { var u = W.ausAuth && W.ausAuth.user; return (u && u.email) || 'anon'; }
  function now() { return Date.now(); }
  function uid(p) { return p + now().toString(36) + Math.floor(Math.random() * 1679616).toString(36); }

  // ═══ التخزين ════════════════════════════════════════════════════════════════════════════════════
  function lsGet(k) { try { var r = W.localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { W.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function storeKey() { return 'aus.advisor.v1.' + userKey(); }
  function prefsKey() { return 'aus.advisor.prefs.v1.' + userKey(); }
  function snapKey(kind) { return 'aus.advisor.' + kind + '.v1.' + userKey(); }

  function titleFrom(text) {
    var t = String(text == null ? '' : text).split('\n')[0].replace(/[#*_`>|\[\]()~]/g, ' ').replace(/\s+/g, ' ').trim();
    return t.length > 48 ? t.slice(0, 47).trim() + '…' : t;
  }

  function sanitizeMsg(m) {
    if (!m || typeof m !== 'object' || (m.role !== 'user' && m.role !== 'assistant')) return null;
    var content = clip(m.content, MAX_CONTENT);
    var err = m.error && typeof m.error === 'object' && typeof m.error.code === 'string' ? { code: clip(m.error.code, 40) } : null;
    if (!content.trim() && !err) return null;
    var out = { id: typeof m.id === 'string' && /^[A-Za-z0-9_\-]{1,40}$/.test(m.id) ? m.id : uid('m'), role: m.role, content: content, ts: num(m.ts) || 0 };
    if (m.role === 'assistant') {
      if (Array.isArray(m.followups)) out.followups = m.followups.map(function (x) { return clip(x, 140).replace(/\s+/g, ' ').trim(); }).filter(function (x) { return x.length >= 3; }).slice(0, 3);
      if (Array.isArray(m.ctx)) out.ctx = m.ctx.filter(function (x) { return SECTION_KEYS.indexOf(x) >= 0; }).slice(0, 8);
      if (m.stopped) out.stopped = true;
      if (err) out.error = err;
    }
    return out;
  }
  function sanitizeStore(raw) {
    var out = { v: 1, active: null, convs: [], migrated: false };
    if (!raw || typeof raw !== 'object' || raw.v !== 1 || !Array.isArray(raw.convs)) return out;
    raw.convs.slice(0, MAX_CONVS).forEach(function (c) {
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^[A-Za-z0-9_\-]{1,40}$/.test(c.id)) return;
      var msgs = (Array.isArray(c.msgs) ? c.msgs : []).slice(-MAX_MSGS).map(sanitizeMsg).filter(Boolean);
      out.convs.push({ id: c.id, title: clip(c.title, 80).trim(), createdAt: num(c.createdAt) || 0, updatedAt: num(c.updatedAt) || 0, msgs: msgs });
    });
    out.convs.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    out.active = out.convs.some(function (c) { return c.id === raw.active; }) ? raw.active : (out.convs[0] ? out.convs[0].id : null);
    out.migrated = !!raw.migrated;
    return out;
  }

  // ذاكرة الدردشة القديمة (aus.chat.memory: {role, content, lang, at}) → رسائل. ردود المساعد القديمة قد تكون HTML: تُحوَّل إلى نص بلا وسوم ولا تُعاد كـ HTML أبداً.
  function migrateMemory(arr) {
    var out = [];
    if (!Array.isArray(arr)) return out;
    arr.slice(-40).forEach(function (m) {
      if (!m || typeof m !== 'object' || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return;
      var text = m.content;
      if (m.role === 'assistant' && /<[a-z!\/]/i.test(text)) text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6])>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
      var sm = sanitizeMsg({ role: m.role, content: text, ts: num(m.at) || 0 });
      if (sm) out.push(sm);
    });
    return out;
  }

  // ═══ السياق (ما هو مسجَّل فعلاً) ═══════════════════════════════════════════════════════════════════
  function pctMap(o, max) {
    var out = {};
    if (o && typeof o === 'object') Object.keys(o).slice(0, max || 8).forEach(function (k) { var v = num(o[k]); if (v != null && /^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) out[k] = Math.max(0, Math.min(100, v)); });
    return out;
  }
  // src = {user, leadership, dna, stats, exams, interviews, streak, achievements, tools}   ← يجمعها collectSources() من الصفحة؛ هنا دالة نقية قابلة للاختبار
  function buildContextFrom(src, nowMs) {
    src = src || {};
    var ctx = {}, sections = [];
    var name = src.user && typeof src.user.name === 'string' ? clip(src.user.name, 40).trim().split(/\s+/)[0] : '';
    if (name) { ctx.profile = { name: name }; sections.push('profile'); }

    var l = src.leadership;
    if (l && typeof l === 'object' && typeof l.dominant === 'string') {
      var perc = pctMap(l.percentages, 6);
      if (l.dominant && Object.keys(perc).length) { ctx.leadership = { dominant: clip(l.dominant, 40), percentages: perc, recorded_at: num(l.recorded_at) || undefined }; sections.push('leadership'); }
    }
    var d = src.dna;
    if (d && typeof d === 'object') {
      var traits = pctMap(d.traits, 8), specs = [];
      (Array.isArray(d.top_specialties) ? d.top_specialties : []).slice(0, 5).forEach(function (s) { if (s && typeof s.name === 'string' && s.name.trim() && num(s.pct) != null) specs.push({ name: clip(s.name, 40), pct: Math.max(0, Math.min(100, s.pct)) }); });
      if (Object.keys(traits).length || specs.length) { ctx.career_dna = { type: clip(d.type, 60), traits: traits, top_specialties: specs, recorded_at: num(d.recorded_at) || undefined }; sections.push('career_dna'); }
    }
    var st = src.stats;
    if (st && typeof st === 'object' && num(st.answered) > 0) {
      var by = [];
      if (st.bySystem && typeof st.bySystem === 'object') Object.keys(st.bySystem).forEach(function (k) { var v = st.bySystem[k]; if (v && num(v.n) > 0) by.push({ system: clip(k, 40), n: Math.round(v.n), c: Math.min(Math.round(num(v.c) || 0), Math.round(v.n)) }); });
      by.sort(function (a, b) { return b.n - a.n; });
      ctx.quiz_stats = { answered: Math.round(st.answered), correct: Math.min(Math.round(num(st.correct) || 0), Math.round(st.answered)), exams: Math.round(num(st.examsCount) || 0), by_system: by.slice(0, 8) };
      sections.push('quiz_stats');
    }
    var ex = [];
    // نتحقق أولاً ثم نحدّ العدد: صفّ تالف لا يأخذ مكان صفّ سليم
    (Array.isArray(src.exams) ? src.exams.filter(function (e) { return e && typeof e === 'object' && typeof e.title === 'string' && e.title.trim(); }).slice(-5).reverse() : []).forEach(function (e) {
      if (e) ex.push({ ts: num(e.ts) || undefined, system: clip(e.system, 40), title: clip(e.title, 80), pct: num(e.pct) != null ? e.pct : undefined, score: num(e.score) != null ? e.score : undefined, total: num(e.total) != null ? e.total : undefined });
    });
    if (ex.length) { ctx.recent_results = ex; sections.push('recent_results'); }
    var iv = [];
    (Array.isArray(src.interviews) ? src.interviews.filter(function (h) { return h && typeof h === 'object' && num(h.total) != null; }).slice(0, 3) : []).forEach(function (h) {
      iv.push({ ts: num(h.ts) || undefined, title: clip(h.title, 60), total: Math.round(h.total), grade: clip(h.grade && h.grade.label || h.gradeLabel || '', 30), weakest: h.weakest && h.weakest.label ? { label: clip(h.weakest.label, 50), avg: num(h.weakest.avg) != null ? h.weakest.avg : undefined } : undefined, criteria_avg: h.criteria_avg && typeof h.criteria_avg === 'object' ? h.criteria_avg : {} });
    });
    if (iv.length) { ctx.interviews = iv; sections.push('interviews'); }
    var pg = {};
    if (num(src.streak) > 0) pg.streak_days = Math.round(src.streak);
    if (num(src.achievements) > 0) pg.achievements_unlocked = Math.round(src.achievements);
    if (Object.keys(pg).length) { pg.scope = 'saved on this device'; ctx.progress = pg; sections.push('progress'); }
    var tools = [];
    (Array.isArray(src.tools) ? src.tools.filter(function (t) { return t && typeof t === 'object' && /^[a-z][a-z0-9_]{0,31}$/.test(String(t.tool)) && t.outputs && typeof t.outputs === 'object' && Object.keys(t.outputs).length; }).slice(0, 4) : []).forEach(function (t) {
      if (t) tools.push({ tool: t.tool, at: num(t.at) || undefined, inputs: t.inputs && typeof t.inputs === 'object' ? t.inputs : {}, outputs: t.outputs, note: clip(t.note, 120) });
    });
    if (tools.length) { ctx.tool_outputs = tools; sections.push('tool_outputs'); }
    if (sections.length) ctx.generated_at = num(nowMs) || now();
    return { ctx: sections.length ? ctx : null, sections: sections };
  }

  function collectSources() {
    var src = { user: W.ausAuth && W.ausAuth.user ? { name: W.ausAuth.user.name } : null, leadership: lsGet(snapKey('leadership')), dna: lsGet(snapKey('dna')) };
    try { if (typeof W.getStudentStats === 'function') src.stats = W.getStudentStats(); } catch (e) {}
    try { if (typeof W.getStudentData === 'function') src.exams = (W.getStudentData() || {}).exams || []; } catch (e) {}
    try { if (W.AUS_INTERVIEW && typeof W.AUS_INTERVIEW.history === 'function') src.interviews = W.AUS_INTERVIEW.history().map(function (h) { return Object.assign({}, h, { gradeLabel: lang() === 'en' ? (h.grade.en || h.grade.ar) : (h.grade.ar || h.grade.en) }); }); } catch (e) {}
    try {
      var sd = JSON.parse(W.localStorage.getItem('aus_streak_v1') || '{}'), dt = new Date(), today = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
      dt.setDate(dt.getDate() - 1); var yest = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
      src.streak = (sd.lastDate === today || sd.lastDate === yest) ? (sd.streak || 0) : 0;
      var ach = JSON.parse(W.localStorage.getItem('aus_achievements') || '{}'); src.achievements = Array.isArray(ach.unlocked) ? ach.unlocked.length : 0;
    } catch (e) {}
    try { if (W.AUS_EXEC && typeof W.AUS_EXEC.contextOutputs === 'function') src.tools = W.AUS_EXEC.contextOutputs(); } catch (e) {}
    return src;
  }
  function prefs() { var p = lsGet(prefsKey()); return { share: !(p && p.share === false), noteSeen: !!(p && p.noteSeen) }; }
  function setPrefs(p) { lsSet(prefsKey(), { share: !!p.share, noteSeen: !!p.noteSeen }); }
  function currentContext() { return buildContextFrom(collectSources(), now()); }

  // لقطات النتائج التي لا تُحفَظ في أي مكان آخر (كانت تضيع عند إعادة تحميل الصفحة)
  function saveLeadershipSnapshot() {
    var answers = typeof W.leadershipAnswers !== 'undefined' ? W.leadershipAnswers : (typeof leadershipAnswers !== 'undefined' ? leadershipAnswers : []);
    if (!Array.isArray(answers) || !answers.length) return;
    var scores = { autocratic: 0, democratic: 0, transformational: 0, delegative: 0 };
    answers.forEach(function (a) { if (a && scores.hasOwnProperty(a.personality)) scores[a.personality] += a.weight || 1; });
    var total = Object.keys(scores).reduce(function (s, k) { return s + scores[k]; }, 0);
    if (!total) return;
    var perc = {}, dom = null;
    Object.keys(scores).forEach(function (k) { perc[k] = Math.round(scores[k] / total * 100); if (dom == null || scores[k] > scores[dom]) dom = k; });
    lsSet(snapKey('leadership'), { dominant: dom, percentages: perc, recorded_at: now() });
  }
  function saveDnaSnapshot() {
    if (typeof _cdnaScores === 'undefined' || typeof _cdnaNormalize !== 'function' || typeof _cdnaGetType !== 'function') return;
    var norm = _cdnaNormalize(_cdnaScores), type = _cdnaGetType(_cdnaScores), specs = typeof _cdnaGetSpecMatches === 'function' ? _cdnaGetSpecMatches(_cdnaScores) : [];
    lsSet(snapKey('dna'), { type: type && type.name || '', traits: norm, top_specialties: (specs || []).slice(0, 5).map(function (s) { return { name: s.spec, pct: s.pct }; }), recorded_at: now() });
  }

  // ═══ الشبكة: بثّ SSE ════════════════════════════════════════════════════════════════════════════
  function sseParser() {
    var buf = '';
    function block(b) {
      var data = [];
      b.split('\n').forEach(function (ln) { if (ln.indexOf('data:') === 0) data.push(ln.slice(5).replace(/^ /, '')); });
      if (!data.length) return null;
      try { var o = JSON.parse(data.join('\n')); return o && typeof o === 'object' && !Array.isArray(o) ? o : null; } catch (e) { return null; }
    }
    return {
      feed: function (chunk) { buf += String(chunk).replace(/\r\n?/g, '\n'); var out = [], i; while ((i = buf.indexOf('\n\n')) >= 0) { var ev = block(buf.slice(0, i)); buf = buf.slice(i + 2); if (ev) out.push(ev); } return out; },
      flush: function () { var ev = buf.trim() ? block(buf) : null; buf = ''; return ev ? [ev] : []; }
    };
  }

  var ERR_KEYS = { ai_not_configured: 'errNoAi', network: 'errNetwork', ai_timeout: 'errTimeout', client_timeout: 'errIdle', ai_rate_limited: 'errRate', rate_limited: 'errRate', ai_budget: 'errBudget', too_big: 'errTooBig', broken: 'errBroken' };
  function errText(code) { return ERR_KEYS[code] ? T(ERR_KEYS[code]) : T('errGeneric', { code: code || '?' }); }
  function codeFromStatus(status, body) {
    var c = body && body.error && typeof body.error.code === 'string' ? body.error.code : '';
    if (c) return c;
    if (status === 429) return 'rate_limited';
    if (status === 413) return 'too_big';
    return 'http_' + status;
  }

  // حجم الطلب ≤ 30 كيلوبايت (الخادم يرفض أكثر من 32 كيلوبايت لغير العناوين الموثوقة): نحذف أقدم أدوار المحادثة أولاً، ثم أجزاء السياق الأقل أهمية
  function fitPayload(p, limit) {
    limit = limit || PAYLOAD_LIMIT;
    var size = function () { return typeof TextEncoder === 'function' ? new TextEncoder().encode(JSON.stringify(p)).length : JSON.stringify(p).length * 2; };
    while (size() > limit && p.history.length) p.history.shift();
    if (size() > limit && p.context) ['tool_outputs', 'recent_results', 'interviews', 'progress'].forEach(function (k) { if (size() > limit && p.context[k]) delete p.context[k]; });
    return size() <= limit;
  }
  function historyFor(msgs, upto) {
    var out = [];
    for (var i = 0; i < upto; i++) { var m = msgs[i]; if (m && !m.error && m.content && m.content.trim()) out.push({ role: m.role, content: m.content.length > 3000 ? m.content.slice(0, 3000) + '…' : m.content }); }
    return out.slice(-HISTORY_TURNS);
  }

  // → Promise<{ok, text, meta, stopped, code, partial}>
  function streamAdvisor(payload, hooks) {
    hooks = hooks || {};
    var ctl = typeof W.AbortController === 'function' ? new W.AbortController() : null, text = '', meta = null, done = false, failed = null, stopped = false, idleHit = false, idle = null;
    if (typeof hooks.onController === 'function') hooks.onController({ abort: function () { stopped = true; if (ctl) { try { ctl.abort(); } catch (e) {} } } });
    function arm() { if (idle) clearTimeout(idle); idle = setTimeout(function () { idleHit = true; if (ctl) { try { ctl.abort(); } catch (e) {} } }, IDLE_MS); }
    function handle(ev) {
      if (ev.type === 'meta') { meta = { context: Array.isArray(ev.context) ? ev.context.filter(function (k) { return SECTION_KEYS.indexOf(k) >= 0; }) : [], model: clip(ev.model, 60) }; if (hooks.onMeta) hooks.onMeta(meta); }
      else if (ev.type === 'text' && typeof ev.text === 'string') { text += ev.text; if (hooks.onText) hooks.onText(text); }
      else if (ev.type === 'done') done = true;
      else if (ev.type === 'error') failed = typeof ev.code === 'string' ? ev.code : 'ai_error';
    }
    function result() {
      if (idle) clearTimeout(idle);
      if (failed) return { ok: false, code: failed, partial: text, meta: meta };
      if (stopped) return { ok: true, text: text, meta: meta, stopped: true };
      if (idleHit) return { ok: false, code: 'client_timeout', partial: text, meta: meta };
      if (!done) return { ok: false, code: text ? 'broken' : 'network', partial: text, meta: meta };
      return { ok: true, text: text, meta: meta };
    }
    arm();
    return W.fetch(apiBase() + '/api/advisor/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { failed = codeFromStatus(res.status, j); return result(); });
        var parser = sseParser();
        if (!res.body || typeof res.body.getReader !== 'function') {
          return res.text().then(function (t) { parser.feed(t).concat(parser.flush()).forEach(handle); return result(); });
        }
        var reader = res.body.getReader(), dec = new TextDecoder();
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { parser.flush().forEach(handle); return result(); }
            arm();
            parser.feed(dec.decode(r.value, { stream: true })).forEach(handle);
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        if (stopped || idleHit) return result();
        if (err && err.name === 'AbortError') return result();
        if (!failed && !done) failed = text ? 'broken' : 'network';
        return result();
      });
  }

  // ═══ الحالة ═════════════════════════════════════════════════════════════════════════════════════
  var S = { store: sanitizeStore(null), busy: false, ctl: null, view: 'chat', stick: true, status: null, statusAt: 0, noteDismissed: false };
  var booted = false, renderTimer = 0;

  function saveStore() { S.store.convs.sort(function (a, b) { return b.updatedAt - a.updatedAt; }); S.store.convs = S.store.convs.slice(0, MAX_CONVS); lsSet(storeKey(), S.store); }
  function active() { var c = S.store.convs.filter(function (x) { return x.id === S.store.active; })[0]; return c || null; }
  function ensureActive() {
    var c = active();
    if (!c) { c = { id: uid('c'), title: '', createdAt: now(), updatedAt: now(), msgs: [] }; S.store.convs.unshift(c); S.store.active = c.id; }
    return c;
  }
  function loadStore() {
    S.store = sanitizeStore(lsGet(storeKey()));
    if (!S.store.migrated) {
      S.store.migrated = true;
      var old = migrateMemory(lsGet('aus.chat.memory'));
      if (old.length && !S.store.convs.length) {
        var c = { id: uid('c'), title: T('oldChat'), createdAt: old[0].ts || now(), updatedAt: old[old.length - 1].ts || now(), msgs: old };
        S.store.convs.push(c); S.store.active = c.id;
      }
      lsSet(storeKey(), S.store);
    }
  }
  function syncLegacyHistory() {
    try { if (typeof chatHistory !== 'undefined') { var c = active(); chatHistory.length = 0; (c ? c.msgs : []).filter(function (m) { return !m.error && m.content; }).slice(-40).forEach(function (m) { chatHistory.push({ role: m.role, content: m.content }); }); } } catch (e) {}
  }

  // ═══ التنسيق ════════════════════════════════════════════════════════════════════════════════════
  function injectCss() {
    if ($('aus-adv-css')) return;
    var st = D.createElement('style');
    st.id = 'aus-adv-css';
    st.textContent = [
      '.aus-adv-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:.55rem .9rem;margin:0 0 .6rem;background:rgba(255,255,255,.06);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4)}',
      '.aus-adv-btn{display:inline-flex;align-items:center;gap:6px;padding:.38rem .9rem;border-radius:20px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:rgba(255,255,255,.88);font-family:Tajawal,sans-serif;font-size:.8rem;cursor:pointer;transition:background .2s,border-color .2s}',
      '.aus-adv-btn:hover{background:rgba(255,255,255,.12)}.aus-adv-btn:focus-visible{outline:2px solid var(--primary);outline-offset:2px}.aus-adv-btn.on{background:rgba(0,212,255,.14);border-color:rgba(0,212,255,.45);color:#fff}.aus-adv-btn.off{opacity:.7}',
      '.aus-adv-btn b{font-family:Orbitron,sans-serif;font-size:.7rem;color:var(--primary)}.aus-adv-gap{flex:1}',
      // الشريط الجديد (~50px) كان سيأخذ من مساحة الرسائل: نكبّر الحاوية بقدره (500px الأصلية → 570px على الأقل، وتتبع ارتفاع الشاشة حتى 900px) فلا تضيق الرسائل
      '#chatContainer.chat-container{height:max(570px,min(900px,calc(100vh - 210px)))}',
      '.aus-adv-note{display:flex;gap:10px;align-items:flex-start;padding:.6rem .9rem;margin:0 0 .6rem;border-radius:14px;background:rgba(0,212,255,.07);border:1px solid rgba(0,212,255,.22);font-size:.78rem;line-height:1.7;color:rgba(255,255,255,.82);flex-shrink:0}.aus-adv-note[hidden]{display:none}',
      '.aus-adv-panel{display:none;padding:1rem;margin:0 0 .6rem;background:rgba(255,255,255,.06);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4);max-height:68vh;overflow:auto}',
      '#chatContainer.aus-adv-panel-open .aus-adv-panel{display:block}#chatContainer.aus-adv-panel-open .chat-messages,#chatContainer.aus-adv-panel-open #ausChatStatus,#chatContainer.aus-adv-panel-open .chat-input-area,#chatContainer.aus-adv-panel-open #ausVoicePanel,#chatContainer.aus-adv-panel-open .aus-input-hint,#chatContainer.aus-adv-panel-open #ausMicStatus{display:none!important}',
      '.aus-adv-h{display:flex;align-items:center;gap:10px;margin:0 0 .8rem;font-family:Orbitron,sans-serif;font-size:.78rem;letter-spacing:.06em;color:var(--primary)}.aus-adv-h .grow{flex:1}',
      '.aus-adv-conv{display:flex;align-items:center;gap:10px;padding:.65rem .8rem;margin:0 0 .45rem;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}.aus-adv-conv.cur{border-color:rgba(0,212,255,.5);background:rgba(0,212,255,.07)}',
      '.aus-adv-conv .t{flex:1;min-width:0}.aus-adv-conv .t b{display:block;color:#fff;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aus-adv-conv .t small{color:rgba(255,255,255,.5);font-size:.72rem}.aus-adv-conv input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.25);border-radius:10px;color:#fff;padding:.35rem .6rem;font-family:Tajawal,sans-serif}',
      '.aus-adv-mini{padding:.3rem .7rem;border-radius:16px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:rgba(255,255,255,.8);font-family:Tajawal,sans-serif;font-size:.74rem;cursor:pointer}.aus-adv-mini:hover{background:rgba(255,255,255,.12)}.aus-adv-mini.danger.armed{color:#ff4d8d;border-color:rgba(255,0,110,.5)}',
      '.aus-ai-error{display:flex;gap:10px;align-items:flex-start;padding:.7rem .9rem;margin-top:.6rem;border-radius:14px;background:rgba(255,0,110,.08);border:1px solid rgba(255,0,110,.3);color:#ffd0de;font-size:.85rem;line-height:1.7}.aus-ai-error p{margin:0}',
      '.aus-ai-note{margin-top:.5rem;font-size:.76rem;color:rgba(255,255,255,.55)}',
      '.aus-ctx-line{margin-top:.35rem;font-size:.72rem;color:rgba(255,255,255,.5)}',
      '.aus-kb-block{margin-top:.7rem;padding:.8rem 1rem;border-radius:14px;background:rgba(255,214,10,.05);border:1px dashed rgba(255,214,10,.35)}.aus-kb-block h5{margin:0 0 .4rem;color:#ffd60a;font-size:.82rem}.aus-kb-block .aus-ai-note{margin:.5rem 0 0}',
      '.send-btn.stop-mode{background:linear-gradient(135deg,#ff006e,#9d1a4f)!important}',
      '.smart-suggestion:focus-visible{outline:2px solid var(--primary);outline-offset:2px}',
      '.aus-mic-status{margin:.35rem .2rem 0;font-size:.76rem;color:rgba(255,255,255,.7)}.aus-mic-status:empty{display:none}.aus-mic-status.err{color:#ffb4c8}',
      '.message.ai .ai-stream-text{overflow-wrap:anywhere}.message.ai .aus-table-wrap{overflow-x:auto}',
      '@media (max-width:560px){.aus-adv-btn span.lbl{display:none}.aus-adv-btn{padding:.45rem .7rem}.aus-adv-conv{flex-wrap:wrap}}',
      '@media (prefers-reduced-motion:reduce){.aus-adv-btn{transition:none}}'
    ].join('\n');
    D.head.appendChild(st);
  }

  // ═══ بناء الفقاعات (نفس العقد: message ai + id="{tid}-host" + div#{tid}) ════════════════════════════
  function chat() { return $('chatMessages'); }
  function nearBottom(el) { return el.scrollHeight - el.scrollTop - el.clientHeight < 80; }
  function scrollDown(force) { var c = chat(); if (c && (force || S.stick)) c.scrollTop = c.scrollHeight; }

  function userBubble(msg) { return '<div class="message user" data-mid="' + esc(msg.id) + '">' + esc(msg.content) + '</div>'; }
  function aiHost(msg) {
    return '<div class="message ai" id="' + esc(msg.id) + '-host" data-mid="' + esc(msg.id) + '" aria-busy="true"><div class="ai-meta"><span class="ai-avatar">🧠</span><span>CEO · AI</span><span class="agent-badge">Advisor</span></div>' +
           '<div id="' + esc(msg.id) + '"><div class="ai-typing-dots"><span></span><span></span><span></span></div></div></div>';
  }
  function ctxLine(msg) {
    if (!msg.ctx) return '';
    var names = msg.ctx.map(function (k) { return T('s_' + k); }).join(' · ');
    return '<div class="aus-ctx-line">📎 ' + esc(msg.ctx.length ? T('used', { s: names }) : T('usedNone')) + '</div>';
  }
  function actionsHtml(msg, isLast) {
    var b = function (a, icon, title) { return '<button type="button" class="ai-action-btn" data-aact="' + a + '" title="' + esc(title) + '" aria-label="' + esc(title) + '"><i class="fas ' + icon + '"></i></button>'; };
    return '<div class="ai-actions">' + (msg.error ? '' : b('copy', 'fa-copy', T('copy')) + b('speak', 'fa-volume-up', T('speak'))) + (isLast ? b('regen', msg.error ? 'fa-rotate-right' : 'fa-redo', msg.error ? T('retry') : T('regen')) : '') +
           (msg.error ? '' : b('up', 'fa-thumbs-up', T('up')) + b('down', 'fa-thumbs-down', T('down'))) + '</div>';
  }
  function chipsHtml(msg) {
    var f = msg.followups || [];
    return f.length ? '<div class="smart-suggestions">' + f.map(function (q) { return '<span class="smart-suggestion" role="button" tabindex="0" data-q="' + esc(q) + '">' + esc(q) + '</span>'; }).join('') + '</div>' : '';
  }
  function errorCard(msg) {
    var kb = '<button type="button" class="aus-adv-mini" data-aact="kb">' + esc(T('kbOffer')) + '</button>';
    return '<div class="aus-ai-error" role="alert"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><div><p>' + esc(errText(msg.error.code)) + '</p><p style="margin-top:.4rem">' + kb + '</p></div></div>';
  }
  function finalInner(msg, isLast) {
    var parts = [];
    if (msg.content && msg.content.trim()) parts.push('<div class="ai-stream-text" dir="auto">' + AUS_MDsafe(msg.content, false) + '</div>');
    if (msg.error) parts.push(errorCard(msg));
    if (msg.stopped) parts.push('<div class="aus-ai-note">⏹ ' + esc(T('stopped')) + '</div>');
    if (!msg.error) parts.push('<div class="agent-trace">' + esc(T('trace')) + '</div>' + ctxLine(msg));
    parts.push(actionsHtml(msg, isLast));
    if (!msg.error && isLast) parts.push(chipsHtml(msg));
    return parts.join('');
  }
  function AUS_MDsafe(text, streaming) {
    if (W.AUS_MD && typeof W.AUS_MD.render === 'function') return W.AUS_MD.render(text, { streaming: !!streaming });
    return '<p class="aus-p">' + esc(text).replace(/\n/g, '<br>') + '</p>';        // وحدة العرض لم تُحمَّل: نص عادي مُهرَّب (لا HTML أبداً)
  }

  function renderConversation() {
    var c = chat(); if (!c) return;
    c.querySelectorAll('.message').forEach(function (n) { if (n.id !== 'aus-welcome-msg') n.remove(); });
    var conv = active();
    if (conv) conv.msgs.forEach(function (m, i) {
      if (m.role === 'user') c.insertAdjacentHTML('beforeend', userBubble(m));
      else { c.insertAdjacentHTML('beforeend', aiHost(m)); var inner = $(m.id); var host = $(m.id + '-host'); if (inner) inner.innerHTML = finalInner(m, i === conv.msgs.length - 1); if (host) host.setAttribute('aria-busy', 'false'); }
    });
    var w = $('aus-welcome-msg'); if (w) w.style.display = conv && conv.msgs.length ? 'none' : '';
    S.stick = true; scrollDown(true);
  }

  // ═══ الإرسال ═════════════════════════════════════════════════════════════════════════════════════
  function setBusy(on) {
    S.busy = !!on;
    var btn = D.querySelector('#chatContainer .send-btn');
    if (btn) { btn.classList.toggle('stop-mode', !!on); btn.setAttribute('aria-label', on ? T('stop') : T('send')); btn.title = on ? T('stop') : T('send'); btn.innerHTML = '<i class="fas ' + (on ? 'fa-stop' : 'fa-paper-plane') + '"></i>'; }
  }
  function hint(msg) {
    var el = $('ausMicStatus'); if (!el) return;
    el.textContent = msg; el.className = 'aus-mic-status err'; setTimeout(function () { if (el.textContent === msg) { el.textContent = ''; el.className = 'aus-mic-status'; } }, 3500);
  }

  function send(text) {
    text = String(text == null ? '' : text).trim();
    if (!text) return false;
    if (S.busy) { hint(T('errBusy')); return false; }
    if (text.length > MAX_MSG) { hint(T('errTooLong', { n: MAX_MSG })); return false; }
    if (S.view !== 'chat') setView('chat');
    var conv = ensureActive(), um = { id: uid('m'), role: 'user', content: text, ts: now() };
    conv.msgs.push(um); if (!conv.title) conv.title = titleFrom(text) || T('untitled'); conv.updatedAt = now();
    if (conv.msgs.length > MAX_MSGS) conv.msgs.splice(0, conv.msgs.length - MAX_MSGS);
    var c = chat(), w = $('aus-welcome-msg'); if (w) w.style.display = 'none';
    if (c) { c.querySelectorAll('.aus-kb-block').forEach(function (n) { n.remove(); }); c.insertAdjacentHTML('beforeend', userBubble(um)); }
    S.stick = true; scrollDown(true);
    saveStore();
    runTurn(conv);
    return true;
  }

  function runTurn(conv) {
    var c = chat();
    var lastUserIdx = -1;
    for (var i = conv.msgs.length - 1; i >= 0; i--) if (conv.msgs[i].role === 'user') { lastUserIdx = i; break; }
    if (lastUserIdx < 0) return;
    var user = conv.msgs[lastUserIdx];
    var am = { id: uid('m'), role: 'assistant', content: '', ts: now() };
    // أي ردّ (أو خطأ) سابق بعد آخر رسالة مستخدم يُزال: هذه المحاولة تحلّ محلّه
    conv.msgs.splice(lastUserIdx + 1);
    if (c) { var u = c.querySelector('.message.user[data-mid="' + user.id + '"]'); if (u) { var n = u.nextElementSibling; while (n) { var nx = n.nextElementSibling; n.remove(); n = nx; } } c.insertAdjacentHTML('beforeend', aiHost(am)); }
    scrollDown(true);
    setBusy(true);

    var share = prefs().share, built = share ? currentContext() : { ctx: null, sections: [] };
    var payload = { message: user.content, history: historyFor(conv.msgs, lastUserIdx), language: lang(), context: built.ctx || undefined };
    if (!built.ctx) delete payload.context;
    if (!fitPayload(payload)) { finishTurn(conv, am, { ok: false, code: 'too_big', partial: '' }); return; }

    var inner = $(am.id), host = $(am.id + '-host'), raw = '', lastPaint = 0;
    function paint() {
      renderTimer = 0;
      var el = inner && inner.querySelector('.ai-stream-text');
      if (!inner) return;
      if (!el) { inner.innerHTML = '<div class="ai-stream-text" dir="auto"></div>'; el = inner.firstChild; }
      var cut = W.AUS_MD ? W.AUS_MD.hidePartialFollowups(raw) : raw;
      el.innerHTML = AUS_MDsafe(cut, true);
      scrollDown(false);
    }
    var cm = chat(); if (cm) cm.onscroll = function () { S.stick = nearBottom(cm); };
    streamAdvisor(payload, {
      onController: function (h) { S.ctl = h; },
      onMeta: function (meta) { am.ctx = meta.context; },
      onText: function (t) { raw = t; if (!renderTimer) renderTimer = setTimeout(paint, Math.max(0, 40 - (now() - lastPaint))); lastPaint = now(); }
    }).then(function (res) {
      if (renderTimer) { clearTimeout(renderTimer); renderTimer = 0; }
      finishTurn(conv, am, res);
    });
  }

  function finishTurn(conv, am, res) {
    S.ctl = null;
    var split = W.AUS_MD ? W.AUS_MD.splitFollowups(res.ok ? res.text : (res.partial || '')) : { text: res.ok ? res.text : (res.partial || ''), followups: [] };
    am.content = clip(split.text, MAX_CONTENT);
    am.followups = res.ok && !res.stopped ? split.followups : [];
    if (res.meta && res.meta.context) am.ctx = res.meta.context; else if (!am.ctx) am.ctx = [];
    if (res.ok) { if (res.stopped) am.stopped = true; if (!am.content.trim() && !am.stopped) { am.error = { code: 'ai_error' }; } }
    else am.error = { code: res.code || 'ai_error' };
    if (am.error && am.error.code === 'broken') am.stopped = false;
    conv.msgs.push(am); conv.updatedAt = now();
    saveStore(); syncLegacyHistory();
    var inner = $(am.id), host = $(am.id + '-host');
    if (inner) inner.innerHTML = finalInner(am, true);
    if (host) host.setAttribute('aria-busy', 'false');
    setBusy(false); scrollDown(false);
    if (res.ok && !res.stopped && am.content.trim() && typeof W.speak === 'function') {
      try {
        var voiceOn = typeof prefs === 'undefined' || (prefs && prefs.voice !== false);          // كما كان في aus_06: القراءة الصوتية تتبع إعداد «الصوت» (افتراضه متوقف)
        if (voiceOn) { var plain = W.AUS_MD ? W.AUS_MD.toPlain(am.content) : am.content; plain = plain.replace(/\s+/g, ' ').trim().slice(0, 600); if (plain) W.speak(plain); }
      } catch (e) {}
    }
    refreshBar();
  }

  function stopTurn() { if (S.ctl) S.ctl.abort(); }

  function regenerate() {
    if (S.busy) { hint(T('errBusy')); return; }
    var conv = active(); if (!conv) return;
    var last = conv.msgs[conv.msgs.length - 1];
    if (!last || last.role !== 'assistant') return;
    conv.msgs.pop();
    runTurn(conv);
  }

  // ═══ قاعدة المعرفة المحلية: اختيارية، ومعنونة، ومنظَّفة (لا تُدرَج كـ HTML خام) ═══════════════════
  var KB_TAGS = { DIV: 1, P: 1, SPAN: 1, UL: 1, OL: 1, LI: 1, STRONG: 1, EM: 1, B: 1, I: 1, H3: 1, H4: 1, H5: 1, BR: 1, CODE: 1 };
  function sanitizeKb(html) {
    var tpl = D.createElement('template'); tpl.innerHTML = String(html == null ? '' : html);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) return;
        if (ch.nodeType !== 1 || !KB_TAGS[ch.tagName]) { ch.parentNode.removeChild(ch); return; }
        Array.prototype.slice.call(ch.attributes).forEach(function (a) { if (a.name !== 'class' || !/^[A-Za-z0-9_\- ]{0,60}$/.test(a.value)) ch.removeAttribute(a.name); });
        walk(ch);
      });
    })(tpl.content);
    return tpl.innerHTML;
  }
  function showKb(btn) {
    var host = btn.closest('.message.ai'), conv = active(); if (!host || !conv) return;
    var idx = -1; conv.msgs.forEach(function (m, i) { if (m.id === host.getAttribute('data-mid')) idx = i; });
    var q = ''; for (var i = idx - 1; i >= 0; i--) if (conv.msgs[i].role === 'user') { q = conv.msgs[i].content; break; }
    if (!q || typeof W.generateAIResponse !== 'function') return;
    var res; try { res = W.generateAIResponse(q); } catch (e) { return; }
    var body = res && typeof res.text === 'string' ? sanitizeKb(res.text) : '';
    if (!body) return;
    var block = D.createElement('div'); block.className = 'aus-kb-block';
    block.innerHTML = '<h5>' + esc(T('kbTitle')) + '</h5><div>' + body + '</div><div class="aus-ai-note">' + esc(T('kbNote')) + '</div>';
    var old = host.querySelector('.aus-kb-block'); if (old) old.remove();
    host.appendChild(block); btn.disabled = true; scrollDown(true);
  }

  // ═══ الواجهة: الشريط + السجل + الأدوات ═══════════════════════════════════════════════════════════
  function sectionNames(secs) { return secs.map(function (k) { return T('s_' + k); }).join('، '); }
  function refreshBar() {
    var bar = $('ausAdvBar'); if (!bar) return;
    var p = prefs(), built = currentContext(), n = built.sections.length;
    var set = function (sel, txt) { var e = bar.querySelector(sel); if (e) e.textContent = txt; };
    set('[data-tb="new"] .lbl', T('newChat')); set('[data-tb="history"] .lbl', T('history')); set('[data-tb="tools"] .lbl', T('tools'));
    var ctxBtn = bar.querySelector('[data-tb="ctx"]');
    if (ctxBtn) {
      ctxBtn.classList.toggle('on', p.share); ctxBtn.classList.toggle('off', !p.share); ctxBtn.setAttribute('aria-pressed', p.share ? 'true' : 'false');
      ctxBtn.querySelector('.lbl').innerHTML = esc(T('ctx')) + ' <b>' + (p.share ? n : 0) + '</b>';
      ctxBtn.title = !p.share ? T('ctxOffTip') : (n ? T('ctxOnTip', { s: sectionNames(built.sections) }) : T('ctxNone'));
    }
    bar.querySelector('[data-tb="history"]').classList.toggle('on', S.view === 'history');
    bar.querySelector('[data-tb="tools"]').classList.toggle('on', S.view === 'tools');
    var note = $('ausAdvNote'); if (note) { var show = p.share && n > 0 && !p.noteSeen && !S.noteDismissed; note.hidden = !show; var t = note.querySelector('.txt'); if (t) t.textContent = T('ctxNote'); var g = note.querySelector('button'); if (g) g.textContent = T('gotIt'); }
    var inp = $('chatInput'); if (inp) { inp.maxLength = MAX_MSG; }
    var hintEl = D.querySelector('.aus-input-hint'); if (hintEl) hintEl.textContent = T('inputHint');
  }
  function setSubtitle(kind) {
    var sm = D.querySelector('#chatContainer .chat-header small'); if (!sm) return;
    sm.textContent = T(kind);
  }
  function probeStatus() {
    if (now() - S.statusAt < 20000 && S.status) { setSubtitle(S.status); return; }
    setSubtitle('sub_check');
    var ctl = typeof W.AbortController === 'function' ? new W.AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    W.fetch(apiBase() + '/api/advisor/status', { signal: ctl ? ctl.signal : undefined, cache: 'no-store' }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('status'); return r.json(); })
      .then(function (j) { S.status = j && j.live ? 'sub_live' : 'sub_off'; S.statusAt = now(); setSubtitle(S.status); })
      .catch(function () { clearTimeout(t); S.status = 'sub_down'; S.statusAt = now(); setSubtitle(S.status); });
  }

  function setView(v) {
    S.view = v;
    var cont = $('chatContainer'); if (cont) cont.classList.toggle('aus-adv-panel-open', v !== 'chat');
    var panel = $('ausAdvPanel');
    if (panel) {
      if (v === 'history') renderHistory(panel);
      else if (v === 'tools') mountTools(panel);
      else { if (W.AUS_EXEC && W.AUS_EXEC.unmount) try { W.AUS_EXEC.unmount(); } catch (e) {} panel.innerHTML = ''; }
    }
    refreshBar();
    if (v === 'chat') { var c = chat(); if (c) { S.stick = true; scrollDown(true); } }
  }

  function fmtDate(ts) { try { return new Date(ts).toLocaleDateString(lang() === 'ar' ? 'ar' : 'en') + ' ' + new Date(ts).toLocaleTimeString(lang() === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function renderHistory(panel) {
    var rows = S.store.convs.map(function (c) {
      return '<div class="aus-adv-conv' + (c.id === S.store.active ? ' cur' : '') + '" data-conv="' + esc(c.id) + '"><div class="t"><b>' + esc(c.title || T('untitled')) + '</b><small>' + esc(fmtDate(c.updatedAt)) + ' · ' + esc(T('nMsgs', { n: c.msgs.length })) + '</small></div>' +
        '<button type="button" class="aus-adv-mini" data-hact="open">' + esc(T('open')) + '</button><button type="button" class="aus-adv-mini" data-hact="rename">' + esc(T('rename')) + '</button><button type="button" class="aus-adv-mini danger" data-hact="del">' + esc(T('del')) + '</button></div>';
    }).join('');
    panel.innerHTML = '<div class="aus-adv-h"><span class="grow">⬡ ' + esc(T('histTitle')) + '</span><button type="button" class="aus-adv-mini" data-hact="copyChat">' + esc(T('copyChat')) + '</button><button type="button" class="aus-adv-mini" data-hact="back">' + esc(T('back')) + '</button></div>' +
      (rows || '<div class="aus-ai-note">' + esc(T('histEmpty')) + '</div>') + (rows ? '<div style="margin-top:.8rem"><button type="button" class="aus-adv-mini danger" data-hact="delAll">' + esc(T('delAll')) + '</button></div>' : '');
  }
  function mountTools(panel) {
    panel.innerHTML = '<div class="aus-adv-h"><span class="grow">🧰 ' + esc(T('tools')) + '</span><button type="button" class="aus-adv-mini" data-hact="back">' + esc(T('back')) + '</button></div><div id="ausAdvToolsHost"></div>';
    var host = $('ausAdvToolsHost');
    if (W.AUS_EXEC && typeof W.AUS_EXEC.mount === 'function') W.AUS_EXEC.mount(host, { onAsk: function (text) { setView('chat'); send(text); }, onChange: refreshBar });
    else host.innerHTML = '<div class="aus-ai-note">' + esc(T('toolsMissing')) + '</div>';
  }

  function newConversation() {
    if (S.busy) stopTurn();
    var cur = active();
    if (cur && !cur.msgs.length) { setView('chat'); focusInput(); return; }
    var c = { id: uid('c'), title: '', createdAt: now(), updatedAt: now(), msgs: [] };
    S.store.convs.unshift(c); S.store.active = c.id; saveStore(); syncLegacyHistory();
    setView('chat'); renderConversation(); focusInput();
  }
  function openConversation(id) {
    if (S.busy) stopTurn();
    if (!S.store.convs.some(function (c) { return c.id === id; })) return;
    S.store.active = id; saveStore(); syncLegacyHistory(); setView('chat'); renderConversation();
  }
  function deleteConversation(id) {
    S.store.convs = S.store.convs.filter(function (c) { return c.id !== id; });
    if (S.store.active === id) S.store.active = S.store.convs[0] ? S.store.convs[0].id : null;
    saveStore(); syncLegacyHistory(); renderHistory($('ausAdvPanel'));
  }
  function conversationText(conv) {
    return (conv ? conv.msgs : []).filter(function (m) { return !m.error && m.content; }).map(function (m) { return (m.role === 'user' ? '### 👤\n' : '### 🧠 CEO AI\n') + m.content; }).join('\n\n');
  }
  function focusInput() { var i = $('chatInput'); if (i) { try { i.focus(); } catch (e) {} } }
  function copyText(text, btn, label) {
    var done = function () { if (btn) { var old = btn.innerHTML; btn.innerHTML = '<i class="fas fa-check"></i>' + (label ? ' ' + esc(label) : ''); setTimeout(function () { btn.innerHTML = old; }, 1400); } };
    var fallback = function () { try { var ta = D.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; D.body.appendChild(ta); ta.select(); var ok = D.execCommand('copy'); D.body.removeChild(ta); if (ok) done(); } catch (e) {} };
    try { if (W.navigator.clipboard && W.navigator.clipboard.writeText) { W.navigator.clipboard.writeText(text).then(done, fallback); return; } } catch (e) {}
    fallback();
  }

  // ═══ الأحداث ═════════════════════════════════════════════════════════════════════════════════════
  var armed = {};
  function onClick(e) {
    var t = e.target; if (!t || !t.closest) return;
    // زرّ الإرسال يتحوّل إلى «إيقاف» أثناء البثّ (مستمع في مرحلة الالتقاط يمنع onclick القديم)
    var sendBtn = t.closest('#chatContainer .send-btn');
    if (sendBtn && S.busy) { e.preventDefault(); e.stopPropagation(); stopTurn(); return; }
    var tb = t.closest('[data-tb]');
    if (tb && $('ausAdvBar') && $('ausAdvBar').contains(tb)) {
      var k = tb.getAttribute('data-tb');
      if (k === 'new') newConversation();
      else if (k === 'history') setView(S.view === 'history' ? 'chat' : 'history');
      else if (k === 'tools') setView(S.view === 'tools' ? 'chat' : 'tools');
      else if (k === 'ctx') { var p = prefs(); setPrefs({ share: !p.share, noteSeen: p.noteSeen }); refreshBar(); }
      return;
    }
    if (t.closest('#ausAdvNote button')) { var pp = prefs(); setPrefs({ share: pp.share, noteSeen: true }); S.noteDismissed = true; refreshBar(); return; }
    var ha = t.closest('[data-hact]');
    if (ha && $('ausAdvPanel') && $('ausAdvPanel').contains(ha)) { onHistoryAction(ha); return; }
    var aa = t.closest('[data-aact]');
    if (aa) { onMessageAction(aa); return; }
    var chip = t.closest('.smart-suggestion[data-q]');
    if (chip) { var q = chip.getAttribute('data-q'); if (q) send(q); }
  }
  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('smart-suggestion') && e.target.hasAttribute('data-q')) { e.preventDefault(); e.target.click(); }
    if (e.key === 'Escape' && S.view !== 'chat') setView('chat');
  }
  function onMessageAction(btn) {
    var a = btn.getAttribute('data-aact'), host = btn.closest('.message.ai'), conv = active();
    var msg = null; if (host && conv) conv.msgs.forEach(function (m) { if (m.id === host.getAttribute('data-mid')) msg = m; });
    if (a === 'copy' && msg) copyText(msg.content, btn, T('copied'));
    else if (a === 'speak') { if (typeof W.speakAiText === 'function') W.speakAiText(btn); }
    else if (a === 'regen') regenerate();
    else if (a === 'up' && typeof W.thumbsAi === 'function') W.thumbsAi(btn, '+');
    else if (a === 'down' && typeof W.thumbsAi === 'function') W.thumbsAi(btn, '-');
    else if (a === 'kb') showKb(btn);
  }
  function onHistoryAction(btn) {
    var a = btn.getAttribute('data-hact'), row = btn.closest('[data-conv]'), id = row ? row.getAttribute('data-conv') : null;
    if (a === 'back') { setView('chat'); return; }
    if (a === 'copyChat') { copyText(conversationText(active()), btn, T('copied')); return; }
    if (a === 'open' && id) { openConversation(id); return; }
    if (a === 'rename' && id && row) {
      var conv = S.store.convs.filter(function (c) { return c.id === id; })[0]; if (!conv) return;
      var tbox = row.querySelector('.t'); tbox.innerHTML = '<input type="text" maxlength="80" value="' + esc(conv.title || '') + '" aria-label="' + esc(T('rename')) + '">';
      var inp = tbox.querySelector('input'); inp.focus(); inp.select();
      var commit = function (save) { if (save) { conv.title = clip(inp.value, 80).trim() || conv.title; conv.updatedAt = conv.updatedAt; saveStore(); } renderHistory($('ausAdvPanel')); };
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') commit(true); else if (ev.key === 'Escape') commit(false); });
      inp.addEventListener('blur', function () { commit(true); });
      return;
    }
    if ((a === 'del' && id) || a === 'delAll') {
      var key = a + (id || '');
      if (!armed[key]) { armed[key] = true; btn.textContent = T('confirm'); btn.classList.add('armed'); setTimeout(function () { armed[key] = false; if (btn.isConnected) { btn.textContent = a === 'del' ? T('del') : T('delAll'); btn.classList.remove('armed'); } }, 3500); return; }
      armed[key] = false;
      if (a === 'del') deleteConversation(id);
      else { S.store.convs = []; S.store.active = null; saveStore(); syncLegacyHistory(); renderHistory($('ausAdvPanel')); renderConversation(); }
    }
  }

  // ═══ الميكروفون: إملاء صوتي في خانة الكتابة عبر AUS_MIC ═════════════════════════════════════════════
  var dict = { sess: null, state: 'idle', base: '', pttStopAt: 0 };
  function micStatus(text, err) { var el = $('ausMicStatus'); if (el) { el.textContent = text || ''; el.className = 'aus-mic-status' + (err ? ' err' : ''); } }
  function micBtnState(on) { var b = $('micBtn'); if (b) { b.classList.toggle('recording', !!on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } }
  function dictCancel() { if (dict.sess) { try { dict.sess.destroy(); } catch (e) {} dict.sess = null; } dict.state = 'idle'; micBtnState(false); micStatus(''); }
  function dictStart(autoSend) {
    var M = W.AUS_MIC; if (!M) { micStatus(T('micEmpty'), true); return; }
    dictCancel();
    var inp = $('chatInput'); dict.base = inp ? inp.value.trim() : '';
    var join = function (a, b) { a = String(a || '').trim(); b = String(b || '').trim(); return a && b ? a + ' ' + b : (a || b); };
    dict.sess = M.create({
      lang: lang() === 'ar' ? 'ar-SA' : 'en-US', maxSeconds: 60, owner: 'advisor',
      onState: function (s) {
        dict.state = s; micBtnState(s === 'listening' || s === 'requesting_permission');
        // الحالات الفعّالة فقط تكتب النص؛ «idle/error/transcript_ready» لا تمسحه (onError يضع رسالة الخطأ، وتدمير الجلسة بعده يُطلق idle — كان يمحوها)
        if (s === 'requesting_permission' || s === 'listening' || s === 'processing') micStatus(s === 'requesting_permission' ? T('micPerm') : s === 'listening' ? T('micListening') : T('micProcessing'));
      },
      onInterim: function (text) { if (inp) inp.value = join(dict.base, text); },
      onTranscript: function (text) {
        if (inp) inp.value = join(dict.base, text);
        dict.state = 'idle'; micBtnState(false); micStatus('');
        var s = dict.sess; dict.sess = null; if (s) { try { s.destroy(); } catch (e) {} }
        if (autoSend && inp && inp.value.trim()) setTimeout(function () { if (typeof W.sendMessage === 'function') W.sendMessage(); }, 250);
      },
      onError: function (err) {
        dict.state = 'idle'; micBtnState(false);
        if (err && err.partial && inp) inp.value = join(dict.base, err.partial);
        if (err && err.code !== 'preempted' && err.code !== 'destroyed') micStatus(lang() === 'en' ? err.message_en : err.message, true); else micStatus('');
        var s = dict.sess; dict.sess = null; if (s) { try { s.destroy(); } catch (e) {} }
      }
    });
    dict.sess.start().catch(function () {});
  }
  function dictToggle() {
    if (now() - dict.pttStopAt < 700) return;                                  // بعد ترك زرّ «اضغط مطوّلاً للتحدّث» يصل click أيضاً — لا يجوز أن يلغي التسجيل الذي أُنهي للتوّ
    if (dict.state === 'listening' && dict.sess) { dict.sess.stop().catch(function () {}); return; }
    if (dict.state === 'requesting_permission' || dict.state === 'processing') { dictCancel(); return; }
    dictStart(true);
  }

  // ═══ التركيب ═════════════════════════════════════════════════════════════════════════════════════
  function inject() {
    var cont = $('chatContainer'); if (!cont) return false;
    injectCss();
    var header = cont.querySelector('.chat-header');
    if (!$('ausAdvBar') && header) {
      header.insertAdjacentHTML('afterend',
        '<div class="aus-adv-bar" id="ausAdvBar" role="toolbar" aria-label="CEO AI">' +
        '<button type="button" class="aus-adv-btn" data-tb="new"><i class="fas fa-plus"></i><span class="lbl"></span></button>' +
        '<button type="button" class="aus-adv-btn" data-tb="history"><i class="fas fa-clock-rotate-left"></i><span class="lbl"></span></button>' +
        '<button type="button" class="aus-adv-btn" data-tb="tools"><i class="fas fa-toolbox"></i><span class="lbl"></span></button>' +
        '<span class="aus-adv-gap"></span>' +
        '<button type="button" class="aus-adv-btn on" data-tb="ctx" aria-pressed="true"><i class="fas fa-paperclip"></i><span class="lbl"></span></button></div>' +
        '<div class="aus-adv-panel" id="ausAdvPanel"></div>');
    }
    // ملاحظة أول استعمال: داخل منطقة الرسائل (تمرّ مع المحتوى) كي لا تقتطع من ارتفاعها الثابت
    var msgs = $('chatMessages');
    if (msgs && !$('ausAdvNote')) msgs.insertAdjacentHTML('afterbegin', '<div class="aus-adv-note" id="ausAdvNote" hidden><span class="txt"></span><button type="button" class="aus-adv-mini"></button></div>');
    var area = cont.querySelector('.chat-input-area');
    if (area && !$('ausMicStatus')) area.insertAdjacentHTML('afterend', '<div class="aus-mic-status" id="ausMicStatus" role="status" aria-live="polite"></div>');
    return true;
  }

  function boot() {
    if (booted) return;
    if (!inject()) return;
    booted = true;
    loadStore();
    renderConversation(); syncLegacyHistory(); refreshBar(); probeStatus();
    var cont = $('chatContainer');
    cont.addEventListener('click', onClick, true);                         // الالتقاط: لنوقف onclick القديم لزرّ الإرسال أثناء البثّ
    cont.addEventListener('keydown', onKey);
    var cm = chat(); if (cm) cm.addEventListener('scroll', function () { S.stick = nearBottom(cm); }, { passive: true });
  }

  function reloadForUser() { if (!booted) return; if (S.busy) stopTurn(); loadStore(); setView('chat'); renderConversation(); syncLegacyHistory(); refreshBar(); }

  // ── ربط الدوال العامة القديمة ──
  W.sendMessage = function () {
    var input = $('chatInput'); if (!input) return;
    var msg = (input.value || '').trim();
    if (!msg) return;
    if (!booted) boot();
    if (S.busy) { hint(T('errBusy')); return; }
    if (msg.length > MAX_MSG) { hint(T('errTooLong', { n: MAX_MSG })); return; }
    input.value = '';
    if (typeof W.sfxPlay === 'function') { try { W.sfxPlay('click'); } catch (e) {} }
    send(msg);
  };
  W.loadChatMemory = function () { /* استُبدلت بمخزن المحادثات في aus_57_advisor.js (لا إعادة رسم لنصوص خام من localStorage) */ };
  W.toggleMic = function () { dictToggle(); };
  W.ensureRecog = function () {
    var shim = { start: function () { dictStart(true); }, stop: function () { dict.pttStopAt = now(); if (dict.sess && dict.state === 'listening') dict.sess.stop().catch(function () {}); }, abort: function () { dictCancel(); } };
    try { recog = shim; } catch (e) {}
    return shim;
  };

  function wrap(name, after) { var prev = W[name]; if (typeof prev !== 'function') return; W[name] = function () { var r = prev.apply(this, arguments); try { after.apply(this, arguments); } catch (e) {} return r; }; }
  wrap('showLeadershipResults', saveLeadershipSnapshot);
  wrap('_showCDNAResults', saveDnaSnapshot);
  var prevShow = W.showSection;
  if (typeof prevShow === 'function') {
    W.showSection = function (id) {
      if (id !== 'ceoai') dictCancel();
      var r = prevShow.apply(this, arguments);
      if (id === 'ceoai') { try { if (!booted) boot(); refreshBar(); probeStatus(); } catch (e) {} }
      return r;
    };
  }
  W.addEventListener('aus-auth-changed', function () { try { reloadForUser(); } catch (e) {} });
  W.addEventListener('pagehide', dictCancel);

  // سجلّ تسجيل 'claude' في AUSAgent حتى يمرّ أي استدعاء مباشر له عبر المستشار أيضاً (كان يمرّ عبر /api/chat/stream)
  try {
    if (typeof AUSAgent !== 'undefined' && AUSAgent && AUSAgent.registerTool) {
      AUSAgent.registerTool('claude', { description: 'CEO AI advisor (/api/advisor/stream)', icon: '🧠', keywords: [], handler: function (p) { return Promise.resolve(send(p && p.message)); } });
    }
  } catch (e) {}

  W.AUS_ADVISOR = {
    send: send, stop: stopTurn, newConversation: newConversation, regenerate: regenerate, setView: setView, refresh: refreshBar,
    state: function () { return { busy: S.busy, view: S.view, convs: S.store.convs.length, active: S.store.active, msgs: (active() || { msgs: [] }).msgs.length }; },
    context: currentContext, saveLeadershipSnapshot: saveLeadershipSnapshot, saveDnaSnapshot: saveDnaSnapshot,
    _test: { sseParser: sseParser, sanitizeStore: sanitizeStore, sanitizeMsg: sanitizeMsg, migrateMemory: migrateMemory, buildContextFrom: buildContextFrom, fitPayload: fitPayload, historyFor: historyFor,
             titleFrom: titleFrom, errText: errText, codeFromStatus: codeFromStatus, streamAdvisor: streamAdvisor, L: L, S: S, prefs: prefs, setPrefs: setPrefs, collectSources: collectSources,
             sanitizeKb: sanitizeKb, conversationText: conversationText, finalInner: finalInner, userBubble: userBubble }
  };

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 450); });
  else setTimeout(boot, 450);
})();
