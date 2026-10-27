// =============================================================================
// aus_35_vocab_engine.js  —  AUS AI Smart Vocabulary Master
// Spaced-repetition (SM-2) engine + adaptive question selection + mastery gating
// Data source: window._VOCAB_LEVELS (see aus_34_vocab_data.js)
// Storage: localStorage key 'aus.vocabMaster.v1'
// Registers with window._AUS_REGISTRY / emits window._AUS_BUS 'XP_AWARDED'
// =============================================================================

(function () {
'use strict';

var STORE_KEY   = 'aus.vocabMaster.v1';
var MASTERY_GATE = 90;   // % average mastery required to unlock next level
var MIN_REVIEWS  = 3;    // each word must be reviewed at least this many times
var MIN_WORD_MASTERY = 70; // no single word may lag below this once level is "complete"
var NEW_CARDS_PER_SESSION = 8;
var SESSION_SIZE = 12;

// ── State ───────────────────────────────────────────────────────────────────
var VM = {
    cards: {},          // id -> { ef, interval, repetition, due, reviews, lapses, mastery, lastQuality }
    unlockedLevel: 1,
    streak: 0,
    lastDate: null,
    totalReviews: 0,
    session: null        // { levelIdx, queue:[{wordId, type}], pos, correct, wrong, results:[] }
};

function _load() {
    try {
        var raw = localStorage.getItem(STORE_KEY);
        if (raw) {
            var d = JSON.parse(raw);
            VM.cards = d.cards || {};
            VM.unlockedLevel = d.unlockedLevel || 1;
            VM.streak = d.streak || 0;
            VM.lastDate = d.lastDate || null;
            VM.totalReviews = d.totalReviews || 0;
        }
    } catch (e) {}
}
function _save() {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify({
            cards: VM.cards, unlockedLevel: VM.unlockedLevel,
            streak: VM.streak, lastDate: VM.lastDate, totalReviews: VM.totalReviews
        }));
    } catch (e) {}
}
function _touchStreak() {
    var today = new Date().toISOString().slice(0, 10);
    if (VM.lastDate === today) return;
    var yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    VM.streak = (VM.lastDate === yest) ? VM.streak + 1 : 1;
    VM.lastDate = today;
}

// ── Word identity ───────────────────────────────────────────────────────────
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function wordId(levelNum, w) { return 'L' + levelNum + '_' + slug(w.en); }

function _levels() { return window._VOCAB_LEVELS || []; }
function _levelByNum(n) { return _levels().find(function (l) { return l.level === n; }); }

function getCard(id) {
    if (!VM.cards[id]) {
        VM.cards[id] = { ef: 2.5, interval: 0, repetition: 0, due: 0, reviews: 0, lapses: 0, mastery: 0, lastQuality: null };
    }
    return VM.cards[id];
}

