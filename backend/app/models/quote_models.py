from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.models.file_models import Base

class Quote(Base):
    """Quote model for manufacturer quotations sent to buyers"""
    __tablename__ = 'quotes'

    id = Column(Integer, primary_key=True)
    notification_id = Column(Integer, nullable=False)  # Reference to notification
    file_id = Column(Integer, nullable=False)  # Reference to uploaded file
    part_name = Column(String(255), nullable=False)
    part_number = Column(String(100))
    material = Column(String(100))
    quantity_unit = Column(String(50))
    
    # Costing
    material_cost = Column(Float, nullable=False)
    labor_cost = Column(Float, nullable=False)
    machine_time_cost = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    profit_margin_percent = Column(Float, default=20)
    profit_amount = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    
    # Status and metadata
    status = Column(String(50), default='pending')  # pending, sent, accepted, rejected
    notes = Column(Text)
    created_by = Column(String(255), nullable=False)  # Manufacturer name
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)


# Pydantic Models
class QuoteCreate(BaseModel):
    """Schema for creating a quote"""
    notification_id: int
    file_id: int
    part_name: str
    part_number: Optional[str] = None
    material: Optional[str] = None
    quantity_unit: Optional[str] = None
    material_cost: float
    labor_cost: float
    machine_time_cost: float
    profit_margin_percent: float = 20
    notes: Optional[str] = None

class QuoteUpdate(BaseModel):
    """Schema for updating quote status"""
    status: str  # accepted, rejected
    rejection_reason: Optional[str] = None

class QuoteResponse(BaseModel):
    """Schema for quote API response"""
    id: int
    notification_id: int
    file_id: int
    part_name: str
    part_number: Optional[str]
    material: Optional[str]
    quantity_unit: Optional[str]
    material_cost: float
    labor_cost: float
    machine_time_cost: float
    subtotal: float
    profit_margin_percent: float
    profit_amount: float
    total_price: float
    status: str
    notes: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    accepted_at: Optional[datetime]
    rejected_at: Optional[datetime]
    rejection_reason: Optional[str]

    class Config:
        from_attributes = True

class QuoteListResponse(BaseModel):
    """Schema for quote list response"""
    quotes: list[QuoteResponse]
    total_count: int
    pending_count: int
    accepted_count: int
