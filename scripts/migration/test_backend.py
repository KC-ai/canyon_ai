#!/usr/bin/env python3
import asyncio
import sys
import os

# Add backend to path
backend_path = '/Users/kashyap/canyon_ai/backend'
sys.path.insert(0, backend_path)
os.chdir(backend_path)

async def test():
    # Import after setting up path
    from app.core.storage import storage
    
    # Test storage
    quotes = await storage.load_data("quotes")
    user_id = "54da6f6f-39b0-4dc9-9cf9-7cff37c2577b"
    
    user_quotes = {k:v for k,v in quotes.items() if v.get('user_id') == user_id}
    print(f"Found {len(user_quotes)} quotes for user")
    
    for qid, quote in user_quotes.items():
        print(f"{qid}: {quote['title']} - {quote.get('workflow_id', 'NO WORKFLOW')}")

asyncio.run(test())