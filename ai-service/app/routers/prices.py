"""Router for India Commodity Wise Mandi Price Prediction."""

from fastapi import APIRouter
from app.schemas.models import PricePredictRequest, PricePredictResponse
from app.services.price_predictor import price_service

router = APIRouter(prefix="/api/v1/prices", tags=["Mandi Price Forecasting ML"])


@router.get("/metadata")
async def price_metadata():
    return {"status": "success", **price_service.get_metadata()}


@router.post("/predict", response_model=PricePredictResponse)
async def predict_price(req: PricePredictRequest):
    return price_service.predict(req)
