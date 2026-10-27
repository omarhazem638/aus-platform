// =============================================================================
// aus_10_voice_reader.js — AI Voice Reader for Business English
// Web Speech API · Word-by-word sync · Multi-voice · AI Explain
// =============================================================================

(function () {
'use strict';

/* ── State ─────────────────────────────────────────────────────────── */
var _vr = {
    levelIdx:      null,
    words:         [],   // [{span, charStart, text, idx}]
    wordIdx:       0,
    utterance:     null,
    speaking:      false,
    paused:        false,
    rate:          1.0,
    volume:        1.0,
    elapsed:       0,
    _timer:        null,
    _fbTimer:      null, // fallback advance timer
    _boundaryOK:   false,
    cssInjected:   false
};

/* ── CSS ────────────────────────────────────────────────────────────── */
function _css() {
    if (_vr.cssInjected) return;
    _vr.cssInjected = true;
    var s = document.createElement('style');
    s.id = 'vr-css';
    s.textContent =
        /* panel */
        '#vr-panel{background:rgba(0,6,16,0.97);border:1px solid rgba(212,175,55,0.38);border-radius:14px;padding:13px 16px;margin:0 0 10px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}' +
        '.vr-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:9px;}' +
        '.vr-row:last-child{margin-bottom:0;}' +
        /* voice select */
        '#vr-voice{flex:1;min-width:140px;max-width:230px;background:rgba(0,16,36,0.9);border:1px solid rgba(212,175,55,0.32);border-radius:8px;color:#fff;padding:6px 9px;font-size:13px;cursor:pointer;}' +
        '#vr-voice option,#vr-voice optgroup{background:#00090f;}' +
        '#vr-stats{font-size:11px;color:rgba(255,255,255,0.38);margin-left:auto;white-space:nowrap;}' +
        /* buttons */
        '.vr-b{display:inline-flex;align-items:center;gap:4px;border-radius:8px;padding:6px 11px;font-size:13px;font-weight:500;cursor:pointer;transition:all .17s;white-space:nowrap;border:1px solid;line-height:1.2;}' +
        '.vr-b:disabled{opacity:.3;cursor:not-allowed;}' +
        '.vr-b.cy{color:#00d4ff;border-color:rgba(0,212,255,0.32);background:rgba(0,212,255,0.07);}' +
        '.vr-b.cy:hover:not(:disabled){background:rgba(0,212,255,0.18);border-color:#00d4ff;}' +
        '.vr-b.gd{color:#d4af37;border-color:rgba(212,175,55,0.38);background:rgba(212,175,55,0.07);}' +
        '.vr-b.gd:hover:not(:disabled){background:rgba(212,175,55,0.18);border-color:#d4af37;}' +
        '.vr-b.rd{color:#ff006e;border-color:rgba(255,0,110,0.32);background:rgba(255,0,110,0.06);}' +
        '.vr-b.rd:hover:not(:disabled){background:rgba(255,0,110,0.15);}' +
        /* sliders */
        '.vr-sw{display:flex;align-items:center;gap:5px;}' +
        '.vr-sw label{color:rgba(255,255,255,0.45);font-size:11px;white-space:nowrap;}' +
        '.vr-sl{-webkit-appearance:none;height:4px;border-radius:4px;background:rgba(0,212,255,0.15);outline:none;cursor:pointer;}' +
        '.vr-sl::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#d4af37;cursor:pointer;}' +
        '#vr-spd-sl{width:80px;}#vr-vol-sl{width:68px;}' +
        '.vr-val{color:#d4af37;font-size:11px;font-weight:700;min-width:28px;}' +
        /* progress bar */
        '#vr-pb{width:100%;height:3px;background:rgba(255,255,255,0.07);border-radius:3px;margin-top:8px;overflow:hidden;}' +
        '#vr-pb-fill{height:100%;width:0%;background:linear-gradient(90deg,#d4af37,#00d4ff);border-radius:3px;transition:width .5s;}' +
        /* hint */
        '#vr-hint{text-align:center;font-size:11px;color:rgba(255,255,255,0.2);padding:3px 0 6px;font-style:italic;}' +
        /* word highlights */
        '.vr-read{color:rgba(255,255,255,0.28)!important;}' +
        '.vr-cur{background:rgba(212,175,55,0.9)!important;color:#000!important;border-radius:3px!important;padding:0 2px!important;box-shadow:0 0 10px rgba(212,175,55,0.55)!important;}' +
        '.eng-term.vr-cur{background:rgba(212,175,55,0.95)!important;color:#000!important;}' +
        /* explain popup */
        '#vr-xpop{position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;padding:16px;}' +
        '#vr-xbox{position:relative;background:#000c1a;border:1px solid rgba(212,175,55,0.45);border-radius:16px;padding:24px;max-width:580px;width:100%;max-height:84vh;overflow-y:auto;}' +
        '#vr-xbox h3{color:#d4af37;font-size:15px;margin-bottom:14px;display:flex;align-items:center;gap:8px;}' +
        '.vr-xs{margin-bottom:14px;}' +
        '.vr-xs b{display:block;color:#00d4ff;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:5px;}' +
        '.vr-xs p{color:rgba(255,255,255,0.82);font-size:14px;line-height:1.7;}' +
        '.vr-xs.ar{direction:rtl;text-align:right;font-family:Tajawal,sans-serif;}' +
        '.vr-term-row{display:flex;gap:6px;margin-bottom:5px;align-items:flex-start;}' +
        '.vr-term-row .vt{color:#d4af37;font-weight:700;min-width:80px;font-size:13px;}' +
        '.vr-term-row .vd{color:rgba(255,255,255,0.75);font-size:13px;line-height:1.5;}' +
        '#vr-xclose{position:absolute;top:14px;right:14px;background:none;border:none;color:rgba(255,255,255,0.35);font-size:22px;cursor:pointer;line-height:1;padding:0;}' +
        '#vr-xclose:hover{color:#fff;}' +
        /* mobile */
        '@media(max-width:600px){.vr-b{padding:5px 8px;font-size:12px;}#vr-voice{font-size:12px;}#vr-spd-sl{width:60px!important;}#vr-vol-sl{width:55px!important;}}';
    document.head.appendChild(s);
}

/* ── Build Panel UI ─────────────────────────────────────────────────── */
function _buildUI() {
    var old = document.getElementById('vr-panel');
    if (old) old.remove();
    var oh  = document.getElementById('vr-hint');
    if (oh) oh.remove();

    var p = document.createElement('div');
    p.id = 'vr-panel';
    p.innerHTML =
        '<div class="vr-row">' +
            '<select id="vr-voice" aria-label="Select Voice"></select>' +
            '<span id="vr-stats">00:00 &nbsp;·&nbsp; 0 words &nbsp;·&nbsp; 0%</span>' +
        '</div>' +
        '<div class="vr-row">' +
            '<button class="vr-b gd" id="vr-play" title="Play">&#9654; Play</button>' +
            '<button class="vr-b cy"  id="vr-pause"  disabled title="Pause">&#9646;&#9646; Pause</button>' +
            '<button class="vr-b gd" id="vr-resume" disabled title="Resume" style="display:none">&#9654; Resume</button>' +
            '<button class="vr-b rd" id="vr-stop"   disabled title="Stop">&#9632; Stop</button>' +
            '<button class="vr-b cy" id="vr-restart" disabled title="Restart">&#8635;</button>' +
            '<button class="vr-b cy" id="vr-back"   title="Back 10s">&#9198; 10s</button>' +
            '<button class="vr-b cy" id="vr-fwd"    title="Forward 10s">10s &#9197;</button>' +
            '<button class="vr-b gd" id="vr-explain" title="AI Explain selected/current sentence">&#128161; Explain</button>' +
        '</div>' +
        '<div class="vr-row">' +
            '<div class="vr-sw"><label>Speed</label><input class="vr-sl" id="vr-spd-sl" type="range" min="0.5" max="2" step="0.1" value="1"><span class="vr-val" id="vr-spd-v">1.0&times;</span></div>' +
            '<div class="vr-sw"><label>Vol</label><input class="vr-sl" id="vr-vol-sl" type="range" min="0" max="1" step="0.05" value="1"><span class="vr-val" id="vr-vol-v">100%</span></div>' +
        '</div>' +
        '<div id="vr-pb"><div id="vr-pb-fill"></div></div>';

    var textBody = document.querySelector('.eng-text-body');
    if (textBody && textBody.parentNode) {
        textBody.parentNode.insertBefore(p, textBody);
        var hint = document.createElement('div');
        hint.id = 'vr-hint';
        hint.textContent = 'Click any word to jump · Select text + 💡 Explain for AI analysis';
        textBody.parentNode.insertBefore(hint, textBody);
    }

    _loadVoices();
    _bindEvents();
}

/* ── Voices ─────────────────────────────────────────────────────────── */
function _loadVoices() {
    var voices = window.speechSynthesis.getVoices();
    if (voices.length) { _fillVoices(voices); }
    else {
        window.speechSynthesis.onvoiceschanged = function () {
            _fillVoices(window.speechSynthesis.getVoices());
        };
        var sel = document.getElementById('vr-voice');
        if (sel) sel.innerHTML = '<option>Loading voices…</option>';
    }
}

function _fillVoices(voices) {
    var sel = document.getElementById('vr-voice');
    if (!sel) return;
    sel.innerHTML = '';

    var enUS = voices.filter(function(v){return /en[-_]US/i.test(v.lang);});
    var enGB = voices.filter(function(v){return /en[-_]GB/i.test(v.lang);});
    var enOt = voices.filter(function(v){return v.lang.toLowerCase().startsWith('en') && !/US|GB/i.test(v.lang);});

    function grp(label, list) {
        if (!list.length) return;
        var g = document.createElement('optgroup');
        g.label = label;
        list.forEach(function(v) {
            var o = document.createElement('option');
            o.value = v.name;
            var n = v.name.replace(/^(Microsoft|Google)\s+/i, '');
            var sex = /aria|jenny|natasha|zira|samantha|emily|linda|heather|eva|hazel|moira|tessa|karen|fiona|ava|allison|victoria|susan|female|woman|elsa|serena|siri f/i.test(v.name) ? ' ♀'
                    : /david|mark|guy|james|richard|daniel|ryan|liam|thomas|oliver|george|jack|tony|male|man/i.test(v.name) ? ' ♂' : '';
            o.textContent = n + sex;
            g.appendChild(o);
        });
        sel.appendChild(g);
    }

    grp('🇺🇸 American English', enUS);
    grp('🇬🇧 British English', enGB);
    grp('🌐 Other English', enOt);

    if (!sel.options.length) {
        voices.filter(function(v){return v.lang.toLowerCase().startsWith('en');}).forEach(function(v){
            var o = document.createElement('option'); o.value = v.name; o.textContent = v.name; sel.appendChild(o);
        });
    }
    if (!sel.options.length) {
        sel.innerHTML = '<option value="">System Default</option>';
    }

    var saved = localStorage.getItem('vr.voice');
    if (saved) {
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === saved) { sel.selectedIndex = i; break; }
        }
    }
}

