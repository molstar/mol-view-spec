from pathlib import Path

from pydantic_settings import BaseSettings


class _Settings(BaseSettings):
    TEST_DATA_DIR: Path = Path(__file__).absolute().parent.parent.parent / "test-data"
    VIEWER_DEFAULTS_DIR: Path = Path(__file__).absolute().parent.parent.parent / "viewer-defaults"


settings = _Settings()
