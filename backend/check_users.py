#!/usr/bin/env python3
"""
Check existing users in Supabase
"""
import os
from dotenv import load_dotenv
from supabase import create_client
import json

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("Checking auth users...")
try:
    # Get auth users
    auth_users = client.auth.admin.list_users()
    print(f"Found {len(auth_users)} auth users:")
    for user in auth_users[:3]:  # Show first 3
        print(f"  - ID: {user.id}")
        print(f"    Email: {user.email}")
        print()
except Exception as e:
    print(f"Error: {e}")

print("\nChecking users table...")
try:
    # Check users table
    users = client.table('users').select('*').execute()
    print(f"Found {len(users.data)} users in users table")
    for user in users.data[:3]:
        print(f"  - {user}")
except Exception as e:
    print(f"Error accessing users table: {e}")