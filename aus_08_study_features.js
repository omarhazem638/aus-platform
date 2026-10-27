/* ═══════════════════════════════════════════════════════════════════════════════
   AI STUDY ASSISTANT v2 — REBUILT FROM SCRATCH
   SSE streaming chat · smart AI · flashcards · quiz · summary · plan
   State: _study  |  Entry: renderStudyAssistant()
═══════════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────────────
var _study = {
    state:'setup', subject:'', level:'متوسط', content:'', fileName:'',
    mode:'chat', messages:[], flashcards:[], currentCard:0,
    quiz:[], currentQuiz:0, summaryText:'', planText:'',
    streaming:false, streamCtrl:null,
};
var STUDY_MODES = [
    { id:'chat',    icon:'fas fa-comments',        label:'محادثة'     },
    { id:'cards',   icon:'fas fa-layer-group',     label:'بطاقات'     },
    { id:'quiz',    icon:'fas fa-question-circle', label:'اختبار'     },
    { id:'summary', icon:'fas fa-file-alt',        label:'ملخص'       },
    { id:'plan',    icon:'fas fa-calendar-check',  label:'خطة دراسة' },
];

// ── Markdown-lite → HTML ───────────────────────────────────────────────────────────
function _studyMd(t) {
    return (t||'')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/\*(.+?)\*/g,'<em>$1</em>')
        .replace(/`(.+?)`/g,'<code style="background:rgba(0,212,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace">$1</code>')
        .replace(/^#{1,3}\s+(.+)$/gm,'<div style="font-weight:700;color:#00d4ff;margin:0.6em 0 0.2em">$1</div>')
        .replace(/^[-•]\s+(.+)$/gm,'<div style="padding-right:1em;margin:0.2em 0">◆ $1</div>')
        .replace(/^\d+\.\s+(.+)$/gm,'<div style="padding-right:1em;margin:0.2em 0">$1</div>')
        .replace(/\n{2,}/g,'<br><br>').replace(/\n/g,'<br>');
}

// ── Client-side smart fallback (works even if backend is fully down) ───────────────
function _studyLocalAnswer(question, subject) {
    var q = (question || '').trim();
    var ql = q.toLowerCase();
    var subj = subject || 'المادة';

    // Definition: ما هو / ما هي / اشرح / عرّف
    if (/(ما هو|ما هي|اشرح|عرّف|عرف|what is|explain|تعريف)/.test(q)) {
        var topic = q.replace(/(ما هو|ما هي|اشرح لي|اشرح|عرّف|عرف|تعريف)/g, '').replace(/[؟?]/g, '').trim();
        return '**التعريف**: ' + (topic ? topic + ' هو مفهوم أساسي في ' + subj + '. ' : '') +
            'يُشير إلى منهجية أو إطار يُستخدم لتحقيق أهداف محددة بكفاءة.\n\n' +
            '**العناصر الأساسية**:\n' +
            '- المبدأ النظري الذي يقوم عليه المفهوم\n' +
            '- التطبيق العملي في بيئة العمل\n' +
            '- المخرجات والنتائج المتوقّعة\n\n' +
            '**مثال عملي**: في الواقع، يُطبَّق هذا المفهوم عبر تحليل الموقف، وضع خطة، التنفيذ، ثم قياس النتائج وتحسينها.\n\n' +
            'ℹ️ *وضع محلّي — لتفاصيل أعمق ومخصّصة، شغّل خادم الذكاء الاصطناعي (START_AUS.bat).*';
    }
    // Comparison: قارن / الفرق
    if (/(قارن|الفرق|compare|الاختلاف)/.test(q)) {
        return '**المقارنة**:\n\n' +
            '- **المعيار الأول** — يختلف الطرفان في الأساس النظري والمنطلق.\n' +
            '- **التكلفة والوقت** — أحدهما أسرع لكن أقلّ عمقاً، والآخر أبطأ وأشمل.\n' +
            '- **التطبيق** — كل أسلوب يناسب سياقاً مختلفاً حسب الموقف.\n' +
            '- **النتائج** — الأول يعطي نتائج فورية، والثاني نتائج طويلة المدى.\n\n' +
            '**الخلاصة**: الاختيار يعتمد على أولويّاتك — السرعة أم العمق، والمدى القصير أم الطويل.\n\n' +
            'ℹ️ *وضع محلّي — شغّل الخادم لمقارنة مخصّصة لمادتك.*';
    }
    // How-to: كيف
    if (/(كيف|how|طريقة|خطوات)/.test(q)) {
        return 'الطريقة المثلى تتضمّن خطوات منهجية واضحة:\n\n' +
            '1. **التحضير** — حدّد الهدف بوضوح واجمع المعلومات اللازمة.\n' +
            '2. **التخطيط** — ضع خطة عمل تفصيلية بجدول زمني واقعي.\n' +
            '3. **التنفيذ** — ابدأ بخطوات صغيرة قابلة للقياس.\n' +
            '4. **المراقبة** — تابع التقدّم وعدّل عند الحاجة.\n' +
            '5. **التقييم** — راجع النتائج واستخلص الدروس.\n\n' +
            'النجاح يتطلّب الالتزام والمرونة في التكيّف.\n\n' +
            'ℹ️ *وضع محلّي — شغّل الخادم لإجابة أعمق.*';
    }
    // Summary: لخّص / ملخص
    if (/(لخّص|لخص|ملخص|summar)/.test(q)) {
        return '**ملخّص ' + subj + '**:\n\n' +
            '- **الفكرة الرئيسية**: الإطار العام الذي يربط كل المفاهيم.\n' +
            '- **النقاط الجوهرية**: المبادئ الأساسية الواجب حفظها.\n' +
            '- **التطبيق**: كيف تُترجَم النظرية إلى ممارسة.\n' +
            '- **الخلاصة**: النجاح من الجمع بين الفهم والتطبيق.\n\n' +
            'ℹ️ *وضع محلّي — ارفع محتوى المادة وشغّل الخادم لملخّص دقيق.*';
    }
    // Generic
    return 'سؤال مهمّ يستحقّ التفصيل. النقاط الأساسية:\n\n' +
        '- يتطلّب فهماً عميقاً للسياق والمعطيات\n' +
        '- يستفيد من الخبرات والأمثلة العملية\n' +
        '- يحتاج نهجاً منظّماً ومرناً في آنٍ واحد\n\n' +
        '**التوصية**: ابدأ بتحديد هدفك، اجمع المعلومات، حلّل الخيارات، ثم قرّر بناءً على الأدلّة.\n\n' +
        'ℹ️ *النظام يعمل بوضع محلّي لأن خادم الذكاء الاصطناعي غير مشغّل. لتشغيله: انقر مرّتين على ملف START_AUS.bat على سطح المكتب.*';
}

// ── Entry ──────────────────────────────────────────────────────────────────────────
function renderStudyAssistant() {
    var c = document.getElementById('studyContent');
    if (!c) return;
    if (_study.state === 'active') { _studyRenderActive(); }
    else { _studyRenderSetup(); }
}

// ── Setup form ─────────────────────────────────────────────────────────────────────
function _studyRenderSetup() {
    _study.state = 'setup';
    var c = document.getElementById('studyContent');
    if (!c) return;
    c.innerHTML =
        '<div class="study-wrap" style="animation:cdnaSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) both">' +
        '<div class="study-setup prox-glow">' +
        '<div class="border-beam-el"></div>' +
        '<div class="study-setup-title">📚 مساعد الدراسة الذكي</div>' +
        '<div class="study-setup-sub">ارفع ملف المحاضرة أو الصق النص — ثم اسأل أي سؤال وتفاعل مع الذكاء الاصطناعي</div>' +
        '<div class="study-upload-zone" id="studyDropZone" onclick="document.getElementById(\'studyFileInput\').click()" ' +
        'ondragover="event.preventDefault();this.classList.add(\'drag-over\')" ' +
        'ondragleave="this.classList.remove(\'drag-over\')" ondrop="handleStudyDrop(event)">' +
        '<input type="file" class="study-file-hidden" id="studyFileInput" accept=".txt,.pdf,.md" onchange="handleStudyFile(this)" />' +
        '<div class="study-upload-icon" id="studyUploadIcon">📄</div>' +
        '<div class="study-upload-text">اسحب الملف هنا أو اضغط للاختيار</div>' +
        '<div class="study-upload-sub">TXT · PDF · Markdown</div>' +
        '<div id="studyFileBadge" style="display:none" class="study-file-badge"><i class="fas fa-check-circle"></i> <span id="studyFileName"></span></div>' +
        '</div>' +
        '<label class="study-label">أو الصق محتوى المادة الدراسية مباشرة</label>' +
        '<textarea class="study-textarea" id="studyTextArea" rows="5" placeholder="الصق هنا محتوى الكتاب أو المحاضرة..."></textarea>' +
        '<div class="study-field-row">' +
        '<div style="flex:1"><label class="study-label">اسم المادة / الموضوع</label>' +
        '<input class="study-input" id="studySubject" type="text" placeholder="مثال: إدارة التسويق — الفصل الثالث" /></div>' +
        '<div style="flex:0 0 150px"><label class="study-label">مستوى الشرح</label>' +
        '<select class="study-select" id="studyLevel">' +
        '<option value="مبسّط">مبسّط</option><option value="متوسط" selected>متوسط</option><option value="متقدم">متقدم</option>' +
        '</select></div></div>' +
        '<button class="study-start-btn" onclick="startStudySession()"><i class="fas fa-brain"></i> ابدأ الجلسة الدراسية</button>' +
        '</div></div>';
}

function handleStudyDrop(e) {
    e.preventDefault();
    var z = document.getElementById('studyDropZone');
    if (z) z.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) _processStudyFile(e.dataTransfer.files[0]);
}
function handleStudyFile(input) {
    if (input.files && input.files.length) _processStudyFile(input.files[0]);
}
function _processStudyFile(file) {
    _study.fileName = file.name;
    var icon  = document.getElementById('studyUploadIcon');
    var badge = document.getElementById('studyFileBadge');
    var name  = document.getElementById('studyFileName');
    if (icon)  icon.textContent  = '✅';
    if (badge) badge.style.display = 'inline-flex';
    if (name)  name.textContent  = file.name;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var raw = ev.target.result || '';
        var ratio = (raw.match(/[؀-ۿa-zA-Z0-9\s.,!?]/g)||[]).length / Math.max(raw.length,1);
        if (ratio > 0.2 && raw.length > 30) {
            var clean = raw.replace(/[^؀-ۿa-zA-Z0-9\s\n.,!?،؟:;"'()\-]/g,' ').replace(/\s{4,}/g,'\n').trim();
            var ta = document.getElementById('studyTextArea');
            if (ta && !ta.value.trim()) ta.value = clean.slice(0, 9000);
        } else {
            showToast('الصق المحتوى يدوياً في المربع أدناه', 'info');
        }
    };
    if (/\.(txt|md)$/i.test(file.name)) reader.readAsText(file, 'utf-8');
    else reader.readAsBinaryString(file);
}

// ── Start session ─────────────────────────────────────────────────────────────────
function startStudySession() {
    var ta      = document.getElementById('studyTextArea');
    var subjEl  = document.getElementById('studySubject');
    var levelEl = document.getElementById('studyLevel');
    var content = ta ? ta.value.trim() : '';
    var subject = (subjEl ? subjEl.value.trim() : '') || _study.fileName || 'مادة دراسية';
    var level   = levelEl ? levelEl.value : 'متوسط';
    if (!content && !_study.fileName) { showToast('الصق النص الدراسي أو ارفع ملفاً أولاً', 'error'); return; }
    _study.subject     = subject;
    _study.level       = level;
    _study.content     = content.slice(0, 8000);
    _study.state       = 'active';
    _study.mode        = 'chat';
    _study.messages    = [];
    _study.flashcards  = [];
    _study.currentCard = 0;
    _study.quiz        = [];
    _study.currentQuiz = 0;
    _study.summaryText = '';
    _study.planText    = '';
    _study.streaming   = false;
    _studyRenderActive();
    setTimeout(function() { _studyStreamWelcome(); }, 200);
}

// ── Main active view ──────────────────────────────────────────────────────────────
function _studyRenderActive() {
    var c = document.getElementById('studyContent');
    if (!c) return;
    var tabs = STUDY_MODES.map(function(m) {
        return '<button class="study-mode-tab' + (_study.mode === m.id ? ' active' : '') +
               '" onclick="switchStudyMode(\'' + m.id + '\')"><i class="' + m.icon + '"></i> ' + m.label + '</button>';
    }).join('');
    var wc = _study.content.split(/\s+/).filter(Boolean).length;
    c.innerHTML =
        '<div class="study-wrap" style="animation:cdnaSlideIn 0.35s both">' +
        '<div class="study-content-hdr">' +
        '<div class="study-subject-tag"><i class="fas fa-book-open" style="margin-left:6px"></i>' + _study.subject + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
        (wc > 20 ? '<span class="study-wc-badge">' + wc + ' كلمة</span>' : '') +
        '<button class="study-reset-btn" onclick="resetStudy()"><i class="fas fa-redo-alt"></i> مادة جديدة</button>' +
        '</div></div>' +
        '<div class="study-mode-tabs">' + tabs + '</div>' +
        '<div id="studyModeBody"></div>' +
        '</div>';
    _studyRenderBody();
}

function _studyRenderBody() {
    var body = document.getElementById('studyModeBody');
    if (!body) return;
    if      (_study.mode === 'chat')    body.innerHTML = _studyBuildChat();
    else if (_study.mode === 'cards')   body.innerHTML = _studyBuildCards();
    else if (_study.mode === 'quiz')    body.innerHTML = _studyBuildQuiz();
    else if (_study.mode === 'summary') body.innerHTML = _studyBuildSummary();
    else if (_study.mode === 'plan')    body.innerHTML = _studyBuildPlan();

    if (_study.mode === 'chat') {
        var ca = document.getElementById('studyChatArea');
        if (ca) ca.scrollTop = ca.scrollHeight;
    }
    if (_study.mode === 'cards'   && !_study.flashcards.length)  _generateFlashcards();
    if (_study.mode === 'quiz'    && !_study.quiz.length)         _generateQuiz();
    if (_study.mode === 'summary' && !_study.summaryText)         _generateStudySummary();
    if (_study.mode === 'plan'    && !_study.planText)            _generateStudyPlan();
}

function switchStudyMode(mode) {
    _study.mode = mode;
    var tabs = document.querySelectorAll('.study-mode-tab');
    tabs.forEach(function(t,i){ t.classList.toggle('active', STUDY_MODES[i].id === mode); });
    _studyRenderBody();
}

// ═══════════════════════════════════════════════════════════════════════════════════
// CHAT — SSE Streaming, smart AI
// ═══════════════════════════════════════════════════════════════════════════════════
function _studyBuildChat() {
    var bubbles = _study.messages.map(function(m) {
        if (m.role === 'user') {
            return '<div class="study-bubble user"><div class="study-bubble-content">' + (m.text||'').replace(/</g,'&lt;') + '</div></div>';
        }
        return '<div class="study-bubble ai" id="' + (m.id||'') + '">' +
               '<div class="study-ai-avatar">🤖</div>' +
               '<div class="study-bubble-content">' + (m.html || _studyMd(m.text||'')) + '</div>' +
               '</div>';
    }).join('');

    var hasContent = !!_study.content;
    var quicks = hasContent ? [
        'اشرح المفهوم الرئيسي', 'ما أهم نقاط الحفظ؟',
        'أعطني مثالاً تطبيقياً', 'لخّص المحتوى في 5 نقاط'
    ] : [
        'اشرح لي مفهوم SWOT', 'ما الفرق بين القائد والمدير؟',
        'اشرح نظرية ماسلو', 'ما أهم مبادئ التسويق الرقمي؟'
    ];

    var quickBtns = quicks.map(function(q) {
        return '<button class="study-quick-btn" onclick="sendStudyQuick(this.textContent)">' + q + '</button>';
    }).join('');

    return '<div class="study-chat-wrap">' +
           '<div class="study-chat-area" id="studyChatArea">' +
           (bubbles || '<div class="study-bubble ai" style="opacity:0.5"><div class="study-ai-avatar">🤖</div><div class="study-bubble-content">أهلاً! اسألني أي شيء عن المادة. 📖</div></div>') +
           '</div>' +
           '<div class="study-quick-row" id="studyQuickRow">' + quickBtns + '</div>' +
           '<div class="study-chat-input-row">' +
           '<button class="study-send-btn" id="studySendBtn" onclick="sendStudyMessage()" aria-label="إرسال"><i class="fas fa-paper-plane"></i></button>' +
           '<textarea class="study-chat-input" id="studyChatInput" rows="1" placeholder="اكتب سؤالك هنا..." ' +
           'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendStudyMessage()}" ' +
           'oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,120)+\'px\'"></textarea>' +
           '</div></div>';
}

function sendStudyQuick(text) {
    var inp = document.getElementById('studyChatInput');
    if (inp) { inp.value = text; sendStudyMessage(); }
}

async function sendStudyMessage() {
    var inp = document.getElementById('studyChatInput');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text || _study.streaming) return;
    inp.value = ''; inp.style.height = 'auto';

    var qr = document.getElementById('studyQuickRow');
    if (qr) qr.style.display = 'none';

    _study.messages.push({ role:'user', text: text });
    var ca = document.getElementById('studyChatArea');
    if (!ca) return;
    ca.insertAdjacentHTML('beforeend',
        '<div class="study-bubble user"><div class="study-bubble-content">' + text.replace(/</g,'&lt;') + '</div></div>');
    ca.scrollTop = ca.scrollHeight;

    var aiId = 'sb_' + Date.now();
    ca.insertAdjacentHTML('beforeend',
        '<div class="study-bubble ai" id="' + aiId + '">' +
        '<div class="study-ai-avatar">🤖</div>' +
        '<div class="study-bubble-content" id="' + aiId + '_txt">' +
        '<span class="study-typing"><span></span><span></span><span></span></span>' +
        '</div></div>');
    ca.scrollTop = ca.scrollHeight;

    var sendBtn = document.getElementById('studySendBtn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    _study.streaming = true;

    var ctxSnip = _study.content ? '\n\nمحتوى المادة الدراسية:\n"""\n' + _study.content.slice(0, 3000) + '\n"""' : '';
    var history = _study.messages.slice(-10)
        .filter(function(m){ return m.role==='user'||m.role==='ai'; })
        .map(function(m){ return (m.role==='user'?'الطالب: ':'المساعد: ') + (m.text||'').slice(0,250); })
        .join('\n');
    var prompt =
        'أنت مساعد دراسي ذكي لمادة "' + _study.subject + '" — مستوى الشرح: ' + _study.level + '.' + ctxSnip +
        '\n\nسجل المحادثة:\n' + history +
        '\n\nسؤال الطالب الآن: ' + text +
        '\n\nتعليمات الرد:\n' +
        '• أجب بذكاء وبشكل مفيد ومفصّل حسب نوع السؤال\n' +
        '• إذا كان السؤال عن تعريف: أعطِ تعريفاً واضحاً + مثال\n' +
        '• إذا كان طلب مقارنة: قارن في نقاط واضحة\n' +
        '• إذا كان طلب ملخص: لخّص بنقاط منظّمة\n' +
        '• إذا كان سؤالاً مفتوحاً: فسّر واشرح وأعطِ رأياً\n' +
        '• استخدم **النص العريض** للمفاهيم المهمة و- للنقاط\n' +
        '• الرد بالعربية بوضوح وعمق فعلي يفيد الطالب.';

    var aiTextEl = document.getElementById(aiId + '_txt');
    var fullText = '';

    try {
        _study.streamCtrl = new AbortController();
        var streamRes = await fetch(CHAT_API_BASE + '/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, language: 'ar' }),
            signal: _study.streamCtrl.signal,
        });
        if (!streamRes.ok || !streamRes.body) throw new Error('stream_fail');

        if (aiTextEl) aiTextEl.innerHTML = '';
        var reader = streamRes.body.getReader();
        var decoder = new TextDecoder();
        var buf = '';

        while (true) {
            var _r = await reader.read();
            if (_r.done) break;
            buf += decoder.decode(_r.value, { stream: true });
            var lines = buf.split('\n');
            buf = lines.pop();
            for (var li = 0; li < lines.length; li++) {
                var line = lines[li].trim();
                if (!line || !line.startsWith('data:')) continue;
                var raw = line.slice(5).trim();
                if (raw === '[DONE]') break;
                try {
                    var chunk = JSON.parse(raw);
                    var tok = chunk.text || chunk.token || chunk.delta || chunk.content || '';
                    if (tok) {
                        fullText += tok;
                        if (aiTextEl) {
                            aiTextEl.innerHTML = _studyMd(fullText);
                            ca.scrollTop = ca.scrollHeight;
                        }
                    }
                } catch (_) {}
            }
        }
    } catch (_streamErr) {
        try {
            var fallRes = await fetch(CHAT_API_BASE + '/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, language: 'ar' }),
            });
            if (!fallRes.ok) throw new Error();
            var fallData = await fallRes.json();
            fullText = ((fallData.text || fallData.response || fallData.content || '') + '').trim();
            if (aiTextEl) {
                aiTextEl.innerHTML = '';
                for (var ci = 0; ci < fullText.length; ci++) {
                    await new Promise(function(r){ setTimeout(r, 8); });
                    aiTextEl.innerHTML = _studyMd(fullText.slice(0, ci+1));
                    if (ci % 30 === 0) ca.scrollTop = ca.scrollHeight;
                }
            }
        } catch (_fallErr) {
            // Backend fully down → generate a useful client-side answer (never a dead error)
            fullText = _studyLocalAnswer(text, _study.subject);
            if (aiTextEl) {
                aiTextEl.innerHTML = '';
                for (var cj = 0; cj < fullText.length; cj++) {
                    await new Promise(function(r){ setTimeout(r, 6); });
                    aiTextEl.innerHTML = _studyMd(fullText.slice(0, cj + 1));
                    if (cj % 30 === 0) ca.scrollTop = ca.scrollHeight;
                }
            }
        }
    }

    _study.messages.push({ role:'ai', text: fullText, html: _studyMd(fullText), id: aiId });
    _study.streaming = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; }
    ca.scrollTop = ca.scrollHeight;
}

