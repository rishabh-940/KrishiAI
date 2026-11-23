"""
Government Schemes & Crop Guidelines Service powered by bharatgenai/AgriParam.

Uses RAG (Retrieval-Augmented Generation):
  1. Retrieves top matching Indian government agricultural schemes from verified KB.
  2. Builds a grounded prompt for bharatgenai/AgriParam (Param-1-2.9B-Instruct).
  3. Runs local AgriParam weights -> HF Inference API -> Structured RAG synthesis fallback.
"""

import json
import re
from typing import Any, Dict, List

from app.config import settings
from app.core.model_registry import registry
from app.schemas.models import SchemeCard, SchemeQueryRequest, SchemeQueryResponse


class SchemesAdvisorService:
    def __init__(self) -> None:
        kb_path = settings.data_dir / "schemes_kb.json"
        self.schemes: List[Dict[str, Any]] = json.loads(kb_path.read_text(encoding="utf-8"))

    def list_catalog(self, category: str = "", crop: str = "") -> List[Dict[str, Any]]:
        results = self.schemes
        if category:
            cat_low = category.lower()
            results = [s for s in results if cat_low in s["category"].lower()]
        if crop:
            crop_low = crop.lower()
            results = [
                s
                for s in results
                if any(crop_low in c.lower() or c == "All Crops" for c in s["applicable_crops"])
            ]
        return results

    def _retrieve_schemes(self, req: SchemeQueryRequest, top_k: int = 4) -> List[SchemeCard]:
        q_tokens = set(re.findall(r"[a-zA-Z0-9\u0900-\u097F]+", req.query.lower()))
        crop_low = (req.crop or "").lower().strip()

        scored = []
        for s in self.schemes:
            score = 0.25
            kw_set = set(k.lower() for k in s.get("keywords", []))
            overlap = q_tokens.intersection(kw_set)
            score += 0.22 * len(overlap)

            blob = f"{s['name']} {s['category']} {s['benefit_summary']} {s['eligibility']}".lower()
            for tok in q_tokens:
                if len(tok) > 2 and tok in blob:
                    score += 0.08

            if crop_low:
                if any(crop_low in c.lower() for c in s["applicable_crops"]):
                    score += 0.30
                elif "All Crops" in s["applicable_crops"]:
                    score += 0.10

            scored.append((min(0.99, round(score, 3)), s))

        scored.sort(key=lambda x: x[0], reverse=True)
        cards: List[SchemeCard] = []
        for sc, item in scored[:top_k]:
            cards.append(
                SchemeCard(
                    id=item["id"],
                    name=item["name"],
                    ministry=item["ministry"],
                    category=item["category"],
                    benefit_summary=item["benefit_summary"],
                    eligibility=item["eligibility"],
                    documents_required=item["documents_required"],
                    how_to_apply=item["how_to_apply"],
                    official_portal=item["official_portal"],
                    applicable_crops=item["applicable_crops"],
                    relevance_score=sc,
                )
            )
        return cards

    def _build_agriparam_prompt(self, req: SchemeQueryRequest, cards: List[SchemeCard]) -> str:
        context_lines = []
        for c in cards:
            context_lines.append(
                f"- {c.name} ({c.category}): {c.benefit_summary} Eligibility: {c.eligibility}. Portal: {c.official_portal}"
            )
        context_block = "\n".join(context_lines)
        lang_hint = "Respond in Hindi (Devanagari)." if req.language == "hi" else "Respond in clear, farmer-friendly English."
        return (
            "You are AgriParam, an Indian agricultural policy and crop guidelines assistant.\n"
            f"Farmer Context: Crop={req.crop or 'General'}, State={req.state or 'India'}, "
            f"Category={req.farmer_category or 'Small & Marginal'}.\n"
            f"Verified Government Scheme Reference:\n{context_block}\n\n"
            f"Question: {req.query}\n"
            f"{lang_hint} Provide actionable steps, subsidy/benefit highlights, and documents needed.\n"
            "Answer:"
        )

    def _generate_local_agriparam(self, prompt: str) -> str | None:
        bundle = registry.load_causal_llm(
            "schemes_llm",
            settings.schemes_llm_model,
            trust_remote_code=True,
        )
        if not bundle:
            return None
        try:
            import torch

            tokenizer = bundle["tokenizer"]
            model = bundle["model"]
            inputs = tokenizer(prompt, return_tensors="pt")
            if torch.cuda.is_available():
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
            with torch.no_grad():
                out = model.generate(
                    **inputs,
                    max_new_tokens=320,
                    temperature=0.3,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                )
            gen_tokens = out[0][inputs["input_ids"].shape[-1]:]
            return tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()
        except Exception:
            return None

    async def query_schemes(self, req: SchemeQueryRequest) -> SchemeQueryResponse:
        matched = self._retrieve_schemes(req, top_k=4)
        prompt = self._build_agriparam_prompt(req, matched)

        answer = self._generate_local_agriparam(prompt)
        backend = "local_agriparam"

        if not answer:
            api_ans = await registry.call_hf_inference_text(settings.schemes_llm_model, prompt)
            if api_ans:
                answer = api_ans
                backend = "hf_inference_api"
                registry.set_status("schemes_llm", "hf_inference_api")

        if not answer:
            backend = "rag_grounded_fallback"
            top = matched[0]
            crop_txt = f" for {req.crop}" if req.crop else ""
            state_txt = f" in {req.state}" if req.state else ""
            if req.language == "hi":
                answer = (
                    f"{crop_txt}{state_txt} के किसानों के लिए सबसे उपयुक्त प्रमुख सरकारी योजना **{top.name}** है। "
                    f"प्रमुख लाभ: {top.benefit_summary} "
                    f"पात्रता: {top.eligibility} "
                    f"आवेदन प्रक्रिया: {top.how_to_apply} (आधिकारिक पोर्टल: {top.official_portal})। "
                    f"इसके अलावा आप {', '.join(c.name.split('(')[0].strip() for c in matched[1:3])} का भी लाभ उठा सकते हैं।"
                )
            else:
                answer = (
                    f"For {req.farmer_category or 'eligible'} farmers{crop_txt}{state_txt}, "
                    f"the highest-match government scheme is **{top.name}** ({top.ministry}).\n\n"
                    f"**Key Benefit:** {top.benefit_summary}\n"
                    f"**Eligibility:** {top.eligibility}\n"
                    f"**How to Apply:** {top.how_to_apply}\n\n"
                    f"You can also combine this with **{matched[1].name}** and **{matched[2].name}** "
                    f"to cover insurance, credit, or irrigation subsidies."
                )

        checklist = [
            "Keep Aadhaar linked with your active bank account (NPCI DBT seeded) and mobile number.",
            "Obtain latest Land Record (Khatauni / 7/12 / RoR) or valid tenancy/lease certificate.",
            f"Apply directly on official portal ({matched[0].official_portal}) or via your nearest CSC / KVK.",
            "Save the application acknowledgment number to track DBT approval status.",
        ]

        return SchemeQueryResponse(
            model_id=settings.schemes_llm_model,
            inference_backend=backend,
            answer=answer,
            matched_schemes=matched,
            action_checklist=checklist,
        )


schemes_service = SchemesAdvisorService()
