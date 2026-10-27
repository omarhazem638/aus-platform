// ===========================================================================
// ============= AI VOICE v3 — Dialect-aware backend TTS ====================
// ===========================================================================
//
// Layer on top of Voice v2 (Web Speech). When the Python backend is reachable,
// every speak() call streams MP3 from /api/voice/synthesize for the chosen
// dialect. If the backend is unreachable, v2 (Web Speech) handles playback
// transparently. No existing UI layout is modified — we re-populate the
// existing #voiceSelect with dialect voices and reuse the speed slider.
//
const VOICE_API_BASE = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';

// Backend voice catalogue (loaded on boot)
let backendVoices = [];

// Country → default voice mapping (for "user selects country → dialect auto loads")
const COUNTRY_TO_VOICE = {
    // Arabic dialects
    SA: { male: 'saudi-male',      female: 'saudi-female' },
    SY: { male: 'syrian-male',     female: 'syrian-female' },
    JO: { male: 'jordanian-male',  female: 'jordanian-female' },
    AE: { male: 'emirati-male',    female: 'emirati-female' },
    EG: { male: 'egyptian-male',   female: 'egyptian-female' },
    IQ: { male: 'iraqi-male',      female: 'iraqi-female' },
    KW: { male: 'kuwaiti-male',    female: 'kuwaiti-female' },
    LB: { male: 'lebanese-male',   female: 'lebanese-female' },
    BH: { male: 'bahraini-male',   female: 'bahraini-female' },
    // Foreign languages
    US: { male: 'en-us-male',      female: 'en-us-female' },
    GB: { male: 'en-uk-male',      female: 'en-uk-female' },
    FR: { male: 'fr-male',         female: 'fr-female' },
    DE: { male: 'de-male',         female: 'de-female' },
    ES: { male: 'es-male',         female: 'es-female' },
};

// Persist new prefs (don't overwrite if already set)
if (!('voiceCountry'    in prefs)) prefs.voiceCountry    = 'SA';   // default Saudi
if (!('voiceBackendId'  in prefs)) prefs.voiceBackendId  = 'saudi-female';
if (!('voiceUseBackend' in prefs)) prefs.voiceUseBackend = true;
savePrefs();

// --- Fetch the dialect catalogue once on boot ---
async function loadBackendVoices() {
    try {
        const res = await fetch(`${VOICE_API_BASE}/api/voice/list`, { method: 'GET' });
        if (!res.ok) throw new Error('voice list HTTP ' + res.status);
        const data = await res.json();
        backendVoices = data.voices || [];
        // Update the existing #voiceSelect with dialect entries
        injectDialectsIntoSelect();
    } catch (err) {
        console.warn('[voice v3] backend unavailable, using Web Speech only:', err.message);
        backendVoices = [];
    }
}

// --- Augment existing #voiceSelect with a "🌍 Dialects (Backend)" optgroup ---
function injectDialectsIntoSelect() {
    const sel = document.getElementById('voiceSelect');
    if (!sel || !backendVoices.length) return;

    // Build optgroup HTML
    const arVoices = backendVoices.filter(v => v.lang === 'ar');
    const fgVoices = backendVoices.filter(v => v.lang !== 'ar');

    let html = '';
    if (arVoices.length) {
        html += '<optgroup label="🗣️ Arabic dialects (Cinematic backend)">';
        arVoices.forEach(v => {
            const sel2 = v.id === prefs.voiceBackendId ? ' selected' : '';
            const g = v.gender === 'male' ? '♂' : '♀';
            html += `<option value="bk:${v.id}"${sel2}>⭐ ${g} ${v.label}</option>`;
        });
        html += '</optgroup>';
    }
    if (fgVoices.length) {
        html += '<optgroup label="🌍 Foreign voices (Cinematic backend)">';
        fgVoices.forEach(v => {
            const sel2 = v.id === prefs.voiceBackendId ? ' selected' : '';
            const g = v.gender === 'male' ? '♂' : '♀';
            html += `<option value="bk:${v.id}"${sel2}>⭐ ${g} ${v.label}</option>`;
        });
        html += '</optgroup>';
    }

    // Insert as the FIRST entries (after the auto option), preserving existing entries below
    const existingHTML = sel.innerHTML;
    // Find the auto/blank option to keep it on top
    const autoMatch = existingHTML.match(/<option value="">[^<]*<\/option>/);
    const auto = autoMatch ? autoMatch[0] : '<option value="">— Auto —</option>';
    // Strip it from the existing block to avoid duplicates
    const rest = existingHTML.replace(/<option value="">[^<]*<\/option>/, '');
    sel.innerHTML = auto + html + rest;

    // Restore selection if user previously picked a backend voice
    if (prefs.voiceUseBackend && prefs.voiceBackendId) {
        sel.value = 'bk:' + prefs.voiceBackendId;
    }
}

// --- Hook setVoiceById to recognize "bk:" prefix ---
const _origSetVoiceById = (typeof setVoiceById === 'function') ? setVoiceById : null;
setVoiceById = function(id) {
    if (typeof id === 'string' && id.startsWith('bk:')) {
        prefs.voiceUseBackend = true;
        prefs.voiceBackendId  = id.slice(3);
        // Update country pref to match
        const v = backendVoices.find(x => x.id === prefs.voiceBackendId);
        if (v) prefs.voiceCountry = v.country;
        savePrefs();
        refreshVoiceMeta3();
        // Preview line
        if (prefs.voice && v) {
            const lines = {
                ar: { male: 'أهلاً، أنا مساعدك الصوتي.', female: 'أهلاً، أنا مساعدتك الصوتية.' },
                en: { male: 'Hello, I am your voice assistant.', female: 'Hi, I am your voice assistant.' },
                fr: { male: 'Bonjour, je suis votre assistant vocal.', female: 'Bonjour, je suis votre assistante vocale.' },
                de: { male: 'Hallo, ich bin Ihr Sprachassistent.', female: 'Hallo, ich bin Ihre Sprachassistentin.' },
                es: { male: 'Hola, soy tu asistente de voz.', female: 'Hola, soy tu asistente de voz.' },
            };
            const line = (lines[v.lang] || lines.en)[v.gender] || lines.en.female;
            speak(line);
        }
        sfxPlay && sfxPlay('click');
        return;
    }
    // Delegate to original v2 handler for Web Speech voices
    if (_origSetVoiceById) {
        prefs.voiceUseBackend = false;
        savePrefs();
        return _origSetVoiceById(id);
    }
};

// --- When user clicks ♀/♂ button, auto-pick backend voice matching country+gender ---
const _origSetVoiceGender = (typeof setVoiceGender === 'function') ? setVoiceGender : null;
setVoiceGender = function(g) {
    if (_origSetVoiceGender) _origSetVoiceGender(g);
    if (prefs.voiceUseBackend) {
        const m = COUNTRY_TO_VOICE[prefs.voiceCountry];
        if (m && m[g]) {
            prefs.voiceBackendId = m[g];
            savePrefs();
            const sel = document.getElementById('voiceSelect');
            if (sel) sel.value = 'bk:' + prefs.voiceBackendId;
            refreshVoiceMeta3();
        }
    }
};

