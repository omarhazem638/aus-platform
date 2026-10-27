// ===========================================================================
// ============== NEON FINANCIAL CITY + FX LAYER (AUS upgrade) ===============
// ===========================================================================

// --- Persisted preferences ---
const PREF_KEY = 'aus.prefs';
const DEFAULT_PREFS = { lang: 'ar', accent: 'cyan', zoom: 1, sound: true, voice: false, fx: true, reduceMotion: false, theme: 'dark', animIntensity: 1.0, highContrast: false, fontSize: 1 };
function loadPrefs() {
    try { return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); }
    catch { return { ...DEFAULT_PREFS }; }
}
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} }
let prefs = loadPrefs();
// FX master switch (aus_45_fx_mode.js): the <head> boot script already read the saved choice (localStorage 'aus_fx_enabled');
// keep the legacy prefs.fx flag — which every older effect loop reads — in step with it.
if (typeof window.__AUS_FX_ON === 'boolean') prefs.fx = window.__AUS_FX_ON;

// --- Accent palette ---
const ACCENT_PALETTE = {
    cyan:    { primary: '#00d4ff', dark: '#0084ff', glow: 'rgba(0,212,255,0.45)', cursor: 'rgba(0,212,255,0.22)' },
    gold:    { primary: '#ffd700', dark: '#c9a84c', glow: 'rgba(255,215,0,0.45)', cursor: 'rgba(255,215,0,0.22)' },
    violet:  { primary: '#c77dff', dark: '#9d4edd', glow: 'rgba(199,125,255,0.45)', cursor: 'rgba(199,125,255,0.22)' },
    emerald: { primary: '#34d399', dark: '#10b981', glow: 'rgba(52,211,153,0.45)', cursor: 'rgba(52,211,153,0.22)' },
    rose:    { primary: '#fb7185', dark: '#ec4899', glow: 'rgba(251,113,133,0.45)', cursor: 'rgba(251,113,133,0.22)' }
};
function applyAccent(code) {
    const p = ACCENT_PALETTE[code] || ACCENT_PALETTE.cyan;
    const root = document.documentElement;
    root.style.setProperty('--primary', p.primary);
    root.style.setProperty('--primary-dark', p.dark);
    root.style.setProperty('--cursor-color', p.cursor);
    document.querySelectorAll('.accent-dot').forEach(d => d.classList.toggle('active', d.dataset.accent === code));
}
function applyZoom(z) {
    document.documentElement.style.fontSize = (16 * z * (prefs.fontSize || 1)) + 'px';
    document.querySelectorAll('.seg-btn[data-zoom]').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.zoom) === z));
}

// --- Language (AR + EN + DE + FR + ES + TR + JA + ZH + KO + RU + IT) ---
const I18N = {
    ar: { dir: 'rtl', settings: 'الإعدادات', exported: 'تم التصدير', cleared: 'تم المسح', voiceOn: 'الصوت مفعّل', voiceOff: 'الصوت معطّل', businessBadge: 'NEON FINANCIAL CITY', kpiRevenue: 'الإيرادات', kpiGrowth: 'النمو', kpiTeam: 'الفريق', kpiDecisions: 'القرارات الذكية', insights: 'رؤى AI الاستراتيجية', insightText: 'تركيزك على التفكير الاستراتيجي وتحليل SWOT يعطيك ميزة تنافسية. الخطوة التالية: ابدأ تحدي إدارة الأزمات لتطوّر قراراتك تحت الضغط.', enterBusiness: 'دخلت Neon Financial City' },
    en: { dir: 'ltr', settings: 'Settings', exported: 'Exported', cleared: 'Cleared', voiceOn: 'Voice on', voiceOff: 'Voice off', businessBadge: 'NEON FINANCIAL CITY', kpiRevenue: 'Revenue', kpiGrowth: 'Growth', kpiTeam: 'Team', kpiDecisions: 'Smart decisions', insights: 'AI strategic insight', insightText: 'Your strong strategic thinking and SWOT analysis pattern give you an edge. Next: try the crisis management challenge to refine decisions under pressure.', enterBusiness: 'Entered Neon Financial City' },
    de: { dir: 'ltr', settings: 'Einstellungen', exported: 'Exportiert', cleared: 'Gelöscht', voiceOn: 'Stimme an', voiceOff: 'Stimme aus', businessBadge: 'NEON-FINANZSTADT', kpiRevenue: 'Umsatz', kpiGrowth: 'Wachstum', kpiTeam: 'Team', kpiDecisions: 'Kluge Entscheidungen', insights: 'KI-Strategieeinblick', insightText: 'Dein starkes strategisches Denken und SWOT-Muster geben dir einen Vorsprung. Nächster Schritt: Krisenmanagement-Challenge.', enterBusiness: 'Du betrittst die Neon-Finanzstadt' },
    fr: { dir: 'ltr', settings: 'Paramètres', exported: 'Exporté', cleared: 'Effacé', voiceOn: 'Voix activée', voiceOff: 'Voix désactivée', businessBadge: 'CITÉ FINANCIÈRE NÉON', kpiRevenue: 'Revenus', kpiGrowth: 'Croissance', kpiTeam: 'Équipe', kpiDecisions: 'Décisions intelligentes', insights: 'Aperçu stratégique IA', insightText: 'Votre pensée stratégique et votre maîtrise du SWOT vous donnent un avantage. Étape suivante: défi de gestion de crise.', enterBusiness: 'Entrée dans la Cité Financière Néon' },
    es: { dir: 'ltr', settings: 'Ajustes', exported: 'Exportado', cleared: 'Borrado', voiceOn: 'Voz activada', voiceOff: 'Voz desactivada', businessBadge: 'CIUDAD FINANCIERA NEÓN', kpiRevenue: 'Ingresos', kpiGrowth: 'Crecimiento', kpiTeam: 'Equipo', kpiDecisions: 'Decisiones inteligentes', insights: 'Visión estratégica de IA', insightText: 'Tu pensamiento estratégico y dominio del SWOT te dan ventaja. Siguiente: reto de gestión de crisis.', enterBusiness: 'Entraste a la Ciudad Financiera Neón' },
    tr: { dir: 'ltr', settings: 'Ayarlar', exported: 'Dışa aktarıldı', cleared: 'Temizlendi', voiceOn: 'Ses açık', voiceOff: 'Ses kapalı', businessBadge: 'NEON FİNANS ŞEHRİ', kpiRevenue: 'Gelir', kpiGrowth: 'Büyüme', kpiTeam: 'Ekip', kpiDecisions: 'Akıllı kararlar', insights: 'YZ stratejik içgörü', insightText: 'Güçlü stratejik düşüncen ve SWOT analizi sana avantaj veriyor. Sıradaki: kriz yönetimi mücadelesi.', enterBusiness: 'Neon Finans Şehri\'ne girdin' },
    ja: { dir: 'ltr', settings: '設定', exported: 'エクスポート完了', cleared: '消去完了', voiceOn: '音声オン', voiceOff: '音声オフ', businessBadge: 'ネオン金融都市', kpiRevenue: '収益', kpiGrowth: '成長', kpiTeam: 'チーム', kpiDecisions: 'スマート判断', insights: 'AI戦略インサイト', insightText: '戦略思考とSWOT分析があなたの強みです。次は危機管理チャレンジを試してください。', enterBusiness: 'ネオン金融都市に入りました' },
    zh: { dir: 'ltr', settings: '设置', exported: '已导出', cleared: '已清除', voiceOn: '语音开', voiceOff: '语音关', businessBadge: '霓虹金融城', kpiRevenue: '收入', kpiGrowth: '增长', kpiTeam: '团队', kpiDecisions: '智能决策', insights: 'AI 战略洞察', insightText: '你的战略思维和 SWOT 分析能力是优势。下一步:挑战危机管理。', enterBusiness: '进入霓虹金融城' },
    ko: { dir: 'ltr', settings: '설정', exported: '내보내기 완료', cleared: '삭제 완료', voiceOn: '음성 켜짐', voiceOff: '음성 꺼짐', businessBadge: '네온 금융 도시', kpiRevenue: '매출', kpiGrowth: '성장', kpiTeam: '팀', kpiDecisions: '스마트 결정', insights: 'AI 전략 통찰', insightText: '전략적 사고와 SWOT 분석이 강점입니다. 다음: 위기관리 챌린지.', enterBusiness: '네온 금융 도시에 진입' },
    ru: { dir: 'ltr', settings: 'Настройки', exported: 'Экспортировано', cleared: 'Очищено', voiceOn: 'Голос вкл.', voiceOff: 'Голос выкл.', businessBadge: 'НЕОНОВЫЙ ФИНАНСОВЫЙ ГОРОД', kpiRevenue: 'Выручка', kpiGrowth: 'Рост', kpiTeam: 'Команда', kpiDecisions: 'Умные решения', insights: 'AI-инсайт', insightText: 'Стратегическое мышление и SWOT-анализ — ваше преимущество. Дальше: вызов по кризис-менеджменту.', enterBusiness: 'Вы вошли в Неоновый Финансовый Город' },
    it: { dir: 'ltr', settings: 'Impostazioni', exported: 'Esportato', cleared: 'Cancellato', voiceOn: 'Voce attiva', voiceOff: 'Voce disattivata', businessBadge: 'CITTÀ FINANZIARIA NEON', kpiRevenue: 'Ricavi', kpiGrowth: 'Crescita', kpiTeam: 'Team', kpiDecisions: 'Decisioni intelligenti', insights: 'Insight strategico IA', insightText: 'Pensiero strategico e analisi SWOT sono il tuo vantaggio. Prossimo: sfida gestione crisi.', enterBusiness: 'Entrato nella Città Finanziaria Neon' }
};
function tt(key) { return (I18N[prefs.lang] || I18N.ar)[key] || I18N.ar[key] || key; }
function setLang(code) {
    if (!I18N[code]) return;
    prefs.lang = code;
    document.documentElement.dir = I18N[code].dir;
    document.documentElement.lang = code;
    document.querySelectorAll('.seg-btn[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === code));
    document.querySelector('.settings-title').textContent = '⚙ ' + tt('settings');
    savePrefs();
}

// --- Settings drawer (with background-scroll lock) ---
var _settingsScrollY = 0;

// Keyboard shortcut: Ctrl+, opens/closes settings
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        toggleSettings();
    }
    // Escape closes settings
    if (e.key === 'Escape' && document.body.classList.contains('settings-open')) {
        toggleSettings();
    }
});

function toggleSettings() {
    var isOpen = document.body.classList.contains('settings-open');
    if (!isOpen) {
        _settingsScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.top = '-' + _settingsScrollY + 'px';
        if (typeof _populateMerchantInputs === 'function') _populateMerchantInputs();
        if (typeof _populateSocialInputs === 'function') _populateSocialInputs();
        if (typeof window._populateDoctorCodeInput === 'function') window._populateDoctorCodeInput();
    } else {
        document.body.style.top = '';
        window.scrollTo(0, _settingsScrollY);
    }
    document.body.classList.toggle('settings-open');
    var drawer = document.getElementById('settings-drawer');
    if (drawer) drawer.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    sfxPlay('click');
}

