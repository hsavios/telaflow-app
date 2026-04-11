FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY apps/cloud-api/pyproject.toml /app/pyproject.toml
COPY apps/cloud-api/README.md /app/README.md
COPY apps/cloud-api/src /app/src

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "telaflow_cloud_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
