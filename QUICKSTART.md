# Quick Start Guide - Manufacturing STP File Storage System

## System Status: ✅ FULLY OPERATIONAL

---

## Running the Application

### Method 1: PowerShell Script (Recommended)

**Start Backend:**
```powershell
cd d:\ADA
.\start.ps1 -Command backend
```

**Start Frontend (in new terminal):**
```powershell
cd d:\ADA
.\start.ps1 -Command frontend
```

### Method 2: Batch Files

**Terminal 1 - Backend:**
```batch
d:\ADA\start_backend.bat
```

**Terminal 2 - Frontend:**
```batch
d:\ADA\start_frontend.bat
```

### Method 3: Manual Commands

**Backend:**
```bash
cd d:\ADA\backend
d:\ADA\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend (new terminal):**
```bash
cd d:\ADA\frontend
npm install
npm run dev
```

---

## Accessing the Application

| Component | URL | Purpose |
|-----------|-----|---------|
| Web App | http://localhost:3000 | File upload/download interface |
| API Docs | http://localhost:8000/docs | Interactive API testing |
| ReDoc | http://localhost:8000/redoc | API documentation |
| Health Check | http://localhost:8000/ | API status |
| DB Check | http://localhost:8000/db-check | Database status |

---

## What's Running

```
Backend:   http://localhost:8000  (FastAPI + Uvicorn)
Frontend:  http://localhost:3000  (React + Vite)
Database:  localhost:5432         (PostgreSQL)
Storage:   localhost:9000         (MinIO)
```

---

## Key Features

✅ Upload STEP (.stp/.step) files up to 500 MB  
✅ Download files with presigned URLs  
✅ Search files by name, user, or date  
✅ Track file versions and history  
✅ Complete audit logging  
✅ Direct client-to-storage transfers  

---

## Troubleshooting

### Port Already in Use
```powershell
# Find and kill process using port 8000 or 3000
lsof -i :8000  # Find what's using port 8000
kill -9 <PID>  # Kill the process
```

### Database Connection Error
- Ensure PostgreSQL is running
- Check credentials in `.env` file
- Database: `filedb`, User: `postgres`, Password: `nnk123`

### MinIO Not Responding
- Ensure MinIO is running on `localhost:9000`
- Will auto-create bucket on first request

### Dependencies Issues
```bash
# Backend
cd d:\ADA\backend
d:\ADA\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Frontend
cd d:\ADA\frontend
npm install
```

---

## API Examples

### Get Health Status
```bash
curl http://localhost:8000/
```

### Check Database
```bash
curl http://localhost:8000/db-check
```

### List Files
```bash
curl http://localhost:8000/files/list
```

### Upload File (Request URL)
```bash
curl -X POST http://localhost:8000/files/upload \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "design.stp",
    "content_type": "application/stp",
    "file_size": 1024000,
    "uploaded_by": "engineer@company.com",
    "description": "Product design v2"
  }'
```

---

## Documentation Files

- [FINAL_STATUS_REPORT.md](FINAL_STATUS_REPORT.md) - Complete system status
- [RESOLUTION_SUMMARY.md](RESOLUTION_SUMMARY.md) - Issues and fixes
- [SETUP_AND_FIXES.md](SETUP_AND_FIXES.md) - Detailed setup guide

---

## Important Notes

- ✅ System auto-creates database tables on startup
- ✅ MinIO auto-creates bucket on first file request  
- ✅ All endpoints documented at http://localhost:8000/docs
- ✅ Files logged to `d:\ADA\backend\manufacturing_api.log`
- ✅ No manual database setup required

---

**Status:** Ready to use ✅  
**Last Updated:** 2026-02-01  
**All Issues:** Resolved ✅
