from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api import quotes, workflow, analytics, ai
from app.core.errors import setup_error_handlers
from app.core.logging_config import setup_logging, RequestLoggingMiddleware
from app.core.storage import storage
from app.core.auth import get_current_user, AuthUser
from app.core.json_encoder import CustomJSONEncoder

# Initialize logging
logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Canyon CPQ API")
    
    # Initialize storage and cleanup old backups
    try:
        storage.cleanup_old_backups("quotes", keep_count=10)
        storage.cleanup_old_backups("quote_items", keep_count=10)
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize storage: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Canyon CPQ API")

# Create FastAPI app with enhanced configuration
app = FastAPI(
    title="Canyon CPQ API",
    version="1.0.0",
    description="Production-ready Configure, Price, Quote API",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    default_response_class=JSONResponse,
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS with more restrictive settings for production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-User-Persona"],
    expose_headers=["X-Request-ID"],
)

# Setup error handlers
setup_error_handlers(app)

# Health check endpoints
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint"""
    return {
        "message": "Canyon CPQ API is running",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint"""
    try:
        # Test storage connectivity
        await storage.load_data("quotes")
        return {
            "status": "healthy",
            "storage": "connected",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "storage": "disconnected",
            "error": str(e)
        }

@app.get("/api/test/protected", tags=["Testing"])
async def protected_endpoint(current_user: AuthUser = Depends(get_current_user)):
    """Test endpoint for authentication"""
    return {
        "message": "This is a protected endpoint - authenticated!",
        "user_id": current_user.user_id,
        "email": current_user.email,
        "role": current_user.role,
        "authenticated_at": current_user.authenticated_at.isoformat()
    }

# Development endpoint (bypasses all authentication)
@app.get("/api/dev/quotes")
async def get_dev_quotes():
    """Development-only endpoint to test quote loading without auth"""
    import os
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    from app.services.quote_service import QuoteService
    
    user_id = "00000000-0000-0000-0000-000000000123"
    try:
        quote_service = QuoteService()
        quotes = await quote_service.get_quotes_for_user(user_id, "ae")
        
        # Disable automatic sample data creation to prevent quote recreation
        # if total_count == 0:
        #     await QuoteService.add_sample_data(user_id)
        #     quotes = await QuoteService.get_quotes(user_id, 0, 10)
        #     total_count = await QuoteService.get_quote_count(user_id)
        
        return quotes
    except Exception as e:
        logger.error(f"Dev endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Development quote endpoints
@app.get("/api/dev/quotes/{quote_id}")
async def get_dev_quote(quote_id: str):
    """Development-only endpoint to get a specific quote without auth"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    from app.core.storage import storage
    
    try:
        # Get quote directly from storage without user filtering for dev
        quotes_data = await storage.load_data("quotes")
        if quote_id not in quotes_data:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        quote_data = quotes_data[quote_id]
        
        # Also load quote items
        items_data = await storage.load_data("quote_items")
        items = [item for item in items_data.values() if item["quote_id"] == quote_id]
        quote_data["items"] = items
        
        return quote_data
    except Exception as e:
        logger.error(f"Dev quote endpoint error: {e}")
        raise HTTPException(status_code=404, detail="Quote not found")

@app.put("/api/dev/quotes/{quote_id}")
async def update_dev_quote(quote_id: str, quote_update: dict):
    """Development-only endpoint to update a quote without auth"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    from app.core.storage import storage
    from datetime import datetime
    
    try:
        # Get current quote from storage
        quotes_data = await storage.load_data("quotes")
        if quote_id not in quotes_data:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Update the quote data
        quote_data = quotes_data[quote_id]
        for key, value in quote_update.items():
            if key in quote_data:
                quote_data[key] = value
        
        # Update timestamp
        quote_data["updated_at"] = datetime.now().isoformat()
        
        # Save back to storage
        quotes_data[quote_id] = quote_data
        await storage.save_data("quotes", quotes_data)
        
        # Return updated quote with items
        items_data = await storage.load_data("quote_items")
        items = [item for item in items_data.values() if item["quote_id"] == quote_id]
        quote_data["items"] = items
        
        return quote_data
    except Exception as e:
        logger.error(f"Dev quote update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/dev/quotes")
async def create_dev_quote(quote_create: dict):
    """Development-only endpoint to create a quote without auth"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    from app.services.quote_service import QuoteService
    from app.models.quotes import QuoteCreate
    
    user_id = "00000000-0000-0000-0000-000000000123"
    try:
        # Convert dict to QuoteCreate model
        create_data = QuoteCreate(**quote_create)
        quote_service = QuoteService()
        quote = await quote_service.create_quote(user_id, create_data)
        return quote
    except Exception as e:
        logger.error(f"Dev quote create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/dev/quotes/{quote_id}")
async def delete_dev_quote(quote_id: str):
    """Development-only endpoint to delete a quote without auth"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    from app.core.storage import storage
    
    try:
        # Delete from storage
        quotes_data = await storage.load_data("quotes")
        if quote_id not in quotes_data:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        del quotes_data[quote_id]
        await storage.save_data("quotes", quotes_data)
        
        # Also delete quote items
        items_data = await storage.load_data("quote_items")
        items_to_delete = [item_id for item_id, item in items_data.items() if item["quote_id"] == quote_id]
        for item_id in items_to_delete:
            del items_data[item_id]
        await storage.save_data("quote_items", items_data)
        
        return {"message": "Quote deleted successfully"}
    except Exception as e:
        logger.error(f"Dev quote delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/dev/workflows/{workflow_id}")
async def update_dev_workflow(workflow_id: str, workflow_update: dict):
    """Development-only endpoint to update a workflow without auth"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    from app.core.storage import storage
    from datetime import datetime
    
    try:
        # Return a mock successful workflow update
        return {
            "id": workflow_id,
            "quote_id": "unknown",
            "user_id": "dev-user",
            "name": "Updated Workflow",
            "description": "Workflow updated successfully in dev mode",
            "status": "draft",
            "steps": workflow_update.get("steps", []),
            "is_active": True,
            "auto_start": False,
            "allow_parallel_steps": False,
            "require_all_approvals": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Dev workflow update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/dev/workflows")
async def create_dev_workflow(workflow_create: dict):
    """Development-only endpoint to create a workflow without auth"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    from datetime import datetime
    import uuid
    
    try:
        # For now, just return success without actually creating
        workflow_id = str(uuid.uuid4())
        return {
            "id": workflow_id,
            "message": "Workflow created successfully (dev mode)",
            "created_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Dev workflow create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Development workflow endpoint
@app.get("/api/dev/workflows")
async def get_dev_workflows():
    """Development-only endpoint to test workflow loading without auth"""
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(status_code=403, detail="Not available")
    
    try:
        # For now, return empty list as workflows API is not fully implemented
        return []
    except Exception as e:
        logger.error(f"Dev workflow endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include API routers
app.include_router(quotes.router)
app.include_router(workflow.router)
app.include_router(analytics.router)
app.include_router(ai.router)