from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.config.database import get_db
from app.auth import get_current_user
from app.models.file_models import UploadRequest, FileResponse, FileListResponse, FileSearchRequest
from app.services.file_service import (
    generate_upload_url,
    generate_download_url,
    list_files,
    search_files,
    get_file_by_id,
    delete_file,
)
from app.services.simple_mesh_service import generate_mesh_url

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/upload")
def request_upload_url(
    data: UploadRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        upload_url, download_url, file_id = generate_upload_url(
            filename=data.filename,
            content_type=data.content_type,
            db=db,
            created_by=current_user['username'],
            description=data.description,
            material=data.material,
            part_number=data.part_number,
            quantity_unit=data.quantity_unit,
        )
        return {"upload_url": upload_url, "download_url": download_url, "file_id": file_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list", response_model=FileListResponse)
def list_files_endpoint(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    files, total = list_files(db, limit=limit, offset=offset)
    return {"total": total, "files": [FileResponse.from_orm(f) for f in files]}


@router.post("/search", response_model=FileListResponse)
def search_files_endpoint(
    search_params: FileSearchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    files, total = search_files(search_params, db)
    return {"total": total, "files": [FileResponse.from_orm(f) for f in files]}


@router.get("/metadata/{file_id}", response_model=FileResponse)
def get_metadata(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file_record = get_file_by_id(file_id, db)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse.from_orm(file_record)


@router.get("/download/{object_key:path}")
def request_download_url(
    object_key: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        download_url, file_record = generate_download_url(object_key, db)
        return {"download_url": download_url, "file": FileResponse.from_orm(file_record)}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/mesh/{object_key:path}")
def request_mesh_url(
    object_key: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        mesh_url, mesh_key = generate_mesh_url(object_key, db)
        return {"mesh_url": mesh_url, "mesh_key": mesh_key}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        error_msg = str(e)
        if "FreeCAD command not found" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="FreeCAD is not installed. Please install FreeCAD and configure FREECAD_CMD. See INSTALL_FREECAD.md for instructions."
            )
        elif "trimesh" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Required Python package 'trimesh' is not installed. Run: pip install trimesh"
            )
        else:
            raise HTTPException(status_code=500, detail=f"Mesh conversion failed: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.delete("/{object_key:path}")
def delete_file_endpoint(
    object_key: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    success = delete_file(object_key, db)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"success": True}
