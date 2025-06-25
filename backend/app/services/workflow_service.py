from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import uuid
from decimal import Decimal
import asyncio

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
    ApprovalAction,
    STANDARD_DEAL_WORKFLOW,
    ENTERPRISE_DEAL_WORKFLOW
)
from app.models.quotes import Quote
from app.core.storage import storage
from app.core.errors import (
    QuoteNotFoundError,
    QuotePermissionError,
    QuoteValidationError,
    StorageError
)
from app.core.logging_config import get_logger

logger = get_logger("workflow_service")


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


class WorkflowService:
    """Production-ready workflow service with comprehensive approval logic"""
    
    @staticmethod
    async def create_discount_based_workflow(quote: Quote, user_id: str) -> ApprovalWorkflow:
        """
        Creates dynamic approval workflow based on discount percentage thresholds
        
        Default personas: AE, Deal Desk, Legal, Customer
        Add CRO if discount 15-40%
        Add Finance if discount >40%
        
        Args:
            quote: Quote object to create workflow for
            user_id: User creating the workflow
            
        Returns:
            ApprovalWorkflow: Created workflow with dynamic steps
        """
        try:
            logger.info(f"Creating discount-based workflow for quote {quote.id}")
            
            # Calculate maximum discount percentage
            max_discount = quote.max_discount_percent if hasattr(quote, 'max_discount_percent') else Decimal('0')
            logger.info(f"Max discount percentage: {max_discount}%")
            
            workflow_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Base workflow steps: AE -> Deal Desk -> Legal -> Customer
            steps = []
            order = 1
            
            # 1. AE Review (always first)
            steps.append(WorkflowStep(
                id=str(uuid.uuid4()),
                workflow_id=workflow_id,
                name="AE Review",
                description="Account Executive review and validation",
                persona=PersonaType.AE,
                order=order,
                is_required=True,
                max_processing_days=2,
                status=WorkflowStepStatus.PENDING,
                created_at=now,
                updated_at=now
            ))
            order += 1
            
            # 2. Deal Desk Review (always second)
            steps.append(WorkflowStep(
                id=str(uuid.uuid4()),
                workflow_id=workflow_id,
                name="Deal Desk Review",
                description="Deal desk pricing and discount analysis",
                persona=PersonaType.DEAL_DESK,
                order=order,
                is_required=True,
                max_processing_days=3,
                status=WorkflowStepStatus.PENDING,
                created_at=now,
                updated_at=now
            ))
            order += 1
            
            # 3. CRO Review (if discount 15-40%)
            if max_discount >= 15 and max_discount <= 40:
                steps.append(WorkflowStep(
                    id=str(uuid.uuid4()),
                    workflow_id=workflow_id,
                    name="CRO Approval",
                    description=f"CRO approval required for {max_discount}% discount",
                    persona=PersonaType.CRO,
                    order=order,
                    is_required=True,
                    max_processing_days=5,
                    status=WorkflowStepStatus.PENDING,
                    created_at=now,
                    updated_at=now
                ))
                order += 1
            
            # 4. Finance Review (if discount >40%)
            if max_discount > 40:
                # Add CRO first if not already added
                if max_discount > 40:  # Always add CRO for >40% discounts
                    steps.append(WorkflowStep(
                        id=str(uuid.uuid4()),
                        workflow_id=workflow_id,
                        name="CRO Approval",
                        description=f"CRO approval required for {max_discount}% discount",
                        persona=PersonaType.CRO,
                        order=order,
                        is_required=True,
                        max_processing_days=5,
                        status=WorkflowStepStatus.PENDING,
                        created_at=now,
                        updated_at=now
                    ))
                    order += 1
                
                # Add Finance for >40% discounts
                steps.append(WorkflowStep(
                    id=str(uuid.uuid4()),
                    workflow_id=workflow_id,
                    name="Finance Approval",
                    description=f"Finance approval required for {max_discount}% discount (>40%)",
                    persona=PersonaType.FINANCE,
                    order=order,
                    is_required=True,
                    max_processing_days=5,
                    status=WorkflowStepStatus.PENDING,
                    created_at=now,
                    updated_at=now
                ))
                order += 1
            
            # 5. Legal Review (always second to last)
            steps.append(WorkflowStep(
                id=str(uuid.uuid4()),
                workflow_id=workflow_id,
                name="Legal Review",
                description="Legal team contract and compliance review",
                persona=PersonaType.LEGAL,
                order=order,
                is_required=True,
                max_processing_days=7,
                status=WorkflowStepStatus.PENDING,
                created_at=now,
                updated_at=now
            ))
            order += 1
            
            # 6. Customer (always final step)
            steps.append(WorkflowStep(
                id=str(uuid.uuid4()),
                workflow_id=workflow_id,
                name="Customer Delivery",
                description="Final approved quote delivered to customer",
                persona=PersonaType.CUSTOMER,
                order=order,
                is_required=True,
                max_processing_days=1,
                status=WorkflowStepStatus.PENDING,
                created_at=now,
                updated_at=now
            ))
            order += 1
            
            # Determine workflow name based on discount
            if max_discount > 40:
                workflow_name = f"High Discount Approval ({max_discount}%)"
            elif max_discount >= 15:
                workflow_name = f"Medium Discount Approval ({max_discount}%)"
            else:
                workflow_name = f"Standard Approval ({max_discount}%)"
            
            # Create workflow
            workflow = ApprovalWorkflow(
                id=workflow_id,
                user_id=user_id,
                name=f"{workflow_name} - {quote.title}",
                description=f"Dynamic approval workflow for quote {quote.id} with {max_discount}% max discount",
                quote_id=quote.id,
                status=WorkflowStatus.ACTIVE,
                is_active=True,
                trigger_discount_percent=max_discount,
                auto_start=True,
                allow_parallel_steps=False,
                require_all_approvals=True,
                steps=steps,
                started_at=now,
                created_at=now,
                updated_at=now
            )
            
            # Save to storage
            await WorkflowService._save_workflow(workflow)
            
            # Assign first step
            await WorkflowService._assign_next_step(workflow)
            
            logger.info(f"Discount-based workflow created: {workflow_id} with {len(steps)} steps for {max_discount}% discount")
            return workflow
            
        except Exception as e:
            logger.error(f"Failed to create discount-based workflow: {str(e)}")
            raise StorageError("create_discount_based_workflow", str(e))

    @staticmethod
    async def create_default_workflow(quote: Quote, user_id: str) -> ApprovalWorkflow:
        """
        Creates standard approval chain based on quote amount and characteristics
        
        Args:
            quote: Quote object to create workflow for
            user_id: User creating the workflow
            
        Returns:
            ApprovalWorkflow: Created workflow with appropriate steps
        """
        try:
            logger.info(f"Creating default workflow for quote {quote.id}, amount: {quote.total_amount}")
            
            # Determine workflow template based on quote characteristics
            template = WorkflowService._select_workflow_template(quote)
            
            # Calculate discount percentage if applicable
            discount_percent = WorkflowService._calculate_discount_percentage(quote)
            
            workflow_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Create workflow steps with auto-approval logic
            steps = []
            for step_template in template.steps:
                step_id = str(uuid.uuid4())
                
                # Determine if step should be auto-approved
                should_auto_approve = WorkflowService._should_auto_approve(
                    step_template, quote.total_amount, discount_percent
                )
                
                step_status = WorkflowStepStatus.APPROVED if should_auto_approve else WorkflowStepStatus.PENDING
                
                step = WorkflowStep(
                    id=step_id,
                    workflow_id=workflow_id,
                    name=step_template.name,
                    description=step_template.description,
                    persona=step_template.persona,
                    order=step_template.order,
                    is_required=step_template.is_required,
                    auto_approve_threshold=step_template.auto_approve_threshold,
                    escalation_threshold=step_template.escalation_threshold,
                    max_processing_days=step_template.max_processing_days,
                    status=step_status,
                    assigned_at=now if not should_auto_approve else None,
                    completed_at=now if should_auto_approve else None,
                    completed_by="system" if should_auto_approve else None,
                    action_taken=ApprovalAction.APPROVE if should_auto_approve else None,
                    comments="Auto-approved based on amount threshold" if should_auto_approve else None,
                    created_at=now,
                    updated_at=now
                )
                steps.append(step)
            
            # Create workflow with auto_start behavior
            auto_start = True  # Default workflows auto-start by default
            workflow_status = WorkflowStatus.ACTIVE if auto_start else WorkflowStatus.DRAFT
            started_at = now if auto_start else None
            
            workflow = ApprovalWorkflow(
                id=workflow_id,
                user_id=user_id,
                name=f"{template.name} - {quote.title}",
                description=f"Approval workflow for quote {quote.id} (${quote.total_amount})",
                quote_id=quote.id,
                status=workflow_status,
                is_active=True,
                trigger_amount=template.trigger_amount,
                trigger_discount_percent=discount_percent,
                auto_start=auto_start,
                allow_parallel_steps=False,
                require_all_approvals=True,
                steps=steps,
                started_at=started_at,
                created_at=now,
                updated_at=now
            )
            
            # Save to storage
            await WorkflowService._save_workflow(workflow)
            
            # Assign first pending step only if auto_start is enabled
            if auto_start:
                await WorkflowService._assign_next_step(workflow)
            
            logger.info(f"Workflow created successfully: {workflow_id} with {len(steps)} steps")
            return workflow
            
        except Exception as e:
            logger.error(f"Failed to create default workflow: {str(e)}")
            raise StorageError("create_default_workflow", str(e))
    
    @staticmethod
    async def create_workflow(workflow_create: ApprovalWorkflowCreate, user_id: str, quote_id: str) -> ApprovalWorkflow:
        """
        Creates a custom workflow from user-defined configuration
        
        Args:
            workflow_create: Workflow configuration from user
            user_id: User creating the workflow
            quote_id: Quote to associate with workflow
            
        Returns:
            ApprovalWorkflow: Created custom workflow
        """
        try:
            logger.info(f"Creating custom workflow for quote {quote_id}, user: {user_id}")
            
            workflow_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Create workflow steps from user configuration
            steps = []
            for step_config in workflow_create.steps:
                step_id = str(uuid.uuid4())
                
                step = WorkflowStep(
                    id=step_id,
                    workflow_id=workflow_id,
                    name=step_config.name,
                    description=step_config.description,
                    persona=step_config.persona,
                    order=step_config.order,
                    is_required=step_config.is_required,
                    auto_approve_threshold=step_config.auto_approve_threshold,
                    escalation_threshold=step_config.escalation_threshold,
                    max_processing_days=step_config.max_processing_days,
                    status=WorkflowStepStatus.PENDING,
                    created_at=now,
                    updated_at=now
                )
                steps.append(step)
            
            # Create workflow with proper auto_start behavior
            workflow_status = WorkflowStatus.ACTIVE if workflow_create.auto_start else WorkflowStatus.DRAFT
            started_at = now if workflow_create.auto_start else None
            
            workflow = ApprovalWorkflow(
                id=workflow_id,
                user_id=user_id,
                name=workflow_create.name,
                description=workflow_create.description,
                quote_id=quote_id,
                status=workflow_status,
                is_active=workflow_create.is_active,
                trigger_amount=workflow_create.trigger_amount,
                trigger_discount_percent=workflow_create.trigger_discount_percent,
                auto_start=workflow_create.auto_start,
                allow_parallel_steps=workflow_create.allow_parallel_steps,
                require_all_approvals=workflow_create.require_all_approvals,
                steps=steps,
                started_at=started_at,
                created_at=now,
                updated_at=now
            )
            
            # Save to storage
            await WorkflowService._save_workflow(workflow)
            
            # Assign first pending step only if auto_start is enabled
            if workflow_create.auto_start:
                await WorkflowService._assign_next_step(workflow)
            
            logger.info(f"Custom workflow created successfully: {workflow_id} with {len(steps)} steps")
            return workflow
            
        except Exception as e:
            logger.error(f"Failed to create custom workflow: {str(e)}")
            raise StorageError("create_workflow", str(e))
    
    @staticmethod
    async def update_workflow(workflow_id: str, workflow_update: ApprovalWorkflowCreate, user_id: str) -> ApprovalWorkflow:
        """
        Update entire workflow configuration including name, description, steps, and triggers
        
        Args:
            workflow_id: Workflow to update
            workflow_update: Complete workflow configuration
            user_id: User making the changes
            
        Returns:
            ApprovalWorkflow: Updated workflow
        """
        try:
            logger.info(f"Updating workflow configuration for workflow {workflow_id}")
            
            # Get existing workflow
            existing_workflow = await WorkflowService.get_workflow(workflow_id, user_id)
            
            # Validate workflow can be updated - allow FAILED workflows to be edited
            if existing_workflow.status not in [WorkflowStatus.DRAFT, WorkflowStatus.ACTIVE, WorkflowStatus.FAILED]:
                raise WorkflowValidationError(f"Cannot update workflow in {existing_workflow.status} status")
            
            # Prevent updates to workflows with completed/rejected steps unless it's just metadata
            has_completed_steps = any(
                step.status in [WorkflowStepStatus.APPROVED, WorkflowStepStatus.REJECTED] 
                for step in existing_workflow.steps
            )
            
            # If workflow has started, only allow certain updates
            if has_completed_steps:
                # Only allow updating name, description, and adding new steps at the end
                logger.info(f"Workflow {workflow_id} has completed steps, limiting updates")
                
                # Keep existing completed steps
                existing_completed_steps = [
                    step for step in existing_workflow.steps 
                    if step.status in [WorkflowStepStatus.APPROVED, WorkflowStepStatus.REJECTED, WorkflowStepStatus.SKIPPED]
                ]
                
                # Only allow new steps after existing ones
                max_existing_order = max(step.order for step in existing_workflow.steps)
                new_steps = [step for step in workflow_update.steps if step.order > max_existing_order]
                
                # Combine existing completed steps with new steps
                combined_steps = existing_completed_steps.copy()
                
                # Add new steps
                for step_config in new_steps:
                    step_id = str(uuid.uuid4())
                    step = WorkflowStep(
                        id=step_id,
                        workflow_id=workflow_id,
                        name=step_config.name,
                        description=step_config.description,
                        persona=step_config.persona,
                        order=step_config.order,
                        is_required=step_config.is_required,
                        auto_approve_threshold=step_config.auto_approve_threshold,
                        escalation_threshold=step_config.escalation_threshold,
                        max_processing_days=step_config.max_processing_days,
                        status=WorkflowStepStatus.PENDING,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    combined_steps.append(step)
            else:
                # Full replacement if no steps have been completed yet
                combined_steps = []
                for step_config in workflow_update.steps:
                    step_id = str(uuid.uuid4())
                    step = WorkflowStep(
                        id=step_id,
                        workflow_id=workflow_id,
                        name=step_config.name,
                        description=step_config.description,
                        persona=step_config.persona,
                        order=step_config.order,
                        is_required=step_config.is_required,
                        auto_approve_threshold=step_config.auto_approve_threshold,
                        escalation_threshold=step_config.escalation_threshold,
                        max_processing_days=step_config.max_processing_days,
                        status=WorkflowStepStatus.PENDING,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    combined_steps.append(step)
            
            # Update workflow
            now = datetime.utcnow()
            updated_workflow = ApprovalWorkflow(
                id=existing_workflow.id,
                user_id=existing_workflow.user_id,
                name=workflow_update.name,
                description=workflow_update.description,
                quote_id=existing_workflow.quote_id,
                status=existing_workflow.status,
                is_active=workflow_update.is_active,
                trigger_amount=workflow_update.trigger_amount,
                trigger_discount_percent=workflow_update.trigger_discount_percent,
                auto_start=workflow_update.auto_start,
                allow_parallel_steps=workflow_update.allow_parallel_steps,
                require_all_approvals=workflow_update.require_all_approvals,
                steps=sorted(combined_steps, key=lambda x: x.order),
                started_at=existing_workflow.started_at,
                completed_at=existing_workflow.completed_at,
                created_at=existing_workflow.created_at,
                updated_at=now
            )
            
            # Save to storage
            await WorkflowService._save_workflow(updated_workflow)
            
            # If no steps were previously completed, assign first step
            if not has_completed_steps:
                await WorkflowService._assign_next_step(updated_workflow)
            
            logger.info(f"Workflow updated successfully: {workflow_id}")
            return updated_workflow
            
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to update workflow: {str(e)}")
            raise StorageError("update_workflow", str(e))

    @staticmethod
    async def start_workflow(workflow_id: str, user_id: str) -> ApprovalWorkflow:
        """
        Manually start a workflow that was created with auto_start=False
        
        Args:
            workflow_id: Workflow to start
            user_id: User starting the workflow
            
        Returns:
            ApprovalWorkflow: Started workflow
        """
        try:
            logger.info(f"Starting workflow {workflow_id} manually")
            
            workflow = await WorkflowService.get_workflow(workflow_id, user_id)
            
            # Validate workflow can be started
            if workflow.status != WorkflowStatus.DRAFT:
                raise WorkflowValidationError(f"Cannot start workflow in {workflow.status} status. Only DRAFT workflows can be started.")
            
            # Update workflow status and started_at
            now = datetime.utcnow()
            workflow.status = WorkflowStatus.ACTIVE
            workflow.started_at = now
            workflow.updated_at = now
            
            # Save to storage
            await WorkflowService._save_workflow(workflow)
            
            # Assign first pending step
            await WorkflowService._assign_next_step(workflow)
            
            logger.info(f"Workflow {workflow_id} started successfully")
            return workflow
            
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to start workflow: {str(e)}")
            raise StorageError("start_workflow", str(e))

    @staticmethod
    async def update_workflow_steps(workflow_id: str, step_updates: List[WorkflowStepUpdate], user_id: str) -> ApprovalWorkflow:
        """
        Handles reordering and updating workflow steps from drag-and-drop interface
        
        Args:
            workflow_id: Workflow to update
            step_updates: List of step updates with new orders
            user_id: User making the changes
            
        Returns:
            ApprovalWorkflow: Updated workflow
        """
        try:
            logger.info(f"Updating workflow steps for workflow {workflow_id}")
            
            workflow = await WorkflowService.get_workflow(workflow_id, user_id)
            
            # Validate workflow can be updated
            if workflow.status not in [WorkflowStatus.DRAFT, WorkflowStatus.ACTIVE]:
                raise WorkflowValidationError(f"Cannot update workflow in {workflow.status} status")
            
            # Validate step ordering
            orders = [update.order for update in step_updates if update.order is not None]
            if len(orders) != len(set(orders)):
                raise WorkflowValidationError("Step orders must be unique")
            
            # Update steps
            workflows_db = await storage.load_data("workflows")
            workflow_steps_db = await storage.load_data("workflow_steps")
            
            now = datetime.utcnow()
            updated_steps = []
            
            for step in workflow.steps:
                # Find corresponding update
                step_update = next((u for u in step_updates if hasattr(u, 'id') and u.id == step.id), None)
                
                if step_update:
                    # Apply updates
                    for field, value in step_update.dict(exclude_unset=True).items():
                        if hasattr(step, field) and value is not None:
                            setattr(step, field, value)
                    
                    step.updated_at = now
                
                # Update in database
                step_dict = {
                    "id": step.id,
                    "workflow_id": step.workflow_id,
                    "name": step.name,
                    "description": step.description,
                    "persona": step.persona.value,
                    "order": step.order,
                    "is_required": step.is_required,
                    "auto_approve_threshold": str(step.auto_approve_threshold) if step.auto_approve_threshold else None,
                    "escalation_threshold": str(step.escalation_threshold) if step.escalation_threshold else None,
                    "max_processing_days": step.max_processing_days,
                    "status": step.status.value,
                    "assigned_user_id": step.assigned_user_id,
                    "assigned_at": step.assigned_at.isoformat() if step.assigned_at else None,
                    "completed_at": step.completed_at.isoformat() if step.completed_at else None,
                    "completed_by": step.completed_by,
                    "action_taken": step.action_taken.value if step.action_taken else None,
                    "comments": step.comments,
                    "rejection_reason": step.rejection_reason,
                    "created_at": step.created_at.isoformat(),
                    "updated_at": step.updated_at.isoformat()
                }
                workflow_steps_db[step.id] = step_dict
                updated_steps.append(step)
            
            # Update workflow
            workflow.steps = sorted(updated_steps, key=lambda x: x.order)
            workflow.updated_at = now
            
            workflow_dict = await WorkflowService._workflow_to_dict(workflow)
            workflows_db[workflow_id] = workflow_dict
            
            # Save atomically
            await asyncio.gather(
                storage.save_data("workflows", workflows_db),
                storage.save_data("workflow_steps", workflow_steps_db)
            )
            
            logger.info(f"Workflow steps updated successfully: {workflow_id}")
            return workflow
            
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to update workflow steps: {str(e)}")
            raise StorageError("update_workflow_steps", str(e))
    
    @staticmethod
    async def approve_step(workflow_id: str, step_id: str, action_request: WorkflowActionRequest, user_id: str) -> ApprovalWorkflow:
        """
        Processes approval decisions and advances workflow
        
        Args:
            workflow_id: Workflow containing the step
            step_id: Step to approve
            action_request: Approval action details
            user_id: User making the approval
            
        Returns:
            ApprovalWorkflow: Updated workflow
        """
        try:
            logger.info(f"Processing approval for step {step_id} in workflow {workflow_id}")
            
            workflow = await WorkflowService.get_workflow(workflow_id, user_id)
            step = next((s for s in workflow.steps if s.id == step_id), None)
            
            if not step:
                raise WorkflowValidationError(f"Step {step_id} not found in workflow")
            
            if step.status != WorkflowStepStatus.PENDING and step.status != WorkflowStepStatus.IN_PROGRESS:
                raise WorkflowValidationError(f"Step is not pending approval (status: {step.status})")
            
            now = datetime.utcnow()
            
            # Update step
            step.status = WorkflowStepStatus.APPROVED
            step.completed_at = now
            step.completed_by = user_id
            step.action_taken = action_request.action
            step.comments = action_request.comments
            step.updated_at = now
            
            # Save step update
            await WorkflowService._save_workflow(workflow)
            
            # Check if workflow is complete
            if await WorkflowService.check_workflow_completion(workflow_id, user_id):
                workflow.status = WorkflowStatus.COMPLETED
                workflow.completed_at = now
                workflow.updated_at = now
                await WorkflowService._save_workflow(workflow)
                
                # Update quote status to approved
                await WorkflowService._update_quote_status_from_workflow(workflow)
                
                logger.info(f"Workflow {workflow_id} completed successfully")
            else:
                # Assign next step
                await WorkflowService._assign_next_step(workflow)
            
            logger.info(f"Step {step_id} approved successfully")
            return await WorkflowService.get_workflow(workflow_id, user_id)
            
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to approve step: {str(e)}")
            raise StorageError("approve_step", str(e))
    
    @staticmethod
    async def reject_step(workflow_id: str, step_id: str, action_request: WorkflowActionRequest, user_id: str) -> ApprovalWorkflow:
        """
        Handles rejections and stops workflow
        
        Args:
            workflow_id: Workflow containing the step
            step_id: Step to reject
            action_request: Rejection action details
            user_id: User making the rejection
            
        Returns:
            ApprovalWorkflow: Updated workflow
        """
        try:
            logger.info(f"Processing rejection for step {step_id} in workflow {workflow_id}")
            
            workflow = await WorkflowService.get_workflow(workflow_id, user_id)
            step = next((s for s in workflow.steps if s.id == step_id), None)
            
            if not step:
                raise WorkflowValidationError(f"Step {step_id} not found in workflow")
            
            if step.status != WorkflowStepStatus.PENDING and step.status != WorkflowStepStatus.IN_PROGRESS:
                raise WorkflowValidationError(f"Step is not pending approval (status: {step.status})")
            
            if not action_request.rejection_reason:
                raise WorkflowValidationError("Rejection reason is required")
            
            now = datetime.utcnow()
            
            # Update step
            step.status = WorkflowStepStatus.REJECTED
            step.completed_at = now
            step.completed_by = user_id
            step.action_taken = action_request.action
            step.comments = action_request.comments
            step.rejection_reason = action_request.rejection_reason
            step.updated_at = now
            
            # Stop workflow
            workflow.status = WorkflowStatus.FAILED
            workflow.completed_at = now
            workflow.updated_at = now
            
            # Cancel all remaining pending steps
            for remaining_step in workflow.steps:
                if remaining_step.status == WorkflowStepStatus.PENDING:
                    remaining_step.status = WorkflowStepStatus.SKIPPED
                    remaining_step.comments = "Cancelled due to workflow rejection"
                    remaining_step.updated_at = now
            
            await WorkflowService._save_workflow(workflow)
            
            # Update quote status to rejected
            await WorkflowService._update_quote_status_from_workflow(workflow)
            
            logger.info(f"Step {step_id} rejected, workflow {workflow_id} stopped")
            return workflow
            
        except (WorkflowNotFoundError, WorkflowPermissionError, WorkflowValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to reject step: {str(e)}")
            raise StorageError("reject_step", str(e))
    
    @staticmethod
    async def check_workflow_completion(workflow_id: str, user_id: str) -> bool:
        """
        Determines if quote is fully approved based on workflow completion
        
        Args:
            workflow_id: Workflow to check
            user_id: User checking completion
            
        Returns:
            bool: True if workflow is fully approved
        """
        try:
            workflow = await WorkflowService.get_workflow(workflow_id, user_id)
            
            # Check if any step is rejected
            if any(step.status == WorkflowStepStatus.REJECTED for step in workflow.steps):
                return False
            
            # Check completion based on workflow requirements
            if workflow.require_all_approvals:
                # All required steps must be approved or skipped
                required_steps = [step for step in workflow.steps if step.is_required]
                return all(
                    step.status in [WorkflowStepStatus.APPROVED, WorkflowStepStatus.SKIPPED]
                    for step in required_steps
                )
            else:
                # At least one step must be approved
                return any(
                    step.status == WorkflowStepStatus.APPROVED
                    for step in workflow.steps
                )
                
        except Exception as e:
            logger.error(f"Failed to check workflow completion: {str(e)}")
            return False
    
    @staticmethod
    async def get_workflow(workflow_id: str, user_id: str) -> ApprovalWorkflow:
        """Get workflow by ID with permission checking"""
        try:
            workflows_db = await storage.load_data("workflows")
            workflow_steps_db = await storage.load_data("workflow_steps")
            
            workflow_dict = workflows_db.get(workflow_id)
            if not workflow_dict:
                raise WorkflowNotFoundError(workflow_id)
            
            # Check permissions
            if workflow_dict["user_id"] != user_id:
                raise WorkflowPermissionError(user_id, workflow_id)
            
            # Load steps
            steps = []
            for step_id, step_dict in workflow_steps_db.items():
                if step_dict["workflow_id"] == workflow_id:
                    step = WorkflowStep(
                        id=step_dict["id"],
                        workflow_id=step_dict["workflow_id"],
                        name=step_dict["name"],
                        description=step_dict["description"],
                        persona=PersonaType(step_dict["persona"]),
                        order=step_dict["order"],
                        is_required=step_dict["is_required"],
                        auto_approve_threshold=Decimal(step_dict["auto_approve_threshold"]) if step_dict["auto_approve_threshold"] else None,
                        escalation_threshold=Decimal(step_dict["escalation_threshold"]) if step_dict["escalation_threshold"] else None,
                        max_processing_days=step_dict["max_processing_days"],
                        status=WorkflowStepStatus(step_dict["status"]),
                        assigned_user_id=step_dict["assigned_user_id"],
                        assigned_at=datetime.fromisoformat(step_dict["assigned_at"]) if step_dict["assigned_at"] else None,
                        completed_at=datetime.fromisoformat(step_dict["completed_at"]) if step_dict["completed_at"] else None,
                        completed_by=step_dict["completed_by"],
                        action_taken=ApprovalAction(step_dict["action_taken"]) if step_dict["action_taken"] else None,
                        comments=step_dict["comments"],
                        rejection_reason=step_dict["rejection_reason"],
                        created_at=datetime.fromisoformat(step_dict["created_at"]),
                        updated_at=datetime.fromisoformat(step_dict["updated_at"])
                    )
                    steps.append(step)
            
            # Sort steps by order
            steps.sort(key=lambda x: x.order)
            
            # Create workflow
            workflow = ApprovalWorkflow(
                id=workflow_dict["id"],
                user_id=workflow_dict["user_id"],
                name=workflow_dict["name"],
                description=workflow_dict["description"],
                quote_id=workflow_dict["quote_id"],
                status=WorkflowStatus(workflow_dict["status"]),
                is_active=workflow_dict["is_active"],
                trigger_amount=Decimal(workflow_dict["trigger_amount"]) if workflow_dict["trigger_amount"] else None,
                trigger_discount_percent=Decimal(workflow_dict["trigger_discount_percent"]) if workflow_dict["trigger_discount_percent"] else None,
                auto_start=workflow_dict["auto_start"],
                allow_parallel_steps=workflow_dict["allow_parallel_steps"],
                require_all_approvals=workflow_dict["require_all_approvals"],
                steps=steps,
                started_at=datetime.fromisoformat(workflow_dict["started_at"]) if workflow_dict["started_at"] else None,
                completed_at=datetime.fromisoformat(workflow_dict["completed_at"]) if workflow_dict["completed_at"] else None,
                created_at=datetime.fromisoformat(workflow_dict["created_at"]),
                updated_at=datetime.fromisoformat(workflow_dict["updated_at"])
            )
            
            return workflow
            
        except (WorkflowNotFoundError, WorkflowPermissionError):
            raise
        except Exception as e:
            logger.error(f"Failed to get workflow {workflow_id}: {str(e)}")
            raise StorageError("get_workflow", str(e))
    
    # Helper methods
    
    @staticmethod
    def _select_workflow_template(quote: Quote):
        """Select appropriate workflow template based on quote characteristics"""
        # Enterprise deals over $100K get enhanced workflow
        if quote.total_amount >= 100000:
            return ENTERPRISE_DEAL_WORKFLOW
        # Standard deals over $10K get standard workflow  
        elif quote.total_amount >= 10000:
            return STANDARD_DEAL_WORKFLOW
        else:
            # Simple workflow for smaller deals
            return STANDARD_DEAL_WORKFLOW
    
    @staticmethod
    def _calculate_discount_percentage(quote: Quote) -> Optional[Decimal]:
        """Calculate discount percentage if applicable"""
        if hasattr(quote, 'max_discount_percent'):
            return quote.max_discount_percent
        elif hasattr(quote, 'overall_discount_percent'):
            return quote.overall_discount_percent
        return Decimal('0')
    
    @staticmethod
    def _should_auto_approve(step_template: WorkflowStepCreate, quote_amount: Decimal, discount_percent: Optional[Decimal]) -> bool:
        """Determine if step should be auto-approved based on thresholds"""
        if step_template.auto_approve_threshold is None:
            return False
        
        return quote_amount <= step_template.auto_approve_threshold
    
    @staticmethod
    async def _assign_next_step(workflow: ApprovalWorkflow):
        """Assign the next pending step to appropriate user"""
        current_step = workflow.current_step
        if current_step and current_step.status == WorkflowStepStatus.PENDING:
            current_step.status = WorkflowStepStatus.IN_PROGRESS
            current_step.assigned_at = datetime.utcnow()
            current_step.updated_at = datetime.utcnow()
            # In a real system, you'd assign to a specific user based on persona
            # For now, we just mark it as in progress
            await WorkflowService._save_workflow(workflow)
    
    @staticmethod
    async def _save_workflow(workflow: ApprovalWorkflow):
        """Save workflow and steps to storage"""
        workflows_db = await storage.load_data("workflows")
        workflow_steps_db = await storage.load_data("workflow_steps")
        
        # Save workflow
        workflow_dict = await WorkflowService._workflow_to_dict(workflow)
        workflows_db[workflow.id] = workflow_dict
        
        # Save steps
        for step in workflow.steps:
            step_dict = {
                "id": step.id,
                "workflow_id": step.workflow_id,
                "name": step.name,
                "description": step.description,
                "persona": step.persona.value,
                "order": step.order,
                "is_required": step.is_required,
                "auto_approve_threshold": str(step.auto_approve_threshold) if step.auto_approve_threshold else None,
                "escalation_threshold": str(step.escalation_threshold) if step.escalation_threshold else None,
                "max_processing_days": step.max_processing_days,
                "status": step.status.value,
                "assigned_user_id": step.assigned_user_id,
                "assigned_at": step.assigned_at.isoformat() if step.assigned_at else None,
                "completed_at": step.completed_at.isoformat() if step.completed_at else None,
                "completed_by": step.completed_by,
                "action_taken": step.action_taken.value if step.action_taken else None,
                "comments": step.comments,
                "rejection_reason": step.rejection_reason,
                "created_at": step.created_at.isoformat(),
                "updated_at": step.updated_at.isoformat()
            }
            workflow_steps_db[step.id] = step_dict
        
        # Save atomically
        await asyncio.gather(
            storage.save_data("workflows", workflows_db),
            storage.save_data("workflow_steps", workflow_steps_db)
        )
    
    @staticmethod
    async def _workflow_to_dict(workflow: ApprovalWorkflow) -> Dict[str, Any]:
        """Convert workflow to dictionary for storage"""
        return {
            "id": workflow.id,
            "user_id": workflow.user_id,
            "name": workflow.name,
            "description": workflow.description,
            "quote_id": workflow.quote_id,
            "status": workflow.status.value,
            "is_active": workflow.is_active,
            "trigger_amount": str(workflow.trigger_amount) if workflow.trigger_amount else None,
            "trigger_discount_percent": str(workflow.trigger_discount_percent) if workflow.trigger_discount_percent else None,
            "auto_start": workflow.auto_start,
            "allow_parallel_steps": workflow.allow_parallel_steps,
            "require_all_approvals": workflow.require_all_approvals,
            "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
            "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
            "created_at": workflow.created_at.isoformat(),
            "updated_at": workflow.updated_at.isoformat()
        }


# Additional workflow utilities
class WorkflowUtilities:
    """Utility functions for workflow management"""
    
    @staticmethod
    async def get_overdue_workflows(user_id: Optional[str] = None) -> List[ApprovalWorkflow]:
        """Get all workflows with overdue steps"""
        try:
            workflows_db = await storage.load_data("workflows")
            overdue_workflows = []
            
            for workflow_dict in workflows_db.values():
                if user_id and workflow_dict["user_id"] != user_id:
                    continue
                
                try:
                    workflow = await WorkflowService.get_workflow(workflow_dict["id"], workflow_dict["user_id"])
                    if workflow.overdue_steps:
                        overdue_workflows.append(workflow)
                except Exception:
                    continue
            
            return overdue_workflows
            
        except Exception as e:
            logger.error(f"Failed to get overdue workflows: {str(e)}")
            return []
    
    @staticmethod
    async def get_workflows_by_persona(persona: PersonaType, user_id: Optional[str] = None) -> List[Tuple[ApprovalWorkflow, WorkflowStep]]:
        """Get workflows waiting for approval from specific persona"""
        try:
            workflows_db = await storage.load_data("workflows")
            pending_workflows = []
            
            for workflow_dict in workflows_db.values():
                if user_id and workflow_dict["user_id"] != user_id:
                    continue
                
                try:
                    workflow = await WorkflowService.get_workflow(workflow_dict["id"], workflow_dict["user_id"])
                    current_step = workflow.current_step
                    
                    if (current_step and 
                        current_step.persona == persona and 
                        current_step.status in [WorkflowStepStatus.PENDING, WorkflowStepStatus.IN_PROGRESS]):
                        pending_workflows.append((workflow, current_step))
                        
                except Exception:
                    continue
            
            return pending_workflows
            
        except Exception as e:
            logger.error(f"Failed to get workflows by persona: {str(e)}")
            return []
    
    @staticmethod
    async def get_workflow_summary(user_id: str) -> Dict[str, Any]:
        """Get workflow summary statistics for dashboard"""
        try:
            workflows_db = await storage.load_data("workflows")
            
            active_count = 0
            completed_count = 0
            overdue_count = 0
            pending_approvals = 0
            
            for workflow_dict in workflows_db.values():
                if workflow_dict["user_id"] != user_id:
                    continue
                
                try:
                    workflow = await WorkflowService.get_workflow(workflow_dict["id"], user_id)
                    
                    if workflow.status == WorkflowStatus.ACTIVE:
                        active_count += 1
                        if workflow.current_step:
                            pending_approvals += 1
                    elif workflow.status == WorkflowStatus.COMPLETED:
                        completed_count += 1
                    
                    if workflow.overdue_steps:
                        overdue_count += 1
                        
                except Exception:
                    continue
            
            return {
                "active_workflows": active_count,
                "completed_workflows": completed_count,
                "overdue_workflows": overdue_count,
                "pending_approvals": pending_approvals
            }
            
        except Exception as e:
            logger.error(f"Failed to get workflow summary: {str(e)}")
            return {
                "active_workflows": 0,
                "completed_workflows": 0,
                "overdue_workflows": 0,
                "pending_approvals": 0
            }
    
    @staticmethod
    async def _update_quote_status_from_workflow(workflow: ApprovalWorkflow):
        """Update quote status based on workflow completion status"""
        try:
            # Import here to avoid circular import
            from app.services.quote_service import QuoteService
            
            if not workflow.quote_id:
                logger.warning(f"Workflow {workflow.id} has no associated quote")
                return
            
            # Determine new quote status based on workflow status
            if workflow.status == WorkflowStatus.COMPLETED:
                new_status = "approved"
            elif workflow.status == WorkflowStatus.FAILED:
                new_status = "rejected"
            else:
                # Workflow is still active, keep quote as pending
                new_status = "pending"
            
            # Update quote status
            quotes_db = await storage.load_data("quotes")
            quote_dict = quotes_db.get(workflow.quote_id)
            
            if not quote_dict:
                logger.warning(f"Quote {workflow.quote_id} not found for workflow {workflow.id}")
                return
            
            # Only update if status has changed
            if quote_dict["status"] != new_status:
                quote_dict["status"] = new_status
                quote_dict["updated_at"] = datetime.utcnow().isoformat()
                quotes_db[workflow.quote_id] = quote_dict
                
                await storage.save_data("quotes", quotes_db)
                logger.info(f"Updated quote {workflow.quote_id} status to '{new_status}' based on workflow {workflow.id}")
            
        except Exception as e:
            logger.error(f"Failed to update quote status from workflow: {str(e)}")
            # Don't raise exception as this is a side effect - the workflow operation should still succeed