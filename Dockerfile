FROM python:3.11-slim
WORKDIR /app

# Copy backend requirements and install dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code and pre-built frontend static files
COPY backend/ ./backend/
COPY dist/ ./dist/

# Copy sample data files into app root if present
COPY sample_gstr2b.json* sample_fraud_gstr2b.json* sample_fraud_pr.csv* fake_gstin_dataset.csv* fake_gstin_dataset.json* ./
COPY backend/sample_gstr2b.json* backend/sample_fraud_gstr2b.json* backend/sample_fraud_pr.csv* backend/fake_gstin_dataset.csv* backend/fake_gstin_dataset.json* ./

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
WORKDIR /app/backend

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips="*"
