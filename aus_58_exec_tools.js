/* ================================================================
   AUS — الأدوات التنفيذية لـ CEO AI (aus_58_exec_tools.js)          window.AUS_EXEC
   ----------------------------------------------------------------
   أدوات يستعين بها القائد (والطالب) قبل أن يسأل المستشار: كلها حسابات حقيقية بمعادلات معروفة ومدخلات يُتحقَّق منها، وتُعاد الحسبة فور تغيّر أي مدخل.
   لا تستعمل أي بيانات خارجية ولا تدّعي ذلك: كل رقم في النتيجة مشتق من الأرقام التي أدخلها المستخدم نفسه، والأمثلة أرقام افتراضية معنونة «مثال توضيحي».

     حاسبات:   نقطة التعادل · توقّع الإيرادات والتكاليف · تخطيط مؤشر أداء (KPI) · أهداف ونتائج رئيسية (OKR) · مصفوفة المخاطر · مقارنة المنافسين · خطة عمل
     لوحات:    SWOT · PESTLE · نموذج العمل (Business Model Canvas)   ← قوائم منظَّمة بلا حسابات؛ مراجعتها بالذكاء الاصطناعي تتم فقط حين يضغط المستخدم «اسأل CEO AI»

   ما تتركه الأداة للمستشار: نتائج الحاسبات التي استعملها المستخدم (أرقام فقط) تدخل «سياق» المحادثة باسم tool_outputs ويُصرَّح بها للنموذج كحسابات من مدخلات الطالب نفسه.
   كل الدوال الحسابية نقية (دون DOM) وقابلة للاختبار؛ الواجهة تُبنى من وصف الأداة (schema) فلا تتكرر الشيفرة بين الأدوات.
   ================================================================ */
