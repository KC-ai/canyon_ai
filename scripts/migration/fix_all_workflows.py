#!/usr/bin/env python3
"""
Add workflows to ALL existing quotes that meet the criteria
"""
import json
import sys
import os
from decimal import Decimal
import asyncio

# Add backend to path
sys.path.append('/Users/kashyap/canyon_ai/backend')
os.chdir('/Users/kashyap/canyon_ai/backend')

async def fix_all_workflows():
    from app.core.storage import storage
    from app.services.workflow_service import WorkflowService
    from app.models.quotes import Quote, QuoteStatus
    
    try:
        # Load quotes
        quotes_db = await storage.load_data("quotes")
        
        # Find all quotes that need workflows
        quotes_to_update = []
        for quote_id, quote_data in quotes_db.items():
            status = quote_data.get('status', 'draft')
            total = Decimal(str(quote_data.get('total_amount', '0')))
            has_workflow = quote_data.get('workflow_id') is not None
            user_id = quote_data.get('user_id')
            
            print(f"Quote {quote_id[:8]}... (User: {user_id[:8]}...)")
            print(f"  Title: {quote_data.get('title')}")
            print(f"  Status: {status}")
            print(f"  Total: ${total}")
            print(f"  Has workflow: {has_workflow}")
            
            # Check if needs workflow
            needs_workflow = (status == 'pending') or (total >= Decimal('10000'))
            
            if needs_workflow and not has_workflow:
                print(f"  -> NEEDS WORKFLOW!")
                quotes_to_update.append((quote_id, quote_data, user_id))
            print()
        
        # Create workflows for quotes that need them
        for quote_id, quote_data, user_id in quotes_to_update:
            print(f"Creating workflow for quote {quote_id[:8]}... (User: {user_id[:8]}...)")
            
            # Create Quote object
            quote = Quote(
                id=quote_data['id'],
                user_id=quote_data['user_id'],
                customer_name=quote_data['customer_name'],
                customer_email=quote_data.get('customer_email', ''),
                title=quote_data['title'],
                description=quote_data.get('description', ''),
                status=QuoteStatus(quote_data['status']),
                total_amount=Decimal(str(quote_data['total_amount'])),
                items=[],  # Not needed for workflow creation
                created_at=quote_data['created_at'],
                updated_at=quote_data['updated_at']
            )
            
            # Create workflow
            workflow = await WorkflowService.create_default_workflow(quote, user_id)
            print(f"  Created workflow: {workflow.id}")
            
            # Update quote in database
            quote_data['workflow_id'] = workflow.id
            quotes_db[quote_id] = quote_data
            
        # Save updated quotes
        if quotes_to_update:
            await storage.save_data("quotes", quotes_db)
            print(f"\n✅ Updated {len(quotes_to_update)} quotes with workflows!")
            print("All users should now see workflow components on their quotes.")
        else:
            print("No quotes need workflow updates.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_all_workflows())