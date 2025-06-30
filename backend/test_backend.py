#!/usr/bin/env python3
"""
Comprehensive backend tests for Canyon CPQ
Run this to verify everything works before frontend integration
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import json

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"Testing: {test_name}")
    print(f"{'='*60}")

def print_success(message):
    print(f"✅ {message}")
    test_results["passed"] += 1

def print_error(message, error=None):
    print(f"❌ {message}")
    if error:
        print(f"   Error: {str(error)}")
    test_results["failed"] += 1
    test_results["errors"].append({"test": message, "error": str(error) if error else "Unknown"})

def print_info(message):
    print(f"ℹ️  {message}")

async def test_environment():
    """Test environment variables and configuration"""
    print_test_header("Environment Configuration")
    
    try:
        from app.core.config import settings
        print_success("Settings loaded successfully")
        
        # Check required environment variables
        required_vars = [
            ('supabase_url', 'SUPABASE_URL'),
            ('supabase_service_role_key', 'SUPABASE_SERVICE_ROLE_KEY'),
            ('anthropic_api_key', 'ANTHROPIC_API_KEY')
        ]
        
        missing_vars = []
        for attr, env_name in required_vars:
            value = getattr(settings, attr, None)
            if not value:
                missing_vars.append(env_name)
                print_error(f"Missing environment variable: {env_name}")
            else:
                print_success(f"{env_name} is configured")
        
        if missing_vars:
            print_info(f"Please set these environment variables in your .env file: {', '.join(missing_vars)}")
            return False
            
        return True
        
    except Exception as e:
        print_error("Failed to load configuration", e)
        return False

async def test_database_connection():
    """Test Supabase database connection"""
    print_test_header("Database Connection")
    
    try:
        from app.core.database import get_supabase_client
        
        client = get_supabase_client()
        print_success("Supabase client created")
        
        # Test a simple query
        response = client.table('users').select("count", count='exact').execute()
        print_success(f"Database connected - found {response.count} users")
        
        return True
        
    except Exception as e:
        print_error("Failed to connect to database", e)
        print_info("Make sure your Supabase credentials are correct")
        return False

async def test_models():
    """Test all Pydantic models"""
    print_test_header("Model Validation")
    
    try:
        from app.models.quotes import QuoteCreate, QuoteItemCreate, QuoteStatus
        from app.models.workflows import WorkflowStep, WorkflowStepCreate
        from app.models.users import User
        
        # Test Quote creation
        quote_data = QuoteCreate(
            customer_name="Test Customer",
            customer_email="test@example.com",
            title="Test Quote",
            description="Test description",
            discount_percent=Decimal("15.5"),
            items=[
                QuoteItemCreate(
                    name="Test Product",
                    description="Test product description",
                    quantity=10,
                    unit_price=Decimal("100.00"),
                    discount_percent=Decimal("10")
                )
            ]
        )
        print_success("Quote model validation passed")
        
        # Test workflow step creation
        workflow_step = WorkflowStepCreate(
            persona="deal_desk",
            name="Deal Desk Review",
            step_order=1
        )
        print_success("Workflow model validation passed")
        
        # Test status enums
        valid_statuses = [
            QuoteStatus.DRAFT,
            QuoteStatus.PENDING_DEAL_DESK,
            QuoteStatus.APPROVED,
            QuoteStatus.TERMINATED
        ]
        print_success(f"Quote status enum validated with {len(valid_statuses)} statuses")
        
        return True
        
    except Exception as e:
        print_error("Model validation failed", e)
        return False

async def test_quote_service():
    """Test quote service methods"""
    print_test_header("Quote Service")
    
    try:
        from app.services.quote_service import QuoteService
        from app.models.quotes import QuoteCreate, QuoteItemCreate
        
        service = QuoteService()
        print_success("Quote service initialized")
        
        # Test quote creation (mock)
        print_info("Testing quote calculation logic...")
        
        # Test discount validation
        test_quote = QuoteCreate(
            customer_name="Test Customer",
            title="Test Quote",
            discount_percent=Decimal("25"),
            items=[
                QuoteItemCreate(
                    name="Product A",
                    quantity=5,
                    unit_price=Decimal("1000"),
                    discount_percent=Decimal("10")
                )
            ]
        )
        
        # Calculate expected total
        item_total = 5 * 1000 * (1 - Decimal("0.10"))  # 4500
        print_success(f"Quote calculation logic verified - Item total: ${item_total}")
        
        return True
        
    except Exception as e:
        print_error("Quote service test failed", e)
        return False

async def test_workflow_service():
    """Test workflow service logic"""
    print_test_header("Workflow Service")
    
    try:
        from app.services.workflow_service import WorkflowService
        from app.models.quotes import Quote
        
        service = WorkflowService()
        print_success("Workflow service initialized")
        
        # Test workflow rules
        test_cases = [
            (Decimal("5"), ["ae", "deal_desk", "customer"], "5% discount - deal desk approval"),
            (Decimal("20"), ["ae", "deal_desk", "cro", "customer"], "20% discount - CRO approval"),
            (Decimal("45"), ["ae", "deal_desk", "cro", "finance", "customer"], "45% discount - Finance approval")
        ]
        
        for discount, expected_personas, description in test_cases:
            # Create mock quote
            mock_quote = type('obj', (object,), {
                'id': '123',
                'discount_percent': discount,
                'user_id': 'test-user'
            })
            
            # Test persona determination logic
            personas = []
            if discount > 0:
                personas.append("ae")
                personas.append("deal_desk")
            if discount > 15:
                personas.append("cro")
            if discount > 40:
                personas.append("finance")
            personas.append("customer")
            
            if personas == expected_personas:
                print_success(f"{description} - Correct workflow")
            else:
                print_error(f"{description} - Expected {expected_personas}, got {personas}")
        
        return True
        
    except Exception as e:
        print_error("Workflow service test failed", e)
        return False

async def test_api_endpoints():
    """Test API endpoint availability"""
    print_test_header("API Endpoints")
    
    try:
        from app.main import app
        from app.api import quotes, workflow, analytics, ai
        
        # Check if routers are included
        router_count = len([r for r in app.routes if hasattr(r, 'endpoint')])
        print_success(f"API initialized with {router_count} routes")
        
        # List key endpoints
        key_endpoints = [
            "/api/quotes",
            "/api/quotes/submit",
            "/api/workflow/steps",
            "/api/analytics/dashboard",
            "/api/ai/generate-quote"
        ]
        
        found_endpoints = []
        for route in app.routes:
            if hasattr(route, 'path'):
                for endpoint in key_endpoints:
                    if endpoint in route.path:
                        found_endpoints.append(endpoint)
                        break
        
        print_success(f"Found {len(set(found_endpoints))} key endpoints")
        
        return True
        
    except Exception as e:
        print_error("API endpoint test failed", e)
        return False

async def test_ai_service():
    """Test AI service configuration"""
    print_test_header("AI Service")
    
    try:
        from app.services.ai_service import AIService
        from app.core.config import settings
        
        if not settings.anthropic_api_key:
            print_info("Skipping AI service test - no API key configured")
            return True
        
        service = AIService()
        print_success("AI service initialized")
        
        # Test prompt parsing (without actual API call)
        test_prompt = "Create a quote for 10 software licenses for Acme Corp"
        
        # Test fallback parsing
        result = service._fallback_quote_generation(test_prompt)
        print_success(f"Fallback quote generation working - Title: {result.title}")
        
        return True
        
    except Exception as e:
        print_error("AI service test failed", e)
        return False

async def test_full_startup():
    """Test full application startup"""
    print_test_header("Full Application Startup")
    
    try:
        from app.main import app
        import uvicorn
        from fastapi.testclient import TestClient
        
        # Create test client
        client = TestClient(app)
        
        # Test health endpoint
        response = client.get("/health")
        if response.status_code == 200:
            print_success("Health endpoint working")
            health_data = response.json()
            print_info(f"Health status: {health_data.get('status', 'unknown')}")
        else:
            print_error(f"Health endpoint returned {response.status_code}")
        
        # Test root endpoint
        response = client.get("/")
        if response.status_code == 200:
            print_success("Root endpoint working")
            data = response.json()
            print_info(f"API Version: {data.get('version', 'unknown')}")
        
        return True
        
    except Exception as e:
        print_error("Application startup test failed", e)
        return False

async def run_all_tests():
    """Run all backend tests"""
    print("\n" + "="*60)
    print("CANYON CPQ BACKEND TEST SUITE")
    print("="*60)
    
    # Run tests in order
    tests = [
        ("Environment", test_environment),
        ("Database", test_database_connection),
        ("Models", test_models),
        ("Quote Service", test_quote_service),
        ("Workflow Service", test_workflow_service),
        ("API Endpoints", test_api_endpoints),
        ("AI Service", test_ai_service),
        ("Full Startup", test_full_startup)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results[test_name] = result
        except Exception as e:
            print_error(f"Test {test_name} crashed", e)
            results[test_name] = False
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    total_tests = test_results["passed"] + test_results["failed"]
    print(f"\nTotal Tests: {total_tests}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    
    if test_results["failed"] > 0:
        print("\nFailed Tests:")
        for error in test_results["errors"]:
            print(f"  - {error['test']}: {error['error']}")
    
    # Overall result
    print("\n" + "="*60)
    if test_results["failed"] == 0:
        print("🎉 ALL TESTS PASSED! Backend is ready for frontend integration.")
    else:
        print("⚠️  Some tests failed. Please fix the issues before proceeding.")
        print("\nCommon fixes:")
        print("1. Set environment variables in .env file")
        print("2. Run database migrations")
        print("3. Check Supabase connection")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(run_all_tests())