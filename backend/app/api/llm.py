from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from app.models.quotes import QuoteCreate, QuoteItemCreate, Quote
from app.core.auth import get_current_user_id
from app.core.logging_config import get_logger
from app.services.quote_service import QuoteService
import uuid
import os
import json
import re
from decimal import Decimal
from datetime import datetime, timedelta
import anthropic

router = APIRouter()
logger = get_logger("llm_api")

# Initialize Anthropic client
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
if not anthropic_api_key:
    logger.error("ANTHROPIC_API_KEY not found in environment variables")
    client = None
else:
    client = anthropic.Anthropic(api_key=anthropic_api_key)

class AIQuoteRequest(BaseModel):
    description: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

class AIQuoteResponse(BaseModel):
    quote: Quote
    confidence_score: float
    suggestions: List[str]
    workflow_created: bool
    workflow_id: Optional[str] = None

@router.post("/generate-quote", response_model=AIQuoteResponse)
async def generate_quote_with_ai(
    request: AIQuoteRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Generate a quote using AI based on natural language description"""
    try:
        logger.info(f"Generating AI quote for user {user_id}")
        
        # Analyze the description using Claude AI to extract quote components
        analysis = await _analyze_description_with_ai(request.description)
        
        # Generate quote items based on analysis
        quote_items = _generate_quote_items(analysis)
        
        # Create quote structure
        quote_data = QuoteCreate(
            customer_name=request.customer_name or analysis.get("customer_name", "AI Generated Customer"),
            customer_email=request.customer_email or analysis.get("customer_email", "customer@example.com"),
            title=analysis.get("title", "AI Generated Quote"),
            description=f"Generated from: {request.description[:100]}...",
            status="pending",  # Set to pending to trigger workflow evaluation
            valid_until=(datetime.now() + timedelta(days=30)).isoformat(),
            items=quote_items
        )
        
        # Use the same quote creation service as manual quote creation
        # This will automatically handle workflow creation based on discount %
        created_quote = await QuoteService.create_quote(quote_data, user_id)
        
        # Generate suggestions for improvement using AI
        suggestions = await _generate_suggestions_with_ai(analysis, created_quote, request.description)
        
        # Calculate confidence score (use AI confidence if available)
        confidence_score = analysis.get("confidence", 50) / 100.0  # Convert to 0-1 scale
        
        # Check if workflow was created
        workflow_created = created_quote.workflow_id is not None
        
        return AIQuoteResponse(
            quote=created_quote,
            confidence_score=confidence_score,
            suggestions=suggestions,
            workflow_created=workflow_created,
            workflow_id=created_quote.workflow_id
        )
        
    except Exception as e:
        logger.error(f"Failed to generate AI quote: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate quote with AI"
        )

async def _analyze_description_with_ai(description: str) -> dict:
    """Analyze description using Claude AI to extract quote components"""
    
    if not client:
        logger.warning("Anthropic client not available, falling back to keyword analysis")
        return _analyze_description_fallback(description)
    
    try:
        # Create a structured prompt for Claude to analyze the quote request
        prompt = f"""
You are an expert sales analyst for a CPQ (Configure-Price-Quote) system. Analyze the following quote request and extract structured information.

Quote Request: "{description}"

Please analyze this request and return a JSON object with the following structure:
{{
    "customer_name": "extracted or inferred customer name (or null if not found)",
    "customer_email": "extracted email (or null if not found)", 
    "product_type": "software|consulting|support|hardware|general",
    "title": "appropriate quote title",
    "quantity": "number of items/licenses/units (default 1)",
    "pricing_tier": "standard|premium|enterprise",
    "discount_percent": "suggested discount percentage as integer (0-50)",
    "urgency": "low|medium|high",
    "deal_size": "small|medium|large|enterprise",
    "competitive_situation": "none|moderate|intense",
    "additional_services": ["list", "of", "suggested", "add-on", "services"],
    "confidence": "confidence score 0-100 for the analysis"
}}

Guidelines for analysis:
- If quantity mentions (5, 10, 100 users/licenses), extract the number
- Determine product type from context (software license, consulting hours, support contracts, etc.)
- Pricing tier based on company size indicators (startup=standard, enterprise=enterprise)
- Discount suggestions:
  * 0-5%: Standard deals, small quantities
  * 10-15%: Volume deals, repeat customers  
  * 20-30%: Enterprise deals, competitive situations
  * 35-50%: Large competitive deals, strategic accounts
- Consider urgency indicators (ASAP, urgent, end of quarter, etc.)
- Identify competitive mentions (vs competitor, beating X, match pricing)

Return only the JSON object, no other text.
"""

        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.3,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse the response
        analysis_text = response.content[0].text.strip()
        logger.info(f"Claude AI analysis response: {analysis_text}")
        
        # Extract JSON from response
        try:
            analysis = json.loads(analysis_text)
            
            # Validate and clean the analysis
            analysis = _validate_analysis(analysis)
            
            logger.info(f"Successfully analyzed quote request with Claude AI: {analysis}")
            return analysis
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude AI response as JSON: {e}")
            logger.error(f"Raw response: {analysis_text}")
            return _analyze_description_fallback(description)
            
    except Exception as e:
        logger.error(f"Claude AI analysis failed: {e}")
        return _analyze_description_fallback(description)

def _validate_analysis(analysis: dict) -> dict:
    """Validate and clean AI analysis results"""
    # Ensure required fields have valid values
    valid_product_types = ["software", "consulting", "support", "hardware", "general"]
    if analysis.get("product_type") not in valid_product_types:
        analysis["product_type"] = "general"
    
    valid_pricing_tiers = ["standard", "premium", "enterprise"] 
    if analysis.get("pricing_tier") not in valid_pricing_tiers:
        analysis["pricing_tier"] = "standard"
    
    # Ensure quantity is a positive integer
    try:
        quantity = int(analysis.get("quantity", 1))
        analysis["quantity"] = max(1, quantity)
    except (ValueError, TypeError):
        analysis["quantity"] = 1
    
    # Ensure discount is within reasonable bounds
    try:
        discount = int(analysis.get("discount_percent", 0))
        analysis["discount_percent"] = max(0, min(50, discount))
    except (ValueError, TypeError):
        analysis["discount_percent"] = 0
    
    # Ensure confidence is within bounds
    try:
        confidence = int(analysis.get("confidence", 50))
        analysis["confidence"] = max(0, min(100, confidence))
    except (ValueError, TypeError):
        analysis["confidence"] = 50
    
    # Set default title if not provided
    if not analysis.get("title"):
        product_type = analysis.get("product_type", "general")
        analysis["title"] = f"{product_type.title()} Quote"
    
    return analysis

def _analyze_description_fallback(description: str) -> dict:
    """Fallback keyword-based analysis when Claude AI is unavailable"""
    analysis = {}
    
    # Extract customer info
    if "acme" in description.lower():
        analysis["customer_name"] = "Acme Corp"
    elif "corp" in description.lower() or "company" in description.lower():
        analysis["customer_name"] = "Enterprise Customer"
    
    # Extract product type
    if "software" in description.lower():
        analysis["product_type"] = "software"
        analysis["title"] = "Software License Quote"
    elif "consulting" in description.lower():
        analysis["product_type"] = "consulting"
        analysis["title"] = "Consulting Services Quote"
    elif "support" in description.lower():
        analysis["product_type"] = "support"
        analysis["title"] = "Support Services Quote"
    else:
        analysis["product_type"] = "general"
        analysis["title"] = "General Services Quote"
    
    # Extract quantities
    numbers = re.findall(r'\d+', description)
    if numbers:
        analysis["quantity"] = int(numbers[0])
    else:
        analysis["quantity"] = 1
    
    # Extract pricing hints
    if "enterprise" in description.lower():
        analysis["pricing_tier"] = "enterprise"
        analysis["discount_percent"] = 25
    elif "premium" in description.lower():
        analysis["pricing_tier"] = "premium"
        analysis["discount_percent"] = 15
    else:
        analysis["pricing_tier"] = "standard"
        analysis["discount_percent"] = 5
    
    # Competitive situation detection
    if "competitive" in description.lower() or "competitor" in description.lower():
        analysis["discount_percent"] = 45
    elif "volume" in description.lower() or "bulk" in description.lower():
        analysis["discount_percent"] = 20
    elif "urgent" in description.lower() or "rush" in description.lower():
        analysis["discount_percent"] = 5
    
    analysis["confidence"] = 60  # Lower confidence for fallback
    
    return analysis

def _generate_quote_items(analysis: dict) -> List[QuoteItemCreate]:
    """Generate quote items based on analysis"""
    items = []
    
    product_type = analysis.get("product_type", "general")
    quantity = analysis.get("quantity", 1)
    pricing_tier = analysis.get("pricing_tier", "standard")
    discount_percent = analysis.get("discount_percent", 0)
    
    # Base pricing by product type and tier
    pricing_map = {
        "software": {
            "standard": 100,
            "premium": 200,
            "enterprise": 500
        },
        "consulting": {
            "standard": 150,
            "premium": 250,
            "enterprise": 400
        },
        "support": {
            "standard": 50,
            "premium": 100,
            "enterprise": 200
        },
        "hardware": {
            "standard": 200,
            "premium": 400,
            "enterprise": 800
        },
        "general": {
            "standard": 75,
            "premium": 150,
            "enterprise": 300
        }
    }
    
    base_price = pricing_map[product_type][pricing_tier]
    
    # Main product/service
    items.append(QuoteItemCreate(
        name=f"{product_type.title()} - {pricing_tier.title()} Plan",
        description=f"Professional {product_type} services with {pricing_tier} level features",
        quantity=quantity,
        unit_price=Decimal(str(base_price)),
        discount_percent=Decimal(str(discount_percent)) if discount_percent > 0 else None
    ))
    
    # Add AI-suggested additional services or default complementary items
    additional_services = analysis.get("additional_services", [])
    
    if additional_services:
        # Use AI-suggested services
        for service in additional_services[:3]:  # Limit to 3 additional services
            service_price = _estimate_service_price(service, base_price)
            items.append(QuoteItemCreate(
                name=service,
                description=f"AI-recommended: {service}",
                quantity=1,
                unit_price=Decimal(str(service_price)),
                discount_percent=Decimal(str(discount_percent // 2)) if discount_percent > 0 else None
            ))
    else:
        # Default complementary items based on product type
        if product_type == "software":
            items.append(QuoteItemCreate(
                name="Implementation Services",
                description="Professional implementation and setup services",
                quantity=1,
                unit_price=Decimal("500"),
                discount_percent=Decimal(str(discount_percent // 2)) if discount_percent > 0 else None
            ))
            
            if pricing_tier in ["premium", "enterprise"]:
                items.append(QuoteItemCreate(
                    name="Priority Support",
                    description="24/7 priority support package",
                    quantity=1,
                    unit_price=Decimal("200"),
                    discount_percent=Decimal(str(discount_percent // 3)) if discount_percent > 0 else None
                ))
        
        elif product_type == "consulting":
            items.append(QuoteItemCreate(
                name="Project Management",
                description="Dedicated project management services",
                quantity=1,
                unit_price=Decimal("300"),
                discount_percent=Decimal(str(discount_percent // 2)) if discount_percent > 0 else None
            ))
    
    return items

def _estimate_service_price(service_name: str, base_price: int) -> int:
    """Estimate price for AI-suggested additional services"""
    service_name_lower = service_name.lower()
    
    # Price multipliers based on service type
    if "training" in service_name_lower or "education" in service_name_lower:
        return int(base_price * 0.3)
    elif "implementation" in service_name_lower or "setup" in service_name_lower:
        return int(base_price * 0.5)
    elif "support" in service_name_lower or "maintenance" in service_name_lower:
        return int(base_price * 0.2)
    elif "consulting" in service_name_lower or "advisory" in service_name_lower:
        return int(base_price * 0.4)
    elif "integration" in service_name_lower or "migration" in service_name_lower:
        return int(base_price * 0.6)
    else:
        # Default service pricing
        return int(base_price * 0.25)

async def _generate_suggestions_with_ai(analysis: dict, quote: Quote, original_description: str) -> List[str]:
    """Generate improvement suggestions using Claude AI"""
    
    if not client:
        logger.warning("Anthropic client not available, falling back to basic suggestions")
        return _generate_suggestions_fallback(analysis, quote)
    
    try:
        # Create context for Claude to generate suggestions
        quote_summary = {
            "total_amount": float(quote.total_amount),
            "discount_percent": float(quote.max_discount_percent or 0),
            "workflow_created": quote.workflow_id is not None,
            "item_count": len(quote.items),
            "customer": quote.customer_name
        }
        
        prompt = f"""
You are an expert sales advisor for a CPQ system. Analyze this quote and provide actionable improvement suggestions.

Original Request: "{original_description}"

Generated Quote Summary:
- Total Amount: ${quote_summary['total_amount']:,.2f}
- Discount: {quote_summary['discount_percent']}%
- Items: {quote_summary['item_count']}
- Customer: {quote_summary['customer']}
- Workflow Created: {quote_summary['workflow_created']}

AI Analysis Confidence: {analysis.get('confidence', 50)}%

Please provide 3-5 specific, actionable suggestions to improve this quote. Focus on:
1. Revenue optimization opportunities
2. Risk mitigation strategies  
3. Customer experience improvements
4. Process efficiency gains
5. Competitive positioning

Return your suggestions as a JSON array of strings. Each suggestion should be concise (1-2 sentences) and actionable.

Example format:
["Suggestion 1", "Suggestion 2", "Suggestion 3"]

Return only the JSON array, no other text.
"""

        # Call Claude API for suggestions
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=600,
            temperature=0.4,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        suggestions_text = response.content[0].text.strip()
        logger.info(f"Claude AI suggestions response: {suggestions_text}")
        
        try:
            suggestions = json.loads(suggestions_text)
            if isinstance(suggestions, list):
                return suggestions[:5]  # Limit to 5 suggestions
            else:
                logger.error("AI response is not a list format")
                return _generate_suggestions_fallback(analysis, quote)
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI suggestions as JSON: {e}")
            return _generate_suggestions_fallback(analysis, quote)
            
    except Exception as e:
        logger.error(f"Claude AI suggestions failed: {e}")
        return _generate_suggestions_fallback(analysis, quote)

def _generate_suggestions_fallback(analysis: dict, quote: Quote) -> List[str]:
    """Fallback suggestions when AI is unavailable"""
    suggestions = []
    
    if not analysis.get("customer_name"):
        suggestions.append("Consider adding specific customer name for personalization")
    
    if analysis.get("pricing_tier") == "standard":
        suggestions.append("Consider upgrading to premium tier for better value")
    
    # Add workflow-specific suggestions
    if quote.workflow_id:
        max_discount = quote.max_discount_percent
        if max_discount and max_discount > 15:
            suggestions.append(f"Quote includes {max_discount}% discount - approval workflow created")
        if max_discount and max_discount > 40:
            suggestions.append("High discount detected - Finance approval will be required")
        suggestions.append("Quote will go through approval workflow before customer delivery")
    else:
        suggestions.append("Consider adding volume discount for larger quantities")
    
    product_type = analysis.get("product_type", "general")
    if product_type == "software":
        suggestions.append("Consider bundling training services with software license")
    
    # Add quote-specific suggestions
    if quote.total_amount > 50000:
        suggestions.append("Large quote amount - consider payment terms negotiation")
    
    suggestions.append("Review pricing against competitor offerings")
    suggestions.append("Validate customer requirements before finalizing")
    
    return suggestions