// ── SM-2 spaced repetition (scheduling) ──────────────────────────────────────
// quality: 0=blackout 1=wrong-familiar 2=wrong-easy 3=correct-hard 4=correct-good 5=correct-easy
function sm2Update(card, quality) {
    if (quality < 3) {
        card.repetition = 0;
        card.interval = 1;
        card.lapses += 1;
    } else {
        if (card.repetition === 0) card.interval = 1;
        else if (card.repetition === 1) card.interval = 6;
        else card.interval = Math.round(card.interval * card.ef);
        card.repetition += 1;
    }
    card.ef = Math.max(1.3, card.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    card.due = Date.now() + card.interval * 86400000;
    card.lastQuality = quality;
    card.reviews += 1;
}

// ── Mastery score (gating metric — independent of SM-2 scheduling) ─────────
function masteryUpdate(card, quality) {
    if (quality >= 4)      card.mastery = Math.min(100, card.mastery + 22);
    else if (quality === 3) card.mastery = Math.min(100, card.mastery + 12);
    else if (quality === 2) card.mastery = Math.max(0, card.mastery - 12);
    else                    card.mastery = Math.max(0, card.mastery - 25);
}

function recordAnswer(id, quality) {
    var card = getCard(id);
    sm2Update(card, quality);
    masteryUpdate(card, quality);
    VM.totalReviews += 1;
    _touchStreak();
    _save();
    return card;
}

// ── Level mastery + gating ──────────────────────────────────────────────────
function levelStats(levelNum) {
    var lvl = _levelByNum(levelNum);
    if (!lvl) return { avg: 0, minMastery: 0, minReviews: 0, done: 0, total: 0 };
    var sum = 0, minM = 100, minR = 999, done = 0;
    lvl.words.forEach(function (w) {
        var c = getCard(wordId(levelNum, w));
        sum += c.mastery;
        if (c.mastery < minM) minM = c.mastery;
        if (c.reviews < minR) minR = c.reviews;
        if (c.reviews > 0) done++;
    });
    var total = lvl.words.length;
    return { avg: Math.round(sum / total), minMastery: Math.round(minM), minReviews: minR, done: done, total: total };
}
function isLevelMastered(levelNum) {
    var s = levelStats(levelNum);
    return s.avg >= MASTERY_GATE && s.minMastery >= MIN_WORD_MASTERY && s.minReviews >= MIN_REVIEWS;
}
function maybeUnlock(levelNum) {
    if (levelNum === VM.unlockedLevel && isLevelMastered(levelNum) && VM.unlockedLevel < 10) {
        VM.unlockedLevel = levelNum + 1;
        _save();
        if (window._AUS_BUS) window._AUS_BUS.emit('XP_AWARDED', { amount: 100, source: 'vocab_level_unlocked' });
        return true;
    }
    return false;
}

// ── Adaptive question-type selection (the "AI" heuristic) ──────────────────
function pickQuestionType(card) {
    if (card.reviews === 0) return 'flashcard';
    if (card.mastery < 40)  return 'multipleChoice';
    if (card.mastery < 75)  return (Math.random() < 0.5 ? 'multipleChoice' : 'listening');
    return (Math.random() < 0.5 ? 'typing' : 'listening');
}

// ── Session queue builder ───────────────────────────────────────────────────
function buildQueue(levelNum) {
    var lvl = _levelByNum(levelNum);
    if (!lvl) return [];
    var now = Date.now();
    var due = [], weak = [], fresh = [], learned = [];
    lvl.words.forEach(function (w) {
        var id = wordId(levelNum, w);
        var c = getCard(id);
        if (c.reviews === 0) fresh.push(id);
        else if (c.mastery < 70) weak.push(id);
        else if (c.due <= now) due.push(id);
        else learned.push(id);
    });
    // Priority: weak words first, then due reviews, then a capped batch of new words, then already-learned filler
    weak.sort(function (a, b) { return getCard(a).mastery - getCard(b).mastery; });
    var queueIds = [].concat(weak, due, fresh.slice(0, NEW_CARDS_PER_SESSION));
    if (queueIds.length < SESSION_SIZE) queueIds = queueIds.concat(learned);
    queueIds = queueIds.slice(0, SESSION_SIZE);
    if (!queueIds.length) queueIds = lvl.words.slice(0, SESSION_SIZE).map(function (w) { return wordId(levelNum, w); });
    return queueIds.map(function (id) { return { wordId: id, type: pickQuestionType(getCard(id)) }; });
}

function findWordByCardId(id) {
    for (var i = 0; i < _levels().length; i++) {
        var lvl = _levels()[i];
        for (var j = 0; j < lvl.words.length; j++) {
            if (wordId(lvl.level, lvl.words[j]) === id) return { word: lvl.words[j], level: lvl.level };
        }
    }
    return null;
}

// ── Speech synthesis ─────────────────────────────────────────────────────────
function _voiceFor(lang) {
    var vs = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (lang === 'ar') return vs.find(function (v) { return v.lang && v.lang.indexOf('ar') === 0; });
    return vs.find(function (v) { return v.lang && v.lang.indexOf('en') === 0; });
}
function speak(text, lang) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    u.rate = 0.92;
    var v = _voiceFor(lang);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
}

