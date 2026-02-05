from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.config.settings import (
    MATERIAL_PRICE_CACHE_MINUTES,
    DEFAULT_LABOR_COST_INR,
    DEFAULT_MACHINE_COST_INR,
)

# Direct Indian Market Prices in INR per Kg (typical range)
# Based on MCX/NCDEX and Indian metal market rates
BASE_INR_PRICES_PER_KG: Dict[str, float] = {
    "Steel": 55.00,           # ₹55/kg - Mild Steel
    "Aluminum": 225.00,       # ₹225/kg -  Aluminum
    "Stainless Steel": 100.00, # ₹100/kg - SS 304
    "Cast Iron": 45.00,       # ₹45/kg - Cast Iron
    "Brass": 400.00,          # ₹400/kg - Brass Rod
}

DEFAULT_MIN_ORDER: Dict[str, int] = {
    "Steel": 25,
    "Aluminum": 20,
    "Stainless Steel": 30,
    "Cast Iron": 10,
    "Brass": 15,
}

_cache: Dict[str, Optional[object]] = {
    "expires_at": None,
    "payload": None,
}


def get_live_material_costs(materials: Optional[List[str]] = None) -> Dict[str, object]:
    """Get live material costs in INR from Indian market rates.
    Prices are cached for 24 hours (configurable via MATERIAL_PRICE_CACHE_MINUTES).
    """
    now = datetime.now(timezone.utc)
    expires_at = _cache.get("expires_at")
    payload = _cache.get("payload")

    # Return cached data if still valid
    if payload and isinstance(expires_at, datetime) and now < expires_at:
        if materials:
            filtered_items = [item for item in payload["items"] if item["material"] in materials]
            return {**payload, "items": filtered_items}
        return payload

    items = []
    for index, (material, inr_price) in enumerate(BASE_INR_PRICES_PER_KG.items(), start=1):
        if materials and material not in materials:
            continue
        items.append({
            "id": index,
            "material": material,
            "costPerKg": round(inr_price, 2),  # Direct INR price
            "laborCostPerHour": round(DEFAULT_LABOR_COST_INR, 2),
            "machineCostPerHour": round(DEFAULT_MACHINE_COST_INR, 2),
            "minimumOrder": DEFAULT_MIN_ORDER.get(material, 10),
        })

    payload = {
        "updated_at": now.isoformat(),
        "source": "indian-market-rates",
        "currency": "INR",
        "items": items,
    }

    _cache["payload"] = payload
    _cache["expires_at"] = now + timedelta(minutes=MATERIAL_PRICE_CACHE_MINUTES)

    return payload
