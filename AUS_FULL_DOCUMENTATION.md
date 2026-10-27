# AUS — AI University Simulator
## توثيق كامل لكل التعديلات — من A إلى Z

---

## 🗂️ هيكل المشروع

```
claude/
├── _aus_backend/
│   ├── main.py              ← FastAPI backend (Claude AI + Voice)
│   ├── voice.py             ← نظام TTS (ElevenLabs / Edge TTS / gTTS)
│   ├── security.py          ← Rate limiting + abuse protection
│   └── .env                 ← ANTHROPIC_API_KEY + ELEVENLABS_API_KEY
│
├── _preview_simulator/
│   ├── index.html           ← الواجهة الرئيسية للمشروع
│   ├── ai_university_simulator.js  ← منطق المحادثة + AUSAgent
│   └── ...
│
└── aus_theme_for_stitch.html  ← ملف الثيم الكامل (2,879 سطر) ← تم بناؤه هنا
```

---

## 🖥️ الـ Backend — `_aus_backend/main.py`

### المعلومات الأساسية
| العنصر | القيمة |
|--------|--------|
| Framework | FastAPI (Python) |
| Model | `claude-sonnet-4-20250514` |
| Port | `8002` |
| تشغيل | `py -m uvicorn main:app --port 8002 --reload` |

### الـ Endpoints
```
POST /api/chat/stream     → SSE streaming (الـ chat الرئيسي)
POST /api/chat            → Non-streaming fallback
GET  /health              → Health check
GET  /api/security/status → Security stats (localhost only)
GET  /api/voice/list      → قائمة الأصوات
POST /api/voice/synthesize → تحويل النص لصوت MP3
POST /api/agent/invoke    → Agent tools (summarize, explain, analyze...)
```

### ✅ ما تم تعديله في `main.py`
**تم إعادة كتابة الـ System Prompt بالكامل** لجعل الـ AI أكثر إنسانية:

#### قبل التعديل ❌
```
كان prompt عادي — لا يتذكر الأسماء، يرد بـ "سؤال رائع!" و "بالتأكيد!" في كل رد
```

#### بعد التعديل ✅
```python
SYSTEM_PROMPT = """
أنت CEO AI — مستشار أعمال حقيقي وذكي

قواعد الطبيعية البشرية:
1. الأسماء — إذا قال "اسمي عمر" → استخدمه: "تمام يا عمر..."
2. السياق — ابنِ على ما قيل، لا تبدأ من صفر
3. الطبيعية — لا "سؤال رائع!" لا "بالتأكيد!" — تكلم مباشرة

ممنوع تماماً:
✗ تجاهل الاسم بعد ذكره
✗ "سؤال رائع!" / "بالتأكيد!" في بداية كل رد
✗ نسيان السياق
✗ ردود رسمية متصنعة
"""
```

### كيف يصل تاريخ المحادثة للـ AI
في `ai_university_simulator.js`:
```javascript
// يُرسل آخر 20 رسالة مع كل طلب
const hist = chatHistory.slice(-20).map(m => ({role:m.role, content:m.content}));
// → POST /api/chat/stream
// → Claude يرى كل المحادثة السابقة → يتذكر الاسم والسياق
```

---

## 🎨 ملف الثيم — `aus_theme_for_stitch.html`

**الهدف:** ملف HTML واحد يحتوي على كامل الهوية البصرية للمشروع
**الحجم:** 2,879 سطر
**يُرسل لـ:** Stitch AI لتفهم تصميم المشروع

---

## 🌟 طبقات الخلفية (من الأعمق للأمامية)

### الطبقة 0 — `#space-scene-cv` (أعمق طبقة — SPACE SCENE)
**أُضيف في هذه الجلسة — أهم إضافة بصرية**

#### الكوكب العملاق (Gas Giant)
```
- كوكب بحجم 148px radius في الزاوية العلوية اليمنى
- حلقات Saturn: نصف خلفي + نصف أمامي بشفافية حقيقية
- 9 أحزمة سحابية تتحرك ببطء
- عاصفة Great Red Spot تدور
- أضواء مدن على الجانب المظلم تتلألأ
- ظل terminator (خط النهار/الليل)
- هالة غلاف جوي برتقالي-أزرق
- تأثير إضاءة PBR من الأعلى-يسار
```

