from fastapi import APIRouter, HTTPException, Depends, Query, status, Path, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from typing import List, Optional
from datetime import datetime
from app.models.workflows import (
    ApprovalWorkflow, 
    ApprovalWorkflowCreate,
    WorkflowStepUpdate, 
    WorkflowActionRequest,
    WorkflowListResponse,
    PersonaType,
    WorkflowStatus
)
from app.services.workflow_service import (
    WorkflowService, 
    WorkflowUtilities,
    WorkflowNotFoundError,
    WorkflowPermissionError,
    WorkflowValidationError
)
from app.core.auth import get_current_user_id, AuthUser, get_current_user
from app.core.errors import StorageError
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger("workflows_api")


@router.get("/{workflow_id}", response_model=ApprovalWorkflow)
async def get_workflow(
    workflow_id: str = Path(..., description="Workflow ID"),
    user_id: str = Depends(get_current_user_id)
):
    """Get workflow details by ID"""
    try:
        logger.info(f"Fetching workflow {workflow_id} for user {user_id}")
        
        workflow = await WorkflowService.get_workflow(workflow_id, user_id)
        
        logger.debug(f"Workflow fetched successfully: {workflow_id}")
        return workflow
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this workflow"
        )
    except Exception as e:
        logger.error(f"Failed to get workflow {workflow_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflow"
        )


@router.get("/", response_model=WorkflowListResponse)
async def get_workflows(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of items to return"),
    status_filter: Optional[WorkflowStatus] = Query(None, description="Filter by workflow status"),
    quote_id: Optional[str] = Query(None, description="Filter by quote ID"),
    user_id: str = Depends(get_current_user_id)
):
    """Get paginated list of workflows for the current user"""
    try:
        logger.info(f"Fetching workflows for user {user_id}")
        
        # This would be implemented in WorkflowService.get_workflows()
        # For now, return a basic response structure
        workflows = []  # TODO: Implement in service
        total_count = 0  # TODO: Implement in service
        
        page = (skip // limit) + 1
        
        return WorkflowListResponse(
            workflows=workflows,
            total=total_count,
            page=page,
            limit=limit,
            has_next=(skip + limit) < total_count,
            has_prev=skip > 0
        )
        
    except Exception as e:
        logger.error(f"Failed to get workflows for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflows"
        )


@router.put("/{workflow_id}", response_model=ApprovalWorkflow)
async def update_workflow(
    request: Request,
    workflow_id: str = Path(..., description="Workflow ID"),
    workflow_update: ApprovalWorkflowCreate = ...,
    user_id: str = Depends(get_current_user_id)
):
    """Update entire workflow configuration (name, description, steps, triggers, etc.)"""
    try:
        logger.info(f"Updating workflow configuration for workflow {workflow_id}")
        logger.debug(f"Received workflow_update data: {workflow_update}")
        logger.debug(f"Workflow name: '{workflow_update.name}'")
        logger.debug(f"Number of steps: {len(workflow_update.steps) if workflow_update.steps else 0}")
        
        # Validate workflow data
        if not workflow_update.name or not workflow_update.name.strip():
            logger.error(f"Workflow name validation failed: name='{workflow_update.name}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workflow name is required"
            )
        
        if not workflow_update.steps:
            logger.error(f"No steps provided in workflow update")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one workflow step is required"
            )
        
        # Check for duplicate step orders
        orders = [step.order for step in workflow_update.steps]
        logger.debug(f"Step orders: {orders}")
        if len(orders) != len(set(orders)):
            logger.error(f"Duplicate step orders found: {orders}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Step orders must be unique"
            )
        
        # Additional step validation
        for i, step in enumerate(workflow_update.steps):
            logger.debug(f"Step {i}: name='{step.name}', order={step.order}, persona={step.persona}")
            if not step.name or not step.name.strip():
                logger.error(f"Step {i} has empty name")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Step {i+1} name is required"
                )
        
        workflow = await WorkflowService.update_workflow(
            workflow_id, workflow_update, user_id
        )
        
        logger.info(f"Workflow updated successfully: {workflow_id}")
        return workflow
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this workflow"
        )
    except WorkflowValidationError as e:
        logger.warning(f"Validation error updating workflow {workflow_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValidationError as e:
        logger.error(f"Pydantic validation error: {str(e)}")
        logger.error(f"Validation error details: {e.errors()}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation error: {str(e)}"
        )
    except ValueError as e:
        logger.error(f"Value error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to update workflow: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update workflow"
        )


@router.post("/{workflow_id}/start", response_model=ApprovalWorkflow)
async def start_workflow(
    workflow_id: str = Path(..., description="Workflow ID"),
    user_id: str = Depends(get_current_user_id)
):
    """Manually start a workflow that was created with auto_start=False"""
    try:
        logger.info(f"Starting workflow {workflow_id} for user {user_id}")
        
        workflow = await WorkflowService.start_workflow(workflow_id, user_id)
        
        logger.info(f"Workflow started successfully: {workflow_id}")
        return workflow
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to start this workflow"
        )
    except WorkflowValidationError as e:
        logger.warning(f"Validation error starting workflow {workflow_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to start workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start workflow"
        )


