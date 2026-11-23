"""Router for Government Schemes & Crop Guidelines (bharatgenai/AgriParam)."""

from fastapi import APIRouter, Query
from app.schemas.models import SchemeQueryRequest, SchemeQueryResponse
from app.services.schemes_advisor import schemes_service

router = APIRouter(prefix="/api/v1/schemes", tags=["Government Schemes (AgriParam)"])


@router.get("/catalog")
async def get_schemes_catalog(
    category: str = Query(default=""),
    crop: str = Query(default=""),
):
    return {"status": "success", "schemes": schemes_service.list_catalog(category=category, crop=crop)}


@router.post("/query", response_model=SchemeQueryResponse)
async def query_schemes(req: SchemeQueryRequest):
    return await schemes_service.query_schemes(req)
