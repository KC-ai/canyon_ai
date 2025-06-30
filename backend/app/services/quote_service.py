from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.core.database import get_supabase_client
from app.models.quotes import (
    Quote, QuoteCreate, QuoteUpdate, QuoteItem, QuoteItemCreate,
    QuoteStatus, QuoteTerminate, QuoteWithWorkflow
)
from app.models.workflows import WorkflowStep
from app.services.workflow_service import WorkflowService
from app.core.logging_config import get_logger

logger = get_logger("quote_service")

class QuoteService:
    def __init__(self):
        self.client = get_supabase_client()
        self.workflow_service = WorkflowService()
    
    async def create_quote(self, user_id: str, quote_data: QuoteCreate) -> Quote:
        """Create a new quote with items"""
        try:
            # Create quote
            quote_dict = quote_data.model_dump(exclude={'items'})
            quote_dict['user_id'] = user_id
            quote_dict['status'] = QuoteStatus.DRAFT
            
            # Convert Decimal to float for JSON serialization
            if 'discount_percent' in quote_dict:
                quote_dict['discount_percent'] = float(quote_dict['discount_percent'])
            
            response = self.client.table('quotes').insert(quote_dict).execute()
            if not response.data:
                raise Exception("Failed to create quote")
            
            quote = Quote(**response.data[0])
            
            # Create items
            if quote_data.items:
                items_data = []
                for item in quote_data.items:
                    item_dict = item.model_dump()
                    # Convert Decimal fields to float
                    item_dict['unit_price'] = float(item_dict['unit_price'])
                    item_dict['discount_percent'] = float(item_dict['discount_percent'])
                    # Don't include total_price - it's a generated column in Supabase
                    item_dict['quote_id'] = str(quote.id)
                    items_data.append(item_dict)
                
                items_response = self.client.table('quote_items').insert(items_data).execute()
                if items_response.data:
                    quote.items = [QuoteItem(**item) for item in items_response.data]
            
            # Calculate total
            await self.calculate_quote_total(str(quote.id))
            
            # Return fresh quote with calculated total
            return await self.get_quote(str(quote.id))
            
        except Exception as e:
            logger.error(f"Failed to create quote: {str(e)}")
            raise
    
    async def get_quote(self, quote_id: str) -> Quote:
        """Get a quote by ID with items"""
        try:
            # Get quote
            response = self.client.table('quotes')\
                .select('*')\
                .eq('id', quote_id)\
                .single()\
                .execute()
            
            if not response.data:
                raise Exception(f"Quote {quote_id} not found")
                
            # Get items
            items_response = self.client.table('quote_items')\
                .select('*')\
                .eq('quote_id', quote_id)\
                .execute()
            
            # Construct quote with items
            quote_data = response.data
            quote_data['items'] = items_response.data if items_response.data else []
            
            return Quote(**quote_data)
            
        except Exception as e:
            logger.error(f"Failed to get quote {quote_id}: {str(e)}")
            raise
    
    async def get_quotes_for_user(self, user_id: str, persona: str) -> List[Quote]:
        """Get quotes based on user's persona"""
        try:
            if persona == 'ae':
                # AE sees their own quotes
                response = self.client.table('quotes')\
                    .select('*')\
                    .eq('user_id', user_id)\
                    .order('created_at', desc=True)\
                    .execute()
            else:
                # Approvers see quotes pending their approval
                pending_status = f"pending_{persona}"
                response = self.client.table('quotes')\
                    .select('*')\
                    .eq('status', pending_status)\
                    .order('created_at', desc=True)\
                    .execute()
            
            quotes = []
            for quote_data in response.data:
                # Get items for each quote
                items_response = self.client.table('quote_items')\
                    .select('*')\
                    .eq('quote_id', quote_data['id'])\
                    .execute()
                
                quote_data['items'] = items_response.data if items_response.data else []
                quotes.append(Quote(**quote_data))
            
            return quotes
            
        except Exception as e:
            logger.error(f"Failed to get quotes for user {user_id}: {str(e)}")
            raise
    
    async def get_quotes_with_workflow_for_user(self, user_id: str, persona: str) -> List[QuoteWithWorkflow]:
        """Get quotes with workflow steps based on user's persona"""
        try:
            if persona == 'ae':
                # AEs see ALL quotes in the system
                response = self.client.table('quotes')\
                    .select('*')\
                    .order('created_at', desc=True)\
                    .execute()
            else:
                # For non-AE personas, get ALL quotes they're involved in
                # First get all quotes with workflow steps for this persona
                workflow_response = self.client.table('workflow_steps')\
                    .select('quote_id')\
                    .eq('persona', persona)\
                    .execute()
                
                if not workflow_response.data:
                    return []
                
                # Get unique quote IDs
                quote_ids = list(set(step['quote_id'] for step in workflow_response.data))
                
                # Get all these quotes
                response = self.client.table('quotes')\
                    .select('*')\
                    .in_('id', quote_ids)\
                    .order('created_at', desc=True)\
                    .execute()
            
            # Get all quote IDs
            quote_ids = [q['id'] for q in response.data]
            
            # If no quotes, return empty list
            if not quote_ids:
                return []
            
            # Batch fetch all items for all quotes
            all_items_response = self.client.table('quote_items')\
                .select('*')\
                .in_('quote_id', quote_ids)\
                .execute()
            
            # Group items by quote_id
            items_by_quote = {}
            for item in (all_items_response.data or []):
                quote_id = item['quote_id']
                if quote_id not in items_by_quote:
                    items_by_quote[quote_id] = []
                items_by_quote[quote_id].append(item)
            
            # Batch fetch all workflow steps
            all_steps_response = self.client.table('workflow_steps')\
                .select('*')\
                .in_('quote_id', quote_ids)\
                .order('step_order')\
                .execute()
            
            # Group steps by quote_id
            steps_by_quote = {}
            for step in (all_steps_response.data or []):
                quote_id = step['quote_id']
                if quote_id not in steps_by_quote:
                    steps_by_quote[quote_id] = []
                steps_by_quote[quote_id].append(step)
            
            # Get unique user IDs and batch fetch user emails
            user_ids = list(set(q['user_id'] for q in response.data if q.get('user_id')))
            users_response = self.client.table('users')\
                .select('id, email')\
                .in_('id', user_ids)\
                .execute()
            
            # Create user email lookup
            user_emails = {u['id']: u['email'] for u in (users_response.data or [])}
            
            quotes = []
            for quote_data in response.data:
                quote_id = quote_data['id']
                
                # Add items
                quote_data['items'] = items_by_quote.get(quote_id, [])
                
                # Add owner name
                if quote_data.get('user_id') and quote_data['user_id'] in user_emails:
                    email = user_emails[quote_data['user_id']]
                    quote_data['owner'] = email.split('@')[0] if email else 'Unknown'
                
                # Add workflow steps
                quote_data['workflow_steps'] = steps_by_quote.get(quote_id, [])
                
                # Find current step and set current_stage
                current_step = None
                current_stage = None
                for step in quote_data['workflow_steps']:
                    if step['status'] == 'pending':
                        try:
                            current_step = WorkflowStep(**step)
                            current_stage = step['persona']
                        except Exception as e:
                            logger.warning(f"Failed to parse workflow step: {e}")
                        break
                
                quote_data['current_step'] = current_step
                
                # Add current_stage to quote data for frontend filtering
                if current_stage and quote_data['status'].startswith('pending_'):
                    quote_data['current_stage'] = current_stage
                
                quotes.append(QuoteWithWorkflow(**quote_data))
            
            return quotes
            
        except Exception as e:
            logger.error(f"Failed to get quotes with workflow for user {user_id}: {str(e)}")
            raise
    
    async def submit_quote(self, quote_id: str, user_id: str) -> Quote:
        """Submit quote for approval and create workflow"""
        try:
            quote = await self.get_quote(quote_id)
            
            if str(quote.user_id) != user_id:
                raise Exception("You can only submit your own quotes")
            
            if quote.status not in [QuoteStatus.DRAFT, QuoteStatus.DRAFT_REOPENED]:
                raise ValueError("Can only submit draft quotes")
            
            # Check if workflow steps already exist (including draft configurations)
            existing_steps_response = self.client.table('workflow_steps')\
                .select('*')\
                .eq('quote_id', quote_id)\
                .order('step_order')\
                .execute()
            
            if existing_steps_response.data:
                # Use existing workflow steps (user-edited or previously created)
                logger.info(f"Using existing workflow steps for quote {quote_id}")
                workflow_steps = existing_steps_response.data
                
                # Ensure AE step exists and auto-approve it
                ae_step = next((s for s in workflow_steps if s['persona'] == 'ae'), None)
                if ae_step:
                    # Auto-approve AE step
                    self.client.table('workflow_steps').update({
                        'status': 'approved',
                        'approved_at': datetime.utcnow().isoformat(),
                        'approved_by': user_id,
                        'auto_approved': True
                    }).eq('id', ae_step['id']).execute()
                else:
                    # Add missing AE step at the beginning
                    ae_step_data = {
                        'quote_id': quote_id,
                        'persona': 'ae',
                        'step_order': 0,
                        'status': 'approved',
                        'auto_approved': True,
                        'approved_at': datetime.utcnow().isoformat(),
                        'approved_by': user_id
                    }
                    # Update existing steps order
                    for step in workflow_steps:
                        step['step_order'] = step['step_order'] + 1
                        self.client.table('workflow_steps').update({
                            'step_order': step['step_order']
                        }).eq('id', step['id']).execute()
                    
                    # Insert AE step
                    ae_response = self.client.table('workflow_steps').insert(ae_step_data).execute()
                    if ae_response.data:
                        workflow_steps.insert(0, ae_response.data[0])
                
                # Find first pending step after AE
                first_pending = next((s for s in workflow_steps if s['status'] == 'pending' and s['persona'] != 'ae'), None)
            else:
                # Create workflow based on discount (no user customization)
                workflow_steps_objects = await self.workflow_service.create_workflow(quote)
                # Convert objects to dicts for consistent handling
                workflow_steps = []
                for step in workflow_steps_objects:
                    if hasattr(step, '__dict__'):
                        step_dict = step.__dict__.copy()
                        # Ensure required fields are present
                        if 'persona' not in step_dict and hasattr(step, 'persona'):
                            step_dict['persona'] = step.persona
                        if 'status' not in step_dict and hasattr(step, 'status'):
                            step_dict['status'] = step.status
                        workflow_steps.append(step_dict)
                    else:
                        workflow_steps.append(step)
                first_pending = next((s for s in workflow_steps if s.get('status') == 'pending'), None)
            
            # Update quote status to first pending step
            if first_pending:
                # first_pending is always a dict from database query
                persona = first_pending.get('persona', 'deal_desk')
                new_status = f"pending_{persona}"
            else:
                new_status = 'pending_deal_desk'  # Default fallback
            
            self.client.table('quotes').update({
                'status': new_status
            }).eq('id', quote_id).execute()
            
            # Record action
            await self._record_action(
                quote_id, 'submit', user_id,
                from_status=quote.status, to_status=new_status
            )
            
            return await self.get_quote(quote_id)
            
        except Exception as e:
            logger.error(f"Failed to submit quote {quote_id}: {str(e)}")
            raise
    
    async def terminate_quote(self, quote_id: str, user_id: str, reason: str) -> Quote:
        """Terminate a quote with reason"""
        try:
            quote = await self.get_quote(quote_id)
            
            if str(quote.user_id) != user_id:
                raise Exception("You can only terminate your own quotes")
            
            if quote.status in [QuoteStatus.APPROVED, QuoteStatus.TERMINATED]:
                raise ValueError("Cannot terminate approved or already terminated quotes")
            
            # Update quote
            self.client.table('quotes').update({
                'status': QuoteStatus.TERMINATED,
                'terminated_at': datetime.utcnow().isoformat(),
                'termination_reason': reason,
                'terminated_by': user_id
            }).eq('id', quote_id).execute()
            
            # Cancel all pending workflow steps
            await self.workflow_service.cancel_pending_steps(quote_id)
            
            # Record action
            await self._record_action(
                quote_id, 'terminate', user_id,
                comments=reason,
                from_status=quote.status,
                to_status=QuoteStatus.TERMINATED
            )
            
            return await self.get_quote(quote_id)
            
        except Exception as e:
            logger.error(f"Failed to terminate quote {quote_id}: {str(e)}")
            raise
    
    async def reopen_quote(self, quote_id: str, user_id: str) -> Quote:
        """Reopen rejected quote back to draft"""
        try:
            quote = await self.get_quote(quote_id)
            
            # AEs can reopen any rejected quote
            # (The API already checks that only AEs can call this)
            
            if quote.status != QuoteStatus.REJECTED:
                raise ValueError("Can only reopen rejected quotes")
            
            # Reset workflow
            await self.workflow_service.reset_workflow(quote_id)
            
            # Update status
            self.client.table('quotes').update({
                'status': QuoteStatus.DRAFT_REOPENED
            }).eq('id', quote_id).execute()
            
            # Record action
            await self._record_action(
                quote_id, 'reopen', user_id,
                from_status=quote.status,
                to_status=QuoteStatus.DRAFT_REOPENED
            )
            
            return await self.get_quote(quote_id)
            
        except Exception as e:
            logger.error(f"Failed to reopen quote {quote_id}: {str(e)}")
            raise
    
    async def update_quote(self, quote_id: str, user_id: str, quote_update: QuoteUpdate) -> Quote:
        """Update a quote"""
        try:
            quote = await self.get_quote(quote_id)
            
            if str(quote.user_id) != user_id:
                raise Exception("You can only update your own quotes")
            
            if quote.status not in [QuoteStatus.DRAFT, QuoteStatus.DRAFT_REOPENED]:
                raise ValueError("Can only update draft quotes")
            
            # Update quote
            update_data = quote_update.model_dump(exclude_unset=True)
            if update_data:
                # Convert any Decimal fields to float for JSON serialization
                for key, value in update_data.items():
                    if isinstance(value, Decimal):
                        update_data[key] = float(value)
                
                update_data['updated_at'] = datetime.utcnow().isoformat()
                self.client.table('quotes').update(update_data).eq('id', quote_id).execute()
            
            return await self.get_quote(quote_id)
            
        except Exception as e:
            logger.error(f"Failed to update quote {quote_id}: {str(e)}")
            raise
    
    async def get_quote_with_workflow(self, quote_id: str) -> QuoteWithWorkflow:
        """Get quote with workflow information"""
        try:
            quote = await self.get_quote(quote_id)
            
            # Get workflow steps
            steps_response = self.client.table('workflow_steps')\
                .select('*')\
                .eq('quote_id', quote_id)\
                .order('step_order')\
                .execute()
            
            workflow_steps = steps_response.data if steps_response.data else []
            
            # Find current step
            current_step = None
            for step in workflow_steps:
                if step['status'] == 'pending':
                    current_step = step
                    break
            
            # Create QuoteWithWorkflow
            quote_dict = quote.model_dump()
            quote_dict['workflow_steps'] = workflow_steps
            quote_dict['current_step'] = current_step
            
            return QuoteWithWorkflow(**quote_dict)
            
        except Exception as e:
            logger.error(f"Failed to get quote with workflow {quote_id}: {str(e)}")
            raise
    
    async def calculate_quote_total(self, quote_id: str) -> Decimal:
        """Calculate and update quote total"""
        try:
            items_response = self.client.table('quote_items')\
                .select('total_price')\
                .eq('quote_id', quote_id)\
                .execute()
            
            total = sum(Decimal(str(item['total_price'])) for item in items_response.data)
            
            self.client.table('quotes').update({
                'total_amount': float(total)
            }).eq('id', quote_id).execute()
            
            return total
            
        except Exception as e:
            logger.error(f"Failed to calculate quote total {quote_id}: {str(e)}")
            raise
    
    async def delete_quote(self, quote_id: str) -> None:
        """Delete a quote and all related data"""
        try:
            # Delete in order to respect foreign key constraints
            # 1. Delete workflow steps
            self.client.table('workflow_steps').delete().eq('quote_id', quote_id).execute()
            
            # 2. Delete quote items
            self.client.table('quote_items').delete().eq('quote_id', quote_id).execute()
            
            # 3. Delete quote actions (if table exists)
            try:
                self.client.table('quote_actions').delete().eq('quote_id', quote_id).execute()
            except:
                pass  # Table might not exist
            
            # 4. Delete the quote itself
            self.client.table('quotes').delete().eq('id', quote_id).execute()
            
            logger.info(f"Successfully deleted quote {quote_id}")
            
        except Exception as e:
            logger.error(f"Failed to delete quote {quote_id}: {str(e)}")
            raise
    
    async def _record_action(self, quote_id: str, action: str, user_id: str, **kwargs):
        """Record quote action for audit trail"""
        try:
            # Try to record action, but don't fail if table doesn't exist or schema is wrong
            action_data = {
                'quote_id': quote_id,
                'action_type': action,  # Use action_type instead of action
                'performed_by': user_id,
                'performed_at': datetime.utcnow().isoformat(),
                **kwargs
            }
            self.client.table('quote_actions').insert(action_data).execute()
            
        except Exception as e:
            logger.warning(f"Failed to record action for quote {quote_id}: {str(e)}")
            # Don't fail the main operation if audit logging fails