async function _studyStreamWelcome() {
    var ca = document.getElementById('studyChatArea');
    if (!ca) return;
    var hasContent = !!_study.content;
    var welcomeId = 'sw_' + Date.now();
    var contentPreview = hasContent ? ' لقد استلمت المحتوى (' + Math.round(_study.content.split(/\s+/).length) + ' كلمة).' : '';
    ca.insertAdjacentHTML('beforeend',
        '<div class="study-bubble ai" id="' + welcomeId + '">' +
        '<div class="study-ai-avatar">🤖</div>' +
        '<div class="study-bubble-content" id="' + welcomeId + '_txt">' +
        '<span class="study-typing"><span></span><span></span><span></span></span>' +
        '</div></div>');
    ca.scrollTop = ca.scrollHeight;

    var welcome =
        '📚 مرحباً! أنا مساعدك الدراسي الذكي لمادة **' + _study.subject + '**.' + contentPreview + '\n\n' +
        'يمكنني:\n' +
        '- **شرح** أي مفهوم بمستوى ' + _study.level + '\n' +
        '- **الإجابة** على أسئلتك فوراً\n' +
        '- **توليد بطاقات تعليمية** و**اختبارات** من المحتوى\n' +
        '- **إعداد ملخص** و**خطة دراسة** مخصصة\n\n' +
        'اسألني أي شيء! 🎓';

    var el = document.getElementById(welcomeId + '_txt');
    if (el) {
        el.innerHTML = '';
        for (var i = 0; i < welcome.length; i++) {
            await new Promise(function(r){ setTimeout(r, 8); });
            el.innerHTML = _studyMd(welcome.slice(0, i+1));
            if (i % 25 === 0) ca.scrollTop = ca.scrollHeight;
        }
    }
    _study.messages.push({ role:'ai', text: welcome, html: _studyMd(welcome), id: welcomeId });
    ca.scrollTop = ca.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════════════════
// FLASHCARDS
// ═══════════════════════════════════════════════════════════════════════════════════
function _studyBuildCards() {
    if (!_study.flashcards.length) {
        return '<div class="study-generating"><div class="study-generating-icon">🃏</div>' +
               '<div class="study-typing-bar"><span></span><span></span><span></span></div>' +
               '<div class="study-generating-txt">جاري توليد البطاقات التعليمية بالذكاء الاصطناعي...</div></div>';
    }
    var idx = _study.currentCard, total = _study.flashcards.length, card = _study.flashcards[idx];
    return '<div class="study-card-wrap">' +
           '<div class="study-card-hint-top">اضغط على البطاقة لعرض الإجابة</div>' +
           '<div class="study-card-scene" onclick="flipStudyCard()">' +
           '<div class="study-card-inner' + (card.flipped ? ' flipped' : '') + '" id="studyCardInner">' +
           '<div class="study-card-face study-card-front">' +
           '<div class="study-card-label">⬡ السؤال</div>' +
           '<div class="study-card-text">' + card.front + '</div>' +
           '<div class="study-card-flip-hint"><i class="fas fa-sync-alt"></i> اضغط للإجابة</div>' +
           '</div>' +
           '<div class="study-card-face study-card-back">' +
           '<div class="study-card-label" style="color:rgba(157,78,221,0.9)">⬡ الإجابة</div>' +
           '<div class="study-card-text">' + _studyMd(card.back) + '</div>' +
           '<div class="study-card-flip-hint" style="color:rgba(157,78,221,0.4)"><i class="fas fa-sync-alt"></i> اضغط للعودة</div>' +
           '</div></div></div>' +
           '<div class="study-card-nav">' +
           '<button class="study-card-next" onclick="nextStudyCard()" ' + (idx >= total-1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
           '<div class="study-card-counter">' + (idx+1) + ' / ' + total + '</div>' +
           '<button class="study-card-prev" onclick="prevStudyCard()" ' + (idx <= 0 ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
           '</div>' +
           '<div style="text-align:center;margin-top:0.8rem">' +
           '<button class="study-quiz-next-btn" onclick="regenerateFlashcards()"><i class="fas fa-sync-alt"></i> بطاقات جديدة</button>' +
           '</div></div>';
}

function flipStudyCard() {
    var idx = _study.currentCard;
    if (!_study.flashcards[idx]) return;
    _study.flashcards[idx].flipped = !_study.flashcards[idx].flipped;
    var inner = document.getElementById('studyCardInner');
    if (inner) inner.classList.toggle('flipped', _study.flashcards[idx].flipped);
}
function prevStudyCard() { if (_study.currentCard > 0) { _study.currentCard--; _study.flashcards[_study.currentCard].flipped=false; _studyRenderBody(); } }
function nextStudyCard() { if (_study.currentCard < _study.flashcards.length-1) { _study.currentCard++; _study.flashcards[_study.currentCard].flipped=false; _studyRenderBody(); } }
function regenerateFlashcards() { _study.flashcards=[]; _study.currentCard=0; _studyRenderBody(); }

async function _generateFlashcards() {
    var ctx = _study.content ? '\n\nالمحتوى:\n"""\n' + _study.content.slice(0,2500) + '\n"""' : '';
    var prompt =
        'بناءً على مادة "' + _study.subject + '"' + ctx +
        '\n\nأنشئ 10 بطاقات تعليمية متنوعة تغطي المفاهيم الرئيسية بعمق.\n' +
        'أجب بـ JSON مصفوفة فقط بدون أي نص خارجها:\n' +
        '[{"front":"سؤال أو مصطلح واضح","back":"إجابة شاملة مع تفاصيل كافية"}]';
    try {
        var sig; if (typeof AbortSignal.timeout==='function') sig=AbortSignal.timeout(22000);
        else { var _sc=new AbortController(); setTimeout(function(){_sc.abort();},22000); sig=_sc.signal; }
        var res = await fetch(CHAT_API_BASE+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({message:prompt,language:'ar'}),signal:sig});
        if(!res.ok) throw new Error();
        var data=await res.json();
        var text=((data.text||data.response||data.content||'')+'').trim().replace(/^```[\w]*\n?/,'').replace(/\n?```$/,'');
        var m=text.match(/\[[\s\S]*\]/);
        if(m){var arr=JSON.parse(m[0]);if(Array.isArray(arr)&&arr.length){
            _study.flashcards=arr.map(function(fc){return{front:String(fc.front||''),back:String(fc.back||''),flipped:false};});
            _study.currentCard=0; _studyRenderBody(); return;
        }}
    } catch(_e) {}
    _study.flashcards=[
        {front:'ما هو الموضوع الرئيسي لـ "'+_study.subject+'"؟',back:'راجع المحتوى وحدّد الفكرة المحورية للمادة.',flipped:false},
        {front:'اذكر 3 مفاهيم أساسية من المادة',back:'لخّص النقاط الثلاث الأهم بكلماتك الخاصة.',flipped:false},
        {front:'ما التطبيق العملي لهذا الموضوع؟',back:'فكّر في تطبيق هذه المعرفة في بيئة العمل الفعلية.',flipped:false},
    ];
    _studyRenderBody();
}

// ═══════════════════════════════════════════════════════════════════════════════════
// QUIZ (MCQ)
// ═══════════════════════════════════════════════════════════════════════════════════
function _studyBuildQuiz() {
    if (!_study.quiz.length) {
        return '<div class="study-generating"><div class="study-generating-icon">❓</div>' +
               '<div class="study-typing-bar"><span></span><span></span><span></span></div>' +
               '<div class="study-generating-txt">جاري توليد أسئلة الاختبار...</div></div>';
    }
    var idx=_study.currentQuiz, total=_study.quiz.length;
    if (idx >= total) return _studyBuildQuizResult();
    var qd=_study.quiz[idx], pct=Math.round((idx/total)*100), answered=qd.selected!==null&&qd.selected!==undefined;
    var opts = (qd.opts||[]).map(function(opt,oi){
        var cls='study-quiz-opt';
        if(answered){ cls+=' answered'; if(oi===qd.correct) cls+=' correct'; else if(oi===qd.selected) cls+=' wrong'; }
        return '<button class="'+cls+'" onclick="selectStudyQuizAnswer('+oi+')">'+opt+'</button>';
    }).join('');
    var exp = answered && qd.explanation ? '<div class="study-quiz-exp"><i class="fas fa-lightbulb"></i> '+qd.explanation+'</div>' : '';
    return '<div class="study-quiz-wrap">' +
           '<div class="study-quiz-bar"><div class="study-quiz-bar-fill" style="width:'+pct+'%"></div></div>' +
           '<div class="study-quiz-progress">السؤال '+(idx+1)+' من '+total+'</div>' +
           '<div class="study-quiz-card">' +
           '<div class="study-quiz-qnum">⬡ سؤال '+(idx+1)+'</div>' +
           '<div class="study-quiz-q">'+qd.q+'</div>' +
           '<div class="study-quiz-opts">'+opts+'</div>' + exp +
           (answered ? '<div style="text-align:center;margin-top:1rem"><button class="study-quiz-next-btn" onclick="nextStudyQuizQ()">'+
               (idx+1>=total?'<i class="fas fa-flag-checkered"></i> النتيجة':'<i class="fas fa-arrow-left"></i> التالي')+
               '</button></div>' : '') +
           '</div></div>';
}

function _studyBuildQuizResult() {
    var score=_study.quiz.reduce(function(s,q){return s+(q.selected===q.correct?1:0);},0);
    var total=_study.quiz.length, pct=Math.round(score/total*100);
    var grade=pct>=90?'ممتاز 🌟':pct>=75?'جيد جداً 👏':pct>=60?'جيد 👍':'راجع المادة 📖';
    var clr=pct>=75?'var(--primary)':pct>=60?'#ffd60a':'#ff006e';
    return '<div class="study-quiz-result prox-glow" style="position:relative;overflow:hidden">' +
           '<div class="border-beam-el"></div>' +
           '<div class="study-quiz-score" style="color:'+clr+'">'+pct+'%</div>' +
           '<div style="font-family:\'Orbitron\',sans-serif;font-size:0.75rem;letter-spacing:0.1em;color:rgba(255,255,255,0.5);margin:0.4rem 0">'+grade+'</div>' +
           '<div style="font-size:0.9rem;color:rgba(255,255,255,0.4)">'+score+' من '+total+' صحيحة</div>' +
           '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:1.2rem">' +
           '<button class="study-quiz-next-btn" onclick="retakeStudyQuiz()"><i class="fas fa-redo-alt"></i> إعادة</button>' +
           '<button class="study-quiz-next-btn" onclick="regenerateStudyQuiz()"><i class="fas fa-sync-alt"></i> أسئلة جديدة</button>' +
           '</div></div>';
}

function selectStudyQuizAnswer(oi) {
    var qd=_study.quiz[_study.currentQuiz];
    if (!qd || (qd.selected!==null&&qd.selected!==undefined)) return;
    qd.selected=oi; _studyRenderBody();
}
function nextStudyQuizQ() { _study.currentQuiz++; _studyRenderBody(); }
function retakeStudyQuiz() { _study.quiz.forEach(function(q){q.selected=null;}); _study.currentQuiz=0; _studyRenderBody(); }
function regenerateStudyQuiz() { _study.quiz=[]; _study.currentQuiz=0; _studyRenderBody(); }

async function _generateQuiz() {
    var ctx=_study.content?'\n\nمحتوى المادة:\n"""\n'+_study.content.slice(0,2500)+'\n"""':'';
    var prompt=
        'بناءً على مادة "'+_study.subject+'"'+ctx+
        '\n\nأنشئ 8 أسئلة اختيار متعدد MCQ متنوعة ومتدرجة الصعوبة. أجب بـ JSON مصفوفة فقط:\n'+
        '[{"q":"السؤال؟","opts":["أ","ب","ج","د"],"correct":0,"explanation":"شرح مختصر للإجابة"}]\n'+
        'قواعد إلزامية للخيارات:\n'+
        '• اجعل الخيارات الأربعة متقاربة جداً في عدد الكلمات (فرق لا يتجاوز كلمتين بينها)\n'+
        '• لا تجعل الإجابة الصحيحة أطول أو أكثر تفصيلاً من الخيارات الخاطئة\n'+
        '• اجعل الخيارات الخاطئة معقولة ومحتملة (distractors قويّة) لا سخيفة أو واضحة الخطأ\n'+
        '• وزّع موضع الإجابة الصحيحة عشوائياً بين 0 و1 و2 و3 عبر الأسئلة';
    try {
        var sig; if(typeof AbortSignal.timeout==='function') sig=AbortSignal.timeout(22000);
        else{var _sq=new AbortController();setTimeout(function(){_sq.abort();},22000);sig=_sq.signal;}
        var res=await fetch(CHAT_API_BASE+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({message:prompt,language:'ar'}),signal:sig});
        if(!res.ok) throw new Error();
        var data=await res.json();
        var text=((data.text||data.response||data.content||'')+'').trim().replace(/^```[\w]*\n?/,'').replace(/\n?```$/,'');
        var m=text.match(/\[[\s\S]*\]/);
        if(m){var arr=JSON.parse(m[0]);if(Array.isArray(arr)&&arr.length){
            _study.quiz=arr.map(function(q){return{
                q:String(q.q||''),opts:Array.isArray(q.opts)?q.opts.map(String):[],
                correct:parseInt(q.correct||0,10),selected:null,
                explanation:String(q.explanation||'')
            };});
            _study.currentQuiz=0; _studyRenderBody(); return;
        }}
    } catch(_e){}
    _study.quiz=[
        {q:'ما الموضوع الرئيسي لـ "'+_study.subject+'"؟',opts:['خيار أ','خيار ب','خيار ج','خيار د'],correct:0,selected:null,explanation:'راجع المادة للإجابة الصحيحة.'},
    ];
    _studyRenderBody();
}

// ═══════════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════════
function _studyBuildSummary() {
    if (!_study.summaryText) {
        return '<div class="study-generating"><div class="study-generating-icon">📄</div>' +
               '<div class="study-typing-bar"><span></span><span></span><span></span></div>' +
               '<div class="study-generating-txt">جاري إعداد الملخص الذكي...</div></div>';
    }
    return '<div class="study-content-card">' + _studyMd(_study.summaryText) + '</div>' +
           '<div style="text-align:center;margin-top:1rem">' +
           '<button class="study-quiz-next-btn" onclick="regenerateStudySummary()"><i class="fas fa-sync-alt"></i> ملخص جديد</button>' +
           '</div>';
}
async function _generateStudySummary() {
    var ctx=_study.content?'\n\nالمحتوى:\n"""\n'+_study.content.slice(0,3000)+'\n"""':'';
    var prompt=
        'لخّص مادة "'+_study.subject+'" بمستوى '+_study.level+ctx+
        '\n\nاكتب ملخصاً شاملاً ومنظّماً بالعربية يشمل:\n'+
        '**الفكرة الرئيسية**: جملة محورية\n'+
        '**المفاهيم الأساسية**: قائمة منظمة بالتعريفات\n'+
        '**النقاط المهمة للحفظ**: أبرز ما يجب حفظه\n'+
        '**أمثلة تطبيقية**: مثال أو مثالان\n'+
        '**خلاصة**: جمل ختامية\n'+
        'اجعل الملخص مفيداً فعلاً للطالب في الامتحان.';
    try {
        var sig; if(typeof AbortSignal.timeout==='function') sig=AbortSignal.timeout(22000);
        else{var _ss=new AbortController();setTimeout(function(){_ss.abort();},22000);sig=_ss.signal;}
        var res=await fetch(CHAT_API_BASE+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({message:prompt,language:'ar'}),signal:sig});
        if(!res.ok) throw new Error();
        var data=await res.json();
        var text=((data.text||data.response||data.content||'')+'').trim();
        if(text){_study.summaryText=text;_studyRenderBody();return;}
    } catch(_e){}
    _study.summaryText='**'+_study.subject+'** — ملخص\n\n**الفكرة الرئيسية**: تعذّر الاتصال. راجع المحتوى مباشرة.\n\n**المفاهيم الأساسية**:\n- المفهوم الأول\n- المفهوم الثاني\n- المفهوم الثالث';
    _studyRenderBody();
}
function regenerateStudySummary() { _study.summaryText=''; _studyRenderBody(); }