@router.put("/{workflow_id}/steps", response_model=ApprovalWorkflow)
async def update_workflow_steps(
    workflow_id: str = Path(..., description="Workflow ID"),
    step_updates: List[WorkflowStepUpdate] = ...,
    user_id: str = Depends(get_current_user_id)
):
    """Update step order from drag-and-drop interface"""
    try:
        logger.info(f"Updating workflow steps for workflow {workflow_id}")
        
        # Validate step updates
        if not step_updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one step update is required"
            )
        
        # Check for duplicate orders
        orders = [update.order for update in step_updates if update.order is not None]
        if len(orders) != len(set(orders)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Step orders must be unique"
            )
        
        workflow = await WorkflowService.update_workflow_steps(
            workflow_id, step_updates, user_id
        )
        
        logger.info(f"Workflow steps updated successfully: {workflow_id}")
        return workflow
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this workflow"
        )
    except WorkflowValidationError as e:
        logger.warning(f"Validation error updating workflow {workflow_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update workflow steps: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update workflow steps"
        )


@router.post("/{workflow_id}/steps/{step_order}/approve", response_model=ApprovalWorkflow)
async def approve_workflow_step(
    workflow_id: str = Path(..., description="Workflow ID"),
    step_order: int = Path(..., ge=1, description="Step order number to approve"),
    action_request: WorkflowActionRequest = ...,
    user_id: str = Depends(get_current_user_id)
):
    """Approve specific workflow step by order"""
    try:
        logger.info(f"Approving step {step_order} in workflow {workflow_id}")
        
        # Validate action is approve
        if action_request.action.value != "approve":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint only accepts approve actions"
            )
        
        # Get workflow to find step by order
        workflow = await WorkflowService.get_workflow(workflow_id, user_id)
        step = next((s for s in workflow.steps if s.order == step_order), None)
        
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Step with order {step_order} not found in workflow"
            )
        
        # Approve the step
        updated_workflow = await WorkflowService.approve_step(
            workflow_id, step.id, action_request, user_id
        )
        
        logger.info(f"Step {step_order} approved successfully in workflow {workflow_id}")
        return updated_workflow
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to approve this workflow step"
        )
    except WorkflowValidationError as e:
        logger.warning(f"Validation error approving step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to approve step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve workflow step"
        )


@router.post("/{workflow_id}/steps/{step_order}/reject", response_model=ApprovalWorkflow)
async def reject_workflow_step(
    workflow_id: str = Path(..., description="Workflow ID"),
    step_order: int = Path(..., ge=1, description="Step order number to reject"),
    action_request: WorkflowActionRequest = ...,
    user_id: str = Depends(get_current_user_id)
):
    """Reject specific workflow step by order (stops workflow)"""
    try:
        logger.info(f"Rejecting step {step_order} in workflow {workflow_id}")
        
        # Validate action is reject
        if action_request.action.value != "reject":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint only accepts reject actions"
            )
        
        # Validate rejection reason is provided
        if not action_request.rejection_reason or not action_request.rejection_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required when rejecting a step"
            )
        
        # Get workflow to find step by order
        workflow = await WorkflowService.get_workflow(workflow_id, user_id)
        step = next((s for s in workflow.steps if s.order == step_order), None)
        
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Step with order {step_order} not found in workflow"
            )
        
        # Reject the step
        updated_workflow = await WorkflowService.reject_step(
            workflow_id, step.id, action_request, user_id
        )
        
        logger.info(f"Step {step_order} rejected, workflow {workflow_id} stopped")
        return updated_workflow
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to reject this workflow step"
        )
    except WorkflowValidationError as e:
        logger.warning(f"Validation error rejecting step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to reject step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject workflow step"
        )


# Additional endpoints for workflow management

@router.post("/{workflow_id}/steps/{step_order}/escalate", response_model=ApprovalWorkflow)
async def escalate_workflow_step(
    workflow_id: str = Path(..., description="Workflow ID"),
    step_order: int = Path(..., ge=1, description="Step order number to escalate"),
    action_request: WorkflowActionRequest = ...,
    user_id: str = Depends(get_current_user_id)
):
    """Escalate workflow step to higher authority"""
    try:
        logger.info(f"Escalating step {step_order} in workflow {workflow_id}")
        
        # Validate action is escalate
        if action_request.action.value != "escalate":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint only accepts escalate actions"
            )
        
        # Validate escalation target is provided
        if not action_request.escalate_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Escalation target persona is required"
            )
        
        # Get workflow to find step by order
        workflow = await WorkflowService.get_workflow(workflow_id, user_id)
        step = next((s for s in workflow.steps if s.order == step_order), None)
        
        if not step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Step with order {step_order} not found in workflow"
            )
        
        # TODO: Implement escalation logic in WorkflowService
        # For now, we'll treat it as a special approval with escalation comments
        
        logger.info(f"Step {step_order} escalated in workflow {workflow_id}")
        return workflow
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to escalate this workflow step"
        )
    except Exception as e:
        logger.error(f"Failed to escalate step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to escalate workflow step"
        )


