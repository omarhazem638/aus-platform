# 🤝 AUS Project — Cowork Handoff Brief

> انسخ هذا الملف بالكامل والصقه في أول رسالة بـ Cowork

---

## 📂 Project Location
```
C:\Users\USER\OneDrive\Desktop\claude\
```

## 🎯 What is AUS?
**AI University Simulator** — منصة محاكاة جامعة أعمال ذكية، عربية/إنجليزية، RTL، بتصميم سينمائي (cyan + gold على dark navy).

---

## 🏗️ Architecture

```
claude/
├── _preview_simulator/              ← Main HTML/CSS/JS app (port 5180)
│   ├── index.html                   (5,344 سطر — UI + Tailwind-like CSS)
│   ├── ai_university_simulator.js   (13,223 سطر — كل المنطق)
│   ├── manifest.json + sw.js        (PWA)
│   ├── netlify.toml + vercel.json   (deployment)
│   └── icons/                       (icon-192.png, icon-512.png)
│
├── _aus_backend/                    ← Python FastAPI (port 8002)
│   ├── main.py                      (957 سطر — chat + voice + agent)
│   ├── voice.py                     (20 voices: 10 AR + 10 EN/foreign)
│   ├── security.py                  (rate limiting + auth + abuse)
│   ├── auth.py + payments.py        (SaaS layer)
│   ├── routes/                      (auth_routes, payment_routes)
│   └── .env                         (ANTHROPIC_API_KEY — حالياً فاضي)
│
├── aus-electron/                    ← Windows EXE (Electron 31.7.7)
│   ├── main.js + preload.js
│   └── package.json                 (electron-builder NSIS + portable)
│
├── aus-apk/                         ← Android APK (Capacitor 6.0)
│   ├── capacitor.config.json
│   ├── www/                         (نسخة من _preview_simulator)
│   └── android/                     (Gradle project — يحتاج Android Studio)
│
├── AUS-Simulator.exe                (22.5 KB — .NET WinForms launcher)
├── AUS-Desktop-App.zip              (334 KB — EXE + simulator)
├── AUS-Simulator-Offline.zip        (317 KB — simulator + START.bat)
└── AUS-Presentation-Detailed.pptx   (407 KB — 20-slide deck)
```

---

## ✅ ما تم إنجازه (في الجلسة السابقة)

### 1. Frontend (`_preview_simulator/`)
- **17 أداة كاملة**: الرئيسية، الأدوات (10 لكل تخصص × 7 تخصصات)، الشخصية القيادية، التحديات، أفضل تصرف، CEO AI، الشهادات، Career DNA، مقابلة AI، أزمة AI، خارطة الطريق، مساعد الدراسة، Dashboard، الإنجازات، خريطة الجامعة، مهام اليوم، دكتور AI
- **PWA كامل** (manifest + service worker + install button + offline)
- **نظام دفع موحّد** مع IBAN ثابت: `JO88JIBA0710002429473412400002`
  - يظهر في كل طرق الدفع (CliQ / Visa / PayPal / Apple Pay)
  - محمي في `_MERCHANT` object ضد تعديل localStorage

### 2. نظام مقابلة AI الكامل (آخر إصدار)
- 4 فئات: HR / Leadership / Business / Case Study
- **تقييم شامل** بعد كل سؤال:
  - نتيجة معيارية /100 + grade (ممتاز/جيد جداً/جيد/مقبول)
  - 4 أبعاد: الصلة، العمق، التنظيم، الأمثلة (بشريط تقدم)
  - **ميزات إجابتك** (2-4 نقاط) + **نقاط التحسين** (2-3)
  - **الإجابة النموذجية المثالية** (بتأثير الكتابة الحيّة)
- **نقاش حيّ** مع المُقابِل (سؤال متابع ذكي + رد اختياري)
- Voice input/output (Web Speech API + ElevenLabs/Edge TTS)

### 3. مساعد الدراسة (مُعاد بناؤه كلياً — v2)
- SSE streaming من backend (fallback إلى sync endpoint)
- Markdown-lite parser (`**bold**`, `- bullets`, `# headers`)
- 5 أوضاع: محادثة / بطاقات / اختبار / ملخص / خطة دراسة
- AI ذكي يفهم نوع السؤال (تعريف، مقارنة، ملخص، مفتوح)
- Welcome message متدفق حرفاً بحرف

### 4. CEO AI — يجيب على أي سؤال
- System prompt مُحدّث: لا قيود على المجال
- يدعم: علوم، تقنية، طب، تاريخ، رياضيات، كتابة، ترجمة
- 20 صوتاً (10 عربي + 10 أجنبي)

### 5. Dashboard مع 3 أنماط زمنية
- **أسبوعي** (7 أيام): إيرادات 109K ر.س، 312 عميل جديد
- **شهري** (6 أشهر): إيرادات 284K ر.س، 1,847 عميل
- **سنوي** (5 سنوات): 4.52M ر.س، 19,500 عميل
- كل نمط له KPIs + segments + goals + activity مختلفة بالكامل