#### الثقب الأسود (Black Hole)
```
- موضع: أسفل-يسار (13%, 66%)
- أفق الحدث: أسود تام
- قرص تراكم: 4 حلقات (أبيض حار → برتقال → أحمر)
- حلقة الفوتونات الذهبية
- نفثات نسبية زرقاء من القطبين
- هالة عدسة جاذبية
```

#### السديم الطيفي الحقيقي
```
- Hα (أحمر/وردي) — انبعاث الهيدروجين
- OIII (أزرق/فيروزي) — انبعاث الأكسجين
- SII (برتقالي داكن) — جبهات الصدمة
- خيوط bezier منحنية (ليست blobs)
- طبقتان: wide emission zones + fine filaments
```

#### ميزات إضافية في Space Scene
```
- أمطار شهب: تظهر تلقائياً كل 2-3 ثوانٍ مع ذيل + وميض
- بارالاكس ثلاثي الأبعاد مع الماوس (3 طبقات بسرعات مختلفة)
- 3 أقمار صغيرة مبعثرة
- 8,000 نجم خلفي + 300 مجرة إهليلجية صغيرة
- شريط درب التبانة القطري
- دخول بسرعة الضوء عند التحميل (hyperspace warp flash)
```

### الطبقة 1 — `#galaxy-canvas`
```
- حلقة مجرة حلزونية: 3 أذرع × 150 نجم
- bloom على النجوم الساطعة
- تنفيذ مرة واحدة عند التحميل (static)
- opacity: 0.28 (خُففت لأن space-scene توفر الخلفية)
```

### الطبقة 2 — `#starfield`
```
- 220 نجم بتألق متغير
- النجوم الكبيرة: radial gradient + cross flare
- النجوم الصغيرة: تُرسم كل 3 frames فقط (أداء)
- تحريك سلس بـ requestAnimationFrame
```

### الطبقة 3 — `#holo-particles`
```
- 45 جسيم هولوغرافي عائم (كانت 120 — خُففت للأداء)
- شكلين: دائرة + ماسة
- خطوط وصل بين الجسيمات القريبة (< 80px)
- عمق Z (z: 0.5-3.5) يعطي إحساس ثلاثي الأبعاد
```

---

## ✨ التأثيرات البصرية الكاملة

### تأثيرات الجو
```css
/* God Rays — أشعة ضوء حجمية */
5 أشعة بزوايا مختلفة، blur متفاوت، animation دورية

/* Nebula Blobs — سديم خلفي */
5 blobs بألوان مختلفة (أزرق، بنفسجي، فيروزي، برتقالي، ماجنتا)
mix-blend-mode: screen

/* Volumetric Fog — ضباب عميق */
3 طبقات fog في الجزء السفلي
animation: fogDrift ease-in-out infinite
```

### تأثيرات Octane Render Pass (أُضيف لاحقاً)
```css
/* Film Grain — حبيبات سينمائية */
CSS SVG feTurbulence + background-shift animation
(كانت createImageData JavaScript — استُبدلت للأداء)

/* Bokeh Depth of Field — عمق المجال */
12 دائرة airy-disk (حلقة ساطعة + مركز معتم)
mix-blend-mode: screen, تعمل بـ 30fps

/* Caustic Light Scatter — تشتت الضوء */
8 blobs متحركة تحاكي انكسار الضوء عبر الزجاج
تعمل بـ 20fps

/* Anamorphic Lens Flare — خط أفقي سينمائي */
يظهر عند تحريك الماوس بسرعة
Cyan → White → Purple gradient

/* Lens Flare Rings — حلقات ضوئية */
4 حلقات متمددة تتبع مؤشر الماوس بـ lerp

/* Chromatic Aberration — تشويه كروماتي */
يحدث مرة واحدة عند التحميل
hue-rotate + saturate + blur

/* 3-Point PBR Lighting — إضاءة واقعية */
ضوء بارد (أزرق) من الأعلى-يسار
ضوء دافئ (برتقالي) من الأسفل-يمين

/* Ground Perspective Rings — حلقات العمق */
3 حلقات إهليلجية في الأسفل تُعطي إحساس المنظور

/* Dust Motes — ذرات غبار */
24 ذرة صغيرة عائمة في منطقة أشعة الإله
```

