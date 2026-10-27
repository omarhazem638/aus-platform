/* ================================================================
   AUS — عارض Markdown الآمن (aus_56_markdown.js)                 window.AUS_MD
   ----------------------------------------------------------------
   لماذا؟ مُنسِّق ردود CEO AI القديم (richFormat في aus_07_studio.js) كان يطبّق تعابير نمطية على النص الخام دون تهريب HTML، فيصل ما يكتبه
   النموذج (أو يقتبسه من كلام الطالب) إلى innerHTML كما هو: <img onerror=…> أو <script> داخل خلية جدول أو عنوان تُنفَّذ. ثم يُحفَظ النص في
   localStorage ويُعاد رسمه عند فتح الصفحة (loadChatMemory) فيصير الخلل دائماً.

   هنا: نحلّل Markdown إلى كتل (فقرات، عناوين، قوائم متداخلة، جداول، اقتباسات، كتل شيفرة، خط أفقي) ونُهرّب كل نص قبل أن يدخل أي وسم.
   لا يمرّ أي HTML من المصدر إطلاقاً؛ الوسوم الوحيدة في الناتج هي التي نبنيها نحن، وروابط http/https/mailto فقط (target=_blank + rel=noopener).
   يستعمل أصناف CSS الموجودة أصلاً في index.html (aus-h3/h4/h5، aus-ul/ol، aus-table، aus-code-block، aus-quote، aus-inline-code، aus-followup) فلا يتغيّر
   التصميم. كل كتلة تحمل dir="auto" ليظهر النص العربي من اليمين والإنجليزي من اليسار داخل الرد نفسه.

   الواجهة:
     AUS_MD.render(text, {streaming})  → HTML آمن (يتحمّل النص الناقص أثناء البثّ: كتلة شيفرة غير مغلقة تُعرض كما هي)
     AUS_MD.splitFollowups(text)       → {text, followups[]}   السطر الأخير  [[followups: س1 | س2 | س3]]
     AUS_MD.hidePartialFollowups(text) → يخفي بداية ذلك السطر ما دام غير مكتمل أثناء البثّ
     AUS_MD.toPlain(text)              → نص عادي (للنسخ/القراءة الصوتية)
     AUS_MD.esc(s)  AUS_MD.safeUrl(u)
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_MD) return;

  var MAX_CHARS = 60000;                               // سقف لما يُحلَّل (ردود النموذج أقصر بكثير)

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // رابط مسموح: http / https / mailto فقط، بلا فراغات ولا أحرف تحكم؛ يُرجع الرابط مُهرَّباً للسمة أو ''
  function safeUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u || u.length > 2000 || /[\s\u0000-\u001f\u007f<>"'`\\]/.test(u)) return '';
    if (!/^(https?:\/\/[^\s\/?#]+|mailto:[^\s@]+@[^\s@]+)/i.test(u)) return '';
    return esc(u);
  }

  // ── النص المضمَّن (inline) ──────────────────────────────────────────────────────────────────────
  var TOK = '\u0001';
  function inline(raw) {
    var store = [];
    function hold(html) { store.push(html); return TOK + (store.length - 1) + TOK; }
    var t = String(raw == null ? '' : raw).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');   // بما فيها رمز الحجز نفسه (\u0001)

    // 1) مقاطع الشيفرة `…` تُحجز كما هي (مُهرَّبة)
    t = t.replace(/`([^`\n]{1,200})`/g, function (m, code) { return hold('<code class="aus-inline-code">' + esc(code) + '</code>'); });

    // 2) روابط [نص](رابط) — الرابط يُفحص قبل أن يصير سمة
    t = t.replace(/\[([^\[\]\n]{1,200})\]\(([^()\s]{1,2000})\)/g, function (m, text, url) {
      var u = safeUrl(url);
      if (!u) return m;                                // رابط غير مسموح: يبقى نصاً عادياً (يُهرَّب لاحقاً)
      return hold('<a href="' + u + '" target="_blank" rel="noopener noreferrer nofollow">' + emphasis(esc(text)) + '</a>');
    });

    // 3) تهريب الباقي ثم التشديد/الإمالة
    t = emphasis(esc(t));
    return t.replace(new RegExp(TOK + '(\\d+)' + TOK, 'g'), function (m, i) { return store[+i] != null ? store[+i] : ''; });
  }

  // على نص مُهرَّب: ***x*** **x** __x__ *x* _x_ ~~x~~ (الفراغ بعد الفتح وقبل الإغلاق يمنع التشديد: 2 * 3 * 4 ليست إمالة).
  // بلا look-behind عمداً: Safari قبل 16.4 يرفض الملف كله إن وُجد (SyntaxError عند التحليل)؛ لذلك يبدأ المحتوى وينتهي بحرف غير فراغ بصياغة صريحة.
  function emphasis(s) {
    s = s.replace(/\*\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^\w_])__([^\s_](?:[^_\n]*[^\s_])?)__(?![\w_])/g, '$1<strong>$2</strong>');
    s = s.replace(/(^|[^*\w])\*([^\s*](?:[^*\n]*[^\s*])?)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^\w_])_([^\s_](?:[^_\n]*[^\s_])?)_(?![\w_])/g, '$1<em>$2</em>');
    s = s.replace(/~~([^\s~](?:[^~\n]*[^\s~])?)~~/g, '<del>$1</del>');
    return s;
  }

  // ── الكتل ───────────────────────────────────────────────────────────────────────────────────────
  var RE_FENCE = /^\s*(```+|~~~+)\s*([A-Za-z0-9_+#.\-]{0,24})\s*$/;
  var RE_HEAD = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
  var RE_HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  var RE_ITEM = /^(\s*)([-*•+]|\d{1,9}[.)])\s+(.*)$/;
  var RE_TSEP = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  var RE_QUOTE = /^\s{0,3}>\s?(.*)$/;

  function isBlockStart(line, next) {
    return RE_FENCE.test(line) || RE_HEAD.test(line) || RE_HR.test(line) || RE_QUOTE.test(line) || RE_ITEM.test(line) || (line.indexOf('|') >= 0 && next != null && RE_TSEP.test(next) && next.indexOf('-') >= 0 && splitRow(line).length === splitRow(next).length);
  }

  function splitRow(line) {
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|' && s.charAt(s.length - 2) !== '\\') s = s.slice(0, -1);
    var cells = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === '\\' && s.charAt(i + 1) === '|') { cur += '|'; i++; }
      else if (c === '|') { cells.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  }

  function codeBlock(lang, code) {
    var label = lang ? esc(lang.toLowerCase()) : 'code';
    return '<div class="aus-code-block" dir="ltr"><div class="code-lang"><span>' + label + '</span><button type="button" class="code-copy" data-aus-copy="code" title="نسخ">📋 نسخ</button></div>' +
           '<pre><code>' + esc(code) + '</code></pre></div>';
  }

  function listHtml(items) {
    // items: [{indent, ordered, start, text, lines:[]}] → HTML متداخل
    var out = '', stack = [];                                      // stack: [{indent, ordered, open:bool}]
    function open(it) { out += it.ordered ? '<ol class="aus-ol" dir="auto"' + (it.start > 1 ? ' start="' + it.start + '"' : '') + '>' : '<ul class="aus-ul" dir="auto">'; stack.push({ indent: it.indent, ordered: it.ordered, li: false }); }
    function closeLi(top) { if (top.li) { out += '</li>'; top.li = false; } }
    function closeList() { var top = stack.pop(); closeLi(top); out += top.ordered ? '</ol>' : '</ul>'; }
    items.forEach(function (it) {
      while (stack.length && it.indent < stack[stack.length - 1].indent - 1) closeList();
      var top = stack[stack.length - 1];
      if (!top) open(it);
      else if (it.indent > top.indent + 1) open(it);                               // أعمق بمستوى → قائمة متداخلة داخل <li> الحالي
      else if (it.ordered !== top.ordered) { closeList(); open(it); }
      top = stack[stack.length - 1];
      closeLi(top);
      out += '<li>' + inline(it.lines.join('\n')).replace(/\n/g, '<br>');
      top.li = true;
    });
    while (stack.length) closeList();
    return out;
  }

  function render(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    if (src.length > MAX_CHARS) src = src.slice(0, MAX_CHARS);
    var lines = src.split('\n'), n = lines.length, i = 0, out = [], lastParaIdx = -1;

    while (i < n) {
      var line = lines[i], m;
      if (!line.trim()) { i++; continue; }

      if ((m = RE_FENCE.exec(line))) {                                             // ```lang … ```
        var fence = m[1], lang = m[2], buf = [], closeRe = new RegExp('^\\s*' + fence.charAt(0) + '{' + fence.length + ',}\\s*$');
        i++;
        while (i < n && !closeRe.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;                                                                       // سطر الإغلاق (قد لا يوجد أثناء البثّ)
        out.push(codeBlock(lang, buf.join('\n')));
        continue;
      }
      if ((m = RE_HEAD.exec(line))) {
        var lvl = m[1].length;
        out.push('<h' + (lvl === 1 ? 3 : lvl === 2 ? 4 : 5) + ' class="aus-h' + (lvl === 1 ? 3 : lvl === 2 ? 4 : 5) + '" dir="auto">' + inline(m[2]) + '</h' + (lvl === 1 ? 3 : lvl === 2 ? 4 : 5) + '>');
        i++; continue;
      }
      if (RE_HR.test(line)) { out.push('<hr class="aus-hr">'); i++; continue; }

      if (line.indexOf('|') >= 0 && i + 1 < n && RE_TSEP.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0 && splitRow(line).length === splitRow(lines[i + 1]).length) {      // جدول (عدد خلايا العنوان = عدد خلايا الفاصل، كما في GFM)
        var head = splitRow(line), seps = splitRow(lines[i + 1]), rows = [];
        i += 2;
        while (i < n && lines[i].trim() && lines[i].indexOf('|') >= 0) { rows.push(splitRow(lines[i])); i++; }
        var cols = Math.min(Math.max(head.length, 1), 12);
        var align = function (k) { var s = (seps[k] || '').trim(); return /^:-+:$/.test(s) ? ' style="text-align:center"' : /-+:$/.test(s) ? ' style="text-align:end"' : ''; };
        var th = '', body = '', k, r;
        for (k = 0; k < cols; k++) th += '<th' + align(k) + '>' + inline(head[k] || '') + '</th>';
        for (r = 0; r < rows.length && r < 200; r++) {
          body += '<tr>';
          for (k = 0; k < cols; k++) body += '<td' + align(k) + '>' + inline(rows[r][k] || '') + '</td>';
          body += '</tr>';
        }
        out.push('<div class="aus-table-wrap"><table class="aus-table" dir="auto"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody></table></div>');
        continue;
      }
      if (RE_QUOTE.test(line)) {
        var q = [];
        while (i < n && (m = RE_QUOTE.exec(lines[i]))) { q.push(m[1]); i++; }
        out.push('<blockquote class="aus-quote" dir="auto">' + inline(q.join('\n')).replace(/\n/g, '<br>') + '</blockquote>');
        continue;
      }
      if ((m = RE_ITEM.exec(line))) {                                              // قائمة (بترقيم أو نقاط) مع تداخل بالمسافات
        var items = [];
        while (i < n) {
          var l2 = lines[i], mm = RE_ITEM.exec(l2);
          if (mm && !RE_HR.test(l2)) {
            var ind = mm[1].replace(/\t/g, '    ').length, ord = /\d/.test(mm[2].charAt(0));
            items.push({ indent: ind, ordered: ord, start: ord ? parseInt(mm[2], 10) || 1 : 1, lines: [mm[3]] });
            i++;
          } else if (!l2.trim()) {                                                 // سطر فارغ: القائمة تستمر إن جاء بعده بند
            var j = i + 1;
            while (j < n && !lines[j].trim()) j++;
            if (j < n && RE_ITEM.exec(lines[j]) && !RE_HR.test(lines[j])) i = j; else break;
          } else if (/^\s{2,}\S/.test(l2) && items.length && !isBlockStart(l2.trim(), lines[i + 1])) {      // متابعة بند (سطر منزاح)
            items[items.length - 1].lines.push(l2.trim()); i++;
          } else break;
        }
        out.push(listHtml(items));
        continue;
      }

      var para = [];                                                               // فقرة: أسطر متتالية ليست بداية كتلة
      while (i < n && lines[i].trim() && !(para.length && isBlockStart(lines[i], lines[i + 1]))) { para.push(lines[i].trim()); i++; }
      out.push('<p class="aus-p" dir="auto">' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
      lastParaIdx = out.length - 1;
    }

    // تمييز آخر سؤال في الردّ (كما كان يفعل المنسّق القديم): الجملة الأخيرة المنتهية بـ ؟ أو ? في آخر فقرة
    if (!opts.streaming && opts.followup !== false && lastParaIdx === out.length - 1 && lastParaIdx >= 0) out[lastParaIdx] = emphasizeLastQuestion(out[lastParaIdx]);
    return out.join('');
  }

  // مسح عكسي محدود (≤ 400 حرف) بدل تعبير نمطي: الصيغة القديمة [^<>?؟!]{14,}[?؟] كانت تربّعية على سطر طويل بلا علامة استفهام (60 ألف حرف = 6 ثوانٍ)
  function emphasizeLastQuestion(p) {
    var end = p.length - 4;                                                        // قبل </p>
    var last = p.charAt(end - 1);
    if (p.slice(end) !== '</p>' || (last !== '?' && last !== '؟')) return p;
    var k = end - 2, min = Math.max(0, end - 400);
    while (k >= min && '<>?؟!.\n'.indexOf(p.charAt(k)) < 0) k--;
    var start = k + 1;
    if (end - start < 15) return p;                                                // أقصر من 15 حرفاً (14 + علامة الاستفهام): لا تمييز
    return p.slice(0, start) + '<span class="aus-followup">' + p.slice(start, end) + '</span>' + p.slice(end);
  }

  // ── أسئلة المتابعة: آخر سطر [[followups: a | b | c]] ──────────────────────────────────────────
  function splitFollowups(text) {
    var s = String(text == null ? '' : text);
    var m = /\n?[ \t]*\[\[\s*followups\s*:\s*([^\]\n]*?)\s*\]\][ \t]*\s*$/i.exec(s);
    if (!m) return { text: s, followups: [] };
    var list = m[1].split('|').map(function (x) { return x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(); })
      .filter(function (x) { return x.length >= 3; }).map(function (x) { return x.slice(0, 140); }).slice(0, 3);
    return { text: s.slice(0, m.index).replace(/\s+$/, ''), followups: list };
  }
  // أثناء البثّ: لا نُظهر "[[followups: ..." الناقصة
  function hidePartialFollowups(text) {
    var s = String(text == null ? '' : text), a = s.lastIndexOf('[['), b = s.lastIndexOf(']]');
    if (a < 0 || a < b) return s;
    var tail = s.slice(a + 2).replace(/^\s+/, '').toLowerCase();
    // نخفيه فقط إن كان بداية «followups:» (أو بدأ فعلاً)، لا أي «[[» ناقصة مثل اقتباس [[1
    if ('followups:'.indexOf(tail) === 0 || /^followups\s*:/.test(tail)) return s.slice(0, a).replace(/\s+$/, '');
    return s;
  }

  // نص عادي (للنسخ والقراءة الصوتية): بلا رموز Markdown
  function toPlain(text) {
    return String(text == null ? '' : text).replace(/\r\n?/g, '\n')
      .replace(/```[\w+#.\-]*\n?([\s\S]*?)```/g, '$1')
      .replace(/^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, '')
      .replace(/^ {0,3}#{1,6}[ \t]+/gm, '').replace(/^ {0,3}>[ \t]?/gm, '').replace(/^[ \t]*[-*•+][ \t]+/gm, '• ')
      .replace(/\[([^\[\]\n]+)\]\((?:[^()\s]+)\)/g, '$1').replace(/(\*\*\*|\*\*|__|~~|`)/g, '').replace(/(^|\s)[*_](?=\S)([^*_\n]+)[*_](?=\s|$)/g, '$1$2')
      .replace(/\s*\|\s*/g, function (m, off, s) { return ' | '; }).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  window.AUS_MD = { render: render, splitFollowups: splitFollowups, hidePartialFollowups: hidePartialFollowups, toPlain: toPlain, esc: esc, safeUrl: safeUrl, _inline: inline };

  // يحلّ محلّ المنسّق القديم. aus_07_studio.js يُعيّن window.formatAIResponse بعد ~350ms من التحميل، لذلك لا نسابق المؤقّتات: الخاصية نفسها
  // تُرجع المنسّق الآمن وتتجاهل أي إسناد لاحق (configurable:true — يستطيع أي اختبار أو مالك أن يعيد تعريفها).
  function safeFormat(raw) { return render(raw, { streaming: false }); }
  var locked = false, desc;
  try { desc = Object.getOwnPropertyDescriptor(window, 'formatAIResponse'); } catch (e) { desc = null; }
  if (!desc || desc.configurable) {
    try {
      Object.defineProperty(window, 'formatAIResponse', { configurable: true, enumerable: true, get: function () { return safeFormat; }, set: function () { window.__AUS_MD_BLOCKED_FORMATTER = (window.__AUS_MD_BLOCKED_FORMATTER || 0) + 1; } });
      locked = true;
    } catch (e) { /* يسقط إلى الخطة البديلة */ }
  }
  if (!locked) {
    // في الصفحة الحقيقية formatAIResponse تصريح دالة عام (aus_02_core.js) فخاصيته غير قابلة لإعادة التعريف؛ نُسند إليها ونراقب ~20 ثانية ليغلب إسنادُنا أي إسناد متأخر
    window.formatAIResponse = safeFormat;
    var guard = 0, iv = setInterval(function () {
      if (window.formatAIResponse !== safeFormat) { window.formatAIResponse = safeFormat; window.__AUS_MD_BLOCKED_FORMATTER = (window.__AUS_MD_BLOCKED_FORMATTER || 0) + 1; }
      if (++guard >= 80) clearInterval(iv);
    }, 250);
  }

  // زرّ «نسخ» في كتل الشيفرة: مستمع واحد على المستند (لا onclick داخل الـ HTML)
  try {
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-aus-copy="code"]') : null;
      if (!b) return;
      var block = b.closest('.aus-code-block'), code = block ? block.querySelector('code') : null, txt = code ? (code.textContent || '') : '';
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt); } catch (er) {}
      var old = b.textContent; b.textContent = '✅ تم'; setTimeout(function () { b.textContent = old; }, 1400);
    });
  } catch (e) {}
})();
