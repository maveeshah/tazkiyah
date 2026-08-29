# syntax=docker/dockerfile:1
# Tazkiyah Daily Finance & Wealth OS — API image.
# Build context is apps/api/ .  Frontend (web/mobile) is built + hosted elsewhere.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 1) Pinned dependencies — isolated layer so code changes don't reinstall the world.
COPY requirements.lock ./
RUN pip install -r requirements.lock

# 2) Application code + migrations.
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# 3) Run unprivileged.
RUN useradd --system --uid 10001 --create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Apply migrations, then serve. (tazkiyah-stack.yml overrides this with the same line;
# kept here so `docker run` on the image alone also works.)
# Health: GET /api/v1/health
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips '*'"]
