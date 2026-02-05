# Manufacturing STP File Storage - Setup & Issue Resolution

## Issues Found and Resolved

### 1. **Missing `__init__.py` Files (Module Import Error)**
   
   **Problem:** Python could not import the `app` module because the package structure was incomplete.
   
   **Root Cause:** The `app/` directory and its subdirectories (`config/`, `models/`, `routes/`, `services/`, `storage/`) were missing `__init__.py` files, which are required to make Python packages recognizable as modules.
   
   **Solution:** Created `__init__.py` files in all required directories:
   - `d:\ADA\backend\app\__init__.py`
   - `d:\ADA\backend\app\config\__init__.py`
   - `d:\ADA\backend\app\models\__init__.py`
   - `d:\ADA\backend\app\routes\__init__.py`
   - `d:\ADA\backend\app\services\__init__.py`
   - `d:\ADA\backend\app\storage\__init__.py`

### 2. **Database Connection**
   
   **Status:** ✅ Working Properly
   
   **Configuration:**
   - Database URL: `postgresql://postgres:nnk123@localhost:5432/filedb`
   - Connection pooling: Enabled (10 connections with 20 overflow)
   - Pool pre-ping: Enabled (validates connections before use)
   - On startup: Database tables are automatically created via SQLAlchemy ORM
   
   **Files:**
   - [backend/app/config/database.py](backend/app/config/database.py) - Database configuration
   - [backend/app/config/settings.py](backend/app/config/settings.py) - Environment variables
   - [backend/.env](backend/.env) - Database credentials

### 3. **MinIO Connection**
   
   **Status:** ✅ Working Properly
   
   **Configuration:**
   - Endpoint: `localhost:9000`
   - Access Key: `minioadmin`
   - Secret Key: `minioadmin`
   - Bucket: `stp-file`
   - Secure: `false` (HTTP)
   
   **Features:**
   - Automatic bucket creation on first request via `ensure_bucket()` function
   - Presigned URL generation for secure file uploads/downloads
   - S3-compatible object storage
   
   **Files:**
   - [backend/app/storage/minio_client.py](backend/app/storage/minio_client.py) - MinIO configuration

## Running the Application

### Option 1: Using PowerShell Script (Recommended)

```powershell
# Start Backend
.\start.ps1 -Command backend

# In another terminal, start Frontend
.\start.ps1 -Command frontend
```

### Option 2: Using Batch Files

**Terminal 1 - Backend:**
```batch
d:\ADA\start_backend.bat
```

**Terminal 2 - Frontend:**
```batch
d:\ADA\start_frontend.bat
```

### Option 3: Manual Commands

**Backend (Python):**
```bash
cd d:\ADA\backend
d:\ADA\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend (Node.js):**
```bash
cd d:\ADA\frontend
npm install
npm run dev
```

## Service Status

### Backend API
- **URL:** http://localhost:8000
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** GET http://localhost:8000/
- **Database Check:** GET http://localhost:8000/db-check

### Frontend Application
- **URL:** http://localhost:3000
- **Build Tool:** Vite
- **Framework:** React 18

## API Endpoints

### File Operations
- `POST /files/upload` - Request presigned upload URL for STP files
- `GET /files/download/{object_key}` - Request presigned download URL
- `GET /files/metadata/{file_id}` - Get file metadata
- `GET /files/list` - List all files with pagination
- `POST /files/search` - Advanced search with filters
- `DELETE /files/{object_key}` - Delete file

### Health & Monitoring
- `GET /` - API health check
- `GET /db-check` - Database connectivity check

## Environment Variables (.env)

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=stp-file
MINIO_SECURE=false

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:nnk123@localhost:5432/filedb

# API Configuration
MAX_FILE_SIZE_MB=500
CORS_ORIGINS=*
```

## Technology Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Object Storage:** MinIO (S3-compatible)
- **Server:** Uvicorn ASGI
- **Connection Pooling:** SQLAlchemy with pre-ping validation

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **UI Components:** React Icons

## Dependencies

### Backend (`backend/requirements.txt`)
```
fastapi
uvicorn
minio
psycopg2-binary
python-dotenv
sqlalchemy
alembic
```

### Frontend (`frontend/package.json`)
```
react@^18.2.0
react-dom@^18.2.0
axios@^1.6.2
react-icons@^5.0.1
```

## Features

✅ STP/STEP file validation  
✅ Direct client-to-storage uploads (presigned URLs)  
✅ Large file support (up to 500 MB)  
✅ File versioning and tracking  
✅ Complete audit trail logging  
✅ User tracking for all operations  
✅ Advanced search with filters  
✅ Connection pooling for high-volume operations  
✅ Automatic database initialization  
✅ CORS support for frontend integration  

## Troubleshooting

### Backend Won't Start
1. Verify Python environment is activated: `d:\ADA\.venv\Scripts\activate.ps1`
2. Check PostgreSQL is running and accessible
3. Verify MinIO is running on port 9000
4. Check `.env` file has correct credentials

### Database Connection Error
- Ensure PostgreSQL service is running
- Verify credentials in `.env` match your PostgreSQL setup
- Check database `filedb` exists and is accessible

### MinIO Connection Error
- Ensure MinIO service is running on `localhost:9000`
- Verify bucket name and credentials in `.env`
- MinIO will automatically create the bucket on first request

### Frontend Won't Start
1. Verify Node.js is installed: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and reinstall: `npm install`

## Logs

- **Backend:** `d:\ADA\backend\manufacturing_api.log`
- **Frontend:** Check browser console (F12 Developer Tools)

---

**Last Updated:** 2026-02-01  
**System Status:** ✅ All Issues Resolved - Ready to Run
