# KrishiAI — AI, ML & DL Pipeline Guide

## 1. Deep Learning Vision Pipeline (Plant Disease Detection)
1. **Input**: JPEG/PNG/WEBP leaf photo uploaded from React UI.
2. **Preprocessing (`image_utils.py`)**: Resize to `224x224`, LAB-space CLAHE enhancement for shadow/glare normalization, and HSV lesion area segmentation (`green_health_ratio`, `chlorosis_yellow_ratio`, `necrosis_brown_ratio`).
3. **Dual-Model Ensemble**:
   - Primary: [`Saon110/bd-crop-vegetable-plant-disease-model`](https://huggingface.co/Saon110/bd-crop-vegetable-plant-disease-model) (South Asian 94-class crop disease classifier).
   - Secondary: [`rarfileexe/Plant-Disease-Detector`](https://huggingface.co/rarfileexe/Plant-Disease-Detector) (Fine-tuned MobileNetV2, 38 PlantVillage classes).
4. **Post-Processing**: Confidence fusion + severity scaling by affected leaf area % + ICAR chemical & organic IPM protocol mapping.

## 2. Domain LLM + RAG Pipelines
- **Government Schemes (`bharatgenai/AgriParam`)**:
  - Retrieves top-4 matching schemes from `app/data/schemes_kb.json` via lexical + crop/state relevance scoring.
  - Injects grounded scheme facts into [`bharatgenai/AgriParam`](https://huggingface.co/bharatgenai/AgriParam) (`Param-1-2.9B-Instruct`) to prevent policy hallucination.
- **Agro-Chemical & Pesticide Advisory (`me-nabi/farmer-advisory-hindi-qwen2.5-3b`)**:
  - Uses Qwen2.5 chat template with ICAR/KVK dosage grounding (`app/data/chemical_kb.json`) and mandatory KVK safety/PHI disclaimers in Hindi and English.

## 3. Time-Series ML Pipeline (India Commodity Wise Mandi Dataset)
- **Schema Compatibility**: Matches all 10 columns of [India Commodity Wise Mandi Dataset](https://www.kaggle.com/datasets/vandeetshah/india-commodity-wise-mandi-dataset?resource=download):
  `State Name`, `District Name`, `Market Name`, `Variety`, `Group`, `Arrivals (Tonnes)`, `Min Price (Rs./Quintal)`, `Max Price (Rs./Quintal)`, `Modal Price (Rs./Quintal)`, `Reported Date`.
- **Feature Engineering**: Linear trend (`t_years`) + 1st & 2nd harmonic annual Fourier terms (`sin/cos` of day-of-year) + temporal 80/20 split (zero future leakage).
- **Model Architecture**: Hybrid Fourier-Ridge trend extrapolator + `HistGradientBoostingRegressor` residual learner (when `scikit-learn` is installed; pure NumPy Ridge-Fourier fallback otherwise).
- **Bundled Baseline Metrics**: 4,280 records across 20 Indian mandis — Validation MAE `Rs. 136.82/Qtl`, MAPE `3.51%`, `R² = 0.9906`.

## 4. Smart Crop Recommendation ML Pipeline
- **Features**: `[Nitrogen, Phosphorus, Potassium, Temperature, Humidity, pH, Rainfall]` across 14 major Indian crops.
- **Model**: `RandomForestClassifier` (with `scikit-learn`) / standardized `GaussianNaiveBayes` fallback.
- **Outputs**: Top-4 crop probabilities, Soil Fertility Grade (`A`–`D`), soil amendments (lime/gypsum/biofertilizer), and per-acre gross/net INR profit estimation.
