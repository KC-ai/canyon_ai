#!/usr/bin/env python3
"""
Test Supabase directly
"""
import os
from dotenv import load_dotenv
from supabase import create_client
import json

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Test creating a quote directly
quote_data = {
    "user_id": "00000000-0000-0000-0000-000000000123",
    "customer_name": "Test Company",
    "customer_email": "test@company.com",
    "customer_company": "Test Corp",
    "title": "Test Quote",
    "description": "Testing",
    "status": "draft",
    "discount_percent": 25.0,
    "total_amount": 0
}

print("Creating quote in Supabase...")
try:
    response = client.table('quotes').insert(quote_data).execute()
    print("Success!")
    print(json.dumps(response.data[0], indent=2))
except Exception as e:
    print(f"Error: {e}")
    print("\nChecking if quotes table exists...")
    try:
        # Try to select from quotes table
        check = client.table('quotes').select('*').limit(1).execute()
        print("Quotes table exists!")
    except Exception as e2:
        print(f"Cannot access quotes table: {e2}")