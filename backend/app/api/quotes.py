from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List
from app.models.quotes import Quote, QuoteCreate, QuoteWithWorkflowCreate, QuoteUpdate, QuoteListResponse
from app.services.quote_service import QuoteService
from app.core.auth import get_current_user_id, AuthUser, get_current_user, get_current_user_id_dev
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger("quotes_api")


@router.get("/", response_model=QuoteListResponse)
async def get_quotes(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of items to return"),
    user_id: str = Depends(get_current_user_id)
):
    """Get paginated list of quotes for the current user"""
    try:
        logger.info(f"Fetching quotes for user {user_id}", extra={
            "user_id": user_id,
            "skip": skip,
            "limit": limit
        })
        
        # Get quotes and total count
        quotes = await QuoteService.get_quotes(user_id, skip, limit)
        total_count = await QuoteService.get_quote_count(user_id)
        
        # Disable automatic sample data creation to prevent quote recreation
        # if total_count == 0:
        #     await QuoteService.add_sample_data(user_id)
        #     quotes = await QuoteService.get_quotes(user_id, skip, limit)
        #     total_count = await QuoteService.get_quote_count(user_id)
        
        page = (skip // limit) + 1
        
        return QuoteListResponse(
            quotes=quotes,
            total=total_count,
            page=page,
            limit=limit,
            has_next=(skip + limit) < total_count,
            has_prev=skip > 0
        )
        
    except Exception as e:
        logger.error(f"Failed to get quotes for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve quotes"
        )


@router.post("/", response_model=Quote, status_code=status.HTTP_201_CREATED)
async def create_quote(
    quote_data: QuoteCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new quote"""
    logger.info(f"Creating quote for user {user_id}", extra={
        "user_id": user_id,
        "quote_title": quote_data.title
    })
    
    quote = await QuoteService.create_quote(quote_data, user_id)
    
    logger.info(f"Quote created successfully: {quote.id}", extra={
        "quote_id": quote.id,
        "user_id": user_id
    })
    
    return quote


@router.post("/with-workflow", response_model=Quote, status_code=status.HTTP_201_CREATED)
async def create_quote_with_workflow(
    quote_data: QuoteWithWorkflowCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new quote with custom workflow"""
    logger.info(f"Creating quote with workflow for user {user_id}", extra={
        "user_id": user_id,
        "quote_title": quote_data.title,
        "has_workflow": quote_data.workflow is not None
    })
    
    # Extract workflow data
    workflow_config = quote_data.workflow
    quote_create_data = QuoteCreate(
        customer_name=quote_data.customer_name,
        customer_email=quote_data.customer_email,
        title=quote_data.title,
        description=quote_data.description,
        status=quote_data.status,
        valid_until=quote_data.valid_until,
        items=quote_data.items
    )
    
    # Create quote with custom workflow
    quote = await QuoteService.create_quote_with_workflow(quote_create_data, workflow_config, user_id)
    
    logger.info(f"Quote with workflow created successfully: {quote.id}", extra={
        "quote_id": quote.id,
        "user_id": user_id,
        "workflow_id": quote.workflow_id
    })
    
    return quote


@router.get("/{quote_id}", response_model=Quote)
async def get_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific quote by ID"""
    logger.debug(f"Fetching quote {quote_id} for user {user_id}")
    
    quote = await QuoteService.get_quote(quote_id, user_id)
    
    logger.debug(f"Quote fetched successfully: {quote_id}")
    return quote


@router.put("/{quote_id}", response_model=Quote)
async def update_quote(
    quote_id: str,
    quote_update: QuoteUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update a specific quote"""
    logger.info(f"Updating quote {quote_id} for user {user_id}")
    
    quote = await QuoteService.update_quote(quote_id, quote_update, user_id)
    
    logger.info(f"Quote updated successfully: {quote_id}")
    return quote


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a specific quote"""
    logger.info(f"Deleting quote {quote_id} for user {user_id}")
    
    await QuoteService.delete_quote(quote_id, user_id)
    
    logger.info(f"Quote deleted successfully: {quote_id}")
    # Return 204 No Content for successful deletion


# Development-only endpoints (bypass authentication)
@router.get("/dev", response_model=QuoteListResponse)
async def get_quotes_dev(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of items to return")
):
    """Development endpoint - Get quotes without authentication"""
    import os
    
    # Check if development mode is enabled
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development endpoint not available"
        )
    
    user_id = "dev-user-123"
    logger.info(f"Development mode: Fetching quotes for dev user {user_id}")
    
    try:
        # Get quotes and total count
        quotes = await QuoteService.get_quotes(user_id, skip, limit)
        total_count = await QuoteService.get_quote_count(user_id)
        
        # Disable automatic sample data creation to prevent quote recreation
        # if total_count == 0:
        #     await QuoteService.add_sample_data(user_id)
        #     quotes = await QuoteService.get_quotes(user_id, skip, limit)
        #     total_count = await QuoteService.get_quote_count(user_id)
        
        page = (skip // limit) + 1
        
        return QuoteListResponse(
            quotes=quotes,
            total=total_count,
            page=page,
            limit=limit,
            has_next=(skip + limit) < total_count,
            has_prev=skip > 0
        )
        
    except Exception as e:
        logger.error(f"Failed to get quotes for dev user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve quotes"
        )