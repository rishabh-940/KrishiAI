"""
Lazy-loading Singleton Model Registry for HuggingFace DL/LLM models.
Supports 3 zero-cost execution tiers:
  1. Local PyTorch / Transformers inference (GPU or CPU)
  2. Free HuggingFace Inference Router API (when HF_TOKEN is configured)
  3. Grounded local CV / RAG / ML fallback (ensures 100% availability on low-RAM laptops)
"""

import logging
from typing import Any, Dict, Optional
import httpx

from app.config import settings

logger = logging.getLogger("krishiai.registry")


class ModelRegistry:
    def __init__(self) -> None:
        self._cache: Dict[str, Any] = {}
        self._status: Dict[str, str] = {
            "disease_primary": "standby",
            "disease_secondary": "standby",
            "schemes_llm": "standby",
            "chemical_llm": "standby",
            "mandi_price_ml": "standby",
            "crop_recommender_ml": "standby",
        }
        self._torch_available = self._check_import("torch")
        self._transformers_available = self._check_import("transformers")

    @staticmethod
    def _check_import(module_name: str) -> bool:
        try:
            __import__(module_name)
            return True
        except (ImportError, OSError, Exception):
            return False

    def get_health_summary(self) -> Dict[str, Any]:
        cuda_available = False
        if self._torch_available:
            try:
                import torch
                cuda_available = torch.cuda.is_available()
            except Exception:
                cuda_available = False
        return {
            "model_mode": settings.model_mode,
            "torch_installed": self._torch_available,
            "transformers_installed": self._transformers_available,
            "cuda_gpu_available": cuda_available,
            "hf_token_configured": bool(settings.hf_token),
            "registered_models": {
                "disease_primary": {
                    "id": settings.disease_model_primary,
                    "status": self._status["disease_primary"],
                },
                "disease_secondary": {
                    "id": settings.disease_model_secondary,
                    "status": self._status["disease_secondary"],
                },
                "schemes_llm": {
                    "id": settings.schemes_llm_model,
                    "status": self._status["schemes_llm"],
                },
                "chemical_llm": {
                    "id": settings.chemical_llm_model,
                    "status": self._status["chemical_llm"],
                },
                "mandi_price_ml": {"status": self._status["mandi_price_ml"]},
                "crop_recommender_ml": {"status": self._status["crop_recommender_ml"]},
            },
        }

    def set_status(self, key: str, value: str) -> None:
        self._status[key] = value

    def load_image_classifier(self, cache_key: str, model_id: str) -> Optional[Any]:
        """Load a HuggingFace image-classification pipeline locally if mode allows."""
        if settings.model_mode in ("lightweight", "hf_api"):
            return None
        if cache_key in self._cache:
            return self._cache[cache_key]
        if not (self._torch_available and self._transformers_available):
            self._status[cache_key] = "fallback_cv_no_torch"
            return None
        try:
            import torch
            from transformers import pipeline

            device = 0 if torch.cuda.is_available() else -1
            logger.info("Loading local vision model: %s (device=%s)", model_id, device)
            clf = pipeline(
                "image-classification",
                model=model_id,
                device=device,
                token=settings.hf_token or None,
            )
            self._cache[cache_key] = clf
            self._status[cache_key] = "loaded_local"
            return clf
        except Exception as exc:
            logger.warning("Local load skipped for %s: %s", model_id, exc)
            self._status[cache_key] = "fallback_cv"
            return None

    def load_causal_llm(
        self,
        cache_key: str,
        model_id: str,
        trust_remote_code: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """Load a HuggingFace CausalLM + Tokenizer locally when hardware & mode allow."""
        if settings.model_mode in ("lightweight", "hf_api"):
            return None
        if cache_key in self._cache:
            return self._cache[cache_key]
        if not (self._torch_available and self._transformers_available):
            self._status[cache_key] = "fallback_rag_no_torch"
            return None
        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM

            dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
            logger.info("Loading local CausalLM: %s (dtype=%s)", model_id, dtype)
            tokenizer = AutoTokenizer.from_pretrained(
                model_id,
                trust_remote_code=False,
                token=settings.hf_token or None,
            )
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                trust_remote_code=trust_remote_code,
                torch_dtype=dtype,
                device_map="auto" if torch.cuda.is_available() else None,
                token=settings.hf_token or None,
            )
            bundle = {"tokenizer": tokenizer, "model": model}
            self._cache[cache_key] = bundle
            self._status[cache_key] = "loaded_local"
            return bundle
        except Exception as exc:
            logger.warning("Local LLM load skipped for %s: %s", model_id, exc)
            self._status[cache_key] = "fallback_rag"
            return None

    async def call_hf_inference_image(self, model_id: str, image_bytes: bytes) -> Optional[Any]:
        """Query free HuggingFace Inference API for image classification."""
        if not settings.hf_token or settings.model_mode == "lightweight":
            return None
        url = f"https://router.huggingface.co/hf-inference/models/{model_id}"
        headers = {"Authorization": f"Bearer {settings.hf_token}"}
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, headers=headers, content=image_bytes)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as exc:
            logger.warning("HF image API error for %s: %s", model_id, exc)
        return None

    async def call_hf_inference_text(
        self,
        model_id: str,
        prompt: str,
        max_new_tokens: int = 384,
    ) -> Optional[str]:
        """Query free HuggingFace Inference API for text generation."""
        if not settings.hf_token or settings.model_mode == "lightweight":
            return None
        url = f"https://router.huggingface.co/hf-inference/models/{model_id}"
        headers = {
            "Authorization": f"Bearer {settings.hf_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_new_tokens,
                "temperature": 0.3,
                "return_full_text": False,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and data and "generated_text" in data[0]:
                        return data[0]["generated_text"].strip()
                    if isinstance(data, dict) and "generated_text" in data:
                        return data["generated_text"].strip()
        except Exception as exc:
            logger.warning("HF text API error for %s: %s", model_id, exc)
        return None


registry = ModelRegistry()
