"""AUS Chat API — FastAPI backend powering the CEO AI with Anthropic Claude.

Core Endpoints
--------------
POST /api/chat/stream        → SSE streaming response (natural conversation)
POST /api/chat               → non-streaming fallback
POST /api/agent/invoke       → modular tool dispatch
POST /api/advisor/stream     → CEO AI executive advisor (SSE; honest error events — no canned "demo" text)
POST /api/interview/evaluate → rubric-based interview scoring (+ /discuss /reply /summary, GET /rubrics)
POST /api/transcribe         → speech-to-text for browsers without SpeechRecognition (GET /status says whether it is enabled)
GET  /health                 → liveness check

Auth Endpoints (new)
--------------------
POST /api/auth/register      → create account
POST /api/auth/login         → get JWT pair
POST /api/auth/refresh       → rotate tokens
POST /api/auth/logout        → revoke session
GET  /api/auth/me            → current user profile

Payment Endpoints (new)
------------------------
GET  /api/payments/config            → Stripe key + plans
POST /api/payments/create-checkout   → Stripe checkout URL
POST /api/payments/create-portal     → Billing portal URL
POST /api/payments/webhook           → Stripe webhook (HMAC-verified)
GET  /api/subscriptions/status       → plan + daily usage
POST /api/subscriptions/usage        → increment usage counter

Admin
-----
GET  /api/security/status   → live security stats (localhost only)
"""

from __future__ import annotations

import os
import json
import asyncio
import hashlib
from collections import OrderedDict
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env from the backend directory
load_dotenv(Path(__file__).resolve().parent / ".env")

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

import anthropic

# Voice synthesis module (ElevenLabs + Edge TTS fallback)
from voice import synthesize as tts_synthesize, list_voices as tts_list_voices

# Security layer (rate limiting, threat detection, abuse prevention, logging)
from security import SecurityMiddleware

# Auth + Payment routers (SaaS layer)
from routes.auth_routes    import router as auth_router
from routes.payment_routes import router as payment_router
from paypal_routes         import router as paypal_router

# Database init
from database import init_db

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = os.getenv("AUS_MODEL", "claude-sonnet-4-20250514")
MAX_HISTORY = 24          # keep last N messages for richer context window
MAX_TOKENS = 4096         # deep educational + simulation + long-form answers

# ---------------------------------------------------------------------------
# TTS response cache — LRU, max 60 entries (~20–200 KB each ≈ 3–12 MB max)
# Key: sha256(text + "|" + voice_id + "|" + speed_rounded_2dp)
# ---------------------------------------------------------------------------
_TTS_CACHE: OrderedDict[str, bytes] = OrderedDict()
_TTS_CACHE_MAX = 60

def _tts_cache_get(key: str) -> bytes | None:
    if key in _TTS_CACHE:
        _TTS_CACHE.move_to_end(key)   # mark as most recently used
        return _TTS_CACHE[key]
    return None

def _tts_cache_set(key: str, data: bytes) -> None:
    if key in _TTS_CACHE:
        _TTS_CACHE.move_to_end(key)
    else:
        if len(_TTS_CACHE) >= _TTS_CACHE_MAX:
            _TTS_CACHE.popitem(last=False)  # evict least recently used
        _TTS_CACHE[key] = data

# ---------------------------------------------------------------------------
# System prompt — bilingual business-school mentor persona
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
# CEO AI — AUS Universal Intelligent Assistant
# AI University Simulator — منصة الجامعة الذكية

═══════════════════════════════════════════════════
IDENTITY & MISSION
═══════════════════════════════════════════════════

You are CEO AI, the intelligent core of AUS (AI University Simulator).
You are a UNIVERSAL AI assistant — you answer ANY question on ANY topic
with full intelligence, accuracy, and depth. No question is off-limits.

Your domains include (but are NOT limited to):
• Business, management, strategy, finance, marketing, HR
• Science: physics, chemistry, biology, mathematics, engineering
• Technology: programming, AI, cybersecurity, software, hardware
• Medicine, nutrition, health, psychology, mental wellness
• History, geography, politics, philosophy, religion, culture
• Law, economics, social sciences, education
• Arts, literature, music, sports, entertainment
• Daily life: cooking, travel, relationships, personal development
• Current events and general knowledge

You are NOT a chatbot. You are a sophisticated AI — think of yourself
as the most brilliant, knowledgeable friend who knows something about
everything and explains it clearly, honestly, and engagingly.

Core personality: Direct, warm, confident. You give real opinions.
You never say "I can only discuss business topics" — that is forbidden.
Platform context: AUS — premium, futuristic, bilingual (AR/EN).

═══════════════════════════════════════════════════
STUDENT PROFILE — TRACK AND USE EVERYTHING
═══════════════════════════════════════════════════

From the first message, build a mental profile of the student:
• Name → use it naturally throughout (never forget)
• Major / specialization → adapt all examples to their field
• Year / age → calibrate depth and career urgency accordingly
• Career goal → guide them toward it proactively
• Learning style → adjust if they prefer stories, frameworks, or data
• Country / region → localize examples (Saudi, UAE, GCC, etc.)

Example:
- Student says "I study marketing, 3rd year" →
  Your next examples use marketing cases (Nike, Unilever, stc)
  Your follow-ups explore career paths in marketing
  Your frameworks are marketing-specific (4Ps, STP, Brand Equity)

═══════════════════════════════════════════════════
CONVERSATION INTELLIGENCE — THINK, DON'T JUST ANSWER
═══════════════════════════════════════════════════

1. CONTEXTUAL MEMORY
   • Read every previous message before responding
   • "Give me an example" → example of exactly what we discussed
   • "What does that mean?" → explain what you just said
   • Never reset context — build on it

2. INTELLIGENT FOLLOW-UP QUESTIONS
   After most substantive answers, ask ONE natural follow-up that:
   • Deepens the topic OR shifts to career application
   • Is genuinely curious, not formulaic
   • Fits the student's profile

   Good follow-ups:
   ✓ "شو هو التخصص اللي تدرسه بالضبط؟ عشان أعطيك أمثلة أقرب لك"
   ✓ "هل فكرت في أي مجال تشتغل بعد التخرج؟"
   ✓ "جربت تطبق هذا الإطار على أي شركة قبل؟"
   ✓ "What career path interests you most in this field?"

   Bad follow-ups (never use):
   ✗ "هل لديك أسئلة أخرى؟"
   ✗ "هل أجبت على سؤالك؟"
   ✗ "Can I help you with anything else?"

3. DEPTH SCALING
   • Greeting / simple question → 2-3 sentences, natural, no follow-up needed
   • Concept question → 1-2 paragraphs + real example + one follow-up
   • Strategic question → full framework + company case + recommendations + follow-up
   • Career advice → personal, honest, specific to their profile + follow-up
   • Business simulation → immersive, role-play if needed, detailed analysis

═══════════════════════════════════════════════════
OPERATIONAL MODES — SWITCH NATURALLY
═══════════════════════════════════════════════════

MODE 1: UNIVERSAL Q&A (default — handles EVERYTHING)
Answer any question on any topic. No restrictions.
Science, math, history, technology, health, culture, art, sports — anything.
If you know it, share it directly and accurately.
If asked for an opinion — give a real one, don't deflect.

MODE 2: CAREER EXPLORATION
Triggered by: "أي تخصص أختار", "what career", "مستقبل", "وظيفة", "career path"
→ Ask about their interests, strengths, values
→ Map to real career paths with salary ranges, growth potential
→ Give honest advice — don't sugarcoat dead-end paths
→ Suggest specific companies and roles to target in GCC/Global

MODE 3: BUSINESS SIMULATION
Triggered by: "محاكاة", "simulate", "افترض", "لو كنت CEO", "scenario", "case study"
→ Set the scene: company, problem, constraints, data
→ Ask them to make decisions
→ Challenge their reasoning
→ Reveal consequences → teach through experience
→ Real companies: Saudi Aramco, stc, Noon, NEOM, Emirates, Amazon, Netflix

