import os
import smtplib
from fastapi import HTTPException
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import random
from datetime import datetime, timedelta, timezone
# NOTE: passlib CryptContext intentionally removed — it crashes with bcrypt>=4.0
# Password hashing/verification uses the raw bcrypt module directly (see below).
from jose import jwt
from dotenv import load_dotenv

# Load env vars
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from slowapi import Limiter
from slowapi.util import get_remote_address

# Global rate limiter
limiter = Limiter(key_func=get_remote_address)

# Secrets
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET is not set in the environment variables. Cannot start securely.")
ALGORITHM = "HS256"
# Session expiration time (in minutes). Defaults to 60 minutes.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
if EMAIL_PASS:
    EMAIL_PASS = EMAIL_PASS.replace(" ", "").strip()


# AWS Credentials & Config
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

import boto3

def upload_file_to_s3_sync(file_content: bytes, filename: str, content_type: str = None, user_email: str = None) -> str | None:
    """
    Uploads file contents to the configured AWS S3 bucket.
    Files are namespaced per user when user_email is provided.
    Returns the S3 URL of the file if successful, otherwise None.
    """
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_S3_BUCKET:
        print("S3 Warning: AWS credentials or S3 bucket not configured. Skipping S3 upload.")
        return None
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        # Namespace the S3 key by user email so each user's files are isolated
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        if user_email:
            # Sanitize email for use as a folder name (replace @ and . with safe chars)
            safe_email = user_email.replace("@", "_at_").replace(".", "_")
            s3_key = f"uploads/{safe_email}/{timestamp}_{filename}"
        else:
            s3_key = f"uploads/{timestamp}_{filename}"
        
        s3.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            **extra_args
        )
        s3_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        print(f"Successfully uploaded {filename} to S3 bucket {AWS_S3_BUCKET} as {s3_key}")
        return s3_url
    except Exception as e:
        print(f"Error uploading file to S3: {e}")
        return None

async def upload_file_to_s3_async(file_content: bytes, filename: str, content_type: str = None, user_email: str = None) -> str | None:
    """Async wrapper to upload files to S3 without blocking the event loop."""
    import functools
    loop = asyncio.get_event_loop()
    fn = functools.partial(upload_file_to_s3_sync, file_content, filename, content_type, user_email)
    return await loop.run_in_executor(None, fn)


def download_file_from_s3_sync(s3_url: str) -> bytes | None:
    """
    Downloads file contents from S3 given its S3 URL.
    """
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_S3_BUCKET:
        print("S3 Warning: AWS credentials or S3 bucket not configured. Skipping S3 download.")
        return None
    try:
        # Extract s3 key from URL
        # URL structure: https://<bucket>.s3.<region>.amazonaws.com/<key>
        url_parts = s3_url.split(".amazonaws.com/")
        if len(url_parts) < 2:
            print(f"S3 Error: Invalid S3 URL structure: {s3_url}")
            return None
        s3_key = url_parts[1]
        
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        response = s3.get_object(Bucket=AWS_S3_BUCKET, Key=s3_key)
        return response["Body"].read()
    except Exception as e:
        print(f"Error downloading file from S3: {e}")
        return None


async def download_file_from_s3_async(s3_url: str) -> bytes | None:
    """Async wrapper to download files from S3 without blocking the event loop."""
    import functools
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, download_file_from_s3_sync, s3_url)


def delete_file_from_s3_sync(s3_url: str) -> bool:
    """
    Deletes a file from S3 given its S3 URL.
    """
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_S3_BUCKET:
        print("S3 Warning: AWS credentials or S3 bucket not configured. Skipping S3 delete.")
        return False
    try:
        url_parts = s3_url.split(".amazonaws.com/")
        if len(url_parts) < 2:
            print(f"S3 Error: Invalid S3 URL structure for deletion: {s3_url}")
            return False
        s3_key = url_parts[1]
        
        s3 = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        s3.delete_object(Bucket=AWS_S3_BUCKET, Key=s3_key)
        print(f"Successfully deleted {s3_key} from S3 bucket {AWS_S3_BUCKET}")
        return True
    except Exception as e:
        print(f"Error deleting file from S3: {e}")
        return False