// ── Styles ───────────────────────────────────────────────────────────────────
function addStyles() {
    if (document.getElementById('vm-styles')) return;
    var s = document.createElement('style');
    s.id = 'vm-styles';
    s.textContent = [
        '.vm-wrap{max-width:1100px;margin:0 auto;padding:20px;font-family:"Tajawal",sans-serif;}',
        '.vm-head{text-align:center;margin-bottom:28px;}',
        '.vm-head h2{color:#d4af37;font-size:1.7rem;font-weight:800;margin:0 0 6px;text-shadow:0 0 20px rgba(212,175,55,0.35);}',
        '.vm-head p{color:rgba(255,255,255,0.5);font-size:0.9rem;margin:0;}',
        '.vm-stats{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:18px 0 0;}',
        '.vm-stat{background:rgba(0,12,30,0.55);border:1px solid rgba(212,175,55,0.25);border-radius:14px;padding:10px 18px;text-align:center;backdrop-filter:blur(10px);}',
        '.vm-stat b{display:block;color:#d4af37;font-size:1.2rem;}',
        '.vm-stat span{color:rgba(255,255,255,0.45);font-size:0.72rem;}',
        '.vm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:24px;}',
        '.vm-lvl{position:relative;border-radius:16px;padding:20px 16px;text-align:center;cursor:pointer;border:1px solid rgba(212,175,55,0.2);background:rgba(0,12,30,0.5);backdrop-filter:blur(10px);transition:all .25s;}',
        '.vm-lvl:hover{transform:translateY(-4px);border-color:rgba(212,175,55,0.55);box-shadow:0 10px 30px rgba(212,175,55,0.15);}',
        '.vm-lvl.locked{opacity:0.45;cursor:not-allowed;}',
        '.vm-lvl.locked:hover{transform:none;box-shadow:none;}',
        '.vm-lvl .vm-badge{width:52px;height:52px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.3rem;background:linear-gradient(135deg,#d4af37,#f4d675);color:#0a0812;}',
        '.vm-lvl.locked .vm-badge{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.35);}',
        '.vm-lvl h4{color:#fff;font-size:0.95rem;margin:0 0 4px;}',
        '.vm-lvl small{color:rgba(255,255,255,0.4);font-size:0.72rem;}',
        '.vm-bar{height:5px;border-radius:3px;background:rgba(255,255,255,0.08);margin-top:10px;overflow:hidden;}',
        '.vm-bar i{display:block;height:100%;background:linear-gradient(90deg,#d4af37,#00d4ff);}',
        '.vm-lock-icon{position:absolute;top:10px;left:10px;color:rgba(255,255,255,0.3);font-size:0.8rem;}',
        '.vm-back{background:none;border:1px solid rgba(212,175,55,0.3);color:#d4af37;padding:6px 16px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.82rem;margin-bottom:16px;}',
        '.vm-back:hover{background:rgba(212,175,55,0.1);}',
        '.vm-wordlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:18px 0;}',
        '.vm-word-chip{background:rgba(0,12,30,0.5);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all .2s;}',
        '.vm-word-chip:hover{border-color:rgba(0,212,255,0.4);}',
        '.vm-word-chip .en{color:#fff;font-weight:700;font-size:0.95rem;}',
        '.vm-word-chip .ar{color:#d4af37;font-size:0.85rem;margin-top:2px;}',
        '.vm-word-chip .m{margin-top:8px;}',
        '.vm-start-btn{display:block;margin:22px auto 0;background:linear-gradient(135deg,#d4af37,#f4d675);color:#0a0812;border:none;font-weight:800;padding:13px 40px;border-radius:26px;cursor:pointer;font-family:inherit;font-size:1rem;box-shadow:0 8px 24px rgba(212,175,55,0.3);}',
        '.vm-start-btn:hover{transform:translateY(-2px);}',
        '.vm-card{background:rgba(0,12,30,0.65);border:1px solid rgba(212,175,55,0.25);border-radius:20px;padding:32px;max-width:640px;margin:0 auto;backdrop-filter:blur(16px);box-shadow:0 20px 50px rgba(0,0,0,0.4);}',
        '.vm-progress{display:flex;align-items:center;gap:10px;max-width:640px;margin:0 auto 20px;}',
        '.vm-progress .track{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;}',
        '.vm-progress .track i{display:block;height:100%;background:linear-gradient(90deg,#00d4ff,#d4af37);}',
        '.vm-progress span{color:rgba(255,255,255,0.5);font-size:0.78rem;white-space:nowrap;}',
        '.vm-term{text-align:center;}',
        '.vm-term .en{font-size:2.1rem;font-weight:900;color:#fff;direction:ltr;}',
        '.vm-term .ipa{color:rgba(0,212,255,0.7);font-size:0.95rem;margin-top:6px;direction:ltr;}',
        '.vm-term .arph{color:rgba(255,255,255,0.4);font-size:0.85rem;margin-top:2px;}',
        '.vm-term .pos{display:inline-block;margin-top:10px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3);color:#d4af37;padding:3px 14px;border-radius:14px;font-size:0.72rem;}',
        '.vm-speak{background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);color:#00d4ff;width:38px;height:38px;border-radius:50%;cursor:pointer;margin:14px 6px 0;font-size:1rem;}',
        '.vm-speak:hover{background:rgba(0,212,255,0.2);}',
        '.vm-flip-hint{color:rgba(255,255,255,0.35);font-size:0.78rem;margin-top:18px;}',
        '.vm-def{background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;margin-top:18px;}',
        '.vm-def .en-def{color:rgba(255,255,255,0.75);font-size:0.9rem;line-height:1.6;direction:ltr;text-align:left;}',
        '.vm-def .ar-def{color:#fff;font-size:0.92rem;line-height:1.8;margin-top:8px;}',
        '.vm-ex{margin-top:14px;padding-top:14px;border-top:1px dashed rgba(255,255,255,0.1);}',
        '.vm-ex .tag{color:#00d4ff;font-size:0.7rem;font-weight:700;letter-spacing:.05em;}',
        '.vm-ex .en{color:rgba(255,255,255,0.7);font-size:0.85rem;direction:ltr;text-align:left;margin-top:4px;font-style:italic;}',
        '.vm-ex .ar{color:rgba(255,255,255,0.55);font-size:0.82rem;margin-top:3px;}',
        '.vm-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}',
        '.vm-chip{background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.22);color:#d4af37;font-size:0.72rem;padding:3px 10px;border-radius:10px;direction:ltr;}',
        '.vm-chip.ant{background:rgba(255,80,80,0.06);border-color:rgba(255,80,80,0.2);color:#ff8080;}',
        '.vm-tip{background:rgba(0,245,160,0.06);border:1px solid rgba(0,245,160,0.22);border-radius:12px;padding:12px 14px;margin-top:12px;color:rgba(255,255,255,0.75);font-size:0.82rem;line-height:1.6;}',
        '.vm-tip b{color:#00f5a0;}',
        '.vm-mistake{background:rgba(255,180,0,0.06);border:1px solid rgba(255,180,0,0.22);border-radius:12px;padding:12px 14px;margin-top:10px;color:rgba(255,255,255,0.7);font-size:0.8rem;line-height:1.6;}',
        '.vm-mistake b{color:#ffb400;}',
        '.vm-rate-row{display:flex;gap:8px;margin-top:24px;justify-content:center;flex-wrap:wrap;}',
        '.vm-rate{flex:1;min-width:90px;max-width:130px;border:none;border-radius:14px;padding:12px 8px;cursor:pointer;font-family:inherit;font-weight:700;font-size:0.82rem;color:#fff;}',
        '.vm-rate.again{background:rgba(255,70,70,0.18);border:1px solid rgba(255,70,70,0.4);}',
        '.vm-rate.hard{background:rgba(255,180,0,0.15);border:1px solid rgba(255,180,0,0.4);}',
        '.vm-rate.good{background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);}',
        '.vm-rate.easy{background:rgba(0,245,160,0.15);border:1px solid rgba(0,245,160,0.4);}',
        '.vm-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px;}',
        '.vm-opt{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:14px;border-radius:12px;cursor:pointer;font-family:inherit;font-size:0.88rem;transition:all .15s;}',
        '.vm-opt:hover{border-color:rgba(0,212,255,0.4);background:rgba(0,212,255,0.06);}',
        '.vm-opt.correct{background:rgba(0,245,160,0.15);border-color:#00f5a0;}',
        '.vm-opt.wrong{background:rgba(255,70,70,0.15);border-color:#ff4646;}',
        '.vm-input-row{margin-top:22px;display:flex;gap:10px;}',
        '.vm-input{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:13px 16px;border-radius:12px;font-family:inherit;font-size:0.95rem;direction:ltr;text-align:left;}',
        '.vm-input:focus{outline:none;border-color:#00d4ff;}',
        '.vm-submit{background:#d4af37;color:#0a0812;border:none;padding:0 24px;border-radius:12px;cursor:pointer;font-weight:800;}',
        '.vm-feedback{margin-top:14px;text-align:center;font-size:0.88rem;padding:10px;border-radius:10px;}',
        '.vm-feedback.ok{background:rgba(0,245,160,0.1);color:#00f5a0;}',
        '.vm-feedback.no{background:rgba(255,70,70,0.1);color:#ff8080;}',
        '.vm-summary{text-align:center;}',
        '.vm-summary .pct{font-size:3rem;font-weight:900;color:#d4af37;}',
        '.vm-summary .lbl{color:rgba(255,255,255,0.5);font-size:0.9rem;margin-bottom:20px;}',
        '.vm-gate{margin-top:16px;padding:14px;border-radius:12px;font-size:0.85rem;line-height:1.6;}',
        '.vm-gate.unlocked{background:rgba(0,245,160,0.1);color:#00f5a0;border:1px solid rgba(0,245,160,0.3);}',
        '.vm-gate.locked{background:rgba(255,180,0,0.08);color:#ffcf70;border:1px solid rgba(255,180,0,0.25);}',
        '.vm-detail-modal{position:fixed;inset:0;background:rgba(0,4,12,0.75);z-index:15000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);}',
        '.vm-detail-inner{max-width:560px;width:100%;max-height:86vh;overflow-y:auto;}',
        '.vm-close{position:sticky;top:0;float:left;background:rgba(255,255,255,0.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;z-index:2;}',
        '.vm-ai-btn{margin-top:14px;background:rgba(123,47,255,0.1);border:1px solid rgba(123,47,255,0.35);color:#c084fc;padding:8px 18px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.78rem;}',
        '.vm-ai-btn:hover{background:rgba(123,47,255,0.18);}',
        '.vm-ai-out{margin-top:10px;background:rgba(123,47,255,0.05);border-radius:10px;padding:12px;font-size:0.82rem;color:rgba(255,255,255,0.75);line-height:1.6;display:none;}'
    ].join('\n');
    document.head.appendChild(s);
}

