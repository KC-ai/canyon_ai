"""
Supabase-based workflow service for Canyon AI CPQ
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from app.models.workflows import (
    ApprovalWorkflow, 
    WorkflowStep, 
    ApprovalWorkflowCreate,
    WorkflowStepCreate,
    WorkflowStepUpdate,
    WorkflowActionRequest,
    PersonaType,
    WorkflowStepStatus,
    WorkflowStatus,
    ApprovalAction
)
from app.core.supabase_client import get_supabase_client
from app.core.errors import StorageError
from app.core.logging_config import get_logger

logger = get_logger("supabase_workflow_service")

# Custom workflow errors
class WorkflowNotFoundError(Exception):
    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        super().__init__(f"Workflow {workflow_id} not found")

class WorkflowPermissionError(Exception):
    def __init__(self, user_id: str, workflow_id: str):
        self.user_id = user_id
        self.workflow_id = workflow_id
        super().__init__(f"User {user_id} does not have permission to access workflow {workflow_id}")

class WorkflowValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

class SupabaseWorkflowService:
    """Supabase-based workflow service"""
    
    @staticmethod
    async def create_workflow(workflow_data: ApprovalWorkflowCreate, user_id: str) -> ApprovalWorkflow:
        """Create a new workflow"""
        try:
            supabase = get_supabase_client()
            workflow_id = str(uuid.uuid4())
            now = datetime.now().isoformat()
            
            # Create workflow record
            workflow_record = {
                "id": workflow_id,
                "user_id": user_id,
                "name": workflow_data.name,
                "description": workflow_data.description or "",
                "quote_id": getattr(workflow_data, 'quote_id', None),
                "status": "draft",
                "is_active": workflow_data.is_active,
                "trigger_amount": float(workflow_data.trigger_amount) if workflow_data.trigger_amount else None,
                "trigger_discount_percent": float(workflow_data.trigger_discount_percent) if workflow_data.trigger_discount_percent else None,
                "auto_start": workflow_data.auto_start,
                "allow_parallel_steps": workflow_data.allow_parallel_steps,
                "require_all_approvals": workflow_data.require_all_approvals,
                "created_at": now,
                "updated_at": now
            }
            
            result = supabase.table('workflows').insert(workflow_record).execute()
            if not result.data:
                raise StorageError("create_workflow", "Failed to create workflow record")
            
            # Create workflow steps
            first_step_created = False
            for step_data in workflow_data.steps:
                # First step should be in_progress if auto_start is enabled
                step_status = "pending"
                step_assigned_at = None
                
                if workflow_data.auto_start and step_data.order == 1 and not first_step_created:
                    step_status = "in_progress"
                    step_assigned_at = now
                    first_step_created = True
                
                step_record = {
                    "id": str(uuid.uuid4()),
                    "workflow_id": workflow_id,
                    "name": step_data.name,
                    "description": step_data.description or "",
                    "persona": step_data.persona.value,
                    "order": step_data.order,
                    "is_required": step_data.is_required,
                    "auto_approve_threshold": float(step_data.auto_approve_threshold) if step_data.auto_approve_threshold else None,
                    "escalation_threshold": float(step_data.escalation_threshold) if step_data.escalation_threshold else None,
                    "max_processing_days": step_data.max_processing_days or 3,
                    "status": step_status,
                    "assigned_at": step_assigned_at,
                    "created_at": now,
                    "updated_at": now
                }
                supabase.table('workflow_steps').insert(step_record).execute()
            
            # Update workflow status if auto_start is enabled
            if workflow_data.auto_start and workflow_data.steps:
                supabase.table('workflows').update({
                    "status": "active",
                    "started_at": now,
                    "updated_at": now
                }).eq('id', workflow_id).execute()
            
            # Return created workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except Exception as e:
            logger.error(f"Failed to create workflow: {e}")
            raise StorageError("create_workflow", str(e))
    
    @staticmethod
    async def get_workflow(workflow_id: str, user_id: str) -> ApprovalWorkflow:
        """Get a workflow by ID"""
        try:
            supabase = get_supabase_client()
            
            # Get workflow
            workflow_result = supabase.table('workflows').select('*').eq('id', workflow_id).eq('user_id', user_id).execute()
            if not workflow_result.data:
                raise WorkflowNotFoundError(workflow_id)
            
            workflow_data = workflow_result.data[0]
            
            # Get workflow steps
            steps_result = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).order('order').execute()
            steps = []
            if steps_result.data:
                for step_data in steps_result.data:
                    step = WorkflowStep(
                        id=step_data['id'],
                        workflow_id=step_data['workflow_id'],
                        name=step_data['name'],
                        description=step_data.get('description', ''),
                        persona=PersonaType(step_data['persona']),
                        order=step_data['order'],
                        is_required=step_data.get('is_required', True),
                        status=WorkflowStepStatus(step_data.get('status', 'pending')),
                        assigned_user_id=step_data.get('assigned_user_id'),
                        assigned_at=step_data.get('assigned_at'),
                        completed_at=step_data.get('completed_at'),
                        completed_by=step_data.get('completed_by'),
                        action_taken=ApprovalAction(step_data['action_taken']) if step_data.get('action_taken') else None,
                        comments=step_data.get('comments'),
                        rejection_reason=step_data.get('rejection_reason'),
                        auto_approve_threshold=step_data.get('auto_approve_threshold'),
                        escalation_threshold=step_data.get('escalation_threshold'),
                        max_processing_days=step_data.get('max_processing_days', 3),
                        created_at=datetime.fromisoformat(step_data['created_at'].replace('Z', '+00:00')),
                        updated_at=datetime.fromisoformat(step_data['updated_at'].replace('Z', '+00:00'))
                    )
                    steps.append(step)
            
            # Create ApprovalWorkflow object
            workflow = ApprovalWorkflow(
                id=workflow_data['id'],
                user_id=workflow_data['user_id'],
                name=workflow_data['name'],
                description=workflow_data.get('description', ''),
                quote_id=workflow_data.get('quote_id'),
                status=WorkflowStatus(workflow_data.get('status', 'draft')),
                steps=steps,
                is_active=workflow_data.get('is_active', True),
                trigger_amount=workflow_data.get('trigger_amount'),
                trigger_discount_percent=workflow_data.get('trigger_discount_percent'),
                auto_start=workflow_data.get('auto_start', True),
                allow_parallel_steps=workflow_data.get('allow_parallel_steps', False),
                require_all_approvals=workflow_data.get('require_all_approvals', True),
                started_at=datetime.fromisoformat(workflow_data['started_at'].replace('Z', '+00:00')) if workflow_data.get('started_at') else None,
                completed_at=datetime.fromisoformat(workflow_data['completed_at'].replace('Z', '+00:00')) if workflow_data.get('completed_at') else None,
                created_at=datetime.fromisoformat(workflow_data['created_at'].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(workflow_data['updated_at'].replace('Z', '+00:00'))
            )
            
            return workflow
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to get workflow {workflow_id}: {e}")
            raise StorageError("get_workflow", str(e))
    
    @staticmethod
    async def list_workflows(user_id: str, skip: int = 0, limit: int = 100, status_filter: Optional[str] = None, quote_id: Optional[str] = None) -> List[ApprovalWorkflow]:
        """List workflows for a user with optional filtering"""
        try:
            supabase = get_supabase_client()
            
            # Build query with filters
            query = supabase.table('workflows').select('*').eq('user_id', user_id)
            
            # Apply status filter if provided
            if status_filter:
                query = query.eq('status', status_filter)
            
            # Apply quote_id filter if provided
            if quote_id:
                query = query.eq('quote_id', quote_id)
            
            # Get workflows (we'll sort them in Python for better control)
            workflows_result = query.order('created_at', desc=True).execute()
            
            # Custom sorting: active/draft first, then completed/cancelled/rejected last
            def workflow_sort_key(workflow_data):
                status = workflow_data.get('status', 'draft')
                # Priority order: active=0, draft=1, completed=2, cancelled=3, rejected=4
                status_priority = {
                    'active': 0,
                    'draft': 1, 
                    'completed': 2,
                    'cancelled': 3,
                    'rejected': 4
                }.get(status, 5)
                # Secondary sort by created_at (newer first within same priority)
                created_at = workflow_data.get('created_at', '')
                try:
                    # Parse datetime and negate for reverse order
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00')) if created_at else datetime.min
                    return (status_priority, -dt.timestamp())
                except:
                    return (status_priority, 0)
            
            # Sort workflows and apply pagination
            sorted_workflows = sorted(workflows_result.data, key=workflow_sort_key, reverse=False)
            paginated_workflows = sorted_workflows[skip:skip + limit]
            
            workflows = []
            for workflow_data in paginated_workflows:
                # Get steps for each workflow
                steps_result = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_data['id']).order('order').execute()
                steps = []
                if steps_result.data:
                    for step_data in steps_result.data:
                        step = WorkflowStep(
                            id=step_data['id'],
                            workflow_id=step_data['workflow_id'],
                            name=step_data['name'],
                            description=step_data.get('description', ''),
                            persona=PersonaType(step_data['persona']),
                            order=step_data['order'],
                            is_required=step_data.get('is_required', True),
                            status=WorkflowStepStatus(step_data.get('status', 'pending')),
                            assigned_user_id=step_data.get('assigned_user_id'),
                            assigned_at=step_data.get('assigned_at'),
                            completed_at=step_data.get('completed_at'),
                            completed_by=step_data.get('completed_by'),
                            action_taken=ApprovalAction(step_data['action_taken']) if step_data.get('action_taken') else None,
                            comments=step_data.get('comments'),
                            rejection_reason=step_data.get('rejection_reason'),
                            auto_approve_threshold=step_data.get('auto_approve_threshold'),
                            escalation_threshold=step_data.get('escalation_threshold'),
                            max_processing_days=step_data.get('max_processing_days', 3),
                            created_at=datetime.fromisoformat(step_data['created_at'].replace('Z', '+00:00')),
                            updated_at=datetime.fromisoformat(step_data['updated_at'].replace('Z', '+00:00'))
                        )
                        steps.append(step)
                
                workflow = ApprovalWorkflow(
                    id=workflow_data['id'],
                    user_id=workflow_data['user_id'],
                    name=workflow_data['name'],
                    description=workflow_data.get('description', ''),
                    quote_id=workflow_data.get('quote_id'),
                    status=WorkflowStatus(workflow_data.get('status', 'draft')),
                    steps=steps,
                    is_active=workflow_data.get('is_active', True),
                    trigger_amount=workflow_data.get('trigger_amount'),
                    trigger_discount_percent=workflow_data.get('trigger_discount_percent'),
                    auto_start=workflow_data.get('auto_start', True),
                    allow_parallel_steps=workflow_data.get('allow_parallel_steps', False),
                    require_all_approvals=workflow_data.get('require_all_approvals', True),
                    started_at=datetime.fromisoformat(workflow_data['started_at'].replace('Z', '+00:00')) if workflow_data.get('started_at') else None,
                    completed_at=datetime.fromisoformat(workflow_data['completed_at'].replace('Z', '+00:00')) if workflow_data.get('completed_at') else None,
                    created_at=datetime.fromisoformat(workflow_data['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(workflow_data['updated_at'].replace('Z', '+00:00'))
                )
                workflows.append(workflow)
            
            return workflows
            
        except Exception as e:
            logger.error(f"Failed to list workflows for user {user_id}: {e}")
            raise StorageError("list_workflows", str(e))

    @staticmethod
    async def approve_step(workflow_id: str, step_order: int, action: WorkflowActionRequest, user_id: str) -> ApprovalWorkflow:
        """Approve a workflow step"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Get workflow to validate it exists and user has permission
            workflow = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
            # Find the step by order
            target_step = None
            for step in workflow.steps:
                if step.order == step_order:
                    target_step = step
                    break
            
            if not target_step:
                raise StorageError("approve_step", f"Step with order {step_order} not found")
            
            # Validate step can be approved
            if target_step.status not in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
                raise StorageError("approve_step", f"Step {step_order} cannot be approved (current status: {target_step.status})")
            
            # Update the step by ID instead of order to avoid SQL keyword conflicts
            result = supabase.table('workflow_steps').update({
                "status": "approved",
                "action_taken": "approve",
                "completed_at": now,
                "completed_by": user_id,
                "comments": action.comments,
                "updated_at": now
            }).eq('id', target_step.id).execute()
            
            if not result.data:
                raise StorageError("approve_step", "Failed to update step")
            
            # Check if this was the last step and update workflow status
            await SupabaseWorkflowService._check_and_update_workflow_completion(workflow_id, user_id)
            
            # Assign next step if workflow allows sequential processing
            if not workflow.allow_parallel_steps:
                await SupabaseWorkflowService._assign_next_step(workflow_id, step_order)
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to approve step {step_order} in workflow {workflow_id}: {e}")
            raise StorageError("approve_step", str(e))
    
    @staticmethod
    async def reject_step(workflow_id: str, step_order: int, action: WorkflowActionRequest, user_id: str) -> ApprovalWorkflow:
        """Reject a workflow step"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Get workflow to validate it exists and user has permission
            workflow = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
            # Find the step by order
            target_step = None
            for step in workflow.steps:
                if step.order == step_order:
                    target_step = step
                    break
            
            if not target_step:
                raise StorageError("reject_step", f"Step with order {step_order} not found")
            
            # Validate step can be rejected
            if target_step.status not in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
                raise StorageError("reject_step", f"Step {step_order} cannot be rejected (current status: {target_step.status})")
            
            # Validate rejection reason is provided
            if not action.rejection_reason or not action.rejection_reason.strip():
                raise StorageError("reject_step", "Rejection reason is required")
            
            # Update the step by ID instead of order to avoid SQL keyword conflicts
            result = supabase.table('workflow_steps').update({
                "status": WorkflowStepStatus.REJECTED.value,
                "action_taken": ApprovalAction.REJECT.value,
                "completed_at": now,
                "completed_by": user_id,
                "comments": action.comments,
                "rejection_reason": action.rejection_reason,
                "updated_at": now
            }).eq('id', target_step.id).execute()
            
            if not result.data:
                raise StorageError("reject_step", "Failed to update step")
            
            # Cascade rejection - mark all pending/in-progress steps as skipped
            # Note: action_taken should be null for skipped steps, not "skipped"
            # Update pending steps
            supabase.table('workflow_steps').update({
                "status": WorkflowStepStatus.SKIPPED.value,
                "action_taken": None,
                "completed_at": now,
                "comments": "Skipped due to workflow rejection",
                "updated_at": now
            }).eq('workflow_id', workflow_id).eq('status', WorkflowStepStatus.PENDING.value).execute()
            
            # Update in_progress steps
            supabase.table('workflow_steps').update({
                "status": WorkflowStepStatus.SKIPPED.value,
                "action_taken": None,
                "completed_at": now,
                "comments": "Skipped due to workflow rejection",
                "updated_at": now
            }).eq('workflow_id', workflow_id).eq('status', WorkflowStepStatus.IN_PROGRESS.value).execute()
            
            # Update workflow status to cancelled (rejected not allowed in schema)
            supabase.table('workflows').update({
                "status": WorkflowStatus.CANCELLED.value,
                "completed_at": now,
                "updated_at": now
            }).eq('id', workflow_id).execute()
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to reject step {step_order} in workflow {workflow_id}: {e}")
            raise StorageError("reject_step", str(e))
    
    @staticmethod
    async def update_workflow(workflow_id: str, workflow_update: ApprovalWorkflowCreate, user_id: str) -> ApprovalWorkflow:
        """Update entire workflow configuration"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Check if workflow exists and user has permission
            existing = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            if not existing:
                raise WorkflowNotFoundError(workflow_id)
            
            # Update workflow metadata
            workflow_update_data = {
                "name": workflow_update.name,
                "description": workflow_update.description or "",
                "is_active": workflow_update.is_active,
                "trigger_amount": float(workflow_update.trigger_amount) if workflow_update.trigger_amount else None,
                "trigger_discount_percent": float(workflow_update.trigger_discount_percent) if workflow_update.trigger_discount_percent else None,
                "auto_start": workflow_update.auto_start,
                "allow_parallel_steps": workflow_update.allow_parallel_steps,
                "require_all_approvals": workflow_update.require_all_approvals,
                "updated_at": now
            }
            
            result = supabase.table('workflows').update(workflow_update_data).eq('id', workflow_id).eq('user_id', user_id).execute()
            if not result.data:
                raise StorageError("update_workflow", "Failed to update workflow")
            
            # Preserve existing step status when updating
            existing_steps_by_order = {step.order: step for step in existing.steps}
            
            # Delete existing steps
            supabase.table('workflow_steps').delete().eq('workflow_id', workflow_id).execute()
            
            # Create new steps, preserving status of existing ones
            for step_data in workflow_update.steps:
                # Check if this step existed before and preserve its status
                existing_step = existing_steps_by_order.get(step_data.order)
                
                if existing_step:
                    # Preserve existing step's completion status
                    step_status = existing_step.status.value
                    completed_at = existing_step.completed_at.isoformat() if existing_step.completed_at else None
                    completed_by = existing_step.completed_by
                    action_taken = existing_step.action_taken.value if existing_step.action_taken else None
                    comments = existing_step.comments
                    rejection_reason = existing_step.rejection_reason
                    assigned_at = existing_step.assigned_at.isoformat() if existing_step.assigned_at else None
                    assigned_user_id = existing_step.assigned_user_id
                else:
                    # New step - set as pending
                    step_status = "pending"
                    completed_at = None
                    completed_by = None
                    action_taken = None
                    comments = None
                    rejection_reason = None
                    assigned_at = None
                    assigned_user_id = None
                
                step_record = {
                    "id": str(uuid.uuid4()),
                    "workflow_id": workflow_id,
                    "name": step_data.name,
                    "description": step_data.description or "",
                    "persona": step_data.persona.value,
                    "order": step_data.order,
                    "is_required": step_data.is_required,
                    "auto_approve_threshold": float(step_data.auto_approve_threshold) if step_data.auto_approve_threshold else None,
                    "escalation_threshold": float(step_data.escalation_threshold) if step_data.escalation_threshold else None,
                    "max_processing_days": step_data.max_processing_days or 3,
                    "status": step_status,
                    "completed_at": completed_at,
                    "completed_by": completed_by,
                    "action_taken": action_taken,
                    "comments": comments,
                    "rejection_reason": rejection_reason,
                    "assigned_at": assigned_at,
                    "assigned_user_id": assigned_user_id,
                    "created_at": now,
                    "updated_at": now
                }
                supabase.table('workflow_steps').insert(step_record).execute()
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to update workflow {workflow_id}: {e}")
            raise StorageError("update_workflow", str(e))
    
    @staticmethod
    async def update_workflow_steps(workflow_id: str, step_updates: List, user_id: str) -> ApprovalWorkflow:
        """Update workflow steps (for drag and drop reordering and step editing)"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Get existing workflow to validate permission
            workflow = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
            # Check if workflow is in a state that allows step updates
            if workflow.status not in [WorkflowStatus.DRAFT, WorkflowStatus.ACTIVE]:
                raise StorageError("update_workflow_steps", "Cannot update steps of completed or cancelled workflow")
            
            # Track which steps to keep, update, or delete
            existing_step_ids = {step.id for step in workflow.steps}
            updated_step_ids = set()
            
            # Process step updates
            for step_update in step_updates:
                update_data = {"updated_at": now}
                
                # Add fields that are being updated
                if hasattr(step_update, 'order') and step_update.order is not None:
                    update_data["order"] = step_update.order
                if hasattr(step_update, 'name') and step_update.name is not None:
                    update_data["name"] = step_update.name
                if hasattr(step_update, 'description') and step_update.description is not None:
                    update_data["description"] = step_update.description
                if hasattr(step_update, 'persona') and step_update.persona is not None:
                    update_data["persona"] = step_update.persona.value if hasattr(step_update.persona, 'value') else step_update.persona
                if hasattr(step_update, 'is_required') and step_update.is_required is not None:
                    update_data["is_required"] = step_update.is_required
                if hasattr(step_update, 'auto_approve_threshold') and step_update.auto_approve_threshold is not None:
                    update_data["auto_approve_threshold"] = float(step_update.auto_approve_threshold)
                if hasattr(step_update, 'escalation_threshold') and step_update.escalation_threshold is not None:
                    update_data["escalation_threshold"] = float(step_update.escalation_threshold)
                if hasattr(step_update, 'max_processing_days') and step_update.max_processing_days is not None:
                    update_data["max_processing_days"] = step_update.max_processing_days
                
                # Update the step by ID
                if hasattr(step_update, 'id') and step_update.id:
                    # Only update if step hasn't been completed
                    existing_step = next((s for s in workflow.steps if s.id == step_update.id), None)
                    if existing_step and existing_step.status in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
                        result = supabase.table('workflow_steps').update(update_data).eq('id', step_update.id).execute()
                        if result.data:
                            updated_step_ids.add(step_update.id)
                    elif existing_step:
                        # Step exists but is completed, just track it
                        updated_step_ids.add(step_update.id)
            
            # Remove steps that are no longer in the update list (step removal)
            steps_to_remove = existing_step_ids - updated_step_ids
            for step_id in steps_to_remove:
                # Only remove if step hasn't been completed
                existing_step = next((s for s in workflow.steps if s.id == step_id), None)
                if existing_step and existing_step.status in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
                    supabase.table('workflow_steps').delete().eq('id', step_id).execute()
                    logger.info(f"Removed step {step_id} from workflow {workflow_id}")
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to update steps for workflow {workflow_id}: {e}")
            raise StorageError("update_workflow_steps", str(e))
    
    @staticmethod
    async def start_workflow(workflow_id: str, user_id: str) -> ApprovalWorkflow:
        """Start a workflow that was created with auto_start=False"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Update workflow status to in_progress and set started_at
            result = supabase.table('workflows').update({
                "status": "in_progress",
                "started_at": now,
                "updated_at": now
            }).eq('id', workflow_id).eq('user_id', user_id).execute()
            
            if not result.data:
                raise WorkflowNotFoundError(workflow_id)
            
            # Assign first step if it exists
            first_step_result = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).order('"order"').limit(1).execute()
            if first_step_result.data and first_step_result.data[0]['order'] == 1:
                supabase.table('workflow_steps').update({
                    "assigned_at": now,
                    "updated_at": now
                }).eq('id', first_step_result.data[0]['id']).execute()
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to start workflow {workflow_id}: {e}")
            raise StorageError("start_workflow", str(e))
    
    @staticmethod
    async def escalate_step(workflow_id: str, step_order: int, action: WorkflowActionRequest, user_id: str) -> ApprovalWorkflow:
        """Escalate a workflow step to a higher authority"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Get the workflow to find the step
            workflow = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            current_step = next((s for s in workflow.steps if s.order == step_order), None)
            
            if not current_step:
                raise StorageError("escalate_step", f"Step with order {step_order} not found")
            
            # Define escalation hierarchy
            escalation_map = {
                PersonaType.AE: PersonaType.DEAL_DESK,
                PersonaType.DEAL_DESK: PersonaType.CRO,
                PersonaType.CRO: PersonaType.FINANCE,
                PersonaType.LEGAL: PersonaType.CRO,
                PersonaType.FINANCE: PersonaType.CRO  # Finance escalates to CRO
            }
            
            escalate_to = action.escalate_to if action.escalate_to else escalation_map.get(current_step.persona)
            
            if not escalate_to:
                raise StorageError("escalate_step", f"No escalation path defined for {current_step.persona}")
            
            # Update current step to escalated
            supabase.table('workflow_steps').update({
                "status": "escalated",
                "action_taken": "escalate",
                "completed_at": now,
                "completed_by": user_id,
                "comments": action.comments or f"Escalated to {escalate_to.value}",
                "updated_at": now
            }).eq('id', current_step.id).execute()
            
            # Create new escalation step
            escalation_step_id = str(uuid.uuid4())
            max_order = max(s.order for s in workflow.steps) + 1
            
            escalation_step_record = {
                "id": escalation_step_id,
                "workflow_id": workflow_id,
                "name": f"{escalate_to.value} Escalation Review",
                "description": f"Escalated from {current_step.persona.value} - {action.comments or 'No reason provided'}",
                "persona": escalate_to.value,
                "order": max_order,
                "is_required": True,
                "status": "pending",
                "assigned_at": now,
                "max_processing_days": 2,  # Escalated items need faster processing
                "created_at": now,
                "updated_at": now
            }
            
            supabase.table('workflow_steps').insert(escalation_step_record).execute()
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except Exception as e:
            logger.error(f"Failed to escalate step {step_order} in workflow {workflow_id}: {e}")
            raise StorageError("escalate_step", str(e))
    
    @staticmethod
    async def _check_and_update_workflow_completion(workflow_id: str, user_id: str):
        """Check if workflow is complete and update status accordingly"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Get current workflow state
            workflow = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
            # Check if all required steps are completed
            required_steps = [s for s in workflow.steps if s.is_required]
            completed_steps = [s for s in required_steps if s.status in [WorkflowStepStatus.APPROVED, WorkflowStepStatus.SKIPPED]]
            
            # Check for any rejected steps
            rejected_steps = [s for s in workflow.steps if s.status == WorkflowStepStatus.REJECTED]
            
            if rejected_steps:
                # Workflow is cancelled due to rejection
                supabase.table('workflows').update({
                    "status": "cancelled",
                    "completed_at": now,
                    "updated_at": now
                }).eq('id', workflow_id).execute()
            elif len(completed_steps) == len(required_steps):
                # All required steps are completed
                supabase.table('workflows').update({
                    "status": "completed",
                    "completed_at": now,
                    "updated_at": now
                }).eq('id', workflow_id).execute()
            elif workflow.status == WorkflowStatus.DRAFT and any(s.status in [WorkflowStepStatus.IN_PROGRESS, WorkflowStepStatus.APPROVED] for s in workflow.steps):
                # Workflow has started processing
                supabase.table('workflows').update({
                    "status": "active",
                    "started_at": workflow.started_at or now,
                    "updated_at": now
                }).eq('id', workflow_id).execute()
                
        except Exception as e:
            logger.error(f"Failed to check workflow completion for {workflow_id}: {e}")
    
    @staticmethod
    async def _assign_next_step(workflow_id: str, current_step_order: int):
        """Assign the next step in sequential workflow processing"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Find next pending step
            next_step_result = supabase.table('workflow_steps').select('*').eq('workflow_id', workflow_id).eq('status', 'pending').order('"order"').execute()
            
            # Find the step with order = current_step_order + 1
            next_step_data = None
            for step_data in next_step_result.data:
                if step_data['order'] == current_step_order + 1:
                    next_step_data = step_data
                    break
            
            if next_step_data:
                # Assign the next step
                supabase.table('workflow_steps').update({
                    "status": "in_progress",
                    "assigned_at": now,
                    "updated_at": now
                }).eq('id', next_step_data['id']).execute()
                
                logger.info(f"Assigned next step {current_step_order + 1} in workflow {workflow_id}")
                
        except Exception as e:
            logger.error(f"Failed to assign next step for workflow {workflow_id}: {e}")
    
    @staticmethod
    async def add_step_to_workflow(workflow_id: str, step_data: WorkflowStepCreate, user_id: str) -> ApprovalWorkflow:
        """Add a new step to an existing workflow"""
        try:
            supabase = get_supabase_client()
            now = datetime.now().isoformat()
            
            # Get existing workflow to validate permission
            workflow = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
            # Check if workflow allows adding steps
            if workflow.status not in [WorkflowStatus.DRAFT, WorkflowStatus.ACTIVE]:
                raise StorageError("add_step", "Cannot add steps to completed or cancelled workflow")
            
            # Create new step record
            step_record = {
                "id": str(uuid.uuid4()),
                "workflow_id": workflow_id,
                "name": step_data.name,
                "description": step_data.description or "",
                "persona": step_data.persona.value,
                "order": step_data.order,
                "is_required": step_data.is_required,
                "auto_approve_threshold": float(step_data.auto_approve_threshold) if step_data.auto_approve_threshold else None,
                "escalation_threshold": float(step_data.escalation_threshold) if step_data.escalation_threshold else None,
                "max_processing_days": step_data.max_processing_days or 3,
                "status": "pending",
                "created_at": now,
                "updated_at": now
            }
            
            # Insert new step
            result = supabase.table('workflow_steps').insert(step_record).execute()
            if not result.data:
                raise StorageError("add_step", "Failed to create step")
            
            logger.info(f"Added new step {step_data.order} to workflow {workflow_id}")
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to add step to workflow {workflow_id}: {e}")
            raise StorageError("add_step", str(e))
    
    @staticmethod
    async def remove_step_from_workflow(workflow_id: str, step_id: str, user_id: str) -> ApprovalWorkflow:
        """Remove a step from an existing workflow"""
        try:
            supabase = get_supabase_client()
            
            # Get existing workflow to validate permission
            workflow = await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
            # Check if workflow allows removing steps
            if workflow.status not in [WorkflowStatus.DRAFT, WorkflowStatus.ACTIVE]:
                raise StorageError("remove_step", "Cannot remove steps from completed or cancelled workflow")
            
            # Find the step to remove
            target_step = next((s for s in workflow.steps if s.id == step_id), None)
            if not target_step:
                raise StorageError("remove_step", f"Step {step_id} not found")
            
            # Check if step can be removed (not completed)
            if target_step.status not in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]:
                raise StorageError("remove_step", f"Cannot remove completed step {step_id}")
            
            # Remove the step
            result = supabase.table('workflow_steps').delete().eq('id', step_id).execute()
            if not result.data:
                raise StorageError("remove_step", "Failed to remove step")
            
            logger.info(f"Removed step {step_id} from workflow {workflow_id}")
            
            # Return updated workflow
            return await SupabaseWorkflowService.get_workflow(workflow_id, user_id)
            
        except WorkflowNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to remove step from workflow {workflow_id}: {e}")
            raise StorageError("remove_step", str(e))

# Alias for backward compatibility
WorkflowService = SupabaseWorkflowService