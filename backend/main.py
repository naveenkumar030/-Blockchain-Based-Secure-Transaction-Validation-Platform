import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, graph, reconciliation, dashboard, fraud
from utils import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

import mimetypes

# Ensure explicit cross-browser MIME types for static assets (especially on Linux EC2)
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")

app = FastAPI(title="GST ReconGraph Backend", version="2.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security Headers Middleware ────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        # Only set HSTS header on HTTPS to avoid forcing HTTP EC2 instances to HTTPS (which breaks all browsers)
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)

# ── CORS — restrict origins explicitly ────────────────────────────────────────
_frontend_url_env = os.getenv("FRONTEND_URL", "").strip()

# Build allowed origins: always include localhost dev servers
_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://gstreconciliation.app",
    "https://www.gstreconciliation.app",
    "http://gstreconciliation.app",
    "http://www.gstreconciliation.app",
    "http://100.55.59.23",
    "https://100.55.59.23",
]

# Accept one or more comma-separated URLs from FRONTEND_URL env var
# e.g.  FRONTEND_URL=http://1.2.3.4  or  FRONTEND_URL=https://myapp.com,http://1.2.3.4
if _frontend_url_env:
    for _url in _frontend_url_env.split(","):
        _url = _url.strip().rstrip("/")
        if _url and _url not in _allowed_origins:
            _allowed_origins.append(_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router,           prefix="/api/auth",           tags=["auth"])
app.include_router(graph.router,          prefix="/api/graph",          tags=["graph"])
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["reconciliation"])
app.include_router(dashboard.router,      prefix="/api/dashboard",      tags=["dashboard"])
app.include_router(fraud.router,          prefix="/api/fraud",          tags=["fraud"])

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve React Frontend Static Files
dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist")

@app.get("/health")
async def health():
    return {"status": "ok"}

if os.path.exists(dist_dir):
    # Mount assets folder
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Explicit root route handler for SPA homepage
    @app.get("/")
    async def read_root():
        index_path = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend index.html not found")

    # Serve other files in dist (e.g. logo.png, etc.) or SPA routing
    @app.get("/{catchall:path}")
    async def serve_spa(catchall: str):
        # Prevent catching API/docs routes
        if not catchall or catchall.startswith("api/") or catchall.startswith("docs") or catchall.startswith("openapi.json") or catchall == "health":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = os.path.join(dist_dir, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Fallback to index.html for SPA routing
        index_path = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend build files not found")