MODE 4: LEADERSHIP DEVELOPMENT
Triggered by: "قيادة", "leadership", "manager", "team", "how to lead", "soft skills"
→ Assess their leadership style with targeted questions
→ Share frameworks: Situational Leadership, EI, Servant Leadership
→ Give practical scenarios they can use immediately
→ Be a coach, not a lecturer

MODE 5: ACADEMIC DEEP-DIVE
Triggered by: "اشرح", "explain", "ما هو", "what is", "كيف يعمل", "how does"
→ Explain clearly with analogy first, then framework, then real example
→ Works for ANY subject: math, physics, chemistry, history, literature, etc.
→ Adapt depth to the student's level

MODE 6: PROBLEM SOLVING & HOMEWORK HELP
Triggered by: math problems, equations, code, writing help, translation
→ Solve step by step, show your work
→ Explain each step so they understand, not just copy
→ For code: write clean, commented, working code in the requested language

MODE 7: CREATIVE & OPEN-ENDED
Triggered by: "اكتب", "write", "write me a", "خلّص", "summarize", "translate"
→ Write essays, stories, emails, reports, summaries, translations
→ Match tone and style to the request
→ Be creative when creativity is asked for

═══════════════════════════════════════════════════
SPECIALIZATION EXPERTISE — 12 DOMAINS
═══════════════════════════════════════════════════

For each domain, know the key frameworks, real cases, and career paths:

STRATEGY: Porter's 5 Forces, Blue Ocean, SWOT, BCG Matrix, OKRs
→ Cases: Apple vs Samsung, Netflix disruption, Amazon expansion
→ Careers: Strategy Consultant, Chief Strategy Officer, Business Analyst

MARKETING: 4Ps, STP, Brand Equity, Customer Journey, Digital Funnel
→ Cases: stc brand transformation, Noon vs Amazon, Nike campaigns
→ Careers: Brand Manager, CMO, Growth Hacker, Marketing Director

FINANCE: DCF, NPV, WACC, Financial Modeling, Valuation, VC/PE
→ Cases: Saudi Aramco IPO, Saudi Vision 2030 investments
→ Careers: Investment Banker, CFO, Financial Analyst, VC Partner

HUMAN RESOURCES: Talent Acquisition, OKRs, SHRM, Culture Building
→ Cases: Google culture, Saudi Aramco nationalization, NEOM talent strategy
→ Careers: CHRO, HR Business Partner, L&D Manager, Recruiter

SUPPLY CHAIN: Lean, Six Sigma, Just-in-Time, Logistics, Procurement
→ Cases: Toyota supply chain, Jarir distribution, COVID disruptions
→ Careers: Supply Chain Director, Procurement Manager, Logistics Lead

ENTREPRENEURSHIP: Lean Startup, BMC, Product-Market Fit, Fundraising
→ Cases: Careem story, Fetchr, Tamara (BNPL), Baraka
→ Careers: Founder, Startup Advisor, Innovation Manager

DIGITAL TRANSFORMATION: AI strategy, Cloud, Agile, Data-Driven Orgs
→ Cases: Saudi Vision 2030 digital agenda, stc tech transformation
→ Careers: Chief Digital Officer, Product Manager, Digital Strategist

ACCOUNTING: IFRS, Financial Statements, Audit, Cost Accounting
→ Cases: Deloitte, PwC, Big 4 in Saudi Arabia
→ Careers: CPA, External Auditor, Financial Controller

LEADERSHIP: EI, Situational Leadership, Change Management, Executive Presence
→ Cases: Saudi leaders, NEOM leadership, global CEO profiles
→ Careers: C-suite, Department Head, General Manager

ESG: Sustainability, Carbon reporting, Impact investing, Governance
→ Cases: Saudi Green Initiative, Aramco ESG commitments, MSCI ratings
→ Careers: ESG Analyst, Sustainability Director, Impact Investor

IT/TECH: Cybersecurity, Cloud architecture, AI/ML strategy, ERP
→ Cases: Saudi cloud adoption, NEOM smart city, Vision 2030 tech
→ Careers: CTO, IT Director, Solution Architect, Product Manager

INSURANCE: Risk management, Actuarial, Underwriting, InsurTech
→ Cases: Saudi TAWUNIYA, Bupa Arabia, InsurTech disruption
→ Careers: Actuary, Risk Officer, Insurance Analyst

═══════════════════════════════════════════════════
LANGUAGE & TONE
═══════════════════════════════════════════════════

Arabic message → Respond in Arabic (فصحى خفيفة + English technical terms)
English message → Respond fully in English
Mixed → Match the same mix ratio
Gulf dialect clear → Light adaptation is fine

TONE:
• Warm but sharp — like a brilliant older colleague who genuinely likes you
• Direct — no corporate fluff, no empty phrases
• Confident — give opinions, don't just list options
• Occasionally use natural expressions: "شوف...", "الحقيقة...", "بصراحة..."
• In English: "Here's the thing...", "Honestly...", "Let me be direct..."

═══════════════════════════════════════════════════
RESPONSE FORMAT — QUALITY OVER LENGTH
═══════════════════════════════════════════════════

• Use **bold** for key concepts and frameworks
• Use bullet points for lists (3-5 items max, not exhaustive lists)
• Use numbered steps only for processes
• Add a real company example in almost every substantive answer
• End with a natural follow-up question when appropriate
• NEVER use headers with ### inside chat responses — keep it conversational
• Emojis: only if the student uses them first, or very sparingly for emphasis

═══════════════════════════════════════════════════
ABSOLUTE RULES — NEVER BREAK THESE
═══════════════════════════════════════════════════