@router.get("/{workflow_id}/status", response_model=dict)
async def get_workflow_status(
    workflow_id: str = Path(..., description="Workflow ID"),
    user_id: str = Depends(get_current_user_id)
):
    """Get workflow completion status and progress"""
    try:
        logger.debug(f"Checking status for workflow {workflow_id}")
        
        workflow = await WorkflowService.get_workflow(workflow_id, user_id)
        is_complete = await WorkflowService.check_workflow_completion(workflow_id, user_id)
        
        return {
            "workflow_id": workflow_id,
            "status": workflow.status.value,
            "is_complete": is_complete,
            "is_approved": workflow.is_approved,
            "is_rejected": workflow.is_rejected,
            "progress_percentage": workflow.progress_percentage,
            "current_step": {
                "order": workflow.current_step.order,
                "name": workflow.current_step.name,
                "persona": workflow.current_step.persona.value,
                "status": workflow.current_step.status.value
            } if workflow.current_step else None,
            "overdue_steps": len(workflow.overdue_steps),
            "total_steps": len(workflow.steps),
            "completed_steps": len([s for s in workflow.steps if s.status.value in ["approved", "skipped"]])
        }
        
    except WorkflowNotFoundError:
        logger.warning(f"Workflow not found: {workflow_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
    except WorkflowPermissionError:
        logger.warning(f"Permission denied for workflow {workflow_id} by user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this workflow"
        )
    except Exception as e:
        logger.error(f"Failed to get workflow status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflow status"
        )


# Utility endpoints

@router.get("/persona/{persona}/pending")
async def get_pending_workflows_for_persona(
    persona: PersonaType = Path(..., description="Persona type"),
    user_id: str = Depends(get_current_user_id)
):
    """Get workflows pending approval for specific persona"""
    try:
        logger.info(f"Fetching pending workflows for persona {persona.value}")
        
        pending_workflows = await WorkflowUtilities.get_workflows_by_persona(persona, user_id)
        
        result = []
        for workflow, step in pending_workflows:
            result.append({
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "quote_id": workflow.quote_id,
                "step_order": step.order,
                "step_name": step.name,
                "assigned_at": step.assigned_at.isoformat() if step.assigned_at else None,
                "days_remaining": step.days_remaining,
                "is_overdue": step.is_overdue
            })
        
        return {
            "persona": persona.value,
            "pending_count": len(result),
            "workflows": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get pending workflows for persona: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pending workflows"
        )


@router.get("/overdue")
async def get_overdue_workflows(
    user_id: str = Depends(get_current_user_id)
):
    """Get all overdue workflows for the current user"""
    try:
        logger.info(f"Fetching overdue workflows for user {user_id}")
        
        overdue_workflows = await WorkflowUtilities.get_overdue_workflows(user_id)
        
        result = []
        for workflow in overdue_workflows:
            overdue_steps = workflow.overdue_steps
            result.append({
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "quote_id": workflow.quote_id,
                "overdue_steps": [
                    {
                        "order": step.order,
                        "name": step.name,
                        "persona": step.persona.value,
                        "days_overdue": (datetime.utcnow() - step.assigned_at).days - step.max_processing_days if step.assigned_at else 0
                    }
                    for step in overdue_steps
                ]
            })
        
        return {
            "overdue_count": len(result),
            "workflows": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get overdue workflows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve overdue workflows"
        )


@router.get("/summary")
async def get_workflow_summary(
    user_id: str = Depends(get_current_user_id)
):
    """Get workflow summary statistics for dashboard"""
    try:
        logger.debug(f"Fetching workflow summary for user {user_id}")
        
        summary = await WorkflowUtilities.get_workflow_summary(user_id)
        
        return summary
        
    except Exception as e:
        logger.error(f"Failed to get workflow summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflow summary"
        )


# Development endpoints (remove in production)

@router.post("/dev/{quote_id}/create")
async def create_workflow_for_quote_dev(
    quote_id: str = Path(..., description="Quote ID to create workflow for"),
    user_id: str = Depends(get_current_user_id)
):
    """Development endpoint - Create workflow for existing quote"""
    import os
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Development endpoint not available")
    
    try:
        # Get quote from quote service
        from app.services.quote_service import QuoteService
        quote = await QuoteService.get_quote(quote_id, user_id)
        
        # Create workflow
        workflow = await WorkflowService.create_default_workflow(quote, user_id)
        
        logger.info(f"Development workflow created: {workflow.id} for quote {quote_id}")
        return workflow
        
    except Exception as e:
        logger.error(f"Failed to create development workflow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )