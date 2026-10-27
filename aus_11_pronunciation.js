// =============================================================================
// aus_11_pronunciation.js  —  BELC AI Pronunciation Coach
// Web Speech Recognition · Levenshtein scoring · Word-level feedback
// IPA phonetics for problem words · XP integration
// Security: no eval, all user data sanitized before DOM insertion
// =============================================================================

(function () {
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
var _pc = {
    active: false,       // panel mounted
    listening: false,    // mic open
    recognition: null,   // SpeechRecognition instance
    targetText: '',      // sentence to read
    targetWords: [],     // tokenized target
    lastResult: null,    // {score, words[]}
    styleInjected: false,
    historyKey: 'belc.pc.history'
};

// Practice sentences — Business English level-appropriate
var _pcSentences = [
    { text: 'The quarterly revenue exceeded our forecast by fifteen percent.',            level: 2 },
    { text: 'We need to align our marketing strategy with the overall business objectives.', level: 3 },
    { text: 'Our competitive advantage lies in delivering exceptional customer value.',   level: 3 },
    { text: 'The board approved the merger after conducting thorough due diligence.',     level: 4 },
    { text: 'Sustainable profitability requires disciplined cost management and innovation.', level: 4 },
    { text: 'Effective leadership empowers teams to achieve ambitious organizational goals.', level: 3 },
    { text: 'The startup achieved product-market fit within eighteen months of launching.', level: 4 },
    { text: 'Shareholders equity grew significantly following the successful acquisition.', level: 4 },
    { text: 'Digital transformation is fundamentally reshaping traditional business models.', level: 3 },
    { text: 'Leveraging data analytics enables companies to make more informed decisions.', level: 4 },
    { text: 'The entrepreneur raised venture capital to accelerate international expansion.', level: 4 },
    { text: 'Supply chain disruptions increased operational costs across multiple sectors.', level: 3 },
    { text: 'Customer retention is significantly more cost-effective than new acquisition.', level: 3 },
    { text: 'The annual audit revealed strong compliance across all financial departments.', level: 4 },
    { text: 'Economies of scale allow large corporations to dominate competitive markets.', level: 4 },
    { text: 'Our value proposition clearly differentiates us from existing market competitors.', level: 3 },
    { text: 'The CEO presented a compelling five-year strategic roadmap to stakeholders.', level: 3 },
    { text: 'Effective negotiation skills are essential for closing high-value business deals.', level: 2 },
    { text: 'Cash flow management is critical during periods of rapid business growth.', level: 2 },
    { text: 'The company achieved breakeven point ahead of its original financial projections.', level: 3 },
];

// IPA phonetic hints for commonly mispronounced business words
var _pcPhonetics = {
    'quarterly': '/ˈkwɔːrtərli/', 'revenue': '/ˈrevənjuː/', 'forecast': '/ˈfɔːrkæst/',
    'strategy': '/ˈstrætɪdʒi/', 'strategic': '/strəˈtiːdʒɪk/', 'objectives': '/əbˈdʒektɪvz/',
    'competitive': '/kəmˈpetɪtɪv/', 'advantage': '/ədˈvɑːntɪdʒ/', 'exceptional': '/ɪkˈsepʃənl/',
    'acquisition': '/ˌækwɪˈzɪʃən/', 'diligence': '/ˈdɪlɪdʒəns/', 'thorough': '/ˈθʌrə/',
    'sustainable': '/səˈsteɪnəbl/', 'profitability': '/ˌprɒfɪtəˈbɪlɪti/', 'entrepreneur': '/ˌɒntrəprəˈnɜːr/',
    'venture': '/ˈventʃər/', 'capital': '/ˈkæpɪtl/', 'international': '/ˌɪntərˈnæʃənl/',
    'shareholders': '/ˈʃeərˌhoʊldərz/', 'equity': '/ˈekwɪti/', 'significantly': '/sɪɡˈnɪfɪkəntli/',
    'disruption': '/dɪsˈrʌpʃən/', 'analytics': '/ˌænəˈlɪtɪks/', 'transformation': '/ˌtrænsfərˈmeɪʃən/',
    'organizations': '/ˌɔːrɡənɪˈzeɪʃənz/', 'alignment': '/əˈlaɪnmənt/', 'compliance': '/kəmˈplaɪəns/',
    'economies': '/ɪˈkɒnəmɪz/', 'corporations': '/ˌkɔːrpəˈreɪʃənz/', 'differentiate': '/ˌdɪfəˈrenʃieɪt/',
    'negotiation': '/nɪˌɡoʊʃiˈeɪʃən/', 'stakeholders': '/ˈsteɪkˌhoʊldərz/', 'projections': '/prəˈdʒekʃənz/',
    'operational': '/ˌɒpəˈreɪʃənl/', 'efficiency': '/ɪˈfɪʃənsi/', 'depreciation': '/dɪˌpriːʃiˈeɪʃən/',
    'leverage': '/ˈliːvərɪdʒ/', 'amortization': '/əˌmɔːrtɪˈzeɪʃən/', 'valuation': '/ˌvæljuˈeɪʃən/',
    'liquidity': '/lɪˈkwɪdɪti/', 'portfolio': '/pɔːrtˈfoʊliəʊ/', 'infrastructure': '/ˈɪnfrəˌstrʌktʃər/',
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
window.pcOpen   = function() { _pcRender(); };
window.pcClose  = function() { _pcDestroy(); };

// ─────────────────────────────────────────────────────────────────────────────
// CSS injection
// ─────────────────────────────────────────────────────────────────────────────
function _pcInjectStyles() {
    if (_pc.styleInjected) return;
    _pc.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#pc-panel{position:fixed;inset:0;z-index:5500;background:rgba(0,5,20,0.96);display:flex;flex-direction:column;align-items:center;padding:20px 16px 100px;overflow-y:auto}',
        '.pc-header{display:flex;align-items:center;gap:12px;width:100%;max-width:720px;margin-bottom:24px}',
        '.pc-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#d4af37;flex:1}',
        '.pc-close-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1rem}',
        '.pc-card{background:rgba(255,255,255,0.04);border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:20px;width:100%;max-width:720px;margin-bottom:16px}',
        '.pc-card-title{font-size:0.68rem;letter-spacing:0.12em;color:#00d4ff;text-transform:uppercase;font-weight:700;margin-bottom:12px}',
        '.pc-sentence-display{font-size:1.05rem;line-height:1.9;color:rgba(255,255,255,0.9);letter-spacing:0.02em;word-spacing:4px;font-family:"Segoe UI",sans-serif;min-height:60px}',
        '.pc-word-target{display:inline-block;margin:2px 3px;padding:1px 4px;border-radius:4px;transition:background 0.3s,color 0.3s}',
        '.pc-word-good{background:rgba(0,245,160,0.18);color:#00f5a0;border-bottom:2px solid rgba(0,245,160,0.6)}',
        '.pc-word-ok  {background:rgba(255,200,0,0.15);color:#ffc800;border-bottom:2px solid rgba(255,200,0,0.5)}',
        '.pc-word-bad {background:rgba(255,80,80,0.15);color:#ff6b6b;border-bottom:2px solid rgba(255,80,80,0.5)}',
        '.pc-word-skip{color:rgba(255,255,255,0.3)}',
        '.pc-controls{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}',
        '.pc-btn{padding:9px 18px;border-radius:10px;border:1px solid;cursor:pointer;font-size:0.82rem;font-weight:600;transition:all 0.2s}',
        '.pc-btn-record{background:rgba(255,80,80,0.15);border-color:rgba(255,80,80,0.5);color:#ff6b6b}',
        '.pc-btn-record:hover{background:rgba(255,80,80,0.25)}',
        '.pc-btn-record.recording{background:rgba(255,0,0,0.3);border-color:#ff0000;animation:pc-pulse 1s infinite}',
        '.pc-btn-play{background:rgba(0,212,255,0.12);border-color:rgba(0,212,255,0.4);color:#00d4ff}',
        '.pc-btn-play:hover{background:rgba(0,212,255,0.22)}',
        '.pc-btn-next{background:rgba(212,175,55,0.12);border-color:rgba(212,175,55,0.4);color:#d4af37}',
        '.pc-btn-next:hover{background:rgba(212,175,55,0.22)}',
        '@keyframes pc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,0,0,0.4)}50%{box-shadow:0 0 0 8px rgba(255,0,0,0)}}',
        '.pc-score-ring{display:flex;align-items:center;gap:20px;margin-top:12px;flex-wrap:wrap}',
        '.pc-ring-wrap{width:80px;height:80px;position:relative}',
        '.pc-ring-wrap svg{transform:rotate(-90deg)}',
        '.pc-ring-bg{fill:none;stroke:rgba(255,255,255,0.1);stroke-width:6}',
        '.pc-ring-fg{fill:none;stroke-width:6;stroke-linecap:round;transition:stroke-dashoffset 0.8s ease}',
        '.pc-ring-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Orbitron,sans-serif;font-size:0.95rem;font-weight:700}',
        '.pc-score-details{display:flex;flex-direction:column;gap:6px;flex:1}',
        '.pc-score-bar-row{display:flex;align-items:center;gap:8px;font-size:0.78rem}',
        '.pc-score-bar-label{width:70px;color:rgba(255,255,255,0.5)}',
        '.pc-score-bar-track{flex:1;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden}',
        '.pc-score-bar-fill{height:100%;border-radius:3px;transition:width 0.8s ease}',
        '.pc-score-val{width:30px;text-align:right;color:rgba(255,255,255,0.7)}',
        '.pc-feedback-word{margin-bottom:8px;padding:8px;background:rgba(255,80,80,0.06);border-radius:8px;border-left:3px solid rgba(255,80,80,0.4)}',
        '.pc-feedback-word-text{color:#ff9999;font-weight:600;font-size:0.88rem}',
        '.pc-feedback-ipa{color:rgba(255,255,255,0.4);font-size:0.78rem;margin-top:2px}',
        '.pc-no-support{background:rgba(255,180,0,0.1);border:1px solid rgba(255,180,0,0.3);border-radius:10px;padding:14px;color:rgba(255,200,0,0.9);font-size:0.85rem;text-align:center}',
        '.pc-status{font-size:0.8rem;color:rgba(255,255,255,0.4);min-height:20px;margin-top:6px}',
        '.pc-hint{font-size:0.75rem;color:rgba(0,212,255,0.6);margin-top:6px;font-style:italic}',
        '.pc-history-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)}',
        '.pc-history-score{font-family:Orbitron,sans-serif;font-size:0.9rem;font-weight:700;width:40px}',
        '.pc-history-text{font-size:0.78rem;color:rgba(255,255,255,0.5);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    ].join('');
    document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Render / Mount
// ─────────────────────────────────────────────────────────────────────────────
function _pcRender() {
    _pcInjectStyles();
    _pcDestroy();
    _pc.active = true;

    var panel = document.createElement('div');
    panel.id = 'pc-panel';

    var supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    var noSupportHtml = supported ? '' :
        '<div class="pc-no-support">⚠️ Speech recognition is not supported in this browser. ' +
        'Please use <strong>Google Chrome</strong> for the full pronunciation experience.</div>';

    panel.innerHTML =
        '<div class="pc-header">' +
            '<div class="pc-title">🎙️ Pronunciation Coach</div>' +
            '<button class="pc-close-btn" onclick="pcClose()">×</button>' +
        '</div>' +
        noSupportHtml +
        '<div class="pc-card" id="pc-practice-card">' +
            '<div class="pc-card-title">Practice Sentence</div>' +
            '<div class="pc-sentence-display" id="pc-sentence">—</div>' +
            '<div class="pc-hint" id="pc-hint">Click "Listen" to hear the sentence, then "Record" to practice.</div>' +
            '<div class="pc-status" id="pc-status"></div>' +
            '<div class="pc-controls">' +
                '<button class="pc-btn pc-btn-play" onclick="_pcPlayTarget()">🔊 Listen</button>' +
                (supported ? '<button class="pc-btn pc-btn-record" id="pc-rec-btn" onclick="_pcToggleRecord()">🎙️ Record</button>' : '') +
                '<button class="pc-btn pc-btn-next" onclick="_pcNextSentence()">↻ New Sentence</button>' +
            '</div>' +
        '</div>' +
        '<div class="pc-card" id="pc-score-card" style="display:none">' +
            '<div class="pc-card-title">Your Score</div>' +
            '<div id="pc-score-content"></div>' +
        '</div>' +
        '<div class="pc-card" id="pc-history-card" style="display:none">' +
            '<div class="pc-card-title">Recent Sessions</div>' +
            '<div id="pc-history-content"></div>' +
        '</div>';

    document.body.appendChild(panel);

    _pcNextSentence();
    _pcLoadHistory();
}

function _pcDestroy() {
    _pcStopRecognition();
    var panel = document.getElementById('pc-panel');
    if (panel) panel.remove();
    _pc.active = false;
    _pc.listening = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sentence Management
// ─────────────────────────────────────────────────────────────────────────────
function _pcNextSentence() {
    var idx = Math.floor(Math.random() * _pcSentences.length);
    var s = _pcSentences[idx];
    _pc.targetText = s.text;
    _pc.targetWords = _pcTokenize(s.text);
    _pc.lastResult = null;

    var el = document.getElementById('pc-sentence');
    if (el) {
        el.innerHTML = _pc.targetWords.map(function(w) {
            return '<span class="pc-word-target" data-w="' + _pcSanitize(w) + '">' + _pcSanitize(w) + '</span>';
        }).join(' ');
    }
    _pcSetStatus('');
    var sc = document.getElementById('pc-score-card');
    if (sc) sc.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — play target sentence
// ─────────────────────────────────────────────────────────────────────────────
function _pcPlayTarget() {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(_pc.targetText);
    u.lang = 'en-US'; u.rate = 0.82;
    _pcSetStatus('▶ Playing…');
    u.onend = function() { _pcSetStatus('Now click Record and repeat the sentence.'); };
    speechSynthesis.speak(u);
}

// ─────────────────────────────────────────────────────────────────────────────
// Speech Recognition
// ─────────────────────────────────────────────────────────────────────────────
function _pcToggleRecord() {
    if (_pc.listening) { _pcStopRecognition(); }
    else { _pcStartRecognition(); }
}

function _pcStartRecognition() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    _pcStopRecognition();
    var r = new SR();
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;
    _pc.recognition = r;
    _pc.listening = true;

    var btn = document.getElementById('pc-rec-btn');
    if (btn) { btn.textContent = '⏹ Stop'; btn.classList.add('recording'); }
    _pcSetStatus('🔴 Listening… speak clearly');

    r.onresult = function(e) {
        var transcript = '';
        var confidence = 0;
        var count = 0;
        for (var i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
                transcript = e.results[i][0].transcript;
                confidence = e.results[i][0].confidence;
                // Check alternates for best match
                for (var j = 0; j < e.results[i].length; j++) {
                    if (e.results[i][j].confidence > confidence) {
                        confidence = e.results[i][j].confidence;
                        transcript = e.results[i][j].transcript;
                    }
                }
                count++;
            } else {
                // Interim — show live
                var interim = e.results[i][0].transcript;
                _pcSetStatus('🎙 ' + interim + '…');
            }
        }
        if (count > 0) _pcEvaluate(transcript, confidence);
    };

    r.onerror = function(e) {
        _pcSetStatus('Error: ' + (e.error === 'no-speech' ? 'No speech detected. Try again.' : e.error));
        _pcResetRecBtn();
        _pc.listening = false;
    };

    r.onend = function() {
        _pcResetRecBtn();
        _pc.listening = false;
    };

    r.start();
}

function _pcStopRecognition() {
    if (_pc.recognition) {
        try { _pc.recognition.stop(); } catch(e) {}
        _pc.recognition = null;
    }
    _pcResetRecBtn();
    _pc.listening = false;
}

function _pcResetRecBtn() {
    var btn = document.getElementById('pc-rec-btn');
    if (btn) { btn.textContent = '🎙️ Record'; btn.classList.remove('recording'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Engine
// ─────────────────────────────────────────────────────────────────────────────
function _pcEvaluate(transcript, apiConfidence) {
    var spokenWords = _pcTokenize(transcript.toLowerCase());
    var targetLow   = _pc.targetWords.map(function(w){ return w.toLowerCase(); });

    // Word-level alignment using Levenshtein-based dynamic programming
    var alignment = _pcAlign(targetLow, spokenWords);

    // Per-word scores
    var wordScores = [];
    var totalAccuracy = 0;

    alignment.forEach(function(a) {
        var sim = 1 - (_pcLevenshtein(a.target, a.spoken) / Math.max(a.target.length, a.spoken.length, 1));
        sim = Math.max(0, Math.min(1, sim));
        wordScores.push({ target: a.target, spoken: a.spoken, sim: sim });
        totalAccuracy += sim;
    });

    var wordAccuracy = targetLow.length > 0 ? Math.round((totalAccuracy / targetLow.length) * 100) : 0;

    // Fluency: average confidence × 100 (0-100)
    var fluency = apiConfidence > 0
        ? Math.min(100, Math.round(apiConfidence * 100))
        : Math.min(100, Math.round(wordAccuracy * 0.9 + 10)); // estimate if no confidence

    // Completeness: what % of target words were spoken
    var completeness = Math.min(100, Math.round((spokenWords.length / Math.max(1, targetLow.length)) * 100));
    completeness = Math.min(completeness, 100);

    // Overall: weighted combination
    var overall = Math.round(wordAccuracy * 0.55 + fluency * 0.30 + completeness * 0.15);
    overall = Math.min(100, Math.max(0, overall));

    _pc.lastResult = { overall: overall, wordAccuracy: wordAccuracy, fluency: fluency, completeness: completeness, wordScores: wordScores, transcript: transcript };

    _pcRenderScore(_pc.lastResult);
    _pcHighlightWords(wordScores);
    _pcSaveHistory(overall, _pc.targetText);

    // XP reward
    if (overall >= 80 && typeof addXP === 'function') addXP(15);
    else if (overall >= 60 && typeof addXP === 'function') addXP(8);
    else if (typeof addXP === 'function') addXP(3);

    _pcSetStatus('Analysis complete!');
}

// Sequence alignment: match target words to spoken words using DP
function _pcAlign(target, spoken) {
    var n = target.length, m = spoken.length;
    // Build cost matrix using Levenshtein on full word strings
    var dp = [];
    for (var i = 0; i <= n; i++) {
        dp[i] = [];
        for (var j = 0; j <= m; j++) {
            if (i === 0) { dp[i][j] = j; continue; }
            if (j === 0) { dp[i][j] = i; continue; }
            var cost = _pcLevenshtein(target[i-1], spoken[j-1]) > 1 ? 1 : 0;
            dp[i][j] = Math.min(
                dp[i-1][j-1] + cost,
                dp[i-1][j]   + 1,
                dp[i][j-1]   + 1
            );
        }
    }
    // Traceback
    var result = [];
    var i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0) {
            var cost2 = _pcLevenshtein(target[i-1], spoken[j-1]) > 1 ? 1 : 0;
            if (dp[i][j] === dp[i-1][j-1] + cost2) {
                result.unshift({ target: target[i-1], spoken: spoken[j-1] });
                i--; j--;
                continue;
            }
        }
        if (i > 0 && (j === 0 || dp[i][j] === dp[i-1][j] + 1)) {
            result.unshift({ target: target[i-1], spoken: '' }); i--;
        } else {
            j--;
        }
    }
    return result;
}

// Classic Levenshtein distance
function _pcLevenshtein(a, b) {
    if (!a) return b ? b.length : 0;
    if (!b) return a.length;
    var m = a.length, n = b.length;
    var prev = [], curr = [];
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
        curr[0] = i;
        for (var j2 = 1; j2 <= n; j2++) {
            curr[j2] = a[i-1] === b[j2-1]
                ? prev[j2-1]
                : 1 + Math.min(prev[j2-1], prev[j2], curr[j2-1]);
        }
        var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
}

// ─────────────────────────────────────────────────────────────────────────────
// Render Score Card
// ─────────────────────────────────────────────────────────────────────────────
function _pcRenderScore(r) {
    var scoreCard = document.getElementById('pc-score-card');
    var scoreContent = document.getElementById('pc-score-content');
    if (!scoreCard || !scoreContent) return;

    var color = r.overall >= 80 ? '#00f5a0' : r.overall >= 60 ? '#ffc800' : '#ff6b6b';
    var circumference = 2 * Math.PI * 34; // r=34
    var dashOffset = circumference - (r.overall / 100) * circumference;

    // Problem words (sim < 0.6)
    var problemWords = r.wordScores.filter(function(w) { return w.sim < 0.6 && w.target; });

    var problemHtml = '';
    if (problemWords.length > 0) {
        problemHtml = '<div class="pc-card-title" style="margin-top:16px">Problem Words</div>';
        problemWords.slice(0, 5).forEach(function(pw) {
            var ipa = _pcPhonetics[pw.target] || '';
            problemHtml += '<div class="pc-feedback-word">' +
                '<div class="pc-feedback-word-text">' + _pcSanitize(pw.target) +
                (pw.spoken ? ' <span style="color:rgba(255,255,255,0.3);font-size:0.75rem">→ you said: "' + _pcSanitize(pw.spoken) + '"</span>' : ' <span style="color:rgba(255,255,255,0.2);font-size:0.75rem">(not said)</span>') +
                '</div>' +
                (ipa ? '<div class="pc-feedback-ipa">IPA: ' + ipa + ' <span class="eng-phonetic" onclick="_engSpeak(\'' + _pcSanitize(pw.target) + '\')" style="cursor:pointer">🔊</span></div>' : '') +
                '</div>';
        });
    }

    scoreContent.innerHTML =
        '<div class="pc-score-ring">' +
            '<div class="pc-ring-wrap">' +
                '<svg width="80" height="80" viewBox="0 0 80 80">' +
                    '<circle class="pc-ring-bg" cx="40" cy="40" r="34"/>' +
                    '<circle class="pc-ring-fg" cx="40" cy="40" r="34"' +
                    ' stroke="' + color + '"' +
                    ' stroke-dasharray="' + circumference + '"' +
                    ' stroke-dashoffset="' + dashOffset + '"/>' +
                '</svg>' +
                '<div class="pc-ring-label" style="color:' + color + '">' + r.overall + '</div>' +
            '</div>' +
            '<div class="pc-score-details">' +
                _pcScoreBar('Accuracy', r.wordAccuracy, '#00d4ff') +
                _pcScoreBar('Fluency',  r.fluency,      '#9d4edd') +
                _pcScoreBar('Complete', r.completeness, '#d4af37') +
            '</div>' +
        '</div>' +
        problemHtml +
        '<div style="font-size:0.75rem;color:rgba(255,255,255,0.3);margin-top:12px">You said: "' + _pcSanitize(r.transcript) + '"</div>';

    scoreCard.style.display = 'block';
    scoreCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _pcScoreBar(label, val, color) {
    return '<div class="pc-score-bar-row">' +
        '<span class="pc-score-bar-label">' + label + '</span>' +
        '<div class="pc-score-bar-track"><div class="pc-score-bar-fill" style="width:' + val + '%;background:' + color + '"></div></div>' +
        '<span class="pc-score-val">' + val + '</span>' +
        '</div>';
}

// ─────────────────────────────────────────────────────────────────────────────
// Highlight words in sentence display
// ─────────────────────────────────────────────────────────────────────────────
function _pcHighlightWords(wordScores) {
    var el = document.getElementById('pc-sentence');
    if (!el) return;
    var spans = el.querySelectorAll('.pc-word-target');
    var scoreMap = {};
    wordScores.forEach(function(ws) { scoreMap[ws.target] = ws.sim; });
    spans.forEach(function(sp) {
        var w = sp.getAttribute('data-w').toLowerCase();
        var sim = scoreMap[w];
        sp.className = 'pc-word-target';
        if (sim === undefined) { sp.classList.add('pc-word-skip'); }
        else if (sim >= 0.85)  { sp.classList.add('pc-word-good'); }
        else if (sim >= 0.60)  { sp.classList.add('pc-word-ok'); }
        else                   { sp.classList.add('pc-word-bad'); }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────────────────────
function _pcSaveHistory(score, text) {
    try {
        var hist = JSON.parse(localStorage.getItem(_pc.historyKey) || '[]');
        hist.unshift({ score: score, text: text, ts: Date.now() });
        if (hist.length > 20) hist = hist.slice(0, 20);
        localStorage.setItem(_pc.historyKey, JSON.stringify(hist));
    } catch(e) {}
    _pcLoadHistory();
}

function _pcLoadHistory() {
    var card = document.getElementById('pc-history-card');
    var content = document.getElementById('pc-history-content');
    if (!card || !content) return;
    try {
        var hist = JSON.parse(localStorage.getItem(_pc.historyKey) || '[]');
        if (!hist.length) { card.style.display = 'none'; return; }
        card.style.display = 'block';
        content.innerHTML = hist.slice(0, 8).map(function(h) {
            var color = h.score >= 80 ? '#00f5a0' : h.score >= 60 ? '#ffc800' : '#ff6b6b';
            return '<div class="pc-history-row">' +
                '<div class="pc-history-score" style="color:' + color + '">' + h.score + '</div>' +
                '<div class="pc-history-text">' + _pcSanitize(h.text) + '</div>' +
                '</div>';
        }).join('');
    } catch(e) { card.style.display = 'none'; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function _pcTokenize(text) {
    return text.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(Boolean);
}

function _pcSanitize(str) {
    return String(str || '').replace(/[<>"'`&]/g, function(c) {
        return { '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;", '`':'&#96;', '&':'&amp;' }[c];
    });
}

function _pcSetStatus(msg) {
    var el = document.getElementById('pc-status');
    if (el) el.textContent = msg;
}

// ─────────────────────────────────────────────────────────────────────────────
// Register the pronunciation coach in the BELC navigation
// Called by aus_09_english.js when the BELC panel renders
// ─────────────────────────────────────────────────────────────────────────────
window._pcRegister = function() {};  // hook for future integration

})();