// --- Sound effects (Web Audio synthesized) ---
let audioCtx = null;
function getAC() {
    if (!prefs.sound) return null;
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}
function tone(freq, opts = {}) {
    const ac = getAC(); if (!ac) return;
    const t0 = ac.currentTime + (opts.delay || 0);
    const g = ac.createGain(), o = ac.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.sweepTo) o.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + (opts.attack || 0.005) + (opts.decay || 0.08));
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opts.gain || 0.06, t0 + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.attack || 0.005) + (opts.decay || 0.08));
    o.connect(g).connect(ac.destination);
    o.start(t0); o.stop(t0 + (opts.attack || 0.005) + (opts.decay || 0.08) + 0.02);
}
function sfxPlay(cue) {
    if (!prefs.sound) return;
    switch (cue) {
        case 'hover':   tone(1100, { type: 'triangle', gain: 0.022, decay: 0.04 }); break;
        case 'click':   tone(660,  { type: 'sine',     gain: 0.06,  decay: 0.09, sweepTo: 880 }); break;
        case 'confirm': tone(659.25,{ gain: 0.06, decay: 0.18 }); tone(830.61, { gain: 0.05, decay: 0.22, delay: 0.06 }); break;
        case 'error':   tone(220, { type: 'sawtooth', gain: 0.06, decay: 0.22, sweepTo: 110 }); break;
        case 'level':   [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => tone(f, { gain: 0.055, decay: 0.18, delay: i * 0.08 })); break;
        case 'enter':   tone(330, { gain: 0.06, decay: 0.4, sweepTo: 880 }); tone(440, { gain: 0.04, decay: 0.5, delay: 0.1, sweepTo: 1100 }); break;
    }
}
function toggleSound(v) { prefs.sound = !!v; savePrefs(); if (v) sfxPlay('confirm'); }

// --- Text-to-speech (Web Speech API) ---
const speech = { utt: null, supported: typeof window !== 'undefined' && 'speechSynthesis' in window };
function speak(text) {
    if (!prefs.voice || !speech.supported || !text) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, '').slice(0, 1200));
        u.lang = prefs.lang === 'ar' ? 'ar-SA' : prefs.lang === 'de' ? 'de-DE' : prefs.lang === 'fr' ? 'fr-FR' : prefs.lang === 'es' ? 'es-ES' : prefs.lang === 'tr' ? 'tr-TR' : prefs.lang === 'ja' ? 'ja-JP' : prefs.lang === 'zh' ? 'zh-CN' : prefs.lang === 'ko' ? 'ko-KR' : prefs.lang === 'ru' ? 'ru-RU' : prefs.lang === 'it' ? 'it-IT' : 'en-US';
        u.rate = prefs.lang === 'ar' ? 0.95 : 1.0;
        u.pitch = 1;
        window.speechSynthesis.speak(u);
    } catch {}
}
function toggleVoice(v) { prefs.voice = !!v; savePrefs(); if (!v && speech.supported) window.speechSynthesis.cancel(); showToast(v ? tt('voiceOn') : tt('voiceOff'), 'xp-toast'); }
function toggleFx(v) {
    // One master switch now (aus_45_fx_mode.js): cinematic FX on/off — canvases, nebulae, scanlines, animations and the cursor effects below.
    if (window.AUS_FX && typeof window.AUS_FX.set === 'function') { window.AUS_FX.set(v, { source: 'settings' }); return; }
    prefs.fx = !!v;
    document.body.classList.toggle('fx-on', v);
    const halo = document.getElementById('cursor-halo');
    if (halo) halo.style.opacity = (v && !('ontouchstart' in window)) ? '1' : '0';
    savePrefs();
}
function toggleReducedMotion(v) { prefs.reduceMotion = !!v; document.body.classList.toggle('reduce-motion', v); savePrefs(); }

// --- Animation intensity ---
var _animIntensityStyleEl = null;
function setAnimIntensity(v) {
    v = parseFloat(v);
    prefs.animIntensity = v;
    // Update display label
    var lbl = document.getElementById('animIntensityValue');
    if (lbl) lbl.textContent = Math.round(v * 100) + '%';
    // Sync slider handle
    var sl = document.getElementById('animIntensity');
    if (sl && parseFloat(sl.value) !== v) sl.value = v;
    // Inject dynamic style to scale animation/transition durations
    if (!_animIntensityStyleEl) {
        _animIntensityStyleEl = document.createElement('style');
        _animIntensityStyleEl.id = 'anim-intensity-style';
        document.head.appendChild(_animIntensityStyleEl);
    }
    if (v < 0.05) {
        _animIntensityStyleEl.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
    } else if (Math.abs(v - 1.0) < 0.04) {
        _animIntensityStyleEl.textContent = '';
    } else {
        var dur = (1 / v);
        _animIntensityStyleEl.textContent =
            '*, *::before, *::after { ' +
            'animation-duration: ' + dur.toFixed(2) + 's !important; ' +
            'transition-duration: ' + (dur * 0.3).toFixed(2) + 's !important; }';
    }
    savePrefs();
}

// --- Font size ---
function setFontSize(v) {
    v = parseFloat(v);
    prefs.fontSize = v;
    applyZoom(prefs.zoom); // recompute with zoom × fontSize
    document.querySelectorAll('.font-size-btn').forEach(function(b) {
        b.classList.toggle('active', parseFloat(b.dataset.fs) === v);
    });
    savePrefs();
    sfxPlay('click');
}

// --- High contrast ---
function toggleHighContrast(v) {
    prefs.highContrast = !!v;
    document.body.classList.toggle('high-contrast', !!v);
    savePrefs();
}

// --- Data export/clear ---
function exportProgress() {
    const data = { exported_at: new Date().toISOString(), xp: userXP, level: userLevel, hearts: currentHearts, prefs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aus-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); URL.revokeObjectURL(a.href);
    showToast(tt('exported'), 'xp-toast');
    sfxPlay('confirm');
}
function clearProgress() {
    userXP = 0; userLevel = 1; currentHearts = 3;
    updateStats();
    showToast(tt('cleared'), 'heart-toast');
    sfxPlay('error');
}

// --- Cursor halo ---
function initCursorHalo() {
    const halo = document.getElementById('cursor-halo');
    if (!halo) return;
    // Disable CSS transitions on this element — set opacity directly.
    halo.style.transition = 'none';
    halo.style.opacity = (prefs.fx !== false && !('ontouchstart' in window)) ? '1' : '0';
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let rx = tx, ry = ty;
    window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    function tick() {
        rx += (tx - rx) * 0.12;
        ry += (ty - ry) * 0.12;
        halo.style.transform = `translate(-50%, -50%) translate3d(${rx}px, ${ry}px, 0)`;
        requestAnimationFrame(tick);
    }
    tick();
}

// --- Magnetic + parallax cards (delegated, lightweight) ---
function initMagneticCards() {
    const targets = '.card, .tool-item, .scenario-card, .certificate-card, .action-card, .kpi-tile, .splash-stat';
    document.body.addEventListener('pointermove', (e) => {
        if (!prefs.fx || prefs.reduceMotion) return;
        const t = e.target.closest(targets);
        if (!t) return;
        const r = t.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const tilt = 10;
        t.style.transform = `perspective(900px) rotateX(${-py * tilt}deg) rotateY(${px * tilt}deg) translateZ(6px)`;
    }, { passive: true });
    document.body.addEventListener('pointerleave', () => {}, { capture: true });
    document.body.addEventListener('pointerout', (e) => {
        const t = e.target.closest(targets);
        if (t && (!e.relatedTarget || !t.contains(e.relatedTarget))) t.style.transform = '';
    }, { passive: true });
}

// --- Hover/click sounds delegated ---
function initInteractionSounds() {
    const hoverSel = '.card, .tool-item, .nav-tab, .option-btn, .btn-primary, .next-btn, .learn-start-btn, .splash-btn, .accent-dot, .seg-btn, .data-btn, #settings-fab, .ai-suggestion-chip';
    let lastHover = null;
    document.body.addEventListener('pointerover', (e) => {
        const t = e.target.closest(hoverSel);
        if (t && t !== lastHover) { lastHover = t; sfxPlay('hover'); }
    });
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.nav-tab, .btn-primary, .next-btn, .learn-start-btn, .splash-btn, .seg-btn, .data-btn, #settings-fab')) sfxPlay('click');
    }, true);
}

// --- Neon Financial City canvas (active in business mode only) ---
function initNeonCity() {
    const canvas = document.getElementById('neon-city');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let towers = [], streams = [], particles = [], rays = [];
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        W = canvas.width = Math.floor(window.innerWidth * dpr);
        H = canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        buildCity();
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function buildCity() {
        towers = [];
        const count = Math.floor(window.innerWidth / 38) + 18;
        for (let i = 0; i < count; i++) {
            const w = rnd(36, 110) * dpr;
            const h = rnd(120, H * 0.65) * dpr;
            const depth = rnd(0.3, 1);
            const x = (i / count) * W + rnd(-30, 30) * dpr;
            const hueRoll = Math.random();
            const color = hueRoll < 0.55 ? '#00d4ff' : hueRoll < 0.82 ? '#9d4edd' : '#ffd700';
            towers.push({ x, w, h, depth, color, windows: Math.floor(h / (18 * dpr)) });
        }
        towers.sort((a, b) => a.depth - b.depth);
        streams = [];
        for (let i = 0; i < 22; i++) {
            streams.push({ x: rnd(0, W), y: rnd(0, H), len: rnd(40, 180) * dpr, speed: rnd(0.6, 2.5) * dpr, color: Math.random() > 0.5 ? '#00d4ff' : '#ffd700' });
        }
        particles = [];
        for (let i = 0; i < 90; i++) {
            particles.push({ x: rnd(0, W), y: rnd(0, H), vy: rnd(-0.2, -1.2) * dpr, r: rnd(0.5, 2) * dpr, alpha: rnd(0.25, 0.85) });
        }
        rays = [];
        for (let i = 0; i < 5; i++) {
            rays.push({ x: rnd(W * 0.2, W * 0.8), y: rnd(-100, 80), w: rnd(80, 220) * dpr, h: H * 0.6, alpha: rnd(0.04, 0.1) });
        }
    }
    function drawGrid(t) {
        ctx.save();
        const gridY = H * 0.66;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 0; y < 14; y++) {
            const ry = gridY + (Math.pow(y / 13, 1.6)) * (H - gridY);
            ctx.moveTo(0, ry); ctx.lineTo(W, ry);
        }
        for (let x = -10; x <= 10; x++) {
            const cx = W / 2 + x * (W / 14);
            ctx.moveTo(cx, gridY); ctx.lineTo(W / 2 + x * (W / 2.1), H);
        }
        ctx.stroke();
        ctx.restore();
    }
    function draw(t) {
        // bg fog
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, 'rgba(0, 4, 20, 0.92)');
        grd.addColorStop(0.6, 'rgba(2, 8, 40, 0.55)');
        grd.addColorStop(1, 'rgba(0, 212, 255, 0.07)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

        // light rays
        rays.forEach((r, i) => {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 212, 255, ' + (r.alpha + Math.sin(t * 0.0006 + i) * 0.03) + ')';
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x + r.w / 2, r.y + r.h);
            ctx.lineTo(r.x - r.w / 2, r.y + r.h);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        });

        drawGrid(t);

        // skyline towers
        towers.forEach(tw => {
            const baseY = H * (0.42 + (1 - tw.depth) * 0.06);
            const x = tw.x - tw.w / 2;
            const y = baseY - tw.h;
            // glass body
            const tg = ctx.createLinearGradient(x, y, x, baseY);
            tg.addColorStop(0, tw.color + 'cc');
            tg.addColorStop(0.5, '#0a1632dd');
            tg.addColorStop(1, '#000814');
            ctx.fillStyle = tg;
            ctx.globalAlpha = 0.85 * tw.depth + 0.15;
            ctx.fillRect(x, y, tw.w, tw.h);
            // outline
            ctx.strokeStyle = tw.color + '55';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, tw.w, tw.h);
            // animated windows
            ctx.fillStyle = tw.color;
            for (let r = 0; r < tw.windows; r++) {
                const wy = y + r * 18 * dpr + 4 * dpr;
                if (Math.sin(t * 0.002 + r * 0.7 + tw.x * 0.01) > 0.4) {
                    ctx.globalAlpha = 0.85 * tw.depth;
                    ctx.fillRect(x + 4 * dpr, wy, tw.w - 8 * dpr, 2 * dpr);
                }
            }
            // spire
            ctx.globalAlpha = 1;
            ctx.fillStyle = tw.color;
            ctx.shadowColor = tw.color; ctx.shadowBlur = 14;
            ctx.fillRect(x + tw.w / 2 - 1, y - 12 * dpr, 2, 12 * dpr);
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;

        // data streams (vertical light trails)
        streams.forEach(s => {
            s.y -= s.speed;
            if (s.y + s.len < 0) { s.y = H + 20; s.x = rnd(0, W); }
            const sg = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.len);
            sg.addColorStop(0, 'rgba(255,255,255,0)');
            sg.addColorStop(0.5, s.color + 'cc');
            sg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = sg;
            ctx.fillRect(s.x, s.y, 2 * dpr, s.len);
        });

        // floating particles (stars/dust)
        particles.forEach(p => {
            p.y += p.vy;
            if (p.y < -10) { p.y = H + 5; p.x = rnd(0, W); }
            ctx.fillStyle = 'rgba(255, 255, 255, ' + p.alpha + ')';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        });
    }
    let raf;
    function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
    function start() { if (!raf) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, W, H); }
    resize();
    window.addEventListener('resize', resize);
    // expose
    window.__neonCity = { start, stop };
}