// ── Rendering: Level grid (home view) ───────────────────────────────────────
function renderVocabMaster() {
    addStyles();
    _load();
    var el = document.getElementById('vocab');
    if (!el) return;
    var totalWords = _levels().reduce(function (n, l) { return n + l.words.length; }, 0);
    var masteredWords = 0;
    _levels().forEach(function (l) {
        l.words.forEach(function (w) { if (getCard(wordId(l.level, w)).mastery >= 90) masteredWords++; });
    });

    var grid = _levels().map(function (l) {
        var st = levelStats(l.level);
        var locked = l.level > VM.unlockedLevel;
        var done = isLevelMastered(l.level);
        return '' +
        '<div class="vm-lvl ' + (locked ? 'locked' : '') + '" ' + (locked ? '' : 'onclick="_vmOpenLevel(' + l.level + ')"') + '>' +
            (locked ? '<span class="vm-lock-icon"><i class="fas fa-lock"></i></span>' : '') +
            '<div class="vm-badge">' + (done ? '<i class="fas fa-check"></i>' : l.level) + '</div>' +
            '<h4>' + l.title + '</h4>' +
            '<small>' + l.words.length + ' مصطلح</small>' +
            '<div class="vm-bar"><i style="width:' + st.avg + '%"></i></div>' +
            '<small style="display:block;margin-top:6px;color:' + (done ? '#00f5a0' : 'rgba(255,255,255,0.35)') + '">' + st.avg + '% إتقان</small>' +
        '</div>';
    }).join('');

    el.innerHTML =
    '<div class="vm-wrap">' +
        '<div class="vm-head">' +
            '<h2><i class="fas fa-brain"></i> AUS AI Smart Vocabulary Master</h2>' +
            '<p>نظام ذكي لحفظ مصطلحات إدارة الأعمال بالتكرار المتباعد — 10 مستويات × 20 مصطلحاً</p>' +
            '<div class="vm-stats">' +
                '<div class="vm-stat"><b>' + masteredWords + '/' + totalWords + '</b><span>مصطلح متقن</span></div>' +
                '<div class="vm-stat"><b>' + VM.unlockedLevel + '/10</b><span>المستوى الحالي</span></div>' +
                '<div class="vm-stat"><b>' + VM.streak + '</b><span>أيام متتالية 🔥</span></div>' +
                '<div class="vm-stat"><b>' + VM.totalReviews + '</b><span>مراجعة كلية</span></div>' +
            '</div>' +
        '</div>' +
        '<div class="vm-grid">' + grid + '</div>' +
    '</div>';
}