function _getVoice() {
    var sel = document.getElementById('vr-voice');
    if (!sel || !sel.value) return null;
    return window.speechSynthesis.getVoices().find(function(v){return v.name === sel.value;}) || null;
}

/* ── Event bindings ─────────────────────────────────────────────────── */
function _bindEvents() {
    function $(i){ return document.getElementById(i); }

    $('vr-play')    && $('vr-play').addEventListener('click',    function(){ vrPlay(); });
    $('vr-pause')   && $('vr-pause').addEventListener('click',   function(){ vrPause(); });
    $('vr-resume')  && $('vr-resume').addEventListener('click',  function(){ vrResume(); });
    $('vr-stop')    && $('vr-stop').addEventListener('click',    function(){ vrStop(); });
    $('vr-restart') && $('vr-restart').addEventListener('click', function(){ vrRestart(); });
    $('vr-back')    && $('vr-back').addEventListener('click',    function(){ _seek(-10); });
    $('vr-fwd')     && $('vr-fwd').addEventListener('click',     function(){ _seek(10); });
    $('vr-explain') && $('vr-explain').addEventListener('click', function(){ _explain(); });

    $('vr-spd-sl') && $('vr-spd-sl').addEventListener('input', function() {
        _vr.rate = parseFloat(this.value);
        $('vr-spd-v').textContent = _vr.rate.toFixed(1) + '×';
        if (_vr.speaking && !_vr.paused) _speakFrom(_vr.wordIdx);
    });

    $('vr-vol-sl') && $('vr-vol-sl').addEventListener('input', function() {
        _vr.volume = parseFloat(this.value);
        $('vr-vol-v').textContent = Math.round(_vr.volume * 100) + '%';
    });

    $('vr-voice') && $('vr-voice').addEventListener('change', function() {
        localStorage.setItem('vr.voice', this.value);
        if (_vr.speaking || _vr.paused) _speakFrom(_vr.wordIdx);
    });

    // Word click → jump to word (capture phase, before existing popup handler)
    var tb = document.querySelector('.eng-text-body');
    if (tb && !tb._vrBound) {
        tb._vrBound = true;
        tb.addEventListener('click', function(e) {
            var t = e.target.closest('[data-wi]');
            if (!t) return;
            var wi = parseInt(t.dataset.wi, 10);
            if (isNaN(wi) || wi < 0) return;
            if (_vr.speaking || _vr.paused) {
                e.stopPropagation(); // don't show popup when jumping
                _speakFrom(wi);
            } else {
                // Show the existing word popup (let event propagate)
                // But highlight the clicked word
                _highlight(wi);
                _vr.wordIdx = wi;
            }
        }, true); // capture = intercept before other handlers
    }
}

