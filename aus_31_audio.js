/**
 * AUS Audio Branding System — aus_31_audio.js
 * Intro sound (4s) + Focus Music (3 modes) via Web Audio API
 * No external files — 100% procedural synthesis
 *
 * NOT LOADED ANY MORE: the 🎵 music icon and the Focus Music were removed on request — the <script> tag for this file was
 * taken out of index.html. The file is kept only so it can be restored: put <script src="aus_31_audio.js?v=1"></script> back.
 */
(function () {
    'use strict';

    // ── State ──────────────────────────────────────────────────────────────
    let _ctx         = null;
    let _masterGain  = null;
    let _musicNodes  = [];
    let _isPlaying   = false;
    let _currentMode = null;
    let _volume      = 0.28;
    let _introPlayed = false;

    // ── Audio Context (lazy, unlocked on first user gesture) ──────────────
    function _ac() {
        if (!_ctx) {
            _ctx = new (window.AudioContext || window.webkitAudioContext)();
            _masterGain = _ctx.createGain();
            _masterGain.gain.value = 0;
            _masterGain.connect(_ctx.destination);
        }
        if (_ctx.state === 'suspended') _ctx.resume();
        return _ctx;
    }

    // ── Impulse reverb ─────────────────────────────────────────────────────
    function _reverb(ac, dur = 2.5, decay = 2.2, wet = 0.6) {
        const conv    = ac.createConvolver();
        const len     = Math.floor(ac.sampleRate * dur);
        const buf     = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = buf.getChannelData(c);
            for (let i = 0; i < len; i++)
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        conv.buffer = buf;
        const dryG   = ac.createGain();
        const wetG   = ac.createGain();
        dryG.gain.value = 1 - wet;
        wetG.gain.value = wet;
        const out    = ac.createGain();
        out.gain.value = 1;
        conv.connect(wetG);
        wetG.connect(out);
        // Usage: source → conv.input (conv itself), dry output manual
        conv._out = out;
        conv._dry = dryG;
        return conv;
    }

    // ── Noise buffer (loopable) ────────────────────────────────────────────
    function _noiseBuf(ac, secs = 4) {
        const n   = Math.floor(ac.sampleRate * secs);
        const buf = ac.createBuffer(2, n, ac.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = buf.getChannelData(c);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < n; i++) {
                // Pink noise approximation (Paul Kellet's algorithm)
                const wh = Math.random() * 2 - 1;
                b0 = 0.99886*b0 + wh*0.0555179; b1 = 0.99332*b1 + wh*0.0750759;
                b2 = 0.96900*b2 + wh*0.1538520; b3 = 0.86650*b3 + wh*0.3104856;
                b4 = 0.55000*b4 + wh*0.5329522; b5 = -0.7616*b5 - wh*0.0168980;
                ch[i] = (b0+b1+b2+b3+b4+b5+b6+wh*0.5362)*0.11;
                b6 = wh * 0.115926;
            }
        }
        return buf;
    }

    // ── Soft oscillator helper ─────────────────────────────────────────────
    function _osc(ac, freq, type = 'sine', gainVal = 0.05) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gainVal;
        o.connect(g);
        return { osc: o, gain: g, start: () => o.start(), stop: () => { try { o.stop(); } catch(_) {} } };
    }

    // ── Fade master in/out ─────────────────────────────────────────────────
    function _fadeIn(dur = 1.5) {
        const ac = _ac();
        _masterGain.gain.cancelScheduledValues(ac.currentTime);
        _masterGain.gain.setValueAtTime(_masterGain.gain.value, ac.currentTime);
        _masterGain.gain.linearRampToValueAtTime(_volume, ac.currentTime + dur);
    }
    function _fadeOut(dur = 1.2, then) {
        const ac = _ac();
        _masterGain.gain.cancelScheduledValues(ac.currentTime);
        _masterGain.gain.setValueAtTime(_masterGain.gain.value, ac.currentTime);
        _masterGain.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
        if (then) setTimeout(then, dur * 1000 + 50);
    }

    // ─────────────────────────────────────────────────────────────────────
    // ★ INTRO — voice only, says "AUS" once
    // ─────────────────────────────────────────────────────────────────────
    function playIntro() {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();

        const u = new SpeechSynthesisUtterance('AUS');
        u.rate   = 0.75;
        u.pitch  = 1.1;
        u.volume = 1.0;

        // Pick a clear English voice
        const vs   = speechSynthesis.getVoices();
        const best = vs.find(v => /en[-_](US|GB|AU)/i.test(v.lang) && !/eSpeak/i.test(v.name))
                  || vs.find(v => v.lang.startsWith('en'));
        if (best) u.voice = best;

        speechSynthesis.speak(u);
        _introPlayed = true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // ★ FOCUS MODE — Rain + Binaural Drone + 60BPM soft pulse
    // ─────────────────────────────────────────────────────────────────────
    function _startFocus(ac) {
        const out = _masterGain;
        const nodes = [];

        // Reverb
        const conv   = ac.createConvolver();
        const revBuf = _revImpulse(ac, 3, 2);
        conv.buffer  = revBuf;
        const convG  = ac.createGain();
        convG.gain.value = 0.5;
        conv.connect(convG);
        convG.connect(out);
        nodes.push(conv, convG);

        // Pink noise (rain) — looped, filtered
        const nSrc  = ac.createBufferSource();
        nSrc.buffer = _noiseBuf(ac, 8);
        nSrc.loop   = true;

        const bpf   = ac.createBiquadFilter();
        bpf.type    = 'bandpass';
        bpf.frequency.value = 650;
        bpf.Q.value = 0.7;

        // LFO slowly sweeps bandpass (wind effect)
        const lfo1  = ac.createOscillator();
        const lfo1G = ac.createGain();
        lfo1.type   = 'sine';
        lfo1.frequency.value = 0.04;
        lfo1G.gain.value = 350;
        lfo1.connect(lfo1G);
        lfo1G.connect(bpf.frequency);
        lfo1.start();

        const nG    = ac.createGain();
        nG.gain.value = 0.07;
        nSrc.connect(bpf);
        bpf.connect(nG);
        nG.connect(conv);
        nSrc.start();
        nodes.push(nSrc, bpf, lfo1, lfo1G, nG);

        // Binaural-like drone: 82Hz base + harmonics
        [82, 164, 246].forEach((f, i) => {
            const r = _osc(ac, f + (i % 2 === 0 ? 0.8 : -0.8), 'sine', 0.055 / (i + 1));
            r.gain.connect(conv);
            r.start();
            nodes.push(r);
        });

        // Slow 60 BPM heartbeat (barely audible, subconscious rhythm)
        const ticker = setInterval(() => {
            if (!_isPlaying || _currentMode !== 'focus') return;
            const a = _ac();
            const o = a.createOscillator();
            const g = a.createGain();
            o.type  = 'sine';
            o.frequency.value = 55;
            g.gain.setValueAtTime(0, a.currentTime);
            g.gain.linearRampToValueAtTime(0.045, a.currentTime + 0.018);
            g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.9);
            o.connect(g);
            g.connect(out);
            o.start(a.currentTime);
            o.stop(a.currentTime + 1.0);
        }, 1000);
        nodes.push({ stop: () => clearInterval(ticker), disconnect: () => {} });

        return nodes;
    }

    // ─────────────────────────────────────────────────────────────────────
    // ★ CALM MODE — Soft pentatonic piano + warm pad
    // ─────────────────────────────────────────────────────────────────────
    function _startCalm(ac) {
        const out = _masterGain;
        const nodes = [];

        const conv   = ac.createConvolver();
        conv.buffer  = _revImpulse(ac, 4.5, 1.8);
        const convG  = ac.createGain();
        convG.gain.value = 0.6;
        conv.connect(convG);
        convG.connect(out);
        nodes.push(conv, convG);

        // C major pentatonic: C4 E4 G4 A4 C5 E5
        const scale = [261.63, 329.63, 392.0, 440.0, 523.25, 659.25];
        let idx = 0;

        const playNote = () => {
            if (!_isPlaying || _currentMode !== 'calm') return;
            const a  = _ac();
            const f  = scale[idx % scale.length];
            idx++;

            const o  = a.createOscillator();
            const g  = a.createGain();
            // Soft triangle for piano-like timbre
            o.type   = 'triangle';
            o.frequency.value = f;
            o.detune.value    = (Math.random() - 0.5) * 4; // micro-detune
            g.gain.setValueAtTime(0, a.currentTime);
            g.gain.linearRampToValueAtTime(0.14, a.currentTime + 0.04);
            g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 4.5);
            o.connect(g);
            g.connect(conv);
            o.start(a.currentTime);
            o.stop(a.currentTime + 5);
        };

        // Notes every 2.4 seconds, staggered
        playNote();
        const noteTimer = setInterval(playNote, 2400);
        nodes.push({ stop: () => clearInterval(noteTimer), disconnect: () => {} });

        // Warm pad underneath (C2 chord + slow vibrato)
        [65.4, 98.0, 130.8, 164.8].forEach((f, i) => {
            const r     = _osc(ac, f, 'sine', 0.055 / (i * 0.6 + 1));
            // LFO vibrato
            const lfo   = ac.createOscillator();
            const lfoG  = ac.createGain();
            lfo.type    = 'sine';
            lfo.frequency.value = 0.12 + i * 0.03;
            lfoG.gain.value     = 0.8;
            lfo.connect(lfoG);
            lfoG.connect(r.osc.frequency);
            lfo.start();
            r.gain.connect(conv);
            r.start();
            nodes.push(r, lfo, lfoG);
        });

        return nodes;
    }

    // ─────────────────────────────────────────────────────────────────────
    // ★ DEEP WORK MODE — Pure drone + slow breathing modulation
    // ─────────────────────────────────────────────────────────────────────
    function _startDeepWork(ac) {
        const out   = _masterGain;
        const nodes = [];

        const conv   = ac.createConvolver();
        conv.buffer  = _revImpulse(ac, 6, 2.8);
        const convG  = ac.createGain();
        convG.gain.value = 0.65;
        conv.connect(convG);
        convG.connect(out);
        nodes.push(conv, convG);

        // Fundamental drone: 55Hz (A1) + harmonic series
        const harmonics = [55, 110, 165, 220, 330, 440, 660];
        harmonics.forEach((f, i) => {
            const r    = _osc(ac, f, 'sine', 0.07 / Math.pow(i + 1, 0.8));
            // "Breathing" — very slow AM on gain
            const am   = ac.createOscillator();
            const amG  = ac.createGain();
            am.type    = 'sine';
            am.frequency.value = 0.025 + i * 0.008; // ultra-slow (period ~40s)
            amG.gain.value     = 0.025;
            am.connect(amG);
            amG.connect(r.gain.gain);
            am.start();
            r.gain.connect(conv);
            r.start();
            nodes.push(r, am, amG);
        });

        // Very faint high shimmer (1760Hz = A6) for "space" quality
        const sh    = _osc(ac, 1760, 'sine', 0.006);
        const shLfo = ac.createOscillator();
        const shLG  = ac.createGain();
        shLfo.frequency.value = 0.02;
        shLG.gain.value       = 1.5;
        shLfo.connect(shLG);
        shLG.connect(sh.osc.frequency);
        shLfo.start();
        sh.gain.connect(conv);
        sh.start();
        nodes.push(sh, shLfo, shLG);

        // Ultra-low sub pulse every 8 seconds (grounding)
        const subTimer = setInterval(() => {
            if (!_isPlaying || _currentMode !== 'deepwork') return;
            const a = _ac();
            const o = a.createOscillator();
            const g = a.createGain();
            o.type  = 'sine';
            o.frequency.value = 27.5; // A0
            g.gain.setValueAtTime(0, a.currentTime);
            g.gain.linearRampToValueAtTime(0.06, a.currentTime + 1.5);
            g.gain.linearRampToValueAtTime(0, a.currentTime + 6.0);
            o.connect(g);
            g.connect(out);
            o.start(a.currentTime);
            o.stop(a.currentTime + 7);
        }, 8000);
        nodes.push({ stop: () => clearInterval(subTimer), disconnect: () => {} });

        return nodes;
    }

    // ── Shared reverb impulse generator ───────────────────────────────────
    function _revImpulse(ac, dur, decay) {
        const len = Math.floor(ac.sampleRate * dur);
        const buf = ac.createBuffer(2, len, ac.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = buf.getChannelData(c);
            for (let i = 0; i < len; i++)
                ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        return buf;
    }

    // ── Stop everything ───────────────────────────────────────────────────
    function _stopAll() {
        _musicNodes.forEach(n => {
            try { if (n && n.stop)       n.stop();       } catch (_) {}
            try { if (n && n.disconnect) n.disconnect(); } catch (_) {}
            // Handle objects with osc/gain (from _osc helper)
            try { if (n && n.osc)  { n.osc.stop(); n.osc.disconnect(); }  } catch (_) {}
            try { if (n && n.gain) { n.gain.disconnect(); }               } catch (_) {}
        });
        _musicNodes = [];
        _isPlaying  = false;
    }

    // ── Start a named mode ────────────────────────────────────────────────
    function _startMode(mode) {
        _stopAll();
        const ac   = _ac();
        _currentMode = mode;
        _isPlaying   = true;

        _masterGain.gain.cancelScheduledValues(ac.currentTime);
        _masterGain.gain.setValueAtTime(0, ac.currentTime);
        _masterGain.gain.linearRampToValueAtTime(_volume, ac.currentTime + 1.8);

        switch (mode) {
            case 'focus':    _musicNodes = _startFocus(ac);    break;
            case 'calm':     _musicNodes = _startCalm(ac);     break;
            case 'deepwork': _musicNodes = _startDeepWork(ac); break;
        }
        console.info(`[AUS Audio] Mode started: ${mode}`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // ★ Public API
    // ─────────────────────────────────────────────────────────────────────
    window.ausAudio = {
        playIntro,
        startMode:   _startMode,
        stop:        () => _fadeOut(1.0, _stopAll),
        toggle:      () => {
            if (_isPlaying) {
                _fadeOut(1.0, _stopAll);
            } else {
                _startMode(_currentMode || 'focus');
            }
        },
        setVolume:   (v) => {
            _volume = Math.max(0, Math.min(1, v));
            if (_masterGain && _ctx) {
                _masterGain.gain.cancelScheduledValues(_ctx.currentTime);
                _masterGain.gain.linearRampToValueAtTime(_volume, _ctx.currentTime + 0.3);
            }
        },
        isPlaying:   () => _isPlaying,
        currentMode: () => _currentMode,
    };

    // ─────────────────────────────────────────────────────────────────────
    // ★ UI Widget
    // ─────────────────────────────────────────────────────────────────────
    function _buildUI() {
        const wrap = document.createElement('div');
        wrap.id    = 'aus-audio-widget';

        wrap.innerHTML = `
<style>
#aus-audio-widget{position:fixed;bottom:76px;left:18px;z-index:9996;font-family:'Orbitron',sans-serif}
#aaw-btn{
  width:46px;height:46px;border-radius:50%;
  background:linear-gradient(135deg,#080818,#14143a);
  border:1.5px solid rgba(0,212,255,.35);
  color:#00d4ff;font-size:16px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 14px rgba(0,212,255,.18);
  transition:all .3s;outline:none;
  position:relative;
}
#aaw-btn:hover{box-shadow:0 0 26px rgba(0,212,255,.4);transform:scale(1.1)}
#aaw-btn.on{border-color:rgba(0,212,255,.85);animation:aaw-pulse 2.4s ease-in-out infinite}
@keyframes aaw-pulse{
  0%,100%{box-shadow:0 0 10px rgba(0,212,255,.25)}
  50%    {box-shadow:0 0 28px rgba(0,212,255,.6),0 0 8px rgba(0,212,255,.3)}
}
.aaw-dot{
  width:8px;height:8px;border-radius:50%;
  background:#00d4ff;position:absolute;bottom:2px;right:2px;
  display:none;
}
#aaw-btn.on .aaw-dot{display:block;animation:aaw-dot 1.2s ease-in-out infinite}
@keyframes aaw-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.6)}}
#aaw-panel{
  position:absolute;bottom:58px;left:0;
  width:236px;
  background:rgba(7,7,20,.97);
  border:1px solid rgba(0,212,255,.25);
  border-radius:18px;padding:18px 16px;
  display:none;backdrop-filter:blur(24px);
  box-shadow:0 0 50px rgba(0,0,0,.6),0 0 20px rgba(0,212,255,.08);
}
#aaw-panel.open{display:block;animation:aaw-slide .2s ease}
@keyframes aaw-slide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.aaw-head{
  font-size:9px;letter-spacing:3px;color:rgba(0,212,255,.55);
  text-transform:uppercase;margin-bottom:14px;
  display:flex;align-items:center;gap:6px;
}
.aaw-head i{font-size:11px}
.aaw-modes{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}
.aaw-mode{
  padding:9px 12px;border-radius:10px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.03);
  color:rgba(255,255,255,.65);font-size:11px;
  cursor:pointer;display:flex;align-items:center;gap:9px;
  transition:all .2s;font-family:inherit;text-align:right;
  position:relative;overflow:hidden;
}
.aaw-mode:hover{background:rgba(0,212,255,.08);border-color:rgba(0,212,255,.3);color:#00d4ff}
.aaw-mode.active{
  background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.5);
  color:#00d4ff;font-weight:600;
}
.aaw-mode.active::before{
  content:'';position:absolute;left:0;top:0;bottom:0;
  width:3px;background:#00d4ff;border-radius:2px 0 0 2px;
}
.aaw-mode-icon{font-size:15px;min-width:18px;text-align:center}
.aaw-mode-info{display:flex;flex-direction:column;gap:1px;flex:1}
.aaw-mode-name{font-size:11px;font-weight:600}
.aaw-mode-desc{font-size:9px;color:rgba(255,255,255,.35);letter-spacing:.5px}
.aaw-mode.active .aaw-mode-desc{color:rgba(0,212,255,.45)}
.aaw-sep{height:1px;background:rgba(255,255,255,.06);margin:2px 0 14px}
.aaw-vol{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.aaw-vol-lbl{font-size:9px;color:rgba(255,255,255,.35);letter-spacing:1.5px;min-width:22px}
#aaw-vol{
  flex:1;-webkit-appearance:none;appearance:none;
  height:3px;background:rgba(0,212,255,.2);
  border-radius:2px;outline:none;cursor:pointer;
}
#aaw-vol::-webkit-slider-thumb{
  -webkit-appearance:none;width:13px;height:13px;
  border-radius:50%;background:#00d4ff;cursor:pointer;
  box-shadow:0 0 6px rgba(0,212,255,.5);
}
#aaw-vol::-moz-range-thumb{
  width:13px;height:13px;border-radius:50%;
  background:#00d4ff;cursor:pointer;border:none;
}
.aaw-intro-btn{
  width:100%;padding:8px;border-radius:9px;
  border:1px solid rgba(157,78,221,.35);
  background:rgba(157,78,221,.07);
  color:rgba(157,78,221,.85);font-size:10px;
  cursor:pointer;font-family:inherit;letter-spacing:1.5px;
  transition:all .25s;display:flex;align-items:center;justify-content:center;gap:7px;
}
.aaw-intro-btn:hover{background:rgba(157,78,221,.15);border-color:rgba(157,78,221,.6);color:#c77dff}
.aaw-intro-btn i{font-size:11px}
.aaw-status{
  font-size:9px;color:rgba(0,212,255,.4);
  text-align:center;margin-top:10px;letter-spacing:.5px;
  min-height:12px;
}
</style>

<div id="aaw-panel">
  <div class="aaw-head"><i class="fas fa-headphones-alt"></i> AUS Audio System</div>

  <div class="aaw-modes">
    <button class="aaw-mode" data-mode="focus">
      <span class="aaw-mode-icon">🌧️</span>
      <div class="aaw-mode-info">
        <span class="aaw-mode-name">Focus Mode</span>
        <span class="aaw-mode-desc">Rain · Drone · 60 BPM</span>
      </div>
    </button>
    <button class="aaw-mode" data-mode="calm">
      <span class="aaw-mode-icon">🎹</span>
      <div class="aaw-mode-info">
        <span class="aaw-mode-name">Calm Mode</span>
        <span class="aaw-mode-desc">Piano · Pads · Pentatonic</span>
      </div>
    </button>
    <button class="aaw-mode" data-mode="deepwork">
      <span class="aaw-mode-icon">🌊</span>
      <div class="aaw-mode-info">
        <span class="aaw-mode-name">Deep Work</span>
        <span class="aaw-mode-desc">Drone · Harmonics · Loop</span>
      </div>
    </button>
  </div>

  <div class="aaw-sep"></div>

  <div class="aaw-vol">
    <span class="aaw-vol-lbl">VOL</span>
    <input type="range" id="aaw-vol" min="0" max="1" step="0.04" value="0.28">
  </div>

  <button class="aaw-intro-btn" id="aaw-play-intro">
    <i class="fas fa-play-circle"></i> PLAY AUS INTRO (4s)
  </button>
  <div class="aaw-status" id="aaw-status"></div>
</div>

<button id="aaw-btn" title="AUS Audio Controls">
  <i class="fas fa-music"></i>
  <span class="aaw-dot"></span>
</button>`;

        document.body.appendChild(wrap);

        const btn    = document.getElementById('aaw-btn');
        const panel  = document.getElementById('aaw-panel');
        const status = document.getElementById('aaw-status');

        const setStatus = (msg) => {
            status.textContent = msg;
            setTimeout(() => { status.textContent = ''; }, 3500);
        };

        // ── Toggle panel ──────────────────────────────────────────────────
        btn.addEventListener('click', () => {
            panel.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) panel.classList.remove('open');
        });

        // ── Mode buttons ──────────────────────────────────────────────────
        const modeBtns = document.querySelectorAll('.aaw-mode');
        modeBtns.forEach(b => {
            b.addEventListener('click', () => {
                const mode = b.dataset.mode;
                if (_isPlaying && _currentMode === mode) {
                    // Stop
                    window.ausAudio.stop();
                    btn.classList.remove('on');
                    modeBtns.forEach(x => x.classList.remove('active'));
                    setStatus('⏹ Stopped');
                } else {
                    // Start
                    _startMode(mode);
                    btn.classList.add('on');
                    modeBtns.forEach(x => x.classList.remove('active'));
                    b.classList.add('active');
                    const labels = { focus: '🌧️ Focus Mode', calm: '🎹 Calm Mode', deepwork: '🌊 Deep Work' };
                    setStatus(`▶ ${labels[mode] || mode}`);
                }
            });
        });

        // ── Volume ────────────────────────────────────────────────────────
        document.getElementById('aaw-vol').addEventListener('input', (e) => {
            window.ausAudio.setVolume(parseFloat(e.target.value));
        });

        // ── Intro ─────────────────────────────────────────────────────────
        document.getElementById('aaw-play-intro').addEventListener('click', () => {
            window.ausAudio.playIntro();
            setStatus('🎬 Playing A…U…S…');
        });

        // ── Visibility: pause when hidden, resume on focus ────────────────
        document.addEventListener('visibilitychange', () => {
            if (!_ctx) return;
            if (document.hidden) {
                if (_ctx.state === 'running') _ctx.suspend();
            } else {
                if (_ctx.state === 'suspended' && _isPlaying) _ctx.resume();
            }
        });
    }

    // ── Register + Boot ───────────────────────────────────────────────────
    if (window._AUS_REGISTRY) {
        window._AUS_REGISTRY.register({ id: 'audioSystem', name: 'AUS Audio Branding', version: '1.0.0' });
    }
    if (window._AUS_BUS) {
        window._AUS_BUS.on('aus:themeLoaded', () => {
            if (!_introPlayed) setTimeout(window.ausAudio.playIntro, 800);
        });
    }

    const _boot = () => _buildUI();
    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', _boot)
        : _boot();

})();
