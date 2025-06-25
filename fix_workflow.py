#!/usr/bin/env python3
"""
Quick script to manually add workflow to existing quote
"""
import sys
import os
import asyncio
import json
from decimal import Decimal

# Add the backend to Python path
sys.path.append('/Users/kashyap/canyon_ai/backend')

from app.models.quotes import Quote, QuoteStatus
from app.services.workflow_service import WorkflowService
from app.core.storage import storage

async def fix_quote_workflow():
    """Add workflow to the quote that should have one"""
    
    # Your user ID and quote ID
    user_id = "54da6f6f-39b0-4dc9-9cf9-7cff37c2577b"
    quote_id = "28164a05-b49b-4b6b-9648-fc4aba69abd4"
    
    try:
        print(f"Loading quote {quote_id}...")
        
        # Load quote data
        quotes_db = await storage.load_data("quotes")
        quote_data = quotes_db.get(quote_id)
        
        if not quote_data:
            print(f"Quote {quote_id} not found!")
            return
            
        print(f"Quote found: {quote_data['title']}")
        print(f"Status: {quote_data['status']}")
        print(f"Total: {quote_data['total_amount']}")
        print(f"Current workflow_id: {quote_data.get('workflow_id', 'None')}")
        
        # Create quote object for workflow creation
        quote = Quote(
            id=quote_data['id'],
            user_id=quote_data['user_id'],
            customer_name=quote_data['customer_name'],
            customer_email=quote_data['customer_email'],
            title=quote_data['title'],
            description=quote_data['description'],
            status=QuoteStatus(quote_data['status']),
            total_amount=Decimal(str(quote_data['total_amount'])),
            items=[],  # Don't need items for workflow creation
            created_at=quote_data['created_at'],
            updated_at=quote_data['updated_at']
        )
        
        # Create workflow
        print("Creating workflow...")
        workflow = await WorkflowService.create_default_workflow(quote, user_id)
        
        print(f"Workflow created: {workflow.id}")
        print(f"Steps: {len(workflow.steps)}")
        
        # Update quote with workflow_id
        quote_data['workflow_id'] = workflow.id
        quotes_db[quote_id] = quote_data
        await storage.save_data("quotes", quotes_db)
        
        print("✅ Quote updated with workflow_id!")
        print(f"You can now refresh your browser to see the workflow components.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_quote_workflow())