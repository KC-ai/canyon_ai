from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.api import quotes
from app.core.errors import setup_error_handlers
from app.core.logging_config import setup_logging, RequestLoggingMiddleware
from app.core.storage import storage
from app.core.auth import get_current_user, AuthUser

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
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS with more restrictive settings for production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
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
    from app.models.quotes import QuoteListResponse
    
    user_id = "dev-user-123"
    try:
        quotes = await QuoteService.get_quotes(user_id, 0, 10)
        total_count = await QuoteService.get_quote_count(user_id)
        
        if total_count == 0:
            await QuoteService.add_sample_data(user_id)
            quotes = await QuoteService.get_quotes(user_id, 0, 10)
            total_count = await QuoteService.get_quote_count(user_id)
        
        return QuoteListResponse(
            quotes=quotes,
            total=total_count,
            page=1,
            limit=10,
            has_next=total_count > 10,
            has_prev=False
        )
    except Exception as e:
        logger.error(f"Dev endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include API routers
app.include_router(quotes.router, prefix="/api/quotes", tags=["Quotes"])

from app.api import workflows
app.include_router(workflows.router, prefix="/api/workflows", tags=["Workflows"])