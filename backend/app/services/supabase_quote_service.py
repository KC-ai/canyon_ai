"""
Supabase-based quote service for Canyon AI CPQ
Replaces JSON file storage with Supabase database
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from decimal import Decimal
from app.models.quotes import Quote, QuoteCreate, QuoteUpdate, QuoteItem, QuoteItemCreate
from app.core.supabase_client import get_supabase_client
from app.core.errors import (
    QuoteNotFoundError, 
    QuotePermissionError, 
    QuoteValidationError, 
    StorageError
)
from app.core.logging_config import get_logger

logger = get_logger("supabase_quote_service")

class SupabaseQuoteService:
    """Supabase-based quote service with real-time capabilities"""
    
    @staticmethod
    async def create_quote(quote_data: QuoteCreate, user_id: str) -> Quote:
        """Create a new quote in Supabase"""
        try:
            logger.info(f"Creating quote for user {user_id}", extra={
                "user_id": user_id,
                "quote_title": quote_data.title,
                "item_count": len(quote_data.items)
            })
            
            supabase = get_supabase_client()
            quote_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            # Calculate totals with discounts applied
            subtotal_amount = Decimal('0')
            total_amount = Decimal('0')
            
            for item_data in quote_data.items:
                # Calculate item subtotal (before discount)
                item_subtotal = Decimal(str(item_data.unit_price)) * item_data.quantity
                subtotal_amount += item_subtotal
                
                # Calculate discount
                if item_data.discount_amount and item_data.discount_amount > 0:
                    # Fixed discount amount
                    discount = min(Decimal(str(item_data.discount_amount)), item_subtotal)
                elif item_data.discount_percent and item_data.discount_percent > 0:
                    # Percentage discount
                    discount = item_subtotal * (Decimal(str(item_data.discount_percent)) / Decimal('100'))
                else:
                    discount = Decimal('0')
                
                # Calculate item total (after discount)
                item_total = item_subtotal - discount
                total_amount += item_total
            
            # Create quote in database
            quote_record = {
                "id": quote_id,
                "user_id": user_id,
                "customer_name": quote_data.customer_name,
                "customer_email": quote_data.customer_email,
                "title": quote_data.title,
                "description": quote_data.description,
                "status": quote_data.status or "draft",
                "valid_until": quote_data.valid_until,
                "total_amount": float(total_amount),
                "created_at": now,
                "updated_at": now
            }
            
            result = supabase.table('quotes').insert(quote_record).execute()
            if not result.data:
                raise StorageError("create_quote", "No data returned from insert operation")
            
            # Create quote items
            items = []
            for item_data in quote_data.items:
                item_id = str(uuid.uuid4())
                item_record = {
                    "id": item_id,
                    "quote_id": quote_id,
                    "name": item_data.name,
                    "description": item_data.description,
                    "quantity": item_data.quantity,
                    "unit_price": float(item_data.unit_price),
                    "discount_percent": float(item_data.discount_percent or 0),
                    "discount_amount": float(item_data.discount_amount or 0),
                    "created_at": now,
                    "updated_at": now
                }
                
                item_result = supabase.table('quote_items').insert(item_record).execute()
                if item_result.data:
                    items.append(QuoteItem(**item_result.data[0]))
            
            # Return created quote
            quote = Quote(
                id=quote_id,
                user_id=user_id,
                customer_name=quote_data.customer_name,
                customer_email=quote_data.customer_email,
                title=quote_data.title,
                description=quote_data.description,
                status=quote_data.status or "draft",
                valid_until=quote_data.valid_until,
                items=items,
                subtotal_amount=float(subtotal_amount),
                total_amount=float(total_amount),
                created_at=now,
                updated_at=now
            )
            
            logger.info(f"Quote created successfully: {quote_id}")
            return quote
            
        except Exception as e:
            logger.error(f"Failed to create quote: {e}")
            raise StorageError("create_quote", str(e))
    
    @staticmethod
    async def get_quote(quote_id: str, user_id: str) -> Optional[Quote]:
        """Get a quote by ID"""
        try:
            supabase = get_supabase_client()
            
            # Get quote
            quote_result = supabase.table('quotes').select('*').eq('id', quote_id).eq('user_id', user_id).execute()
            if not quote_result.data:
                return None
            
            quote_data = quote_result.data[0]
            
            # Get quote items
            items_result = supabase.table('quote_items').select('*').eq('quote_id', quote_id).execute()
            items = [QuoteItem(**item) for item in items_result.data] if items_result.data else []
            
            # Create Quote object
            quote = Quote(
                items=items,
                subtotal_amount=quote_data['total_amount'],
                **quote_data
            )
            
            return quote
            
        except Exception as e:
            logger.error(f"Failed to get quote {quote_id}: {e}")
            raise StorageError("get_quote", str(e))
    
    @staticmethod
    async def list_quotes(user_id: str, skip: int = 0, limit: int = 100) -> List[Quote]:
        """List quotes for a user"""
        try:
            supabase = get_supabase_client()
            
            # Get quotes
            quotes_result = supabase.table('quotes').select('*').eq('user_id', user_id).range(skip, skip + limit - 1).order('created_at', desc=True).execute()
            
            quotes = []
            for quote_data in quotes_result.data:
                # Get items for each quote
                items_result = supabase.table('quote_items').select('*').eq('quote_id', quote_data['id']).execute()
                items = [QuoteItem(**item) for item in items_result.data] if items_result.data else []
                
                quote = Quote(
                    items=items,
                    subtotal_amount=quote_data['total_amount'],
                    **quote_data
                )
                quotes.append(quote)
            
            return quotes
            
        except Exception as e:
            logger.error(f"Failed to list quotes for user {user_id}: {e}")
            raise StorageError("list_quotes", str(e))
    
    @staticmethod
    async def update_quote(quote_id: str, quote_data: QuoteUpdate, user_id: str) -> Optional[Quote]:
        """Update a quote"""
        try:
            supabase = get_supabase_client()
            
            # Check if quote exists and user has permission
            existing = await SupabaseQuoteService.get_quote(quote_id, user_id)
            if not existing:
                raise QuoteNotFoundError(f"Quote {quote_id} not found")
            
            # Update quote
            update_data = {
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Only update provided fields
            if quote_data.customer_name is not None:
                update_data["customer_name"] = quote_data.customer_name
            if quote_data.customer_email is not None:
                update_data["customer_email"] = quote_data.customer_email
            if quote_data.title is not None:
                update_data["title"] = quote_data.title
            if quote_data.description is not None:
                update_data["description"] = quote_data.description
            if quote_data.status is not None:
                update_data["status"] = quote_data.status
            if quote_data.valid_until is not None:
                update_data["valid_until"] = quote_data.valid_until
            
            result = supabase.table('quotes').update(update_data).eq('id', quote_id).eq('user_id', user_id).execute()
            
            if not result.data:
                raise StorageError("update_quote", "No data returned from update operation")
            
            # Return updated quote
            return await SupabaseQuoteService.get_quote(quote_id, user_id)
            
        except Exception as e:
            logger.error(f"Failed to update quote {quote_id}: {e}")
            raise StorageError("update_quote", str(e))
    
    @staticmethod
    async def delete_quote(quote_id: str, user_id: str) -> bool:
        """Delete a quote and its items"""
        try:
            supabase = get_supabase_client()
            
            # Check if quote exists and user has permission
            existing = await SupabaseQuoteService.get_quote(quote_id, user_id)
            if not existing:
                raise QuoteNotFoundError(f"Quote {quote_id} not found")
            
            # Delete quote (items will be deleted automatically due to CASCADE)
            result = supabase.table('quotes').delete().eq('id', quote_id).eq('user_id', user_id).execute()
            
            logger.info(f"Quote deleted successfully: {quote_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete quote {quote_id}: {e}")
            raise StorageError("delete_quote", str(e))
    
    @staticmethod
    async def get_quote_count(user_id: str) -> int:
        """Get total quote count for a user"""
        try:
            supabase = get_supabase_client()
            result = supabase.table('quotes').select('count').eq('user_id', user_id).execute()
            return len(result.data) if result.data else 0
            
        except Exception as e:
            logger.error(f"Failed to get quote count for user {user_id}: {e}")
            return 0
    
    @staticmethod
    async def create_quote_with_workflow(quote_data: QuoteCreate, workflow_config: Optional[Dict[str, Any]], user_id: str) -> Quote:
        """Create a new quote with custom workflow"""
        try:
            logger.info(f"Creating quote with workflow for user {user_id}", extra={
                "user_id": user_id,
                "quote_title": quote_data.title,
                "has_workflow": workflow_config is not None
            })
            
            # First create the quote
            quote = await SupabaseQuoteService.create_quote(quote_data, user_id)
            
            # Create workflow if config provided
            if workflow_config:
                workflow_id = await SupabaseQuoteService._create_workflow(quote.id, workflow_config, user_id)
                # Update quote with workflow_id
                await SupabaseQuoteService._update_quote_workflow_id(quote.id, workflow_id, user_id)
                quote.workflow_id = workflow_id
                logger.info(f"Workflow created and linked: {workflow_id}")
            
            logger.info(f"Quote with workflow created successfully: {quote.id}")
            return quote
            
        except Exception as e:
            logger.error(f"Failed to create quote with workflow: {e}")
            raise StorageError("create_quote_with_workflow", str(e))
    
    @staticmethod
    async def _create_workflow(quote_id: str, workflow_config: Dict[str, Any], user_id: str) -> str:
        """Create a workflow for a quote"""
        supabase = get_supabase_client()
        workflow_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # Create default approval workflow if none specified
        workflow_name = workflow_config.get("name", "Standard Approval Workflow")
        workflow_description = workflow_config.get("description", "Default approval workflow")
        
        # Create workflow record
        workflow_record = {
            "id": workflow_id,
            "user_id": user_id,
            "quote_id": quote_id,
            "name": workflow_name,
            "description": workflow_description,
            "status": "draft",
            "is_active": True,
            "auto_start": workflow_config.get("auto_start", True),
            "allow_parallel_steps": workflow_config.get("allow_parallel_steps", False),
            "require_all_approvals": workflow_config.get("require_all_approvals", True),
            "created_at": now,
            "updated_at": now
        }
        
        result = supabase.table('workflows').insert(workflow_record).execute()
        if not result.data:
            raise StorageError("create_workflow", "Failed to create workflow record")
        
        # Create default workflow steps
        await SupabaseQuoteService._create_default_workflow_steps(workflow_id, workflow_config)
        
        return workflow_id
    
    @staticmethod
    async def _create_default_workflow_steps(workflow_id: str, workflow_config: Dict[str, Any]):
        """Create default workflow steps"""
        supabase = get_supabase_client()
        now = datetime.utcnow().isoformat()
        
        # Default approval workflow steps
        default_steps = [
            {"name": "AE Review", "persona": "ae", "order": 1, "description": "Account Executive review"},
            {"name": "Deal Desk Approval", "persona": "deal_desk", "order": 2, "description": "Deal desk approval for standard discounts"},
            {"name": "CRO Approval", "persona": "cro", "order": 3, "description": "CRO approval for large discounts"},
            {"name": "Legal Review", "persona": "legal", "order": 4, "description": "Legal review for contract terms"},
            {"name": "Finance Approval", "persona": "finance", "order": 5, "description": "Finance approval for payment terms"}
        ]
        
        # Use custom steps if provided, otherwise use defaults
        steps = workflow_config.get("steps", default_steps)
        
        for step_data in steps:
            step_id = str(uuid.uuid4())
            step_record = {
                "id": step_id,
                "workflow_id": workflow_id,
                "name": step_data["name"],
                "description": step_data.get("description", ""),
                "persona": step_data["persona"],
                "order": step_data["order"],
                "is_required": step_data.get("is_required", True),
                "status": "pending",
                "created_at": now,
                "updated_at": now
            }
            
            supabase.table('workflow_steps').insert(step_record).execute()
    
    @staticmethod
    async def _update_quote_workflow_id(quote_id: str, workflow_id: str, user_id: str):
        """Update quote with workflow ID"""
        supabase = get_supabase_client()
        result = supabase.table('quotes').update({
            "workflow_id": workflow_id,
            "updated_at": datetime.utcnow().isoformat()
        }).eq('id', quote_id).eq('user_id', user_id).execute()
        
        if not result.data:
            raise StorageError("update_quote_workflow", "Failed to link workflow to quote")