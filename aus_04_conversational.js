// ===========================================================================
// =========== CONVERSATIONAL AI (free-form + memory + consulting) ===========
// ===========================================================================

const CHAT_MEMORY_KEY = 'aus.chat.memory';
const CHAT_MEMORY_LIMIT = 40;
const chatMemory = []; // array of { role, content, lang, at }

function saveChatMemory() {
    try {
        localStorage.setItem(CHAT_MEMORY_KEY, JSON.stringify(chatMemory.slice(-CHAT_MEMORY_LIMIT)));
    } catch {}
}
function loadChatMemory() {
    try {
        const raw = localStorage.getItem(CHAT_MEMORY_KEY);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return;
        chatMemory.length = 0;
        arr.forEach(m => chatMemory.push(m));
        // Re-render saved messages into chat surface (visual continuity).
        const msgs = document.getElementById('chatMessages');
        if (!msgs) return;
        // Skip the welcome message already rendered.
        chatMemory.slice(-20).forEach(m => {
            if (m.role === 'user') {
                msgs.insertAdjacentHTML('beforeend',
                    `<div class="message user">${(m.content || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]))}</div>`);
            } else {
                msgs.insertAdjacentHTML('beforeend',
                    `<div class="message ai"><div class="ai-meta"><span class="ai-avatar">🧠</span>CEO · AI</div>${m.content || ''}</div>`);
            }
        });
        msgs.scrollTop = msgs.scrollHeight;
    } catch {}
}
function clearChatMemory() { chatMemory.length = 0; saveChatMemory(); }

// --- Consulting mode toggle (changes tone + grounding) ---
if (!('consultingMode' in prefs)) prefs.consultingMode = true;
function toggleConsulting() {
    prefs.consultingMode = !prefs.consultingMode;
    savePrefs();
    showToast(prefs.consultingMode ? '🎯 وضع المستشار التنفيذي مفعّل' : '💬 المحادثة الحرة', 'xp-toast');
}

// --- Free-form intent detection ---
function detectChatIntent(msg) {
    const q = normalizeAr(msg);
    if (/^(مرحبا|اهلا|السلام عليكم|هلا|hi|hello|hey|hola|salut|bonjour|hallo|guten|ciao|merhaba|konnichiwa|annyeong|privet|nihao|你好)/.test(q)) return 'greeting';
    if (/(من انت|انت مين|من تكون|who are you|wer bist du|qui es-tu|quien eres|kimsin|誰|你是|누구|кто ты|chi sei)/.test(q)) return 'identity';
    if (/(شكرا|شكرًا|thanks|thank you|danke|merci|gracias|teşekkür|ありがとう|谢谢|감사|спасибо|grazie)/.test(q)) return 'thanks';
    if (/(كيف حالك|كيفك|how are you|wie geht|ça va|cómo estás|nasılsın|お元気|你好吗|어떻게|как дела|come stai)/.test(q)) return 'smalltalk';
    if (/(وداع|باي|مع السلامة|bye|goodbye|tschuss|au revoir|adios|hoşçakal|さようなら|再见|안녕히|пока|arrivederci)/.test(q)) return 'farewell';
    if (/(ساعدني|مساعدة|help|hilfe|aide|ayuda|yardım|助けて|帮助|도움|помощь|aiuto)/.test(q)) return 'help';
    if (/(\?|؟|why|how|what|when|where|who|warum|wie|was|wann|wo|wer|pourquoi|comment|quoi|por qué|cómo|qué|neden|nasıl|ne)/.test(q)) return 'question';
    return 'statement';
}

