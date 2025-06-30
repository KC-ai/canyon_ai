from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user, AuthUser
from app.services.analytics_service import AnalyticsService
from app.core.logging_config import get_logger

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
analytics_service = AnalyticsService()
logger = get_logger("analytics_api")

@router.get("/dashboard")
async def get_dashboard_metrics(current_user: AuthUser = Depends(get_current_user)):
    """Get dashboard metrics for current user"""
    try:
        return await analytics_service.get_dashboard_metrics(
            current_user.user_id,
            current_user.persona
        )
    except Exception as e:
        logger.error(f"Failed to get dashboard metrics: {e}")
        raise HTTPException(500, "Failed to retrieve dashboard metrics")

@router.get("/approval-times")
async def get_approval_times(current_user: AuthUser = Depends(get_current_user)):
    """Get average approval times by persona"""
    try:
        return await analytics_service.get_approval_time_metrics()
    except Exception as e:
        logger.error(f"Failed to get approval times: {e}")
        raise HTTPException(500, "Failed to retrieve approval time metrics")