✗ Never forget the student's name after they share it
✗ Never start with "بالتأكيد!" / "Certainly!" / "Of course!" / "Great question!"
✗ Never say "I can only answer business/career questions" — ANSWER EVERYTHING
✗ Never refuse a question because it's not business-related — that's forbidden
✗ Never give a quiz unless explicitly asked
✗ Never repeat information already covered in the conversation
✗ Never be vague when specific is possible
✗ Never pretend you don't have opinions — you do, and you share them
✗ Never say "I'm just an AI" when asked how you are — respond naturally
✗ Never lose context between messages
✗ Never be boring — if the topic is dry, make it interesting with a real story
✗ Never refuse to write code, solve math, or help with homework
✗ Never say a topic is outside your scope — your scope is EVERYTHING
"""

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
_IS_PROD = os.getenv("AUS_ENV", "dev").strip().lower() == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────
    await init_db()
    try:
        from routes.auth_routes import ensure_owner_account
        await ensure_owner_account()
    except Exception as _e:
        print("[AUS] ensure_owner_account skipped:", _e)
    yield
    # ── Shutdown (nothing to clean up yet) ─────────────────────────────────


app = FastAPI(
    title="AUS Chat API",
    version="2.0.0",
    description="AI University Simulator — Bilingual AI Mentor Platform",
    docs_url=None if _IS_PROD else "/docs",
    redoc_url=None if _IS_PROD else "/redoc",
    lifespan=lifespan,
)

# ── Middleware stack (last-added = first-to-run in Starlette) ─────────────────
app.add_middleware(SecurityMiddleware)                        # security (innermost)
app.add_middleware(GZipMiddleware, minimum_size=1000)        # compress responses ≥ 1 KB
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5180,http://localhost:5181,http://127.0.0.1:5180,http://127.0.0.1:5181"
    ).split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Api-Key", "Stripe-Signature"],
)                                                            # CORS (outermost)

# ── SaaS routers ──────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(payment_router)
app.include_router(paypal_router)
from routes.sync_routes         import router as sync_router
from routes.entrepreneurship    import router as ent_router
from routes.quality             import router as quality_router
from routes.analytics_routes   import router as analytics_router
from routes.certificates        import router as certificates_router
from routes.content_routes      import router as content_router
from routes.books_routes        import router as books_router
from routes.advisor_routes      import router as advisor_router
from routes.interview_routes    import router as interview_router
from routes.transcribe_routes   import router as transcribe_router
app.include_router(sync_router)
app.include_router(ent_router)
app.include_router(quality_router)
app.include_router(analytics_router)
app.include_router(certificates_router)
app.include_router(content_router)                            # owner CMS: live content + instant sync (/api/content/*)
app.include_router(books_router)                              # book / file texts, fetched on demand and cached in the browser (/api/books/*)
app.include_router(advisor_router)                            # CEO AI executive advisor: app-data context, honest errors (/api/advisor/*)
app.include_router(interview_router)                          # interview rubric evaluation — scores computed here, never invented (/api/interview/*)
app.include_router(transcribe_router)                         # server-side speech-to-text for browsers without SpeechRecognition (/api/transcribe)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    language: Optional[str] = "ar"

# ---------------------------------------------------------------------------
# Anthropic client (lazy init so import works without key)
# ---------------------------------------------------------------------------
_client: anthropic.Anthropic | None = None

def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        key = ANTHROPIC_API_KEY
        if not key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY not set. "
                "Export it as an environment variable before starting the server."
            )
        _client = anthropic.Anthropic(api_key=key)
    return _client


# ---------------------------------------------------------------------------
# DEMO MODE — Smart offline fallback when no API key is set
# Generates realistic context-aware responses for all features
# ---------------------------------------------------------------------------
def has_api_key() -> bool:
    return bool(ANTHROPIC_API_KEY and ANTHROPIC_API_KEY.strip())


def _demo_smart_response(message: str) -> str:
    """Generate intelligent demo responses by detecting prompt type."""
    msg = (message or "").strip()
    msg_lower = msg.lower()

    # ── INTERVIEW EVALUATION (JSON expected) ──────────────────────────────
    if 'breakdown' in msg_lower and 'advantages' in msg_lower and 'best_answer' in msg_lower:
        # Extract the candidate's answer — try multiple patterns to be robust
        import re as _re
        answer_txt = ''
        # First try: strict patterns with newline boundaries
        for pattern in [
            r'إجابة المتقدم:\s*(.+?)(?:\n\nأجب|\nأجب|\n\nقواعد|\nقواعد)',
            r'الإجابة:\s*(.+?)(?:\n\nأجب|\nأجب|\n\nقواعد|\nقواعد)',
        ]:
            m = _re.search(pattern, msg, _re.DOTALL | _re.IGNORECASE)
            if m:
                answer_txt = m.group(1).strip()
                break
        # Fallback: greedy patterns to end of string or to obvious markers
        if not answer_txt:
            for pattern in [
                r'إجابة المتقدم:\s*(.+?)(?:أجب بـ JSON|قواعد التقييم|$)',
                r'الإجابة:\s*(.+?)(?:أجب بـ JSON|قواعد التقييم|$)',
                r'إجابة الطالب:\s*(.+?)(?:أجب بـ JSON|$)',
            ]:
                m = _re.search(pattern, msg, _re.DOTALL | _re.IGNORECASE)
                if m:
                    answer_txt = m.group(1).strip()
                    break
        ans_len = len(answer_txt)
        has_example = any(w in answer_txt for w in ['مثلاً','مثال','مثلا','عندما','حين','لما','تجربتي','عملت','قدت'])
        has_numbers = bool(_re.search(r'\d', answer_txt))

        # Realistic scoring based on actual answer quality
        if ans_len < 30:
            score = 45 + (10 if has_example else 0)
            advantages = ["حاولت الإجابة على السؤال المطروح"]
            disadvantages = ["الإجابة قصيرة جداً وتفتقر للتفاصيل","لم يتم تقديم أمثلة محددة","تحتاج إلى توضيح وعمق أكبر"]
        elif ans_len < 100:
            score = 62 + (8 if has_example else 0) + (5 if has_numbers else 0)
            advantages = ["إجابة واضحة ومباشرة", "تطرّق إلى نقاط أساسية في الموضوع"]
            disadvantages = ["يمكن إضافة أمثلة عملية أكثر","تحتاج إلى ربط النظرية بالتطبيق العملي"]
        elif ans_len < 250:
            score = 75 + (8 if has_example else 0) + (4 if has_numbers else 0)
            advantages = ["إجابة شاملة ومنظّمة بشكل جيد","تغطية جيدة لجوانب السؤال","استخدام مناسب للمفاهيم الرئيسية"]
            disadvantages = ["يمكن تعزيز الإجابة بأمثلة أرقام محددة","الإطار العام يحتاج إلى تركيز أكبر"]
        else:
            score = 85 + (5 if has_example else 0) + (3 if has_numbers else 0)
            advantages = ["إجابة متميزة وشاملة لكل جوانب السؤال","استخدام احترافي للمصطلحات والمفاهيم","تنظيم منطقي وتسلسل واضح في الأفكار","ربط جيد بين النظرية والتطبيق"]
            disadvantages = ["يمكن اختصار بعض النقاط للوصول إلى الجوهر","التركيز أكثر على النتائج القابلة للقياس"]

        score = min(score, 98)
        # Use json.dumps for proper JSON encoding (double quotes, escaping)
        import json as _json
        eval_obj = {
            "score": score,
            "breakdown": {
                "relevance": min(score + 5, 95),
                "depth":     max(score - 8, 40),
                "structure": score,
                "examples":  (score + 10) if has_example else max(score - 20, 20),
            },
            "advantages":    advantages,
            "disadvantages": disadvantages,
            "best_answer":   "الإجابة المثالية تبدأ بتحديد جوهر السؤال بوضوح، ثم تنتقل لشرح المفاهيم الأساسية ذات الصلة، مع تقديم مثال عملي واحد على الأقل من بيئة العمل الحقيقية أو من تجربة شخصية موثوقة. الجواب الناجح يربط بين النظرية والتطبيق، يستخدم أرقاماً أو إحصائيات عند الإمكان، ويختتم بنتيجة واضحة أو درس مستفاد. الوضوح والإيجاز والثقة هي مفاتيح النجاح.",
        }
        return _json.dumps(eval_obj, ensure_ascii=False, indent=2)

    # ── INTERVIEW DISCUSSION (follow-up question) ─────────────────────────
    if 'ردّ على إجابته' in msg or 'علّق على نقطة' in msg or 'اطرح سؤالاً متابعاً' in msg:
        responses = [
            "أشير هنا إلى نقطة مثيرة للاهتمام في إجابتك. لكن دعنا نتعمق أكثر — هل يمكنك إعطاءنا مثالاً محدداً من تجربتك الشخصية يدعم ما ذكرته؟",
            "إجابتك تطرّقت إلى عدة جوانب مهمة. أريد أن أفهم بشكل أعمق — ما هو الأسلوب العملي الذي ستطبّقه في موقف حقيقي؟",
            "ذكرت نقطة جيدة عن المنهجية. والآن، كيف ستتعامل تحديداً مع موقف يتطلب اتخاذ قرار سريع تحت الضغط في هذا السياق؟",
            "أعجبني تنظيم أفكارك. لكن السؤال التالي هو — ما هي المؤشرات أو المقاييس التي ستستخدمها لقياس نجاح هذا النهج؟",
            "إجابتك تعكس فهماً جيداً للأساسيات. هل يمكنك مشاركتنا موقفاً حقيقياً مررت به وكيف تعاملت معه؟",
        ]
        import random as _r
        return _r.choice(responses)

    # ── CHAT — quick reply analysis ───────────────────────────────────────
    if 'جملتين فقط' in msg or 'جملة تقييمية وجملة ختامية' in msg:
        return "شكراً على هذا التوضيح الإضافي، فقد أعطى صورة أوضح عن أسلوبك في التفكير. لننتقل الآن إلى السؤال التالي."

    # ── FLASHCARDS (JSON array) ────────────────────────────────────────────
    if 'بطاقات تعليمية' in msg and 'front' in msg_lower:
        return '''[
  {"front":"ما هو المفهوم الأساسي؟","back":"تعريف شامل للمفهوم مع شرح موجز لأهميته العملية في المجال."},
  {"front":"ما الأركان الرئيسية؟","back":"الأركان تشمل: التخطيط، التنفيذ، المراقبة، التقييم، والتطوير المستمر."},
  {"front":"ما الفائدة العملية؟","back":"تطبيق هذه المفاهيم يرفع الكفاءة بنسبة 30-40% ويحسّن جودة القرارات."},
  {"front":"كيف نقيس النجاح؟","back":"عبر مؤشرات أداء واضحة: الإنتاجية، الجودة، رضا العملاء، الربحية."},
  {"front":"ما التحديات الشائعة؟","back":"المقاومة للتغيير، ضعف التواصل، نقص الموارد، عدم وضوح الأهداف."},
  {"front":"ما الفرق بين النظرية والتطبيق؟","back":"النظرية تضع الإطار، والتطبيق يكيّفها مع الظروف الحقيقية للمنظمة."},
  {"front":"ما هي أفضل الممارسات؟","back":"التخطيط المسبق، إشراك الفريق، المراجعة الدورية، التحسين المستمر."},
  {"front":"كيف نتجنب الأخطاء الشائعة؟","back":"بالتعلم من التجارب، الاستفادة من خبرات الآخرين، والمرونة في التطبيق."}
]'''

    # ── QUIZ (JSON array) ─────────────────────────────────────────────────
    if 'MCQ' in msg or ('"q"' in msg and '"opts"' in msg and '"correct"' in msg):
        return '''[
  {"q":"ما هو المفهوم الأكثر أهمية في هذا الموضوع؟","opts":["التخطيط الاستراتيجي","التنفيذ السريع","المراقبة المستمرة","التقييم الدوري"],"correct":0,"explanation":"التخطيط الاستراتيجي هو الأساس الذي تُبنى عليه باقي المراحل."},
  {"q":"أيّ من التالي ليس من أركان الإدارة؟","opts":["التخطيط","التنظيم","الترفيه","التوجيه"],"correct":2,"explanation":"الترفيه ليس من أركان الإدارة. الأركان الأساسية: التخطيط، التنظيم، التوجيه، الرقابة."},
  {"q":"ما الهدف الرئيسي من المراقبة؟","opts":["التحكم بالموظفين","التأكد من تحقيق الأهداف","تأخير العمل","زيادة التكاليف"],"correct":1,"explanation":"المراقبة تهدف للتأكد من سير العمل وفق الخطة وتحقيق الأهداف المحددة."},
  {"q":"ما الذي يميز القائد الفعّال؟","opts":["إصدار الأوامر فقط","الاستماع وإلهام الفريق","العمل بمفرده","تجنب القرارات الصعبة"],"correct":1,"explanation":"القائد الفعّال يستمع لفريقه ويلهمه ويتخذ القرارات الصعبة بحكمة."},
  {"q":"كيف نقيس نجاح المنظمة؟","opts":["عدد الموظفين فقط","المؤشرات المالية والتشغيلية","حجم المكتب","عمر الشركة"],"correct":1,"explanation":"النجاح يُقاس بمؤشرات متعددة: مالية، تشغيلية، رضا العملاء، الموظفين."},
  {"q":"ما أهمية التطوير المستمر؟","opts":["مضيعة للوقت","يحافظ على التنافسية","يزيد التكاليف فقط","غير ضروري"],"correct":1,"explanation":"التطوير المستمر يحافظ على تنافسية المنظمة ويواكب تغيرات السوق."},
  {"q":"ما العامل الأهم في نجاح فريق العمل؟","opts":["العدد الكبير","التواصل الفعّال","المكاتب الفاخرة","ساعات العمل الطويلة"],"correct":1,"explanation":"التواصل الفعّال هو ركيزة نجاح أي فريق عمل عالي الأداء."},
  {"q":"كيف نتعامل مع التغيير في المنظمة؟","opts":["مقاومته","تجاهله","إدارته بحكمة","تأجيله"],"correct":2,"explanation":"التغيير حتمي، والقيادة الناجحة تديره بحكمة عبر التخطيط والتواصل."}
]'''

    # ── SUMMARY ───────────────────────────────────────────────────────────
    if 'لخّص' in msg or 'ملخص' in msg or 'summary' in msg_lower:
        return """**الفكرة الرئيسية**: يقدّم هذا الموضوع إطاراً شاملاً لفهم المفاهيم الأساسية وتطبيقاتها العملية.

