from fastapi import HTTPException, Depends, status, Header
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
    def __init__(self, user_id: str, email: str, role: str = "user", persona: str = "ae"):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.persona = persona
        self.authenticated_at = datetime.utcnow()

async def verify_token(token: str) -> AuthUser:
    """Verify JWT token and return user information"""
    try:
        # Development mode bypass
        if os.getenv("ENVIRONMENT") == "development" and token.startswith("dev-token-"):
            user_id = token.replace("dev-token-", "")
            logger.debug(f"Using development token for user: {user_id}")
            return AuthUser(
                user_id=user_id,
                email=f"{user_id}@dev.local",
                role="user",
                persona="ae"
            )
        
        # For development, accept Supabase tokens without strict validation
        if os.getenv("ENVIRONMENT") == "development":
            try:
                # Try to decode without verification first for development
                payload = jwt.decode(
                    token, 
                    options={"verify_signature": False}  # Skip signature verification in dev
                )
                
                user_id = payload.get("sub")
                email = payload.get("email") 
                role = payload.get("role", "user")
                
                # Try to get persona from user_metadata or app_metadata
                user_metadata = payload.get("user_metadata", {})
                app_metadata = payload.get("app_metadata", {})
                persona = user_metadata.get("persona") or app_metadata.get("persona") or "ae"
                
                if user_id:
                    logger.debug(f"Development mode: Accepting token for user {user_id}")
                    
                    # Auto-create user in development mode too
                    try:
                        from app.core.database import get_supabase_client
                        db_client = get_supabase_client()
                        
                        existing = db_client.table('users').select('id').eq('id', user_id).execute()
                        if not existing.data:
                            # Get metadata from payload
                            full_name = user_metadata.get('full_name') or user_metadata.get('name') or email.split('@')[0]
                            avatar_url = user_metadata.get('avatar_url') or user_metadata.get('picture') or ''
                            
                            user_data = {
                                'id': user_id,
                                'email': email or f"{user_id}@example.com",
                                'full_name': full_name,
                                'avatar_url': avatar_url,
                                'persona': persona  # Include persona from token
                            }
                            db_client.table('users').insert(user_data).execute()
                            logger.info(f"Created user {user_id} in database (dev mode)")
                    except Exception as e:
                        logger.error(f"Error creating user in dev mode: {e}")
                    
                    return AuthUser(
                        user_id=user_id, 
                        email=email or f"{user_id}@example.com", 
                        role=role,
                        persona=persona
                    )
            except Exception as e:
                logger.warning(f"Development token decode failed: {e}")
        
        # Production JWT verification
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            options={
                "verify_exp": True,
                "verify_aud": False,
                "verify_iss": False
            }
        )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "user")
        
        # Try to get persona from user_metadata or app_metadata
        user_metadata = payload.get("user_metadata", {})
        app_metadata = payload.get("app_metadata", {})
        persona = user_metadata.get("persona") or app_metadata.get("persona") or "ae"
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload - missing user ID"
            )
        
        # Check if user exists in users table and create if not
        try:
            from app.core.database import get_supabase_client
            db_client = get_supabase_client()
            
            # Check if user exists
            existing_user = db_client.table('users').select('id').eq('id', user_id).execute()
            
            if not existing_user.data:
                # User doesn't exist, create them
                logger.info(f"Creating new user in database: {user_id}")
                
                # Get full name from token metadata
                full_name = user_metadata.get('full_name') or user_metadata.get('name') or email.split('@')[0]
                avatar_url = user_metadata.get('avatar_url') or user_metadata.get('picture') or ''
                
                # Create user in users table
                user_data = {
                    'id': user_id,
                    'email': email or f"{user_id}@example.com",
                    'full_name': full_name,
                    'avatar_url': avatar_url,
                    'persona': persona  # Include persona from token
                }
                
                db_client.table('users').insert(user_data).execute()
                logger.info(f"Created user {user_id} in database")
                
        except Exception as e:
            logger.error(f"Error checking/creating user: {e}")
            # Don't fail auth if user creation fails, just log it
        
        return AuthUser(
            user_id=user_id, 
            email=email or f"{user_id}@example.com", 
            role=role,
            persona=persona
        )
        
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
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    persona: Optional[str] = Header(None, alias="X-User-Persona")
) -> AuthUser:
    """Dependency to get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await verify_token(credentials.credentials)
    
    # Override persona if provided in header
    if persona and persona in ["ae", "deal_desk", "cro", "legal", "finance"]:
        user.persona = persona
    
    return user

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