---

## 🃏 مكونات واجهة المستخدم

### KPI Tiles
```css
.kpi {
  glassmorphism: backdrop-filter blur(28px)
  border: 1px solid rgba(0,212,255,0.15)
  shimmer sweep: ::after pseudo-element على hover
  holo-scan: خط ماسح أزرق على hover
  animation: entrance staggered (تظهر تباعاً)
}
```

### Grid Cards (.gc)
```css
.gc {
  PBR glass: multi-layer backdrop-filter
  specular highlight: top-left white gradient
  iridescent border: animated rainbow border on hover
  depth shadow: multi-layer box-shadow
}
```

### Chat Shell
```css
.chat-shell {
  AI Orb: conic-gradient rotating, hue-rotate animation
  AI messages: dark glass RTL bubble
  User messages: blue-purple gradient LTR bubble
  Typing indicator: 3 bouncing dots
  Smart chips: pill buttons with hover bloom
  Live badge: pulsing teal dot
}
```

### Apple Vision Pro Panel (.avp-panel)
```css
- double backdrop-filter (blur 40px + saturate 200%)
- inset top reflection strip
- spatial depth shadow
- hover: translateY(-6px) scale(1.005)
```

### Tesla HUD
```css
- Orbitron font, data rows
- gradient text: white → cyan
- precision spacing
```

### Orbiting Neon Satellites
```css
- 4 حلقات دائرية بأحجام مختلفة
- كل حلقة بها نقطة ملونة تدور
- اتجاهات متعاكسة (بعضها clockwise, بعضها عكسي)
- ألوان: cyan, purple, teal, gold
```

---

## ⚡ إصلاحات الأداء

### المشكلة الأصلية
6 حلقات `requestAnimationFrame` تعمل بالتوازي + إنشاء عناصر DOM بكثافة

### الإصلاحات المنفذة

| المشكلة | قبل | بعد | تحسن |
|---------|-----|-----|------|
| Film Grain | `createImageData` كل frame (15ms!) | CSS SVG feTurbulence (GPU) | ~∞ |
| Cursor Trail | 3 DOM elements كل mousemove | 1 element كل 40ms | 7× أسرع |
| Particles | 120 جسيم + 7140 مقارنة O(n²) | 45 جسيم + 990 مقارنة | 7× أسرع |
| Starfield | 320 نجم كل frame | 220 نجم، الصغيرة كل 3 frames | 40% أخف |
| Bokeh | 28 دائرة كل frame | 12 دائرة كل frame ثانٍ | 4.7× أسرع |
| Caustic | 20 blob كل frame | 8 blobs كل 3 frames | 7.5× أسرع |
| Galaxy init | 960 نجم + 600 غبار | 450 نجم + 200 غبار | 2× أسرع |

---

## 🎨 متغيرات CSS (Design Tokens)

```css
:root {
  /* الألوان الأساسية */
  --cyan:         #00d4ff
  --cyan-deep:    #0066cc
  --cyan-bright:  #80eeff
  --purple:       #9d4edd
  --purple-deep:  #5b21b6
  --teal:         #00f5d4
  --gold:         #ffd60a
  --pink:         #ff006e
  --void:         #000000
  --abyss:        #000814
  --navy:         #001233

  /* Bloom متعدد الطبقات */
  --bloom-cyan:   5 طبقات glow (4px → 120px)
  --bloom-purple: 5 طبقات glow
  --bloom-gold:   4 طبقات glow

  /* Glass Materials */
  --glass-surface:   rgba(0,20,60,0.32)
  --glass-border:    rgba(0,212,255,0.18)
  --glass-highlight: rgba(0,212,255,0.06)
  --glass-specular:  rgba(255,255,255,0.08)

  /* Fonts */
  --font-hud:  'Orbitron'   (أرقام + HUD labels)
  --font-body: 'Tajawal'    (النصوص العربية)
}
```

