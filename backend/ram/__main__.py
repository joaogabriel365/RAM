"""python -m ram  →  sobe o servidor com HOST/PORT do ambiente."""

import uvicorn

from .config import settings

if __name__ == "__main__":
    uvicorn.run("ram.main:app", host=settings.host, port=settings.port, log_level="info")
