from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from app.core.auth import get_current_user, AuthUser
from app.models.workflows import (
    WorkflowStatus, StepApproval, StepRejection
)
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/api/workflow", tags=["workflow"])
workflow_service = WorkflowService()

@router.get("/quotes/{quote_id}/status", response_model=WorkflowStatus)
async def get_workflow_status(
    quote_id: UUID,
    current_user: AuthUser = Depends(get_current_user)
):
    """Get workflow status for a quote"""
    return await workflow_service.get_workflow_status(str(quote_id), current_user.persona)

@router.post("/steps/{step_id}/approve")
async def approve_step(
    step_id: UUID,
    approval: StepApproval,
    current_user: AuthUser = Depends(get_current_user)
):
    """Approve a workflow step"""
    # Validate user can approve
    can_approve = await workflow_service.can_user_approve(str(step_id), current_user.persona)
    if not can_approve:
        raise HTTPException(403, "You cannot approve this step at this time")
    
    await workflow_service.approve_step(str(step_id), current_user.user_id, approval.comments)
    
    return {"message": "Step approved successfully"}

@router.post("/steps/{step_id}/reject")
async def reject_step(
    step_id: UUID,
    rejection: StepRejection,
    current_user: AuthUser = Depends(get_current_user)
):
    """Reject a workflow step"""
    # Validate user can reject
    can_approve = await workflow_service.can_user_approve(str(step_id), current_user.persona)
    if not can_approve:
        raise HTTPException(403, "You cannot reject this step at this time")
    
    await workflow_service.reject_step(str(step_id), current_user.user_id, rejection.reason)
    
    return {"message": "Step rejected"}