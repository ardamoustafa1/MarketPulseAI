from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, constr


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str

class UserCreate(UserBase):
    password: constr(min_length=12, max_length=128) = Field(
        ...,
        description="Minimum 12 characters. Use uppercase, lowercase, number, and symbol."
    )

class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    password: constr(min_length=12, max_length=128) | None = None
    current_password: constr(min_length=1, max_length=128) | None = None
    step_up_token: str | None = None

class UserInDBBase(UserBase):
    id: UUID
    role: str
    is_active: bool
    created_at: datetime
    subscription_tier: str = "free"
    totp_enabled: bool = False

    model_config = ConfigDict(from_attributes=True)

class User(UserInDBBase):
    pass
