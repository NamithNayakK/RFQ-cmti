from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Float, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from app.config.database import get_db
from app.auth import get_current_user

Base = declarative_base()

# ============= ORM Models =============
class MaterialPrice(Base):
    __tablename__ = "material_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    material_name = Column(String, unique=True, nullable=False, index=True)
    base_price_per_unit = Column(Float, nullable=False)
    currency = Column(String, default='INR', nullable=False)
    unit = Column(String, default='kg', nullable=False)
    machining_complexity_factor = Column(Float, default=1.0, nullable=False)
    minimum_order_quantity = Column(Integer, default=1, nullable=False)
    bulk_discount_threshold = Column(Integer, default=10, nullable=False)
    bulk_discount_percentage = Column(Float, default=5.0, nullable=False)
    labor_cost_per_hour = Column(Float, default=500.0, nullable=False)
    estimated_hours_per_unit = Column(Float, default=1.0, nullable=False)
    markup_percentage = Column(Float, default=20.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ============= Pydantic Schemas =============
class MaterialPriceCreate(BaseModel):
    material_name: str = Field(..., description="Material name e.g., Cast Iron, Aluminum")
    base_price_per_unit: float = Field(..., gt=0, description="Base price per unit in INR")
    currency: str = Field(default='INR', description="Currency code")
    unit: str = Field(default='kg', description="Unit of measurement")
    machining_complexity_factor: float = Field(default=1.0, ge=0.5, le=3.0, description="Multiplier for part complexity")
    minimum_order_quantity: int = Field(default=1, ge=1, description="Minimum quantity for quote")
    bulk_discount_threshold: int = Field(default=10, ge=1, description="Quantity at which bulk discount applies")
    bulk_discount_percentage: float = Field(default=5.0, ge=0, le=100, description="Discount percentage for bulk orders")
    labor_cost_per_hour: float = Field(default=500.0, gt=0, description="Labor cost per production hour in INR")
    estimated_hours_per_unit: float = Field(default=1.0, gt=0, description="Estimated production time per unit")
    markup_percentage: float = Field(default=20.0, ge=0, le=100, description="Profit markup percentage")


class MaterialPriceResponse(BaseModel):
    id: int
    material_name: str
    base_price_per_unit: float
    currency: str
    unit: str
    machining_complexity_factor: float
    minimum_order_quantity: int
    bulk_discount_threshold: int
    bulk_discount_percentage: float
    labor_cost_per_hour: float
    estimated_hours_per_unit: float
    markup_percentage: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MaterialPriceUpdate(BaseModel):
    base_price_per_unit: Optional[float] = Field(None, gt=0)
    machining_complexity_factor: Optional[float] = Field(None, ge=0.5, le=3.0)
    bulk_discount_threshold: Optional[int] = Field(None, ge=1)
    bulk_discount_percentage: Optional[float] = Field(None, ge=0, le=100)
    labor_cost_per_hour: Optional[float] = Field(None, gt=0)
    estimated_hours_per_unit: Optional[float] = Field(None, gt=0)
    markup_percentage: Optional[float] = Field(None, ge=0, le=100)


class PricingCalculationRequest(BaseModel):
    material: str = Field(..., description="Material name")
    quantity: int = Field(..., ge=1, description="Number of units")
    complexity_factor: Optional[float] = Field(default=1.0, ge=0.5, le=3.0, description="Part complexity multiplier")
    delivery_days: Optional[int] = Field(None, ge=1, description="Delivery timeline preference")


class PricingCalculationResponse(BaseModel):
    material: str
    quantity: int
    base_material_cost: float
    labor_cost: float
    subtotal: float
    bulk_discount: float
    subtotal_after_discount: float
    markup: float
    total_price: float
    price_per_unit: float
    currency: str
    complexity_factor: float
    estimated_delivery_days: int


# ============= Service Functions =============
def create_material_price(db: Session, material_name: str, base_price_per_unit: float, 
                         machining_complexity_factor: float = 1.0, labor_cost_per_hour: float = 500.0,
                         estimated_hours_per_unit: float = 1.0, markup_percentage: float = 20.0,
                         bulk_discount_threshold: int = 10, bulk_discount_percentage: float = 5.0):
    db_price = MaterialPrice(
        material_name=material_name,
        base_price_per_unit=base_price_per_unit,
        machining_complexity_factor=machining_complexity_factor,
        labor_cost_per_hour=labor_cost_per_hour,
        estimated_hours_per_unit=estimated_hours_per_unit,
        markup_percentage=markup_percentage,
        bulk_discount_threshold=bulk_discount_threshold,
        bulk_discount_percentage=bulk_discount_percentage
    )
    db.add(db_price)
    db.commit()
    db.refresh(db_price)
    return db_price


def get_material_price(db: Session, material_name: str) -> Optional[MaterialPrice]:
    return db.query(MaterialPrice).filter(MaterialPrice.material_name == material_name).first()


def get_all_material_prices(db: Session, limit: int = 100, offset: int = 0) -> List[MaterialPrice]:
    return db.query(MaterialPrice).limit(limit).offset(offset).all()


def update_material_price(db: Session, material_name: str, **kwargs):
    db_price = get_material_price(db, material_name)
    if not db_price:
        raise ValueError(f"Material '{material_name}' not found")
    
    for key, value in kwargs.items():
        if value is not None and hasattr(db_price, key):
            setattr(db_price, key, value)
    
    db.commit()
    db.refresh(db_price)
    return db_price


def delete_material_price(db: Session, material_name: str) -> bool:
    db_price = get_material_price(db, material_name)
    if not db_price:
        return False
    db.delete(db_price)
    db.commit()
    return True


def calculate_quote_price(db: Session, request: PricingCalculationRequest) -> PricingCalculationResponse:
    material_price = get_material_price(db, request.material)
    if not material_price:
        raise ValueError(f"Material '{request.material}' not found in pricing database")
    
    if request.quantity < material_price.minimum_order_quantity:
        raise ValueError(f"Minimum order quantity is {material_price.minimum_order_quantity} units")
    
    complexity = request.complexity_factor or material_price.machining_complexity_factor
    
    base_material_cost = material_price.base_price_per_unit * request.quantity * complexity
    
    labor_cost = (material_price.labor_cost_per_hour * 
                  material_price.estimated_hours_per_unit * 
                  request.quantity)
    
    subtotal = base_material_cost + labor_cost
    
    bulk_discount = 0.0
    if request.quantity >= material_price.bulk_discount_threshold:
        bulk_discount = subtotal * (material_price.bulk_discount_percentage / 100)
    
    subtotal_after_discount = subtotal - bulk_discount
    
    markup = subtotal_after_discount * (material_price.markup_percentage / 100)
    
    total_price = subtotal_after_discount + markup
    
    price_per_unit = total_price / request.quantity
    
    estimated_delivery_days = request.delivery_days or 5
    
    return PricingCalculationResponse(
        material=request.material,
        quantity=request.quantity,
        base_material_cost=round(base_material_cost, 2),
        labor_cost=round(labor_cost, 2),
        subtotal=round(subtotal, 2),
        bulk_discount=round(bulk_discount, 2),
        subtotal_after_discount=round(subtotal_after_discount, 2),
        markup=round(markup, 2),
        total_price=round(total_price, 2),
        price_per_unit=round(price_per_unit, 2),
        currency=material_price.currency,
        complexity_factor=complexity,
        estimated_delivery_days=estimated_delivery_days
    )


# ============= API Routes =============
router = APIRouter(prefix="/pricing", tags=["Pricing"])

@router.post("/materials", response_model=MaterialPriceResponse)
def create_material(
    data: MaterialPriceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "manufacturer":
        raise HTTPException(status_code=403, detail="Only manufacturers can manage pricing")
    
    try:
        material = create_material_price(
            db=db,
            material_name=data.material_name,
            base_price_per_unit=data.base_price_per_unit,
            machining_complexity_factor=data.machining_complexity_factor,
            labor_cost_per_hour=data.labor_cost_per_hour,
            estimated_hours_per_unit=data.estimated_hours_per_unit,
            markup_percentage=data.markup_percentage,
            bulk_discount_threshold=data.bulk_discount_threshold,
            bulk_discount_percentage=data.bulk_discount_percentage
        )
        return material
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/materials", response_model=List[MaterialPriceResponse])
def list_materials(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    materials = get_all_material_prices(db, limit=limit, offset=offset)
    return materials

@router.get("/materials/{material_name}", response_model=MaterialPriceResponse)
def get_material(
    material_name: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    material = get_material_price(db, material_name)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.put("/materials/{material_name}", response_model=MaterialPriceResponse)
def update_material(
    material_name: str,
    data: MaterialPriceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "manufacturer":
        raise HTTPException(status_code=403, detail="Only manufacturers can manage pricing")
    
    try:
        material = update_material_price(db, material_name, **data.dict(exclude_unset=True))
        return material
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/materials/{material_name}")
def remove_material(
    material_name: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "manufacturer":
        raise HTTPException(status_code=403, detail="Only manufacturers can manage pricing")
    
    success = delete_material_price(db, material_name)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"success": True, "message": f"Material '{material_name}' deleted"}

@router.post("/calculate", response_model=PricingCalculationResponse)
def calculate_price(
    request: PricingCalculationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        pricing = calculate_quote_price(db, request)
        return pricing
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
