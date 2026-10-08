"""
FastAPI backend for Login / Register UI
MongoDB Atlas · JWT Auth · bcrypt hashing · rate limiting · input validation
"""

from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, FileResponse

from pydantic import BaseModel, EmailStr, field_validator
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError, ConnectionFailure

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone

import os
import re
import time
import random
import hashlib
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import defaultdict
from typing import Optional

import bcrypt
from dotenv import load_dotenv
load_dotenv()

from graph_db import check_neo4j_connection, close_driver


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Config  (move secrets to .env in production)
# ─────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI environment variable is not set. Add it to your .env file."
    )
DB_NAME        = "userdata"
USERS_COL      = "users"
SESSIONS_COL   = "sessions"

SECRET_KEY     = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set. Add it to your .env file."
    )
ALGORITHM      = "HS256"
ACCESS_EXPIRE  = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))    # 1 hour
REFRESH_EXPIRE = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS",   7))     # 7 days

# Simple in-process rate limiter (swap for Redis in production)
_rate_store: dict = defaultdict(list)
RATE_LIMIT_MAX     = 10   # max attempts
RATE_LIMIT_WINDOW  = 60   # seconds

# ─────────────────────────────────────────────
# Gmail SMTP (App Password) + OTP config
# ─────────────────────────────────────────────
GMAIL_ADDRESS       = os.getenv("GMAIL_ADDRESS")          # e.g. yourname@gmail.com
GMAIL_APP_PASSWORD  = os.getenv("GMAIL_APP_PASSWORD")     # 16-char App Password (no spaces)
SMTP_HOST           = "smtp.gmail.com"
SMTP_PORT           = 465                                     # SSL

OTP_LENGTH          = 6
OTP_EXPIRE_MINUTES   = int(os.getenv("OTP_EXPIRE_MINUTES", 10))
OTP_MAX_ATTEMPTS    = 5     # wrong-code attempts before the OTP is invalidated
OTP_RESEND_COOLDOWN = 45    # seconds between resend requests


def generate_otp() -> str:
    return "".join(random.choices("0123456789", k=OTP_LENGTH))

def hash_otp(otp: str) -> str:
    # OTPs are short-lived and low-entropy, but we still avoid storing them
    # in plaintext in case the DB is ever read by something untrusted.
    return hashlib.sha256(otp.encode()).hexdigest()

def send_otp_email(to_email: str, fullname: str, otp: str):
    logger.info("=========================================")
    logger.info("DEVELOPMENT OTP VERIFICATION CODE FOR %s: %s", to_email, otp)
    logger.info("=========================================")

    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        logger.warning("GMAIL_ADDRESS / GMAIL_APP_PASSWORD not configured — skipping email dispatch")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your verification code"
    msg["From"]    = GMAIL_ADDRESS
    msg["To"]      = to_email

    text_body = (
        f"Hi {fullname},\n\n"
        f"Your verification code is: {otp}\n"
        f"This code expires in {OTP_EXPIRE_MINUTES} minutes.\n\n"
        f"If you didn't request this, you can safely ignore this email."
    )
    html_body = f"""\
<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;">
  <h2 style="margin-bottom:0;">Verify your email</h2>
  <p>Hi {fullname},</p>
  <p>Your verification code is:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:6px;
              background:#f2f2f2;padding:16px 0;text-align:center;
              border-radius:10px;">{otp}</div>
  <p style="color:#666;font-size:13px;">
    This code expires in {OTP_EXPIRE_MINUTES} minutes. If you didn't request this,
    you can safely ignore this email.
  </p>
</div>
"""
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())
        logger.info("OTP email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", to_email, exc)
        if getattr(app.state, "db_is_mock", False):
            logger.warning("SMTP failed, but mock database fallback is active — ignoring SMTP error.")
        else:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to send verification email. Use local dev OTP: {otp}"
            )