async def delete_file_from_s3_async(s3_url: str) -> bool:
    """Async wrapper to delete files from S3 without blocking the event loop."""
    import functools
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, delete_file_from_s3_sync, s3_url)



import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.JWTError:
        return None

def get_user_email(request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["sub"]

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def send_mail_raw_sync(to_email: str, subject: str, text_body: str, html_body: str):
    """Send an email using SMTP SSL (Gmail)."""
    if not EMAIL_USER or not EMAIL_PASS:
        print("WARNING: Email credentials not configured in .env (EMAIL_USER / EMAIL_PASS).")
        raise RuntimeError("Email service is not configured. Please contact the administrator.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"SecureChain <{EMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        print(f"Email '{subject}' sent successfully to {to_email}")
    except smtplib.SMTPAuthenticationError:
        print(f"SMTP Authentication failed for {EMAIL_USER}. Check EMAIL_USER and EMAIL_PASS in .env")
        raise RuntimeError("Email authentication failed. Please contact the administrator.")
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        raise RuntimeError(f"Failed to send email: {str(e)}")


async def send_mail_raw_async(to_email: str, subject: str, text_body: str, html_body: str):
    """Send an email asynchronously with Brevo and SMTP SSL support."""
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if brevo_api_key:
        import httpx
        try:
            payload = {
                "sender": {"email": EMAIL_USER or "mruhevents@gmail.com", "name": "SecureChain"},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body,
                "textContent": text_body,
            }
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "content-type": "application/json",
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
                if res.status_code >= 400:
                    raise RuntimeError(f"Brevo API error: {res.text}")
            print(f"Email '{subject}' sent successfully via Brevo to {to_email}")
            return
        except Exception as e:
            print(f"WARNING: Brevo API email failed: {e}")

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, send_mail_raw_sync, to_email, subject, text_body, html_body)
    except Exception as e:
        print(f"WARNING: SMTP email delivery failed: {e}")
        print(f"--------------------------------------------------")
        print(f"[EMAIL FALLBACK LOG] To: {to_email} | Subject: {subject}")
        print(text_body)
        print(f"--------------------------------------------------")
        return


# ─────────────────────────────────────────────────────────────────────────────
# 1. OTP Verification Email
# ─────────────────────────────────────────────────────────────────────────────
async def send_verification_otp_email_async(to_email: str, name: str, otp: str):
    name_display = name or "User"
    subject = "SecureChain — Verify Your Email"
    text_body = f"""Hi {name_display},
Welcome to SecureChain.
Your one-time verification code is:
{otp}
This OTP is valid for 10 minutes.
Please do not share this code with anyone.
If you did not request this verification, you can safely ignore this email.
Regards,
SecureChain Team
Blockchain Transaction Validation Platform"""
    html_body = f"""\
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:30px;color:#1e293b;">
      <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color:#2563eb;margin:0 0 16px;font-size:20px;font-weight:700;">🔐 SecureChain</h2>
        <p style="font-size:15px;margin:0 0 12px;">Hi <b>{name_display}</b>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 20px;">Welcome to SecureChain.</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 8px;">Your one-time verification code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#2563eb;background:#f1f5f9;padding:16px 0;text-align:center;border-radius:8px;margin:0 0 20px;">{otp}</div>
        <p style="font-size:13px;color:#64748b;margin:0 0 6px;">This OTP is valid for <b>10 minutes</b>.</p>
        <p style="font-size:13px;color:#e11d48;margin:0 0 20px;font-weight:500;">Please do not share this code with anyone.</p>
        <p style="font-size:12px;color:#94a3b8;margin:0 0 24px;">If you did not request this verification, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="font-size:13px;color:#334155;margin:0;">Regards,<br><b>SecureChain Team</b><br><span style="font-size:11px;color:#64748b;">Blockchain Transaction Validation Platform</span></p>
      </div>
    </body></html>
    """
    await send_mail_raw_async(to_email, subject, text_body, html_body)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Forgot Password Email
# ─────────────────────────────────────────────────────────────────────────────
async def send_password_reset_otp_email_async(to_email: str, name: str, otp: str):
    name_display = name or "User"
    subject = "SecureChain — Password Reset Request"
    text_body = f"""Hi {name_display},
We received a request to reset the password for your SecureChain account.
Your password reset OTP is:
{otp}
This code is valid for 10 minutes.
If you did not request a password reset, please ignore this email and do not share the OTP with anyone.
Regards,
SecureChain Team"""
    html_body = f"""\
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:30px;color:#1e293b;">
      <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color:#2563eb;margin:0 0 16px;font-size:20px;font-weight:700;">🔐 SecureChain</h2>
        <p style="font-size:15px;margin:0 0 12px;">Hi <b>{name_display}</b>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 20px;">We received a request to reset the password for your SecureChain account.</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 8px;">Your password reset OTP is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#2563eb;background:#f1f5f9;padding:16px 0;text-align:center;border-radius:8px;margin:0 0 20px;">{otp}</div>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;">This code is valid for <b>10 minutes</b>.</p>
        <p style="font-size:12px;color:#94a3b8;margin:0 0 24px;">If you did not request a password reset, please ignore this email and do not share the OTP with anyone.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="font-size:13px;color:#334155;margin:0;">Regards,<br><b>SecureChain Team</b></p>
      </div>
    </body></html>
    """
    await send_mail_raw_async(to_email, subject, text_body, html_body)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Password Successfully Changed Email
# ─────────────────────────────────────────────────────────────────────────────
async def send_password_changed_email_async(to_email: str, name: str):
    name_display = name or "User"
    subject = "SecureChain — Password Changed Successfully"
    text_body = f"""Hi {name_display},
Your SecureChain account password has been successfully changed.
If you made this change, no further action is required.
If you did not make this change, please contact the administrator immediately.
Regards,
SecureChain Team"""
    html_body = f"""\
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:30px;color:#1e293b;">
      <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color:#2563eb;margin:0 0 16px;font-size:20px;font-weight:700;">🔐 SecureChain</h2>
        <p style="font-size:15px;margin:0 0 12px;">Hi <b>{name_display}</b>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Your SecureChain account password has been successfully changed.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:20px;">
          <p style="font-size:13px;color:#166534;margin:0;">If you made this change, no further action is required.</p>
        </div>
        <p style="font-size:12px;color:#e11d48;margin:0 0 24px;">If you did not make this change, please contact the administrator immediately.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="font-size:13px;color:#334155;margin:0;">Regards,<br><b>SecureChain Team</b></p>
      </div>
    </body></html>
    """
    await send_mail_raw_async(to_email, subject, text_body, html_body)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Registration / Welcome Email
# ─────────────────────────────────────────────────────────────────────────────
async def send_welcome_email_async(to_email: str, name: str):
    name_display = name or "User"
    subject = "Welcome to SecureChain"
    text_body = f"""Hi {name_display},
Welcome to SecureChain — Blockchain Transaction Validation Platform.
Your account has been successfully created.
You can now securely create and validate transactions, view transaction history, and track blockchain records.
Regards,
SecureChain Team"""
    html_body = f"""\
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:30px;color:#1e293b;">
      <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color:#2563eb;margin:0 0 16px;font-size:20px;font-weight:700;">🔐 SecureChain</h2>
        <p style="font-size:15px;margin:0 0 12px;">Hi <b>{name_display}</b>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Welcome to <b>SecureChain</b> — Blockchain Transaction Validation Platform.</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin-bottom:20px;">
          <p style="font-size:13px;color:#1e40af;margin:0;">Your account has been successfully created.</p>
        </div>
        <p style="font-size:13px;color:#475569;margin:0 0 24px;line-height:1.6;">You can now securely create and validate transactions, view transaction history, and track blockchain records.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="font-size:13px;color:#334155;margin:0;">Regards,<br><b>SecureChain Team</b></p>
      </div>
    </body></html>
    """
    await send_mail_raw_async(to_email, subject, text_body, html_body)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Transaction Validation Email (Optional / Extended)
# ─────────────────────────────────────────────────────────────────────────────
async def send_transaction_validation_email_async(
    to_email: str,
    name: str,
    transaction_id: str,
    status: str,
    transaction_hash: str,
    timestamp: str = None
):
    name_display = name or "User"
    ts_display = timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    subject = "SecureChain — Transaction Validation Result"
    text_body = f"""Hi {name_display},
Your transaction {transaction_id} has been processed.
Status: {status}
Transaction Hash:
{transaction_hash}
Timestamp:
{ts_display}
You can log in to SecureChain to view the complete validation details.
Regards,
SecureChain Team"""
    html_body = f"""\
    <html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:30px;color:#1e293b;">
      <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color:#2563eb;margin:0 0 16px;font-size:20px;font-weight:700;">🔐 SecureChain</h2>
        <p style="font-size:15px;margin:0 0 12px;">Hi <b>{name_display}</b>,</p>
        <p style="font-size:14px;color:#475569;margin:0 0 16px;">Your transaction <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;">{transaction_id}</code> has been processed.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;">
          <div style="margin-bottom:8px;"><b>Status:</b> <span style="color:#16a34a;font-weight:600;">{status}</span></div>
          <div style="margin-bottom:8px;"><b>Transaction Hash:</b><br><code style="font-family:monospace;word-break:break-all;color:#2563eb;">{transaction_hash}</code></div>
          <div><b>Timestamp:</b> <span style="color:#64748b;">{ts_display}</span></div>
        </div>
        <p style="font-size:13px;color:#475569;margin:0 0 24px;">You can log in to SecureChain to view the complete validation details.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="font-size:13px;color:#334155;margin:0;">Regards,<br><b>SecureChain Team</b></p>
      </div>
    </body></html>
    """
    await send_mail_raw_async(to_email, subject, text_body, html_body)


# ─────────────────────────────────────────────────────────────────────────────
# Backwards-compatible router dispatcher
# ─────────────────────────────────────────────────────────────────────────────
async def send_email_async(to_email: str, subject: str = None, otp_code: str = None, purpose: str = "Registration", name: str = "User"):
    """Backwards-compatible wrapper routing to the new SecureChain templates."""
    if purpose == "Password Reset":
        await send_password_reset_otp_email_async(to_email, name, otp_code)
    else:
        await send_verification_otp_email_async(to_email, name, otp_code)


def send_email_sync(to_email: str, subject: str, otp_code: str, purpose: str = "Registration"):
    """Backwards-compatible synchronous wrapper."""
    if purpose == "Password Reset":
        subject = "SecureChain — Password Reset Request"
        text_body = f"Hi User,\n\nWe received a request to reset the password for your SecureChain account.\nYour password reset OTP is:\n{otp_code}\n\nThis code is valid for 10 minutes.\n\nRegards,\nSecureChain Team"
        html_body = f"<html><body><p>Your password reset code is: <b>{otp_code}</b>. It is valid for 10 minutes.</p></body></html>"
    else:
        subject = "SecureChain — Verify Your Email"
        text_body = f"Hi User,\n\nWelcome to SecureChain.\nYour one-time verification code is:\n{otp_code}\n\nThis OTP is valid for 10 minutes.\n\nRegards,\nSecureChain Team\nBlockchain Transaction Validation Platform"
        html_body = f"<html><body><p>Your verification code is: <b>{otp_code}</b>. It is valid for 10 minutes.</p></body></html>"
    send_mail_raw_sync(to_email, subject, text_body, html_body)



