"""Router for Smart Crop Recommendation ML."""

from fastapi import APIRouter
from app.schemas.models import CropRecommendRequest, CropRecommendResponse
from app.services.crop_recommender import crop_recommender_service

router = APIRouter(prefix="/api/v1/ml", tags=["Smart Crop ML"])


@router.post("/recommend-crop", response_model=CropRecommendResponse)
async def recommend_crop(req: CropRecommendRequest):
    return crop_recommender_service.recommend(req)