(function () {
  'use strict';
  if (window.AUS_EXEC) return;

  var W = window, D = document;

  // ═══ أدوات مساعدة ═══════════════════════════════════════════════════════════════════════════════
  function lang() { var l = String(D.documentElement.lang || 'ar').slice(0, 2).toLowerCase(); return l === 'ar' ? 'ar' : 'en'; }
  function tx(o) { return o && typeof o === 'object' ? (o[lang()] != null ? o[lang()] : o.ar) : (o == null ? '' : String(o)); }
  function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clip(s, n) { s = String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ''); return s.length > n ? s.slice(0, n) : s; }
  function userKey() { var u = W.ausAuth && W.ausAuth.user; return (u && u.email) || 'anon'; }

  // أرقام عربية/فارسية وفواصل عربية → رقم عادي. يُرجع null إن لم يكن رقماً منتهياً. (لا eval ولا parseFloat المتساهل: "12abc" ليست رقماً)
  function parseNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (v == null) return null;
    var s = String(v).trim();
    if (!s) return null;
    s = s.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); }).replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
         .replace(/٫/g, '.').replace(/[٬,\s_]/g, '');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }
  function round(n, d) { var m = Math.pow(10, d == null ? 2 : d); return Math.round((n + (n >= 0 ? 1 : -1) * 1e-12) * m) / m; }
  function fmt(n, kind) {
    if (n == null || !isFinite(n)) return '—';
    var d = kind === 'int' || kind === 'units' ? 0 : (kind === 'pct' ? 1 : 2);
    var v = kind === 'units' ? Math.ceil(n - 1e-9) : n;
    var s = Math.abs(v) >= 1e15 ? v.toExponential(3) : round(v, d).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
    return s + (kind === 'pct' ? '%' : '');
  }

  // رسائل التحقق (عربي/إنجليزي)
  var E = {
    required: { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
    number: { ar: 'أدخل رقماً صحيحاً', en: 'Enter a valid number' },
    min: { ar: 'يجب ألا يقل عن {n}', en: 'Must be at least {n}' },
    max: { ar: 'يجب ألا يزيد على {n}', en: 'Must be at most {n}' },
    int: { ar: 'أدخل عدداً صحيحاً', en: 'Enter a whole number' },
    date: { ar: 'تاريخ غير صالح (سنة-شهر-يوم)', en: 'Invalid date (YYYY-MM-DD)' },
    text: { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
    rows: { ar: 'أضف صفاً واحداً على الأقل', en: 'Add at least one row' },
    noMargin: { ar: 'سعر البيع يجب أن يكون أعلى من التكلفة المتغيرة للوحدة، وإلا فلا توجد نقطة تعادل.', en: 'The selling price must be higher than the variable cost per unit, otherwise there is no break-even point.' },
    sameTarget: { ar: 'الهدف يساوي نقطة البداية — لا يمكن حساب التقدّم.', en: 'The target equals the starting value, so progress cannot be calculated.' },
    elapsed: { ar: 'الفترات المنقضية لا يمكن أن تتجاوز إجمالي الفترات.', en: 'Elapsed periods cannot exceed total periods.' },
    noWeights: { ar: 'مجموع الأوزان يجب أن يكون أكبر من صفر.', en: 'The weights must add up to more than zero.' }
  };

  // ═══ التحقق ═════════════════════════════════════════════════════════════════════════════════════
  function readNum(vals, f, errors) {
    var raw = vals[f.id], empty = raw == null || String(raw).trim() === '';
    if (empty) { if (f.req) errors[f.id] = E.required; return null; }
    var n = parseNum(raw);
    if (n == null) { errors[f.id] = E.number; return null; }
    if (f.int && Math.floor(n) !== n) { errors[f.id] = E.int; return null; }
    if (f.min != null && n < f.min) { errors[f.id] = { ar: fill(E.min.ar, { n: fmt(f.min) }), en: fill(E.min.en, { n: fmt(f.min) }) }; return null; }
    if (f.max != null && n > f.max) { errors[f.id] = { ar: fill(E.max.ar, { n: fmt(f.max) }), en: fill(E.max.en, { n: fmt(f.max) }) }; return null; }
    return n;
  }
  function validDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
    return (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 1970 && y <= 2200) ? dt.getTime() : null;
  }
  // يقرأ كل حقول الأداة → {n: قيم رقمية/نصية مُتحقَّق منها, errors, rows: {حقل_جدول: [صفوف]}}
  function readFields(tool, vals) {
    var errors = {}, n = {}, rows = {}, lists = {};
    tool.fields.forEach(function (f) {
      if (f.kind === 'num') n[f.id] = readNum(vals, f, errors);
      else if (f.kind === 'text') { var t = clip(vals[f.id], f.max || 80).trim(); if (f.req && !t) errors[f.id] = E.text; n[f.id] = t; }
      else if (f.kind === 'table') {
        var src = Array.isArray(vals[f.id]) ? vals[f.id].slice(0, f.maxRows || 12) : [], out = [];
        src.forEach(function (r, i) {
          if (!r || typeof r !== 'object') return;
          var row = {}, rerr = {}, blank = true;
          f.cols.forEach(function (c) { if (r[c.id] != null && String(r[c.id]).trim() !== '') blank = false; });
          if (blank) return;                                                        // الصفوف الفارغة تُتجاهل
          f.cols.forEach(function (c) {
            if (c.kind === 'num') { var e1 = {}; row[c.id] = readNum(r, c, e1); if (e1[c.id]) rerr[c.id] = e1[c.id]; }
            else if (c.kind === 'date') { var raw = String(r[c.id] == null ? '' : r[c.id]).trim(); if (!raw) { if (c.req) rerr[c.id] = E.date; row[c.id] = ''; } else if (validDate(raw) == null) rerr[c.id] = E.date; else row[c.id] = raw; }
            else if (c.kind === 'select') { var sv = String(r[c.id] == null ? '' : r[c.id]); row[c.id] = (c.options || []).some(function (o) { return o.v === sv; }) ? sv : (c.options && c.options[0] ? c.options[0].v : ''); }
            else { var tv = clip(r[c.id], c.max || 80).trim(); if (c.req && !tv) rerr[c.id] = E.text; row[c.id] = tv; }
          });
          if (Object.keys(rerr).length) errors[f.id + '.' + i] = rerr;
          out.push(row);
        });
        rows[f.id] = out;
        if (f.minRows && out.length < f.minRows && !Object.keys(errors).some(function (k) { return k.indexOf(f.id + '.') === 0; })) errors[f.id] = E.rows;
      } else if (f.kind === 'list') {
        lists[f.id] = String(vals[f.id] == null ? '' : (Array.isArray(vals[f.id]) ? vals[f.id].join('\n') : vals[f.id])).split('\n').map(function (x) { return clip(x, f.itemMax || 120).trim(); }).filter(Boolean).slice(0, f.max || 12);
      }
    });
    return { n: n, rows: rows, lists: lists, errors: errors };
  }

  // ═══ الحاسبات (دوال نقية: تأخذ قيماً مُتحقَّقاً منها وترجع نتائج) ═══════════════════════════════════════
  var OK = function (o) { o.ok = true; return o; };
  var BAD = function (errors) { return { ok: false, errors: errors }; };
  function out(id, ar, en, value, f, tone) { return { id: id, label: { ar: ar, en: en }, value: value, fmt: f || 'num', tone: tone || '' }; }

  function breakEven(v) {
    var F = v.fixed_costs, p = v.price, vc = v.variable_cost, cm = p - vc;
    if (!(cm > 0)) return BAD({ price: E.noMargin });
    var units = F / cm, outs = [
      out('contribution_margin', 'هامش المساهمة للوحدة', 'Contribution margin per unit', cm, 'num'),
      out('contribution_ratio', 'نسبة هامش المساهمة', 'Contribution margin ratio', cm / p * 100, 'pct'),
      out('break_even_units', 'نقطة التعادل (وحدات)', 'Break-even point (units)', units, 'units', 'good'),
      out('break_even_revenue', 'إيراد التعادل', 'Break-even revenue', units * p, 'num')
    ], ctx = { break_even_units: Math.ceil(units - 1e-9), break_even_revenue: round(units * p, 2), contribution_margin: round(cm, 4) }, notes = [];
    if (v.target_profit != null) { var tu = (F + v.target_profit) / cm; outs.push(out('units_for_target', 'وحدات لتحقيق الربح المستهدف', 'Units for the target profit', tu, 'units')); ctx.units_for_target = Math.ceil(tu - 1e-9); }
    if (v.units != null) {
      var mos = v.units - units, profit = v.units * cm - F;
      outs.push(out('profit_at_units', 'الربح عند الكمية المتوقعة', 'Profit at the expected quantity', profit, 'num', profit >= 0 ? 'good' : 'bad'));
      ctx.profit_at_units = round(profit, 2);
      if (v.units > 0) { outs.push(out('margin_of_safety', 'هامش الأمان', 'Margin of safety', mos / v.units * 100, 'pct', mos >= 0 ? 'good' : 'bad')); ctx.margin_of_safety_pct = round(mos / v.units * 100, 1); }
      if (mos < 0) notes.push({ ar: 'الكمية المتوقعة أقل من نقطة التعادل: المشروع سيخسر عندها.', en: 'The expected quantity is below break-even: the business would lose money at that volume.' });
    }
    notes.push({ ar: 'المعادلة: نقطة التعادل = التكاليف الثابتة ÷ (سعر الوحدة − التكلفة المتغيرة للوحدة). تفترض ثبات السعر والتكلفة المتغيرة ضمن المدى كله.', en: 'Formula: break-even = fixed costs ÷ (price per unit − variable cost per unit). It assumes price and variable cost stay constant over the whole range.' });
    return OK({ outputs: outs, notes: notes, ctx: { inputs: { fixed_costs: F, price: p, variable_cost: vc, units: v.units == null ? undefined : v.units }, outputs: ctx } });
  }

  function projection(v) {
    var n = v.periods, g = v.growth_pct / 100, vcp = v.variable_pct / 100, fi = (v.fixed_growth_pct == null ? 0 : v.fixed_growth_pct) / 100;
    var rows = [], cum = 0, totR = 0, totC = 0, firstProfit = null, last = null;
    for (var t = 1; t <= n; t++) {
      var rev = v.start_revenue * Math.pow(1 + g, t - 1), variable = rev * vcp, fixed = v.fixed_costs * Math.pow(1 + fi, t - 1), costs = variable + fixed, profit = rev - costs;
      cum += profit; totR += rev; totC += costs;
      if (firstProfit == null && profit >= 0) firstProfit = t;
      last = { period: t, revenue: rev, costs: costs, profit: profit, margin: rev > 0 ? profit / rev * 100 : null, cumulative: cum };
      rows.push(last);
    }
    var outs = [
      out('total_revenue', 'إجمالي الإيراد', 'Total revenue', totR, 'num'), out('total_costs', 'إجمالي التكاليف', 'Total costs', totC, 'num'),
      out('total_profit', 'إجمالي الربح', 'Total profit', totR - totC, 'num', totR - totC >= 0 ? 'good' : 'bad'),
      out('last_margin', 'هامش الربح في آخر فترة', 'Profit margin in the last period', last.margin, 'pct'),
      out('first_profit_period', 'أول فترة بربح', 'First profitable period', firstProfit, 'int', firstProfit ? 'good' : 'bad')
    ], notes = [{ ar: 'الإيراد = الإيراد الابتدائي × (1 + معدل النمو)^(الفترة − 1). التكلفة = المتغيرة (نسبة من الإيراد) + الثابتة (تتغيّر بمعدل تضخّم التكاليف الثابتة). هذا توقّع رياضي من فرضياتك، لا تنبّؤ بالسوق.', en: 'Revenue = starting revenue × (1 + growth rate)^(period − 1). Cost = variable (a share of revenue) + fixed (changing at the fixed-cost inflation rate). This is arithmetic on your assumptions, not a market forecast.' }];
    if (firstProfit == null) notes.push({ ar: 'لا توجد فترة رابحة ضمن المدى المحدد.', en: 'No period is profitable within the chosen horizon.' });
    return OK({ outputs: outs, notes: notes, table: { cols: [['period', 'الفترة', 'Period', 'int'], ['revenue', 'الإيراد', 'Revenue', 'num'], ['costs', 'التكاليف', 'Costs', 'num'], ['profit', 'الربح', 'Profit', 'num'], ['margin', 'الهامش', 'Margin', 'pct'], ['cumulative', 'الربح التراكمي', 'Cumulative', 'num']], rows: rows },
      ctx: { inputs: { start_revenue: v.start_revenue, growth_pct: v.growth_pct, periods: n, variable_pct: v.variable_pct, fixed_costs: v.fixed_costs }, outputs: { total_revenue: round(totR, 2), total_profit: round(totR - totC, 2), first_profit_period: firstProfit == null ? 0 : firstProfit } } });
  }

  function kpi(v) {
    var S = v.start, C = v.current, G = v.target, N = v.periods_total, El = v.periods_elapsed;
    if (G === S) return BAD({ target: E.sameTarget });
    if (El > N) return BAD({ periods_elapsed: E.elapsed });
    var progress = (C - S) / (G - S), expected = El / N, gap = (progress - expected) * 100;
    var status = gap > 5 ? 'ahead' : gap < -5 ? 'behind' : 'on_track';
    var outs = [
      out('progress', 'التقدّم نحو الهدف', 'Progress toward the target', progress * 100, 'pct', progress >= 1 ? 'good' : ''),
      out('expected', 'التقدّم المتوقّع الآن (خطّ مستقيم)', 'Expected progress now (straight line)', expected * 100, 'pct'),
      out('gap', 'الفرق عن الخطة (نقطة مئوية)', 'Gap to plan (percentage points)', gap, 'num', status === 'behind' ? 'bad' : 'good'),
      out('status', 'الحالة', 'Status', status, 'status', status === 'behind' ? 'bad' : 'good')
    ], notes = [];
    if (N > El) { var req = (G - C) / (N - El); outs.push(out('required_per_period', 'المطلوب في كل فترة متبقية', 'Required per remaining period', req, 'num')); }
    if (El > 0) { var rr = (C - S) / El; outs.push(out('run_rate', 'المعدّل الفعلي لكل فترة', 'Actual rate per period', rr, 'num')); outs.push(out('linear_projection', 'إسقاط خطي في نهاية المدة', 'Straight-line projection at the end', S + rr * N, 'num')); }
    notes.push({ ar: 'التقدّم = (الحالي − البداية) ÷ (الهدف − البداية). الخطة تفترض نموّاً منتظماً بين البداية والهدف؛ الإسقاط الخطي امتداد للمعدّل الحالي وليس تنبّؤاً.', en: 'Progress = (current − start) ÷ (target − start). The plan assumes steady progress from start to target; the straight-line projection extends the current rate and is not a forecast.' });
    return OK({ outputs: outs, notes: notes, ctx: { inputs: { start: S, current: C, target: G, periods_total: N, periods_elapsed: El }, outputs: { progress_pct: round(progress * 100, 1), expected_pct: round(expected * 100, 1), gap_pp: round(gap, 1), behind: status === 'behind' ? 1 : 0 } } });
  }

  function okr(rows, v) {
    if (!rows.krs.length) return BAD({ krs: E.rows });
    var wsum = 0, acc = 0, errors = {}, detail = [];
    rows.krs.forEach(function (r, i) {
      if (r.target === r.start) { errors['krs.' + i] = { target: E.sameTarget }; return; }
      var raw = (r.current - r.start) / (r.target - r.start), p = Math.max(0, Math.min(1, raw)), w = r.weight == null ? 1 : r.weight;
      wsum += w; acc += w * p; detail.push({ name: r.name, raw: raw, p: p, w: w });
    });
    if (Object.keys(errors).length) return BAD(errors);
    if (!(wsum > 0)) return BAD({ krs: E.noWeights });
    var obj = acc / wsum, band = obj >= 0.7 ? 'good' : obj >= 0.3 ? 'warn' : 'bad';
    var outs = [out('objective_progress', 'تقدّم الهدف (متوسط موزون)', 'Objective progress (weighted average)', obj * 100, 'pct', band)];
    detail.forEach(function (d, i) { outs.push(out('kr' + (i + 1), d.name || ('KR ' + (i + 1)), d.name || ('KR ' + (i + 1)), d.raw * 100, 'pct', d.p >= 0.7 ? 'good' : d.p >= 0.3 ? 'warn' : 'bad')); });
    return OK({ outputs: outs, notes: [{ ar: 'تقدّم كل نتيجة رئيسية = (الحالي − البداية) ÷ (الهدف − البداية) مقصوراً بين 0 و100% عند حساب الهدف. القاعدة الشائعة في OKR: 70% جيد، أقل من 30% يحتاج تدخّلاً.', en: 'Each key result’s progress = (current − start) ÷ (target − start), capped between 0 and 100% when scoring the objective. A common OKR rule of thumb: 70% is good, below 30% needs attention.' }],
      ctx: { inputs: { key_results: detail.length }, outputs: { objective_progress_pct: round(obj * 100, 1) } } });
  }

  var RISK_BANDS = [[17, 'critical', 'حرج', 'Critical'], [10, 'high', 'مرتفع', 'High'], [5, 'medium', 'متوسط', 'Medium'], [1, 'low', 'منخفض', 'Low']];
  function riskBand(score) { for (var i = 0; i < RISK_BANDS.length; i++) if (score >= RISK_BANDS[i][0]) return RISK_BANDS[i]; return RISK_BANDS[RISK_BANDS.length - 1]; }
  function riskMatrix(rows) {
    if (!rows.risks.length) return BAD({ risks: E.rows });
    var list = rows.risks.map(function (r) { var s = r.probability * r.impact, b = riskBand(s); return { name: r.name, probability: r.probability, impact: r.impact, score: s, band: b[1], bandAr: b[2], bandEn: b[3] }; });
    list.sort(function (a, b) { return b.score - a.score; });
    var counts = { critical: 0, high: 0, medium: 0, low: 0 }, total = 0;
    list.forEach(function (r) { counts[r.band]++; total += r.score; });
    var outs = [out('max_score', 'أعلى درجة خطر', 'Highest risk score', list[0].score, 'int', list[0].band === 'critical' || list[0].band === 'high' ? 'bad' : 'good'), out('avg_score', 'متوسط الدرجة', 'Average score', total / list.length, 'num'),
      out('critical', 'مخاطر حرجة (17–25)', 'Critical risks (17–25)', counts.critical, 'int', counts.critical ? 'bad' : 'good'), out('high', 'مخاطر مرتفعة (10–16)', 'High risks (10–16)', counts.high, 'int', counts.high ? 'warn' : 'good')];
    return OK({ outputs: outs, notes: [{ ar: 'درجة الخطر = الاحتمال (1–5) × الأثر (1–5). الشرائح: 1–4 منخفض، 5–9 متوسط، 10–16 مرتفع، 17–25 حرج. الدرجات تقدير ذاتي من إدخالك، لا قياس موضوعي.', en: 'Risk score = probability (1–5) × impact (1–5). Bands: 1–4 low, 5–9 medium, 10–16 high, 17–25 critical. The scores are your own judgement, not an objective measurement.' }],
      table: { cols: [['name', 'الخطر', 'Risk', 'text'], ['probability', 'الاحتمال', 'Probability', 'int'], ['impact', 'الأثر', 'Impact', 'int'], ['score', 'الدرجة', 'Score', 'int'], ['band', 'المستوى', 'Level', 'band']], rows: list },
      ctx: { inputs: { risks: list.length }, outputs: { max_score: list[0].score, avg_score: round(total / list.length, 2), critical: counts.critical, high: counts.high } } });
  }

  function compare(rows, v) {
    if (!rows.criteria.length) return BAD({ criteria: E.rows });
    var wsum = 0, acc = [0, 0, 0, 0];
    rows.criteria.forEach(function (r) { wsum += r.weight; acc[0] += r.weight * r.me; acc[1] += r.weight * r.c1; acc[2] += r.weight * r.c2; acc[3] += r.weight * r.c3; });
    if (!(wsum > 0)) return BAD({ criteria: E.noWeights });
    var names = [{ ar: 'أنت', en: 'You' }, v.name1 || { ar: 'منافس 1', en: 'Competitor 1' }, v.name2 || { ar: 'منافس 2', en: 'Competitor 2' }, v.name3 || { ar: 'منافس 3', en: 'Competitor 3' }];
    var scores = acc.map(function (a) { return a / wsum; }), order = [0, 1, 2, 3].sort(function (a, b) { return scores[b] - scores[a]; });
    var outs = names.map(function (n, i) { return out('score' + i, typeof n === 'string' ? n : n.ar, typeof n === 'string' ? n : n.en, scores[i], 'num', i === 0 ? (order[0] === 0 ? 'good' : '') : ''); });
    outs.push(out('my_rank', 'ترتيبك', 'Your rank', order.indexOf(0) + 1, 'int'));
    var best = Math.max(scores[1], scores[2], scores[3]);
    outs.push(out('gap_to_best', 'الفرق عن أفضل منافس', 'Gap to the best competitor', scores[0] - best, 'num', scores[0] - best >= 0 ? 'good' : 'bad'));
    var diffs = rows.criteria.map(function (r) { return { name: r.name, d: r.me - Math.max(r.c1, r.c2, r.c3) }; }).sort(function (a, b) { return b.d - a.d; });
    var notes = [{ ar: 'الدرجة الموزونة = مجموع (الوزن × التقييم) ÷ مجموع الأوزان، على مقياس 1–5. التقييمات تقديرك أنت، ولا تستند إلى بيانات سوق.', en: 'Weighted score = Σ(weight × rating) ÷ Σ weights, on a 1–5 scale. The ratings are your own judgement, not market data.' }];
    if (diffs[0] && diffs[0].d > 0) notes.push({ ar: 'أكبر تفوّق لك: ' + diffs[0].name + ' (+' + fmt(diffs[0].d) + ').', en: 'Your biggest advantage: ' + diffs[0].name + ' (+' + fmt(diffs[0].d) + ').' });
    var worst = diffs[diffs.length - 1]; if (worst && worst.d < 0) notes.push({ ar: 'أكبر فجوة لك: ' + worst.name + ' (' + fmt(worst.d) + ').', en: 'Your biggest gap: ' + worst.name + ' (' + fmt(worst.d) + ').' });
    return OK({ outputs: outs, notes: notes, ctx: { inputs: { criteria: rows.criteria.length }, outputs: { my_score: round(scores[0], 2), best_competitor_score: round(best, 2), my_rank: order.indexOf(0) + 1 } } });
  }

  function plan(rows, v, todayMs) {
    if (!rows.tasks.length) return BAD({ tasks: E.rows });
    var today = todayMs == null ? Date.now() : todayMs, todayDay = Math.floor(today / 86400000) * 86400000;
    var cnt = { todo: 0, doing: 0, done: 0 }, overdue = 0, items = rows.tasks.map(function (r) {
      var due = r.due ? validDate(r.due) : null, late = due != null && r.status !== 'done' && due < todayDay;
      cnt[r.status] = (cnt[r.status] || 0) + 1; if (late) overdue++;
      return { name: r.name, owner: r.owner, due: r.due, dueMs: due, priority: r.priority, status: r.status, late: late };
    });
    items.sort(function (a, b) { return (a.status === 'done') - (b.status === 'done') || a.priority - b.priority || (a.dueMs == null ? 1e18 : a.dueMs) - (b.dueMs == null ? 1e18 : b.dueMs); });
    var open = cnt.todo + cnt.doing, done = cnt.done, pct = items.length ? done / items.length * 100 : 0;
    var outs = [out('completion', 'نسبة الإنجاز', 'Completion', pct, 'pct', pct >= 70 ? 'good' : ''), out('open', 'مهام مفتوحة', 'Open tasks', open, 'int'), out('overdue', 'متأخرة عن موعدها', 'Overdue', overdue, 'int', overdue ? 'bad' : 'good'), out('done', 'مكتملة', 'Done', done, 'int', 'good')];
    return OK({ outputs: outs, notes: [{ ar: 'التأخّر محسوب بمقارنة تاريخ الاستحقاق بتاريخ جهازك اليوم (' + new Date(todayDay).toISOString().slice(0, 10) + ') للمهام غير المكتملة.', en: 'Overdue is calculated by comparing the due date with your device’s date today (' + new Date(todayDay).toISOString().slice(0, 10) + ') for unfinished tasks.' }],
      table: { cols: [['name', 'المهمة', 'Task', 'text'], ['owner', 'المسؤول', 'Owner', 'text'], ['due', 'الاستحقاق', 'Due', 'text'], ['priority', 'الأولوية', 'Priority', 'int'], ['status', 'الحالة', 'Status', 'taskstatus']], rows: items },
      ctx: { inputs: { tasks: items.length }, outputs: { completion_pct: round(pct, 1), open: open, overdue: overdue } } });
  }

  // لوحات القوائم (SWOT / PESTLE / BMC): لا حسابات؛ فقط تنظيم + اكتمال
  function board(tool, lists) {
    var total = 0, filled = 0, outs = [];
    tool.fields.forEach(function (f) { var n = (lists[f.id] || []).length; total++; if (n) filled++; outs.push({ id: f.id, label: f.label, value: n, fmt: 'int', tone: n ? 'good' : '' }); });
    return OK({ outputs: outs, notes: [{ ar: 'اللوحة تنظّم أفكارك ولا تحلّلها. للحصول على مراجعة اضغط «اسأل CEO AI» فيُرسَل نصّها إلى المستشار بطلبك.', en: 'The board organises your ideas; it does not analyse them. For a review press “Ask CEO AI” and its text is sent to the advisor at your request.' }],
      summary: { filled: filled, total: total } });
  }

  // ═══ وصف الأدوات (schema) ══════════════════════════════════════════════════════════════════════
  var N = function (id, ar, en, o) { var f = { id: id, kind: 'num', label: { ar: ar, en: en } }; for (var k in (o || {})) f[k] = o[k]; return f; };
  var TXT = function (id, ar, en, o) { var f = { id: id, kind: 'text', label: { ar: ar, en: en }, max: 80 }; for (var k in (o || {})) f[k] = o[k]; return f; };
  var LST = function (id, ar, en, hintAr, hintEn) { return { id: id, kind: 'list', label: { ar: ar, en: en }, hint: { ar: hintAr, en: hintEn }, max: 12, itemMax: 120 }; };
  var STATUS = [{ v: 'todo', ar: 'لم تبدأ', en: 'To do' }, { v: 'doing', ar: 'جارية', en: 'In progress' }, { v: 'done', ar: 'مكتملة', en: 'Done' }];

  var TOOLS = [
    { id: 'break_even', icon: '⚖️', kind: 'calc', title: { ar: 'نقطة التعادل', en: 'Break-even' }, desc: { ar: 'كم وحدة تبيع لتغطّي كل تكاليفك؟', en: 'How many units must you sell to cover all your costs?' },
      fields: [N('fixed_costs', 'التكاليف الثابتة للفترة', 'Fixed costs per period', { req: true, min: 0, max: 1e12, ex: 12000 }), N('price', 'سعر بيع الوحدة', 'Selling price per unit', { req: true, min: 0.01, max: 1e9, ex: 5 }),
        N('variable_cost', 'التكلفة المتغيرة للوحدة', 'Variable cost per unit', { req: true, min: 0, max: 1e9, ex: 2 }), N('target_profit', 'ربح مستهدف للفترة (اختياري)', 'Target profit per period (optional)', { min: 0, max: 1e12, ex: 3000 }),
        N('units', 'الكمية المتوقع بيعها (اختياري)', 'Expected quantity sold (optional)', { min: 0, max: 1e12, ex: 5000 })],
      compute: function (r) { return breakEven(r.n); } },
    { id: 'projection', icon: '📈', kind: 'calc', title: { ar: 'توقّع الإيرادات والتكاليف', en: 'Revenue & cost projection' }, desc: { ar: 'جدول فترات من فرضياتك: نموّ الإيراد وتكاليفه والربح.', en: 'A period table from your assumptions: revenue growth, costs and profit.' },
      fields: [N('start_revenue', 'إيراد الفترة الأولى', 'First-period revenue', { req: true, min: 0, max: 1e12, ex: 50000 }), N('growth_pct', 'نموّ الإيراد لكل فترة (%)', 'Revenue growth per period (%)', { req: true, min: -99.9, max: 1000, ex: 5 }),
        N('periods', 'عدد الفترات (1–60)', 'Number of periods (1–60)', { req: true, min: 1, max: 60, int: true, ex: 12 }), N('variable_pct', 'التكلفة المتغيرة (% من الإيراد)', 'Variable cost (% of revenue)', { req: true, min: 0, max: 100, ex: 40 }),
        N('fixed_costs', 'التكاليف الثابتة لكل فترة', 'Fixed costs per period', { req: true, min: 0, max: 1e12, ex: 15000 }), N('fixed_growth_pct', 'تضخّم التكاليف الثابتة لكل فترة (%) (اختياري)', 'Fixed-cost inflation per period (%) (optional)', { min: -50, max: 100, ex: 1 })],
      compute: function (r) { return projection(r.n); } },
    { id: 'kpi', icon: '🎯', kind: 'calc', title: { ar: 'تخطيط مؤشر الأداء (KPI)', en: 'KPI planning' }, desc: { ar: 'أين أنت من هدفك مقارنةً بالوقت المنقضي؟', en: 'Where are you against your target, given the time elapsed?' },
      fields: [N('start', 'قيمة البداية', 'Starting value', { req: true, min: -1e12, max: 1e12, ex: 100 }), N('current', 'القيمة الحالية', 'Current value', { req: true, min: -1e12, max: 1e12, ex: 130 }), N('target', 'الهدف', 'Target', { req: true, min: -1e12, max: 1e12, ex: 200 }),
        N('periods_total', 'إجمالي الفترات (أسابيع/أشهر…)', 'Total periods (weeks / months …)', { req: true, min: 1, max: 1000, int: true, ex: 12 }), N('periods_elapsed', 'الفترات المنقضية', 'Periods elapsed', { req: true, min: 0, max: 1000, int: true, ex: 5 })],
      compute: function (r) { return kpi(r.n); } },
    { id: 'okr', icon: '🏁', kind: 'calc', title: { ar: 'الأهداف والنتائج الرئيسية (OKR)', en: 'Objectives & key results (OKR)' }, desc: { ar: 'تقدّم هدف واحد بنتائجه الرئيسية الموزونة.', en: 'Progress of one objective across its weighted key results.' },
      fields: [TXT('objective', 'الهدف', 'Objective', { max: 100, ex: 'رفع رضا العملاء' }),
        { id: 'krs', kind: 'table', minRows: 1, maxRows: 6, label: { ar: 'النتائج الرئيسية', en: 'Key results' }, cols: [
          { id: 'name', kind: 'text', max: 80, req: true, label: { ar: 'النتيجة الرئيسية', en: 'Key result' } }, N('start', 'البداية', 'Start', { req: true, min: -1e12, max: 1e12 }), N('current', 'الحالي', 'Current', { req: true, min: -1e12, max: 1e12 }),
          N('target', 'الهدف', 'Target', { req: true, min: -1e12, max: 1e12 }), N('weight', 'الوزن', 'Weight', { min: 0.01, max: 100 })],
          ex: [{ name: 'رفع تقييم الرضا', start: '3.8', current: '4.2', target: '4.6', weight: '2' }, { name: 'خفض زمن الاستجابة (ساعات)', start: '48', current: '30', target: '12', weight: '1' }] }],
      compute: function (r) { return okr({ krs: r.rows.krs }, r.n); } },
    { id: 'risk', icon: '🛡️', kind: 'calc', title: { ar: 'مصفوفة المخاطر', en: 'Risk matrix' }, desc: { ar: 'رتّب مخاطرك بحسب الاحتمال × الأثر.', en: 'Rank your risks by probability × impact.' },
      fields: [{ id: 'risks', kind: 'table', minRows: 1, maxRows: 12, label: { ar: 'المخاطر', en: 'Risks' }, cols: [
        { id: 'name', kind: 'text', max: 80, req: true, label: { ar: 'الخطر', en: 'Risk' } }, N('probability', 'الاحتمال 1–5', 'Probability 1–5', { req: true, min: 1, max: 5, int: true }), N('impact', 'الأثر 1–5', 'Impact 1–5', { req: true, min: 1, max: 5, int: true })],
        ex: [{ name: 'ارتفاع تكلفة المورّد', probability: '4', impact: '3' }, { name: 'فقدان عميل رئيسي', probability: '2', impact: '5' }, { name: 'تأخر الإطلاق', probability: '3', impact: '3' }] }],
      compute: function (r) { return riskMatrix({ risks: r.rows.risks }); } },
    { id: 'compare', icon: '⚔️', kind: 'calc', title: { ar: 'مقارنة المنافسين', en: 'Competitor comparison' }, desc: { ar: 'درجة موزونة لك ولثلاثة منافسين على معاييرك.', en: 'A weighted score for you and up to three competitors on your criteria.' },
      fields: [TXT('name1', 'اسم المنافس 1', 'Competitor 1 name', { max: 40, ex: 'منافس أ' }), TXT('name2', 'اسم المنافس 2', 'Competitor 2 name', { max: 40, ex: 'منافس ب' }), TXT('name3', 'اسم المنافس 3', 'Competitor 3 name', { max: 40, ex: 'منافس ج' }),
        { id: 'criteria', kind: 'table', minRows: 1, maxRows: 10, label: { ar: 'المعايير (التقييم من 1 إلى 5)', en: 'Criteria (rating 1 to 5)' }, cols: [
          { id: 'name', kind: 'text', max: 60, req: true, label: { ar: 'المعيار', en: 'Criterion' } }, N('weight', 'الوزن 1–10', 'Weight 1–10', { req: true, min: 1, max: 10 }), N('me', 'أنت', 'You', { req: true, min: 1, max: 5 }),
          N('c1', 'م1', 'C1', { req: true, min: 1, max: 5 }), N('c2', 'م2', 'C2', { req: true, min: 1, max: 5 }), N('c3', 'م3', 'C3', { req: true, min: 1, max: 5 })],
          ex: [{ name: 'السعر', weight: '8', me: '4', c1: '3', c2: '5', c3: '3' }, { name: 'الجودة', weight: '9', me: '4', c1: '4', c2: '3', c3: '5' }, { name: 'خدمة العملاء', weight: '6', me: '5', c1: '3', c2: '3', c3: '4' }] }],
      compute: function (r) { return compare({ criteria: r.rows.criteria }, { name1: r.n.name1 ? { ar: r.n.name1, en: r.n.name1 } : null, name2: r.n.name2 ? { ar: r.n.name2, en: r.n.name2 } : null, name3: r.n.name3 ? { ar: r.n.name3, en: r.n.name3 } : null }); } },
    { id: 'plan', icon: '✅', kind: 'calc', title: { ar: 'خطة عمل', en: 'Action plan' }, desc: { ar: 'مهام بأولويات ومواعيد، وما تأخّر منها.', en: 'Tasks with priorities and due dates, and what is overdue.' },
      fields: [{ id: 'tasks', kind: 'table', minRows: 1, maxRows: 12, label: { ar: 'المهام', en: 'Tasks' }, cols: [
        { id: 'name', kind: 'text', max: 100, req: true, label: { ar: 'المهمة', en: 'Task' } }, { id: 'owner', kind: 'text', max: 40, label: { ar: 'المسؤول', en: 'Owner' } }, { id: 'due', kind: 'date', label: { ar: 'الاستحقاق', en: 'Due' } },
        N('priority', 'الأولوية 1–3', 'Priority 1–3', { req: true, min: 1, max: 3, int: true }), { id: 'status', kind: 'select', options: STATUS, label: { ar: 'الحالة', en: 'Status' } }],
        ex: [{ name: 'تحديد العملاء المستهدفين', owner: 'أنا', due: '', priority: '1', status: 'doing' }, { name: 'إعداد نموذج أولي', owner: 'الفريق', due: '', priority: '2', status: 'todo' }] }],
      compute: function (r, todayMs) { return plan({ tasks: r.rows.tasks }, r.n, todayMs); } },
    { id: 'swot', icon: '🧭', kind: 'board', title: { ar: 'تحليل SWOT', en: 'SWOT board' }, desc: { ar: 'نقاط القوة والضعف والفرص والتهديدات.', en: 'Strengths, weaknesses, opportunities and threats.' },
      fields: [LST('S', 'نقاط القوة (داخلية)', 'Strengths (internal)', 'ما الذي نتقنه ونملكه؟', 'What do we do well and own?'), LST('W', 'نقاط الضعف (داخلية)', 'Weaknesses (internal)', 'أين نحتاج إلى تحسين؟', 'Where do we need to improve?'),
        LST('O', 'الفرص (خارجية)', 'Opportunities (external)', 'ما الاتجاهات التي نستفيد منها؟', 'Which trends can we use?'), LST('T', 'التهديدات (خارجية)', 'Threats (external)', 'ما الذي قد يضرّنا من الخارج؟', 'What outside could hurt us?')], compute: function (r, t, tool) { return board(tool, r.lists); } },
    { id: 'pestle', icon: '🌍', kind: 'board', title: { ar: 'تحليل PESTLE', en: 'PESTLE board' }, desc: { ar: 'العوامل السياسية والاقتصادية والاجتماعية والتقنية والقانونية والبيئية.', en: 'Political, economic, social, technological, legal and environmental factors.' },
      fields: [LST('P', 'سياسية', 'Political', 'سياسات، استقرار، دعم حكومي', 'Policy, stability, government support'), LST('E', 'اقتصادية', 'Economic', 'تضخّم، قدرة شرائية، أسعار فائدة', 'Inflation, purchasing power, interest rates'), LST('So', 'اجتماعية', 'Social', 'عادات، ديموغرافيا، توقعات العملاء', 'Habits, demographics, customer expectations'),
        LST('Te', 'تقنية', 'Technological', 'أدوات جديدة، أتمتة، منصات', 'New tools, automation, platforms'), LST('L', 'قانونية', 'Legal', 'تراخيص، حماية بيانات، عقود', 'Licences, data protection, contracts'), LST('En', 'بيئية', 'Environmental', 'استدامة، موارد، أثر بيئي', 'Sustainability, resources, impact')], compute: function (r, t, tool) { return board(tool, r.lists); } },
    { id: 'bmc', icon: '🧩', kind: 'board', title: { ar: 'نموذج العمل (BMC)', en: 'Business Model Canvas' }, desc: { ar: 'تسعة مربّعات تصف كيف تُنشئ المؤسسة القيمة وتحصّلها.', en: 'Nine blocks that describe how an organisation creates and captures value.' },
      fields: [LST('cs', 'شرائح العملاء', 'Customer segments', 'من نخدم تحديداً؟', 'Who exactly do we serve?'), LST('vp', 'القيمة المقدَّمة', 'Value propositions', 'أي مشكلة نحلّها؟', 'Which problem do we solve?'), LST('ch', 'القنوات', 'Channels', 'كيف نصل إليهم؟', 'How do we reach them?'),
        LST('cr', 'علاقات العملاء', 'Customer relationships', 'كيف نحتفظ بهم؟', 'How do we keep them?'), LST('rs', 'مصادر الإيراد', 'Revenue streams', 'من يدفع ولماذا وكم؟', 'Who pays, why and how much?'), LST('kr', 'الموارد الرئيسية', 'Key resources', 'ما الذي نحتاجه؟', 'What do we need?'),
        LST('ka', 'الأنشطة الرئيسية', 'Key activities', 'ما الذي يجب أن نفعله؟', 'What must we do?'), LST('kp', 'الشركاء الرئيسيون', 'Key partners', 'من يساعدنا؟', 'Who helps us?'), LST('cost', 'هيكل التكاليف', 'Cost structure', 'أين تذهب النفقات؟', 'Where does the money go?')], compute: function (r, t, tool) { return board(tool, r.lists); } }
  ];
  function toolById(id) { for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].id === id) return TOOLS[i]; return null; }

  // نقطة دخول واحدة: values (كما أدخلها المستخدم) → نتيجة (دائماً كائن: ok + errors/outputs)
  function compute(tool, vals, todayMs) {
    if (typeof tool === 'string') tool = toolById(tool);
    if (!tool) return { ok: false, errors: { _: { ar: 'أداة غير معروفة', en: 'Unknown tool' } } };
    var r = readFields(tool, vals && typeof vals === 'object' ? vals : {});
    var errs = r.errors, missing = false;
    // الحقول الرقمية الاختيارية الفارغة = لا قيمة (null) وليست خطأ
    if (Object.keys(errs).length) return { ok: false, errors: errs };
    if (tool.kind === 'calc') tool.fields.forEach(function (f) { if (f.kind === 'num' && f.req && r.n[f.id] == null) missing = true; });
    if (missing) return { ok: false, errors: {} };
    try { return tool.compute(r, todayMs, tool); } catch (e) { return { ok: false, errors: { _: { ar: 'تعذّر الحساب', en: 'Could not calculate' } } }; }
  }

  // ═══ الحالة المحفوظة (لكل حساب) ══════════════════════════════════════════════════════════════════
  function stateKey() { return 'aus.exec.v1.' + userKey(); }
  function lsGet(k) { try { var r = W.localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { W.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sanitizeState(raw) {
    var out = { v: 1, tools: {} };
    if (!raw || typeof raw !== 'object' || raw.v !== 1 || !raw.tools || typeof raw.tools !== 'object') return out;
    TOOLS.forEach(function (t) {
      var s = raw.tools[t.id];
      if (!s || typeof s !== 'object' || !s.values || typeof s.values !== 'object') return;
      var vals = {};
      t.fields.forEach(function (f) {
        var v = s.values[f.id];
        if (f.kind === 'num' || f.kind === 'text') { if (v != null && typeof v !== 'object') vals[f.id] = clip(v, f.max || 40); }
        else if (f.kind === 'list') { if (typeof v === 'string' || Array.isArray(v)) vals[f.id] = String(Array.isArray(v) ? v.join('\n') : v).slice(0, 4000); }
        else if (f.kind === 'table' && Array.isArray(v)) vals[f.id] = v.slice(0, f.maxRows || 12).map(function (r) { var row = {}; if (r && typeof r === 'object') f.cols.forEach(function (c) { if (r[c.id] != null && typeof r[c.id] !== 'object') row[c.id] = clip(r[c.id], c.max || 40); }); return row; });
      });
      out.tools[t.id] = { values: vals, at: typeof s.at === 'number' && isFinite(s.at) ? s.at : 0 };
    });
    return out;
  }
  var ST = sanitizeState(null);
  function loadState() { ST = sanitizeState(lsGet(stateKey())); }
  function saveTool(id, values) { ST.tools[id] = { values: values, at: Date.now() }; lsSet(stateKey(), ST); }

  // ما يصل إلى سياق CEO AI: نتائج آخر الحاسبات المستعملة (أرقام فقط، تُعاد حسابتها الآن من المدخلات المحفوظة)
  function contextOutputs() {
    loadState();
    var arr = [];
    TOOLS.forEach(function (t) {
      if (t.kind !== 'calc' || !ST.tools[t.id] || !ST.tools[t.id].at) return;
      var res = compute(t, ST.tools[t.id].values);
      if (res.ok && res.ctx) arr.push({ tool: t.id, at: ST.tools[t.id].at, inputs: res.ctx.inputs, outputs: res.ctx.outputs, note: tx(t.title) });
    });
    arr.sort(function (a, b) { return b.at - a.at; });
    return arr.slice(0, 4);
  }

  // ═══ نصّ السؤال الذي يُرسَل إلى CEO AI ═══════════════════════════════════════════════════════════
  function valueText(o) {
    if (o.fmt === 'status') return { ahead: lang() === 'ar' ? 'متقدّم على الخطة' : 'ahead of plan', on_track: lang() === 'ar' ? 'على المسار' : 'on track', behind: lang() === 'ar' ? 'متأخر عن الخطة' : 'behind plan' }[o.value] || String(o.value);
    return fmt(o.value, o.fmt === 'num' ? 'num' : o.fmt);
  }
  function askText(tool, vals, res, isExample) {
    var ar = lang() === 'ar', title = tx(tool.title), parts = [];
    if (tool.kind === 'board') {
      var r = readFields(tool, vals);
      tool.fields.forEach(function (f) { var items = r.lists[f.id] || []; parts.push('• ' + tx(f.label) + ': ' + (items.length ? items.join(' / ') : (ar ? '(فارغ)' : '(empty)'))); });
      var head = ar ? 'راجع لوحة «' + title + '» التي أعددتُها. ما أبرز الثغرات وما الذي أغفلتُه، وما الأولويات؟\n' : 'Review the “' + title + '” board I prepared. What are the main gaps, what did I miss, and what should be prioritised?\n';
      return clip(head + parts.join('\n'), 3900);
    }
    if (!res || !res.ok) return '';
    var r2 = readFields(tool, vals);
    tool.fields.forEach(function (f) {
      if (f.kind === 'num' && r2.n[f.id] != null) parts.push(tx(f.label) + ' = ' + fmt(r2.n[f.id]));
      else if (f.kind === 'text' && r2.n[f.id]) parts.push(tx(f.label) + ': ' + r2.n[f.id]);
      else if (f.kind === 'table') parts.push(tx(f.label) + ': ' + (r2.rows[f.id] || []).map(function (row) { return f.cols.map(function (c) { return row[c.id]; }).filter(function (x) { return x !== '' && x != null; }).join(' · '); }).join(' | '));
    });
    var outs = res.outputs.slice(0, 8).map(function (o) { return tx(o.label) + ' = ' + valueText(o); });
    var intro = (ar ? 'حسبتُ باستعمال أداة «' + title + '» في AUS' + (isExample ? ' (بأرقام افتراضية للتوضيح لا تخصّ مشروعي)' : '') + '. المدخلات: ' : 'I used the “' + title + '” tool in AUS' + (isExample ? ' (with placeholder numbers, not my real project)' : '') + '. Inputs: ');
    var mid = ar ? '\nالنتائج: ' : '\nResults: ', tail = ar ? '\nما قراءتك لهذه الأرقام، وما المخاطر والافتراضات التي أنتبه لها، وما خطوتي التالية؟' : '\nHow do you read these numbers, which risks and assumptions should I watch, and what is my next step?';
    var sep = ar ? '؛ ' : '; ';
    return clip(intro + parts.join(sep) + mid + outs.join(sep) + tail, 3900);
  }
  function resultText(tool, res) {
    if (!res || !res.ok) return '';
    var lines = [tx(tool.title)];
    res.outputs.forEach(function (o) { lines.push('• ' + tx(o.label) + ': ' + valueText(o)); });
    return lines.join('\n');
  }

  // ═══ الواجهة ═════════════════════════════════════════════════════════════════════════════════════
  var UI = { L: {
    ar: { pick: 'اختر أداة', back: 'كل الأدوات', example: 'مثال توضيحي', reset: 'مسح', copy: 'نسخ النتيجة', copied: 'تم النسخ', ask: 'اسأل CEO AI عن هذه النتيجة', askBoard: 'اطلب مراجعة CEO AI', addRow: 'إضافة صف', delRow: 'حذف', results: 'النتائج', fixInputs: 'أكمل المدخلات لتظهر النتيجة.', exampleNote: 'أرقام افتراضية للتوضيح فقط — ليست بياناتك.', calc: 'حاسبات', boards: 'لوحات', lines: 'اكتب كل بند في سطر.', notesTitle: 'ملاحظات على الحساب', free: 'مجاني' },
    en: { pick: 'Choose a tool', back: 'All tools', example: 'Load an example', reset: 'Clear', copy: 'Copy result', copied: 'Copied', ask: 'Ask CEO AI about this result', askBoard: 'Ask CEO AI to review it', addRow: 'Add row', delRow: 'Delete', results: 'Results', fixInputs: 'Complete the inputs to see the result.', exampleNote: 'Placeholder numbers for illustration only — not your data.', calc: 'Calculators', boards: 'Boards', lines: 'Write one item per line.', notesTitle: 'Notes on the calculation', free: 'Free' }
  } };
  function T(k) { return (UI.L[lang()] || UI.L.ar)[k] || UI.L.ar[k] || k; }

  var host = null, handlers = null, current = null, vals = {}, timer = 0, exampleLoaded = false;      // أرقام «مثال توضيحي» لا تُحفَظ ولا تدخل سياق المستشار كأنها حسابات المستخدم
  function injectCss() {
    if (D.getElementById('aus-exec-css')) return;
    var st = D.createElement('style'); st.id = 'aus-exec-css';
    st.textContent = [
      '.aus-ex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}',
      '.aus-ex-card{display:flex;flex-direction:column;gap:4px;padding:.8rem .9rem;text-align:start;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#fff;cursor:pointer;font-family:Tajawal,sans-serif;transition:transform .2s,border-color .2s,background .2s}',
      '.aus-ex-card:hover{transform:translateY(-2px);border-color:rgba(0,212,255,.45);background:rgba(0,212,255,.07)}.aus-ex-card:focus-visible{outline:2px solid var(--primary);outline-offset:2px}.aus-ex-card .i{font-size:1.5rem}.aus-ex-card b{font-size:.92rem}.aus-ex-card small{color:rgba(255,255,255,.6);font-size:.76rem;line-height:1.5}',
      '.aus-ex-sec{margin:1rem 0 .5rem;font-family:Orbitron,sans-serif;font-size:.68rem;letter-spacing:.08em;color:var(--primary)}',
      '.aus-ex-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:.8rem}.aus-ex-head h3{margin:0;font-size:1rem;color:#fff;flex:1}',
      '.aus-ex-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.7rem}',
      '.aus-ex-f{display:flex;flex-direction:column;gap:4px}.aus-ex-f label{font-size:.78rem;color:rgba(255,255,255,.75)}.aus-ex-f input,.aus-ex-f select,.aus-ex-f textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:10px;color:#fff;padding:.5rem .65rem;font-family:Tajawal,sans-serif;font-size:.9rem}',
      '.aus-ex-f input:focus,.aus-ex-f select:focus,.aus-ex-f textarea:focus{outline:2px solid var(--primary);outline-offset:1px}.aus-ex-f [aria-invalid="true"]{border-color:#ff4d8d}.aus-ex-f .err{color:#ffb4c8;font-size:.74rem;min-height:1em}.aus-ex-f .help{color:rgba(255,255,255,.5);font-size:.72rem}',
      '.aus-ex-wide{grid-column:1 / -1}',
      '.aus-ex-table{width:100%;border-collapse:collapse}.aus-ex-table th{font-size:.72rem;color:rgba(255,255,255,.6);text-align:start;padding:2px 4px;font-weight:600}.aus-ex-table td{padding:2px 3px;vertical-align:top}.aus-ex-table input,.aus-ex-table select{min-width:60px}',
      '.aus-ex-actions{display:flex;flex-wrap:wrap;gap:8px;margin:.8rem 0}',
      '.aus-ex-res{margin-top:1rem;padding:.9rem 1rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}',
      '.aus-ex-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.aus-ex-tile{padding:.55rem .7rem;border-radius:12px;background:rgba(0,10,30,.45);border:1px solid rgba(255,255,255,.1)}.aus-ex-tile small{display:block;color:rgba(255,255,255,.6);font-size:.7rem}.aus-ex-tile b{font-family:Orbitron,sans-serif;font-size:1rem;color:#fff;direction:ltr;unicode-bidi:isolate;display:inline-block}',
      '.aus-ex-tile.good b{color:#00f5d4}.aus-ex-tile.bad b{color:#ff4d8d}.aus-ex-tile.warn b{color:#ffd60a}',
      '.aus-ex-notes{margin:.7rem 0 0;padding:0;list-style:none;display:grid;gap:4px;font-size:.76rem;color:rgba(255,255,255,.6);line-height:1.65}',
      '.aus-ex-tablewrap{overflow-x:auto;margin-top:.8rem}.aus-ex-rt{width:100%;border-collapse:collapse;font-size:.8rem}.aus-ex-rt th,.aus-ex-rt td{padding:.3rem .5rem;border-bottom:1px solid rgba(255,255,255,.08);text-align:start;white-space:nowrap}.aus-ex-rt th{color:rgba(255,255,255,.6);font-weight:600}.aus-ex-rt td.n{direction:ltr;unicode-bidi:isolate}',
      '.aus-ex-band-critical{color:#ff4d8d}.aus-ex-band-high{color:#ff9f1c}.aus-ex-band-medium{color:#ffd60a}.aus-ex-band-low{color:#00f5d4}',
      '.aus-ex-late{color:#ff4d8d}',
      '.aus-ex-mini{padding:.32rem .8rem;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;font-family:Tajawal,sans-serif;font-size:.78rem;cursor:pointer}.aus-ex-mini:hover{background:rgba(255,255,255,.12)}.aus-ex-mini.primary{background:rgba(0,212,255,.14);border-color:rgba(0,212,255,.45)}',
      '@media (max-width:560px){.aus-ex-table thead{display:none}.aus-ex-table tr{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)}.aus-ex-table td{display:block}}'
    ].join('\n');
    D.head.appendChild(st);
  }

  function fieldHtml(f, v, prefix, errMsg) {
    var id = 'axf_' + prefix + f.id, lbl = esc(tx(f.label)), val = v == null ? '' : v, bad = errMsg ? ' aria-invalid="true" aria-describedby="' + id + '_e"' : '';
    if (f.kind === 'list') return '<div class="aus-ex-f"><label for="' + id + '">' + lbl + '</label><textarea id="' + id + '" rows="3" data-f="' + esc(f.id) + '" placeholder="' + esc(tx(f.hint)) + '">' + esc(Array.isArray(val) ? val.join('\n') : val) + '</textarea></div>';
    return '<div class="aus-ex-f"><label for="' + id + '">' + lbl + '</label><input id="' + id + '" type="text" ' + (f.kind === 'num' ? 'inputmode="decimal" autocomplete="off"' : '') + ' data-f="' + esc(f.id) + '" value="' + esc(val) + '"' + bad + '><span class="err" id="' + id + '_e">' + esc(errMsg || '') + '</span></div>';
  }
  function cellHtml(c, v, fieldId, i, errMsg) {
    var id = 'axc_' + fieldId + '_' + i + '_' + c.id, bad = errMsg ? ' aria-invalid="true" title="' + esc(errMsg) + '"' : '';
    if (c.kind === 'select') return '<select data-t="' + esc(fieldId) + '" data-r="' + i + '" data-c="' + esc(c.id) + '" aria-label="' + esc(tx(c.label)) + '">' + c.options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(v) === o.v ? ' selected' : '') + '>' + esc(tx(o)) + '</option>'; }).join('') + '</select>';
    return '<input id="' + id + '" type="' + (c.kind === 'date' ? 'date' : 'text') + '" ' + (c.kind === 'num' ? 'inputmode="decimal"' : '') + ' data-t="' + esc(fieldId) + '" data-r="' + i + '" data-c="' + esc(c.id) + '" value="' + esc(v == null ? '' : v) + '" aria-label="' + esc(tx(c.label)) + '"' + bad + '>';
  }
  function tableEditorHtml(f, rows, errors) {
    var head = '<tr>' + f.cols.map(function (c) { return '<th>' + esc(tx(c.label)) + '</th>'; }).join('') + '<th></th></tr>';
    var body = rows.map(function (r, i) {
      var rerr = errors && errors[f.id + '.' + i] || {};
      return '<tr>' + f.cols.map(function (c) { return '<td>' + cellHtml(c, r[c.id], f.id, i, rerr[c.id] ? tx(rerr[c.id]) : '') + '</td>'; }).join('') + '<td><button type="button" class="aus-ex-mini" data-delrow="' + esc(f.id) + '" data-r="' + i + '" aria-label="' + esc(T('delRow')) + '">✕</button></td></tr>';
    }).join('');
    return '<div class="aus-ex-f aus-ex-wide"><label>' + esc(tx(f.label)) + '</label><div class="aus-ex-tablewrap"><table class="aus-ex-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<div><button type="button" class="aus-ex-mini" data-addrow="' + esc(f.id) + '">+ ' + esc(T('addRow')) + '</button> <span class="err" id="axt_' + esc(f.id) + '_e" style="color:#ffb4c8;font-size:.74rem"></span></div></div>';
  }

  function listCards() {
    var one = function (kind) { return '<div class="aus-ex-grid">' + TOOLS.filter(function (t) { return t.kind === kind; }).map(function (t) { return '<button type="button" class="aus-ex-card" data-tool="' + t.id + '"><span class="i">' + t.icon + '</span><b>' + esc(tx(t.title)) + '</b><small>' + esc(tx(t.desc)) + '</small></button>'; }).join('') + '</div>'; };
    return '<div class="aus-ex-sec">⬡ ' + esc(T('calc')) + '</div>' + one('calc') + '<div class="aus-ex-sec">⬡ ' + esc(T('boards')) + '</div>' + one('board');
  }

  function openTool(id) {
    var tool = toolById(id); if (!tool || !host) return;
    current = tool; loadState(); exampleLoaded = false;
    vals = ST.tools[id] ? JSON.parse(JSON.stringify(ST.tools[id].values)) : {};
    tool.fields.forEach(function (f) { if (f.kind === 'table' && !Array.isArray(vals[f.id])) vals[f.id] = [{}]; });
    renderForm(); recompute();
  }
  function renderForm() {
    if (!host || !current) return;
    var tool = current, fieldsHtml = '', tableErr = null;
    var res = compute(tool, vals), errors = res.ok ? {} : (res.errors || {});
    tool.fields.forEach(function (f) {
      if (f.kind === 'table') fieldsHtml += tableEditorHtml(f, Array.isArray(vals[f.id]) ? vals[f.id] : [{}], errors);
      else fieldsHtml += fieldHtml(f, vals[f.id], '', errors[f.id] && String(vals[f.id] == null ? '' : vals[f.id]).trim() !== '' ? tx(errors[f.id]) : '').replace('class="aus-ex-f"', 'class="aus-ex-f' + (f.kind === 'list' ? ' aus-ex-wide' : '') + '"');      // الخطأ يظهر لحقل كُتب فيه شيء فقط (لا نصرخ «مطلوب» قبل أن يبدأ المستخدم)
    });
    host.innerHTML = '<div class="aus-ex-head"><button type="button" class="aus-ex-mini" data-back="1">← ' + esc(T('back')) + '</button><h3>' + tool.icon + ' ' + esc(tx(tool.title)) + '</h3></div>' +
      '<div class="aus-ex-form">' + fieldsHtml + '</div>' +
      '<div class="aus-ex-actions">' + (tool.fields.some(function (f) { return f.ex !== undefined; }) ? '<button type="button" class="aus-ex-mini" data-act="example">' + esc(T('example')) + '</button>' : '') + '<button type="button" class="aus-ex-mini" data-act="reset">' + esc(T('reset')) + '</button></div>' +
      '<div class="aus-ex-res" id="ausExRes" role="status" aria-live="polite"></div>';
  }
  function recompute() {
    var box = D.getElementById('ausExRes'); if (!box || !current) return;
    var tool = current, res = compute(tool, vals), html = '';
    // رسائل الخطأ تحت الحقول (دون إعادة بناء النموذج: لا يضيع التركيز)
    var errors = res.ok ? {} : (res.errors || {});
    tool.fields.forEach(function (f) {
      if (f.kind === 'num' || f.kind === 'text') {
        var inp = host.querySelector('[data-f="' + f.id + '"]'), e = host.querySelector('#axf_' + f.id + '_e');
        if (inp) { if (errors[f.id] && String(vals[f.id] == null ? '' : vals[f.id]).trim() !== '') inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
        if (e) e.textContent = errors[f.id] && String(vals[f.id] == null ? '' : vals[f.id]).trim() !== '' ? tx(errors[f.id]) : '';
      } else if (f.kind === 'table') {
        host.querySelectorAll('[data-t="' + f.id + '"]').forEach(function (inp) { var rerr = errors[f.id + '.' + inp.getAttribute('data-r')], c = inp.getAttribute('data-c'); if (rerr && rerr[c]) { inp.setAttribute('aria-invalid', 'true'); inp.title = tx(rerr[c]); } else { inp.removeAttribute('aria-invalid'); inp.removeAttribute('title'); } });
      }
    });
    if (tool.kind === 'board') {
      var bres = res; if (bres.ok) { html += '<div class="aus-ex-tiles">' + bres.outputs.map(function (o) { return '<div class="aus-ex-tile ' + o.tone + '"><small>' + esc(tx(o.label)) + '</small><b>' + o.value + '</b></div>'; }).join('') + '</div>'; html += '<ul class="aus-ex-notes">' + bres.notes.map(function (n) { return '<li>' + esc(tx(n)) + '</li>'; }).join('') + '</ul>'; }
      html += '<div class="aus-ex-actions"><button type="button" class="aus-ex-mini primary" data-act="ask">' + esc(T('askBoard')) + '</button></div>';
    } else if (!res.ok) {
      html = '<div class="aus-ex-notes"><span>' + esc(T('fixInputs')) + '</span></div>';
    } else {
      html = '<div class="aus-ex-tiles">' + res.outputs.map(function (o) { return '<div class="aus-ex-tile ' + o.tone + '"><small>' + esc(tx(o.label)) + '</small><b>' + esc(valueText(o)) + '</b></div>'; }).join('') + '</div>';
      if (res.table) html += tableResultHtml(res.table);
      html += '<ul class="aus-ex-notes">' + res.notes.map(function (n) { return '<li>' + esc(tx(n)) + '</li>'; }).join('') + '</ul>';
      html += '<div class="aus-ex-actions"><button type="button" class="aus-ex-mini" data-act="copy">' + esc(T('copy')) + '</button><button type="button" class="aus-ex-mini primary" data-act="ask">' + esc(T('ask')) + '</button></div>';
    }
    box.innerHTML = html;
    if ((res.ok || tool.kind === 'board') && !exampleLoaded) { saveTool(tool.id, JSON.parse(JSON.stringify(vals))); if (handlers && handlers.onChange) try { handlers.onChange(); } catch (e) {} }
  }
  function tableResultHtml(t) {
    var head = '<tr>' + t.cols.map(function (c) { return '<th>' + esc(lang() === 'ar' ? c[1] : c[2]) + '</th>'; }).join('') + '</tr>';
    var body = t.rows.map(function (r) {
      return '<tr>' + t.cols.map(function (c) {
        var v = r[c[0]], k = c[3], txt;
        if (k === 'band') return '<td class="aus-ex-band-' + esc(r.band) + '">' + esc(lang() === 'ar' ? r.bandAr : r.bandEn) + '</td>';
        if (k === 'taskstatus') { var s = STATUS.filter(function (x) { return x.v === v; })[0]; return '<td' + (r.late ? ' class="aus-ex-late"' : '') + '>' + esc(s ? tx(s) : v) + (r.late ? ' ⚠' : '') + '</td>'; }
        if (k === 'text') return '<td>' + esc(v == null ? '' : v) + '</td>';
        txt = fmt(v, k === 'pct' ? 'pct' : k === 'int' ? 'int' : 'num'); return '<td class="n">' + esc(txt) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="aus-ex-tablewrap"><table class="aus-ex-rt"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function onInput(e) {
    var t = e.target; if (!t || !current) return;
    var f = t.getAttribute('data-f'), tf = t.getAttribute('data-t');
    if (f) vals[f] = t.value;
    else if (tf) { var i = parseInt(t.getAttribute('data-r'), 10), c = t.getAttribute('data-c'); if (!Array.isArray(vals[tf])) vals[tf] = []; if (!vals[tf][i]) vals[tf][i] = {}; vals[tf][i][c] = t.value; }
    else return;
    exampleLoaded = false;                                                          // أول تعديل يدوي يحوّل الأرقام إلى أرقام المستخدم
    clearTimeout(timer); timer = setTimeout(recompute, 120);
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('button') : null; if (!t || !host || !host.contains(t)) return;
    if (t.getAttribute('data-tool')) { openTool(t.getAttribute('data-tool')); return; }
    if (t.getAttribute('data-back')) { current = null; host.innerHTML = listCards(); return; }
    var add = t.getAttribute('data-addrow'), del = t.getAttribute('data-delrow');
    if (add && current) { var f = current.fields.filter(function (x) { return x.id === add; })[0]; if (f && (vals[add] || []).length < (f.maxRows || 12)) { vals[add] = (vals[add] || []).concat([{}]); renderForm(); recompute(); } return; }
    if (del && current) { var i = parseInt(t.getAttribute('data-r'), 10); vals[del] = (vals[del] || []).filter(function (_, k) { return k !== i; }); if (!vals[del].length) vals[del] = [{}]; renderForm(); recompute(); return; }
    var act = t.getAttribute('data-act'); if (!act || !current) return;
    if (act === 'example') {
      vals = {}; current.fields.forEach(function (f) { if (f.ex !== undefined) vals[f.id] = f.kind === 'table' ? JSON.parse(JSON.stringify(f.ex)) : f.ex; else if (f.kind === 'table') vals[f.id] = [{}]; });
      exampleLoaded = true; renderForm(); recompute();
    } else if (act === 'reset') { exampleLoaded = false; vals = {}; current.fields.forEach(function (f) { if (f.kind === 'table') vals[f.id] = [{}]; }); renderForm(); recompute(); }
    else if (act === 'copy') { var res = compute(current, vals); var text = resultText(current, res); try { if (W.navigator.clipboard && W.navigator.clipboard.writeText) W.navigator.clipboard.writeText(text); } catch (er) {} var old = t.textContent; t.textContent = T('copied'); setTimeout(function () { t.textContent = old; }, 1400); }
    else if (act === 'ask') { var r2 = compute(current, vals), q = askText(current, vals, r2, exampleLoaded); if (q && handlers && handlers.onAsk) handlers.onAsk(q); }
  }

  function mount(el, h) {
    unmount();
    host = el; handlers = h || {}; injectCss(); loadState();
    host.innerHTML = '<div class="aus-ex-sec" style="margin-top:0">⬡ ' + esc(T('pick')) + '</div>' + listCards();
    host.addEventListener('click', onClick); host.addEventListener('input', onInput); host.addEventListener('change', onInput);
  }
  function unmount() {
    if (host) { host.removeEventListener('click', onClick); host.removeEventListener('input', onInput); host.removeEventListener('change', onInput); }
    clearTimeout(timer); host = null; handlers = null; current = null;
  }

  W.AUS_EXEC = {
    tools: TOOLS, compute: compute, contextOutputs: contextOutputs, mount: mount, unmount: unmount, askText: askText, resultText: resultText,
    _test: { parseNum: parseNum, fmt: fmt, readFields: readFields, breakEven: breakEven, projection: projection, kpi: kpi, okr: okr, riskMatrix: riskMatrix, compare: compare, plan: plan, board: board, sanitizeState: sanitizeState,
             validDate: validDate, riskBand: riskBand, toolById: toolById, round: round }
  };
})();
