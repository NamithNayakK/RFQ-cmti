from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.routes.files import router as file_router
from app.routes.auth import router as auth_router
from app.routes.material_pricing import router as material_pricing_router
from app.routes.notifications import router as notification_router
from app.routes.quotes import router as quote_router
from app.config.database import get_db, init_db, ensure_thumbnail_column
from app.config.settings import CORS_ORIGINS, API_TITLE, API_VERSION
import logging

# Configure logging for manufacturing audit trail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('manufacturing_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Enhanced API documentation metadata for Manufacturing Industry
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    contact={
        "name": "Manufacturing IT Support",
        "email": "support@manufacturing.example.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
    openapi_url="/openapi.json",
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Configure in .env
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # Allow all headers
)

# Initialize database tables on startup
@app.on_event("startup")
async def startup_event():
    """Create database tables if they don't exist"""
    logger.info("Starting Manufacturing STP File Storage API...")
    try:
        init_db()
        ensure_thumbnail_column()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

# Include routers
app.include_router(auth_router)
app.include_router(file_router)
app.include_router(material_pricing_router)
app.include_router(notification_router)
app.include_router(quote_router)

@app.get("/", tags=["Health"])
def health():
    """Health check endpoint - verifies API is running"""
    return {
        "status": "ok",
        "service": "Manufacturing STP File Storage API",
        "version": API_VERSION,
        "description": "STEP file management for manufacturing industry"
    }

@app.get("/db-check", tags=["Health"])
def db_check(db: Session = Depends(get_db)):
    """Database connectivity check - verifies PostgreSQL connection and connection pool"""
    try:
        # Execute a simple query to verify database connection
        result = db.execute(text("SELECT 1 as test")).fetchone()
        logger.info("Database health check successful")
        return {
            "status": "connected",
            "database": "PostgreSQL",
            "connection_pool": "active",
            "test_query_result": result[0]
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "error",
            "database": "PostgreSQL",
            "error": str(e)
        }