# ─────────────────────────────────────────────
# App & CORS
# ─────────────────────────────────────────────
app = FastAPI(
    title="Auth API",
    description="Register / Login / Token refresh for the glass-card UI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Database Mocking for offline / local-only fallback
# ─────────────────────────────────────────────
class MockCursor:
    def __init__(self, data):
        self.data = list(data)

    def sort(self, key, direction=1):
        self.data.sort(key=lambda x: x.get(key, datetime.min), reverse=(direction == -1))
        return self

    def skip(self, n):
        self.data = self.data[n:]
        return self

    def limit(self, n):
        self.data = self.data[:n]
        return self

    def __iter__(self):
        return iter(self.data)

class MockCollection:
    def __init__(self, name):
        self.name = name
        self.documents = {}

    def create_index(self, *args, **kwargs):
        pass

    def find_one(self, filter, projection=None):
        for doc in self.documents.values():
            match = True
            for k, v in filter.items():
                if k == "_id":
                    if doc.get("_id") != v:
                        match = False
                        break
                elif k == "email":
                    if doc.get("email") != v:
                        match = False
                        break
                elif k == "username":
                    if doc.get("username") != v:
                        match = False
                        break
                elif k == "token":
                    if doc.get("token") != v:
                        match = False
                        break
                else:
                    if doc.get(k) != v:
                        match = False
                        break
            if match:
                res = doc.copy()
                if projection:
                    for pk, pv in projection.items():
                        if pv == 0 and pk in res:
                            del res[pk]
                return res
        return None

    def insert_one(self, document):
        if self.name == "users":
            email = document.get("email")
            if email:
                for doc in self.documents.values():
                    if doc.get("email") == email:
                        from pymongo.errors import DuplicateKeyError
                        raise DuplicateKeyError("Duplicate email")
        
        doc_id = document.get("_id")
        if not doc_id:
            from bson import ObjectId
            doc_id = str(ObjectId())
            document["_id"] = doc_id
        self.documents[doc_id] = document.copy()
        return type('InsertOneResult', (object,), {'inserted_id': doc_id})()

    def update_one(self, filter, update):
        doc = self.find_one(filter)
        if not doc:
            return type('UpdateResult', (object,), {'matched_count': 0, 'modified_count': 0})()
        
        doc_id = doc["_id"]
        actual_doc = self.documents[doc_id]
        
        if "$set" in update:
            for k, v in update["$set"].items():
                if "." in k:
                    parts = k.split(".")
                    temp = actual_doc
                    for part in parts[:-1]:
                        if part not in temp:
                            temp[part] = {}
                        temp = temp[part]
                    temp[parts[-1]] = v
                else:
                    actual_doc[k] = v
        
        if "$inc" in update:
            for k, v in update["$inc"].items():
                if "." in k:
                    parts = k.split(".")
                    temp = actual_doc
                    for part in parts[:-1]:
                        if part not in temp:
                            temp[part] = {}
                        temp = temp[part]
                    temp[parts[-1]] = temp.get(parts[-1], 0) + v
                else:
                    actual_doc[k] = actual_doc.get(k, 0) + v
                    
        return type('UpdateResult', (object,), {'matched_count': 1, 'modified_count': 1})()

    def delete_one(self, filter):
        doc = self.find_one(filter)
        if doc:
            del self.documents[doc["_id"]]
            return type('DeleteResult', (object,), {'deleted_count': 1})()
        return type('DeleteResult', (object,), {'deleted_count': 0})()

    def delete_many(self, filter):
        to_delete = []
        for doc in self.documents.values():
            match = True
            for k, v in filter.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                to_delete.append(doc["_id"])
        for doc_id in to_delete:
            del self.documents[doc_id]
        return type('DeleteResult', (object,), {'deleted_count': len(to_delete)})()

    def count_documents(self, filter):
        count = 0
        for doc in self.documents.values():
            match = True
            for k, v in filter.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    def find(self, filter, projection=None):
        matched = []
        for doc in self.documents.values():
            match = True
            for k, v in filter.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                res = doc.copy()
                if projection:
                    for pk, pv in projection.items():
                        if pv == 0 and pk in res:
                            del res[pk]
                matched.append(res)
        return MockCursor(matched)

class MockDatabase:
    def __init__(self):
        self.collections = {}
        self.client = type('MockClient', (object,), {
            'admin': type('MockAdmin', (object,), {
                'command': lambda self, cmd: {"ok": 1.0}
            })()
        })()

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]