// ═══════════════════════════════════════════════════════════════════════════════════
// STUDY PLAN
// ═══════════════════════════════════════════════════════════════════════════════════
function _studyBuildPlan() {
    if (!_study.planText) {
        return '<div class="study-generating"><div class="study-generating-icon">📅</div>' +
               '<div class="study-typing-bar"><span></span><span></span><span></span></div>' +
               '<div class="study-generating-txt">جاري إعداد خطة الدراسة المخصصة...</div></div>';
    }
    return '<div class="study-content-card" style="border-color:rgba(255,214,10,0.18)">' + _studyMd(_study.planText) + '</div>' +
           '<div style="text-align:center;margin-top:1rem">' +
           '<button class="study-quiz-next-btn" onclick="regenerateStudyPlan()"><i class="fas fa-sync-alt"></i> خطة جديدة</button>' +
           '</div>';
}
async function _generateStudyPlan() {
    var ctx=_study.content?'\n\nمحتوى المادة:\n"""\n'+_study.content.slice(0,2000)+'\n"""':'';
    var prompt=
        'أنشئ خطة دراسة أسبوعية مخصصة ومفصّلة لمادة "'+_study.subject+'" بمستوى '+_study.level+ctx+
        '\n\nاكتب خطة عملية واضحة بالعربية تشمل:\n'+
        '**الهدف الأسبوعي**: ما سيتعلمه الطالب\n'+
        '**الجلسة اليومية المقترحة**: بالدقائق\n'+
        '**جدول الأيام السبعة**: هدف محدد لكل يوم\n'+
        '**أسلوب المراجعة**: تقنية فعّالة (بومودورو، SQ3R، الخرائط الذهنية...)\n'+
        '**نصيحة قبل الاختبار**: نصيحة ذهبية واحدة\n'+
        'كن عملياً وواقعياً.';
    try {
        var sig; if(typeof AbortSignal.timeout==='function') sig=AbortSignal.timeout(22000);
        else{var _sp=new AbortController();setTimeout(function(){_sp.abort();},22000);sig=_sp.signal;}
        var res=await fetch(CHAT_API_BASE+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({message:prompt,language:'ar'}),signal:sig});
        if(!res.ok) throw new Error();
        var data=await res.json();
        var text=((data.text||data.response||data.content||'')+'').trim();
        if(text){_study.planText=text;_studyRenderBody();return;}
    } catch(_e){}
    _study.planText='**خطة دراسة أسبوعية — '+_study.subject+'**\n\n**45 دقيقة يومياً**\n\n- الأحد: قراءة أولية\n- الاثنين: دراسة مفصّلة\n- الثلاثاء: أمثلة تطبيقية\n- الأربعاء: مراجعة\n- الخميس: بطاقات تعلّم\n- الجمعة: اختبار ذاتي\n- السبت: مراجعة نهائية';
    _studyRenderBody();
}
function regenerateStudyPlan() { _study.planText=''; _studyRenderBody(); }

