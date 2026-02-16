import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET")
MINIO_SECURE = os.getenv("MINIO_SECURE") == "true"

DATABASE_URL = os.getenv("DATABASE_URL")

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "500"))
ALLOWED_EXTENSIONS = [".stp", ".step", ".igs", ".iges", ".STP", ".STEP", ".IGS", ".IGES"]
ALLOWED_CONTENT_TYPES = [
    "application/stp",
    "application/step",
    "application/STEP",
    "application/iges",
    "application/IGES",
    "application/octet-stream",
    "model/step",
    "model/stp",
    "model/iges"
]

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
API_TITLE = "Manufacturing STP File Storage API"
API_VERSION = "2.0.0"

AUTH_USERNAME = os.getenv("AUTH_USERNAME")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD")
AUTH_PASSWORD_HASH = os.getenv("AUTH_PASSWORD_HASH")

BUYER_USERNAME = os.getenv("BUYER_USERNAME")
BUYER_PASSWORD = os.getenv("BUYER_PASSWORD")
BUYER_PASSWORD_HASH = os.getenv("BUYER_PASSWORD_HASH")

MANUFACTURER_USERNAME = os.getenv("MANUFACTURER_USERNAME")
MANUFACTURER_PASSWORD = os.getenv("MANUFACTURER_PASSWORD")
MANUFACTURER_PASSWORD_HASH = os.getenv("MANUFACTURER_PASSWORD_HASH")

AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# Live Material Pricing Configuration (Indian Market Rates in INR)
MATERIAL_PRICE_CACHE_MINUTES = int(os.getenv("MATERIAL_PRICE_CACHE_MINUTES", "1440"))  # 24 hours
DEFAULT_LABOR_COST_INR = float(os.getenv("DEFAULT_LABOR_COST_INR", "350"))  # ₹/hour
DEFAULT_MACHINE_COST_INR = float(os.getenv("DEFAULT_MACHINE_COST_INR", "500"))  # ₹/hour

# FreeCAD for mesh generation (set to FreeCADCmd or FreeCADCmd.exe)
FREECAD_CMD = os.getenv("FREECAD_CMD", "FreeCADCmd")