// --- Smarter, multi-lingual fallback replies for non-KB conversations ---
function chatPersonalityReply(intent, original) {
    const L = prefs.lang;
    const mode = prefs.consultingMode ? 'consulting' : 'casual';
    const D = {
        greeting: {
            ar: 'مرحباً 👋 أنا CEO AI — مستشارك التنفيذي. اسألني عن أي تحدٍ إداري، مالي، استراتيجي، أو قيادي.',
            en: 'Hi 👋 I\'m CEO AI — your executive advisor. Ask me about any management, finance, strategy, or leadership challenge.',
            de: 'Hallo 👋 Ich bin CEO AI — dein Executive-Berater. Frag mich zu Management, Finanzen, Strategie oder Führung.',
            fr: 'Bonjour 👋 Je suis CEO AI — votre conseiller exécutif. Posez-moi vos questions de management.',
            es: 'Hola 👋 Soy CEO AI — tu asesor ejecutivo. Pregúntame sobre gestión, finanzas o liderazgo.',
            tr: 'Merhaba 👋 Ben CEO AI — yönetici danışmanın. Herhangi bir yönetim/strateji konusunu sor.',
            ja: 'こんにちは 👋 私は CEO AI — あなたの経営アドバイザーです。',
            zh: '你好 👋 我是 CEO AI — 你的高管顾问。问我任何战略问题。',
            ko: '안녕하세요 👋 저는 CEO AI — 당신의 임원 자문입니다.',
            ru: 'Привет 👋 Я CEO AI — ваш руководитель-консультант.',
            it: 'Ciao 👋 Sono CEO AI — il tuo consulente esecutivo.'
        },
        identity: {
            ar: 'أنا CEO AI، مساعد ذكي بُني على قاعدة معرفة 26 مفهوماً إدارياً + 70 أداة. أتذكّر آخر 40 رسالة، وأقدّم تحليلاً ومراجع ومثالاً واقعياً مع كل إجابة.',
            en: 'I\'m CEO AI — an assistant built on a knowledge base of 26 management frameworks + 70 tools. I remember the last 40 messages and ground every answer in references + a real example.',
            de: 'Ich bin CEO AI — basiert auf 26 Management-Frameworks + 70 Tools. Erinnere mich an die letzten 40 Nachrichten.',
            fr: 'Je suis CEO AI — 26 frameworks + 70 outils. Je mémorise les 40 derniers messages.',
            es: 'Soy CEO AI — 26 frameworks + 70 herramientas. Recuerdo los últimos 40 mensajes.',
            tr: 'Ben CEO AI — 26 yönetim çerçevesi + 70 araç. Son 40 mesajı hatırlıyorum.',
            ja: '私は CEO AI — 26 のフレームワーク + 70 ツール。直近 40 件を記憶。',
            zh: '我是 CEO AI — 26 个管理框架 + 70 个工具。记住最近 40 条消息。',
            ko: 'CEO AI — 26개 프레임워크 + 70개 도구. 최근 40개 메시지 기억.',
            ru: 'Я CEO AI — 26 фреймворков + 70 инструментов. Помню последние 40 сообщений.',
            it: 'Sono CEO AI — 26 framework + 70 strumenti. Ricordo gli ultimi 40 messaggi.'
        },
        thanks: {
            ar: 'العفو 🙏 — جاهز للسؤال التالي. هل تريد أن نواصل في نفس الموضوع، أم ننتقل لمفهوم آخر؟',
            en: 'You\'re welcome 🙏 — ready for the next one. Continue on the same topic or explore something new?',
            de: 'Gern geschehen 🙏 — bereit für die nächste Frage.',
            fr: 'De rien 🙏 — prêt pour la suivante.',
            es: 'De nada 🙏 — listo para la siguiente.',
            tr: 'Rica ederim 🙏 — bir sonraki için hazırım.',
            ja: 'どういたしまして 🙏',
            zh: '不客气 🙏 — 准备好回答下一个问题。',
            ko: '천만에요 🙏',
            ru: 'Пожалуйста 🙏 — готов к следующему.',
            it: 'Prego 🙏'
        },
        smalltalk: {
            ar: 'بأفضل حال — جاهز لتحليل أي قرار قيادي معك. شاركني السياق وسأقدّم خطوة عملية واحدة.',
            en: 'Doing great — ready to analyze any leadership call. Share the context and I\'ll give you one concrete next step.',
            de: 'Mir geht\'s gut — ich helfe bei jeder Führungsentscheidung. Beschreibe den Kontext.',
            fr: 'Très bien — partagez le contexte, je vous propose un pas concret.',
            es: 'Muy bien — comparte el contexto y te doy el siguiente paso concreto.',
            tr: 'İyi — bağlamı paylaş, somut bir adım önereyim.',
            ja: '元気です — 状況を教えてください、具体的な次の一歩を提案します。',
            zh: '很好 — 告诉我背景,我会给一个具体的下一步建议。',
            ko: '좋아요 — 상황을 알려주세요, 구체적인 다음 단계를 제안할게요.',
            ru: 'Отлично — опишите контекст, дам конкретный следующий шаг.',
            it: 'Tutto bene — descrivi il contesto, ti do un passo concreto.'
        },
        farewell: {
            ar: 'موفّق 👋 — رجوعك مرحب به في أي وقت. ذاكرتي محفوظة.',
            en: 'Goodbye 👋 — come back anytime. My memory persists.',
            de: 'Auf Wiedersehen 👋 — komm jederzeit zurück.',
            fr: 'Au revoir 👋 — revenez quand vous voulez.',
            es: 'Hasta luego 👋',
            tr: 'Görüşürüz 👋',
            ja: 'またね 👋',
            zh: '再见 👋',
            ko: '안녕히 가세요 👋',
            ru: 'До свидания 👋',
            it: 'Arrivederci 👋'
        },
        help: {
            ar: 'اختر مجالاً وسأرشدك: استراتيجية، تسويق، مالية، موارد بشرية، عمليات، تكنولوجيا. أو اسألني مباشرة "كيف أحسّن النمو؟" أو "ما الخطوة بعد إطلاق منتج جديد؟"',
            en: 'Pick a field: strategy, marketing, finance, HR, operations, tech. Or ask directly: "How do I grow faster?" or "What\'s next after launching a product?"',
            de: 'Wähle einen Bereich: Strategie, Marketing, Finanzen, HR, Betrieb, Tech.',
            fr: 'Choisissez un domaine: stratégie, marketing, finance, RH, opérations, tech.',
            es: 'Elige un área: estrategia, marketing, finanzas, RRHH, operaciones, tecnología.',
            tr: 'Bir alan seç: strateji, pazarlama, finans, İK, operasyon, teknoloji.',
            ja: '分野を選んでください:戦略、マーケ、財務、人事、運営、技術。',
            zh: '选择领域:战略、营销、财务、人力、运营、技术。',
            ko: '분야 선택: 전략, 마케팅, 재무, HR, 운영, 기술.',
            ru: 'Выберите область: стратегия, маркетинг, финансы, HR, операции, технологии.',
            it: 'Scegli un\'area: strategia, marketing, finanza, HR, operazioni, tech.'
        }
    };
    const pack = D[intent];
    if (pack) {
        const text = pack[L] || pack.ar;
        // Wrap in same HTML structure as KB answers for consistency
        return {
            text: `<div class="ai-definition">${text}</div>`,
            references: ['CEO AI · ' + (mode === 'consulting' ? 'Consulting Mode' : 'Casual')]
        };
    }
    return null;
}