// --- Business mode activation (animate opacity via JS, transitions stall on dynamic class adds) ---
function fadeTo(el, to, durMs = 900) {
    if (!el) return;
    const from = parseFloat(getComputedStyle(el).opacity) || 0;
    const start = performance.now();
    function step(now) {
        const p = Math.min(1, (now - start) / durMs);
        const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
        el.style.opacity = String(v);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}
// FX switch hook (aus_45_fx_mode.js): the city canvas animates only in business mode AND while FX are on.
function syncNeonCity() {
    if (!window.__neonCity) return;
    if (window.__AUS_FX_ON !== false && document.body.classList.contains('business-mode')) window.__neonCity.start();
    else window.__neonCity.stop();
}
function enterBusinessMode() {
    if (document.body.classList.contains('business-mode')) return;
    document.body.classList.add('business-mode');
    fadeTo(document.getElementById('neon-city'), 1, 1200);
    if (window.__neonCity && window.__AUS_FX_ON !== false) window.__neonCity.start();
    sfxPlay('enter');
    showToast('🌆 ' + tt('enterBusiness'), 'xp-toast');
}
function leaveBusinessMode() {
    document.body.classList.remove('business-mode');
    fadeTo(document.getElementById('neon-city'), 0, 600);
    if (window.__neonCity) setTimeout(() => window.__neonCity.stop(), 700);
}

// ===========================================================================
// ===================== CEO DASHBOARD v2 — UPGRADED ==========================
// Live charts · AI insights · Real-time feed · Animated KPIs
// ===========================================================================

// ── Dashboard state ──────────────────────────────────────────────────────────
const _DASH = {
    revHistory:    [],  // 7-point revenue trend (filled on first render)
    feedInterval:  null,
    insightIdx:    0,
    liveUpdateInt: null,
};

// ── Static market ticker ─────────────────────────────────────────────────────
const _TICKER_SYMS = [
    { s: 'AAPL', v: '+1.42%', d: 'up' }, { s: 'TSLA',  v: '-0.81%', d: 'dn' },
    { s: 'MSFT', v: '+0.96%', d: 'up' }, { s: 'NVDA',  v: '+3.18%', d: 'up' },
    { s: 'GOOGL', v: '-0.34%', d: 'dn' }, { s: 'AMZN', v: '+2.05%', d: 'up' },
    { s: 'META', v: '+1.78%', d: 'up' }, { s: 'BTC',   v: '+4.21%', d: 'up' },
    { s: 'ETH',  v: '-1.12%', d: 'dn' }, { s: 'OIL',   v: '+0.55%', d: 'up' },
    { s: 'GOLD', v: '+0.88%', d: 'up' }, { s: 'S&P',   v: '+0.62%', d: 'up' },
];

// ── AI insight cards (language-agnostic categories) ──────────────────────────
const _AI_INSIGHTS = {
    ar: [
        { cat: 'استراتيجية', icon: '🧠', text: 'نتائجك تُظهر ميلاً نحو التفكير الاستراتيجي طويل المدى — هذه ميزة نادرة. ركّز على تطوير قدرات "Blue Ocean" لتجنّب المنافسة المباشرة.' },
        { cat: 'مالية', icon: '💰', text: 'نسبة التحويل الحالية (12.4%) فوق متوسط الصناعة (8.2%). فرصة: ضاعف الاستثمار في قناة الاستحواذ الأعلى أداءً لتسريع النمو.' },
        { cat: 'فريق', icon: '👥', text: 'معدل الاحتفاظ بالمواهب لديك 94% — أعلى بـ 18% عن المنافسين. أكمل تطبيق إطار Servant Leadership لتعزيز الولاء.' },
        { cat: 'سوق', icon: '📊', text: 'إشارات السوق تشير إلى تحوّل نحو خدمات AI-first في قطاعك. نافذة الفرصة: 6-12 شهراً للدخول قبل تشبّع السوق.' },
    ],
    en: [
        { cat: 'Strategy', icon: '🧠', text: 'Your decision patterns indicate strong systems thinking. Leverage this to build competitive moats using Porter\'s 5 Forces before rivals consolidate.' },
        { cat: 'Finance', icon: '💰', text: 'Revenue CAGR of 12.4% outpaces the sector median (7.1%). Priority: optimize working capital cycle to fund the next growth phase without dilution.' },
        { cat: 'Team', icon: '👥', text: 'eNPS trajectory is positive. Introduce a structured L&D budget (1.5% of payroll) — studies show 24% retention improvement within 2 quarters.' },
        { cat: 'Market', icon: '📊', text: 'Competitive intelligence shows 3 adjacent players entering your core market in Q3. Recommended: accelerate customer lock-in via switching cost strategy.' },
    ],
    default: [
        { cat: 'Strategy', icon: '🧠', text: 'Strong strategic alignment detected. Focus on Blue Ocean positioning to reduce competitive pressure.' },
        { cat: 'Finance', icon: '💰', text: 'Revenue trend is positive. Optimize your working capital cycle to fund growth efficiently.' },
        { cat: 'Team', icon: '👥', text: 'Retention metrics above benchmark. Double down on L&D investment to sustain performance.' },
        { cat: 'Market', icon: '📊', text: 'Market window identified. Move quickly to establish first-mover advantage before saturation.' },
    ],
};

// ── Live feed events (simulated) ─────────────────────────────────────────────
const _FEED_EVENTS = {
    ar: [
        { icon: '💹', text: 'تجاوزت الإيرادات هدف الربع بنسبة 3.2%' },
        { icon: '🤝', text: 'اكتمال صفقة شراكة استراتيجية جديدة' },
        { icon: '🎯', text: 'NPS ارتفع 4 نقاط مقارنة بالشهر الماضي' },
        { icon: '📦', text: 'شحنة المنتج Q3 تسليم في الموعد المحدد' },
        { icon: '👤', text: 'انضمام مدير تقني جديد إلى القيادة العليا' },
        { icon: '📈', text: 'تجاوز هدف اكتساب العملاء بـ 18%' },
        { icon: '⚡', text: 'تحديث نظام ERP اكتمل بنجاح' },
        { icon: '🏆', text: 'فوز بجائزة أفضل بيئة عمل للعام' },
    ],
    en: [
        { icon: '💹', text: 'Q3 revenue target exceeded by 3.2%' },
        { icon: '🤝', text: 'Strategic partnership deal closed successfully' },
        { icon: '🎯', text: 'NPS score up 4 points vs last month' },
        { icon: '📦', text: 'Product Q3 shipment delivered on schedule' },
        { icon: '👤', text: 'New CTO joined the executive leadership team' },
        { icon: '📈', text: 'Customer acquisition target beat by 18%' },
        { icon: '⚡', text: 'ERP system upgrade completed successfully' },
        { icon: '🏆', text: 'Won Best Workplace award this year' },
    ],
};
function _feedEvents() {
    const lang = prefs.lang || 'en';
    return _FEED_EVENTS[lang] || _FEED_EVENTS.en;
}
function _insightCards() {
    const lang = prefs.lang || 'en';
    return _AI_INSIGHTS[lang] || _AI_INSIGHTS.default;
}

// ── Build HTML ────────────────────────────────────────────────────────────────
function buildCeoDashboard() {
    const rev      = 1820000 + Math.floor(Math.random() * 250000);
    const growth   = +(8 + Math.random() * 18).toFixed(1);
    const team     = 124 + Math.floor(Math.random() * 30);
    const decisions = (typeof quizScore !== 'undefined' ? quizScore : 0) * 7 + 18;

    // Build 7-point revenue history for sparkline
    if (_DASH.revHistory.length === 0) {
        let base = rev * 0.72;
        for (let i = 0; i < 7; i++) {
            base += base * (0.02 + Math.random() * 0.06);
            _DASH.revHistory.push(Math.round(base));
        }
    }

    const ticker = _TICKER_SYMS.concat(_TICKER_SYMS.slice(0, 5))
        .map(x => `<span class="ticker-item"><span class="sym">${x.s}</span><span class="${x.d}">${x.v}</span></span>`)
        .join('');

    const insightCards = _insightCards().map(c => `
        <div class="aip-card">
            <span class="aip-card-icon">${c.icon}</span>
            <div class="aip-card-cat">${c.cat}</div>
            <div class="aip-card-text">${c.text}</div>
        </div>`).join('');

    const feedItems = _feedEvents().slice(0, 4).map((e, i) => {
        const mins = [2, 8, 15, 31][i] || (30 + i * 12);
        return `<li class="dash-feed-item" style="animation-delay:${i * 80}ms">
            <span class="dash-feed-icon">${e.icon}</span>
            <span>${e.text}</span>
            <span class="dash-feed-time">${mins}m</span>
        </li>`;
    }).join('');

    return `
        <div class="business-badge">⬢ ${tt('businessBadge')} ⬢</div>
        <div class="ceo-ticker"><span class="ceo-ticker-track">${ticker}</span></div>

        <!-- ── AI Insights (upgraded) ── -->
        <div class="ai-insights-panel" id="aip-main">
            <div class="aip-head">
                <div class="aip-brain" aria-hidden="true">🧠</div>
                <div class="aip-title-block">
                    <div class="aip-title">${tt('insights')}</div>
                    <div class="aip-subtitle" id="aip-time">يُحدَّث كل دقيقة</div>
                </div>
                <button class="aip-refresh-btn" id="aip-refresh-btn" onclick="refreshAiInsights()" aria-label="Refresh insights">
                    <span class="aip-spin">↻</span> تحديث
                </button>
            </div>
            <div class="aip-cards" id="aip-cards">${insightCards}</div>
        </div>

        <!-- ── Chart row ── -->
        <div class="dash-top-row">
            <div class="dash-chart-panel" id="dash-rev-panel">
                <div class="dash-panel-label">📈 اتجاه الإيرادات · Revenue Trend</div>
                <div class="dash-panel-value" id="dash-rev-val">$0</div>
                <div class="dash-panel-sub"><span class="up">▲ +12.4% QoQ</span> · Q3 2026</div>
                <canvas class="dash-canvas" id="dash-rev-chart" height="70" aria-label="Revenue trend chart" role="img"></canvas>
            </div>
            <div class="dash-chart-panel" id="dash-dept-panel">
                <div class="dash-panel-label">🏢 توزيع الميزانية · Budget Split</div>
                <div class="dash-panel-value">$${(rev * 0.38 / 1e6).toFixed(1)}M</div>
                <div class="dash-panel-sub"><span class="up">▲ Ops allocated</span></div>
                <div class="dash-donut-wrap">
                    <canvas class="dash-donut" id="dash-donut-chart" width="80" height="80" aria-label="Department budget allocation donut chart" role="img"></canvas>
                    <div class="dash-donut-legend" id="dash-donut-legend"></div>
                </div>
            </div>
        </div>

        <!-- ── KPI tiles (with sparklines + progress bars) ── -->
        <div class="ceo-dashboard" id="ceo-kpi-grid">
            <div class="kpi-tile">
                <div class="kpi-label">💰 ${tt('kpiRevenue')}</div>
                <div class="kpi-value" data-counter="${rev}" data-prefix="$">$0</div>
                <div class="kpi-trend up">▲ +12.4% QoQ</div>
                <div class="kpi-bar-track"><div class="kpi-bar-fill" data-fill="78"></div></div>
                <canvas class="kpi-spark-canvas" data-spark="rev" aria-hidden="true"></canvas>
            </div>
            <div class="kpi-tile">
                <div class="kpi-label">📈 ${tt('kpiGrowth')}</div>
                <div class="kpi-value" data-counter="${growth}" data-suffix="%">0%</div>
                <div class="kpi-trend up">▲ سنوي / Annual</div>
                <div class="kpi-bar-track"><div class="kpi-bar-fill" data-fill="65"></div></div>
                <canvas class="kpi-spark-canvas" data-spark="growth" aria-hidden="true"></canvas>
            </div>
            <div class="kpi-tile">
                <div class="kpi-label">👥 ${tt('kpiTeam')}</div>
                <div class="kpi-value" data-counter="${team}">0</div>
                <div class="kpi-trend up">▲ +6 هذا الشهر</div>
                <div class="kpi-bar-track"><div class="kpi-bar-fill" data-fill="88"></div></div>
                <canvas class="kpi-spark-canvas" data-spark="team" aria-hidden="true"></canvas>
            </div>
            <div class="kpi-tile">
                <div class="kpi-label">🎯 ${tt('kpiDecisions')}</div>
                <div class="kpi-value" data-counter="${decisions}">0</div>
                <div class="kpi-trend up">▲ XP ${typeof userXP !== 'undefined' ? userXP : 0}</div>
                <div class="kpi-bar-track"><div class="kpi-bar-fill" data-fill="${Math.min(95, decisions)}"></div></div>
                <canvas class="kpi-spark-canvas" data-spark="decisions" aria-hidden="true"></canvas>
            </div>
        </div>

        <!-- ── Live feed ── -->
        <div class="dash-live-feed" id="dash-live-feed">
            <div class="dash-live-head">
                <span><span class="dash-live-dot"></span><span class="dash-live-title">LIVE · أحداث الشركة</span></span>
                <span style="font-size:0.7rem;color:rgba(255,255,255,0.35)">AUTO-REFRESH</span>
            </div>
            <ul class="dash-feed-list" id="dash-feed-list">${feedItems}</ul>
        </div>
    `;
}

// ── Counter animation ─────────────────────────────────────────────────────────
function animateCounters(root) {
    root.querySelectorAll('[data-counter]').forEach(el => {
        const target = parseFloat(el.dataset.counter);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const start  = performance.now();
        const dur    = 1400;
        function step(now) {
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            const v = target * eased;
            const fmt = target > 1000
                ? Math.round(v).toLocaleString('en-US')
                : (target % 1 ? v.toFixed(1) : Math.round(v));
            el.textContent = prefix + fmt + suffix;
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });

    // Animate revenue panel value separately with $ format
    const revVal = root.querySelector('#dash-rev-val');
    if (revVal) {
        const ctr = root.querySelector('[data-counter][data-prefix="$"]');
        if (ctr) {
            const target = parseFloat(ctr.dataset.counter);
            const start  = performance.now();
            const dur    = 1400;
            (function step(now) {
                const p = Math.min(1, (now - start) / dur);
                const eased = 1 - Math.pow(1 - p, 3);
                revVal.textContent = '$' + Math.round(target * eased).toLocaleString('en-US');
                if (p < 1) requestAnimationFrame(step);
            })(start);
        }
    }

    // Animate progress bar fills
    setTimeout(() => {
        root.querySelectorAll('.kpi-bar-fill[data-fill]').forEach(bar => {
            bar.style.width = bar.dataset.fill + '%';
        });
    }, 200);
}

// ── Canvas chart helpers ──────────────────────────────────────────────────────
function _drawLineChart(canvas, data, color = '#00d4ff', fillColor = 'rgba(0,212,255,0.12)') {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || canvas.width;
    const H = canvas.offsetHeight || canvas.height;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = { top: 4, right: 4, bottom: 4, left: 4 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top  - pad.bottom;

    const pts = data.map((v, i) => ({
        x: pad.left + (i / (data.length - 1)) * cw,
        y: pad.top  + (1 - (v - min) / range) * ch,
    }));

    // Animate draw: gradually reveal points
    let progress = 0;
    const totalFrames = 40;

    function drawFrame() {
        ctx.clearRect(0, 0, W, H);
        const visibleCount = Math.max(2, Math.ceil((progress / totalFrames) * pts.length));
        const visible = pts.slice(0, visibleCount);

        // Fill area
        ctx.beginPath();
        ctx.moveTo(visible[0].x, ch + pad.top);
        visible.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(visible[visible.length - 1].x, ch + pad.top);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, ch + pad.top);
        grad.addColorStop(0, fillColor.replace('0.12', '0.25'));
        grad.addColorStop(1, fillColor.replace('0.12', '0.01'));
        ctx.fillStyle = grad;
        ctx.fill();

        // Line
        ctx.beginPath();
        visible.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.8;
        ctx.lineJoin    = 'round';
        ctx.lineCap     = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur  = 6;
        ctx.stroke();
        ctx.shadowBlur  = 0;

        // Last-point dot
        const last = visible[visible.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        progress++;
        if (progress <= totalFrames) requestAnimationFrame(drawFrame);
    }
    drawFrame();
}

function _drawDonut(canvas, slices, legendEl) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const S   = canvas.width;  // already set as attribute
    canvas.width  = S * dpr;
    canvas.height = S * dpr;
    ctx.scale(dpr, dpr);

    const cx = S / 2, cy = S / 2, r = S / 2 - 6, inner = r * 0.55;
    const total = slices.reduce((a, s) => a + s.v, 0);
    let startAngle = -Math.PI / 2;

    let progress = 0;
    const totalFrames = 35;

    function drawFrame() {
        ctx.clearRect(0, 0, S, S);
        const ratio = Math.min(1, progress / totalFrames);

        slices.forEach(s => {
            const angle = (s.v / total) * Math.PI * 2 * ratio;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, startAngle + angle);
            ctx.arc(cx, cy, inner, startAngle + angle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = s.c;
            ctx.shadowColor = s.c;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
            startAngle += angle;
        });

        // Reset for re-draw
        startAngle = -Math.PI / 2;

        progress++;
        if (progress <= totalFrames) requestAnimationFrame(drawFrame);
    }
    drawFrame();

    // Legend
    if (legendEl) {
        legendEl.innerHTML = slices.map(s =>
            `<div><span style="background:${s.c};display:inline-block;width:10px;height:10px;border-radius:2px;margin-inline-end:5px;vertical-align:middle"></span>${s.l} <strong style="color:rgba(255,255,255,0.8)">${s.v}%</strong></div>`
        ).join('');
    }
}

function _sparkData(type) {
    // Returns 10 data points mimicking plausible trends
    const trends = {
        rev:       [62, 67, 71, 70, 75, 78, 82],
        growth:    [52, 55, 58, 56, 61, 65, 68],
        team:      [70, 72, 74, 73, 78, 82, 88],
        decisions: [40, 48, 55, 52, 60, 68, 75],
    };
    return (trends[type] || trends.rev).map(v => v + (Math.random() - 0.5) * 4);
}

// ── Init charts after DOM insertion ──────────────────────────────────────────
function initDashboardCharts(root) {
    // Revenue trend line chart
    const revCanvas = root.querySelector('#dash-rev-chart');
    if (revCanvas) {
        // Wait one frame for layout paint
        requestAnimationFrame(() => _drawLineChart(revCanvas, _DASH.revHistory, '#00d4ff', 'rgba(0,212,255,0.12)'));
    }

    // Donut chart
    const donutCanvas = root.querySelector('#dash-donut-chart');
    const donutLegend = root.querySelector('#dash-donut-legend');
    if (donutCanvas) {
        const slices = [
            { l: 'Operations', v: 38, c: '#00d4ff' },
            { l: 'R&D',        v: 24, c: '#9d4edd' },
            { l: 'Marketing',  v: 18, c: '#00f5d4' },
            { l: 'HR',         v: 12, c: '#ffd700' },
            { l: 'Other',      v: 8,  c: '#ff006e' },
        ];
        requestAnimationFrame(() => _drawDonut(donutCanvas, slices, donutLegend));
    }

    // KPI sparklines
    root.querySelectorAll('.kpi-spark-canvas[data-spark]').forEach(c => {
        const type = c.dataset.spark;
        const color = type === 'rev' ? '#00d4ff'
            : type === 'growth' ? '#9d4edd'
            : type === 'team' ? '#00f5d4' : '#ffd700';
        requestAnimationFrame(() => _drawLineChart(c, _sparkData(type), color, color.replace('#', 'rgba(').replace(')', ',0.12)') ));
    });
}

// ── Live feed update (rotates items every 12 s) ──────────────────────────────
function startLiveFeed(root) {
    const list   = root.querySelector('#dash-feed-list');
    if (!list) return;
    let eventIdx = 4; // start after the 4 already shown
    const events = _feedEvents();

    if (_DASH.feedInterval) clearInterval(_DASH.feedInterval);
    _DASH.feedInterval = setInterval(() => {
        const e = events[eventIdx % events.length];
        eventIdx++;
        const li = document.createElement('li');
        li.className = 'dash-feed-item';
        li.innerHTML = `<span class="dash-feed-icon">${e.icon}</span><span>${e.text}</span><span class="dash-feed-time">now</span>`;
        list.insertBefore(li, list.firstChild);
        if (list.children.length > 6) list.removeChild(list.lastChild);
        // Update existing time labels
        [...list.querySelectorAll('.dash-feed-time')].forEach((t, i) => {
            if (i > 0) t.textContent = (i * 4) + 'm';
        });
    }, 12000);
}

// ── AI Insights refresh (calls backend if available, falls back to static) ───
let _insightRefreshLocked = false;

async function refreshAiInsights() {
    if (_insightRefreshLocked) return;
    _insightRefreshLocked = true;
    const btn   = document.getElementById('aip-refresh-btn');
    const cards = document.getElementById('aip-cards');
    const sub   = document.getElementById('aip-time');
    if (btn) btn.classList.add('loading');
    if (cards) cards.style.opacity = '0.4';

    try {
        // Try backend for a dynamic AI-generated insight
        const prompt = prefs.lang === 'ar'
            ? 'أعطني 4 رؤى استراتيجية مختصرة لشركة ناشئة في المرحلة التالية: استراتيجية، مالية، فريق، سوق. كل رؤية جملة واحدة ومباشرة.'
            : 'Give me 4 concise strategic business insights for a growth-stage company — covering strategy, finance, team, market. One sentence each, direct and actionable.';

        const res = await fetch(`${CHAT_API_BASE}/api/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, language: prefs.lang || 'ar' }),
            signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
            const data = await res.json();
            if (data.text) {
                // Parse the AI response into 4 insight cards
                const lines = data.text
                    .replace(/<[^>]+>/g, '')
                    .split(/\n|•|·|–|-|\d\./g)
                    .map(l => l.trim())
                    .filter(l => l.length > 20)
                    .slice(0, 4);

                const cats   = ['Strategy', 'Finance', 'Team', 'Market'];
                const icons  = ['🧠', '💰', '👥', '📊'];
                if (lines.length >= 2 && cards) {
                    cards.innerHTML = lines.map((t, i) => `
                        <div class="aip-card" style="animation:fadeIn 0.4s ${i*80}ms both">
                            <span class="aip-card-icon">${icons[i] || '💡'}</span>
                            <div class="aip-card-cat">${cats[i] || 'Insight'}</div>
                            <div class="aip-card-text">${t}</div>
                        </div>`).join('');
                    if (sub) sub.textContent = new Date().toLocaleTimeString();
                    throw null; // jump to finally, skip static fallback
                }
            }
        }
    } catch (err) {
        if (err !== null) {
            // Backend unavailable — rotate static insights
            const pool   = _insightCards();
            const start  = _DASH.insightIdx;
            _DASH.insightIdx = (start + 1) % pool.length;
            const rotated = [...pool.slice(start), ...pool.slice(0, start)].slice(0, 4);
            if (cards) {
                cards.innerHTML = rotated.map((c, i) => `
                    <div class="aip-card" style="animation:fadeIn 0.4s ${i*80}ms both">
                        <span class="aip-card-icon">${c.icon}</span>
                        <div class="aip-card-cat">${c.cat}</div>
                        <div class="aip-card-text">${c.text}</div>
                    </div>`).join('');
            }
        }
    } finally {
        if (cards) cards.style.opacity = '1';
        if (btn)   btn.classList.remove('loading');
        if (sub)   sub.textContent = new Date().toLocaleTimeString();
        _insightRefreshLocked = false;
    }
}

// ── Auto-refresh insights every 60 s ─────────────────────────────────────────
function startInsightAutoRefresh() {
    if (_DASH.liveUpdateInt) clearInterval(_DASH.liveUpdateInt);
    _DASH.liveUpdateInt = setInterval(() => {
        if (document.body.classList.contains('business-mode')) {
            refreshAiInsights();
        }
    }, 60000);
}

// --- Patch existing flows: selectSpecialty + renderToolsList + sendMessage ---
const _origSelectSpecialty = typeof selectSpecialty === 'function' ? selectSpecialty : null;
selectSpecialty = function(id) {
    selectedSpecialty = id;
    if (id === 'business') enterBusinessMode(); else leaveBusinessMode();
    showSection('tools');
    renderToolsList();
};

const _origRenderToolsList = renderToolsList;
renderToolsList = function() {
    _origRenderToolsList();
    if (selectedSpecialty === 'business') {
        const wrap = document.getElementById('toolsContent');
        if (wrap && !wrap.querySelector('.ceo-dashboard')) {
            const dash = document.createElement('div');
            dash.innerHTML = buildCeoDashboard();
            wrap.insertBefore(dash, wrap.firstChild);
            requestAnimationFrame(() => animateCounters(dash));
        }
    }
};

const _origSendMessage = sendMessage;
sendMessage = function() {
    const input = document.getElementById('chatInput');
    const text = (input && input.value || '').trim();
    _origSendMessage();
    if (!text) return;
    // After the AI replies, speak it.
    setTimeout(() => {
        const msgs = document.querySelectorAll('#chatMessages .message.ai');
        const last = msgs[msgs.length - 1];
        if (last) {
            const clone = last.cloneNode(true);
            clone.querySelectorAll('.references, .ai-suggestions').forEach(n => n.remove());
            speak(clone.textContent || '');
        }
    }, 1200);
};

// --- Apply prefs on boot ---
function initFxLayer() {
    applyAccent(prefs.accent);
    applyZoom(prefs.zoom);
    setLang(prefs.lang);
    document.body.classList.toggle('fx-on', prefs.fx !== false);
    document.body.classList.toggle('reduce-motion', !!prefs.reduceMotion);
    if ('ontouchstart' in window) document.body.classList.add('touch');
    const sEl = document.getElementById('opt-sound');   if (sEl) sEl.checked = prefs.sound;
    const vEl = document.getElementById('opt-voice');   if (vEl) vEl.checked = prefs.voice;
    const fEl = document.getElementById('opt-fx');      if (fEl) fEl.checked = prefs.fx !== false;
    const rEl = document.getElementById('opt-reduce');  if (rEl) rEl.checked = !!prefs.reduceMotion;
    document.querySelectorAll('.seg-btn[data-zoom]').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.zoom) === prefs.zoom));
    // New prefs (Feature #9)
    if (prefs.animIntensity !== undefined) setAnimIntensity(prefs.animIntensity);
    if (prefs.highContrast) toggleHighContrast(true);
    if (prefs.fontSize && prefs.fontSize !== 1) setFontSize(prefs.fontSize);
    const hcEl = document.getElementById('opt-highcontrast'); if (hcEl) hcEl.checked = !!prefs.highContrast;
    document.querySelectorAll('.font-size-btn').forEach(function(b) {
        b.classList.toggle('active', parseFloat(b.dataset.fs) === (prefs.fontSize || 1));
    });
    initCursorHalo();
    initMagneticCards();
    initInteractionSounds();
    initNeonCity();
}
function setAccent(code) { prefs.accent = code; applyAccent(code); savePrefs(); sfxPlay('click'); }
function setZoom(z) { prefs.zoom = z; applyZoom(z); savePrefs(); sfxPlay('click'); }

// ---------------------------------------------------------------------------
// THEME SYSTEM — dark (default) | neon | cinematic
// ---------------------------------------------------------------------------
function setTheme(theme, playSfx = true) {
    prefs.theme = theme;
    document.body.classList.remove('theme-neon', 'theme-cinematic');
    if (theme === 'neon')      document.body.classList.add('theme-neon');
    if (theme === 'cinematic') document.body.classList.add('theme-cinematic');
    document.querySelectorAll('.theme-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.theme === (theme || 'dark'))
    );
    savePrefs();
    if (playSfx) sfxPlay('click');
}
// Apply saved theme on load (always call so dark button gets 'active' class, no SFX on boot)
requestAnimationFrame(() => { try { setTheme(prefs.theme || 'dark', false); } catch {} });

// ===========================================================================
// =============== AI CHAT v2 + MIC + VOICE + CURSOR FX (AUS) ================
// ===========================================================================

// Extend prefs with new options (backward-compatible).
if (!('voiceGender'    in prefs)) prefs.voiceGender    = 'female';
if (!('voiceSpeed'     in prefs)) prefs.voiceSpeed     = 1;
if (!('animIntensity'  in prefs)) prefs.animIntensity  = 1.0;
if (!('highContrast'   in prefs)) prefs.highContrast   = false;
if (!('fontSize'       in prefs)) prefs.fontSize       = 1;
savePrefs();

// ===========================================================================
// =============== AI VOICE v2 — Realistic, Multilingual, Emotional ===========
// ===========================================================================

if (!('voiceId' in prefs)) prefs.voiceId = '';
if (!('voiceEmotion' in prefs)) prefs.voiceEmotion = 'natural';
savePrefs();

const VOICE_LANG_CODE = {
    ar: 'ar-SA', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
    tr: 'tr-TR', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', ru: 'ru-RU', it: 'it-IT'
};
const VOICE_PREVIEW_LINE = {
    ar: { female: 'مرحباً، أنا مساعدتك الصوتية. كيف يمكنني خدمتك اليوم؟',  male: 'مرحباً، أنا مساعدك التنفيذي. تفضّل بالسؤال.' },
    en: { female: 'Hi, I am your AI assistant. How can I help you today?',  male: 'Hello, I am your executive advisor. Ask me anything.' },
    de: { female: 'Hallo, ich bin Ihre KI-Assistentin. Wie kann ich helfen?', male: 'Hallo, ich bin Ihr Berater. Fragen Sie mich.' },
    fr: { female: 'Bonjour, je suis votre assistante IA.',                   male: 'Bonjour, je suis votre conseiller exécutif.' },
    es: { female: 'Hola, soy tu asistente de IA.',                           male: 'Hola, soy tu asesor ejecutivo.' },
    tr: { female: 'Merhaba, ben yapay zeka asistanınızım.',                  male: 'Merhaba, ben yönetici danışmanınızım.' },
    ja: { female: 'こんにちは、AIアシスタントです。',                          male: 'こんにちは、エグゼクティブ顧問です。' },
    zh: { female: '你好,我是你的 AI 助理。',                                 male: '你好,我是你的高管顾问。' },
    ko: { female: '안녕하세요, 저는 AI 비서입니다.',                          male: '안녕하세요, 저는 임원 고문입니다.' },
    ru: { female: 'Здравствуйте, я ваша AI-помощница.',                      male: 'Здравствуйте, я ваш консультант.' },
    it: { female: 'Ciao, sono la tua assistente AI.',                        male: 'Ciao, sono il tuo consulente esecutivo.' }
};

// --- Voice quality scoring + classification ---
function voiceQualityScore(v) {
    const n = (v.name || '').toLowerCase();
    let s = 0;
    if (/neural|natural/i.test(n))       s += 100;
    if (/premium|enhanced/i.test(n))     s += 80;
    if (/online|cloud|wavenet/i.test(n)) s += 60;
    if (/google/i.test(n))               s += 40;
    if (/microsoft/i.test(n))            s += 35;
    if (/apple|siri/i.test(n))           s += 35;
    if (v.localService === false)        s += 15; // remote = often higher quality
    if (v.default)                       s += 5;
    return s;
}
function voiceQualityTier(v) {
    const s = voiceQualityScore(v);
    if (s >= 100) return 'neural';
    if (s >= 60)  return 'premium';
    return 'standard';
}
function detectGender(v) {
    const n = (v.name || '').toLowerCase();
    if (/female|woman|girl|zira|samantha|salma|laila|maryam|hoda|paola|kyoko|haruka|yuna|tian|xiaoxiao|aria|amy|emma|natasha|charlotte|jenny|mei|hye|tatyana|carla|fiona|karen|moira|tessa|veena/i.test(n)) return 'female';
    if (/male|man|boy|david|mark|alex|guy|aaron|fahad|hamed|amir|matthew|ryan|brian|james|liang|inho|maxim|carlo|fred|daniel|diego|jorge|nicolás/i.test(n)) return 'male';
    return 'unknown';
}

// --- Cache of voices + ranking ---
let _voicesCache = [];
function refreshVoices() {
    if (!speech.supported) return [];
    _voicesCache = (window.speechSynthesis.getVoices() || []).slice();
    return _voicesCache;
}
function getRankedVoices(langPref) {
    if (!_voicesCache.length) refreshVoices();
    const lp = (langPref || prefs.lang || 'en').slice(0, 2);
    return _voicesCache
        .map(v => ({
            voice: v,
            score: voiceQualityScore(v),
            tier:  voiceQualityTier(v),
            lang:  (v.lang || '').toLowerCase().slice(0, 2),
            gender: detectGender(v),
            id:    (v.voiceURI || v.name || '') + '|' + (v.lang || '')
        }))
        .sort((a, b) => {
            const aMatch = a.lang === lp ? 1 : 0;
            const bMatch = b.lang === lp ? 1 : 0;
            if (aMatch !== bMatch) return bMatch - aMatch;
            return b.score - a.score;
        });
}

// --- Pick best voice (manual override > gender+lang+quality) ---
function pickVoice() {
    const ranked = getRankedVoices();
    if (!ranked.length) return null;
    if (prefs.voiceId) {
        const manual = ranked.find(r => r.id === prefs.voiceId);
        if (manual) return manual.voice;
    }
    const lp = prefs.lang.slice(0, 2);
    const inLang = ranked.filter(r => r.lang === lp);
    const pool = inLang.length ? inLang : ranked;
    const byGender = pool.filter(r => r.gender === prefs.voiceGender);
    if (byGender.length) return byGender[0].voice;
    const notOther = pool.find(r => r.gender !== (prefs.voiceGender === 'male' ? 'female' : 'male'));
    return (notOther || pool[0]).voice;
}

// --- Emotional modulation ---
function emotionAdjust(text) {
    const base = { rate: prefs.voiceSpeed, pitch: 1, volume: 1 };
    const isQuestion = /[?؟]\s*$/.test((text || '').trim());
    const isEmphatic = /[!]\s*$/.test((text || '').trim());
    const isShort    = (text || '').length < 60;
    const urgent     = /(تحدّي|أزمة|عاجل|crisis|urgent|critical|asap)/i.test(text);

    if (prefs.voiceEmotion === 'warm') {
        base.pitch = 0.95; base.rate *= 0.95;
    } else if (prefs.voiceEmotion === 'energetic') {
        base.pitch = 1.1;  base.rate *= 1.05;
    }
    // Layer contextual adjustments on top of emotion preset
    if (isQuestion)     base.pitch += 0.06;
    if (isEmphatic)     base.pitch += 0.04;
    if (isShort)        base.rate  *= 1.02;
    if (urgent)         { base.rate *= 1.06; base.pitch -= 0.04; }
    // Arabic naturally needs a touch slower
    if (prefs.lang === 'ar') base.rate *= 0.96;
    // Clamp to safe ranges
    base.rate  = Math.max(0.5, Math.min(1.7, base.rate));
    base.pitch = Math.max(0.6, Math.min(1.5, base.pitch));
    return base;
}

// --- Sentence splitter for smooth multi-utterance playback ---
function splitForSpeech(text) {
    return String(text || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .match(/[^.!?؟]+[.!?؟]?/g) || [];
}

// --- Speaking state + UI sync ---
let speakingActive = false;
let activeSpeakingMessageEl = null;
function showSpeakingUI(target) {
    const pill = document.getElementById('speakingPill');
    if (pill) pill.classList.add('show');
    if (target) {
        target.classList.add('speaking');
        activeSpeakingMessageEl = target;
    }
}
function hideSpeakingUI() {
    const pill = document.getElementById('speakingPill');
    if (pill) pill.classList.remove('show');
    if (activeSpeakingMessageEl) {
        activeSpeakingMessageEl.classList.remove('speaking');
        activeSpeakingMessageEl = null;
    }
}
function stopSpeaking() {
    try { if (speech.supported) window.speechSynthesis.cancel(); } catch {}
    speakingActive = false;
    hideSpeakingUI();
}

// --- Public speak() — chunked queue, emotional, voice-aware, with visual feedback ---
const _origSpeak = speak;
speak = function(text, opts) {
    if (!prefs.voice || !speech.supported) return;
    const clean = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    try { window.speechSynthesis.cancel(); } catch {}
    speakingActive = true;
    const voice = pickVoice();
    const lang = voice ? voice.lang : (VOICE_LANG_CODE[prefs.lang] || 'en-US');
    const chunks = splitForSpeech(clean).slice(0, 14); // hard cap to avoid runaway speech
    if (chunks.length === 0) return;
    const target = (opts && opts.target) || null;
    showSpeakingUI(target);
    let idx = 0;
    function next() {
        if (!speakingActive || idx >= chunks.length) {
            hideSpeakingUI();
            speakingActive = false;
            return;
        }
        const piece = chunks[idx++];
        const mod = emotionAdjust(piece);
        const u = new SpeechSynthesisUtterance(piece.slice(0, 280));
        if (voice) { u.voice = voice; }
        u.lang = lang;
        u.rate = mod.rate;
        u.pitch = mod.pitch;
        u.volume = mod.volume;
        u.onend = () => setTimeout(next, 40);   // micro-pause for naturalness
        u.onerror = () => setTimeout(next, 40);
        try { window.speechSynthesis.speak(u); }
        catch { setTimeout(next, 40); }
    }
    next();
};

// --- Settings handlers ---
function setVoiceGender(g) {
    prefs.voiceGender = g;
    prefs.voiceId = ''; // gender change clears manual pick
    savePrefs();
    document.querySelectorAll('.voice-pick').forEach(b => b.classList.toggle('active', b.dataset.gender === g));
    populateVoiceSelect();
    refreshVoiceMeta();
    sfxPlay('click');
    if (prefs.voice) {
        const line = (VOICE_PREVIEW_LINE[prefs.lang] || VOICE_PREVIEW_LINE.ar)[g] ||
                     (VOICE_PREVIEW_LINE.en[g] || 'Voice changed.');
        speak(line);
    }
}
function setVoiceSpeed(v) {
    prefs.voiceSpeed = parseFloat(v) || 1;
    const lbl = document.getElementById('voiceSpeedValue');
    if (lbl) lbl.textContent = prefs.voiceSpeed.toFixed(2) + 'x';
    savePrefs();
}
function setVoiceEmotion(e) {
    prefs.voiceEmotion = e;
    savePrefs();
    document.querySelectorAll('.voice-emotion').forEach(b => b.classList.toggle('active', b.dataset.emotion === e));
    sfxPlay('hover');
    if (prefs.voice) {
        const line = (VOICE_PREVIEW_LINE[prefs.lang] || VOICE_PREVIEW_LINE.ar)[prefs.voiceGender] || 'Voice tone changed.';
        speak(line);
    }
}
function setVoiceById(id) {
    prefs.voiceId = id || '';
    savePrefs();
    refreshVoiceMeta();
    if (prefs.voice && id) {
        const line = (VOICE_PREVIEW_LINE[prefs.lang] || VOICE_PREVIEW_LINE.ar)[prefs.voiceGender] || '';
        if (line) speak(line);
    }
}

// --- Populate the voice picker dropdown for current language ---
function populateVoiceSelect() {
    const sel = document.getElementById('voiceSelect');
    if (!sel) return;
    refreshVoices();
    const ranked = getRankedVoices(prefs.lang).filter(r => r.lang === prefs.lang.slice(0, 2));
    const fallback = ranked.length ? ranked : getRankedVoices(prefs.lang).slice(0, 12);
    const tierLabel = { neural: '⭐ Neural', premium: '✨ Premium', standard: 'Standard' };
    const opts = [`<option value="">— تلقائي (أفضل صوت متاح) —</option>`];
    fallback.forEach(r => {
        const g = r.gender === 'male' ? '♂' : r.gender === 'female' ? '♀' : '·';
        opts.push(`<option value="${r.id}" ${r.id === prefs.voiceId ? 'selected' : ''}>${tierLabel[r.tier]} · ${g} · ${r.voice.name} (${r.voice.lang})</option>`);
    });
    sel.innerHTML = opts.join('');
}
function refreshVoiceMeta() {
    const v = pickVoice();
    const meta = document.getElementById('voiceMeta');
    const nameEl = document.getElementById('voiceMetaName');
    if (!meta || !v) return;
    const tier = voiceQualityTier(v);
    const badge = meta.querySelector('.voice-quality-badge');
    if (badge) {
        badge.className = 'voice-quality-badge ' + tier;
        badge.textContent = tier === 'neural' ? '⭐ Neural' : tier === 'premium' ? '✨ Premium' : 'Standard';
    }
    if (nameEl) nameEl.textContent = v.name + ' · ' + v.lang;
}
function previewVoice() {
    if (!speech.supported) { showToast('متصفّحك لا يدعم الصوت', 'heart-toast'); return; }
    if (!prefs.voice) { prefs.voice = true; savePrefs(); document.getElementById('opt-voice') && (document.getElementById('opt-voice').checked = true); }
    const btn = document.getElementById('voicePreviewBtn');
    const label = document.getElementById('voicePreviewLabel');
    if (btn) btn.classList.add('playing');
    if (label) label.textContent = 'يعمل...';
    const line = (VOICE_PREVIEW_LINE[prefs.lang] || VOICE_PREVIEW_LINE.ar)[prefs.voiceGender] ||
                 (VOICE_PREVIEW_LINE.en[prefs.voiceGender] || 'Hello.');
    speak(line);
    // Reset UI after expected duration
    setTimeout(() => {
        if (btn) btn.classList.remove('playing');
        if (label) label.textContent = 'جرّب الصوت';
    }, Math.min(6000, Math.max(2500, line.length * 70)));
}

// Voices populate asynchronously in some browsers — listen and refresh UI.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        refreshVoices();
        populateVoiceSelect();
        refreshVoiceMeta();
    };
    refreshVoices();
}
// Also refresh when language changes
const _origSetLang_v2 = setLang;
setLang = function(code) {
    _origSetLang_v2(code);
    setTimeout(() => { populateVoiceSelect(); refreshVoiceMeta(); }, 50);
};

// ===========================================================================
// ==================== SPACE FX — Parallax, Burst, Pull ====================
// ===========================================================================

const SPACE_FX = {
    map: null,
    stars: { deep: [], mid: [], near: [] },
    nebulae: [],
    orbs: [],
    mouse: { x: 0, y: 0, prevX: 0, prevY: 0, speed: 0, lastTs: 0 },
    raf: 0,
    layers: {}
};

async function loadStarMap() {
    try {
        const res = await fetch('star_map.json', { cache: 'force-cache' });
        if (!res.ok) throw new Error('no map');
        SPACE_FX.map = await res.json();
        return SPACE_FX.map;
    } catch {
        // Embedded minimal fallback so FX still work offline.
        SPACE_FX.map = {
            stars: Array.from({ length: 90 }, () => ({
                x: Math.random(), y: Math.random(),
                size: 0.7 + Math.random() * 1.6,
                depth: Math.floor(Math.random() * 3),
                speed: 0.04 + Math.random() * 0.18,
                color: 'rgba(255,255,255,0.85)',
                twinkle_offset: Math.random() * 6.28,
                twinkle_period: 2.5 + Math.random() * 3.5
            })),
            nebulae: Array.from({ length: 6 }, () => ({
                x: Math.random(), y: Math.random(),
                radius_vw: 30 + Math.random() * 35,
                color: ['rgba(0,132,255,0.10)', 'rgba(157,78,221,0.10)', 'rgba(0,245,212,0.08)'][Math.floor(Math.random() * 3)],
                drift_period: 60 + Math.random() * 80,
                drift_amp: 0.05 + Math.random() * 0.08,
                phase: Math.random() * 6.28
            })),
            neon_orbs: Array.from({ length: 8 }, (_, i) => ({
                cx: Math.random(), cy: Math.random(),
                rx_vw: 10 + Math.random() * 18, ry_vh: 8 + Math.random() * 14,
                period: 50 + Math.random() * 80, phase: Math.random() * 6.28,
                size: 5 + Math.random() * 6,
                color: ['#00d4ff', '#9d4edd', '#00f5d4', '#ffd700'][i % 4],
                glow: 0.5 + Math.random() * 0.4
            }))
        };
        return SPACE_FX.map;
    }
}

function buildSpaceFxDom() {
    const layers = {
        deep: document.getElementById('fx-deep'),
        mid:  document.getElementById('fx-mid'),
        near: document.getElementById('fx-near'),
        nebulae: document.getElementById('fx-nebulae'),
        orbs: document.getElementById('fx-orbs')
    };
    SPACE_FX.layers = layers;
    if (!SPACE_FX.map) return;

    // Stars across 3 depth layers
    const buckets = [[], [], []];
    SPACE_FX.map.stars.forEach(s => buckets[s.depth].push(s));
    [['deep', 0], ['mid', 1], ['near', 2]].forEach(([key, idx]) => {
        const host = layers[key];
        if (!host) return;
        host.innerHTML = '';
        const frag = document.createDocumentFragment();
        buckets[idx].forEach(s => {
            const el = document.createElement('div');
            el.className = 'fx-star';
            el.style.left = (s.x * 100) + 'vw';
            el.style.top  = (s.y * 100) + 'vh';
            el.style.width  = s.size + 'px';
            el.style.height = s.size + 'px';
            el.style.background = s.color;
            el.style.boxShadow = '0 0 ' + Math.round(s.size * 3) + 'px ' + s.color;
            el.dataset.tw0 = s.twinkle_offset;
            el.dataset.twp = s.twinkle_period;
            frag.appendChild(el);
            SPACE_FX.stars[key].push({ el, speed: s.speed, tw0: s.twinkle_offset, twp: s.twinkle_period });
        });
        host.appendChild(frag);
    });

    // Nebulae
    if (layers.nebulae) {
        layers.nebulae.innerHTML = '';
        const frag = document.createDocumentFragment();
        SPACE_FX.map.nebulae.forEach(n => {
            const el = document.createElement('div');
            el.className = 'fx-nebula';
            const r = n.radius_vw;
            el.style.width = r + 'vw';
            el.style.height = r + 'vw';
            el.style.left = (n.x * 100) + 'vw';
            el.style.top  = (n.y * 100) + 'vh';
            el.style.marginLeft = (-r / 2) + 'vw';
            el.style.marginTop  = (-r / 2) + 'vw';
            el.style.background = 'radial-gradient(circle, ' + n.color + ' 0%, transparent 70%)';
            frag.appendChild(el);
            SPACE_FX.nebulae.push({ el, baseX: n.x, baseY: n.y, amp: n.drift_amp, period: n.drift_period, phase: n.phase });
        });
        layers.nebulae.appendChild(frag);
    }

    // Neon orbs
    if (layers.orbs) {
        layers.orbs.innerHTML = '';
        const frag = document.createDocumentFragment();
        SPACE_FX.map.neon_orbs.forEach(o => {
            const el = document.createElement('div');
            el.className = 'fx-orb';
            el.style.width  = o.size + 'px';
            el.style.height = o.size + 'px';
            el.style.background = 'radial-gradient(circle at 35% 35%, #fff 0%, ' + o.color + ' 45%, transparent 80%)';
            el.style.boxShadow = '0 0 ' + Math.round(o.size * 3) + 'px ' + o.color + ', inset 0 0 ' + Math.round(o.size) + 'px rgba(255,255,255,0.3)';
            el.style.opacity = String(o.glow);
            frag.appendChild(el);
            SPACE_FX.orbs.push({ el, cx: o.cx, cy: o.cy, rx: o.rx_vw, ry: o.ry_vh, period: o.period, phase: o.phase });
        });
        layers.orbs.appendChild(frag);
    }
}

function startSpaceFxLoop() {
    cancelAnimationFrame(SPACE_FX.raf);
    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    const cx = () => window.innerWidth / 2;
    const cy = () => window.innerHeight / 2;

    function tick(ts) {
        // Calm mode: stop the loop here (no rescheduling). AUS_FX → syncSpaceFx() → SPACE_FX.resume() restarts it.
        if (window.__AUS_FX_ON === false) { SPACE_FX.raf = 0; return; }
        const t = ts * 0.001;
        const m = SPACE_FX.mouse;
        const dxN = (m.x - cx()) / cx();  // -1..1
        const dyN = (m.y - cy()) / cy();
        // Parallax for stars (transform translate per depth speed)
        const layers = SPACE_FX.layers;
        if (layers.deep) layers.deep.style.transform = `translate3d(${dxN * -6}px, ${dyN * -6}px, 0)`;
        if (layers.mid)  layers.mid.style.transform  = `translate3d(${dxN * -14}px, ${dyN * -14}px, 0)`;
        if (layers.near) layers.near.style.transform = `translate3d(${dxN * -28}px, ${dyN * -28}px, 0)`;
        if (layers.nebulae) layers.nebulae.style.transform = `translate3d(${dxN * -22}px, ${dyN * -22}px, 0)`;

        // Twinkle near-layer stars only (cheap subset)
        const nearStars = SPACE_FX.stars.near;
        for (let i = 0; i < nearStars.length; i++) {
            const s = nearStars[i];
            const tw = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((t + s.tw0) * (6.28 / s.twp)));
            s.el.style.opacity = tw.toFixed(2);
        }
        // Nebula drift
        const W = vw(), H = vh();
        SPACE_FX.nebulae.forEach(n => {
            const dx = Math.sin((t / n.period) * 6.28 + n.phase) * n.amp;
            const dy = Math.cos((t / n.period) * 6.28 + n.phase) * n.amp;
            n.el.style.transform = `translate3d(${dx * W}px, ${dy * H}px, 0)`;
        });
        // Neon orb orbits
        SPACE_FX.orbs.forEach(o => {
            const angle = (t / o.period) * 6.28 + o.phase;
            const ox = (o.cx + (o.rx / 100) * Math.cos(angle)) * W;
            const oy = (o.cy + (o.ry / 100) * Math.sin(angle)) * H;
            o.el.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
        });

        // Speed-reactive cursor halo (scale based on speed)
        const halo = document.getElementById('cursor-halo');
        if (halo) {
            const targetScale = Math.max(0.55, Math.min(1.8, 0.65 + m.speed * 0.018));
            // smooth toward target
            const curr = parseFloat(halo.style.getPropertyValue('--halo-scale')) || 1;
            const nextScale = curr + (targetScale - curr) * 0.18;
            halo.style.setProperty('--halo-scale', nextScale.toFixed(3));
            halo.style.setProperty('--mx', m.x + 'px');
            halo.style.setProperty('--my', m.y + 'px');
        }

        // Magnetic pull for buttons within proximity
        if (prefs.fx && !prefs.reduceMotion) {
            const RADIUS = 120, STRENGTH = 0.22;
            document.querySelectorAll('.btn-primary, .splash-btn, .pf-buy-btn, .pf-owned-btn, .nav-tab, .send-btn').forEach(btn => {
                if (!btn.isConnected) return;
                const r = btn.getBoundingClientRect();
                const bx = r.left + r.width / 2;
                const by = r.top + r.height / 2;
                const dx = m.x - bx;
                const dy = m.y - by;
                const dist = Math.hypot(dx, dy);
                if (dist < RADIUS) {
                    btn.classList.add('magnetic-pull');
                    const pull = (1 - dist / RADIUS) * STRENGTH;
                    btn.style.transform = `translate3d(${dx * pull}px, ${dy * pull}px, 0)`;
                } else if (btn.style.transform) {
                    btn.style.transform = '';
                }
            });
        }

        SPACE_FX.raf = requestAnimationFrame(tick);
    }
    SPACE_FX.resume = function () { if (!SPACE_FX.raf) SPACE_FX.raf = requestAnimationFrame(tick); };
    SPACE_FX.raf = requestAnimationFrame(tick);

    // Mouse tracking with speed calculation
    window.addEventListener('pointermove', (e) => {
        const now = performance.now();
        const dt = Math.max(1, now - (SPACE_FX.mouse.lastTs || now));
        const dx = e.clientX - SPACE_FX.mouse.x;
        const dy = e.clientY - SPACE_FX.mouse.y;
        SPACE_FX.mouse.speed = Math.hypot(dx, dy) / dt * 16; // px per frame approx
        SPACE_FX.mouse.prevX = SPACE_FX.mouse.x;
        SPACE_FX.mouse.prevY = SPACE_FX.mouse.y;
        SPACE_FX.mouse.x = e.clientX;
        SPACE_FX.mouse.y = e.clientY;
        SPACE_FX.mouse.lastTs = now;
    }, { passive: true });

    // Speed decays when stationary
    setInterval(() => { SPACE_FX.mouse.speed *= 0.7; }, 80);
}

// --- Energy burst on click — replaces simple ripple with radial particle blast ---
function initEnergyBurst() {
    window.addEventListener('pointerdown', (e) => {
        if (!prefs.fx || prefs.reduceMotion) return;
        if (e.target.closest('input, textarea, #settings-drawer .switch')) return;
        spawnEnergyBurst(e.clientX, e.clientY);
    }, { passive: true });
}
function spawnEnergyBurst(x, y) {
    const wrap = document.createElement('div');
    wrap.className = 'energy-burst';
    wrap.style.left = x + 'px';
    wrap.style.top = y + 'px';
    // Outer expanding ring
    const ring = document.createElement('div');
    ring.className = 'eb-ring';
    wrap.appendChild(ring);
    // Radial particles
    const N = 10;
    for (let i = 0; i < N; i++) {
        const p = document.createElement('div');
        p.className = 'eb-particle';
        const angle = (i / N) * Math.PI * 2;
        const dist = 60 + Math.random() * 50;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const dur = 600 + Math.random() * 250;
        p.animate(
            [
                { transform: 'translate(-50%, -50%)', opacity: 1 },
                { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.3)`, opacity: 0 }
            ],
            { duration: dur, easing: 'cubic-bezier(0.1, 0.7, 0.2, 1)', fill: 'forwards' }
        );
        wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 800);
}

