@echo off
chcp 65001 >nul
title AUS — AI University Simulator
color 0B

echo.
echo  ╔════════════════════════════════════════════════╗
echo  ║   AUS — AI University Simulator                ║
echo  ║   تشغيل النظام الكامل (الواجهة + الخادم)        ║
echo  ╚════════════════════════════════════════════════╝
echo.

REM ── Kill any old processes on the ports ──────────────────────────
echo  [1/4] تنظيف المنافذ القديمة...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8002 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5180 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

REM ── Start the AI backend (port 8002) ─────────────────────────────
echo  [2/4] تشغيل خادم الذكاء الاصطناعي (المنفذ 8002)...
start "AUS Backend" /min cmd /c "cd /d "%~dp0_aus_backend" && py -X utf8 -m uvicorn main:app --port 8002"
timeout /t 4 /nobreak >nul

REM ── Start the frontend (port 5180) ───────────────────────────────
echo  [3/4] تشغيل واجهة المحاكي (المنفذ 5180)...
start "AUS Frontend" /min cmd /c "cd /d "%~dp0_preview_simulator" && py -m http.server 5180"
timeout /t 3 /nobreak >nul

REM ── Open the browser ─────────────────────────────────────────────
echo  [4/4] فتح التطبيق في المتصفح...
start http://localhost:5180/index.html

echo.
echo  ✅ تم التشغيل بنجاح!
echo.
echo  • الواجهة:  http://localhost:5180
echo  • الخادم:   http://localhost:8002
echo.
echo  ⚠️  لا تغلق هذه النافذة — إغلاقها يوقف النظام.
echo     للإيقاف: أغلق هذه النافذة.
echo.
pause >nul