/* ── Word collection ─────────────────────────────────────────────────── */
function _collectWords() {
    var spans = Array.from(document.querySelectorAll('.eng-text-body .eng-w, .eng-text-body .eng-term'));
    _vr.words = [];
    var cp = 0;
    spans.forEach(function(span, i) {
        span.dataset.wi = String(i);
        var t = span.textContent.trim();
        _vr.words.push({ span: span, charStart: cp, text: t, idx: i });
        cp += t.length + 1; // +1 for space separator
    });
}

/* ── Core TTS ────────────────────────────────────────────────────────── */
function vrPlay(fromIdx) {
    _collectWords();
    var si = (typeof fromIdx === 'number' && fromIdx >= 0) ? fromIdx : _vr.wordIdx;
    _speakFrom(si);
}

function _speakFrom(wi) {
    window.speechSynthesis.cancel();
    _stopTimers();

    if (!_vr.words.length) _collectWords();
    if (wi < 0) wi = 0;
    if (wi >= _vr.words.length) { _onFinish(); return; }

    _vr.wordIdx      = wi;
    _vr.speaking     = true;
    _vr.paused       = false;
    _vr._boundaryOK  = false;

    // Build utterance text from wi onward
    var slice = _vr.words.slice(wi);
    var utterText = slice.map(function(w){ return w.text; }).join(' ');

    // Local char map: localStart → globalIdx
    var localMap = [];
    var lcp = 0;
    slice.forEach(function(w, i) {
        localMap.push({ ls: lcp, gi: wi + i });
        lcp += w.text.length + 1;
    });

    var u = new SpeechSynthesisUtterance(utterText);
    u.rate   = _vr.rate;
    u.volume = _vr.volume;
    u.lang   = 'en-US';
    var voice = _getVoice();
    if (voice) u.voice = voice;

    u.onboundary = function(e) {
        if (e.name !== 'word') return;
        _vr._boundaryOK = true;
        // Binary search for word at this char position
        var ci = e.charIndex;
        var found = localMap[0];
        for (var i = localMap.length - 1; i >= 0; i--) {
            if (localMap[i].ls <= ci) { found = localMap[i]; break; }
        }
        if (found.gi !== _vr.wordIdx) {
            _vr.wordIdx = found.gi;
            _highlight(_vr.wordIdx);
            _scrollTo(_vr.wordIdx);
            _updateStats();
        }
    };

    u.onend = function() {
        if (!_vr.paused) {
            _vr.speaking = false;
            _stopTimers();
            _onFinish();
        }
    };

    u.onerror = function(e) {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
            _vr.speaking = false;
            _stopTimers();
            _setBtns('stopped');
        }
    };

    _vr.utterance = u;
    window.speechSynthesis.speak(u);

    _setBtns('playing');
    _highlight(wi);
    _scrollTo(wi);
    _startTimer();

    // Fallback: if no boundary events after 1.5s start timer-based advance
    clearTimeout(_vr._fbCheckTimer);
    _vr._fbCheckTimer = setTimeout(function() {
        if (_vr.speaking && !_vr._boundaryOK && !_vr.paused) {
            _startFallback(wi);
        }
    }, 1500);
}

