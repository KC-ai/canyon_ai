import anthropic
import json
from typing import Dict, List
from app.models.quotes import QuoteCreate, QuoteItemCreate
from app.core.config import settings

class AIService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    
    async def generate_quote_from_prompt(self, prompt: str) -> QuoteCreate:
        """Generate a structured quote from natural language"""
        
        system_prompt = """You are a CPQ (Configure, Price, Quote) expert assistant.
        Convert natural language requests into structured quotes.
        
        Extract the following information:
        1. Customer information (name, email, company if mentioned)
        2. Product/service items with quantities and suggested pricing
        3. Any discount requirements
        4. Quote title and description
        
        Return a JSON object with this structure:
        {
            "customer_name": "string",
            "customer_email": "string or null",
            "customer_company": "string or null",
            "title": "string",
            "description": "string",
            "discount_percent": number (0-100),
            "items": [
                {
                    "name": "string",
                    "description": "string",
                    "quantity": number,
                    "unit_price": number,
                    "discount_percent": number
                }
            ]
        }
        
        Pricing guidelines:
        - Software licenses: $500-5000/user/year
        - Professional services: $150-300/hour
        - Support packages: $1000-10000/month
        - Training: $500-2000/day
        
        Be reasonable with pricing based on market standards.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                temperature=0.3,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Parse the response
            content = response.content[0].text
            
            # Extract JSON from the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            json_str = content[json_start:json_end]
            
            quote_data = json.loads(json_str)
            
            # Convert to Pydantic models
            items = [QuoteItemCreate(**item) for item in quote_data.get('items', [])]
            
            return QuoteCreate(
                customer_name=quote_data['customer_name'],
                customer_email=quote_data.get('customer_email'),
                customer_company=quote_data.get('customer_company'),
                title=quote_data['title'],
                description=quote_data.get('description', ''),
                discount_percent=quote_data.get('discount_percent', 0),
                items=items
            )
            
        except Exception as e:
            # Fallback to basic parsing
            return self._fallback_quote_generation(prompt)
    
    def _fallback_quote_generation(self, prompt: str) -> QuoteCreate:
        """Fallback quote generation using keywords"""
        # Basic keyword extraction
        prompt_lower = prompt.lower()
        
        # Extract quantities
        quantity = 1
        for word in prompt.split():
            if word.isdigit():
                quantity = int(word)
                break
        
        # Determine product type
        if 'license' in prompt_lower or 'software' in prompt_lower:
            product_name = "Software License"
            unit_price = 2000
        elif 'support' in prompt_lower:
            product_name = "Support Package"
            unit_price = 5000
        elif 'training' in prompt_lower:
            product_name = "Training Services"
            unit_price = 1500
        else:
            product_name = "Professional Services"
            unit_price = 200
        
        # Extract customer name (simple heuristic)
        customer_name = "Prospective Customer"
        if 'for' in prompt_lower:
            parts = prompt.split('for')
            if len(parts) > 1:
                customer_name = parts[1].strip().split()[0]
        
        return QuoteCreate(
            customer_name=customer_name,
            title=f"Quote for {product_name}",
            description=f"Generated from: {prompt[:100]}...",
            discount_percent=0,
            items=[
                QuoteItemCreate(
                    name=product_name,
                    description="AI-generated quote item",
                    quantity=quantity,
                    unit_price=unit_price,
                    discount_percent=0
                )
            ]
        )