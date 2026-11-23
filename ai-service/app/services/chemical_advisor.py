"""
Agro-Chemical, Fertilizer & Pesticide Advisory Chat Service
powered by me-nabi/farmer-advisory-hindi-qwen2.5-3b (Qwen2.5-3B-Instruct fine-tuned
on Indian ICAR & KVK crop advisories in Hindi and English).

Also provides an exact NPK Fertilizer Dosage & Cost Calculator.
"""

import json
import re
from typing import Any, Dict, List

from app.config import settings
from app.core.model_registry import registry
from app.schemas.models import (
    ChemicalChatRequest,
    ChemicalChatResponse,
    DosageCalcRequest,
    DosageCalcResponse,
)

KVK_DISCLAIMER_HI_EN = (
    "अधिक जानकारी और सटीक मात्रा के लिए अपने नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें। "
    "| Always verify pesticide dosage & Pre-Harvest Interval (PHI) with your nearest KVK."
)


class ChemicalAdvisorService:
    def __init__(self) -> None:
        kb_path = settings.data_dir / "chemical_kb.json"
        self.kb: Dict[str, Any] = json.loads(kb_path.read_text(encoding="utf-8"))

    def _find_best_kb_entry(self, message: str, crop: str = "") -> Dict[str, Any]:
        text = f"{crop} {message}".lower()
        tokens = set(re.findall(r"[a-zA-Z0-9\u0900-\u097F]+", text))

        best_entry = self.kb["advisories"][-1]  # general NPK fallback
        best_score = -1

        for entry in self.kb["advisories"]:
            score = 0
            for c in entry["crops"]:
                if c.lower() in text:
                    score += 4
            for kw in entry["keywords"]:
                if kw.lower() in text or kw.lower() in tokens:
                    score += 3
            if score > best_score:
                best_score = score
                best_entry = entry

        return best_entry

    def _generate_local_qwen(self, req: ChemicalChatRequest, kb_entry: Dict[str, Any]) -> str | None:
        bundle = registry.load_causal_llm(
            "chemical_llm",
            settings.chemical_llm_model,
            trust_remote_code=False,
        )
        if not bundle:
            return None
        try:
            import torch

            tokenizer = bundle["tokenizer"]
            model = bundle["model"]
            system_msg = (
                "You are KrishiAI Agro-Chemical Advisor (powered by ICAR & KVK guidelines). "
                "Answer farmer questions on fertilizers, pesticides, dosages (ml/liter, g/liter, kg/acre), "
                "organic alternatives, and safety/PHI. Reply in the user's language (Hindi/English). "
                f"Reference context: {kb_entry['en']}"
            )
            messages = [{"role": "system", "content": system_msg}]
            for turn in req.history[-4:]:
                messages.append({"role": turn.role, "content": turn.content})
            messages.append({"role": "user", "content": req.message})

            prompt = tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = tokenizer([prompt], return_tensors="pt")
            if torch.cuda.is_available():
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
            with torch.no_grad():
                out = model.generate(
                    **inputs,
                    max_new_tokens=320,
                    temperature=0.3,
                    do_sample=True,
                )
            gen = out[0][inputs["input_ids"].shape[-1]:]
            return tokenizer.decode(gen, skip_special_tokens=True).strip()
        except Exception:
            return None

    async def chat(self, req: ChemicalChatRequest) -> ChemicalChatResponse:
        kb_entry = self._find_best_kb_entry(req.message, req.crop or "")
        reply = self._generate_local_qwen(req, kb_entry)
        backend = "local_qwen2.5_3b"

        if not reply:
            prompt = (
                f"System: ICAR/KVK farmer advisory on fertilizers & pesticides. Context: {kb_entry['en']}\n"
                f"User ({req.crop or 'General'}): {req.message}\nAssistant:"
            )
            api_ans = await registry.call_hf_inference_text(settings.chemical_llm_model, prompt)
            if api_ans:
                reply = api_ans
                backend = "hf_inference_api"
                registry.set_status("chemical_llm", "hf_inference_api")

        if not reply:
            backend = "icar_kvk_rag_fallback"
            has_devanagari = bool(re.search(r"[\u0900-\u097F]", req.message))
            if req.language == "hi" or has_devanagari:
                reply = f"{kb_entry['hi']}\n\nEnglish Summary: {kb_entry['en']}"
            elif req.language == "en":
                reply = kb_entry["en"]
            else:
                reply = f"**English Advisory:**\n{kb_entry['en']}\n\n**हिंदी सलाह:**\n{kb_entry['hi']}"

        return ChemicalChatResponse(
            model_id=settings.chemical_llm_model,
            inference_backend=backend,
            reply=reply,
            safety_alerts=kb_entry["safety"],
            recommended_products=kb_entry["products"],
            kvk_disclaimer=KVK_DISCLAIMER_HI_EN,
        )

    def calculate_fertilizer_dosage(self, req: DosageCalcRequest) -> DosageCalcResponse:
        """
        ICAR soil-test-based NPK fertilizer calculator.
        Converts available soil N-P-K status into exact Urea (46% N), DAP (18% N, 46% P2O5),
        and MOP (60% K2O) bags (50 kg / 45 kg standard Indian bags) and estimated INR cost.
        """
        crop_key = req.crop.strip().lower()
        standards = self.kb["crop_npk_standards_kg_per_ha"]
        spec = standards.get(crop_key, standards["wheat"])

        area_ha = round(req.area_acres * 0.404686, 3)

        # ICAR Soil Fertility Rating adjustment factors
        def _rate(val: float, low_th: float, high_th: float):
            if val < low_th:
                return "Low", 1.25
            if val > high_th:
                return "High", 0.75
            return "Medium", 1.00

        n_status, n_mult = _rate(req.soil_n, 280.0, 560.0)
        p_status, p_mult = _rate(req.soil_p, 10.0, 25.0)
        k_status, k_mult = _rate(req.soil_k, 108.0, 280.0)

        req_n = round(spec["N"] * n_mult * area_ha, 1)
        req_p = round(spec["P"] * p_mult * area_ha, 1)
        req_k = round(spec["K"] * k_mult * area_ha, 1)

        # DAP supplies 46% P2O5 and 18% N
        dap_kg = round(req_p / 0.46, 1)
        n_from_dap = dap_kg * 0.18
        remaining_n = max(0.0, req_n - n_from_dap)
        urea_kg = round(remaining_n / 0.46, 1)
        mop_kg = round(req_k / 0.60, 1)

        # Standard subsidized Indian retail MRP approx: Urea 45kg ~ Rs 266.5, DAP 50kg ~ Rs 1350, MOP 50kg ~ Rs 1700
        urea_bags = round(urea_kg / 45.0, 2)
        dap_bags = round(dap_kg / 50.0, 2)
        mop_bags = round(mop_kg / 50.0, 2)
        est_cost = round(urea_bags * 266.5 + dap_bags * 1350.0 + mop_bags * 1700.0, 0)

        split_schedule = [
            {"stage": f"Stage {i + 1}", "instruction": step}
            for i, step in enumerate(spec["splits"])
        ]

        return DosageCalcResponse(
            crop=req.crop.title(),
            area_acres=req.area_acres,
            area_hectares=area_ha,
            soil_status={"N": n_status, "P": p_status, "K": k_status},
            recommended_nutrients_kg={"N_kg": req_n, "P2O5_kg": req_p, "K2O_kg": req_k},
            fertilizer_bags={
                "urea_45kg_bags": urea_bags,
                "urea_total_kg": urea_kg,
                "dap_50kg_bags": dap_bags,
                "dap_total_kg": dap_kg,
                "mop_50kg_bags": mop_bags,
                "mop_total_kg": mop_kg,
            },
            split_schedule=split_schedule,
            estimated_cost_inr=est_cost,
        )


chemical_service = ChemicalAdvisorService()
