from pathlib import Path

from pydantic import BaseSettings


class _Settings(BaseSettings):
    TEST_DATA_DIR: Path = Path(__file__).absolute().parent.parent.parent / "test-data"


settings = _Settings()
