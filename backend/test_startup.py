#!/usr/bin/env python3
"""
Quick startup test for Canyon CPQ backend
Run this to ensure the backend starts without errors
"""

import sys
import os
import time
import subprocess
import requests

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_backend_startup():
    """Test that the backend starts up correctly"""
    print("Starting Canyon CPQ Backend...")
    
    # Start the backend server
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(5)
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ Backend started successfully!")
            print(f"   Health check: {response.json()}")
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            
        # Test root endpoint
        response = requests.get("http://localhost:8000/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Version: {data.get('version')}")
            print(f"   Environment: {data.get('environment')}")
        
        # Test docs endpoint (if in development)
        response = requests.get("http://localhost:8000/docs")
        if response.status_code == 200:
            print("✅ API documentation available at http://localhost:8000/docs")
        
    except Exception as e:
        print(f"❌ Failed to connect to backend: {e}")
    finally:
        # Stop the server
        process.terminate()
        process.wait()
        print("\nBackend stopped.")

if __name__ == "__main__":
    test_backend_startup()