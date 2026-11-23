"""Centralized configuration and HuggingFace model registry metadata."""

import os
from pathlib import Path
from dataclasses import dataclass

BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "KrishiAI-ML-Service")
    app_env: str = os.getenv("APP_ENV", "development")
    port: int = int(os.getenv("PORT", "8000"))

    # Execution strategy: auto | local | hf_api | lightweight
    model_mode: str = os.getenv("MODEL_MODE", "auto").lower()
    hf_token: str = os.getenv("HF_TOKEN", "")

    # Pretrained HuggingFace Model Identifiers
    disease_model_primary: str = os.getenv(
        "DISEASE_MODEL_PRIMARY",
        "Saon110/bd-crop-vegetable-plant-disease-model",
    )
    disease_model_secondary: str = os.getenv(
        "DISEASE_MODEL_SECONDARY",
        "rarfileexe/Plant-Disease-Detector",
    )
    schemes_llm_model: str = os.getenv(
        "SCHEMES_LLM_MODEL",
        "bharatgenai/AgriParam",
    )
    chemical_llm_model: str = os.getenv(
        "CHEMICAL_LLM_MODEL",
        "me-nabi/farmer-advisory-hindi-qwen2.5-3b",
    )

    # Local filesystem paths
    mandi_dataset_path: Path = Path(
        os.getenv("MANDI_DATASET_PATH", str(BASE_DIR / "data" / "mandi_sample.csv"))
    )
    models_store_dir: Path = Path(
        os.getenv("MODELS_STORE_DIR", str(BASE_DIR / "models_store"))
    )
    data_dir: Path = BASE_DIR / "app" / "data"
    hf_cache_dir: Path = Path(
        os.getenv("HF_CACHE_DIR", str(BASE_DIR / ".hf_cache"))
    )


settings = Settings()
