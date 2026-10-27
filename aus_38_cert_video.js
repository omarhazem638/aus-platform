// =============================================================================
// aus_38_cert_video.js  —  Animated narrated "explainer video" for a tool
// Not an exported video file — an in-browser presentation: real speech
// narration (Web Speech API) + an animated, colour-shifting canvas background
// + the big AUS gradient wordmark centered, matching the existing cinematic
// intro's exact visual language (.intro-logo / .intro-letter).
// Attaches to the certification learn page for every tool automatically.
// =============================================================================

(function () {
'use strict';

var C = window._AUS_CERT_CORE;
if (!C) { console.error('[AUS Cert Video] core module missing'); return; }

var _v = { playing: false, seg: 0, segs: [], raf: null, particles: [], theme: null };

// ── Segment script — built from the SAME tool.learn data already used
//    throughout the cert system, so every one of the 70 tools works with
//    zero extra authoring. ───────────────────────────────────────────────
function _buildSegments(tool) {
    var segs = [
        { icon:'📖', label:'التعريف', theme:['#7b2fff','#00d4ff'], text:'ما هي ' + tool.name + '؟ ' + tool.learn.intro },
        { icon:'🔑', label:'المكونات الأساسية', theme:['#00d4ff','#00f5a0'], text:'أهم مكونات ومفاهيم ' + tool.name + ': ' + tool.learn.points.join('. ثم، ') },
        { icon:'🎯', label:'متى تُستخدم', theme:['#00f5a0','#d4af37'], text:'متى تستخدم ' + tool.name + '؟ ' + tool.learn.useCase },
        { icon:'💡', label:'كيف تستفيد منها', theme:['#d4af37','#ff9500'], text:'أبرز فوائد تطبيق ' + tool.name + ': ' + tool.learn.benefits.join('. كذلك، ') },
        { icon:'⚠️', label:'خطأ شائع تجنّبه', theme:['#ff9500','#ff4d6d'], text:'احذر من هذا الخطأ الشائع عند تطبيق ' + tool.name + ': ' + tool.learn.pitfall },
        { icon:'🏢', label:'مثال واقعي', theme:['#ff4d6d','#7b2fff'], text:'مثال من أرض الواقع: ' + tool.learn.example }
    ];
    return segs;
}

// ── Speech narration (Arabic, Web Speech API — the same reliable path used
//    everywhere else in this app; no dependency on the AI backend). ────────
function _arVoice() {
    var vs = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    return vs.find(function (v) { return v.lang === 'ar-SA'; }) ||
           vs.find(function (v) { return v.lang && v.lang.indexOf('ar') === 0; }) ||
           vs.find(function (v) { return /ar/i.test(v.name); }) || null;
}
// Monotonic token — cancel()ing an utterance can still fire its onend/onerror
// in some browsers. Without this guard, a manual "next" click while narration
// is mid-sentence could let the stale callback fire too and auto-advance a
// second time, silently skipping a segment.
var _speakToken = 0;
function _speak(text, onEnd) {
    var myToken = ++_speakToken;
    function finish() { if (myToken === _speakToken) onEnd && onEnd(); }
    if (!window.speechSynthesis) { setTimeout(finish, 3500); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.95; u.pitch = 1.0;
    var v = _arVoice();
    if (v) u.voice = v;
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
}

// ── Animated background — continuous drifting particles + a smooth colour
//    theme transition between the current segment's two-tone gradient.
//    Setup (context, resize listener, particle seeding) happens ONCE per
//    video open via _setupCanvas; _startCanvas/_stopCanvas only toggle the
//    animation loop so repeated pause/resume never re-adds a resize
//    listener or leaks one when the player closes. ─────────────────────────
var _canvas = null; // { ctx, w, h, resizeHandler }

function _setupCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    var state = { ctx: ctx, w: 0, h: 0 };
    state.resizeHandler = function () { state.w = canvas.width = canvas.offsetWidth; state.h = canvas.height = canvas.offsetHeight; };
    state.resizeHandler();
    window.addEventListener('resize', state.resizeHandler);
    _canvas = state;

    _v.particles = Array.from({ length: 70 }, function () {
        return { x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.4, vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006, a: 0.2 + Math.random() * 0.5 };
    });
}
function _teardownCanvas() {
    if (_canvas) window.removeEventListener('resize', _canvas.resizeHandler);
    _canvas = null;
}

function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerp(a, b, t) { return a + (b - a) * t; }

var _animT0 = Date.now();
function _frame() {
    if (!_v.playing || !_canvas) { _v.raf = null; return; }
    var ctx = _canvas.ctx, w = _canvas.w, h = _canvas.h;
    ctx.clearRect(0, 0, w, h);
    var theme = _v.theme || ['#7b2fff', '#00d4ff'];
    var c1 = hexToRgb(theme[0]), c2 = hexToRgb(theme[1]);
    var elapsed = (Date.now() - _animT0) / 1000;

    // Soft pulsing radial glow behind the logo — this is the "changing background"
    var pulse = 0.5 + Math.sin(elapsed * 0.8) * 0.5;
    var grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h) * 0.55);
    grad.addColorStop(0, 'rgba(' + c1.join(',') + ',' + (0.16 + pulse*0.08) + ')');
    grad.addColorStop(0.6, 'rgba(' + c2.join(',') + ',0.05)');
    grad.addColorStop(1, 'rgba(3,2,9,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    _v.particles.forEach(function (p, i) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        var mix = (Math.sin(elapsed * 0.3 + i) + 1) / 2;
        var col = [lerp(c1[0],c2[0],mix), lerp(c1[1],c2[1],mix), lerp(c1[2],c2[2],mix)];
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + col.map(Math.round).join(',') + ',' + p.a + ')';
        ctx.fill();
    });
    _v.raf = requestAnimationFrame(_frame);
}
function _startCanvas() { if (!_v.raf) _frame(); }
function _stopCanvas() { if (_v.raf) cancelAnimationFrame(_v.raf); _v.raf = null; }

