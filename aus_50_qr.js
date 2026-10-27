/* ================================================================
   AUS — مولّد رمز QR  (aus_50_qr.js)
   ----------------------------------------------------------------
   مكتبة QR صغيرة (≈ 280 سطراً) بلا أي اعتماد خارجي — تعمل دون إنترنت ودون CDN، وتُولّد
   الرمز لحظياً داخل المتصفح (ISO/IEC 18004: وضع البايت UTF-8، الإصدارات 1–40، مستويات
   التصحيح L/M/Q/H، اختيار القناع الأفضل تلقائياً).

   لماذا ملف محلي وليس CDN (qrious / QRCode.js)؟
     • AUS «محلي أولاً»: الشهادة يجب أن تُعرض وتُطبع حتى بلا اتصال، وعامل الخدمة sw.js
       لا يخزّن سكربتات الـCDN (استجابات opaque).
     • لا حاجة لاستثناء CDN جديد في سياسة الأمان (CSP).
     • يمكن التحقق منه: tests/test_qr_js_matches_python.py يقارن مصفوفته وحدةً بوحدة بمكتبة
       qrcode التي يستعملها الخادم لتوليد QR الـPDF.

   الواجهة (window.AUS_QR):
     AUS_QR.encode(text, {ecc:'Q', version, minVersion, mask}) → {version, ecc, mask, size, get(x,y), rows()}
     AUS_QR.svg(text, {ecc, border, size, fg, bg, label})       → نص <svg> جاهز للإدراج
     AUS_QR.canvas(canvasEl, text, {ecc, border, scale, fg, bg})→ يرسم على <canvas>
     AUS_QR.dataURL(text, {...})                                → 'data:image/png;base64,…'
     AUS_QR.mount(el, text, {...})                              → يضع الـSVG داخل عنصر

   مثال:
     document.getElementById('box').innerHTML = AUS_QR.svg('https://aus.example/verify.html?id=AUS-BUS-2026-8F4K92X', {size: 180});
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_QR) return;

  var LEVEL = { L: 0, M: 1, Q: 2, H: 3 };
  var FORMAT_BITS = [1, 0, 3, 2];            // مؤشّر مستوى التصحيح في معلومات الصيغة: L=01 · M=00 · Q=11 · H=10

  // بايتات التصحيح لكل كتلة، وعدد الكتل — لكل مستوى [L, M, Q, H] ولكل إصدار 1..40 (الخانة 0 غير مستعملة)
  var ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  var NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  // ── Reed–Solomon على GF(2^8) بكثيرة الحدود 0x11D ───────────────────────────
  function gfMul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
  function rsDivisor(degree) {
    var r = []; for (var i = 0; i < degree - 1; i++) r.push(0); r.push(1);
    var root = 1;
    for (i = 0; i < degree; i++) { for (var j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 2); }
    return r;
  }
  function rsRemainder(data, divisor) {
    var r = divisor.map(function () { return 0; });
    data.forEach(function (b) { var factor = b ^ r.shift(); r.push(0); divisor.forEach(function (coef, i) { r[i] ^= gfMul(coef, factor); }); });
    return r;
  }

  // ── سعة الإصدار ────────────────────────────────────────────────────────────
  function rawModules(ver) {
    var n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) { var a = Math.floor(ver / 7) + 2; n -= (25 * a - 10) * a - 55; if (ver >= 7) n -= 36; }
    return n;
  }
  function dataCodewords(ver, ecl) { return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver]; }
  function alignPositions(ver) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2, step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2, res = [6];
    for (var pos = ver * 4 + 10; res.length < n; pos -= step) res.splice(1, 0, pos);
    return res;
  }

  function utf8(text) {
    if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(text));
    var s = unescape(encodeURIComponent(text)), out = []; for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); return out;
  }

  function addEccAndInterleave(data, ver, ecl) {
    var nb = NUM_BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver], raw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), blocks = [], div = rsDivisor(eccLen);
    for (var i = 0, k = 0; i < nb; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var out = [];
    for (i = 0; i < blocks[0].length; i++) blocks.forEach(function (b, j) { if (i !== shortLen - eccLen || j >= nShort) out.push(b[i]); });
    return out;
  }

  // ── بناء المصفوفة ──────────────────────────────────────────────────────────
  function encode(text, opts) {
    opts = opts || {};
    var ecc = String(opts.ecc || 'Q').toUpperCase(), ecl = LEVEL[ecc];
    if (ecl === undefined) throw new Error('AUS_QR: ecc must be L, M, Q or H');
    var bytes = utf8(String(text == null ? '' : text));

    // أصغر إصدار يتّسع للنص (وضع البايت: 4 بتّات للوضع + عدّاد الأحرف + 8 لكل بايت)
    var ver = Math.max(1, opts.version | 0 || opts.minVersion | 0 || 1), maxVer = opts.version ? ver : 40;
    for (; ; ver++) {
      if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= dataCodewords(ver, ecl) * 8) break;
      if (ver >= maxVer) throw new Error('AUS_QR: text is too long for a QR code at level ' + ecc);
    }

    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
    var cap = dataCodewords(ver, ecl) * 8;
    put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = []; for (var i = 0; i < bits.length; i++) data[i >>> 3] = (data[i >>> 3] || 0) | (bits[i] << (7 - (i & 7)));
    var codewords = addEccAndInterleave(data, ver, ecl);

    var size = ver * 4 + 17, mod = [], fn = [];
    for (i = 0; i < size; i++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setFn(x, y, dark) { mod[y][x] = dark; fn[y][x] = true; }

    // أنماط الوظيفة: التوقيت، المكتشفات، المحاذاة، معلومات الإصدار
    for (i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var ap = alignPositions(ver), na = ap.length;
    for (i = 0; i < na; i++) for (var j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setFn(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    function drawFormat(mask) {
      var d = (FORMAT_BITS[ecl] << 3) | mask, rem = d;
      for (var k = 0; k < 10; k++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var b = ((d << 10) | rem) ^ 0x5412;
      for (k = 0; k <= 5; k++) setFn(8, k, bit(b, k));
      setFn(8, 7, bit(b, 6)); setFn(8, 8, bit(b, 7)); setFn(7, 8, bit(b, 8));
      for (k = 9; k < 15; k++) setFn(14 - k, 8, bit(b, k));
      for (k = 0; k < 8; k++) setFn(size - 1 - k, 8, bit(b, k));
      for (k = 8; k < 15; k++) setFn(8, size - 15 + k, bit(b, k));
      setFn(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var rem = ver; for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (ver << 12) | rem;
      for (i = 0; i < 18; i++) { var c = bit(vb, i), a = size - 11 + i % 3, b2 = Math.floor(i / 3); setFn(a, b2, c); setFn(b2, a, c); }
    }

    // وضع الكلمات الشفرية بتعرّج من اليمين إلى اليسار
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fn[y][x] && idx < codewords.length * 8) { mod[y][x] = bit(codewords[idx >>> 3], 7 - (idx & 7)); idx++; }
      }
    }

    function applyMask(m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var inv;
        switch (m) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!fn[y][x] && inv) mod[y][x] = !mod[y][x];
      }
    }
    function penalty() {
      var res = 0, x, y, run, dark = 0;
      var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
      function scan(line) {
        var r = 0, k, len = 1;
        for (k = 1; k < line.length; k++) { if (line[k] === line[k - 1]) len++; else { if (len >= 5) r += 3 + len - 5; len = 1; } }
        if (len >= 5) r += 3 + len - 5;
        var pad = [0, 0, 0, 0].concat(line, [0, 0, 0, 0]);
        for (k = 0; k + 11 <= pad.length; k++) {
          var m1 = true, m2 = true;
          for (var t = 0; t < 11 && (m1 || m2); t++) { if (pad[k + t] !== P1[t]) m1 = false; if (pad[k + t] !== P2[t]) m2 = false; }
          if (m1) r += 40; if (m2) r += 40;
        }
        return r;
      }
      for (y = 0; y < size; y++) { var row = mod[y].map(Number); res += scan(row); row.forEach(function (v) { dark += v; }); }
      for (x = 0; x < size; x++) { var col = []; for (y = 0; y < size; y++) col.push(mod[y][x] ? 1 : 0); res += scan(col); }
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { var v = mod[y][x]; if (v === mod[y][x + 1] && v === mod[y + 1][x] && v === mod[y + 1][x + 1]) res += 3; }
      var total = size * size, k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
      return res + k * 10;
    }

    var best = opts.mask;
    if (best == null || best < 0 || best > 7) {
      var minPen = Infinity;
      for (var m = 0; m < 8; m++) {
        applyMask(m); drawFormat(m);
        var p = penalty(); if (p < minPen) { best = m; minPen = p; }
        applyMask(m);                                   // XOR مرتين = تراجع
      }
    }
    applyMask(best); drawFormat(best);

    return {
      version: ver, ecc: ecc, mask: best, size: size,
      get: function (x, y) { return x >= 0 && x < size && y >= 0 && y < size && mod[y][x]; },
      rows: function () { return mod.map(function (r) { return r.slice(); }); }
    };
  }

  // ── مخرجات ─────────────────────────────────────────────────────────────────
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function svg(text, o) {
    o = o || {};
    var q = encode(text, o), border = o.border == null ? 4 : o.border, n = q.size + border * 2, d = [], x, y, s;
    for (y = 0; y < q.size; y++) for (x = 0; x < q.size;) {
      if (!q.get(x, y)) { x++; continue; }
      s = x; while (x < q.size && q.get(x, y)) x++;
      d.push('M' + (s + border) + ',' + (y + border) + 'h' + (x - s) + 'v1h-' + (x - s) + 'z');
    }
    var px = o.size ? ' width="' + o.size + '" height="' + o.size + '"' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '"' + px + ' shape-rendering="crispEdges" role="img" aria-label="' + esc(o.label || 'QR code') + '">' +
      '<rect width="' + n + '" height="' + n + '" fill="' + (o.bg || '#ffffff') + '"/><path d="' + d.join('') + '" fill="' + (o.fg || '#000000') + '"/></svg>';
  }
  function canvas(cv, text, o) {
    o = o || {};
    var q = encode(text, o), border = o.border == null ? 4 : o.border, scale = o.scale || 4, n = (q.size + border * 2) * scale, ctx = cv.getContext('2d');
    cv.width = n; cv.height = n;
    ctx.fillStyle = o.bg || '#ffffff'; ctx.fillRect(0, 0, n, n);
    ctx.fillStyle = o.fg || '#000000';
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.get(x, y)) ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
    return cv;
  }
  function dataURL(text, o) { return canvas(document.createElement('canvas'), text, o).toDataURL('image/png'); }
  function mount(el, text, o) { el.innerHTML = svg(text, o); return el; }

  window.AUS_QR = { encode: encode, svg: svg, canvas: canvas, dataURL: dataURL, mount: mount, version: '1.0', _tables: { ECC_PER_BLOCK: ECC_PER_BLOCK, NUM_BLOCKS: NUM_BLOCKS } };
})();
