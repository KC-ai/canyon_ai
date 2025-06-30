#!/usr/bin/env python3
"""
Minimal test to create quote
"""
import asyncio
from app.services.quote_service import QuoteService
from app.models.quotes import QuoteCreate
import logging

# Enable detailed logging
logging.basicConfig(level=logging.DEBUG)

async def test():
    service = QuoteService()
    
    quote_data = QuoteCreate(
        customer_name="Test Company",
        customer_email="test@example.com",
        customer_company="Test Corp",
        title="Test Quote",
        description="Test",
        discount_percent=10.0,
        items=[]
    )
    
    try:
        quote = await service.create_quote("460cf754-18ee-47af-9530-b4f19cbcb4d3", quote_data)
        print(f"Success! Quote ID: {quote.id}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())