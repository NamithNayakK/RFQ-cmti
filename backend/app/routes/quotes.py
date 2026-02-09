from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models.quote_models import Quote, QuoteCreate, QuoteUpdate, QuoteResponse, QuoteListResponse
from app.services.quote_service import QuoteService
from app.auth import get_current_user

router = APIRouter(prefix="/quotes", tags=["quotes"])

@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    quote_data: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        quote = QuoteService.create_quote(db, quote_data, current_user['username'])
        return quote
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create quote: {str(e)}"
        )

@router.get("/manufacturer/stats", response_model=dict)
async def get_manufacturer_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    stats = QuoteService.get_quote_stats(db, current_user['username'])
    return stats

@router.get("/status/{status_filter}", response_model=list[QuoteResponse])
async def get_quotes_by_status(
    status_filter: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    valid_statuses = ['pending', 'sent', 'accepted', 'rejected']
    if status_filter not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    quotes, _ = QuoteService.get_all_quotes(db, status=status_filter)
    return quotes

@router.get("/notification/{notification_id}", response_model=list[QuoteResponse])
async def get_quotes_by_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    quotes = QuoteService.get_quotes_by_notification(db, notification_id)
    return quotes

@router.get("", response_model=QuoteListResponse)
async def get_quotes(
    status: str = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from sqlalchemy import and_
    
    query = db.query(Quote).filter(Quote.created_by == current_user['username'])
    
    if status:
        valid_statuses = ['pending', 'sent', 'accepted', 'rejected']
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )
        query = query.filter(Quote.status == status)
    
    total_count = query.count()
    quotes = query.order_by(Quote.created_at.desc()).limit(limit).offset(offset).all()
    
    all_quotes_query = db.query(Quote).filter(Quote.created_by == current_user['username'])
    
    return {
        "quotes": quotes,
        "total_count": total_count,
        "pending_count": all_quotes_query.filter(Quote.status == 'pending').count(),
        "sent_count": all_quotes_query.filter(Quote.status == 'sent').count(),
        "accepted_count": all_quotes_query.filter(Quote.status == 'accepted').count(),
        "rejected_count": all_quotes_query.filter(Quote.status == 'rejected').count(),
    }

@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    quote = QuoteService.get_quote(db, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    return quote

@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote_status(
    quote_id: int,
    update_data: QuoteUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    quote = QuoteService.get_quote(db, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    try:
        if update_data.status == 'accepted':
            quote = QuoteService.accept_quote(db, quote_id)
        elif update_data.status == 'rejected':
            quote = QuoteService.reject_quote(db, quote_id, update_data.rejection_reason)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be 'accepted' or 'rejected'"
            )
        return quote
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update quote: {str(e)}"
        )

@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        quote = QuoteService.get_quote(db, quote_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )
        
        if quote.created_by != current_user['username']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own quotes"
            )
        
        success = QuoteService.delete_quote(db, quote_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete quote"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting quote: {str(e)}"
        )

@router.get("/buyer/notifications", response_model=dict)
async def get_buyer_quote_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.models.quote_notification_models import QuoteNotification, QuoteNotificationListResponse
    
    notifications, total_count = QuoteService.get_buyer_quote_notifications(
        db, current_user['username'], limit, offset
    )
    unread_count = QuoteService.get_unread_quote_notifications_count(db, current_user['username'])
    
    return {
        "notifications": notifications,
        "total": total_count,
        "unread_count": unread_count
    }

@router.put("/buyer/notifications/{notification_id}/read")
async def mark_quote_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    success = QuoteService.mark_quote_notification_as_read(db, notification_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"success": True, "message": "Notification marked as read"}

@router.get("/buyer/notifications/unread/count", response_model=dict)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    unread_count = QuoteService.get_unread_quote_notifications_count(db, current_user['username'])
    return {"unread_count": unread_count}

@router.delete("/buyer/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.models.quote_notification_models import QuoteNotification
    
    notification = db.query(QuoteNotification).filter(
        QuoteNotification.id == notification_id,
        QuoteNotification.sent_to == current_user['username']
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()

@router.delete("/buyer/notifications/all", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_quote_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.models.quote_notification_models import QuoteNotification
    
    db.query(QuoteNotification).filter(
        QuoteNotification.sent_to == current_user['username']
    ).delete(synchronize_session=False)
    db.commit()