// ── Reset ─────────────────────────────────────────────────────────────────────────
function resetStudy() {
    if (_study.streamCtrl) { try{_study.streamCtrl.abort();}catch(_){} }
    Object.assign(_study, {
        state:'setup',subject:'',level:'متوسط',content:'',fileName:'',
        mode:'chat',messages:[],flashcards:[],currentCard:0,
        quiz:[],currentQuiz:0,summaryText:'',planText:'',
        streaming:false,streamCtrl:null,
    });
    _studyRenderSetup();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BUSINESS DASHBOARD — MASTER FEATURES #8
   KPI analytics, animated charts (bar+line+donut), AI insights, goal tracking
   Entry: renderDashboard()
═══════════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────────────
var _dash = {
    period:        'monthly',  // weekly | monthly | yearly
    aiInsightText: '',
    aiLoading:     false,
};

// ── Realistic Period Data ─────────────────────────────────────────────────────────
// Each period has DISTINCT scale + realistic numbers + matching KPIs/segments/goals
var DASH_DATA = {
    weekly: {
        title:  'الأداء الأسبوعي',
        sub:    'آخر 7 أيام · بيانات يومية حية',
        labels:  ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'],
        revenue: [9800, 12400, 15600, 14200, 18900, 21500, 16700],
        profit:  [2940, 3720, 4680, 4260, 5670, 6450, 5010],
        users:   [124, 156, 182, 198, 234, 287, 312],
        kpis: [
            { id:'revenue', icon:'💰', label:'إيرادات الأسبوع', suffix:' ر.س', value:109100, prev:94600,  color:'#00d4ff', fmt:'comma' },
            { id:'users',   icon:'👥', label:'عملاء جدد',        suffix:'',      value:312,    prev:268,    color:'#9d4edd', fmt:'comma' },
            { id:'growth',  icon:'📈', label:'نمو يومي',         suffix:'%',     value:6.4,    prev:5.1,    color:'#00f5d4', fmt:'dec1' },
            { id:'score',   icon:'⭐', label:'الأداء الأسبوعي',  suffix:'/100',  value:78,     prev:74,     color:'#ffd60a', fmt:'int'  },
        ],
        segments: [
            { name:'مبيعات يومية',  pct:42, color:'#00d4ff' },
            { name:'استشارات',     pct:28, color:'#9d4edd' },
            { name:'اشتراكات',     pct:18, color:'#00f5d4' },
            { name:'خدمات أخرى',   pct:12, color:'#ffd60a' },
        ],
        goals: [
            { name:'هدف إيرادات الأسبوع',  pct:88, color:'#00d4ff' },
            { name:'عملاء جدد هذا الأسبوع', pct:104, color:'#00f5d4' },
            { name:'اتصالات المتابعة',     pct:76, color:'#9d4edd' },
            { name:'حضور الفريق',          pct:96, color:'#ffd60a' },
            { name:'معدل الرد على العملاء', pct:82, color:'#ff006e' },
        ],
        activity: [
            { text:'صفقة 8,500 ر.س مع عميل جديد مكتملة', time:'منذ 15 د', color:'#00f5d4' },
            { text:'31 استفسار جديد اليوم — معدل قياسي', time:'منذ ساعة', color:'#00d4ff' },
            { text:'اجتماع أسبوعي: مراجعة أهداف الفريق', time:'منذ 3 س', color:'#9d4edd' },
            { text:'إطلاق حملة تسويقية يوم الخميس', time:'أمس', color:'#ffd60a' },
            { text:'تحقيق 88% من هدف الأسبوع المالي', time:'أمس', color:'#00f5d4' },
            { text:'تدريب فريق المبيعات على CRM الجديد', time:'قبل يومين', color:'#ff006e' },
        ],
    },
    monthly: {
        title:  'الأداء الشهري',
        sub:    'آخر 6 أشهر · اتجاهات شهرية',
        labels:  ['يناير','فبراير','مارس','أبريل','مايو','يونيو'],
        revenue: [180000, 210000, 195000, 250000, 230000, 284500],
        profit:  [45000,  62000,  55000,  78000,  71000,  92000],
        users:   [980,    1100,   1050,   1320,   1580,   1847],
        kpis: [
            { id:'revenue', icon:'💰', label:'إيرادات الشهر',    suffix:' ر.س', value:284500, prev:241200, color:'#00d4ff', fmt:'comma' },
            { id:'users',   icon:'👥', label:'إجمالي العملاء',   suffix:'',      value:1847,   prev:1523,   color:'#9d4edd', fmt:'comma' },
            { id:'growth',  icon:'📈', label:'نمو شهري',          suffix:'%',     value:18.2,   prev:15.4,   color:'#00f5d4', fmt:'dec1' },
            { id:'score',   icon:'⭐', label:'الأداء الشهري',     suffix:'/100',  value:87,     prev:82,     color:'#ffd60a', fmt:'int'  },
        ],
        segments: [
            { name:'التسويق',  pct:32, color:'#00d4ff' },
            { name:'المبيعات', pct:28, color:'#9d4edd' },
            { name:'التشغيل',  pct:22, color:'#00f5d4' },
            { name:'البحث',    pct:18, color:'#ffd60a' },
        ],
        goals: [
            { name:'هدف الإيرادات الشهري', pct:92, color:'#00d4ff' },
            { name:'رضا العملاء',          pct:87, color:'#00f5d4' },
            { name:'اكتساب عملاء جدد',    pct:74, color:'#9d4edd' },
            { name:'كفاءة التشغيل',        pct:81, color:'#ffd60a' },
            { name:'أهداف الفريق',         pct:68, color:'#ff006e' },
        ],
        activity: [
            { text:'صفقة 48,000 ر.س مع شركة التقنية الخليجية مكتملة', time:'منذ 2 د', color:'#00f5d4' },
            { text:'132 عميل جديد انضموا هذا الشهر', time:'منذ 1 س', color:'#00d4ff' },
            { text:'اجتماع المجلس: الإيرادات تجاوزت التوقعات بـ 18%', time:'منذ 3 س', color:'#9d4edd' },
            { text:'إطلاق منتج جديد في السوق السعودي', time:'أمس', color:'#ffd60a' },
            { text:'تقرير الأداء الشهري جاهز للمراجعة', time:'أمس', color:'#ff006e' },
            { text:'تحقيق هدف اكتساب العملاء لهذا الشهر', time:'قبل يومين', color:'#00f5d4' },
        ],
    },
    yearly: {
        title:  'الأداء السنوي',
        sub:    'آخر 5 سنوات · رؤية استراتيجية طويلة المدى',
        labels:  ['2021','2022','2023','2024','2025','2026'],
        revenue: [820000, 1450000, 2180000, 2950000, 3680000, 4520000],
        profit:  [180000, 348000, 545000, 738000, 920000, 1156000],
        users:   [1200, 2800, 5400, 9800, 14200, 19500],
        kpis: [
            { id:'revenue', icon:'💰', label:'إيرادات السنة',    suffix:' ر.س', value:4520000, prev:3680000, color:'#00d4ff', fmt:'comma' },
            { id:'users',   icon:'👥', label:'إجمالي العملاء',    suffix:'',      value:19500,   prev:14200,   color:'#9d4edd', fmt:'comma' },
            { id:'growth',  icon:'📈', label:'نمو سنوي',           suffix:'%',     value:22.8,    prev:24.7,    color:'#00f5d4', fmt:'dec1' },
            { id:'score',   icon:'⭐', label:'النضج المؤسسي',     suffix:'/100',  value:93,      prev:89,      color:'#ffd60a', fmt:'int'  },
        ],
        segments: [
            { name:'منتجات أساسية', pct:45, color:'#00d4ff' },
            { name:'خدمات سحابية', pct:25, color:'#9d4edd' },
            { name:'استشارات',     pct:18, color:'#00f5d4' },
            { name:'شراكات',       pct:12, color:'#ffd60a' },
        ],
        goals: [
            { name:'الإيرادات السنوية',     pct:108, color:'#00d4ff' },
            { name:'التوسع الجغرافي',       pct:75,  color:'#00f5d4' },
            { name:'حصة السوق',             pct:64,  color:'#9d4edd' },
            { name:'الاستدامة المالية',      pct:91,  color:'#ffd60a' },
            { name:'تطوير المنتجات',         pct:82,  color:'#ff006e' },
        ],
        activity: [
            { text:'إغلاق جولة استثمار Series B بـ 12 مليون ر.س', time:'هذا الشهر', color:'#00f5d4' },
            { text:'افتتاح المكتب الإقليمي في الإمارات', time:'قبل شهرين', color:'#00d4ff' },
            { text:'الإيرادات تجاوزت 4.5 مليون ر.س للمرة الأولى', time:'الربع الأخير', color:'#9d4edd' },
            { text:'الحصول على شهادة ISO 27001 للأمن السيبراني', time:'منذ 4 أشهر', color:'#ffd60a' },
            { text:'توسع قاعدة العملاء بنسبة 37% خلال العام', time:'2026', color:'#ff006e' },
            { text:'إطلاق منصة AI داخلية لتحسين العمليات', time:'الربع الثالث', color:'#00f5d4' },
        ],
    },
};

// ── Helpers ────────────────────────────────────────────────────────────────────────
function _dashComma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function _dashShort(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return Math.round(n / 1000) + 'K';
    return String(Math.round(n));
}
function _dashFmtKPI(kpi, val) {
    var n = kpi.fmt === 'dec1' ? val.toFixed(1) : kpi.fmt === 'comma' ? _dashComma(val) : String(Math.round(val));
    return n + kpi.suffix;
}

// ── Line SVG builder ───────────────────────────────────────────────────────────────
function _dashLineSVG(data, color, h, gradId) {
    var w = 360;
    var max  = Math.max.apply(null, data);
    var min  = Math.min.apply(null, data) * 0.88;
    var range = max - min || 1;
    var pad  = 12;
    var pts  = data.map(function(v, i) {
        return {
            x: (pad + (i / (data.length - 1)) * (w - pad * 2)).toFixed(1),
            y: ((h - pad) - ((v - min) / range) * (h - pad * 2)).toFixed(1),
        };
    });
    var line = pts.map(function(p) { return p.x + ',' + p.y; }).join(' ');
    var fill = pad + ',' + (h - pad) + ' ' + line + ' ' + (w - pad) + ',' + (h - pad);
    var dots = pts.map(function(p, i) {
        return '<circle class="dash-line-dot" cx="' + p.x + '" cy="' + p.y + '" r="3.8" fill="' + color + '" stroke="rgba(0,10,30,0.85)" stroke-width="2" style="animation-delay:' + (1.3 + i * 0.1) + 's"/>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:' + h + 'px;overflow:visible">' +
           '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
           '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.38"/>' +
           '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
           '</linearGradient></defs>' +
           '<polygon points="' + fill + '" fill="url(#' + gradId + ')"/>' +
           '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="dash-line-path"/>' +
           dots +
           '</svg>';
}

// ── Donut CSS builder ──────────────────────────────────────────────────────────────
function _dashDonutCSS(segs) {
    var stops = [];
    var acc   = 0;
    segs.forEach(function(s) {
        stops.push(s.color + ' ' + acc + '% ' + (acc + s.pct) + '%');
        acc += s.pct;
    });
    return 'conic-gradient(' + stops.join(',') + ')';
}

// ── Entry ──────────────────────────────────────────────────────────────────────────
function renderDashboard() {
    var c = document.getElementById('dashContent');
    if (!c) return;
    _dashRenderView();
}

// ── Main render ────────────────────────────────────────────────────────────────────
function _dashRenderView() {
    var c = document.getElementById('dashContent');
    if (!c) return;

    var data    = DASH_DATA[_dash.period];
    var maxRev  = Math.max.apply(null, data.revenue);
    var maxProfit = Math.max.apply(null, data.profit);

    /* ── Period tabs ── */
    var periods = [{ id:'weekly',label:'أسبوعي',icon:'📅'},{ id:'monthly',label:'شهري',icon:'🗓️'},{ id:'yearly',label:'سنوي',icon:'📆'}];
    var periodHtml = periods.map(function(p) {
        return '<button class="dash-period-tab' + (_dash.period === p.id ? ' active' : '') + '" onclick="setDashPeriod(\'' + p.id + '\')">' +
               '<span style="margin-left:5px">' + p.icon + '</span>' + p.label + '</button>';
    }).join('');

    /* ── KPI cards (period-specific) ── */
    var kpiHtml = data.kpis.map(function(kpi) {
        var chg    = ((kpi.value - kpi.prev) / kpi.prev * 100);
        var isUp   = chg >= 0;
        var chgStr = (isUp ? '▲ +' : '▼ ') + Math.abs(chg).toFixed(1) + '%';
        return '<div class="dash-kpi-card prox-glow" style="--kc:' + kpi.color + '">' +
               '<div class="border-beam-el"></div>' +
               '<div class="dash-kpi-glow"></div>' +
               '<div class="dash-kpi-top">' +
               '<span class="dash-kpi-icon">' + kpi.icon + '</span>' +
               '<span class="dash-kpi-badge ' + (isUp ? 'up' : 'down') + '">' + chgStr + '</span>' +
               '</div>' +
               '<div class="dash-kpi-value" id="dashKpi_' + kpi.id + '">—</div>' +
               '<div class="dash-kpi-label">' + kpi.label + '</div>' +
               '</div>';
    }).join('');

    /* ── Bar chart ── */
    var barCols = data.revenue.map(function(v, i) {
        var revPct    = Math.round((v / maxRev) * 100);
        var profitPct = Math.round((data.profit[i] / maxProfit) * 100);
        var lbl       = data.labels[i].replace('الأسبوع ', 'أ').replace('الربع ', 'ر');
        return '<div class="dash-bar-col">' +
               '<div class="dash-bar-val" id="dashBV_' + i + '"></div>' +
               '<div class="dash-bar-pair">' +
               '<div class="dash-bar" id="dashBR_' + i + '" style="--bh:' + revPct + '%;--bc:#00d4ff;"></div>' +
               '<div class="dash-bar" id="dashBP_' + i + '" style="--bh:' + profitPct + '%;--bc:rgba(157,78,221,0.75);"></div>' +
               '</div>' +
               '<div class="dash-bar-lbl">' + lbl + '</div>' +
               '</div>';
    }).join('');

    /* ── Line chart (users) ── */
    var lineHtml = _dashLineSVG(data.users, '#00f5d4', 118, 'dlgU' + _dash.period[0]);

    /* ── Donut (period-specific segments) ── */
    var donutBg  = _dashDonutCSS(data.segments);
    var legendHtml = data.segments.map(function(s) {
        return '<div class="dash-legend-item"><div class="dash-legend-dot" style="background:' + s.color + ';box-shadow:0 0 5px ' + s.color + '88"></div>' + s.name + ' ' + s.pct + '%</div>';
    }).join('');

    /* ── Activity (period-specific) ── */
    var actHtml = data.activity.map(function(a) {
        return '<div class="dash-activity-item">' +
               '<div class="dash-activity-dot" style="background:' + a.color + ';box-shadow:0 0 7px ' + a.color + '"></div>' +
               '<div style="flex:1">' +
               '<div class="dash-activity-text">' + a.text + '</div>' +
               '<div class="dash-activity-time">' + a.time + '</div>' +
               '</div>' +
               '</div>';
    }).join('');

    /* ── Goals (period-specific) ── */
    var goalsHtml = data.goals.map(function(g) {
        // Cap width at 100% visually but show real % in label (so >100 = exceeded goal)
        var barW = Math.min(g.pct, 100);
        return '<div class="dash-goal-item">' +
               '<div class="dash-goal-hdr">' +
               '<span class="dash-goal-name">' + g.name + '</span>' +
               '<span class="dash-goal-pct" style="color:' + g.color + '">' + g.pct + '%' +
                 (g.pct > 100 ? ' ✓' : '') + '</span>' +
               '</div>' +
               '<div class="dash-goal-bar"><div class="dash-goal-fill" data-w="' + barW + '" style="--gc:' + g.color + '"></div></div>' +
               '</div>';
    }).join('');

    /* ── AI insights ── */
    var aiHtml = _dash.aiInsightText
        ? '<div class="dash-ai-text">' + _dash.aiInsightText + '</div>'
        : '<div class="dash-ai-text loading" id="dashAiText">يقوم الذكاء الاصطناعي بتحليل بيانات الأعمال...</div>';

    /* ── Assemble ── */
    c.innerHTML =
        '<div class="dash-wrap" style="animation:cdnaSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) both">' +

        '<div class="dash-header">' +
        '<div><div class="dash-header-title">⬡ ' + data.title + ' — CEO Dashboard</div>' +
        '<div class="dash-header-sub">' + data.sub + ' · ' + new Date().toLocaleDateString('ar-SA') + '</div></div>' +
        '<div class="dash-period-tabs">' + periodHtml + '</div>' +
        '</div>' +

        '<div class="dash-kpi-grid">' + kpiHtml + '</div>' +

        '<div class="dash-charts-row">' +

        /* Bar chart card */
        '<div class="dash-chart-card">' +
        '<div class="dash-chart-hdr">' +
        '<div class="dash-chart-title">📊 الإيرادات والأرباح</div>' +
        '<div class="dash-chart-legend">' +
        '<span class="dash-chart-dot" style="background:#00d4ff"></span> إيرادات' +
        '&nbsp;&nbsp;<span class="dash-chart-dot" style="background:#9d4edd"></span> أرباح' +
        '</div></div>' +
        '<div class="dash-bar-chart">' + barCols + '</div>' +
        '</div>' +

        /* Right: line + donut */
        '<div style="display:flex;flex-direction:column;gap:1rem">' +
        '<div class="dash-chart-card">' +
        '<div class="dash-chart-title" style="margin-bottom:0.6rem">👥 نمو قاعدة العملاء</div>' +
        lineHtml +
        '</div>' +
        '<div class="dash-chart-card" style="text-align:center">' +
        '<div class="dash-chart-title" style="margin-bottom:0.8rem">🎯 توزيع الميزانية</div>' +
        '<div class="dash-donut" style="background:' + donutBg + '">' +
        '<div class="dash-donut-inner"><div class="dash-donut-pct">∑</div><div class="dash-donut-sub">موزّعة</div></div>' +
        '</div>' +
        '<div class="dash-donut-legend">' + legendHtml + '</div>' +
        '</div>' +
        '</div>' +

        '</div>' + /* end charts row */

        '<div class="dash-bottom-row">' +

        '<div class="dash-card-panel">' +
        '<div class="dash-panel-title"><span><i class="fas fa-stream" style="margin-left:6px;color:var(--primary)"></i>سجل النشاط</span></div>' +
        actHtml +
        '</div>' +

        '<div class="dash-card-panel dash-ai-panel prox-glow">' +
        '<div class="border-beam-el"></div>' +
        '<div class="dash-panel-title">' +
        '<span><i class="fas fa-brain" style="margin-left:6px;color:#9d4edd"></i>تحليل AI التنفيذي</span>' +
        '<button class="dash-refresh-btn" onclick="refreshDashAI()" title="تحديث"><i class="fas fa-sync-alt"></i></button>' +
        '</div>' +
        aiHtml +
        '</div>' +

        '<div class="dash-card-panel">' +
        '<div class="dash-panel-title"><span><i class="fas fa-bullseye" style="margin-left:6px;color:#ffd60a"></i>تتبع الأهداف</span></div>' +
        goalsHtml +
        '</div>' +

        '</div>' + /* end bottom row */
        '</div>';

    /* ── Post-render animations ── */
    setTimeout(function() {
        // KPI count-up (period-specific)
        data.kpis.forEach(function(kpi) {
            var el = document.getElementById('dashKpi_' + kpi.id);
            if (!el) return;
            var target  = kpi.value;
            var current = 0;
            var steps   = 55;
            var step    = target / steps;
            var timer = setInterval(function() {
                current = Math.min(current + step, target);
                el.textContent = _dashFmtKPI(kpi, current);
                if (current >= target) clearInterval(timer);
            }, 18);
        });

        // Bar chart grow
        data.revenue.forEach(function(v, i) {
            setTimeout(function() {
                var br = document.getElementById('dashBR_' + i);
                var bp = document.getElementById('dashBP_' + i);
                if (br) br.classList.add('on');
                if (bp) bp.classList.add('on');
                setTimeout(function() {
                    var bv = document.getElementById('dashBV_' + i);
                    if (bv) bv.textContent = _dashShort(v);
                }, 800);
            }, i * 90);
        });

        // Goal bars
        document.querySelectorAll('.dash-goal-fill').forEach(function(el) {
            var w = el.getAttribute('data-w');
            if (w) el.style.width = w + '%';
        });
    }, 80);

    // AI insights
    if (!_dash.aiInsightText && !_dash.aiLoading) _dashFetchAI();
}

// ── Set period ─────────────────────────────────────────────────────────────────────
function setDashPeriod(period) {
    if (period === _dash.period) return;
    _dash.period = period;
    _dash.aiInsightText = '';      // clear old insights — fetch new for this period
    _dash.aiLoading = false;
    _dashRenderView();
}

// ── AI business insights (period-aware) ───────────────────────────────────────────
async function _dashFetchAI() {
    _dash.aiLoading = true;
    var data = DASH_DATA[_dash.period];
    var lastRev    = data.revenue[data.revenue.length - 1];
    var firstRev   = data.revenue[0];
    var lastProfit = data.profit[data.profit.length - 1];
    var lastUsers  = data.users[data.users.length - 1];
    var firstUsers = data.users[0];
    var margin     = ((lastProfit / lastRev) * 100).toFixed(1);
    var revGrowth  = ((lastRev - firstRev) / firstRev * 100).toFixed(1);
    var userGrowth = ((lastUsers - firstUsers) / firstUsers * 100).toFixed(1);

    var periodLabel = _dash.period === 'weekly' ? 'أسبوعي (آخر 7 أيام)' :
                      _dash.period === 'monthly' ? 'شهري (آخر 6 أشهر)' :
                      'سنوي (آخر 6 سنوات)';
    var kpi = data.kpis;

    var prompt =
        'أنت مستشار أعمال تنفيذي. قدّم تحليلاً ذكياً ومختصراً لبيانات ' + periodLabel + ':\n\n' +
        '• ' + kpi[0].label + ': ' + _dashComma(kpi[0].value) + kpi[0].suffix +
            ' (مقابل ' + _dashComma(kpi[0].prev) + ' سابقاً)\n' +
        '• ' + kpi[1].label + ': ' + _dashComma(kpi[1].value) + kpi[1].suffix +
            ' (مقابل ' + _dashComma(kpi[1].prev) + ' سابقاً)\n' +
        '• ' + kpi[2].label + ': ' + kpi[2].value + kpi[2].suffix + '\n' +
        '• ' + kpi[3].label + ': ' + kpi[3].value + kpi[3].suffix + '\n\n' +
        'نمو الإيرادات خلال هذه الفترة: ' + revGrowth + '%\n' +
        'نمو العملاء خلال هذه الفترة: ' + userGrowth + '%\n' +
        'هامش الربح الحالي: ' + margin + '%\n\n' +
        'اكتب تحليلاً تنفيذياً بالعربية مخصصاً لـ' + periodLabel + ' يشمل:\n' +
        '1. تقييم الأداء العام للفترة\n' +
        '2. أبرز فرصة استراتيجية مناسبة لأفق هذه الفترة\n' +
        '3. أهم خطر يجب مراقبته\n' +
        '4. توصية عملية واحدة محددة\n' +
        'لا تتجاوز 140 كلمة. كن موضوعياً ومحدداً ومراعياً لطبيعة الفترة الزمنية.';

    try {
        var signal;
        if (typeof AbortSignal.timeout === 'function') { signal = AbortSignal.timeout(16000); }
        else { var _dc1 = new AbortController(); setTimeout(function(){ _dc1.abort(); }, 16000); signal = _dc1.signal; }
        var res = await fetch(CHAT_API_BASE + '/api/chat', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ message: prompt, language:'ar' }), signal: signal,
        });
        if (!res.ok) throw new Error();
        var data2 = await res.json();
        var text = ((data2.text || data2.response || data2.content || '') + '').trim();
        if (text) {
            _dash.aiInsightText = text;
            _dash.aiLoading = false;
            var el = document.getElementById('dashAiText');
            if (el) { el.classList.remove('loading'); el.textContent = text; }
            return;
        }
    } catch (_e) {}
    _dash.aiLoading = false;
    // Period-specific fallback
    var fallbacks = {
        weekly:  'الأداء الأسبوعي: ✅ جيد — تحقيق 88% من هدف الأسبوع المالي.\n\n' +
                 '🔥 الفرصة: يوم الخميس حقق أعلى الإيرادات — كرّر النمط في الأسبوع القادم.\n\n' +
                 '⚠️ الخطر: انخفاض المبيعات في بداية الأسبوع — راجع جدولة الحملات.\n\n' +
                 '💡 التوصية: ركّز جهود التسويق على الأيام الأكثر تحويلاً (الخميس-السبت).',
        monthly: 'الأداء الشهري: ✅ ممتاز — الإيرادات تجاوزت التوقعات بنسبة 18% مع هامش ربح صحي.\n\n' +
                 '🔥 الفرصة: توسع قاعدة العملاء يُشير إلى طلب متصاعد — استثمر في التوسع الجغرافي الآن.\n\n' +
                 '⚠️ الخطر: الاعتماد على عملاء كبار يُشكّل مخاطرة تركّز — نوّع المحفظة.\n\n' +
                 '💡 التوصية: أطلق برنامج ولاء للعملاء الحاليين لرفع معدل الاحتفاظ فوق 85%.',
        yearly:  'الأداء السنوي: 🌟 استثنائي — نمو سنوي مركّب (CAGR) يفوق 40% على مدى 5 سنوات.\n\n' +
                 '🔥 الفرصة: النضج المؤسسي (93/100) يؤهلك لجولة Series C أو IPO خلال 2027.\n\n' +
                 '⚠️ الخطر: تباطؤ معدل النمو من 24.7% إلى 22.8% — أعد تقييم استراتيجية التوسع.\n\n' +
                 '💡 التوصية: استثمر في R&D وبناء فريق قيادي C-Suite لمرحلة التوسع الإقليمي.',
    };
    _dash.aiInsightText = fallbacks[_dash.period] || fallbacks.monthly;
    var el2 = document.getElementById('dashAiText');
    if (el2) { el2.classList.remove('loading'); el2.textContent = _dash.aiInsightText; }
}

