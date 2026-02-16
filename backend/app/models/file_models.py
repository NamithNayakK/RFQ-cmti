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
    description = Column(String, nullable=True)
    material = Column(String, nullable=True)
    part_number = Column(String, nullable=True)
    quantity_unit = Column(String, default='pieces', nullable=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class UploadRequest(BaseModel):
    filename: str = Field(..., description="Name of the CAD file")
    content_type: str = Field(default="application/octet-stream", description="MIME type of the file")
    description: Optional[str] = Field(None, max_length=500, description="Optional description of the CAD file")
    material: Optional[str] = Field(None, description="Material type")
    part_number: Optional[str] = Field(None, description="Part number")
    quantity_unit: Optional[str] = Field("pieces", description="Quantity unit (pieces, assemblies)")
    
    @validator('filename')
    def validate_cad_extension(cls, v):
        allowed_extensions = (
            '.stp', '.step', '.igs', '.iges', '.stl', '.dxf', '.dwg', 
            '.x_t', '.x_b', '.sat', '.3dm', '.prt', '.sldprt', '.sldasm', '.fcstd'
        )
        if not v.lower().endswith(allowed_extensions):
            raise ValueError(f'File must be a CAD format: {{", ".join(allowed_extensions)}}')
        return v

class FileResponse(BaseModel):
    id: int
    object_key: str
    original_name: str
    content_type: str
    description: Optional[str]
    material: Optional[str]
    part_number: Optional[str]
    quantity_unit: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FileListResponse(BaseModel):
    total: int
    files: list[FileResponse]
    
class FileSearchRequest(BaseModel):
    query: Optional[str] = Field(None, description="Search in filename")
    start_date: Optional[datetime] = Field(None, description="Filter files created after this date")
    end_date: Optional[datetime] = Field(None, description="Filter files created before this date")
    limit: int = Field(100, ge=1, le=500, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")