// ── Player UI ────────────────────────────────────────────────────────────
function _renderPlayer(tool) {
    var overlay = document.createElement('div');
    overlay.id = 'cert-video-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#030209;z-index:20000;display:flex;flex-direction:column;overflow:hidden;font-family:"Tajawal",sans-serif';
    overlay.innerHTML =
        '<canvas id="cert-video-canvas" style="position:absolute;inset:0;width:100%;height:100%"></canvas>' +
        '<button id="cert-video-close" style="position:absolute;top:20px;left:20px;z-index:5;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.1rem">✕</button>' +
        '<div style="position:absolute;top:20px;right:20px;z-index:5;background:rgba(0,12,30,.55);border:1px solid rgba(212,175,55,.3);border-radius:20px;padding:6px 16px;color:#d4af37;font-size:.75rem;font-weight:700">' + tool.icon + ' ' + tool.name + '</div>' +
        '<div style="position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px">' +
            '<div class="intro-logo" id="cert-video-logo" style="font-size:clamp(2.6rem,9vw,5.5rem);margin-bottom:18px">' +
                '<span class="intro-letter" style="opacity:1;animation:none;transform:none;filter:none">A</span>' +
                '<span class="intro-letter" style="opacity:1;animation:none;transform:none;filter:none">U</span>' +
                '<span class="intro-letter" style="opacity:1;animation:none;transform:none;filter:none">S</span>' +
            '</div>' +
            '<div id="cert-video-seglabel" style="font-size:.85rem;letter-spacing:.15em;color:rgba(255,255,255,.5);margin-bottom:14px;text-transform:uppercase"></div>' +
            '<div id="cert-video-caption" style="max-width:720px;text-align:center;font-size:clamp(1rem,2.4vw,1.4rem);line-height:2;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,.6);padding:0 20px;min-height:120px"></div>' +
        '</div>' +
        '<div style="position:relative;z-index:5;padding:18px 24px 28px;max-width:600px;margin:0 auto;width:100%;box-sizing:border-box">' +
            '<div id="cert-video-dots" style="display:flex;gap:6px;justify-content:center;margin-bottom:14px"></div>' +
            '<div style="display:flex;align-items:center;gap:14px;justify-content:center">' +
                '<button id="cert-video-prev" class="cert-video-ctrl">⏮</button>' +
                '<button id="cert-video-playpause" class="cert-video-ctrl big">⏸</button>' +
                '<button id="cert-video-next" class="cert-video-ctrl">⏭</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(overlay);

    if (!document.getElementById('cert-video-styles')) {
        var s = document.createElement('style');
        s.id = 'cert-video-styles';
        s.textContent = '.cert-video-ctrl{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:1rem}' +
            '.cert-video-ctrl.big{width:56px;height:56px;font-size:1.3rem;background:rgba(212,175,55,.15);border-color:rgba(212,175,55,.45);color:#d4af37}' +
            '.cert-video-dot{width:26px;height:4px;border-radius:2px;background:rgba(255,255,255,.15);transition:background .3s}' +
            '.cert-video-dot.done{background:#d4af37}.cert-video-dot.current{background:#00d4ff}';
        document.head.appendChild(s);
    }

    _setupCanvas(document.getElementById('cert-video-canvas'));
    _startCanvas();

    document.getElementById('cert-video-close').onclick = _closeVideo;
    document.getElementById('cert-video-playpause').onclick = _togglePlay;
    document.getElementById('cert-video-next').onclick = function () { _goToSegment(_v.seg + 1); };
    document.getElementById('cert-video-prev').onclick = function () { _goToSegment(_v.seg - 1); };
}