# ─────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────
def get_db():
    return app.state.db

@app.on_event("startup")
def startup():
    try:
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=2000,
            tls=True,
            tlsAllowInvalidCertificates=False,
        )
        client.admin.command("ping")          # verify connection
        db = client[DB_NAME]

        # Ensure indexes
        db[USERS_COL].create_index([("email", ASCENDING)], unique=True)
        db[USERS_COL].create_index([("username", ASCENDING)], unique=True, sparse=True)
        db[SESSIONS_COL].create_index([("user_id", ASCENDING)])
        db[SESSIONS_COL].create_index(
            [("expires_at", ASCENDING)], expireAfterSeconds=0  # TTL index — auto-deletes expired sessions
        )

        app.state.db = db
        app.state.db_is_mock = False
        logger.info("Connected to MongoDB Atlas  db=%s", DB_NAME)
    except Exception as exc:
        logger.warning("MongoDB connection failed: %s", exc)
        logger.warning("FALLING BACK TO IN-MEMORY MOCK DATABASE FOR LOCAL TESTING!")
        db = MockDatabase()
        app.state.db = db
        app.state.db_is_mock = True


# ─────────────────────────────────────────────
# Security helpers
# ─────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer(auto_error=False)

PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$"
)

def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    pwd_bytes = plain.encode("utf-8")[:72]
    hashed_bytes = hashed.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

