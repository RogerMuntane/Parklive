FROM python:3.10-slim

# Definir directori de treball
WORKDIR /app

# Instal·lar dependències del sistema necessàries per MySQL
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primer (millor ús de cache Docker)
COPY ../../backend-python/requirements.txt .

# Instal·lar dependències Python
RUN pip install --no-cache-dir -r requirements.txt

# El codi es munta com a volum, no cal copiar-lo aquí

# Exposar port 5000
EXPOSE 5000

# Variable d'entorn per Flask
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Executar aplicació (sobreescrit per docker-compose)
CMD ["python", "app.py"]
```

---

### **Arxiu 6: `backend-python/requirements.txt`**
```
flask==3.0.0
flask-cors==4.0.0
mysql-connector-python==8.2.0
PyJWT==2.8.0
bcrypt==4.1.2
python-dotenv==1.0.0
werkzeug==3.0.1