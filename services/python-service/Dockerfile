FROM python:3.10-slim

WORKDIR /app

# Instal·lar dependències del sistema per MySQL
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements (fitxer requeriments.txt al projecte)
COPY requeriments.txt ./requirements.txt

# Instal·lar dependències Python
RUN pip install --no-cache-dir -r requirements.txt

# Exposar port
EXPOSE 5000

# Variable d'entorn per Flask
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Executar aplicació
CMD ["python", "app.py"]
