#!/usr/bin/env python3
"""
AUS backend launcher (FastAPI + Uvicorn)        file: run.py        place: next to main.py (the _aus_backend folder)

    py run.py                  local development: http://127.0.0.1:8002   (the address index.html expects)
    py run.py --check          pre-flight checks only (python, packages, .env, port, import of main:app), then exit
    py run.py --reload         restart on code changes (development only; on Windows it can leave the port busy afterwards)
    py run.py --port 8010      another port (then add  <meta name="aus-api-base" content="http://127.0.0.1:8010">  to index.html)
    py run.py --host 0.0.0.0   listen on every network interface (same Wi-Fi, container)

On a cloud host that sets PORT (Render, Railway, Fly.io, Heroku, Cloud Run ...) it listens on 0.0.0.0:$PORT by itself:
    start command:   python run.py

Why this launcher and not a bare "uvicorn main:app":
  1. It always starts THIS folder's main.py. (The GitHub repo root also holds a 6-line main.py from Replit; uvicorn started
     there loads that one and fails.)
  2. It changes into this folder first. The default database (./aus_data.db), data/ and logs/ are RELATIVE paths: started from
     another folder the server silently creates a second, empty database and every account "disappears".
  3. It explains the usual failures (port busy or blocked, packages missing, demo mode, CORS) instead of a traceback.

Secrets: .env is loaded the way main.py loads it, but no value is ever printed - only "set" / "not set".
One process on purpose: the rate limiter and the abuse tracker live in memory, so one process = one consistent set of counters.
Ctrl+C stops within 5 seconds even while browsers keep live (SSE) streams open.
X-Forwarded-For handling is left at uvicorn's safe default (trusted only from 127.0.0.1); see the warning printed for FORWARDED_ALLOW_IPS.
"""
from __future__ import annotations

import argparse
import importlib
import importlib.metadata as metadata
import json
import os
import re
import socket
import sys
import traceback
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent
os.chdir(HERE)                              # relative paths inside the app (./aus_data.db, data/, logs/) resolve here, from any folder
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))           # "main" is THIS folder's main.py

APP = "main:app"
DEFAULT_PORT = 8002                         # aus_00_registry.js calls http://127.0.0.1:8002 when the page is on localhost
LOOPBACK = {"127.0.0.1", "localhost", "::1"}
OPTIONAL_PACKAGES = {"pytest", "pytest-asyncio", "pytest-cov", "gunicorn"}   # tests / Linux-only server: not needed to run
DB_DRIVERS = {"aiosqlite": "sqlite", "asyncpg": "postgresql"}                # driver package -> the database it serves
PY = "py" if os.name == "nt" else "python3"

for _stream in (sys.stdout, sys.stderr):    # a cp1252 console must never crash on a stray character
    try:
        _stream.reconfigure(errors="replace")
    except Exception:
        pass


def say(tag: str, text: str) -> None:
    print(f"[{tag}] {text}", flush=True)


def _int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def shown(host: str) -> str:
    return "127.0.0.1" if host in ("0.0.0.0", "::", "") else host


def is_production() -> bool:
    return os.getenv("AUS_ENV", "dev").strip().lower() == "production"      # same rule as main.py (switches /docs off)


# --- arguments ---

def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Start the AUS backend (FastAPI + Uvicorn).")
    p.add_argument("--host", default=None, help="interface to listen on (default 127.0.0.1; 0.0.0.0 on a cloud host that sets PORT)")
    p.add_argument("--port", type=int, default=None, help=f"port (default {DEFAULT_PORT}; $PORT on a cloud host)")
    p.add_argument("--reload", action="store_true", help="restart when a .py file changes (development only)")
    p.add_argument("--check", action="store_true", help="run the pre-flight checks and exit without starting the server")
    p.add_argument("--log-level", default=None, choices=["critical", "error", "warning", "info", "debug", "trace"],
                   help="uvicorn log level (default: info locally, warning on a public host)")
    return p.parse_args(argv)


def resolve_target(args):
    """-> (host, port, public). Order: command line, AUS_HOST / AUS_PORT, the PORT a cloud host sets, local defaults."""
    cloud_port = _int(os.getenv("PORT"))
    port = args.port or _int(os.getenv("AUS_PORT")) or cloud_port or DEFAULT_PORT
    host = args.host or os.getenv("AUS_HOST", "").strip() or ("0.0.0.0" if cloud_port else "127.0.0.1")
    return host, port, host not in LOOPBACK


# --- environment ---

def load_env() -> bool:
    """Load .env next to this file like main.py does (variables already set in the environment win). True if the file exists."""
    path = HERE / ".env"
    try:
        from dotenv import load_dotenv
        load_dotenv(path)
    except ImportError:
        pass                                # reported by the package check
    return path.exists()


def db_dialect() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    return urlsplit(url).scheme.split("+")[0] if url else "sqlite"          # database.py: SQLite file unless DATABASE_URL says otherwise


