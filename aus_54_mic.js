/* ================================================================
   AUS — وحدة الميكروفون الموحّدة (aus_54_mic.js)          window.AUS_MIC
   ----------------------------------------------------------------
   لماذا؟ الميكروفون في «محاكي المقابلة» كان يفشل بصمت:
     • عند رفض الإذن (أو عنوان http غير آمن، أو متصفح/تطبيق مضمَّن) يصل خطأ `not-allowed` فيبتلعه الكود ويعيد الزر كما كان — لا رسالة ولا سبب.
     • الجملة التي تظهر على الشاشة أثناء الكلام «مؤقّتة» (interim) ولا تدخل متغيّر الإجابة إلا بعد أن يثبّتها المتصفح، فإذا ضغط الطالب «إرسال»
       قبل ذلك وصلت الإجابة فارغة وظهرت العبارة «يرجى كتابة إجابة» رغم أنه تكلّم.
     • لا حالة «جارٍ التفريغ»، ولا مؤقّت، ولا إلغاء، ولا تعديل للنص، ولا بديل عند المتصفحات التي لا تدعم SpeechRecognition (Firefox، Brave، WebView).

   ما تفعله هذه الوحدة (وحدة واحدة تستعملها كل واجهات الإدخال الصوتي):
     1) تفحص الدعم فعلياً: سياق آمن؟ getUserMedia؟ SpeechRecognition؟ MediaRecorder؟ وهل التفريغ على الخادم مفعّل؟
     2) تطلب إذن الميكروفون صراحةً (getUserMedia) فتميّز: رفض الإذن · لا ميكروفون · الميكروفون مشغول — وتعرض سبباً وحلاً بالعربية.
     3) محرّكان للتفريغ:
          speech   : SpeechRecognition في المتصفح (Chrome/Edge/Safari) — مع إعادة تشغيل تلقائية عند انتهاء الجلسة وحفظ النص.
          recorder : MediaRecorder يسجّل صوت الطالب فعلاً (مع قياس مستوى حقيقي) ثم يُرسَل إلى POST /api/transcribe على الخادم
                     (يعمل فقط إن ضُبط مفتاح التفريغ على الخادم — لا نُظهر هذا الخيار إن لم يكن متاحاً).
     4) آلة حالات واحدة: idle → requesting_permission → listening → processing → transcript_ready | error
        (والإرسال `submitting` يتولاه التطبيق نفسه فوق هذه الحالات).
     5) نظافة الموارد: توقف المسارات الصوتية (tracks) عند الإيقاف/الإلغاء/المغادرة، ويُغلق AudioContext، وتُلغى المؤقّتات؛
        جلسة واحدة نشطة فقط في الصفحة؛ ولا تُنفَّذ نداءات متأخرة من جلسة ملغاة (generation counter).
     6) لا نصّ فارغ أبداً: تسجيل صامت / قصير جداً / نص فارغ ⇒ خطأ صريح، ولا يُعدّ «نجاحاً».

   الاستعمال:
     var s = AUS_MIC.create({ lang:'ar-SA', maxSeconds:120, onState, onInterim, onTranscript, onLevel, onTick, onError, onActivity });
     s.start();                 // Promise — يرفض بخطأ {code,message,recoverable} ويستدعي onError أيضاً
     s.stop();                  // Promise<{text, meta}> — ينتظر آخر ما ثبّته المحرك (ولا يفقد الجملة المؤقتة)
     s.cancel();  s.destroy();  s.retryTranscription();   s.state / s.engine / s.elapsedMs
     AUS_MIC.support()  AUS_MIC.probeServer()  AUS_MIC.cancelAll()  AUS_MIC.describe(code, lang)
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_MIC) return;

  var W = window;

  // ── الرسائل (عربي أولاً + إنجليزي) ─────────────────────────────────────────────────────────────
  var MSG = {
    unsupported:       { ar: 'متصفحك لا يدعم التسجيل الصوتي. اكتب إجابتك، أو افتح الموقع في Chrome أو Edge.', en: 'This browser does not support voice input. Type your answer, or open the site in Chrome or Edge.', recoverable: false },
    insecure_context:  { ar: 'يمنع المتصفح الميكروفون على هذا العنوان لأنه غير آمن (http). افتح الموقع من localhost أو عبر https ثم أعد المحاولة.', en: 'The browser blocks the microphone on this address because it is not secure (http). Open the site from localhost or over https.', recoverable: false },
    permission_denied: { ar: 'تم رفض إذن الميكروفون. اضغط أيقونة القفل 🔒 بجوار عنوان الصفحة ← الميكروفون ← سماح، ثم أعد المحاولة.', en: 'Microphone permission was denied. Click the lock icon 🔒 next to the address → Microphone → Allow, then try again.', recoverable: true },
    no_microphone:     { ar: 'لم نجد ميكروفوناً. وصّل ميكروفوناً أو تحقق من إعدادات الصوت في جهازك ثم أعد المحاولة.', en: 'No microphone was found. Plug one in or check your sound settings, then try again.', recoverable: true },
    mic_busy:          { ar: 'الميكروفون مستخدم من تطبيق آخر. أغلق التطبيق الآخر ثم أعد المحاولة.', en: 'The microphone is being used by another application. Close it and try again.', recoverable: true },
    mic_error:         { ar: 'تعذّر تشغيل الميكروفون. أعد المحاولة، وإن تكرّر الأمر فاكتب إجابتك.', en: 'The microphone could not be started. Try again, or type your answer.', recoverable: true },
    speech_network:    { ar: 'خدمة التعرّف على الصوت في المتصفح غير متاحة الآن (تحتاج اتصالاً بالإنترنت، ولا تعمل في بعض المتصفحات مثل Brave أو في التطبيقات المضمَّنة). اكتب إجابتك أو جرّب Chrome/Edge.', en: 'The browser speech service is unavailable (it needs an internet connection and does not work in some browsers such as Brave or embedded apps). Type your answer or try Chrome/Edge.', recoverable: true },
    service_blocked:   { ar: 'منع المتصفح خدمة التعرّف على الصوت. تحقق من إعدادات الخصوصية أو جرّب متصفحاً آخر.', en: 'The browser blocked its speech service. Check your privacy settings or try another browser.', recoverable: false },
    no_speech:         { ar: 'لم نسمع أي كلام. تأكد أن الميكروفون يعمل وغير مكتوم، وتحدّث بصوت أوضح ثم أعد المحاولة.', en: 'We did not hear anything. Make sure the microphone works and is not muted, speak up, and try again.', recoverable: true },
    empty_recording:   { ar: 'التسجيل صامت — لم يلتقط الميكروفون أي صوت. تحقق أنه غير مكتوم وأعد التسجيل.', en: 'The recording is silent — the microphone picked up no sound. Check it is not muted and record again.', recoverable: true },
    too_short:         { ar: 'التسجيل قصير جداً. تحدّث لثانيتين على الأقل.', en: 'The recording is too short. Speak for at least two seconds.', recoverable: true },
    empty_transcript:  { ar: 'لم يُلتقط أي كلام مفهوم. أعد المحاولة أو اكتب إجابتك.', en: 'No intelligible speech was captured. Try again or type your answer.', recoverable: true },
    stt_unavailable:   { ar: 'خدمة التفريغ الصوتي على الخادم غير مفعّلة. اكتب إجابتك أو استعمل Chrome/Edge.', en: 'Server-side transcription is not enabled. Type your answer or use Chrome/Edge.', recoverable: false },
    transcription_failed: { ar: 'تعذّر تفريغ التسجيل. أعد المحاولة أو اكتب إجابتك.', en: 'The recording could not be transcribed. Try again or type your answer.', recoverable: true },
    network:           { ar: 'تعذّر الاتصال بالخادم لتفريغ التسجيل. تسجيلك محفوظ — اضغط «إعادة المحاولة» عند عودة الاتصال.', en: 'Could not reach the server to transcribe. Your recording is kept — press Retry once you are online.', recoverable: true },
    rate_limited:      { ar: 'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.', en: 'Too many requests. Wait a moment and try again.', recoverable: true },
    too_large:         { ar: 'التسجيل أكبر من الحد المسموح. سجّل إجابة أقصر.', en: 'The recording exceeds the allowed size. Record a shorter answer.', recoverable: false },
    language_not_supported: { ar: 'اللغة المطلوبة غير مدعومة في خدمة التعرّف على الصوت.', en: 'The requested language is not supported by the speech service.', recoverable: false },
    aborted:           { ar: 'انقطع التسجيل. أعد المحاولة.', en: 'The recording was interrupted. Try again.', recoverable: true },
    preempted:         { ar: 'أُوقف هذا التسجيل لأن تسجيلاً آخر بدأ.', en: 'This recording was stopped because another one started.', recoverable: true },
    destroyed:         { ar: 'أُغلقت جلسة الميكروفون.', en: 'The microphone session was closed.', recoverable: false }
  };

  function langKey(l) { return String(l || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'ar'; }
  function describe(code, lang) { var m = MSG[code] || MSG.mic_error; return m[langKey(lang)]; }

  function makeError(code, extra) {
    var m = MSG[code] || MSG.mic_error;
    var e = { code: code, message: m.ar, message_en: m.en, recoverable: !!m.recoverable };
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }

  // ── الدعم ───────────────────────────────────────────────────────────────────────────────────────
  var _serverStt = { value: null, at: 0, info: null };

  function apiBase() {
    if (W.AUS_API_BASE) return String(W.AUS_API_BASE).replace(/\/+$/, '');
    try { if (typeof CHAT_API_BASE !== 'undefined') return String(CHAT_API_BASE).replace(/\/+$/, ''); } catch (e) {}
    return 'http://127.0.0.1:8002';
  }

  // → { secure, mediaDevices, speech, recorder, server, engine, reason }
  //   engine: 'speech' | 'recorder' | 'none'   ·   reason (عند none): 'insecure_context' | 'unsupported'
  function support() {
    var n = W.navigator || {};
    var secure = W.isSecureContext !== false;                       // undefined في المتصفحات القديمة ⇒ نفترض آمناً
    var gum = !!(n.mediaDevices && typeof n.mediaDevices.getUserMedia === 'function');
    var SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    var rec = typeof W.MediaRecorder === 'function' && gum;
    var out = { secure: secure, mediaDevices: gum, speech: !!SR, recorder: rec, server: _serverStt.value, engine: 'none', reason: '' };
    if (!secure) { out.reason = 'insecure_context'; return out; }
    if (SR) out.engine = 'speech';
    else if (rec && _serverStt.value === true) out.engine = 'recorder';
    else out.reason = 'unsupported';
    return out;
  }

  // هل التفريغ على الخادم مفعّل؟ (يُخزَّن 60 ث) → Promise<true|false|null>   (null = لا يمكن الحكم: الخادم غير متاح)
  function probeServer(force) {
    if (!force && _serverStt.value !== null && Date.now() - _serverStt.at < 60000) return Promise.resolve(_serverStt.value);
    if (typeof W.fetch !== 'function') return Promise.resolve(null);
    var ctl = typeof W.AbortController === 'function' ? new W.AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 5000) : null;
    return W.fetch(apiBase() + '/api/transcribe/status', { signal: ctl ? ctl.signal : undefined, cache: 'no-store' }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('status ' + r.status);
      return r.json();
    }).then(function (j) {
      _serverStt = { value: !!(j && j.available), at: Date.now(), info: j || null };
      return _serverStt.value;
    }).catch(function () { if (timer) clearTimeout(timer); return null; });
  }

  // ── الجلسة النشطة الوحيدة ───────────────────────────────────────────────────────────────────────
  var ACTIVE = null;
  var SEQ = 0;

  function cancelAll(reason) {
    if (ACTIVE) { var a = ACTIVE; ACTIVE = null; try { a._preempt(reason || 'cancelAll'); } catch (e) {} }
  }

  var MIME_PREFS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac'];
  function pickMime() {
    if (typeof W.MediaRecorder !== 'function' || typeof W.MediaRecorder.isTypeSupported !== 'function') return '';
    for (var i = 0; i < MIME_PREFS.length; i++) { try { if (W.MediaRecorder.isTypeSupported(MIME_PREFS[i])) return MIME_PREFS[i]; } catch (e) {} }
    return '';
  }

  // ── إنشاء جلسة ──────────────────────────────────────────────────────────────────────────────────
  function create(opts) {
    opts = opts || {};
    var id = ++SEQ;
    var cb = {
      onState: opts.onState, onInterim: opts.onInterim, onTranscript: opts.onTranscript, onLevel: opts.onLevel,
      onTick: opts.onTick, onError: opts.onError, onActivity: opts.onActivity
    };
    var lang = opts.lang || 'ar-SA';
    var maxMs = Math.max(5, Number(opts.maxSeconds) || 120) * 1000;
    var minMs = Math.max(0, (opts.minSeconds == null ? 0.8 : Number(opts.minSeconds)) * 1000);
    var wantEngine = opts.engine || 'auto';

    var st = 'idle', gen = 0, destroyed = false;
    var engine = null;
    var startedAt = 0, tickTimer = null, elapsed = 0, watchdog = null;
    var stopping = false, discard = false, autoStopped = false;
    var waiters = [];                       // {res, rej} — كل من ينتظر نتيجة stop()/retryTranscription()

    // speech
    var rec = null, finals = [], interim = '', restarts = 0, lastRecStart = 0, sawNoSpeech = false, stopTimer = null;
    // recorder
    var stream = null, audioCtx = null, analyser = null, hasAnalyser = false, levelTimer = null, levelBuf = null, peak = 0, smooth = 0;
    var mr = null, chunks = [], blob = null, uploadCtl = null, uploadTimer = null;

    var api = {
      id: id, owner: opts.owner || '',
      get state() { return st; },
      get engine() { return engine; },
      get elapsedMs() { return elapsed; },
      get transcript() { return joinText(); },
      get hasRecording() { return !!blob; }
    };

    function joinText() { return (finals.join(' ') + (interim ? ' ' + interim : '')).replace(/\s+/g, ' ').trim(); }
    function safe(fn, a, b) { if (typeof fn === 'function') { try { fn(a, b); } catch (e) { try { console.warn('[AUS_MIC] callback', e); } catch (_) {} } } }
    function settle(ok, v) { var w = waiters; waiters = []; for (var i = 0; i < w.length; i++) { try { (ok ? w[i].res : w[i].rej)(v); } catch (e) {} } }
    function wait() { return new Promise(function (res, rej) { waiters.push({ res: res, rej: rej }); }); }

    function setState(next, info) {
      if (st === next) return;
      st = next;
      safe(cb.onState, next, info || {});
    }

    // ── موارد ──
    function stopTracks(s) { if (!s) return; try { var ts = s.getTracks ? s.getTracks() : []; for (var i = 0; i < ts.length; i++) { try { ts[i].stop(); } catch (e) {} } } catch (e) {} }
    function clearTimers() {
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      if (levelTimer) { clearInterval(levelTimer); levelTimer = null; }
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    }
    function closeAudioContext() {
      if (audioCtx) { try { var p = audioCtx.close(); if (p && p.catch) p.catch(function () {}); } catch (e) {} audioCtx = null; }
      analyser = null; levelBuf = null;
    }
    function releaseAudio() { clearTimers(); stopTracks(stream); stream = null; closeAudioContext(); }
    function releaseEngines() {
      if (rec) {
        rec.onstart = rec.onresult = rec.onerror = rec.onend = rec.onaudiostart = rec.onsoundstart = rec.onspeechstart = rec.onspeechend = rec.onsoundend = null;
        try { rec.abort(); } catch (e) { try { rec.stop(); } catch (_) {} }
        rec = null;
      }
      if (mr) {
        mr.ondataavailable = mr.onstop = mr.onerror = null;
        try { if (mr.state !== 'inactive') mr.stop(); } catch (e) {}
        mr = null;
      }
      if (uploadTimer) { clearTimeout(uploadTimer); uploadTimer = null; }
      if (uploadCtl) { try { uploadCtl.abort(); } catch (e) {} uploadCtl = null; }
    }
    function releaseAll() { releaseEngines(); releaseAudio(); }

    function resetData() {
      finals = []; interim = ''; restarts = 0; lastRecStart = 0; sawNoSpeech = false;
      chunks = []; blob = null; peak = 0; smooth = 0; elapsed = 0; hasAnalyser = false;
      stopping = false; discard = false; autoStopped = false;
    }

    function startTimers() {
      startedAt = Date.now(); elapsed = 0;
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = setInterval(function () {
        elapsed = Date.now() - startedAt;
        safe(cb.onTick, elapsed);
        if (elapsed >= maxMs && st === 'listening' && !stopping) { autoStopped = true; api.stop().catch(function () {}); }
      }, 250);
    }

    // ── فشل: يحرّر كل شيء ويُبلغ ──
    function fail(err, myGen) {
      if (myGen != null && myGen !== gen) return null;           // نداء متأخر من جلسة أُلغيت
      var partial = joinText();
      if (partial) err.partial = partial;
      releaseAll();
      if (ACTIVE === api) ACTIVE = null;
      setState('error', { error: err });
      safe(cb.onError, err);
      settle(false, err);
      return err;
    }

    // ── الإذن ──
    function mapMediaError(e) {
      var name = (e && e.name) || '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return makeError(W.isSecureContext === false ? 'insecure_context' : 'permission_denied', { detail: name });
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return makeError('no_microphone', { detail: name });
      if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return makeError('mic_busy', { detail: name });
      return makeError('mic_error', { detail: name || String(e && e.message || '') });
    }
    function getStream() {
      var n = W.navigator || {};
      return n.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    }

    // ── محرّك الكلام (SpeechRecognition) ──
    function startSpeech(myGen) {
      var SR = W.SpeechRecognition || W.webkitSpeechRecognition;
      var r;
      try { r = new SR(); } catch (e) { return fail(makeError('unsupported'), myGen); }
      rec = r;
      r.lang = lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      var begin = function () {
        if (myGen !== gen) return;
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
        lastRecStart = Date.now();
        if (st === 'requesting_permission') { startTimers(); setState('listening', { engine: 'speech' }); }
      };
      r.onstart = begin;
      r.onaudiostart = function () { begin(); if (myGen === gen) safe(cb.onActivity, 'audio'); };
      r.onsoundstart = function () { if (myGen === gen) safe(cb.onActivity, 'sound'); };
      r.onspeechstart = function () { if (myGen === gen) safe(cb.onActivity, 'speech'); };
      r.onspeechend = function () { if (myGen === gen) safe(cb.onActivity, 'silence'); };
      r.onsoundend = function () { if (myGen === gen) safe(cb.onActivity, 'silence'); };
      r.onresult = function (e) {
        if (myGen !== gen) return;
        begin();
        var cur = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var res = e.results[i];
          var t = (res && res[0] && res[0].transcript) || '';
          if (res.isFinal) { if (t.trim()) finals.push(t.trim()); }
          else cur += t;
        }
        interim = cur.trim();
        safe(cb.onInterim, joinText(), { final: finals.join(' '), interim: interim });
      };
      r.onerror = function (e) {
        if (myGen !== gen) return;
        var code = (e && e.error) || '';
        if (code === 'aborted') { if (stopping || discard) return; fail(makeError('aborted'), myGen); return; }
        if (code === 'no-speech') { sawNoSpeech = true; return; }                     // يُحكم عليه عند انتهاء الجلسة (قد يكون هناك نص سابق)
        if (code === 'not-allowed') { fail(makeError(W.isSecureContext === false ? 'insecure_context' : 'permission_denied', { detail: code }), myGen); return; }
        if (code === 'service-not-allowed') { fail(makeError('service_blocked', { detail: code }), myGen); return; }
        if (code === 'audio-capture') { fail(makeError('no_microphone', { detail: code }), myGen); return; }
        if (code === 'network') { fail(makeError('speech_network', { detail: code }), myGen); return; }
        if (code === 'language-not-supported') { fail(makeError('language_not_supported', { detail: code }), myGen); return; }
        fail(makeError('mic_error', { detail: code }), myGen);
      };
      r.onend = function () {
        if (myGen !== gen) return;
        if (stopping) { finishSpeech(myGen); return; }
        // انتهت الجلسة من تلقاء نفسها والطالب لم يوقف: صمت طويل أو انقطاع عابر ⇒ نعيد التشغيل مع الاحتفاظ بالنص
        if (st === 'listening' && restarts < 6 && Date.now() - lastRecStart > 700 && !sawNoSpeech) {
          restarts++;
          try { r.start(); lastRecStart = Date.now(); return; } catch (e) { /* يسقط إلى الإنهاء */ }
        }
        finishSpeech(myGen);
      };
      try { r.start(); }
      catch (e) { return fail(makeError('mic_error', { detail: (e && e.name) || 'start' }), myGen); }
      // لو لم يبدأ المحرك خلال 15 ث (نافذة إذن لم يجب عنها أحد، أو متصفح لا يطلق onstart) لا نبقى معلّقين
      watchdog = setTimeout(function () { if (myGen === gen && st === 'requesting_permission') fail(makeError('mic_error', { detail: 'no_start' }), myGen); }, 15000);
      return null;
    }

    function finishSpeech(myGen) {
      if (myGen !== gen) return;
      var text = joinText();
      var hadInterimOnly = !!interim;
      var dur = elapsed || (startedAt ? Date.now() - startedAt : 0);
      releaseAll();
      if (ACTIVE === api) ACTIVE = null;
      if (!text) {
        var e = makeError(sawNoSpeech ? 'no_speech' : 'empty_transcript');
        setState('error', { error: e });
        safe(cb.onError, e);
        settle(false, e);
        return;
      }
      finals = [text]; interim = '';
      var meta = { engine: 'speech', durationMs: dur, interimIncluded: hadInterimOnly, autoStopped: autoStopped };
      setState('transcript_ready', meta);
      safe(cb.onTranscript, text, meta);
      settle(true, { text: text, meta: meta });
    }

    // ── محرّك التسجيل (MediaRecorder + تفريغ على الخادم) ──
    function setupAnalyser(s) {
      var AC = W.AudioContext || W.webkitAudioContext;
      if (!AC) return;
      try {
        audioCtx = new AC();
        var src = audioCtx.createMediaStreamSource(s);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        levelBuf = new Uint8Array(analyser.fftSize);
        hasAnalyser = true;
        levelTimer = setInterval(function () {
          if (!analyser) return;
          analyser.getByteTimeDomainData(levelBuf);
          var sum = 0;
          for (var i = 0; i < levelBuf.length; i++) { var v = (levelBuf[i] - 128) / 128; sum += v * v; }
          var rms = Math.sqrt(sum / levelBuf.length);
          if (rms > peak) peak = rms;
          smooth = smooth * 0.6 + Math.min(1, rms * 4) * 0.4;
          safe(cb.onLevel, smooth, rms);
        }, 60);
      } catch (e) { closeAudioContext(); hasAnalyser = false; }
    }

    function startRecorder(myGen, s) {
      stream = s;
      var mime = pickMime(), m;
      try { m = new W.MediaRecorder(s, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined); }
      catch (e) { return fail(makeError('unsupported', { detail: (e && e.name) || '' }), myGen); }
      mr = m; chunks = [];
      m.ondataavailable = function (e) { if (myGen === gen && e && e.data && e.data.size) chunks.push(e.data); };
      m.onerror = function () { fail(makeError('mic_error', { detail: 'MediaRecorder' }), myGen); };
      m.onstop = function () { onRecorderStopped(myGen, m.mimeType || mime || ''); };
      try { m.start(1000); } catch (e) { return fail(makeError('mic_error', { detail: 'start' }), myGen); }
      setupAnalyser(s);
      startTimers();
      setState('listening', { engine: 'recorder', mime: mime });
      return null;
    }

    function onRecorderStopped(myGen, mime) {
      if (myGen !== gen) return;
      var dur = elapsed || (startedAt ? Date.now() - startedAt : 0);
      var peakNow = peak, sawAnalyser = hasAnalyser;
      // الميكروفون يُحرَّر فوراً — قبل الرفع — فلا يبقى المسار الصوتي نشطاً أثناء انتظار الخادم
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      if (levelTimer) { clearInterval(levelTimer); levelTimer = null; }
      stopTracks(stream); stream = null;
      closeAudioContext();
      if (discard) return;
      blob = new W.Blob(chunks, { type: mime || 'audio/webm' });
      chunks = [];
      var bad = null;
      if (dur < minMs) bad = 'too_short';
      else if (!blob.size || blob.size < 800) bad = 'empty_recording';
      else if (sawAnalyser && peakNow < 0.004) bad = 'empty_recording';      // صمت رقمي كامل (ميكروفون مكتوم)
      if (bad) { blob = null; fail(makeError(bad), myGen); return; }
      transcribe(myGen, dur);
    }

    function transcribe(myGen, dur) {
      setState('processing', { engine: 'recorder', stage: 'transcribing' });
      var url = apiBase() + '/api/transcribe?lang=' + encodeURIComponent(String(lang).split('-')[0]) + '&dur=' + Math.round(dur / 1000);
      uploadCtl = typeof W.AbortController === 'function' ? new W.AbortController() : null;
      if (uploadTimer) clearTimeout(uploadTimer);
      uploadTimer = setTimeout(function () { if (uploadCtl) { try { uploadCtl.abort(); } catch (e) {} } }, 45000);
      var myBlob = blob;
      W.fetch(url, { method: 'POST', headers: { 'Content-Type': myBlob.type || 'application/octet-stream' }, body: myBlob, signal: uploadCtl ? uploadCtl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, data: j || {} }; }); })
        .then(function (res) {
          if (myGen !== gen) return;
          if (uploadTimer) { clearTimeout(uploadTimer); uploadTimer = null; }
          uploadCtl = null;
          if (res.ok) {
            var text = String((res.data && res.data.text) || '').replace(/\s+/g, ' ').trim();
            if (!text) { fail(makeError('empty_transcript'), myGen); return; }
            finals = [text]; interim = ''; blob = null;
            var meta = { engine: 'recorder', durationMs: dur, language: res.data.language || '', autoStopped: autoStopped };
            if (ACTIVE === api) ACTIVE = null;
            setState('transcript_ready', meta);
            safe(cb.onTranscript, text, meta);
            settle(true, { text: text, meta: meta });
            return;
          }
          var code = res.data && res.data.error && res.data.error.code;
          if (res.status === 503 || code === 'transcription_unavailable') { blob = null; fail(makeError('stt_unavailable'), myGen); }
          else if (res.status === 413) { blob = null; fail(makeError('too_large'), myGen); }
          else if (res.status === 429) fail(makeError('rate_limited', { retryAfter: res.data && res.data.error && res.data.error.retry_after }), myGen);
          else fail(makeError('transcription_failed', { status: res.status }), myGen);
        }, function (e) {
          if (myGen !== gen) return;
          if (uploadTimer) { clearTimeout(uploadTimer); uploadTimer = null; }
          uploadCtl = null;
          fail(makeError('network', { detail: (e && e.name) || '' }), myGen);
        });
    }

    // ── API ──
    api.start = function () {
      if (destroyed) return Promise.reject(makeError('destroyed'));
      if (st === 'listening' || st === 'requesting_permission' || st === 'processing') return Promise.resolve();      // لا تسجيلان متزامنان في الجلسة نفسها
      var sup = support();
      if (wantEngine === 'speech') engine = sup.speech && sup.secure ? 'speech' : null;
      else if (wantEngine === 'recorder') engine = sup.recorder && sup.secure ? 'recorder' : null;
      else engine = sup.engine === 'none' ? null : sup.engine;
      resetData();
      if (!engine) {
        var ne = makeError(sup.secure ? 'unsupported' : 'insecure_context');
        setState('error', { error: ne }); safe(cb.onError, ne);
        return Promise.reject(ne);
      }
      if (ACTIVE && ACTIVE !== api) { try { ACTIVE._preempt('start'); } catch (e) {} }
      ACTIVE = api;
      var myGen = ++gen;
      setState('requesting_permission', { engine: engine });
      var n = W.navigator || {};
      if (!(n.mediaDevices && typeof n.mediaDevices.getUserMedia === 'function')) {
        // متصفح قديم بلا getUserMedia (لكن فيه SpeechRecognition): نترك المتصفح يطلب الإذن بنفسه
        if (engine === 'speech') { var es = startSpeech(myGen); return es ? Promise.reject(es) : Promise.resolve(); }
        var e0 = makeError('unsupported'); fail(e0, myGen); return Promise.reject(e0);
      }
      return getStream().then(function (s) {
        if (myGen !== gen) { stopTracks(s); return; }            // أُلغيت الجلسة أثناء نافذة الإذن
        if (engine === 'speech') {
          // الإذن فقط: نُغلق المسار فوراً ليتولى SpeechRecognition الالتقاط (فتح مسارين معاً يربك بعض الأجهزة، خصوصاً أندرويد)
          stopTracks(s);
          var er = startSpeech(myGen);
          if (er) throw er;
        } else {
          var er2 = startRecorder(myGen, s);
          if (er2) throw er2;
        }
      }, function (e) {
        if (myGen !== gen) return;
        var err = mapMediaError(e);
        fail(err, myGen);
        throw err;
      });
    };

    // يوقف الالتقاط ويُرجع النص النهائي. لا يفقد الجملة التي لم يثبّتها المحرّك بعد.
    api.stop = function () {
      if (destroyed) return Promise.reject(makeError('destroyed'));
      if (st === 'transcript_ready') return Promise.resolve({ text: joinText(), meta: {} });
      if (st === 'idle' || st === 'error') return Promise.resolve({ text: joinText(), meta: { state: st } });
      if (st === 'requesting_permission') { api.cancel(); return Promise.resolve({ text: '', meta: { cancelled: true } }); }
      var p = wait();
      if (stopping || st === 'processing') return p;               // طلب سابق قيد التنفيذ: ننتظر النتيجة نفسها
      stopping = true;
      setState('processing', { engine: engine, stage: 'finishing' });
      var myGen = gen;
      if (engine === 'speech') {
        try { rec.stop(); } catch (e) { finishSpeech(myGen); return p; }
        stopTimer = setTimeout(function () { finishSpeech(myGen); }, 2500);          // المتصفح لم يُنهِ الجلسة: نأخذ ما لدينا
      } else {
        try { mr.stop(); } catch (e) { fail(makeError('mic_error', { detail: 'stop' }), myGen); }
      }
      return p;
    };

    api.cancel = function () {
      if (destroyed) return;
      discard = true; gen++;                                     // يُبطل كل نداء متأخر
      releaseAll();
      if (ACTIVE === api) ACTIVE = null;
      finals = []; interim = ''; chunks = []; blob = null;
      var wasIdle = st === 'idle';
      st = 'idle';
      if (!wasIdle) safe(cb.onState, 'idle', { cancelled: true });
      settle(false, makeError('aborted'));
    };

    api.retryTranscription = function () {
      if (destroyed || !blob || st !== 'error') return Promise.reject(makeError('transcription_failed'));
      if (ACTIVE && ACTIVE !== api) { try { ACTIVE._preempt('retry'); } catch (e) {} }
      ACTIVE = api;
      var myGen = ++gen;
      var p = wait();
      transcribe(myGen, elapsed);
      return p;
    };

    // يعيد الجلسة إلى idle ويمسح ما التُقط (لإعادة التسجيل)
    api.reset = function () { api.cancel(); };

    api.destroy = function () {
      if (destroyed) return;
      api.cancel();
      destroyed = true;
      cb = {};
    };

    // يستدعيها غيرها عند بدء تسجيل آخر / مغادرة القسم
    api._preempt = function (reason) {
      if (destroyed) return;
      var wasActive = st === 'listening' || st === 'requesting_permission' || st === 'processing';
      var sub = cb;
      api.cancel();
      if (wasActive && reason !== 'cancelAll' && reason !== 'pagehide' && reason !== 'unload') safe(sub.onError, makeError('preempted'));
    };

    return api;
  }

  // أحداث عامة: مغادرة الصفحة تُحرّر الميكروفون
  try {
    W.addEventListener('pagehide', function () { cancelAll('pagehide'); });
    W.addEventListener('beforeunload', function () { cancelAll('unload'); });
  } catch (e) {}

  W.AUS_MIC = { create: create, support: support, probeServer: probeServer, cancelAll: cancelAll, describe: describe, messages: MSG, pickMime: pickMime };
})();
