from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Optional

Base = declarative_base()

# SQLAlchemy ORM Model for STP Files
class File(Base):
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    object_key = Column(String, unique=True, nullable=False, index=True)
    original_name = Column(String, nullable=False, index=True)
    content_type = Column(String, nullable=False)
    file_size = Column(BigInteger, nullable=True)  # Size in bytes
    checksum = Column(String, nullable=True)  # MD5 or SHA256 for integrity
    version = Column(Integer, default=1, nullable=False)  # File version
    uploaded_by = Column(String, nullable=True)  # User identifier
    description = Column(String, nullable=True)  # Optional file description
    material = Column(String, nullable=True)  # Material type
    part_number = Column(String, nullable=True)  # Part number
    quantity_unit = Column(String, default='pieces', nullable=True)  # Quantity unit (pieces, assemblies)
    thumbnail_data = Column(Text, nullable=True)  # Base64 thumbnail data URL
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

# Pydantic Models for API
class UploadRequest(BaseModel):
    filename: str = Field(..., description="Name of the CAD file (must end with .stp, .step, .igs, or .iges)")
    content_type: str = Field(default="application/stp", description="MIME type of the file")
    file_size: Optional[int] = Field(None, description="File size in bytes", ge=0)
    uploaded_by: Optional[str] = Field(None, description="User ID or email of uploader")
    description: Optional[str] = Field(None, max_length=500, description="Optional description of the CAD file")
    material: Optional[str] = Field(None, description="Material type")
    part_number: Optional[str] = Field(None, description="Part number")
    quantity_unit: Optional[str] = Field("pieces", description="Quantity unit (pieces, assemblies)")
    thumbnail_data: Optional[str] = Field(None, description="Base64 PNG thumbnail data URL")
    
    @validator('filename')
    def validate_stp_extension(cls, v):
        """Validate that file has .stp/.step/.igs/.iges extension"""
        if not v.lower().endswith(('.stp', '.step', '.igs', '.iges')):
            raise ValueError('Only .stp, .step, .igs, or .iges files are allowed for manufacturing CAD files')
        return v
    
    @validator('file_size')
    def validate_file_size(cls, v):
        """Validate file size limit (500 MB max for STP files)"""
        if v and v > 500 * 1024 * 1024:  # 500 MB
            raise ValueError('File size must not exceed 500 MB')
        return v

class FileResponse(BaseModel):
    id: int
    object_key: str
    original_name: str
    content_type: str
    file_size: Optional[int]
    checksum: Optional[str]
    version: int
    uploaded_by: Optional[str]
    description: Optional[str]
    material: Optional[str]
    part_number: Optional[str]
    quantity_unit: Optional[str]
    thumbnail_data: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FileListResponse(BaseModel):
    """Response for listing multiple files"""
    total: int
    files: list[FileResponse]
    
class FileSearchRequest(BaseModel):
    """Request model for searching files"""
    query: Optional[str] = Field(None, description="Search in filename")
    uploaded_by: Optional[str] = Field(None, description="Filter by uploader")
    start_date: Optional[datetime] = Field(None, description="Filter files created after this date")
    end_date: Optional[datetime] = Field(None, description="Filter files created before this date")
    limit: int = Field(100, ge=1, le=500, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")
