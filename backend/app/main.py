from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.files import router as file_router
from app.routes.auth import router as auth_router
from app.routes.material_pricing import router as material_pricing_router
from app.routes.pricing import router as pricing_router
from app.routes.notifications import router as notification_router
from app.routes.quotes import router as quote_router
from app.config.database import init_db
from app.config.settings import CORS_ORIGINS, API_TITLE, API_VERSION
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=API_TITLE, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

app.include_router(auth_router)
app.include_router(file_router)
app.include_router(material_pricing_router)
app.include_router(pricing_router)
app.include_router(notification_router)
app.include_router(quote_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
