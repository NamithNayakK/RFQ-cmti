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
    from app.routes.pricing import MaterialPrice
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE files ADD COLUMN created_by VARCHAR"))
        except Exception:
            pass
        try:
            conn.execute(text("UPDATE files SET created_by = 'buyer' WHERE created_by IS NULL"))
        except Exception:
            pass



