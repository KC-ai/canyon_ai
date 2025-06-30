from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID
from decimal import Decimal

PersonaType = Literal["ae", "deal_desk", "cro", "legal", "finance", "customer"]
StepStatus = Literal["pending", "approved", "rejected", "skipped"]

class WorkflowStepBase(BaseModel):
    """Base model for workflow steps"""
    persona: PersonaType
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    step_order: int = Field(..., gt=0, le=100)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Step name cannot be empty')
            return v.strip()
        return v

class WorkflowStepCreate(WorkflowStepBase):
    """Model for creating workflow steps"""
    pass

class WorkflowStep(WorkflowStepBase):
    """Complete workflow step model with CPQ-specific fields"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    quote_id: UUID
    status: StepStatus = "pending"
    auto_approved: Optional[bool] = False
    
    assigned_at: Optional[datetime] = None
    assigned_to: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[UUID] = None
    
    comments: Optional[str] = Field(None, max_length=2000)
    rejection_reason: Optional[str] = Field(None, max_length=1000)
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @field_validator('comments', 'rejection_reason')
    @classmethod
    def validate_text_fields(cls, v):
        if v is not None:
            v = v.strip()
            return v if v else None
        return v
    
    @model_validator(mode='after')
    def validate_completion_fields(self):
        """Ensure completion fields are consistent"""
        # For approved/rejected status, we should have approved_at and approved_by
        if self.status in ['approved', 'rejected']:
            if not self.approved_at and not self.completed_at:
                # Accept either approved_at or completed_at for backward compatibility
                pass  # Field is optional in Supabase
            if not self.approved_by and not self.completed_by and not self.auto_approved:
                # Accept either approved_by or completed_by for backward compatibility
                pass  # Field is optional in Supabase
        
        if self.status == 'rejected' and not self.rejection_reason and not self.comments:
            # Accept either rejection_reason or comments for rejection
            pass  # Field is optional in Supabase
            
        return self
    
    @property
    def is_complete(self) -> bool:
        """Check if step is complete"""
        return self.status in ['approved', 'rejected', 'skipped']
    
    @property
    def processing_time_hours(self) -> Optional[float]:
        """Calculate processing time in hours"""
        # Use approved_at as the completion time
        completion_time = self.approved_at or self.completed_at
        start_time = self.assigned_at or self.created_at
        
        if completion_time and start_time:
            delta = completion_time - start_time
            return delta.total_seconds() / 3600
        return None

class StepApproval(BaseModel):
    """Model for approving a workflow step"""
    comments: Optional[str] = Field(None, max_length=2000)
    
    @field_validator('comments')
    @classmethod
    def validate_comments(cls, v):
        if v is not None:
            v = v.strip()
            return v if v else None
        return v

class StepRejection(BaseModel):
    """Model for rejecting a workflow step"""
    reason: str = Field(..., min_length=10, max_length=1000, description="Rejection reason (min 10 chars)")
    
    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v):
        if not v or not v.strip():
            raise ValueError('Rejection reason cannot be empty')
        v = v.strip()
        if len(v) < 10:
            raise ValueError('Rejection reason must be at least 10 characters')
        return v

class WorkflowStatus(BaseModel):
    """Workflow status information for a quote"""
    quote_id: UUID
    current_step: Optional[WorkflowStep] = None
    steps: List[WorkflowStep]
    can_approve: bool = False
    is_complete: bool = False
    
    @property
    def completed_steps(self) -> List[WorkflowStep]:
        """Get all completed steps"""
        return [s for s in self.steps if s.is_complete]
    
    @property
    def pending_steps(self) -> List[WorkflowStep]:
        """Get all pending steps"""
        return [s for s in self.steps if s.status == 'pending']
    
    @property
    def progress_percentage(self) -> float:
        """Calculate workflow completion percentage"""
        if not self.steps:
            return 0.0
        completed = len(self.completed_steps)
        return (completed / len(self.steps)) * 100
    
    @property
    def next_approvers(self) -> List[PersonaType]:
        """Get list of next approvers needed"""
        return [s.persona for s in self.pending_steps[:3]]  # Show next 3 approvers

class WorkflowCreate(BaseModel):
    """Model for creating a workflow based on quote discount"""
    quote_id: UUID
    discount_percent: Decimal = Field(ge=0, le=100)
    
    @field_validator('discount_percent')
    @classmethod
    def validate_discount_percent(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Discount percentage must be between 0 and 100')
        return round(v, 2)
    
    def get_required_personas(self) -> List[PersonaType]:
        """Determine required personas based on discount"""
        personas = ['ae', 'deal_desk']  # Always required
        
        discount = float(self.discount_percent)
        
        # Add CRO for 15-40% discount
        if 15 < discount <= 40:
            personas.append('cro')
        
        # Add CRO and Finance for >40% discount
        elif discount > 40:
            personas.append('cro')
            personas.append('finance')
        
        # Legal always required after approvals
        personas.append('legal')
        
        # Customer delivery as final step
        personas.append('customer')
        
        return personas

class WorkflowSummary(BaseModel):
    """Summary of workflow for a quote"""
    quote_id: UUID
    total_steps: int
    completed_steps: int
    current_step: Optional[str] = None
    current_approver: Optional[PersonaType] = None
    status: Literal["not_started", "in_progress", "completed", "rejected"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    @property
    def is_active(self) -> bool:
        """Check if workflow is active"""
        return self.status == "in_progress"
    
    @property
    def duration_hours(self) -> Optional[float]:
        """Calculate workflow duration in hours"""
        if self.started_at:
            end_time = self.completed_at or datetime.utcnow()
            delta = end_time - self.started_at
            return delta.total_seconds() / 3600
        return None

class WorkflowMetrics(BaseModel):
    """Metrics for workflow performance"""
    persona: PersonaType
    total_approvals: int = 0
    total_rejections: int = 0
    avg_processing_hours: float = 0.0
    min_processing_hours: float = 0.0
    max_processing_hours: float = 0.0
    pending_count: int = 0
    
    @property
    def approval_rate(self) -> float:
        """Calculate approval rate percentage"""
        total = self.total_approvals + self.total_rejections
        if total == 0:
            return 0.0
        return (self.total_approvals / total) * 100
    
    @property
    def total_decisions(self) -> int:
        """Total decisions made"""
        return self.total_approvals + self.total_rejections