/* ================================================================
   AUS — محاكي المقابلة الذكي (aus_55_interview.js)              window.AUS_INTERVIEW
   ----------------------------------------------------------------
   يستبدل منطق المقابلة القديم الذي كان في aus_07_studio.js (البيانات INTV_CATEGORIES بقيت هناك وتُوسَّع هنا) ويحلّ ثلاث مشكلات:

     1) الميكروفون: كل التسجيل الصوتي يمرّ عبر AUS_MIC (aus_54_mic.js) — إذن صريح، أخطاء واضحة بالعربية، مؤقّت، إلغاء، نص قابل للتعديل،
        وبديل «تسجيل ثم تفريغ على الخادم» حين لا يدعم المتصفح التعرّف المدمج. لا إرسال لنص فارغ، ولا ادّعاء بأن الكلام فُهم وهو لم يُفهم.

     2) التقييم: لا درجة «يخترعها» النموذج ولا تقدير بحسب طول الإجابة. كل نوع مقابلة له معايير معروفة بأوزان ثابتة (يراها الطالب قبل أن يبدأ)،
        والخادم (/api/interview/*) يطلب من النموذج درجة 0–5 لكل معيار مع اقتباس من إجابة الطالب، ثم يحسب هو المجموع من 100.
        إذا تعذّر التقييم (لا مفتاح ذكاء اصطناعي، انقطاع، ردّ لا يطابق المعايير) تُعرض رسالة صريحة وزرّ إعادة المحاولة — لا درجات بديلة.

     3) الحالات: كل ما يظهر (حالة المُقابِل، نبض الأفاتار، مستوى الصوت) مرتبط بحالة فعلية: إذن/استماع/تفريغ/طلب تقييم قيد التنفيذ.

   الحالات:  setup → room → (تقييم) → feedback → … → results
   الميكروفون داخل الغرفة:  idle → requesting_permission → listening → processing → transcript_ready | error   ثم submitting (الإرسال) فوقها.
   الحفظ:  aus.interview.v1.<email> (مقابلة غير مكتملة + مسوّدة الإجابة) · aus.interview.history.v1.<email> (آخر 10 مقابلات مكتملة)
   الأسماء القديمة (renderInterviewSimulator, startInterview, …) تبقى كما هي حتى لا ينكسر أي استدعاء قائم.
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_INTERVIEW) return;

  var W = window, D = document;
  var MIN_CHARS = 8;                 // = الحد الأدنى الذي يقبله الخادم
  var MAX_CHARS = 4000;              // = MAX_ANSWER_CHARS في الخادم
  var MAX_SECONDS = 120;             // أقصى مدة لتسجيل إجابة واحدة
  var HISTORY_MAX = 10;

  // ═══ النصوص (عربي أولاً + إنجليزي) ═══════════════════════════════════════════════════════════════
  var L = {
    ar: {
      chooseType: 'اختر نوع المقابلة', chooseSub: 'حدد نوع المقابلة التي تريد التدرب عليها مع المُقابِل الذكي',
      nQuestions: '{n} أسئلة', diffMid: 'متوسط', diffHard: 'متقدم', start: 'ابدأ المقابلة', pickFirst: 'اختر نوع المقابلة أولاً',
      resumeTitle: 'لديك مقابلة غير مكتملة', resumeInfo: '{cat} — وصلتَ إلى السؤال {q} من {n}', resume: 'استئناف', discard: 'تجاهلها',
      rubricTitle: 'كيف سيتم تقييمك', rubricNote: 'يُقيَّم مضمون إجابتك فقط — لا نحكم على النطق ولا اللهجة ولا سرعة الكلام. الدرجة من 100 يحسبها الخادم من درجات المعايير (0–5) وأوزانها؛ لا يضعها النموذج.',
      weight: 'الوزن', bands: 'المستويات', rubricLoading: 'جارٍ تحميل معايير التقييم…',
      rubricFail: 'تعذّر تحميل معايير التقييم من الخادم. يمكنك البدء، لكن التقييم نفسه يحتاج إلى الخادم.', retry: 'إعادة المحاولة',
      micTitle: 'الميكروفون', micSpeech: 'جاهز — التعرّف على الصوت مدمج في المتصفح', micRecorder: 'جاهز — يسجَّل صوتك ويُفرَّغ على الخادم',
      micChecking: 'جارٍ فحص دعم الميكروفون…', micDeniedPre: 'إذن الميكروفون مرفوض لهذا الموقع. فعّله من أيقونة القفل 🔒 بجوار عنوان الصفحة ← الميكروفون ← سماح.',
      micNoneUnsupported: 'غير متاح في هذا المتصفح. يمكنك الكتابة، أو فتح الموقع في Chrome أو Edge.', micNoneStt: 'غير متاح: متصفحك لا يدعم التعرّف المدمج والتفريغ على الخادم غير مفعّل.',
      micNoneSttUnknown: 'غير متاح الآن: متصفحك لا يدعم التعرّف المدمج، وتعذّر التأكد من التفريغ على الخادم لأن الخادم لا يردّ.',
      micDetails: 'تفاصيل تقنية', yes: 'نعم', no: 'لا', unknown: 'غير معروف',
      dSecure: 'سياق آمن (https أو localhost)', dSpeech: 'التعرّف المدمج في المتصفح (SpeechRecognition)', dRecorder: 'تسجيل الصوت (MediaRecorder)', dServer: 'تفريغ الصوت على الخادم',
      dServerOn: 'مفعّل', dServerOff: 'غير مفعّل', dServerUnknown: 'غير معروف (الخادم لا يردّ)', dEngine: 'الطريقة المستخدمة', dLastError: 'آخر خطأ',
      historyTitle: 'آخر مقابلاتك', question: 'السؤال', qOf: 'السؤال {i} / {n}',
      modeText: 'كتابة', modeVoice: 'صوت', placeholder: 'اكتب إجابتك هنا… حاول أن تكون واضحاً ومفصّلاً (2-4 جمل على الأقل).', placeholderFollow: 'اكتب ردّك على سؤال المُقابِل…',
      count: '{n} / {max}',
      stAsking: '⬡ يسأل', stPerm: '⬡ بانتظار إذن الميكروفون', stListening: '⬡ يستمع', stProcessing: '⬡ يحوّل الصوت إلى نص', stReady: '⬡ راجع النص ثم أرسل',
      stMicError: '⬡ تعذّر التسجيل', stEval: '⬡ يقيّم إجابتك', stDiscuss: '⬡ يناقش', stThinking: '⬡ يفكر',
      voiceIdle: 'اضغط الميكروفون وتحدّث. سيظهر كلامك نصاً يمكنك تعديله قبل الإرسال.',
      voicePerm: 'بانتظار إذنك… اسمح للمتصفح باستخدام الميكروفون.', voiceListeningSpeech: 'جارٍ الاستماع — تحدّث الآن.', voiceListeningRec: 'جارٍ التسجيل — سيُحوَّل كلامك إلى نص بعد الإيقاف.',
      voiceProcessingSpeech: 'جارٍ إنهاء الجملة الأخيرة…', voiceProcessingRec: 'جارٍ تحويل الكلام إلى نص على الخادم…', voiceReady: 'تم تحويل كلامك إلى نص. راجعه وعدّله ثم أرسل.',
      voiceAutoStopped: 'بلغ التسجيل الحد الأقصى ({s} ثانية) فتوقف تلقائياً. تم تحويل ما قلته إلى نص.', voicePartial: 'التُقط جزء من كلامك قبل الخطأ وأُضيف إلى الإجابة — راجعه.',
      voiceNoSound: 'لا نلتقط أي صوت بعد. تأكد أن الميكروفون غير مكتوم وتحدّث بصوت أوضح.', voiceSoundOk: 'يلتقط صوتاً',
      micStart: 'ابدأ التسجيل', micMore: 'سجّل المزيد', micStop: 'إيقاف وتحويل إلى نص', micCancel: 'إلغاء', micRedo: 'إعادة التسجيل (يستبدل النص المسجَّل)', micRetryTr: 'إعادة محاولة التفريغ',
      micTryAgain: 'حاول مجدداً', micTryServer: 'سجّل ثم حوّل على الخادم', micFinishFirst: 'أوقف التسجيل أولاً.', micBusyLeave: 'أنهِ التسجيل أولاً.',
      micAria: 'الميكروفون', micAriaStop: 'إيقاف التسجيل', timerOf: '{a} / {b}',
      submit: 'إرسال الإجابة', evaluating: 'يُقيَّم…', stillWorking: 'ما زال التقييم جارياً… قد يستغرق بعض الوقت.', cancelEval: 'إلغاء الطلب',
      tooShort: 'الإجابة قصيرة جداً — اكتب جملتين على الأقل.', micBusyBlock: 'أنهِ التسجيل أو أوقفه قبل الإرسال.', skip: 'تخطي السؤال', endNow: 'إنهاء المقابلة وعرض النتيجة',
      cancelInterview: 'إلغاء المقابلة', confirmCancel: 'اضغط مرة أخرى للتأكيد', nothingToShow: 'لم تُقيَّم أي إجابة بعد.',
      evalFailed: 'تعذّر تقييم إجابتك', editAnswer: 'عدّل إجابتك',
      discussFailed: 'تعذّر تحميل تعليق المُقابِل.', discussLoading: 'المُقابِل يقرأ إجابتك…', followLabel: 'ردّ على سؤال المُقابِل (اختياري)', followSend: 'إرسال الردّ', replyFailed: 'تعذّر الحصول على تعليق المُقابِل على ردّك.',
      scoreLabel: 'النتيجة (من 100) — محسوبة على الخادم', criteriaTitle: 'تفصيل المعايير', evidence: 'من إجابتك', strengths: 'ما أحسنتَ فيه', gaps: 'ما ينقص إجابتك', improve: 'كيف تحسّنها',
      example: 'مثال لإجابة أقوى', exampleNote: 'مثال توضيحي أنشأه الذكاء الاصطناعي، وليس الإجابة الوحيدة الصحيحة. ما بين [ ] مكان تضع فيه تفاصيلك الحقيقية.',
      next: 'السؤال التالي', finish: 'النتائج النهائية', none: 'لا شيء يُذكر.',
      resultsTitle: 'نتيجة مقابلتك', resultsMeta: '{cat} · {n} أسئلة مُقيَّمة من {t}', resultsCriteria: 'متوسط كل معيار (0–5)', resultsReport: 'تقرير الأداء',
      reportLoading: 'يُعدّ الذكاء الاصطناعي تقريراً مختصراً…', reportMissing: 'تعذّر إعداد التقرير النصي (الدرجات أعلاه صحيحة). {why}', summaryFailed: 'تعذّر حساب النتيجة النهائية على الخادم.',
      perQuestion: 'نتيجة كل سؤال', notEvaluated: 'لم يُقيَّم', skipped: 'تُخطّي', reEvaluate: 'أعد التقييم', redo: 'إعادة المقابلة', another: 'مقابلة أخرى', copy: 'نسخ التقرير', copied: 'تم النسخ ✓', askCeo: 'حلّل أدائي مع CEO AI',
      askCeoText: 'حلّل نتيجة مقابلتي الأخيرة وأخبرني ما أهم ما أحسّنه قبل المقابلة القادمة.',
      noEvaluated: 'لا توجد أسئلة مُقيَّمة، لذلك لا توجد نتيجة نهائية. يمكنك إعادة المقابلة.', gradeLabel: 'المستوى',
      errNetwork: 'تعذّر الاتصال بالخادم. تأكد أنه يعمل ثم أعد المحاولة — إجابتك محفوظة.', errTimeout: 'استغرق الطلب وقتاً أطول من المتوقع. أعد المحاولة — إجابتك محفوظة.',
      errNoAi: 'التقييم بالذكاء الاصطناعي غير مفعّل على الخادم (لم يُضبط مفتاح ANTHROPIC_API_KEY). إجابتك محفوظة؛ أعد المحاولة بعد تفعيله.',
      errBudget: 'استُنفدت حصة الذكاء الاصطناعي لهذا الشهر. إجابتك محفوظة.', errRate: 'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.',
      errAiTimeout: 'استغرق الذكاء الاصطناعي وقتاً طويلاً. أعد المحاولة.', errInvalid: 'لم نحصل على تقييم صالح هذه المرة. أعد المحاولة.', errShort: 'الإجابة قصيرة جداً للتقييم.', errGeneric: 'حدث خطأ غير متوقع ({code}). أعد المحاولة.',
      errCorrupt: 'ردّ الخادم غير مكتمل. أعد المحاولة.'
    },
    en: {
      chooseType: 'Choose the interview type', chooseSub: 'Pick the interview you want to practise with the AI interviewer',
      nQuestions: '{n} questions', diffMid: 'Medium', diffHard: 'Advanced', start: 'Start interview', pickFirst: 'Choose an interview type first',
      resumeTitle: 'You have an unfinished interview', resumeInfo: '{cat} — you reached question {q} of {n}', resume: 'Resume', discard: 'Discard it',
      rubricTitle: 'How you will be assessed', rubricNote: 'Only the content of your answer is assessed — not pronunciation, accent or speaking speed. The score out of 100 is calculated on the server from the criterion scores (0–5) and their weights; the model does not choose it.',
      weight: 'Weight', bands: 'Levels', rubricLoading: 'Loading the assessment criteria…',
      rubricFail: 'The assessment criteria could not be loaded from the server. You can still start, but the assessment itself needs the server.', retry: 'Try again',
      micTitle: 'Microphone', micSpeech: 'Ready — speech recognition is built into the browser', micRecorder: 'Ready — your voice is recorded and transcribed on the server',
      micChecking: 'Checking microphone support…', micDeniedPre: 'Microphone permission is blocked for this site. Enable it from the lock icon 🔒 next to the address → Microphone → Allow.',
      micNoneUnsupported: 'Not available in this browser. You can type, or open the site in Chrome or Edge.', micNoneStt: 'Not available: this browser has no built-in speech recognition and server transcription is not enabled.',
      micNoneSttUnknown: 'Not available right now: this browser has no built-in speech recognition, and server transcription could not be checked because the server is not answering.',
      micDetails: 'Technical details', yes: 'Yes', no: 'No', unknown: 'Unknown',
      dSecure: 'Secure context (https or localhost)', dSpeech: 'Built-in browser speech recognition (SpeechRecognition)', dRecorder: 'Audio recording (MediaRecorder)', dServer: 'Server-side transcription',
      dServerOn: 'Enabled', dServerOff: 'Not enabled', dServerUnknown: 'Unknown (server not answering)', dEngine: 'Method in use', dLastError: 'Last error',
      historyTitle: 'Your recent interviews', question: 'Question', qOf: 'Question {i} / {n}',
      modeText: 'Type', modeVoice: 'Voice', placeholder: 'Write your answer here… be clear and specific (at least 2–4 sentences).', placeholderFollow: 'Write your reply to the interviewer…',
      count: '{n} / {max}',
      stAsking: '⬡ Asking', stPerm: '⬡ Waiting for mic permission', stListening: '⬡ Listening', stProcessing: '⬡ Turning voice into text', stReady: '⬡ Review the text, then send',
      stMicError: '⬡ Recording failed', stEval: '⬡ Assessing your answer', stDiscuss: '⬡ Discussing', stThinking: '⬡ Thinking',
      voiceIdle: 'Press the microphone and speak. Your words appear as text you can edit before sending.',
      voicePerm: 'Waiting for your permission… allow the browser to use the microphone.', voiceListeningSpeech: 'Listening — speak now.', voiceListeningRec: 'Recording — your speech is turned into text after you stop.',
      voiceProcessingSpeech: 'Finishing the last sentence…', voiceProcessingRec: 'Turning the speech into text on the server…', voiceReady: 'Your speech was turned into text. Review and edit it, then send.',
      voiceAutoStopped: 'The recording reached its limit ({s} seconds) and stopped automatically. What you said was turned into text.', voicePartial: 'Part of what you said was captured before the error and added to your answer — please review it.',
      voiceNoSound: 'No sound picked up yet. Make sure the microphone is not muted and speak up.', voiceSoundOk: 'Picking up sound',
      micStart: 'Start recording', micMore: 'Record more', micStop: 'Stop and turn into text', micCancel: 'Cancel', micRedo: 'Record again (replaces the recorded text)', micRetryTr: 'Retry transcription',
      micTryAgain: 'Try again', micTryServer: 'Record, then transcribe on the server', micFinishFirst: 'Stop the recording first.', micBusyLeave: 'Finish the recording first.',
      micAria: 'Microphone', micAriaStop: 'Stop recording', timerOf: '{a} / {b}',
      submit: 'Send answer', evaluating: 'Assessing…', stillWorking: 'Still assessing… this can take a little while.', cancelEval: 'Cancel request',
      tooShort: 'Your answer is too short — write at least two sentences.', micBusyBlock: 'Finish or stop the recording before sending.', skip: 'Skip question', endNow: 'End and show my result',
      cancelInterview: 'Cancel interview', confirmCancel: 'Press again to confirm', nothingToShow: 'No answer has been assessed yet.',
      evalFailed: 'Your answer could not be assessed', editAnswer: 'Edit your answer',
      discussFailed: 'The interviewer’s comment could not be loaded.', discussLoading: 'The interviewer is reading your answer…', followLabel: 'Reply to the interviewer (optional)', followSend: 'Send reply', replyFailed: 'The interviewer’s remark on your reply could not be loaded.',
      scoreLabel: 'Score (out of 100) — calculated on the server', criteriaTitle: 'Criteria breakdown', evidence: 'From your answer', strengths: 'What you did well', gaps: 'What is missing', improve: 'How to improve it',
      example: 'An example of a stronger answer', exampleNote: 'An illustrative example written by the AI — not the only correct answer. Anything in [ ] is where your own real details belong.',
      next: 'Next question', finish: 'Final results', none: 'Nothing to report.',
      resultsTitle: 'Your interview result', resultsMeta: '{cat} · {n} of {t} questions assessed', resultsCriteria: 'Average per criterion (0–5)', resultsReport: 'Performance report',
      reportLoading: 'The AI is preparing a short report…', reportMissing: 'The written report could not be prepared (the scores above are valid). {why}', summaryFailed: 'The final result could not be calculated on the server.',
      perQuestion: 'Result per question', notEvaluated: 'Not assessed', skipped: 'Skipped', reEvaluate: 'Assess again', redo: 'Repeat interview', another: 'Another interview', copy: 'Copy report', copied: 'Copied ✓', askCeo: 'Analyse my performance with CEO AI',
      askCeoText: 'Analyse my latest interview result and tell me what to improve most before the next interview.',
      noEvaluated: 'No question was assessed, so there is no final result. You can repeat the interview.', gradeLabel: 'Level',
      errNetwork: 'Could not reach the server. Make sure it is running and try again — your answer is kept.', errTimeout: 'The request took longer than expected. Try again — your answer is kept.',
      errNoAi: 'AI assessment is not enabled on the server (ANTHROPIC_API_KEY is not set). Your answer is kept; try again once it is enabled.',
      errBudget: 'This month’s AI allowance has been used up. Your answer is kept.', errRate: 'Too many requests in a short time. Wait a moment and try again.',
      errAiTimeout: 'The AI took too long. Try again.', errInvalid: 'We did not get a valid assessment this time. Try again.', errShort: 'The answer is too short to assess.', errGeneric: 'Something unexpected happened ({code}). Try again.',
      errCorrupt: 'The server’s reply was incomplete. Try again.'
    }
  };

  function lang() { var l = String(D.documentElement.lang || 'ar').slice(0, 2).toLowerCase(); return l === 'ar' ? 'ar' : 'en'; }
  function T(key, vars) {
    var tbl = L[lang()] || L.ar, s = tbl[key];
    if (s == null) s = L.ar[key];
    if (s == null) return key;
    return vars ? String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? m : vars[k]; }) : s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clip(s, n) { s = String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim(); return s.length > n ? s.slice(0, n) : s; }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function $(id) { return D.getElementById(id); }
  function fmtTime(ms) { var s = Math.max(0, Math.floor((ms || 0) / 1000)), m = Math.floor(s / 60); s = s % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function apiBase() { return String(W.AUS_API_BASE || 'http://127.0.0.1:8002').replace(/\/+$/, ''); }
  function userKey() { var u = W.ausAuth && W.ausAuth.user; return (u && u.email) || 'anon'; }
  function fxOn() { return !(W.AUS_FX && W.AUS_FX.enabled === false) && !(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  // ═══ الأقسام والأسئلة ════════════════════════════════════════════════════════════════════════════
  // الأنواع الأربعة الأصلية تبقى في aus_07_studio.js (INTV_CATEGORIES) — هنا نُضيف ثلاثة أنواع، ونوفّر الترجمة الإنجليزية للأسئلة والمُقابِلين.
  var NEW_CATS = {
    startup: {
      icon: '🚀', title: 'ريادة الأعمال', titleEn: 'Startup Founder', difficulty: 'hard',
      interviewer: { emoji: '👨‍💼', name: 'م. فيصل العتيبي', role: 'شريك في صندوق استثمار جريء' },
      questions: [
        'ما المشكلة التي يحلّها مشروعك؟ ومن العميل الذي يعاني منها فعلاً، وكيف عرفتَ ذلك؟',
        'كيف ستكسب أول 100 عميل بميزانية تسويق محدودة جداً؟',
        'اشرح نموذج إيراداتك: من يدفع ولماذا وكم؟ وما الذي يجعل اقتصاديات الوحدة مجدية؟',
        'من أقرب منافسيك (المباشرين وغير المباشرين)؟ ولماذا قد يختارك العميل بدلاً منهم؟',
        'ما أكبر خطر قد يُفشل المشروع خلال 12 شهراً، وما خطتك لمواجهته؟'
      ]
    },
    negotiation: {
      icon: '🤝', title: 'التفاوض', titleEn: 'Negotiation', difficulty: 'hard',
      interviewer: { emoji: '👩‍💼', name: 'أ. ريم الدوسري', role: 'مديرة المشتريات والعقود' },
      questions: [
        'مورّد رئيسي يطلب رفع السعر 15%. كيف تستعد للتفاوض وما أوراق القوة لديك؟',
        'كيف تتفاوض على راتبك أو عرضك الوظيفي إذا كان العرض أقل مما تتوقع؟',
        'وصل التفاوض إلى طريق مسدود وكل طرف متمسك بموقفه. ما خطواتك لتحريكه؟',
        'ما الفرق بين الموقف (Position) والمصلحة (Interest)؟ وأعطنا مثالاً على كيف تستخدمه.',
        'متى تقرر الانسحاب من صفقة؟ وما البديل الأفضل لديك (BATNA)؟'
      ]
    },
    finance: {
      icon: '💰', title: 'القرار المالي', titleEn: 'Financial Decision', difficulty: 'hard',
      interviewer: { emoji: '👨‍💼', name: 'أ. عبدالله الراشد', role: 'المدير المالي (CFO)' },
      questions: [
        'لديك 500 ألف لتوزيعها بين مشروعين: الأول يعيد المال أسرع بعائد أقل، والثاني بعائد أعلى لكنه أبطأ وأخطر. كيف تقرر؟',
        'كيف تحدد ما إذا كان الاستثمار في معدّات جديدة مجدياً؟ اشرح المنهج والمؤشرات التي تعتمدها.',
        'تدفقك النقدي سالب منذ ثلاثة أشهر رغم أن الشركة رابحة على الورق. ما تفسيرك وماذا تفعل؟',
        'كيف تقدّر التكلفة الحقيقية لمنتج جديد، وما التكاليف التي يغفلها الناس عادةً؟',
        'ما الافتراضات التي ستختبرها قبل الموافقة على خطة مالية لثلاث سنوات؟'
      ]
    }
  };
  var EN = {
    hr: { interviewer: { name: 'Dr. Sarah Al-Qahtani', role: 'HR Director' }, questions: [
      'Tell us about yourself and your most notable academic and personal achievements.',
      'Why did you choose this field, and what sets you apart from other applicants?',
      'Tell us about a difficult situation you faced and how you overcame it.',
      'What are your main strengths and weaknesses, and how are you working to develop them?',
      'Where do you see yourself professionally in five years?'] },
    leadership: { interviewer: { name: 'Mr. Khaled Al-Mansour', role: 'Chief Executive Officer' }, questions: [
      'Have you ever led a team? What was the experience like and what did you learn from it?',
      'How do you handle conflicts and tension within a team?',
      'Give us a real example of a tough decision you made under heavy pressure.',
      'How do you motivate your team and rebuild morale in difficult times?',
      'What is your preferred leadership style, and why does it suit the modern workplace?'] },
    business: { interviewer: { name: 'Dr. Noura Al-Shammari', role: 'Strategic Business Analyst' }, questions: [
      'How do you analyse a complex business problem? Explain your method step by step.',
      'What is your view on the impact of AI on the job market over the next decade?',
      'How do you ensure quality and keep performance standards high under time pressure?',
      'Which business trends do you expect to dominate your sector over the next five years?',
      'How do you build strong, lasting professional relationships with clients and stakeholders?'] },
    caseStudy: { interviewer: { name: 'Eng. Ahmed Al-Zahrani', role: 'Director of Strategy & Innovation' }, questions: [
      'Your company is losing 20% of its market share in 6 months. What is your immediate plan to recover?',
      'You have a limited budget and a team of 3 to deliver a large project. How do you proceed?',
      'The CEO asks you to launch a new product within 30 days. What are your first steps?',
      'You discover that a colleague is submitting inaccurate figures in their reports. How do you handle it?',
      'Your most important client threatens to leave because of a service problem. How do you keep and reassure them?'] },
    startup: { interviewer: { name: 'Eng. Faisal Al-Otaibi', role: 'Venture capital partner' }, questions: [
      'What problem does your venture solve? Who actually suffers from it, and how do you know?',
      'How will you win your first 100 customers with a very limited marketing budget?',
      'Explain your revenue model: who pays, why, and how much? What makes the unit economics work?',
      'Who are your closest competitors, direct and indirect? Why would a customer choose you over them?',
      'What is the biggest risk that could make the venture fail within 12 months, and how will you face it?'] },
    negotiation: { interviewer: { name: 'Ms. Reem Al-Dosari', role: 'Head of Procurement & Contracts' }, questions: [
      'A key supplier asks to raise prices by 15%. How do you prepare for the negotiation and what leverage do you have?',
      'How do you negotiate a job offer or salary when the offer is lower than you expected?',
      'The negotiation is deadlocked and each side holds its position. What steps do you take to move it?',
      'What is the difference between a position and an interest? Give an example of how you use it.',
      'When do you decide to walk away from a deal, and what is your best alternative (BATNA)?'] },
    finance: { interviewer: { name: 'Mr. Abdullah Al-Rashed', role: 'Chief Financial Officer (CFO)' }, questions: [
      'You have 500,000 to split between two projects: one pays back faster with a smaller return, the other earns more but is slower and riskier. How do you decide?',
      'How do you work out whether investing in new equipment is worthwhile? Explain the method and the metrics you rely on.',
      'Your cash flow has been negative for three months although the company is profitable on paper. What explains it and what do you do?',
      'How do you estimate the true cost of a new product, and which costs do people usually overlook?',
      'Which assumptions would you test before approving a 3-year financial plan?'] }
  };
  var CATS = (typeof INTV_CATEGORIES !== 'undefined' && INTV_CATEGORIES) ? INTV_CATEGORIES : {};
  Object.keys(NEW_CATS).forEach(function (k) { if (!CATS[k]) CATS[k] = NEW_CATS[k]; });

  // نسخة الفئة بلغة الواجهة (الأسئلة والمُقابِل) — تعود null إن لم تكن الفئة معروفة
  function catText(id, lg) {
    var c = CATS[id];
    if (!c || !c.questions) return null;
    var en = EN[id] || {}, useEn = lg === 'en';
    var qs = (useEn && en.questions && en.questions.length === c.questions.length) ? en.questions : c.questions;
    var iv = useEn && en.interviewer ? { emoji: c.interviewer.emoji, name: en.interviewer.name, role: en.interviewer.role } : c.interviewer;
    return { id: id, icon: c.icon, title: useEn ? (c.titleEn || c.title) : c.title, titleOther: useEn ? c.title : (c.titleEn || ''), difficulty: c.difficulty, interviewer: iv, questions: qs };
  }
  function catIds() { return Object.keys(CATS).filter(function (k) { return CATS[k] && CATS[k].questions && CATS[k].interviewer; }); }

  // ═══ التخزين (لكل حساب) ═════════════════════════════════════════════════════════════════════════
  function lsGet(key) { try { var raw = W.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function lsSet(key, val) { try { W.localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function lsDel(key) { try { W.localStorage.removeItem(key); } catch (e) {} }
  function sessionKey() { return 'aus.interview.v1.' + userKey(); }
  function historyKey() { return 'aus.interview.history.v1.' + userKey(); }

  function strList(a, max, len) {
    var out = [];
    if (Array.isArray(a)) for (var i = 0; i < a.length && out.length < max; i++) { var s = clip(a[i], len); if (s) out.push(s); }
    return out;
  }
  function normGrade(g) {
    if (!g || typeof g !== 'object') return { key: '', ar: '', en: '' };
    return { key: clip(g.key, 20), ar: clip(g.ar, 30), en: clip(g.en, 30) };
  }

  // تقييم سؤال واحد كما يُرجعه الخادم → كائن نظيف، أو null إن لم يطابق الشكل المطلوب (فلا نعرض شيئاً مشوَّهاً)
  function normalizeEvaluation(d) {
    if (!d || typeof d !== 'object' || d.ok !== true) return null;
    var total = num(d.total);
    if (total == null || total < 0 || total > 100 || !Array.isArray(d.criteria) || !d.criteria.length) return null;
    var crit = [];
    for (var i = 0; i < d.criteria.length && i < 12; i++) {
      var c = d.criteria[i];
      if (!c || typeof c !== 'object' || !/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(String(c.id))) return null;
      var sc = num(c.score), w = num(c.weight);
      if (sc == null || sc < 0 || sc > 5 || w == null || w < 0 || w > 100) return null;
      crit.push({ id: String(c.id), label_ar: clip(c.label_ar, 80), label_en: clip(c.label_en, 80), weight: w, score: sc, evidence: clip(c.evidence, 300), comment: clip(c.comment, 400) });
    }
    return { total: Math.round(total), grade: normGrade(d.grade), criteria: crit, strengths: strList(d.strengths, 5, 300), gaps: strList(d.gaps, 5, 300),
             improvements: strList(d.improvements, 5, 300), example: clip(d.example_answer, 1600) };
  }

  function normalizeSummary(d) {
    if (!d || typeof d !== 'object' || d.ok !== true) return null;
    var total = num(d.total);
    if (total == null || total < 0 || total > 100) return null;
    var avg = {};
    if (d.criteria_avg && typeof d.criteria_avg === 'object') {
      Object.keys(d.criteria_avg).slice(0, 12).forEach(function (k) {
        if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) return;
        var v = d.criteria_avg[k];
        avg[k] = (num(v) != null && v >= 0 && v <= 5) ? v : null;
      });
    }
    return { total: Math.round(total), grade: normGrade(d.grade), criteria_avg: avg, answered: Math.max(0, Math.round(num(d.answered) || 0)),
             report: typeof d.report === 'string' && d.report.trim() ? clip(d.report, 1200) : null, report_error: typeof d.report_error === 'string' ? clip(d.report_error, 40) : null };
  }

  // الجلسة المحفوظة: نقبل فقط ما يطابق الشكل (ملف تالف أو معدَّل يدوياً لا يكسر الصفحة)
  function sanitizeSession(raw) {
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
    var catId = String(raw.catId || '');
    var c = catText(catId, 'ar');
    if (!c) return null;
    var n = c.questions.length, qIdx = Math.round(num(raw.qIdx) == null ? -1 : raw.qIdx);
    if (qIdx < 0 || qIdx >= n) return null;
    var answers = [];
    var src = Array.isArray(raw.answers) ? raw.answers.slice(0, n) : [];
    for (var i = 0; i < src.length; i++) {
      var a = src[i];
      if (!a || typeof a !== 'object') { answers.push(null); continue; }
      var status = ['evaluated', 'failed', 'skipped', 'pending'].indexOf(a.status) >= 0 ? a.status : 'failed';
      var ev = a.evaluation ? normalizeEvaluation(Object.assign({ ok: true }, a.evaluation, { example_answer: a.evaluation.example })) : null;
      if (status === 'evaluated' && !ev) status = 'failed';
      if (status === 'pending') status = 'failed';                 // الطلب لم يكتمل قبل إغلاق الصفحة: يظهر كفاشل مع «إعادة المحاولة»
      var disc = a.discuss && typeof a.discuss.comment === 'string' && typeof a.discuss.followup === 'string' ? { comment: clip(a.discuss.comment, 500), followup: clip(a.discuss.followup, 300) } : null;
      var rep = a.reply && typeof a.reply.text === 'string' ? { text: clip(a.reply.text, 1200), remark: clip(a.reply.remark, 300) } : null;
      answers.push({ q: clip(a.q, 600), answer: clip(a.answer, MAX_CHARS), source: a.source === 'voice' ? 'voice' : 'text', status: status, evaluation: ev, error: null, discuss: disc, reply: rep });
    }
    return { v: 1, catId: catId, lg: raw.lg === 'en' ? 'en' : 'ar', qIdx: qIdx, answers: answers, draft: clip(raw.draft, MAX_CHARS), startedAt: num(raw.startedAt) || Date.now(), updatedAt: num(raw.updatedAt) || 0 };
  }

  function sanitizeHistory(raw) {
    var out = [];
    if (!Array.isArray(raw)) return out;
    raw.slice(0, HISTORY_MAX).forEach(function (r) {
      if (!r || typeof r !== 'object' || !catText(String(r.catId || ''), 'ar') || num(r.total) == null || r.total < 0 || r.total > 100) return;
      var weakest = r.weakest && typeof r.weakest === 'object' && clip(r.weakest.label, 50) ? { label: clip(r.weakest.label, 50), avg: (num(r.weakest.avg) != null && r.weakest.avg >= 0 && r.weakest.avg <= 5) ? r.weakest.avg : null } : null;
      var avg = {};
      if (r.criteria_avg && typeof r.criteria_avg === 'object') Object.keys(r.criteria_avg).slice(0, 12).forEach(function (k) { var v = r.criteria_avg[k]; if (/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k) && num(v) != null && v >= 0 && v <= 5) avg[k] = v; });
      out.push({ id: num(r.id) || 0, ts: num(r.ts) || 0, catId: String(r.catId), title: clip(r.title, 60), total: Math.round(r.total), grade: normGrade(r.grade), answered: Math.max(0, Math.round(num(r.answered) || 0)), weakest: weakest, criteria_avg: avg });
    });
    return out;
  }

  // ═══ الشبكة — لا ترفض أبداً؛ تُرجع {ok, status, data, code, message, aborted} ═══════════════════════════
  function request(method, path, body, o) {
    o = o || {};
    var ctl = typeof W.AbortController === 'function' ? new W.AbortController() : null, timedOut = false;
    var timer = setTimeout(function () { timedOut = true; if (ctl) { try { ctl.abort(); } catch (e) {} } }, o.timeoutMs || 60000);
    if (typeof o.onController === 'function') o.onController(ctl);
    return W.fetch(apiBase() + path, {
      method: method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
      signal: ctl ? ctl.signal : undefined, cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, data: j || {} }; });
    }).then(function (res) {
      clearTimeout(timer);
      if (res.ok) return { ok: true, status: res.status, data: res.data };
      var e = (res.data && res.data.error) || {};
      var code = typeof e.code === 'string' ? e.code : (res.status === 429 ? 'rate_limited' : 'http_' + res.status);
      return { ok: false, status: res.status, code: code, message: typeof e.message === 'string' ? e.message : '' };
    }, function (err) {
      clearTimeout(timer);
      if (timedOut) return { ok: false, code: 'client_timeout' };
      if (err && err.name === 'AbortError') return { ok: false, code: 'aborted', aborted: true };
      return { ok: false, code: 'network' };
    });
  }

  var NET_KEYS = {
    network: 'errNetwork', client_timeout: 'errTimeout', ai_not_configured: 'errNoAi', ai_budget_exceeded: 'errBudget', ai_rate_limited: 'errRate', rate_limited: 'errRate',
    ai_timeout: 'errAiTimeout', ai_provider_error: 'errInvalid', evaluation_invalid: 'errInvalid', discussion_invalid: 'errInvalid', reply_invalid: 'errInvalid',
    answer_too_short: 'errShort', invalid_response: 'errCorrupt'
  };
  function netMessage(code) { return NET_KEYS[code] ? T(NET_KEYS[code]) : T('errGeneric', { code: code || '?' }); }

  // ═══ الحالة ═════════════════════════════════════════════════════════════════════════════════════
  var S = {
    screen: 'setup',          // setup | room | feedback | results
    sid: 0, catId: null, lg: 'ar', qIdx: 0, answers: [], draft: '', startedAt: 0,
    selected: null, submitting: false, ctl: null, evalTimer: null,
    saved: null, rubrics: null, rubricState: 'idle', results: null, recorded: false, confirmCancel: false, confirmTimer: null
  };
  var composer = null, followComposer = null, saveTimer = null, typeSeq = 0;

  function content() { return $('interviewContent'); }
  function cur() { return catText(S.catId, S.lg); }
  function answerAt(i) { return S.answers[i] || null; }

  function persist(now) {
    if (!S.catId || S.screen === 'setup') return;
    var write = function () {
      saveTimer = null;
      lsSet(sessionKey(), {
        v: 1, catId: S.catId, lg: S.lg, qIdx: S.qIdx, draft: S.draft, startedAt: S.startedAt, updatedAt: Date.now(),
        answers: S.answers.map(function (a) {
          return a ? { q: a.q, answer: a.answer, source: a.source, status: a.status, evaluation: a.evaluation, discuss: a.discuss, reply: a.reply ? { text: a.reply.text, remark: a.reply.remark } : null } : null;
        })
      });
    };
    if (now) { if (saveTimer) clearTimeout(saveTimer); write(); }
    else if (!saveTimer) saveTimer = setTimeout(write, 600);
  }
  function clearSaved() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } lsDel(sessionKey()); S.saved = null; }

  function abortInflight() {
    if (S.ctl) { try { S.ctl.abort(); } catch (e) {} S.ctl = null; }
    if (S.evalTimer) { clearTimeout(S.evalTimer); S.evalTimer = null; }
    S.submitting = false;
  }
  function newSession(catId) {
    abortInflight();
    S.sid++; S.catId = catId; S.lg = lang(); S.qIdx = 0; S.answers = []; S.draft = ''; S.startedAt = Date.now();
    S.results = null; S.recorded = false; S.confirmCancel = false;
  }

  // ═══ التنسيق (CSS يُحقن مرة واحدة — Nano Glass للمكوّنات الجديدة، والأصلي لما هو قائم) ════════════════════════
  function injectCss() {
    if ($('ivx-css')) return;
    var st = D.createElement('style');
    st.id = 'ivx-css';
    st.textContent = [
      '.ivx-glass{background:rgba(255,255,255,.06);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4)}',
      '.ivx-chip{display:inline-block;font-family:Orbitron,sans-serif;font-size:.6rem;letter-spacing:.04em;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.75);white-space:nowrap}',
      '.ivx-note{font-size:.78rem;color:rgba(255,255,255,.55);line-height:1.7}',
      '.ivx-resume{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:.9rem 1.1rem;margin:0 0 1.2rem}',
      '.ivx-resume b{display:block;color:#fff;font-size:.92rem}.ivx-resume span.sub{display:block;font-size:.78rem;color:rgba(255,255,255,.55)}.ivx-resume .grow{flex:1;min-width:180px}',
      '.ivx-rubric{padding:1.1rem 1.2rem;margin:0 0 1.2rem;text-align:start}',
      '.ivx-rubric-h{font-family:Orbitron,sans-serif;font-size:.7rem;letter-spacing:.08em;color:var(--primary);margin-bottom:.8rem}',
      '.ivx-rubric ul{list-style:none;margin:0 0 .8rem;padding:0;display:grid;gap:.55rem}',
      '.ivx-rubric li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:baseline}.ivx-rubric li b{color:#fff;font-size:.88rem}.ivx-rubric li small{grid-column:1 / -1;color:rgba(255,255,255,.55);font-size:.76rem;line-height:1.55}',
      '.ivx-bands{display:flex;flex-wrap:wrap;gap:6px;margin-top:.5rem}',
      '.ivx-micready{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:.7rem 1rem;margin:0 0 1.2rem;font-size:.82rem;color:rgba(255,255,255,.8)}',
      '.ivx-micready .dot{width:9px;height:9px;border-radius:50%;background:#00f5d4;box-shadow:0 0 8px #00f5d4;flex-shrink:0}.ivx-micready .dot.bad{background:#ffd60a;box-shadow:0 0 8px #ffd60a}.ivx-micready .dot.wait{background:rgba(255,255,255,.35);box-shadow:none}',
      '.ivx-hist{padding:.9rem 1.1rem;margin:1.4rem 0 0}.ivx-hist h4{margin:0 0 .6rem;font-size:.8rem;color:var(--primary);font-family:Orbitron,sans-serif;letter-spacing:.06em}',
      '.ivx-hist-row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:.35rem 0;border-top:1px solid rgba(255,255,255,.06);font-size:.82rem;color:rgba(255,255,255,.8)}.ivx-hist-row:first-of-type{border-top:0}',
      '.ivx-hist-row .d{color:rgba(255,255,255,.45);font-size:.72rem}',
      '.ivx-composer{display:block}',
      '.ivx-voice{margin:0 0 .8rem;padding:1rem 1.1rem}.ivx-voice[hidden]{display:none}',
      '.ivx-voice-main{display:flex;align-items:center;gap:14px}',
      '.ivx-mic-btn{width:64px;height:64px;min-width:64px;border-radius:50%;background:rgba(0,212,255,.1);border:2px solid rgba(0,212,255,.35);color:var(--primary);font-size:1.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s,background .2s,border-color .2s,box-shadow .08s linear;position:relative}',
      '.ivx-mic-btn:hover:not(:disabled){transform:scale(1.06);background:rgba(0,212,255,.18)}.ivx-mic-btn:focus-visible{outline:2px solid var(--primary);outline-offset:3px}.ivx-mic-btn:disabled{opacity:.45;cursor:not-allowed}',
      '.ivx-mic-btn.listening{background:rgba(255,0,110,.14);border-color:rgba(255,0,110,.6);color:#ff4d8d;box-shadow:0 0 calc(6px + var(--lvl,0) * 34px) rgba(255,0,110,.55)}',
      '.ivx-mic-btn.busy{border-style:dashed}',
      '.ivx-voice-info{flex:1;min-width:0}',
      '.ivx-mic-status{font-size:.88rem;color:rgba(255,255,255,.85);line-height:1.6}.ivx-mic-status.err{color:#ffb4c8}.ivx-mic-status.ok{color:#8ffbe9}',
      '.ivx-mic-meter{display:flex;align-items:center;gap:10px;margin-top:.45rem;font-size:.72rem;color:rgba(255,255,255,.55)}.ivx-mic-meter[hidden]{display:none}',
      '.ivx-timer{font-family:Orbitron,sans-serif;font-size:.74rem;letter-spacing:.04em;color:#fff;min-width:96px;direction:ltr;unicode-bidi:isolate}.ivx-timer.warn{color:#ffd60a}',
      '.ivx-count,.ivx-hero-total{direction:ltr;unicode-bidi:isolate}',
      '.ivx-level{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;max-width:220px}.ivx-level i{display:block;height:100%;width:0;background:linear-gradient(90deg,#00f5d4,#ff006e);transition:width .06s linear}',
      '.ivx-activity{display:inline-flex;align-items:center;gap:6px}.ivx-activity::before{content:"";width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}.ivx-activity.on::before{background:#00f5d4;box-shadow:0 0 8px #00f5d4}',
      '.ivx-live{margin-top:.7rem;padding:.6rem .8rem;border-radius:12px;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.14);color:rgba(255,255,255,.8);font-size:.88rem;line-height:1.7;min-height:2.2rem;white-space:pre-wrap}.ivx-live[hidden]{display:none}',
      '.ivx-voice-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:.8rem}.ivx-voice-actions:empty{display:none}',
      '.ivx-btn{padding:.45rem 1rem;border-radius:20px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:#fff;font-family:Tajawal,sans-serif;font-size:.82rem;cursor:pointer;transition:background .2s,border-color .2s}',
      '.ivx-btn:hover{background:rgba(255,255,255,.12)}.ivx-btn:focus-visible{outline:2px solid var(--primary);outline-offset:2px}.ivx-btn.primary{background:rgba(0,212,255,.14);border-color:rgba(0,212,255,.45)}',
      '.ivx-diag{margin-top:.7rem;font-size:.74rem;color:rgba(255,255,255,.55)}.ivx-diag summary{cursor:pointer;width:max-content}.ivx-diag-body{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin-top:.5rem}.ivx-diag-body b{color:rgba(255,255,255,.8);font-weight:600}',
      '.ivx-ta-foot{display:flex;justify-content:space-between;gap:10px;margin-top:.35rem;font-size:.72rem;color:rgba(255,255,255,.45)}.ivx-ta-foot .hint{color:#ffd60a}',
      '.ivx-composer textarea.flash{animation:ivxFlash 1.1s ease-out 1}@keyframes ivxFlash{0%{box-shadow:0 0 0 3px rgba(0,245,212,.55)}100%{box-shadow:0 0 0 0 rgba(0,245,212,0)}}',
      '.ivx-submit-row{gap:10px;align-items:center;flex-wrap:wrap}',
      '.ivx-evalmsg{margin-top:.8rem}.ivx-evalmsg:empty{display:none}',
      '.ivx-err{display:flex;gap:10px;align-items:flex-start;padding:.8rem 1rem;border-radius:14px;background:rgba(255,0,110,.08);border:1px solid rgba(255,0,110,.3);color:#ffd0de;font-size:.86rem;line-height:1.65}.ivx-err b{display:block;color:#fff}.ivx-err p{margin:.2rem 0 0}',
      '.ivx-err-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:.6rem}',
      '.ivx-room-foot{display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;font-size:.8rem}',
      '.ivx-link{background:none;border:0;color:rgba(255,255,255,.55);cursor:pointer;font-family:Tajawal,sans-serif;font-size:.8rem;padding:.3rem .2rem;text-decoration:underline}.ivx-link:hover{color:#fff}.ivx-link.danger.armed{color:#ff4d8d}',
      '.intv-avatar-status.listening{background:rgba(255,0,110,.12);color:#ff7aa8;border:1px solid rgba(255,0,110,.35);animation:cdnaPulse 1s ease-in-out infinite}',
      '.intv-avatar-status.error{background:rgba(255,0,110,.1);color:#ff7aa8;border:1px solid rgba(255,0,110,.3)}',
      '.intv-avatar-status.ready{background:rgba(0,245,212,.1);color:#00f5d4;border:1px solid rgba(0,245,212,.3)}',
      '.intv-avatar-ring[data-state="listening"]{animation:none;border-color:rgba(255,0,110,.65);box-shadow:0 0 calc(8px + var(--lvl,0) * 34px) rgba(255,0,110,.55)}',
      '.intv-avatar-ring[data-state="thinking"]{animation:intvPulse .9s ease-in-out infinite}',
      '.intv-avatar-ring[data-state="error"]{animation:none;border-color:rgba(255,0,110,.5)}',
      '.ivx-crit{margin:0 0 .75rem}.ivx-crit .intv-bd-lbl{min-width:140px}.ivx-crit .intv-bd-num{min-width:44px}',
      '.ivx-crit-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;margin-top:.25rem;padding-inline-start:4px;font-size:.78rem;line-height:1.6;color:rgba(255,255,255,.65)}',
      '.ivx-crit-meta q{font-style:italic;color:rgba(255,255,255,.8)}.ivx-crit-meta q::before,.ivx-crit-meta q::after{content:""}',
      '.ivx-total{display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.ivx-list{margin:0;padding:0;list-style:none;display:grid;gap:6px}.ivx-list li{font-size:.84rem;color:rgba(255,255,255,.82);line-height:1.6;display:flex;gap:8px;align-items:flex-start}',
      '.ivx-block{padding:1rem 1.2rem;margin:.9rem 0}.ivx-block h4{margin:0 0 .6rem;font-size:.82rem;color:var(--primary)}',
      '.ivx-discuss{white-space:pre-wrap}.ivx-follow-q{margin-top:.7rem;padding:.6rem .8rem;border-radius:12px;background:rgba(255,214,10,.06);border:1px solid rgba(255,214,10,.22);color:#fff;font-weight:600;line-height:1.7}',
      '.ivx-example{white-space:pre-wrap;line-height:1.85;color:rgba(255,255,255,.88);font-size:.9rem}',
      '.ivx-qrow{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:.55rem 0;border-top:1px solid rgba(255,255,255,.06);font-size:.84rem}.ivx-qrow:first-of-type{border-top:0}.ivx-qrow .t{flex:1;color:rgba(255,255,255,.82)}',
      '.ivx-report{white-space:pre-wrap;line-height:1.85}',
      '.ivx-hero-total{font-family:Orbitron,sans-serif;font-size:2.4rem;font-weight:900;background:linear-gradient(135deg,var(--primary),var(--secondary,#9d4edd));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '.intv-gauge-grid.ivx-grid{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}',
      '@media (max-width:680px){.intv-avatar-wrap{position:static!important;flex-direction:row;flex-wrap:wrap;justify-content:center;padding:.8rem}.intv-avatar-ring{width:56px;height:56px;font-size:1.7rem}.ivx-voice-main{flex-direction:column;align-items:stretch;text-align:center}.ivx-mic-btn{align-self:center;width:72px;height:72px}.ivx-mic-meter{justify-content:center}.ivx-crit .intv-bd-row{flex-wrap:wrap}.ivx-crit .intv-bd-lbl{min-width:100%;text-align:start}.intv-adv-grid{grid-template-columns:1fr}.intv-eval-section{flex-direction:column;align-items:center}}',
      '@media (prefers-reduced-motion:reduce){.intv-avatar-ring,.intv-avatar-status,.ivx-mic-btn,.ivx-composer textarea.flash{animation:none!important;transition:none!important}}'
    ].join('\n');
    D.head.appendChild(st);
  }

  // ═══ كتابة تدريجية آمنة (textContent فقط — ردّ النموذج لا يُحقن أبداً كـ HTML) ══════════════════════════
  function typeInto(el, text) {
    if (!el) return;
    var my = ++typeSeq; el._ivxT = my;
    text = String(text == null ? '' : text);
    if (!fxOn() || text.length > 700 || text.length < 12) { el.textContent = text; return; }
    el.textContent = '';
    var pos = 0, step = Math.max(1, Math.ceil(text.length / 70));
    (function tick() {
      if (el._ivxT !== my || !el.isConnected) return;
      pos = Math.min(text.length, pos + step);
      el.textContent = text.slice(0, pos);
      if (pos < text.length) setTimeout(tick, 18);
    })();
  }

  // ═══ الميكروفون: مكوّن إدخال الإجابة (نص + صوت) ════════════════════════════════════════════════════
  var cSeq = 0;
  function micApi() { return W.AUS_MIC || null; }

  function micInfo() {
    var M = micApi();
    if (!M) return { ok: false, code: 'unsupported', text: T('micNoneUnsupported') };
    var s = M.support();
    if (s.engine === 'speech') return { ok: true, engine: 'speech', text: T('micSpeech'), s: s };
    if (s.engine === 'recorder') return { ok: true, engine: 'recorder', text: T('micRecorder'), s: s };
    if (!s.secure) return { ok: false, code: 'insecure_context', text: M.describe('insecure_context', lang()), s: s };
    if (s.recorder && s.server === false) return { ok: false, code: 'stt_unavailable', text: T('micNoneStt'), s: s };
    return { ok: false, code: 'unsupported', text: s.server === null && s.recorder ? T('micNoneSttUnknown') : T('micNoneUnsupported'), s: s };
  }

  function diagHtml(lastErr) {
    var M = micApi(), s = M ? M.support() : null;
    function yn(v) { return v ? T('yes') : T('no'); }
    var server = !s ? T('unknown') : (s.server === true ? T('dServerOn') : s.server === false ? T('dServerOff') : T('dServerUnknown'));
    var rows = [[T('dSecure'), s ? yn(s.secure) : T('unknown')], [T('dSpeech'), s ? yn(s.speech) : T('unknown')], [T('dRecorder'), s ? yn(s.recorder) : T('unknown')], [T('dServer'), server], [T('dEngine'), s ? s.engine : 'none']];
    if (lastErr) rows.push([T('dLastError'), (lastErr.code || '') + (lastErr.detail ? ' (' + lastErr.detail + ')' : '')]);
    return rows.map(function (r) { return '<b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span>'; }).join('');
  }

  // host: عنصر يُبنى بداخله المكوّن · o: {id, rows, placeholder, onChange(text), onBusy(busy, micState), onMicState(state, info)}
  function makeComposer(host, o) {
    o = o || {};
    var uid = 'ivxc' + (++cSeq);
    var st = { mode: 'text', mic: 'idle', engine: '', err: null, base: '', fromVoice: false, level: 0, activity: false, elapsed: 0, noSound: false, notice: '', redo: false, locked: false };
    var mic = null, dead = false, soundTimer = null;

    host.innerHTML =
      '<div class="ivx-composer" id="' + uid + '">' +
      '<div class="intv-mode-btns" role="group">' +
      '<button type="button" class="intv-mode-btn active" data-m="text"><i class="fas fa-keyboard"></i> ' + T('modeText') + '</button>' +
      '<button type="button" class="intv-mode-btn" data-m="voice"><i class="fas fa-microphone"></i> ' + T('modeVoice') + '</button></div>' +
      '<div class="ivx-voice ivx-glass" hidden>' +
      '<div class="ivx-voice-main"><button type="button" class="ivx-mic-btn" data-a="toggle" aria-label="' + esc(T('micAria')) + '"><i class="fas fa-microphone"></i></button>' +
      '<div class="ivx-voice-info"><div class="ivx-mic-status" role="status" aria-live="polite"></div>' +
      '<div class="ivx-mic-meter" hidden><span class="ivx-timer">00:00</span><span class="ivx-level"><i></i></span><span class="ivx-activity"></span></div></div></div>' +
      '<div class="ivx-live" hidden></div><div class="ivx-voice-actions"></div>' +
      '<details class="ivx-diag"><summary>' + T('micDetails') + '</summary><div class="ivx-diag-body"></div></details></div>' +
      '<textarea class="intv-textarea" rows="' + (o.rows || 4) + '" maxlength="' + MAX_CHARS + '" placeholder="' + esc(o.placeholder || T('placeholder')) + '"></textarea>' +
      '<div class="ivx-ta-foot"><span class="ivx-count"></span><span class="hint" role="status"></span></div></div>';

    var root = $(uid);
    var q = function (sel) { return root.querySelector(sel); };
    var el = { ta: q('textarea'), voice: q('.ivx-voice'), mainBtn: q('.ivx-mic-btn'), status: q('.ivx-mic-status'), meter: q('.ivx-mic-meter'), timer: q('.ivx-timer'),
               level: q('.ivx-level i'), act: q('.ivx-activity'), live: q('.ivx-live'), actions: q('.ivx-voice-actions'), diag: q('.ivx-diag-body'), count: q('.ivx-count'),
               hint: q('.ivx-ta-foot .hint'), tabText: q('[data-m="text"]'), tabVoice: q('[data-m="voice"]') };

    function busy() { return st.mic === 'requesting_permission' || st.mic === 'listening' || st.mic === 'processing'; }
    function setHint(t) { el.hint.textContent = t || ''; }
    function updateCount() { el.count.textContent = T('count', { n: el.ta.value.length, max: MAX_CHARS }); }
    function emitChange() { updateCount(); if (typeof o.onChange === 'function') o.onChange(el.ta.value); }
    function joinText(a, b) { a = String(a || '').trim(); b = String(b || '').trim(); return (a && b) ? a + ' ' + b : (a || b); }
    function setValue(v) { el.ta.value = String(v).slice(0, MAX_CHARS); emitChange(); }
    function flash() { el.ta.classList.remove('flash'); void el.ta.offsetWidth; el.ta.classList.add('flash'); }
    function clearSound() { if (soundTimer) { clearTimeout(soundTimer); soundTimer = null; } }

    function statusLine() {
      var info = micInfo();
      if (st.mic === 'idle' && !st.err) {
        if (!info.ok) return { t: info.text, c: 'err' };
        return { t: st.notice || T('voiceIdle'), c: st.notice ? 'ok' : '' };
      }
      if (st.mic === 'requesting_permission') return { t: T('voicePerm'), c: '' };
      if (st.mic === 'listening') return { t: st.engine === 'recorder' ? T('voiceListeningRec') : T('voiceListeningSpeech'), c: '' };
      if (st.mic === 'processing') return { t: st.engine === 'recorder' ? T('voiceProcessingRec') : T('voiceProcessingSpeech'), c: '' };
      if (st.mic === 'transcript_ready') return { t: (st.notice || T('voiceReady')), c: 'ok' };
      if (st.mic === 'error' && st.err) return { t: (lang() === 'en' ? st.err.message_en : st.err.message) + (st.partialAdded ? ' ' + T('voicePartial') : ''), c: 'err' };
      return { t: '', c: '' };
    }

    function actionsHtml() {
      var M = micApi(), a = [];
      var btn = function (act, label, primary) { return '<button type="button" class="ivx-btn' + (primary ? ' primary' : '') + '" data-a="' + act + '">' + esc(label) + '</button>'; };
      if (st.mic === 'requesting_permission' || st.mic === 'listening') a.push(btn('cancel', T('micCancel')));
      else if (st.mic === 'processing') { if (st.engine === 'recorder') a.push(btn('cancel', T('micCancel'))); }
      else if (st.mic === 'transcript_ready') a.push(btn('redo', T('micRedo')));
      else if (st.mic === 'error' && st.err) {
        var sup = M ? M.support() : null;
        if (mic && mic.hasRecording) a.push(btn('retryTr', T('micRetryTr'), true));
        if (st.err.recoverable) a.push(btn('again', T('micTryAgain'), !(mic && mic.hasRecording)));
        if (sup && sup.recorder && sup.server === true && st.engine !== 'recorder' && ['speech_network', 'service_blocked', 'aborted', 'mic_error', 'language_not_supported'].indexOf(st.err.code) >= 0) a.push(btn('server', T('micTryServer'), true));
      }
      return a.join('');
    }

    function renderVoice() {
      if (dead) return;
      var info = micInfo(), sl = statusLine();
      var isBusy = busy();
      el.voice.hidden = st.mode !== 'voice';
      el.tabText.classList.toggle('active', st.mode === 'text');
      el.tabVoice.classList.toggle('active', st.mode === 'voice');
      el.status.textContent = sl.t;
      el.status.className = 'ivx-mic-status' + (sl.c ? ' ' + sl.c : '');
      el.mainBtn.classList.toggle('listening', st.mic === 'listening');
      el.mainBtn.classList.toggle('busy', st.mic === 'processing' || st.mic === 'requesting_permission');
      el.mainBtn.setAttribute('aria-pressed', st.mic === 'listening' ? 'true' : 'false');
      el.mainBtn.setAttribute('aria-label', st.mic === 'listening' ? T('micAriaStop') : (st.mic === 'transcript_ready' ? T('micMore') : T('micStart')));
      el.mainBtn.title = el.mainBtn.getAttribute('aria-label');
      el.mainBtn.disabled = st.locked || st.mic === 'processing' || st.mic === 'requesting_permission' || (!info.ok && st.mic === 'idle');
      el.mainBtn.innerHTML = '<i class="fas ' + (st.mic === 'listening' ? 'fa-stop' : (st.mic === 'processing' || st.mic === 'requesting_permission') ? 'fa-circle-notch fa-spin' : 'fa-microphone') + '"></i>';
      el.meter.hidden = st.mic !== 'listening';
      el.live.hidden = !(st.mic === 'listening' && st.engine === 'speech');
      if (st.mic !== 'listening') el.live.textContent = '';
      el.actions.innerHTML = actionsHtml();
      el.diag.innerHTML = diagHtml(st.err);
      el.tabText.disabled = el.tabVoice.disabled = st.locked;
      el.ta.readOnly = st.locked || st.mic === 'listening' || st.mic === 'processing';
      if (typeof o.onMicState === 'function') o.onMicState(st.mic, st);
      if (typeof o.onBusy === 'function') o.onBusy(isBusy, st.mic);
    }

    function setMicState(next) { st.mic = next; renderVoice(); }

    function resetMeter() { st.level = 0; st.activity = false; st.noSound = false; el.level.style.width = '0%'; el.act.classList.remove('on'); el.act.textContent = ''; el.timer.classList.remove('warn'); el.timer.textContent = T('timerOf', { a: '00:00', b: fmtTime(MAX_SECONDS * 1000) }); setRing(0); clearSound(); }
    function setRing(lv) { var ring = $('ivxRing'); if (ring) ring.style.setProperty('--lvl', String(lv)); el.mainBtn.style.setProperty('--lvl', String(lv)); }

    function buildMic(engine) {
      destroyMic();
      var M = micApi(); if (!M) return null;
      mic = M.create({
        lang: lang() === 'ar' ? 'ar-SA' : 'en-US', maxSeconds: MAX_SECONDS, engine: engine || 'auto', owner: 'interview',
        onState: function (s, info) {
          if (dead) return;
          if (s === 'idle') { if (st.mic !== 'idle') { st.mic = 'idle'; st.err = null; renderVoice(); } return; }
          if (info && info.engine) st.engine = info.engine;
          if (s === 'listening') { st.err = null; st.notice = ''; resetMeter(); if (st.engine === 'speech') armSoundHint(); }
          if (s === 'transcript_ready' || s === 'error') { clearSound(); setRing(0); }
          setMicState(s);
        },
        onInterim: function (text) { if (!dead) { el.live.textContent = text || ''; if (text) { st.activity = true; el.act.classList.add('on'); } } },
        onTranscript: function (text, meta) {
          if (dead) return;
          setValue(joinText(st.base, text));
          st.fromVoice = true; st.partialAdded = false;
          st.notice = meta && meta.autoStopped ? T('voiceAutoStopped', { s: MAX_SECONDS }) : '';
          renderVoice(); flash();
          if (W.matchMedia && W.matchMedia('(pointer:fine)').matches) { try { el.ta.focus(); } catch (e) {} }
        },
        onLevel: function (lv) {
          if (dead) return;
          st.level = lv; el.level.style.width = Math.round(lv * 100) + '%'; setRing(lv.toFixed ? Number(lv.toFixed(2)) : lv);
          if (lv > 0.06 && !st.activity) { st.activity = true; el.act.classList.add('on'); el.act.textContent = T('voiceSoundOk'); }
        },
        onTick: function (ms) {
          if (dead) return;
          st.elapsed = ms; el.timer.textContent = T('timerOf', { a: fmtTime(ms), b: fmtTime(MAX_SECONDS * 1000) });
          el.timer.classList.toggle('warn', ms >= (MAX_SECONDS - 15) * 1000);
        },
        onActivity: function (kind) {
          if (dead) return;
          if (kind === 'sound' || kind === 'speech' || kind === 'audio') { st.activity = true; el.act.classList.add('on'); el.act.textContent = T('voiceSoundOk'); hideSoundHint(); }
          else if (kind === 'silence') { el.act.classList.remove('on'); }
        },
        onError: function (err) {
          if (dead) return;
          st.err = err; clearSound(); setRing(0);
          st.partialAdded = false;
          if (err && err.partial) { setValue(joinText(st.base, err.partial)); st.partialAdded = true; st.fromVoice = true; flash(); }
          if (err.code === 'preempted' || err.code === 'destroyed') { st.mic = 'idle'; st.err = null; }
          else st.mic = 'error';
          renderVoice();
        }
      });
      return mic;
    }
    function destroyMic() { if (mic) { try { mic.destroy(); } catch (e) {} mic = null; } }

    function armSoundHint() {
      clearSound();
      soundTimer = setTimeout(function () { if (!dead && st.mic === 'listening' && !st.activity) { st.noSound = true; el.status.textContent = T('voiceNoSound'); el.status.className = 'ivx-mic-status err'; } }, 5000);
    }
    function hideSoundHint() { if (st.noSound) { st.noSound = false; var sl = statusLine(); el.status.textContent = sl.t; el.status.className = 'ivx-mic-status' + (sl.c ? ' ' + sl.c : ''); } }

    function startMic(engine, keepBase) {
      if (dead || st.locked) return;
      var M = micApi();
      if (!M) { st.err = { code: 'unsupported', message: T('micNoneUnsupported'), message_en: T('micNoneUnsupported'), recoverable: false }; st.mic = 'error'; renderVoice(); return; }
      if (!keepBase) st.base = el.ta.value.trim();
      st.err = null; st.notice = ''; st.engine = ''; st.partialAdded = false;
      var m = buildMic(engine);
      resetMeter();
      st.mic = 'idle';
      m.start().catch(function () { /* الخطأ وصل عبر onError */ });
    }

    function onAction(a) {
      if (a === 'toggle') {
        if (st.mic === 'listening') { if (mic) mic.stop().catch(function () {}); }
        else if (st.mic === 'idle' || st.mic === 'error' || st.mic === 'transcript_ready') startMic();
      } else if (a === 'cancel') { if (mic) mic.cancel(); st.mic = 'idle'; st.err = null; clearSound(); setRing(0); renderVoice(); }
      else if (a === 'redo') { var keep = st.base; if (mic) mic.cancel(); setValue(keep); st.fromVoice = false; startMic(null, true); }
      else if (a === 'again') startMic();
      else if (a === 'server') startMic('recorder');
      else if (a === 'retryTr') { if (mic) { st.err = null; mic.retryTranscription().catch(function () {}); } }
    }

    root.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-a],[data-m]') : null;
      if (!t || !root.contains(t) || dead) return;
      if (t.getAttribute('data-m')) {
        var m = t.getAttribute('data-m');
        if (m === 'text' && busy()) { setHint(T('micBusyLeave')); return; }
        st.mode = m; setHint(''); renderVoice();
        if (m === 'voice') { var M = micApi(); if (M && M.probeServer) M.probeServer().then(function () { if (!dead) renderVoice(); }); }
        return;
      }
      onAction(t.getAttribute('data-a'));
    });
    root.addEventListener('keydown', function (e) {
      if (dead) return;
      if (e.key === 'Escape' && busy()) { e.preventDefault(); onAction('cancel'); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target === el.ta && typeof o.onSubmitShortcut === 'function') { e.preventDefault(); o.onSubmitShortcut(); }
    });
    el.ta.addEventListener('input', function () { setHint(''); emitChange(); });

    resetMeter(); updateCount(); renderVoice();

    return {
      el: el,
      getText: function () { return el.ta.value; },
      setText: function (t) { setValue(t || ''); },
      getSource: function () { return st.fromVoice ? 'voice' : 'text'; },
      resetSource: function () { st.fromVoice = false; },
      isBusy: busy,
      micState: function () { return st.mic; },
      setLocked: function (v) { st.locked = !!v; renderVoice(); },
      setHint: setHint,
      focus: function () { try { el.ta.focus(); } catch (e) {} },
      refresh: renderVoice,
      cancelMic: function () { if (mic) { try { mic.cancel(); } catch (e) {} } if (st.mic !== 'idle') { st.mic = 'idle'; st.err = null; } clearSound(); },
      destroy: function () { dead = true; clearSound(); destroyMic(); setRing(0); }
    };
  }

  function unmountComposers() {
    if (composer) { composer.destroy(); composer = null; }
    if (followComposer) { followComposer.destroy(); followComposer = null; }
  }

  // ═══ الواجهات ═══════════════════════════════════════════════════════════════════════════════════
  function gradeColor(key) { return { excellent: '#00f5d4', very_good: '#00d4ff', good: '#ffd60a', fair: '#ff9f1c', needs_work: '#ff006e' }[key] || '#00d4ff'; }
  function critColor(v) { return v >= 4 ? '#00f5d4' : v >= 3 ? '#00d4ff' : v >= 2 ? '#ffd60a' : '#ff006e'; }
  function gradeName(g) { return g ? (lang() === 'en' ? (g.en || g.ar) : (g.ar || g.en)) : ''; }
  function critLabel(c) { return lang() === 'en' ? (c.label_en || c.label_ar || c.id) : (c.label_ar || c.label_en || c.id); }

  function render() {
    var c = content();
    if (!c) return;
    injectCss();
    unmountComposers();
    if (S.screen !== 'setup' && !cur()) S.screen = 'setup';
    if (S.screen === 'feedback') { var fa = answerAt(S.qIdx); if (!(fa && fa.evaluation)) S.screen = 'room'; }      // لا شاشة تقييم بلا تقييم
    if (S.screen === 'room') { c.innerHTML = viewRoom(); afterRoom(); }
    else if (S.screen === 'feedback') { c.innerHTML = viewFeedback(); afterFeedback(); }
    else if (S.screen === 'results') { c.innerHTML = viewResults(); afterResults(); }
    else { c.innerHTML = viewSetup(); afterSetup(); }
  }

  // ── setup ──
  function viewSetup() {
    S.screen = 'setup';
    S.saved = sanitizeSession(lsGet(sessionKey()));
    var ids = catIds(), lg = lang();
    var cards = ids.map(function (id) {
      var cat = catText(id, lg), sel = S.selected === id ? ' selected' : '';
      return '<div class="intv-cat-card' + sel + '" role="button" tabindex="0" data-act="pick" data-cat="' + esc(id) + '" aria-pressed="' + (S.selected === id ? 'true' : 'false') + '">' +
        '<div class="intv-cat-icon">' + esc(cat.icon) + '</div><div class="intv-cat-title">' + esc(cat.title) + '</div>' +
        '<div class="intv-cat-meta">' + T('nQuestions', { n: cat.questions.length }) + '</div>' +
        '<span class="intv-cat-diff ' + (cat.difficulty === 'mid' ? 'mid' : 'hard') + '">' + (cat.difficulty === 'mid' ? T('diffMid') : T('diffHard')) + '</span></div>';
    }).join('');
    var resume = '';
    if (S.saved) {
      var sc = catText(S.saved.catId, S.saved.lg);
      resume = '<div class="ivx-glass ivx-resume"><div class="grow"><b>' + T('resumeTitle') + '</b><span class="sub">' + esc(T('resumeInfo', { cat: sc.title, q: S.saved.qIdx + 1, n: sc.questions.length })) + '</span></div>' +
        '<button type="button" class="intv-submit-btn sm" data-act="resume"><i class="fas fa-play"></i> ' + T('resume') + '</button>' +
        '<button type="button" class="ivx-link" data-act="discardSaved">' + T('discard') + '</button></div>';
    }
    var hist = sanitizeHistory(lsGet(historyKey()));
    var histHtml = '';
    if (hist.length) {
      histHtml = '<div class="ivx-glass ivx-hist"><h4>' + T('historyTitle') + '</h4>' + hist.slice(0, 5).map(function (h) {
        var ct = catText(h.catId, lg), d = h.ts ? new Date(h.ts).toLocaleDateString(lg === 'ar' ? 'ar' : 'en') : '';
        return '<div class="ivx-hist-row"><span>' + esc(ct.title) + ' <span class="d">' + esc(d) + '</span></span><span><b style="color:' + gradeColor(h.grade.key) + '">' + h.total + '/100</b> <span class="d">' + esc(gradeName(h.grade)) + '</span></span></div>';
      }).join('') + '</div>';
    }
    return '<div class="intv-wrap ivx-wrap">' +
      '<div class="intv-setup-title">⬡ ' + T('chooseType') + '</div><div class="intv-setup-sub">' + T('chooseSub') + '</div>' + resume +
      '<div class="intv-cat-grid">' + cards + '</div>' +
      '<div id="ivxRubric"></div><div id="ivxMicReady" class="ivx-glass ivx-micready"></div>' +
      '<div style="text-align:center;"><button class="intv-start-btn" id="intvStartBtn" type="button" data-act="start"' + (S.selected ? '' : ' disabled') + '><i class="fas fa-play"></i> ' + T('start') + '</button></div>' +
      histHtml + '</div>';
  }

  function afterSetup() {
    renderRubric();
    renderMicReady();
    var M = micApi();
    if (M && M.probeServer) M.probeServer().then(function () { renderMicReady(); });
    ensureRubrics();
  }

  function ensureRubrics(force) {
    if (S.rubricState === 'loading') return;
    if (S.rubrics && !force) return;
    S.rubricState = 'loading'; renderRubric();
    request('GET', '/api/interview/rubrics', null, { timeoutMs: 15000 }).then(function (res) {
      if (res.ok && res.data && res.data.rubrics && typeof res.data.rubrics === 'object') { S.rubrics = res.data.rubrics; S.rubricState = 'ready'; }
      else S.rubricState = 'failed';
      if (S.screen === 'setup') renderRubric();
    });
  }

  function renderRubric() {
    var host = $('ivxRubric');
    if (!host) return;
    if (!S.selected) { host.innerHTML = ''; return; }
    var lg = lang(), r = S.rubrics && S.rubrics[S.selected];
    if (S.rubricState === 'loading' && !r) { host.innerHTML = '<div class="ivx-glass ivx-rubric"><div class="ivx-note">' + T('rubricLoading') + '</div></div>'; return; }
    if (!r) { host.innerHTML = '<div class="ivx-glass ivx-rubric"><div class="ivx-note">' + T('rubricFail') + '</div><div class="ivx-err-actions"><button type="button" class="ivx-btn" data-act="reloadRubric">' + T('retry') + '</button></div></div>'; return; }
    var items = (Array.isArray(r.criteria) ? r.criteria : []).map(function (c) {
      var name = lg === 'en' ? c.en : c.ar, what = lg === 'en' ? c.what : c.what_ar;
      return '<li><b>' + esc(name) + '</b><span class="ivx-chip">' + T('weight') + ' ' + esc(c.weight) + '%</span><small>' + esc(what) + '</small></li>';
    }).join('');
    var bands = (Array.isArray(r.grades) ? r.grades : []).map(function (g) { return '<span class="ivx-chip" style="border-color:' + gradeColor(g.key) + '66">' + esc(lg === 'en' ? g.en : g.ar) + (g.min ? ' ≥ ' + esc(g.min) : '') + '</span>'; }).join('');
    host.innerHTML = '<div class="ivx-glass ivx-rubric"><div class="ivx-rubric-h">⬡ ' + T('rubricTitle') + ' — ' + esc(lg === 'en' ? r.title_en : r.title_ar) + '</div><ul>' + items + '</ul>' +
      '<div class="ivx-note">' + T('rubricNote') + '</div><div class="ivx-bands" aria-label="' + esc(T('bands')) + '">' + bands + '</div></div>';
  }

  function renderMicReady() {
    var host = $('ivxMicReady');
    if (!host) return;
    var info = micInfo();
    host.innerHTML = '<span class="dot ' + (info.ok ? '' : 'bad') + '"></span><b>' + T('micTitle') + ':</b><span>' + esc(info.text) + '</span>';
    if (W.navigator && W.navigator.permissions && W.navigator.permissions.query) {
      try {
        W.navigator.permissions.query({ name: 'microphone' }).then(function (p) {
          if (p && p.state === 'denied' && $('ivxMicReady') === host) host.innerHTML = '<span class="dot bad"></span><b>' + T('micTitle') + ':</b><span>' + esc(T('micDeniedPre')) + '</span>';
        }, function () {});
      } catch (e) {}
    }
  }

  // ── room ──
  function viewRoom() {
    var c = cur(), i = S.qIdx, n = c.questions.length, q = c.questions[i], iv = c.interviewer;
    return '<div class="intv-wrap ivx-wrap"><div class="intv-room">' +
      '<div class="intv-room-hdr"><div class="intv-hdr-label">' + esc(c.icon) + ' ' + esc(c.title) + '</div>' +
      '<div class="intv-hdr-bar"><div class="intv-hdr-fill" style="width:' + Math.round(i / n * 100) + '%"></div></div><div class="intv-hdr-count">' + T('qOf', { i: i + 1, n: n }) + '</div></div>' +
      '<div class="intv-room-body">' +
      '<div class="intv-avatar-wrap"><div class="intv-avatar-ring" id="ivxRing" data-state="idle">' + esc(iv.emoji) + '</div>' +
      '<div class="intv-avatar-name">' + esc(iv.name) + '</div><div class="intv-avatar-role">' + esc(iv.role) + '</div>' +
      '<span class="intv-avatar-status asking" id="intvStatus" role="status" aria-live="polite">' + T('stAsking') + '</span></div>' +
      '<div class="intv-content">' +
      '<div class="intv-q-card"><div class="intv-q-num">⬡ ' + T('question') + ' ' + (i + 1) + ' <span style="color:rgba(255,255,255,0.28);font-size:0.58rem;">' + esc(c.titleOther) + '</span></div><p class="intv-q-text">' + esc(q) + '</p></div>' +
      '<div class="intv-ans-card"><div id="ivxComposerHost"></div>' +
      '<div class="intv-submit-row ivx-submit-row"><button type="button" class="ivx-link" data-act="skip">' + T('skip') + '</button>' +
      '<button type="button" class="intv-submit-btn" id="intvSubmitBtn" data-act="submit"><i class="fas fa-paper-plane"></i> ' + T('submit') + '</button></div>' +
      '<div id="ivxEvalMsg" class="ivx-evalmsg" role="alert"></div></div>' +
      '<div class="ivx-room-foot"><button type="button" class="ivx-link" data-act="endNow">' + T('endNow') + '</button>' +
      '<button type="button" class="ivx-link danger" data-act="cancelInterview" id="ivxCancelBtn">' + T('cancelInterview') + '</button></div>' +
      '</div></div></div></div>';
  }

  function setStatus(text, cls, ringState) {
    var s = $('intvStatus'), r = $('ivxRing');
    if (s) { s.className = 'intv-avatar-status ' + cls; s.textContent = text; }
    if (r) r.setAttribute('data-state', ringState || 'idle');
  }
  function statusFor(state) {
    if (S.submitting) return;
    if (state === 'requesting_permission') setStatus(T('stPerm'), 'waiting', 'idle');
    else if (state === 'listening') setStatus(T('stListening'), 'listening', 'listening');
    else if (state === 'processing') setStatus(T('stProcessing'), 'eval', 'thinking');
    else if (state === 'transcript_ready') setStatus(T('stReady'), 'ready', 'idle');
    else if (state === 'error') setStatus(T('stMicError'), 'error', 'error');
    else setStatus(T('stAsking'), 'asking', 'idle');
  }

  function afterRoom() {
    var host = $('ivxComposerHost'), a = answerAt(S.qIdx);
    composer = makeComposer(host, {
      onChange: function (t) { S.draft = t; persist(); },
      onBusy: function () { updateSubmitState(); },
      onMicState: function (s) { statusFor(s); },
      onSubmitShortcut: submitAnswer
    });
    var start = (a && (a.status === 'failed' || a.status === 'pending') && a.answer) ? a.answer : S.draft;
    if (start) composer.setText(start);
    if (a && a.status === 'failed' && a.error) showEvalError(a.error);
    if (S.submitting) setSubmittingUi(true);                          // عاد الطالب إلى القسم وطلب التقييم ما زال جارياً
    updateSubmitState();
  }

  function updateSubmitState() {
    var b = $('intvSubmitBtn');
    if (!b) return;
    var busy = composer && composer.isBusy();
    b.disabled = !!(S.submitting || busy);
    b.setAttribute('aria-busy', S.submitting ? 'true' : 'false');
    b.title = busy ? T('micBusyBlock') : '';
  }

  function showEvalMsg(html) { var b = $('ivxEvalMsg'); if (b) b.innerHTML = html || ''; }
  function showEvalError(err) {
    showEvalMsg('<div class="ivx-err"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><div><b>' + T('evalFailed') + '</b><p>' + esc(netMessage(err && err.code)) + '</p></div></div>' +
      '<div class="ivx-err-actions"><button type="button" class="intv-submit-btn sm" data-act="retryEval"><i class="fas fa-rotate-right"></i> ' + T('retry') + '</button>' +
      '<button type="button" class="ivx-btn" data-act="editAnswer">' + T('editAnswer') + '</button></div>');
  }
  function setSubmittingUi(on) {
    var b = $('intvSubmitBtn');
    if (b) b.innerHTML = on ? '<i class="fas fa-spinner fa-spin"></i> ' + T('evaluating') : '<i class="fas fa-paper-plane"></i> ' + T('submit');
    if (composer) composer.setLocked(on);
    updateSubmitState();
    if (on) {
      setStatus(T('stEval'), 'eval', 'thinking');
      showEvalMsg('<div class="ivx-note" id="ivxWorking"></div><div class="ivx-err-actions"><button type="button" class="ivx-btn" data-act="cancelEval">' + T('cancelEval') + '</button></div>');
      S.evalTimer = setTimeout(function () { var w = $('ivxWorking'); if (w) w.textContent = T('stillWorking'); }, 20000);
    } else {
      if (S.evalTimer) { clearTimeout(S.evalTimer); S.evalTimer = null; }
      statusFor(composer ? composer.micState() : 'idle');
    }
  }

  function submitAnswer() {
    if (S.submitting || S.screen !== 'room' || !composer) return;
    if (composer.isBusy()) { composer.setHint(T('micBusyBlock')); return; }
    var text = composer.getText().replace(/\s+$/g, '').replace(/^\s+/g, '');
    if (text.length < MIN_CHARS) { composer.setHint(T('tooShort')); composer.focus(); return; }
    var i = S.qIdx, c = cur();
    S.answers[i] = { q: c.questions[i], answer: text.slice(0, MAX_CHARS), source: composer.getSource(), status: 'pending', evaluation: null, error: null, discuss: null, discussLoading: false, discussErr: null, reply: null };
    S.draft = '';
    runEvaluation(i);
  }

  function runEvaluation(i) {
    var a = S.answers[i];
    if (!a || S.submitting) return;
    var sid = S.sid;
    S.submitting = true; a.status = 'pending'; a.error = null;
    if (S.screen === 'room') setSubmittingUi(true);
    else if (S.screen === 'results') renderResultsBody();
    persist(true);
    request('POST', '/api/interview/evaluate', { category: S.catId, question: a.q, answer: a.answer, language: S.lg, source: a.source },
      { timeoutMs: 100000, onController: function (ctl) { S.ctl = ctl; } }).then(function (res) {
      if (sid !== S.sid || S.answers[i] !== a) return;            // المقابلة أُلغيت/استُبدلت أثناء الطلب
      S.submitting = false; S.ctl = null;
      if (S.evalTimer) { clearTimeout(S.evalTimer); S.evalTimer = null; }
      if (res.aborted) { a.status = 'failed'; a.error = null; if (S.screen === 'room') { showEvalMsg(''); setSubmittingUi(false); if (composer) composer.setText(a.answer); } persist(true); return; }
      var ev = res.ok ? normalizeEvaluation(res.data) : null;
      if (!ev) {
        a.status = 'failed'; a.error = { code: res.ok ? 'invalid_response' : res.code };
        persist(true);
        if (S.screen === 'room') { setSubmittingUi(false); if (composer) composer.setText(a.answer); showEvalError(a.error); }
        else if (S.screen === 'results') { if (S.results) { S.results.reevalFailed = i; } renderResultsBody(); }
        return;
      }
      a.status = 'evaluated'; a.evaluation = ev; a.error = null;
      persist(true);
      if (S.screen === 'results') { loadSummary(); return; }
      S.screen = 'feedback'; render(); persist(true);
    });
  }

  // ── feedback ──
  function critRow(c) {
    var clr = critColor(c.score), pct = Math.round(c.score / 5 * 100);
    var meta = '<span class="ivx-chip">' + T('weight') + ' ' + c.weight + '%</span>' + (c.evidence ? '<q>' + esc(c.evidence) + '</q>' : '') + (c.comment ? '<span>' + esc(c.comment) + '</span>' : '');
    return '<div class="ivx-crit"><div class="intv-bd-row"><div class="intv-bd-lbl">' + esc(critLabel(c)) + '</div>' +
      '<div class="intv-bd-bar"><div class="intv-bd-fill" style="width:0%;background:' + clr + '" data-w="' + pct + '"></div></div>' +
      '<div class="intv-bd-num" style="color:' + clr + '">' + (Math.round(c.score * 10) / 10) + '/5</div></div><div class="ivx-crit-meta">' + meta + '</div></div>';
  }
  function listHtml(arr, dotCls) {
    return arr.length ? '<ul class="intv-adv-list">' + arr.map(function (t) { return '<li class="intv-adv-item"><span class="intv-adv-dot ' + dotCls + '"></span><span>' + esc(t) + '</span></li>'; }).join('') + '</ul>' : '<div class="ivx-note">' + T('none') + '</div>';
  }

  function viewFeedback() {
    var c = cur(), a = answerAt(S.qIdx), ev = a && a.evaluation, iv = c.interviewer;
    if (!ev) { S.screen = 'room'; return viewRoom(); }
    var clr = gradeColor(ev.grade.key), last = S.qIdx + 1 >= c.questions.length;
    return '<div class="intv-wrap ivx-wrap"><div class="intv-feedback">' +
      '<div class="intv-discuss-hdr"><div class="intv-avatar-ring sm">' + esc(iv.emoji) + '</div><div><div class="intv-avatar-name">' + esc(iv.name) + '</div><div class="intv-avatar-role">' + esc(iv.role) + '</div></div>' +
      '<span class="intv-avatar-status asking" id="intvStatus" style="margin-inline-start:auto" role="status">' + T('stDiscuss') + '</span></div>' +
      '<div class="intv-discuss-body"><div class="intv-ai-bubble ivx-discuss" id="ivxDiscuss"></div></div>' +
      '<div class="intv-eval-section"><div class="ivx-total"><div class="intv-score-ring" style="--isc:' + clr + ';--isp:0" id="ivxRing2"><div class="intv-score-ring-inner">' +
      '<div class="intv-score-ring-num" style="color:' + clr + '">' + ev.total + '</div><div class="intv-score-ring-lbl">/ 100</div><div class="intv-score-ring-grade" style="color:' + clr + '">' + esc(gradeName(ev.grade)) + '</div></div></div>' +
      '<div class="intv-score-label">' + T('scoreLabel') + '</div></div>' +
      '<div class="intv-bd-wrap"><div class="ivx-note" style="margin-bottom:.2rem">' + T('criteriaTitle') + '</div>' + ev.criteria.map(critRow).join('') + '</div></div>' +
      '<div class="intv-adv-grid"><div class="intv-adv-card pros"><div class="intv-adv-title"><i class="fas fa-check-circle"></i> ' + T('strengths') + '</div>' + listHtml(ev.strengths, 'ok') + '</div>' +
      '<div class="intv-adv-card cons"><div class="intv-adv-title"><i class="fas fa-exclamation-circle"></i> ' + T('gaps') + '</div>' + listHtml(ev.gaps, 'bad') + '</div></div>' +
      '<div class="ivx-glass ivx-block"><h4><i class="fas fa-arrow-trend-up"></i> ' + T('improve') + '</h4>' + listHtml(ev.improvements, 'ok') + '</div>' +
      (ev.example ? '<div class="intv-best-ans"><div class="intv-best-ans-title"><i class="fas fa-star"></i> ' + T('example') + '</div><div class="intv-best-ans-body ivx-example" id="ivxExample"></div><div class="ivx-note" style="margin-top:.6rem">' + T('exampleNote') + '</div></div>' : '') +
      '<div class="intv-followup-wrap" id="ivxFollow" hidden></div>' +
      '<div style="text-align:center;margin-top:1.1rem;"><button type="button" class="intv-next-btn" id="intvNextBtn" data-act="next">' +
      (last ? '<i class="fas fa-flag-checkered"></i> ' + T('finish') : '<i class="fas fa-arrow-left"></i> ' + T('next')) + '</button></div>' +
      '</div></div>';
  }

  function afterFeedback() {
    var c = content(), a = answerAt(S.qIdx), ev = a && a.evaluation;
    if (!ev) return;
    setTimeout(function () {
      var ring = $('ivxRing2'); if (ring) ring.style.setProperty('--isp', ev.total);
      (c || D).querySelectorAll('.intv-bd-fill').forEach(function (el) { var w = el.getAttribute('data-w'); if (w) el.style.width = w + '%'; });
    }, 150);
    var ex = $('ivxExample'); if (ex) setTimeout(function () { typeInto(ex, ev.example); }, 700);
    updateDiscussionUi();
    if (!a.discuss && !a.discussLoading) loadDiscussion(S.qIdx);
  }

  function loadDiscussion(i) {
    var a = answerAt(i), sid = S.sid, c = cur();
    if (!a || a.discuss || a.discussLoading) return;
    a.discussLoading = true; a.discussErr = null; updateDiscussionUi();
    request('POST', '/api/interview/discuss', { category: S.catId, question: a.q, answer: a.answer, interviewer: c.interviewer.name, role: c.interviewer.role, language: S.lg }, { timeoutMs: 60000 }).then(function (res) {
      if (sid !== S.sid || answerAt(i) !== a) return;
      a.discussLoading = false;
      var d = res.ok ? res.data : null;
      if (d && typeof d.comment === 'string' && d.comment.trim() && typeof d.followup_question === 'string' && d.followup_question.trim()) { a.discuss = { comment: clip(d.comment, 500), followup: clip(d.followup_question, 300) }; a.discussFresh = true; }
      else a.discussErr = { code: res.ok ? 'invalid_response' : res.code };
      persist(true);
      if (S.screen === 'feedback' && S.qIdx === i) updateDiscussionUi();
    });
  }

  function updateDiscussionUi() {
    var a = answerAt(S.qIdx), box = $('ivxDiscuss'), follow = $('ivxFollow');
    if (!a || !box) return;
    if (a.discussLoading) {
      box.innerHTML = '<span class="intv-ai-dot"></span><span class="intv-ai-dot"></span><span class="intv-ai-dot"></span>';
      setStatus(T('stThinking'), 'eval', 'idle');
      return;
    }
    setStatus(T('stDiscuss'), 'asking', 'idle');
    if (a.discussErr) {
      box.innerHTML = '<div class="ivx-note">' + esc(T('discussFailed')) + ' ' + esc(netMessage(a.discussErr.code)) + '</div><div class="ivx-err-actions"><button type="button" class="ivx-btn" data-act="reloadDiscuss">' + T('retry') + '</button></div>';
      if (follow) follow.hidden = true;
      return;
    }
    if (!a.discuss) { box.textContent = ''; return; }
    var fresh = a.discussFresh; a.discussFresh = false;
    box.innerHTML = '<div class="ivx-disc-c"></div><div class="ivx-follow-q"></div>';
    var cEl = box.querySelector('.ivx-disc-c'), qEl = box.querySelector('.ivx-follow-q');
    if (fresh) typeInto(cEl, a.discuss.comment); else cEl.textContent = a.discuss.comment;
    qEl.textContent = a.discuss.followup;
    if (follow) { follow.hidden = false; mountFollow(a); }
  }

  function mountFollow(a) {
    var follow = $('ivxFollow');
    if (!follow || follow.getAttribute('data-mounted') === '1') return;
    follow.setAttribute('data-mounted', '1');
    if (a.reply) { follow.innerHTML = replyHtml(a); typeIfFresh(a); return; }
    follow.innerHTML = '<div class="intv-followup-label"><i class="fas fa-reply"></i> ' + T('followLabel') + '</div><div id="ivxFollowHost"></div>' +
      '<div class="intv-submit-row"><button type="button" class="intv-submit-btn sm" id="ivxFollowBtn" data-act="sendReply"><i class="fas fa-paper-plane"></i> ' + T('followSend') + '</button></div><div id="ivxFollowMsg" role="alert"></div>';
    followComposer = makeComposer($('ivxFollowHost'), { rows: 3, placeholder: T('placeholderFollow'), onSubmitShortcut: sendReply, onBusy: function (b) { var btn = $('ivxFollowBtn'); if (btn) btn.disabled = b || a.replying; } });
  }
  function replyHtml(a) {
    return '<div class="intv-followup-label"><i class="fas fa-reply"></i> ' + T('followLabel') + '</div><div class="ivx-note" style="white-space:pre-wrap;margin-bottom:.6rem">' + esc(a.reply.text) + '</div>' +
      (a.reply.remark ? '<div class="intv-ai-bubble follow-reply ivx-discuss" id="ivxRemark"></div>' : '');
  }
  function typeIfFresh(a) { var r = $('ivxRemark'); if (r && a.reply && a.reply.remark) { if (a.reply.fresh) { a.reply.fresh = false; typeInto(r, a.reply.remark); } else r.textContent = a.reply.remark; } }

  function sendReply() {
    var a = answerAt(S.qIdx), sid = S.sid, i = S.qIdx;
    if (!a || !a.discuss || a.replying || a.reply || !followComposer) return;
    if (followComposer.isBusy()) { followComposer.setHint(T('micBusyBlock')); return; }
    var text = followComposer.getText().trim();
    if (text.length < 3) { followComposer.setHint(T('tooShort')); return; }
    var btn = $('ivxFollowBtn'), msg = $('ivxFollowMsg'), c = cur();
    a.replying = true; if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + T('evaluating'); }
    followComposer.setLocked(true); if (msg) msg.innerHTML = '';
    request('POST', '/api/interview/reply', { followup_question: a.discuss.followup, reply: text.slice(0, 1200), interviewer: c.interviewer.name, language: S.lg }, { timeoutMs: 60000 }).then(function (res) {
      if (sid !== S.sid || answerAt(i) !== a) return;
      a.replying = false;
      var remark = res.ok && res.data && typeof res.data.remark === 'string' ? clip(res.data.remark, 300) : '';
      if (!remark) {
        if (S.screen === 'feedback' && S.qIdx === i) {
          if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + T('followSend'); }
          if (followComposer) followComposer.setLocked(false);
          if (msg) msg.innerHTML = '<div class="ivx-err"><i class="fas fa-triangle-exclamation"></i><div><p>' + esc(T('replyFailed') + ' ' + netMessage(res.ok ? 'invalid_response' : res.code)) + '</p></div></div>';
        }
        return;
      }
      a.reply = { text: clip(text, 1200), remark: remark, fresh: true };
      persist(true);
      if (S.screen === 'feedback' && S.qIdx === i) {
        if (followComposer) { followComposer.destroy(); followComposer = null; }
        var follow = $('ivxFollow'); if (follow) { follow.innerHTML = replyHtml(a); typeIfFresh(a); }
      }
    });
  }

  function nextQuestion() {
    if (S.submitting) return;
    var c = cur();
    S.qIdx++; S.draft = '';
    if (S.qIdx >= c.questions.length) { S.qIdx = c.questions.length - 1; goResults(); return; }
    S.screen = 'room'; render(); persist(true);
  }
  function skipQuestion() {
    if (S.submitting) return;
    var c = cur(), i = S.qIdx;
    S.answers[i] = { q: c.questions[i], answer: '', source: 'text', status: 'skipped', evaluation: null, error: null, discuss: null, reply: null };
    nextQuestion();
  }

  // ── results ──
  function evaluatedAnswers() { return S.answers.filter(function (a) { return a && a.status === 'evaluated' && a.evaluation; }); }

  function buildSummaryPayload() {
    var ev = evaluatedAnswers();
    return {
      category: S.catId, language: S.lg, with_report: true,
      scores: ev.map(function (a) { var o = {}; a.evaluation.criteria.forEach(function (c) { o[c.id] = c.score; }); return o; }),
      notes: ev.map(function (a) { return { strengths: a.evaluation.strengths.slice(0, 6).map(function (s) { return clip(s, 200); }), gaps: a.evaluation.gaps.slice(0, 6).map(function (s) { return clip(s, 200); }) }; })
    };
  }

  function goResults() {
    S.screen = 'results'; S.results = { loading: true }; render();
    loadSummary();
  }

  function loadSummary() {
    var sid = S.sid;
    if (!evaluatedAnswers().length) { S.results = { empty: true }; clearSaved(); renderResultsBody(); return; }
    S.results = { loading: true }; renderResultsBody();
    request('POST', '/api/interview/summary', buildSummaryPayload(), { timeoutMs: 90000 }).then(function (res) {
      if (sid !== S.sid) return;
      var sm = res.ok ? normalizeSummary(res.data) : null;
      if (!sm) { S.results = { error: res.ok ? 'invalid_response' : res.code }; renderResultsBody(); return; }
      S.results = { summary: sm };
      saveHistory(sm);
      if (!S.recorded) { S.recorded = true; recordResult(sm); }
      clearSaved();
      renderResultsBody();
    });
  }

  function weakestOf(sm) {
    var labels = criteriaMeta(), worst = null;
    Object.keys(sm.criteria_avg).forEach(function (k) { var v = sm.criteria_avg[k]; if (v != null && (worst == null || v < worst.avg)) worst = { id: k, avg: v }; });
    return worst ? { label: labels[worst.id] ? critLabel(labels[worst.id]) : worst.id, avg: worst.avg } : null;
  }
  function criteriaMeta() {
    var m = {};
    evaluatedAnswers().forEach(function (a) { a.evaluation.criteria.forEach(function (c) { if (!m[c.id]) m[c.id] = c; }); });
    return m;
  }

  function saveHistory(sm) {
    var c = cur(); if (!c) return;
    var hist = sanitizeHistory(lsGet(historyKey()));
    var rec = { id: S.startedAt, ts: Date.now(), catId: S.catId, title: c.title, total: sm.total, grade: sm.grade, answered: sm.answered, weakest: weakestOf(sm), criteria_avg: Object.keys(sm.criteria_avg).reduce(function (o, k) { if (sm.criteria_avg[k] != null) o[k] = sm.criteria_avg[k]; return o; }, {}) };
    hist = hist.filter(function (h) { return h.id !== rec.id; });
    hist.unshift(rec);
    lsSet(historyKey(), hist.slice(0, HISTORY_MAX));
  }
  // سجلّ الطالب العام (يراه المالك بالعربية): الدرجة محسوبة على الخادم من المعايير — وليست من المتصفح
  function recordResult(sm) {
    var ar = catText(S.catId, 'ar');
    try { if (typeof W.recordStudentResult === 'function' && ar) W.recordStudentResult('مقابلة AI', ar.title, sm.total, 100); } catch (e) {}
  }

  function viewResults() {
    return '<div class="intv-wrap ivx-wrap"><div class="intv-results"><div id="ivxResultsBody"></div>' +
      '<div class="intv-results-actions" style="margin-top:1.2rem"><button type="button" class="intv-next-btn" data-act="redo"><i class="fas fa-redo-alt"></i> ' + T('redo') + '</button>' +
      '<button type="button" class="intv-reset-btn" data-act="another"><i class="fas fa-th-large"></i> ' + T('another') + '</button></div></div></div>';
  }
  function afterResults() { renderResultsBody(); }

  function reportText() {
    var r = S.results && S.results.summary, c = cur(); if (!r || !c) return '';
    var meta = criteriaMeta(), lines = [];
    lines.push(c.title + ' — ' + r.total + '/100 (' + gradeName(r.grade) + ')');
    Object.keys(r.criteria_avg).forEach(function (k) { if (r.criteria_avg[k] != null) lines.push('• ' + (meta[k] ? critLabel(meta[k]) : k) + ': ' + r.criteria_avg[k] + '/5'); });
    if (r.report) lines.push('', r.report);
    return lines.join('\n');
  }

  function renderResultsBody() {
    var host = $('ivxResultsBody');
    if (!host || !cur()) return;
    host.innerHTML = resultsBodyHtml();
    setTimeout(function () { host.querySelectorAll('.intv-gauge').forEach(function (g) { g.style.setProperty('--igp', g.getAttribute('data-p')); }); }, 200);
  }

  function resultsBodyHtml() {
    var c = cur();
    if (!c) return '';
    var res = S.results || { loading: true }, ans = S.answers, total = c.questions.length;
    var perQ = c.questions.map(function (q, i) {
      var a = ans[i], right;
      if (a && a.status === 'evaluated' && a.evaluation) right = '<b style="color:' + gradeColor(a.evaluation.grade.key) + '">' + a.evaluation.total + '/100</b>';
      else if (a && a.status === 'failed' && a.answer) right = '<span class="ivx-chip">' + T('notEvaluated') + '</span> <button type="button" class="ivx-btn" data-act="reeval" data-i="' + i + '"' + (S.submitting ? ' disabled' : '') + '>' + T('reEvaluate') + '</button>';
      else right = '<span class="ivx-chip">' + (a && a.status === 'skipped' ? T('skipped') : T('notEvaluated')) + '</span>';
      return '<div class="ivx-qrow"><span class="t">' + (i + 1) + '. ' + esc(clip(q, 90)) + (a && a.status === 'failed' && a.error ? '<br><small style="color:#ffb4c8">' + esc(netMessage(a.error.code)) + '</small>' : '') + '</span><span>' + right + '</span></div>';
    }).join('');
    var perQHtml = '<div class="ivx-glass ivx-block"><h4>' + T('perQuestion') + '</h4>' + perQ + '</div>';

    if (res.empty) return '<div class="intv-results-hero ivx-glass"><div class="ivx-note">' + T('noEvaluated') + '</div></div>' + perQHtml;
    if (res.loading) return '<div class="intv-results-hero ivx-glass"><div class="intv-results-summary loading" style="margin:0">' + T('reportLoading') + '</div></div>' + perQHtml;
    if (res.error) {
      return '<div class="intv-results-hero ivx-glass"><div class="ivx-err"><i class="fas fa-triangle-exclamation"></i><div><b>' + T('summaryFailed') + '</b><p>' + esc(netMessage(res.error)) + '</p></div></div>' +
        '<div class="ivx-err-actions"><button type="button" class="intv-submit-btn sm" data-act="retrySummary"><i class="fas fa-rotate-right"></i> ' + T('retry') + '</button></div></div>' + perQHtml;
    }
    var sm = res.summary, clr = gradeColor(sm.grade.key), meta = criteriaMeta();
    var gauges = Object.keys(sm.criteria_avg).filter(function (k) { return sm.criteria_avg[k] != null; }).map(function (k) {
      var v = sm.criteria_avg[k], g = critColor(v), m = meta[k];
      return '<div class="intv-gauge-wrap"><div class="intv-gauge" data-p="' + Math.round(v / 5 * 100) + '" style="--igc:' + g + ';--igp:0"><div class="intv-gauge-inner"><div class="intv-gauge-num">' + v + '</div><div class="intv-gauge-lbl">/ 5</div></div></div>' +
        '<div class="intv-gauge-lbl" style="text-align:center;font-family:Tajawal,sans-serif;font-size:.74rem">' + esc(m ? critLabel(m) : k) + '</div>' + (m ? '<span class="ivx-chip">' + T('weight') + ' ' + m.weight + '%</span>' : '') + '</div>';
    }).join('');
    var report = sm.report ? '<div class="intv-results-summary ivx-report">' + esc(sm.report) + '</div>'
      : '<div class="ivx-note intv-results-summary">' + esc(T('reportMissing', { why: sm.report_error ? '(' + netMessage(sm.report_error) + ')' : '' })) + '</div>';
    return '<div class="intv-results-hero ivx-glass"><div class="intv-grade-label" style="color:' + clr + '">' + esc(T('resultsTitle')) + '</div>' +
      '<div class="ivx-hero-total">' + sm.total + '<span style="font-size:1rem;-webkit-text-fill-color:rgba(255,255,255,.5)"> / 100</span></div>' +
      '<div class="intv-grade-label" style="color:' + clr + ';margin-top:.3rem">' + T('gradeLabel') + ': ' + esc(gradeName(sm.grade)) + '</div>' +
      '<div style="font-size:0.76rem;color:rgba(255,255,255,0.45);margin-top:0.4rem;">' + esc(T('resultsMeta', { cat: c.title, n: sm.answered, t: total })) + '</div></div>' +
      '<div class="ivx-note" style="margin:.2rem 0 .6rem">' + T('resultsCriteria') + '</div><div class="intv-gauge-grid ivx-grid">' + gauges + '</div>' +
      '<div class="ivx-glass ivx-block"><h4>' + T('resultsReport') + '</h4>' + report + '</div>' + perQHtml +
      '<div class="intv-results-actions"><button type="button" class="ivx-btn" data-act="copyReport">' + T('copy') + '</button><button type="button" class="ivx-btn primary" data-act="askCeo">' + T('askCeo') + '</button></div>';
  }

  function reevaluate(i) {
    var a = answerAt(i);
    if (!a || S.submitting || !a.answer) return;
    runEvaluation(i);
  }

  // ═══ الأحداث ════════════════════════════════════════════════════════════════════════════════════
  function copyText(text, btn) {
    var done = function () { if (btn) { var old = btn.textContent; btn.textContent = T('copied'); setTimeout(function () { btn.textContent = old; }, 1800); } };
    var fallback = function () { try { var ta = D.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; D.body.appendChild(ta); ta.select(); var ok = D.execCommand('copy'); D.body.removeChild(ta); if (ok) done(); } catch (e) {} };
    try {
      if (W.navigator.clipboard && W.navigator.clipboard.writeText) { W.navigator.clipboard.writeText(text).then(done, fallback); return; }
    } catch (e) {}
    fallback();
  }

  function pick(id) {
    if (!CATS[id]) return;
    S.selected = id;
    var c = content();
    if (c) {
      c.querySelectorAll('.intv-cat-card').forEach(function (el) { var on = el.getAttribute('data-cat') === id; el.classList.toggle('selected', on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var b = $('intvStartBtn'); if (b) b.disabled = false;
    }
    renderRubric();
    if (!S.rubrics) ensureRubrics();
  }
  function start() {
    if (!S.selected || !CATS[S.selected]) return;
    clearSaved();
    newSession(S.selected); S.screen = 'room'; render(); persist(true);
  }
  function resume() {
    var sv = S.saved || sanitizeSession(lsGet(sessionKey()));
    if (!sv) return;
    abortInflight(); S.sid++;
    S.catId = sv.catId; S.lg = sv.lg; S.qIdx = sv.qIdx; S.answers = sv.answers; S.draft = sv.draft; S.startedAt = sv.startedAt; S.results = null; S.recorded = false;
    var a = answerAt(S.qIdx);
    S.screen = (a && a.status === 'evaluated' && a.evaluation) ? 'feedback' : 'room';
    render();
  }
  function reset() { // «إعادة المقابلة»: النوع نفسه من البداية
    var id = S.catId || S.selected; if (!id) { newCategory(); return; }
    S.selected = id; newSession(id); clearSaved(); S.screen = 'room'; render(); persist(true);
  }
  function newCategory() {
    abortInflight(); unmountComposers(); if (micApi()) micApi().cancelAll('reset');
    S.sid++; S.catId = null; S.answers = []; S.qIdx = 0; S.draft = ''; S.results = null; S.selected = null; S.screen = 'setup'; render();
  }
  function cancelInterview() {
    if (!S.confirmCancel) {
      S.confirmCancel = true;
      var b = $('ivxCancelBtn'); if (b) { b.textContent = T('confirmCancel'); b.classList.add('armed'); }
      S.confirmTimer = setTimeout(function () { S.confirmCancel = false; var bb = $('ivxCancelBtn'); if (bb) { bb.textContent = T('cancelInterview'); bb.classList.remove('armed'); } }, 4000);
      return;
    }
    if (S.confirmTimer) clearTimeout(S.confirmTimer);
    S.confirmCancel = false; clearSaved(); newCategory();
  }
  function endNow() {
    if (S.submitting) return;
    if (!evaluatedAnswers().length) { cancelInterview(); return; }
    S.qIdx = Math.min(S.qIdx, cur().questions.length - 1);
    goResults();
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    var root = content();
    if (!t || !root || !root.contains(t) || t.disabled) return;
    var act = t.getAttribute('data-act');
    if (t.closest && t.closest('.ivx-composer')) return;              // أزرار المكوّن يعالجها المكوّن نفسه (data-a / data-m)
    switch (act) {
      case 'pick': pick(t.getAttribute('data-cat')); break;
      case 'start': start(); break;
      case 'resume': resume(); break;
      case 'discardSaved': clearSaved(); render(); break;
      case 'reloadRubric': ensureRubrics(true); break;
      case 'submit': submitAnswer(); break;
      case 'retryEval': if (S.answers[S.qIdx]) { showEvalMsg(''); runEvaluation(S.qIdx); } break;
      case 'editAnswer': showEvalMsg(''); if (composer) composer.focus(); break;
      case 'cancelEval': if (S.ctl) { try { S.ctl.abort(); } catch (er) {} } break;
      case 'skip': skipQuestion(); break;
      case 'endNow': endNow(); break;
      case 'cancelInterview': cancelInterview(); break;
      case 'reloadDiscuss': if (answerAt(S.qIdx)) { answerAt(S.qIdx).discussErr = null; loadDiscussion(S.qIdx); } break;
      case 'sendReply': sendReply(); break;
      case 'next': nextQuestion(); break;
      case 'redo': reset(); break;
      case 'another': newCategory(); break;
      case 'retrySummary': loadSummary(); break;
      case 'reeval': reevaluate(parseInt(t.getAttribute('data-i'), 10)); break;
      case 'copyReport': copyText(reportText(), t); break;
      case 'askCeo':
        if (typeof W.showSection === 'function') W.showSection('ceoai');
        if (typeof W.askQuestion === 'function') setTimeout(function () { W.askQuestion(T('askCeoText')); }, 60);
        break;
    }
  }
  function onKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.getAttribute && e.target.getAttribute('data-act') === 'pick') { e.preventDefault(); pick(e.target.getAttribute('data-cat')); }
  }

  var wired = false;
  function wire() {
    if (wired) return;
    var c = content(); if (!c) return;
    wired = true;
    c.addEventListener('click', onClick);
    c.addEventListener('keydown', onKey);
  }

  // مغادرة القسم: يُحرَّر الميكروفون فوراً (المسودة محفوظة، وأي طلب تقييم جارٍ يكمل ويُحفظ نتيجته)
  function leave() {
    unmountComposers();
    if (micApi()) micApi().cancelAll('leave');
  }

  function renderEntry() {
    wire();
    if (composer && composer.isBusy() && $('ivxComposerHost')) return;      // الطالب يسجّل الآن وضغط تبويب «مقابلة» مجدداً: لا نهدم التسجيل بإعادة الرسم
    render();
  }

  // ═══ الواجهة العامة + الأسماء القديمة ═══════════════════════════════════════════════════════════════
  W.AUS_INTERVIEW = {
    render: renderEntry, leave: leave, start: start, resume: resume, reset: reset, newCategory: newCategory,
    history: function () { return sanitizeHistory(lsGet(historyKey())); },          // آخر مقابلات الطالب المكتملة (يقرؤها CEO AI كسياق)
    state: function () { return { screen: S.screen, catId: S.catId, qIdx: S.qIdx, submitting: S.submitting, answers: S.answers.length, micState: composer ? composer.micState() : null }; },
    _test: { esc: esc, clip: clip, normalizeEvaluation: normalizeEvaluation, normalizeSummary: normalizeSummary, sanitizeSession: sanitizeSession, sanitizeHistory: sanitizeHistory,
             netMessage: netMessage, fmtTime: fmtTime, catText: catText, catIds: catIds, request: request, S: S, buildSummaryPayload: buildSummaryPayload, micInfo: micInfo, L: L,
             viewSetup: viewSetup, viewRoom: viewRoom, viewFeedback: viewFeedback, resultsBodyHtml: resultsBodyHtml, reportText: reportText, gradeColor: gradeColor, critColor: critColor }
  };
  W.renderInterviewSimulator = renderEntry;
  W.startInterview = start;
  W.selectInterviewCat = pick;
  W.submitInterviewAnswer = submitAnswer;
  W.nextInterviewQuestion = nextQuestion;
  W.resetInterview = reset;
  W.newInterviewCategory = newCategory;
  W.toggleIntvMode = function () { if (composer) composer.focus(); };
  W.toggleVoiceRecording = function () { var b = D.querySelector('.ivx-mic-btn'); if (b) b.click(); };
  W.submitIntvFollowup = sendReply;

  var prevShow = W.showSection;
  if (typeof prevShow === 'function') {
    W.showSection = function (id) {
      if (id !== 'interview') leave();
      return prevShow.apply(this, arguments);
    };
  }
})();
