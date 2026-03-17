"""
database.py — SQLAlchemy engine, session, and base model configuration.

Provides async database session management and the declarative Base
class for all ORM models.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.config import get_settings

settings = get_settings()

# Create SQLAlchemy engine
# Use synchronous engine for simplicity with FastAPI's dependency injection
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


def get_db() -> Session:
    """Dependency that provides a database session.

    Yields a SQLAlchemy session and ensures it is closed after use.

    Yields:
        Session: Database session for the current request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
