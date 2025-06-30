from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_supabase_client
from app.models.workflows import (
    WorkflowStep, WorkflowStepCreate, WorkflowStatus,
    StepApproval, StepRejection, PersonaType, StepStatus
)
from app.models.quotes import Quote, QuoteStatus
from app.core.logging_config import get_logger

logger = get_logger("workflow_service")

class WorkflowService:
    def __init__(self):
        self.client = get_supabase_client()
    
    async def create_workflow(self, quote: Quote) -> List[WorkflowStep]:
        """Create workflow steps based on discount rules"""
        try:
            steps = []
            order = 1
            
            # AE step (auto-approved)
            ae_step = {
                'quote_id': str(quote.id),
                'persona': 'ae',
                'step_order': order,
                'status': 'approved',
                'auto_approved': True,
                'approved_at': datetime.utcnow().isoformat(),
                'approved_by': str(quote.user_id)
            }
            steps.append(ae_step)
            order += 1
            
            # Discount-based approvers
            discount = float(quote.discount_percent)
            
            # Deal Desk always required
            steps.append({
                'quote_id': str(quote.id),
                'persona': 'deal_desk',
                'step_order': order,
                'status': 'pending',
                'auto_approved': False
            })
            order += 1
            
            # CRO for 15-40% discount
            if 15 < discount <= 40:
                steps.append({
                    'quote_id': str(quote.id),
                    'persona': 'cro',
                    'step_order': order,
                    'status': 'pending',
                    'auto_approved': False
                })
                order += 1
            
            # CRO and Finance for >40% discount
            elif discount > 40:
                steps.append({
                    'quote_id': str(quote.id),
                    'persona': 'cro',
                    'step_order': order,
                    'status': 'pending',
                    'auto_approved': False
                })
                order += 1
                
                steps.append({
                    'quote_id': str(quote.id),
                    'persona': 'finance',
                    'step_order': order,
                    'status': 'pending',
                    'auto_approved': False
                })
                order += 1
            
            # Legal always required
            steps.append({
                'quote_id': str(quote.id),
                'persona': 'legal',
                'step_order': order,
                'status': 'pending',
                'auto_approved': False
            })
            order += 1
            
            # Customer delivery (final step)
            steps.append({
                'quote_id': str(quote.id),
                'persona': 'customer',
                'step_order': order,
                'status': 'pending',
                'auto_approved': False
            })
            
            # Insert all steps
            response = self.client.table('workflow_steps').insert(steps).execute()
            if not response.data:
                raise Exception("Failed to create workflow steps")
                
            return [WorkflowStep(**step) for step in response.data]
            
        except Exception as e:
            logger.error(f"Failed to create workflow: {str(e)}")
            raise
    
    async def can_user_approve(self, step_id: str, user_persona: str) -> bool:
        """Check if user can approve the step (sequential validation)"""
        try:
            logger.info(f"Checking approval permission for step {step_id}, user persona: {user_persona}")
            
            # Get the step - handle case where step doesn't exist
            step_response = self.client.table('workflow_steps')\
                .select('*')\
                .eq('id', step_id)\
                .execute()
            
            if not step_response.data or len(step_response.data) == 0:
                logger.warning(f"Workflow step {step_id} not found")
                return False
                
            step = WorkflowStep(**step_response.data[0])
            logger.info(f"Step details: persona={step.persona}, status={step.status}, order={step.step_order}")
            
            # Check persona matches
            if step.persona != user_persona:
                logger.warning(f"Persona mismatch: step requires {step.persona}, user is {user_persona}")
                return False
            
            # Check if step is pending
            if step.status != 'pending':
                logger.warning(f"Step is not pending, current status: {step.status}")
                return False
            
            # Get all previous steps for this quote
            previous_steps = self.client.table('workflow_steps')\
                .select('*')\
                .eq('quote_id', str(step.quote_id))\
                .lt('step_order', step.step_order)\
                .execute()
            
            # All previous steps must be approved
            for prev_step in previous_steps.data:
                if prev_step['status'] != 'approved':
                    logger.warning(f"Previous step not approved: persona={prev_step['persona']}, status={prev_step['status']}")
                    return False
            
            logger.info(f"User {user_persona} can approve step {step_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to check approval permission: {str(e)}")
            raise Exception(f"Failed to check approval permission: {str(e)}")
    
    async def approve_step(self, step_id: str, user_id: str, comments: Optional[str] = None):
        """Approve a workflow step"""
        try:
            logger.info(f"Approving step {step_id} by user {user_id}")
            
            # Update step
            update_result = self.client.table('workflow_steps').update({
                'status': 'approved',
                'approved_at': datetime.utcnow().isoformat(),
                'approved_by': user_id,
                'comments': comments
            }).eq('id', step_id).execute()
            
            logger.info(f"Step update result: {update_result.data}")
            
            # Get step details to check workflow completion
            step_response = self.client.table('workflow_steps')\
                .select('*')\
                .eq('id', step_id)\
                .single()\
                .execute()
            
            if step_response.data:
                step = WorkflowStep(**step_response.data)
                logger.info(f"Approved step details: persona={step.persona}, quote_id={step.quote_id}")
                
                # Check if this completes internal approval
                await self._check_workflow_completion(str(step.quote_id))
                
                # Update quote status to next pending step
                await self._update_quote_status_to_next_step(str(step.quote_id))
                
        except Exception as e:
            logger.error(f"Failed to approve step {step_id}: {str(e)}")
            raise
    
    async def reject_step(self, step_id: str, user_id: str, reason: str):
        """Reject a workflow step"""
        try:
            # Update step
            self.client.table('workflow_steps').update({
                'status': 'rejected',
                'approved_at': datetime.utcnow().isoformat(),
                'approved_by': user_id,
                'comments': reason
            }).eq('id', step_id).execute()
            
            # Get step details
            step_response = self.client.table('workflow_steps')\
                .select('*')\
                .eq('id', step_id)\
                .single()\
                .execute()
            
            if step_response.data:
                step = WorkflowStep(**step_response.data)
                
                # Update quote status to rejected
                self.client.table('quotes').update({
                    'status': QuoteStatus.REJECTED
                }).eq('id', str(step.quote_id)).execute()
                
                # Skip all subsequent steps
                self.client.table('workflow_steps').update({
                    'status': 'skipped'
                }).eq('quote_id', str(step.quote_id)).gt('step_order', step.step_order).execute()
                
        except Exception as e:
            logger.error(f"Failed to reject step {step_id}: {str(e)}")
            raise
    
    async def get_workflow_status(self, quote_id: str, user_persona: str) -> WorkflowStatus:
        """Get workflow status for a quote"""
        try:
            # Get all steps
            steps_response = self.client.table('workflow_steps')\
                .select('*')\
                .eq('quote_id', quote_id)\
                .order('step_order')\
                .execute()
            
            if not steps_response.data:
                raise Exception(f"No workflow found for quote {quote_id}")
            
            steps = [WorkflowStep(**s) for s in steps_response.data]
            
            # Find current step
            current_step = None
            can_approve = False
            
            for step in steps:
                if step.status == 'pending':
                    current_step = step
                    # Check if this user can approve the current step
                    if step.persona == user_persona:
                        can_approve = await self.can_user_approve(str(step.id), user_persona)
                    break
            
            # Check if workflow is complete
            is_complete = all(s.status in ['approved', 'skipped'] for s in steps)
            
            return WorkflowStatus(
                quote_id=UUID(quote_id),
                current_step=current_step,
                steps=steps,
                can_approve=can_approve,
                is_complete=is_complete
            )
            
        except Exception as e:
            logger.error(f"Failed to get workflow status: {str(e)}")
            raise
    
    async def get_step(self, step_id: str) -> WorkflowStep:
        """Get a single workflow step"""
        try:
            response = self.client.table('workflow_steps')\
                .select('*')\
                .eq('id', step_id)\
                .single()\
                .execute()
            
            if not response.data:
                raise Exception(f"Step {step_id} not found")
                
            return WorkflowStep(**response.data)
            
        except Exception as e:
            logger.error(f"Failed to get step {step_id}: {str(e)}")
            raise
    
    async def cancel_pending_steps(self, quote_id: str):
        """Cancel all pending workflow steps for a quote"""
        try:
            self.client.table('workflow_steps').update({
                'status': 'skipped'
            }).eq('quote_id', quote_id).eq('status', 'pending').execute()
            
        except Exception as e:
            logger.error(f"Failed to cancel pending steps: {str(e)}")
            raise
    
    async def reset_workflow(self, quote_id: str):
        """Reset workflow by deleting all steps"""
        try:
            self.client.table('workflow_steps').delete().eq('quote_id', quote_id).execute()
            
        except Exception as e:
            logger.error(f"Failed to reset workflow: {str(e)}")
            raise
    
    async def _check_workflow_completion(self, quote_id: str):
        """Check if all internal steps are complete and auto-approve customer"""
        try:
            steps = self.client.table('workflow_steps')\
                .select('*')\
                .eq('quote_id', quote_id)\
                .order('step_order')\
                .execute()
            
            steps_list = [WorkflowStep(**s) for s in steps.data]
            
            # Find customer step
            customer_step = next((s for s in steps_list if s.persona == 'customer'), None)
            if not customer_step:
                return
            
            # Check if all non-customer steps are approved
            internal_steps = [s for s in steps_list if s.persona != 'customer']
            all_approved = all(s.status == 'approved' for s in internal_steps)
            
            if all_approved and customer_step.status == 'pending':
                logger.info(f"All internal approvals complete for quote {quote_id}. Auto-approving customer step.")
                
                # Auto-approve customer step
                self.client.table('workflow_steps').update({
                    'status': 'approved',
                    'auto_approved': True,
                    'approved_at': datetime.utcnow().isoformat(),
                    'comments': 'Automatically approved - quote sent to customer'
                }).eq('id', str(customer_step.id)).execute()
                
                # Update quote to approved
                self.client.table('quotes').update({
                    'status': QuoteStatus.APPROVED
                }).eq('id', quote_id).execute()
                
                logger.info(f"Quote {quote_id} has been approved and sent to customer.")
                
        except Exception as e:
            logger.error(f"Failed to check workflow completion: {str(e)}")
    
    async def _update_quote_status_to_next_step(self, quote_id: str):
        """Update quote status based on next pending step"""
        try:
            next_pending = self.client.table('workflow_steps')\
                .select('*')\
                .eq('quote_id', quote_id)\
                .eq('status', 'pending')\
                .order('step_order')\
                .limit(1)\
                .execute()
            
            if next_pending.data:
                next_step = WorkflowStep(**next_pending.data[0])
                logger.info(f"Next pending step for quote {quote_id}: persona={next_step.persona}")
                
                # Don't update status for customer step (handled by auto-approval)
                if next_step.persona != 'customer':
                    new_status = f"pending_{next_step.persona}"
                    logger.info(f"Updating quote {quote_id} status to: {new_status}")
                    
                    update_result = self.client.table('quotes').update({
                        'status': new_status
                    }).eq('id', quote_id).execute()
                    
                    logger.info(f"Quote status update result: {update_result.data}")
            else:
                logger.info(f"No pending steps found for quote {quote_id}")
                    
        except Exception as e:
            logger.error(f"Failed to update quote status: {str(e)}")