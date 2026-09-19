from sqlalchemy.orm import Session
from fastapi import Depends
from backend.database.connection import get_db
from backend.repositories.base_repository import BaseAuthRepository
from backend.repositories.base_mission_repository import BaseMissionRepository
from backend.repositories.sqlalchemy_auth_repository import SQLAlchemyAuthRepository
from backend.repositories.sqlalchemy_mission_repository import SQLAlchemyMissionRepository

def get_auth_repository(db: Session = Depends(get_db)) -> BaseAuthRepository:
    """FastAPI Request-Scoped Provider for Authentication Repository."""
    return SQLAlchemyAuthRepository(db)

def get_mission_repository(db: Session = Depends(get_db)) -> BaseMissionRepository:
    """FastAPI Request-Scoped Provider for Mission Repository."""
    return SQLAlchemyMissionRepository(db)
