from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user, AuthUser
from app.models.quotes import Quote
from app.services.ai_service import AIService
from app.services.quote_service import QuoteService
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai", tags=["ai"])
ai_service = AIService()
quote_service = QuoteService()

class AIQuoteRequest(BaseModel):
    prompt: str

@router.post("/generate-quote", response_model=Quote)
async def generate_quote_from_ai(
    request: AIQuoteRequest,
    current_user: AuthUser = Depends(get_current_user)
):
    """Generate a quote from natural language using Claude AI"""
    if current_user.persona != 'ae':
        raise HTTPException(403, "Only Account Executives can generate quotes")
    
    # Generate quote data using AI
    quote_data = await ai_service.generate_quote_from_prompt(request.prompt)
    
    # Create the quote
    return await quote_service.create_quote(current_user.user_id, quote_data)