// ── Refresh AI ─────────────────────────────────────────────────────────────────────
function refreshDashAI() {
    _dash.aiInsightText = '';
    _dash.aiLoading = false;
    var el = document.getElementById('dashAiText');
    if (!el) {
        _dashRenderView(); return;
    }
    el.className = 'dash-ai-text loading';
    el.textContent = 'يقوم الذكاء الاصطناعي بتحليل بيانات الأعمال...';
    _dashFetchAI();
}

// ══════════════════════════════════════════════════════════════════════════════════
//  FEATURE #11 — ACHIEVEMENT SYSTEM
// ══════════════════════════════════════════════════════════════════════════════════

var RANKS = [
    { min:0,    max:99,   name:'طالب جديد',       icon:'🎓', clr:'rgba(150,200,255,0.5)' },
    { min:100,  max:299,  name:'طالب نشط',         icon:'📚', clr:'rgba(0,212,255,0.5)'  },
    { min:300,  max:599,  name:'رئيس قسم',          icon:'🔵', clr:'rgba(0,132,255,0.6)'  },
    { min:600,  max:999,  name:'مدير مشروع',        icon:'🟣', clr:'rgba(157,78,221,0.6)' },
    { min:1000, max:1999, name:'مستشار أعمال',      icon:'💼', clr:'rgba(200,150,255,0.6)'},
    { min:2000, max:3999, name:'مدير تنفيذي',       icon:'🏢', clr:'rgba(255,180,0,0.55)' },
    { min:4000, max:6999, name:'نائب الرئيس',       icon:'🌟', clr:'rgba(255,100,30,0.6)' },
    { min:7000, max:Infinity, name:'رئيس تنفيذي',   icon:'👑', clr:'rgba(255,50,100,0.65)' }
];

var ACHIEVEMENTS = [
    { id:'first_step',     icon:'🌱', name:'أول خطوة',         desc:'احصل على أول XP في رحلتك',          rarity:'common',    cond:function(){ return userXP >= 1; } },
    { id:'quick_learner',  icon:'⚡', name:'متعلم سريع',       desc:'اجمع 50 نقطة خبرة',                 rarity:'common',    cond:function(){ return userXP >= 50; } },
    { id:'rising_star',    icon:'⭐', name:'نجم صاعد',         desc:'تجاوز 100 XP',                      rarity:'common',    cond:function(){ return userXP >= 100; } },
    { id:'scholar',        icon:'📚', name:'عالم',             desc:'تجاوز 300 XP',                      rarity:'rare',      cond:function(){ return userXP >= 300; } },
    { id:'business_mind',  icon:'💼', name:'عقل أعمال',        desc:'تجاوز 500 XP',                      rarity:'rare',      cond:function(){ return userXP >= 500; } },
    { id:'master',         icon:'🏆', name:'خبير',             desc:'تجاوز 1000 XP',                     rarity:'epic',      cond:function(){ return userXP >= 1000; } },
    { id:'legend',         icon:'👑', name:'أسطورة',           desc:'تجاوز 2000 XP — مرتبة نادرة',       rarity:'legendary', cond:function(){ return userXP >= 2000; } },
    { id:'ceo_chat',       icon:'🤖', name:'محادثة CEO',       desc:'تحدث مع مدرّب CEO الذكي',           rarity:'common',    cond:function(){ return !!_achData.section_ceoai; } },
    { id:'crisis_solver',  icon:'⚡', name:'محلل الأزمات',     desc:'ادخل محاكي الأزمات',                rarity:'common',    cond:function(){ return !!_achData.section_crisis; } },
    { id:'road_mapper',    icon:'🗺️', name:'رسام المستقبل',    desc:'استكشف خارطة الطريق AI',            rarity:'common',    cond:function(){ return !!_achData.section_roadmap; } },
    { id:'study_buddy',    icon:'📖', name:'رفيق الدراسة',     desc:'افتح مساعد الدراسة AI',             rarity:'common',    cond:function(){ return !!_achData.section_study; } },
    { id:'interviewer',    icon:'👔', name:'محترف المقابلات',  desc:'جرّب محاكي المقابلات',              rarity:'rare',      cond:function(){ return !!_achData.section_interview; } },
    { id:'dna_explorer',   icon:'🧬', name:'مستكشف الهوية',    desc:'اكتشف Career DNA الخاص بك',         rarity:'rare',      cond:function(){ return !!_achData.section_careerdna; } },
    { id:'analyst',        icon:'📊', name:'محلل البيانات',    desc:'افتح لوحة التحكم التنفيذية',        rarity:'common',    cond:function(){ return !!_achData.section_dashboard; } },
    { id:'tool_master',    icon:'🔧', name:'سيد الأدوات',      desc:'استكشف أدوات الأعمال',              rarity:'common',    cond:function(){ return !!_achData.section_tools; } },
    { id:'leader',         icon:'👑', name:'قائد طبيعي',       desc:'أكمل اختبار الشخصية القيادية',      rarity:'rare',      cond:function(){ return !!_achData.section_leadership; } },
    { id:'challenger',     icon:'🧠', name:'بطل التحديات',     desc:'خض أول تحدٍّ فكري',                rarity:'rare',      cond:function(){ return !!_achData.section_challenges; } },
    { id:'persistent',     icon:'💪', name:'مثابر',            desc:'بلّغ المستوى 5',                    rarity:'epic',      cond:function(){ return userLevel >= 5; } },
    { id:'demo_watcher',   icon:'🎬', name:'مشاهد العرض',      desc:'شاهد العرض التجريبي الكامل',        rarity:'epic',      cond:function(){ return !!_achData.demo_watched; } },
    { id:'completionist',  icon:'💎', name:'إتمام كامل',       desc:'افتح 15 إنجازاً مختلفاً',           rarity:'legendary', cond:function(){ return _unlockedSet.size >= 15; } }
];

var _unlockedSet  = new Set();
var _achData      = {};
var _achQueue     = [];
var _achShowing   = false;

function _achLoad() {
    try {
        var raw = localStorage.getItem('aus_achievements');
        if (raw) { var p = JSON.parse(raw); _unlockedSet = new Set(p.unlocked || []); _achData = p.data || {}; }
    } catch(e) {}
}

function _achSave() {
    try { localStorage.setItem('aus_achievements', JSON.stringify({ unlocked: Array.from(_unlockedSet), data: _achData })); } catch(e) {}
}

function _achTrack(key) {
    if (!_achData[key]) { _achData[key] = Date.now(); _achSave(); }
}

function checkAchievements() {
    ACHIEVEMENTS.forEach(function(ach) {
        if (!_unlockedSet.has(ach.id) && ach.cond()) {
            _unlockedSet.add(ach.id);
            _achSave();
            _achQueue.push(ach);
        }
    });
    _achDrainQueue();
}

function _achDrainQueue() {
    if (_achShowing || _achQueue.length === 0) return;
    showAchievementUnlock(_achQueue.shift());
}

function showAchievementUnlock(ach) {
    _achShowing = true;
    var overlay = document.getElementById('achUnlockOverlay');
    var icon    = document.getElementById('achUnlockIcon');
    var title   = document.getElementById('achUnlockTitle');
    var desc    = document.getElementById('achUnlockDesc');
    var rarity  = document.getElementById('achUnlockRarity');
    var card    = document.getElementById('achUnlockCard');
    var ring    = document.getElementById('achUnlockRing');
    if (!overlay) { _achShowing = false; _achDrainQueue(); return; }

    if (icon)   icon.textContent   = ach.icon;
    if (title)  title.textContent  = ach.name;
    if (desc)   desc.textContent   = ach.desc;
    if (rarity) {
        var rarityMap = { common:'شائع', rare:'نادر', epic:'ملحمي', legendary:'أسطوري' };
        rarity.textContent  = rarityMap[ach.rarity] || ach.rarity;
        rarity.className    = 'ach-unlock-rarity ' + ach.rarity;
    }

    if (card) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; }
    if (ring) { ring.style.animation = 'none'; void ring.offsetWidth; ring.style.animation = 'unlockRing 1s ease-out forwards'; }

    overlay.classList.add('show');
    sfxPlay('level');

    try { if (typeof speakAI === 'function') speakAI('تهانينا! حصلت على إنجاز ' + ach.name); } catch(e) {}

    var _autoClose = setTimeout(function() { closeAchUnlock(); }, 4000);
    overlay._autoClose = _autoClose;
}

function closeAchUnlock() {
    var overlay = document.getElementById('achUnlockOverlay');
    if (!overlay) return;
    if (overlay._autoClose) clearTimeout(overlay._autoClose);
    overlay.classList.remove('show');
    _achShowing = false;
    setTimeout(_achDrainQueue, 300);
}

function getCurrentRank() {
    for (var i = RANKS.length - 1; i >= 0; i--) {
        if (userXP >= RANKS[i].min) return RANKS[i];
    }
    return RANKS[0];
}

function getNextRank() {
    for (var i = 0; i < RANKS.length; i++) {
        if (userXP < RANKS[i].max && RANKS[i].max !== Infinity) return RANKS[i + 1] || null;
        if (userXP >= RANKS[i].min && userXP <= RANKS[i].max) return RANKS[i + 1] || null;
    }
    return null;
}

function renderAchievements() {
    var el = document.getElementById('achievementsContent');
    if (!el) return;

    var rank       = getCurrentRank();
    var nextRank   = getNextRank();
    var unlocked   = _unlockedSet.size;
    var total      = ACHIEVEMENTS.length;
    var xpToNext   = nextRank ? nextRank.min - userXP : 0;
    var xpRange    = nextRank ? nextRank.min - rank.min : 1;
    var xpPct      = nextRank ? Math.min(100, ((userXP - rank.min) / xpRange) * 100) : 100;

    var rankPips = RANKS.map(function(r) {
        var cls = userXP >= r.min ? (userXP >= r.min && (r.max === Infinity || userXP <= r.max) ? 'current' : 'done') : '';
        return '<span class="ach-rank-pip ' + cls + '">' + r.icon + ' ' + r.name + '</span>';
    }).join('');

    var badges = ACHIEVEMENTS.map(function(ach) {
        var isUnlocked = _unlockedSet.has(ach.id);
        return '<div class="ach-badge-card ' + (isUnlocked ? 'unlocked' : 'locked') + '" title="' + ach.desc + '">' +
            '<div class="ach-badge-holo-ring"></div>' +
            '<div class="ach-badge-inner">' +
            '<span class="ach-badge-icon">' + ach.icon + '</span>' +
            '<div class="ach-badge-name">' + (isUnlocked ? ach.name : '???') + '</div>' +
            '<span class="ach-badge-rarity-dot ' + ach.rarity + '"></span>' +
            '</div></div>';
    }).join('');

    el.innerHTML =
        '<div class="ach-rank-card" style="--rk-clr:' + rank.clr + '">' +
            '<div class="ach-rank-icon"><div class="ach-rank-icon-inner">' + rank.icon + '</div></div>' +
            '<div class="ach-rank-info">' +
                '<div class="ach-rank-title">RANK · الرتبة الحالية</div>' +
                '<div class="ach-rank-name">' + rank.name + '</div>' +
                '<div class="ach-xp-bar-wrap"><div class="ach-xp-bar-fill" id="achXpFill" style="width:0%"></div></div>' +
                '<div class="ach-xp-label">' + userXP + ' XP' + (nextRank ? ' · يتبقى ' + xpToNext + ' XP للرتبة ' + nextRank.name : ' · أعلى رتبة 👑') + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="ach-stats-row">' +
            '<div class="ach-stat-box"><div class="ach-stat-value">' + unlocked + '/' + total + '</div><div class="ach-stat-label">إنجازات مفتوحة</div></div>' +
            '<div class="ach-stat-box"><div class="ach-stat-value">' + userXP + '</div><div class="ach-stat-label">إجمالي XP</div></div>' +
            '<div class="ach-stat-box"><div class="ach-stat-value">' + userLevel + '</div><div class="ach-stat-label">المستوى</div></div>' +
        '</div>' +
        '<div class="ach-ranks-row">' + rankPips + '</div>' +
        '<div class="section-title" style="margin-bottom:0.8rem"><h2 style="font-size:1.1rem">🎖️ الشارات والإنجازات</h2></div>' +
        '<div class="ach-grid">' + badges + '</div>';

    setTimeout(function() {
        var fill = document.getElementById('achXpFill');
        if (fill) fill.style.width = xpPct.toFixed(1) + '%';
    }, 120);
}

// Init on load
_achLoad();
(function() {
    var orig = startDemo;
    startDemo = function() {
        orig.apply(this, arguments);
        _achTrack('demo_watched');
        checkAchievements();
    };
})();

// ══════════════════════════════════════════════════════════════════════════════════
//  FEATURE #10 — DEMO PRESENTATION MODE
// ══════════════════════════════════════════════════════════════════════════════════

