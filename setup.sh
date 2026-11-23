#!/usr/bin/env bash
set -e

echo "=== Setting up KrishiAI (100% Free Full-Stack AI/ML/DL) ==="

echo "[1/3] Setting up Python AI/ML/DL Microservice..."
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
[ ! -f .env ] && cp .env.example .env
python3 pipelines/train_mandi_price_model.py
python3 pipelines/train_crop_recommender.py
deactivate
cd ..

echo "[2/3] Installing Express.js Backend dependencies..."
cd backend
npm install
[ ! -f .env ] && cp .env.example .env
cd ..

echo "[3/3] Installing React.js Frontend dependencies..."
cd frontend
npm install
[ ! -f .env ] && cp .env.example .env
cd ..

echo "=== KrishiAI setup complete! Run ./start.sh to launch all 3 services. ==="
