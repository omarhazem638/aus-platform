/* ================================================================
   AUS Auth Experience v1.0
   Next-Generation Interactive Login Layer

   Hooks into the existing auth system WITHOUT touching auth_system.js.
   All auth logic is untouched. Only the visual layer is added.

   Architecture:
     Layer 0 — Canvas: star field + nebula with mouse parallax
     Layer 1 — Role environment (theme switches per role)
     Layer 2 — Companion: animated canvas orb with cursor-tracking eyes
     Layer 3 — Auth card (existing HTML, IDs, logic unchanged)
     Layer 4 — Particle system (triggered by hover/type/error/success)
     Layer 5 — Success portal (MutationObserver-intercepted cinematic)
   ================================================================ */

(function () {
  'use strict';

  // ── Role Themes ─────────────────────────────────────────────────
  var THEMES = {
    student: {
      primary:    '#00d4ff',
      secondary:  '#0080ff',
      accent:     '#00ffcc',
      glow:       'rgba(0,212,255,0.25)',
      nebula:     ['rgba(0,80,180,0.22)', 'rgba(0,180,255,0.15)', 'rgba(0,50,120,0.3)'],
      name:       'STUDENT',
      welcome:    'رحلتك تبدأ الآن',
      emoji:      '🎓'
    },
    doctor: {
      primary:    '#c79dff',
      secondary:  '#7c3aed',
      accent:     '#f0abff',
      glow:       'rgba(157,78,221,0.25)',
      nebula:     ['rgba(80,0,180,0.22)', 'rgba(157,78,221,0.18)', 'rgba(40,0,100,0.3)'],
      name:       'PROFESSOR',
      welcome:    'أهلاً أستاذنا',
      emoji:      '🧠'
    },
    admin: {
      primary:    '#ffd700',
      secondary:  '#cc8800',
      accent:     '#fffaaa',
      glow:       'rgba(255,215,0,0.25)',
      nebula:     ['rgba(120,80,0,0.25)', 'rgba(255,200,0,0.15)', 'rgba(60,30,0,0.3)'],
      name:       'COMMANDER',
      welcome:    'مرحباً بالقيادة',
      emoji:      '⚡'
    },
    guest: {
      primary:    'rgba(200,220,255,0.85)',
      secondary:  'rgba(150,180,255,0.5)',
      accent:     '#ffffff',
      glow:       'rgba(200,220,255,0.15)',
      nebula:     ['rgba(60,80,160,0.2)', 'rgba(100,120,200,0.12)', 'rgba(30,40,100,0.25)'],
      name:       'EXPLORER',
      welcome:    'اكتشف عالمك',
      emoji:      '🔭'
    }
  };

  // ── State ────────────────────────────────────────────────────────
  var spaceCanvas, sCtx;
  var compCanvas, cCtx;
  var stars = [], particles = [], nebula = [];
  var mouseX = 0, mouseY = 0, smoothX = 0, smoothY = 0;
  var role = null, theme = THEMES.student;
  var raf = null, initialized = false;
  var cX = 0, cY = 0;               // companion position
  var cBounce = 0, cPulse = 0;
  var cScale = 1, cTargetScale = 1;
  var cGlow = 0.5, cTargetGlow = 0.5;
  var eyeX = 0, eyeY = 0;
  var cState = 'idle';               // idle|watching|typing|error|success|celebrate
  var idleReset = null;
  var _successPending = false;       // flag: login just succeeded
  var _animating = false;            // flag: cinematic in progress
  var _lastOvW = 0, _lastOvH = 0;

  // ── Bootstrap ────────────────────────────────────────────────────
  function init() {
    if (initialized) return;
    initialized = true;

    buildSpaceCanvas();
    buildCompanion();
    buildStars();
    buildNebula();
    bindEvents();
    observeOverlay();
    observeAuth();
    loop();
  }

  // ── Canvas Setup ─────────────────────────────────────────────────
  function buildSpaceCanvas() {
    var old = document.getElementById('aus-space-canvas');
    if (old) old.remove();

    spaceCanvas = document.createElement('canvas');
    spaceCanvas.id = 'aus-space-canvas';
    spaceCanvas.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;border-radius:inherit;';

    var ov = document.getElementById('authModalOverlay');
    if (ov) ov.insertBefore(spaceCanvas, ov.firstChild);

    fitCanvas();
    window.addEventListener('resize', fitCanvas);
  }

  function fitCanvas() {
    var ov = document.getElementById('authModalOverlay');
    if (!ov || !spaceCanvas) return;
    var w = ov.offsetWidth || window.innerWidth;
    var h = ov.offsetHeight || window.innerHeight;
    if (w === _lastOvW && h === _lastOvH) return;
    _lastOvW = w; _lastOvH = h;
    spaceCanvas.width = w;
    spaceCanvas.height = h;
    sCtx = spaceCanvas.getContext('2d');
    buildStars();
    buildNebula();
  }

  function buildCompanion() {
    var old = document.getElementById('aus-companion');
    if (old) old.remove();

    compCanvas = document.createElement('canvas');
    compCanvas.id = 'aus-companion';
    compCanvas.width = 140;
    compCanvas.height = 140;
    compCanvas.style.cssText =
      'position:absolute;pointer-events:none;z-index:6;width:140px;height:140px;';

    var ov = document.getElementById('authModalOverlay');
    if (ov) ov.appendChild(compCanvas);

    cCtx = compCanvas.getContext('2d');
    placeCompanion();
  }

  function placeCompanion() {
    var ov = document.getElementById('authModalOverlay');
    if (!ov || !compCanvas) return;
    var W = ov.offsetWidth, H = ov.offsetHeight;
    // Right side on wide screens, top-right on narrow
    if (W > 720) {
      cX = W * 0.5 + 255;   // right of the 440px card (centered)
      cY = H * 0.28;
    } else {
      // Narrow: float above the card, right-aligned but fully inside
      cX = Math.min(W - 150, W * 0.5 + 145);
      cY = 60;
    }
    positionCompanion();
  }

  function positionCompanion() {
    if (!compCanvas) return;
    compCanvas.style.left = cX + 'px';
    compCanvas.style.top  = cY + 'px';
  }

  // ── Stars ────────────────────────────────────────────────────────
  function buildStars() {
    if (!spaceCanvas) return;
    stars = [];
    var n = Math.round(spaceCanvas.width * spaceCanvas.height / 2800);
    for (var i = 0; i < n; i++) {
      var layer = Math.floor(Math.random() * 3);  // 0 far → 2 near
      stars.push({
        x: Math.random() * spaceCanvas.width,
        y: Math.random() * spaceCanvas.height,
        r: 0.25 + Math.random() * (layer === 2 ? 1.8 : layer === 1 ? 1.0 : 0.5),
        base: 0.1 + Math.random() * 0.75,
        tw: Math.random() * 0.025 + 0.004,
        to: Math.random() * Math.PI * 2,
        layer: layer,
        col: Math.random() > 0.82 ? theme.primary :
             Math.random() > 0.65 ? '#c4b5fd' : '#e8eeff'
      });
    }
  }

  function buildNebula() {
    nebula = [];
    for (var i = 0; i < 7; i++) {
      nebula.push({
        xr: Math.random(),                          // x ratio (0-1 of canvas)
        yr: Math.random(),
        rx: 0.12 + Math.random() * 0.22,           // radii as ratio
        ry: 0.06 + Math.random() * 0.14,
        col: (theme.nebula || THEMES.student.nebula)[i % 3],
        rot: Math.random() * Math.PI,
        drift: (Math.random() - 0.5) * 0.00008
      });
    }
  }

  // ── Particles ────────────────────────────────────────────────────
  function spawn(x, y, n, col, speed, gravity) {
    if (window.__AUS_FX_ON === false) return;      // calm mode: nothing draws these, so don't queue them
    for (var i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n + (Math.random() - 0.5) * 0.6;
      var s = (speed || 2) + Math.random() * 2.5;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: 1 + Math.random() * 2.8,
        life: 1,
        decay: 0.016 + Math.random() * 0.022,
        col: col || theme.primary,
        g: gravity !== undefined ? gravity : 0.06
      });
    }
  }

  function spawnBurst(x, y, n, col) {
    if (window.__AUS_FX_ON === false) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 4 + Math.random() * 12;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1,
        r: 1.5 + Math.random() * 4,
        life: 1,
        decay: 0.007 + Math.random() * 0.012,
        col: col,
        g: 0.04,
        isBurst: true
      });
    }
  }

  // ── Draw Space ───────────────────────────────────────────────────
  function drawSpace() {
    if (!sCtx || !spaceCanvas) return;
    var W = spaceCanvas.width, H = spaceCanvas.height;
    var t = Date.now() / 1000;

    sCtx.clearRect(0, 0, W, H);

    // Mouse smooth
    smoothX += (mouseX - smoothX) * 0.07;
    smoothY += (mouseY - smoothY) * 0.07;
    var cx = W / 2, cy = H / 2;

    // Nebula
    nebula.forEach(function (n) {
      n.rot += n.drift;
      var nx = n.xr * W + (smoothX - cx) * 0.018;
      var ny = n.yr * H + (smoothY - cy) * 0.018;
      sCtx.save();
      sCtx.translate(nx, ny);
      sCtx.rotate(n.rot);
      var g = sCtx.createRadialGradient(0, 0, 0, 0, 0, n.rx * W);
      g.addColorStop(0, n.col);
      g.addColorStop(1, 'transparent');
      sCtx.globalAlpha = 0.5;
      sCtx.beginPath();
      sCtx.ellipse(0, 0, n.rx * W, n.ry * H, 0, 0, Math.PI * 2);
      sCtx.fillStyle = g;
      sCtx.fill();
      sCtx.restore();
    });
    sCtx.globalAlpha = 1;

    // Stars
    var pf = [0.004, 0.01, 0.022];
    stars.forEach(function (s) {
      var px = s.x + (smoothX - cx) * pf[s.layer];
      var py = s.y + (smoothY - cy) * pf[s.layer];
      var alpha = s.base * (0.5 + 0.5 * Math.sin(t * s.tw * 60 + s.to));

      sCtx.beginPath();
      sCtx.arc(px, py, s.r, 0, Math.PI * 2);
      sCtx.fillStyle = s.col;
      sCtx.globalAlpha = alpha;
      sCtx.fill();

      // Near-star glow
      if (s.layer === 2 && s.r > 1.2) {
        var g2 = sCtx.createRadialGradient(px, py, 0, px, py, s.r * 4);
        g2.addColorStop(0, 'rgba(180,210,255,0.18)');
        g2.addColorStop(1, 'transparent');
        sCtx.beginPath();
        sCtx.arc(px, py, s.r * 4, 0, Math.PI * 2);
        sCtx.fillStyle = g2;
        sCtx.fill();
      }
    });
    sCtx.globalAlpha = 1;

    // Particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.g;
      p.vx *= 0.97;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      sCtx.beginPath();
      sCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      sCtx.fillStyle = p.col;
      sCtx.globalAlpha = p.life;
      sCtx.fill();

      // Trailing glow on burst particles
      if (p.isBurst && p.r > 2) {
        sCtx.beginPath();
        sCtx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        var pg = sCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
        pg.addColorStop(0, p.col.replace(')', ',0.4)').replace('rgb', 'rgba'));
        pg.addColorStop(1, 'transparent');
        sCtx.fillStyle = pg;
        sCtx.globalAlpha = p.life * 0.5;
        sCtx.fill();
      }
    }
    sCtx.globalAlpha = 1;
  }

  // ── Draw Companion ───────────────────────────────────────────────
  function drawCompanion() {
    if (!cCtx) return;
    var W = 140, H = 140, cx = 70, cy = 70;
    var t = Date.now() / 1000;

    cCtx.clearRect(0, 0, W, H);

    // Smooth scale & glow
    cScale  += (cTargetScale - cScale)  * 0.1;
    cGlow   += (cTargetGlow  - cGlow)   * 0.1;
    cBounce += 0.032;
    cPulse  += 0.048;
    var bounce = Math.sin(cBounce) * 5;
    var pulse  = 1 + Math.sin(cPulse) * 0.05;

    // State targets
    cTargetScale = cState === 'success'   ? 1.45 :
                   cState === 'celebrate' ? 1.3  :
                   cState === 'error'     ? 0.82 : 1.0;
    cTargetGlow  = cState === 'success'   ? 1.2  :
                   cState === 'typing'    ? 0.9  :
                   cState === 'error'     ? 0.35 : 0.55;

    // Eye tracking — look at mouse position relative to companion center
    var ov = document.getElementById('authModalOverlay');
    if (ov) {
      var rx = mouseX - (cX + 70);
      var ry = mouseY - (cY + 70);
      var dist = Math.sqrt(rx * rx + ry * ry) || 1;
      var maxE = 5.5;
      eyeX += ((rx / dist) * Math.min(maxE, dist * 0.12) - eyeX) * 0.12;
      eyeY += ((ry / dist) * Math.min(maxE, dist * 0.12) - eyeY) * 0.12;
    }

    cCtx.save();
    cCtx.translate(cx, cy + bounce);
    cCtx.scale(cScale * pulse, cScale * pulse);

    // ── Outer glow halo ──────────────────────────────────────────
    var haloR = 58;
    var hg = cCtx.createRadialGradient(0, 0, 18, 0, 0, haloR);
    hg.addColorStop(0, rgba(theme.primary, cGlow * 0.55));
    hg.addColorStop(1, 'transparent');
    cCtx.beginPath();
    cCtx.arc(0, 0, haloR, 0, Math.PI * 2);
    cCtx.fillStyle = hg;
    cCtx.fill();

    // ── Orbit rings (hidden when erroring) ───────────────────────
    if (cState !== 'error') {
      for (var or = 0; or < 2; or++) {
        var orSpeed = or === 0 ? 1.1 : -0.75;
        var orA = t * orSpeed + or * 1.2;
        var orRx = 30 + or * 9, orRy = 10 + or * 4;

        cCtx.save();
        cCtx.rotate(or * 0.45);
        cCtx.beginPath();
        cCtx.ellipse(0, 0, orRx, orRy, 0, 0, Math.PI * 2);
        cCtx.strokeStyle = rgba(theme.primary, 0.22 - or * 0.04);
        cCtx.lineWidth = 1;
        cCtx.stroke();

        // Dot on ring
        var dx = Math.cos(orA) * orRx;
        var dy = Math.sin(orA) * orRy;
        cCtx.beginPath();
        cCtx.arc(dx, dy, 2.8, 0, Math.PI * 2);
        cCtx.fillStyle = theme.primary;
        cCtx.shadowBlur = 8;
        cCtx.shadowColor = theme.primary;
        cCtx.fill();
        cCtx.shadowBlur = 0;
        cCtx.restore();
      }
    }

    // ── Core sphere ──────────────────────────────────────────────
    var sphere = cCtx.createRadialGradient(-6, -8, 1, 0, 0, 24);
    sphere.addColorStop(0, rgba(theme.primary, 0.95));
    sphere.addColorStop(0.55, rgba(theme.secondary, 0.7));
    sphere.addColorStop(1, rgba(theme.secondary, 0.2));
    cCtx.beginPath();
    cCtx.arc(0, 0, 24, 0, Math.PI * 2);
    cCtx.fillStyle = sphere;
    cCtx.shadowBlur = 20;
    cCtx.shadowColor = theme.primary;
    cCtx.fill();
    cCtx.shadowBlur = 0;

    // Specular highlight
    var hl = cCtx.createRadialGradient(-7, -9, 0, -7, -9, 14);
    hl.addColorStop(0, 'rgba(255,255,255,0.55)');
    hl.addColorStop(1, 'transparent');
    cCtx.beginPath();
    cCtx.arc(0, 0, 24, 0, Math.PI * 2);
    cCtx.fillStyle = hl;
    cCtx.fill();

    // ── Face ─────────────────────────────────────────────────────
    var eyeAlpha  = cState === 'error' ? 0.5 : 1;
    var eyeSpread = cState === 'error' ? 5.5 : 7.5;
    var eyeBaseY  = cState === 'success'   ? -5 :
                    cState === 'celebrate' ? -6 :
                    cState === 'error'     ?  3 : -2.5;
    var eyeR      = cState === 'error' ? 2.5 : 3.5;

    function drawEye(ex, ey) {
      // White
      cCtx.beginPath();
      cCtx.arc(ex + eyeX, ey + eyeY, eyeR, 0, Math.PI * 2);
      cCtx.fillStyle = 'rgba(255,255,255,' + eyeAlpha + ')';
      cCtx.fill();
      // Pupil (less travel than iris)
      cCtx.beginPath();
      cCtx.arc(ex + eyeX * 0.55, ey + eyeY * 0.55, eyeR * 0.5, 0, Math.PI * 2);
      cCtx.fillStyle = '#000824';
      cCtx.fill();
    }
    drawEye(-eyeSpread, eyeBaseY);
    drawEye( eyeSpread, eyeBaseY);

    // ── Mouth / expression ───────────────────────────────────────
    var mouthY = eyeBaseY + 9;
    cCtx.beginPath();
    cCtx.lineWidth = 2;
    cCtx.lineCap = 'round';

    if (cState === 'typing') {
      // Animated thinking dots
      for (var d = 0; d < 3; d++) {
        var dotA = Math.abs(Math.sin(t * 3.5 + d * 0.9));
        cCtx.beginPath();
        cCtx.arc(-5 + d * 5, mouthY + 2, 2, 0, Math.PI * 2);
        cCtx.fillStyle = 'rgba(255,255,255,' + (0.35 + dotA * 0.65) + ')';
        cCtx.fill();
      }
    } else if (cState === 'success' || cState === 'celebrate') {
      // Wide smile
      cCtx.arc(0, mouthY - 2, 9, 0.05, Math.PI - 0.05);
      cCtx.strokeStyle = 'rgba(255,255,255,0.95)';
      cCtx.stroke();
    } else if (cState === 'error') {
      // Sad frown
      cCtx.arc(0, mouthY + 7, 8, Math.PI + 0.2, -0.2);
      cCtx.strokeStyle = 'rgba(255,140,140,0.8)';
      cCtx.stroke();
    } else {
      // Slight smile (idle/watching)
      cCtx.arc(0, mouthY, 7, 0.15, Math.PI - 0.15);
      cCtx.strokeStyle = 'rgba(255,255,255,0.7)';
      cCtx.stroke();
    }

    // ── Celebrate sparkles ───────────────────────────────────────
    if (cState === 'celebrate') {
      var sparkCols = ['#ffd700', theme.primary, '#ff6b9d', '#69f0ae', '#ffffff'];
      for (var sp = 0; sp < 7; sp++) {
        var sa = t * 1.8 + sp * (Math.PI * 2 / 7);
        var sd = 34 + Math.sin(t * 3 + sp) * 5;
        cCtx.beginPath();
        cCtx.arc(Math.cos(sa) * sd, Math.sin(sa) * sd, 2.5, 0, Math.PI * 2);
        cCtx.fillStyle = sparkCols[sp % sparkCols.length];
        cCtx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.5 + sp));
        cCtx.fill();
        cCtx.globalAlpha = 1;
      }
    }

    cCtx.restore();
  }

  // ── Main Loop ────────────────────────────────────────────────────
  function loop() {
    raf = requestAnimationFrame(loop);
    if (window.__AUS_FX_ON === false) return;      // calm mode (aus_45_fx_mode.js): no star canvas / companion drawing
    var ov = document.getElementById('authModalOverlay');
    if (!ov || !ov.classList.contains('visible')) return;

    // Fit canvas if overlay resized
    fitCanvas();

    drawSpace();
    drawCompanion();
  }

  // ── Events ───────────────────────────────────────────────────────
  function bindEvents() {
    // Mouse tracking
    document.addEventListener('mousemove', function (e) {
      var ov = document.getElementById('authModalOverlay');
      if (!ov || !ov.classList.contains('visible')) return;
      var r = ov.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
      if (cState === 'idle') setState('watching', 1800);
    }, { passive: true });

    // Keyboard → companion reacts
    document.addEventListener('keydown', function (e) {
      var ov = document.getElementById('authModalOverlay');
      if (!ov || !ov.classList.contains('visible')) return;
      var ae = document.activeElement;
      if (ae && (ae.id === 'loginEmail' || ae.id === 'loginPassword' ||
                 ae.id === 'regName'    || ae.id === 'authDoctorCode')) {
        setState('typing', 1600);
        // Tiny particle burst from companion on keypress
        spawn(cX + 70, cY + 70, 3, theme.primary, 1.5, -0.04);
      }
    }, { passive: true });

    // Input focus
    ['loginEmail', 'loginPassword', 'regName', 'authDoctorCode'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('focus', function () { setState('typing', 2000); });
      el.addEventListener('blur',  function () { if (cState === 'typing') setState('watching', 1800); });
    });

    // Role card hover → particle burst
    document.querySelectorAll('.auth-role-card').forEach(function (card) {
      card.addEventListener('mouseenter', function (e) {
        var ov = document.getElementById('authModalOverlay');
        if (!ov) return;
        var ovR = ov.getBoundingClientRect();
        var cR  = card.getBoundingClientRect();
        var cx  = cR.left + cR.width / 2  - ovR.left;
        var cy  = cR.top  + cR.height / 2 - ovR.top;
        spawn(cx, cy, 10, theme.primary, 2.5, 0.08);
      });
    });

    // Magnetic buttons
    document.querySelectorAll('.auth-submit-btn').forEach(addMagnet);
    document.querySelectorAll('.auth-role-card').forEach(addMagnet);
  }

  function addMagnet(el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var mx = e.clientX - r.left - r.width  / 2;
      var my = e.clientY - r.top  - r.height / 2;
      var strength = el.classList.contains('auth-submit-btn') ? 0.18 : 0.14;
      el.style.transform = 'translate(' + (mx * strength) + 'px,' + (my * strength - 3) + 'px)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform = '';
    });
  }

  // ── State Machine ────────────────────────────────────────────────
  function setState(s, resetAfter) {
    cState = s;
    clearTimeout(idleReset);
    if (resetAfter) {
      idleReset = setTimeout(function () {
        if (cState !== 'error' && cState !== 'success' && cState !== 'celebrate') {
          cState = 'idle';
        }
      }, resetAfter);
    }
  }

  // ── Observe Overlay ──────────────────────────────────────────────
  function observeOverlay() {
    var ov = document.getElementById('authModalOverlay');
    if (!ov) { setTimeout(observeOverlay, 200); return; }

    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        var el = m.target;

        // Overlay just became VISIBLE → onOpen
        if (el.classList.contains('visible') && m.oldValue && !m.oldValue.includes('visible')) {
          onOpen();
        }

        // Overlay just became HIDDEN and user is logged in → success cinematic
        if (!el.classList.contains('visible') && !_animating) {
          var u = window.ausAuth && window.ausAuth.user;
          if (u && _successPending) {
            _successPending = false;
            el.classList.add('visible'); // restore for cinematic
            _animating = true;
            setTimeout(function () { cinematicSuccess(el); }, 60);
          }
        }
      });
    });

    obs.observe(ov, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }

  // ── Observe Auth Events ──────────────────────────────────────────
  function observeAuth() {
    // Mark success BEFORE closeModal fires via aus-auth-changed
    // aus-auth-changed fires from _updateUI which runs AFTER closeModal,
    // so we also hook the error element to detect failures.
    var errEl = document.getElementById('authError');
    if (errEl) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.target.classList.contains('visible') && m.target.textContent.trim()) {
            onError();
          }
        });
      }).observe(errEl, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }

    // Patch ausAuth.selectRole to apply themes
    function patchAuth() {
      if (!window.ausAuth) { setTimeout(patchAuth, 400); return; }

      var origSelect = window.ausAuth.selectRole;
      window.ausAuth.selectRole = function (r) {
        applyRole(r);
        return origSelect.apply(this, arguments);
      };

      var origOpen = window.ausAuth.openModal;
      window.ausAuth.openModal = function () {
        onOpen();
        return origOpen.apply(this, arguments);
      };

      // Detect login success: monitor _saveSession side-effects
      // We listen on localStorage writes by polling a tiny flag
      // The cleanest hook: watch for the submit button becoming enabled
      // after a disable→enable cycle + user becomes non-null
      window.addEventListener('aus-auth-changed', function () {
        var u = window.ausAuth && window.ausAuth.user;
        if (u && window.__AUS_FX_ON !== false) {     // calm mode skips the success cinematic: the modal just closes
          // login just succeeded; mark pending so overlay observer can fire cinematic
          _successPending = true;
          setState('celebrate', 0);
          spawnBurst(cX + 70, cY + 70, 30, theme.primary);
          spawnBurst(cX + 70, cY + 70, 20, theme.accent || '#ffd700');
        }
      });
    }
    patchAuth();
  }

  // ── Role Theme Switching ─────────────────────────────────────────
  function applyRole(r) {
    role  = r;
    theme = THEMES[r] || THEMES.student;

    // Recolor stars
    stars.forEach(function (s, i) {
      if (i % 5 === 0) s.col = theme.primary;
    });

    buildNebula();

    // Companion reacts
    setState('celebrate', 1200);
    spawn(cX + 70, cY + 70, 20, theme.primary, 3, 0.05);

    // Pulse card border with role color
    var card = document.getElementById('authCard');
    if (card) {
      card.style.borderColor = theme.primary.replace(')', ',0.6)').replace('rgb', 'rgba');
      card.style.boxShadow = '0 0 40px ' + rgba(theme.primary, 0.25) + ',0 0 80px ' + rgba(theme.secondary, 0.15) + ',0 32px 80px rgba(0,0,0,.85)';
      card.style.transition = 'border-color 0.6s ease, box-shadow 0.6s ease';
    }
  }

  // ── On Modal Open ────────────────────────────────────────────────
  function onOpen() {
    setTimeout(function () {
      fitCanvas();
      placeCompanion();
      buildStars();
      buildNebula();
      cState = 'idle';
      _successPending = false;
      _animating = false;

      // Entrance burst at card center
      var ov = document.getElementById('authModalOverlay');
      if (ov) {
        var cx = ov.offsetWidth / 2;
        var cy = ov.offsetHeight / 2;
        spawn(cx, cy, 35, theme.primary, 4, 0.06);
        spawn(cx, cy, 20, theme.accent || '#ffd700', 3, 0.04);
      }
    }, 80);
  }

  // ── On Auth Error ────────────────────────────────────────────────
  function onError() {
    setState('error', 2400);
    // Companion shudders — red particle burst
    spawn(cX + 70, cY + 70, 18, '#ff4466', 3, 0.1);

    // Environment briefly shifts darker (flash red nebula)
    var origNebula = nebula.map(function (n) { return n.col; });
    nebula.forEach(function (n) { n.col = 'rgba(200,20,60,0.15)'; });
    setTimeout(function () {
      nebula.forEach(function (n, i) { n.col = origNebula[i]; });
    }, 600);
  }

  // ── Cinematic Success Sequence ───────────────────────────────────
  function cinematicSuccess(overlay) {
    var card = document.getElementById('authCard');
    if (!card) { overlay.classList.remove('visible'); _animating = false; return; }

    setState('celebrate', 0);

    // 1. Big burst at card center
    var ovW = overlay.offsetWidth, ovH = overlay.offsetHeight;
    var cardCX = ovW / 2, cardCY = ovH / 2;

    var burstColors = [theme.primary, theme.accent || '#ffd700', '#ffffff', '#ff6bd6', theme.secondary];
    burstColors.forEach(function (col) {
      spawnBurst(cardCX, cardCY, 25, col);
    });

    // 2. Card: scale up then implode into portal
    card.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.0s';
    card.style.transform  = 'scale(1.06)';

    setTimeout(function () {
      card.style.transition = 'transform 0.55s cubic-bezier(0.55,0,1,0.45), opacity 0.45s ease';
      card.style.transform  = 'scale(0.05)';
      card.style.opacity    = '0';
    }, 400);

    // 3. Vortex particle ring while card collapses
    var vortexT = 0;
    var vortex = setInterval(function () {
      vortexT += 0.15;
      for (var i = 0; i < 6; i++) {
        var a = vortexT + i * (Math.PI * 2 / 6);
        var d = 80 + vortexT * 30;
        particles.push({
          x: cardCX + Math.cos(a) * d,
          y: cardCY + Math.sin(a) * d,
          vx: -Math.cos(a) * (5 + vortexT * 2),
          vy: -Math.sin(a) * (5 + vortexT * 2),
          r: 2 + Math.random() * 2,
          life: 0.9,
          decay: 0.045,
          col: burstColors[i % burstColors.length],
          g: 0,
          isBurst: true
        });
      }
    }, 40);

    // 4. Portal flash: white ring expanding
    setTimeout(function () {
      clearInterval(vortex);
      drawPortalFlash(ovW / 2, ovH / 2, overlay);
    }, 950);

    // 5. Fade overlay out
    setTimeout(function () {
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity    = '0';
    }, 1250);

    // 6. Final cleanup
    setTimeout(function () {
      overlay.classList.remove('visible');
      overlay.style.opacity    = '';
      overlay.style.transition = '';
      if (card) {
        card.style.transform  = '';
        card.style.opacity    = '';
        card.style.transition = '';
        card.style.borderColor = '';
        card.style.boxShadow = '';
      }
      _animating = false;
      setState('idle', 0);
    }, 1800);
  }

  function drawPortalFlash(cx, cy, overlay) {
    if (!sCtx || !spaceCanvas) return;
    var radius = 0;
    var maxR   = Math.max(spaceCanvas.width, spaceCanvas.height) * 0.8;
    var alpha  = 1.0;

    function frame() {
      if (!overlay.classList.contains('visible')) return;
      radius += maxR * 0.06;
      alpha  -= 0.07;
      if (alpha <= 0) return;

      sCtx.save();
      sCtx.beginPath();
      sCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      var g = sCtx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius);
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.7, rgba(theme.primary, alpha * 0.6));
      g.addColorStop(1,   'rgba(255,255,255,' + (alpha * 0.4) + ')');
      sCtx.strokeStyle = g;
      sCtx.lineWidth = 12;
      sCtx.globalAlpha = alpha;
      sCtx.stroke();
      sCtx.restore();

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ── Utilities ────────────────────────────────────────────────────
  function rgba(col, a) {
    if (!col) return 'rgba(0,212,255,' + a + ')';
    // Already rgba
    if (col.indexOf('rgba') === 0) return col.replace(/[\d.]+\)$/, a + ')');
    // rgb(...)
    if (col.indexOf('rgb') === 0) return col.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
    // #rrggbb
    if (col.charAt(0) === '#') {
      var r = parseInt(col.slice(1, 3), 16);
      var g = parseInt(col.slice(3, 5), 16);
      var b = parseInt(col.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    return 'rgba(0,212,255,' + a + ')';
  }

  // ── CSS additions ────────────────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById('aus-exp-styles')) return;
    var s = document.createElement('style');
    s.id  = 'aus-exp-styles';
    s.textContent = `
      #aus-companion {
        transition: none;
        will-change: transform;
        filter: drop-shadow(0 0 16px var(--comp-color, #00d4ff));
      }
      #aus-space-canvas {
        will-change: contents;
        image-rendering: pixelated;
      }
      /* Magnetic btn: override transition during magnet drag */
      .auth-role-card, .auth-submit-btn {
        will-change: transform;
        transition:
          border-color 0.28s cubic-bezier(0.34,1.56,0.64,1),
          box-shadow   0.28s cubic-bezier(0.34,1.56,0.64,1),
          background   0.28s ease !important;
      }
      /* Companion welcome label */
      #aus-comp-label {
        position:absolute;
        font-family:'Orbitron',monospace;
        font-size:.62rem;
        color:var(--comp-color,#00d4ff);
        text-align:center;
        white-space:nowrap;
        letter-spacing:.08em;
        pointer-events:none;
        z-index:7;
        opacity:0;
        transition:opacity .4s ease;
        text-shadow:0 0 10px currentColor;
      }
      #aus-comp-label.visible { opacity:1; }
    `;
    document.head.appendChild(s);
  })();

  // ── Welcome Label (appears on role select) ───────────────────────
  function showWelcomeLabel(txt, col) {
    var old = document.getElementById('aus-comp-label');
    if (old) old.remove();

    var lbl = document.createElement('div');
    lbl.id = 'aus-comp-label';
    lbl.textContent = txt;
    lbl.style.setProperty('--comp-color', col);

    var ov = document.getElementById('authModalOverlay');
    if (ov) ov.appendChild(lbl);

    // Position below companion
    lbl.style.left = (cX + 70 - 60) + 'px';
    lbl.style.top  = (cY + 145) + 'px';
    lbl.style.width = '120px';

    requestAnimationFrame(function () { lbl.classList.add('visible'); });
    setTimeout(function () {
      lbl.classList.remove('visible');
      setTimeout(function () { if (lbl.parentNode) lbl.remove(); }, 400);
    }, 2200);
  }

  // ── Override applyRole to also show label ────────────────────────
  var _origApplyRole = applyRole;
  applyRole = function (r) {
    _origApplyRole(r);
    showWelcomeLabel(theme.welcome, theme.primary);
    document.documentElement.style.setProperty('--comp-color', theme.primary);
  };

  // ── DOMContentLoaded Guard ───────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
  } else {
    setTimeout(init, 200);
  }

})();