// --- Holographic shimmer — re-applies as new interactive elements mount ---
const HOLO_SELECTORS = '.card, .tool-item, .premium-file, .kpi-tile, .btn-primary, .splash-btn, .pf-buy-btn, .pf-owned-btn, .pay-method, .seg-btn, .accent-dot, .premium-tab';
let _holoObserver = null;
function applyHoloShimmer() {
    document.querySelectorAll(HOLO_SELECTORS).forEach(el => {
        if (!el.classList.contains('holo-shimmer-target')) el.classList.add('holo-shimmer-target');
    });
    if (_holoObserver) return;
    _holoObserver = new MutationObserver((muts) => {
        let dirty = false;
        muts.forEach(m => m.addedNodes && m.addedNodes.forEach(n => { if (n.nodeType === 1) dirty = true; }));
        if (dirty) {
            document.querySelectorAll(HOLO_SELECTORS).forEach(el => {
                if (!el.classList.contains('holo-shimmer-target')) el.classList.add('holo-shimmer-target');
            });
        }
    });
    _holoObserver.observe(document.body, { childList: true, subtree: true });
}

// --- Cinematic section transition — fade-blur on section activate ---
function applyCineEnter() {
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.section.active').forEach(s => {
            if (s.classList.contains('cine-enter')) return;
            s.classList.add('cine-enter');
            // remove after animation so it re-triggers next time
            setTimeout(() => s.classList.remove('cine-enter'), 1100);
        });
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
}

