#!/usr/bin/env python3
"""
Test full integration with Supabase
"""
import asyncio
import httpx
from datetime import datetime
import json
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

API_URL = "http://localhost:8000"

async def test_integration():
    print("\n=== Testing Full Frontend-Backend Integration ===\n")
    
    # 1. Get a real user from Supabase auth
    print("1. Fetching users from Supabase auth...")
    auth_users = supabase.auth.admin.list_users()
    
    if not auth_users:
        print("❌ No users found in Supabase auth. Please sign up through the frontend first!")
        return
    
    user = auth_users[0]
    user_id = user.id
    user_email = user.email
    print(f"✅ Found user: {user_email} (ID: {user_id})")
    
    # 2. Generate a valid JWT token for this user
    print("\n2. Generating JWT token for user...")
    # For testing, we'll use the service role key which has full access
    # In production, the frontend would get this from Supabase auth
    token = SUPABASE_SERVICE_ROLE_KEY
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-User-Persona": "ae"
    }
    
    async with httpx.AsyncClient() as client:
        # 3. Test creating a quote
        print("\n3. Creating a quote...")
        quote_data = {
            "customer_name": "Test Company",
            "customer_email": "test@company.com",
            "customer_company": "Test Corp",
            "title": "Integration Test Quote",
            "description": "Testing full Supabase integration",
            "discount_percent": 25.0,
            "items": [
                {
                    "name": "Product A",
                    "description": "Test product",
                    "quantity": 10,
                    "unit_price": 100.0,
                    "discount_percent": 20.0
                },
                {
                    "name": "Service B",
                    "description": "Test service",
                    "quantity": 1,
                    "unit_price": 500.0,
                    "discount_percent": 30.0
                }
            ]
        }
        
        response = await client.post(
            f"{API_URL}/api/quotes/",
            headers=headers,
            json=quote_data
        )
        
        if response.status_code == 200:
            quote = response.json()
            quote_id = quote['id']
            print(f"✅ Quote created successfully! ID: {quote_id}")
            print(f"   Total amount: ${quote.get('total_amount', 0)}")
        else:
            print(f"❌ Failed to create quote: {response.status_code}")
            print(f"   Error: {response.text}")
            return
        
        # 4. Test fetching quotes
        print("\n4. Fetching quotes...")
        response = await client.get(
            f"{API_URL}/api/quotes/",
            headers=headers
        )
        
        if response.status_code == 200:
            quotes = response.json()
            print(f"✅ Retrieved {len(quotes)} quotes")
            for q in quotes[:3]:  # Show first 3
                print(f"   - {q['title']} (${q.get('total_amount', 0)})")
        else:
            print(f"❌ Failed to fetch quotes: {response.status_code}")
        
        # 5. Test submitting quote for approval
        print("\n5. Submitting quote for approval...")
        response = await client.post(
            f"{API_URL}/api/quotes/{quote_id}/submit",
            headers=headers
        )
        
        if response.status_code == 200:
            print("✅ Quote submitted for approval")
            
            # Check workflow steps were created
            print("\n6. Checking workflow steps...")
            response = await client.get(
                f"{API_URL}/api/quotes/{quote_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                quote_details = response.json()
                if 'workflow_steps' in quote_details:
                    steps = quote_details['workflow_steps']
                    print(f"✅ Found {len(steps)} workflow steps:")
                    for step in steps:
                        print(f"   - {step['name']} ({step['status']})")
                else:
                    print("❌ No workflow steps found in response")
            else:
                print(f"❌ Failed to fetch quote details: {response.status_code}")
        else:
            print(f"❌ Failed to submit quote: {response.status_code}")
            print(f"   Error: {response.text}")
    
    print("\n=== Integration Test Complete ===\n")

if __name__ == "__main__":
    asyncio.run(test_integration())