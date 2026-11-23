@echo off
title KrishiAI Platform Launcher
cls
echo =====================================================================
echo       KrishiAI - End-to-End Smart Agriculture AI/ML/DL Platform
echo =====================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Check and initialize .env files if missing
if not exist "ai-service\.env" (
    echo [Setup] Initializing ai-service\.env from .env.example...
    copy "ai-service\.env.example" "ai-service\.env" >nul
)
if not exist "backend\.env" (
    echo [Setup] Initializing backend\.env from .env.example...
    copy "backend\.env.example" "backend\.env" >nul
)
if not exist "frontend\.env" (
    echo [Setup] Initializing frontend\.env from .env.example...
    copy "frontend\.env.example" "frontend\.env" >nul
)

echo [1/3] Launching Python FastAPI AI/ML Microservice on http://localhost:8000 ...
start "KrishiAI [1/3] - FastAPI AI/ML Microservice (:8000)" /D "%ROOT_DIR%ai-service" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [2/3] Launching Express.js API Gateway on http://localhost:5000 ...
start "KrishiAI [2/3] - Express Gateway (:5000)" /D "%ROOT_DIR%backend" cmd /k "npm start"

echo [3/3] Launching React Vite Frontend on http://localhost:5173 ...
start "KrishiAI [3/3] - React Frontend (:5173)" /D "%ROOT_DIR%frontend" cmd /k "npm run dev"

echo.
echo Waiting 3 seconds for services to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Opening preview in default browser: http://localhost:5173 ...
start http://localhost:5173

echo.
echo =====================================================================
echo   All 3 KrishiAI microservices are now active:
echo     - React UI Preview:      http://localhost:5173
echo     - Express API Gateway:   http://localhost:5000/health
echo     - FastAPI Swagger Docs:  http://localhost:8000/docs
echo.
echo   To shut down, simply close the 3 opened terminal windows.
echo =====================================================================
echo.
pause
