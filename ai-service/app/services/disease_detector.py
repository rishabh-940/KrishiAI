"""
Dual-Model Deep Learning Plant & Crop Disease Detection Service.

Integrates two pretrained HuggingFace vision models:
  1) Primary:   Saon110/bd-crop-vegetable-plant-disease-model (94 South Asian crop/vegetable classes)
  2) Secondary: rarfileexe/Plant-Disease-Detector (Fine-tuned MobileNetV2, 38 PlantVillage classes)

Supports model selection ('ensemble' | 'primary' | 'secondary'), CLAHE preprocessing,
HSV colorimetric lesion diagnostics, and structured ICAR/IPM treatment protocols.
"""

import json
import re
from typing import Any, Dict, List, Tuple

from app.config import settings
from app.core.image_utils import (
    load_rgb_image,
    preprocess_for_vision,
    analyze_leaf_visual_health,
)
from app.core.model_registry import registry
from app.schemas.models import (
    DiseasePredictionResponse,
    PredictionItem,
    TreatmentProtocol,
    VisualDiagnostics,
)

KVK_DISCLAIMER = (
    "Advisory Note: AI diagnosis is intended for early screening. Confirm severe outbreaks "
    "with your nearest Krishi Vigyan Kendra (KVK) or State Agriculture Officer before heavy chemical spraying."
)


