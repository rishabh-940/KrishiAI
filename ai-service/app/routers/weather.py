"""Router for Weather Prediction & Agricultural Weather Advisory."""

from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.models import WeatherAdvisoryResponse
from app.services.weather_advisory import weather_service

router = APIRouter(prefix="/api/v1/weather", tags=["Agri Weather Advisory"])


@router.get("/forecast", response_model=WeatherAdvisoryResponse)
async def weather_forecast(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    city: Optional[str] = Query(default=None),
):
    return await weather_service.get_forecast(lat=lat, lon=lon, city=city)
