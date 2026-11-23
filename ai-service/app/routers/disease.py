"""Router for Plant/Crop Disease Detection (Dual HuggingFace Vision Ensemble)."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.config import settings
from app.schemas.models import DiseasePredictionResponse
from app.services.disease_detector import disease_service

router = APIRouter(prefix="/api/v1/disease", tags=["Plant Disease Vision DL"])

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


@router.get("/models")
async def list_disease_models():
    return {
        "models": [
            {
                "key": "ensemble",
                "name": "Dual-Model Ensemble (Recommended)",
                "description": "Combines Saon110 South Asian 94-class classifier + Plant-Disease-Detector MobileNetV2 38-class classifier.",
            },
            {
                "key": "primary",
                "name": settings.disease_model_primary,
                "url": f"https://huggingface.co/{settings.disease_model_primary}",
                "classes": 94,
                "crops": "13 South Asian crops (Rice, Wheat, Potato, Tomato, Mango, Banana, Cotton, Sugarcane, etc.)",
            },
            {
                "key": "secondary",
                "name": settings.disease_model_secondary,
                "url": f"https://huggingface.co/{settings.disease_model_secondary}",
                "classes": 38,
                "crops": "PlantVillage 14 crop species (MobileNetV2, 98.75% test accuracy)",
            },
        ]
    }


@router.post("/predict", response_model=DiseasePredictionResponse)
async def predict_disease(
    image: UploadFile = File(...),
    model_choice: str = Form(default="ensemble"),
    crop_hint: str = Form(default=""),
):
    if image.content_type and image.content_type.lower() not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{image.content_type}'. Upload JPEG, PNG, or WEBP.",
        )
    data = await image.read()
    if not data or len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be non-empty and under 10 MB.")
    try:
        return await disease_service.predict(
            image_bytes=data,
            model_choice=model_choice.lower(),
            crop_hint=crop_hint,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Disease prediction failed: {exc}") from exc
