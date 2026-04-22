from pydantic import BaseModel, Field


class PushTokenRegister(BaseModel):
    token: str = Field(..., min_length=10, max_length=4096)
    platform: str = Field(default="unknown", max_length=32)


class PushTokenUnregister(BaseModel):
    token: str = Field(..., min_length=10, max_length=4096)
