# backend/app/database/connection.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# ── SQLite engine ────────────────────────────────────────────────────
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,    # set True to see SQL queries in terminal during dev
)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
class Base(DeclarativeBase):
    pass
def get_db():
    """FastAPI dependency — yields a DB session, closes it after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
def init_db():
    """Create all tables on startup. Safe to call multiple times."""
    from database import models   # import here to avoid circular imports
    Base.metadata.create_all(bind=engine)
def init_db():
    """Create all tables on startup."""
    from database import models          
    from routers import admin           
    Base.metadata.create_all(bind=engine)