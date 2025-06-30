import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Backend URL
BASE_URL = "http://localhost:8000"

# Test endpoints
def test_endpoints():
    print("Testing Canyon CPQ Backend Authentication...\n")
    
    # 1. Test unprotected endpoint
    print("1. Testing unprotected endpoint (/):")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}\n")
    except Exception as e:
        print(f"   Error: {e}\n")
    
    # 2. Test protected endpoint without auth
    print("2. Testing protected endpoint without auth:")
    try:
        response = requests.get(f"{BASE_URL}/api/test/protected")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}\n")
    except Exception as e:
        print(f"   Error: {e}\n")
    
    # 3. Test with dev token (if in development)
    if os.getenv("ENVIRONMENT") == "development":
        print("3. Testing with development token:")
        # Use a proper UUID for the test user
        test_user_id = "123e4567-e89b-12d3-a456-426614174000"
        headers = {
            "Authorization": f"Bearer dev-token-{test_user_id}",
            "X-User-Persona": "ae"
        }
        try:
            response = requests.get(f"{BASE_URL}/api/test/protected", headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}\n")
        except Exception as e:
            print(f"   Error: {e}\n")
        
        # 4. Test quote creation with dev token
        print("4. Testing quote creation with dev token:")
        quote_data = {
            "customer_name": "Test Company",
            "customer_email": "test@example.com",
            "customer_company": "Test Corp",
            "title": "Test Quote from Auth Test",
            "description": "Testing authentication and quote creation",
            "discount_percent": 15,
            "items": [
                {
                    "name": "Product A",
                    "description": "Test product",
                    "quantity": 10,
                    "unit_price": 100.00,
                    "discount_percent": 10
                }
            ]
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/quotes/",
                headers=headers,
                json=quote_data
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                quote = response.json()
                print(f"   Created Quote ID: {quote.get('id')}")
                print(f"   Quote Number: {quote.get('quote_number')}")
                print(f"   Total Amount: ${quote.get('total_amount')}")
            else:
                print(f"   Response: {response.json()}")
            print()
        except Exception as e:
            print(f"   Error: {e}\n")
    
    # 5. Test with a mock Supabase JWT (you would use a real one from frontend)
    print("5. Instructions for testing with real Supabase token:")
    print("   - Log into the frontend application")
    print("   - Open browser developer tools")
    print("   - Go to Application > Local Storage")
    print("   - Find the Supabase auth token")
    print("   - Use it in the Authorization header as 'Bearer <token>'")

if __name__ == "__main__":
    test_endpoints()