from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Any, Dict, Optional
from datetime import datetime
import traceback
import uuid

logger = logging.getLogger(__name__)

class QuoteError(Exception):
    """Base exception for quote-related errors"""
    def __init__(self, message: str, error_code: str = "QUOTE_ERROR", details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class QuoteNotFoundError(QuoteError):
    def __init__(self, quote_id: str):
        super().__init__(
            f"Quote with ID {quote_id} not found",
            "QUOTE_NOT_FOUND",
            {"quote_id": quote_id}
        )

class QuoteValidationError(QuoteError):
    def __init__(self, field: str, message: str):
        super().__init__(
            f"Validation error for {field}: {message}",
            "QUOTE_VALIDATION_ERROR",
            {"field": field, "validation_message": message}
        )

class QuotePermissionError(QuoteError):
    def __init__(self, user_id: str, quote_id: str):
        super().__init__(
            f"User {user_id} does not have permission to access quote {quote_id}",
            "QUOTE_PERMISSION_ERROR",
            {"user_id": user_id, "quote_id": quote_id}
        )

class StorageError(QuoteError):
    def __init__(self, operation: str, details: str):
        super().__init__(
            f"Storage error during {operation}: {details}",
            "STORAGE_ERROR",
            {"operation": operation, "details": details}
        )

def create_error_response(
    status_code: int,
    message: str,
    error_code: str = "INTERNAL_ERROR",
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create standardized error response"""
    return {
        "error": {
            "code": error_code,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request_id
        }
    }

async def quote_error_handler(request: Request, exc: QuoteError) -> JSONResponse:
    """Handle custom quote errors"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    logger.warning(
        f"Quote error: {exc.error_code} - {exc.message}",
        extra={
            "error_code": exc.error_code,
            "details": exc.details,
            "request_id": request_id,
            "path": request.url.path
        }
    )
    
    # Map error types to HTTP status codes
    status_map = {
        "QUOTE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "QUOTE_VALIDATION_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "QUOTE_PERMISSION_ERROR": status.HTTP_403_FORBIDDEN,
        "STORAGE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    status_code = status_map.get(exc.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return JSONResponse(
        status_code=status_code,
        content=create_error_response(
            status_code=status_code,
            message=exc.message,
            error_code=exc.error_code,
            details=exc.details,
            request_id=request_id
        )
    )

async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    # Extract validation details
    validation_details = []
    for error in exc.errors():
        validation_details.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        f"Validation error: {len(validation_details)} field(s)",
        extra={
            "validation_errors": validation_details,
            "request_id": request_id,
            "path": request.url.path
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Request validation failed",
            error_code="VALIDATION_ERROR",
            details={"validation_errors": validation_details},
            request_id=request_id
        )
    )

async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    logger.warning(
        f"HTTP error {exc.status_code}: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "request_id": request_id,
            "path": request.url.path
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            status_code=exc.status_code,
            message=str(exc.detail),
            error_code="HTTP_ERROR",
            request_id=request_id
        )
    )

async def general_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    # Log full traceback for debugging
    logger.error(
        f"Unexpected error: {type(exc).__name__}: {str(exc)}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "traceback": traceback.format_exc()
        }
    )
    
    # Don't expose internal error details in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An internal server error occurred",
            error_code="INTERNAL_ERROR",
            request_id=request_id
        )
    )

def setup_error_handlers(app):
    """Set up all error handlers for the FastAPI app"""
    app.add_exception_handler(QuoteError, quote_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, general_error_handler)