// --- Country picker — user calls setVoiceCountry('SA') → dialect auto loads ---
function setVoiceCountry(country) {
    if (!COUNTRY_TO_VOICE[country]) return;
    prefs.voiceCountry = country;
    const gender = prefs.voiceGender || 'female';
    prefs.voiceBackendId  = COUNTRY_TO_VOICE[country][gender];
    prefs.voiceUseBackend = true;
    savePrefs();
    const sel = document.getElementById('voiceSelect');
    if (sel) sel.value = 'bk:' + prefs.voiceBackendId;
    refreshVoiceMeta3();
    if (prefs.voice) {
        const v = backendVoices.find(x => x.id === prefs.voiceBackendId);
        if (v) speak('مرحباً! تم تحديد لهجة ' + v.label);
    }
}

// --- Refresh badge for backend voices ---
function refreshVoiceMeta3() {
    if (!prefs.voiceUseBackend) return;
    const v = backendVoices.find(x => x.id === prefs.voiceBackendId);
    if (!v) return;
    const meta = document.getElementById('voiceMeta');
    if (!meta) return;
    const badge = meta.querySelector('.voice-quality-badge');
    if (badge) {
        badge.className = 'voice-quality-badge neural';
        badge.textContent = '⭐ Cinematic';
    }
    const nameEl = document.getElementById('voiceMetaName');
    if (nameEl) nameEl.textContent = v.label + ' (' + v.country + ')';
}

// --- Speed control: clamp to allowed values 0.75 / 1 / 1.25 / 1.5 if discrete needed ---
const ALLOWED_SPEEDS = [0.75, 1.0, 1.25, 1.5];
function setVoiceSpeedDiscrete(v) {
    const s = parseFloat(v) || 1;
    // Snap to nearest allowed value
    let nearest = ALLOWED_SPEEDS[0];
    let minD = Infinity;
    for (const a of ALLOWED_SPEEDS) {
        const d = Math.abs(a - s);
        if (d < minD) { minD = d; nearest = a; }
    }
    if (typeof setVoiceSpeed === 'function') setVoiceSpeed(nearest);
}

