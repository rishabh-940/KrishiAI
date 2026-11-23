"""
Smart Crop Recommendation ML Service.
Predicts top 4 optimal Indian crops from soil (N, P, K, pH) and climate (Temp, Humidity, Rainfall),
computes soil fertility grade, soil amendments, and estimated per-acre profitability.
"""

import pickle
from typing import Any, Dict, List

import numpy as np

from app.config import settings
from app.core.model_registry import registry
from app.schemas.models import (
    CropRecommendRequest,
    CropRecommendResponse,
    CropRecommendationItem,
)


class CropRecommenderService:
    def __init__(self) -> None:
        self.artifact: Dict[str, Any] = {}
        self._load_model()

    def _load_model(self) -> None:
        model_path = settings.models_store_dir / "crop_recommender.pkl"
        if not model_path.exists():
            from pipelines.train_crop_recommender import train_crop_recommender
            train_crop_recommender(settings.models_store_dir)
        with model_path.open("rb") as f:
            self.artifact = pickle.load(f)
        registry.set_status("crop_recommender_ml", "loaded_local")

    def recommend(self, req: CropRecommendRequest) -> CropRecommendResponse:
        x = np.array(
            [[req.nitrogen, req.phosphorus, req.potassium, req.temperature, req.humidity, req.ph, req.rainfall]],
            dtype=np.float64,
        )
        model_info = self.artifact["model"]
        metadata = self.artifact["metadata"]

        if model_info["engine"] == "RandomForestClassifier":
            probs = model_info["rf_model"].predict_proba(x)[0]
        else:
            means = np.array(model_info["means"], dtype=np.float64)
            variances = np.array(model_info["variances"], dtype=np.float64)
            log_probs = -0.5 * np.sum(
                np.log(2.0 * np.pi * variances) + ((x - means) ** 2) / variances,
                axis=1,
            )
            log_probs = log_probs - np.max(log_probs)
            exp_p = np.exp(log_probs)
            probs = exp_p / np.sum(exp_p)

        top_indices = np.argsort(probs)[::-1][:4]
        items: List[CropRecommendationItem] = []
        for idx in top_indices:
            meta = metadata[int(idx)]
            score = round(float(probs[int(idx)]) * 100.0, 1)
            gross = round(meta["yield_qtl_acre"] * meta["modal_price_qtl"] * req.area_acres, 0)
            net = round(gross - (meta["input_cost_acre"] * req.area_acres), 0)
            rationale = (
                f"Matches {meta['season']} thermal & moisture profile (ideal pH ~{meta['ideal_ph']}, "
                f"rainfall ~{meta['ideal_rain']} mm) with strong market realization."
            )
            items.append(
                CropRecommendationItem(
                    crop=meta["crop"],
                    suitability_score=score,
                    season=meta["season"],
                    expected_yield_qtl_per_acre=meta["yield_qtl_acre"],
                    est_gross_revenue_inr=gross,
                    est_net_profit_inr=net,
                    rationale=rationale,
                )
            )

        # Soil fertility grade & actionable amendments
        amendments: List[str] = []
        if req.ph < 5.8:
            amendments.append("Soil is acidic (pH < 5.8): apply agricultural lime @ 200-400 kg/acre before sowing.")
        elif req.ph > 8.0:
            amendments.append("Soil is alkaline (pH > 8.0): apply Gypsum @ 200-300 kg/acre + well-decomposed FYM/compost.")
        if req.nitrogen < 50:
            amendments.append("Low Nitrogen: incorporate green manure (Dhaincha) or Rhizobium/Azotobacter biofertilizer + split Urea.")
        if req.phosphorus < 30:
            amendments.append("Low Phosphorus: apply basal DAP/SSP along with PSB (Phosphate Solubilizing Bacteria).")
        if req.potassium < 35:
            amendments.append("Low Potassium: supplement Muriate of Potash (MOP) to improve grain weight & disease resistance.")
        if not amendments:
            amendments.append("Soil macro-nutrients and pH are well balanced. Maintain organic carbon with 4-5 tonnes FYM/acre.")

        fertility_points = int(req.nitrogen >= 50) + int(req.phosphorus >= 30) + int(req.potassium >= 35) + int(6.0 <= req.ph <= 7.8)
        grade = {4: "A (Optimal)", 3: "B+ (Good)", 2: "B (Moderate)", 1: "C (Needs Amendment)", 0: "D (Depleted)"}[fertility_points]

        return CropRecommendResponse(
            model_engine=self.artifact["metrics"]["engine"],
            soil_fertility_grade=grade,
            recommendations=items,
            soil_amendments=amendments,
        )


crop_recommender_service = CropRecommenderService()
