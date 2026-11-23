# KrishiAI Windows PowerShell Startup Script
Write-Host "=== Starting KrishiAI (AI/ML/DL Full-Stack) ===" -ForegroundColor Green

# 1. Start Python FastAPI AI/ML Microservice (:8000)
Write-Host "[1/3] Starting Python FastAPI AI Microservice on :8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\ai-service'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

# 2. Start Express API Gateway (:5000)
Write-Host "[2/3] Starting Express.js API Gateway on :5000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start"

# 3. Start React Vite Frontend (:5173)
Write-Host "[3/3] Starting React.js Frontend on :5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`nAll 3 services launched!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Express Gateway: http://localhost:5000/health" -ForegroundColor Yellow
Write-Host "FastAPI Docs: http://localhost:8000/docs" -ForegroundColor Yellow
