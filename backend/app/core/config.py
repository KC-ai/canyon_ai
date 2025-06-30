from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Canyon CPQ API"
    debug: bool = False
    version: str = "1.0.0"
    
    # Database
    database_url: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_jwt_secret: Optional[str] = None
    
    # API Keys
    anthropic_api_key: Optional[str] = None
    
    # Security
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS
    backend_cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    cors_origins: Optional[str] = None
    allowed_origins: Optional[str] = None
    
    # Environment
    environment: str = "development"
    dev_mode: bool = False
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "env_file_encoding": "utf-8"
    }


settings = Settings()