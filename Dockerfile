FROM python:3.14-slim

WORKDIR /app

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Debug: list files before copying source
RUN echo "=== Before copying backend source ===" && ls -la

# Copy the backend source code
COPY backend/ .

# Debug: list files after copying
RUN echo "=== After copying backend source ===" && ls -la

# Test if app.main exists (optional)
RUN python -c "import app.main; print('App module loaded')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]