# KrishiAI Windows PowerShell Setup Script
Write-Host "=== Setting up KrishiAI (100% Free Full-Stack AI/ML/DL) ===" -ForegroundColor Green

Write-Host "[1/3] Setting up Python AI/ML/DL Microservice..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\ai-service"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
python -m pip install -r requirements.txt
python pipelines\train_mandi_price_model.py
python pipelines\train_crop_recommender.py

Write-Host "[2/3] Installing Express.js Backend dependencies..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install

Write-Host "[3/3] Installing React.js Frontend dependencies..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\frontend"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install

Set-Location "$PSScriptRoot"
Write-Host "`n=== KrishiAI setup complete! Run .\start.ps1 or ./start.sh to launch. ===" -ForegroundColor Green
