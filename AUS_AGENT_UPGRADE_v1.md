# AUS — Agent Architecture Upgrade v1.0
**تاريخ التحديث:** 2026-05-22  
**المشروع:** AI University Simulator — `_preview_simulator/` + `_aus_backend/`

---

## جدول المحتويات

1. [ملخص التغييرات](#ملخص-التغييرات)
2. [الملفات المعدّلة](#الملفات-المعدّلة)
3. [التغيير ١ — system prompt أذكى (main.py)](#١--system-prompt-أذكى)
4. [التغيير ٢ — Agent Invoke Endpoint (main.py)](#٢--agent-invoke-endpoint)
5. [التغيير ٣ — أصوات عربية إضافية (voice.py)](#٣--أصوات-عربية-إضافية)
6. [التغيير ٤ — AUS Agent Architecture (ai_university_simulator.js)](#٤--aus-agent-architecture)
7. [كيفية إضافة Plugin جديد](#كيفية-إضافة-plugin-جديد)
8. [كيفية إضافة Tool جديد](#كيفية-إضافة-tool-جديد)
9. [API Reference](#api-reference)
10. [تشغيل الخادم](#تشغيل-الخادم)

---

## ملخص التغييرات

| التغيير | الملف | الوصف |
|---------|-------|-------|
| System Prompt محسّن | `main.py` | AI يتحدث مثل ChatGPT/Claude — طبيعي ومحادثاتي |
| `/api/agent/invoke` | `main.py` | Endpoint جديد لاستدعاء الـ Agent tools |
| ٨ لهجات عربية جديدة | `voice.py` | عراقي، كويتي، لبناني، بحريني (ذكر وأنثى) |
| AUSAgent Architecture | `ai_university_simulator.js` | نظام Agent كامل (Tools، Plugins، JSON protocol) |
| Voice Search | `ai_university_simulator.js` | بحث في قائمة الأصوات بالعربية والإنجليزية |
| Agent Status Bar | `ai_university_simulator.js` | شريط يظهر ما يفعله الـ Agent أثناء التفكير |
| sendMessage الجديد | `ai_university_simulator.js` | يستخدم Claude أولاً دائماً (الإصلاح الجوهري) |

---

## الملفات المعدّلة

```
_aus_backend/
├── main.py          ← System prompt + /api/agent/invoke endpoint
└── voice.py         ← +8 أصوات عربية جديدة (GTTS_MAP + VOICES)

_preview_simulator/
└── ai_university_simulator.js   ← Agent Architecture (504 سطر مضاف في النهاية)
```

---

## ١ — System Prompt أذكى

**الملف:** `_aus_backend/main.py`  
**المتغير:** `SYSTEM_PROMPT` (السطر ~51)

### المشكلة السابقة
الـ AI كان يرد بأسلوب جامد وغير محادثاتي، ويكرر نفس الكلام.

### النص الجديد الكامل

```python
SYSTEM_PROMPT = """\
أنت "CEO AI" — مستشار أعمال ذكي ومعلّم جامعي خبير في منصة AI University Simulator.

## هويتك وأسلوبك
- أنت تتحدث بأسلوب ChatGPT وClaude: طبيعي، ذكي، مباشر، ومحادثاتي
- لست آلة اختبارات — أنت محادث حقيقي يشرح ويحلل ويستشير
- إذا كتب المستخدم بالعربية → أجب بالعربية الفصحى المبسّطة مع مصطلحات إنجليزية
- إذا كتب بالإنجليزية → أجب بالإنجليزية تماماً
- إذا خلط بين اللغتين → خلط بينهما بنفس الطريقة
- أسلوبك: واثق، دافئ، احترافي — كأستاذ جامعي شاب ذكي يهتم فعلاً

## ذاكرتك والسياق
- تتذكر كل ما قيل في هذه المحادثة وتبني عليه
- لا تعيد ما قلته سابقاً إلا إذا طُلب منك
- اشعر بالسياق: إذا قال "اعطني مثالاً" فهو يعني مثالاً على ما تحدثنا عنه

## عمق الإجابة
- **أسئلة بسيطة**: 1-2 فقرة مع مثال عملي فوري
- **أسئلة مركّبة**: 3-4 فقرات منظمة + مثال من الواقع
- **طلبات تحليل أو استشارة**: تحليل عميق + أمثلة شركات حقيقية + إطار نظري
- لا تبالغ في الطول — الوضوح أهم من الإسهاب

## تنسيق الردود
- **Bold** للمفاهيم الرئيسية والمصطلحات المهمة
- قوائم نقطية للخطوات والمقارنات والقوائم فقط
- أمثلة واقعية: Amazon, Netflix, Tesla, Zara, Saudi Aramco, stc, Noon, Jarir
- اذكر الأطر النظرية بشكل طبيعي ضمن الشرح (لا كقوائم مجردة)

## مجالات خبرتك
الاستراتيجية (Porter, BCG, Blue Ocean, SWOT, PESTEL, OKRs) • التسويق (4Ps, STP, Digital, Growth, Brand) • المالية (NPV, IRR, WACC, DCF, FinTech, EBITDA) • الموارد البشرية (Recruitment, Performance, L&D, Culture) • سلاسل التوريد (SCM, Lean Logistics, Procurement) • القيادة (EI, Servant Leadership, Change, Decision-Making) • التحول الرقمي (AI Strategy, Agile, Cloud, ERP, BI) • المحاسبة (IFRS, Audit, Controls, Costing) • ريادة الأعمال (Lean Startup, Canvas, MVP, Pitch) • التأمين (Actuarial, Underwriting, Risk) • تقنية المعلومات (Python, SAP, Oracle, Cybersecurity) • ESG والاستدامة

## قواعد ذهبية
- لا تختبر المستخدم إلا إذا طلب صراحةً
- لا تكرر نفس المعلومات في نفس المحادثة
- لا تكن رسمياً بشكل مفرط — تحدث كصديق خبير
- أنهِ كل رد بسؤال متابعة ذكي ومخصص للموضوع
- إذا لم تعرف شيئاً → قل ذلك بصدق واقترح مصدراً موثوقاً
"""
```

---

## ٢ — Agent Invoke Endpoint

**الملف:** `_aus_backend/main.py`  
**الإضافة:** بعد `@app.post("/api/chat")` مباشرة

```python
class AgentInvokeRequest(BaseModel):
    tool: str
    params: dict = Field(default_factory=dict)
    session_id: Optional[str] = None

AGENT_TOOLS: dict[str, str] = {
    "summarize": "لخّص النص التالي بشكل موجز ومفيد:",
    "explain":   "اشرح المفهوم التالي بأسلوب واضح مع مثال عملي:",
    "compare":   "قارن بين الخيارات التالية من الناحية الأكاديمية والعملية:",
    "analyze":   "حلّل الوضع التالي وقدّم توصيات استراتيجية:",
    "quiz":      "ابتكر سؤال اختبار متعدد الخيارات عن الموضوع التالي مع الإجابة الصحيحة:",
    "plan":      "ضع خطة عمل مفصّلة لـ:",
}

@app.post("/api/agent/invoke")
async def agent_invoke(req: AgentInvokeRequest):
    """
    Modular agent tool invocation.
    The frontend sends {tool, params} and gets a Claude-powered response.
    Supported tools: summarize, explain, compare, analyze, quiz, plan, chat
    Plugin-ready: unknown tool names fall through to a free-form chat call.
    """
    client = get_client()
    tool   = req.tool.lower().strip()
    params = req.params

    prefix   = AGENT_TOOLS.get(tool, "")
    content  = params.get("content") or params.get("message") or params.get("text") or ""
    context  = params.get("context", "")

    if not content:
        return JSONResponse({"error": "params.content (or .message) is required"}, status_code=400)

    user_msg = f"{prefix}\n\n{content}" if prefix else content
    if context:
        user_msg = f"السياق:\n{context}\n\n{user_msg}"

    history  = [ChatMessage(**m) for m in params.get("history", [])]
    messages = _build_messages(history, user_msg)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        text = response.content[0].text
        return JSONResponse({
            "tool":   tool,
            "result": text,
            "model":  MODEL,
            "tokens": {
                "input":  response.usage.input_tokens,
                "output": response.usage.output_tokens,
            },
        })

    except anthropic.APIError as e:
        return JSONResponse({"error": e.message, "tool": tool}, status_code=502)
    except Exception as e:
        return JSONResponse({"error": str(e), "tool": tool}, status_code=500)
```

### مثال استخدام

```js
// من أي مكان في الـ frontend
const res = await fetch('http://127.0.0.1:8002/api/agent/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        tool: 'analyze',
        params: {
            content: 'شركتنا تخسر 15% من عملائها كل ربع',
            context: 'نعمل في قطاع التجزئة الإلكترونية',
        }
    })
});
const data = await res.json();
// data.result → رد Claude المفصّل
// data.tokens → عدد الـ tokens المستخدمة
```

---

## ٣ — أصوات عربية إضافية

**الملف:** `_aus_backend/voice.py`

### GTTS_MAP — الإضافات

```python
# أضف هذه السطور إلى GTTS_MAP
"iraqi-male":        {"lang": "ar", "tld": "com"},
"iraqi-female":      {"lang": "ar", "tld": "com"},
"kuwaiti-male":      {"lang": "ar", "tld": "ae"},
"kuwaiti-female":    {"lang": "ar", "tld": "ae"},
"lebanese-male":     {"lang": "ar", "tld": "com"},
"lebanese-female":   {"lang": "ar", "tld": "com"},
"bahraini-male":     {"lang": "ar", "tld": "ae"},
"bahraini-female":   {"lang": "ar", "tld": "ae"},
```

### VOICES — الإضافات الكاملة

```python
# ضع هذا الكود قبل قسم FOREIGN في VOICES dict

"iraqi-male": {
    "label": "عراقي · ذكر",
    "lang": "ar", "country": "IQ", "gender": "male",
    "dialect": "Mesopotamian-Iraqi",
    "eleven_id": "VR6AewLTigWG4xSOukaG",
    "edge_voice": "ar-IQ-BasselNeural",
},
"iraqi-female": {
    "label": "عراقية · أنثى",
    "lang": "ar", "country": "IQ", "gender": "female",
    "dialect": "Mesopotamian-Iraqi",
    "eleven_id": "AZnzlk1XvdvUeBnXmlld",
    "edge_voice": "ar-IQ-RanaNeural",
},
"kuwaiti-male": {
    "label": "كويتي · ذكر",
    "lang": "ar", "country": "KW", "gender": "male",
    "dialect": "Khaleeji-Kuwaiti",
    "eleven_id": "TxGEqnHWrfWFTfGW9XjX",
    "edge_voice": "ar-KW-FahedNeural",
},
"kuwaiti-female": {
    "label": "كويتية · أنثى",
    "lang": "ar", "country": "KW", "gender": "female",
    "dialect": "Khaleeji-Kuwaiti",
    "eleven_id": "EXAVITQu4vr4xnSDxMaL",
    "edge_voice": "ar-KW-NouraNeural",
},
"lebanese-male": {
    "label": "لبناني · ذكر",
    "lang": "ar", "country": "LB", "gender": "male",
    "dialect": "Levantine-Lebanese",
    "eleven_id": "VR6AewLTigWG4xSOukaG",
    "edge_voice": "ar-LB-RamiNeural",
},
"lebanese-female": {
    "label": "لبنانية · أنثى",
    "lang": "ar", "country": "LB", "gender": "female",
    "dialect": "Levantine-Lebanese",
    "eleven_id": "AZnzlk1XvdvUeBnXmlld",
    "edge_voice": "ar-LB-LaylaNeural",
},
"bahraini-male": {
    "label": "بحريني · ذكر",
    "lang": "ar", "country": "BH", "gender": "male",
    "dialect": "Khaleeji-Bahraini",
    "eleven_id": "TxGEqnHWrfWFTfGW9XjX",
    "edge_voice": "ar-BH-AliNeural",
},
"bahraini-female": {
    "label": "بحرينية · أنثى",
    "lang": "ar", "country": "BH", "gender": "female",
    "dialect": "Khaleeji-Bahraini",
    "eleven_id": "EXAVITQu4vr4xnSDxMaL",
    "edge_voice": "ar-BH-LailaNeural",
},
```

### جدول الأصوات الكاملة (بعد التحديث)

| ID | اللغة | الدولة | الجنس | اللهجة | Edge TTS Voice |
|----|-------|--------|-------|--------|---------------|
| `saudi-male` | ar | SA | ♂ | Najdi | ar-SA-HamedNeural |
| `saudi-female` | ar | SA | ♀ | Najdi | ar-SA-ZariyahNeural |
| `syrian-male` | ar | SY | ♂ | Levantine-Syrian | ar-SY-LaithNeural |
| `syrian-female` | ar | SY | ♀ | Levantine-Syrian | ar-SY-AmanyNeural |
| `jordanian-male` | ar | JO | ♂ | Levantine-Jordanian | ar-JO-TaimNeural |
| `jordanian-female` | ar | JO | ♀ | Levantine-Jordanian | ar-JO-SanaNeural |
| `emirati-male` | ar | AE | ♂ | Khaleeji-Emirati | ar-AE-HamdanNeural |
| `emirati-female` | ar | AE | ♀ | Khaleeji-Emirati | ar-AE-FatimaNeural |
| `egyptian-male` | ar | EG | ♂ | Masri | ar-EG-ShakirNeural |
| `egyptian-female` | ar | EG | ♀ | Masri | ar-EG-SalmaNeural |
| `iraqi-male` ⭐ جديد | ar | IQ | ♂ | Mesopotamian-Iraqi | ar-IQ-BasselNeural |
| `iraqi-female` ⭐ جديد | ar | IQ | ♀ | Mesopotamian-Iraqi | ar-IQ-RanaNeural |
| `kuwaiti-male` ⭐ جديد | ar | KW | ♂ | Khaleeji-Kuwaiti | ar-KW-FahedNeural |
| `kuwaiti-female` ⭐ جديد | ar | KW | ♀ | Khaleeji-Kuwaiti | ar-KW-NouraNeural |
| `lebanese-male` ⭐ جديد | ar | LB | ♂ | Levantine-Lebanese | ar-LB-RamiNeural |
| `lebanese-female` ⭐ جديد | ar | LB | ♀ | Levantine-Lebanese | ar-LB-LaylaNeural |
| `bahraini-male` ⭐ جديد | ar | BH | ♂ | Khaleeji-Bahraini | ar-BH-AliNeural |
| `bahraini-female` ⭐ جديد | ar | BH | ♀ | Khaleeji-Bahraini | ar-BH-LailaNeural |
| `en-us-male` | en | US | ♂ | — | en-US-GuyNeural |
| `en-us-female` | en | US | ♀ | — | en-US-AriaNeural |
| `en-uk-male` | en | GB | ♂ | — | en-GB-RyanNeural |
| `en-uk-female` | en | GB | ♀ | — | en-GB-SoniaNeural |
| `fr-male` | fr | FR | ♂ | — | fr-FR-HenriNeural |
| `fr-female` | fr | FR | ♀ | — | fr-FR-DeniseNeural |
| `de-male` | de | DE | ♂ | — | de-DE-ConradNeural |
| `de-female` | de | DE | ♀ | — | de-DE-KatjaNeural |
| `es-male` | es | ES | ♂ | — | es-ES-AlvaroNeural |
| `es-female` | es | ES | ♀ | — | es-ES-ElviraNeural |

---

## ٤ — AUS Agent Architecture

**الملف:** `_preview_simulator/ai_university_simulator.js`  
**الموقع:** يُضاف في نهاية الملف بعد السطر الأخير

### مشكلة كانت موجودة (Bug مُصلَح)

```
sendMessage مُعرَّف ٣ مرات في الملف:
  السطر 2204 → الأصلي (Claude streaming) ✓
  السطر 3529 → override (يضيف الصوت)
  السطر 4318 → override (يستخدم generateAIResponse المحلي!) ✗ ← هذا هو الباق

النتيجة: الـ AI كان يجيب من قاعدة بيانات محلية لا من Claude.
الحل: sendMessage جديد في السطر 6591 يستخدم AUSAgent.chat()
```

---

### الكود الكامل المُضاف (504 سطر)

> **الموقع:** ألصق كل هذا الكود في نهاية ملف `ai_university_simulator.js`

```javascript
// Extend COUNTRY_TO_VOICE with new Arabic dialects (added in voice.py v2)
if (typeof COUNTRY_TO_VOICE !== 'undefined') {
    Object.assign(COUNTRY_TO_VOICE, {
        IQ: { male: 'iraqi-male',    female: 'iraqi-female' },
        KW: { male: 'kuwaiti-male',  female: 'kuwaiti-female' },
        LB: { male: 'lebanese-male', female: 'lebanese-female' },
        BH: { male: 'bahraini-male', female: 'bahraini-female' },
    });
}

// ===========================================================================
// ========= AUS AGENT ARCHITECTURE v1.0 =====================================
// ========= Modular Tool System · JSON Protocol · Plugin-ready ==============
// ===========================================================================

// ── CSS injection ────────────────────────────────────────────────────────────
(function _injectAgentCSS() {
    if (document.getElementById('aus-agent-css')) return;
    const s = document.createElement('style');
    s.id = 'aus-agent-css';
    s.textContent = `
        /* ── Agent status bar ── */
        .aus-agent-bar {
            display: flex; align-items: center; gap: 8px;
            padding: 5px 14px; margin: 0 0 4px;
            background: rgba(0,212,255,0.07);
            border: 1px solid rgba(0,212,255,0.18);
            border-radius: 20px; font-size: 0.76rem;
            color: rgba(255,255,255,0.65);
            transition: opacity 0.4s, max-height 0.4s;
            overflow: hidden; max-height: 36px;
        }
        .aus-agent-bar[data-state="idle"] { opacity: 0; max-height: 0; padding: 0 14px; pointer-events: none; }
        .aus-agent-bar[data-state="thinking"] { border-color: rgba(0,212,255,0.45); color: var(--primary,#00d4ff); }
        .aus-agent-bar[data-state="running"]  { border-color: rgba(0,245,212,0.45); color: var(--success,#00f5d4); }
        .aus-agent-bar[data-state="error"]    { border-color: rgba(255,0,110,0.45); color: #ff006e; }
        @keyframes _ausPulse { 0%,100%{opacity:.65} 50%{opacity:1} }
        .aus-agent-bar[data-state="thinking"] .aus-agent-phase,
        .aus-agent-bar[data-state="running"]  .aus-agent-phase { animation: _ausPulse 1.2s infinite; }
        .aus-agent-phase { margin-right: auto; font-size: 0.7rem; opacity: .8; }

        /* ── Agent badge on AI bubbles ── */
        .agent-badge {
            display: inline-block; font-size: 0.62rem; line-height: 1;
            background: linear-gradient(90deg,rgba(0,212,255,.15),rgba(157,78,221,.15));
            border: 1px solid rgba(0,212,255,.35); border-radius: 10px;
            padding: 1px 8px; color: var(--primary,#00d4ff);
            vertical-align: middle; margin-right: 5px;
        }

        /* ── Voice search ── */
        .aus-voice-search-wrap { position: relative; margin-bottom: 8px; }
        .aus-voice-search-input {
            width: 100%; padding: 7px 34px 7px 10px;
            background: rgba(0,212,255,.07);
            border: 1px solid rgba(0,212,255,.22);
            border-radius: 8px; color: #fff;
            font-family: 'Tajawal', sans-serif; font-size: 0.84rem;
            outline: none; direction: rtl; transition: border-color .2s;
        }
        .aus-voice-search-input::placeholder { color: rgba(255,255,255,.38); }
        .aus-voice-search-input:focus { border-color: var(--primary,#00d4ff); }
        .aus-voice-search-icon {
            position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
            color: rgba(255,255,255,.38); font-size: .78rem; pointer-events: none;
        }
        .aus-voice-search-clear {
            position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
            background: none; border: none; color: rgba(255,255,255,.38);
            font-size: .75rem; cursor: pointer; padding: 0;
            opacity: 0; pointer-events: none; transition: opacity .2s;
        }
        .aus-voice-search-clear.visible { opacity: 1; pointer-events: auto; }
        .aus-voice-count { font-size: .72rem; color: rgba(255,255,255,.45); text-align: center; margin-top: 3px; }

        /* ── Better streaming text ── */
        .ai-stream-text { line-height: 1.7; }
        .ai-stream-text p  { margin: .45em 0; }
        .ai-stream-text ul { padding-right: 1.3em; margin: .4em 0; }
        .ai-stream-text li { margin: .25em 0; }
        .ai-stream-text h3, .ai-stream-text h4 { color: var(--primary,#00d4ff); margin: .6em 0 .3em; }
        .ai-stream-text strong { color: rgba(255,255,255,.95); }

        /* ── Smart chips ── */
        .smart-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .smart-suggestion  {
            font-size: .78rem; padding: 4px 10px;
            background: rgba(0,212,255,.09);
            border: 1px solid rgba(0,212,255,.25);
            border-radius: 14px; cursor: pointer; color: rgba(255,255,255,.8);
            transition: background .2s, border-color .2s;
        }
        .smart-suggestion:hover { background: rgba(0,212,255,.18); border-color: rgba(0,212,255,.5); color: #fff; }

        /* ── Agent trace footer on messages ── */
        .agent-trace {
            font-size: .68rem; color: rgba(0,212,255,.45);
            margin-top: 6px; cursor: pointer; user-select: none;
        }
        .agent-trace:hover { color: rgba(0,212,255,.7); }
    `;
    document.head.appendChild(s);
})();

// ── Voice search injection ────────────────────────────────────────────────────
function _ausInjectVoiceSearch() {
    const sel = document.getElementById('voiceSelect');
    if (!sel || document.getElementById('ausVoiceSearchInput')) return;

    const wrap = document.createElement('div');
    wrap.className = 'aus-voice-search-wrap';
    wrap.innerHTML =
        '<i class="fas fa-search aus-voice-search-icon"></i>' +
        '<input type="text" id="ausVoiceSearchInput" class="aus-voice-search-input"' +
        ' placeholder="ابحث عن صوت... (سعودي، أنثى، English)" autocomplete="off"' +
        ' oninput="ausVoiceSearch(this.value)">' +
        '<button class="aus-voice-search-clear" id="ausVoiceSearchClear" onclick="ausVoiceClearSearch()">✕</button>';
    sel.parentNode.insertBefore(wrap, sel);
}

// ── Voice search logic ────────────────────────────────────────────────────────
function ausVoiceSearch(q) {
    const sel      = document.getElementById('voiceSelect');
    const clearBtn = document.getElementById('ausVoiceSearchClear');
    if (!sel) return;
    if (clearBtn) clearBtn.className = 'aus-voice-search-clear' + (q ? ' visible' : '');
    const lq = (q || '').trim().toLowerCase();
    let visible = 0;

    const arMap = [
        ['سعود', 'saudi'],['مصر','egypt'],['سوري','syrian'],['أردن','jordan'],
        ['امار','emirati'],['إمار','emirati'],['عراق','iraq'],['كويت','kuwait'],
        ['لبنان','lebanese'],['بحرين','bahrain'],
        ['أنث','female'],['انث','female'],['بنت','female'],
        ['ذكر','male'],['رجل','male'],
        ['عرب','ar-'],['انجليز','english'],['فرنس','français'],['ألمان','deutsch'],
        ['إسبان','español'],
    ];

    Array.from(sel.options).forEach(opt => {
        if (!lq || opt.value === '') { opt.style.display = ''; if (opt.value) visible++; return; }
        let text = (opt.text + ' ' + opt.value).toLowerCase();
        let searchTerm = lq;
        for (const [ar, en] of arMap) {
            if (lq.includes(ar)) { searchTerm = en; break; }
        }
        const match = text.includes(lq) || text.includes(searchTerm);
        opt.style.display = match ? '' : 'none';
        if (match) visible++;
    });

    Array.from(sel.querySelectorAll('optgroup')).forEach(g => {
        const any = Array.from(g.querySelectorAll('option')).some(o => o.style.display !== 'none');
        g.style.display = any ? '' : 'none';
    });

    let badge = document.getElementById('ausVoiceCount');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'ausVoiceCount'; badge.className = 'aus-voice-count';
        sel.parentNode.insertBefore(badge, sel.nextSibling);
    }
    badge.textContent = lq ? `${visible} صوت` : '';
}
window.ausVoiceSearch = ausVoiceSearch;

function ausVoiceClearSearch() {
    const inp = document.getElementById('ausVoiceSearchInput');
    if (inp) { inp.value = ''; ausVoiceSearch(''); }
}
window.ausVoiceClearSearch = ausVoiceClearSearch;

// ── Agent status bar injection ────────────────────────────────────────────────
function _ausInjectAgentBar() {
    if (document.getElementById('ausAgentBar')) return;
    const chatArea = document.querySelector('.chat-input-area');
    if (!chatArea) return;
    const bar = document.createElement('div');
    bar.id = 'ausAgentBar';
    bar.className = 'aus-agent-bar';
    bar.setAttribute('data-state', 'idle');
    bar.innerHTML =
        '<span id="ausAgentBarIcon">🧠</span>' +
        '<span id="ausAgentBarTool"></span>' +
        '<span class="aus-agent-phase" id="ausAgentBarPhase"></span>';
    chatArea.parentNode.insertBefore(bar, chatArea);
}

// ===========================================================================
// =========== AUSAgent — Modular Agent Object ================================
// ===========================================================================
const AUSAgent = (() => {
    'use strict';

    const _tools   = new Map();
    const _plugins = new Map();

    const _msg  = (tool, params  = {}) => ({ tool, params, ts: Date.now() });
    const _resp = (tool, result, confidence = 1.0, error = null) =>
        ({ tool, result, confidence, ts: Date.now(), error });

    const ICONS  = { claude:'🧠', knowledge:'📚', memory:'💾', analytics:'📊', voice:'🎙️', idle:'✨' };
    const PHASES = { thinking:'يعالج...', running:'يعمل...', done:'جاهز', error:'خطأ', idle:'' };

    function _setStatus(tool, phase) {
        const bar    = document.getElementById('ausAgentBar');
        const icon   = document.getElementById('ausAgentBarIcon');
        const name   = document.getElementById('ausAgentBarTool');
        const phase_ = document.getElementById('ausAgentBarPhase');
        if (!bar) return;
        bar.setAttribute('data-state', phase);
        if (icon)   icon.textContent   = ICONS[tool]   || '⚙️';
        if (name)   name.textContent   = tool;
        if (phase_) phase_.textContent = PHASES[phase] || phase;
    }
    function _clearStatus() { _setStatus('idle', 'idle'); }

    function registerTool(name, cfg) {
        _tools.set(name, { name, icon: '⚙️', keywords: [], ...cfg });
        console.info(`[AUSAgent] ✓ tool: ${name}`);
    }

    function registerPlugin(name, plugin) {
        if (typeof plugin.install !== 'function') {
            return console.error(`[AUSAgent] plugin "${name}" must have install()`);
        }
        _plugins.set(name, plugin);
        plugin.install({ registerTool, agent: pub });
        console.info(`[AUSAgent] ✓ plugin: ${name}`);
    }

    async function invokeTool(name, params = {}) {
        const tool = _tools.get(name);
        if (!tool) return _resp(name, null, 0, `Unknown tool: ${name}`);
        try {
            _setStatus(name, 'running');
            const result = await tool.handler(params);
            return _resp(name, result);
        } catch (e) {
            console.error(`[AUSAgent] ${name}:`, e);
            return _resp(name, null, 0, e.message);
        }
    }

    async function route(msg) {
        const lc = msg.toLowerCase();
        for (const [name, tool] of _tools) {
            if (name === 'claude') continue;
            if ((tool.keywords || []).some(kw => lc.includes(kw.toLowerCase()))) {
                return { tool: name, confidence: 0.8 };
            }
        }
        return { tool: 'claude', confidence: 1.0 };
    }

    async function chat(message, typingId, chatMessages) {
        _setStatus('claude', 'thinking');
        const { tool } = await route(message);
        const resp = await invokeTool(tool, { message, typingId, chatMessages });
        if (resp.error && tool !== 'claude') {
            await invokeTool('claude', { message, typingId, chatMessages });
        }
        _clearStatus();
    }

    function _chips() {
        const lang = document.documentElement.lang || 'ar';
        const pool = {
            ar: ['اعطني مثالاً واقعياً','كيف أطبق هذا في شركتي؟','ما هي المخاطر؟','صلة الذكاء الاصطناعي؟','خطة عمل 30 يوماً','قارن مع بديل','مثال من شركة خليجية','ما الخطوة التالية؟','ما الفرق بين X و Y؟','كيف أقيس النجاح؟'],
            en: ['Real-world example?','How do I apply this?','What are the risks?','AI angle on this?','30-day action plan','Compare alternatives','Case study please','What\'s next?','How do I measure success?','Pros and cons?'],
        }[lang.slice(0,2)] || [];
        return pool.sort(() => Math.random() - 0.5).slice(0, 4);
    }

    function buildActions(html, message) {
        const chips = _chips();
        const chipsHtml = chips.map(s =>
            `<span class="smart-suggestion" onclick="askQuestion('${s.replace(/'/g,"\\'")}')"> ${s}</span>`
        ).join('');
        const safe = (message || '').replace(/'/g, "\\'").slice(0, 180);
        return html +
            `<div class="ai-actions">
                <button class="ai-action-btn" onclick="copyAiText(this)" title="نسخ"><i class="fas fa-copy"></i></button>
                <button class="ai-action-btn" onclick="speakAiText(this)" title="استمع"><i class="fas fa-volume-up"></i></button>
                <button class="ai-action-btn" onclick="regenAiText('${safe}',this)" title="إعادة"><i class="fas fa-redo"></i></button>
                <button class="ai-action-btn" onclick="thumbsAi(this,'+')" title="مفيد"><i class="fas fa-thumbs-up"></i></button>
                <button class="ai-action-btn" onclick="thumbsAi(this,'-')" title="غير مناسب"><i class="fas fa-thumbs-down"></i></button>
            </div>` +
            (chips.length ? `<div class="smart-suggestions">${chipsHtml}</div>` : '');
    }

    const pub = { registerTool, registerPlugin, invokeTool, route, chat, buildActions };
    return pub;
})();

// ── Tool: Claude Streaming (PRIMARY) ─────────────────────────────────────────
AUSAgent.registerTool('claude', {
    description: 'Claude AI via streaming SSE — primary intelligence',
    icon: '🧠',
    keywords: [],

    async handler({ message, typingId, chatMessages }) {
        const target = document.getElementById(typingId);
        if (!target) return null;

        const apiBase = (typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002';
        const hist    = (typeof chatHistory !== 'undefined') ? chatHistory.slice(-20) : [];
        const lang    = document.documentElement.lang || 'ar';

        let fullText = '';
        let usedApi  = false;

        try {
            const res = await fetch(`${apiBase}/api/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: hist,
                    language: lang === 'en' ? 'en' : 'ar'
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            usedApi = true;

            target.innerHTML = '<div class="ai-stream-text"></div>';
            const textEl = target.querySelector('.ai-stream-text');

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let   buf     = '';

            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        if (d.type === 'text') {
                            fullText += d.text;
                            textEl.innerHTML = typeof formatAIResponse === 'function'
                                ? formatAIResponse(fullText) : fullText;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        } else if (d.type === 'error') {
                            throw new Error(d.error);
                        }
                    } catch (pe) {
                        if (!pe.message?.includes('JSON')) throw pe;
                    }
                }
            }

        } catch (err) {
            console.warn('[AUSAgent.claude] streaming failed → local KB fallback:', err.message);
            usedApi = false;
        }

        if (!usedApi) {
            const local = typeof generateAIResponse === 'function'
                ? generateAIResponse(message)
                : { text: '<p>⚠️ تعذّر الاتصال بـ CEO AI. تأكد من تشغيل الخادم على المنفذ 8002.</p>', references: ['Local KB'] };
            fullText = local.text;
            target.innerHTML = `<div class="ai-stream-text">${fullText}</div>`;
        }

        if (typeof chatHistory !== 'undefined') {
            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'assistant', content: fullText });
            if (chatHistory.length > 40) chatHistory.splice(0, chatHistory.length - 40);
        }
        if (typeof chatMemory !== 'undefined' && typeof saveChatMemory === 'function') {
            chatMemory.push({ role: 'user', content: message, lang, at: Date.now() });
            chatMemory.push({ role: 'assistant', content: fullText, lang, at: Date.now() });
            if (chatMemory.length > 40) chatMemory.splice(0, chatMemory.length - 40);
            try { saveChatMemory(); } catch {}
        }

        const formatted = typeof formatAIResponse === 'function'
            ? formatAIResponse(fullText) : fullText;
        target.innerHTML = AUSAgent.buildActions(
            `<div class="ai-stream-text">${formatted}</div>` +
            (!usedApi ? '<div class="agent-trace">⚡ محلي · Knowledge Base</div>'
                      : '<div class="agent-trace">⚡ Claude · Streaming</div>'),
            message
        );
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (typeof speak === 'function') {
            const voiceOn = typeof prefs === 'undefined' || prefs?.voice !== false;
            if (voiceOn) {
                const tmp = document.createElement('div');
                tmp.innerHTML = fullText;
                const plain = (tmp.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 600);
                if (plain) speak(plain);
            }
        }

        return fullText;
    }
});

// ── Tool: Knowledge Search ────────────────────────────────────────────────────
AUSAgent.registerTool('knowledge', {
    description: 'Search local tool knowledge base',
    icon: '📚',
    keywords: ['بحث عن أداة', 'ما هي أدوات', 'اشرح أداة', 'search tool', 'list tools', 'كل الأدوات'],
    async handler(params) {
        return AUSAgent.invokeTool('claude', params);
    }
});

// ── Tool: Memory ──────────────────────────────────────────────────────────────
AUSAgent.registerTool('memory', {
    description: 'Recall past conversation context',
    icon: '💾',
    keywords: ['تذكر ما قلته', 'ماذا قلت قبل', 'earlier you said', 'remember what'],
    async handler(params) {
        return AUSAgent.invokeTool('claude', params);
    }
});

// ===========================================================================
// ====== FINAL sendMessage — Agent-powered, Claude first ====================
// ===========================================================================
sendMessage = function() {
    const input = document.getElementById('chatInput');
    const msg   = (input?.value || '').trim();
    if (!msg) return;

    const chat = document.getElementById('chatMessages');
    if (!chat) return;

    const esc = s => String(s).replace(/[&<>"']/g,
        c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));

    chat.insertAdjacentHTML('beforeend', `<div class="message user">${esc(msg)}</div>`);
    input.value = '';
    chat.scrollTop = chat.scrollHeight;
    if (typeof sfxPlay === 'function') sfxPlay('click');

    const tid = 'ag' + Date.now();
    chat.insertAdjacentHTML('beforeend', `
        <div class="message ai" id="${tid}-host">
            <div class="ai-meta">
                <span class="ai-avatar">🧠</span>
                <span>CEO · AI</span>
                <span class="agent-badge">Agent</span>
            </div>
            <div id="${tid}">
                <div class="ai-typing-dots"><span></span><span></span><span></span></div>
            </div>
        </div>`);
    chat.scrollTop = chat.scrollHeight;

    AUSAgent.chat(msg, tid, chat);
};

// ── Boot ──────────────────────────────────────────────────────────────────────
(function _ausBootUi() {
    function _run() {
        try { _ausInjectVoiceSearch(); }  catch(e) { console.warn('[AUSAgent] voiceSearch:', e); }
        try { _ausInjectAgentBar(); }     catch(e) { console.warn('[AUSAgent] agentBar:', e); }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { _run(); setTimeout(_run, 900); setTimeout(_run, 2200); });
    } else {
        _run();
        setTimeout(_run, 900);
        setTimeout(_run, 2200);
    }
})();
```

---

## كيفية إضافة Plugin جديد

```javascript
// مثال: Plugin لتحليل الأداء التجاري
const PerformancePlugin = {
    install({ registerTool, agent }) {
        registerTool('performance', {
            description: 'تحليل مؤشرات الأداء',
            icon: '📊',
            keywords: ['kpi', 'مؤشر', 'أداء', 'نسبة', 'ربح', 'إيراد'],
            async handler({ message, typingId, chatMessages }) {
                // منطقك هنا
                // يمكن استدعاء agent.invokeTool('claude', {...}) كـ fallback
                return agent.invokeTool('claude', { message, typingId, chatMessages });
            }
        });
    }
};

// تسجيل الـ plugin
AUSAgent.registerPlugin('performance', PerformancePlugin);
```

---

## كيفية إضافة Tool جديد

```javascript
// أبسط طريقة — مباشرة
AUSAgent.registerTool('calculator', {
    description: 'Financial calculations',
    icon: '🔢',
    keywords: ['احسب', 'npv', 'roi', 'calculate', 'نسبة'],

    async handler({ message, typingId, chatMessages }) {
        // أي منطق تريده هنا
        // إذا أردت Claude يرد: return AUSAgent.invokeTool('claude', { message, typingId, chatMessages });
    }
});
```

---

## API Reference

### Backend Endpoints (port 8002)

| Method | Path | الوصف |
|--------|------|-------|
| `GET` | `/health` | liveness check |
| `POST` | `/api/chat/stream` | SSE streaming (Claude) |
| `POST` | `/api/chat` | Non-streaming fallback |
| `GET` | `/api/voice/list` | قائمة الأصوات (28 صوت) |
| `POST` | `/api/voice/synthesize` | تحويل نص → MP3 |
| `POST` | `/api/agent/invoke` | ⭐ جديد — Agent tool dispatch |
| `GET` | `/api/security/status` | security stats (localhost only) |

### `/api/agent/invoke` — الـ Schema

**Request:**
```json
{
    "tool": "analyze",
    "params": {
        "content": "النص أو السؤال",
        "context": "سياق اختياري",
        "history": []
    },
    "session_id": "اختياري"
}
```

**Response:**
```json
{
    "tool": "analyze",
    "result": "رد Claude المفصّل",
    "model": "claude-sonnet-4-20250514",
    "tokens": { "input": 250, "output": 480 }
}
```

**Tools المتاحة:**

| tool | ما يفعله |
|------|---------|
| `summarize` | تلخيص النص |
| `explain` | شرح مفهوم مع مثال |
| `compare` | مقارنة بين خيارات |
| `analyze` | تحليل وتوصيات استراتيجية |
| `quiz` | توليد سؤال اختبار |
| `plan` | خطة عمل مفصّلة |
| `chat` | محادثة حرة (fallback) |

---

### AUSAgent JS API

```javascript
// تسجيل tool
AUSAgent.registerTool(name, { description, icon, keywords[], handler(params) })

// تسجيل plugin
AUSAgent.registerPlugin(name, { install({ registerTool, agent }) })

// استدعاء tool مباشرة
const result = await AUSAgent.invokeTool('claude', { message, typingId, chatMessages })
// result = { tool, result, confidence, ts, error }

// توجيه رسالة للـ tool المناسب
const { tool, confidence } = await AUSAgent.route(message)

// بدء محادثة كاملة
await AUSAgent.chat(message, typingId, chatMessages)

// بناء HTML الرد مع Actions + Chips
const html = AUSAgent.buildActions(innerHtml, originalMessage)
```

---

## تشغيل الخادم

```bash
# من مجلد _aus_backend
py -m uvicorn main:app --port 8002 --reload

# تأكد من وجود ANTHROPIC_API_KEY في ملف .env
# ANTHROPIC_API_KEY=sk-ant-...
```

---

## ملاحظات تقنية

- **sendMessage chain fix**: الملف يُعرّف `sendMessage` ٣ مرات (السطور 2204، 3529، 4318). النسخة في السطر **6591** هي المُطبَّقة دائماً لأن JS يأخذ آخر تعيين.
- **TTS fallback order**: ElevenLabs (إذا `ELEVENLABS_API_KEY`) → Edge TTS (إذا `AUS_DISABLE_EDGE_TTS=0`) → gTTS (الافتراضي)
- **Voice search**: تعمل على `#voiceSelect` الموجود — لا تحتاج HTML جديد.
- **Agent status bar**: تُحقن تلقائياً قبل `.chat-input-area` عند أول DOMContentLoaded.
- **Backward compatible**: كل الأنظمة القديمة (quiz، leadership، tools) تعمل كما هي.