def create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    payload["iat"] = datetime.now(timezone.utc)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def rate_check(key: str):
    """Raise 429 if key exceeded RATE_LIMIT_MAX requests in RATE_LIMIT_WINDOW seconds."""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    hits = _rate_store[key] = [t for t in _rate_store[key] if t > window_start]
    if len(hits) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait and try again.",
        )
    hits.append(now)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db=Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

    user = db[USERS_COL].find_one({"_id": user_id}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ─────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────
class RegisterRequest(BaseModel):
    fullname: str
    email: EmailStr
    password: str

    @field_validator("fullname")
    @classmethod
    def fullname_check(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 80:
            raise ValueError("Full name must be under 80 characters")
        if not re.match(r"^[A-Za-z\u00C0-\u024F .'\-]+$", v):
            raise ValueError("Full name contains invalid characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(
                "Password must be 8-72 characters and include "
                "uppercase, lowercase, a digit, and a special character"
            )
        return v


class LoginRequest(BaseModel):
    identifier: str          # email OR username
    password: str

    @field_validator("identifier")
    @classmethod
    def identifier_check(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 254:
            raise ValueError("Identifier length out of range")
        return v


class RefreshRequest(BaseModel):
    refresh_token: str

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_check(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{6}$", v):
            raise ValueError("Code must be exactly 6 digits")
        return v

class ResendOtpRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_pass_strength(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(
                "New password must be 8-72 characters and include "
                "uppercase, lowercase, a digit, and a special character"
            )
        return v


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/", tags=["frontend"])
def root():
    return FileResponse(os.path.join(STATIC_DIR, "login.html"))

@app.get("/login.html", tags=["frontend"])
def login_page():
    return FileResponse(os.path.join(STATIC_DIR, "login.html"))

@app.get("/register.html", tags=["frontend"])
def register_page():
    return FileResponse(os.path.join(STATIC_DIR, "register.html"))

@app.get("/app.js", tags=["frontend"])
def get_js():
    return FileResponse(os.path.join(STATIC_DIR, "app.js"))

@app.get("/style.css", tags=["frontend"])
def get_css():
    return FileResponse(os.path.join(STATIC_DIR, "style.css"))



@app.get("/health", tags=["health"])
def health(db=Depends(get_db)):
    try:
        db.client.admin.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unreachable")


# ── Register ──────────────────────────────────
@app.post("/api/register", status_code=201, tags=["auth"])
def register(payload: RegisterRequest, request: Request, db=Depends(get_db)):
    client_ip = request.client.host
    rate_check(f"register:{client_ip}")

    email    = payload.email.lower().strip()
    fullname = payload.fullname.strip()

    existing = db[USERS_COL].find_one({"email": email})
    if existing and existing.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    from bson import ObjectId

    otp = generate_otp()
    otp_doc = {
        "otp_hash":    hash_otp(otp),
        "expires_at":  datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
        "attempts":    0,
        "last_sent_at": datetime.now(timezone.utc),
    }

    if existing and not existing.get("is_verified"):
        # Re-registering before verifying: overwrite the pending signup
        # with the new details + a fresh code instead of erroring out.
        user_id = existing["_id"]
        db[USERS_COL].update_one(
            {"_id": user_id},
            {"$set": {
                "fullname":      fullname,
                "password_hash": hash_password(payload.password),
                "otp":           otp_doc,
                "updated_at":    datetime.now(timezone.utc),
            }},
        )
    else:
        user_id = str(ObjectId())
        user_doc = {
            "_id":           user_id,
            "fullname":      fullname,
            "email":         email,
            "password_hash": hash_password(payload.password),
            "is_active":     True,
            "is_verified":   False,
            "is_admin":      False,
            "otp":           otp_doc,
            "created_at":    datetime.now(timezone.utc),
            "updated_at":    datetime.now(timezone.utc),
            "last_login":    None,
            "login_count":   0,
        }
        try:
            db[USERS_COL].insert_one(user_doc)
        except DuplicateKeyError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

    send_otp_email(email, fullname, otp)

    logger.info("New user pending verification: %s  id=%s", email, user_id)
    return {
        "message": "Account created. Please check your email for a verification code.",
        "email":   email,
    }


# ── Verify email OTP ──────────────────────────
@app.post("/api/verify-otp", tags=["auth"])
def verify_otp(payload: VerifyOtpRequest, request: Request, db=Depends(get_db)):
    client_ip = request.client.host
    rate_check(f"verify-otp:{client_ip}")

    email = payload.email.lower().strip()
    user = db[USERS_COL].find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="No pending registration found for this email")
    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email is already verified")

    otp_doc = user.get("otp")
    if not otp_doc:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one")

    if datetime.now(timezone.utc) > otp_doc["expires_at"].replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="This code has expired. Please request a new one")

    if otp_doc.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Please request a new code")

    if hash_otp(payload.otp) != otp_doc["otp_hash"]:
        db[USERS_COL].update_one({"_id": user["_id"]}, {"$inc": {"otp.attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect code")

    db[USERS_COL].update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True, "updated_at": datetime.now(timezone.utc)},
         "$unset": {"otp": ""}},
    )
    logger.info("Email verified: %s", email)
    return {"message": "Email verified successfully. You can now sign in."}


# ── Resend OTP ─────────────────────────────────
@app.post("/api/resend-otp", tags=["auth"])
def resend_otp(payload: ResendOtpRequest, request: Request, db=Depends(get_db)):
    client_ip = request.client.host
    rate_check(f"resend-otp:{client_ip}")

    email = payload.email.lower().strip()
    user = db[USERS_COL].find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="No pending registration found for this email")
    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email is already verified")

    otp_doc = user.get("otp") or {}
    last_sent = otp_doc.get("last_sent_at")
    if last_sent:
        last_sent = last_sent.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {int(OTP_RESEND_COOLDOWN - elapsed)}s before requesting another code",
            )

    otp = generate_otp()
    db[USERS_COL].update_one(
        {"_id": user["_id"]},
        {"$set": {"otp": {
            "otp_hash":     hash_otp(otp),
            "expires_at":   datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
            "attempts":     0,
            "last_sent_at": datetime.now(timezone.utc),
        }}},
    )
    send_otp_email(email, user["fullname"], otp)
    logger.info("OTP resent: %s", email)
    return {"message": "A new verification code has been sent."}


