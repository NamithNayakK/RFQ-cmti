from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from app.config.settings import DATABASE_URL

# Create SQLAlchemy engine with connection pooling
# pool_size: number of connections to maintain
# max_overflow: number of connections that can be created beyond pool_size
# pool_pre_ping: verify connections before using them
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False  # Set to True for SQL query logging
)

# Create SessionLocal class for dependency injection
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI endpoints.
    Creates a new SQLAlchemy session for each request.
    Automatically closes the session after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    from app.models.file_models import Base as FileBase
    from app.models.notification_models import Base as NotificationBase
    from app.models.quote_models import Base as QuoteBase
    from app.models.quote_notification_models import Base as QuoteNotificationBase
    FileBase.metadata.create_all(bind=engine)
    NotificationBase.metadata.create_all(bind=engine)
    QuoteBase.metadata.create_all(bind=engine)
    QuoteNotificationBase.metadata.create_all(bind=engine)

def ensure_thumbnail_column():
    """Ensure thumbnail_data column exists on files table"""
    inspector = inspect(engine)
    if "files" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("files")}
    if "thumbnail_data" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE files ADD COLUMN thumbnail_data TEXT"))