var DEMO_SEQUENCE = [
    {
        section: 'home',
        duration: 4500,
        title: 'AI University Simulator',
        narration: 'مرحباً بكم في محاكي الجامعة بالذكاء الاصطناعي — المنصة الأكثر تطوراً لتعليم الأعمال التفاعلي.'
    },
    {
        section: 'ceoai',
        duration: 6000,
        title: 'CEO AI Coach',
        narration: 'تحدّث مع مدرّب CEO الذكي — يحلّل استراتيجياتك ويقدّم نصائح مباشرة من أفضل المدارس العالمية.'
    },
    {
        section: 'crisis',
        duration: 6000,
        title: 'محاكي الأزمات',
        narration: 'اختبر قراراتك في أصعب المواقف — من الأزمات المالية إلى الاضطرابات السوقية في بيئة آمنة.'
    },
    {
        section: 'roadmap',
        duration: 5500,
        title: 'خارطة الطريق AI',
        narration: 'خطّط مسيرتك المهنية بدقة — ذكاء اصطناعي يرسم لك مسار النجاح خطوة بخطوة.'
    },
    {
        section: 'study',
        duration: 5500,
        title: 'مساعد الدراسة AI',
        narration: 'ادرس بذكاء مع مساعد يولّد الملخصات والبطاقات التعليمية والاختبارات تلقائياً.'
    },
    {
        section: 'interview',
        duration: 5000,
        title: 'مقابلة العمل AI',
        narration: 'استعد لمقابلات العمل مع محاكاة ذكية تقيّم إجاباتك وتحسّن أسلوبك التلقائياً.'
    },
    {
        section: 'careerdna',
        duration: 5000,
        title: 'Career DNA',
        narration: 'اكتشف هويتك المهنية الفريدة — خوارزمية AI تحلل شخصيتك وتكشف عن مسارك الأمثل.'
    },
    {
        section: 'dashboard',
        duration: 5500,
        title: 'لوحة التحكم الذكية',
        narration: 'تابع أداءك بالوقت الحقيقي — إحصاءات، تحليلات، وتوقعات AI مخصصة لرحلتك التعليمية.'
    }
];

var _demoIndex   = 0;
var _demoTimer   = null;
var _demoPaused  = false;
var _demoActive  = false;
var _demoTickStart = 0;
var _demoTickDuration = 0;
var _demoProgressRAF = null;

function startDemo() {
    if (_demoActive) { stopDemo(); return; }
    _demoActive  = true;
    _demoPaused  = false;
    _demoIndex   = 0;

    document.body.classList.add('demo-active');

    var overlay = document.getElementById('demoOverlay');
    var controls = document.getElementById('demoControls');
    var fab = document.getElementById('demoFab');

    if (overlay)  overlay.classList.add('active');
    if (controls) controls.classList.add('visible');
    if (fab)      { fab.setAttribute('data-active','true'); fab.querySelector('i').className = 'fas fa-stop'; }

    _buildDemoDots();
    sfxPlay('enter');

    _demoTick();
}

function _buildDemoDots() {
    var dots = document.getElementById('demoStepDots');
    if (!dots) return;
    dots.innerHTML = '';
    DEMO_SEQUENCE.forEach(function(_, i) {
        var d = document.createElement('div');
        d.className = 'demo-dot';
        dots.appendChild(d);
    });
}

function _updateDots(idx) {
    var dots = document.querySelectorAll('.demo-dot');
    dots.forEach(function(d, i) {
        d.classList.remove('active','done');
        if (i < idx)  d.classList.add('done');
        if (i === idx) d.classList.add('active');
    });
}

function _demoTick() {
    if (!_demoActive || _demoPaused) return;

    var step = DEMO_SEQUENCE[_demoIndex];
    if (!step) { stopDemo(); return; }

    showSection(step.section);

    var titleEl  = document.getElementById('demoNarrationTitle');
    var bodyEl   = document.getElementById('demoNarrationBody');
    var labelEl  = document.getElementById('demoSectionLabel');
    var card     = document.getElementById('demoNarrationCard');

    if (titleEl) titleEl.textContent = step.title;
    if (bodyEl)  bodyEl.textContent  = step.narration;
    if (labelEl) labelEl.textContent = (_demoIndex + 1) + ' / ' + DEMO_SEQUENCE.length;

    _updateDots(_demoIndex);

    if (card) {
        card.classList.remove('visible');
        setTimeout(function() { card.classList.add('visible'); }, 80);
    }

    if (typeof speakAI === 'function') {
        try { speakAI(step.narration); } catch(e) {}
    }

    sfxPlay('click');

    _demoTickStart    = performance.now();
    _demoTickDuration = step.duration;
    _animateDemoBar(0);

    _demoTimer = setTimeout(function() {
        _demoIndex++;
        if (_demoIndex >= DEMO_SEQUENCE.length) {
            stopDemo(true);
        } else {
            _demoTick();
        }
    }, step.duration);
}

function _animateDemoBar(elapsed) {
    cancelAnimationFrame(_demoProgressRAF);
    if (!_demoActive || _demoPaused) return;

    var totalSteps   = DEMO_SEQUENCE.length;
    var stepFraction = elapsed / _demoTickDuration;
    stepFraction     = Math.min(stepFraction, 1);

    var pct = ((_demoIndex + stepFraction) / totalSteps) * 100;
    var bar = document.getElementById('demoProgressBar');
    if (bar) bar.style.width = pct.toFixed(2) + '%';

    if (stepFraction < 1) {
        _demoProgressRAF = requestAnimationFrame(function() {
            _animateDemoBar(performance.now() - _demoTickStart);
        });
    }
}

function pauseDemo() {
    if (!_demoActive) return;
    _demoPaused = !_demoPaused;

    var icon = document.getElementById('demoPauseIcon');
    if (icon) icon.className = _demoPaused ? 'fas fa-play' : 'fas fa-pause';

    if (_demoPaused) {
        clearTimeout(_demoTimer);
        cancelAnimationFrame(_demoProgressRAF);
        if (window.speechSynthesis) window.speechSynthesis.pause();
    } else {
        if (window.speechSynthesis) window.speechSynthesis.resume();
        _demoTick();
    }
    sfxPlay('click');
}

function demoSkip() {
    if (!_demoActive) return;
    clearTimeout(_demoTimer);
    cancelAnimationFrame(_demoProgressRAF);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    _demoIndex++;
    if (_demoIndex >= DEMO_SEQUENCE.length) {
        stopDemo(true);
    } else {
        _demoPaused = false;
        var icon = document.getElementById('demoPauseIcon');
        if (icon) icon.className = 'fas fa-pause';
        _demoTick();
    }
    sfxPlay('click');
}

function stopDemo(finished) {
    _demoActive  = false;
    _demoPaused  = false;
    clearTimeout(_demoTimer);
    cancelAnimationFrame(_demoProgressRAF);
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    document.body.classList.remove('demo-active');

    var overlay  = document.getElementById('demoOverlay');
    var card     = document.getElementById('demoNarrationCard');
    var controls = document.getElementById('demoControls');
    var bar      = document.getElementById('demoProgressBar');
    var fab      = document.getElementById('demoFab');

    if (overlay)  overlay.classList.remove('active');
    if (card)     card.classList.remove('visible');
    if (controls) controls.classList.remove('visible');
    if (bar)      { bar.style.transition = 'none'; bar.style.width = finished ? '100%' : '0%'; setTimeout(function(){ bar.style.transition = ''; bar.style.width = '0%'; }, finished ? 800 : 0); }
    if (fab)      { fab.setAttribute('data-active','false'); fab.querySelector('i').className = 'fas fa-play'; }

    if (finished) {
        sfxPlay('level');
        setEmotion('celebration');
        setTimeout(function() { showSection('home'); }, 900);
    } else {
        sfxPlay('click');
    }
}

// ══════════════════════════════════════════════════════════════════════════════════
//  FEATURE #14 — SMART UNIVERSITY MAP
// ══════════════════════════════════════════════════════════════════════════════════

var CAMPUS_BUILDINGS = [
    { id:'admin',    icon:'🏢', name:'الإدارة العليا',       nameEn:'Administration',       type:'admin',
      desc:'مبنى الإدارة العليا والقيادة الجامعية وخدمات التسجيل.',
      features:['شؤون الطلاب','التسجيل','الشؤون المالية'],
      section:'leadership', clr:'rgba(255,107,53,0.85)',
      x:8,  y:6,  w:17, h:13 },
    { id:'library',  icon:'📚', name:'المكتبة الذكية',        nameEn:'Smart Library',        type:'academic',
      desc:'مكتبة رقمية تفاعلية مع أكثر من مليون مرجع علمي وأدوات بحث بالذكاء الاصطناعي.',
      features:['مصادر رقمية','بحث AI','قراءة تفاعلية'],
      section:'study',  clr:'rgba(0,212,255,0.85)',
      x:32, y:6,  w:22, h:13 },
    { id:'ailab',    icon:'🤖', name:'مختبر الذكاء الاصطناعي', nameEn:'AI Research Lab',     type:'research',
      desc:'مركز أبحاث الذكاء الاصطناعي — تطوير النماذج اللغوية والرؤية الحاسوبية.',
      features:['نماذج LLM','تعلم الآلة','رؤية حاسوبية'],
      section:'ceoai',  clr:'rgba(157,78,221,0.85)',
      x:62, y:6,  w:18, h:13 },
    { id:'business', icon:'🏛️', name:'كلية الأعمال',          nameEn:'Business School',      type:'academic',
      desc:'مركز تعليم الإدارة والريادة وعلوم الأعمال مع محاكاة قرارات حقيقية.',
      features:['إدارة أعمال','تسويق رقمي','ريادة الأعمال'],
      section:'home',   clr:'rgba(0,212,255,0.85)',
      x:8,  y:52, w:18, h:14 },
    { id:'tech',     icon:'💻', name:'مركز التقنية',           nameEn:'Tech Innovation Hub',  type:'tech',
      desc:'مختبرات تقنية متطورة وحاضنة مشاريع ناشئة لرواد الأعمال الرقميين.',
      features:['برمجة','ابتكار رقمي','مشاريع ناشئة'],
      section:'tools',  clr:'rgba(0,245,212,0.85)',
      x:34, y:52, w:18, h:14 },
    { id:'career',   icon:'🎯', name:'مركز المسار المهني',     nameEn:'Career Center',        type:'career',
      desc:'خدمات التوظيف والإرشاد المهني ومحاكاة المقابلات بالذكاء الاصطناعي.',
      features:['تدريب مقابلات','شبكة أعمال','تطوير مهني'],
      section:'interview', clr:'rgba(255,214,10,0.85)',
      x:62, y:52, w:18, h:14 },
    { id:'sports',   icon:'⚡', name:'مركز التحديات',          nameEn:'Challenge Arena',      type:'recreation',
      desc:'ساحة التحديات الفكرية والقيادية — اختبر حدودك في بيئة تنافسية آمنة.',
      features:['تحديات AI','منافسات','اختبارات حية'],
      section:'challenges', clr:'rgba(255,0,110,0.85)',
      x:8,  y:74, w:18, h:13 },
    { id:'research', icon:'🔬', name:'معهد الأبحاث',           nameEn:'Research Institute',   type:'research',
      desc:'معهد متخصص في أبحاث المستقبل — نشر علمي وبراءات اختراع وشراكات دولية.',
      features:['أبحاث مشتركة','نشر علمي','ابتكار'],
      section:'roadmap', clr:'rgba(157,78,221,0.85)',
      x:34, y:74, w:22, h:13 },
    { id:'hub',      icon:'☕', name:'مركز الطلاب',            nameEn:'Student Hub',          type:'social',
      desc:'مركز اجتماعي متكامل — مقهى ذكي وفضاءات عمل تعاوني وأنشطة طلابية.',
      features:['مقهى ذكي','فضاءات عمل','أنشطة اجتماعية'],
      section:'dashboard', clr:'rgba(0,245,212,0.85)',
      x:62, y:74, w:18, h:13 }
];

var _mapSelected = null;

function renderUniversityMap() {
    var el = document.getElementById('mapContent');
    if (!el) return;

    var buildings = CAMPUS_BUILDINGS.map(function(b) {
        return '<div class="map-bldg" ' +
            'id="mb-' + b.id + '" ' +
            'style="left:' + b.x + '%;top:' + b.y + '%;width:' + b.w + '%;height:' + b.h + '%;--bclr:' + b.clr + '" ' +
            'onclick="selectMapBuilding(\'' + b.id + '\')" ' +
            'title="' + b.name + '">' +
            '<span class="map-bldg-icon">' + b.icon + '</span>' +
            '<span class="map-bldg-name">' + b.name + '</span>' +
            '<span class="map-bldg-type-dot"></span>' +
            '</div>';
    }).join('');

    var typeColors = {
        academic:'rgba(0,212,255,0.8)', research:'rgba(157,78,221,0.8)',
        tech:'rgba(0,245,212,0.8)', career:'rgba(255,214,10,0.8)',
        admin:'rgba(255,107,53,0.8)', recreation:'rgba(255,0,110,0.8)', social:'rgba(0,245,212,0.8)'
    };
    var typeNames = {
        academic:'أكاديمي', research:'أبحاث', tech:'تقنية',
        career:'مهني', admin:'إدارة', recreation:'تحديات', social:'اجتماعي'
    };
    var legendItems = Object.keys(typeColors).map(function(t) {
        return '<div class="map-legend-item">' +
            '<span class="map-legend-dot" style="background:' + typeColors[t] + '"></span>' +
            '<span>' + (typeNames[t] || t) + '</span>' +
            '</div>';
    }).join('');

    el.innerHTML =
        '<div class="map-wrap">' +
            '<div class="map-canvas">' +
                '<div class="map-corner tl"></div><div class="map-corner tr"></div>' +
                '<div class="map-corner bl"></div><div class="map-corner br"></div>' +
                buildings +
                '<div class="map-plaza">' +
                    '<span class="map-plaza-icon">🌐</span>' +
                    '<span class="map-plaza-label">Central Plaza</span>' +
                '</div>' +
                '<div class="map-scan"></div>' +
            '</div>' +
            '<div class="map-info-panel" id="mapInfoPanel">' +
                '<div class="map-info-placeholder">' +
                    '<span class="map-info-placeholder-icon">🗺️</span>' +
                    '<span class="map-info-placeholder-text">اضغط على أي مبنى لعرض تفاصيله</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="map-legend">' + legendItems + '</div>';

    _mapSelected = null;
}

function selectMapBuilding(id) {
    var b = CAMPUS_BUILDINGS.filter(function(b){ return b.id === id; })[0];
    if (!b) return;

    _mapSelected = id;
    document.querySelectorAll('.map-bldg').forEach(function(el){ el.classList.remove('selected'); });
    var bEl = document.getElementById('mb-' + id);
    if (bEl) bEl.classList.add('selected');

    var panel = document.getElementById('mapInfoPanel');
    if (!panel) return;

    var typeNames = {
        academic:'أكاديمي', research:'مركز أبحاث', tech:'مركز تقني',
        career:'خدمات مهنية', admin:'إداري', recreation:'تحديات', social:'اجتماعي'
    };

    panel.innerHTML =
        '<div class="map-info-bldg-icon">' + b.icon + '</div>' +
        '<h3 class="map-info-name">' + b.name + '</h3>' +
        '<p class="map-info-name-en" style="--info-clr:' + b.clr + '">' + b.nameEn + '</p>' +
        '<span class="map-info-type-badge" style="--info-clr:' + b.clr + '">' + (typeNames[b.type] || b.type) + '</span>' +
        '<p class="map-info-desc">' + b.desc + '</p>' +
        '<div class="map-feature-tags">' +
            b.features.map(function(f){ return '<span class="map-feature-tag">' + f + '</span>'; }).join('') +
        '</div>' +
        '<button class="map-goto-btn" style="--info-clr:' + b.clr + '" onclick="showSection(\'' + b.section + '\')">' +
            '<i class="fas fa-external-link-alt"></i> افتح القسم' +
        '</button>';

    panel.classList.add('visible');
    sfxPlay('click');
    addXP(2);
}

// ══════════════════════════════════════════════════════════════════════════════════
//  FEATURE #13 — DYNAMIC WORLD EVOLUTION
// ══════════════════════════════════════════════════════════════════════════════════

