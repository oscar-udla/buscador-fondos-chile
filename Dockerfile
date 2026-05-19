# Imagen base ligera de Python
FROM python:3.11-slim

# Directorio de trabajo en el contenedor
WORKDIR /app

# Instalar certificados CA para poder hacer peticiones HTTPS seguras
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copiar el instalador de requerimientos e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del buscador
COPY . .

# Exponer el puerto de la aplicación
EXPOSE 8000

# Al iniciar: primero ejecuta el scraper para actualizar los fondos y luego levanta el servidor API
CMD ["sh", "-c", "python3 scraper.py && python3 server.py"]
