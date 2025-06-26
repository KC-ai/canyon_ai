from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from decimal import Decimal
import re


class PersonaType(str, Enum):
    """Workflow personas for approval steps"""
    AE = "ae"  # Account Executive
    DEAL_DESK = "deal_desk"  # Deal Desk
    CRO = "cro"  # Chief Revenue Officer
    LEGAL = "legal"  # Legal Team
    FINANCE = "finance"  # Finance Team
    CUSTOMER = "customer"  # Customer (final recipient)


class WorkflowStepStatus(str, Enum):
    """Status of individual workflow steps"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    SKIPPED = "skipped"


class WorkflowStatus(str, Enum):
    """Overall workflow status"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    FAILED = "failed"


class ApprovalAction(str, Enum):
    """Actions that can be taken on approval steps"""
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CHANGES = "request_changes"
    ESCALATE = "escalate"


class WorkflowStepBase(BaseModel):
    """Base model for workflow steps"""
    name: str = Field(..., min_length=1, max_length=200, description="Step name")
    description: Optional[str] = Field(None, max_length=1000, description="Step description")
    persona: PersonaType = Field(..., description="Persona responsible for this step")
    order: int = Field(..., ge=1, le=100, description="Step order in workflow")
    is_required: bool = Field(default=True, description="Whether this step is required")
    auto_approve_threshold: Optional[Decimal] = Field(None, ge=0, description="Auto-approve if quote total below this amount")
    escalation_threshold: Optional[Decimal] = Field(None, ge=0, description="Auto-escalate if quote total above this amount")
    max_processing_days: int = Field(default=5, ge=1, le=30, description="Maximum days to complete step")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Step name cannot be empty')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('auto_approve_threshold', 'escalation_threshold', mode='before')
    @classmethod
    def validate_thresholds_empty_string(cls, v):
        if v == '' or v is None:
            return None
        return v
    
    @model_validator(mode='after')
    def validate_thresholds(self):
        if (self.auto_approve_threshold is not None and 
            self.escalation_threshold is not None and
            self.auto_approve_threshold >= self.escalation_threshold):
            raise ValueError('Auto-approve threshold must be less than escalation threshold')
        return self


class WorkflowStepCreate(WorkflowStepBase):
    """Model for creating workflow steps"""
    pass