---

## 🔧 الـ CSS Animations الكاملة

```css
/* خلفية */
@keyframes nebDrift       — حركة السديم الخلفية
@keyframes fogDrift       — تدفق الضباب الحجمي
@keyframes rayDrift       — أشعة الإله
@keyframes orbFloat       — عوامة الـ ambient orbs

/* واجهة */
@keyframes letterReveal   — ظهور الحروف تباعاً
@keyframes holyScan       — الخط الماسح الهولوغرافي
@keyframes nanoSpin       — دوران الأقمار الصناعية
@keyframes pipBlink       — وميض نقطة LIVE

/* AI Chat */
@keyframes orbSpin        — دوران AI orb
@keyframes typingBounce   — نقاط الكتابة المتحركة

/* Octane Pass */
@keyframes grainShift     — حركة الحبيبات (CSS)
@keyframes lfrPulse       — توسع حلقات lens flare
@keyframes gprExpand      — توسع حلقات المنظور
@keyframes dmoteFloat     — عوامة ذرات الغبار
@keyframes opalShift      — تحول ألوان الأوبال
@keyframes chromLoad      — الانحراف الكروماتي عند التحميل
@keyframes trailFade      — تلاشي أثر المؤشر

/* Space Scene */
@keyframes warpFlash      — وميض دخول سرعة الضوء
@keyframes warpLines      — خطوط الـ hyperspace
```

---

## 📐 قرارات التصميم

### لماذا glassmorphism؟
يعطي إحساس الأسطح العائمة في الفضاء — مناسب جداً لثيم الجامعة المستقبلية

### لماذا Orbitron + Tajawal؟
- Orbitron: مظهر HUD مستقبلي للأرقام والمصطلحات التقنية
- Tajawal: أوضح خط عربي يدعم RTL بشكل احترافي

### لماذا الألوان Cyan + Purple + Gold؟
- Cyan: يوحي بالتكنولوجيا والذكاء الاصطناعي
- Purple: يوحي بالعمق والابتكار
- Gold: يوحي بالتميز والجودة العالية

### لماذا RTL؟
المشروع موجه للمستخدمين العرب — `dir="rtl"` على `<html>`

---

## 🚀 كيفية تشغيل المشروع

```bash
# الـ Backend
cd _aus_backend
py -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload

# الـ Frontend (simulator)
cd _preview_simulator
# افتح index.html مباشرة أو استخدم Live Server على port 5180
```

### ملف `.env` المطلوب
```
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=... (اختياري - للأصوات الاحترافية)
```

---

## 📋 ملخص كل الملفات المعدلة

| الملف | ما تم |
|-------|-------|
| `_aus_backend/main.py` | إعادة كتابة System Prompt كاملاً — الـ AI أصبح إنساني |
| `aus_theme_for_stitch.html` | بُني من الصفر ثم طُوّر 4 مرات — 2,879 سطر |

### `aus_theme_for_stitch.html` — تسلسل التطوير
1. **النسخة الأولى** — استخراج CSS من `index.html` الحقيقي
2. **الترقية الأولى** — إعادة كتابة سينمائية كاملة (god rays, starfield, planet)
3. **الترقية الثانية** — إضافات فوق التصميم: galaxy, particles, fog, Tesla HUD, AVP panel
4. **إصلاح الأداء** — تقليل load بـ 70-80% مع الحفاظ على التأثيرات
5. **Octane Render Pass** — film grain GPU, bokeh DOF, anamorphic flare, caustics
6. **Deep Space Scene** — كوكب عملاق + ثقب أسود + سديم حقيقي + بارالاكس

---

> **للإرسال لـ Stitch AI:**
> هذا الملف `aus_theme_for_stitch.html` يمثل الهوية البصرية الكاملة للمشروع.
> يمكن فتحه مباشرة في أي متصفح لرؤية التصميم.
