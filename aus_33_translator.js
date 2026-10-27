/*
 * AUS Translator — AR ↔ EN
 * Adds a translate button next to every question and options group
 * across all simulator modules.
 *
 * Targeted elements:
 *   .study-quiz-q      — Study module quiz question
 *   .study-quiz-opts   — Study module answer options container
 *   .study-card-text   — Flashcard text (front & back)
 *   .cdna-q-text       — Career DNA question
 *   .cdna-options      — Career DNA options container
 *   .intv-q-text       — AI Interview question
 */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────────────── */
  var _cache = {};   // originalText → translatedText

  /* ── Language detection ─────────────────────────────────────────────────── */
  function isAR(t) { return /[؀-ۿ]/.test(t); }

  /* ── Single text translation via MyMemory (free, no key needed) ─────────── */
  async function translateOne(text) {
    var key = text.trim();
    if (_cache[key]) return _cache[key];

    var fromLang = isAR(key) ? 'ar' : 'en';
    var toLang   = isAR(key) ? 'en' : 'ar';
    var langPair = fromLang + '|' + toLang;

    try {
      var url = 'https://api.mymemory.translated.net/get?q=' +
                encodeURIComponent(key) + '&langpair=' + langPair;
      var res = await fetch(url);
      if (!res.ok) throw new Error('http ' + res.status);
      var d   = await res.json();
      var out = (d.responseData && d.responseData.translatedText) || '';
      out = out.trim();
      /* MyMemory echoes the input when it can't translate — discard those */
      if (out && out.toLowerCase() !== key.toLowerCase()) {
        _cache[key] = out;
        return out;
      }
      return null;
    } catch (_) { return null; }
  }

  /* ── Batch translation — parallel MyMemory calls ────────────────────────── */
  async function translateBatch(texts) {
    var results = await Promise.all(texts.map(translateOne));
    /* Return only if at least half translated successfully */
    var ok = results.filter(function (r) { return r !== null; }).length;
    if (ok >= Math.ceil(texts.length / 2)) {
      return results.map(function (r, i) { return r !== null ? r : texts[i]; });
    }
    return null;
  }

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  function addStyles() {
    if (document.getElementById('aus-trans-styles')) return;
    var s = document.createElement('style');
    s.id = 'aus-trans-styles';
    s.textContent = [
      /* Question translate button */
      '.aus-trans-btn {',
      '  display: inline-flex; align-items: center; gap: 5px;',
      '  padding: 3px 11px 3px 8px; border-radius: 20px;',
      '  border: 1px solid rgba(0,212,255,0.22);',
      '  background: rgba(0,12,30,0.55);',
      '  color: rgba(0,212,255,0.65); font-size: 10.5px;',
      '  font-family: "Tajawal", sans-serif; font-weight: 600;',
      '  cursor: pointer; transition: all 0.2s;',
      '  margin-top: 7px; letter-spacing: 0.02em;',
      '  backdrop-filter: blur(8px);',
      '}',
      '.aus-trans-btn:hover {',
      '  background: rgba(0,212,255,0.10); color: #00d4ff;',
      '  border-color: rgba(0,212,255,0.45);',
      '  box-shadow: 0 0 10px rgba(0,212,255,0.12);',
      '}',
      '.aus-trans-btn.active {',
      '  background: rgba(123,47,255,0.12); color: #a78bfa;',
      '  border-color: rgba(123,47,255,0.38);',
      '}',
      '.aus-trans-btn i { font-size: 11px; }',
      /* Options batch-translate button */
      '.aus-trans-opts-btn {',
      '  display: flex; align-items: center; gap: 6px;',
      '  padding: 5px 14px; border-radius: 20px; margin-top: 12px;',
      '  border: 1px solid rgba(0,212,255,0.18);',
      '  background: rgba(0,12,30,0.45);',
      '  color: rgba(0,212,255,0.55); font-size: 10.5px;',
      '  font-family: "Tajawal", sans-serif; font-weight: 600;',
      '  cursor: pointer; transition: all 0.2s; width: 100%;',
      '  justify-content: center; letter-spacing: 0.02em;',
      '}',
      '.aus-trans-opts-btn:hover {',
      '  background: rgba(0,212,255,0.09); color: #00d4ff;',
      '  border-color: rgba(0,212,255,0.4);',
      '}',
      '.aus-trans-opts-btn.active {',
      '  background: rgba(123,47,255,0.10); color: #a78bfa;',
      '  border-color: rgba(123,47,255,0.35);',
      '}',
      '[data-trans-active="1"] { direction: ltr; text-align: left; }',
      '[data-trans-active="1"][lang="ar"] { direction: rtl; text-align: right; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── Inject translate button after a single question element ─────────────── */
  function injectQBtn(el) {
    if (el.dataset.transInited) return;
    el.dataset.transInited = '1';

    var original = (el.textContent || '').trim();
    if (original.length < 4) return;

    var srcLang  = isAR(original) ? 'AR' : 'EN';
    var tgtLabel = srcLang === 'AR' ? '🌐 EN' : '🌐 AR';
    var srcLabel = srcLang === 'AR' ? '🔄 AR' : '🔄 EN';

    var btn = document.createElement('button');
    btn.className   = 'aus-trans-btn';
    btn.innerHTML   = '<i class="fas fa-language"></i>' + tgtLabel;
    btn.dataset.state = 'original';

    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      if (btn.dataset.state === 'loading') return;

      /* ── Restore original ── */
      if (btn.dataset.state === 'translated') {
        el.textContent = original;
        el.removeAttribute('data-trans-active');
        btn.innerHTML = '<i class="fas fa-language"></i>' + tgtLabel;
        btn.dataset.state = 'original';
        btn.classList.remove('active');
        return;
      }

      /* ── Translate ── */
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
      btn.dataset.state = 'loading';

      var result = await translateOne(original);
      if (result) {
        el.textContent = result;
        var resultLang = isAR(result) ? 'ar' : 'en';
        el.dataset.transActive = '1';
        el.lang = resultLang;
        btn.innerHTML = '<i class="fas fa-language"></i>' + srcLabel;
        btn.dataset.state = 'translated';
        btn.classList.add('active');
      } else {
        btn.innerHTML = '<i class="fas fa-language"></i>' + tgtLabel;
        btn.dataset.state = 'original';
      }
    });

    el.insertAdjacentElement('afterend', btn);
  }

  /* ── Get text nodes from an option button (skips letter-badge spans) ──────── */
  function getOptionText(btn) {
    var text = '';
    btn.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {
        text += n.textContent;
      } else if (n.nodeType === 1 && !n.classList.contains('cdna-option-letter') &&
                 !n.classList.contains('aus-trans-opts-btn')) {
        text += n.textContent;
      }
    });
    return text.trim();
  }

  function setOptionText(btn, newText) {
    /* Replace the raw text node content, leaving letter badges untouched */
    btn.childNodes.forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim().length > 1) {
        n.textContent = ' ' + newText;
      }
    });
    /* Fallback: no plain text node found — option renders as single text node */
    var hasTextNode = Array.from(btn.childNodes).some(function (n) {
      return n.nodeType === 3 && n.textContent.trim().length > 1;
    });
    if (!hasTextNode) {
      /* Find the deepest text-carrying child */
      var walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, null);
      var node;
      while ((node = walker.nextNode())) {
        if (node.textContent.trim().length > 1) {
          node.textContent = newText;
          break;
        }
      }
    }
  }

  /* ── Inject batch-translate button after an options container ──────────────── */
  function injectOptsBtn(container, optSelector) {
    if (container.dataset.transInited) return;
    container.dataset.transInited = '1';

    var optEls = Array.from(container.querySelectorAll(optSelector));
    if (!optEls.length) return;

    var originals   = optEls.map(getOptionText);
    var hasMeaningfulText = originals.some(function (t) { return t.length > 2; });
    if (!hasMeaningfulText) return;

    var srcLang  = isAR(originals[0]) ? 'AR' : 'EN';
    var tgtLabel = srcLang === 'AR' ? '🌐 ترجم الخيارات ↔ EN' : '🌐 Translate Options ↔ AR';
    var srcLabel = srcLang === 'AR' ? '🔄 استعد الخيارات AR'   : '🔄 Restore Options EN';

    var btn = document.createElement('button');
    btn.className   = 'aus-trans-opts-btn';
    btn.innerHTML   = '<i class="fas fa-language"></i>' + tgtLabel;
    btn.dataset.state = 'original';

    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      if (btn.dataset.state === 'loading') return;

      /* ── Restore ── */
      if (btn.dataset.state === 'translated') {
        optEls.forEach(function (el, i) { setOptionText(el, originals[i]); });
        btn.innerHTML = '<i class="fas fa-language"></i>' + tgtLabel;
        btn.dataset.state = 'original';
        btn.classList.remove('active');
        return;
      }

      /* ── Translate batch ── */
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> جاري الترجمة...';
      btn.dataset.state = 'loading';

      var results = await translateBatch(originals);
      if (results && results.length === optEls.length) {
        optEls.forEach(function (el, i) { setOptionText(el, results[i]); });
        btn.innerHTML = '<i class="fas fa-language"></i>' + srcLabel;
        btn.dataset.state = 'translated';
        btn.classList.add('active');
      } else {
        btn.innerHTML = '<i class="fas fa-language"></i>' + tgtLabel;
        btn.dataset.state = 'original';
      }
    });

    container.insertAdjacentElement('afterend', btn);
  }

  /* ── Scan a root node and inject all buttons ────────────────────────────── */
  function scan(root) {
    root = root || document;

    /* Single-question elements */
    var qSelectors = [
      '.study-quiz-q',
      '.study-card-text',
      '.cdna-q-text',
      '.intv-q-text',
      '.sim-scenario',
    ];
    qSelectors.forEach(function (sel) {
      root.querySelectorAll(sel).forEach(injectQBtn);
    });

    /* Options groups */
    root.querySelectorAll('.study-quiz-opts').forEach(function (c) {
      injectOptsBtn(c, '.study-quiz-opt');
    });
    root.querySelectorAll('.cdna-options').forEach(function (c) {
      injectOptsBtn(c, '.cdna-option');
    });
    root.querySelectorAll('.sim-options').forEach(function (c) {
      injectOptsBtn(c, '.sim-option');
    });
  }

  /* ── MutationObserver — catches dynamically rendered content ─────────────── */
  function startObserver() {
    var Q_CLASSES = new Set([
      'study-quiz-q', 'study-card-text', 'cdna-q-text', 'intv-q-text',
      'sim-scenario', 'study-quiz-opts', 'cdna-options', 'sim-options',
    ]);

    function handleNode(node) {
      if (node.nodeType !== 1) return;
      var cls = node.className || '';
      /* Check if this node itself is a target */
      Q_CLASSES.forEach(function (c) {
        if (cls.indexOf(c) !== -1) {
          if (c === 'study-quiz-opts') injectOptsBtn(node, '.study-quiz-opt');
          else if (c === 'cdna-options')  injectOptsBtn(node, '.cdna-option');
          else                            injectQBtn(node);
        }
      });
      /* Check descendants */
      scan(node);
    }

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(handleNode);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */
  function init() {
    addStyles();
    scan();
    startObserver();
    /* Re-scan every 1.5 s for late-rendering content */
    setInterval(scan, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
