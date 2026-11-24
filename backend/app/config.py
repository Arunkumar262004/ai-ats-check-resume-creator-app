from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./resume.db"
    anthropic_api_key: str = ""
    llm_provider: str = "anthropic"  # anthropic | gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    llm_model: str = "claude-sonnet-5-5"
    embed_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embed_dim: int = 384
    cors_origins: str = "http://localhost:5173"


settings = Settings()
