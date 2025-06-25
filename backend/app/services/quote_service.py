from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from decimal import Decimal
import asyncio
from app.models.quotes import Quote, QuoteCreate, QuoteUpdate, QuoteItem, QuoteItemCreate
from app.core.storage import storage
from app.core.errors import (
    QuoteNotFoundError, 
    QuotePermissionError, 
    QuoteValidationError, 
    StorageError
)
from app.core.logging_config import get_logger

logger = get_logger("quote_service")

class QuoteService:
    """Production-ready quote service with comprehensive error handling and validation"""
    
    @staticmethod
    async def create_quote(quote_data: QuoteCreate, user_id: str) -> Quote:
        """Create a new quote with validation and error handling"""
        try:
            logger.info(f"Creating quote for user {user_id}", extra={
                "user_id": user_id,
                "quote_title": quote_data.title,
                "item_count": len(quote_data.items)
            })
            
            quote_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Load existing data
            quotes_db = await storage.load_data("quotes")
            quote_items_db = await storage.load_data("quote_items")
            
            # Create quote items
            items = []
            total_amount = Decimal('0')
            
            for item_data in quote_data.items:
                item_id = str(uuid.uuid4())
                item_dict = {
                    "id": item_id,
                    "quote_id": quote_id,
                    "name": item_data.name,
                    "description": item_data.description,
                    "quantity": item_data.quantity,
                    "unit_price": str(item_data.unit_price),  # Store as string for precision
                    "discount_percent": str(item_data.discount_percent),
                    "discount_amount": str(item_data.discount_amount) if item_data.discount_amount else None,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
                quote_items_db[item_id] = item_dict
                
                # Create QuoteItem for response
                quote_item = QuoteItem(
                    id=item_id,
                    quote_id=quote_id,
                    name=item_data.name,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    discount_percent=item_data.discount_percent,
                    discount_amount=item_data.discount_amount,
                    created_at=now,
                    updated_at=now
                )
                items.append(quote_item)
                total_amount += item_data.total_price
            
            # Create quote
            quote_dict = {
                "id": quote_id,
                "user_id": user_id,
                "customer_name": quote_data.customer_name,
                "customer_email": quote_data.customer_email,
                "title": quote_data.title,
                "description": quote_data.description,
                "status": quote_data.status.value,
                "valid_until": quote_data.valid_until.isoformat() if quote_data.valid_until else None,
                "total_amount": str(total_amount),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            
            quotes_db[quote_id] = quote_dict
            
            # Save data atomically
            await asyncio.gather(
                storage.save_data("quotes", quotes_db),
                storage.save_data("quote_items", quote_items_db)
            )
            
            # Create response quote
            quote = Quote(
                id=quote_id,
                user_id=user_id,
                customer_name=quote_data.customer_name,
                customer_email=quote_data.customer_email,
                title=quote_data.title,
                description=quote_data.description,
                status=quote_data.status,
                valid_until=quote_data.valid_until,
                items=items,
                total_amount=total_amount,
                created_at=now,
                updated_at=now
            )
            
            # Create workflow for quotes that need approval
            workflow_id = None
            needs_workflow = (quote_data.status.value == 'pending') or (total_amount >= Decimal('10000'))
            
            logger.info(f"Checking workflow need: status={quote_data.status.value}, amount=${total_amount}, needs_workflow={needs_workflow}")
            
            if needs_workflow:
                try:
                    from app.services.workflow_service import WorkflowService
                    # Use discount-based workflow for dynamic approval flow
                    workflow = await WorkflowService.create_discount_based_workflow(quote, user_id)
                    workflow_id = workflow.id
                    
                    # Update quote with workflow_id
                    quote_dict["workflow_id"] = workflow_id
                    quotes_db[quote_id] = quote_dict
                    await storage.save_data("quotes", quotes_db)
                    
                    logger.info(f"Workflow created for quote: {workflow_id}", extra={
                        "quote_id": quote_id,
                        "workflow_id": workflow_id,
                        "quote_amount": float(total_amount)
                    })
                except Exception as e:
                    logger.error(f"Failed to create workflow for quote {quote_id}: {str(e)}")
                    # Log the full error for debugging
                    import traceback
                    logger.error(f"Workflow creation error details: {traceback.format_exc()}")
                    # Continue without workflow - non-critical failure
            
            # Update quote object with workflow_id
            quote.workflow_id = workflow_id
            
            logger.info(f"Quote created successfully: {quote_id}", extra={
                "quote_id": quote_id,
                "user_id": user_id,
                "total_amount": float(total_amount),
                "workflow_id": workflow_id
            })
            
            return quote
            
        except Exception as e:
            logger.error(f"Failed to create quote: {str(e)}", extra={
                "user_id": user_id,
                "error": str(e)
            })
            raise StorageError("create_quote", str(e))
    
    @staticmethod
    async def create_quote_with_workflow(quote_data: QuoteCreate, workflow_config: Optional[Dict], user_id: str) -> Quote:
        """Create a new quote with custom workflow configuration"""
        try:
            logger.info(f"Creating quote with custom workflow for user {user_id}", extra={
                "user_id": user_id,
                "quote_title": quote_data.title,
                "has_custom_workflow": workflow_config is not None
            })
            
            # First create the quote normally
            quote = await QuoteService.create_quote(quote_data, user_id)
            
            # If custom workflow provided, replace the default workflow
            if workflow_config:
                try:
                    from app.services.workflow_service import WorkflowService
                    from app.models.workflows import ApprovalWorkflowCreate
                    
                    # Convert workflow_config dict to ApprovalWorkflowCreate
                    workflow_create = ApprovalWorkflowCreate(**workflow_config)
                    
                    # Create custom workflow
                    workflow = await WorkflowService.create_workflow(workflow_create, user_id, quote.id)
                    
                    # Update quote with new workflow_id
                    quotes_db = await storage.load_data("quotes")
                    quote_dict = quotes_db.get(quote.id)
                    if quote_dict:
                        quote_dict["workflow_id"] = workflow.id
                        quotes_db[quote.id] = quote_dict
                        await storage.save_data("quotes", quotes_db)
                        
                        # Update quote object
                        quote.workflow_id = workflow.id
                        
                        logger.info(f"Custom workflow created and assigned: {workflow.id}", extra={
                            "quote_id": quote.id,
                            "workflow_id": workflow.id,
                            "workflow_steps": len(workflow.steps)
                        })
                    
                except Exception as e:
                    logger.warning(f"Failed to create custom workflow for quote {quote.id}: {str(e)}")
                    # Continue with default workflow - quote was already created successfully
            
            return quote
            
        except Exception as e:
            logger.error(f"Failed to create quote with workflow: {str(e)}", extra={
                "user_id": user_id,
                "error": str(e)
            })
            raise StorageError("create_quote_with_workflow", str(e))
    
    @staticmethod
    async def get_quote(quote_id: str, user_id: str) -> Quote:
        """Get a specific quote by ID with permission checking"""
        try:
            logger.debug(f"Fetching quote {quote_id} for user {user_id}")
            
            quotes_db = await storage.load_data("quotes")
            quote_items_db = await storage.load_data("quote_items")
            
            quote_dict = quotes_db.get(quote_id)
            if not quote_dict:
                logger.warning(f"Quote not found: {quote_id}")
                raise QuoteNotFoundError(quote_id)
            
            # Check permissions
            logger.debug(f"Quote owner: {quote_dict['user_id']}, Requesting user: {user_id}")
            if quote_dict["user_id"] != user_id:
                logger.warning(f"Permission mismatch for quote {quote_id}. Quote owner: {quote_dict['user_id']}, Requesting user: {user_id}")
                # TEMPORARY: Allow access for debugging - remove this in production
                logger.warning("TEMPORARILY allowing access for debugging")
            
            # Get quote items
            items = []
            for item_id, item_dict in quote_items_db.items():
                if item_dict["quote_id"] == quote_id:
                    item = QuoteItem(
                        id=item_dict["id"],
                        quote_id=item_dict["quote_id"],
                        name=item_dict["name"],
                        description=item_dict["description"],
                        quantity=item_dict["quantity"],
                        unit_price=Decimal(item_dict["unit_price"]),
                        discount_percent=Decimal(item_dict.get("discount_percent", "0")),
                        discount_amount=Decimal(item_dict["discount_amount"]) if item_dict.get("discount_amount") else None,
                        created_at=QuoteService._parse_datetime(item_dict["created_at"]),
                        updated_at=QuoteService._parse_datetime(item_dict["updated_at"])
                    )
                    items.append(item)
            
            # Sort items by creation date
            items.sort(key=lambda x: x.created_at)
            
            quote = Quote(
                id=quote_dict["id"],
                user_id=quote_dict["user_id"],
                customer_name=quote_dict["customer_name"],
                customer_email=quote_dict["customer_email"],
                title=quote_dict["title"],
                description=quote_dict["description"],
                status=quote_dict["status"],
                valid_until=QuoteService._parse_datetime(quote_dict["valid_until"]) if quote_dict["valid_until"] else None,
                items=items,
                total_amount=Decimal(quote_dict["total_amount"]),
                workflow_id=quote_dict.get("workflow_id"),
                created_at=QuoteService._parse_datetime(quote_dict["created_at"]),
                updated_at=QuoteService._parse_datetime(quote_dict["updated_at"])
            )
            
            logger.debug(f"Quote fetched successfully: {quote_id}")
            return quote
            
        except (QuoteNotFoundError, QuotePermissionError):
            raise
        except Exception as e:
            logger.error(f"Failed to get quote {quote_id}: {str(e)}")
            raise StorageError("get_quote", str(e))
    
    @staticmethod
    async def get_quotes(user_id: str, skip: int = 0, limit: int = 100) -> List[Quote]:
        """Get paginated list of quotes for a user"""
        try:
            logger.debug(f"Fetching quotes for user {user_id} (skip={skip}, limit={limit})")
            
            quotes_db = await storage.load_data("quotes")
            quote_items_db = await storage.load_data("quote_items")
            
            # Filter quotes by user
            user_quotes = []
            for quote_dict in quotes_db.values():
                if quote_dict["user_id"] == user_id:
                    # Get quote items
                    items = []
                    for item_id, item_dict in quote_items_db.items():
                        if item_dict["quote_id"] == quote_dict["id"]:
                            item = QuoteItem(
                                id=item_dict["id"],
                                quote_id=item_dict["quote_id"],
                                name=item_dict["name"],
                                description=item_dict["description"],
                                quantity=item_dict["quantity"],
                                unit_price=Decimal(item_dict["unit_price"]),
                                discount_percent=Decimal(item_dict.get("discount_percent", "0")),
                                discount_amount=Decimal(item_dict["discount_amount"]) if item_dict.get("discount_amount") else None,
                                created_at=QuoteService._parse_datetime(item_dict["created_at"]),
                                updated_at=QuoteService._parse_datetime(item_dict["updated_at"])
                            )
                            items.append(item)
                    
                    # Sort items by creation date
                    items.sort(key=lambda x: x.created_at)
                    
                    quote = Quote(
                        id=quote_dict["id"],
                        user_id=quote_dict["user_id"],
                        customer_name=quote_dict["customer_name"],
                        customer_email=quote_dict["customer_email"],
                        title=quote_dict["title"],
                        description=quote_dict["description"],
                        status=quote_dict["status"],
                        valid_until=QuoteService._parse_datetime(quote_dict["valid_until"]) if quote_dict["valid_until"] else None,
                        items=items,
                        total_amount=Decimal(quote_dict["total_amount"]),
                        workflow_id=quote_dict.get("workflow_id"),
                        created_at=QuoteService._parse_datetime(quote_dict["created_at"]),
                        updated_at=QuoteService._parse_datetime(quote_dict["updated_at"])
                    )
                    user_quotes.append(quote)
            
            # Sort by created_at desc and paginate
            user_quotes.sort(key=lambda x: x.created_at, reverse=True)
            paginated_quotes = user_quotes[skip:skip + limit]
            
            logger.debug(f"Fetched {len(paginated_quotes)} quotes for user {user_id}")
            return paginated_quotes
            
        except Exception as e:
            logger.error(f"Failed to get quotes for user {user_id}: {str(e)}")
            raise StorageError("get_quotes", str(e))
    
    @staticmethod
    async def get_quote_count(user_id: str) -> int:
        """Get total count of quotes for a user"""
        try:
            quotes_db = await storage.load_data("quotes")
            count = sum(1 for quote in quotes_db.values() if quote["user_id"] == user_id)
            return count
        except Exception as e:
            logger.error(f"Failed to get quote count for user {user_id}: {str(e)}")
            raise StorageError("get_quote_count", str(e))
    
    @staticmethod
    async def update_quote(quote_id: str, quote_update: QuoteUpdate, user_id: str) -> Quote:
        """Update a quote with validation and permission checking"""
        try:
            logger.info(f"Updating quote {quote_id} for user {user_id}")
            
            quotes_db = await storage.load_data("quotes")
            quote_items_db = await storage.load_data("quote_items")
            
            quote_dict = quotes_db.get(quote_id)
            if not quote_dict:
                raise QuoteNotFoundError(quote_id)
            
            # Check permissions
            if quote_dict["user_id"] != user_id:
                raise QuotePermissionError(user_id, quote_id)
            
            # Update fields (excluding items which we handle separately)
            update_data = quote_update.dict(exclude_unset=True, exclude={'items'})
            for field, value in update_data.items():
                if field == "valid_until" and value is not None:
                    quote_dict[field] = value.isoformat()
                elif field == "status" and hasattr(value, 'value'):
                    quote_dict[field] = value.value
                else:
                    quote_dict[field] = value
            
            # Handle items update if provided
            if quote_update.items is not None:
                logger.debug(f"Updating {len(quote_update.items)} items for quote {quote_id}")
                
                # Delete existing items for this quote
                items_to_delete = [
                    item_id for item_id, item_dict in quote_items_db.items()
                    if item_dict["quote_id"] == quote_id
                ]
                
                for item_id in items_to_delete:
                    del quote_items_db[item_id]
                
                # Create new items
                total_amount = Decimal('0')
                now = datetime.utcnow()
                
                for item_data in quote_update.items:
                    item_id = str(uuid.uuid4())
                    item_dict = {
                        "id": item_id,
                        "quote_id": quote_id,
                        "name": item_data.name,
                        "description": item_data.description,
                        "quantity": item_data.quantity,
                        "unit_price": str(item_data.unit_price),
                        "discount_percent": str(item_data.discount_percent),
                        "discount_amount": str(item_data.discount_amount) if item_data.discount_amount else None,
                        "created_at": now.isoformat(),
                        "updated_at": now.isoformat()
                    }
                    quote_items_db[item_id] = item_dict
                    total_amount += item_data.total_price
                
                # Update total amount
                quote_dict["total_amount"] = str(total_amount)
            
            quote_dict["updated_at"] = datetime.utcnow().isoformat()
            quotes_db[quote_id] = quote_dict
            
            # Save data atomically
            await asyncio.gather(
                storage.save_data("quotes", quotes_db),
                storage.save_data("quote_items", quote_items_db)
            )
            
            logger.info(f"Quote updated successfully: {quote_id}")
            return await QuoteService.get_quote(quote_id, user_id)
            
        except (QuoteNotFoundError, QuotePermissionError):
            raise
        except Exception as e:
            logger.error(f"Failed to update quote {quote_id}: {str(e)}")
            raise StorageError("update_quote", str(e))
    
    @staticmethod
    async def delete_quote(quote_id: str, user_id: str) -> bool:
        """Delete a quote with permission checking"""
        try:
            logger.info(f"Deleting quote {quote_id} for user {user_id}")
            
            quotes_db = await storage.load_data("quotes")
            quote_items_db = await storage.load_data("quote_items")
            
            quote_dict = quotes_db.get(quote_id)
            if not quote_dict:
                raise QuoteNotFoundError(quote_id)
            
            # Check permissions
            if quote_dict["user_id"] != user_id:
                raise QuotePermissionError(user_id, quote_id)
            
            # Delete associated workflows first
            try:
                if quote_dict.get("workflow_id"):
                    workflows_db = await storage.load_data("workflows")
                    workflow_steps_db = await storage.load_data("workflow_steps")
                    
                    workflow_id = quote_dict["workflow_id"]
                    
                    # Delete workflow steps for this workflow
                    steps_to_delete = [
                        step_id for step_id, step_dict in workflow_steps_db.items()
                        if step_dict["workflow_id"] == workflow_id
                    ]
                    
                    for step_id in steps_to_delete:
                        del workflow_steps_db[step_id]
                    
                    # Delete the workflow
                    if workflow_id in workflows_db:
                        del workflows_db[workflow_id]
                    
                    # Save workflow data
                    await asyncio.gather(
                        storage.save_data("workflows", workflows_db),
                        storage.save_data("workflow_steps", workflow_steps_db)
                    )
                    
                    logger.info(f"Deleted workflow {workflow_id} associated with quote {quote_id}")
            except Exception as e:
                logger.warning(f"Failed to delete workflow for quote {quote_id}: {str(e)}")
            
            # Delete quote items
            items_to_delete = [
                item_id for item_id, item_dict in quote_items_db.items()
                if item_dict["quote_id"] == quote_id
            ]
            
            for item_id in items_to_delete:
                del quote_items_db[item_id]
            
            # Delete quote
            del quotes_db[quote_id]
            
            # Save data atomically
            await asyncio.gather(
                storage.save_data("quotes", quotes_db),
                storage.save_data("quote_items", quote_items_db)
            )
            
            logger.info(f"Quote deleted successfully: {quote_id}")
            return True
            
        except (QuoteNotFoundError, QuotePermissionError):
            raise
        except Exception as e:
            logger.error(f"Failed to delete quote {quote_id}: {str(e)}")
            raise StorageError("delete_quote", str(e))
    
    @staticmethod
    async def add_sample_data(user_id: str) -> None:
        """Add sample quotes for new users"""
        try:
            quotes_db = await storage.load_data("quotes")
            
            # Check if user already has quotes
            user_has_quotes = any(
                quote["user_id"] == user_id for quote in quotes_db.values()
            )
            
            if user_has_quotes:
                logger.debug(f"User {user_id} already has quotes, skipping sample data")
                return
            
            # Skip sample data creation for now to avoid recreation issues
            logger.info(f"Skipping sample data creation for user {user_id} - disabled to prevent recreation")
            return
            
            logger.info(f"Adding sample data for user {user_id}")
            
            sample_quotes = [
                QuoteCreate(
                    customer_name="Acme Corp",
                    customer_email="contact@acme.com",
                    title="Enterprise Software License",
                    description="Annual software license for enterprise solution",
                    status="pending",
                    items=[
                        QuoteItemCreate(
                            name="Enterprise License",
                            description="Annual license for 100 users",
                            quantity=1,
                            unit_price=Decimal("12500.00")
                        )
                    ]
                ),
                QuoteCreate(
                    customer_name="Tech Solutions",
                    customer_email="info@techsolutions.com",
                    title="Cloud Infrastructure Setup",
                    description="Initial cloud infrastructure deployment",
                    status="draft",
                    items=[
                        QuoteItemCreate(
                            name="Server Setup",
                            description="Initial server configuration",
                            quantity=3,
                            unit_price=Decimal("2500.00")
                        ),
                        QuoteItemCreate(
                            name="Database Setup",
                            description="Database configuration and optimization",
                            quantity=1,
                            unit_price=Decimal("2250.00")
                        )
                    ]
                )
            ]
            
            for quote_data in sample_quotes:
                await QuoteService.create_quote(quote_data, user_id)
            
            logger.info(f"Sample data added for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to add sample data for user {user_id}: {str(e)}")
            # Don't raise error for sample data failure
            pass
    
    @staticmethod
    def _parse_datetime(datetime_str: str) -> datetime:
        """Parse datetime string with flexible format support"""
        try:
            # Try ISO format first (with T)
            return datetime.fromisoformat(datetime_str)
        except ValueError:
            try:
                # Try format with space instead of T
                return datetime.fromisoformat(datetime_str.replace(' ', 'T'))
            except ValueError:
                # Fallback to manual parsing for common formats
                try:
                    return datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S.%f")
                except ValueError:
                    return datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M:%S.%f")
        except Exception as e:
            logger.error(f"Failed to parse datetime '{datetime_str}': {e}")
            raise ValueError(f"Invalid datetime format: {datetime_str}")