// --- Override generateAIResponse to add conversational intents + memory ---
const _origGenerateAIResponse = generateAIResponse;
generateAIResponse = function(message) {
    // Push user message into memory
    chatMemory.push({ role: 'user', content: message, lang: prefs.lang, at: Date.now() });
    if (chatMemory.length > CHAT_MEMORY_LIMIT) chatMemory.shift();

    // 1) free-form conversational intents
    const intent = detectChatIntent(message);
    if (['greeting', 'identity', 'thanks', 'smalltalk', 'farewell', 'help'].includes(intent)) {
        const reply = chatPersonalityReply(intent, message);
        if (reply) {
            chatMemory.push({ role: 'assistant', content: reply.text, lang: prefs.lang, at: Date.now() });
            saveChatMemory();
            return reply;
        }
    }

    // 2) Otherwise use the KB-grounded generator
    let r = _origGenerateAIResponse(message);

    // 3) If consulting mode and we hit a fallback, enrich with context awareness
    if (prefs.consultingMode && r && /CEO AI يفكّر معك/.test(r.text)) {
        const lastTopic = chatMemory.slice(-6).reverse().find(m => m.role === 'user' && m.content !== message);
        if (lastTopic) {
            const hint = prefs.lang === 'ar'
                ? `<div class="ai-section"><div class="ai-section-title"><i class="fas fa-link"></i> سياقك السابق</div><p>سألت قبل قليل عن: "${(lastTopic.content || '').slice(0, 80)}". هل تريد أن نربط هذا السؤال بذاك؟</p></div>`
                : `<div class="ai-section"><div class="ai-section-title"><i class="fas fa-link"></i> Recent context</div><p>You recently asked: "${(lastTopic.content || '').slice(0, 80)}". Want me to connect this to that?</p></div>`;
            r = { ...r, text: r.text + hint };
        }
    }

    // 4) Persist assistant reply
    chatMemory.push({ role: 'assistant', content: r.text, lang: prefs.lang, at: Date.now() });
    if (chatMemory.length > CHAT_MEMORY_LIMIT) chatMemory.shift();
    saveChatMemory();
    return r;
};

