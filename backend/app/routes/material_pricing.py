from typing import Optional
from fastapi import APIRouter, Query

from app.services.material_pricing_live import get_live_material_costs

router = APIRouter(prefix="/manufacturing", tags=["Manufacturing"])


@router.get("/costs/live", summary="Get live material pricing in INR")
def get_live_costs(materials: Optional[str] = Query(None, description="Comma-separated material names")):
    material_list = [m.strip() for m in materials.split(",") if m.strip()] if materials else None
    return get_live_material_costs(material_list)