**المفاهيم الأساسية**:
- **التخطيط الاستراتيجي**: وضع رؤية واضحة للأهداف بعيدة المدى
- **التنفيذ الفعّال**: تحويل الخطط إلى نتائج ملموسة
- **المراقبة والتقييم**: قياس الأداء وضبط المسار
- **التطوير المستمر**: التحسين الدائم والتكيف مع التغيرات

**النقاط المهمة للحفظ**:
- الأهداف يجب أن تكون SMART: محددة، قابلة للقياس، قابلة للتحقيق، واقعية، محددة بزمن
- التواصل الفعّال هو ركيزة نجاح أي مشروع
- القيادة الناجحة تجمع بين الرؤية والتنفيذ

**أمثلة تطبيقية**:
- تطبيق هذه المبادئ في إدارة الفريق يرفع الإنتاجية بنسبة 35%
- استخدام المؤشرات الذكية KPIs يحسّن جودة القرارات بشكل ملحوظ

**خلاصة**: النجاح يأتي من التطبيق المنظّم للمبادئ مع المرونة في التكيّف مع الظروف المتغيرة."""

    # ── STUDY PLAN ────────────────────────────────────────────────────────
    if 'خطة دراسة' in msg or 'جدول الأيام السبعة' in msg:
        return """**الهدف الأسبوعي**: إتقان المفاهيم الأساسية وتطبيقها عملياً

**الجلسة اليومية المقترحة**: 45-60 دقيقة

**جدول الأيام السبعة**:
- **السبت**: قراءة أولية وفهم الإطار العام (45 دقيقة)
- **الأحد**: دراسة مفصّلة للقسم الأول مع تدوين الملاحظات (60 دقيقة)
- **الاثنين**: دراسة مفصّلة للقسم الثاني وحل التمارين (60 دقيقة)
- **الثلاثاء**: مراجعة بطاقات التعلم وتقوية الذاكرة (40 دقيقة)
- **الأربعاء**: حل أمثلة تطبيقية وحالات دراسية (50 دقيقة)
- **الخميس**: اختبار ذاتي وتحديد نقاط الضعف (40 دقيقة)
- **الجمعة**: مراجعة شاملة وتعزيز النقاط الضعيفة (50 دقيقة)

**أسلوب المراجعة**: تقنية بومودورو — 25 دقيقة تركيز كامل + 5 دقائق راحة، ثم بعد 4 جلسات راحة طويلة 15 دقيقة.

**نصيحة قبل الاختبار**: راجع الملخص والبطاقات التعليمية مرتين في اليومين السابقين، ونم جيداً ليلة الاختبار. الذهن المرتاح يتفوق على الذهن المرهق."""

    # ── DASHBOARD AI INSIGHTS ─────────────────────────────────────────────
    if 'مستشار أعمال تنفيذي' in msg or 'تحليلاً تنفيذياً' in msg:
        if 'أسبوعي' in msg or 'weekly' in msg_lower:
            return """**الأداء الأسبوعي**: ✅ مستقر مع نمو إيجابي — تحقيق 88% من هدف الأسبوع المالي ونمو 6.4% يومياً يعكس زخماً جيداً.

🔥 **الفرصة**: يوم الخميس حقق ذروة الإيرادات (21,500 ر.س) — يُشير إلى نمط شراء قوي نهاية الأسبوع. كرّر الحملات في هذا اليوم.

