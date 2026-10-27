const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author  = 'AUS Platform';
pres.title   = 'AUS — AI University Simulator';
pres.subject = 'Platform Overview';

// ── Brand Colors ──────────────────────────────────────────────────
const C = {
  bg:       '000814',   // deep dark
  navy:     '001233',   // card bg
  navyMid:  '001d3d',   // section bg
  cyan:     '00d4ff',   // primary
  cyanDim:  '0084ff',   // secondary
  gold:     'FFD700',   // accent
  goldDim:  'B8860B',
  white:    'FFFFFF',
  gray:     'A0AEC0',
  grayDark: '4A5568',
  purple:   '9d4edd',
  green:    '00f5d4',
  red:      'ff006e',
};

// ── Helpers ───────────────────────────────────────────────────────
const mkShadow = () => ({ type:'outer', blur:12, offset:4, angle:135, color:'000000', opacity:0.35 });

function addBg(slide, color = C.bg) {
  slide.background = { color };
}

function addGlowCard(slide, x, y, w, h, borderColor = C.cyan) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.navyMid },
    line: { color: borderColor, width: 1.2 },
    shadow: mkShadow(),
  });
}

function addTag(slide, text, x, y, color = C.cyan) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 1.7, h: 0.28,
    fill: { color, transparency: 85 },
    line: { color, width: 0.8 },
  });
  slide.addText(text, {
    x, y, w: 1.7, h: 0.28,
    fontSize: 9, color, bold: true,
    align: 'center', valign: 'middle', margin: 0,
    fontFace: 'Arial',
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);

  // Glowing top bar
  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:0.06, fill:{ color: C.cyan }, line:{ color: C.cyan, width:0 },
  });

  // Decorative circles (orbit rings)
  for (let i = 0; i < 3; i++) {
    const r = 1.2 + i * 0.7;
    s.addShape(pres.shapes.OVAL, {
      x: 5 - r, y: 2.8125 - r, w: r*2, h: r*2,
      fill: { color: C.cyan, transparency: 98 },
      line: { color: C.cyan, width: 0.6, transparency: 70 - i*20 },
    });
  }

  // AUS Logo text
  s.addText([
    { text:'A', options:{ color: C.cyan,  bold:true } },
    { text:'U', options:{ color: C.white, bold:true } },
    { text:'S', options:{ color: C.gold,  bold:true } },
  ], {
    x:3.5, y:1.1, w:3, h:1.4,
    fontSize:96, align:'center', fontFace:'Arial Black',
  });

  // Title
  s.addText('AI University Simulator', {
    x:1, y:2.6, w:8, h:0.5,
    fontSize:22, color: C.white, align:'center',
    fontFace:'Arial', bold:false, charSpacing:4,
  });

  // Arabic subtitle
  s.addText('منصة القيادة الذكية بالذكاء الاصطناعي', {
    x:1, y:3.1, w:8, h:0.45,
    fontSize:16, color: C.cyan, align:'center',
    fontFace:'Arial', italic: false,
  });

  // Divider
  s.addShape(pres.shapes.RECTANGLE, {
    x:3.5, y:3.6, w:3, h:0.03, fill:{ color: C.gold }, line:{color:C.gold,width:0},
  });

  // Tags row
  const tags = ['🎓 تعليم تفاعلي','🤖 ذكاء اصطناعي','🌐 متعدد المنصات','💳 نظام دفع متكامل'];
  tags.forEach((t,i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.6 + i*2.3, y:3.8, w:2.1, h:0.32,
      fill:{ color: C.navyMid },
      line:{ color: C.cyan, width:0.8 },
    });
    s.addText(t, {
      x: 0.6 + i*2.3, y:3.8, w:2.1, h:0.32,
      fontSize:10, color:C.white, align:'center', valign:'middle', margin:0,
      fontFace:'Arial',
    });
  });

  // Version badge
  s.addText('الإصدار 1.0  ·  2026', {
    x:0, y:5.2, w:10, h:0.35,
    fontSize:11, color: C.gray, align:'center', fontFace:'Arial',
  });

  // Bottom line
  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:5.57, w:10, h:0.055, fill:{ color: C.gold }, line:{color:C.gold,width:0},
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 2 — OVERVIEW (What is AUS?)
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);

  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  s.addText('ما هو AUS؟', { x:0.5,y:0.15,w:9,h:0.5, fontSize:28, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });
  s.addShape(pres.shapes.RECTANGLE, { x:7.5,y:0.65,w:2,h:0.04, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  // Left: description card
  addGlowCard(s, 0.3, 0.85, 4.5, 4.2);
  s.addText('منصة محاكاة جامعية', { x:0.5,y:1.0,w:4.1,h:0.4, fontSize:16, color:C.cyan, bold:true, align:'right', fontFace:'Arial' });
  s.addText([
    { text:'AUS هي منصة تعليمية تفاعلية تحاكي بيئة جامعة أعمال ذكية، تعتمد الذكاء الاصطناعي لتطوير مهارات القيادة والإدارة.\n\n', options:{breakLine:false} },
    { text:'✦  ', options:{color:C.cyan, bold:true} }, { text:'10 وحدات تعليمية متكاملة\n', options:{breakLine:true} },
    { text:'✦  ', options:{color:C.cyan, bold:true} }, { text:'اختبارات شخصية بالذكاء الاصطناعي\n', options:{breakLine:true} },
    { text:'✦  ', options:{color:C.cyan, bold:true} }, { text:'محاكاة قرارات الأعمال الحقيقية\n', options:{breakLine:true} },
    { text:'✦  ', options:{color:C.cyan, bold:true} }, { text:'نظام XP ومستويات وإنجازات\n', options:{breakLine:true} },
    { text:'✦  ', options:{color:C.cyan, bold:true} }, { text:'تقارير PDF احترافية\n', options:{breakLine:true} },
    { text:'✦  ', options:{color:C.cyan, bold:true} }, { text:'متاح PWA + EXE + APK', options:{} },
  ], { x:0.5,y:1.5,w:4.1,h:3.3, fontSize:13, color:C.white, fontFace:'Arial', align:'right', valign:'top', rtlMode:true });

  // Right: stats grid
  const stats = [
    { n:'16+', l:'وحدة تعليمية', c:C.cyan },
    { n:'300+', l:'سؤال اختبار', c:C.gold },
    { n:'44', l:'محتوى مدفوع', c:C.green },
    { n:'10', l:'محاضرة AI', c:C.purple },
  ];
  stats.forEach((st, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 5.1 + col * 2.4, y = 0.85 + row * 2.1;
    addGlowCard(s, x, y, 2.1, 1.8, st.c);
    s.addText(st.n, { x, y:y+0.2, w:2.1, h:0.9, fontSize:44, color:st.c, bold:true, align:'center', fontFace:'Arial Black' });
    s.addText(st.l, { x, y:y+1.1, w:2.1, h:0.5, fontSize:13, color:C.white, align:'center', fontFace:'Arial' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 3 — TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  s.addText('محتويات العرض', { x:0.5,y:0.15,w:9,h:0.5, fontSize:26, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  const items = [
    { n:'01', t:'الرئيسية وكلية الأعمال',         c:C.cyan },
    { n:'02', t:'الشخصية القيادية + Career DNA',   c:C.gold },
    { n:'03', t:'التحديات وأفضل تصرف',             c:C.green },
    { n:'04', t:'CEO AI المحادثة الذكية',           c:C.purple },
    { n:'05', t:'دكتور AI — محاضرات السلوك التنظيمي', c:C.cyan },
    { n:'06', t:'المتجر ونظام الدفع CliQ / IBAN',  c:C.gold },
    { n:'07', t:'الإنجازات والشهادات والـ Dashboard', c:C.green },
    { n:'08', t:'التوزيع — PWA + EXE + APK',       c:C.purple },
  ];

  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 5.2 : 0.3;
    const y = 0.85 + row * 1.1;
    addGlowCard(s, x, y, 4.6, 0.9, it.c);
    s.addText(it.n, { x:x+0.15, y:y+0.12, w:0.6, h:0.65, fontSize:22, color:it.c, bold:true, align:'center', fontFace:'Arial Black' });
    s.addShape(pres.shapes.RECTANGLE, { x:x+0.75, y:y+0.15, w:0.025, h:0.6, fill:{color:it.c}, line:{color:it.c,width:0} });
    s.addText(it.t, { x:x+0.85, y:y+0.12, w:3.6, h:0.65, fontSize:14, color:C.white, bold:false, fontFace:'Arial', align:'right', valign:'middle' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 4 — HOME & SPECIALTIES
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  addTag(s, '01  الرئيسية', 8.1, 0.15, C.cyan);
  s.addText('🏠 الصفحة الرئيسية — كلية الأعمال', { x:0.5,y:0.15,w:7.4,h:0.5, fontSize:22, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // Left description
  s.addText([
    { text:'تجربة تعليمية تبدأ من اختيار التخصص\n\n', options:{color:C.cyan, bold:true} },
    { text:'يختار الطالب من 6 تخصصات أكاديمية:\n', options:{} },
    { text:'إدارة أعمال  ·  تسويق  ·  موارد بشرية\nتمويل  ·  ريادة أعمال  ·  ذكاء اصطناعي\n\n', options:{color:C.gold} },
    { text:'كل تخصص يفتح محتوى مخصصاً من\nالاختبارات والتحديات والأدوات.', options:{} },
  ], { x:0.4,y:0.8,w:3.5,h:3.5, fontSize:13, color:C.white, fontFace:'Arial', align:'right', valign:'top', rtlMode:true });

  // Right: UI mockup
  addGlowCard(s, 4.3, 0.75, 5.4, 4.0);
  s.addText('🎓  كلية الأعمال', { x:4.5,y:0.9,w:5,h:0.4, fontSize:14, color:C.cyan, bold:true, align:'right', fontFace:'Arial' });
  s.addText('اختر تخصصك وابدأ رحلتك التعليمية التفاعلية', { x:4.5,y:1.3,w:5,h:0.35, fontSize:10, color:C.gray, align:'right', fontFace:'Arial' });

  const specs = ['💼 إدارة الأعمال','📊 التسويق','👥 الموارد البشرية','💰 التمويل','🚀 ريادة أعمال','🤖 الذكاء الاصطناعي'];
  specs.forEach((sp, i) => {
    const col = i % 3, row = Math.floor(i / 2);
    s.addShape(pres.shapes.RECTANGLE, {
      x: 9.4 - col*1.65, y: 1.75 + row * 1.05, w: 1.5, h: 0.85,
      fill:{color:C.navy}, line:{color:C.cyanDim, width:0.8},
      shadow: mkShadow(),
    });
    s.addText(sp, { x: 9.4 - col*1.65, y: 1.75 + row * 1.05, w:1.5, h:0.85, fontSize:10, color:C.white, align:'center', valign:'middle', fontFace:'Arial' });
  });

  s.addShape(pres.shapes.RECTANGLE, { x:4.5,y:3.95,w:5.0,h:0.06, fill:{color:C.navyMid}, line:{color:C.navyMid,width:0} });
  s.addText('⭐ المستوى 1   ·   🏆 0 XP   ·   ❤️ ❤️ ❤️', { x:4.5,y:3.95,w:5.0,h:0.5, fontSize:11, color:C.gray, align:'center', fontFace:'Arial' });

  // Feature bullets
  const feats = ['نجوم ونقاط XP مباشرة','نظام قلوب تحفيزي','رسوم متحركة سينمائية'];
  feats.forEach((f,i) => {
    s.addShape(pres.shapes.OVAL, { x:0.4, y:4.5+i*0.3-0.05, w:0.18,h:0.18, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });
    s.addText(f, { x:0.65,y:4.45+i*0.3, w:3.3,h:0.3, fontSize:12, color:C.gray, align:'right', fontFace:'Arial' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 5 — LEADERSHIP PERSONALITY
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.gold}, line:{color:C.gold,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });

  addTag(s, '02  الشخصية القيادية', 7.8, 0.15, C.gold);
  s.addText('👑 تحليل الشخصية القيادية بالذكاء الاصطناعي', { x:0.5,y:0.15,w:7.1,h:0.5, fontSize:20, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // Personality types grid
  const types = [
    { e:'👑', n:'استبدادي',    c:C.red    },
    { e:'🌟', n:'تحويلي',      c:C.cyan   },
    { e:'🤝', n:'ديموقراطي',   c:C.green  },
    { e:'🎯', n:'تفويضي',      c:C.gold   },
    { e:'🧬', n:'تحليلي CDNA', c:C.purple },
    { e:'💡', n:'إبداعي CDNA', c:C.cyanDim},
  ];
  types.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.3 + (2-col) * 3.05, y = 0.85 + row * 1.8;
    addGlowCard(s, x, y, 2.7, 1.55, t.c);
    s.addText(t.e, { x, y:y+0.05, w:2.7,h:0.75, fontSize:32, align:'center' });
    s.addText(t.n, { x, y:y+0.8, w:2.7,h:0.55, fontSize:14, color:C.white, bold:true, align:'center', fontFace:'Arial' });
  });

  // Features
  s.addText('خصائص النظام', { x:0.3,y:4.6,w:9.4,h:0.3, fontSize:13, color:C.gold, bold:true, align:'right', fontFace:'Arial' });
  const feats = [
    '300 سؤال تحليلي',
    'تقرير PDF مفصّل',
    'خارطة تطوير شخصية',
    'نقاط XP وشهادة',
    'تحليل نقاط القوة والضعف',
    'توافق مع JSYP2026',
  ];
  feats.forEach((f,i) => {
    const col = i % 3, row = Math.floor(i/3);
    s.addShape(pres.shapes.RECTANGLE, {
      x:0.3+(2-col)*3.1, y:4.95+row*0.0, w:2.8,h:0.38,
      fill:{color:C.navyMid}, line:{color:C.gold,width:0.5},
    });
    s.addText('✓  '+f, { x:0.3+(2-col)*3.1, y:4.95+row*0.0, w:2.8,h:0.38, fontSize:11, color:C.white, align:'center', valign:'middle', fontFace:'Arial', margin:0 });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 6 — CAREER DNA
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.purple}, line:{color:C.purple,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  addTag(s, '02  Career DNA', 8.2, 0.15, C.purple);
  s.addText('🧬 Career DNA — بصمة المسار المهني', { x:0.5,y:0.15,w:7.5,h:0.5, fontSize:22, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // Left info
  s.addText([
    { text:'اكتشف DNA مسارك المهني\n\n', options:{color:C.purple, bold:true, fontSize:15} },
    { text:'نظام تحليل ذكي يكشف النمط الجوهري\nلشخصيتك المهنية عبر 5 أبعاد:\n\n', options:{} },
    { text:'🔍  التحليلي  |  💡  الإبداعي\n', options:{color:C.cyan} },
    { text:'🤝  الاجتماعي  |  ⚙️  التشغيلي\n', options:{color:C.gold} },
    { text:'🎯  الاستراتيجي\n\n', options:{color:C.green} },
    { text:'كل نمط يفتح:\n', options:{color:C.gray} },
    { text:'• 4 ملفات محتوى متخصصة\n• كتاب قيادي مدفوع\n• خارطة تطوير 90 يوماً', options:{color:C.white} },
  ], { x:0.4,y:0.8,w:4.0,h:4.5, fontSize:13, color:C.white, fontFace:'Arial', align:'right', valign:'top', rtlMode:true });

  // DNA visual mockup
  addGlowCard(s, 4.7, 0.75, 5.0, 4.4, C.purple);
  s.addText('🧬', { x:4.7,y:0.9,w:5,h:0.8, fontSize:48, align:'center' });

  const dnaItems = [
    { t:'التحليلي',    p:85, c:C.cyan   },
    { t:'الإبداعي',   p:72, c:C.gold   },
    { t:'الاجتماعي',  p:64, c:C.green  },
    { t:'التشغيلي',   p:55, c:C.purple },
    { t:'الاستراتيجي',p:90, c:C.red    },
  ];
  dnaItems.forEach((d,i) => {
    const y = 1.85 + i * 0.58;
    s.addText(d.t, { x:4.8,y,w:1.5,h:0.35, fontSize:11, color:C.white, align:'right', fontFace:'Arial', valign:'middle' });
    // bar bg
    s.addShape(pres.shapes.RECTANGLE, { x:6.5,y:y+0.07,w:2.8,h:0.22, fill:{color:C.navy}, line:{color:C.grayDark,width:0.5} });
    // bar fill
    s.addShape(pres.shapes.RECTANGLE, { x:6.5,y:y+0.07,w:2.8*(d.p/100),h:0.22, fill:{color:d.c}, line:{color:d.c,width:0} });
    s.addText(d.p+'%', { x:9.35,y,w:0.35,h:0.35, fontSize:10, color:d.c, align:'left', fontFace:'Arial', valign:'middle' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 7 — CHALLENGES & BEST ACTION
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.green}, line:{color:C.green,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  addTag(s, '03  التحديات', 8.2, 0.15, C.green);
  s.addText('⚡ التحديات الإدارية + أفضل تصرف', { x:0.5,y:0.15,w:7.5,h:0.5, fontSize:22, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // Two panels
  addGlowCard(s, 0.3, 0.8, 4.5, 4.4, C.green);
  s.addText('🧠 التحديات', { x:0.5,y:0.95,w:4.1,h:0.45, fontSize:16, color:C.green, bold:true, align:'right', fontFace:'Arial' });
  const ch = [
    'تحديات من بيئة الأعمال الحقيقية',
    'سيناريوهات بالذكاء الاصطناعي',
    '5 خيارات لكل تحدٍّ',
    'تحليل فوري للقرار',
    'XP وتغذية راجعة ذكية',
    'مستويات: مبتدئ → خبير',
  ];
  ch.forEach((c,i) => {
    s.addShape(pres.shapes.OVAL, { x:0.5,y:1.55+i*0.5-0.07,w:0.2,h:0.2, fill:{color:C.green}, line:{color:C.green,width:0} });
    s.addText(c, { x:0.8,y:1.5+i*0.5, w:3.7,h:0.4, fontSize:13, color:C.white, align:'right', fontFace:'Arial' });
  });

  addGlowCard(s, 5.2, 0.8, 4.5, 4.4, C.gold);
  s.addText('💡 أفضل تصرف', { x:5.4,y:0.95,w:4.1,h:0.45, fontSize:16, color:C.gold, bold:true, align:'right', fontFace:'Arial' });
  const ba = [
    'موقف إداري واقعي',
    'قياس حكمة القرار',
    'مقارنة مع CEO المثالي',
    'شرح مفصّل للاختيار الأمثل',
    'نظام تقييم متعدد الأبعاد',
    'تقرير قرارات نهائي',
  ];
  ba.forEach((b,i) => {
    s.addShape(pres.shapes.OVAL, { x:5.4,y:1.55+i*0.5-0.07,w:0.2,h:0.2, fill:{color:C.gold}, line:{color:C.gold,width:0} });
    s.addText(b, { x:5.7,y:1.5+i*0.5, w:3.7,h:0.4, fontSize:13, color:C.white, align:'right', fontFace:'Arial' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 8 — CEO AI
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.purple}, line:{color:C.purple,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });

  addTag(s, '04  CEO AI', 8.4, 0.15, C.purple);
  s.addText('🤖 CEO AI — المستشار الذكي', { x:0.5,y:0.15,w:7.7,h:0.5, fontSize:24, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // Avatar circle
  s.addShape(pres.shapes.OVAL, { x:0.5,y:1.0,w:2.2,h:2.2, fill:{color:C.navyMid}, line:{color:C.purple, width:2} });
  s.addText('🤖', { x:0.5,y:1.3,w:2.2,h:1.4, fontSize:56, align:'center' });
  s.addText('CEO AI', { x:0.4,y:3.25,w:2.4,h:0.35, fontSize:13, color:C.purple, bold:true, align:'center', fontFace:'Arial' });

  // Chat bubbles mockup
  const bubbles = [
    { t:'كيف أتعامل مع موظف غير منتج؟', side:'user' },
    { t:'الحل الأمثل يبدأ بمحادثة خاصة لفهم السبب الجذري، ثم خطة تطوير مشتركة...', side:'ai' },
    { t:'ما استراتيجية التوسع السوقي المناسبة؟', side:'user' },
  ];
  let by = 0.85;
  bubbles.forEach(b => {
    if (b.side === 'user') {
      addGlowCard(s, 3.0, by, 6.5, 0.65, C.cyanDim);
      s.addText('👤  '+b.t, { x:3.0,y:by,w:6.5,h:0.65, fontSize:12, color:C.cyan, align:'right', valign:'middle', fontFace:'Arial', margin:8 });
    } else {
      addGlowCard(s, 3.0, by, 6.5, 0.85, C.purple);
      s.addText('🤖  '+b.t, { x:3.0,y:by,w:6.5,h:0.85, fontSize:11, color:C.white, align:'right', valign:'middle', fontFace:'Arial', margin:8 });
    }
    by += (b.side==='user' ? 0.75 : 0.95);
  });

  // Tech specs
  const specs = ['Claude Sonnet AI','بث مباشر SSE','20 صوت عربي/أجنبي','Python FastAPI Backend','تركيب صوتي ذكي'];
  specs.forEach((sp,i) => {
    addGlowCard(s, 3.0+i%3*2.3, 3.5+Math.floor(i/3)*0.55, 2.1, 0.45, C.purple);
    s.addText(sp, { x:3.0+i%3*2.3, y:3.5+Math.floor(i/3)*0.55, w:2.1,h:0.45, fontSize:11, color:C.white, align:'center', valign:'middle', fontFace:'Arial', margin:0 });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 9 — DOCTOR AI LECTURES
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  addTag(s, '05  دكتور AI', 8.2, 0.15, C.cyan);
  s.addText('🎓 دكتور AI — نظام المحاضرات التفاعلية', { x:0.5,y:0.15,w:7.5,h:0.5, fontSize:20, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // 10 lecture cards (2 rows × 5)
  const lectures = [
    { n:'01', t:'السلوك التنظيمي', c:C.cyan },
    { n:'02', t:'النظريات الإدارية', c:C.purple },
    { n:'03', t:'الإدراك', c:C.green },
    { n:'04', t:'الاتجاهات', c:C.gold },
    { n:'05', t:'القيم', c:C.red },
    { n:'06', t:'الشخصية', c:C.cyanDim },
    { n:'07', t:'التعلم', c:C.green },
    { n:'08', t:'ضغوط العمل', c:C.red },
    { n:'09', t:'الإحباط', c:C.purple },
    { n:'10', t:'السلوك الجماعي', c:C.cyan },
  ];
  lectures.forEach((l,i) => {
    const col = i % 5, row = Math.floor(i/5);
    const x = 9.5 - col*1.88, y = 0.85 + row * 1.6;
    addGlowCard(s, x, y, 1.7, 1.4, l.c);
    s.addText(l.n, { x,y:y+0.05,w:1.7,h:0.55, fontSize:22, color:l.c, bold:true, align:'center', fontFace:'Arial Black' });
    s.addText(l.t, { x,y:y+0.6,w:1.7,h:0.65, fontSize:11, color:C.white, align:'center', fontFace:'Arial', valign:'middle' });
  });

  // Features row
  const feats = [
    { i:'👥', t:'قائمة الطلاب\nالحضور التفاعلي' },
    { i:'🎲', t:'اختيار عشوائي\nللمشاركة' },
    { i:'❓', t:'15 سؤال\nلكل محاضرة' },
    { i:'📝', t:'واجبات\nbعد كل حصة' },
  ];
  feats.forEach((f,i) => {
    const x = 0.3 + i*2.4;
    addGlowCard(s, x, 4.05, 2.1, 1.35, C.cyan);
    s.addText(f.i, { x, y:4.1,w:2.1,h:0.55, fontSize:28, align:'center' });
    s.addText(f.t, { x, y:4.65,w:2.1,h:0.7, fontSize:11, color:C.white, align:'center', fontFace:'Arial', valign:'middle' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 10 — STORE & PAYMENT
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.gold}, line:{color:C.gold,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });

  addTag(s, '06  المتجر والدفع', 7.8, 0.15, C.gold);
  s.addText('🛒 المتجر الرقمي — نظام الدفع الموحّد', { x:0.5,y:0.15,w:7.1,h:0.5, fontSize:22, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // IBAN card
  s.addShape(pres.shapes.RECTANGLE, {
    x:0.3,y:0.8,w:9.4,h:0.9,
    fill:{color:C.navyMid}, line:{color:C.gold,width:1.5}, shadow:mkShadow(),
  });
  s.addText('🇯🇴  IBAN الدفع الموحّد', { x:0.5,y:0.85,w:4,h:0.4, fontSize:14, color:C.gold, bold:true, align:'right', fontFace:'Arial' });
  s.addText('JO88 JIBA 0710 0024 2947 3412 4000 02', { x:4.2,y:0.9,w:5.3,h:0.7, fontSize:18, color:C.cyan, bold:true, align:'center', fontFace:'Consolas' });

  // Payment methods
  const methods = [
    { e:'🇯🇴', t:'CliQ', sub:'تحويل فوري', c:C.cyan },
    { e:'💳', t:'Visa/MC', sub:'مع IBAN', c:C.gold },
    { e:'🅿️', t:'PayPal', sub:'دولي', c:C.cyanDim },
    { e:'🍎', t:'Apple Pay', sub:'لحظي', c:C.white },
  ];
  methods.forEach((m,i) => {
    const x = 0.3 + i*2.35;
    addGlowCard(s, x, 1.85, 2.1, 1.4, m.c);
    s.addText(m.e, { x,y:1.9,w:2.1,h:0.65, fontSize:30, align:'center' });
    s.addText(m.t, { x,y:2.55,w:2.1,h:0.35, fontSize:14, color:m.c, bold:true, align:'center', fontFace:'Arial' });
    s.addText(m.sub, { x,y:2.9,w:2.1,h:0.3, fontSize:11, color:C.gray, align:'center', fontFace:'Arial' });
  });

  // Products
  s.addText('44 منتجاً رقمياً — ملفات · كتب · شهادات', { x:0.3,y:3.4,w:9.4,h:0.4, fontSize:14, color:C.white, bold:true, align:'right', fontFace:'Arial' });

  const prods = [
    { t:'ملفات السلوك التنظيمي', p:'3 د.أ', c:C.cyan },
    { t:'كتاب القيادة التحويلية',  p:'8 د.أ', c:C.gold },
    { t:'شهادة Career DNA',       p:'15 د.أ',c:C.purple },
    { t:'حزمة CDNA الكاملة',      p:'25 د.أ',c:C.green },
  ];
  prods.forEach((p,i) => {
    const x = 0.3+i*2.35;
    addGlowCard(s, x, 3.85, 2.1, 1.45, p.c);
    s.addText(p.t, { x,y:3.9,w:2.1,h:0.75, fontSize:12, color:C.white, align:'center', valign:'middle', fontFace:'Arial' });
    s.addText(p.p, { x,y:4.65,w:2.1,h:0.5, fontSize:18, color:p.c, bold:true, align:'center', fontFace:'Arial Black' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 11 — ACHIEVEMENTS & DASHBOARD
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.green}, line:{color:C.green,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  addTag(s, '07  الإنجازات', 8.2, 0.15, C.green);
  s.addText('🏆 الإنجازات · الشهادات · Dashboard', { x:0.5,y:0.15,w:7.5,h:0.5, fontSize:22, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // Achievements
  addGlowCard(s, 0.3, 0.8, 4.5, 2.5, C.gold);
  s.addText('🏅 نظام الإنجازات', { x:0.5,y:0.9,w:4.1,h:0.4, fontSize:14, color:C.gold, bold:true, align:'right', fontFace:'Arial' });
  const badges = ['🥇 قائد التغيير','🎯 صانع القرار','🌟 نجم الفريق','💎 مدير التميّز','🚀 رائد الابتكار','🏆 بطل القيادة'];
  badges.forEach((b,i) => {
    const col=i%3, row=Math.floor(i/3);
    addGlowCard(s, 0.5+col*1.45, 1.45+row*0.75, 1.25, 0.62, C.goldDim);
    s.addText(b, { x:0.5+col*1.45,y:1.45+row*0.75,w:1.25,h:0.62, fontSize:11, color:C.white, align:'center', valign:'middle', fontFace:'Arial' });
  });

  // Dashboard
  addGlowCard(s, 5.2, 0.8, 4.5, 2.5, C.green);
  s.addText('📊 KPI Dashboard', { x:5.4,y:0.9,w:4.1,h:0.4, fontSize:14, color:C.green, bold:true, align:'right', fontFace:'Arial' });
  const kpis = [
    { l:'الرضا الوظيفي', v:92, c:C.cyan },
    { l:'الإنتاجية', v:87, c:C.green },
    { l:'الريادة', v:78, c:C.gold },
  ];
  kpis.forEach((k,i) => {
    const y=1.42+i*0.62;
    s.addText(k.l, { x:5.4,y,w:2.0,h:0.35, fontSize:12, color:C.white, align:'right', fontFace:'Arial' });
    s.addShape(pres.shapes.RECTANGLE, { x:7.5,y:y+0.07,w:2.0,h:0.22, fill:{color:C.navy}, line:{color:C.grayDark,width:0.5} });
    s.addShape(pres.shapes.RECTANGLE, { x:7.5,y:y+0.07,w:2.0*(k.v/100),h:0.22, fill:{color:k.c}, line:{color:k.c,width:0} });
    s.addText(k.v+'%', { x:9.55,y,w:0.35,h:0.35, fontSize:11, color:k.c, align:'left', fontFace:'Arial' });
  });

  // Certificates + XP
  addGlowCard(s, 0.3, 3.5, 4.5, 1.75, C.cyan);
  s.addText('📜 الشهادات الرقمية', { x:0.5,y:3.62,w:4.1,h:0.38, fontSize:14, color:C.cyan, bold:true, align:'right', fontFace:'Arial' });
  ['شهادة القيادة التحويلية','شهادة Career DNA','شهادة التميز الإداري'].forEach((c,i) => {
    s.addText('✦ '+c, { x:0.5,y:4.1+i*0.35,w:4.1,h:0.32, fontSize:12, color:C.white, align:'right', fontFace:'Arial' });
  });

  addGlowCard(s, 5.2, 3.5, 4.5, 1.75, C.purple);
  s.addText('⭐ نظام XP والمستويات', { x:5.4,y:3.62,w:4.1,h:0.38, fontSize:14, color:C.purple, bold:true, align:'right', fontFace:'Arial' });
  [['مبتدئ','0-500 XP'],['متقدم','500-2000 XP'],['خبير','2000+ XP']].forEach((lv,i) => {
    s.addText(lv[0]+': '+lv[1], { x:5.4,y:4.1+i*0.35,w:4.1,h:0.32, fontSize:12, color:C.white, align:'right', fontFace:'Arial' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 12 — MULTI-PLATFORM (PWA + EXE + APK + ZIP)
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  addTag(s, '08  التوزيع', 8.4, 0.15, C.cyan);
  s.addText('🌐 متاح على جميع المنصات', { x:0.5,y:0.15,w:7.7,h:0.5, fontSize:24, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  const platforms = [
    { e:'🌐', t:'PWA',           sub:'Progressive Web App\nيعمل أوفلاين بعد التثبيت',       c:C.cyan,   feat:'Chrome / Edge / Safari' },
    { e:'🖥️', t:'Windows EXE',   sub:'تطبيق سطح مكتب 22 KB\nواجهة مستقلة مع أيقونة AUS', c:C.cyanDim,feat:'Python + .NET WinForms' },
    { e:'📱', t:'Android APK',   sub:'Capacitor Native App\nيعمل كتطبيق هاتف حقيقي',       c:C.green,  feat:'Capacitor 6.0' },
    { e:'📦', t:'ZIP أوفلاين',   sub:'317 KB حزمة مضغوطة\nSTART.bat للتشغيل الفوري',      c:C.gold,   feat:'Python HTTP Server' },
  ];

  platforms.forEach((p,i) => {
    const x = 0.3 + i * 2.37;
    addGlowCard(s, x, 0.85, 2.1, 4.35, p.c);
    s.addText(p.e, { x,y:0.95,w:2.1,h:0.8, fontSize:42, align:'center' });
    s.addText(p.t, { x,y:1.8,w:2.1,h:0.45, fontSize:15, color:p.c, bold:true, align:'center', fontFace:'Arial Black' });
    s.addShape(pres.shapes.RECTANGLE, { x:x+0.3,y:2.28,w:1.5,h:0.03, fill:{color:p.c}, line:{color:p.c,width:0} });
    s.addText(p.sub, { x,y:2.35,w:2.1,h:0.9, fontSize:11, color:C.white, align:'center', fontFace:'Arial', valign:'top' });
    s.addShape(pres.shapes.RECTANGLE, { x,y:3.5,w:2.1,h:0.03, fill:{color:p.c,transparency:60}, line:{color:p.c,width:0} });
    s.addText(p.feat, { x,y:3.55,w:2.1,h:0.5, fontSize:10, color:p.c, align:'center', fontFace:'Arial' });

    // Check marks
    s.addShape(pres.shapes.OVAL, { x:x+0.85,y:4.1,w:0.4,h:0.4, fill:{color:p.c}, line:{color:p.c,width:0} });
    s.addText('✓', { x:x+0.85,y:4.1,w:0.4,h:0.4, fontSize:14, color:C.bg, bold:true, align:'center', valign:'middle', margin:0 });
    s.addText('جاهز', { x:x+0.55,y:4.55,w:1.0,h:0.3, fontSize:11, color:p.c, align:'center', fontFace:'Arial' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 13 — DESIGN & TECH STACK
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.purple}, line:{color:C.purple,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  s.addText('⚙️ التصميم والتقنية', { x:0.5,y:0.15,w:9,h:0.5, fontSize:26, color:C.white, bold:true, fontFace:'Arial Black', align:'right' });

  // Design Features
  addGlowCard(s, 0.3, 0.8, 4.5, 2.3, C.cyan);
  s.addText('🎨 تصميم سينمائي', { x:0.5,y:0.9,w:4.1,h:0.38, fontSize:14, color:C.cyan, bold:true, align:'right', fontFace:'Arial' });
  const design = ['Glassmorphism بالكامل','رسوم نجوم كونية متحركة','ثيم ذهبي أزرق داكن','RTL عربي كامل','تصميم متجاوب 100%','Dark Mode أصيل'];
  design.forEach((d,i) => {
    s.addText('◆ '+d, { x:0.5,y:1.38+i*0.28,w:4.1,h:0.28, fontSize:12, color:C.white, align:'right', fontFace:'Arial' });
  });

  // Frontend
  addGlowCard(s, 5.2, 0.8, 4.5, 2.3, C.gold);
  s.addText('🖥️ Frontend Stack', { x:5.4,y:0.9,w:4.1,h:0.38, fontSize:14, color:C.gold, bold:true, align:'right', fontFace:'Arial' });
  ['HTML5 + CSS3 + JavaScript','Tailwind CSS (planned React)','Font Awesome 6.5','Google Fonts (Tajawal/Orbitron)','Service Worker PWA','PptxGenJS للتقارير'].forEach((t,i) => {
    s.addText('◆ '+t, { x:5.4,y:1.38+i*0.28,w:4.1,h:0.28, fontSize:12, color:C.white, align:'right', fontFace:'Arial' });
  });

  // Backend
  addGlowCard(s, 0.3, 3.25, 4.5, 2.1, C.purple);
  s.addText('🔧 Backend (CEO AI)', { x:0.5,y:3.35,w:4.1,h:0.38, fontSize:14, color:C.purple, bold:true, align:'right', fontFace:'Arial' });
  ['Python FastAPI','Claude claude-sonnet-4-5','ElevenLabs / Edge TTS','SSE Streaming','Port 8002'].forEach((t,i) => {
    s.addText('◆ '+t, { x:0.5,y:3.83+i*0.3,w:4.1,h:0.28, fontSize:12, color:C.white, align:'right', fontFace:'Arial' });
  });

  // Security & Deployment
  addGlowCard(s, 5.2, 3.25, 4.5, 2.1, C.green);
  s.addText('🔒 الأمان والنشر', { x:5.4,y:3.35,w:4.1,h:0.38, fontSize:14, color:C.green, bold:true, align:'right', fontFace:'Arial' });
  ['Netlify (HTTPS + CDN)','netlify.toml مع headers','IBAN محمي في الكود','Service Worker Cache','Rate Limiting (FastAPI)'].forEach((t,i) => {
    s.addText('◆ '+t, { x:5.4,y:3.83+i*0.3,w:4.1,h:0.28, fontSize:12, color:C.white, align:'right', fontFace:'Arial' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 14 — CLOSING
// ═══════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBg(s);

  // Glow top bottom
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.06, fill:{color:C.cyan}, line:{color:C.cyan,width:0} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.57,w:10,h:0.055, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  // Orbital rings
  for (let i = 0; i < 3; i++) {
    const r = 1.0 + i * 0.65;
    s.addShape(pres.shapes.OVAL, {
      x:5-r, y:2.8125-r, w:r*2, h:r*2,
      fill:{color:C.cyan,transparency:99},
      line:{color:C.cyan,width:0.5,transparency:70-i*20},
    });
  }

  // AUS Letters
  s.addText([
    {text:'A',options:{color:C.cyan,bold:true}},
    {text:'U',options:{color:C.white,bold:true}},
    {text:'S',options:{color:C.gold,bold:true}},
  ], { x:3.5,y:0.7,w:3,h:1.4, fontSize:96, align:'center', fontFace:'Arial Black' });

  s.addText('شكراً لاهتمامكم', { x:1,y:2.2,w:8,h:0.55, fontSize:28, color:C.white, align:'center', bold:true, fontFace:'Arial' });
  s.addText('Thank you for your attention', { x:1,y:2.78,w:8,h:0.4, fontSize:16, color:C.gray, align:'center', fontFace:'Arial', italic:true });

  s.addShape(pres.shapes.RECTANGLE, { x:3.2,y:3.25,w:3.6,h:0.03, fill:{color:C.gold}, line:{color:C.gold,width:0} });

  s.addText('منصة القيادة الذكية بالذكاء الاصطناعي', { x:1,y:3.35,w:8,h:0.45, fontSize:15, color:C.cyan, align:'center', fontFace:'Arial' });

  // Contact / links row
  const links = ['🌐 ausplatform.netlify.app','📧 aus@platform.com','📱 PWA + EXE + APK'];
  links.forEach((l,i) => {
    addGlowCard(s, 0.7+i*2.9, 4.05, 2.5, 0.55, C.cyan);
    s.addText(l, { x:0.7+i*2.9,y:4.05,w:2.5,h:0.55, fontSize:12, color:C.white, align:'center', valign:'middle', fontFace:'Arial', margin:0 });
  });

  s.addText('© 2026 AUS Platform  ·  All Rights Reserved', {
    x:0,y:5.2,w:10,h:0.35, fontSize:11, color:C.gray, align:'center', fontFace:'Arial',
  });
}

// ── Write file ────────────────────────────────────────────────────
pres.writeFile({ fileName: 'C:/Users/USER/OneDrive/Desktop/claude/AUS-Platform-Presentation.pptx' })
  .then(() => console.log('✅ PPTX saved: AUS-Platform-Presentation.pptx'))
  .catch(err => console.error('❌', err));
