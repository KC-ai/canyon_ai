from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class QuoteStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class QuoteItemBase(BaseModel):
    name: str = Field(..., description="Product or service name")
    description: Optional[str] = Field(None, description="Item description")
    quantity: int = Field(..., gt=0, description="Quantity")
    unit_price: float = Field(..., gt=0, description="Price per unit")
    
    @property
    def total_price(self) -> float:
        return self.quantity * self.unit_price


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, gt=0)


class QuoteItem(QuoteItemBase):
    id: str
    quote_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class QuoteBase(BaseModel):
    customer_name: str = Field(..., description="Customer name")
    customer_email: Optional[str] = Field(None, description="Customer email")
    title: str = Field(..., description="Quote title")
    description: Optional[str] = Field(None, description="Quote description")
    status: QuoteStatus = Field(default=QuoteStatus.DRAFT)
    valid_until: Optional[datetime] = Field(None, description="Quote expiration date")


class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate] = Field(default_factory=list)


class QuoteUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[QuoteStatus] = None
    valid_until: Optional[datetime] = None
    items: Optional[List[QuoteItemCreate]] = None


class Quote(QuoteBase):
    id: str
    user_id: str
    items: List[QuoteItem] = Field(default_factory=list)
    total_amount: float = Field(default=0.0)
    created_at: datetime
    updated_at: datetime
    
    @property
    def calculated_total(self) -> float:
        return sum(item.total_price for item in self.items)
    
    class Config:
        from_attributes = True


class QuoteListResponse(BaseModel):
    quotes: List[Quote]
    total: int
    page: int
    limit: int