var _worldStage = 1;

var _WORLD_MSGS = {
    3:  '🏙️ مدينة جديدة ظهرت في أفقك!',
    5:  '🌆 المدينة النيونية تتوهج بالطاقة!',
    10: '🌐 مدينة هولوغرافية — أنت أسطورة!'
};

function updateWorldEvolution() {
    var s = 1;
    if (userLevel >= 10)     s = 10;
    else if (userLevel >= 5) s = 5;
    else if (userLevel >= 3) s = 3;

    if (s === _worldStage) return;
    _worldStage = s;

    // Swap body class
    document.body.classList.remove('world-s3','world-s5','world-s10');
    if (s > 1) document.body.classList.add('world-s' + s);

    // Evolution flash
    var flash = document.getElementById('weFlash');
    if (flash) {
        flash.classList.remove('active');
        void flash.offsetWidth;
        flash.classList.add('active');
        setTimeout(function(){ flash.classList.remove('active'); }, 2600);
    }

    // Emotion + toast
    if (s > 1) {
        setTimeout(function() {
            if (typeof showToast === 'function') showToast(_WORLD_MSGS[s] || '', 'xp-toast');
            if (typeof setEmotion === 'function') setEmotion('celebration');
        }, 900);
    }
}

// Hook into level-up
(function _patchWorldHook() {
    var _orig = addXP;
    addXP = function(amount) {
        var prevLv = userLevel;
        _orig.apply(this, arguments);
        if (userLevel !== prevLv) updateWorldEvolution();
    };
})();

// Init on page load
(function(){ updateWorldEvolution(); })();

// ══════════════════════════════════════════════════════════════════════════════════
//  FEATURE #12 — AI EMOTION UI
//  GPU-only: transform + opacity + filter. No layout-triggering properties.
// ══════════════════════════════════════════════════════════════════════════════════

var _emoTimer  = null;
var _emoState  = 'neutral';
var _emoPrev   = 'neutral';

var _EMO_CFG = {
    success:     { duration: 2200 },
    failure:     { duration: 1800 },
    warning:     { duration: 2000 },
    tension:     { duration: 3200 },
    celebration: { duration: 3800 },
    focus:       { duration: 4500 }
};

function setEmotion(type) {
    if ((prefs && prefs.reduceMotion) || window.__AUS_FX_ON === false) return;   // calm mode (aus_45_fx_mode.js): no emotion flashes
    var layer = document.getElementById('emotion-layer');
    if (!layer) return;

    // Clear previous
    clearTimeout(_emoTimer);
    var prev = _emoState;
    _emoPrev = prev;

    // Remove all emotion classes and reset animation targets
    layer.className = '';
    _emoState = type || 'neutral';

    if (!type || type === 'neutral') return;

    // Force animation restart via reflow
    var ring = layer.querySelector('.emo-ring');
    var scan = layer.querySelector('.emo-scan');
    var corners = layer.querySelectorAll('.emo-corner');
    var pressure = layer.querySelector('.emo-pressure');
    [ring, scan, pressure].forEach(function(el) {
        if (el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
    });
    corners.forEach(function(el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });

    layer.classList.add('emo-' + type);

    // Body flash for celebration / failure
    if (type === 'celebration' || type === 'success') {
        document.body.classList.remove('emo-flash');
        void document.body.offsetWidth;
        document.body.classList.add('emo-flash');
        setTimeout(function(){ document.body.classList.remove('emo-flash'); }, 400);
    }

    var cfg = _EMO_CFG[type] || { duration: 2000 };
    _emoTimer = setTimeout(function() {
        layer.className = '';
        _emoState = 'neutral';
    }, cfg.duration);
}

// ── Patch existing game functions ──────────────────────────────────────────────
(function _patchEmotionHooks() {
    // addXP → success or celebration on level-up
    var _origAddXP = addXP;
    addXP = function(amount) {
        var prevLevel = userLevel;
        _origAddXP.apply(this, arguments);
        if (userLevel > prevLevel) {
            setEmotion('celebration');
        } else if (amount > 0) {
            setEmotion('success');
        }
    };

    // loseHeart → failure
    var _origLoseHeart = loseHeart;
    loseHeart = function() {
        _origLoseHeart.apply(this, arguments);
        setEmotion('failure');
    };

    // showSection → focus on heavy AI sections
    var _origShowSection = showSection;
    showSection = function(id) {
        _origShowSection.apply(this, arguments);
        if (id === 'ceoai' || id === 'interview') setEmotion('focus');
        if (id === 'crisis')   setEmotion('tension');
        if (id === 'home' && _emoPrev === 'crisis') setEmotion('success');
    };

    // startDemo → focus
    var _origStart = startDemo;
    startDemo = function() {
        _origStart.apply(this, arguments);
        setEmotion('focus');
    };

    // stopDemo finished → celebration already wired above
})();

// Expose globally for external triggers
window.setEmotion = setEmotion;


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE #15 — DAILY MISSION SYSTEM (نظام المهام اليومية)
// 3 daily missions + streak counter + floating progress widget + bonus XP
// Missions reset every 24h. Progress persists in localStorage.
// ═══════════════════════════════════════════════════════════════════════════════

var MISSION_POOL = [
    { id:'visit5',     icon:'🗺️', title:'المستكشف اليومي',  desc:'زيارة 5 أقسام مختلفة اليوم',        xp:30, target:5,  type:'visit'        },
    { id:'xp50',       icon:'⚡',  title:'لاعب النقاط',       desc:'اكسب 50 نقطة خبرة في جلسة واحدة',  xp:40, target:50, type:'xp_earned'     },
    { id:'ceoai_v',    icon:'🤖', title:'المستشار الذكي',    desc:'افتح قسم CEO AI واستشر مدربك',      xp:20, target:1,  type:'section', section:'ceoai'     },
    { id:'crisis_v',   icon:'⚡',  title:'محلل الأزمات',      desc:'ادخل قسم أزمة AI وواجه التحدي',     xp:25, target:1,  type:'section', section:'crisis'    },
    { id:'map3',       icon:'📍', title:'جولة الحرم',        desc:'اضغط على 3 مبانٍ في خريطة الجامعة',xp:20, target:3,  type:'map_click'    },
    { id:'ach1',       icon:'🏅', title:'صائد الإنجازات',    desc:'افتح إنجازاً جديداً اليوم',          xp:35, target:1,  type:'unlock_ach'   },
    { id:'study_v',    icon:'📚', title:'الطالب المجتهد',    desc:'افتح قسم مساعد الدراسة',             xp:20, target:1,  type:'section', section:'study'     },
    { id:'road_v',     icon:'🛣️', title:'رسام الطريق',       desc:'راجع خارطة AI الخاصة بك',           xp:20, target:1,  type:'section', section:'roadmap'   },
    { id:'inter_v',    icon:'🎯', title:'المقابل الجريء',    desc:'جرّب محاكي المقابلة الوظيفية',       xp:25, target:1,  type:'section', section:'interview' },
    { id:'visit3',     icon:'🌐', title:'الجولة السريعة',    desc:'زيارة 3 أقسام مختلفة اليوم',        xp:18, target:3,  type:'visit'        },
    { id:'challenge_v',icon:'🧠', title:'المتحدي',            desc:'أكمل تحدياً من قسم التحديات',        xp:25, target:1,  type:'section', section:'challenges'},
    { id:'dash_v',     icon:'📊', title:'المحلل الذاتي',     desc:'راجع لوحة الأداء اليومي',            xp:15, target:1,  type:'section', section:'dashboard' }
];

var _mState = null;
var _mVisitedSections = {};
var _mSessionXP = 0;
var _mMapClicks = 0;

function _mTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function _mLoad() {
    var today = _mTodayStr();
    try {
        var raw = localStorage.getItem('aus_missions_v1');
        if (raw) {
            _mState = JSON.parse(raw);
            if (_mState.date === today) return;
        }
    } catch(e) {}
    _mState = _mMakeNew(today);
    _mSave();
}

function _mMakeNew(today) {
    var streak = 0, best = 0;
    try {
        var sd = JSON.parse(localStorage.getItem('aus_streak_v1') || '{}');
        best = sd.best || 0;
        var yd = new Date(); yd.setDate(yd.getDate() - 1);
        var yStr = yd.getFullYear() + '-' + (yd.getMonth()+1) + '-' + yd.getDate();
        streak = (sd.lastDate === yStr || sd.lastDate === today) ? (sd.streak || 0) : 0;
    } catch(e) {}
    var pool = MISSION_POOL.slice();
    var chosen = [];
    while (chosen.length < 3 && pool.length > 0) {
        var idx = Math.floor(Math.random() * pool.length);
        var m = JSON.parse(JSON.stringify(pool.splice(idx, 1)[0]));
        m.track = 0; m.done = false;
        chosen.push(m);
    }
    return { date: today, missions: chosen, allDoneBonus: false, streak: streak, best: best };
}

function _mSave() {
    try { localStorage.setItem('aus_missions_v1', JSON.stringify(_mState)); } catch(e) {}
}

function _mOnVisit(sectionId) {
    if (!_mState || sectionId === 'missions') return;
    _mVisitedSections[sectionId] = true;
    var visitCount = Object.keys(_mVisitedSections).length;
    var changed = false;
    _mState.missions.forEach(function(m) {
        if (m.done) return;
        if (m.type === 'section' && m.section === sectionId) {
            m.track = 1; changed = true; _mMaybeComplete(m);
        }
        if (m.type === 'visit') {
            var prev = m.track;
            m.track = Math.min(m.target, visitCount);
            if (m.track !== prev) { changed = true; _mMaybeComplete(m); }
        }
    });
    if (changed) { _mSave(); _mRefreshWidget(); _mRefreshPanel(); }
}

function _mOnXP(amount) {
    if (!_mState || amount <= 0) return;
    _mSessionXP += amount;
    var changed = false;
    _mState.missions.forEach(function(m) {
        if (m.done || m.type !== 'xp_earned') return;
        m.track = Math.min(m.target, _mSessionXP);
        changed = true; _mMaybeComplete(m);
    });
    if (changed) { _mSave(); _mRefreshWidget(); _mRefreshPanel(); }
}

function _mOnMapClick() {
    if (!_mState) return;
    _mMapClicks++;
    var changed = false;
    _mState.missions.forEach(function(m) {
        if (m.done || m.type !== 'map_click') return;
        m.track = Math.min(m.target, _mMapClicks);
        changed = true; _mMaybeComplete(m);
    });
    if (changed) { _mSave(); _mRefreshWidget(); _mRefreshPanel(); }
}

function _mOnAchUnlock() {
    if (!_mState) return;
    var changed = false;
    _mState.missions.forEach(function(m) {
        if (m.done || m.type !== 'unlock_ach') return;
        m.track = Math.min(m.target, (m.track || 0) + 1);
        changed = true; _mMaybeComplete(m);
    });
    if (changed) { _mSave(); _mRefreshWidget(); _mRefreshPanel(); }
}

function _mMaybeComplete(mission) {
    if (mission.done || mission.track < mission.target) return;
    mission.done = true;
    addXP(mission.xp);
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:5.5rem;left:50%;transform:translateX(-50%) translateY(-8px);z-index:9500;background:linear-gradient(135deg,rgba(0,245,120,0.18),rgba(0,200,80,0.10));border:1px solid rgba(0,245,120,0.48);border-radius:14px;padding:0.65rem 1.4rem;color:#69f0ae;font-family:Tajawal,sans-serif;font-weight:700;font-size:0.9rem;text-align:center;direction:rtl;box-shadow:0 8px 28px rgba(0,245,120,0.18);pointer-events:none;transition:opacity 0.4s,transform 0.4s;';
    t.textContent = '✅ مهمة مكتملة: ' + mission.title + '  +' + mission.xp + ' XP';
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(function(){
        t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(-8px)';
        setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },420);
    }, 2800);
    if (typeof sfxPlay === 'function') sfxPlay('click');
    _mCheckAllDone();
}

function _mCheckAllDone() {
    if (!_mState || _mState.allDoneBonus) return;
    if (!_mState.missions.every(function(m){ return m.done; })) return;
    _mState.allDoneBonus = true;
    _mState.streak = (_mState.streak || 0) + 1;
    if (_mState.streak > (_mState.best || 0)) _mState.best = _mState.streak;
    try {
        localStorage.setItem('aus_streak_v1', JSON.stringify({
            streak:_mState.streak, best:_mState.best, lastDate:_mState.date
        }));
    } catch(e) {}
    _mSave();
    setTimeout(function(){
        addXP(50);
        if (typeof setEmotion === 'function') setEmotion('celebration');
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;top:4.8rem;left:50%;transform:translateX(-50%) scale(0.9);z-index:9600;background:linear-gradient(135deg,rgba(255,180,0,0.20),rgba(255,100,0,0.14));border:2px solid rgba(255,180,0,0.58);border-radius:18px;padding:1rem 2rem;color:#ffb700;font-family:Tajawal,sans-serif;font-weight:900;font-size:1rem;text-align:center;direction:rtl;box-shadow:0 12px 48px rgba(255,180,0,0.28);pointer-events:none;transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s;';
        t.innerHTML = '🏆 أنهيت جميع المهام اليومية!<span style="color:rgba(255,255,255,0.65);font-size:0.82rem;display:block;margin-top:4px">مكافأة +50 XP · سلسلة ' + _mState.streak + ' يوم 🔥</span>';
        document.body.appendChild(t);
        requestAnimationFrame(function(){ t.style.transform='translateX(-50%) scale(1)'; });
        setTimeout(function(){
            t.style.opacity='0';
            setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },420);
        }, 4200);
    }, 700);
}

function _mRefreshWidget() {
    if (!_mState) return;
    var done = _mState.missions.filter(function(m){ return m.done; }).length;
    var pct  = Math.round((done / 3) * 100);
    var ring  = document.getElementById('dailyWidgetRing');
    var inner = document.getElementById('dailyWidgetInner');
    var lbl   = document.getElementById('dailyWidgetLabel');
    if (ring)  ring.style.setProperty('--dw-prog', pct + '%');
    if (inner) inner.textContent = done === 3 ? '✅' : '🔥';
    if (lbl)   lbl.textContent = done + '/3';
}

function _mRefreshPanel() {
    var sec = document.getElementById('missions');
    if (sec && sec.classList.contains('active')) renderMissions();
}

function renderMissions() {
    var el = document.getElementById('missionsContent');
    if (!el) return;
    if (!_mState) _mLoad();
    var done   = _mState.missions.filter(function(m){ return m.done; }).length;
    var streak = _mState.streak || 0;
    var best   = _mState.best   || 0;
    var now    = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var diff   = midnight - now;
    var hh     = Math.floor(diff / 3600000);
    var mm     = Math.floor((diff % 3600000) / 60000);

    var streakHtml = '<div class="streak-panel">' +
        '<span class="streak-fire">🔥</span>' +
        '<div><div class="streak-count">' + streak + '</div>' +
        '<div class="streak-label">يوم متواصل</div></div>' +
        '<div class="streak-best">🥇 أفضل سلسلة: ' + best + ' يوم</div>' +
        '</div>';

    var cardsHtml = '<div class="missions-grid">';
    _mState.missions.forEach(function(m) {
        var raw = Math.min(m.track || 0, m.target);
        var pct = m.target > 0 ? Math.round((raw / m.target) * 100) : 0;
        if (m.done) pct = 100;
        cardsHtml +=
            '<div class="mission-card' + (m.done ? ' done' : '') + '">' +
            '<span class="mission-card-icon">' + m.icon + '</span>' +
            '<div class="mission-card-title">' + m.title + '</div>' +
            '<div class="mission-card-desc">' + m.desc + '</div>' +
            '<div class="mission-xp-badge">⚡ +' + m.xp + ' XP</div>' +
            '<div class="mission-prog-bar"><div class="mission-prog-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="mission-prog-txt">' + (m.done ? 'مكتملة ✓' : raw + ' / ' + m.target) + '</div>' +
            '</div>';
    });
    cardsHtml += '</div>';

    var bonusHtml = done === 3
        ? '<div class="missions-all-done"><div class="mad-icon">🌟</div><div class="mad-title">أحسنت! أكملت جميع مهام اليوم</div><div class="mad-sub">مكافأة +50 XP · عد غداً لمهام جديدة</div></div>'
        : '<div style="text-align:center;margin-top:0.5rem;font-size:0.8rem;color:rgba(255,255,255,0.35)">أكمل المهام الثلاث للحصول على مكافأة <strong style="color:rgba(255,180,0,0.7)">+50 XP</strong> إضافية</div>';

    el.innerHTML = streakHtml + cardsHtml + bonusHtml +
        '<div class="missions-reset-timer">⏱ تتجدد المهام بعد: ' + hh + 'h ' + mm + 'm</div>';
}

