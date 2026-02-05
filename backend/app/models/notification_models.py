from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.file_models import Base


class Notification(Base):
    """Notification model for buyer file uploads"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False, index=True)
    object_key = Column(String, nullable=False)  # Reference to file
    part_name = Column(String, nullable=False)  # Part name from upload
    material = Column(String, nullable=True)  # Material type
    part_number = Column(String, nullable=True)  # Part number
    quantity_unit = Column(String, nullable=True)  # Quantity unit
    uploaded_by = Column(String, nullable=True)  # Buyer email/ID
    description = Column(String, nullable=True)  # File description
    is_read = Column(Boolean, default=False, nullable=False)  # Notification read status
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NotificationResponse(BaseModel):
    """Response model for notifications"""
    id: int
    file_id: int
    object_key: str
    part_name: str
    material: Optional[str]
    part_number: Optional[str]
    quantity_unit: Optional[str]
    uploaded_by: Optional[str]
    description: Optional[str]
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Response for listing notifications"""
    total: int
    unread_count: int
    notifications: list[NotificationResponse]