// ===========================================================================
// =================== DRAGGABLE HOLOGRAPHIC ORBS + GRAVITY ==================
// ===========================================================================
function initOrbs() {
    const SIZE = 64;
    const COUNT = 5;
    const COLORS = ['#00d4ff', '#9d4edd', '#00f5d4', '#ffd700', '#ff006e'];
    const wrap = document.createElement('div');
    wrap.id = 'orb-layer';
    Object.assign(wrap.style, {
        position: 'fixed', inset: '0', zIndex: '6', pointerEvents: 'none',
        overflow: 'hidden'
    });
    document.body.appendChild(wrap);

    const orbs = [];
    for (let i = 0; i < COUNT; i++) {
        const el = document.createElement('div');
        const c = COLORS[i % COLORS.length];
        Object.assign(el.style, {
            position: 'absolute',
            width: SIZE + 'px',
            height: SIZE + 'px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, #fff 0%, ${c} 35%, transparent 75%)`,
            boxShadow: `0 0 30px ${c}, inset 0 0 20px rgba(255,255,255,0.4)`,
            pointerEvents: 'auto',
            cursor: 'grab',
            opacity: '0.85',
            transition: 'box-shadow 0.2s, transform 0.1s',
            willChange: 'transform'
        });
        el.className = 'holo-orb';
        el.dataset.idx = String(i);
        wrap.appendChild(el);
        orbs.push({
            el,
            x: 80 + Math.random() * (window.innerWidth - 160),
            y: 120 + Math.random() * (window.innerHeight - 240),
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            dragging: false,
            dragOffX: 0, dragOffY: 0,
            lastX: 0, lastY: 0, lastT: 0,
            color: c
        });
    }

    // Mouse tracking for gravity
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

    orbs.forEach((o, idx) => {
        o.el.addEventListener('pointerdown', (e) => {
            o.dragging = true;
            o.dragOffX = e.clientX - o.x;
            o.dragOffY = e.clientY - o.y;
            o.lastX = e.clientX; o.lastY = e.clientY; o.lastT = performance.now();
            o.el.style.cursor = 'grabbing';
            o.el.style.boxShadow = `0 0 50px ${o.color}, inset 0 0 30px rgba(255,255,255,0.6)`;
            try { o.el.setPointerCapture(e.pointerId); } catch {}
            sfxPlay('hover');
        });
        o.el.addEventListener('pointermove', (e) => {
            if (!o.dragging) return;
            const now = performance.now();
            const dt = Math.max(1, now - o.lastT);
            o.vx = (e.clientX - o.lastX) / dt * 16;
            o.vy = (e.clientY - o.lastY) / dt * 16;
            o.x = e.clientX - o.dragOffX;
            o.y = e.clientY - o.dragOffY;
            o.lastX = e.clientX; o.lastY = e.clientY; o.lastT = now;
        });
        const release = (e) => {
            if (!o.dragging) return;
            o.dragging = false;
            o.el.style.cursor = 'grab';
            o.el.style.boxShadow = `0 0 30px ${o.color}, inset 0 0 20px rgba(255,255,255,0.4)`;
            try { o.el.releasePointerCapture(e.pointerId); } catch {}
            sfxPlay('click');
        };
        o.el.addEventListener('pointerup', release);
        o.el.addEventListener('pointercancel', release);
    });

    function tick() {
        if (!prefs.fx || prefs.reduceMotion) {
            wrap.style.display = 'none';
            requestAnimationFrame(tick);
            return;
        }
        wrap.style.display = '';
        const W = window.innerWidth, H = window.innerHeight;
        for (const o of orbs) {
            if (!o.dragging) {
                // Mouse gravity — soft attraction within range
                const dx = mx - o.x, dy = my - o.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist < 220 && dist > 30) {
                    o.vx += (dx / dist) * 0.12;
                    o.vy += (dy / dist) * 0.12;
                } else if (dist <= 30) {
                    // soft repulsion when too close to avoid sticking
                    o.vx -= (dx / dist) * 0.25;
                    o.vy -= (dy / dist) * 0.25;
                }
                // friction
                o.vx *= 0.96; o.vy *= 0.96;
                // integrate
                o.x += o.vx; o.y += o.vy;
                // edge bounce
                if (o.x < 0) { o.x = 0; o.vx = -o.vx * 0.7; }
                if (o.x > W - SIZE) { o.x = W - SIZE; o.vx = -o.vx * 0.7; }
                if (o.y < 0) { o.y = 0; o.vy = -o.vy * 0.7; }
                if (o.y > H - SIZE) { o.y = H - SIZE; o.vy = -o.vy * 0.7; }
            }
            o.el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
        }
        requestAnimationFrame(tick);
    }
    tick();
    window.__orbs = orbs;
}

