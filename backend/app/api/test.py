from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

@router.get("/protected")
async def protected_endpoint(current_user = Depends(get_current_user)):
    return {
        "message": "This is a protected endpoint",
        "user_id": current_user.id,
        "user_email": current_user.email
    }