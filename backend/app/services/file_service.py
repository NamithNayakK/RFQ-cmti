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
import hashlib

def generate_checksum(file_data: bytes) -> str:
    """Generate SHA256 checksum for file integrity verification"""
    return hashlib.sha256(file_data).hexdigest()

def generate_upload_url(
    filename: str, 
    content_type: str, 
    db: Session,
    file_size: Optional[int] = None,
    uploaded_by: Optional[str] = None,
    description: Optional[str] = None,
    material: Optional[str] = None,
    part_number: Optional[str] = None,
    quantity_unit: Optional[str] = None,
    thumbnail_data: Optional[str] = None
):
    """
    Generate a presigned upload URL and store file metadata in database.
    
    Args:
        filename: Original filename (must be .stp or .step)
        content_type: MIME type of the file
        db: SQLAlchemy database session
        file_size: Size of file in bytes
        uploaded_by: User ID or email
        description: Optional description of the STP file
        material: Material type
        part_number: Part number
        quantity_unit: Quantity unit (pieces, assemblies)
    
    Returns:
        Tuple of (upload_url, object_key, file_id)
    """
    ensure_bucket()  # Ensure bucket exists before generating URL
    
    # Check for duplicate filename
    existing_file = db.query(File).filter(File.original_name == filename).first()
    if existing_file:
        raise ValueError(f"File '{filename}' already exists. Please rename the file or delete the existing one.")
    
    # Generate unique object key with timestamp for better organization
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    object_key = f"stp/{timestamp}_{uuid4()}_{filename}"

    # Generate presigned upload URL (valid for 15 minutes)
    upload_url = minio_client.presigned_put_object(
        MINIO_BUCKET,
        object_key,
        expires=timedelta(minutes=15)
    )

    # Store file metadata in database using SQLAlchemy ORM
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
        thumbnail_data=thumbnail_data,
        version=1,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)

    # Create notification for manufacturer
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

    return upload_url, object_key, file_record.id


def generate_download_url(object_key: str, db: Session):
    """
    Generate a presigned download URL for an existing STP file.
    
    Args:
        object_key: The object key in MinIO storage
        db: SQLAlchemy database session
    
    Returns:
        Tuple of (download_url, file_metadata)
    
    Raises:
        ValueError: If file not found in database
    """
    ensure_bucket()  # Ensure bucket exists before generating URL
    
    # Verify file exists in database
    file_record = db.query(File).filter(File.object_key == object_key).first()
    if not file_record:
        raise ValueError(f"STP file not found in database: {object_key}")
    
    # Generate presigned download URL (valid for 1 hour)
    download_url = minio_client.presigned_get_object(
        MINIO_BUCKET,
        object_key,
        expires=timedelta(hours=1)
    )
    
    return download_url, file_record


def get_file_by_id(file_id: int, db: Session) -> Optional[File]:
    """Get file metadata by ID"""
    return db.query(File).filter(File.id == file_id).first()


def get_file_by_object_key(object_key: str, db: Session) -> Optional[File]:
    """Get file metadata by object key"""
    return db.query(File).filter(File.object_key == object_key).first()


def list_files(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    uploaded_by: Optional[str] = None
) -> tuple[List[File], int]:
    """
    List all STP files with pagination and optional filtering
    
    Returns:
        Tuple of (files_list, total_count)
    """
    query = db.query(File)
    
    if uploaded_by:
        query = query.filter(File.uploaded_by == uploaded_by)
    
    total = query.count()
    files = query.order_by(File.created_at.desc()).offset(offset).limit(limit).all()
    
    return files, total


def search_files(search_params: FileSearchRequest, db: Session) -> tuple[List[File], int]:
    """
    Search STP files with multiple filters
    
    Returns:
        Tuple of (matching_files, total_count)
    """
    query = db.query(File)
    
    # Search by filename
    if search_params.query:
        query = query.filter(File.original_name.ilike(f"%{search_params.query}%"))
    
    # Filter by uploader
    if search_params.uploaded_by:
        query = query.filter(File.uploaded_by == search_params.uploaded_by)
    
    # Filter by date range
    if search_params.start_date:
        query = query.filter(File.created_at >= search_params.start_date)
    if search_params.end_date:
        query = query.filter(File.created_at <= search_params.end_date)
    
    total = query.count()
    files = query.order_by(File.created_at.desc()).offset(search_params.offset).limit(search_params.limit).all()
    
    return files, total


def delete_file(object_key: str, db: Session) -> bool:
    """
    Delete a file from both database and MinIO storage
    
    Returns:
        True if successful, False if file not found
    """
    try:
        from app.models.quote_notification_models import QuoteNotification
        
        file_record = db.query(File).filter(File.object_key == object_key).first()
        if not file_record:
            return False
        
        # Delete related records in correct order to avoid FK constraint issues
        # 1. Get all quote IDs for this file
        quote_ids = [q[0] for q in db.query(Quote.id).filter(Quote.file_id == file_record.id).all()]
        
        # 2. Delete quote notifications for these quotes
        if quote_ids:
            db.query(QuoteNotification).filter(QuoteNotification.quote_id.in_(quote_ids)).delete(synchronize_session=False)
            db.flush()  # Ensure notifications are deleted before quotes
        
        # 3. Delete quotes
        db.query(Quote).filter(Quote.file_id == file_record.id).delete(synchronize_session=False)
        db.flush()  # Ensure quotes are deleted before notifications
        
        # 4. Delete notifications
        db.query(Notification).filter(Notification.file_id == file_record.id).delete(synchronize_session=False)

        # Try to delete from MinIO, but don't fail if it doesn't exist there
        try:
            minio_client.remove_object(MINIO_BUCKET, object_key)
        except Exception as e:
            # Log the warning but continue with database deletion
            print(f"Warning: Failed to delete from MinIO: {e}")
        
        # 5. Delete file record
        db.delete(file_record)
        db.commit()
        
        return True
    except Exception as e:
        # Rollback on any error
        db.rollback()
        print(f"Error in delete_file: {e}")
        raise
