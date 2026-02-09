from uuid import uuid4
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from app.storage.minio_client import minio_client, ensure_bucket
from app.config.settings import MINIO_BUCKET
from app.models.file_models import File, FileSearchRequest
from app.models.notification_models import Notification
from app.models.quote_models import Quote
import socket

def generate_upload_url(
    filename: str, 
    content_type: str, 
    db: Session,
    file_size: Optional[int] = None,
    uploaded_by: Optional[str] = None,
    description: Optional[str] = None,
    material: Optional[str] = None,
    part_number: Optional[str] = None,
    quantity_unit: Optional[str] = None
):
    existing_file = db.query(File).filter(File.original_name == filename).first()
    if existing_file:
        raise ValueError(f"File '{filename}' already exists. Please rename the file or delete the existing one.")
    
    ip_address = socket.gethostbyname(socket.gethostname())
    object_key = f"stp/{ip_address}_{filename}"
    
    upload_url = None
    download_url = object_key
    
    try:
        ensure_bucket()
        upload_url = minio_client.presigned_put_object(
            MINIO_BUCKET,
            object_key,
            expires=timedelta(minutes=15)
        )
        download_url = minio_client.presigned_get_object(
            MINIO_BUCKET,
            object_key,
            expires=timedelta(days=7)
        )
    except Exception as e:
        print(f"MinIO error (non-critical): {e}")
        upload_url = f"http://localhost:9000/{MINIO_BUCKET}/{object_key}"
        download_url = object_key

    file_record = File(
        object_key=object_key,
        original_name=filename,
        content_type=content_type,
        file_size=file_size,
        uploaded_by=uploaded_by,
        description=description,
        material=material,
        part_number=part_number,
        quantity_unit=quantity_unit,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)

    from app.services.notification_service import create_notification
    create_notification(
        db=db,
        file_id=file_record.id,
        object_key=object_key,
        part_name=filename.replace('.stp', '').replace('.step', '').replace('.igs', '').replace('.iges', ''),
        material=material,
        part_number=part_number,
        quantity_unit=quantity_unit,
        uploaded_by=uploaded_by,
        description=description,
    )

    return upload_url, download_url, file_record.id


def generate_download_url(object_key: str, db: Session):
    file_record = db.query(File).filter(File.object_key == object_key).first()
    if not file_record:
        raise ValueError(f"STP file not found in database: {object_key}")
    
    download_url = None
    try:
        ensure_bucket()
        download_url = minio_client.presigned_get_object(
            MINIO_BUCKET,
            object_key,
            expires=timedelta(hours=1)
        )
    except Exception as e:
        print(f"MinIO error: {e}")
        download_url = f"http://localhost:9000/{MINIO_BUCKET}/{object_key}"
    
    return download_url if download_url else object_key, file_record


def get_file_by_id(file_id: int, db: Session) -> Optional[File]:
    return db.query(File).filter(File.id == file_id).first()


def get_file_by_object_key(object_key: str, db: Session) -> Optional[File]:
    return db.query(File).filter(File.object_key == object_key).first()


def list_files(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    uploaded_by: Optional[str] = None
) -> tuple[List[File], int]:
    query = db.query(File)
    
    if uploaded_by:
        query = query.filter(File.uploaded_by == uploaded_by)
    
    total = query.count()
    files = query.order_by(File.created_at.desc()).offset(offset).limit(limit).all()
    
    return files, total


def search_files(search_params: FileSearchRequest, db: Session) -> tuple[List[File], int]:
    query = db.query(File)
    
    if search_params.query:
        query = query.filter(File.original_name.ilike(f"%{search_params.query}%"))
    
    if search_params.uploaded_by:
        query = query.filter(File.uploaded_by == search_params.uploaded_by)
    
    if search_params.start_date:
        query = query.filter(File.created_at >= search_params.start_date)
    if search_params.end_date:
        query = query.filter(File.created_at <= search_params.end_date)
    
    total = query.count()
    files = query.order_by(File.created_at.desc()).offset(search_params.offset).limit(search_params.limit).all()
    
    return files, total


def delete_file(object_key: str, db: Session) -> bool:
    try:
        from app.models.quote_notification_models import QuoteNotification
        
        file_record = db.query(File).filter(File.object_key == object_key).first()
        if not file_record:
            return False
        
        quote_ids = [q[0] for q in db.query(Quote.id).filter(Quote.file_id == file_record.id).all()]
        
        if quote_ids:
            db.query(QuoteNotification).filter(QuoteNotification.quote_id.in_(quote_ids)).delete(synchronize_session=False)
            db.flush()
        
        db.query(Quote).filter(Quote.file_id == file_record.id).delete(synchronize_session=False)
        db.flush()
        
        db.query(Notification).filter(Notification.file_id == file_record.id).delete(synchronize_session=False)

        try:
            minio_client.remove_object(MINIO_BUCKET, object_key)
        except Exception as e:
            print(f"Warning: Failed to delete from MinIO: {e}")
        
        db.delete(file_record)
        db.commit()
        
        return True
    except Exception as e:
        db.rollback()
        print(f"Error in delete_file: {e}")
        raise
