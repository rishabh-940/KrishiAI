# KrishiAI — Low-Level Design (LLD)

## 1. REST API Contracts (Express Gateway `/api/v1`)

| Method | Endpoint | Input Payload | Output Contract |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | — | Gateway status, AI ModelRegistry health, counts, recent activity |
| `POST` | `/api/v1/disease/predict` | `multipart/form-data`: `image`, `model_choice`, `crop_hint` | `top_prediction`, `top_k_predictions[]`, `visual_diagnostics`, `treatment` |
| `GET` | `/api/v1/schemes/catalog` | `?category=&crop=` | Filtered list of Indian Govt Schemes |
| `POST` | `/api/v1/schemes/query` | `{query, crop, state, farmer_category, language}` | `answer`, `matched_schemes[]`, `action_checklist[]`, `model_id` |
| `POST` | `/api/v1/chemicals/chat` | `{message, crop, language, history[]}` | `reply`, `safety_alerts[]`, `recommended_products[]`, `kvk_disclaimer` |
| `POST` | `/api/v1/chemicals/dosage-calculator` | `{crop, area_acres, soil_n, soil_p, soil_k}` | `soil_status`, `fertilizer_bags`, `split_schedule[]`, `estimated_cost_inr` |
| `GET` | `/api/v1/prices/metadata` | — | Available states, commodities, markets, validation metrics |
| `POST` | `/api/v1/prices/predict` | `{state, commodity, district?, market?, horizon_days}` | `historical_series[]`, `forecast_series[]`, `market_signal`, `expected_change_pct` |
| `POST` | `/api/v1/ml/recommend-crop` | `{nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall, area_acres}` | `soil_fertility_grade`, top-4 `recommendations[]`, `soil_amendments[]` |
| `GET` | `/api/v1/weather/forecast` | `?city=Kota` or `?lat=&lon=` | `current`, `forecast_7d[]`, `agri_advisories[]`, `irrigation_recommendation`, `pest_risk_level` |
| `GET` | `/api/v1/crops` & `/api/v1/crops/:id` | `?season=&category=&search=` | Full agronomy records for major Indian crops |
| `GET` | `/api/v1/modern-farming` | `?tag=` | `farmingTypes[]` + `dailyAdvancements[]` |

## 2. Core Python Module Design
- `app/core/model_registry.py`: Thread-safe singleton managing lazy initialization of HuggingFace pipelines (`AutoModelForImageClassification`, `AutoModelForCausalLM`), CUDA detection, and free HF Router API HTTP calls.
- `app/core/image_utils.py`: RGB normalization, OpenCV LAB-space CLAHE contrast enhancement, and HSV pixel-level quantification of healthy chlorophyll vs. chlorosis (yellow) vs. necrosis (brown).
- `app/services/disease_detector.py`: Normalizes heterogeneous label conventions across `Saon110` (94 classes) and `rarfileexe` (38 classes), performs ensemble score fusion, and binds top diagnoses to severity-adjusted IPM treatment protocols.
- `app/services/price_predictor.py`: Loads serialized per-market time-series models (`mandi_price_model.pkl`), computes smooth anchored horizon forecasts with Min/Max price spreads, and emits `HOLD / STAGGERED SELL`, `SELL EARLY`, or `STABLE` signals.

## 3. Error Handling & Resilience
- **Validation**: Pydantic v2 enforces strict bounds (e.g., `ph` in `[3.0, 10.0]`, `horizon_days` in `[7, 90]`, image size `<= 10 MB`).
- **Gateway Errors**: Express `errorHandler.js` normalizes downstream FastAPI HTTP errors into `{status: "error", requestId, message}` JSON payloads.