// FX switch hook (aus_45_fx_mode.js): pause the parallax/nebula/orb loop in calm mode, resume it when FX come back.
function syncSpaceFx() {
    if (window.__AUS_FX_ON === false) {
        if (SPACE_FX.raf) { cancelAnimationFrame(SPACE_FX.raf); SPACE_FX.raf = 0; }
    } else if (SPACE_FX.resume) {
        SPACE_FX.resume();
    }
}

// --- Init the entire space FX pipeline ---
// Builds once. Calm mode builds nothing; AUS_FX.set(true) calls this again, which then builds (first time) or resumes.
async function initSpaceFx() {
    if (prefs.reduceMotion) return;
    if (window.__AUS_FX_ON === false || SPACE_FX.ready) { syncSpaceFx(); return; }
    SPACE_FX.ready = true;
    await loadStarMap();
    buildSpaceFxDom();
    startSpaceFxLoop();
    initEnergyBurst();
    applyHoloShimmer();
    applyCineEnter();
    // Hide old single CursorTrail particle spawner since we now have full FX layer
    // (keep the click-ripple as energy-burst already replaces visually)
}

// Boot Space FX shortly after the rest of the app is initialized.
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { try { initSpaceFx(); } catch (e) { console.warn('space fx', e); } }, 300);
});