class WorkflowStepUpdate(BaseModel):
    """Model for updating workflow steps"""
    id: Optional[str] = Field(None, description="Step ID for targeted updates")
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    persona: Optional[PersonaType] = None
    order: Optional[int] = Field(None, ge=1, le=100)
    is_required: Optional[bool] = None
    auto_approve_threshold: Optional[Decimal] = Field(None, ge=0)
    escalation_threshold: Optional[Decimal] = Field(None, ge=0)
    max_processing_days: Optional[int] = Field(None, ge=1, le=30)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Step name cannot be empty')
        return v.strip() if v else v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class WorkflowStep(WorkflowStepBase):
    """Complete workflow step model"""
    id: str = Field(..., description="Unique step identifier")
    workflow_id: str = Field(..., description="Workflow this step belongs to")
    status: WorkflowStepStatus = Field(default=WorkflowStepStatus.PENDING, description="Current step status")
    assigned_user_id: Optional[str] = Field(None, description="User assigned to this step")
    assigned_at: Optional[datetime] = Field(None, description="When step was assigned")
    completed_at: Optional[datetime] = Field(None, description="When step was completed")
    completed_by: Optional[str] = Field(None, description="User who completed the step")
    action_taken: Optional[ApprovalAction] = Field(None, description="Action taken on this step")
    comments: Optional[str] = Field(None, max_length=2000, description="Comments from approver")
    rejection_reason: Optional[str] = Field(None, max_length=1000, description="Reason for rejection")
    created_at: datetime = Field(..., description="Step creation timestamp")
    updated_at: datetime = Field(..., description="Step last update timestamp")
    
    @property
    def is_overdue(self) -> bool:
        """Check if step is overdue"""
        if self.status not in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
            return False
        if not self.assigned_at:
            return False
        
        days_elapsed = (datetime.utcnow() - self.assigned_at).days
        return days_elapsed > self.max_processing_days
    
    @property
    def days_remaining(self) -> Optional[int]:
        """Calculate days remaining for step completion"""
        if self.status not in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
            return None
        if not self.assigned_at:
            return self.max_processing_days
        
        days_elapsed = (datetime.utcnow() - self.assigned_at).days
        remaining = self.max_processing_days - days_elapsed
        return max(0, remaining)
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class ApprovalWorkflowBase(BaseModel):
    """Base model for approval workflows"""
    name: str = Field(..., min_length=1, max_length=200, description="Workflow name")
    description: Optional[str] = Field(None, max_length=2000, description="Workflow description")
    is_active: bool = Field(default=True, description="Whether workflow is active")
    trigger_amount: Optional[Decimal] = Field(None, ge=0, description="Quote amount that triggers this workflow")
    trigger_discount_percent: Optional[Decimal] = Field(None, ge=0, le=100, description="Discount % that triggers workflow")
    auto_start: bool = Field(default=True, description="Whether workflow starts automatically")
    allow_parallel_steps: bool = Field(default=False, description="Allow steps to run in parallel")
    require_all_approvals: bool = Field(default=True, description="Require all steps to be approved")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Workflow name cannot be empty')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('trigger_discount_percent')
    @classmethod
    def validate_discount_percent(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Discount percentage must be between 0 and 100')
        return v


class ApprovalWorkflowCreate(ApprovalWorkflowBase):
    """Model for creating approval workflows"""
    steps: List[WorkflowStepCreate] = Field(default_factory=list, max_items=20, description="Workflow steps")
    
    @field_validator('steps')
    @classmethod
    def validate_steps(cls, v):
        if len(v) == 0:
            raise ValueError('Workflow must contain at least one step')
        return v
    
    @model_validator(mode='after')
    def validate_step_ordering(self):
        if not self.steps:
            return self
        
        # Check for duplicate orders
        orders = [step.order for step in self.steps]
        if len(orders) != len(set(orders)):
            raise ValueError('Step orders must be unique')
        
        # Check for sequential ordering starting from 1
        sorted_orders = sorted(orders)
        expected_orders = list(range(1, len(orders) + 1))
        if sorted_orders != expected_orders:
            raise ValueError('Step orders must be sequential starting from 1')
        
        # Validate persona distribution - only for template workflows
        # Custom workflows can have any persona combination
        if hasattr(self, '_is_template') and self._is_template:
            personas = [step.persona for step in self.steps]
            required_personas = [PersonaType.AE, PersonaType.DEAL_DESK]
            
            for required_persona in required_personas:
                if required_persona not in personas:
                    raise ValueError(f'Workflow must include {required_persona.value} step')
        
        return self


class ApprovalWorkflowUpdate(BaseModel):
    """Model for updating approval workflows"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    is_active: Optional[bool] = None
    trigger_amount: Optional[Decimal] = Field(None, ge=0)
    trigger_discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    auto_start: Optional[bool] = None
    allow_parallel_steps: Optional[bool] = None
    require_all_approvals: Optional[bool] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Workflow name cannot be empty')
        return v.strip() if v else v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class ApprovalWorkflow(ApprovalWorkflowBase):
    """Complete approval workflow model"""
    id: str = Field(..., description="Unique workflow identifier")
    user_id: str = Field(..., description="User who created the workflow")
    status: WorkflowStatus = Field(default=WorkflowStatus.DRAFT, description="Workflow status")
    quote_id: Optional[str] = Field(None, description="Quote this workflow is processing")
    steps: List[WorkflowStep] = Field(default_factory=list, description="Workflow steps")
    started_at: Optional[datetime] = Field(None, description="When workflow was started")
    completed_at: Optional[datetime] = Field(None, description="When workflow was completed")
    created_at: datetime = Field(..., description="Workflow creation timestamp")
    updated_at: datetime = Field(..., description="Workflow last update timestamp")
    
    @property
    def current_step(self) -> Optional[WorkflowStep]:
        """Get the current active step"""
        if not self.steps:
            return None
        
        # Find first pending or in-progress step
        for step in sorted(self.steps, key=lambda x: x.order):
            if step.status in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
                return step
        
        return None
    
    @property
    def progress_percentage(self) -> float:
        """Calculate workflow completion percentage"""
        if not self.steps:
            return 0.0
        
        completed_steps = len([s for s in self.steps if s.status in [
            WorkflowStepStatus.APPROVED, 
            WorkflowStepStatus.SKIPPED
        ]])
        
        return (completed_steps / len(self.steps)) * 100
    
    @property
    def is_approved(self) -> bool:
        """Check if workflow is fully approved"""
        if not self.steps:
            return False
        
        if self.require_all_approvals:
            return all(
                step.status in [WorkflowStepStatus.APPROVED, WorkflowStepStatus.SKIPPED] 
                or not step.is_required
                for step in self.steps
            )
        else:
            # At least one approval required
            return any(
                step.status == WorkflowStepStatus.APPROVED 
                for step in self.steps
            )
    
    @property
    def is_rejected(self) -> bool:
        """Check if workflow has been rejected"""
        return any(step.status == WorkflowStepStatus.REJECTED for step in self.steps)
    
    @property
    def overdue_steps(self) -> List[WorkflowStep]:
        """Get list of overdue steps"""
        return [step for step in self.steps if step.is_overdue]
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class WorkflowListResponse(BaseModel):
    """Response model for paginated workflow lists"""
    workflows: List[ApprovalWorkflow] = Field(..., description="List of workflows")
    total: int = Field(..., ge=0, description="Total number of workflows")
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


class WorkflowActionRequest(BaseModel):
    """Request model for workflow actions"""
    action: ApprovalAction = Field(..., description="Action to take")
    comments: Optional[str] = Field(None, max_length=2000, description="Comments about the action")
    rejection_reason: Optional[str] = Field(None, max_length=1000, description="Reason for rejection")
    escalate_to: Optional[PersonaType] = Field(None, description="Persona to escalate to")
    
    @field_validator('comments')
    @classmethod
    def validate_comments(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @field_validator('rejection_reason')
    @classmethod
    def validate_rejection_reason(cls, v):
        if v is not None:
            return v.strip() if v.strip() else None
        return v
    
    @model_validator(mode='after')
    def validate_action_requirements(self):
        if self.action == ApprovalAction.REJECT and not self.rejection_reason:
            raise ValueError('Rejection reason is required when rejecting')
        
        if self.action == ApprovalAction.ESCALATE and not self.escalate_to:
            raise ValueError('Escalation target is required when escalating')
        
        return self


# Workflow template models for common scenarios
class WorkflowTemplate(BaseModel):
    """Pre-defined workflow templates"""
    name: str
    description: str
    steps: List[WorkflowStepCreate]
    trigger_amount: Optional[Decimal] = None
    trigger_discount_percent: Optional[Decimal] = None


# Common workflow templates
STANDARD_DEAL_WORKFLOW = WorkflowTemplate(
    name="Standard Deal Approval",
    description="Standard approval workflow for deals over $10K",
    trigger_amount=Decimal("10000"),
    steps=[
        WorkflowStepCreate(
            name="AE Review",
            description="Account Executive review and validation",
            persona=PersonaType.AE,
            order=1,
            auto_approve_threshold=Decimal("5000")
        ),
        WorkflowStepCreate(
            name="Deal Desk Review", 
            description="Deal Desk pricing and terms review",
            persona=PersonaType.DEAL_DESK,
            order=2,
            auto_approve_threshold=Decimal("25000")
        ),
        WorkflowStepCreate(
            name="Legal Review",
            description="Legal team contract and compliance review",
            persona=PersonaType.LEGAL,
            order=3
        ),
        WorkflowStepCreate(
            name="Customer Delivery",
            description="Final approved quote delivered to customer",
            persona=PersonaType.CUSTOMER,
            order=4
        )
    ]
)

ENTERPRISE_DEAL_WORKFLOW = WorkflowTemplate(
    name="Enterprise Deal Approval",
    description="Enhanced approval workflow for enterprise deals with legal review",
    trigger_amount=Decimal("100000"),
    steps=[
        WorkflowStepCreate(
            name="AE Review",
            description="Account Executive review",
            persona=PersonaType.AE,
            order=1
        ),
        WorkflowStepCreate(
            name="Deal Desk Review",
            description="Deal Desk comprehensive review",
            persona=PersonaType.DEAL_DESK,
            order=2
        ),
        WorkflowStepCreate(
            name="Legal Review",
            description="Legal team contract and terms review",
            persona=PersonaType.LEGAL,
            order=3,
            max_processing_days=7
        ),
        WorkflowStepCreate(
            name="Finance Review",
            description="Finance team revenue and cash flow review", 
            persona=PersonaType.FINANCE,
            order=4,
            max_processing_days=3
        ),
        WorkflowStepCreate(
            name="CRO Final Approval",
            description="CRO final approval for enterprise deals",
            persona=PersonaType.CRO,
            order=5
        ),
        WorkflowStepCreate(
            name="Customer Delivery",
            description="Final approved quote delivered to customer",
            persona=PersonaType.CUSTOMER,
            order=6
        )
    ]
)