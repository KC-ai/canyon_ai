from fastapi import APIRouter, HTTPException, Depends, Query, status, Path, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from typing import List, Optional
from datetime import datetime
from app.models.workflows import (
    ApprovalWorkflow, 
    ApprovalWorkflowCreate,
    WorkflowStepCreate,
    WorkflowStepUpdate, 
    WorkflowActionRequest,
    WorkflowListResponse,
    PersonaType,
    WorkflowStatus,
    WorkflowStepStatus
)
from app.services.supabase_workflow_service import (
    SupabaseWorkflowService as WorkflowService, 
    WorkflowNotFoundError,
    WorkflowPermissionError,
    WorkflowValidationError
)
from app.core.auth import get_current_user_id
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger("workflows_api")


@router.post("/", response_model=ApprovalWorkflow)
async def create_workflow(
    workflow_data: ApprovalWorkflowCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new workflow"""
    try:
        logger.info(f"Creating workflow for user {user_id}")
        
        # Create workflow using Supabase service
        workflow = await WorkflowService.create_workflow(workflow_data, user_id)
        
        logger.info(f"Workflow created successfully: {workflow.id}")
        return workflow
        
    except Exception as e:
        logger.error(f"Failed to create workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create workflow"
        )

@router.get("/", response_model=List[ApprovalWorkflow])
async def list_workflows(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of items to return"),
    user_id: str = Depends(get_current_user_id)
):
    """Get list of workflows for current user"""
    try:
        logger.info(f"Listing workflows for user {user_id}")
        workflows = await WorkflowService.list_workflows(user_id, skip, limit)
        logger.debug(f"Found {len(workflows)} workflows")
        return workflows
    except Exception as e:
        logger.error(f"Failed to list workflows: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflows"
        )


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
        
        # Get workflows from service with filtering
        workflows = await WorkflowService.list_workflows(
            user_id, 
            skip, 
            limit, 
            status_filter=status_filter.value if status_filter else None,
            quote_id=quote_id
        )
        
        total_count = len(workflows)
        
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


@router.post("/{workflow_id}/steps", response_model=ApprovalWorkflow)
async def add_workflow_step(
    workflow_id: str = Path(..., description="Workflow ID"),
    step_data: WorkflowStepCreate = ...,
    user_id: str = Depends(get_current_user_id)
):
    """Add a new step to an existing workflow"""
    try:
        logger.info(f"Adding step to workflow {workflow_id}")
        
        workflow = await WorkflowService.add_step_to_workflow(
            workflow_id, step_data, user_id
        )
        
        logger.info(f"Step added successfully to workflow: {workflow_id}")
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
        logger.warning(f"Validation error adding step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to add workflow step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add workflow step"
        )


@router.delete("/{workflow_id}/steps/{step_id}", response_model=ApprovalWorkflow)
async def remove_workflow_step(
    workflow_id: str = Path(..., description="Workflow ID"),
    step_id: str = Path(..., description="Step ID to remove"),
    user_id: str = Depends(get_current_user_id)
):
    """Remove a step from an existing workflow"""
    try:
        logger.info(f"Removing step {step_id} from workflow {workflow_id}")
        
        workflow = await WorkflowService.remove_step_from_workflow(
            workflow_id, step_id, user_id
        )
        
        logger.info(f"Step removed successfully from workflow: {workflow_id}")
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
        logger.warning(f"Validation error removing step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to remove workflow step: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove workflow step"
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
            workflow_id, step_order, action_request, user_id
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
            workflow_id, step_order, action_request, user_id
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
        
        # Escalate the step using WorkflowService
        updated_workflow = await WorkflowService.escalate_step(
            workflow_id, step_order, action_request, user_id
        )
        
        logger.info(f"Step {step_order} escalated in workflow {workflow_id}")
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
        
        # Calculate completion status
        completed_steps = [s for s in workflow.steps if s.status.value in ["approved", "skipped"]]
        is_complete = len(completed_steps) == len(workflow.steps)
        
        # Get current step (first pending step)
        current_step = next((s for s in workflow.steps if s.status == WorkflowStepStatus.PENDING), None)
        
        # Calculate progress percentage
        progress_percentage = int((len(completed_steps) / len(workflow.steps)) * 100) if workflow.steps else 0
        
        # Count overdue steps
        overdue_count = len([s for s in workflow.steps if 
                           s.assigned_at and s.status == WorkflowStepStatus.PENDING and 
                           (datetime.now() - s.assigned_at).days > s.max_processing_days])
        
        # Check if workflow is approved/rejected
        is_approved = workflow.status == WorkflowStatus.COMPLETED
        is_rejected = workflow.status == WorkflowStatus.CANCELLED
        
        return {
            "workflow_id": workflow_id,
            "status": workflow.status.value,
            "is_complete": is_complete,
            "is_approved": is_approved,
            "is_rejected": is_rejected,
            "progress_percentage": progress_percentage,
            "current_step": {
                "order": current_step.order,
                "name": current_step.name,
                "persona": current_step.persona.value,
                "status": current_step.status.value
            } if current_step else None,
            "overdue_steps": overdue_count,
            "total_steps": len(workflow.steps),
            "completed_steps": len(completed_steps)
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
        
        # Get all workflows and filter by persona
        all_workflows = await WorkflowService.list_workflows(user_id)
        pending_workflows = []
        
        for workflow in all_workflows:
            for step in workflow.steps:
                if step.persona == persona and step.status == WorkflowStepStatus.PENDING:
                    pending_workflows.append((workflow, step))
        
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
        
        # Get all workflows and find overdue ones
        all_workflows = await WorkflowService.list_workflows(user_id)
        overdue_workflows = []
        
        for workflow in all_workflows:
            has_overdue = False
            for step in workflow.steps:
                if (step.assigned_at and step.status == WorkflowStepStatus.PENDING and 
                    (datetime.now() - step.assigned_at).days > step.max_processing_days):
                    has_overdue = True
                    break
            if has_overdue:
                overdue_workflows.append(workflow)
        
        result = []
        for workflow in overdue_workflows:
            # Get overdue steps for this workflow
            overdue_steps = []
            for step in workflow.steps:
                if (step.assigned_at and step.status == WorkflowStepStatus.PENDING and 
                    (datetime.now() - step.assigned_at).days > step.max_processing_days):
                    overdue_steps.append(step)
            
            result.append({
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "quote_id": workflow.quote_id,
                "overdue_steps": [
                    {
                        "order": step.order,
                        "name": step.name,
                        "persona": step.persona.value,
                        "days_overdue": (datetime.now() - step.assigned_at).days - step.max_processing_days if step.assigned_at else 0
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
        
        # Get workflow summary statistics
        all_workflows = await WorkflowService.list_workflows(user_id)
        
        total_workflows = len(all_workflows)
        draft_count = len([w for w in all_workflows if w.status == WorkflowStatus.DRAFT])
        in_progress_count = len([w for w in all_workflows if w.status == WorkflowStatus.IN_PROGRESS])
        completed_count = len([w for w in all_workflows if w.status == WorkflowStatus.COMPLETED])
        cancelled_count = len([w for w in all_workflows if w.status == WorkflowStatus.CANCELLED])
        
        # Count pending steps by persona
        pending_by_persona = {}
        for workflow in all_workflows:
            for step in workflow.steps:
                if step.status == WorkflowStepStatus.PENDING:
                    persona_key = step.persona.value
                    pending_by_persona[persona_key] = pending_by_persona.get(persona_key, 0) + 1
        
        summary = {
            "total_workflows": total_workflows,
            "by_status": {
                "draft": draft_count,
                "in_progress": in_progress_count,
                "completed": completed_count,
                "cancelled": cancelled_count
            },
            "pending_by_persona": pending_by_persona
        }
        
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