// --- Push-to-talk mic (SpeechRecognition) ---
let recog = null;
let recogActive = false;
function ensureRecog() {
    if (recog) return recog;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    recog = new SR();
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;
    recog.lang = prefs.lang === 'ar' ? 'ar-SA' : prefs.lang === 'de' ? 'de-DE' : prefs.lang === 'fr' ? 'fr-FR' : prefs.lang === 'es' ? 'es-ES' : 'en-US';
    recog.onresult = (e) => {
        const last = e.results[e.results.length - 1];
        const transcript = last[0].transcript;
        const input = document.getElementById('chatInput');
        if (input) input.value = transcript;
        if (last.isFinal) {
            recogActive = false;
            const btn = document.getElementById('micBtn');
            if (btn) btn.classList.remove('recording');
            setTimeout(() => { if (transcript.trim()) sendMessage(); }, 250);
        }
    };
    recog.onerror = () => {
        recogActive = false;
        const btn = document.getElementById('micBtn');
        if (btn) btn.classList.remove('recording');
    };
    recog.onend = () => {
        recogActive = false;
        const btn = document.getElementById('micBtn');
        if (btn) btn.classList.remove('recording');
    };
    return recog;
}
function toggleMic() {
    const r = ensureRecog();
    if (!r) {
        showToast('متصفّحك لا يدعم التعرّف الصوتي', 'heart-toast');
        return;
    }
    const btn = document.getElementById('micBtn');
    if (recogActive) {
        try { r.stop(); } catch {}
        recogActive = false;
        if (btn) btn.classList.remove('recording');
    } else {
        try {
            r.lang = prefs.lang === 'ar' ? 'ar-SA' : prefs.lang === 'de' ? 'de-DE' : prefs.lang === 'fr' ? 'fr-FR' : prefs.lang === 'es' ? 'es-ES' : prefs.lang === 'tr' ? 'tr-TR' : prefs.lang === 'ja' ? 'ja-JP' : prefs.lang === 'zh' ? 'zh-CN' : prefs.lang === 'ko' ? 'ko-KR' : prefs.lang === 'ru' ? 'ru-RU' : prefs.lang === 'it' ? 'it-IT' : 'en-US';
            r.start();
            recogActive = true;
            if (btn) btn.classList.add('recording');
            sfxPlay('click');
        } catch (e) {
            showToast('فشل تشغيل الميكروفون', 'heart-toast');
        }
    }
}

// --- Typing-animation streaming for AI responses ---
function streamInto(el, html, cb, opts = {}) {
    // Token-by-token reveal of HTML content with a blinking caret at the cursor.
    const speedMs = opts.speedMs || 14;        // ms per char inside text
    const chunkSize = opts.chunkSize || 2;     // chars per tick
    let i = 0;
    let buffer = '';
    let inTag = false;
    const caret = '<span class="ai-typing-cursor"></span>';
    function tick() {
        if (i >= html.length) {
            el.innerHTML = buffer;
            cb && cb();
            return;
        }
        let n = 0;
        while (i < html.length && n < chunkSize) {
            const c = html[i++];
            buffer += c;
            if (c === '<') inTag = true;
            else if (c === '>') inTag = false;
            if (!inTag) n++;
        }
        el.innerHTML = buffer + caret;
        // auto-scroll
        const chat = document.getElementById('chatMessages');
        if (chat) chat.scrollTop = chat.scrollHeight;
        setTimeout(tick, prefs.reduceMotion ? 0 : speedMs);
    }
    tick();
}

// --- Smart suggestion chips based on last AI reply ---
function smartSuggestions() {
    const langChips = {
        ar: ['اعطني مثالاً واقعياً', 'كيف أطبقه في شركتي؟', 'ما هي المخاطر؟', 'ما العلاقة بـ AI؟', 'اقترح خطة 30 يوماً'],
        en: ['Give a real example', 'How do I apply it?', 'What are the risks?', 'AI angle?', 'Suggest a 30-day plan'],
        de: ['Beispiel?', 'Wie anwenden?', 'Welche Risiken?', 'KI-Aspekt?', '30-Tage-Plan'],
        fr: ['Un exemple ?', 'Comment appliquer ?', 'Quels risques ?', 'Côté IA ?', 'Plan 30 jours'],
        es: ['Un ejemplo', 'Cómo aplicarlo', 'Riesgos', 'Ángulo IA', 'Plan 30 días'],
        tr: ['Örnek ver', 'Nasıl uygulanır?', 'Riskler nedir?', 'YZ açısı?', '30 günlük plan'],
        ja: ['例を教えて', 'どう適用する?', 'リスクは?', 'AIの観点', '30日計画'],
        zh: ['给个例子', '如何应用?', '风险有哪些?', 'AI 角度?', '30 天计划'],
        ko: ['예시', '어떻게 적용?', '위험은?', 'AI 관점', '30일 계획'],
        ru: ['Пример', 'Как применить?', 'Риски', 'Угол AI', 'План 30 дней'],
        it: ['Un esempio', 'Come applicarlo?', 'Rischi?', 'AI?', 'Piano 30 giorni']
    };
    const opts = langChips[prefs.lang] || langChips.ar;
    return opts.sort(() => Math.random() - 0.5).slice(0, 3);
}

