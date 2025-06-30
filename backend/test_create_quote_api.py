#!/usr/bin/env python3
"""
Test creating a quote through the API
"""
import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:8000"

async def test_create_quote():
    # Use a dev token with actual user ID from users table
    headers = {
        "Authorization": "Bearer dev-token-460cf754-18ee-47af-9530-b4f19cbcb4d3",
        "Content-Type": "application/json",
        "X-User-Persona": "ae"
    }
    
    quote_data = {
        "customer_name": "Acme Corporation",
        "customer_email": "contact@acme.com",
        "customer_company": "Acme Corp",
        "title": "Q4 2024 Enterprise License",
        "description": "Annual enterprise software license with premium support",
        "discount_percent": 25.0,
        "items": [
            {
                "name": "Enterprise License",
                "description": "Annual software license for 100 users",
                "quantity": 1,
                "unit_price": 100000.0,
                "discount_percent": 20.0
            },
            {
                "name": "Premium Support",
                "description": "24/7 premium support package",
                "quantity": 1,
                "unit_price": 50000.0,
                "discount_percent": 30.0
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        print("Creating quote...")
        response = await client.post(
            f"{API_URL}/api/quotes/",
            headers=headers,
            json=quote_data
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            quote = response.json()
            quote_id = quote['id']
            print(f"\n✅ Quote created! ID: {quote_id}")
            
            # Submit for approval
            print("\nSubmitting for approval...")
            submit_response = await client.post(
                f"{API_URL}/api/quotes/{quote_id}/submit",
                headers=headers
            )
            
            print(f"Submit Status: {submit_response.status_code}")
            if submit_response.status_code == 200:
                print("✅ Quote submitted for approval!")

if __name__ == "__main__":
    asyncio.run(test_create_quote())