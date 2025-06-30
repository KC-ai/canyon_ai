import logging
import logging.config
import os
import sys
from datetime import datetime
from pathlib import Path
import uuid
from fastapi import Request

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Logging configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "detailed": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        },
        "simple": {
            "format": "%(levelname)s | %(message)s"
        },
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(funcName)s %(lineno)d %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "detailed",
            "stream": sys.stdout
        },
        "file_detailed": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "detailed",
            "filename": LOGS_DIR / "app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "encoding": "utf-8"
        },
        "file_errors": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "ERROR",
            "formatter": "detailed",
            "filename": LOGS_DIR / "errors.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 10,
            "encoding": "utf-8"
        },
        "file_access": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "INFO",
            "formatter": "json",
            "filename": LOGS_DIR / "access.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "encoding": "utf-8"
        }
    },
    "loggers": {
        "app": {
            "level": "DEBUG",
            "handlers": ["console", "file_detailed", "file_errors"],
            "propagate": False
        },
        "app.access": {
            "level": "INFO",
            "handlers": ["file_access"],
            "propagate": False
        },
        "uvicorn": {
            "level": "INFO",
            "handlers": ["console", "file_detailed"],
            "propagate": False
        },
        "uvicorn.access": {
            "level": "INFO",
            "handlers": ["file_access"],
            "propagate": False
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file_detailed"]
    }
}

def setup_logging():
    """Initialize logging configuration"""
    # Determine log level from environment
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Adjust console handler level based on environment
    if os.getenv("ENVIRONMENT") == "production":
        LOGGING_CONFIG["handlers"]["console"]["level"] = "WARNING"
    else:
        LOGGING_CONFIG["handlers"]["console"]["level"] = log_level
    
    # Apply configuration
    logging.config.dictConfig(LOGGING_CONFIG)
    
    # Get the main app logger
    logger = logging.getLogger("app")
    logger.info(f"Logging initialized with level: {log_level}")
    
    return logger

class RequestLoggingMiddleware:
    """Middleware to log HTTP requests with correlation IDs"""
    
    def __init__(self, app):
        self.app = app
        self.access_logger = logging.getLogger("app.access")
        self.error_logger = logging.getLogger("app")
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope)
        request_id = str(uuid.uuid4())
        
        # Add request ID to state for error handlers
        request.state.request_id = request_id
        
        start_time = datetime.utcnow()
        
        # Log request start
        self.access_logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
                "start_time": start_time.isoformat()
            }
        )
        
        # Capture response
        response_status = 500
        response_size = 0
        
        async def send_wrapper(message):
            nonlocal response_status, response_size
            if message["type"] == "http.response.start":
                response_status = message["status"]
            elif message["type"] == "http.response.body":
                response_size += len(message.get("body", b""))
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            self.error_logger.error(
                f"Request failed: {type(e).__name__}: {str(e)}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error_type": type(e).__name__
                }
            )
            raise
        finally:
            # Log request completion
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            self.access_logger.info(
                "Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response_status,
                    "response_size": response_size,
                    "duration_seconds": duration,
                    "end_time": end_time.isoformat()
                }
            )

def get_logger(name: str = None) -> logging.Logger:
    """Get a configured logger instance"""
    if name:
        return logging.getLogger(f"app.{name}")
    return logging.getLogger("app")