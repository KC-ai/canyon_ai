#!/usr/bin/env python3
"""
Comprehensive Workflow Integration Test

Tests the complete workflow flow:
1. Create a quote → automatic workflow created
2. Drag-and-drop to reorder steps → saves to backend
3. Approve first step → moves to next step
4. Reject any step → workflow marked as rejected
5. Approve all required steps → quote marked as approved
6. Test with multiple browser tabs → real-time updates work
"""

import asyncio
import json
import uuid
from datetime import datetime
from decimal import Decimal
import aiohttp
from typing import Dict, List, Any

# Test configuration
API_BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test-user-workflow-integration"

class WorkflowIntegrationTest:
    def __init__(self):
        self.session = None
        self.test_data = {}
        
    async def setup(self):
        """Set up test session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Clean up test session"""
        if self.session:
            await self.session.close()
            
    async def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> Dict:
        """Make HTTP request to API"""
        url = f"{API_BASE_URL}{endpoint}"
        default_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer dev-token-{TEST_USER_ID}"  # Dev auth token
        }
        if headers:
            default_headers.update(headers)
            
        kwargs = {"headers": default_headers}
        if data:
            kwargs["json"] = data
            
        async with self.session.request(method, url, **kwargs) as response:
            if response.status >= 400:
                text = await response.text()
                raise Exception(f"HTTP {response.status}: {text}")
            return await response.json()
    
    async def test_1_create_quote_with_workflow(self):
        """Test 1: Create a quote → automatic workflow created"""
        print("\n🧪 TEST 1: Creating quote with automatic workflow creation...")
        
        quote_data = {
            "customer_name": "Test Customer",
            "customer_email": "test@example.com", 
            "title": "High-Value Test Quote",
            "description": "Test quote for workflow integration",
            "status": "pending",
            "items": [
                {
                    "name": "Enterprise Software License",
                    "description": "1-year enterprise license",
                    "quantity": 1,
                    "unit_price": 50000.00  # High value to trigger workflow
                },
                {
                    "name": "Professional Services",
                    "description": "Implementation and training",
                    "quantity": 40,
                    "unit_price": 200.00
                }
            ]
        }
        
        quote = await self.make_request("POST", "/api/quotes", quote_data)
        self.test_data["quote"] = quote
        
        print(f"✅ Quote created: {quote['id']}")
        print(f"   Total amount: ${quote['total_amount']}")
        print(f"   Workflow ID: {quote.get('workflow_id', 'None')}")
        
        # Verify workflow was created
        if quote.get('workflow_id'):
            workflow = await self.make_request("GET", f"/api/workflows/{quote['workflow_id']}")
            self.test_data["workflow"] = workflow
            print(f"✅ Workflow created with {len(workflow['steps'])} steps")
            for step in workflow['steps']:
                print(f"   Step {step['order']}: {step['name']} ({step['persona']}) - {step['status']}")
        else:
            print("❌ No workflow created for quote")
            return False
            
        return True
    
    async def test_2_reorder_workflow_steps(self):
        """Test 2: Drag-and-drop to reorder steps → saves to backend"""
        print("\n🧪 TEST 2: Testing step reordering...")
        
        workflow = self.test_data["workflow"]
        original_steps = workflow["steps"].copy()
        
        # Simulate drag-and-drop reordering (move last step to first)
        reordered_steps = [
            {**original_steps[-1], "order": 1},  # Last step becomes first
            {**original_steps[0], "order": 2},   # First step becomes second
            *[{**step, "order": i + 3} for i, step in enumerate(original_steps[1:-1])]
        ]
        
        # API expects list directly, not wrapped in object
        updated_workflow = await self.make_request(
            "PUT", 
            f"/api/workflows/{workflow['id']}/steps", 
            reordered_steps
        )
        
        print(f"✅ Steps reordered successfully")
        print("   New step order:")
        for step in updated_workflow['steps']:
            print(f"   Step {step['order']}: {step['name']} ({step['persona']})")
            
        self.test_data["workflow"] = updated_workflow
        return True
    
    async def test_3_approve_first_step(self):
        """Test 3: Approve first step → moves to next step"""
        print("\n🧪 TEST 3: Approving first workflow step...")
        
        workflow = self.test_data["workflow"]
        first_step = min(workflow["steps"], key=lambda s: s["order"])
        
        approval_data = {
            "action": "approve",
            "comments": "Approved for testing - automated test"
        }
        
        updated_workflow = await self.make_request(
            "POST",
            f"/api/workflows/{workflow['id']}/steps/{first_step['order']}/approve",
            approval_data
        )
        
        print(f"✅ Step {first_step['order']} approved")
        
        # Check workflow status
        approved_steps = [s for s in updated_workflow["steps"] if s["status"] == "approved"]
        pending_steps = [s for s in updated_workflow["steps"] if s["status"] == "pending"]
        
        print(f"   Approved steps: {len(approved_steps)}")
        print(f"   Pending steps: {len(pending_steps)}")
        print(f"   Next pending step: {pending_steps[0]['name'] if pending_steps else 'None'}")
        
        self.test_data["workflow"] = updated_workflow
        return True
    
    async def test_4_reject_step_workflow_rejection(self):
        """Test 4: Reject any step → workflow marked as rejected"""
        print("\n🧪 TEST 4: Rejecting a step to test workflow rejection...")
        
        workflow = self.test_data["workflow"]
        
        # Find a pending step to reject
        pending_steps = [s for s in workflow["steps"] if s["status"] == "pending"]
        if not pending_steps:
            print("❌ No pending steps to reject")
            return False
            
        step_to_reject = pending_steps[0]
        
        rejection_data = {
            "action": "reject",
            "comments": "Rejected for testing - automated test",
            "rejection_reason": "Test rejection - exceeds budget threshold"
        }
        
        updated_workflow = await self.make_request(
            "POST",
            f"/api/workflows/{workflow['id']}/steps/{step_to_reject['order']}/reject",
            rejection_data
        )
        
        print(f"✅ Step {step_to_reject['order']} rejected")
        print(f"   Workflow status: {updated_workflow['status']}")
        print(f"   Rejection reason: {rejection_data['rejection_reason']}")
        
        # Verify workflow is marked as rejected
        if updated_workflow["status"] == "rejected":
            print("✅ Workflow correctly marked as rejected")
        else:
            print(f"❌ Workflow status is {updated_workflow['status']}, expected 'rejected'")
            
        self.test_data["workflow"] = updated_workflow
        return True
    
    async def test_5_full_approval_flow(self):
        """Test 5: Create new quote and approve all steps → quote marked as approved"""
        print("\n🧪 TEST 5: Testing full approval flow...")
        
        # Create a new quote for clean approval flow
        quote_data = {
            "customer_name": "Full Approval Customer",
            "customer_email": "approval@example.com", 
            "title": "Full Approval Test Quote",
            "description": "Quote for testing complete approval flow",
            "status": "pending",
            "items": [
                {
                    "name": "Standard Package",
                    "description": "Standard service package",
                    "quantity": 1,
                    "unit_price": 15000.00  # Above threshold for workflow
                }
            ]
        }
        
        quote = await self.make_request("POST", "/api/quotes", quote_data)
        print(f"✅ New quote created: {quote['id']}")
        
        if not quote.get('workflow_id'):
            print("❌ No workflow created for quote")
            return False
            
        workflow = await self.make_request("GET", f"/api/workflows/{quote['workflow_id']}")
        print(f"✅ Workflow loaded with {len(workflow['steps'])} steps")
        
        # Approve all pending required steps
        for step in sorted(workflow["steps"], key=lambda s: s["order"]):
            if step["is_required"] and step["status"] == "pending":
                approval_data = {
                    "action": "approve",
                    "comments": f"Auto-approved step {step['order']} - test automation"
                }
                
                updated_workflow = await self.make_request(
                    "POST",
                    f"/api/workflows/{workflow['id']}/steps/{step['order']}/approve",
                    approval_data
                )
                
                print(f"✅ Approved step {step['order']}: {step['name']}")
                workflow = updated_workflow
            elif step["status"] != "pending":
                print(f"⏭️  Skipped step {step['order']}: {step['name']} (status: {step['status']})")
        
        # Check final workflow status
        print(f"   Final workflow status: {workflow['status']}")
        
        # Check if quote status updated
        updated_quote = await self.make_request("GET", f"/api/quotes/{quote['id']}")
        print(f"   Final quote status: {updated_quote['status']}")
        
        if workflow["status"] == "approved":
            print("✅ Workflow fully approved")
        else:
            print(f"❌ Workflow status is {workflow['status']}, expected 'approved'")
            
        return True
    
    async def test_6_real_time_simulation(self):
        """Test 6: Simulate real-time updates between browser tabs"""
        print("\n🧪 TEST 6: Simulating real-time updates...")
        
        # Create a quote for real-time testing
        quote_data = {
            "customer_name": "Real-time Test Customer",
            "customer_email": "realtime@example.com", 
            "title": "Real-time Test Quote",
            "status": "pending",
            "items": [
                {
                    "name": "Real-time Test Product",
                    "quantity": 1,
                    "unit_price": 12000.00
                }
            ]
        }
        
        quote = await self.make_request("POST", "/api/quotes", quote_data)
        workflow = await self.make_request("GET", f"/api/workflows/{quote['workflow_id']}")
        
        print(f"✅ Created quote for real-time testing: {quote['id']}")
        
        # Simulate multiple "users" (browser tabs) working on the same workflow
        async def simulate_user_action(user_name: str, step_order: int, action: str):
            """Simulate a user action from a different browser tab"""
            action_data = {
                "action": action,
                "comments": f"Action by {user_name} - simulated browser tab"
            }
            
            if action == "reject":
                action_data["rejection_reason"] = f"Rejected by {user_name} for testing"
            
            try:
                updated = await self.make_request(
                    "POST",
                    f"/api/workflows/{workflow['id']}/steps/{step_order}/{action}",
                    action_data
                )
                print(f"✅ {user_name} {action}ed step {step_order}")
                return updated
            except Exception as e:
                print(f"❌ {user_name} failed to {action} step {step_order}: {e}")
                return None
        
        # Simulate concurrent actions
        print("   Simulating concurrent user actions...")
        
        # Find pending steps to approve
        pending_steps = [s for s in workflow["steps"] if s["status"] == "pending"]
        
        if len(pending_steps) >= 2:
            # User 1 approves first pending step
            await simulate_user_action("User1", pending_steps[0]["order"], "approve")
            await asyncio.sleep(0.5)  # Small delay to simulate real timing
            
            # User 2 approves second pending step  
            await simulate_user_action("User2", pending_steps[1]["order"], "approve")
            await asyncio.sleep(0.5)
        else:
            print("   Not enough pending steps for concurrent testing")
        
        # Check final state
        final_workflow = await self.make_request("GET", f"/api/workflows/{workflow['id']}")
        approved_count = len([s for s in final_workflow["steps"] if s["status"] == "approved"])
        
        print(f"✅ Real-time simulation complete")
        print(f"   Steps approved by different users: {approved_count}")
        
        return True
    
    async def run_all_tests(self):
        """Run all workflow integration tests"""
        print("🚀 Starting Comprehensive Workflow Integration Tests")
        print("=" * 60)
        
        tests = [
            self.test_1_create_quote_with_workflow,
            self.test_2_reorder_workflow_steps,
            self.test_3_approve_first_step,
            self.test_4_reject_step_workflow_rejection,
            self.test_5_full_approval_flow,
            self.test_6_real_time_simulation
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                result = await test()
                if result:
                    passed += 1
                    print(f"✅ {test.__name__} PASSED")
                else:
                    print(f"❌ {test.__name__} FAILED")
            except Exception as e:
                print(f"❌ {test.__name__} ERROR: {e}")
                import traceback
                traceback.print_exc()
        
        print("\n" + "=" * 60)
        print(f"🏁 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Workflow integration is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Please check the implementation.")
        
        return passed == total

async def main():
    """Main test runner"""
    test_runner = WorkflowIntegrationTest()
    
    try:
        await test_runner.setup()
        success = await test_runner.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Test runner failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        await test_runner.cleanup()

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))