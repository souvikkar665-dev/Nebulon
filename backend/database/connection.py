from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.base import Base
from backend.models.db import User, SystemClearance, SessionToken, Review, Planet, Simulation

DATABASE_URL = "sqlite:///./nebulon.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

_db_initialized = False

def init_db():
    """Initializes SQLite database tables and seeds default clearances & authorized members if missing."""
    global _db_initialized
    if _db_initialized:
        return
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed System Clearances if empty
        if db.query(SystemClearance).count() == 0:
            clearances = [
                SystemClearance(system_key_name="nebulon", access_cipher_hash="nebulon@2070", security_level="LEVEL_5_OMEGA"),
                SystemClearance(system_key_name="nebulon-admin", access_cipher_hash="nebulon@2070", security_level="LEVEL_5_OMEGA"),
                SystemClearance(system_key_name="nebulon-2070", access_cipher_hash="nebulon-omega-2070", security_level="LEVEL_5_OMEGA"),
                SystemClearance(system_key_name="nebulon_core", access_cipher_hash="nebulon@2070", security_level="LEVEL_5_OMEGA"),
                SystemClearance(system_key_name="nebulon-system", access_cipher_hash="ULTRON-OMEGA-2070", security_level="LEVEL_5_OMEGA"),
                SystemClearance(system_key_name="admin", access_cipher_hash="nebulon@2070", security_level="LEVEL_5_OMEGA")
            ]
            db.add_all(clearances)
            db.commit()

        # Seed Authorized Members if empty
        if db.query(User).count() == 0:
            members = [
                User(
                    member_id="souvik",
                    callsign="Souvik Kar",
                    password_hash="souvik@2070",
                    role="Mission Director & Orbital Architect",
                    clearance_badge="OMEGA-DIRECTOR",
                    ground_segment="Svalbard Polar Primary (GS-142)",
                    is_active=True,
                    created_at=datetime.now(timezone.utc)
                ),
                User(
                    member_id="debangshu",
                    callsign="Debangshu",
                    password_hash="debangshu@2070",
                    role="Lead Spacecraft Telemetry Analyst",
                    clearance_badge="ALPHA-ANALYST",
                    ground_segment="Hawaii Pacific Deep Space (GS-088)",
                    is_active=True,
                    created_at=datetime.now(timezone.utc)
                ),
                User(
                    member_id="sneha",
                    callsign="Sneha Maiti",
                    password_hash="sneha@2070",
                    role="Ground Station Network Commander",
                    clearance_badge="SIGMA-COMMANDER",
                    ground_segment="Hartebeesthoek Southern Array (GS-044)",
                    is_active=True,
                    created_at=datetime.now(timezone.utc)
                ),
                User(
                    member_id="arunima",
                    callsign="Arunima",
                    password_hash="arunima@2070",
                    role="Quantum RF & Doppler Specialist",
                    clearance_badge="DELTA-SPECIALIST",
                    ground_segment="Kiruna Arctic Ground Segment (GS-204)",
                    is_active=True,
                    created_at=datetime.now(timezone.utc)
                )
            ]
            db.add_all(members)
            db.commit()
        _db_initialized = True
    finally:
        db.close()

def get_db():
    """FastAPI Request-Scoped Database Session Dependency Generator."""
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()