def missing_packages() -> list:
    req = HERE / "requirements.txt"
    if not req.exists():
        return []
    skip = set(OPTIONAL_PACKAGES)
    # only the database driver of the database in use is needed (SQLite locally, PostgreSQL in production)
    skip.update(driver for driver, dialect in DB_DRIVERS.items() if dialect != db_dialect())
    missing, seen = [], set()
    for raw in req.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.split("#", 1)[0].strip()
        match = re.match(r"[A-Za-z0-9][A-Za-z0-9._-]*", line) if line and not line.startswith(("-", "http")) else None
        if not match:
            continue
        name = match.group(0)
        if name.lower() in skip or name.lower() in seen:
            continue
        seen.add(name.lower())
        try:
            metadata.version(name)
        except metadata.PackageNotFoundError:
            missing.append(name)
    return missing


def ai_is_live() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


def db_summary() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        f = HERE / "aus_data.db"
        size = f"{max(1, f.stat().st_size // 1024)} KB" if f.exists() else "new, created on first start"
        return f"sqlite file {f} ({size})"
    return f"{db_dialect() or 'unknown'} (from DATABASE_URL; address not shown)"


def cors_summary() -> str:
    raw = os.getenv("CORS_ORIGINS")
    if raw is None:
        return "default - localhost:5173/5180/5181 and 127.0.0.1:5180/5181"
    return "CORS_ORIGINS = " + (raw if len(raw) <= 200 else raw[:200] + "...")


def env_warnings(public: bool) -> list:
    out = []
    raw = os.getenv("CORS_ORIGINS")
    if raw is None:
        if public:
            out.append("CORS_ORIGINS is not set: only the localhost origins are allowed, so a site on another address "
                       "(for example https://xxx.vercel.app) gets CORS errors. Set CORS_ORIGINS=https://your-site "
                       "(comma separated, no spaces, no trailing slash).")
    elif not raw.strip():
        out.append("CORS_ORIGINS is set but empty: main.py then allows NO origin at all (its default list is used only when "
                   "the variable is absent). Delete the line or fill it in.")
    else:
        for origin in raw.split(","):       # main.py splits on "," and does not trim, so these are real mistakes
            clean = origin.strip()
            if origin != clean:
                out.append(f"CORS_ORIGINS has a space around {clean!r}: main.py does not trim it, so that origin never matches.")
            if clean.endswith("/"):
                out.append(f"CORS_ORIGINS entry {clean!r} ends with '/': browsers send the origin without it, so it never matches.")
            if clean and not re.match(r"https?://[^/\s]+/?$", clean):
                out.append(f"CORS_ORIGINS entry {clean!r} is not like https://host[:port].")
    if os.getenv("FORWARDED_ALLOW_IPS", "").strip() == "*":
        out.append("FORWARDED_ALLOW_IPS='*' lets ANY visitor forge their IP with an X-Forwarded-For header, and security.py never "
                   "rate-limits or blocks 127.0.0.1 - so a forged 127.0.0.1 would bypass the protection. Remove it.")
    if not (HERE / "exam_bank").is_dir():
        out.append("exam_bank/ not found: official certificate exams will fail with 'no exam bank for ...'. The answer keys are kept "
                   "out of Git on purpose - rebuild them with:  node tools/build_exam_bank.js")
    if public:
        if not is_production():
            out.append("AUS_ENV is not 'production': /docs and /redoc stay public. Set AUS_ENV=production on a public host.")
        if not os.getenv("DATABASE_URL", "").strip():
            out.append("DATABASE_URL is not set: the SQLite file lives on this host's disk, and most cloud disks are wiped on every "
                       "deploy or restart (accounts, results and certificates would vanish). Use a persistent disk or PostgreSQL "
                       "(DATABASE_URL=postgresql+asyncpg://...).")
        out.append("Behind a proxy every visitor shares the proxy's IP for rate limiting: security.py trusts X-Forwarded-For only "
                   "from AUS_TRUSTED_CIDRS (default: loopback). Add the proxy's range there only if the proxy REPLACES "
                   "X-Forwarded-For with the real client address.")
    return out


# --- port ---

def port_problem(host: str, port: int):
    """None when (host, port) can be bound; otherwise a plain-language explanation."""
    sock = socket.socket(socket.AF_INET6 if ":" in host else socket.AF_INET, socket.SOCK_STREAM)
    try:
        if os.name != "nt":                 # like uvicorn: a socket in TIME_WAIT does not count as busy
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((host, port))
        return None
    except OSError as exc:
        code = getattr(exc, "winerror", None) or exc.errno
        if code in (10048, 98, 48):
            who = (f"netstat -ano | findstr :{port}   then   taskkill /PID <number in the last column> /F"
                   if os.name == "nt" else f"lsof -i :{port}   then   kill <pid>")
            return f"port {port} is already in use.  Who holds it:  {who}"
        if code in (10013, 13):
            hint = "\n         reserved ranges:  netsh int ipv4 show excludedportrange protocol=tcp" if os.name == "nt" else ""
            return (f"the system does not let this program listen on port {port} (a reserved port range, another program holding it "
                    f"exclusively, or a security tool).  Use another port:  {PY} run.py --port 8010{hint}")
        return f"cannot listen on {host}:{port}: {exc}"
    finally:
        sock.close()


