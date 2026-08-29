from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Tazkiyah Daily Finance & Wealth OS"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5435
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "tazkiyah_db"
    POSTGRES_TEST_DB: str = "tazkiyah_test_db"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6381
    
    # WhatsApp Meta Cloud API (Optional for Milestone 1)
    WHATSAPP_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: Optional[str] = "tazkiyah_verify_secret"
    
    # Gemini API Key (Optional for Milestone 1)
    GEMINI_API_KEY: Optional[str] = None

    @property
    def async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def test_async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_TEST_DB}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
