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
    discount_percent: Decimal = Field(0, ge=0, le=100, description="Discount percentage")
    discount_amount: Optional[Decimal] = Field(None, ge=0, description="Fixed discount amount")
    
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
    
    @field_validator('discount_percent')
    @classmethod
    def validate_discount_percent(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Discount percentage must be between 0 and 100')
        return round(v, 2)
    
    @field_validator('discount_amount')
    @classmethod
    def validate_discount_amount(cls, v):
        if v is not None and v < 0:
            raise ValueError('Discount amount cannot be negative')
        return round(v, 2) if v is not None else v
    
    @property
    def subtotal_price(self) -> Decimal:
        """Subtotal before discount"""
        return Decimal(str(self.quantity)) * self.unit_price
    
    @property
    def discount_value(self) -> Decimal:
        """Calculate actual discount amount"""
        subtotal = self.subtotal_price
        
        # Use fixed discount amount if provided, otherwise use percentage
        if self.discount_amount is not None and self.discount_amount > 0:
            # Don't allow discount to exceed subtotal
            return min(self.discount_amount, subtotal)
        else:
            # Calculate percentage discount
            discount = subtotal * (self.discount_percent / Decimal('100'))
            return min(discount, subtotal)
    
    @property
    def total_price(self) -> Decimal:
        """Final price after discount"""
        return self.subtotal_price - self.discount_value


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    quantity: Optional[int] = Field(None, gt=0, le=10000)
    unit_price: Optional[Decimal] = Field(None, gt=0, le=Decimal("1000000"))
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    
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
    
    @field_validator('discount_percent')
    @classmethod
    def validate_discount_percent(cls, v):
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError('Discount percentage must be between 0 and 100')
            return round(v, 2)
        return v
    
    @field_validator('discount_amount')
    @classmethod
    def validate_discount_amount(cls, v):
        if v is not None:
            if v < 0:
                raise ValueError('Discount amount cannot be negative')
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
                # More flexible email validation
                email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
                if not email_pattern.match(v):
                    raise ValueError('Invalid email format')
                return v
            # If empty string after strip, treat as None (optional field)
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


class QuoteWithWorkflowCreate(QuoteBase):
    items: List[QuoteItemCreate] = Field(default_factory=list, max_items=100, description="Quote items")
    workflow: Optional[Dict] = Field(None, description="Workflow configuration")
    
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
    workflow_id: Optional[str] = Field(None, description="Associated workflow identifier")
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
    
    @property
    def max_discount_percent(self) -> Decimal:
        """Get the maximum discount percentage across all items"""
        if not self.items:
            return Decimal('0')
        return max(item.discount_percent for item in self.items)
    
    @property
    def total_discount_amount(self) -> Decimal:
        """Get total discount amount across all items"""
        return sum(item.discount_value for item in self.items)
    
    @property
    def subtotal_amount(self) -> Decimal:
        """Get subtotal before discounts"""
        return sum(item.subtotal_price for item in self.items)
    
    @property
    def overall_discount_percent(self) -> Decimal:
        """Calculate overall discount percentage"""
        subtotal = self.subtotal_amount
        if subtotal == 0:
            return Decimal('0')
        total_discount = self.total_discount_amount
        return (total_discount / subtotal) * Decimal('100')
    
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