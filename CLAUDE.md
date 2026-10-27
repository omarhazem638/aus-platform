This is the AUS (AI University Simulator) project.
A futuristic Arabic/English university business simulator.

RULES:
- Preserve ALL existing cinematic design and animations
- Do NOT redesign or change the theme
- Do NOT remove existing systems
- Only modify what is requested
- Work incrementally, one task at a time
- After every change, confirm what was modified
- Keep the gold and dark color scheme
- Preserve Arabic RTL layout

## Active project: aus-nextjs/

The main codebase being built is `aus-nextjs/`.
See `aus-nextjs/CLAUDE.md` for the full architecture brief.

Do NOT touch `aus-saas/` — it is a separate legacy project.

## Five Core Systems (never redesign — only extend)

1. 🏙️  Neon Financial City      → src/components/city/
2. 🤖  AI Multi-Agent System    → src/systems/ai-agents/
3. 📊  Dashboard                → src/app/dashboard/
4. 🧠  Memory System            → src/systems/memory/
5. 🎙️  Voice AI                 → src/components/voice/

## Backend: Firebase (Option A — chosen)

Auth · Firestore · Storage
No Node/Express. FastAPI on :8002 handles AI only.