// ── Level detail (word list + start session) ────────────────────────────────
function _vmOpenLevel(levelNum) {
    var lvl = _levelByNum(levelNum);
    if (!lvl || levelNum > VM.unlockedLevel) return;
    var el = document.getElementById('vocab');
    var st = levelStats(levelNum);

    var chips = lvl.words.map(function (w, i) {
        var c = getCard(wordId(levelNum, w));
        var color = c.mastery >= 90 ? '#00f5a0' : c.mastery >= 50 ? '#d4af37' : 'rgba(255,255,255,0.3)';
        return '' +
        '<div class="vm-word-chip" onclick="_vmShowWordDetail(' + levelNum + ',' + i + ')">' +
            '<div class="en">' + w.en + '</div>' +
            '<div class="ar">' + w.ar + '</div>' +
            '<div class="m"><div class="vm-bar"><i style="width:' + c.mastery + '%;background:' + color + '"></i></div></div>' +
        '</div>';
    }).join('');

    el.innerHTML =
    '<div class="vm-wrap">' +
        '<button class="vm-back" onclick="renderVocabMaster()"><i class="fas fa-arrow-right"></i> رجوع للمستويات</button>' +
        '<div class="vm-head">' +
            '<h2>المستوى ' + levelNum + ' — ' + lvl.title + '</h2>' +
            '<p>' + st.avg + '% متوسط الإتقان &nbsp;·&nbsp; يتطلب 90% لفتح المستوى التالي</p>' +
        '</div>' +
        '<div class="vm-wordlist">' + chips + '</div>' +
        '<button class="vm-start-btn" onclick="_vmStartSession(' + levelNum + ')"><i class="fas fa-play"></i> ابدأ جلسة تدريب ذكية</button>' +
    '</div>';
}