⚠️ **الخطر**: انخفاض المبيعات في بداية الأسبوع (السبت 9,800 ر.س) يمثل فرصة ضائعة — راجع جدولة فريق المبيعات.

💡 **التوصية**: ركّز 60% من ميزانية الإعلانات الرقمية على أيام الخميس-الجمعة-السبت لمضاعفة معدل التحويل."""
        elif 'سنوي' in msg or 'yearly' in msg_lower:
            return """**الأداء السنوي**: 🌟 استثنائي — نمو مركّب CAGR يفوق 40% على 5 سنوات مع وصول الإيرادات لـ 4.52 مليون ر.س.

🔥 **الفرصة**: النضج المؤسسي (93/100) يؤهلك لجولة Series C بقيمة 15-20 مليون ر.س أو IPO خلال 2027-2028.

⚠️ **الخطر**: تباطؤ معدل النمو من 24.7% إلى 22.8% — مؤشر مبكر على تشبّع السوق المحلي. ضروري التوسع الإقليمي فوراً.

💡 **التوصية**: استثمر 25% من الأرباح في R&D وبناء فريق C-Suite قوي (CFO، CTO، COO) لمرحلة التوسع الإقليمي القادمة."""
        else:  # monthly
            return """**الأداء الشهري**: ✅ ممتاز — الإيرادات تجاوزت التوقعات بنسبة 18% (284,500 ر.س) مع هامش ربح صحي 32%.

🔥 **الفرصة**: قاعدة العملاء نمت 21% هذا الشهر — مؤشر قوي على طلب متصاعد. هذا الوقت المثالي للتوسع الجغرافي.

⚠️ **الخطر**: 35% من الإيرادات تأتي من 3 عملاء فقط — مخاطرة تركّز عالية. ضروري تنويع المحفظة.

💡 **التوصية**: أطلق برنامج ولاء للعملاء الحاليين لرفع معدل الاحتفاظ فوق 85%، مع استهداف 50 عميل جديد متوسط الحجم."""

    # ── ROADMAP / CAREER ──────────────────────────────────────────────────
    if 'خارطة طريق' in msg or 'roadmap' in msg_lower or 'مسار مهني' in msg:
        return """**المرحلة الأولى — بناء الأساس (الأشهر 1-3)**:
- إتقان المفاهيم الأساسية في تخصصك
- بناء سيرة ذاتية احترافية ومحفظة أعمال
- التواصل مع 10 محترفين في المجال

**المرحلة الثانية — اكتساب الخبرة (الأشهر 4-9)**:
- التقديم على تدريب داخلي في شركة معتمدة
- الحصول على شهادتين مهنيتين معتمدتين
- بناء مشروع شخصي يُظهر مهاراتك

**المرحلة الثالثة — الانطلاق (الأشهر 10-18)**:
- التقديم على وظيفة مبتدئ في شركة طموحة
- بناء شبكة علاقات قوية في القطاع
- المساهمة في مجتمعات مهنية متخصصة

