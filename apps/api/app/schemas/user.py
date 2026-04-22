from pydantic import BaseModel, EmailStr, ConfigDict, Field, constr
from uuid import UUID
from datetime import datetime
from typing import Optional

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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[constr(min_length=12, max_length=128)] = None
    current_password: Optional[constr(min_length=1, max_length=128)] = None
    step_up_token: Optional[str] = None

class UserInDBBase(UserBase):
    id: UUID
    role: str
    is_active: bool
    created_at: datetime
    subscription_tier: str = "free"

    model_config = ConfigDict(from_attributes=True)

class User(UserInDBBase):
    pass