function _startFallback(startWi) {
    if (_vr._fbTimer) return;
    var wps = (135 / 60) * _vr.rate;
    var delay = Math.max(80, Math.round(1000 / wps));
    var cur = startWi;
    _vr._fbTimer = setInterval(function() {
        if (!_vr.speaking || _vr.paused) { clearInterval(_vr._fbTimer); _vr._fbTimer = null; return; }
        cur++;
        if (cur >= _vr.words.length) { clearInterval(_vr._fbTimer); _vr._fbTimer = null; return; }
        _vr.wordIdx = cur;
        _highlight(cur);
        _scrollTo(cur);
        _updateStats();
    }, delay);
}

function vrPause() {
    if (!_vr.speaking || _vr.paused) return;
    window.speechSynthesis.pause();
    _vr.speaking = false;
    _vr.paused   = true;
    _stopTimers();
    _setBtns('paused');
    _saveProgress();
}

function vrResume() {
    if (!_vr.paused) return;
    // Re-speak from current word (more reliable than browser resume across all platforms)
    _speakFrom(_vr.wordIdx);
}

function vrStop() {
    window.speechSynthesis.cancel();
    _vr.speaking = false;
    _vr.paused   = false;
    _stopTimers();
    _clearHL();
    _setBtns('stopped');
    _saveProgress();
}

