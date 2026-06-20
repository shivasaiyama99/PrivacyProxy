FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed by spaCy, Presidio, geoip2, and healthchecks
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    curl \
    libmaxminddb-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker cache optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Download spaCy English model (required by Presidio)
RUN python -m spacy download en_core_web_lg

# Copy all application code
COPY . .

# Create non-root user for security
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Healthcheck so Docker/Compose can monitor this container
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]