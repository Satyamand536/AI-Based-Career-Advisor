@echo off
:: Use UTF-8 for better character display
chcp 65001 >nul
setlocal
echo ============================================================
echo   🚀 AI CAREER ADVISOR - ONE-CLICK BOOT SERVICE
echo ============================================================
echo   ⚠️  IMPORTANT: KEEP THESE WINDOWS OPEN! 
echo      Closing them will stop the website.
echo ============================================================
echo.

:: 1. Cleanup
echo 🧹 Cleaning up old processes...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
echo.

:: 2. Start AI Service (Port 5001)
echo 🤖 Starting AI Service (Port 5001)...
cd /d "ai"
start "AI Service" cmd /c "python -u app.py & pause"
cd ..
echo ✅ AI Service triggered.
echo.

:: 3. Start Backend Service (Port 8000)
echo 🔌 Starting Backend Service (Port 8000)...
cd /d "backend"
start "Backend" cmd /c "npm start & pause"
cd ..
echo ✅ Backend Service triggered.
echo.

:: 4. Start Frontend Service (Port 3000)
echo 🎨 Starting Frontend Service (Port 3000)...
cd /d "front"
start "Frontend" cmd /c "npm start & pause"
cd ..
echo ✅ Frontend Service triggered.
echo.

echo ============================================================
echo   ✨ ALL SERVICES STARTING!
echo   1. Wait for AI (5001) and Backend (8000) windows to say 'Ready'.
echo   2. Then open: http://localhost:3000
echo ============================================================
echo   🔗 YOUR WEBSITE: http://localhost:3000
echo ============================================================
pause