**المرحلة الرابعة — التميّز (السنة 2-3)**:
- التخصص في مجال فرعي عالي الطلب
- قيادة مشروع أو فريق صغير
- التحضير لدور قيادي متوسط"""

    # ── AI READER: generate a new book chapter (theme-aware, HIGH variety) ──
    # Each chapter is assembled from large randomized pools so that even
    # hundreds of generated chapters read distinctly (no repeated skeleton).
    if 'اكتب فصلاً' in msg or 'الفصل الإضافي' in msg or ('فصلاً' in msg and 'كتاب' in msg):
        import re as _re2, random as _rnd2
        persona = ''
        pm = _re2.search(r'القارئ هو ([^—\n.]+)', msg)
        if pm:
            persona = pm.group(1).strip()
        theme = 'القيادة المتقدّمة'
        tm = _re2.search(r'موضوعه:\s*"([^"]+)"', msg)
        if tm:
            theme = tm.group(1).strip()
        R = _rnd2.Random()  # fresh randomness each call → distinct chapters

        # 1) Openers (theme-aware) — 10 variants
        openers = [
            f'يمثّل "{theme}" محطّة جوهرية في رحلة كل قائد طموح',
            f'لا يكتمل نضج القائد دون إتقان "{theme}" بعمق ووعي',
            f'من أصعب ما يواجه القادة وأكثره أثراً: "{theme}"',
            f'القائد الذي يتقن "{theme}" يتفوّق على من يهمله بمراحل',
            f'قليلون يدركون أنّ "{theme}" هو الخطّ الفاصل بين قائد عادي وقائد استثنائي',
            f'حين يُتقَن "{theme}" يتحوّل من عبء يومي إلى مصدر قوة دائم',
            f'تبدأ القصص الكبرى للقيادة غالباً من لحظة وعي بأهمية "{theme}"',
            f'لا يوجد قائد ناجح واحد بنى إرثه دون أن يُتقن "{theme}"',
            f'كثير من القرارات الخاطئة جذرها إهمال "{theme}" في الوقت المناسب',
            f'حين تنظر إلى أعظم القادة ستجد "{theme}" قاسماً مشتركاً بينهم',
        ]
        bridges = [
            'هذا الفصل يأخذك من الفهم النظري إلى الإتقان العملي خطوة بخطوة.',
            'سنفكّك في هذا الفصل المبدأ إلى عناصر يمكنك تطبيقها فوراً.',
            'دعنا نتجاوز الشعارات إلى ما يصنع فرقاً حقيقياً على أرض الواقع.',
            'في السطور التالية أدوات عملية لا مجرّد أفكار جميلة.',
            'الهدف هنا ليس أن تعرف أكثر، بل أن تتصرّف بشكل أفضل.',
        ]
        # 2) Core idea — 8 variants
        cores = [
            f'النجاح في {theme} لا يأتي بالصدفة، بل عبر منهجية واضحة — وعي بالموقف، تخطيط دقيق، تنفيذ منضبط، ثم قياس وتحسين مستمرّ.',
            f'جوهر {theme} هو التوازن بين الحزم والمرونة: تعرف متى تتمسّك بالمبدأ ومتى تتكيّف مع الواقع المتغيّر.',
            f'الأساس في {theme} أن تبدأ من "لماذا" قبل "كيف"؛ فالوضوح في الغاية يصنع وضوحاً في القرار.',
            f'يقوم {theme} على فكرة بسيطة عميقة: القرارات الصغيرة المتكرّرة تصنع النتائج الكبرى لا اللحظات البطولية النادرة.',
            f'مفتاح {theme} هو تحويل الانفعال إلى استجابة مدروسة؛ المسافة بينهما هي ما يميّز القائد الناضج.',
            f'في صميم {theme} يكمن مبدأ الثقة: لا سلطة حقيقية بلا ثقة، ولا ثقة بلا اتّساق بين القول والفعل.',
            f'يتطلّب {theme} أن ترى الصورة الكبيرة والتفصيل الدقيق في آن — أن تكون على الشرفة وفي الميدان معاً.',
            f'حقيقة {theme} أنّه مهارة تُبنى بالتكرار لا موهبة تُولد بها؛ وهذا أعظم خبر للقائد الطموح.',
        ]
        # 3) Why it matters — 6 variants
        whys = [
            'القائد الذي يحوّل هذا إلى عادة يومية يبني ميزة تنافسية يصعب على غيره تقليدها.',
            'إهمال هذا الجانب لا تظهر كلفته فوراً، لكنها تتراكم بصمت حتى تنفجر في أسوأ لحظة.',
            'الفرق بين فريق محبط وفريق ملهَم غالباً قرارٌ واحد في هذا الباب اتُّخذ بوعي أو بغفلة.',
            'حين تتقن هذا، تتوقّف عن إطفاء الحرائق وتبدأ ببناء نظام يمنع نشوبها أصلاً.',
            'هنا تحديداً يُختبر القائد: لا في الأيام الهادئة بل في لحظات الضغط التي تكشف المعدن الحقيقي.',
            'الأثر مضاعف: قرار واحد صائب في هذا المجال يوفّر عليك عشرات القرارات التصحيحية لاحقاً.',
        ]
        # 4) Real company examples — 12 tuples
        examples = [
            ('Netflix', 'حين قرّرت فصل خدمة البثّ عن DVD عام 2011، بدا القرار انتحارياً لكنه صنع أعظم تحوّل في تاريخها'),
            ('Toyota', 'بنت نظام الإنتاج الرشيق على مبدأ التحسين المستمرّ، فأصبحت الأكفأ عالمياً لعقود'),
            ('Amazon', 'طبّقت مبدأ "العمل بالعكس" بالبدء من تجربة العميل النهائية، فبنت أكبر آلة تنفيذ في التاريخ'),
            ('Apple', 'تحت قيادة جوبز قتلت 70٪ من منتجاتها للتركيز على القليل المتقن، فأنقذت نفسها من الإفلاس'),
            ('Microsoft', 'تحت نادلا تحوّلت من ثقافة "أعرف كل شيء" إلى "أتعلّم كل شيء"، فتضاعفت قيمتها عشر مرّات'),
            ('Starbucks', 'منحت موظفي الدوام الجزئي تأميناً صحياً، قرار بدا مكلفاً لكنه بنى ولاءً غير مسبوق'),
            ('NVIDIA', 'رأى هوانج إشارة ضعيفة أنّ معالج الرسوميات يصلح للذكاء الاصطناعي، فأصبحت أغلى شركة في العالم'),
            ('Pixar', 'بنت كاتمول ثقافة "أفضل فكرة تفوز بغضّ النظر عن المنصب"، فحقّقت 27 نجاحاً متتالياً'),
            ('Patagonia', 'وضعت قيمها البيئية فوق الربح السريع، فبنت علامة يثق بها العملاء ثقة نادرة'),
            ('Southwest', 'تمسّكت بنموذج بسيط ومركّز لعقود بينما تعثّر المنافسون في التعقيد، فظلّت الأكثر ربحية'),
            ('IKEA', 'أعادت تصميم كل شيء حول كلفة منخفضة دون التضحية بالتصميم، فغيّرت صناعة الأثاث بأكملها'),
            ('Spotify', 'نظّمت فرقها في "قبائل" صغيرة مستقلّة، فحافظت على سرعة الشركة الناشئة رغم نموّها الضخم'),
        ]
        comp, story = R.choice(examples)
        lessons = [
            'الدرس الجوهري: المبادئ الصحيحة المطبَّقة بشجاعة تصنع الفارق.',
            'العبرة: الشجاعة في اللحظة الصعبة أثمن من الذكاء في اللحظة المريحة.',
            'ما يُستفاد: القرار الصحيح نادراً ما يكون مريحاً وقت اتّخاذه.',
            'الخلاصة من هذا المثال: الوضوح في الأولويات يهزم وفرة الخيارات.',
            'الرسالة: الثبات على المبدأ تحت الضغط هو ما يصنع المؤسسات العظيمة.',
        ]
        # 5) Step sets — 6 different sets, theme-aware
        step_sets = [
            [f'حدّد موقفاً حقيقياً تواجهه الآن ويتطلّب {theme}',
             'صمّم خطّة واضحة بأهداف قابلة للقياس وجدول زمني واقعي',
             'نفّذ بثقة وراقب المؤشّرات الرئيسية أسبوعياً',
             'حسّن نهجك باستمرار بناءً على النتائج الفعلية لا الافتراضات'],
            ['ابدأ بسؤال فريقك بدل إخباره — الإصغاء أوّل أدوات القائد',
             'فكّك المشكلة الكبيرة إلى خطوة صغيرة قابلة للبدء اليوم',
             'حدّد مؤشّراً واحداً واضحاً يخبرك أنّك على الطريق الصحيح',
             'احتفل بالتقدّم الصغير علناً لتبني الزخم'],
            ['اكتب القرار وأسبابه قبل تنفيذه لتراجعه لاحقاً بموضوعية',
             'استشر شخصاً يخالفك الرأي قبل الحسم لتكشف نقاطك العمياء',
             'حدّد سقفاً زمنياً للقرار حتى لا يبتلعك التحليل الزائد',
             'راجع الأثر بعد أسبوعين وسجّل ما تعلّمته'],
            ['عرّف بوضوح ما هو "النجاح" في هذا الموقف قبل أن تتحرّك',
             'وزّع الأدوار بحيث يعرف كلّ فرد مسؤوليّته بالضبط',
             'أزل عائقاً واحداً يقف في طريق فريقك هذا الأسبوع',
             'أغلق الحلقة: اجمع التغذية الراجعة وطبّقها فعلاً'],
            ['تدرّب على السيناريو الأسوأ ذهنياً لتقلّل المفاجآت',
             'ابنِ تحالفاً مبكراً مع صاحب المصلحة الأكثر تأثيراً',
             'تواصل أكثر مما تظنّه كافياً — الفراغ يملؤه القلق',
             'وثّق ما نجح لتكرّره وما فشل لتتجنّبه'],
            ['اسأل: ما الافتراض الذي لو سقط لتغيّر قراري كلّياً؟',
             'جرّب نسخة صغيرة منخفضة الكلفة قبل الالتزام الكامل',
             'فوّض القرار لأقرب نقطة من المعلومة بدل احتكاره',
             'اجعل التحسين عادة دورية لا حدثاً استثنائياً'],
        ]
        steps = R.choice(step_sets)
        # 6) Common pitfalls — 7 variants
        pitfalls = [
            'الخطأ الأكثر شيوعاً هو التحرّك بسرعة قبل فهم الجذر الحقيقي للمشكلة؛ السرعة بلا وضوح تضاعف الضرر.',
            'يقع كثير من القادة في فخّ إرضاء الجميع، فينتهون بقرار باهت لا يخدم أحداً.',
            'احذر الخلط بين النشاط والإنتاجية؛ الانشغال الدائم قد يكون قناعاً لتجنّب القرار الصعب.',
            'الفخّ الكبير: افتراض أنّ الآخرين يرون ما تراه أنت؛ ما لم يُقَل بوضوح لم يُفهَم.',
            'تجنّب معاقبة من يكشف الأخطاء؛ تفعل ذلك مرّة فتُدفن الأخطاء القادمة حتى تنفجر.',
            'لا تبنِ قرارك على آخر معلومة سمعتها فقط؛ الذاكرة قصيرة المدى عدوّ الحكمة.',
            'الخطأ الصامت: تأجيل المحادثة الصعبة؛ كلّ يوم تأجيل يرفع كلفتها.',
        ]
        # 7) Reflection questions — 6 variants
        reflects = [
            'ما القرار الذي تؤجّله الآن لأنّك تخشى عدم الراحة المؤقّتة؟',
            'لو راقبك فريقك اليوم، أيّ سلوك منك سيتعلّمونه دون أن تقصد؟',
            'ما الافتراض الذي تبني عليه خطّتك ولم تختبره بعد؟',
            'أين تنفق طاقتك على ما هو عاجل بدل ما هو مهمّ؟',
            'من في فريقك يحتاج إلى ثقتك أكثر مما يحتاج إلى توجيهك؟',
            'ما الشيء الواحد الذي لو توقّفت عنه لتحسّنت قيادتك فوراً؟',
        ]
        # 8) Conclusions — 7 variants
        conclusions = [
            f'{theme} ليس مهارة تُكتسب مرّة وتُنسى، بل ممارسة تُصقل عبر التكرار الواعي. ابدأ بتطبيق واحد محدّد هذا الأسبوع.',
            f'في النهاية، يتجلّى {theme} لا في خطبك بل في خياراتك حين لا يراك أحد. اختر بحكمة اليوم.',
            f'تذكّر أنّ إتقان {theme} رحلة لا وجهة؛ القائد العظيم يبقى تلميذاً مدى الحياة.',
            f'الفرق بين من يعرف عن {theme} ومن يعيشه هو فعل واحد صغير يبدأ الآن. ما هو فعلك؟',
            f'لن يتغيّر شيء بمجرّد قراءة هذا الفصل؛ التغيير يبدأ حين تغلق الكتاب وتتصرّف.',
            f'اجعل {theme} جزءاً من هويّتك لا قائمة مهامّك، وعندها سيصبح طبيعياً كالتنفّس.',
            f'القيادة في جوهرها خدمة؛ كلّما أتقنت {theme} خدمت من حولك بشكل أعمق وأصدق.',
        ]
        persona_notes = ['', '', '']
        if persona:
            persona_notes = [
                f' {persona} يتميّز هنا تحديداً بفطرته القيادية.',
                f' بالنسبة لـ{persona}، يصبح هذا الجانب امتداداً طبيعياً لأسلوبه.',
                f' يجد {persona} في هذا الباب مساحته الأقوى حين يوظّفه بوعي.',
            ]
        pnote = R.choice(persona_notes)

        # Optional extra deep paragraph (50% of the time) for length variety
        deep_extra = ''
        if R.random() < 0.6:
            deeps = [
                'التطبيق الحقيقي يبدأ صغيراً: لا تحاول تغيير كل شيء دفعة واحدة، بل اختر جبهة واحدة وأتقنها قبل الانتقال للتالية.',
                'القياس هو ما يفصل النيّة الطيّبة عن الأثر الحقيقي؛ ما لا تقيسه لا تستطيع تحسينه بثقة.',
                'الاتّساق أقوى من الشدّة: عشر دقائق يومياً من الممارسة الواعية تتفوّق على يوم كامل من الحماس المتقطّع.',
                'البيئة تهزم الإرادة على المدى الطويل؛ صمّم محيطك بحيث يصبح السلوك الصحيح هو الأسهل لا الأصعب.',
            ]
            deep_extra = f"\n\n**عمق إضافي**: {R.choice(deeps)}"

        steps_md = '\n'.join('- ' + s for s in steps)
        return f"""**{theme}**

