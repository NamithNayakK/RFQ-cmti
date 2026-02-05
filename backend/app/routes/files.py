from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.models.file_models import UploadRequest, FileResponse, FileListResponse, FileSearchRequest, File
from app.services.file_service import (
    generate_upload_url,
    generate_download_url,
    get_file_by_id,
    get_file_by_object_key,
    list_files,
    search_files,
    delete_file,
)
from app.config.database import get_db
from app.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["STP Files"], dependencies=[Depends(get_current_user)])

@router.post("/upload", 
             response_model=dict,
             summary="Request presigned upload URL for STP file", 
             description="Generate a presigned URL for uploading a STEP (.stp/.step) CAD file directly to MinIO storage")
def request_upload(data: UploadRequest, db: Session = Depends(get_db)):
    """
    Request a presigned upload URL for direct STP file upload to MinIO.
    
    **Manufacturing Requirements:**
    - Only .stp or .step files are accepted
    - Maximum file size: 500 MB
    - Files are organized by upload timestamp
    
    **Request Body:**
    - **filename**: Name of the STP file (required, must end with .stp or .step)
    - **content_type**: MIME type (default: application/stp)
    - **file_size**: Size in bytes (optional, for validation)
    - **uploaded_by**: User identifier (optional, for tracking)
    - **description**: Description of the CAD file (optional, max 500 chars)
    
    **Response:**
    - **upload_url**: Presigned URL valid for 15 minutes
    - **object_key**: Unique identifier for the file
    - **file_id**: Database record ID
    - **expires_in**: URL expiration time in seconds
    """
    try:
        logger.info(f"Upload request for STP file: {data.filename} by {data.uploaded_by}")
        
        upload_url, object_key, file_id = generate_upload_url(
            filename=data.filename,
            content_type=data.content_type,
            db=db,
            file_size=data.file_size,
            uploaded_by=data.uploaded_by,
            description=data.description,
            material=data.material,
            part_number=data.part_number,
            quantity_unit=data.quantity_unit,
            thumbnail_data=data.thumbnail_data
        )
        
        logger.info(f"Upload URL generated successfully for file_id: {file_id}")
        
        return {
            "upload_url": upload_url,
            "object_key": object_key,
            "file_id": file_id,
            "expires_in": 900,  # seconds
            "message": "Upload the file to the upload_url using HTTP PUT method"
        }
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload URL generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {str(e)}")


@router.get("/download/{object_key:path}", 
            summary="Request presigned download URL for STP file",
            description="Generate a presigned URL for downloading a STEP CAD file from MinIO storage")
def request_download(object_key: str, db: Session = Depends(get_db)):
    """
    Request a presigned download URL for an STP file stored in MinIO.
    
    **Path Parameter:**
    - **object_key**: The unique identifier of the file in storage
    
    **Response:**
    - **download_url**: Presigned URL valid for 1 hour
    - **file_metadata**: Complete file information
    - **expires_in**: URL expiration time in seconds
    """
    try:
        logger.info(f"Download request for object_key: {object_key}")
        
        download_url, file_metadata = generate_download_url(object_key, db)
        
        logger.info(f"Download URL generated for file: {file_metadata.original_name}")
        
        return {
            "download_url": download_url,
            "expires_in": 3600,  # seconds
            "file_metadata": FileResponse.from_orm(file_metadata)
        }
    except ValueError as e:
        logger.warning(f"File not found: {object_key}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Download URL generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")


@router.get("/metadata/{file_id}",
            response_model=FileResponse,
            summary="Get file metadata by ID",
            description="Retrieve complete metadata for a specific STP file without downloading")
def get_file_metadata(file_id: int, db: Session = Depends(get_db)):
    """
    Get detailed metadata for a specific STP file.
    
    **Path Parameter:**
    - **file_id**: Database record ID of the file
    
    **Returns:**
    Complete file information including size, version, uploader, timestamps, etc.
    """
    try:
        file_record = get_file_by_id(file_id, db)
        if not file_record:
            raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")
        
        return FileResponse.from_orm(file_record)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve file metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list",
            response_model=FileListResponse,
            summary="List all STP files with pagination",
            description="Retrieve a paginated list of all uploaded STP files")
def list_all_files(
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    uploaded_by: Optional[str] = Query(None, description="Filter by uploader"),
    db: Session = Depends(get_db)
):
    """
    List all STP files with pagination and optional filtering.
    
    **Query Parameters:**
    - **limit**: Maximum number of files to return (1-500, default: 100)
    - **offset**: Number of files to skip for pagination (default: 0)
    - **uploaded_by**: Filter files by specific uploader (optional)
    
    **Returns:**
    - **total**: Total number of matching files
    - **files**: List of file metadata
    """
    try:
        files, total = list_files(db, limit=limit, offset=offset, uploaded_by=uploaded_by)
        
        return FileListResponse(
            total=total,
            files=[FileResponse.from_orm(f) for f in files]
        )
    except Exception as e:
        logger.error(f"Failed to list files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search",
             response_model=FileListResponse,
             summary="Search STP files with filters",
             description="Advanced search for STP files by name, uploader, date range")
def search_stp_files(search_params: FileSearchRequest, db: Session = Depends(get_db)):
    """
    Advanced search for STP files with multiple filters.
    
    **Request Body:**
    - **query**: Search in filename (case-insensitive, partial match)
    - **uploaded_by**: Filter by specific uploader
    - **start_date**: Filter files created after this date
    - **end_date**: Filter files created before this date
    - **limit**: Maximum results (1-500, default: 100)
    - **offset**: Pagination offset (default: 0)
    
    **Returns:**
    - **total**: Total number of matching files
    - **files**: List of matching file metadata
    """
    try:
        files, total = search_files(search_params, db)
        
        return FileListResponse(
            total=total,
            files=[FileResponse.from_orm(f) for f in files]
        )
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{object_key:path}",
               summary="Delete STP file",
               description="Delete a file from both database and MinIO storage")
def delete_stp_file(object_key: str, db: Session = Depends(get_db)):
    """
    Delete an STP file from both the database and MinIO storage.
    
    **Path Parameter:**
    - **object_key**: The unique identifier of the file
    
    **Returns:**
    Success message if deletion is successful
    """
    try:
        logger.warning(f"Delete request for object_key: {object_key}")
        
        # Verify file exists before attempting deletion
        file_record = db.query(File).filter(File.object_key == object_key).first()
        if not file_record:
            logger.warning(f"File not found for deletion: {object_key}")
            raise HTTPException(status_code=404, detail=f"File not found: {object_key}")
        
        # Attempt deletion
        try:
            success = delete_file(object_key, db)
            if not success:
                raise HTTPException(status_code=404, detail=f"File not found: {object_key}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Database error during deletion: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
        
        logger.info(f"File deleted successfully: {object_key}")
        
        return {
            "message": "File deleted successfully",
            "object_key": object_key
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
