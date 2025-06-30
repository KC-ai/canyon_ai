from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional, List, Literal, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema

from enum import Enum

if TYPE_CHECKING:
    from app.models.workflows import WorkflowStep

class QuoteStatus(str, Enum):
    DRAFT = "draft"
    DRAFT_REOPENED = "draft_reopened"
    PENDING_DEAL_DESK = "pending_deal_desk"
    PENDING_CRO = "pending_cro"
    PENDING_LEGAL = "pending_legal"
    PENDING_FINANCE = "pending_finance"
    PENDING_CUSTOMER = "pending_customer"
    APPROVED = "approved"
    REJECTED = "rejected"
    TERMINATED = "terminated"

class QuoteItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = Field(gt=0, default=1)
    unit_price: Decimal = Field(ge=0)
    discount_percent: Decimal = Field(ge=0, le=100, default=0)
    
    model_config = ConfigDict(
        json_encoders={
            Decimal: float
        }
    )

class QuoteItemCreate(QuoteItemBase):
    pass

class QuoteItem(QuoteItemBase):
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: float,
            UUID: str,
            datetime: lambda v: v.isoformat()
        }
    )
    
    id: UUID
    quote_id: UUID
    total_price: Decimal
    created_at: datetime

class QuoteBase(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_company: Optional[str] = None
    title: str
    description: Optional[str] = None
    discount_percent: Decimal = Field(ge=0, le=100, default=0)
    
    model_config = ConfigDict(
        json_encoders={
            Decimal: float
        }
    )

class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate] = []

class QuoteUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_company: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)

class Quote(QuoteBase):
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            Decimal: float,
            UUID: str,
            datetime: lambda v: v.isoformat() if v else None
        }
    )
    
    id: UUID
    quote_number: Optional[str] = None
    user_id: UUID
    status: QuoteStatus
    total_amount: Decimal
    items: List[QuoteItem] = []
    
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    terminated_at: Optional[datetime] = None
    
    termination_reason: Optional[str] = None
    terminated_by: Optional[UUID] = None
    
    created_at: datetime
    updated_at: datetime

class QuoteTerminate(BaseModel):
    reason: str = Field(min_length=10, description="Termination reason (min 10 chars)")

class QuoteWithWorkflow(Quote):
    workflow_steps: List['WorkflowStep'] = []
    current_step: Optional['WorkflowStep'] = None
    current_stage: Optional[str] = None  # For frontend filtering
    owner: Optional[str] = None  # Owner name extracted from email

# Import WorkflowStep to resolve forward reference
from app.models.workflows import WorkflowStep

# Rebuild model to resolve forward references
QuoteWithWorkflow.model_rebuild()