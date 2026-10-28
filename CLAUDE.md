# AUS Platform — Claude Code Project Guide

## Project map
- The primary deployed frontend is a static Arabic RTL web app in `index.html`, deployed on Vercel.
- The AI backend is a separate FastAPI service/repository. Frontend API requests must use the deployed backend URL, never `127.0.0.1` in production.
- Main AI routes currently include `/health`, `/api/chat`, `/api/chat/stream`, `/api/agent/invoke`, and voice routes.
- Keep the existing AUS visual identity, Arabic-first RTL layout, mobile responsiveness, and current features.

## Required workflow
1. Inspect the relevant code and current Git diff before editing.
2. Identify whether a change belongs in the frontend repository or backend repository. Do not assume the frontend deployment contains the backend.
3. Make the smallest complete change. Avoid rewriting the large single-file frontend unless necessary.
4. Never place Anthropic, PayPal secret, or other private API keys in client-side code, commits, logs, or screenshots. Use deployment environment variables for secrets.
5. Never change live payment behavior, pricing, authentication, user data handling, or production environment variables without explicit approval.
6. Validate syntax and run available tests/build checks. Report what was and was not tested; never claim a deployment succeeded unless verified.
7. Prefer a feature branch and reviewable commits. Do not push directly to `main` for substantial changes.
8. For production API calls, use a configurable HTTPS backend base URL and show a clear error when the backend is unavailable. Do not silently present demo output as live AI.
9. Treat all user input and remote content as untrusted. Validate inputs, limit payload sizes, apply rate limits, and avoid leaking internal exception details.
10. Keep Arabic text correctly encoded and preserve accessible labels, keyboard support, and reduced-motion behavior.

## AI model policy
- Use the configured provider/model unless the task requires a change.
- Keep provider/model selection server-side. Do not expose secret credentials in the browser.
- Prefer the lowest-cost model that meets the task quality requirement; use stronger models for complex code review or architecture only when needed.
- Handle provider errors and rate limits explicitly. Do not fabricate live results.

## Integrations and MCP
- Add an integration only when it serves a concrete AUS use case.
- Keep MCP configuration documented and least-privileged. Do not add unknown remote servers or run commands from untrusted sources.
- Require explicit approval before granting access to email, social accounts, payments, databases, or other sensitive systems.
- Store integration credentials in the relevant secret manager/environment variables, never in tracked files.

## Persistent context
- Keep durable project decisions in this file or focused documentation, not in user secrets.
- Do not store personal student data, API keys, payment details, or other sensitive information in project memory.
