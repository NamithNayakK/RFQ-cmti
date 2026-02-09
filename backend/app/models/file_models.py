from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Optional

Base = declarative_base()

class File(Base):
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    object_key = Column(String, unique=True, nullable=False, index=True)
    original_name = Column(String, nullable=False, index=True)
    content_type = Column(String, nullable=False)
    file_size = Column(BigInteger, nullable=True)
    uploaded_by = Column(String, nullable=True)
    description = Column(String, nullable=True)
    material = Column(String, nullable=True)
    part_number = Column(String, nullable=True)
    quantity_unit = Column(String, default='pieces', nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class UploadRequest(BaseModel):
    filename: str = Field(..., description="Name of the CAD file (must end with .stp, .step, .igs, or .iges)")
    content_type: str = Field(default="application/stp", description="MIME type of the file")
    file_size: Optional[int] = Field(None, description="File size in bytes", ge=0)
    uploaded_by: Optional[str] = Field(None, description="User ID or email of uploader")
    description: Optional[str] = Field(None, max_length=500, description="Optional description of the CAD file")
    material: Optional[str] = Field(None, description="Material type")
    part_number: Optional[str] = Field(None, description="Part number")
    quantity_unit: Optional[str] = Field("pieces", description="Quantity unit (pieces, assemblies)")
    
    @validator('filename')
    def validate_stp_extension(cls, v):
        if not v.lower().endswith(('.stp', '.step', '.igs', '.iges')):
            raise ValueError('Only .stp, .step, .igs, or .iges files are allowed for manufacturing CAD files')
        return v
    
    @validator('file_size')
    def validate_file_size(cls, v):
        if v and v > 500 * 1024 * 1024:
            raise ValueError('File size must not exceed 500 MB')
        return v

class FileResponse(BaseModel):
    id: int
    object_key: str
    original_name: str
    content_type: str
    file_size: Optional[int]
    uploaded_by: Optional[str]
    description: Optional[str]
    material: Optional[str]
    part_number: Optional[str]
    quantity_unit: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FileListResponse(BaseModel):
    total: int
    files: list[FileResponse]
    
class FileSearchRequest(BaseModel):
    query: Optional[str] = Field(None, description="Search in filename")
    uploaded_by: Optional[str] = Field(None, description="Filter by uploader")
    start_date: Optional[datetime] = Field(None, description="Filter files created after this date")
    end_date: Optional[datetime] = Field(None, description="Filter files created before this date")
    limit: int = Field(100, ge=1, le=500, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")
