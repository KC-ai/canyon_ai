from supabase import create_client, Client
from .config import settings
import os


def get_supabase_client() -> Client:
    """Create and return a Supabase client."""
    supabase_url = settings.supabase_url or os.getenv("SUPABASE_URL")
    supabase_service_key = settings.supabase_service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
    
    return create_client(supabase_url, supabase_service_key)


# Global client instance
supabase: Client = get_supabase_client()