// ── Word detail modal (full rich card) ──────────────────────────────────────
function _vmShowWordDetail(levelNum, idx) {
    var lvl = _levelByNum(levelNum);
    var w = lvl.words[idx];
    var modal = document.createElement('div');
    modal.className = 'vm-detail-modal';
    modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
    modal.innerHTML =
    '<div class="vm-detail-inner">' +
        '<div class="vm-card">' +
            '<button class="vm-close" onclick="this.closest(\'.vm-detail-modal\').remove()">✕</button>' +
            '<div class="vm-term">' +
                '<div class="en">' + w.en + '</div>' +
                '<div class="ipa">' + (w.ipa || '') + '</div>' +
                '<div class="arph">تُنطق: ' + (w.arPh || '') + '</div>' +
                '<span class="pos">' + (w.pos || '') + '</span><br/>' +
                '<button class="vm-speak" onclick="window._vmSpeak(\'' + w.en.replace(/'/g, "\\'") + '\',\'en\')"><i class="fas fa-volume-up"></i></button>' +
                '<button class="vm-speak" onclick="window._vmSpeak(\'' + w.ar.replace(/'/g, "\\'") + '\',\'ar\')"><i class="fas fa-volume-up"></i> ع</button>' +
            '</div>' +
            '<div class="vm-def">' +
                '<div class="en-def">' + w.defEn + '</div>' +
                '<div class="ar-def">' + w.defAr + '</div>' +
            '</div>' +
            '<div class="vm-ex"><div class="tag">EXAMPLE</div><div class="en">' + w.exEn + '</div><div class="ar">' + w.exAr + '</div></div>' +
            '<div class="vm-ex"><div class="tag">BUSINESS CONTEXT</div><div class="en">' + w.bizEn + '</div><div class="ar">' + w.bizAr + '</div></div>' +
            (w.syn && w.syn.length ? '<div class="vm-chips">' + w.syn.map(function (x) { return '<span class="vm-chip">' + x + '</span>'; }).join('') + '</div>' : '') +
            (w.ant && w.ant.length ? '<div class="vm-chips">' + w.ant.map(function (x) { return '<span class="vm-chip ant">' + x + '</span>'; }).join('') + '</div>' : '') +
            (w.collo && w.collo.length ? '<div class="vm-chips">' + w.collo.map(function (x) { return '<span class="vm-chip" style="color:#00d4ff;border-color:rgba(0,212,255,0.25);background:rgba(0,212,255,0.06)">' + x + '</span>'; }).join('') + '</div>' : '') +
            (w.mistake ? '<div class="vm-mistake"><b>⚠ خطأ شائع:</b> ' + w.mistake + '</div>' : '') +
            (w.trick ? '<div class="vm-tip"><b>💡 طريقة تذكر:</b> ' + w.trick + (w.image ? '<br/><b>🖼 صورة ذهنية:</b> ' + w.image : '') + '</div>' : '') +
            '<button class="vm-ai-btn" onclick="_vmAskAI(this,\'' + w.en.replace(/'/g, "\\'") + '\')"><i class="fas fa-robot"></i> اطلب مثالاً إضافياً من الذكاء الاصطناعي</button>' +
            '<div class="vm-ai-out"></div>' +
        '</div>' +
    '</div>';
    document.body.appendChild(modal);
}

function _vmAskAI(btn, term) {
    if (!window._AUS_AI || typeof window._AUS_AI.ask !== 'function') {
        btn.textContent = 'غير متاح حالياً — الخادم غير متصل';
        return;
    }
    var out = btn.nextElementSibling;
    btn.textContent = 'جارٍ التحضير...';
    window._AUS_AI.ask('vocabMaster',
        'Give one more short, realistic business-English example sentence using the word "' + term + '", then translate it to Arabic. Keep it under 2 lines total.',
        'You are a business English tutor. Be concise.',
        function (resp) {
            btn.style.display = 'none';
            out.style.display = 'block';
            out.textContent = (resp && (resp.reply || resp.text || resp.message)) || 'تعذر الحصول على رد الآن.';
        }
    );
}

// ── Session engine ───────────────────────────────────────────────────────────
function _vmStartSession(levelNum) {
    VM.session = {
        levelNum: levelNum,
        queue: buildQueue(levelNum),
        pos: 0,
        correct: 0,
        wrong: 0
    };
    _vmRenderQuestion();
}

function _vmRenderQuestion() {
    var sess = VM.session;
    var el = document.getElementById('vocab');
    if (sess.pos >= sess.queue.length) { _vmRenderSummary(); return; }

    var item = sess.queue[sess.pos];
    var found = findWordByCardId(item.wordId);
    var w = found.word;
    var pct = Math.round((sess.pos / sess.queue.length) * 100);

    var progressHtml =
    '<div class="vm-progress"><span>' + (sess.pos + 1) + '/' + sess.queue.length + '</span><div class="track"><i style="width:' + pct + '%"></i></div><span>✓' + sess.correct + ' ✗' + sess.wrong + '</span></div>';

    var body = '';
    if (item.type === 'flashcard') body = _vmFlashcardHtml(w);
    else if (item.type === 'multipleChoice') body = _vmMultipleChoiceHtml(w, sess.levelNum);
    else if (item.type === 'typing') body = _vmTypingHtml(w);
    else body = _vmListeningHtml(w);

    el.innerHTML = '<div class="vm-wrap">' + progressHtml + body + '</div>';
    if (item.type === 'listening') setTimeout(function () { speak(w.en, 'en'); }, 300);
}

function _vmFlashcardHtml(w) {
    return '' +
    '<div class="vm-card" id="vmFlipCard">' +
        '<div class="vm-term">' +
            '<div class="en">' + w.en + '</div>' +
            '<div class="ipa">' + (w.ipa || '') + '</div>' +
            '<div class="arph">' + (w.arPh || '') + '</div>' +
            '<span class="pos">' + (w.pos || '') + '</span><br/>' +
            '<button class="vm-speak" onclick="window._vmSpeak(\'' + w.en.replace(/'/g, "\\'") + '\',\'en\')"><i class="fas fa-volume-up"></i></button>' +
        '</div>' +
        '<div class="vm-def"><div class="ar-def" style="text-align:center;font-size:1.05rem">' + w.ar + '</div></div>' +
        '<div id="vmFlipMore" style="display:none">' +
            '<div class="vm-def"><div class="en-def">' + w.defEn + '</div><div class="ar-def">' + w.defAr + '</div></div>' +
            '<div class="vm-ex"><div class="tag">EXAMPLE</div><div class="en">' + w.exEn + '</div><div class="ar">' + w.exAr + '</div></div>' +
            (w.trick ? '<div class="vm-tip"><b>💡</b> ' + w.trick + '</div>' : '') +
            '<div class="vm-rate-row">' +
                '<button class="vm-rate again" onclick="_vmAnswerFlashcard(0)">لم أتذكر</button>' +
                '<button class="vm-rate hard" onclick="_vmAnswerFlashcard(3)">صعب</button>' +
                '<button class="vm-rate good" onclick="_vmAnswerFlashcard(4)">جيد</button>' +
                '<button class="vm-rate easy" onclick="_vmAnswerFlashcard(5)">سهل</button>' +
            '</div>' +
        '</div>' +
        '<div id="vmFlipHint" class="vm-flip-hint" onclick="document.getElementById(\'vmFlipMore\').style.display=\'block\';document.getElementById(\'vmFlipHint\').style.display=\'none\'" style="cursor:pointer">اضغط لإظهار المعنى والتقييم ⬇</div>' +
    '</div>';
}
function _vmAnswerFlashcard(quality) {
    var sess = VM.session;
    var item = sess.queue[sess.pos];
    recordAnswer(item.wordId, quality);
    if (quality >= 3) sess.correct++; else sess.wrong++;
    sess.pos++;
    _vmRenderQuestion();
}

function _vmMultipleChoiceHtml(w, levelNum) {
    var lvl = _levelByNum(levelNum);
    var pool = lvl.words.filter(function (o) { return o.en !== w.en; }).map(function (o) { return o.ar; });
    var opts = _shuffle(pool).slice(0, 3).concat([w.ar]);
    opts = _shuffle(opts);
    var btns = opts.map(function (o) {
        return '<button class="vm-opt" onclick="_vmAnswerChoice(this,\'' + o.replace(/'/g, "\\'") + '\',\'' + w.ar.replace(/'/g, "\\'") + '\')">' + o + '</button>';
    }).join('');
    return '' +
    '<div class="vm-card">' +
        '<div class="vm-term"><div class="en">' + w.en + '</div><div class="ipa">' + (w.ipa || '') + '</div>' +
        '<button class="vm-speak" onclick="window._vmSpeak(\'' + w.en.replace(/'/g, "\\'") + '\',\'en\')"><i class="fas fa-volume-up"></i></button></div>' +
        '<p style="text-align:center;color:rgba(255,255,255,0.5);font-size:0.85rem;margin-top:10px">اختر المعنى الصحيح</p>' +
        '<div class="vm-opts">' + btns + '</div>' +
        '<div id="vmMcFeedback"></div>' +
    '</div>';
}
function _vmAnswerChoice(btn, chosen, correct) {
    var isCorrect = chosen === correct;
    var buttons = btn.parentElement.querySelectorAll('.vm-opt');
    buttons.forEach(function (b) {
        b.onclick = null;
        if (b.textContent === correct) b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
    });
    var sess = VM.session;
    var item = sess.queue[sess.pos];
    var quality = isCorrect ? 4 : 1;
    recordAnswer(item.wordId, quality);
    if (isCorrect) sess.correct++; else sess.wrong++;
    document.getElementById('vmMcFeedback').innerHTML =
        '<div class="vm-feedback ' + (isCorrect ? 'ok' : 'no') + '">' + (isCorrect ? '✓ صحيح!' : '✗ الصحيح: ' + correct) + '</div>';
    setTimeout(function () { sess.pos++; _vmRenderQuestion(); }, 1100);
}

function _vmTypingHtml(w) {
    return '' +
    '<div class="vm-card">' +
        '<div class="vm-term"><div class="ar-def" style="font-size:1.15rem;color:#fff">' + w.ar + '</div>' +
        '<div style="color:rgba(255,255,255,0.4);font-size:0.8rem;margin-top:6px">' + w.defAr + '</div></div>' +
        '<p style="text-align:center;color:rgba(255,255,255,0.5);font-size:0.85rem;margin-top:14px">اكتب المصطلح بالإنجليزية</p>' +
        '<div class="vm-input-row">' +
            '<input class="vm-input" id="vmTypeInput" placeholder="type the word..." autocomplete="off" onkeydown="if(event.key===\'Enter\')_vmAnswerTyping(\'' + w.en.replace(/'/g, "\\'") + '\')" />' +
            '<button class="vm-submit" onclick="_vmAnswerTyping(\'' + w.en.replace(/'/g, "\\'") + '\')">تحقق</button>' +
        '</div>' +
        '<div id="vmTypeFeedback"></div>' +
    '</div>';
}
function _vmAnswerTyping(correct) {
    var input = document.getElementById('vmTypeInput');
    var typed = (input.value || '').trim().toLowerCase();
    var isCorrect = typed === correct.toLowerCase();
    var sess = VM.session;
    var item = sess.queue[sess.pos];
    recordAnswer(item.wordId, isCorrect ? 5 : 1);
    if (isCorrect) sess.correct++; else sess.wrong++;
    document.getElementById('vmTypeFeedback').innerHTML =
        '<div class="vm-feedback ' + (isCorrect ? 'ok' : 'no') + '">' + (isCorrect ? '✓ ممتاز!' : '✗ الصحيح: ' + correct) + '</div>';
    input.disabled = true;
    setTimeout(function () { sess.pos++; _vmRenderQuestion(); }, 1200);
}

function _vmListeningHtml(w) {
    return '' +
    '<div class="vm-card">' +
        '<div class="vm-term" style="text-align:center">' +
            '<button class="vm-speak" style="width:60px;height:60px;font-size:1.4rem" onclick="window._vmSpeak(\'' + w.en.replace(/'/g, "\\'") + '\',\'en\')"><i class="fas fa-volume-up"></i></button>' +
            '<p style="color:rgba(255,255,255,0.5);font-size:0.85rem;margin-top:14px">استمع واكتب الكلمة التي سمعتها</p>' +
        '</div>' +
        '<div class="vm-input-row">' +
            '<input class="vm-input" id="vmListenInput" placeholder="type what you heard..." autocomplete="off" onkeydown="if(event.key===\'Enter\')_vmAnswerListening(\'' + w.en.replace(/'/g, "\\'") + '\')" />' +
            '<button class="vm-submit" onclick="_vmAnswerListening(\'' + w.en.replace(/'/g, "\\'") + '\')">تحقق</button>' +
        '</div>' +
        '<div id="vmListenFeedback"></div>' +
    '</div>';
}
function _vmAnswerListening(correct) {
    var input = document.getElementById('vmListenInput');
    var typed = (input.value || '').trim().toLowerCase();
    var isCorrect = typed === correct.toLowerCase();
    var sess = VM.session;
    var item = sess.queue[sess.pos];
    recordAnswer(item.wordId, isCorrect ? 5 : 1);
    if (isCorrect) sess.correct++; else sess.wrong++;
    document.getElementById('vmListenFeedback').innerHTML =
        '<div class="vm-feedback ' + (isCorrect ? 'ok' : 'no') + '">' + (isCorrect ? '✓ ممتاز!' : '✗ الصحيح: ' + correct) + '</div>';
    input.disabled = true;
    setTimeout(function () { sess.pos++; _vmRenderQuestion(); }, 1200);
}

function _shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}

// ── Session summary + gating ────────────────────────────────────────────────
function _vmRenderSummary() {
    var sess = VM.session;
    var el = document.getElementById('vocab');
    var total = sess.correct + sess.wrong;
    var pct = total ? Math.round((sess.correct / total) * 100) : 0;
    var unlocked = maybeUnlock(sess.levelNum);
    var st = levelStats(sess.levelNum);

    if (window._AUS_BUS) window._AUS_BUS.emit('XP_AWARDED', { amount: sess.correct * 5, source: 'vocab_session' });

    var gateHtml;
    if (unlocked) {
        gateHtml = '<div class="vm-gate unlocked"><i class="fas fa-unlock"></i> تهانينا! أتقنت المستوى ' + sess.levelNum + ' وفُتح المستوى ' + (sess.levelNum + 1) + '.</div>';
    } else if (isLevelMastered(sess.levelNum)) {
        gateHtml = '<div class="vm-gate unlocked"><i class="fas fa-check"></i> هذا المستوى متقن بالفعل.</div>';
    } else {
        gateHtml = '<div class="vm-gate locked"><i class="fas fa-lock"></i> متوسط الإتقان الحالي ' + st.avg + '% — يتطلب 90% (بحد أدنى ' + MIN_REVIEWS + ' مراجعات لكل كلمة) لفتح المستوى التالي.</div>';
    }

    el.innerHTML =
    '<div class="vm-wrap">' +
        '<div class="vm-card vm-summary">' +
            '<div class="pct">' + pct + '%</div>' +
            '<div class="lbl">دقة هذه الجلسة — ✓' + sess.correct + ' / ✗' + sess.wrong + '</div>' +
            gateHtml +
            '<div class="vm-rate-row" style="margin-top:22px">' +
                '<button class="vm-rate good" onclick="_vmOpenLevel(' + sess.levelNum + ')">مراجعة المستوى</button>' +
                '<button class="vm-rate easy" onclick="_vmStartSession(' + sess.levelNum + ')">جلسة أخرى</button>' +
                '<button class="vm-rate hard" onclick="renderVocabMaster()">كل المستويات</button>' +
            '</div>' +
        '</div>' +
    '</div>';
}

// ── Registry / global exposure ───────────────────────────────────────────────
function vocabOpen() {
    if (typeof showSection === 'function') showSection('vocab');
    else renderVocabMaster();
}

window.renderVocabMaster   = renderVocabMaster;
window.vocabOpen           = vocabOpen;
window._vmOpenLevel        = _vmOpenLevel;
window._vmShowWordDetail   = _vmShowWordDetail;
window._vmStartSession     = _vmStartSession;
window._vmAnswerFlashcard  = _vmAnswerFlashcard;
window._vmAnswerChoice     = _vmAnswerChoice;
window._vmAnswerTyping     = _vmAnswerTyping;
window._vmAnswerListening  = _vmAnswerListening;
window._vmSpeak            = speak;
window._vmAskAI            = _vmAskAI;

_load();
if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('vocabMaster', { open: vocabOpen }, {
        name: 'AI Vocabulary Master', icon: '🧠', sectionId: 'vocab', defaultEnabled: true
    });
}

})();
