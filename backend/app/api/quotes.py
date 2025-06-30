from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from uuid import UUID
from app.core.auth import get_current_user, AuthUser
from app.models.quotes import (
    Quote, QuoteCreate, QuoteUpdate, QuoteTerminate, QuoteWithWorkflow
)
from app.services.quote_service import QuoteService
from app.services.workflow_service import WorkflowService
from app.core.logging_config import get_logger

router = APIRouter(prefix="/api/quotes", tags=["quotes"])
quote_service = QuoteService()
logger = get_logger("quotes_api")

@router.post("/", response_model=Quote)
async def create_quote(
    quote_data: QuoteCreate,
    current_user: AuthUser = Depends(get_current_user)
):
    """Create a new quote"""
    if current_user.persona != 'ae':
        raise HTTPException(403, "Only Account Executives can create quotes")
    
    logger.info(f"Creating quote for user {current_user.user_id}", extra={
        "user_id": current_user.user_id,
        "quote_title": quote_data.title
    })
    
    return await quote_service.create_quote(current_user.user_id, quote_data)

@router.get("/", response_model=List[QuoteWithWorkflow])
async def list_quotes(
    status: Optional[str] = Query(None),
    current_user: AuthUser = Depends(get_current_user)
):
    """List quotes based on user's persona with workflow steps"""
    logger.info(f"Fetching quotes for user {current_user.user_id}", extra={
        "user_id": current_user.user_id,
        "persona": current_user.persona,
        "status_filter": status
    })
    
    # Get quotes with workflow steps
    quotes = await quote_service.get_quotes_with_workflow_for_user(
        current_user.user_id, 
        current_user.persona
    )
    
    # Apply additional filters
    if status and current_user.persona == 'ae':
        if status == 'in_progress':
            # For AE, in_progress includes all non-terminal states
            quotes = [q for q in quotes if q.status not in ['approved', 'terminated']]
        else:
            quotes = [q for q in quotes if q.status == status]
    
    return quotes

@router.get("/{quote_id}", response_model=QuoteWithWorkflow)
async def get_quote(
    quote_id: UUID,
    current_user: AuthUser = Depends(get_current_user)
):
    """Get quote details with workflow"""
    logger.debug(f"Fetching quote {quote_id} for user {current_user.user_id}")
    
    quote = await quote_service.get_quote_with_workflow(str(quote_id))
    
    # AEs can view all quotes, other personas can only view quotes they're involved in
    if current_user.persona != 'ae':
        # Check if this persona is involved in the workflow
        involved = any(step.persona == current_user.persona for step in quote.workflow_steps)
        if not involved:
            raise HTTPException(403, "You can only view quotes you're involved in")
    
    return quote

@router.put("/{quote_id}", response_model=Quote)
async def update_quote(
    quote_id: UUID,
    quote_update: QuoteUpdate,
    current_user: AuthUser = Depends(get_current_user)
):
    """Update a draft quote"""
    logger.info(f"Updating quote {quote_id} for user {current_user.user_id}")
    
    quote = await quote_service.get_quote(str(quote_id))
    
    # Validation
    if current_user.persona != 'ae' or str(quote.user_id) != current_user.user_id:
        raise HTTPException(403, "You can only update your own quotes")
    
    if quote.status not in ['draft', 'draft_reopened']:
        raise HTTPException(400, "Can only update draft quotes")
    
    return await quote_service.update_quote(str(quote_id), current_user.user_id, quote_update)

@router.post("/{quote_id}/submit", response_model=Quote)
async def submit_quote(
    quote_id: UUID,
    current_user: AuthUser = Depends(get_current_user)
):
    """Submit quote for approval"""
    logger.info(f"Submitting quote {quote_id} for approval")
    
    if current_user.persona != 'ae':
        raise HTTPException(403, "Only Account Executives can submit quotes")
    
    return await quote_service.submit_quote(str(quote_id), current_user.user_id)

@router.post("/{quote_id}/terminate", response_model=Quote)
async def terminate_quote(
    quote_id: UUID,
    termination: QuoteTerminate,
    current_user: AuthUser = Depends(get_current_user)
):
    """Terminate a quote with reason"""
    logger.info(f"Terminating quote {quote_id} with reason: {termination.reason}")
    
    if current_user.persona != 'ae':
        raise HTTPException(403, "Only Account Executives can terminate quotes")
    
    return await quote_service.terminate_quote(
        str(quote_id), 
        current_user.user_id, 
        termination.reason
    )

@router.post("/{quote_id}/reopen", response_model=Quote)
async def reopen_quote(
    quote_id: UUID,
    current_user: AuthUser = Depends(get_current_user)
):
    """Reopen a rejected quote"""
    logger.info(f"Reopening quote {quote_id}")
    
    if current_user.persona != 'ae':
        raise HTTPException(403, "Only Account Executives can reopen quotes")
    
    return await quote_service.reopen_quote(str(quote_id), current_user.user_id)

@router.delete("/{quote_id}")
async def delete_quote(
    quote_id: UUID,
    current_user: AuthUser = Depends(get_current_user)
):
    """Delete a quote - AEs can delete any quote"""
    logger.info(f"User {current_user.user_id} deleting quote {quote_id}")
    
    if current_user.persona != 'ae':
        raise HTTPException(403, "Only Account Executives can delete quotes")
    
    await quote_service.delete_quote(str(quote_id))
    
    return {"success": True, "message": "Quote deleted successfully"}

from pydantic import BaseModel

class WorkflowUpdateRequest(BaseModel):
    workflow_steps: List[dict]

@router.put("/{quote_id}/workflow", response_model=dict)
async def update_quote_workflow(
    quote_id: UUID,
    request: WorkflowUpdateRequest,
    current_user: AuthUser = Depends(get_current_user)
):
    """Update workflow configuration for a draft quote"""
    logger.info(f"Updating workflow for quote {quote_id}")
    
    # Validate that user owns the quote and it's in draft status
    quote = await quote_service.get_quote(str(quote_id))
    
    if current_user.persona != 'ae' or str(quote.user_id) != current_user.user_id:
        raise HTTPException(403, "You can only update workflow for your own quotes")
    
    if quote.status not in ['draft', 'draft_reopened']:
        raise HTTPException(400, "Can only update workflow for draft quotes")
    
    # Delete existing workflow steps for this quote
    from app.services.workflow_service import WorkflowService
    workflow_service = WorkflowService()
    
    # Delete existing draft workflow steps
    workflow_service.client.table('workflow_steps').delete().eq('quote_id', str(quote_id)).execute()
    
    # Save new workflow steps (only use columns that exist in schema)
    for idx, step in enumerate(request.workflow_steps):
        step_data = {
            'quote_id': str(quote_id),
            'persona': step.get('persona'),
            'step_order': step.get('step_order', idx + 1),
            'status': 'pending'
            # Note: 'name' column doesn't exist in workflow_steps table
        }
        workflow_service.client.table('workflow_steps').insert(step_data).execute()
    
    logger.info(f"Workflow steps saved for quote {quote_id}")
    
    return {"success": True, "message": "Workflow configuration updated"}