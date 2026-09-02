import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from backend/.env or backend/config/.env
env_path = BASE_DIR / ".env"
if not env_path.exists():
    env_path = BASE_DIR / "config" / ".env"

if env_path.exists():
    load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "Nebulon Orbital Identity API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security & Tokens
    SECRET_KEY: str = os.getenv("NEBULON_SECRET_KEY", "nebulon_omega_2070_super_secret_jwt_key_change_in_production")
    ALGORITHM: str = os.getenv("NEBULON_JWT_ALGORITHM", "HS256")
    STEP1_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("STEP1_TOKEN_EXPIRE_MINUTES", "240"))  # 4 hours
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")) # 8 hours

    # CORS Settings
    CORS_ORIGINS: list[str] = [
        "http://localhost",
        "http://localhost:8000",
        "http://localhost:5500",
        "http://127.0.0.1",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5500",
        "*"
    ]

settings = Settings()
