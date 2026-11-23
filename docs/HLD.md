# KrishiAI — High-Level Design (HLD)

## 1. Architectural Vision
KrishiAI follows a **3-Tier Decoupled Microservices Architecture** separating presentation, API gateway/orchestration, and compute-intensive AI/ML/DL inference so each tier scales independently at zero cloud licensing cost.

```mermaid
flowchart LR
    U[Farmer / Browser UI\nReact.js + Vite :5173] -->|REST / Multipart| GW[Express.js API Gateway :5000\nRate Limit • Cache • Multer • History]
    GW -->|Knowledge APIs| KB[(Indian Crops &\nModern Farming JSON)]
    GW -->|HTTP Proxy| AI[Python FastAPI AI Service :8000]
    AI --> V1[CV Ensemble\nSaon110 + Plant-Disease-Detector]
    AI --> L1[Schemes RAG + LLM\nbharatgenai/AgriParam]
    AI --> L2[Agro-Chemical LLM\nfarmer-advisory-hindi-qwen2.5-3b]
    AI --> ML1[Mandi Price Forecaster\nHistGBR / Fourier-Ridge .pkl]
    AI --> ML2[Smart Crop Recommender\nRandomForest / GNB .pkl]
    AI --> W[Open-Meteo Live Weather API]
```

## 2. Service Responsibilities
1. **Frontend (React.js + Vite, Port 5173)**
   - Single-page responsive agri-tech dashboard supporting desktop & mobile browsers.
   - Handles image upload previews, GPS geolocation, bilingual Hindi/English chat, Recharts time-series visualization, and structured loading/error states.
2. **API Gateway & Orchestrator (Express.js, Port 5000)**
   - Security headers (`helmet`), CORS, request ID tracing (`X-Request-Id`), sliding-window rate limiting (`120 req/min`), and Multer image MIME/size validation (`<=10 MB`).
   - TTL in-memory caching for high-read endpoints (weather forecasts, mandi metadata).
   - Serves curated Indian Crops Encyclopedia and Modern Farming Knowledge Hub directly with sub-5ms latency.
   - Persists recent farmer activity history (`activityHistory.json`) for dashboard auditing.
3. **AI / ML / DL Microservice (Python FastAPI, Port 8000)**
   - Runs all deep learning vision models, domain LLMs, and tabular/time-series ML models via a singleton `ModelRegistry`.
   - 3-Tier Graceful Degradation (`Local PyTorch` → `Free HF Inference API` → `Grounded OpenCV/RAG/Local ML`) guarantees zero crashes on resource-constrained hardware.

## 3. Scalability & Production Evolution Path
- **Horizontal Scaling**: Express gateway and FastAPI stateless workers can be scaled behind Nginx/Traefik.
- **GPU Worker Separation**: Heavy LLM workers (`AgriParam`, `Qwen2.5-3B`) can be isolated onto a dedicated vLLM/SGLang GPU node without changing Express or React contracts.
- **Database Upgrade**: File-backed `activityHistory.json` can be swapped for PostgreSQL/MongoDB inside `backend/src/services/historyStore.js` with zero controller changes.
