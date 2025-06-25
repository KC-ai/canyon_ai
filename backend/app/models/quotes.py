from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from decimal import Decimal
import re


class QuoteStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class QuoteItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Product or service name")
    description: Optional[str] = Field(None, max_length=1000, description="Item description")
    quantity: int = Field(..., gt=0, le=10000, description="Quantity")
    unit_price: Decimal = Field(..., gt=0, le=Decimal("1000000"), description="Price per unit")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Item name cannot be empty')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('unit_price')
    @classmethod
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Unit price must be greater than 0')
        # Round to 2 decimal places
        return round(v, 2)
    
    @property
    def total_price(self) -> Decimal:
        return Decimal(str(self.quantity)) * self.unit_price


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    quantity: Optional[int] = Field(None, gt=0, le=10000)
    unit_price: Optional[Decimal] = Field(None, gt=0, le=Decimal("1000000"))
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Item name cannot be empty')
        return v.strip() if v else v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('unit_price')
    @classmethod
    def validate_price(cls, v):
        if v is not None:
            if v <= 0:
                raise ValueError('Unit price must be greater than 0')
            return round(v, 2)
        return v


class QuoteItem(QuoteItemBase):
    id: str = Field(..., description="Unique item identifier")
    quote_id: str = Field(..., description="Quote identifier this item belongs to")
    created_at: datetime = Field(..., description="Item creation timestamp")
    updated_at: datetime = Field(..., description="Item last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class QuoteBase(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100, description="Customer name")
    customer_email: Optional[str] = Field(None, max_length=254, description="Customer email")
    title: str = Field(..., min_length=1, max_length=200, description="Quote title")
    description: Optional[str] = Field(None, max_length=2000, description="Quote description")
    status: QuoteStatus = Field(default=QuoteStatus.DRAFT, description="Quote status")
    valid_until: Optional[datetime] = Field(None, description="Quote expiration date")
    
    @field_validator('customer_name')
    @classmethod
    def validate_customer_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Customer name cannot be empty')
        return v.strip()
    
    @field_validator('customer_email')
    @classmethod
    def validate_customer_email(cls, v):
        if v is not None:
            v = v.strip()
            if v:
                # Basic email validation
                email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
                if not email_pattern.match(v):
                    raise ValueError('Invalid email format')
                return v
            return None
        return v
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Quote title cannot be empty')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('valid_until')
    @classmethod
    def validate_valid_until(cls, v):
        if v is not None and v <= datetime.utcnow():
            raise ValueError('Valid until date must be in the future')
        return v


class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate] = Field(default_factory=list, max_items=100, description="Quote items")
    
    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        if len(v) == 0:
            raise ValueError('Quote must contain at least one item')
        return v
    
    @model_validator(mode='after')
    def validate_total_amount(self):
        if self.items:
            total = sum(item.total_price for item in self.items)
            if total <= 0:
                raise ValueError('Quote total must be greater than 0')
            if total > Decimal('10000000'):  # 10 million limit
                raise ValueError('Quote total exceeds maximum allowed amount')
        return self


class QuoteUpdate(BaseModel):
    customer_name: Optional[str] = Field(None, min_length=1, max_length=100)
    customer_email: Optional[str] = Field(None, max_length=254)
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[QuoteStatus] = None
    valid_until: Optional[datetime] = None
    items: Optional[List[QuoteItemCreate]] = Field(None, max_items=100)
    
    @field_validator('customer_name')
    @classmethod
    def validate_customer_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Customer name cannot be empty')
        return v.strip() if v else v
    
    @field_validator('customer_email')
    @classmethod
    def validate_customer_email(cls, v):
        if v is not None:
            v = v.strip()
            if v:
                email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
                if not email_pattern.match(v):
                    raise ValueError('Invalid email format')
                return v
            return None
        return v
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Quote title cannot be empty')
        return v.strip() if v else v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('valid_until')
    @classmethod
    def validate_valid_until(cls, v):
        if v is not None and v <= datetime.utcnow():
            raise ValueError('Valid until date must be in the future')
        return v
    
    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError('Quote must contain at least one item')
        return v
    
    @model_validator(mode='after')
    def validate_total_amount(self):
        if self.items is not None:
            total = sum(item.total_price for item in self.items)
            if total <= 0:
                raise ValueError('Quote total must be greater than 0')
            if total > Decimal('10000000'):
                raise ValueError('Quote total exceeds maximum allowed amount')
        return self


class Quote(QuoteBase):
    id: str = Field(..., description="Unique quote identifier")
    user_id: str = Field(..., description="User who owns this quote")
    items: List[QuoteItem] = Field(default_factory=list, description="Quote items")
    total_amount: Decimal = Field(default=Decimal('0'), description="Total quote amount")
    created_at: datetime = Field(..., description="Quote creation timestamp")
    updated_at: datetime = Field(..., description="Quote last update timestamp")
    
    @property
    def calculated_total(self) -> Decimal:
        return sum(item.total_price for item in self.items)
    
    @property
    def is_expired(self) -> bool:
        return self.valid_until is not None and self.valid_until <= datetime.utcnow()
    
    @property
    def item_count(self) -> int:
        return len(self.items)
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class QuoteListResponse(BaseModel):
    quotes: List[Quote] = Field(..., description="List of quotes")
    total: int = Field(..., ge=0, description="Total number of quotes")
    page: int = Field(..., ge=1, description="Current page number")
    limit: int = Field(..., ge=1, le=100, description="Items per page")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")
    
    @model_validator(mode='after')
    def validate_pagination(self):
        if self.total < 0:
            raise ValueError('Total count cannot be negative')
        
        if self.page < 1:
            raise ValueError('Page number must be at least 1')
        
        if self.limit < 1 or self.limit > 100:
            raise ValueError('Limit must be between 1 and 100')
        
        # Calculate pagination flags
        total_pages = (self.total + self.limit - 1) // self.limit if self.total > 0 else 1
        self.has_next = self.page < total_pages
        self.has_prev = self.page > 1
        
        return self