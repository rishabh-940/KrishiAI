"""KrishiAI FastAPI AI / ML / DL Microservice Entrypoint."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.model_registry import registry
from app.routers import disease, schemes, chemicals, prices, weather, crop_ml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title="KrishiAI — Agricultural AI/ML/DL Microservice",
    description=(
        "End-to-end free open-source AI/ML/DL inference service for Indian farmers: "
        "Dual-Model Plant Disease CV, AgriParam Government Schemes Advisor, "
        "Hindi/English Qwen2.5-3B Agro-Chemical Advisor, India Mandi Price Forecaster, "
        "Smart Crop Recommender, and Open-Meteo Agri-Weather Advisory."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(disease.router)
app.include_router(schemes.router)
app.include_router(chemicals.router)
app.include_router(prices.router)
app.include_router(weather.router)
app.include_router(crop_ml.router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.app_env,
        "ai_registry": registry.get_health_summary(),
    }