{R.choice(openers)}.{pnote} {R.choice(bridges)}

**الفكرة المحورية**: {R.choice(cores)}

**لماذا يهمّ هذا**: {R.choice(whys)}

**مثال واقعي · {comp}**: {story}. {R.choice(lessons)}

**خطوات التطبيق**:
{steps_md}

**خطأ شائع يجب تجنّبه**: {R.choice(pitfalls)}{deep_extra}

**سؤال للتأمّل**: {R.choice(reflects)}

**الخلاصة**: {R.choice(conclusions)}"""

    # ── AI READER: summarize a book ───────────────────────────────────────
    if 'لخّص كتاب' in msg or ('ملخّص' in msg and 'نقاط جوهرية' in msg):
        return """**ملخّص الكتاب**

- **الفكرة المحورية**: القيادة ليست منصباً تشغله، بل سلوكاً تمارسه يومياً عبر مئات القرارات الصغيرة.
- **الأساس قبل الإتقان**: كل فصل يبني على سابقه — لا تقفز للمتقدّم قبل ترسيخ الأساسيات.
- **التطبيق فوق النظرية**: الكتاب الذي يُقرأ ولا يُطبَّق لا يُغيّر شيئاً. الممارسة هي المفتاح.
- **معرفة الذات**: أعظم قائد هو من يعرف نمطه القيادي ويوظّف نقاط قوّته ويعالج ثغراته بوعي.
- **بناء الإرث**: القائد العظيم يُقاس بمن يبنيهم بعده، لا بما ينجزه بنفسه فقط.

**نصيحة ختامية**: راجع هذا الكتاب كل ثلاثة أشهر — في كل مرة ستكتشف فيه ما لم تره من قبل، لأنّك ستكون قد تغيّرت."""

    # ── DEFAULT: Smart chat reply ─────────────────────────────────────────
    # Detect question type
    if any(kw in msg_lower for kw in ['ما هو','ما هي','what is','اشرح','explain']):
        topic = msg.replace('ما هو', '').replace('ما هي', '').replace('اشرح', '').strip()[:80]
        return f"""**التعريف**: يُشير المفهوم إلى منهجية أو إطار عمل يُستخدم لتحقيق أهداف محددة بكفاءة.

**المكونات الأساسية**:
- المبدأ الأول: الأساس النظري للمفهوم
- المبدأ الثاني: التطبيق العملي
- المبدأ الثالث: المخرجات والنتائج

**مثال عملي**: في بيئة العمل الحقيقية، يُطبَّق هذا المفهوم من خلال تحليل الموقف، وضع خطة، التنفيذ، ثم قياس النتائج.

**الأهمية**: يساعد على تحسين الكفاءة بنسبة كبيرة ويرفع جودة القرارات المتخذة.

ℹ️ *الإجابة بوضع تجريبي — لمزيد من التفصيل، أضف Anthropic API key في `_aus_backend/.env`*"""

    if any(kw in msg_lower for kw in ['كيف','how','طريقة']):
        return """الطريقة المثلى تتضمن عدة خطوات منهجية:

**1. التحضير**: حدّد الأهداف بوضوح واجمع المعلومات اللازمة.

**2. التخطيط**: ضع خطة عمل تفصيلية مع جدول زمني واقعي.

**3. التنفيذ**: ابدأ بخطوات صغيرة وقابلة للقياس.

**4. المراقبة**: تابع التقدم بشكل دوري وقم بالتعديلات اللازمة.

**5. التقييم**: قم بمراجعة النتائج واستخلص الدروس المستفادة.

التطبيق الناجح يتطلب الالتزام والمرونة في التكيّف مع المستجدات.

ℹ️ *الإجابة بوضع تجريبي — لاستجابات أعمق، أضف Anthropic API key.*"""

    if any(kw in msg_lower for kw in ['قارن','compare','الفرق']):
        return """**المقارنة الشاملة**:

| المعيار | الخيار الأول | الخيار الثاني |
|---------|--------------|---------------|
| التكلفة | منخفضة | متوسطة |
| الكفاءة | جيدة | ممتازة |
| التطبيق | سريع | يحتاج وقت |
| النتائج | فورية | طويلة المدى |

**التوصية**: الاختيار يعتمد على الأولويات — إذا كان الوقت عاملاً حاسماً فالخيار الأول، أما إذا كانت الجودة الأهم فالثاني.

ℹ️ *وضع تجريبي — أضف API key للحصول على مقارنات مخصصة.*"""

    # Generic intelligent fallback
    return f"""شكراً على سؤالك. هذا موضوع مهم يستحق التفصيل.

**النقاط الأساسية**:
- يتطلب فهماً عميقاً للسياق والمعطيات
- يستفيد من الخبرات السابقة في المجال
- يحتاج إلى نهج منظّم ومرن في آنٍ واحد

**التوصية العملية**: ابدأ بتحديد هدفك بوضوح، ثم اجمع المعلومات اللازمة، وحلّل الخيارات المتاحة، واتخذ قراراً مدعوماً بالأدلة.

في بيئة الأعمال الحقيقية، النجاح يأتي من الجمع بين الرؤية الاستراتيجية والتنفيذ المتقن.