function vrRestart() {
    vrStop();
    _vr.wordIdx = 0;
    _vr.elapsed = 0;
    _updateStats();
    vrPlay(0);
}

function _seek(seconds) {
    var wps   = (135 / 60) * _vr.rate;
    var delta = Math.max(1, Math.round(Math.abs(seconds) * wps));
    var ni = seconds < 0
        ? Math.max(0, _vr.wordIdx - delta)
        : Math.min(_vr.words.length - 1, _vr.wordIdx + delta);
    if (_vr.speaking || _vr.paused) {
        _speakFrom(ni);
    } else {
        _vr.wordIdx = ni;
        _highlight(ni);
        _scrollTo(ni);
        _updateStats();
    }
}

/* ── Highlight & auto-scroll ─────────────────────────────────────────── */
function _highlight(idx) {
    var prev = document.querySelector('.vr-cur');
    if (prev) prev.classList.remove('vr-cur');
    // Mark all words before idx as "read"
    for (var i = 0; i < idx; i++) {
        if (_vr.words[i] && !_vr.words[i].span.classList.contains('vr-read')) {
            _vr.words[i].span.classList.add('vr-read');
        }
    }
    if (_vr.words[idx]) {
        _vr.words[idx].span.classList.remove('vr-read');
        _vr.words[idx].span.classList.add('vr-cur');
    }
}