(function _initDailyMissions() {
    _mLoad();
    _mRefreshWidget();

    var _origSS = showSection;
    showSection = function(id) {
        _origSS.apply(this, arguments);
        _mOnVisit(id);
    };

    var _mXPActive = false;
    var _origAXP = addXP;
    addXP = function(amount) {
        _origAXP.apply(this, arguments);
        if (!_mXPActive && amount > 0) {
            _mXPActive = true;
            _mOnXP(amount);
            _mXPActive = false;
        }
    };

    if (typeof selectMapBuilding === 'function') {
        var _origSMB = selectMapBuilding;
        selectMapBuilding = function(id) {
            _origSMB.apply(this, arguments);
            _mOnMapClick();
        };
    }

    if (typeof showAchievementUnlock === 'function') {
        var _origSAU = showAchievementUnlock;
        showAchievementUnlock = function(ach) {
            _origSAU.apply(this, arguments);
            _mOnAchUnlock();
        };
    }

    setInterval(function() { _mRefreshPanel(); }, 60000);
})();


// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE #16 — AUTH + SAAS UI (نظام المصادقة والاشتراك)
// JWT auth state manager that talks to the AUS backend at port 8002.
// Provides: login, register, logout, plan gating, upgrade flow.
// Fully non-blocking — all API calls are async fetch, never interrupt the sim.
// ═══════════════════════════════════════════════════════════════════════════════

var ausAuth = (function() {
    'use strict';

    var API_BASE    = 'http://localhost:8002';
    var ACCESS_KEY  = 'aus_access_token';
    var REFRESH_KEY = 'aus_refresh_token';
    var USER_KEY    = 'aus_user_data';

    var _currentUser  = null;
    var _accessToken  = null;
    var _refreshTimer = null;

    // ── Private helpers ───────────────────────────────────────────────────────

    function _store(access, refresh, user) {
        try {
            localStorage.setItem(ACCESS_KEY,  access);
            localStorage.setItem(REFRESH_KEY, refresh);
            localStorage.setItem(USER_KEY,    JSON.stringify(user));
        } catch(e) {}
        _accessToken = access;
        _currentUser = user;
    }

    function _clear() {
        try {
            localStorage.removeItem(ACCESS_KEY);
            localStorage.removeItem(REFRESH_KEY);
            localStorage.removeItem(USER_KEY);
        } catch(e) {}
        _accessToken = null;
        _currentUser = null;
        clearTimeout(_refreshTimer);
    }

    function _load() {
        try {
            _accessToken = localStorage.getItem(ACCESS_KEY)  || null;
            var raw      = localStorage.getItem(USER_KEY);
            _currentUser = raw ? JSON.parse(raw) : null;
        } catch(e) { _clear(); }
    }

    async function _api(method, path, body, auth) {
        var headers = { 'Content-Type': 'application/json' };
        if (auth && _accessToken) headers['Authorization'] = 'Bearer ' + _accessToken;
        try {
            var res = await fetch(API_BASE + path, {
                method:  method,
                headers: headers,
                body:    body ? JSON.stringify(body) : undefined,
            });
            var data = await res.json().catch(function(){ return {}; });
            return { ok: res.ok, status: res.status, data: data };
        } catch(e) {
            return { ok: false, status: 0, data: { detail: 'لا يمكن الوصول إلى الخادم' } };
        }
    }

    function _extractError(data) {
        if (!data) return 'حدث خطأ غير متوقع';
        if (typeof data.detail === 'string') return data.detail;
        if (typeof data.detail === 'object' && data.detail.message) return data.detail.message;
        if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        return 'حدث خطأ. حاول مجدداً';
    }

    // ── Token refresh (called automatically 1 min before expiry) ─────────────

    function _scheduleRefresh() {
        clearTimeout(_refreshTimer);
        // Access token is 15 min — refresh at 14 min
        _refreshTimer = setTimeout(function() { _silentRefresh(); }, 14 * 60 * 1000);
    }

    async function _silentRefresh() {
        var refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) { _clear(); _updateUI(); return; }
        var res = await _api('POST', '/api/auth/refresh', { refresh_token: refreshToken });
        if (res.ok) {
            localStorage.setItem(ACCESS_KEY,  res.data.access_token);
            if (res.data.refresh_token) localStorage.setItem(REFRESH_KEY, res.data.refresh_token);
            _accessToken = res.data.access_token;
            _scheduleRefresh();
        } else {
            _clear();
            _updateUI();
        }
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    function _showError(msg) {
        var el = document.getElementById('authError');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('visible');
    }

    function _hideError() {
        var el = document.getElementById('authError');
        if (el) el.classList.remove('visible');
    }

    function _setBtnLoading(btnId, textId, loading, label) {
        var btn  = document.getElementById(btnId);
        var span = document.getElementById(textId);
        if (!btn) return;
        btn.disabled = loading;
        if (span) span.textContent = loading ? '...' : label;
    }

    function _updateUI() {
        var loginBtn  = document.getElementById('authLoginBtn');
        var menuPill  = document.getElementById('userMenuPill');
        var nameEl    = document.getElementById('authUserName');
        var avatarEl  = document.getElementById('authUserAvatar');
        var badgeEl   = document.getElementById('authPlanBadge');
        var upgradeBtn = document.getElementById('upgradeDropdownBtn');

        if (!loginBtn || !menuPill) return;

        if (_currentUser) {
            loginBtn.style.display = 'none';
            menuPill.style.display = 'flex';
            var name = _currentUser.full_name || _currentUser.email || '—';
            if (nameEl) nameEl.textContent = name.substring(0, 16);
            if (avatarEl) avatarEl.textContent = (name[0] || '؟').toUpperCase();
            if (badgeEl) {
                badgeEl.textContent = _currentUser.plan === 'pro' ? 'PRO' : 'Free';
                badgeEl.className = 'plan-badge ' + (_currentUser.plan === 'pro' ? 'pro' : 'free');
            }
            // Hide upgrade button if already pro
            if (upgradeBtn) upgradeBtn.style.display = _currentUser.plan === 'pro' ? 'none' : 'flex';
        } else {
            loginBtn.style.display = 'flex';
            menuPill.style.display = 'none';
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    function openModal(tab) {
        var overlay = document.getElementById('authModalOverlay');
        if (overlay) overlay.classList.add('visible');
        switchTab(tab || 'login');
        _hideError();
    }

    function closeModal() {
        var overlay = document.getElementById('authModalOverlay');
        if (overlay) overlay.classList.remove('visible');
    }

    function handleOverlayClick(e) {
        if (e.target === document.getElementById('authModalOverlay')) closeModal();
    }

    function switchTab(tab) {
        // Each form ID mapped to whether it should be visible for this tab
        var formVisibility = {
            'authFormLogin':    tab === 'login',
            'authFormRegister': tab === 'register',
            'authFormUpgrade':  tab === 'upgrade' || tab === 'profile',
        };
        var tabs = { login: 'authTabLogin', register: 'authTabRegister' };
        Object.keys(formVisibility).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = formVisibility[id] ? 'block' : 'none';
        });
        Object.keys(tabs).forEach(function(k) {
            var el = document.getElementById(tabs[k]);
            if (el) el.classList.toggle('active', k === tab);
        });
        _hideError();
    }

    function toggleDropdown() {
        var pill = document.getElementById('userMenuPill');
        if (pill) pill.classList.toggle('open');
        // Close when clicking anywhere else
        setTimeout(function() {
            document.addEventListener('click', function _close(e) {
                var pill = document.getElementById('userMenuPill');
                if (pill && !pill.contains(e.target)) {
                    pill.classList.remove('open');
                    document.removeEventListener('click', _close);
                }
            });
        }, 0);
    }

    function openUpgrade() {
        var pill = document.getElementById('userMenuPill');
        if (pill) pill.classList.remove('open');
        openModal('upgrade');
    }

    async function doLogin() {
        _hideError();
        var email = (document.getElementById('loginEmail') || {}).value || '';
        var pass  = (document.getElementById('loginPassword') || {}).value || '';
        if (!email || !pass) { _showError('يرجى تعبئة جميع الحقول'); return; }

        _setBtnLoading('loginSubmitBtn', 'loginBtnText', true, '');
        var res = await _api('POST', '/api/auth/login', { email: email, password: pass });
        _setBtnLoading('loginSubmitBtn', 'loginBtnText', false, 'تسجيل الدخول');

        if (res.ok) {
            _store(res.data.access_token, res.data.refresh_token, res.data.user);
            _scheduleRefresh();
            closeModal();
            _updateUI();
            if (typeof addXP === 'function') addXP(5);
            _toast('مرحباً ' + (res.data.user.full_name || res.data.user.email) + ' 👋', 'success');
        } else {
            _showError(_extractError(res.data));
        }
    }

    async function doRegister() {
        _hideError();
        var name  = (document.getElementById('regName')     || {}).value || '';
        var email = (document.getElementById('regEmail')    || {}).value || '';
        var pass  = (document.getElementById('regPassword') || {}).value || '';
        if (!email || !pass) { _showError('البريد وكلمة المرور مطلوبان'); return; }
        if (pass.length < 8) { _showError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }

        _setBtnLoading('registerSubmitBtn', 'registerBtnText', true, '');
        var body = { email: email, password: pass };
        if (name.trim()) body.full_name = name.trim();
        var res = await _api('POST', '/api/auth/register', body);
        _setBtnLoading('registerSubmitBtn', 'registerBtnText', false, 'إنشاء الحساب');

        if (res.ok) {
            _store(res.data.access_token, res.data.refresh_token, res.data.user);
            _scheduleRefresh();
            closeModal();
            _updateUI();
            if (typeof addXP === 'function') addXP(20);
            _toast('أهلاً وسهلاً! حسابك جاهز 🎓', 'success');
        } else {
            _showError(_extractError(res.data));
        }
    }

    async function logout() {
        var pill = document.getElementById('userMenuPill');
        if (pill) pill.classList.remove('open');
        var refreshToken = localStorage.getItem(REFRESH_KEY);
        if (refreshToken) {
            await _api('POST', '/api/auth/logout', { refresh_token: refreshToken });
        }
        _clear();
        _updateUI();
        _toast('تم تسجيل الخروج', 'info');
    }

    async function startCheckout() {
        if (!_currentUser) { openModal('login'); return; }
        _setBtnLoading('', 'upgradeBtnText', true, '');
        var res = await _api('POST', '/api/payments/create-checkout', {}, true);
        var btn = document.getElementById('upgradeBtnText');
        if (btn) btn.textContent = 'الاشتراك الآن';
        if (res.ok && res.data.checkout_url) {
            window.open(res.data.checkout_url, '_blank');
            closeModal();
        } else {
            _showError(res.data.detail || 'تعذّر فتح صفحة الدفع. تحقق من إعدادات Stripe');
        }
    }

    // Plan gate — call before premium features
    function checkGate(feature) {
        if (!_currentUser) {
            // Not logged in
            _planGateToast('تسجيل الدخول مطلوب لاستخدام هذه الميزة', true);
            return false;
        }
        if (feature === 'voice' && _currentUser.plan !== 'pro') {
            _planGateToast('الصوت متاح لمشتركي PRO فقط', false);
            return false;
        }
        if (feature === 'export' && _currentUser.plan !== 'pro') {
            _planGateToast('تصدير PDF متاح لمشتركي PRO فقط', false);
            return false;
        }
        return true;
    }

    function _planGateToast(msg, needsLogin) {
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed;top:5rem;left:50%;transform:translateX(-50%) translateY(-8px);z-index:9700;',
            'background:linear-gradient(135deg,rgba(255,180,0,0.18),rgba(255,100,0,0.12));',
            'border:1px solid rgba(255,180,0,0.4);border-radius:14px;',
            'padding:0.7rem 1.3rem 0.7rem 0.9rem;display:flex;align-items:center;gap:0.8rem;',
            'font-family:Tajawal,sans-serif;font-weight:700;font-size:0.88rem;direction:rtl;',
            'color:#ffb700;box-shadow:0 8px 28px rgba(255,180,0,0.2);pointer-events:auto;',
            'transition:opacity 0.35s,transform 0.35s;cursor:pointer;max-width:360px;'
        ].join('');
        t.innerHTML = '<span style="font-size:1.2rem">👑</span><span>' + msg + '</span>' +
            '<button style="background:rgba(255,180,0,0.25);border:1px solid rgba(255,180,0,0.4);border-radius:8px;padding:4px 10px;color:#ffb700;font-family:Tajawal,sans-serif;font-weight:800;font-size:0.78rem;cursor:pointer;margin-right:auto">' +
            (needsLogin ? 'تسجيل الدخول' : 'ترقية') + '</button>';
        document.body.appendChild(t);
        t.querySelector('button').onclick = function() {
            document.body.removeChild(t);
            openModal(needsLogin ? 'login' : 'upgrade');
        };
        requestAnimationFrame(function(){ t.style.transform = 'translateX(-50%) translateY(0)'; });
        setTimeout(function(){
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(-8px)';
            setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 380);
        }, 5000);
    }

    function _toast(msg, type) {
        var colors = {
            success: { bg: 'rgba(0,245,120,0.18)', border: 'rgba(0,245,120,0.48)', text: '#69f0ae' },
            info:    { bg: 'rgba(0,212,255,0.15)', border: 'rgba(0,212,255,0.38)', text: 'rgba(0,212,255,0.9)' },
        };
        var c = colors[type] || colors.info;
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed;top:5rem;left:50%;transform:translateX(-50%) translateY(-8px);z-index:9700;',
            'background:linear-gradient(135deg,' + c.bg + ',' + c.bg + ');',
            'border:1px solid ' + c.border + ';border-radius:14px;',
            'padding:0.65rem 1.4rem;font-family:Tajawal,sans-serif;font-weight:700;',
            'font-size:0.9rem;color:' + c.text + ';pointer-events:none;',
            'transition:opacity 0.35s,transform 0.35s;'
        ].join('');
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function(){ t.style.transform = 'translateX(-50%) translateY(0)'; });
        setTimeout(function(){
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(-8px)';
            setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 380);
        }, 2800);
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    function init() {
        // A newer local-first auth system (auth_system.js) has taken over.
        // Stand down so we don't fight it over the shared DOM (login button / pill).
        if (window.__ausAuthV2) return;
        _load();
        _updateUI();
        if (_accessToken) _scheduleRefresh();

        // Show login button after a short delay (let splash finish)
        setTimeout(function() {
            if (window.__ausAuthV2) return;
            var loginBtn = document.getElementById('authLoginBtn');
            if (loginBtn && !_currentUser) loginBtn.style.display = 'flex';
            else if (loginBtn && _currentUser) loginBtn.style.display = 'none';
        }, 3500);

        // Enter key on auth inputs
        ['loginPassword', 'regPassword'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    if (id === 'loginPassword') doLogin();
                    else doRegister();
                }
            });
        });
    }

    // Auto-init after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 200);
    }

    return {
        openModal:         openModal,
        closeModal:        closeModal,
        handleOverlayClick: handleOverlayClick,
        switchTab:         switchTab,
        toggleDropdown:    toggleDropdown,
        openUpgrade:       openUpgrade,
        doLogin:           doLogin,
        doRegister:        doRegister,
        logout:            logout,
        startCheckout:     startCheckout,
        checkGate:         checkGate,
        get user()  { return _currentUser; },
        get token() { return _accessToken; },
        get isPro() { return _currentUser && _currentUser.plan === 'pro'; },
    };
})();

// Expose globally
window.ausAuth = ausAuth;
