from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime
from app.models.notification_models import Notification
from app.models.file_models import File
import logging

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    file_id: int,
    object_key: str,
    part_name: str,
    material: Optional[str],
    part_number: Optional[str],
    quantity_unit: Optional[str],
    uploaded_by: Optional[str],
    description: Optional[str],
) -> Notification:
    """Create a new notification for manufacturer when buyer uploads file"""
    notification = Notification(
        file_id=file_id,
        object_key=object_key,
        part_name=part_name,
        material=material,
        part_number=part_number,
        quantity_unit=quantity_unit,
        uploaded_by=uploaded_by,
        description=description,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    logger.info(f"Created notification for file_id: {file_id}")
    return notification


def get_notifications(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
) -> tuple[int, int, List[Notification]]:
    """Get notifications for manufacturer"""
    query = db.query(Notification).order_by(desc(Notification.created_at))

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    unread_count = db.query(Notification).filter(Notification.is_read == False).count()

    notifications = query.offset(offset).limit(limit).all()
    return total, unread_count, notifications


def mark_as_read(db: Session, notification_id: int) -> bool:
    """Mark notification as read"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        return False

    notification.is_read = True
    notification.updated_at = datetime.utcnow()
    db.commit()
    logger.info(f"Marked notification {notification_id} as read")
    return True


def mark_all_as_read(db: Session) -> int:
    """Mark all unread notifications as read"""
    count = db.query(Notification).filter(Notification.is_read == False).update(
        {"is_read": True, "updated_at": datetime.utcnow()}
    )
    db.commit()
    logger.info(f"Marked {count} notifications as read")
    return count


def get_notification_with_file(db: Session, notification_id: int) -> Optional[tuple[Notification, File]]:
    """Get notification with associated file details"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        return None

    file = db.query(File).filter(File.id == notification.file_id).first()
    return notification, file