// --- Backend speak — streams MP3 via Audio element ---
let _currentBackendAudio = null;
async function speakViaBackend(text, voiceId, speed) {
    // Stop any in-flight backend audio
    if (_currentBackendAudio) {
        try { _currentBackendAudio.pause(); } catch {}
        _currentBackendAudio = null;
    }

    const clean = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return false;

    try {
        const res = await fetch(`${VOICE_API_BASE}/api/voice/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: clean.slice(0, 4000),
                voice_id: voiceId,
                speed: speed
            })
        });
        if (!res.ok) throw new Error('synthesize HTTP ' + res.status);

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        // Apply speed client-side (handles engines like gTTS that don't speed natively)
        audio.playbackRate = Math.max(0.5, Math.min(2.0, speed || 1.0));
        _currentBackendAudio = audio;

        // UI feedback (reuse v2 helpers if available)
        if (typeof showSpeakingUI === 'function') showSpeakingUI();
        audio.addEventListener('ended', () => {
            if (typeof hideSpeakingUI === 'function') hideSpeakingUI();
            URL.revokeObjectURL(url);
            if (_currentBackendAudio === audio) _currentBackendAudio = null;
        });
        audio.addEventListener('error', () => {
            if (typeof hideSpeakingUI === 'function') hideSpeakingUI();
            URL.revokeObjectURL(url);
        });

        await audio.play();
        return true;
    } catch (err) {
        console.warn('[voice v3] backend TTS failed, falling back to Web Speech:', err.message);
        return false;
    }
}

// --- Override speak() to prefer backend when user selected a dialect voice ---
const _v2Speak = speak;
speak = function(text, opts) {
    if (!prefs.voice) return;
    // If user picked a backend voice, try the cinematic backend first
    if (prefs.voiceUseBackend && prefs.voiceBackendId && backendVoices.length) {
        speakViaBackend(text, prefs.voiceBackendId, prefs.voiceSpeed || 1.0)
            .then(ok => {
                if (!ok) _v2Speak(text, opts);  // fallback
            });
        return;
    }
    return _v2Speak(text, opts);
};

// --- Also intercept stopSpeaking to halt backend audio ---
const _v2Stop = (typeof stopSpeaking === 'function') ? stopSpeaking : null;
stopSpeaking = function() {
    if (_currentBackendAudio) {
        try { _currentBackendAudio.pause(); _currentBackendAudio.currentTime = 0; } catch {}
        _currentBackendAudio = null;
    }
    if (typeof hideSpeakingUI === 'function') hideSpeakingUI();
    if (_v2Stop) _v2Stop();
};

// --- Boot: fetch catalogue then refresh UI ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadBackendVoices().then(() => {
            // Refresh select & meta once catalogue is loaded
            try { refreshVoiceMeta3(); } catch {}
        });
    }, 600);
});
// Expose for inline onclicks if ever needed
window.setVoiceCountry = setVoiceCountry;
window.setVoiceSpeedDiscrete = setVoiceSpeedDiscrete;

// Extend COUNTRY_TO_VOICE with new Arabic dialects (added in voice.py v2)
if (typeof COUNTRY_TO_VOICE !== 'undefined') {
    Object.assign(COUNTRY_TO_VOICE, {
        IQ: { male: 'iraqi-male',    female: 'iraqi-female' },
        KW: { male: 'kuwaiti-male',  female: 'kuwaiti-female' },
        LB: { male: 'lebanese-male', female: 'lebanese-female' },
        BH: { male: 'bahraini-male', female: 'bahraini-female' },
    });
}

// ===========================================================================
// ========= AUS AGENT ARCHITECTURE v1.0 =====================================
// ========= Modular Tool System · JSON Protocol · Plugin-ready ==============
// ===========================================================================

// ── CSS injection ────────────────────────────────────────────────────────────
(function _injectAgentCSS() {
    if (document.getElementById('aus-agent-css')) return;
    const s = document.createElement('style');
    s.id = 'aus-agent-css';
    s.textContent = `
        /* ── Agent status bar ── */
        .aus-agent-bar {
            display: flex; align-items: center; gap: 8px;
            padding: 5px 14px; margin: 0 0 4px;
            background: rgba(0,212,255,0.07);
            border: 1px solid rgba(0,212,255,0.18);
            border-radius: 20px; font-size: 0.76rem;
            color: rgba(255,255,255,0.65);
            transition: opacity 0.4s, max-height 0.4s;
            overflow: hidden; max-height: 36px;
        }
        .aus-agent-bar[data-state="idle"] { opacity: 0; max-height: 0; padding: 0 14px; pointer-events: none; }
        .aus-agent-bar[data-state="thinking"] { border-color: rgba(0,212,255,0.45); color: var(--primary,#00d4ff); }
        .aus-agent-bar[data-state="running"]  { border-color: rgba(0,245,212,0.45); color: var(--success,#00f5d4); }
        .aus-agent-bar[data-state="error"]    { border-color: rgba(255,0,110,0.45); color: #ff006e; }
        @keyframes _ausPulse { 0%,100%{opacity:.65} 50%{opacity:1} }
        .aus-agent-bar[data-state="thinking"] .aus-agent-phase,
        .aus-agent-bar[data-state="running"]  .aus-agent-phase { animation: _ausPulse 1.2s infinite; }
        .aus-agent-phase { margin-right: auto; font-size: 0.7rem; opacity: .8; }

        /* ── Agent badge on AI bubbles ── */
        .agent-badge {
            display: inline-block; font-size: 0.62rem; line-height: 1;
            background: linear-gradient(90deg,rgba(0,212,255,.15),rgba(157,78,221,.15));
            border: 1px solid rgba(0,212,255,.35); border-radius: 10px;
            padding: 1px 8px; color: var(--primary,#00d4ff);
            vertical-align: middle; margin-right: 5px;
        }

        /* ── Voice search ── */
        .aus-voice-search-wrap {
            position: relative; margin-bottom: 8px;
        }
        .aus-voice-search-input {
            width: 100%; padding: 7px 34px 7px 10px;
            background: rgba(0,212,255,.07);
            border: 1px solid rgba(0,212,255,.22);
            border-radius: 8px; color: #fff;
            font-family: 'Tajawal', sans-serif; font-size: 0.84rem;
            outline: none; direction: rtl; transition: border-color .2s;
        }
        .aus-voice-search-input::placeholder { color: rgba(255,255,255,.38); }
        .aus-voice-search-input:focus { border-color: var(--primary,#00d4ff); }
        .aus-voice-search-icon {
            position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
            color: rgba(255,255,255,.38); font-size: .78rem; pointer-events: none;
        }
        .aus-voice-search-clear {
            position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
            background: none; border: none; color: rgba(255,255,255,.38);
            font-size: .75rem; cursor: pointer; padding: 0;
            opacity: 0; pointer-events: none; transition: opacity .2s;
        }
        .aus-voice-search-clear.visible { opacity: 1; pointer-events: auto; }
        .aus-voice-count { font-size: .72rem; color: rgba(255,255,255,.45); text-align: center; margin-top: 3px; }

        /* ── Better streaming text ── */
        .ai-stream-text { line-height: 1.7; }
        .ai-stream-text p  { margin: .45em 0; }
        .ai-stream-text ul { padding-right: 1.3em; margin: .4em 0; }
        .ai-stream-text li { margin: .25em 0; }
        .ai-stream-text h3, .ai-stream-text h4 { color: var(--primary,#00d4ff); margin: .6em 0 .3em; }
        .ai-stream-text strong { color: rgba(255,255,255,.95); }

        /* ── Smart chips ── */
        .smart-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .smart-suggestion  {
            font-size: .78rem; padding: 4px 10px;
            background: rgba(0,212,255,.09);
            border: 1px solid rgba(0,212,255,.25);
            border-radius: 14px; cursor: pointer; color: rgba(255,255,255,.8);
            transition: background .2s, border-color .2s;
        }
        .smart-suggestion:hover { background: rgba(0,212,255,.18); border-color: rgba(0,212,255,.5); color: #fff; }

        /* ── Agent trace footer on messages ── */
        .agent-trace {
            font-size: .68rem; color: rgba(0,212,255,.45);
            margin-top: 6px; cursor: pointer; user-select: none;
        }
        .agent-trace:hover { color: rgba(0,212,255,.7); }
    `;
    document.head.appendChild(s);
})();

// ── Voice search injection (runs after DOM ready) ────────────────────────────
function _ausInjectVoiceSearch() {
    const sel = document.getElementById('voiceSelect');
    if (!sel || document.getElementById('ausVoiceSearchInput')) return;

    const wrap = document.createElement('div');
    wrap.className = 'aus-voice-search-wrap';
    wrap.innerHTML =
        '<i class="fas fa-search aus-voice-search-icon"></i>' +
        '<input type="text" id="ausVoiceSearchInput" class="aus-voice-search-input"' +
        ' placeholder="ابحث عن صوت... (سعودي، أنثى، English)" autocomplete="off"' +
        ' oninput="ausVoiceSearch(this.value)">' +
        '<button class="aus-voice-search-clear" id="ausVoiceSearchClear" onclick="ausVoiceClearSearch()">✕</button>';
    sel.parentNode.insertBefore(wrap, sel);
}

// ── Voice search logic ────────────────────────────────────────────────────────
function ausVoiceSearch(q) {
    const sel      = document.getElementById('voiceSelect');
    const clearBtn = document.getElementById('ausVoiceSearchClear');
    if (!sel) return;
    if (clearBtn) clearBtn.className = 'aus-voice-search-clear' + (q ? ' visible' : '');
    const lq = (q || '').trim().toLowerCase();
    let visible = 0;

    // Arabic shorthand → English mapping for option text matching
    const arMap = [
        ['سعود', 'saudi'],['مصر','egypt'],['سوري','syrian'],['أردن','jordan'],
        ['امار','emirati'],['إمار','emirati'],['عراق','iraq'],['كويت','kuwait'],
        ['لبنان','lebanese'],['بحرين','bahrain'],
        ['أنث','female'],['انث','female'],['بنت','female'],
        ['ذكر','male'],['رجل','male'],
        ['عرب','ar-'],['انجليز','english'],['فرنس','français'],['ألمان','deutsch'],
        ['إسبان','español'],
    ];

    Array.from(sel.options).forEach(opt => {
        if (!lq || opt.value === '') { opt.style.display = ''; if (opt.value) visible++; return; }
        let text = (opt.text + ' ' + opt.value).toLowerCase();
        // translate Arabic search terms
        let searchTerm = lq;
        for (const [ar, en] of arMap) {
            if (lq.includes(ar)) { searchTerm = en; break; }
        }
        const match = text.includes(lq) || text.includes(searchTerm);
        opt.style.display = match ? '' : 'none';
        if (match) visible++;
    });

    // Hide empty optgroups
    Array.from(sel.querySelectorAll('optgroup')).forEach(g => {
        const any = Array.from(g.querySelectorAll('option')).some(o => o.style.display !== 'none');
        g.style.display = any ? '' : 'none';
    });

    // Count badge
    let badge = document.getElementById('ausVoiceCount');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'ausVoiceCount'; badge.className = 'aus-voice-count';
        sel.parentNode.insertBefore(badge, sel.nextSibling);
    }
    badge.textContent = lq ? `${visible} صوت` : '';
}
window.ausVoiceSearch = ausVoiceSearch;

function ausVoiceClearSearch() {
    const inp = document.getElementById('ausVoiceSearchInput');
    if (inp) { inp.value = ''; ausVoiceSearch(''); }
}
window.ausVoiceClearSearch = ausVoiceClearSearch;

// ── Agent status bar injection ─────────────────────────────────────────────────
function _ausInjectAgentBar() {
    if (document.getElementById('ausAgentBar')) return;
    const chatArea = document.querySelector('.chat-input-area');
    if (!chatArea) return;
    const bar = document.createElement('div');
    bar.id = 'ausAgentBar';
    bar.className = 'aus-agent-bar';
    bar.setAttribute('data-state', 'idle');
    bar.innerHTML =
        '<span id="ausAgentBarIcon">🧠</span>' +
        '<span id="ausAgentBarTool"></span>' +
        '<span class="aus-agent-phase" id="ausAgentBarPhase"></span>';
    chatArea.parentNode.insertBefore(bar, chatArea);
}

// ===========================================================================
// =========== AUSAgent — Modular Agent Object ================================
// ===========================================================================
const AUSAgent = (() => {
    'use strict';

    const _tools   = new Map();  // name → { description, handler, icon, keywords[] }
    const _plugins = new Map();  // name → plugin

    // ── JSON message helpers ─────────────────────────────────────────────────
    const _msg  = (tool, params  = {}) => ({ tool, params, ts: Date.now() });
    const _resp = (tool, result, confidence = 1.0, error = null) =>
        ({ tool, result, confidence, ts: Date.now(), error });

    // ── Status bar ───────────────────────────────────────────────────────────
    const ICONS = { claude:'🧠', knowledge:'📚', memory:'💾', analytics:'📊', voice:'🎙️', idle:'✨' };
    const PHASES = { thinking:'يعالج...', running:'يعمل...', done:'جاهز', error:'خطأ', idle:'' };

    function _setStatus(tool, phase) {
        const bar   = document.getElementById('ausAgentBar');
        const icon  = document.getElementById('ausAgentBarIcon');
        const name  = document.getElementById('ausAgentBarTool');
        const phase_ = document.getElementById('ausAgentBarPhase');
        if (!bar) return;
        bar.setAttribute('data-state', phase);
        if (icon)  icon.textContent  = ICONS[tool]  || '⚙️';
        if (name)  name.textContent  = tool;
        if (phase_) phase_.textContent = PHASES[phase] || phase;
    }
    function _clearStatus() { _setStatus('idle', 'idle'); }

    // ── Tool registration ────────────────────────────────────────────────────
    function registerTool(name, cfg) {
        _tools.set(name, { name, icon: '⚙️', keywords: [], ...cfg });
        console.info(`[AUSAgent] ✓ tool: ${name}`);
    }

    // ── Plugin registration ──────────────────────────────────────────────────
    function registerPlugin(name, plugin) {
        if (typeof plugin.install !== 'function') {
            return console.error(`[AUSAgent] plugin "${name}" must have install()`);
        }
        _plugins.set(name, plugin);
        plugin.install({ registerTool, agent: pub });
        console.info(`[AUSAgent] ✓ plugin: ${name}`);
    }

    // ── Invoke a specific tool ───────────────────────────────────────────────
    async function invokeTool(name, params = {}) {
        const tool = _tools.get(name);
        if (!tool) return _resp(name, null, 0, `Unknown tool: ${name}`);
        try {
            _setStatus(name, 'running');
            const result = await tool.handler(params);
            return _resp(name, result);
        } catch (e) {
            console.error(`[AUSAgent] ${name}:`, e);
            return _resp(name, null, 0, e.message);
        }
    }

    // ── Route message → best tool ────────────────────────────────────────────
    async function route(msg) {
        const lc = msg.toLowerCase();
        for (const [name, tool] of _tools) {
            if (name === 'claude') continue;
            if ((tool.keywords || []).some(kw => lc.includes(kw.toLowerCase()))) {
                return { tool: name, confidence: 0.8 };
            }
        }
        return { tool: 'claude', confidence: 1.0 };
    }

    // ── Main entry: handle one full chat turn ────────────────────────────────
    async function chat(message, typingId, chatMessages) {
        _setStatus('claude', 'thinking');
        const { tool } = await route(message);
        const resp = await invokeTool(tool, { message, typingId, chatMessages });
        // If non-claude tool errored, fall back to claude
        if (resp.error && tool !== 'claude') {
            await invokeTool('claude', { message, typingId, chatMessages });
        }
        _clearStatus();
    }

    // ── Smart suggestion chips (expanded, randomized) ─────────────────────────
    // ── Contextual chips — reads last message + response to pick relevant suggestions ──
    function _chips(userMsg, aiReply) {
        const lang  = (document.documentElement.lang || 'ar').slice(0,2);
        const text  = ((userMsg || '') + ' ' + (aiReply || '')).toLowerCase();

        // Topic detection → mapped to contextual follow-ups
        const TOPIC_MAP_AR = {
            // Strategy
            strategy:    ['استراتيجية','swot','porter','blue ocean','تنافسية','ميزة','قرار'],
            strategy_q:  ['طبّق SWOT على شركتي','مثال Porter\'s 5 Forces خليجي','كيف أبني ميزة تنافسية؟','ما أفضل استراتيجية لشركة ناشئة؟'],

            // Marketing
            marketing:   ['تسويق','brand','علامة','حملة','عميل','stp','4p','سوق','مستهلك'],
            marketing_q: ['مثال حملة تسويقية ناجحة في الخليج','كيف أبني هوية برند قوية؟','خطوات دراسة السوق المستهدف','أثر التسويق الرقمي على B2B'],

            // Finance
            finance:     ['مالية','dcf','تقييم','استثمار','ربح','خسارة','نمو','راس مال','ipo','تمويل'],
            finance_q:   ['كيف أحسب DCF بشكل مبسط؟','مقاييس التقييم الأهم للمستثمر','الفرق بين VC و PE','كيف أقرأ القوائم المالية؟'],

            // HR
            hr:          ['موارد بشرية','hr','موظف','فريق','توظيف','أداء','okr','ثقافة','قيادة'],
            hr_q:        ['كيف أبني ثقافة شركة قوية؟','أفضل طرق تقييم الأداء','استراتيجية الاحتفاظ بالمواهب','OKRs — كيف تطبّق؟'],

            // Entrepreneurship
            startup:     ['ريادة','startup','فكرة','مشروع','نموذج أعمال','canvas','mvp','مستثمر'],
            startup_q:   ['كيف أختبر فكرتي قبل الإطلاق؟','ما أكثر الأخطاء الشائعة للمؤسسين؟','كيف أبني Business Model Canvas؟','كيف أقنع مستثمر؟'],

            // Career
            career:      ['وظيفة','career','تخصص','مستقبل','سوق عمل','راتب','مهنة','خبرة'],
            career_q:    ['ما أكثر التخصصات طلباً في الخليج؟','كيف أبني CV احترافي؟','ما مهارات المستقبل التي أطورها الآن؟','نصيحة لمقابلة عمل ناجحة'],

            // Leadership
            leadership:  ['قيادة','leader','مدير','فريق','تأثير','تحفيز','تواصل','شخصية'],
            leadership_q:['ما أسلوب قيادتي؟ كيف أعرف؟','كيف أتعامل مع موظف صعب؟','الفرق بين القائد والمدير','كيف أبني حضوراً تنفيذياً؟'],

            // Digital / AI
            digital:     ['رقمي','ذكاء اصطناعي','ai','digital','تحول','تقنية','data','بيانات','cloud'],
            digital_q:   ['كيف تؤثر AI على تخصصي؟','خطوات التحول الرقمي للشركات الصغيرة','مهارات AI التي يحتاجها كل موظف','أمثلة AI في شركات الخليج'],

            // Simulation / Case
            simulation:  ['محاكاة','simulate','افترض','case','سيناريو','قرار','أزمة','شركة'],
            simulation_q:['ابدأ محاكاة: أنا CEO شركة ناشئة','أعطني case study حقيقي','تحليل قرار استراتيجي','أزمة شركة + كيف تحلّها؟'],
        };

        const TOPIC_MAP_EN = {
            strategy:    ['strategy','porter','swot','competitive','advantage','decision'],
            strategy_q:  ['Apply Porter\'s 5 Forces to a real case','How to build a competitive moat?','SWOT for a startup in 2025','Best strategy frameworks for growth'],

            marketing:   ['marketing','brand','campaign','customer','stp','funnel','digital'],
            marketing_q: ['Best B2B marketing tactic right now?','How to build a strong brand identity?','Steps to conduct market research','Growth hacking examples that worked'],

            finance:     ['finance','dcf','valuation','investment','revenue','ipo','funding','capital'],
            finance_q:   ['How to do a simple DCF valuation?','Key metrics every investor checks','Difference between VC and PE?','How to read a P&L statement?'],

            career:      ['career','job','major','salary','future','skill','market','hire'],
            career_q:    ['Most in-demand business majors?','How to build a strong CV?','Skills to develop for the future?','How to ace a job interview?'],

            leadership:  ['leadership','leader','manager','team','influence','motivate'],
            leadership_q:['What\'s my leadership style?','How to handle a difficult employee?','Leader vs Manager — real difference?','Building executive presence?'],

            startup:     ['startup','idea','business model','mvp','investor','canvas'],
            startup_q:   ['How to validate my business idea?','Most common founder mistakes?','Build a business model canvas?','How to pitch to investors?'],

            digital:     ['ai','digital','technology','data','cloud','transformation'],
            digital_q:   ['How will AI affect my field?','Steps to digital transformation?','AI skills every professional needs?','Best AI use cases in business?'],
        };

        const topicMap = lang === 'ar' ? TOPIC_MAP_AR : TOPIC_MAP_EN;

        // Score each topic by keyword hits
        const scores = {};
        Object.keys(topicMap).filter(k => !k.endsWith('_q')).forEach(topic => {
            const hits = topicMap[topic].filter(kw => text.includes(kw)).length;
            if (hits > 0) scores[topic] = hits;
        });

        // Find best matching topic
        const best = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];

        if (best) {
            const qKey = best[0] + '_q';
            const pool = topicMap[qKey] || [];
            return pool.slice(0, 4);
        }

        // Fallback — general discovery chips
        return lang === 'ar'
            ? ['أي تخصص أنسب لي؟','ابدأ محاكاة أعمال','أهم مهارات 2025','مثال شركة ناجحة']
            : ['Which major suits me?','Start a business simulation','Top skills for 2025','Show me a success story'];
    }

    // ── Build finalized message HTML (text + refs + actions + chips) ──────────
    function buildActions(html, message, aiReply) {
        const chips = _chips(message, aiReply);
        const chipsHtml = chips.map(s =>
            `<span class="smart-suggestion" onclick="askQuestion('${s.replace(/'/g,"\\'")}')"> ${s}</span>`
        ).join('');
        const safe = (message || '').replace(/'/g, "\\'").slice(0, 180);
        return html +
            `<div class="ai-actions">
                <button class="ai-action-btn" onclick="copyAiText(this)" title="نسخ"><i class="fas fa-copy"></i></button>
                <button class="ai-action-btn" onclick="speakAiText(this)" title="استمع"><i class="fas fa-volume-up"></i></button>
                <button class="ai-action-btn" onclick="regenAiText('${safe}',this)" title="إعادة"><i class="fas fa-redo"></i></button>
                <button class="ai-action-btn" onclick="thumbsAi(this,'+')" title="مفيد"><i class="fas fa-thumbs-up"></i></button>
                <button class="ai-action-btn" onclick="thumbsAi(this,'-')" title="غير مناسب"><i class="fas fa-thumbs-down"></i></button>
            </div>` +
            (chips.length ? `<div class="smart-suggestions">${chipsHtml}</div>` : '');
    }

    const pub = { registerTool, registerPlugin, invokeTool, route, chat, buildActions };
    return pub;
})();

// ── Built-in Tool: Claude Streaming (PRIMARY — uses real Claude API) ──────────
AUSAgent.registerTool('claude', {
    description: 'Claude AI via streaming SSE — primary intelligence',
    icon: '🧠',
    keywords: [], // default fallback, no keywords needed

    async handler({ message, typingId, chatMessages }) {
        const target = document.getElementById(typingId);
        if (!target) return null;

        const apiBase = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
        const hist    = (typeof chatHistory !== 'undefined') ? chatHistory.slice(-20) : [];
        const lang    = document.documentElement.lang || 'ar';

        let fullText = '';
        let usedApi  = false;

        // ── Try Claude streaming ──
        try {
            const res = await fetch(`${apiBase}/api/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: hist,
                    language: lang === 'en' ? 'en' : 'ar'
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            usedApi = true;

            // Streaming container
            target.innerHTML = '<div class="ai-stream-text"></div>';
            const textEl = target.querySelector('.ai-stream-text');

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let   buf     = '';

            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        if (d.type === 'text') {
                            fullText += d.text;
                            textEl.innerHTML = typeof formatAIResponse === 'function'
                                ? formatAIResponse(fullText) : fullText;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        } else if (d.type === 'error') {
                            throw new Error(d.error);
                        }
                    } catch (pe) {
                        if (!pe.message?.includes('JSON')) throw pe;
                    }
                }
            }

        } catch (err) {
            console.warn('[AUSAgent.claude] streaming failed → local KB fallback:', err.message);
            usedApi = false;
        }

        // ── Fallback: local knowledge base ──
        if (!usedApi) {
            const local = typeof generateAIResponse === 'function'
                ? generateAIResponse(message)
                : { text: '<p>⚠️ تعذّر الاتصال بـ CEO AI. تأكد من تشغيل الخادم على المنفذ 8002.</p>', references: ['Local KB'] };
            fullText = local.text;
            target.innerHTML = `<div class="ai-stream-text">${fullText}</div>`;
        }

        // ── Persist to chat histories ──
        if (typeof chatHistory !== 'undefined') {
            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'assistant', content: fullText });
            if (chatHistory.length > 40) chatHistory.splice(0, chatHistory.length - 40);
        }
        if (typeof chatMemory !== 'undefined' && typeof saveChatMemory === 'function') {
            chatMemory.push({ role: 'user', content: message, lang, at: Date.now() });
            chatMemory.push({ role: 'assistant', content: fullText, lang, at: Date.now() });
            if (chatMemory.length > 40) chatMemory.splice(0, chatMemory.length - 40);
            try { saveChatMemory(); } catch {}
        }

        // ── Finalize bubble: streaming text + actions + chips ──
        const formatted = typeof formatAIResponse === 'function'
            ? formatAIResponse(fullText) : fullText;
        target.innerHTML = AUSAgent.buildActions(
            `<div class="ai-stream-text">${formatted}</div>` +
            (!usedApi ? '<div class="agent-trace">⚡ محلي · Knowledge Base</div>'
                      : '<div class="agent-trace">⚡ Claude · Streaming</div>'),
            message,
            fullText   // ← pass AI reply for contextual chip generation
        );
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // ── Speak the reply ──
        if (typeof speak === 'function') {
            const voiceOn = typeof prefs === 'undefined' || prefs?.voice !== false;
            if (voiceOn) {
                const tmp = document.createElement('div');
                tmp.innerHTML = fullText;
                const plain = (tmp.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 600);
                if (plain) speak(plain);
            }
        }

        return fullText;
    }
});

// ── Built-in Tool: Knowledge Search (routes to Claude with KB context) ─────────
AUSAgent.registerTool('knowledge', {
    description: 'Search local tool knowledge base',
    icon: '📚',
    keywords: ['بحث عن أداة', 'ما هي أدوات', 'اشرح أداة', 'search tool', 'list tools', 'كل الأدوات'],
    async handler(params) {
        // Enhances Claude's answer with KB context
        return AUSAgent.invokeTool('claude', params);
    }
});

// ── Built-in Tool: Memory (past conversation recall) ─────────────────────────
AUSAgent.registerTool('memory', {
    description: 'Recall past conversation context',
    icon: '💾',
    keywords: ['تذكر ما قلته', 'ماذا قلت قبل', 'earlier you said', 'remember what'],
    async handler(params) {
        return AUSAgent.invokeTool('claude', params);
    }
});

// ===========================================================================
// ====== FINAL sendMessage — Agent-powered, always uses Claude first =========
// ===========================================================================
sendMessage = function() {
    const input = document.getElementById('chatInput');
    const msg   = (input?.value || '').trim();
    if (!msg) return;

    const chat = document.getElementById('chatMessages');
    if (!chat) return;

    // HTML escape
    const esc = s => String(s).replace(/[&<>"']/g,
        c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));

    // ── User bubble ──
    chat.insertAdjacentHTML('beforeend', `<div class="message user">${esc(msg)}</div>`);
    input.value = '';
    chat.scrollTop = chat.scrollHeight;
    if (typeof sfxPlay === 'function') sfxPlay('click');

    // ── AI typing indicator ──
    const tid = 'ag' + Date.now();
    chat.insertAdjacentHTML('beforeend', `
        <div class="message ai" id="${tid}-host">
            <div class="ai-meta">
                <span class="ai-avatar">🧠</span>
                <span>CEO · AI</span>
                <span class="agent-badge">Agent</span>
            </div>
            <div id="${tid}">
                <div class="ai-typing-dots"><span></span><span></span><span></span></div>
            </div>
        </div>`);
    chat.scrollTop = chat.scrollHeight;

    // ── Delegate to AUSAgent ──
    AUSAgent.chat(msg, tid, chat);
};

// ── Boot: inject UI components after DOM is ready ────────────────────────────
(function _ausBootUi() {
    function _run() {
        try { _ausInjectVoiceSearch(); }  catch(e) { console.warn('[AUSAgent] voiceSearch:', e); }
        try { _ausInjectAgentBar(); }     catch(e) { console.warn('[AUSAgent] agentBar:', e); }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { _run(); setTimeout(_run, 900); setTimeout(_run, 2200); });
    } else {
        _run();
        setTimeout(_run, 900);
        setTimeout(_run, 2200);
    }
})();

// ===========================================================================
// ════ AUSVoice Panel v1.0 — Voice Settings UI · Waveform · PTT Mic ═════════
// ===========================================================================
// Injects the collapsible voice-settings bar under the chat input, adds the
// animated 8-bar waveform to the chat header, wires PTT hold on the mic
// button, and drives the waveform on/off by patching showSpeakingUI /
// hideSpeakingUI. All CSS tokens were pre-added to index.html.
// ===========================================================================
(function AUSVoicePanelIIFE() {
    'use strict';

    // ── Accent definitions ──────────────────────────────────────────────────
    const ACCENTS = [
        { id: 'SA', label: '🇸🇦 SA' },
        { id: 'AE', label: '🇦🇪 AE' },
        { id: 'EG', label: '🇪🇬 EG' },
        { id: 'SY', label: '🇸🇾 SY' },
        { id: 'JO', label: '🇯🇴 JO' },
        { id: 'IQ', label: '🇮🇶 IQ' },
        { id: 'US', label: '🇺🇸 US' },
        { id: 'GB', label: '🇬🇧 UK' },
    ];

    // ── Build voice panel HTML ──────────────────────────────────────────────
    function buildPanelHTML() {
        const p        = (typeof prefs !== 'undefined') ? prefs : {};
        const gender   = p.voiceGender  || 'female';
        const country  = p.voiceCountry || 'SA';
        const speed    = p.voiceSpeed   || 1.0;

        const gBtns = `
            <button class="aus-gender-btn${gender==='female'?' active':''}"
                    onclick="window.AUSVoice.setGender('female')">♀ أنثى</button>
            <button class="aus-gender-btn${gender==='male'?' active':''}"
                    onclick="window.AUSVoice.setGender('male')">♂ ذكر</button>`;

        const pills = ACCENTS.map(a =>
            `<button class="aus-accent-pill${a.id===country?' active':''}"
                     onclick="window.AUSVoice.setCountry('${a.id}')">${a.label}</button>`
        ).join('');

        return `<div id="ausVoicePanel">
            ${gBtns}
            <div class="aus-v-divider"></div>
            <div class="aus-accents-row">${pills}</div>
            <div class="aus-v-divider"></div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <span style="font-size:0.72rem;color:rgba(255,255,255,0.45);">⚡</span>
                <input type="range" class="aus-speed-slider" id="ausSpeedSlider"
                       min="0.75" max="1.5" step="0.25" value="${speed.toFixed(2)}"
                       oninput="window.AUSVoice.setSpeed(this.value)">
                <span class="aus-speed-label" id="ausSpeedLabel">${speed.toFixed(2)}x</span>
            </div>
            <button class="aus-stop-btn" id="ausStopBtn"
                    onclick="window.AUSVoice.stop()" title="إيقاف الصوت">
                <i class="fas fa-stop"></i>
            </button>
        </div>`;
    }

    // ── Waveform HTML (injected into chat header) ───────────────────────────
    const WAVE_HTML = `<div class="aus-speaking-wave" id="ausSpeakingWave">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
    </div>`;

    // ── Toggle button HTML (injected into chat header) ──────────────────────
    const TOGGLE_HTML = `<button id="ausVoiceToggle"
        class="ai-action-btn" title="إعدادات الصوت"
        onclick="window.AUSVoice.togglePanel()"
        style="margin-inline-start:auto;padding:5px 10px;font-size:0.8rem;
               border-radius:20px;white-space:nowrap;">
        <i class="fas fa-sliders-h"></i> صوت
    </button>`;

    // ── Main injection ──────────────────────────────────────────────────────
    function inject() {
        // 1 ▸ Voice panel below the chat input area
        const inputArea = document.querySelector('.chat-input-area');
        if (inputArea && !document.getElementById('ausVoicePanel')) {
            inputArea.insertAdjacentHTML('afterend', buildPanelHTML());
        }

        // 2 ▸ Waveform + toggle button in the chat header
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            if (!document.getElementById('ausSpeakingWave')) {
                chatHeader.insertAdjacentHTML('beforeend', WAVE_HTML);
            }
            if (!document.getElementById('ausVoiceToggle')) {
                chatHeader.insertAdjacentHTML('beforeend', TOGGLE_HTML);
            }
        }

        // 3 ▸ Wire PTT hold on mic button
        _wireMicPTT();

        // 4 ▸ Patch speaking-UI helpers to drive waveform + stop button
        _patchSpeakingUI();
    }

    // ── PTT: short-tap = toggle, hold (280 ms) = push-to-talk ──────────────
    function _wireMicPTT() {
        const btn = document.getElementById('micBtn');
        if (!btn || btn._ausPTTWired) return;
        btn._ausPTTWired = true;

        let holdTimer = null;
        let pttActive = false;

        btn.addEventListener('pointerdown', () => {
            pttActive = false;
            holdTimer = setTimeout(() => {
                pttActive = true;
                btn.classList.add('ptt-listening');
                const r = (typeof ensureRecog === 'function') ? ensureRecog() : null;
                if (r) try { r.start(); } catch (_) {}
            }, 280);
        });

        const releasePTT = () => {
            clearTimeout(holdTimer);
            if (pttActive) {
                pttActive = false;
                btn.classList.remove('ptt-listening');
                try { if (typeof recog !== 'undefined' && recog) recog.stop(); } catch (_) {}
            }
        };

        btn.addEventListener('pointerup',    releasePTT);
        btn.addEventListener('pointerleave', releasePTT);
        btn.addEventListener('pointercancel',releasePTT);
    }

    // ── Patch showSpeakingUI / hideSpeakingUI to drive waveform ────────────
    function _patchSpeakingUI() {
        // Guard: patch only once
        if (window._ausSpeakingPatched) return;
        window._ausSpeakingPatched = true;

        const _origShow = window.showSpeakingUI;
        const _origHide = window.hideSpeakingUI;

        window.showSpeakingUI = function(target) {
            const wave = document.getElementById('ausSpeakingWave');
            const stop = document.getElementById('ausStopBtn');
            if (wave) wave.classList.add('active');
            if (stop) stop.classList.add('visible');
            if (typeof _origShow === 'function') _origShow(target);
        };

        window.hideSpeakingUI = function() {
            const wave = document.getElementById('ausSpeakingWave');
            const stop = document.getElementById('ausStopBtn');
            if (wave) wave.classList.remove('active');
            if (stop) stop.classList.remove('visible');
            if (typeof _origHide === 'function') _origHide();
        };
    }

    // ── Public API exposed as window.AUSVoice ───────────────────────────────
    window.AUSVoice = {

        togglePanel() {
            const panel  = document.getElementById('ausVoicePanel');
            const toggle = document.getElementById('ausVoiceToggle');
            if (!panel) return;
            const isOpen = panel.classList.toggle('open');
            if (toggle) toggle.classList.toggle('open', isOpen);
            if (typeof sfxPlay === 'function') sfxPlay('click');
        },

        setGender(g) {
            if (typeof setVoiceGender === 'function') setVoiceGender(g);
            document.querySelectorAll('.aus-gender-btn').forEach(b => {
                b.classList.toggle('active', b.textContent.includes(g === 'female' ? '♀' : '♂'));
            });
        },

        setCountry(c) {
            if (typeof setVoiceCountry === 'function') setVoiceCountry(c);
            else {
                // Minimal fallback if setVoiceCountry is not available yet
                if (typeof prefs !== 'undefined') { prefs.voiceCountry = c; }
            }
            document.querySelectorAll('.aus-accent-pill').forEach(b => {
                const match = (b.getAttribute('onclick') || '').includes(`'${c}'`);
                b.classList.toggle('active', match);
            });
            if (typeof sfxPlay === 'function') sfxPlay('click');
        },

        setSpeed(v) {
            const s = parseFloat(v) || 1.0;
            const clamped = Math.max(0.75, Math.min(1.5, s));
            if (typeof setVoiceSpeed === 'function') setVoiceSpeed(clamped);
            else if (typeof prefs !== 'undefined') prefs.voiceSpeed = clamped;
            const lbl = document.getElementById('ausSpeedLabel');
            if (lbl) lbl.textContent = clamped.toFixed(2) + 'x';
            const sld = document.getElementById('ausSpeedSlider');
            if (sld) sld.value = clamped.toFixed(2);
        },

        stop() {
            if (typeof stopSpeaking === 'function') stopSpeaking();
            else {
                if (typeof hideSpeakingUI === 'function') hideSpeakingUI();
                try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
            }
            if (typeof sfxPlay === 'function') sfxPlay('click');
        },

        // Convenience: speak text through the full pipeline (backend → browser)
        speak(text) {
            if (typeof speak === 'function') speak(text);
        },
    };

    // ── Self-boot: retry until the chat DOM is ready ────────────────────────
    function _tryInject() {
        if (document.querySelector('.chat-input-area')) {
            inject();
        } else {
            setTimeout(_tryInject, 400);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(_tryInject, 800));
    } else {
        setTimeout(_tryInject, 800);
    }
    // Also retry a second time to catch late DOM initialization
    setTimeout(() => { if (!document.getElementById('ausVoicePanel')) inject(); }, 2400);

})();

// ===========================================================================
// ════ IMMERSIVE FX v3 — Scroll Reveal · Plasma Drag · Proximity Glow ════════
// ════ Border Beam · Ghost Cursor · AI Streaming Shimmer ══════════════════════
// ===========================================================================
// Additive layer — does NOT modify any existing FX system.
// All CSS tokens pre-added to index.html.
// ===========================================================================
(function IMMERSIVE_FX_v3() {
    'use strict';

    const P = () => (typeof prefs !== 'undefined') ? prefs : { fx: true, reduceMotion: false };

    // ── Shared mouse state (lightweight, not competing with SPACE_FX.mouse) ──
    const _m = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false };
    window.addEventListener('pointermove', e => { _m.x = e.clientX; _m.y = e.clientY; }, { passive: true });
    window.addEventListener('pointerdown', () => { _m.down = true;  }, { passive: true });
    window.addEventListener('pointerup',   () => { _m.down = false; }, { passive: true });
    window.addEventListener('pointercancel', () => { _m.down = false; }, { passive: true });

    // ── 1. SCROLL REVEAL ────────────────────────────────────────────────────
    // Animates cards/tiles into view as they enter the viewport.
    // Only tags elements BELOW the fold on init → zero invisible-flash risk.
    function initScrollReveal() {
        const TARGETS = [
            '.card', '.tool-item', '.scenario-card', '.certificate-card',
            '.action-card', '.kpi-tile', '.premium-file', '.pay-method',
        ].join(', ');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                // Stagger siblings for a cascade effect (max 350ms)
                const siblings = entry.target.parentElement
                    ? [...entry.target.parentElement.children] : [];
                const idx = siblings.indexOf(entry.target);
                const delay = Math.min(idx * 55, 350);
                entry.target.style.animationDelay = delay + 'ms';
                entry.target.classList.add('scroll-revealed');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.06, rootMargin: '0px 0px -32px 0px' });

        function tagAndObserve() {
            document.querySelectorAll(TARGETS).forEach(el => {
                if (el._revObserved || el.classList.contains('scroll-revealed')) return;
                const r = el.getBoundingClientRect();
                // Only tag elements currently below the visible viewport
                if (r.top > window.innerHeight * 0.9) {
                    el._revObserved = true;
                    observer.observe(el);
                }
            });
        }

        // Initial pass after first render
        setTimeout(tagAndObserve, 900);

        // Re-scan on navigation (tab switches trigger content mount)
        const mo = new MutationObserver(tagAndObserve);
        const root = document.getElementById('main-app') || document.body;
        mo.observe(root, { childList: true, subtree: true });
    }

    // ── 2. PLASMA DRAG FIELD ────────────────────────────────────────────────
    // Hold mouse button + drag → spawns teal plasma cloud particles.
    const _plasmaPool = [];
    const PLASMA_MAX  = 30;
    let   _lastPlasma = 0;

    function _spawnPlasma(x, y) {
        if (_plasmaPool.length >= PLASMA_MAX) return;
        const size = 10 + Math.random() * 16;
        const el = document.createElement('div');
        el.className = 'plasma-drag';
        el.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px;`;
        document.body.appendChild(el);
        _plasmaPool.push({
            el, x, y,
            vx: (Math.random() - 0.5) * 2.8,
            vy: (Math.random() - 0.5) * 2.8 - 0.6,
            life: 1,
            decay: 0.007 + Math.random() * 0.01,
        });
    }

    function _updatePlasma() {
        for (let i = _plasmaPool.length - 1; i >= 0; i--) {
            const p = _plasmaPool[i];
            p.x  += p.vx;
            p.y  += p.vy;
            p.vx *= 0.975;
            p.vy *= 0.975;
            p.life -= p.decay;
            if (p.life <= 0) {
                p.el.remove();
                _plasmaPool.splice(i, 1);
            } else {
                const tx = p.x - parseFloat(p.el.style.left);
                const ty = p.y - parseFloat(p.el.style.top);
                const s  = (0.4 + p.life * 0.6).toFixed(3);
                p.el.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${s})`;
                p.el.style.opacity   = p.life.toFixed(3);
            }
        }
    }

    function initPlasmaDrag() {
        window.addEventListener('pointermove', (e) => {
            if (!_m.down || !P().fx || P().reduceMotion) return;
            const now = performance.now();
            if (now - _lastPlasma < 22) return;
            _lastPlasma = now;
            _spawnPlasma(e.clientX, e.clientY);
        }, { passive: true });

        (function _loop() { _updatePlasma(); requestAnimationFrame(_loop); })();
    }

    // ── 3. PROXIMITY GLOW + ROTATING BORDER BEAM ────────────────────────────
    // Cards glow based on mouse proximity. On hover, a conic-gradient beam
    // rotates around the border (pure CSS via injected div + animation).
    function initProximityGlow() {
        const TARGETS = '.card, .tool-item, .kpi-tile, .scenario-card, .certificate-card, .action-card';
        const RADIUS  = 260;  // px — glow fades out beyond this

        function tagEl(el) {
            if (el._proxTagged) return;
            el._proxTagged = true;
            el.classList.add('prox-glow');
            // Ensure relative positioning for the border-beam overlay
            const pos = window.getComputedStyle(el).position;
            if (pos === 'static') el.style.position = 'relative';
            // Inject beam overlay once
            if (!el.querySelector('.border-beam-el')) {
                const beam = document.createElement('div');
                beam.className = 'border-beam-el';
                el.appendChild(beam);
            }
        }

        function tagAll() {
            document.querySelectorAll(TARGETS).forEach(tagEl);
        }
        tagAll();

        // Watch for dynamically added elements (tool grids, scenario cards)
        const mo = new MutationObserver(tagAll);
        mo.observe(document.body, { childList: true, subtree: true });

        // rAF loop to update --prox-intensity per card
        (function _proxTick() {
            if (P().fx && !P().reduceMotion) {
                document.querySelectorAll('.prox-glow').forEach(el => {
                    if (!el.isConnected) return;
                    const r    = el.getBoundingClientRect();
                    const cx   = r.left + r.width  / 2;
                    const cy   = r.top  + r.height / 2;
                    const dist = Math.hypot(_m.x - cx, _m.y - cy);
                    const I    = Math.max(0, 1 - dist / RADIUS);
                    el.style.setProperty('--prox-intensity', I.toFixed(3));
                    // Dynamic glow shadow driven by intensity
                    if (I > 0.02) {
                        el.style.boxShadow =
                            `0 0 0 1px rgba(0,212,255,${(I * 0.35).toFixed(3)}),` +
                            `0 0 ${Math.round(I * 36)}px rgba(0,212,255,${(I * 0.12).toFixed(3)}),` +
                            `0 0 ${Math.round(I * 72)}px rgba(157,78,221,${(I * 0.06).toFixed(3)})`;
                    } else {
                        el.style.boxShadow = '';
                    }
                });
            }
            requestAnimationFrame(_proxTick);
        })();
    }

    // ── 4. AI STREAMING SHIMMER ─────────────────────────────────────────────
    // Watches the chat for active typing indicators and toggles .streaming
    // on the parent bubble — the CSS animation creates a data-stream sweep.
    function initStreamingShimmer() {
        const chat = document.getElementById('chatMessages');
        if (!chat) return;

        const obs = new MutationObserver(() => {
            chat.querySelectorAll('.message.ai').forEach(msg => {
                const isTyping = !!msg.querySelector('.ai-typing-dots');
                msg.classList.toggle('streaming', isTyping);
            });
        });
        obs.observe(chat, { childList: true, subtree: true });
    }

    // ── 5. GHOST CURSOR RING ────────────────────────────────────────────────
    // A second cursor ring that smoothly lags 100ms behind the real cursor,
    // creating a parallax "afterimage" depth effect.
    function initGhostCursor() {
        const ghost = document.getElementById('aus-ghost-cursor');
        if (!ghost) return;

        let gx = _m.x, gy = _m.y;
        const LERP = 0.10;

        // Expand ring when hovering interactive elements
        const HOT = 'button, a, .card, .tool-item, .nav-tab, .send-btn, .mic-btn, input';
        document.body.addEventListener('pointerover', e => {
            if (e.target.closest(HOT)) ghost.classList.add('hover-active');
        }, { passive: true });
        document.body.addEventListener('pointerout', e => {
            if (!e.relatedTarget || !e.relatedTarget.closest(HOT)) {
                ghost.classList.remove('hover-active');
            }
        }, { passive: true });

        (function _ghostTick() {
            if (!P().fx || P().reduceMotion) {
                requestAnimationFrame(_ghostTick);
                return;
            }
            gx += (_m.x - gx) * LERP;
            gy += (_m.y - gy) * LERP;
            ghost.style.left = gx.toFixed(1) + 'px';
            ghost.style.top  = gy.toFixed(1) + 'px';
            requestAnimationFrame(_ghostTick);
        })();
    }

    // ── BOOT ────────────────────────────────────────────────────────────────
    function _boot() {
        try { initGhostCursor(); }       catch (e) { console.warn('[FX v3] ghost', e); }
        if (P().reduceMotion) return;
        try { initScrollReveal(); }      catch (e) { console.warn('[FX v3] scroll', e); }
        try { initPlasmaDrag(); }        catch (e) { console.warn('[FX v3] plasma', e); }
        try { initProximityGlow(); }     catch (e) { console.warn('[FX v3] prox', e); }
        try { initStreamingShimmer(); }  catch (e) { console.warn('[FX v3] stream', e); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(_boot, 500));
    } else {
        setTimeout(_boot, 500);
    }
})();

