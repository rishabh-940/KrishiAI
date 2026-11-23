"""Pydantic v2 data contracts (LLD) for all KrishiAI ML/DL endpoints."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# --- 1. Plant / Crop Disease Detection ---
class PredictionItem(BaseModel):
    label: str
    crop: str
    disease: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_source: str


class TreatmentProtocol(BaseModel):
    severity: str
    summary: str
    immediate_actions: List[str]
    chemical_remedies: List[str]
    organic_remedies: List[str]
    prevention_tips: List[str]
    kvk_disclaimer: str


class VisualDiagnostics(BaseModel):
    green_health_ratio: float
    chlorosis_yellow_ratio: float
    necrosis_brown_ratio: float
    estimated_affected_area_pct: float
    image_resolution: str


class DiseasePredictionResponse(BaseModel):
    status: str = "success"
    inference_backend: str
    models_used: List[str]
    top_prediction: PredictionItem
    top_k_predictions: List[PredictionItem]
    visual_diagnostics: VisualDiagnostics
    treatment: TreatmentProtocol


# --- 2. Government Schemes & Guidelines (AgriParam) ---
class SchemeQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    crop: Optional[str] = None
    state: Optional[str] = None
    farmer_category: Optional[str] = Field(
        default="Small & Marginal",
        description="Small & Marginal | Medium | Large | Tenant | FPO",
    )
    language: str = Field(default="en", description="en | hi")


class SchemeCard(BaseModel):
    id: str
    name: str
    ministry: str
    category: str
    benefit_summary: str
    eligibility: str
    documents_required: List[str]
    how_to_apply: str
    official_portal: str
    applicable_crops: List[str]
    relevance_score: float


class SchemeQueryResponse(BaseModel):
    status: str = "success"
    model_id: str
    inference_backend: str
    answer: str
    matched_schemes: List[SchemeCard]
    action_checklist: List[str]


# --- 3. Agro-Chemicals, Fertilizers & Pesticides Chat (Hindi Qwen2.5-3B) ---
class ChatTurn(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChemicalChatRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=1500)
    crop: Optional[str] = None
    language: str = Field(default="hi-en", description="hi | en | hi-en")
    history: List[ChatTurn] = Field(default_factory=list)


class ChemicalChatResponse(BaseModel):
    status: str = "success"
    model_id: str
    inference_backend: str
    reply: str
    safety_alerts: List[str]
    recommended_products: List[Dict[str, Any]]
    kvk_disclaimer: str


class DosageCalcRequest(BaseModel):
    crop: str
    area_acres: float = Field(..., gt=0.0, le=500.0)
    soil_n: float = Field(default=240.0, ge=0.0, description="Available N kg/ha")
    soil_p: float = Field(default=18.0, ge=0.0, description="Available P kg/ha")
    soil_k: float = Field(default=200.0, ge=0.0, description="Available K kg/ha")


class DosageCalcResponse(BaseModel):
    crop: str
    area_acres: float
    area_hectares: float
    soil_status: Dict[str, str]
    recommended_nutrients_kg: Dict[str, float]
    fertilizer_bags: Dict[str, Any]
    split_schedule: List[Dict[str, str]]
    estimated_cost_inr: float


# --- 4. Crop Price Prediction (India Commodity Wise Mandi Dataset) ---
class PricePredictRequest(BaseModel):
    state: str
    commodity: str
    district: Optional[str] = None
    market: Optional[str] = None
    variety: Optional[str] = None
    horizon_days: int = Field(default=30, ge=7, le=90)


class PricePoint(BaseModel):
    date: str
    min_price: float
    modal_price: float
    max_price: float
    arrivals_tonnes: Optional[float] = None
    is_forecast: bool = False


class PricePredictResponse(BaseModel):
    status: str = "success"
    state: str
    district: str
    market: str
    commodity: str
    variety: str
    unit: str = "Rs./Quintal"
    current_modal_price: float
    predicted_avg_modal_price: float
    predicted_peak_price: float
    expected_change_pct: float
    market_signal: str
    signal_reason: str
    model_metrics: Dict[str, Any]
    historical_series: List[PricePoint]
    forecast_series: List[PricePoint]


# --- 5. Smart Crop Recommendation (ML) ---
class CropRecommendRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=300)
    phosphorus: float = Field(..., ge=0, le=200)
    potassium: float = Field(..., ge=0, le=300)
    temperature: float = Field(..., ge=-5, le=55)
    humidity: float = Field(..., ge=0, le=100)
    ph: float = Field(..., ge=3.0, le=10.0)
    rainfall: float = Field(..., ge=0, le=4000)
    area_acres: float = Field(default=2.0, gt=0, le=500)


class CropRecommendationItem(BaseModel):
    crop: str
    suitability_score: float
    season: str
    expected_yield_qtl_per_acre: float
    est_gross_revenue_inr: float
    est_net_profit_inr: float
    rationale: str


class CropRecommendResponse(BaseModel):
    status: str = "success"
    model_engine: str
    soil_fertility_grade: str
    recommendations: List[CropRecommendationItem]
    soil_amendments: List[str]


# --- 6. Weather Prediction & Agri Advisory ---
class WeatherDay(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    precipitation_mm: float
    precipitation_prob_pct: float
    wind_speed_kmh: float
    humidity_pct: float
    condition: str
    spray_suitability: str


class WeatherAdvisoryResponse(BaseModel):
    status: str = "success"
    location_name: str
    latitude: float
    longitude: float
    data_source: str
    current: Dict[str, Any]
    forecast_7d: List[WeatherDay]
    agri_advisories: List[Dict[str, str]]
    irrigation_recommendation: str
    pest_risk_level: str
