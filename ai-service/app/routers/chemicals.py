"""Router for Agro-Chemicals, Fertilizers & Pesticides Chat (Hindi Qwen2.5-3B) + NPK Calculator."""

from fastapi import APIRouter
from app.schemas.models import (
    ChemicalChatRequest,
    ChemicalChatResponse,
    DosageCalcRequest,
    DosageCalcResponse,
)
from app.services.chemical_advisor import chemical_service

router = APIRouter(prefix="/api/v1/chemicals", tags=["Agro-Chemicals & Fertilizers (Qwen2.5-3B)"])


@router.post("/chat", response_model=ChemicalChatResponse)
async def chemical_chat(req: ChemicalChatRequest):
    return await chemical_service.chat(req)


@router.post("/dosage-calculator", response_model=DosageCalcResponse)
async def dosage_calculator(req: DosageCalcRequest):
    return chemical_service.calculate_fertilizer_dosage(req)
