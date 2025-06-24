from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from app.models.quotes import Quote, QuoteCreate, QuoteUpdate, QuoteListResponse
from app.services.quote_service import QuoteService

router = APIRouter()

# Mock user for now (in real app, get from auth)
def get_current_user_id() -> str:
    return "user-123"


@router.get("/", response_model=QuoteListResponse)
async def get_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    user_id: str = Depends(get_current_user_id)
):
    """Get list of quotes for the current user"""
    quotes = QuoteService.get_quotes(user_id, skip, limit)
    
    # Add sample data if no quotes exist
    if not quotes:
        QuoteService.add_sample_data(user_id)
        quotes = QuoteService.get_quotes(user_id, skip, limit)
    
    return QuoteListResponse(
        quotes=quotes,
        total=len(quotes),
        page=skip // limit + 1,
        limit=limit
    )


@router.post("/", response_model=Quote)
async def create_quote(
    quote_data: QuoteCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new quote"""
    try:
        quote = QuoteService.create_quote(quote_data, user_id)
        return quote
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{quote_id}", response_model=Quote)
async def get_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific quote by ID"""
    quote = QuoteService.get_quote(quote_id, user_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.put("/{quote_id}", response_model=Quote)
async def update_quote(
    quote_id: str,
    quote_update: QuoteUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update a specific quote"""
    quote = QuoteService.update_quote(quote_id, quote_update, user_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.delete("/{quote_id}")
async def delete_quote(
    quote_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a specific quote"""
    success = QuoteService.delete_quote(quote_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted successfully"}