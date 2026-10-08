from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterRequest(BaseModel):
    fullName: str
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str

class GoogleLoginRequest(BaseModel):
    token: Optional[str] = None
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None

class TransactionNotificationRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = "User"
    transaction_id: str
    status: str
    transaction_hash: str
    timestamp: Optional[str] = None

