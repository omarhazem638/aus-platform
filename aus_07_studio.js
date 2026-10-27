// ===========================================================================
// ════ AUS Chat System v3 — Premium AI Chat Upgrade ══════════════════════════
// ===========================================================================
// Adds: rich Markdown renderer (code blocks, tables, blockquotes, follow-up
// emphasis), streaming cursor, chat status line, message timestamps,
// consulting badge toggle, and keyboard Enter handler.
// All CSS tokens were pre-added to index.html.
// ===========================================================================
(function AUS_CHAT_v3() {
    'use strict';

    // ────────────────────────────────────────────────────────────────────────
    // 1. patchFormatAIResponse — Full Markdown → rich HTML renderer
    // ────────────────────────────────────────────────────────────────────────
    function patchFormatAIResponse() {
        // aus_56_markdown.js (AUS_MD) is the escape-first renderer and replaces this one: this formatter ran regular expressions over the RAW reply and put
        // the result in innerHTML, so whatever the model wrote (or quoted from the student) became markup. Kept only as the fallback if AUS_MD failed to load.
        if (window.AUS_MD && typeof window.AUS_MD.render === 'function') return;

        // Escape HTML content for display inside <code>
        const _esc = s => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        // Expose copy-code helper globally so onclick attrs work
        window.ausCopyCode = function(btn) {
            const block = btn.closest('.aus-code-block');
            if (!block) return;
            const code = block.querySelector('code');
            const text = code ? (code.textContent || '') : '';
            try { navigator.clipboard.writeText(text); } catch(e) {}
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ تم';
            setTimeout(() => { btn.innerHTML = orig; }, 1400);
        };

        window.formatAIResponse = function richFormat(raw) {
            if (!raw) return '';

            // ── A: lift out fenced code blocks (protect from Markdown processing) ──
            const CTAG  = '\x02C\x02';
            const store = [];
            let t = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
                const langLabel = lang
                    ? `<span>${_esc(lang.toLowerCase())}</span>`
                    : '<span>code</span>';
                const copyBtn = `<button class="code-copy" onclick="window.ausCopyCode(this)" title="نسخ">📋 نسخ</button>`;
                store.push(
                    `<div class="aus-code-block">` +
                        `<div class="code-lang">${langLabel}${copyBtn}</div>` +
                        `<pre><code>${_esc(code.trim())}</code></pre>` +
                    `</div>`
                );
                return CTAG + (store.length - 1) + CTAG;
            });

            // ── B: Markdown tables (header | separator | rows) ─────────────
            t = t.replace(/((?:[ \t]*\|[^\n]+\n?){3,})/g, block => {
                const rows = block.trim().split('\n').map(r => r.trim()).filter(Boolean);
                if (rows.length < 3) return block;
                const isSep = r => /^[\|\-\:\s]+$/.test(r);
                if (!isSep(rows[1])) return block;
                const cells = r => r.split('|').map(c => c.trim()).filter(c => c !== '');
                const hdr  = cells(rows[0]).map(c => `<th>${c}</th>`).join('');
                const body = rows.slice(2).map(r =>
                    `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`
                ).join('');
                return (
                    `<div class="aus-table-wrap">` +
                        `<table class="aus-table">` +
                            `<thead><tr>${hdr}</tr></thead>` +
                            `<tbody>${body}</tbody>` +
                        `</table>` +
                    `</div>`
                );
            });

            // ── C: blockquotes ─────────────────────────────────────────────
            t = t.replace(/^> (.+)$/gm, '<blockquote class="aus-quote">$1</blockquote>');

            // ── D: ATX headers ─────────────────────────────────────────────
            t = t.replace(/^### (.+)$/gm, '<h5 class="aus-h5">$1</h5>');
            t = t.replace(/^## (.+)$/gm,  '<h4 class="aus-h4">$1</h4>');
            t = t.replace(/^# (.+)$/gm,   '<h3 class="aus-h3">$1</h3>');

            // ── E: numbered lists ──────────────────────────────────────────
            t = t.replace(/^(\d+)[.)]\s+(.+)$/gm, '<li class="aus-ol-item">$2</li>');
            t = t.replace(/((?:<li class="aus-ol-item">[\s\S]*?<\/li>\n?)+)/g,
                m => `<ol class="aus-ol">${m}</ol>`);
            t = t.replace(/<\/ol>\s*<ol class="aus-ol">/g, '');

            // ── F: bullet lists ────────────────────────────────────────────
            t = t.replace(/^[\-\*•]\s+(.+)$/gm, '<li class="aus-ul-item">$1</li>');
            t = t.replace(/((?:<li class="aus-ul-item">[\s\S]*?<\/li>\n?)+)/g,
                m => `<ul class="aus-ul">${m}</ul>`);
            t = t.replace(/<\/ul>\s*<ul class="aus-ul">/g, '');

            // ── G: inline code ─────────────────────────────────────────────
            t = t.replace(/`([^`\n]{1,80})`/g, '<code class="aus-inline-code">$1</code>');

            // ── H: bold / italic ───────────────────────────────────────────
            t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
            t = t.replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>');
            t = t.replace(/\*([^*\n]+)\*/g,      '<em>$1</em>');
            t = t.replace(/__(.+?)__/g,           '<strong>$1</strong>');
            t = t.replace(/_([^_\n]+)_/g,         '<em>$1</em>');

            // ── I: line breaks ─────────────────────────────────────────────
            t = t.replace(/\n\n+/g, '<br><br>');
            t = t.replace(/\n/g,   '<br>');

            // ── J: follow-up emphasis — last ?/؟ question sentence ─────────
            // Scan for all sentences ≥ 15 chars ending with ? or ؟, pick the last
            let lastIdx = -1, lastMatch = null;
            const FU = /([^<>?؟!]{14,}[?؟])/g;
            let fm;
            while ((fm = FU.exec(t)) !== null) { lastIdx = fm.index; lastMatch = fm; }
            if (lastIdx >= 0 && lastMatch) {
                const sentence = lastMatch[1].trim();
                t = t.slice(0, lastIdx)
                    + `<span class="aus-followup">${sentence}</span>`
                    + t.slice(lastIdx + lastMatch[0].length);
            }

            // ── K: restore extracted code blocks ───────────────────────────
            t = t.replace(new RegExp(CTAG + '(\\d+)' + CTAG, 'g'),
                (_, i) => store[+i] || '');

            return t;
        };
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. initTextStreamingCursor — add .text-streaming on host bubble
    //    while stream is live (dots gone, text present, no actions yet)
    // ────────────────────────────────────────────────────────────────────────
    function initTextStreamingCursor() {
        const chat = document.getElementById('chatMessages');
        if (!chat) return;

        new MutationObserver(function() {
            chat.querySelectorAll('.message.ai[id$="-host"]').forEach(function(host) {
                // The inner content div has the typingId as its id
                const inner = host.querySelector(':scope > div[id]');
                if (!inner) return;
                const streaming = inner.querySelector('.ai-stream-text')
                    && !inner.querySelector('.ai-actions')
                    && !inner.querySelector('.ai-typing-dots');
                host.classList.toggle('text-streaming', !!streaming);
            });
        }).observe(chat, { childList: true, subtree: true });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. initChatShiftEnter — capture Enter on keydown before onkeypress fires
    // ────────────────────────────────────────────────────────────────────────
    function initChatShiftEnter() {
        const inp = document.getElementById('chatInput');
        if (!inp) return;

        // useCapture:true fires before bubbling; preventDefault cancels keypress
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();    // prevents duplicate keypress → sendMessage
                if (typeof sendMessage === 'function') sendMessage();
            }
        }, true);

        // Inject hint line below the input area
        const area = inp.closest('.chat-input-area');
        if (area) {
            const next = area.nextElementSibling;
            if (!next || !next.classList.contains('aus-input-hint')) {
                const hint = document.createElement('div');
                hint.className = 'aus-input-hint';
                hint.textContent = 'Enter للإرسال';
                area.insertAdjacentElement('afterend', hint);
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. initChatStatusLine — animated status strip below chat messages
    // ────────────────────────────────────────────────────────────────────────
    function initChatStatusLine() {
        const chat = document.getElementById('chatMessages');
        if (!chat || document.getElementById('ausChatStatus')) return;

        const bar = document.createElement('div');
        bar.id        = 'ausChatStatus';
        bar.className = 'aus-chat-status ready';
        bar.innerHTML = '<span class="status-dot"></span><span class="status-text"></span>';
        chat.insertAdjacentElement('afterend', bar);

        const txt = bar.querySelector('.status-text');
        let _readyTimer = null;

        function _set(state, label) {
            clearTimeout(_readyTimer);
            if (state === 'ready-flash') {
                bar.className = 'aus-chat-status streaming';
                txt.textContent = '✓ جاهز';
                _readyTimer = setTimeout(function() {
                    bar.className = 'aus-chat-status ready';
                    txt.textContent = '';
                }, 1600);
            } else {
                bar.className = 'aus-chat-status ' + state;
                txt.textContent = label || '';
            }
        }

        new MutationObserver(function() {
            const hasDots    = !!chat.querySelector('.ai-typing-dots');
            const hasStream  = !!chat.querySelector('.ai-stream-text');
            const hasActions = !!chat.querySelector('.message.ai:last-child .ai-actions');

            if (hasDots) {
                _set('thinking', 'CEO AI يفكّر...');
            } else if (hasStream && !hasActions) {
                _set('streaming', 'يكتب الرد...');
            } else if (hasActions && !hasDots) {
                // .ai-stream-text stays in DOM as the text container — don't check !hasStream
                _set('ready-flash', '');
            }
        }).observe(chat, { childList: true, subtree: true });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. initMessageTimestamps — add HH:MM stamp to each message bubble
    // ────────────────────────────────────────────────────────────────────────
    function initMessageTimestamps() {
        const chat = document.getElementById('chatMessages');
        if (!chat) return;

        function _now() {
            var d = new Date();
            return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
        }
        function _stamp(el) {
            if (el.dataset.ts) return;
            el.dataset.ts = '1';
            var s = document.createElement('span');
            s.className   = 'msg-time';
            s.textContent = _now();
            el.appendChild(s);
        }

        // Stamp pre-existing user messages (skip welcome AI bubble)
        chat.querySelectorAll('.message.user').forEach(_stamp);

        new MutationObserver(function(muts) {
            muts.forEach(function(mu) {
                mu.addedNodes.forEach(function(node) {
                    if (node.nodeType !== 1 || !node.classList.contains('message')) return;

                    if (node.classList.contains('user')) {
                        _stamp(node);
                        return;
                    }

                    // AI bubble: stamp only after .ai-actions is rendered (response done)
                    if (node.classList.contains('ai')) {
                        var inner = node.querySelector(':scope > div[id]');
                        if (!inner) { setTimeout(function(){ _stamp(node); }, 300); return; }

                        // Check immediately (fast response already finished)
                        if (inner.querySelector('.ai-actions')) { _stamp(node); return; }

                        var watcher = new MutationObserver(function() {
                            if (inner.querySelector('.ai-actions')) {
                                _stamp(node);
                                watcher.disconnect();
                            }
                        });
                        watcher.observe(inner, { childList: true, subtree: true });
                    }
                });
            });
        }).observe(chat, { childList: true });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 6. initConsultingBadge — pill toggle in chat header, syncs with prefs
    // ────────────────────────────────────────────────────────────────────────
    function initConsultingBadge() {
        var header = document.querySelector('#chatContainer .chat-header');
        if (!header || header.querySelector('.aus-consulting-badge')) return;

        function _isOn() { return typeof prefs !== 'undefined' ? !!prefs.consultingMode : true; }

        var badge = document.createElement('button');
        badge.id    = 'ausConsultingBadge';
        badge.title = 'تبديل وضع الاستشارة';
        badge.style.marginInlineStart = 'auto';
        badge.style.flexShrink = '0';

        function _refresh() {
            var on = _isOn();
            badge.className = 'aus-consulting-badge' + (on ? '' : ' off');
            badge.innerHTML = '<span class="badge-dot"></span>' + (on ? '🎯 استشارة' : '💬 محادثة');
        }

        _refresh();
        badge.onclick = function() {
            if (typeof toggleConsulting === 'function') toggleConsulting();
            setTimeout(_refresh, 0); // let toggleConsulting flip prefs first
        };

        header.appendChild(badge);
    }

    // ── BOOT ─────────────────────────────────────────────────────────────────
    function _boot() {
        try { patchFormatAIResponse(); }   catch(e) { console.warn('[AUS Chat v3] format:', e); }
        try { initTextStreamingCursor(); } catch(e) { console.warn('[AUS Chat v3] cursor:', e); }
        try { initChatShiftEnter(); }      catch(e) { console.warn('[AUS Chat v3] enter:', e); }
        try { initChatStatusLine(); }      catch(e) { console.warn('[AUS Chat v3] status:', e); }
        try { initMessageTimestamps(); }   catch(e) { console.warn('[AUS Chat v3] time:', e); }
        try { initConsultingBadge(); }     catch(e) { console.warn('[AUS Chat v3] badge:', e); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(_boot, 350); });
    } else {
        setTimeout(_boot, 350);
    }

})();

// ===========================================================================
// ════ AUS Voice System v4 — Cinematic Backend TTS Upgrade ═══════════════════
// ===========================================================================
// Adds: waveform loading indicator, backend-first AUSVoice.speak(),
// multilingual preview phrases, expanded accent panel (FR/DE/ES/KW/LB),
// IQ mapping already fixed in COUNTRY_TO_VOICE above.
// All CSS tokens pre-added to index.html. Backend caching added to main.py.
// ===========================================================================
(function AUS_VOICE_v4() {
    'use strict';

    // ── Multilingual preview phrases (spoken when user changes accent) ────────
    const PREVIEW = {
        SA: 'مرحباً، أنا صوتك الذكي — لهجة سعودية نيورال',
        AE: 'مرحباً، أنا صوتك الذكي — لهجة إماراتية نيورال',
        EG: 'أهلاً، أنا صوتك الذكي — لهجة مصرية نيورال',
        SY: 'مرحباً، أنا صوتك الذكي — لهجة سورية نيورال',
        JO: 'مرحباً، أنا صوتك الذكي — لهجة أردنية نيورال',
        IQ: 'مرحباً، أنا صوتك الذكي — لهجة عراقية نيورال',
        KW: 'مرحباً، أنا صوتك الذكي — لهجة كويتية نيورال',
        LB: 'مرحباً، أنا صوتك الذكي — لهجة لبنانية نيورال',
        BH: 'مرحباً، أنا صوتك الذكي — لهجة بحرينية نيورال',
        US: "Hello! I'm your AI assistant — US English Neural.",
        GB: "Hello! I'm your AI assistant — British English Neural.",
        FR: "Bonjour! Je suis votre assistant IA — voix française neurale.",
        DE: "Hallo! Ich bin Ihr KI-Assistent — deutsche neurale Stimme.",
        ES: "¡Hola! Soy tu asistente de IA — voz española neural.",
    };

    // Extra accent pills to inject into the panel (ones not already in the IIFE)
    const EXTRA_PILLS = [
        { id: 'KW', label: '🇰🇼 KW', lang: 'ar' },
        { id: 'LB', label: '🇱🇧 LB', lang: 'ar' },
        { id: 'FR', label: '🇫🇷 FR', lang: 'foreign' },
        { id: 'DE', label: '🇩🇪 DE', lang: 'foreign' },
        { id: 'ES', label: '🇪🇸 ES', lang: 'foreign' },
    ];

    // ── 1. Upgrade AUSVoice.speak() — always route through backend ───────────
    function patchAUSVoiceSpeak() {
        if (!window.AUSVoice) return;
        window.AUSVoice.speak = function(text) {
            if (!text) return;
            const p = (typeof prefs !== 'undefined') ? prefs : {};
            const voiceId = p.voiceBackendId || 'saudi-female';
            const speed   = p.voiceSpeed    || 1.0;
            if (typeof speakViaBackend === 'function' && p.voice !== false) {
                speakViaBackend(text, voiceId, speed)
                    .then(function(ok) {
                        // Fallback to Web Speech only if backend returns false
                        if (!ok && typeof speak === 'function') speak(text);
                    });
            } else if (typeof speak === 'function') {
                speak(text);
            }
        };
    }

    // ── 2. Wrap speakViaBackend() with waveform loading state ────────────────
    function patchBackendLoadingState() {
        if (typeof speakViaBackend !== 'function') return;
        var _orig = speakViaBackend;

        window.speakViaBackend = speakViaBackend = async function(text, voiceId, speed) {
            var wave = document.getElementById('ausSpeakingWave');
            if (wave) wave.classList.add('loading');
            try {
                var result = await _orig(text, voiceId, speed);
                return result;
            } catch(e) {
                // On error, hide loading immediately
                if (wave) wave.classList.remove('loading', 'active');
                return false;
            } finally {
                // Remove loading state (active is managed by showSpeakingUI)
                if (wave) wave.classList.remove('loading');
            }
        };
    }

    // ── 3. Patch setVoiceCountry() for multilingual preview phrases ──────────
    function patchVoiceCountryPreview() {
        var _orig = (typeof setVoiceCountry === 'function') ? setVoiceCountry : null;
        if (!_orig) return;

        window.setVoiceCountry = setVoiceCountry = function(country) {
            _orig(country);  // let original set prefs + load voice
            var phrase = PREVIEW[country];
            if (!phrase) return;
            var p = (typeof prefs !== 'undefined') ? prefs : {};
            if (!p.voice) return;
            var voiceId = p.voiceBackendId;
            if (!voiceId || typeof speakViaBackend !== 'function') return;
            // Small delay so prefs are written before we speak
            setTimeout(function() {
                speakViaBackend(phrase, voiceId, p.voiceSpeed || 1.0);
            }, 120);
        };
    }

    // ── 4. Inject extra accent pills (FR/DE/ES/KW/LB) into the panel ─────────
    function injectExtraAccentPills() {
        var row = document.querySelector('.aus-accents-row');
        if (!row) return;

        // Tag existing pills with data-country for active-state syncing
        row.querySelectorAll('.aus-accent-pill').forEach(function(btn) {
            if (!btn.dataset.country) {
                var m = (btn.getAttribute('onclick') || '').match(/'([A-Z]{2})'/);
                if (m) btn.dataset.country = m[1];
            }
        });

        var p = (typeof prefs !== 'undefined') ? prefs : {};
        var current = p.voiceCountry || 'SA';

        EXTRA_PILLS.forEach(function(a) {
            if (row.querySelector('[data-country="' + a.id + '"]')) return;
            var btn = document.createElement('button');
            btn.className = 'aus-accent-pill' + (a.id === current ? ' active' : '');
            btn.dataset.country = a.id;
            btn.dataset.lang    = a.lang;
            btn.textContent     = a.label;
            btn.onclick = function() {
                if (window.AUSVoice) window.AUSVoice.setCountry(a.id);
            };
            row.appendChild(btn);
        });
    }

    // ── 5. Keep panel active-pill in sync when country changes ────────────────
    function patchActivePillSync() {
        // Hook into AUSVoice.setCountry to update pill highlights
        var V = window.AUSVoice;
        if (!V) return;
        var _orig = V.setCountry;
        V.setCountry = function(c) {
            if (typeof _orig === 'function') _orig.call(V, c);
            // Sync all pills (including extras injected above)
            document.querySelectorAll('.aus-accent-pill').forEach(function(btn) {
                btn.classList.toggle('active', btn.dataset.country === c);
            });
        };
    }

    // ── BOOT ──────────────────────────────────────────────────────────────────
    function _boot() {
        try { patchAUSVoiceSpeak(); }           catch(e) { console.warn('[Voice v4] speak:', e); }
        try { patchBackendLoadingState(); }     catch(e) { console.warn('[Voice v4] load:', e); }
        try { patchVoiceCountryPreview(); }     catch(e) { console.warn('[Voice v4] preview:', e); }
        try { patchActivePillSync(); }          catch(e) { console.warn('[Voice v4] sync:', e); }
        // Inject extra pills after the panel renders (give AUSVoicePanelIIFE time)
        setTimeout(function() {
            try { injectExtraAccentPills(); }   catch(e) { console.warn('[Voice v4] pills:', e); }
        }, 1400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(_boot, 700); });
    } else {
        setTimeout(_boot, 700);
    }

})();

// ==================================================================================
// CAREER DNA SYSTEM — AI Personality & Career Path Analyser
// ==================================================================================

// ── State ──────────────────────────────────────────────────────────────────────────
let _cdnaState    = null;  // null | 'quiz' | 'results'
let _cdnaScores   = { analytical:0, creative:0, social:0, operational:0, strategic:0 };
let _cdnaCurrentQ = 0;

// ── Trait metadata ─────────────────────────────────────────────────────────────────
const CDNA_TRAIT_META = {
    analytical:  { label:'تحليلي',    color:'#00d4ff' },
    creative:    { label:'إبداعي',    color:'#9d4edd' },
    social:      { label:'اجتماعي',   color:'#00f5d4' },
    operational: { label:'تنفيذي',    color:'#ffd60a' },
    strategic:   { label:'استراتيجي', color:'#ff006e' },
};

// ── 15 Questions · 3 stages · 5 per stage ─────────────────────────────────────────
const CDNA_QUESTIONS = [
    // ── Stage 1: أسلوب العمل ──────────────────────────────────────────────────────
    {
        text: 'كيف تتعامل مع مشروع جديد ومعقد؟',
        options: [
            { text: 'أبدأ بتحليل البيانات والأرقام المتاحة لفهم المشكلة بعمق',     traits:{analytical:3,strategic:1} },
            { text: 'أبحث عن حلول إبداعية ومبتكرة تختلف عن الأساليب التقليدية',   traits:{creative:3,social:1}     },
            { text: 'أجتمع بالفريق وأستمع لآراء الجميع قبل اتخاذ أي خطوة',        traits:{social:3,operational:1}  },
            { text: 'أضع خطة عمل واضحة بأهداف ومواعيد وأبدأ التنفيذ فوراً',       traits:{operational:3,analytical:1} },
        ],
    },
    {
        text: 'ما الذي يصف بيئة العمل التي تزدهر فيها أكثر؟',
        options: [
            { text: 'بيئة تتيح التحليل المعمق والبحث الهادئ بعيداً عن الضوضاء',   traits:{analytical:3,operational:1} },
            { text: 'بيئة إبداعية تشجع على التجريب والأفكار الجريئة والمغامرة',    traits:{creative:3,strategic:1}     },
            { text: 'بيئة تعاونية تمنح الأولوية للتواصل والعمل الجماعي الحقيقي',  traits:{social:3,operational:1}     },
            { text: 'بيئة منظمة ذات أهداف واضحة وعمليات محددة وقابلة للقياس',    traits:{operational:3,strategic:1}  },
        ],
    },
    {
        text: 'عند مواجهة مشكلة مفاجئة، ما أول خطوة تتخذها؟',
        options: [
            { text: 'أجمع المعلومات وأدرس جميع الجوانب بتأنٍّ قبل أي خطوة',      traits:{analytical:3,strategic:2} },
            { text: 'أفكر في حلول جديدة وغير تقليدية خارج الصندوق تماماً',        traits:{creative:3,analytical:1}  },
            { text: 'أتشاور مع الفريق والخبراء وأستفيد من تجاربهم المتنوعة',      traits:{social:3,analytical:1}    },
            { text: 'أضع إجراءات واضحة للحل وأبدأ التنفيذ بسرعة وحسم',           traits:{operational:3,strategic:1} },
        ],
    },
    {
        text: 'كيف تقيس نجاحك في مشروع ما؟',
        options: [
            { text: 'بجودة التحليل الذي قدمته وتأثيره الواضح على القرارات الكبرى', traits:{analytical:3,strategic:1} },
            { text: 'بالأفكار الجديدة التي طرحتها وغيّرت مسار المشروع فعلياً',    traits:{creative:3,strategic:1}   },
            { text: 'بمستوى تحفيز الفريق وتأثيري الإيجابي على طاقة الجميع',       traits:{social:3,operational:1}   },
            { text: 'بإنجاز كل المهام في الوقت المحدد وبمستوى جودة استثنائي',     traits:{operational:3,analytical:1} },
        ],
    },
    {
        text: 'ما الذي يحفزك أكثر في العمل اليومي؟',
        options: [
            { text: 'حل المسائل المعقدة وفهم الأنماط الخفية في البيانات',           traits:{analytical:3,strategic:2} },
            { text: 'ابتكار مفاهيم وتصاميم جديدة تصنع فارقاً حقيقياً وملموساً',  traits:{creative:3,strategic:1}   },
            { text: 'بناء علاقات قوية ومساعدة الآخرين على تحقيق إمكاناتهم',      traits:{social:3,strategic:1}     },
            { text: 'رؤية نتائج ملموسة ومباشرة من جهودي ومن عمل الفريق اليومي',  traits:{operational:3,social:1}   },
        ],
    },
    // ── Stage 2: نقاط القوة ──────────────────────────────────────────────────────
    {
        text: 'من بين المهارات التالية، أيها تعتبر الأقوى لديك؟',
        options: [
            { text: 'التحليل النقدي واتخاذ قرارات راسخة مدعومة بالبيانات',        traits:{analytical:3,operational:1} },
            { text: 'التفكير الإبداعي وإيجاد حلول مختلفة وغير مألوفة',            traits:{creative:3,strategic:1}     },
            { text: 'التواصل الفعّال وبناء علاقات إنسانية مستدامة وعميقة',        traits:{social:3,operational:1}     },
            { text: 'التخطيط الدقيق والتنظيم وإدارة الوقت والموارد بكفاءة',       traits:{operational:3,analytical:1} },
        ],
    },
    {
        text: 'في مشروع جماعي، ما دورك الطبيعي الذي تنجذب إليه تلقائياً؟',
        options: [
            { text: 'المحلل الذي يقرأ الأرقام بعمق ويستخلص الرؤى المهمة',        traits:{analytical:3,strategic:1} },
            { text: 'المبدع الذي يطرح الأفكار الجريئة ويُحرّك خيال الفريق',       traits:{creative:3,social:1}      },
            { text: 'القائد الذي يوحّد الفريق ويرفع طاقة ومعنويات الجميع',        traits:{social:3,strategic:2}     },
            { text: 'المنسق الذي يتابع التنفيذ ويضمن سير الخطة بدقة ودون تأخير', traits:{operational:3,analytical:1} },
        ],
    },
    {
        text: 'ما الإنجاز الذي يُشعرك بالفخر والرضا أكثر من غيره؟',
        options: [
            { text: 'تقرير تحليلي دقيق أثّر بشكل مباشر في قرار استراتيجي مهم',   traits:{analytical:3,strategic:2} },
            { text: 'فكرة إبداعية تحولت إلى مشروع ناجح وملهم للآخرين',           traits:{creative:3,social:1}      },
            { text: 'قيادة فريق وتحقيق هدف مشترك صعب رغم التحديات الكثيرة',      traits:{social:3,strategic:2}     },
            { text: 'إنجاز مشروع معقد في وقت قياسي وبمستوى جودة فوق التوقعات',   traits:{operational:3,analytical:1} },
        ],
    },
    {
        text: 'في مواقف الضغط الشديد والأزمات، ما الذي تفعله غريزياً؟',
        options: [
            { text: 'أحلل الموقف بمنطقية صارمة وأجد الحل الأمثل بهدوء تام',      traits:{analytical:3,operational:2} },
            { text: 'أفكر خارج المألوف تماماً وأجد حلولاً لم يفكر بها أحد',      traits:{creative:3,analytical:1}    },
            { text: 'أجمع الفريق وأوزع الأدوار بفاعلية لمواجهة الأزمة معاً',     traits:{social:3,operational:2}     },
            { text: 'أضع قائمة أولويات واضحة وأنفذ الخطة خطوة بخطوة بانضباط',   traits:{operational:3,strategic:1}  },
        ],
    },
    {
        text: 'ما المهارة التي يُثني عليها زملاؤك وأساتذتك أكثر من غيرها؟',
        options: [
            { text: 'قدرتي على فهم الأنماط المعقدة وتحليل البيانات باحترافية',    traits:{analytical:3,strategic:1} },
            { text: 'أفكاري الابتكارية وحلولي الجديدة غير التقليدية للمشكلات',   traits:{creative:3,social:1}      },
            { text: 'دعمي للفريق وقدرتي على الإقناع وتوحيد وجهات النظر المتعارضة', traits:{social:3,strategic:1}  },
            { text: 'إنجازي الموثوق والمتسق وتسليمي دائماً في الموعد المحدد',     traits:{operational:3,analytical:1} },
        ],
    },
    // ── Stage 3: الرؤية المستقبلية ───────────────────────────────────────────────
    {
        text: 'أين تجد نفسك بعد خمس سنوات من الآن مهنياً؟',
        options: [
            { text: 'خبير بيانات أو مستشار استراتيجي يؤثر في قرارات الشركات الكبرى', traits:{analytical:3,strategic:3} },
            { text: 'مؤسس شركة ناشئة ناجحة أو مدير ابتكار في مؤسسة رائدة عالمياً', traits:{creative:3,strategic:2}   },
            { text: 'قائد لفريق كبير أو مدير موارد بشرية يبني ثقافة مؤسسية قوية',  traits:{social:3,strategic:2}     },
            { text: 'مدير تنفيذي يحقق نتائج ملموسة وقياسية بكفاءة تشغيلية عالية', traits:{operational:3,strategic:2} },
        ],
    },
    {
        text: 'ما القطاع الذي تتطلع للعمل فيه مستقبلاً بحماس حقيقي؟',
        options: [
            { text: 'التكنولوجيا المالية أو الاستشارات الاستراتيجية للشركات الكبرى', traits:{analytical:3,strategic:2}  },
            { text: 'الابتكار التقني أو ريادة الأعمال الرقمية والمشاريع الجريئة',    traits:{creative:3,operational:1}  },
            { text: 'التعليم أو الموارد البشرية أو التنمية البشرية والمجتمعية',      traits:{social:3,operational:1}    },
            { text: 'إدارة المشاريع أو سلاسل الإمداد أو تحسين العمليات التشغيلية',  traits:{operational:3,analytical:2} },
        ],
    },
    {
        text: 'ما نوع القرارات التي تشعر بأنك الأكثر كفاءة في اتخاذها؟',
        options: [
            { text: 'قرارات مبنية على بيانات دقيقة وتحليل شامل ومعمق للواقع',      traits:{analytical:3,strategic:2} },
            { text: 'قرارات جريئة ومبتكرة تغيّر الوضع الراهن وتفتح آفاقاً جديدة', traits:{creative:3,strategic:2}   },
            { text: 'قرارات تراعي تأثيرها على الناس وتحقق التوافق والانسجام',      traits:{social:3,strategic:1}     },
            { text: 'قرارات عملية وسريعة التنفيذ تحل المشكلة بكفاءة وفوراً',      traits:{operational:3,analytical:1} },
        ],
    },
    {
        text: 'ما الأثر الذي تريد تركه في مجالك المهني على المدى البعيد؟',
        options: [
            { text: 'منهجية تحليلية جديدة تغيّر طريقة عمل الصناعة كاملة',           traits:{analytical:3,strategic:3} },
            { text: 'منتج أو فكرة إبداعية تُلهم الجيل القادم وتصنع تاريخاً خالداً', traits:{creative:3,strategic:2}  },
            { text: 'قيادة أجيال من المتميزين وبناء ثقافة مؤسسية مُلهمة ومستدامة', traits:{social:3,strategic:3}    },
            { text: 'نظام تشغيلي فعّال يحقق كفاءة قياسية ويوفر موارد ضخمة',        traits:{operational:3,analytical:2} },
        ],
    },
    {
        text: 'ما الذي يُعرّفك أكثر في بيئة العمل؟',
        options: [
            { text: 'عمقي التحليلي وتفكيري المنطقي المبني على الأدلة والبيانات',   traits:{analytical:3,operational:1} },
            { text: 'إبداعي وجرأتي في تجربة الأفكار الجديدة والمختلفة دائماً',    traits:{creative:3,social:1}        },
            { text: 'تأثيري على الآخرين وقدرتي على قيادة التغيير بشكل إيجابي',    traits:{social:3,strategic:2}       },
            { text: 'انضباطي الصارم وتركيزي الدائم على تحقيق أهداف ملموسة وحقيقية', traits:{operational:3,analytical:1} },
        ],
    },
];

// ── 6 DNA Archetypes ───────────────────────────────────────────────────────────────
const CDNA_TYPES = {
    'analytical-strategic': {
        name: 'المحلل الاستراتيجي',
        emoji: '🔬',
        desc: 'تمتلك عقلاً تحليلياً حاداً مع رؤية استراتيجية بعيدة المدى. موهبتك في تحويل البيانات المعقدة إلى قرارات استراتيجية مؤثرة تجعلك نادراً وقيّماً في سوق العمل.',
        strengths: ['التحليل النقدي والتفكير المنطقي المنهجي','اتخاذ قرارات راسخة مدعومة بالبيانات والأدلة','الرؤية الاستراتيجية الثاقبة طويلة المدى','حل المشكلات المعقدة بمنهجية علمية صارمة'],
        weaknesses: ['قد تُفرط في التحليل قبل اتخاذ القرار','التواصل العاطفي الدافئ مع أعضاء الفريق','الصعوبة في التكيف السريع مع المتغيرات المفاجئة'],
        careerPath: ['محلل بيانات','مستشار استراتيجي','مدير الاستراتيجية','رئيس الاستراتيجية (CSO)'],
        skills: [{name:'تحليل البيانات المتقدم',priority:'high'},{name:'نمذجة الأعمال والسيناريوهات',priority:'high'},{name:'مهارات العرض التقديمي المؤثر',priority:'mid'},{name:'القيادة التأثيرية وبناء الفرق',priority:'low'}],
    },
    'creative-strategic': {
        name: 'المبتكر الرؤيوي',
        emoji: '🚀',
        desc: 'تجمع بين الإبداع المتفجر والرؤية الاستراتيجية الواضحة. تستطيع رؤية المستقبل قبل الآخرين وتحويل أفكارك الجريئة إلى مشاريع تغيّر قواعد اللعبة.',
        strengths: ['الابتكار وطرح أفكار جريئة وغير تقليدية','استشراف التوجهات والتفكير المستقبلي','تحريك الفرق نحو رؤى طموحة وملهمة','التكيف السريع والتجريب المستمر بجرأة'],
        weaknesses: ['إنهاء التفاصيل والمهام التنفيذية الدقيقة','الالتزام بجداول زمنية صارمة ومحددة','الموازنة بين الحلم الكبير والتوقعات الواقعية'],
        careerPath: ['مصمم تجربة المستخدم','مدير الابتكار والتحول','رائد أعمال','رئيس الابتكار (CIO)'],
        skills: [{name:'تصميم التفكير (Design Thinking)',priority:'high'},{name:'إدارة المنتجات وخارطة الطريق',priority:'high'},{name:'التخطيط التنفيذي المفصّل',priority:'mid'},{name:'إدارة الميزانية والموارد المالية',priority:'mid'}],
    },
    'social-strategic': {
        name: 'قائد الأفراد',
        emoji: '👑',
        desc: 'موهبتك الفطرية في التواصل والتأثير على الناس مدعومة برؤية استراتيجية واضحة. تبني فرقاً استثنائية وتقود التحولات المؤسسية الكبيرة بقدرة خارقة.',
        strengths: ['بناء الفرق عالية الأداء وإلهامها للعظمة','التواصل المؤثر والإقناع وإدارة التوقعات بمهارة','الذكاء العاطفي العالي والتعاطف الحقيقي والعميق','إدارة العلاقات وبناء شبكة تواصل قوية ومؤثرة'],
        weaknesses: ['الحفاظ على الموضوعية التحليلية الباردة في القرارات','التعامل الراسخ مع الأرقام والبيانات التفصيلية','صعوبة اتخاذ قرارات مؤلمة تؤثر على الأفراد'],
        careerPath: ['مدير فريق','مدير الموارد البشرية','مدير تنفيذي','رئيس تنفيذي (CEO)'],
        skills: [{name:'إدارة الأداء والتقييم الاستراتيجي',priority:'high'},{name:'تحليل البيانات وقراءة الأرقام',priority:'high'},{name:'إدارة التغيير المؤسسي الشامل',priority:'mid'},{name:'التخطيط المالي وإدارة الميزانيات',priority:'mid'}],
    },
    'operational-analytical': {
        name: 'المنفّذ المتقن',
        emoji: '⚙️',
        desc: 'تمتلك قدرة فائقة على التنفيذ المنظم مدعوماً بتحليل دقيق. تحوّل الخطط إلى نتائج ملموسة بكفاءة لا مثيل لها وتُعدّ العمود الفقري الحقيقي لأي مؤسسة ناجحة.',
        strengths: ['التنفيذ المتقن وإدارة المشاريع المعقدة باحترافية','الاهتمام الدقيق بالتفاصيل وضمان أعلى معايير الجودة','الموثوقية الكاملة والاتساق في الأداء على مدار الوقت','التفكير المنهجي والمنطقي في تشخيص المشكلات وحلها'],
        weaknesses: ['التفكير الاستراتيجي الشامل والرؤية الكلية طويلة المدى','التكيف السريع مع التغييرات والمتغيرات المفاجئة المتكررة','الانفتاح على الأفكار الإبداعية والمرونة الفكرية الحقيقية'],
        careerPath: ['مدير مشاريع','محلل عمليات','مدير الجودة','مدير العمليات (COO)'],
        skills: [{name:'إدارة المشاريع (PMP / PRINCE2)',priority:'high'},{name:'التفكير الاستراتيجي والرؤية الشاملة',priority:'high'},{name:'القيادة الإبداعية والتوجه الابتكاري',priority:'mid'},{name:'إدارة أصحاب المصلحة وتوقعاتهم',priority:'low'}],
    },
    'creative-social': {
        name: 'المفكّر الإبداعي',
        emoji: '🎨',
        desc: 'تجمع بين الإبداع والذكاء الاجتماعي لإنتاج تجارب إنسانية استثنائية. تفهم احتياجات الناس بعمق وتبتكر حلولاً تلمس القلوب وتُغيّر السلوكيات.',
        strengths: ['التصميم الإنساني المتمحور حول تجربة المستخدم','العمل الجماعي وخلق بيئة إبداعية مُحفِّزة وملهمة','الاستجابة الحدسية العميقة لاحتياجات الناس ومشاعرهم','الابتكار التشاركي الحقيقي في بيئات التعاون المثمر'],
        weaknesses: ['التحليل الكمي الصارم والإحصائي والتعامل مع البيانات','التخطيط الاستراتيجي والمالي الدقيق طويل المدى','صعوبة الالتزام بالمهام الروتينية والمكررة يومياً'],
        careerPath: ['مصمم تجربة مستخدم','مدير التسويق الإبداعي','استشاري ابتكار','مدير التجربة (CXO)'],
        skills: [{name:'تحليل بيانات المستخدمين والأبحاث النوعية',priority:'high'},{name:'التخطيط الاستراتيجي والمالي المتكامل',priority:'high'},{name:'إدارة الميزانية والموارد بكفاءة',priority:'mid'},{name:'مهارات العرض التنفيذي المقنع للقيادة',priority:'low'}],
    },
    'analytical-operational': {
        name: 'خبير البيانات',
        emoji: '📊',
        desc: 'تقاطع القدرة التحليلية العميقة مع الانضباط التنفيذي الصارم يجعلك متخصصاً لا يُعوَّض. تحوّل البيانات الخام إلى قرارات حاسمة بدقة استثنائية وكفاءة عالية.',
        strengths: ['تحليل البيانات المتقدم واستخلاص رؤى لا تراها العين العادية','الدقة الفائقة والاهتمام الحرفي بأدق التفاصيل وأدقها','إنتاج تقارير وتوصيات موثوقة تُبنى عليها القرارات الكبرى','المنهجية العلمية الصارمة والرياضية في حل المشكلات المعقدة'],
        weaknesses: ['مهارات التواصل الإنساني والعرض الجذاب والمؤثر','التفكير الاستراتيجي الكبير والرؤية الشاملة والكلية','التعامل مع الغموض الشديد وعدم اليقين وضبابية البيانات'],
        careerPath: ['محلل بيانات','عالم بيانات','مدير ذكاء الأعمال','رئيس البيانات (CDO)'],
        skills: [{name:'العرض التقديمي الاحترافي وتصور البيانات',priority:'high'},{name:'التفكير الاستراتيجي والتوجه القيادي',priority:'high'},{name:'القيادة التأثيرية وبناء الفرق عالية الأداء',priority:'mid'},{name:'التفكير الإبداعي وحل المشكلات بطرق مختلفة',priority:'low'}],
    },
};

// ── Specialization match weights ───────────────────────────────────────────────────
const CDNA_SPEC_MATCH = {
    'إدارة الأعمال':    {analytical:2, creative:2, social:3, operational:3, strategic:3},
    'التمويل والمصارف': {analytical:4, creative:1, social:1, operational:3, strategic:4},
    'نظم المعلومات':    {analytical:4, creative:2, social:1, operational:3, strategic:2},
    'الموارد البشرية':  {analytical:2, creative:2, social:5, operational:3, strategic:2},
    'التسويق':          {analytical:2, creative:4, social:4, operational:2, strategic:3},
    'الاقتصاد':         {analytical:5, creative:1, social:1, operational:2, strategic:4},
    'المحاسبة':         {analytical:4, creative:1, social:1, operational:5, strategic:2},
    'ريادة الأعمال':    {analytical:2, creative:5, social:3, operational:3, strategic:4},
    'إدارة العمليات':   {analytical:3, creative:1, social:2, operational:5, strategic:3},
    'الأعمال الرقمية':  {analytical:3, creative:4, social:2, operational:2, strategic:4},
};

const CDNA_SPEC_ICONS = {
    'إدارة الأعمال':'🏢', 'التمويل والمصارف':'💰', 'نظم المعلومات':'💻',
    'الموارد البشرية':'👥', 'التسويق':'📢', 'الاقتصاد':'📈',
    'المحاسبة':'📊', 'ريادة الأعمال':'🚀', 'إدارة العمليات':'⚙️', 'الأعمال الرقمية':'🌐',
};

// ── Helpers ────────────────────────────────────────────────────────────────────────
function _cdnaNormalize(scores) {
    const max = Math.max.apply(null, Object.values(scores).concat([1]));
    const out = {};
    for (const k in scores) out[k] = Math.round((scores[k] / max) * 100);
    return out;
}

function _cdnaGetType(scores) {
    const norm   = _cdnaNormalize(scores);
    const sorted = Object.keys(norm).sort(function(a, b) { return norm[b] - norm[a]; });
    const t1 = sorted[0]; const t2 = sorted[1];
    if (CDNA_TYPES[t1 + '-' + t2]) return CDNA_TYPES[t1 + '-' + t2];
    if (CDNA_TYPES[t2 + '-' + t1]) return CDNA_TYPES[t2 + '-' + t1];
    const keys = Object.keys(CDNA_TYPES);
    for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(t1 + '-') === 0) return CDNA_TYPES[keys[i]];
    }
    return CDNA_TYPES[keys[0]];
}

function _cdnaGetSpecMatches(scores) {
    const norm    = _cdnaNormalize(scores);
    const results = [];
    for (const spec in CDNA_SPEC_MATCH) {
        const weights = CDNA_SPEC_MATCH[spec];
        const total   = Object.values(weights).reduce(function(a, b) { return a + b; }, 0);
        var score     = 0;
        for (const t in weights) score += ((norm[t] || 0) / 100) * (weights[t] / total);
        results.push({ spec: spec, pct: Math.round(score * 100) });
    }
    results.sort(function(a, b) { return b.pct - a.pct; });
    return results;
}

// ── Render intro screen ────────────────────────────────────────────────────────────
function renderCareerDNA() {
    const container = document.getElementById('careerdnaContent');
    if (!container) return;
    if (_cdnaState === 'results') { _showCDNAResults(); return; }
    if (_cdnaState === 'quiz')    { _renderCDNAQuestion(); return; }

    var helixBars = '';
    for (var _i = 0; _i < 10; _i++) {
        helixBars += '<div class="cdna-dna-rung" style="animation-delay:' + (_i * 0.15) + 's"></div>';
    }

    container.innerHTML =
        '<div class="cdna-hero">' +
        '<div class="cdna-hero-card prox-glow">' +
        '<div class="border-beam-el"></div>' +
        '<div class="cdna-hero-icon">🧬</div>' +
        '<div class="cdna-hero-title">Career DNA</div>' +
        '<p class="cdna-hero-sub">اكتشف بصمتك الشخصية الفريدة في عالم الأعمال.<br>' +
        'تحليل ذكاء اصطناعي يكشف أسلوبك القيادي،<br>' +
        'نقاط قوتك، وأنسب التخصصات والمسارات المهنية.</p>' +
        '<div class="cdna-helix">' + helixBars + '</div>' +
        '<button class="cdna-start-btn" onclick="startCDNA()">' +
        '<i class="fas fa-dna"></i> ابدأ تحليل DNA الآن' +
        '</button>' +
        '<div style="margin-top:1rem;font-size:0.78rem;color:rgba(255,255,255,0.32);position:relative;z-index:1;">' +
        '15 سؤال · ~3 دقائق · نتيجة مخصصة بالذكاء الاصطناعي' +
        '</div>' +
        '</div>' +
        '</div>';
}

// ── Start quiz ─────────────────────────────────────────────────────────────────────
function startCDNA() {
    _cdnaState    = 'quiz';
    _cdnaScores   = {analytical:0, creative:0, social:0, operational:0, strategic:0};
    _cdnaCurrentQ = 0;
    _renderCDNAQuestion();
}

// ── Render question ────────────────────────────────────────────────────────────────
function _renderCDNAQuestion() {
    const container = document.getElementById('careerdnaContent');
    if (!container) return;
    const q       = CDNA_QUESTIONS[_cdnaCurrentQ];
    const total   = CDNA_QUESTIONS.length;
    const pct     = Math.round((_cdnaCurrentQ / total) * 100);
    const stages  = ['أسلوب العمل', 'نقاط القوة', 'الرؤية المستقبلية'];
    const stage   = stages[Math.floor(_cdnaCurrentQ / 5)];
    const letters = ['أ', 'ب', 'ج', 'د'];

    var optsHtml = '';
    for (var oi = 0; oi < q.options.length; oi++) {
        optsHtml += '<button class="cdna-option" onclick="answerCDNA(' + oi + ')">' +
                    '<span class="cdna-option-letter">' + letters[oi] + '</span>' +
                    '<span>' + q.options[oi].text + '</span>' +
                    '</button>';
    }

    container.innerHTML =
        '<div class="cdna-progress-wrap">' +
        '<div class="cdna-stage-label">⬡ المرحلة: ' + stage + '</div>' +
        '<div class="cdna-progress-bar"><div class="cdna-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="cdna-q-counter">' + (_cdnaCurrentQ + 1) + ' / ' + total + '</div>' +
        '</div>' +
        '<div class="cdna-question-card">' +
        '<span class="cdna-q-stage">المرحلة ' + (Math.floor(_cdnaCurrentQ / 5) + 1) + ': ' + stage + '</span>' +
        '<p class="cdna-q-text">' + q.text + '</p>' +
        '<div class="cdna-options">' + optsHtml + '</div>' +
        '</div>';
}

// ── Record answer ──────────────────────────────────────────────────────────────────
function answerCDNA(optionIdx) {
    const q = CDNA_QUESTIONS[_cdnaCurrentQ];
    if (!q) return;
    const chosen = q.options[optionIdx];
    for (const trait in chosen.traits) {
        _cdnaScores[trait] = (_cdnaScores[trait] || 0) + chosen.traits[trait];
    }
    _cdnaCurrentQ++;
    if (_cdnaCurrentQ >= CDNA_QUESTIONS.length) {
        _cdnaState = 'results';
        _showCDNAResults();
    } else {
        _renderCDNAQuestion();
    }
}

// ── Results screen ─────────────────────────────────────────────────────────────────
function _showCDNAResults() {
    const container = document.getElementById('careerdnaContent');
    if (!container) return;

    const norm  = _cdnaNormalize(_cdnaScores);
    const type  = _cdnaGetType(_cdnaScores);
    const specs = _cdnaGetSpecMatches(_cdnaScores);
    const _sortedTraits  = Object.keys(norm).sort(function(a, b) { return norm[b] - norm[a]; });
    const dominantTrait  = _sortedTraits[0];
    const coursesSection = _buildCDNACoursesHTML(dominantTrait);

    // Trait bars
    var traitRows = '';
    for (const trait in CDNA_TRAIT_META) {
        const meta = CDNA_TRAIT_META[trait];
        const p    = norm[trait] || 0;
        traitRows +=
            '<div class="cdna-trait-row">' +
            '<span class="cdna-trait-label">' + meta.label + '</span>' +
            '<div class="cdna-trait-track">' +
            '<div class="cdna-trait-fill" style="--ctw:' + p + '%;background:' + meta.color + ';box-shadow:0 0 8px ' + meta.color + '66;"></div>' +
            '</div>' +
            '<span class="cdna-trait-pct">' + p + '%</span>' +
            '</div>';
    }

    // SW
    var strengthsList  = type.strengths.map(function(s)  { return '<li>' + s + '</li>'; }).join('');
    var weaknessesList = type.weaknesses.map(function(w) { return '<li>' + w + '</li>'; }).join('');

    // Spec cards (top 6)
    var specCards = '';
    var topSpecs  = specs.slice(0, 6);
    for (var si = 0; si < topSpecs.length; si++) {
        var s = topSpecs[si];
        specCards +=
            '<div class="cdna-spec-card' + (si === 0 ? ' top-match' : '') + '">' +
            '<div class="cdna-spec-icon">' + (CDNA_SPEC_ICONS[s.spec] || '🎓') + '</div>' +
            '<div class="cdna-spec-name">' + s.spec + '</div>' +
            '<div class="cdna-spec-match-bar"><div class="cdna-spec-match-fill" style="width:0" data-w="' + s.pct + '"></div></div>' +
            '<div class="cdna-spec-pct">' + s.pct + '%</div>' +
            '</div>';
    }

    // Timeline
    var timeLabels = ['السنة الأولى', 'السنة الثالثة', 'بعد التخرج', 'بعد 5 سنوات'];
    var timeline   = '';
    for (var ti = 0; ti < type.careerPath.length; ti++) {
        timeline +=
            '<div class="cdna-milestone" style="animation-delay:' + (ti * 0.12) + 's">' +
            '<div class="cdna-milestone-year">' + (timeLabels[ti] || '') + '</div>' +
            '<div class="cdna-milestone-title">' + type.careerPath[ti] + '</div>' +
            '</div>';
    }

    // Skill gaps
    var skillGaps = '';
    for (var gi = 0; gi < type.skills.length; gi++) {
        var sk  = type.skills[gi];
        var lbl = sk.priority === 'high' ? 'عالية' : sk.priority === 'mid' ? 'متوسطة' : 'منخفضة';
        skillGaps +=
            '<div class="cdna-skill-gap-item">' +
            '<span class="cdna-skill-name">' + sk.name + '</span>' +
            '<span class="cdna-skill-priority ' + sk.priority + '">' + lbl + '</span>' +
            '</div>';
    }

    container.innerHTML =
        '<div class="cdna-results">' +

        '<div class="cdna-type-card cdna-always-beam">' +
        '<div class="border-beam-el"></div>' +
        '<div class="cdna-type-emoji">' + type.emoji + '</div>' +
        '<div class="cdna-type-label">✦ نوع DNA القيادي ✦</div>' +
        '<div class="cdna-type-name">' + type.name + '</div>' +
        '<p class="cdna-type-desc">' + type.desc + '</p>' +
        '</div>' +

        '<div class="cdna-traits-card">' +
        '<div class="cdna-section-header"><i class="fas fa-fingerprint"></i> بصمة الشخصية</div>' +
        traitRows +
        '</div>' +

        '<div class="cdna-sw-grid">' +
        '<div class="cdna-sw-card strengths">' +
        '<div class="cdna-sw-title"><i class="fas fa-bolt"></i> نقاط القوة</div>' +
        '<ul class="cdna-sw-list">' + strengthsList + '</ul>' +
        '</div>' +
        '<div class="cdna-sw-card weaknesses">' +
        '<div class="cdna-sw-title"><i class="fas fa-tools"></i> مجالات التطوير</div>' +
        '<ul class="cdna-sw-list">' + weaknessesList + '</ul>' +
        '</div>' +
        '</div>' +

        '<div class="cdna-traits-card">' +
        '<div class="cdna-section-header"><i class="fas fa-graduation-cap"></i> التخصص الأكثر توافقاً معك</div>' +
        '<div class="cdna-spec-grid">' + specCards + '</div>' +
        '</div>' +

        '<div class="cdna-traits-card">' +
        '<div class="cdna-section-header"><i class="fas fa-road"></i> المسار المهني المقترح</div>' +
        '<div class="cdna-timeline">' + timeline + '</div>' +
        '</div>' +

        '<div class="cdna-traits-card">' +
        '<div class="cdna-section-header"><i class="fas fa-wrench"></i> فجوة المهارات — أولويات التطوير</div>' +
        '<div class="cdna-skill-gap-list">' + skillGaps + '</div>' +
        '</div>' +

        coursesSection +

        '<div class="cdna-roadmap-card">' +
        '<div class="cdna-roadmap-header">' +
        '<div class="cdna-roadmap-icon">🤖</div>' +
        '<div class="cdna-roadmap-title">خارطة طريق مولّدة بالذكاء الاصطناعي — مخصصة لبصمتك</div>' +
        '</div>' +
        '<div class="cdna-roadmap-body loading" id="cdnaRoadmapBody">⏳ يحلّل الذكاء الاصطناعي بصمتك ويولّد خارطة طريقك المخصصة...</div>' +
        '</div>' +

        '<div style="text-align:center;padding-bottom:2rem;">' +
        '<button class="cdna-retake-btn" onclick="retakeCDNA()">' +
        '<i class="fas fa-redo-alt"></i> إعادة الاختبار' +
        '</button>' +
        '</div>' +

        '</div>';

    // Animate after DOM settles
    setTimeout(function() {
        container.querySelectorAll('.cdna-trait-fill').forEach(function(el) {
            el.classList.add('animated');
        });
        container.querySelectorAll('.cdna-spec-match-fill').forEach(function(el) {
            var w = el.getAttribute('data-w');
            if (w) el.style.width = w + '%';
        });
    }, 120);

    _generateCDNARoadmap(type, norm);
}

// ── AI Roadmap ─────────────────────────────────────────────────────────────────────
async function _generateCDNARoadmap(type, norm) {
    const el = document.getElementById('cdnaRoadmapBody');
    if (!el) return;

    var traitParts = [];
    for (const t in CDNA_TRAIT_META) {
        traitParts.push(CDNA_TRAIT_META[t].label + ': ' + (norm[t] || 0) + '%');
    }

    const prompt =
        'أنت مستشار مهني خبير. بناءً على تحليل Career DNA للطالب:\n' +
        'نوع الشخصية: ' + type.name + ' ' + type.emoji + '\n' +
        'درجات السمات: ' + traitParts.join('، ') + '\n\n' +
        'اكتب خارطة طريق مهنية مخصصة ومحفّزة باللغة العربية، تشمل:\n' +
        '- توصيات فورية هذا الفصل الدراسي\n' +
        '- مهارات أساسية يجب تطويرها هذا العام\n' +
        '- أهداف واضحة للسنة القادمة\n' +
        '- نصيحة ذهبية للتميز في مجاله\n' +
        'اجعلها ملهِمة ومباشرة وعملية. لا تتجاوز 200 كلمة.';

    try {
        var signal;
        if (typeof AbortSignal.timeout === 'function') {
            signal = AbortSignal.timeout(15000);
        } else {
            var _ctrl = new AbortController();
            setTimeout(function() { _ctrl.abort(); }, 15000);
            signal = _ctrl.signal;
        }

        const res = await fetch(CHAT_API_BASE + '/api/chat', {
            method:  'POST',
            headers: {'Content-Type': 'application/json'},
            body:    JSON.stringify({message: prompt, language: 'ar'}),
            signal:  signal,
        });

        if (!res.ok) throw new Error('api');
        const data = await res.json();
        const text = ((data.text || data.response || data.content || '') + '').trim();
        if (!text) throw new Error('empty');

        el.classList.remove('loading');
        el.textContent = text;

    } catch (_e) {
        if (!el) return;
        el.classList.remove('loading');
        var highSkills = type.skills
            .filter(function(s) { return s.priority === 'high'; })
            .map(function(s)    { return s.name; })
            .join('، ');
        var roadmapFallback =
            '<strong>' + type.emoji + ' ' + type.name + '</strong><br><br>' +
            type.desc + '<br><br>' +
            '<strong>🎯 توصياتنا الفورية:</strong><br>';
        for (var ri = 0; ri < type.careerPath.length; ri++) {
            roadmapFallback += (ri + 1) + '. ابدأ مسيرتك نحو دور <strong>' + type.careerPath[ri] + '</strong><br>';
        }
        roadmapFallback += '<br>📌 ركّز على تطوير: ' + highSkills;
        el.innerHTML = roadmapFallback;
    }
}

// ── Retake ─────────────────────────────────────────────────────────────────────────
function retakeCDNA() {
    _cdnaState    = null;
    _cdnaScores   = {analytical:0, creative:0, social:0, operational:0, strategic:0};
    _cdnaCurrentQ = 0;
    renderCareerDNA();
}

// ==================================================================================
// AI INTERVIEW SIMULATOR
// ==================================================================================
// The interview FLOW (setup → room → feedback → results), the microphone (AUS_MIC), the rubric-based evaluation (/api/interview/*)
// and the saved progress live in aus_55_interview.js. The question catalogue stays here because other systems read it
// (the «الفهرس» directory counts INTV_CATEGORIES) and aus_55 extends it with the startup / negotiation / financial-decision types.

// ── Interview categories ───────────────────────────────────────────────────────────
const INTV_CATEGORIES = {
    hr: {
        icon: '🏢', title: 'الموارد البشرية', titleEn: 'HR Interview', difficulty: 'mid',
        interviewer: { emoji: '👩‍💼', name: 'د. سارة القحطاني', role: 'مديرة الموارد البشرية' },
        questions: [
            'حدّثنا عن نفسك وعن أبرز إنجازاتك الأكاديمية والشخصية.',
            'لماذا اخترت هذا التخصص؟ وما الذي يميزك عن المتقدمين الآخرين؟',
            'أخبرنا عن موقف صعب واجهته وكيف تغلّبت عليه بنجاح.',
            'ما نقاط قوتك وضعفك الرئيسية؟ وكيف تعمل على تطويرهما؟',
            'أين ترى نفسك مهنياً بعد خمس سنوات من الآن؟',
        ],
    },
    leadership: {
        icon: '👑', title: 'القيادة', titleEn: 'Leadership Interview', difficulty: 'hard',
        interviewer: { emoji: '👨‍💼', name: 'أ. خالد المنصور', role: 'المدير التنفيذي' },
        questions: [
            'هل سبق أن قدت فريقاً؟ كيف كانت التجربة وماذا تعلمت منها؟',
            'كيف تتعامل مع الخلافات والتوترات داخل فريق العمل؟',
            'أعطنا مثالاً حقيقياً على قرار صعب اتخذته تحت ضغط شديد.',
            'كيف تحفّز فريقك وتعيد بناء معنوياتهم في الأوقات الصعبة؟',
            'ما أسلوب قيادتك المفضّل ولماذا يناسب بيئة العمل الحديثة؟',
        ],
    },
    business: {
        icon: '💼', title: 'الأعمال', titleEn: 'Business Interview', difficulty: 'mid',
        interviewer: { emoji: '👩‍💼', name: 'د. نورة الشمري', role: 'محللة الأعمال الاستراتيجية' },
        questions: [
            'كيف تُحلّل مشكلة تجارية معقدة؟ اشرح منهجيتك خطوة بخطوة.',
            'ما رأيك في تأثير الذكاء الاصطناعي على سوق العمل خلال العقد القادم؟',
            'كيف تضمن جودة عملك وتحتفظ بمعايير الأداء العالية تحت ضغط الوقت؟',
            'ما التوجهات التجارية التي تراها مهيمنة في قطاعك خلال السنوات الخمس القادمة؟',
            'كيف تبني علاقات مهنية قوية ومستدامة مع العملاء وأصحاب المصلحة؟',
        ],
    },
    caseStudy: {
        icon: '📊', title: 'دراسة الحالة', titleEn: 'Case Study', difficulty: 'hard',
        interviewer: { emoji: '👨‍💼', name: 'م. أحمد الزهراني', role: 'مدير الاستراتيجية والابتكار' },
        questions: [
            'شركتك تخسر 20% من حصتها السوقية في 6 أشهر. ما خطتك الفورية لاسترداد الموقف؟',
            'لديك ميزانية محدودة وفريق من 3 أشخاص لتنفيذ مشروع ضخم. كيف تتصرف؟',
            'طلب منك المدير التنفيذي إطلاق منتج جديد خلال 30 يوماً. ما خطواتك الأولى؟',
            'اكتشفت أن أحد زملائك يُقدّم أرقاماً غير دقيقة في تقاريره. كيف تتعامل مع الموقف؟',
            'عميلك الأهم يهدد بترك الشركة بسبب مشكلة في الخدمة. كيف تحتفظ به وتسترضيه؟',
        ],
    },
};

/* ═══════════════════════════════════════════════════════════════════════════════
   AI CRISIS SIMULATION — MASTER FEATURES #5
   Five real business crisis types, 4 decision stages each, AI scoring + analysis
   State: _crisis  |  Entry: renderCrisisSimulation()
═══════════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────────────
var _crisis = {
    state:    null,   // null | 'select' | 'active' | 'feedback' | 'results'
    crisisId: null,
    crisis:   null,
    stage:    0,
    decisions:[],     // {optionIdx, optionText, score, trait, assessment, advice}
    timer:    null,
    timeLeft: 90,
};

// ── Crisis catalogue ───────────────────────────────────────────────────────────────
var CRISIS_DATA = {
    pr: {
        icon: '🔥', color: '#ff006e', colorDim: 'rgba(255,0,110,0.12)',
        title: 'أزمة علاقات عامة', subtitle: 'فضيحة تهدد سمعة الشركة',
        urgency: 'عالية جداً',
        intro: 'انتشر مقطع مسرّب على وسائل التواصل الاجتماعي يُظهر أحد مسؤولي شركتك يُقدّم وعوداً كاذبة للعملاء. الهاشتاق يتصدّر المشهد والصحافة تطرق الأبواب.',
        stages: [
            {
                situation: 'في الساعات الأولى من الأزمة، بدأت التغريدات السلبية تتضاعف بشكل متسارع. فريق العلاقات العامة لديك في حالة ذعر.',
                question: 'ما هي خطوتك الأولى الفورية لاحتواء الأزمة؟',
                options: ['أصدر بياناً اعتذارياً صريحاً فورياً عبر كل القنوات الرسمية', 'أنتظر 24 ساعة لجمع كل المعلومات قبل أي تصريح', 'أتواصل مع العملاء المتضررين مباشرة قبل البيان العام'],
                baseline: [82, 38, 70],
            },
            {
                situation: 'المسؤول المعني يصرّ على أن تصريحاته أُخذت من سياقها. الإعلام يطالب باجتماع صحفي.',
                question: 'كيف تتعامل مع الاجتماع الصحفي المرتقب؟',
                options: ['أعقد المؤتمر أنا شخصياً وأتولى المسؤولية الكاملة', 'أُرسل مستشار قانوني للتحدث باسم الشركة', 'أؤجل المؤتمر وأُصدر بياناً مكتوباً بدلاً منه'],
                baseline: [88, 55, 62],
            },
            {
                situation: 'بعد يومين، خسرت الشركة 3 عملاء كبار وتراجعت الأسهم 12%. فريق المبيعات يشعر بالإحباط.',
                question: 'كيف تعيد بناء الثقة مع العملاء والمساهمين؟',
                options: ['أُطلق برنامج تعويض مالي فوري للعملاء المتضررين', 'أُعين شركة علاقات عامة خارجية لإدارة الأزمة', 'أُجري اتصالات شخصية مع كل عميل متضرر بنفسي'],
                baseline: [75, 60, 90],
            },
            {
                situation: 'بعد أسبوع، الأزمة تخف لكن السمعة لا تزال متضررة. الفريق يسأل عن الخطوات المستقبلية.',
                question: 'ما هي استراتيجيتك طويلة المدى لاستعادة السمعة؟',
                options: ['أُطلق مبادرة مجتمعية كبيرة لتحسين صورة الشركة', 'أُعيد هيكلة سياسات التواصل الداخلي ومعايير الشفافية', 'أُركّز على تحسين جودة المنتج وأترك السمعة تُبنى تلقائياً'],
                baseline: [78, 85, 50],
            },
        ],
    },
    market: {
        icon: '📉', color: '#ffd60a', colorDim: 'rgba(255,214,10,0.1)',
        title: 'انهيار السوق', subtitle: 'موجة ركود مفاجئة تضرب قطاعك',
        urgency: 'حرجة',
        intro: 'أعلن المركزي عن رفع مفاجئ للفائدة بنسبة 3%. الأسواق تنهار والطلب على منتجاتك تراجع 40% في أسبوع واحد.',
        stages: [
            {
                situation: 'خزينة الشركة تكفي لـ 4 أشهر فقط. 120 موظفاً ينظرون إليك لتتخذ قراراً.',
                question: 'كيف تحمي التدفق النقدي بشكل فوري؟',
                options: ['أُجمّد التوظيف الجديد وأُخفّض مصاريف التشغيل بنسبة 30%', 'أُفاوض البنك فوراً على تمديد خط الائتمان', 'أُسرّح 20% من الموظفين للحفاظ على السيولة'],
                baseline: [80, 72, 40],
            },
            {
                situation: 'المنافسون يخفّضون أسعارهم بشكل مجنون. العملاء يضغطون لتخفيض عقودهم.',
                question: 'ما هي استراتيجيتك التسعيرية في هذا الوضع؟',
                options: ['أرفض تخفيض الأسعار وأُبرز القيمة الفريدة للمنتج', 'أُقدّم تخفيضاً محدوداً مرتبطاً بزيادة حجم الطلب', 'أُطلق حزمة منتجات جديدة بسعر أقل لجذب العملاء'],
                baseline: [78, 85, 70],
            },
            {
                situation: 'أحد شركاء الاستثمار يعرض ضخ سيولة مقابل 35% من أسهم الشركة.',
                question: 'كيف تُقيّم عرض الاستثمار؟',
                options: ['أقبل العرض لضمان البقاء وأبدأ التفاوض على الشروط', 'أرفض وأبحث عن مستثمر آخر بشروط أفضل', 'أطلب مهلة أسبوعين لاستكشاف بدائل التمويل'],
                baseline: [70, 60, 88],
            },
            {
                situation: 'بعد 3 أشهر، السوق يتعافى ببطء والفريق منهك ويحتاج تحفيزاً.',
                question: 'كيف تُعيد بناء الزخم وتُحفّز الفريق؟',
                options: ['أُعلن عن خطة مكافآت مرتبطة بأهداف التعافي', 'أنظّم ورشة استراتيجية مع الفريق لبناء خطة النمو معاً', 'أُطلق منتجاً جديداً لإعادة الإثارة والزخم للسوق'],
                baseline: [72, 90, 80],
            },
        ],
    },
    cyber: {
        icon: '💻', color: '#00d4ff', colorDim: 'rgba(0,212,255,0.08)',
        title: 'هجوم إلكتروني', subtitle: 'اختراق أمني يُهدد بيانات العملاء',
        urgency: 'طارئة',
        intro: 'تلقّيت إشعاراً من فريق تقنية المعلومات: مخترق تمكّن من الوصول إلى قاعدة بيانات العملاء التي تحوي 50,000 سجل. البيانات لا تزال مُشفَّرة لكن الاختراق حدث.',
        stages: [
            {
                situation: 'فريق التقنية يؤكد الاختراق. لا يزال الوقت مبكراً ولم يُسرَّب شيء للعلن.',
                question: 'ما هي أولى خطواتك في لحظة اكتشاف الاختراق؟',
                options: ['أُخبر العملاء فوراً بالاختراق قبل أي تسريب', 'أُعزل الأنظمة المخترقة وأُبلّغ الجهات الأمنية المختصة', 'أُشغّل فريق خبراء أمن خارجي لتقييم الوضع أولاً'],
                baseline: [75, 88, 78],
            },
            {
                situation: 'صحفي تواصل معك وأبلغك أنه يعلم بالاختراق ويريد تعليقاً خلال ساعة.',
                question: 'كيف تتعامل مع الصحفي والإعلام؟',
                options: ['أُعطيه تصريحاً مُعدَّاً بعناية يُقرّ بالاختراق ويُطمئن العملاء', 'أرفض التعليق وأُصدر بياناً رسمياً عبر المحامين', 'أطلب منه مهلة ساعتين إضافيتين مقابل حصري الخبر'],
                baseline: [82, 65, 55],
            },
            {
                situation: 'المخترق أرسل طلب فدية بـ 500,000 دولار مقابل عدم نشر البيانات.',
                question: 'كيف تردّ على طلب الفدية؟',
                options: ['أرفض الدفع قطعياً وأُبلّغ مكتب التحقيقات الفيدرالي', 'أبدأ التفاوض لكسب الوقت بينما الجهات الأمنية تتحرك', 'أدفع الفدية سراً لحماية العملاء من التسريب'],
                baseline: [85, 72, 25],
            },
            {
                situation: 'انتهت الأزمة دون تسريب. الآن تحتاج إلى تحصين الشركة من هجمات مستقبلية.',
                question: 'ما هو مشروعك الأمني الاستراتيجي؟',
                options: ['أُنشئ وحدة أمن إلكتروني داخلية متخصصة بميزانية كبيرة', 'أُوقّع عقداً مع شركة أمن سيبراني خارجية للمراقبة المستمرة', 'أُطلق برنامج تدريب أمني إلزامي لجميع الموظفين'],
                baseline: [80, 75, 88],
            },
        ],
    },
    financial: {
        icon: '💸', color: '#9d4edd', colorDim: 'rgba(157,78,221,0.1)',
        title: 'انهيار مالي', subtitle: 'شريك رئيسي يُنهي العقد فجأة',
        urgency: 'بالغة الخطورة',
        intro: 'مورّدك الرئيسي الذي يُمثّل 60% من إيراداتك أعلن إنهاء العقد فجأة لصالح منافسك. خسارة فورية بـ 2.4 مليون دولار.',
        stages: [
            {
                situation: 'الرئيس التنفيذي للمورّد لا يردّ على اتصالاتك. فريق المالية في حالة توتر شديد.',
                question: 'ما هي استجابتك الفورية في أول 6 ساعات؟',
                options: ['أطير لمقر المورّد شخصياً لمحاولة إنقاذ الاتفاقية', 'أُشرك المستشار القانوني لمراجعة بنود فسخ العقد', 'أبدأ فوراً التواصل مع موردين بديلين محتملين'],
                baseline: [75, 82, 88],
            },
            {
                situation: 'اتضح أن المنافس قدّم سعراً أقل بـ 18%. المورّد مستعد للحديث.',
                question: 'كيف تتفاوض لاستعادة الشراكة؟',
                options: ['أُطابق السعر وأُضيف قيمة تشغيلية إضافية للمورّد', 'أرفض منافسة السعر وأُبرز قوة علاقتنا الاستراتيجية طويلة الأمد', 'أقترح هيكل شراكة جديد يشمل حصة ربحية للمورّد'],
                baseline: [78, 70, 90],
            },
            {
                situation: 'التفاوض فشل. يجب تنويع مصادر الإيراد بسرعة.',
                question: 'كيف تُعيد هيكلة محفظة العملاء؟',
                options: ['أُطلق عروضاً مخفّضة لاستقطاب عملاء جدد بسرعة', 'أُركّز على تعميق العلاقة مع العملاء الحاليين وتوسيع الخدمات لهم', 'أستهدف شريحة سوق جديدة لم نخدمها من قبل'],
                baseline: [65, 85, 78],
            },
            {
                situation: 'بعد شهرين، نجحت في تنويع العملاء لكن التدفق النقدي لا يزال ضعيفاً.',
                question: 'ما هو قرارك المالي الاستراتيجي الآن؟',
                options: ['أسعى لجولة تمويل من مستثمرين جدد', 'أُقلّص العمليات مؤقتاً حتى تتعافى السيولة', 'أستكشف إمكانية الاندماج مع شركة تكاملية في السوق'],
                baseline: [80, 70, 82],
            },
        ],
    },
    conflict: {
        icon: '⚡', color: '#00f5d4', colorDim: 'rgba(0,245,212,0.08)',
        title: 'صراع الفريق', subtitle: 'أزمة قيادية تُهدد تماسك الشركة',
        urgency: 'متصاعدة',
        intro: 'مدير التطوير ومدير المبيعات على شفير المواجهة العلنية. الأول يتهم الثاني بوعود مستحيلة للعملاء، والثاني يرى أن التطوير بطيء يُضيّع الفرص. فريق العمل منقسم.',
        stages: [
            {
                situation: 'الاجتماع الأسبوعي تحوّل إلى مشادة كلامية أمام بقية الفريق.',
                question: 'كيف تتدخل في هذه اللحظة الحرجة؟',
                options: ['أوقف الاجتماع فوراً وأطلب من الاثنين الاجتماع بي على انفراد', 'أطلب من كل طرف عرض موقفه بالأرقام والبيانات', 'أُؤجّل الخلاف وتُكمل الاجتماع بشكل طبيعي'],
                baseline: [88, 82, 30],
            },
            {
                situation: 'في الاجتماع الفردي، كل مدير يطالب بإقالة الآخر.',
                question: 'كيف تُدير هذا الموقف الصعب؟',
                options: ['أُوضّح أن الإقالة ليست على الطاولة وأبحث عن الحل الحقيقي', 'أُقيّم أداء الاثنين بموضوعية وأتخذ قراراً مبنياً على النتائج', 'أُوظّف وسيطاً محترفاً لحل النزاع'],
                baseline: [85, 80, 70],
            },
            {
                situation: 'اكتشفت أن الخلاف سببه غياب توقعات واضحة ومعايير أداء مشتركة.',
                question: 'كيف تُعالج الجذر الحقيقي للمشكلة؟',
                options: ['أُنشئ لجنة مشتركة لتحديد معايير تسليم واضحة بين التطوير والمبيعات', 'أُعيد هيكلة عملية التواصل بين الإدارتين بشكل جذري', 'أُطلق ورشة تدريبية على إدارة التوقعات لكلا الفريقين'],
                baseline: [90, 85, 78],
            },
            {
                situation: 'بعد ثلاثة أسابيع من التدخل، الفريق أهدأ لكن لا يزال هناك برود في التعاون.',
                question: 'كيف تُعيد بناء روح الفريق؟',
                options: ['أُنظّم تمريناً قيادياً مشتركاً للفريق الإداري كله', 'أُعلن عن هدف تحدٍّ مشترك يستلزم تعاون الجميع لتحقيقه', 'أُجري جلسات فردية دورية مع كل عضو في الفريق القيادي'],
                baseline: [80, 88, 82],
            },
        ],
    },
};

// ── Entry ──────────────────────────────────────────────────────────────────────────
function renderCrisisSimulation() {
    var c = document.getElementById('crisisContent');
    if (!c) return;
    if (_crisis.state === null) {
        _crisisRenderSelect();
    } else if (_crisis.state === 'active' || _crisis.state === 'feedback') {
        _crisisRenderRoom();
    } else if (_crisis.state === 'results') {
        _crisisRenderResults();
    }
}

// ── Select screen ──────────────────────────────────────────────────────────────────
function _crisisRenderSelect() {
    var c = document.getElementById('crisisContent');
    if (!c) return;
    var cards = Object.keys(CRISIS_DATA).map(function(id) {
        var cr = CRISIS_DATA[id];
        return '<div class="crisis-card prox-glow" style="--cc:' + cr.color + ';--cc-dim:' + cr.colorDim + '" onclick="startCrisis(\'' + id + '\')">' +
               '<div class="border-beam-el"></div>' +
               '<div class="crisis-card-glow"></div>' +
               '<span class="crisis-card-icon">' + cr.icon + '</span>' +
               '<div class="crisis-card-title">' + cr.title + '</div>' +
               '<div class="crisis-card-sub">' + cr.subtitle + '</div>' +
               '<div class="crisis-card-urgency"><i class="fas fa-exclamation-triangle"></i> مستوى الإلحاح: ' + cr.urgency + '</div>' +
               '</div>';
    }).join('');

    c.innerHTML =
        '<div class="crisis-wrap" style="animation:cdnaSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) both">' +
        '<div style="text-align:right;margin-bottom:1rem;">' +
        '<div style="font-family:\'Orbitron\',sans-serif;font-size:0.65rem;letter-spacing:0.15em;color:rgba(255,255,255,0.35);margin-bottom:0.5rem;">⬡ اختر نوع الأزمة</div>' +
        '<div style="font-size:0.88rem;color:rgba(255,255,255,0.5);line-height:1.7;">كل أزمة تضمّ 4 مراحل حرجة وتقييم فوري من الذكاء الاصطناعي. قراراتك تُحدّد درجتك القيادية.</div>' +
        '</div>' +
        '<div class="crisis-select-grid">' + cards + '</div>' +
        '</div>';
}

// ── Start crisis ───────────────────────────────────────────────────────────────────
function startCrisis(id) {
    _crisis.state    = 'active';
    _crisis.crisisId = id;
    _crisis.crisis   = CRISIS_DATA[id];
    _crisis.stage    = 0;
    _crisis.decisions = [];
    _crisis.timeLeft  = 90;
    _crisisRenderRoom();
}

// ── Crisis Room ────────────────────────────────────────────────────────────────────
function _crisisRenderRoom() {
    var c = document.getElementById('crisisContent');
    if (!c) return;
    _crisisClearTimer();

    var cr    = _crisis.crisis;
    var stage = _crisis.stage;
    var sd    = cr.stages[stage];
    var total = cr.stages.length;
    var pct   = Math.round(((stage) / total) * 100);

    var optionsHtml = sd.options.map(function(opt, i) {
        var labels = ['القرار الأول', 'القرار الثاني', 'القرار الثالث'];
        return '<button class="crisis-option-btn" onclick="selectCrisisOption(' + i + ')" id="crisisOpt_' + i + '">' +
               '<div class="crisis-option-shimmer"></div>' +
               '<div class="crisis-option-label">' + labels[i] + '</div>' +
               opt +
               '</button>';
    }).join('');

    c.innerHTML =
        '<div class="crisis-wrap" style="--cc:' + cr.color + ';--cc-dim:' + cr.colorDim + '">' +
        '<div class="crisis-room-wrap" style="animation:cdnaSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) both">' +

        '<div class="crisis-room-hdr">' +
        '<div class="crisis-room-hdr-info">' +
        '<span class="crisis-hdr-icon">' + cr.icon + '</span>' +
        '<div><div class="crisis-hdr-title">' + cr.title + '</div>' +
        '<div class="crisis-hdr-stage">المرحلة ' + (stage + 1) + ' / ' + total + '</div></div>' +
        '</div>' +
        '<div class="crisis-stage-bar"><div class="crisis-stage-fill" id="crisisStageBar" style="width:' + pct + '%"></div></div>' +
        '<div class="crisis-timer" id="crisisTimer">90</div>' +
        '</div>' +

        '<div class="crisis-situation">' +
        '<div class="crisis-situation-label"><div class="crisis-situation-pulse"></div> الموقف الراهن</div>' +
        '<div class="crisis-situation-text">' + sd.situation + '</div>' +
        '<div class="crisis-question">⬡ ' + sd.question + '</div>' +
        '</div>' +

        '<div class="crisis-options" id="crisisOptions">' + optionsHtml + '</div>' +
        '<div id="crisisDecisionZone"></div>' +

        '</div></div>';

    // kick off countdown
    _crisisStartTimer();
}

// ── Timer ──────────────────────────────────────────────────────────────────────────
function _crisisStartTimer() {
    _crisis.timeLeft = 90;
    _crisisClearTimer();
    _crisis.timer = setInterval(function() {
        _crisis.timeLeft--;
        var el = document.getElementById('crisisTimer');
        if (el) {
            el.textContent = _crisis.timeLeft;
            el.className   = 'crisis-timer' +
                (_crisis.timeLeft <= 30 ? ' crit' : _crisis.timeLeft <= 60 ? ' warn' : '');
        }
        if (_crisis.timeLeft <= 0) {
            _crisisClearTimer();
        }
    }, 1000);
}

function _crisisClearTimer() {
    if (_crisis.timer) { clearInterval(_crisis.timer); _crisis.timer = null; }
}

// ── Select an option ───────────────────────────────────────────────────────────────
function selectCrisisOption(idx) {
    _crisisClearTimer();
    _crisis.state = 'feedback';

    // disable all buttons
    var opts = document.getElementById('crisisOptions');
    if (opts) {
        opts.querySelectorAll('.crisis-option-btn').forEach(function(btn) {
            btn.disabled = true;
        });
    }

    var sd = _crisis.crisis.stages[_crisis.stage];
    var optionText = sd.options[idx];
    var baseline   = sd.baseline[idx];
    var zone = document.getElementById('crisisDecisionZone');
    if (zone) {
        zone.innerHTML =
            '<div class="crisis-decision-card">' +
            '<div class="crisis-decision-loading"><i class="fas fa-spinner fa-spin"></i> الذكاء الاصطناعي يُحلّل قرارك...</div>' +
            '</div>';
    }

    _crisisEvalDecision(idx, optionText, baseline, sd.question);
}

// ── AI decision evaluation ─────────────────────────────────────────────────────────
async function _crisisEvalDecision(idx, optionText, baseline, question) {
    var cr    = _crisis.crisis;
    var stage = _crisis.stage;

    var prompt =
        'أنت خبير استراتيجي يُقيّم قرارات إدارة الأزمات.\n' +
        'نوع الأزمة: ' + cr.title + '\n' +
        'المرحلة: ' + (stage + 1) + '\n' +
        'السؤال: ' + question + '\n' +
        'القرار المُختار: ' + optionText + '\n\n' +
        'قيّم هذا القرار وأجب بـ JSON فقط بهذا الشكل الحرفي (لا تضف أي نص خارجه):\n' +
        '{"score":82,"trait":"الشجاعة القيادية","assessment":"قرار حكيم يُظهر...","advice":"للمرحلة القادمة، احرص على..."}\n' +
        'الدرجة من 0-100. assessment: جملة إيجابية واحدة. advice: نصيحة قصيرة للمرحلة التالية.';

    var scoreResult = { score: baseline, trait: 'الحكمة الاستراتيجية', assessment: 'قرار مدروس يعكس فهماً للموقف.', advice: 'استمر في التحليل الدقيق للمرحلة القادمة.' };

    try {
        var signal;
        if (typeof AbortSignal.timeout === 'function') {
            signal = AbortSignal.timeout(13000);
        } else {
            var _cc1 = new AbortController();
            setTimeout(function() { _cc1.abort(); }, 13000);
            signal = _cc1.signal;
        }
        var res = await fetch(CHAT_API_BASE + '/api/chat', {
            method:  'POST',
            headers: {'Content-Type':'application/json'},
            body:    JSON.stringify({message: prompt, language: 'ar'}),
            signal:  signal,
        });
        if (!res.ok) throw new Error('api');
        var data = await res.json();
        var text = ((data.text || data.response || data.content || '') + '').trim();
        var parsed = _crisisParseDecision(text, baseline);
        if (parsed) scoreResult = parsed;
    } catch (_e) {
        // use baseline fallback
    }

    // record decision
    _crisis.decisions.push({
        optionIdx:  idx,
        optionText: optionText,
        score:      scoreResult.score,
        trait:      scoreResult.trait,
        assessment: scoreResult.assessment,
        advice:     scoreResult.advice,
    });

    _crisisShowDecisionResult(scoreResult);
}

// ── Parse AI JSON response ─────────────────────────────────────────────────────────
function _crisisParseDecision(text, baseline) {
    try {
        var m = text.match(/\{[\s\S]*?\}/);
        if (m) {
            var obj = JSON.parse(m[0]);
            return {
                score:      Math.min(100, Math.max(0, Math.round(parseFloat(obj.score) || baseline))),
                trait:      String(obj.trait || 'الحكمة الاستراتيجية').slice(0, 40),
                assessment: String(obj.assessment || '').slice(0, 180),
                advice:     String(obj.advice || '').slice(0, 180),
            };
        }
    } catch (_) {}
    return null;
}

// ── Show per-decision result ───────────────────────────────────────────────────────
function _crisisShowDecisionResult(result) {
    var cr = _crisis.crisis;
    var isLast = (_crisis.stage + 1) >= cr.stages.length;

    var scoreColor = result.score >= 80 ? '#00f5d4'
                   : result.score >= 65 ? '#00d4ff'
                   : result.score >= 50 ? '#ffd60a' : '#ff006e';

    var zone = document.getElementById('crisisDecisionZone');
    if (!zone) return;

    zone.innerHTML =
        '<div class="crisis-decision-card" style="--cc:' + cr.color + ';--cc-dim:' + cr.colorDim + '">' +
        '<div class="crisis-decision-score-row">' +
        '<div class="crisis-score-circle" id="crisisScoreCircle" style="border-color:' + scoreColor + ';box-shadow:0 0 18px ' + scoreColor + '44;">' +
        '<div class="crisis-score-num" id="crisisScoreNum" style="color:' + scoreColor + '">0</div>' +
        '</div>' +
        '<div class="crisis-decision-meta">' +
        '<div class="crisis-decision-trait">' + result.trait + '</div>' +
        '<div class="crisis-decision-assess">' + result.assessment + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="crisis-decision-advice"><i class="fas fa-lightbulb" style="color:' + cr.color + ';margin-left:6px;"></i>' + result.advice + '</div>' +
        '<button class="crisis-next-btn" id="crisisNextBtn" onclick="' + (isLast ? 'finishCrisis()' : 'nextCrisisStage()') + '">' +
        (isLast ? '<i class="fas fa-flag-checkered"></i> عرض النتائج النهائية' : '<i class="fas fa-arrow-left"></i> المرحلة التالية') +
        '</button>' +
        '</div>';

    // animate score counter
    var target = result.score;
    var current = 0;
    var step = Math.max(1, Math.round(target / 30));
    var numEl = document.getElementById('crisisScoreNum');
    var counter = setInterval(function() {
        current = Math.min(current + step, target);
        if (numEl) numEl.textContent = current;
        if (current >= target) {
            clearInterval(counter);
            var btn = document.getElementById('crisisNextBtn');
            if (btn) btn.classList.add('ready');
        }
    }, 40);
}

// ── Next stage ─────────────────────────────────────────────────────────────────────
function nextCrisisStage() {
    _crisis.stage++;
    _crisis.state = 'active';
    _crisis.timeLeft = 90;
    _crisisRenderRoom();
}

// ── Finish → results ───────────────────────────────────────────────────────────────
function finishCrisis() {
    _crisisClearTimer();
    _crisis.state = 'results';
    _crisisRenderResults();
}

// ── Results screen ─────────────────────────────────────────────────────────────────
function _crisisRenderResults() {
    var c = document.getElementById('crisisContent');
    if (!c) return;
    var cr = _crisis.crisis;
    var decisions = _crisis.decisions;

    var avgScore = decisions.length
        ? Math.round(decisions.reduce(function(s, d) { return s + d.score; }, 0) / decisions.length)
        : 0;

    var grade = avgScore >= 88 ? { l: 'S', label: 'قائد استثنائي',   c: '#00f5d4' }
              : avgScore >= 78 ? { l: 'A', label: 'قيادة متميزة',    c: '#00d4ff' }
              : avgScore >= 68 ? { l: 'B', label: 'قيادة جيدة',       c: '#9d4edd' }
              : avgScore >= 55 ? { l: 'C', label: 'قيادة مقبولة',    c: '#ffd60a' }
              :                  { l: 'D', label: 'تحتاج تطوير',      c: '#ff006e' };

    var logItems = decisions.map(function(d, i) {
        var sc = d.score >= 80 ? '#00f5d4' : d.score >= 65 ? '#00d4ff' : d.score >= 50 ? '#ffd60a' : '#ff006e';
        return '<div class="crisis-log-item">' +
               '<div class="crisis-log-stage">M' + (i + 1) + '</div>' +
               '<div class="crisis-log-text">' + d.optionText.slice(0, 90) + (d.optionText.length > 90 ? '...' : '') + '</div>' +
               '<div class="crisis-log-score" style="color:' + sc + '">' + d.score + '</div>' +
               '</div>';
    }).join('');

    c.innerHTML =
        '<div class="crisis-wrap" style="--cc:' + cr.color + ';--cc-dim:' + cr.colorDim + '">' +
        '<div style="animation:cdnaSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) both">' +

        '<div class="crisis-results-hero prox-glow">' +
        '<div class="border-beam-el"></div>' +
        '<div class="crisis-results-grade">' + grade.l + '</div>' +
        '<div class="crisis-results-label" style="color:' + grade.c + '">' + grade.label + '</div>' +
        '<div class="crisis-results-score-big" style="color:' + grade.c + '">' + avgScore + ' / 100</div>' +
        '<div style="font-size:0.76rem;color:rgba(255,255,255,0.35);margin-top:0.5rem;">' + cr.title + ' · ' + decisions.length + ' قرارات</div>' +
        '</div>' +

        '<div style="font-family:\'Orbitron\',sans-serif;font-size:0.58rem;letter-spacing:0.12em;color:rgba(255,255,255,0.35);margin-bottom:0.7rem;margin-top:1.3rem;">⬡ سجل القرارات</div>' +
        '<div class="crisis-decisions-log">' + logItems + '</div>' +

        '<div style="font-family:\'Orbitron\',sans-serif;font-size:0.58rem;letter-spacing:0.12em;color:rgba(255,255,255,0.35);margin-bottom:0.6rem;">⬡ تحليل الذكاء الاصطناعي الشامل</div>' +
        '<div class="crisis-ai-analysis loading" id="crisisAiAnalysis">جاري تحليل أدائك القيادي...</div>' +

        '<div class="crisis-results-actions">' +
        '<button class="crisis-action-btn" onclick="resetCrisis()"><i class="fas fa-redo-alt"></i> إعادة الأزمة</button>' +
        '<button class="crisis-action-btn" onclick="newCrisis()"><i class="fas fa-th-large"></i> أزمة جديدة</button>' +
        '</div>' +

        '</div></div>';

    _crisisAIAnalysis(cr, decisions, avgScore, grade);
}

// ── AI full analysis ───────────────────────────────────────────────────────────────
async function _crisisAIAnalysis(cr, decisions, avgScore, grade) {
    var el = document.getElementById('crisisAiAnalysis');
    if (!el) return;

    var traits = decisions.map(function(d) { return d.trait; }).filter(Boolean).join('، ');
    var prompt =
        'أنت خبير قيادة وإدارة أزمات. قيّم هذا الأداء القيادي:\n' +
        'نوع الأزمة: ' + cr.title + '\n' +
        'المعدل الإجمالي: ' + avgScore + '/100 — ' + grade.label + '\n' +
        'السمات القيادية المُظهَرة: ' + traits + '\n\n' +
        'اكتب تحليلاً قيادياً مختصراً وصريحاً بالعربية يشمل:\n' +
        '1. تقييم عام لأسلوب إدارة الأزمة\n' +
        '2. أبرز نقطة قوة قيادية\n' +
        '3. أهم جانب يحتاج تطوير\n' +
        '4. نصيحة محددة لمواجهة الأزمات المستقبلية\n' +
        'لا تتجاوز 140 كلمة. كن واضحاً ومحفّزاً.';

    try {
        var signal;
        if (typeof AbortSignal.timeout === 'function') {
            signal = AbortSignal.timeout(15000);
        } else {
            var _cc2 = new AbortController();
            setTimeout(function() { _cc2.abort(); }, 15000);
            signal = _cc2.signal;
        }
        var res = await fetch(CHAT_API_BASE + '/api/chat', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({message: prompt, language: 'ar'}), signal: signal,
        });
        if (!res.ok) throw new Error();
        var data = await res.json();
        var text = ((data.text || data.response || data.content || '') + '').trim();
        if (el && text) { el.classList.remove('loading'); el.textContent = text; }
        else throw new Error();
    } catch (_e) {
        if (!el) return;
        el.classList.remove('loading');
        el.textContent =
            'أدار القائد أزمة "' + cr.title + '" بمعدل ' + avgScore + '% — ' + grade.label + '.\n' +
            'السمات البارزة: ' + (traits || 'الحكمة الاستراتيجية') + '.\n' +
            'للتطوير: ركّز على سرعة اتخاذ القرار في الأوقات الحرجة وبناء فريق أزمات متمرّن مسبقاً.';
    }
}

// ── Reset / New crisis ─────────────────────────────────────────────────────────────
function resetCrisis() {
    var id = _crisis.crisisId;
    _crisis.stage    = 0;
    _crisis.decisions = [];
    _crisis.state    = 'active';
    _crisis.timeLeft = 90;
    _crisisClearTimer();
    startCrisis(id);
}

function newCrisis() {
    _crisisClearTimer();
    _crisis.state    = null;
    _crisis.crisisId = null;
    _crisis.crisis   = null;
    _crisis.stage    = 0;
    _crisis.decisions = [];
    _crisis.timeLeft = 90;
    _crisisRenderSelect();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LIVE AI ROADMAP — MASTER FEATURES #6
   AI-generated personalised career roadmap: internships, certs, milestones,
   skills progression. Holographic interactive timeline.
   State: _rdmp  |  Entry: renderRoadmap()
═══════════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────────────
var _rdmp = {
    state:      null,   // null | 'setup' | 'loading' | 'view'
    profile:    null,   // { name, major, year, goal, lang }
    roadmap:    null,   // parsed roadmap object
    expanded:   {},     // milestone id → bool
};

// ── Milestone type meta ────────────────────────────────────────────────────────────
var RDMP_TYPE = {
    internship:  { label:'تدريب داخلي', icon:'🏢', color:'#00d4ff',   colorDim:'rgba(0,212,255,0.12)'   },
    cert:        { label:'شهادة مهنية', icon:'🏅', color:'#ffd60a',   colorDim:'rgba(255,214,10,0.1)'   },
    project:     { label:'مشروع',       icon:'🚀', color:'#00f5d4',   colorDim:'rgba(0,245,212,0.08)'   },
    skill:       { label:'مهارة',       icon:'⚡', color:'#9d4edd',   colorDim:'rgba(157,78,221,0.1)'   },
    milestone:   { label:'إنجاز',       icon:'🏆', color:'#ff006e',   colorDim:'rgba(255,0,110,0.1)'    },
};

// ── Fallback roadmap (offline / API down) ─────────────────────────────────────────
function _rdmpFallback(profile) {
    var major  = profile.major  || 'إدارة الأعمال';
    var goal   = profile.goal   || 'القيادة التنفيذية';
    var name   = profile.name   || 'الطالب';
    return {
        summary: 'خارطة طريق مخصّصة لـ ' + name + ' في تخصص ' + major + ' نحو ' + goal + '.\nتضم 4 مراحل رئيسية تمتد عبر مسيرتك الجامعية وما بعدها، مع تركيز على التطبيق العملي وبناء الشبكة المهنية.',
        phases: [
            {
                label: 'المرحلة الأولى — بناء الأساس',
                color: '#00d4ff',
                items: [
                    { type:'skill',      title:'أساسيات ' + major, date:'الفصل الأول', detail:'ركّز على المواد الأساسية وابنِ قاعدة معرفية صلبة. احضر المحاضرات وشارك في النقاشات.' },
                    { type:'cert',       title:'شهادة Google Analytics', date:'الشهر الثالث', detail:'احصل على شهادة مجانية من Google. تستغرق 4-6 ساعات وتُعزّز ملفك المهني.' },
                    { type:'project',    title:'مشروع نهاية الفصل', date:'الشهر الرابع', detail:'طوّر مشروعاً تطبيقياً يربط المنهج بمشكلة حقيقية في السوق المحلي.' },
                ],
            },
            {
                label: 'المرحلة الثانية — التطبيق العملي',
                color: '#9d4edd',
                items: [
                    { type:'internship', title:'تدريب صيفي في شركة محلية', date:'الصيف الأول', detail:'ابحث عن تدريب في شركة ذات صلة بتخصصك. استهدف الشركات الناشئة للحصول على تجربة أوسع.' },
                    { type:'skill',      title:'مهارات Excel & Power BI', date:'الشهر السابع', detail:'أتقن تحليل البيانات بـ Excel و Power BI. مهارتان مطلوبتان في 85% من الوظائف.' },
                    { type:'cert',       title:'شهادة PMP Foundation', date:'الشهر التاسع', detail:'ابدأ بـ CAPM أو PMI Foundation لتُظهر اهتماماً بإدارة المشاريع.' },
                ],
            },
            {
                label: 'المرحلة الثالثة — القيادة والتميّز',
                color: '#00f5d4',
                items: [
                    { type:'milestone',  title:'قيادة مشروع فريق', date:'السنة الثالثة', detail:'قُد فريقاً من 4-6 طلاب في مشروع حقيقي. الخبرة القيادية لا تُعوَّض في سوق العمل.' },
                    { type:'internship', title:'تدريب في شركة متعددة الجنسيات', date:'الصيف الثاني', detail:'ارفع مستواك إلى شركة دولية. احتفظ بتوصية خطية من مشرفك.' },
                    { type:'cert',       title:'شهادة في ' + goal, date:'الشهر الثامن عشر', detail:'احصل على شهادة متخصصة مرتبطة مباشرة بهدفك المهني.' },
                ],
            },
            {
                label: 'المرحلة الرابعة — الانطلاق المهني',
                color: '#ff006e',
                items: [
                    { type:'project',    title:'مشروع التخرج الاستراتيجي', date:'السنة الرابعة', detail:'اختر موضوعاً يحل مشكلة حقيقية. استهدف النشر أو العرض أمام شركاء صناعيين.' },
                    { type:'skill',      title:'بناء الشبكة المهنية', date:'على امتداد المسار', detail:'انضم إلى LinkedIn وArabNet. احضر 2 مؤتمر على الأقل. ابنِ علاقات أصيلة.' },
                    { type:'milestone',  title:'عرض وظيفة مستهدفة', date:'قبل التخرج بـ 3 أشهر', detail:'ابدأ التقديم مبكراً. استهدف 5 شركات واحصل على تدريب محادثة مع أحد الخريجين.' },
                ],
            },
        ],
        skills: [
            { name:'التحليل الاستراتيجي', pct:85, color:'#00d4ff'  },
            { name:'إدارة المشاريع',       pct:78, color:'#9d4edd'  },
            { name:'التواصل والعرض',       pct:90, color:'#00f5d4'  },
            { name:'البيانات والتقنية',    pct:72, color:'#ffd60a'  },
            { name:'القيادة وبناء الفريق', pct:80, color:'#ff006e'  },
        ],
    };
}

// ── Entry ──────────────────────────────────────────────────────────────────────────
function renderRoadmap() {
    var c = document.getElementById('roadmapContent');
    if (!c) return;
    if (_rdmp.state === null || _rdmp.state === 'setup') {
        _rdmpRenderSetup();
    } else if (_rdmp.state === 'loading') {
        _rdmpRenderLoading();
    } else if (_rdmp.state === 'view') {
        _rdmpRenderView();
    }
}

// ── Setup form ────────────────────────────────────────────────────────────────────
function _rdmpRenderSetup() {
    _rdmp.state = 'setup';
    var c = document.getElementById('roadmapContent');
    if (!c) return;

    c.innerHTML =
        '<div class="rdmp-wrap" style="animation:cdnaSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) both">' +
        '<div class="rdmp-setup prox-glow">' +
        '<div class="border-beam-el"></div>' +
        '<div class="rdmp-setup-title">⬡ أدخل بياناتك لتوليد خارطة طريقك المخصّصة</div>' +

        '<div class="rdmp-field-grid">' +

        '<div class="rdmp-field">' +
        '<label class="rdmp-label">الاسم</label>' +
        '<input class="rdmp-input" id="rdmpName" type="text" placeholder="اسمك الكريم" />' +
        '</div>' +

        '<div class="rdmp-field">' +
        '<label class="rdmp-label">التخصص</label>' +
        '<select class="rdmp-select" id="rdmpMajor">' +
        '<option value="إدارة الأعمال">إدارة الأعمال</option>' +
        '<option value="التمويل والمصارف">التمويل والمصارف</option>' +
        '<option value="نظم المعلومات">نظم المعلومات</option>' +
        '<option value="الموارد البشرية">الموارد البشرية</option>' +
        '<option value="التسويق">التسويق</option>' +
        '<option value="الاقتصاد">الاقتصاد</option>' +
        '<option value="المحاسبة">المحاسبة</option>' +
        '<option value="ريادة الأعمال">ريادة الأعمال</option>' +
        '<option value="إدارة العمليات">إدارة العمليات</option>' +
        '<option value="الأعمال الرقمية">الأعمال الرقمية</option>' +
        '</select>' +
        '</div>' +

        '<div class="rdmp-field">' +
        '<label class="rdmp-label">السنة الدراسية</label>' +
        '<select class="rdmp-select" id="rdmpYear">' +
        '<option value="الأولى">السنة الأولى</option>' +
        '<option value="الثانية">السنة الثانية</option>' +
        '<option value="الثالثة" selected>السنة الثالثة</option>' +
        '<option value="الرابعة">السنة الرابعة</option>' +
        '</select>' +
        '</div>' +

        '<div class="rdmp-field">' +
        '<label class="rdmp-label">الهدف المهني</label>' +
        '<select class="rdmp-select" id="rdmpGoal">' +
        '<option value="القيادة التنفيذية">القيادة التنفيذية (CEO/COO)</option>' +
        '<option value="ريادة الأعمال">ريادة الأعمال</option>' +
        '<option value="الاستشارات الإدارية">الاستشارات الإدارية</option>' +
        '<option value="التحليل المالي">التحليل المالي</option>' +
        '<option value="التسويق الرقمي">التسويق الرقمي</option>' +
        '<option value="إدارة المشاريع">إدارة المشاريع</option>' +
        '<option value="الموارد البشرية الاستراتيجية">الموارد البشرية الاستراتيجية</option>' +
        '</select>' +
        '</div>' +

        '</div>' +

        '<button class="rdmp-gen-btn" id="rdmpGenBtn" onclick="generateRoadmap()">' +
        '<i class="fas fa-magic"></i> توليد خارطة الطريق بالذكاء الاصطناعي' +
        '</button>' +

        '</div></div>';
}

// ── Loading state ─────────────────────────────────────────────────────────────────
function _rdmpRenderLoading() {
    var c = document.getElementById('roadmapContent');
    if (!c) return;
    c.innerHTML =
        '<div class="rdmp-wrap" style="text-align:center;padding:3rem 1rem">' +
        '<div style="font-size:3rem;margin-bottom:1rem;animation:cdnaPulse 1s ease-in-out infinite">🗺️</div>' +
        '<div style="font-family:\'Orbitron\',sans-serif;font-size:0.75rem;letter-spacing:0.15em;color:var(--primary);animation:cdnaPulse 1.2s ease-in-out infinite">الذكاء الاصطناعي يبني خارطة طريقك...</div>' +
        '<div style="font-size:0.8rem;color:rgba(255,255,255,0.35);margin-top:0.7rem">يتم تحليل تخصصك وأهدافك وإنشاء مسار مخصّص لك</div>' +
        '</div>';
}

// ── Generate roadmap via AI ───────────────────────────────────────────────────────
async function generateRoadmap() {
    var nameEl  = document.getElementById('rdmpName');
    var majorEl = document.getElementById('rdmpMajor');
    var yearEl  = document.getElementById('rdmpYear');
    var goalEl  = document.getElementById('rdmpGoal');
    var btn     = document.getElementById('rdmpGenBtn');

    var profile = {
        name:  (nameEl  ? nameEl.value.trim()  : '') || 'الطالب',
        major: majorEl  ? majorEl.value  : 'إدارة الأعمال',
        year:  yearEl   ? yearEl.value   : 'الثالثة',
        goal:  goalEl   ? goalEl.value   : 'القيادة التنفيذية',
    };
    _rdmp.profile  = profile;
    _rdmp.state    = 'loading';
    _rdmp.expanded = {};

    if (btn) btn.disabled = true;
    _rdmpRenderLoading();

    var prompt =
        'أنت مستشار مهني خبير. أنشئ خارطة طريق مهنية مخصّصة لهذا الطالب:\n' +
        'الاسم: ' + profile.name + '\n' +
        'التخصص: ' + profile.major + '\n' +
        'السنة الدراسية: ' + profile.year + '\n' +
        'الهدف المهني: ' + profile.goal + '\n\n' +
        'أجب بـ JSON فقط بهذا الشكل الحرفي (لا تضف أي نص خارجه):\n' +
        '{\n' +
        '  "summary": "ملخص تحفيزي مخصص بـ 2-3 جمل",\n' +
        '  "phases": [\n' +
        '    {\n' +
        '      "label": "اسم المرحلة",\n' +
        '      "color": "#00d4ff",\n' +
        '      "items": [\n' +
        '        { "type": "internship|cert|project|skill|milestone", "title": "العنوان", "date": "التوقيت", "detail": "تفاصيل عملية 1-2 جمل" }\n' +
        '      ]\n' +
        '    }\n' +
        '  ],\n' +
        '  "skills": [\n' +
        '    { "name": "اسم المهارة", "pct": 80, "color": "#00d4ff" }\n' +
        '  ]\n' +
        '}\n' +
        'القواعد: 4 مراحل، كل مرحلة 3 عناصر. 5-6 مهارات. الألوان من: #00d4ff #9d4edd #00f5d4 #ffd60a #ff006e. كل العناصر بالعربية.';

    var roadmap = null;
    try {
        var signal;
        if (typeof AbortSignal.timeout === 'function') {
            signal = AbortSignal.timeout(22000);
        } else {
            var _rc1 = new AbortController();
            setTimeout(function() { _rc1.abort(); }, 22000);
            signal = _rc1.signal;
        }
        var res = await fetch(CHAT_API_BASE + '/api/chat', {
            method:  'POST',
            headers: {'Content-Type':'application/json'},
            body:    JSON.stringify({message: prompt, language: 'ar'}),
            signal:  signal,
        });
        if (!res.ok) throw new Error('api');
        var data = await res.json();
        var text = ((data.text || data.response || data.content || '') + '').trim();
        // strip any markdown code fences
        text = text.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
        var m = text.match(/\{[\s\S]*\}/);
        if (m) roadmap = JSON.parse(m[0]);
    } catch (_e) {
        roadmap = null;
    }

    if (!roadmap || !Array.isArray(roadmap.phases) || !roadmap.phases.length) {
        roadmap = _rdmpFallback(profile);
    }

    _rdmp.roadmap = roadmap;
    _rdmp.state   = 'view';
    _rdmpRenderView();
}

// ── Render full holographic timeline ─────────────────────────────────────────────
function _rdmpRenderView() {
    var c = document.getElementById('roadmapContent');
    if (!c) return;
    var rmap    = _rdmp.roadmap;
    var profile = _rdmp.profile || {};

    /* -- Legend -- */
    var legendHtml = Object.keys(RDMP_TYPE).map(function(k) {
        var t = RDMP_TYPE[k];
        return '<div class="rdmp-legend-item">' +
               '<div class="rdmp-legend-dot" style="background:' + t.color + ';box-shadow:0 0 6px ' + t.color + '"></div>' +
               t.label + '</div>';
    }).join('');

    /* -- Timeline phases -- */
    var timelineHtml = '';
    var itemIdx = 0;
    (rmap.phases || []).forEach(function(phase, pi) {
        var phaseColor   = phase.color || '#00d4ff';
        var phaseColorDim = 'rgba(0,212,255,0.1)';

        timelineHtml +=
            '<div class="rdmp-phase-hdr">' +
            '<div class="rdmp-phase-badge" style="color:' + phaseColor + ';border-color:' + phaseColor + ';background:rgba(0,0,0,0.4);">' +
            phase.label +
            '</div></div>';

        (phase.items || []).forEach(function(item, ii) {
            var isRight = (ii % 2 === 0);
            var typeMeta = RDMP_TYPE[item.type] || RDMP_TYPE.milestone;
            var tc       = typeMeta.color;
            var mid      = 'rdmpM_' + pi + '_' + ii;

            timelineHtml +=
                '<div class="rdmp-milestone' + (isRight ? ' right' : '') + '" id="' + mid + 'wrap">' +
                // dot side (always closest to spine)
                '<div class="rdmp-milestone-dot-wrap" style="' + (isRight ? 'align-items:flex-start;' : 'align-items:flex-end;') + '">' +
                '<div class="rdmp-dot" id="' + mid + 'dot" style="border-color:' + tc + ';background:' + tc + '22;box-shadow:0 0 10px ' + tc + '88;" onclick="toggleRdmpCard(\'' + mid + '\')" title="' + typeMeta.label + '"></div>' +
                '</div>' +
                // card
                '<div class="rdmp-card" id="' + mid + '" style="--rdmp-c:' + tc + '" onclick="toggleRdmpCard(\'' + mid + '\')">' +
                '<div class="rdmp-card-shimmer"></div>' +
                '<div class="rdmp-card-type">' + typeMeta.icon + ' ' + typeMeta.label + '</div>' +
                '<div class="rdmp-card-title">' + item.title + '</div>' +
                '<div class="rdmp-card-date"><i class="fas fa-calendar-alt" style="margin-left:4px;opacity:0.5;"></i>' + item.date + '</div>' +
                '<div class="rdmp-card-detail">' + (item.detail || '') + '</div>' +
                '</div>' +
                '</div>';
            itemIdx++;
        });
    });

    /* -- Skills bars -- */
    var skillsHtml = (rmap.skills || []).map(function(sk) {
        return '<div class="rdmp-skill-row">' +
               '<div class="rdmp-skill-name">' + sk.name + '</div>' +
               '<div class="rdmp-skill-bar"><div class="rdmp-skill-fill" data-w="' + sk.pct + '" style="background:' + (sk.color || '#00d4ff') + '"></div></div>' +
               '<div class="rdmp-skill-pct">' + sk.pct + '%</div>' +
               '</div>';
    }).join('');

    /* -- Assemble full view -- */
    c.innerHTML =
        '<div class="rdmp-wrap" style="animation:cdnaSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) both">' +

        /* header row */
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.2rem;">' +
        '<div>' +
        '<div style="font-family:\'Orbitron\',sans-serif;font-size:0.65rem;letter-spacing:0.14em;color:var(--primary);margin-bottom:4px;">⬡ خارطة طريق ' + profile.name + '</div>' +
        '<div style="font-size:0.82rem;color:rgba(255,255,255,0.45);">' + (profile.major || '') + ' · ' + (profile.goal || '') + '</div>' +
        '</div>' +
        '<button class="rdmp-reset-btn" onclick="resetRoadmap()"><i class="fas fa-redo-alt"></i> توليد خارطة جديدة</button>' +
        '</div>' +

        /* AI summary */
        '<div class="rdmp-ai-summary">' + (rmap.summary || '') + '</div>' +

        /* legend */
        '<div class="rdmp-legend" style="margin-top:1.3rem;">' + legendHtml + '</div>' +

        /* timeline */
        '<div class="rdmp-timeline-shell">' +
        '<div class="rdmp-tl-spine"></div>' +
        timelineHtml +
        '</div>' +

        /* skills */
        '<div class="rdmp-skills-section" style="margin-top:2rem;">' +
        '<div class="rdmp-skills-title">⬡ تطور المهارات المتوقع عبر المسار</div>' +
        skillsHtml +
        '</div>' +

        '</div>';

    /* animate skill bars */
    setTimeout(function() {
        c.querySelectorAll('.rdmp-skill-fill').forEach(function(el) {
            var w = el.getAttribute('data-w');
            if (w) el.style.width = w + '%';
        });
    }, 150);
}

// ── Toggle milestone expand ───────────────────────────────────────────────────────
function toggleRdmpCard(mid) {
    var card = document.getElementById(mid);
    if (!card) return;
    var isExp = card.classList.contains('expanded');
    if (isExp) {
        card.classList.remove('expanded');
        _rdmp.expanded[mid] = false;
    } else {
        card.classList.add('expanded');
        _rdmp.expanded[mid] = true;
    }
}

// ── Reset ─────────────────────────────────────────────────────────────────────────
function resetRoadmap() {
    _rdmp.state    = 'setup';
    _rdmp.roadmap  = null;
    _rdmp.profile  = null;
    _rdmp.expanded = {};
    _rdmpRenderSetup();
}

