from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ragdb"
    upload_dir: str = "storage/uploads"

    model_config = {"env_file": ".env"}


settings = Settings()
