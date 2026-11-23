"""
India Commodity Wise Mandi Price Prediction Service.
Loads the trained ML time-series model artifact (models_store/mandi_price_model.pkl)
and produces multi-horizon Min/Modal/Max price forecasts (Rs./Quintal) + Sell/Hold signals.
"""

import math
import pickle
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.config import settings
from app.core.model_registry import registry
from app.schemas.models import PricePoint, PricePredictRequest, PricePredictResponse


class MandiPricePredictorService:
    def __init__(self) -> None:
        self.artifact: Optional[Dict[str, Any]] = None
        self._load_model()

    def _load_model(self) -> None:
        model_path = settings.models_store_dir / "mandi_price_model.pkl"
        if not model_path.exists():
            # Auto-train on bundled sample CSV if artifact missing
            from pipelines.generate_sample_mandi_data import generate_dataset
            from pipelines.train_mandi_price_model import train_pipeline

            if not settings.mandi_dataset_path.exists():
                generate_dataset(settings.mandi_dataset_path)
            train_pipeline(settings.mandi_dataset_path, settings.models_store_dir)

        with model_path.open("rb") as f:
            self.artifact = pickle.load(f)
        registry.set_status("mandi_price_ml", "loaded_local")

    def get_metadata(self) -> Dict[str, Any]:
        catalog = self.artifact["catalog"]
        states = sorted({row["state"] for row in catalog})
        commodities = sorted({row["commodity"] for row in catalog})
        return {
            "states": states,
            "commodities": commodities,
            "markets": catalog,
            "model_metrics": self.artifact["metrics"],
            "dataset_reference": "India Commodity Wise Mandi Dataset (Kaggle: vandeetshah/india-commodity-wise-mandi-dataset)",
        }

    def _select_series(self, req: PricePredictRequest) -> Dict[str, Any]:
        series_map = self.artifact["series_models"]
        state_l = req.state.strip().lower()
        comm_l = req.commodity.strip().lower()
        dist_l = (req.district or "").strip().lower()
        mkt_l = (req.market or "").strip().lower()
        var_l = (req.variety or "").strip().lower()

        best_entry = None
        best_score = -1
        for entry in series_map.values():
            score = 0
            if entry["commodity"].lower() == comm_l:
                score += 10
            elif comm_l in entry["commodity"].lower():
                score += 6
            if entry["state"].lower() == state_l:
                score += 8
            if dist_l and entry["district"].lower() == dist_l:
                score += 4
            if mkt_l and entry["market"].lower() == mkt_l:
                score += 4
            if var_l and entry["variety"].lower() == var_l:
                score += 2
            if score > best_score:
                best_score = score
                best_entry = entry

        if best_entry is None:
            best_entry = next(iter(series_map.values()))
        return best_entry

    @staticmethod
    def _build_features(dates: List[datetime], origin_ord: int) -> np.ndarray:
        rows = []
        for dt in dates:
            t_years = (dt.toordinal() - origin_ord) / 365.25
            doy = dt.timetuple().tm_yday
            w1 = 2.0 * math.pi * doy / 365.25
            w2 = 4.0 * math.pi * doy / 365.25
            rows.append([1.0, t_years, math.sin(w1), math.cos(w1), math.sin(w2), math.cos(w2)])
        return np.array(rows, dtype=np.float64)

    def predict(self, req: PricePredictRequest) -> PricePredictResponse:
        entry = self._select_series(req)
        last_dt = datetime.strptime(entry["last_date"], "%Y-%m-%d")

        # Weekly forecast points across requested horizon
        step_days = 7
        num_steps = max(2, req.horizon_days // step_days + (1 if req.horizon_days % step_days else 0))
        future_dates = [last_dt + timedelta(days=step_days * (i + 1)) for i in range(num_steps)]

        X_fut = self._build_features(future_dates, entry["origin_ord"])
        model_info = entry["model"]
        w_ridge = np.array(model_info["w_ridge"], dtype=np.float64)
        preds = X_fut @ w_ridge
        if model_info.get("gbr") is not None:
            preds = preds + model_info["gbr"].predict(X_fut)

        # Anchor smooth transition from last observed price
        last_obs = float(entry["last_modal_price"])
        anchor_gap = last_obs - float(preds[0])
        forecast_points: List[PricePoint] = []
        for idx, (dt, raw_p) in enumerate(zip(future_dates, preds)):
            decay = math.exp(-0.45 * (idx + 1))
            modal = max(350.0, float(raw_p) + anchor_gap * decay)
            min_p = modal * entry["min_ratio"]
            max_p = modal * entry["max_ratio"]
            forecast_points.append(
                PricePoint(
                    date=dt.strftime("%Y-%m-%d"),
                    min_price=round(min_p, 2),
                    modal_price=round(modal, 2),
                    max_price=round(max_p, 2),
                    arrivals_tonnes=entry["avg_arrivals"],
                    is_forecast=True,
                )
            )

        historical_points = [
            PricePoint(**pt, is_forecast=False) for pt in entry["recent_history"][-16:]
        ]

        avg_pred = round(float(np.mean([p.modal_price for p in forecast_points])), 2)
        peak_pred = round(float(np.max([p.modal_price for p in forecast_points])), 2)
        change_pct = round(((avg_pred - last_obs) / max(last_obs, 1.0)) * 100.0, 2)

        if change_pct >= 3.0:
            signal = "HOLD / STAGGERED SELL"
            reason = (
                f"Forecast indicates a +{change_pct}% upward trend toward Rs. {peak_pred}/Quintal "
                f"over the next {req.horizon_days} days. If storage is available, holding a portion may improve realization."
            )
        elif change_pct <= -3.0:
            signal = "SELL EARLY"
            reason = (
                f"Seasonal arrival pressure suggests a {change_pct}% softening from Rs. {last_obs}/Quintal. "
                f"Selling earlier or locking e-NAM lots is advisable."
            )
        else:
            signal = "STABLE / SELL IN BATCHES"
            reason = (
                f"Prices are projected to stay stable ({change_pct:+.1f}%) around Rs. {avg_pred}/Quintal. "
                f"Compare local APMC & e-NAM bids before dispatch."
            )

        return PricePredictResponse(
            state=entry["state"],
            district=entry["district"],
            market=entry["market"],
            commodity=entry["commodity"],
            variety=entry["variety"],
            current_modal_price=last_obs,
            predicted_avg_modal_price=avg_pred,
            predicted_peak_price=peak_pred,
            expected_change_pct=change_pct,
            market_signal=signal,
            signal_reason=reason,
            model_metrics=self.artifact["metrics"],
            historical_series=historical_points,
            forecast_series=forecast_points,
        )


price_service = MandiPricePredictorService()
