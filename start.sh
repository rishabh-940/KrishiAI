#!/usr/bin/env bash
set -e

trap 'kill 0' EXIT

echo "Starting KrishiAI Python FastAPI AI/ML/DL Service on :8000..."
(cd ai-service && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000) &

echo "Starting KrishiAI Express.js API Gateway on :5000..."
(cd backend && npm start) &

echo "Starting KrishiAI React.js Frontend on :5173..."
(cd frontend && npm run dev) &

echo "All services launched! Visit http://localhost:5173"
wait