// --- Override sendMessage with streaming + actions + smart chips ---
sendMessage = function() {
    const input = document.getElementById('chatInput');
    const message = (input && input.value || '').trim();
    if (!message) return;
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // user bubble
    chatMessages.insertAdjacentHTML('beforeend',
        `<div class="message user">${message.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]))}</div>`);
    input.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    sfxPlay('click');

    // Typing indicator
    const typingId = 't' + Date.now();
    chatMessages.insertAdjacentHTML('beforeend',
        `<div class="message ai" id="${typingId}-host"><div class="ai-meta"><span class="ai-avatar">🧠</span>CEO · AI</div><div id="${typingId}"><div class="ai-typing-dots"><span></span><span></span><span></span></div></div></div>`);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const responseLen = Math.min(message.length, 80);
    const thinkMs = Math.min(1400, 400 + responseLen * 8);

    setTimeout(() => {
        const response = generateAIResponse(message);
        const body = response.text;
        const refs = `<div class="references">📚 المراجع: ${response.references.join(' • ')}</div>`;
        const target = document.getElementById(typingId);
        if (!target) return;
        target.innerHTML = '';
        const renderActions = (clean) => {
            const sug = smartSuggestions();
            const sugHtml = `<div class="smart-suggestions">${sug.map(s => `<span class="smart-suggestion" onclick="askQuestion('${s.replace(/'/g, '\\\'')}')">${s}</span>`).join('')}</div>`;
            const acts = `<div class="ai-actions">
                <button class="ai-action-btn" onclick="copyAiText(this)" title="نسخ"><i class="fas fa-copy"></i> نسخ</button>
                <button class="ai-action-btn" onclick="speakAiText(this)" title="تشغيل صوتي"><i class="fas fa-volume-up"></i> استمع</button>
                <button class="ai-action-btn" onclick="regenAiText('${message.replace(/'/g, '\\\'')}', this)" title="إعادة توليد"><i class="fas fa-redo"></i> إعادة</button>
                <button class="ai-action-btn" onclick="thumbsAi(this, '+')" title="إعجاب"><i class="fas fa-thumbs-up"></i></button>
                <button class="ai-action-btn" onclick="thumbsAi(this, '-')" title="غير مناسب"><i class="fas fa-thumbs-down"></i></button>
            </div>`;
            target.innerHTML = clean + refs + acts + sugHtml;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Speak after streaming completes
            const dom = document.createElement('div'); dom.innerHTML = body;
            speak((dom.textContent || '').slice(0, 600));
        };
        streamInto(target, body, () => renderActions(body));
    }, thinkMs);
};

// --- AI action handlers ---
function copyAiText(btn) {
    const root = btn.closest('.message.ai');
    if (!root) return;
    const clone = root.cloneNode(true);
    clone.querySelectorAll('.references, .ai-actions, .smart-suggestions, .ai-meta').forEach(n => n.remove());
    const text = (clone.textContent || '').trim();
    try { navigator.clipboard.writeText(text); } catch {}
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
    sfxPlay('confirm');
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i class="fas fa-copy"></i> نسخ'; }, 1500);
}
function speakAiText(btn) {
    const root = btn.closest('.message.ai');
    if (!root) return;
    const clone = root.cloneNode(true);
    clone.querySelectorAll('.references, .ai-actions, .smart-suggestions, .ai-meta, .agent-trace').forEach(n => n.remove());
    const text = (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1400);
    if (!text) return;

    // Button animation feedback
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-volume-up" style="color:var(--primary)"></i>';
    btn.disabled = true;

    const wasVoice = prefs.voice;
    prefs.voice = true;

    // Use full pipeline (backend → browser fallback) via window.AUSVoice if available
    if (window.AUSVoice && typeof window.AUSVoice.speak === 'function') {
        window.AUSVoice.speak(text);
    } else {
        speak(text);
    }

    prefs.voice = wasVoice;
    sfxPlay('click');

    // Restore button after estimated duration (or fixed 4s)
    setTimeout(() => { btn.innerHTML = origHTML; btn.disabled = false; }, 4000);
}
function regenAiText(originalMsg, btn) {
    const input = document.getElementById('chatInput');
    if (input) input.value = originalMsg;
    sendMessage();
    sfxPlay('click');
}
function thumbsAi(btn, sign) {
    btn.style.color = sign === '+' ? 'var(--success)' : 'var(--danger)';
    sfxPlay(sign === '+' ? 'confirm' : 'error');
}

// --- Cursor trail particles ---
let lastTrailAt = 0;
function initCursorTrail() {
    window.addEventListener('pointermove', (e) => {
        if (!prefs.fx || prefs.reduceMotion) return;
        const now = performance.now();
        if (now - lastTrailAt < 35) return;
        lastTrailAt = now;
        const p = document.createElement('span');
        p.className = 'cursor-particle';
        p.style.left = e.clientX + 'px';
        p.style.top = e.clientY + 'px';
        p.style.width = p.style.height = (2 + Math.random() * 6) + 'px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 900);
    }, { passive: true });
}

// --- Click ripple ---
function initClickRipple() {
    window.addEventListener('pointerdown', (e) => {
        if (!prefs.fx || prefs.reduceMotion) return;
        if (e.target.closest('input, textarea, #settings-drawer .switch')) return;
        const r = document.createElement('span');
        r.className = 'click-ripple';
        r.style.left = e.clientX + 'px';
        r.style.top = e.clientY + 'px';
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 650);
    }, { passive: true });
}

// --- Holographic button cursor tracking ---
function initButtonGlow() {
    const sel = '.btn-primary, .splash-btn, .learn-start-btn, .next-btn, .send-btn, .nav-tab, #settings-fab';
    document.body.addEventListener('pointermove', (e) => {
        if (!prefs.fx || prefs.reduceMotion) return;
        const t = e.target.closest(sel);
        if (!t) return;
        const r = t.getBoundingClientRect();
        t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    }, { passive: true });
}

// --- Bind voice settings UI to prefs on boot ---
function applyVoicePrefsToUi() {
    document.querySelectorAll('.voice-pick').forEach(b => b.classList.toggle('active', b.dataset.gender === (prefs.voiceGender || 'female')));
    const s = document.getElementById('voiceSpeed');
    if (s) s.value = prefs.voiceSpeed || 1;
    const lbl = document.getElementById('voiceSpeedValue');
    if (lbl) lbl.textContent = (prefs.voiceSpeed || 1).toFixed(2) + 'x';
}

// --- Wire on next animation frame; each init isolated so one failure can't kill the rest. ---
requestAnimationFrame(() => {
    try { initCursorTrail(); } catch (e) { console.warn('initCursorTrail', e); }
    try { initClickRipple(); } catch (e) { console.warn('initClickRipple', e); }
    try { initButtonGlow(); }  catch (e) { console.warn('initButtonGlow', e); }
    try { applyVoicePrefsToUi(); } catch (e) { console.warn('applyVoicePrefsToUi', e); }
    // initOrbs() disabled — holo-orbs removed per user request
});

// loadChatMemory() and applyFullI18n() live in aus_04_conversational.js, which
// loads AFTER this file. When the core was a single file, function hoisting made
// them available to the rAF init above. Split across separate <script> files, a
// paint can fire the rAF before aus_04 has downloaded, so we defer these two
// cross-module calls until the DOM has fully parsed (all end-of-body scripts run).
(function _ausDeferCrossModuleInit() {
    function run() {
        try { loadChatMemory(); } catch (e) { console.warn('loadChatMemory', e); }
        try { applyFullI18n(); } catch (e) { console.warn('applyFullI18n', e); }
    }
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', run);
    else setTimeout(run, 0);
})();