class DiseaseDetectorService:
    def __init__(self) -> None:
        kb_path = settings.data_dir / "disease_treatments.json"
        self.treatments: Dict[str, Any] = json.loads(kb_path.read_text(encoding="utf-8"))

    @staticmethod
    def _parse_label(raw_label: str) -> Tuple[str, str]:
        cleaned = raw_label.replace("___", " - ").replace("__", " ").replace("_", " ").strip()
        if " - " in cleaned:
            parts = cleaned.split(" - ", 1)
            return parts[0].strip().title(), parts[1].strip().title()
        tokens = cleaned.split()
        if len(tokens) >= 2:
            return tokens[0].title(), " ".join(tokens[1:]).title()
        return "Crop Leaf", cleaned.title()

    def _match_treatment(self, label: str, affected_pct: float) -> TreatmentProtocol:
        low = label.lower()
        if "healthy" in low:
            key = "healthy"
        elif "blight" in low or "blast" in low:
            key = "blight"
        elif "rust" in low:
            key = "rust"
        elif "mosaic" in low or "curl" in low or "virus" in low or "yellow" in low:
            key = "mosaic_virus"
        elif "mildew" in low:
            key = "powdery_mildew"
        else:
            key = "leaf_spot"

        base = self.treatments[key]
        severity = base["severity"]
        if key != "healthy":
            if affected_pct >= 45:
                severity = f"Severe ({affected_pct:.0f}% leaf area affected)"
            elif affected_pct >= 20:
                severity = f"Moderate ({affected_pct:.0f}% leaf area affected)"
            else:
                severity = f"Early Stage ({affected_pct:.0f}% leaf area affected)"

        return TreatmentProtocol(
            severity=severity,
            summary=base["summary"],
            immediate_actions=base["immediate_actions"],
            chemical_remedies=base["chemical_remedies"],
            organic_remedies=base["organic_remedies"],
            prevention_tips=base["prevention_tips"],
            kvk_disclaimer=KVK_DISCLAIMER,
        )

    def _cv_diagnostic_fallback(
        self, visual: Dict[str, Any], crop_hint: str
    ) -> List[PredictionItem]:
        """
        Deterministic computer-vision lesion classifier used when PyTorch weights are not
        downloaded locally and no HF_TOKEN is configured. Uses HSV green/yellow/brown ratios.
        """
        crop = (crop_hint or "Tomato").strip().title()
        g = visual["green_health_ratio"]
        y = visual["chlorosis_yellow_ratio"]
        b = visual["necrosis_brown_ratio"]

        candidates: List[Tuple[str, float]] = []
        if g >= 0.62 and (y + b) < 0.16:
            candidates = [
                (f"{crop}___Healthy", min(0.94, 0.72 + g * 0.22)),
                (f"{crop}___Early_Leaf_Spot", 0.05),
                (f"{crop}___Nutrient_Stress", 0.03),
            ]
        elif b >= y and b >= 0.18:
            candidates = [
                (f"{crop}___Late_Blight", min(0.91, 0.60 + b * 0.45)),
                (f"{crop}___Early_Blight", 0.21),
                (f"{crop}___Bacterial_Leaf_Spot", 0.11),
            ]
        elif y > b and y >= 0.16:
            candidates = [
                (f"{crop}___Yellow_Leaf_Curl_Mosaic", min(0.89, 0.58 + y * 0.45)),
                (f"{crop}___Yellow_Rust", 0.22),
                (f"{crop}___Chlorosis_Nitrogen_Deficiency", 0.12),
            ]
        else:
            candidates = [
                (f"{crop}___Leaf_Spot", 0.71),
                (f"{crop}___Early_Blight", 0.18),
                (f"{crop}___Healthy", 0.11),
            ]

        total = sum(s for _, s in candidates)
        results: List[PredictionItem] = []
        for raw_lbl, score in candidates:
            c_name, d_name = self._parse_label(raw_lbl)
            results.append(
                PredictionItem(
                    label=raw_lbl,
                    crop=c_name,
                    disease=d_name,
                    confidence=round(score / total, 4),
                    model_source="cv-lesion-analyzer (local fallback)",
                )
            )
        return results

    async def _run_single_model(
        self,
        cache_key: str,
        model_id: str,
        img_enhanced,
        image_bytes: bytes,
    ) -> Tuple[List[PredictionItem], str]:
        # Tier 1: Local PyTorch / Transformers pipeline
        clf = registry.load_image_classifier(cache_key, model_id)
        if clf is not None:
            outputs = clf(img_enhanced, top_k=5)
            items = []
            for row in outputs:
                crop, disease = self._parse_label(row["label"])
                items.append(
                    PredictionItem(
                        label=row["label"],
                        crop=crop,
                        disease=disease,
                        confidence=round(float(row["score"]), 4),
                        model_source=model_id,
                    )
                )
            return items, "local_transformers"

        # Tier 2: Free HuggingFace Inference Router API
        api_out = await registry.call_hf_inference_image(model_id, image_bytes)
        if isinstance(api_out, list) and api_out and "label" in api_out[0]:
            items = []
            for row in api_out[:5]:
                crop, disease = self._parse_label(row["label"])
                items.append(
                    PredictionItem(
                        label=row["label"],
                        crop=crop,
                        disease=disease,
                        confidence=round(float(row["score"]), 4),
                        model_source=model_id,
                    )
                )
            registry.set_status(cache_key, "hf_inference_api")
            return items, "hf_inference_api"

        return [], "fallback"

    async def predict(
        self,
        image_bytes: bytes,
        model_choice: str = "ensemble",
        crop_hint: str = "",
    ) -> DiseasePredictionResponse:
        img = load_rgb_image(image_bytes)
        visual = analyze_leaf_visual_health(img)
        enhanced = preprocess_for_vision(img)

        all_preds: List[PredictionItem] = []
        models_used: List[str] = []
        backends: List[str] = []

        if model_choice in ("ensemble", "primary"):
            p1, b1 = await self._run_single_model(
                "disease_primary", settings.disease_model_primary, enhanced, image_bytes
            )
            if p1:
                all_preds.extend(p1)
                models_used.append(settings.disease_model_primary)
                backends.append(b1)

        if model_choice in ("ensemble", "secondary"):
            p2, b2 = await self._run_single_model(
                "disease_secondary", settings.disease_model_secondary, enhanced, image_bytes
            )
            if p2:
                all_preds.extend(p2)
                models_used.append(settings.disease_model_secondary)
                backends.append(b2)

        if not all_preds:
            all_preds = self._cv_diagnostic_fallback(visual, crop_hint)
            models_used = [
                f"{settings.disease_model_primary} (configured)",
                f"{settings.disease_model_secondary} (configured)",
                "OpenCV-HSV-Lesion-Analyzer (active offline fallback)",
            ]
            inference_backend = "cv_hsv_fallback"
        else:
            # Ensemble confidence fusion across normalized disease labels
            merged: Dict[str, PredictionItem] = {}
            for item in all_preds:
                norm_key = re.sub(r"[^a-z0-9]+", "_", item.label.lower()).strip("_")
                if norm_key in merged:
                    prev = merged[norm_key]
                    boosted = min(0.999, (prev.confidence + item.confidence) / 2.0 + 0.04)
                    merged[norm_key] = PredictionItem(
                        label=prev.label,
                        crop=prev.crop,
                        disease=prev.disease,
                        confidence=round(boosted, 4),
                        model_source="ensemble",
                    )
                else:
                    merged[norm_key] = item
            all_preds = sorted(merged.values(), key=lambda x: x.confidence, reverse=True)[:5]
            inference_backend = "+".join(sorted(set(backends)))

        top = all_preds[0]
        treatment = self._match_treatment(top.label, visual["estimated_affected_area_pct"])

        return DiseasePredictionResponse(
            inference_backend=inference_backend,
            models_used=models_used,
            top_prediction=top,
            top_k_predictions=all_preds,
            visual_diagnostics=VisualDiagnostics(**visual),
            treatment=treatment,
        )


disease_service = DiseaseDetectorService()