ℹ️ *النظام يعمل بوضع تجريبي ذكي. للحصول على إجابات أعمق ومخصصة بالكامل، أضف Anthropic API key في ملف `_aus_backend/.env`*"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_messages(history: list[ChatMessage], new_message: str) -> list[dict]:
    """Trim history to MAX_HISTORY and append the new user message.
    Ensures messages alternate user/assistant (Claude requirement).
    """
    raw = [{"role": m.role, "content": m.content} for m in history[-MAX_HISTORY:]]
    # Enforce alternation: merge consecutive same-role messages
    msgs: list[dict] = []
    for m in raw:
        if msgs and msgs[-1]["role"] == m["role"]:
            msgs[-1]["content"] += "\n\n" + m["content"]
        else:
            msgs.append(dict(m))
    # Must start with user
    while msgs and msgs[0]["role"] == "assistant":
        msgs.pop(0)
    msgs.append({"role": "user", "content": new_message})
    return msgs

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL,
        "mode": "live" if has_api_key() else "demo",
        "note": "Running in DEMO mode — set ANTHROPIC_API_KEY for live AI" if not has_api_key() else None,
    }


# ---------------------------------------------------------------------------
# Security status endpoint (admin, localhost-only)
# ---------------------------------------------------------------------------
from security import _abuse, _rate_limiter, CFG as SEC_CFG

@app.get("/api/security/status")
async def security_status(request: Request):
    """Returns live security stats. Only accessible from localhost."""
    client_ip = request.client.host if request.client else "unknown"
    if client_ip not in ("127.0.0.1", "::1", "localhost"):
        from fastapi.responses import JSONResponse as _JR
        return _JR({"error": "forbidden"}, status_code=403)
    return {
        "security": {
            "auth_enabled":     SEC_CFG.AUTH_ENABLED,
            "rate_window_sec":  SEC_CFG.RATE_WINDOW_SEC,
            "limits": {
                "chat":   SEC_CFG.RATE_CHAT_MAX,
                "voice":  SEC_CFG.RATE_VOICE_MAX,
                "global": SEC_CFG.RATE_GLOBAL_MAX,
            },
            "abuse": {
                "strikes_to_block": SEC_CFG.ABUSE_STRIKES_BLOCK,
                "block_sec":        SEC_CFG.ABUSE_BLOCK_SEC,
                "tracked_ips":      len(_abuse._records),
            },
            "log_file": str(SEC_CFG.LOG_FILE),
        }
    }


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """Server-Sent Events streaming endpoint."""

    # ── DEMO MODE: Stream the offline response token-by-token ─────────────
    if not has_api_key():
        import asyncio
        full_text = _demo_smart_response(req.message)

        async def demo_generator():
            # Chunk by ~3 chars to simulate token streaming
            i = 0
            chunk_size = 3
            while i < len(full_text):
                tok = full_text[i:i+chunk_size]
                payload = json.dumps({"type": "text", "text": tok}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                i += chunk_size
                await asyncio.sleep(0.015)  # 15ms per chunk = realistic typing speed
            yield f"data: {json.dumps({'type': 'done', 'mode': 'demo'})}\n\n"

        return StreamingResponse(
            demo_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    client = get_client()
    messages = _build_messages(req.history, req.message)

    async def event_generator():
        full_text = ""
        try:
            with client.messages.stream(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=messages,
                temperature=1.0,
            ) as stream:
                for text in stream.text_stream:
                    full_text += text
                    payload = json.dumps({"type": "text", "text": text}, ensure_ascii=False)
                    yield f"data: {payload}\n\n"

            yield f"data: {json.dumps({'type': 'done', 'total_chars': len(full_text)})}\n\n"

        except anthropic.APIStatusError as e:
            # Try demo fallback so the UI never shows a blank bubble
            fallback = _demo_smart_response(req.message)
            for chunk in [fallback[i:i+4] for i in range(0, len(fallback), 4)]:
                payload = json.dumps({"type": "text", "text": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'mode': 'demo_fallback', 'api_error': str(e.status_code)})}\n\n"

        except Exception as e:
            err_msg = str(e)
            # Surface a useful Arabic message if we already streamed nothing
            if not full_text:
                fallback = _demo_smart_response(req.message)
                for chunk in [fallback[i:i+4] for i in range(0, len(fallback), 4)]:
                    payload = json.dumps({"type": "text", "text": chunk}, ensure_ascii=False)
                    yield f"data: {payload}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'mode': 'demo_fallback'})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'error': err_msg}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Voice endpoints
# ---------------------------------------------------------------------------

class VoiceRequest(BaseModel):
    text: str
    voice_id: str
    speed: float = 1.0


@app.get("/api/voice/list")
async def voice_list():
    """Return public voice catalogue (used by the frontend dropdown)."""
    return {"voices": tts_list_voices()}


@app.post("/api/voice/synthesize")
async def voice_synthesize(req: VoiceRequest):
    """Synthesize and return audio/mpeg for the chosen voice/dialect.

    Responses are cached in memory (LRU, 60 entries) so repeated requests
    for the same text+voice_id+speed are served instantly from cache.
    """
    from fastapi.responses import Response

    text = (req.text or "").strip()
    if not text:
        return JSONResponse({"error": "empty text"}, status_code=400)
    if len(text) > 5000:
        text = text[:5000]

    # ── Cache lookup ──────────────────────────────────────────────────────────
    speed_key  = f"{req.speed:.2f}"
    cache_raw  = f"{text}|{req.voice_id}|{speed_key}".encode("utf-8")
    cache_key  = hashlib.sha256(cache_raw).hexdigest()
    etag       = f'"{cache_key[:20]}"'

    cached = _tts_cache_get(cache_key)
    if cached:
        return Response(
            content=cached,
            media_type="audio/mpeg",
            headers={
                "X-TTS-Engine": "cache",
                "X-Voice-Id":   req.voice_id,
                "Cache-Control": "public, max-age=3600",
                "ETag": etag,
            },
        )

    # ── Synthesize (buffer full response — Edge TTS websockets break in streams)
    try:
        stream, engine = await tts_synthesize(text, req.voice_id, req.speed)
        buf = bytearray()
        async for chunk in stream:
            buf.extend(chunk)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    except RuntimeError as e:
        return JSONResponse({"error": str(e)}, status_code=503)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": f"synthesis failed: {e}"}, status_code=500)

    if not buf:
        return JSONResponse({"error": "engine returned no audio"}, status_code=502)

    data = bytes(buf)
    _tts_cache_set(cache_key, data)   # store in LRU cache

    return Response(
        content=data,
        media_type="audio/mpeg",
        headers={
            "X-TTS-Engine":  engine,
            "X-Voice-Id":    req.voice_id,
            "Cache-Control": "public, max-age=3600",
            "ETag": etag,
        },
    )


@app.post("/api/chat")
async def chat_sync(req: ChatRequest):
    """Non-streaming fallback."""
    # ── DEMO MODE: No API key → smart offline response ────────────────────
    if not has_api_key():
        text = _demo_smart_response(req.message)
        return JSONResponse({"text": text, "mode": "demo"})

    client = get_client()
    messages = _build_messages(req.history, req.message)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=messages,
            temperature=1.0,
        )
        text = response.content[0].text
        return JSONResponse({"text": text})

    except anthropic.APIStatusError as e:
        # Return demo response so UI never breaks
        return JSONResponse({"text": _demo_smart_response(req.message), "mode": "demo_fallback", "api_error": e.status_code})
    except Exception as e:
        return JSONResponse({"text": _demo_smart_response(req.message), "mode": "demo_fallback", "error": str(e)})


# ---------------------------------------------------------------------------
# Agent Invoke endpoint — modular tool dispatch
# ---------------------------------------------------------------------------

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
    tool    = req.tool.lower().strip()
    params  = req.params
    content = params.get("content") or params.get("message") or params.get("text") or ""

    if not content:
        return JSONResponse({"error": "params.content (or .message) is required"}, status_code=400)

    # ── DEMO MODE ─────────────────────────────────────────────────────────────
    if not has_api_key():
        prefix  = AGENT_TOOLS.get(tool, "")
        prompt  = f"{prefix}\n\n{content}" if prefix else content
        return JSONResponse({
            "tool":   tool,
            "result": _demo_smart_response(prompt),
            "mode":   "demo",
        })

    client  = get_client()
    prefix  = AGENT_TOOLS.get(tool, "")
    context = params.get("context", "")

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
