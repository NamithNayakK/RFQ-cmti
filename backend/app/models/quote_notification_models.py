from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.file_models import Base


class QuoteNotification(Base):
    """Notification model for quote sent to buyers"""
    __tablename__ = "quote_notifications"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False, index=True)
    sent_by = Column(String, nullable=False)  # Manufacturer email/username
    sent_to = Column(String, nullable=False)  # Buyer email/username
    part_name = Column(String, nullable=False)  # Part name for quick reference
    is_read = Column(Boolean, default=False, nullable=False)  # Has buyer read the notification?
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QuoteNotificationResponse(BaseModel):
    """Response model for quote notifications"""
    id: int
    quote_id: int
    file_id: int
    sent_by: str
    sent_to: str
    part_name: str
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuoteNotificationListResponse(BaseModel):
    """Response for listing quote notifications"""
    total: int
    unread_count: int
    notifications: list[QuoteNotificationResponse]
