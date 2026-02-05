from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.config.database import get_db
from app.auth import get_current_user
from app.models.notification_models import NotificationListResponse, NotificationResponse
from app.services.notification_service import (
    get_notifications,
    mark_as_read,
    mark_all_as_read,
    get_notification_with_file,
)
from app.models.file_models import FileResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=NotificationListResponse, summary="Get notifications for manufacturer")
def list_notifications(
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get list of notifications for file uploads"""
    try:
        total, unread_count, notifications = get_notifications(db, limit, offset, unread_only)
        return NotificationListResponse(
            total=total,
            unread_count=unread_count,
            notifications=[NotificationResponse.from_orm(n) for n in notifications],
        )
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


@router.post("/{notification_id}/read", summary="Mark notification as read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mark a notification as read"""
    success = mark_as_read(db, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification marked as read"}


@router.post("/read-all", summary="Mark all notifications as read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mark all unread notifications as read"""
    count = mark_all_as_read(db)
    return {"message": f"Marked {count} notifications as read"}


@router.get("/{notification_id}/details", summary="Get notification with file details")
def get_notification_details(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get notification details with associated file metadata"""
    try:
        result = get_notification_with_file(db, notification_id)
        if not result:
            raise HTTPException(status_code=404, detail="Notification not found")

        notification, file = result
        mark_as_read(db, notification_id)

        return {
            "notification": NotificationResponse.from_orm(notification),
            "file": FileResponse.from_orm(file) if file else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notification details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch notification details")

@router.delete("/{notification_id}", summary="Delete a notification")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a specific notification"""
    try:
        from app.models.notification_models import Notification
        
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        db.delete(notification)
        db.commit()
        return {"message": "Notification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")

@router.delete("/", summary="Clear all notifications")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete all notifications for the user"""
    try:
        from app.models.notification_models import Notification
        
        count = db.query(Notification).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Deleted {count} notifications"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing notifications: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to clear notifications")
