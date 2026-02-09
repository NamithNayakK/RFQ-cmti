from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.file_models import Base
from app.config.settings import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import file_models, notification_models, quote_models, quote_notification_models, user_models
    Base.metadata.create_all(bind=engine)


def ensure_thumbnail_column():
    with engine.begin() as conn:
        result = conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'files' AND column_name = 'thumbnail_data'"
            )
        )
        if not result.fetchone():
            conn.execute(text("ALTER TABLE files ADD COLUMN thumbnail_data TEXT"))
