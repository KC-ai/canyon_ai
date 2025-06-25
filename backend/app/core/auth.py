from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from typing import Optional
import jwt
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET]):
    raise ValueError("Missing required Supabase environment variables")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer(auto_error=False)

class AuthUser:
    def __init__(self, user_id: str, email: str, role: str = "user"):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.authenticated_at = datetime.utcnow()

async def verify_token(token: str) -> AuthUser:
    """Verify JWT token and return user information"""
    try:
        # Decode JWT token with Supabase-compatible options
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            options={
                "verify_exp": True,
                "verify_aud": False,  # Skip audience verification for Supabase tokens
                "verify_iss": False   # Skip issuer verification for development
            }
        )
        
        # Extract user information
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "user")
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # In development mode, skip Supabase token verification for test tokens
        if os.getenv("ENVIRONMENT") != "development":
            # Verify token is still valid in Supabase (production only)
            try:
                user_response = supabase.auth.get_user(token)
                if not user_response.user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token not valid in auth system"
                    )
            except Exception as e:
                logger.warning(f"Token verification failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token verification failed"
                )
        else:
            logger.debug("Development mode: Skipping Supabase token verification")
        
        return AuthUser(user_id=user_id, email=email, role=role)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthUser:
    """Dependency to get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return await verify_token(credentials.credentials)

async def get_current_user_id(current_user: AuthUser = Depends(get_current_user)) -> str:
    """Get current user ID - backward compatibility function"""
    return current_user.user_id

async def get_current_user_id_dev() -> str:
    """Development mode user ID - bypasses authentication"""
    if os.getenv("ENVIRONMENT") == "development":
        return "dev-user-123"
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Development mode not enabled"
        )

# Optional: Admin role check
async def require_admin(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user