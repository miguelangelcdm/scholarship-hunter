FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m patchright install chromium
RUN python -m patchright install-deps chromium

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8000

# Run Uvicorn in development mode
# Note: --reload is perfectly safe in Docker Linux containers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
