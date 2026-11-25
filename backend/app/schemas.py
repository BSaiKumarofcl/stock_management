import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .config import MIN_LOW_STOCK_THRESHOLD

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupIn(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=72)
    organization_name: str = Field(min_length=1, max_length=200)

    @field_validator("email")
    @classmethod
    def valid_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("organization_name")
    @classmethod
    def strip_org(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Organization name is required")
        return v


class LoginIn(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def norm_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeOut(BaseModel):
    id: int
    email: str
    organization_id: int
    organization_name: str


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=100)
    description: str | None = None
    quantity_on_hand: int = Field(default=0, ge=0)
    cost_price: float | None = Field(default=None, ge=0)
    selling_price: float | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)

    @field_validator("name", "sku")
    @classmethod
    def strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field is required")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class StockAdjustIn(BaseModel):
    delta: int
    note: str | None = Field(default=None, max_length=500)

    @field_validator("delta")
    @classmethod
    def non_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("Adjustment cannot be zero")
        return v


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    description: str | None
    quantity_on_hand: int
    cost_price: float | None
    selling_price: float | None
    low_stock_threshold: int | None
    effective_low_stock_threshold: int
    is_low_stock: bool
    last_updated_by: int | None
    created_at: datetime
    updated_at: datetime


class LowStockItem(BaseModel):
    id: int
    name: str
    sku: str
    quantity_on_hand: int
    low_stock_threshold: int


class DashboardOut(BaseModel):
    total_products: int
    total_quantity: int
    low_stock_count: int
    low_stock_items: list[LowStockItem]


class SettingsOut(BaseModel):
    default_low_stock_threshold: int


class SettingsIn(BaseModel):
    default_low_stock_threshold: int = Field(ge=MIN_LOW_STOCK_THRESHOLD, le=1_000_000)