// ===========================================================================
// ====================== FULL i18n for visible chrome =======================
// ===========================================================================
const I18N_FULL = {
    ar: { home:'الرئيسية', tools:'الأدوات', leadership:'الشخصية القيادية', challenges:'التحديات', actions:'أفضل تصرف', ceoai:'CEO AI', certs:'الشهادات', startJourney:'ابدأ الرحلة', subOnline:'متصل الآن • CEO AI', chatPlaceholder:'اسألني أي شيء عن الأعمال...', heroSub:'منصة التعلم الذكي للأعمال — تعليم تفاعلي بمحاكاة الواقع' },
    en: { home:'Home', tools:'Tools', leadership:'Leadership', challenges:'Challenges', actions:'Best Action', ceoai:'CEO AI', certs:'Certificates', startJourney:'Start Journey', subOnline:'Online · CEO AI', chatPlaceholder:'Ask me anything about business...', heroSub:'AI business learning platform — interactive simulation-based education' },
    de: { home:'Start', tools:'Werkzeuge', leadership:'Führung', challenges:'Herausforderungen', actions:'Beste Aktion', ceoai:'CEO AI', certs:'Zertifikate', startJourney:'Reise starten', subOnline:'Online · CEO AI', chatPlaceholder:'Frag mich alles übers Geschäft …', heroSub:'KI-Business-Lernplattform — interaktive Simulation' },
    fr: { home:'Accueil', tools:'Outils', leadership:'Leadership', challenges:'Défis', actions:'Meilleure action', ceoai:'CEO AI', certs:'Certificats', startJourney:'Commencer', subOnline:'En ligne · CEO AI', chatPlaceholder:'Posez-moi toute question business…', heroSub:'Plateforme IA d\'apprentissage business — simulation interactive' },
    es: { home:'Inicio', tools:'Herramientas', leadership:'Liderazgo', challenges:'Retos', actions:'Mejor acción', ceoai:'CEO AI', certs:'Certificados', startJourney:'Empezar', subOnline:'En línea · CEO AI', chatPlaceholder:'Pregúntame cualquier cosa de negocios…', heroSub:'Plataforma IA de aprendizaje empresarial' },
    tr: { home:'Ana sayfa', tools:'Araçlar', leadership:'Liderlik', challenges:'Zorluklar', actions:'En iyi hamle', ceoai:'CEO AI', certs:'Sertifikalar', startJourney:'Yolculuğa başla', subOnline:'Çevrimiçi · CEO AI', chatPlaceholder:'İş hakkında her şeyi sor…', heroSub:'YZ iş öğrenme platformu — etkileşimli simülasyon' },
    ja: { home:'ホーム', tools:'ツール', leadership:'リーダーシップ', challenges:'チャレンジ', actions:'最良の行動', ceoai:'CEO AI', certs:'証明書', startJourney:'旅を始める', subOnline:'オンライン · CEO AI', chatPlaceholder:'ビジネスについて何でも…', heroSub:'AI ビジネス学習プラットフォーム' },
    zh: { home:'首页', tools:'工具', leadership:'领导力', challenges:'挑战', actions:'最佳行动', ceoai:'CEO AI', certs:'证书', startJourney:'开始旅程', subOnline:'在线 · CEO AI', chatPlaceholder:'问我任何商业问题…', heroSub:'AI 商业学习平台 — 交互式模拟' },
    ko: { home:'홈', tools:'도구', leadership:'리더십', challenges:'도전', actions:'최선의 행동', ceoai:'CEO AI', certs:'인증서', startJourney:'여정 시작', subOnline:'온라인 · CEO AI', chatPlaceholder:'비즈니스 무엇이든 물어보세요…', heroSub:'AI 비즈니스 학습 플랫폼' },
    ru: { home:'Главная', tools:'Инструменты', leadership:'Лидерство', challenges:'Вызовы', actions:'Лучший шаг', ceoai:'CEO AI', certs:'Сертификаты', startJourney:'Начать путь', subOnline:'Онлайн · CEO AI', chatPlaceholder:'Спросите меня о бизнесе…', heroSub:'ИИ-платформа бизнес-обучения' },
    it: { home:'Home', tools:'Strumenti', leadership:'Leadership', challenges:'Sfide', actions:'Migliore azione', ceoai:'CEO AI', certs:'Certificati', startJourney:'Inizia il viaggio', subOnline:'Online · CEO AI', chatPlaceholder:'Chiedimi qualsiasi cosa…', heroSub:'Piattaforma IA di apprendimento business' }
};
function applyFullI18n() {
    const T = I18N_FULL[prefs.lang] || I18N_FULL.ar;
    // Nav tabs (icon stays, text after is replaced)
    const navMap = [
        { sel: 'showSection(\'home\')', txt: T.home, icon: 'fa-home' },
        { sel: 'showSection(\'tools\')', txt: T.tools, icon: 'fa-tools' },
        { sel: 'showSection(\'leadership\')', txt: T.leadership, icon: 'fa-crown' },
        { sel: 'showSection(\'challenges\')', txt: T.challenges, icon: 'fa-brain' },
        { sel: 'showSection(\'actions\')', txt: T.actions, icon: 'fa-lightbulb' },
        { sel: 'showSection(\'ceoai\')', txt: T.ceoai, icon: 'fa-robot' },
        { sel: 'showSection(\'certificates\')', txt: T.certs, icon: 'fa-certificate' }
    ];
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const onclickAttr = tab.getAttribute('onclick') || '';
        const m = navMap.find(n => onclickAttr.includes(n.sel));
        if (m) tab.innerHTML = `<i class="fas ${m.icon}"></i> ${m.txt}`;
    });
    // Splash CTA
    const sBtnAr = document.querySelector('.splash-btn-ar');
    if (sBtnAr) sBtnAr.textContent = T.startJourney;
    const sub = document.querySelector('.splash-sub');
    if (sub) sub.textContent = T.heroSub;
    // Chat input placeholder + online subtitle
    const ci = document.getElementById('chatInput');
    if (ci) ci.placeholder = T.chatPlaceholder;
    const onlineSub = document.querySelector('.chat-header small');
    if (onlineSub) onlineSub.textContent = T.subOnline;
}

// Re-apply i18n whenever setLang fires
const _origSetLang = setLang;
setLang = function(code) {
    _origSetLang(code);
    try { applyFullI18n(); } catch {}
};

// Ensure orbs are created even if rAF ordering missed earlier inits.
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // initOrbs disabled — holo-orbs removed
        try { applyFullI18n(); } catch {}
        try { loadChatMemory(); } catch {}
    }, 100);
});