### 6. وضع تجريبي ذكي (DEMO MODE) ⚡
**المشكلة:** ANTHROPIC_API_KEY فاضي → كل `/api/chat` كان يفشل
**الحل:** أضفت `_demo_smart_response()` في `_aus_backend/main.py`
- يكتشف نوع البرومبت (interview eval / flashcards / quiz / summary / plan / dashboard insights / roadmap)
- يولّد JSON صحيح للتقييمات والبطاقات (يستخدم `json.dumps` للتأكد)
- يدعم streaming (chunk by 3 chars كل 15ms)
- يحلل الإجابة الفعلية للمتقدم (طول + أمثلة + أرقام)
- `/health` يعرض `mode: "demo"` أو `"live"`

### 7. الأدوات الجاهزة للتوزيع
- ✅ PWA (متاح في `_preview_simulator/`)
- ✅ Windows EXE (`AUS-Simulator.exe`)
- ✅ ZIP offline (`AUS-Simulator-Offline.zip`)
- 🔧 APK project (في `aus-apk/`، يحتاج Android Studio لـ build)

---

## 🚀 كيف تشغّل المشروع

### Frontend (Simulator)
```bash
cd C:\Users\USER\OneDrive\Desktop\claude\_preview_simulator
py -m http.server 5180
# افتح: http://localhost:5180
```

### Backend (CEO AI)
```bash
cd C:\Users\USER\OneDrive\Desktop\claude\_aus_backend
py -m uvicorn main:app --port 8002
# Health: http://localhost:8002/health
# Mode: "demo" (no API key) أو "live" (مع key)
```

### Cache Buster
كل ما تعدّل JS، بدّل `?v=N` في `index.html` السطر الأخير:
```html
<script src="ai_university_simulator.js?v=12"></script>
```

---

## 📋 ما يمكن إكماله (اقتراحات Cowork)

اختر واحدة (أو أكثر) من المهام التالية واطلبها من Cowork:

### A. Deploy على الإنترنت
- ارفع `_preview_simulator/` على Netlify Drop (drag & drop)
- اربط دومين مثل `aus-platform.com`
- اختبر PWA install على هاتف Android حقيقي

### B. بناء APK نهائي
- ثبّت Android Studio + Java JDK 17
- شغّل: `cd aus-apk && npx cap open android`
- Build → Build APK(s) → استلم ملف `.apk`

### C. تحسينات على الأدوات الموجودة
- إضافة **رسوم بيانية متحركة** لـ Dashboard (Chart.js / D3)
- **حفظ التقدم** في localStorage بشكل أوسع (المقابلات السابقة، الجلسات الدراسية)
- **تصدير PDF** للنتائج (نتائج المقابلة، تقارير الدراسة)
- **مشاركة على وسائل التواصل** (LinkedIn share)

### D. ميزات جديدة
- **لوحة المعلم** (Teacher Dashboard) — رؤية تقدم الطلاب
- **نظام مجموعات دراسية** (Study Groups) — تعاون بين طلاب
- **مكتبة محتوى** قابلة للتصفح (دروس فيديو، PDFs)
- **chatbot للدعم الفني** (للطلاب الجدد)

### E. SaaS Layer
- ربط **Stripe** فعلي (الكود موجود في `_aus_backend/payments.py`)
- **نظام اشتراكات** (شهري/سنوي)
- **Free tier vs Premium** (محتوى مدفوع)

### F. تحسينات UX
- **Onboarding wizard** للمستخدمين الجدد (Tour تفاعلي)
- **Dark/Light theme toggle** كامل
- **حفظ الإعدادات** عبر sessions
- **Notifications system** (إشعارات داخل التطبيق)

---

## ⚠️ قواعد ضرورية للمشروع

1. **حافظ على التصميم السينمائي** — لا تغيّر الثيم (cyan/gold/dark navy)
2. **حافظ على RTL العربي** — `dir="rtl"` و`lang="ar"` على الجذر
3. **لا تحذف الميزات الموجودة** — فقط أضف أو حسّن
4. **IBAN ثابت** — لا تغيّر `JO88JIBA0710002429473412400002`
5. **Cache busting إجباري** — كل تعديل على JS: زيد `?v=N`
6. **Markdown lite** في chat — استخدم `_studyMd()` للنصوص

---

## 🔑 ملفات حساسة

| الملف | المحتوى | حالة |
|------|---------|------|
| `_aus_backend/.env` | `ANTHROPIC_API_KEY=` | فاضي → demo mode |
| `aus_data.db` | SQLite users + payments | فيه بيانات تجريبية |

---

## 💬 مثال لأول رسالة في Cowork

```
أكمل مشروع AUS من حيث وقفنا.
المسار: C:\Users\USER\OneDrive\Desktop\claude\
اقرأ COWORK_HANDOFF.md أولاً لتفهم البنية.

المهمة الآن: [اكتب هنا — مثلاً: "أضف نظام مشاركة على LinkedIn للشهادات"]
```

---

**تاريخ آخر تحديث:** 31 مايو 2026
**عدد الأسطر الإجمالي:** 19,524 سطر (JS+HTML+Python)
