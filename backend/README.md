# Manufacturing STP File Storage API

A production-ready FastAPI application for managing STEP (.stp/.step) CAD files in manufacturing environments.

## Features

### Manufacturing-Specific
- ✅ **STP File Validation** - Only accepts .stp and .step files (industry standard)
- ✅ **Large File Support** - Handles files up to 500 MB
- ✅ **Version Tracking** - Track file versions and revisions
- ✅ **User Attribution** - Track who uploaded each file
- ✅ **File Descriptions** - Add context to CAD files
- ✅ **Audit Logging** - Complete activity logs for compliance

### Technical Features
- ✅ **SQLAlchemy ORM** - Type-safe database operations
- ✅ **Connection Pooling** - Optimized for high-volume operations
- ✅ **Presigned URLs** - Direct client-to-storage transfers (no server bottleneck)
- ✅ **Advanced Search** - Search by name, user, date range
- ✅ **Pagination** - Efficient handling of large file collections
- ✅ **CORS Support** - Frontend integration ready
- ✅ **Comprehensive API Docs** - Auto-generated OpenAPI documentation

## Technology Stack

- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database for metadata
- **MinIO** - S3-compatible object storage
- **SQLAlchemy** - Python SQL toolkit and ORM
- **Uvicorn** - ASGI server

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- MinIO Server (or compatible S3 storage)
- Virtual environment (recommended)

## Installation

1. **Clone the repository and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # or
   source .venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Create a `.env` file in the backend directory:
   ```env
   # MinIO Configuration
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_BUCKET=stp-files
   MINIO_SECURE=false

   # Database Configuration
   DATABASE_URL=postgresql://postgres:password@localhost:5432/filedb

   # API Configuration (optional)
   MAX_FILE_SIZE_MB=500
   CORS_ORIGINS=*
   ```

5. **Start PostgreSQL and create database:**
   ```sql
   CREATE DATABASE filedb;
   ```

6. **Start MinIO server:**
   ```bash
   minio server D:\minio-data
   ```

## Running the Application

```bash
cd backend
uvicorn app.main:app --reload
```

The API will be available at:
- **API**: http://127.0.0.1:8000
- **Interactive Docs (Swagger)**: http://127.0.0.1:8000/docs
- **Alternative Docs (ReDoc)**: http://127.0.0.1:8000/redoc

## API Endpoints

### File Operations

#### Upload STP File
```http
POST /files/upload
Content-Type: application/json

{
  "filename": "part_design_v1.stp",
  "content_type": "application/stp",
  "file_size": 1024000,
  "uploaded_by": "engineer@company.com",
  "description": "Main housing component design"
}
```

Response:
```json
{
  "upload_url": "http://localhost:9000/stp-files/stp/...",
  "object_key": "stp/20260130_120000_uuid_part_design_v1.stp",
  "file_id": 1,
  "expires_in": 900,
  "message": "Upload the file to the upload_url using HTTP PUT method"
}
```

#### Upload File to Presigned URL
```bash
curl -X PUT "upload_url" --upload-file part_design_v1.stp
```

#### Download STP File
```http
GET /files/download/{object_key}
```

Response:
```json
{
  "download_url": "http://localhost:9000/stp-files/stp/...",
  "expires_in": 3600,
  "file_metadata": {
    "id": 1,
    "original_name": "part_design_v1.stp",
    "file_size": 1024000,
    ...
  }
}
```

#### List All Files
```http
GET /files/list?limit=50&offset=0&uploaded_by=engineer@company.com
```

#### Search Files
```http
POST /files/search
Content-Type: application/json

{
  "query": "housing",
  "uploaded_by": "engineer@company.com",
  "start_date": "2026-01-01T00:00:00",
  "limit": 100
}
```

#### Get File Metadata
```http
GET /files/metadata/{file_id}
```

#### Delete File
```http
DELETE /files/{object_key}
```

### Health Checks

#### API Health
```http
GET /
```

#### Database Health
```http
GET /db-check
```

## Database Schema

```sql
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    object_key VARCHAR UNIQUE NOT NULL,
    original_name VARCHAR NOT NULL,
    content_type VARCHAR NOT NULL,
    file_size BIGINT,
    checksum VARCHAR,
    version INTEGER DEFAULT 1,
    uploaded_by VARCHAR,
    description VARCHAR,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_files_original_name ON files(original_name);
CREATE INDEX idx_files_object_key ON files(object_key);
CREATE INDEX idx_files_created_at ON files(created_at);
```

## File Validation Rules

- **Allowed Extensions**: .stp, .step, .STP, .STEP
- **Maximum File Size**: 500 MB (configurable)
- **Content Types**: application/stp, application/step, model/step, model/stp

## Security Best Practices

1. **Authentication**: Implement JWT or OAuth2 for production
2. **Authorization**: Add role-based access control (RBAC)
3. **HTTPS**: Always use HTTPS in production
4. **Environment Variables**: Never commit .env files
5. **CORS**: Configure specific origins instead of "*"
6. **Rate Limiting**: Implement rate limiting for public APIs
7. **File Scanning**: Add malware scanning for uploaded files

## Logging

All file operations are logged to:
- Console output (development)
- `manufacturing_api.log` file

Log format includes:
- Timestamp
- Log level
- Module name
- Message

## Performance Optimization

- **Connection Pooling**: 10 connections with 20 max overflow
- **Pre-ping**: Database health checks before queries
- **Presigned URLs**: Direct client-to-storage transfers
- **Indexed Queries**: Database indexes on key fields
- **Pagination**: Efficient large dataset handling

## Development

### Running Tests
```bash
pytest tests/
```

### Database Migrations
```bash
alembic init migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Code Formatting
```bash
black app/
isort app/
```

## Production Deployment

1. Set `MINIO_SECURE=true`
2. Use strong database passwords
3. Configure proper CORS origins
4. Enable HTTPS
5. Set up monitoring and alerts
6. Configure backup strategies
7. Implement authentication/authorization
8. Set up log aggregation

## Troubleshooting

### MinIO Connection Refused
- Ensure MinIO server is running: `minio server D:\minio-data`
- Check MINIO_ENDPOINT in .env

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL credentials
- Ensure database exists

### File Upload Fails
- Check file extension (.stp or .step)
- Verify file size < 500 MB
- Ensure MinIO bucket exists

## License

MIT License

## Support

For issues and questions:
- Email: support@manufacturing.example.com
- Documentation: http://127.0.0.1:8000/docs