def aus_already_running(host: str, port: int):
    """If an AUS backend already answers on this port, return its /health JSON, otherwise None."""
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))      # never through a system proxy
        with opener.open(f"http://{shown(host)}:{port}/health", timeout=2) as resp:
            data = json.loads(resp.read(4096).decode("utf-8", "replace"))
        return data if isinstance(data, dict) and "mode" in data else None
    except Exception:
        return None


def check_import():
    """Import main:app the way uvicorn will. -> (ok, message)"""
    try:
        module = importlib.import_module("main")
    except Exception:
        tail = "".join(traceback.format_exc().splitlines(True)[-12:])
        return False, "importing main.py failed:\n" + tail
    where = Path(getattr(module, "__file__", "") or "").resolve()
    if where != HERE / "main.py":
        return False, f"imported {where} instead of {HERE / 'main.py'} (another main.py is shadowing it)"
    if not hasattr(module, "app"):
        return False, "main.py has no variable named app"
    return True, f"main:app imported from {where}"


# --- main ---

def main(argv=None) -> int:
    args = parse_args(argv)
    host, port, public = resolve_target(args)
    if not 1 <= port <= 65535:
        say("ERROR", f"port {port} is not valid (use 1-65535).")
        return 1

    env_found = load_env()
    errors, warns = [], []

    if sys.version_info < (3, 9):
        errors.append(f"Python {sys.version.split()[0]} is too old - use Python 3.10 or newer (the Docker image uses 3.11).")
    missing = missing_packages()
    if missing:
        errors.append("packages not installed: " + ", ".join(missing)
                      + f"\n         install them with:  {PY} -m pip install -r requirements.txt")
    if not env_found:
        warns.append(".env not found next to run.py - copy .env.example to .env and fill it in (the server still starts, in demo mode).")
    warns.extend(env_warnings(public))

    running = None
    problem = port_problem(host, port)
    if problem:
        running = aus_already_running(host, port)
        if running is None:
            errors.append(problem)

    base = f"http://{shown(host)}:{port}"
    say("INFO", f"AUS backend  {base}   (Ctrl+C to stop)")
    say("INFO", f"folder : {HERE}")
    say("INFO", "AI     : " + ("LIVE (ANTHROPIC_API_KEY is set)"
                               if ai_is_live() else "DEMO - ANTHROPIC_API_KEY is not set; add it to .env for live AI answers"))
    say("INFO", f"DB     : {db_summary()}")
    say("INFO", f"CORS   : {cors_summary()}")
    say("INFO", f"health : {base}/health" + ("" if is_production() else f"     docs : {base}/docs"))
    if not public:
        say("INFO", "site   : open http://localhost:5180 (START.bat) - not index.html by double-click")
    if port != DEFAULT_PORT:
        say("INFO", f'port {port} is not the default {DEFAULT_PORT}: add  <meta name="aus-api-base" content="{base}">  to index.html')

    if running is not None:
        if args.check:
            say("OK", f"port {port}: an AUS backend is already running here (mode: {running.get('mode')})")
        else:
            say("INFO", f"Nothing to start: the AUS backend is ALREADY RUNNING on {base} (mode: {running.get('mode')}). Just open the site.")
            return 0

    if args.check and not missing:
        ok, message = check_import()
        (say("OK", message) if ok else errors.append(message))

    for text in warns:
        say("WARN", text)
    for text in errors:
        say("ERROR", text)
    if errors:
        say("ERROR", f"not starting - fix the {len(errors)} problem(s) above.")
        return 1
    if args.check:
        say("OK", f"all checks passed - start the server with:  {PY} run.py")
        return 0

    import uvicorn
    say("INFO", "Loading the application - the AI libraries are large, so this can take up to a minute (--reload: longer). "
                "Until 'Application startup complete' appears the site shows 'server stopped'.")
    try:
        uvicorn.run(
            APP,
            app_dir=str(HERE),
            host=host,
            port=port,
            reload=args.reload,
            reload_dirs=[str(HERE)] if args.reload else None,
            log_level=args.log_level or ("warning" if public else "info"),
            timeout_graceful_shutdown=5,    # Ctrl+C is not held up by open SSE streams
            # proxy_headers / forwarded_allow_ips stay at uvicorn's defaults on purpose (X-Forwarded-For trusted only from 127.0.0.1)
        )
    except KeyboardInterrupt:               # uvicorn re-raises Ctrl+C after its orderly shutdown: not an error, no traceback
        pass
    except SystemExit as exc:               # uvicorn exits with 1 when it cannot start (for example an import error in main.py)
        if exc.code not in (0, None):
            say("ERROR", f"the server could not start - read the message above. To see the cause in plain words:  {PY} run.py --check")
        raise
    say("INFO", "Server stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