function _renderDots() {
    var wrap = document.getElementById('cert-video-dots');
    if (!wrap) return;
    wrap.innerHTML = _v.segs.map(function (_, i) {
        return '<div class="cert-video-dot' + (i < _v.seg ? ' done' : i === _v.seg ? ' current' : '') + '"></div>';
    }).join('');
}

function _goToSegment(idx) {
    if (idx < 0 || idx >= _v.segs.length) { if (idx >= _v.segs.length) _closeVideo(); return; }
    _v.seg = idx;
    var seg = _v.segs[idx];
    _v.theme = seg.theme;
    var lbl = document.getElementById('cert-video-seglabel');
    var cap = document.getElementById('cert-video-caption');
    if (lbl) lbl.textContent = seg.icon + ' ' + seg.label + ' — ' + (idx + 1) + ' / ' + _v.segs.length;
    if (cap) { cap.style.opacity = 0; cap.textContent = seg.text; requestAnimationFrame(function () { cap.style.transition = 'opacity .5s'; cap.style.opacity = 1; }); }
    _renderDots();
    if (_v.playing) _speak(seg.text, function () { if (_v.playing) _goToSegment(_v.seg + 1); });
}

function _togglePlay() {
    _v.playing = !_v.playing;
    var btn = document.getElementById('cert-video-playpause');
    if (btn) btn.textContent = _v.playing ? '⏸' : '▶';
    if (_v.playing) {
        _startCanvas();
        _speak(_v.segs[_v.seg].text, function () { if (_v.playing) _goToSegment(_v.seg + 1); });
    } else {
        window.speechSynthesis && window.speechSynthesis.cancel();
    }
}

function _closeVideo() {
    _stopCanvas();
    _teardownCanvas();
    window.speechSynthesis && window.speechSynthesis.cancel();
    var el = document.getElementById('cert-video-overlay');
    if (el) el.remove();
}

window.openCertExplainerVideo = function (specId, toolIdx) {
    var tool = C.getTool(specId, toolIdx);
    if (!tool) return;
    _v = { playing: true, seg: 0, segs: _buildSegments(tool), raf: null, particles: [], theme: null };
    _renderPlayer(tool);
    _goToSegment(0);
    if (window._AUS_BUS) window._AUS_BUS.emit('XP_AWARDED', { amount: 5, source: 'cert_video_watched' });
};

})();
