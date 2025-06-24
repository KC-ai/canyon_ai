from typing import List, Optional
from datetime import datetime
import uuid
from app.models.quotes import Quote, QuoteCreate, QuoteUpdate, QuoteItem, QuoteItemCreate

# In-memory storage for demo purposes
quotes_db: dict[str, dict] = {}
quote_items_db: dict[str, dict] = {}


class QuoteService:
    
    @staticmethod
    def create_quote(quote_data: QuoteCreate, user_id: str) -> Quote:
        quote_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Create quote items
        items = []
        total_amount = 0.0
        
        for item_data in quote_data.items:
            item_id = str(uuid.uuid4())
            item_dict = {
                "id": item_id,
                "quote_id": quote_id,
                "name": item_data.name,
                "description": item_data.description,
                "quantity": item_data.quantity,
                "unit_price": item_data.unit_price,
                "created_at": now,
                "updated_at": now
            }
            quote_items_db[item_id] = item_dict
            items.append(QuoteItem(**item_dict))
            total_amount += item_data.quantity * item_data.unit_price
        
        # Create quote
        quote_dict = {
            "id": quote_id,
            "user_id": user_id,
            "customer_name": quote_data.customer_name,
            "customer_email": quote_data.customer_email,
            "title": quote_data.title,
            "description": quote_data.description,
            "status": quote_data.status,
            "valid_until": quote_data.valid_until,
            "items": items,
            "total_amount": total_amount,
            "created_at": now,
            "updated_at": now
        }
        
        quotes_db[quote_id] = quote_dict
        return Quote(**quote_dict)
    
    @staticmethod
    def get_quote(quote_id: str, user_id: str) -> Optional[Quote]:
        quote_dict = quotes_db.get(quote_id)
        if not quote_dict or quote_dict["user_id"] != user_id:
            return None
        
        # Get quote items
        items = []
        for item_id, item_dict in quote_items_db.items():
            if item_dict["quote_id"] == quote_id:
                items.append(QuoteItem(**item_dict))
        
        quote_dict["items"] = items
        return Quote(**quote_dict)
    
    @staticmethod
    def get_quotes(user_id: str, skip: int = 0, limit: int = 100) -> List[Quote]:
        user_quotes = []
        for quote_dict in quotes_db.values():
            if quote_dict["user_id"] == user_id:
                # Get quote items
                items = []
                for item_id, item_dict in quote_items_db.items():
                    if item_dict["quote_id"] == quote_dict["id"]:
                        items.append(QuoteItem(**item_dict))
                
                quote_dict_copy = quote_dict.copy()
                quote_dict_copy["items"] = items
                user_quotes.append(Quote(**quote_dict_copy))
        
        # Sort by created_at desc
        user_quotes.sort(key=lambda x: x.created_at, reverse=True)
        return user_quotes[skip:skip + limit]
    
    @staticmethod
    def update_quote(quote_id: str, quote_update: QuoteUpdate, user_id: str) -> Optional[Quote]:
        quote_dict = quotes_db.get(quote_id)
        if not quote_dict or quote_dict["user_id"] != user_id:
            return None
        
        # Update fields (excluding items which we handle separately)
        update_data = quote_update.dict(exclude_unset=True, exclude={'items'})
        for field, value in update_data.items():
            quote_dict[field] = value
        
        # Handle items update if provided
        if quote_update.items is not None:
            # Delete existing items for this quote
            items_to_delete = []
            for item_id, item_dict in quote_items_db.items():
                if item_dict["quote_id"] == quote_id:
                    items_to_delete.append(item_id)
            
            for item_id in items_to_delete:
                del quote_items_db[item_id]
            
            # Create new items
            total_amount = 0.0
            now = datetime.utcnow()
            
            for item_data in quote_update.items:
                item_id = str(uuid.uuid4())
                item_dict = {
                    "id": item_id,
                    "quote_id": quote_id,
                    "name": item_data.name,
                    "description": item_data.description,
                    "quantity": item_data.quantity,
                    "unit_price": item_data.unit_price,
                    "created_at": now,
                    "updated_at": now
                }
                quote_items_db[item_id] = item_dict
                total_amount += item_data.quantity * item_data.unit_price
            
            # Update total amount
            quote_dict["total_amount"] = total_amount
        
        quote_dict["updated_at"] = datetime.utcnow()
        quotes_db[quote_id] = quote_dict
        
        return QuoteService.get_quote(quote_id, user_id)
    
    @staticmethod
    def delete_quote(quote_id: str, user_id: str) -> bool:
        quote_dict = quotes_db.get(quote_id)
        if not quote_dict or quote_dict["user_id"] != user_id:
            return False
        
        # Delete quote items
        items_to_delete = []
        for item_id, item_dict in quote_items_db.items():
            if item_dict["quote_id"] == quote_id:
                items_to_delete.append(item_id)
        
        for item_id in items_to_delete:
            del quote_items_db[item_id]
        
        # Delete quote
        del quotes_db[quote_id]
        return True
    
    @staticmethod
    def add_sample_data(user_id: str):
        """Add some sample quotes for testing"""
        if quotes_db:
            return  # Only add once
        
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
                        unit_price=12500.00
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
                        unit_price=2500.00
                    ),
                    QuoteItemCreate(
                        name="Database Setup",
                        description="Database configuration and optimization",
                        quantity=1,
                        unit_price=2250.00
                    )
                ]
            ),
            QuoteCreate(
                customer_name="StartupXYZ",
                customer_email="founder@startupxyz.com",
                title="Custom Development Project",
                description="Full-stack web application development",
                status="approved",
                items=[
                    QuoteItemCreate(
                        name="Frontend Development",
                        description="React frontend application",
                        quantity=80,
                        unit_price=150.00
                    ),
                    QuoteItemCreate(
                        name="Backend Development",
                        description="Node.js API development",
                        quantity=60,
                        unit_price=175.00
                    )
                ]
            )
        ]
        
        for quote_data in sample_quotes:
            QuoteService.create_quote(quote_data, user_id)