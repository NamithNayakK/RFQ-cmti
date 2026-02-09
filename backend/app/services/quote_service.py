from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.quote_models import Quote, QuoteCreate, QuoteResponse
from app.models.file_models import File
from app.models.quote_notification_models import QuoteNotification
from datetime import datetime

class QuoteService:

    @staticmethod
    def create_quote(db: Session, quote_data: QuoteCreate, created_by: str) -> Quote:
        subtotal = quote_data.material_cost + quote_data.labor_cost + quote_data.machine_time_cost
        profit_amount = subtotal * (quote_data.profit_margin_percent / 100)
        total_price = subtotal + profit_amount

        quote = Quote(
            notification_id=quote_data.notification_id,
            file_id=quote_data.file_id,
            part_name=quote_data.part_name,
            part_number=quote_data.part_number,
            material=quote_data.material,
            quantity_unit=quote_data.quantity_unit,
            material_cost=quote_data.material_cost,
            labor_cost=quote_data.labor_cost,
            machine_time_cost=quote_data.machine_time_cost,
            subtotal=subtotal,
            profit_margin_percent=quote_data.profit_margin_percent,
            profit_amount=profit_amount,
            total_price=total_price,
            status='sent',
            notes=quote_data.notes,
            created_by=created_by
        )
        db.add(quote)
        db.flush()
        
        file_record = db.query(File).filter(File.id == quote_data.file_id).first()
        if file_record:
            quote_notification = QuoteNotification(
                quote_id=quote.id,
                file_id=quote_data.file_id,
                sent_by=created_by,
                sent_to=file_record.uploaded_by,
                part_name=quote_data.part_name,
                is_read=False
            )
            db.add(quote_notification)
        
        db.commit()
        db.refresh(quote)
        return quote

    @staticmethod
    def get_quote(db: Session, quote_id: int) -> Quote:
        return db.query(Quote).filter(Quote.id == quote_id).first()

    @staticmethod
    def get_quotes_by_notification(db: Session, notification_id: int) -> list[Quote]:
        return db.query(Quote).filter(Quote.notification_id == notification_id).all()

    @staticmethod
    def get_quotes_by_file(db: Session, file_id: int) -> list[Quote]:
        return db.query(Quote).filter(Quote.file_id == file_id).all()

    @staticmethod
    def get_all_quotes(db: Session, limit: int = 50, offset: int = 0, status: str = None) -> tuple[list[Quote], int]:
        query = db.query(Quote)
        
        if status:
            query = query.filter(Quote.status == status)
        
        total_count = query.count()
        quotes = query.order_by(Quote.created_at.desc()).limit(limit).offset(offset).all()
        
        return quotes, total_count

    @staticmethod
    def get_manufacturer_quotes(db: Session, created_by: str, limit: int = 50, offset: int = 0) -> tuple[list[Quote], int]:
        query = db.query(Quote).filter(Quote.created_by == created_by)
        total_count = query.count()
        quotes = query.order_by(Quote.created_at.desc()).limit(limit).offset(offset).all()
        
        return quotes, total_count

    @staticmethod
    def get_quote_stats(db: Session, created_by: str) -> dict:
        stats = {
            'total_quotes': db.query(func.count(Quote.id)).filter(Quote.created_by == created_by).scalar() or 0,
            'pending_quotes': db.query(func.count(Quote.id)).filter(
                Quote.created_by == created_by,
                Quote.status == 'pending'
            ).scalar() or 0,
            'sent_quotes': db.query(func.count(Quote.id)).filter(
                Quote.created_by == created_by,
                Quote.status == 'sent'
            ).scalar() or 0,
            'accepted_quotes': db.query(func.count(Quote.id)).filter(
                Quote.created_by == created_by,
                Quote.status == 'accepted'
            ).scalar() or 0,
            'rejected_quotes': db.query(func.count(Quote.id)).filter(
                Quote.created_by == created_by,
                Quote.status == 'rejected'
            ).scalar() or 0,
        }
        return stats

    @staticmethod
    def accept_quote(db: Session, quote_id: int) -> Quote:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if quote:
            quote.status = 'accepted'
            quote.accepted_at = datetime.utcnow()
            db.commit()
            db.refresh(quote)
        return quote

    @staticmethod
    def reject_quote(db: Session, quote_id: int, rejection_reason: str = None) -> Quote:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if quote:
            quote.status = 'rejected'
            quote.rejected_at = datetime.utcnow()
            quote.rejection_reason = rejection_reason
            db.commit()
            db.refresh(quote)
        return quote

    @staticmethod
    def update_quote(db: Session, quote_id: int, update_data: dict) -> Quote:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if quote:
            for key, value in update_data.items():
                if hasattr(quote, key) and value is not None:
                    setattr(quote, key, value)
            db.commit()
            db.refresh(quote)
        return quote

    @staticmethod
    def delete_quote(db: Session, quote_id: int) -> bool:
        quote = db.query(Quote).filter(Quote.id == quote_id).first()
        if quote:
            db.delete(quote)
            db.commit()
            return True
        return False

    @staticmethod
    def get_buyer_quote_notifications(db: Session, buyer_email: str, limit: int = 50, offset: int = 0) -> tuple[list, int]:
        from app.models.quote_notification_models import QuoteNotification
        
        query = db.query(QuoteNotification).filter(QuoteNotification.sent_to == buyer_email)
        total_count = query.count()
        notifications = query.order_by(QuoteNotification.created_at.desc()).limit(limit).offset(offset).all()
        
        return notifications, total_count

    @staticmethod
    def mark_quote_notification_as_read(db: Session, notification_id: int) -> bool:
        from app.models.quote_notification_models import QuoteNotification
        
        notification = db.query(QuoteNotification).filter(QuoteNotification.id == notification_id).first()
        if notification:
            notification.is_read = True
            db.commit()
            return True
        return False

    @staticmethod
    def get_unread_quote_notifications_count(db: Session, buyer_email: str) -> int:
        from app.models.quote_notification_models import QuoteNotification
        
        return db.query(QuoteNotification).filter(
            QuoteNotification.sent_to == buyer_email,
            QuoteNotification.is_read == False
        ).count()