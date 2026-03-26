FROM python:3.10-slim-bookworm

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py

# Improve resilience to transient apt mirror issues during image builds.
# Note: if your build cannot resolve DNS at all (e.g. "Temporary failure resolving deb.debian.org"),
# you'll likely need to fix Docker's DNS / build network settings; Dockerfiles can't reliably
# override /etc/resolv.conf under BuildKit.
RUN set -eux; \
    echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries; \
    echo 'Acquire::http::Timeout "30";' > /etc/apt/apt.conf.d/80-timeouts; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    curl \
    ca-certificates \
    ; \
    (apt-get install -y --no-install-recommends default-libmysqlclient-dev || \
    apt-get install -y --no-install-recommends libmariadb-dev); \
    rm -rf /var/lib/apt/lists/*

# Copiar requirements.txt i instal·lar dependències
ARG CACHEBUST=2
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir --upgrade pip --default-timeout=20 --retries=5 && \
    pip install --no-cache-dir --default-timeout=100 --retries=5 -r requirements.txt

COPY . .

# Exposar port
EXPOSE 5000

CMD ["python", "app.py"]