# ── Login ─────────────────────────────────────
@app.post("/api/login", tags=["auth"])
def login(payload: LoginRequest, request: Request, db=Depends(get_db)):
    client_ip = request.client.host
    rate_check(f"login:{client_ip}")

    identifier = payload.identifier.strip()

    query = (
        {"email": identifier.lower()}
        if "@" in identifier
        else {"username": identifier}
    )
    user = db[USERS_COL].find_one(query)

    auth_err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )

    if not user:
        raise auth_err
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    if not verify_password(payload.password, user["password_hash"]):
        raise auth_err
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before signing in",
        )

    user_id = str(user["_id"])

    access_token  = create_token(
        {"sub": user_id, "type": "access"},
        timedelta(minutes=ACCESS_EXPIRE),
    )
    refresh_token = create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=REFRESH_EXPIRE),
    )

    # Persist refresh token for revocation support
    db[SESSIONS_COL].insert_one({
        "user_id":    user_id,
        "token":      refresh_token,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE),
        "ip":         client_ip,
    })

    db[USERS_COL].update_one(
        {"_id": user_id},
        {"$set":  {"last_login": datetime.now(timezone.utc)},
         "$inc":  {"login_count": 1}},
    )

    logger.info("Login OK: %s  ip=%s", user.get("email"), client_ip)
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "expires_in":    ACCESS_EXPIRE * 60,
        "user": {
            "id":       user_id,
            "fullname": user["fullname"],
            "email":    user["email"],
        },
    }


# ── Refresh token ─────────────────────────────
@app.post("/api/refresh", tags=["auth"])
def refresh_access_token(payload: RefreshRequest, db=Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise ValueError("Wrong token type")
        user_id = data["sub"]
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    session = db[SESSIONS_COL].find_one({"token": payload.refresh_token})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found or revoked")

    new_access = create_token(
        {"sub": user_id, "type": "access"},
        timedelta(minutes=ACCESS_EXPIRE),
    )
    return {
        "access_token": new_access,
        "token_type":   "bearer",
        "expires_in":   ACCESS_EXPIRE * 60,
    }


# ── Logout ────────────────────────────────────
@app.post("/api/logout", tags=["auth"])
def logout(
    payload: RefreshRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    db[SESSIONS_COL].delete_one({"token": payload.refresh_token})
    logger.info("User logged out: %s", current_user.get("email"))
    return {"message": "Logged out successfully"}


# ── Get current user profile ──────────────────
@app.get("/api/me", tags=["user"])
def get_me(current_user=Depends(get_current_user)):
    return {
        "id":          str(current_user["_id"]),
        "fullname":    current_user["fullname"],
        "email":       current_user["email"],
        "created_at":  current_user.get("created_at"),
        "last_login":  current_user.get("last_login"),
        "login_count": current_user.get("login_count", 0),
    }


# ── Change password ───────────────────────────
@app.put("/api/me/password", tags=["user"])
def change_password(
    payload: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    full_user = db[USERS_COL].find_one({"_id": current_user["_id"]})
    if not verify_password(payload.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    db[USERS_COL].update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "password_hash": hash_password(payload.new_password),
            "updated_at":    datetime.now(timezone.utc),
        }},
    )
    # Revoke all sessions — force re-login
    db[SESSIONS_COL].delete_many({"user_id": str(current_user["_id"])})
    logger.info("Password changed: %s", current_user.get("email"))
    return {"message": "Password updated. Please log in again."}


# ── Admin: list users ─────────────────────────
@app.get("/api/admin/users", tags=["admin"])
def list_users(
    skip: int = 0,
    limit: int = 20,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin privileges required")

    users = list(
        db[USERS_COL]
        .find({}, {"password_hash": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(min(limit, 100))
    )
    for u in users:
        u["_id"] = str(u["_id"])
    total = db[USERS_COL].count_documents({})
    return {"total": total, "users": users}


# ─────────────────────────────────────────────
# Global exception handler
# ─────────────────────────────────────────────
@app.get("/api/health/graph", tags=["health"])
def health_graph():
    return check_neo4j_connection()

@app.on_event("shutdown")
def shutdown():
    close_driver()

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ─────────────────────────────────────────────
# Dev entry-point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)