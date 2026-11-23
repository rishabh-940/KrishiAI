# KrishiAI — End-to-End Free Open-Source Agricultural AI / ML / DL Platform

**KrishiAI** is a 100% free, scalable, full-stack agricultural intelligence platform built with **React.js (Vite)**, **Express.js (API Gateway)**, and **Python FastAPI (AI/ML/DL Microservice)**.

## Integrated Pretrained AI/DL Models & Datasets

| Module | Model / Data Source | Role |
|---|---|---|
| **Plant Disease Detection (Primary CV)** | [Saon110/bd-crop-vegetable-plant-disease-model](https://huggingface.co/Saon110/bd-crop-vegetable-plant-disease-model) | 94 South Asian crop/vegetable disease classes across 13 crops |
| **Plant Disease Detection (Secondary CV)** | [rarfileexe/Plant-Disease-Detector](https://huggingface.co/rarfileexe/Plant-Disease-Detector) | Fine-tuned MobileNetV2 (38 PlantVillage classes, 98.75% test accuracy) |
| **Government Schemes & Guidelines** | [bharatgenai/AgriParam](https://huggingface.co/bharatgenai/AgriParam) | 2.9B bilingual (EN/HI) Indian agricultural policy LLM + RAG KB |
| **Agro-Chemicals & Pesticides Chat** | [me-nabi/farmer-advisory-hindi-qwen2.5-3b](https://huggingface.co/me-nabi/farmer-advisory-hindi-qwen2.5-3b) | Fine-tuned Qwen2.5-3B-Instruct Hindi/English ICAR & KVK advisory |
| **Crop Price Forecasting (ML)** | [India Commodity Wise Mandi Dataset (Kaggle)](https://www.kaggle.com/datasets/vandeetshah/india-commodity-wise-mandi-dataset?resource=download) | Time-series APMC mandi forecasting (Min/Max/Modal Rs./Quintal + Sell/Hold signal) |
| **Hyperlocal Weather & Spray Window** | [Open-Meteo Free Weather API](https://open-meteo.com/) | 100% free 7-day forecast + spraying, irrigation & pest alerts (zero API key) |
| **Smart Crop Recommender & NPK Calc** | Custom Trained ML (`crop_recommender.pkl`) | Soil N-P-K, pH, climate crop ranking + exact Urea/DAP/MOP bag calculator |

## Project Structure

```text
KrishiAI/
├── docs/                  # HLD.md, LLD.md, ML_PIPELINE.md
├── ai-service/            # Python FastAPI AI/ML/DL Microservice (Port 8000)
│   ├── app/               # Routers, services, schemas, ModelRegistry, KBs
│   ├── pipelines/         # Mandi price & Crop recommendation training scripts
│   ├── data/              # Sample India Mandi CSV (exact 10 Kaggle columns)
│   ├── models_store/      # Pre-trained .pkl ML models (ready out of the box)
│   └── tests/             # Automated end-to-end FastAPI tests
├── backend/               # Pure-JS Express.js API Gateway (Port 5000)
│   └── src/               # Routes, controllers, services, middleware, crop/farming DBs
├── frontend/              # Pure-JS React.js + Vite + Recharts UI (Port 5173)
│   └── src/               # 9 interactive pages, API client, responsive design system
├── docker-compose.yml     # One-command containerized deployment
├── setup.sh               # Local dependency installation script
└── start.sh               # Launches FastAPI + Express + React together
```

## Quick Start (Local Development — 100% Free)

### Option A: Automated Local Setup
**Linux / macOS / Git Bash:**
```bash
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

**Windows (Command Prompt / Batch):**
Double-click `start.bat` or run:
```cmd
start.bat
```

**Windows (PowerShell):**
```powershell
.\setup.ps1
.\start.ps1
```
Open **http://localhost:5173** in your browser.
- Express API Gateway: `http://localhost:5000/health`
- FastAPI Swagger Docs: `http://localhost:8000/docs`

### Option B: Docker Compose
```bash
docker compose up --build
```

## Execution Modes for HuggingFace Models (`ai-service/.env`)
KrishiAI automatically adapts to your hardware via `MODEL_MODE`:
1. `MODEL_MODE=auto` *(default)*: Attempts local PyTorch/Transformers loading → falls back to free HuggingFace Inference Router API (if `HF_TOKEN` is set) → falls back to local OpenCV lesion diagnostics & grounded ICAR/Scheme RAG so the app **always works smoothly even on CPU-only laptops**.
2. `MODEL_MODE=local`: Forces local HuggingFace weight loading (recommended with GPU / 16GB+ RAM).
3. `MODEL_MODE=hf_api`: Uses your free HuggingFace token (`https://huggingface.co/settings/tokens`) for cloud inference.
4. `MODEL_MODE=lightweight`: Ultra-fast zero-GPU mode using pre-trained `.pkl` ML models + OpenCV + RAG.

## Retraining on the Full Kaggle India Mandi Dataset
1. Download the dataset from [Kaggle India Commodity Wise Mandi Dataset](https://www.kaggle.com/datasets/vandeetshah/india-commodity-wise-mandi-dataset?resource=download) and extract CSVs into `ai-service/data/kaggle_mandi/`.
2. Run:
```bash
cd ai-service
python pipelines/train_mandi_price_model.py --data ./data/kaggle_mandi
```
The service automatically loads the newly trained `models_store/mandi_price_model.pkl` on restart.

## Architecture Docs
- [High-Level Design (HLD)](./docs/HLD.md)
- [Low-Level Design (LLD)](./docs/LLD.md)
- [AI/ML/DL Pipeline & Training Guide](./docs/ML_PIPELINE.md)