function _scrollTo(idx) {
    if (!_vr.words[idx]) return;
    var span = _vr.words[idx].span;
    var area = document.getElementById('eng-scroll-area');
    if (area) {
        var spanMid = span.offsetTop + span.offsetHeight / 2;
        var target  = spanMid - area.clientHeight / 2;
        var current = area.scrollTop;
        if (Math.abs(current - target) > 80) {
            area.scrollTo({ top: target, behavior: 'smooth' });
        }
    } else {
        span.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function _clearHL() {
    document.querySelectorAll('.vr-cur').forEach(function(el){ el.classList.remove('vr-cur'); });
    document.querySelectorAll('.vr-read').forEach(function(el){ el.classList.remove('vr-read'); });
}

/* ── Button states ───────────────────────────────────────────────────── */
function _setBtns(st) {
    function $(i){ return document.getElementById(i); }
    var play=$('vr-play'), pause=$('vr-pause'), resume=$('vr-resume'), stop=$('vr-stop'), restart=$('vr-restart');
    if (!play) return;
    if (st === 'playing') {
        play.disabled=true; pause.disabled=false; pause.style.display='';
        resume.style.display='none'; stop.disabled=false; restart.disabled=false;
    } else if (st === 'paused') {
        play.disabled=true; pause.style.display='none';
        resume.disabled=false; resume.style.display=''; stop.disabled=false; restart.disabled=false;
    } else { // stopped
        play.disabled=false; pause.disabled=true; pause.style.display='';
        resume.style.display='none'; stop.disabled=true; restart.disabled=true;
    }
}

/* ── Timer & stats ───────────────────────────────────────────────────── */
function _startTimer() {
    _stopTimers();
    _vr._timer = setInterval(function() {
        _vr.elapsed++;
        _updateStats();
        // Chrome TTS freeze watchdog: restart if synthesis stopped unexpectedly
        if (_vr.speaking && !_vr.paused && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            _speakFrom(_vr.wordIdx);
        }
    }, 1000);
}

function _stopTimers() {
    if (_vr._timer)       { clearInterval(_vr._timer);  _vr._timer = null; }
    if (_vr._fbTimer)     { clearInterval(_vr._fbTimer); _vr._fbTimer = null; }
    if (_vr._fbCheckTimer){ clearTimeout(_vr._fbCheckTimer); _vr._fbCheckTimer = null; }
}

function _updateStats() {
    var total = _vr.words.length;
    var done  = Math.min(_vr.wordIdx, total);
    var pct   = total ? Math.round((done / total) * 100) : 0;
    var m = Math.floor(_vr.elapsed / 60);
    var s = _vr.elapsed % 60;
    var el = document.getElementById('vr-stats');
    if (el) el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' · ' + done + ' words · ' + pct + '%';
    var fill = document.getElementById('vr-pb-fill');
    if (fill) fill.style.width = pct + '%';
}

/* ── Progress persistence ────────────────────────────────────────────── */
function _saveProgress() {
    if (_vr.levelIdx === null) return;
    try {
        localStorage.setItem('vr.p.' + _vr.levelIdx, JSON.stringify({
            wi: _vr.wordIdx,
            elapsed: _vr.elapsed,
            pct: _vr.words.length ? Math.round((_vr.wordIdx / _vr.words.length) * 100) : 0,
            wordsRead: _vr.wordIdx,
            ts: Date.now()
        }));
    } catch(e) {}
}

function _loadProgress() {
    if (_vr.levelIdx === null) return;
    try {
        var p = JSON.parse(localStorage.getItem('vr.p.' + _vr.levelIdx) || 'null');
        if (p && p.wi > 0 && p.wi < _vr.words.length) {
            _vr.wordIdx = p.wi;
            _vr.elapsed = p.elapsed || 0;
            _updateStats();
            setTimeout(function() {
                _highlight(_vr.wordIdx);
                _scrollTo(_vr.wordIdx);
            }, 350);
        }
    } catch(e) {}
}

/* ── AI Sentence Explanation ─────────────────────────────────────────── */
function _explain() {
    // Get selected text OR sentence around current word
    var sel = window.getSelection && window.getSelection().toString().trim();
    var sentence = (sel && sel.length > 10) ? sel : _currentSentence();
    if (!sentence || sentence.length < 8) return;
    _showExplain(sentence.substring(0, 400));
}

function _currentSentence() {
    if (!_vr.words.length || !_vr.words[_vr.wordIdx]) return '';
    var span = _vr.words[_vr.wordIdx].span;
    var para = span.closest('p');
    if (!para) return span.textContent.trim();
    var full = para.textContent.trim();
    var wi   = full.indexOf(span.textContent.trim());
    var dot1 = full.lastIndexOf('.', wi);
    var dot2 = full.indexOf('.', wi);
    var sent = full.substring(dot1 < 0 ? 0 : dot1 + 1, dot2 < 0 ? full.length : dot2 + 1).trim();
    return sent.length > 10 ? sent : full.split('.')[0] + '.';
}

function _showExplain(sentence) {
    var old = document.getElementById('vr-xpop');
    if (old) old.remove();

    // Pause while explaining
    if (_vr.speaking) vrPause();

    var pop = document.createElement('div');
    pop.id = 'vr-xpop';
    pop.innerHTML =
        '<div id="vr-xbox">' +
            '<button id="vr-xclose" onclick="document.getElementById(\'vr-xpop\').remove()">&#10005;</button>' +
            '<h3>&#128161; AI Sentence Explanation</h3>' +
            '<div class="vr-xs"><b>Selected Sentence</b><p style="font-style:italic;color:#d4af37">&ldquo;' + _esc(sentence) + '&rdquo;</p></div>' +
            '<div id="vr-xbody"><div style="text-align:center;padding:28px 0;color:rgba(255,255,255,0.35)">' +
                '<div style="font-size:32px;margin-bottom:10px">&#129302;</div>Analyzing with AI&hellip;</div></div>' +
        '</div>';
    document.body.appendChild(pop);

    var prompt =
        'You are a Business English expert. A student selected this sentence:\n\n"' + sentence + '"\n\n' +
        'Reply ONLY with valid JSON (no markdown, no code block):\n' +
        '{"simple_en":"2-3 sentence plain English explanation","arabic":"شرح بالعربية 2-3 جمل","terms":[{"term":"word","def":"short business definition"}],"example":"one new example sentence"}';

    fetch('http://localhost:8002/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [] }),
        signal: AbortSignal.timeout(20000)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        var raw = (data.text || data.response || data.content || '').trim();
        var json;
        try {
            var m = raw.match(/\{[\s\S]*\}/);
            json = JSON.parse(m ? m[0] : raw);
        } catch(e) {
            json = { simple_en: raw, arabic: '', terms: [], example: '' };
        }
        _renderExplain(json);
    })
    .catch(function() {
        // Offline fallback: use local business dictionary
        var words = sentence.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
        var terms = [];
        if (typeof _engDict !== 'undefined') {
            words.forEach(function(w) {
                if (_engDict[w]) terms.push({ term: w, def: _engDict[w].en });
            });
        }
        _renderExplain({
            simple_en: 'This sentence contains important business concepts. Study the key terms and consider how they apply in real business contexts.',
            arabic: 'هذه الجملة تحتوي على مفاهيم تجارية مهمة. &nbsp;(تعذر الاتصال بالذكاء الاصطناعي — شغّل الخادم على المنفذ 8002 للشرح الكامل)',
            terms: terms.slice(0, 5),
            example: ''
        });
    });
}

function _renderExplain(json) {
    var box = document.getElementById('vr-xbody');
    if (!box) return;
    var h = '';
    if (json.simple_en) h += '<div class="vr-xs"><b>Simple English</b><p>' + _esc(json.simple_en) + '</p></div>';
    if (json.arabic)    h += '<div class="vr-xs ar"><b>الشرح بالعربية</b><p>' + json.arabic + '</p></div>';
    if (json.terms && json.terms.length) {
        h += '<div class="vr-xs"><b>Business Terms</b>';
        json.terms.forEach(function(t) {
            h += '<div class="vr-term-row"><span class="vt">' + _esc(t.term) + '</span><span class="vd">' + _esc(t.def) + '</span></div>';
        });
        h += '</div>';
    }
    if (json.example) h += '<div class="vr-xs"><b>Example</b><p style="font-style:italic;color:rgba(255,255,255,0.65)">&ldquo;' + _esc(json.example) + '&rdquo;</p></div>';
    box.innerHTML = h || '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">No explanation available.</p>';
}

function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Finish ──────────────────────────────────────────────────────────── */
function _onFinish() {
    _vr.wordIdx = _vr.words.length;
    _vr.speaking = false;
    _updateStats();
    _setBtns('stopped');
    _saveProgress();
    // Award XP for completing a full reading
    if (_vr.words.length > 50 && typeof addXP === 'function') {
        addXP(25);
    }
}

/* ── Public API ──────────────────────────────────────────────────────── */
window.vrInit = function(levelIdx) {
    // Clean up previous session
    try { window.speechSynthesis.cancel(); } catch(e) {}
    _stopTimers();
    _vr.levelIdx   = levelIdx;
    _vr.wordIdx    = 0;
    _vr.elapsed    = 0;
    _vr.words      = [];
    _vr.speaking   = false;
    _vr.paused     = false;
    _vr._boundaryOK = false;

    _css();
    _buildUI();

    // Collect words after DOM is rendered by aus_09_english.js
    setTimeout(function() {
        _collectWords();
        _loadProgress();
    }, 120);
};

window.vrDestroy = function() {
    try { window.speechSynthesis.cancel(); } catch(e) {}
    _stopTimers();
    _vr.speaking = false;
    _vr.paused   = false;
    _clearHL();
    ['vr-panel','vr-hint','vr-xpop'].forEach(function(id){
        var el = document.getElementById(id); if (el) el.remove();
    });
    // Remove data-wi attributes
    document.querySelectorAll('[data-wi]').forEach(function(el){ delete el.dataset.wi; });
};

// Also export individual controls
window.vrPlay    = vrPlay;
window.vrPause   = vrPause;
window.vrResume  = vrResume;
window.vrStop    = vrStop;
window.vrRestart = vrRestart;

})();
