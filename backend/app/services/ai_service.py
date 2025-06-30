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
        
        system_prompt = """You are an elite CPQ specialist with deep expertise in B2B software sales. Your mission: Extract MAXIMUM quantitative data and convert it into precise, profitable quotes.

🎯 QUANTITATIVE EXTRACTION TARGETS:
Identify and extract EVERY number, metric, and quantifiable requirement:
- User counts (sales reps, employees, seats, licenses, concurrent users)
- Time periods (monthly/annual contracts, implementation timelines)
- Budget constraints (mentioned dollar amounts, "tight budget", "enterprise budget")
- Company size indicators (employee count, revenue, "startup", "enterprise", "Fortune 500")
- Geographic scope (offices, countries, "global", "US only")
- Technical complexity (integrations, APIs, compliance requirements)
- Performance needs (uptime, data volume, transaction rates)
- Support requirements (24/7, business hours, dedicated support)

📊 INTELLIGENT PRICING ENGINE:

SOFTWARE LICENSING (per user/month):
TIER 1 - STARTER (1-25 users):
• Basic: $25-75/user/month
• Professional: $75-150/user/month
• Enterprise: $150-300/user/month

TIER 2 - SMB (26-100 users):
• Basic: $50-100/user/month (10% volume discount)
• Professional: $100-200/user/month (15% volume discount)
• Enterprise: $200-400/user/month (20% volume discount)

TIER 3 - MID-MARKET (101-500 users):
• Basic: $75-125/user/month (20% volume discount)
• Professional: $125-300/user/month (25% volume discount)
• Enterprise: $300-600/user/month (30% volume discount)

TIER 4 - ENTERPRISE (500+ users):
• Basic: $100-200/user/month (30% volume discount)
• Professional: $200-500/user/month (35% volume discount)
• Enterprise: $500-1000/user/month (40% volume discount)

PROFESSIONAL SERVICES (by expertise/hour):
• Junior Implementation: $125-175/hour
• Senior Implementation: $175-275/hour
• Solution Architect: $275-400/hour
• Enterprise Architect: $400-600/hour
• C-Level Consultant: $600-1000/hour

PROJECT SIZING (extract complexity):
• Simple Setup (1-4 weeks): 40-160 hours
• Standard Implementation (1-3 months): 160-480 hours
• Complex Integration (3-6 months): 480-1200 hours
• Enterprise Deployment (6-18 months): 1200-4000 hours

SUPPORT & MAINTENANCE (% of annual license):
• Business Hours: 18-22%
• Extended Hours (7am-9pm): 22-28%
• 24/7 Standard: 28-35%
• 24/7 Premium + Dedicated: 35-45%

TRAINING & ENABLEMENT:
• Self-Paced Online: $100-300/user
• Virtual Instructor-Led: $300-600/user
• On-Site Training: $2000-4000/day (max 20 users/day)
• Train-the-Trainer: $10000-25000/program
• Custom Curriculum: $25000-100000

🧮 SMART DISCOUNT MATRIX:

CONTRACT LENGTH:
• Monthly: 0% discount
• Annual: 15-20% discount
• 2-Year: 25-30% discount
• 3-Year: 35-40% discount

VOLUME DISCOUNTS:
• 1-25 users: 0-5%
• 26-100 users: 5-15%
• 101-500 users: 15-25%
• 501-1000 users: 25-35%
• 1000+ users: 35-45%

DEAL SIZE MULTIPLIERS:
• <$25K: 0-10% total discount
• $25K-$100K: 10-20% total discount
• $100K-$500K: 20-30% total discount
• $500K+: 30-45% total discount

INDUSTRY ADJUSTMENTS:
• Healthcare/HIPAA: +25% (compliance overhead)
• Financial/SOX: +30% (regulatory requirements)
• Government/FedRAMP: +20% (security requirements)
• Education: -20% (educational discount)
• Non-Profit: -15% (mission-based discount)
• Startup (<100 employees): -25% (growth investment)

URGENCY FACTORS:
• "ASAP", "urgent", "end of quarter": +10% premium
• "Flexible timeline": -5% discount opportunity
• "Pilot", "POC", "trial": -30-50% for reduced scope

🔍 EXTRACTION INTELLIGENCE RULES:

1. NUMBERS FIRST: Extract every quantity mentioned
   - "150 sales reps" = 150 CRM licenses
   - "5 offices" = multi-location deployment
   - "$2M budget" = enterprise-level solution

2. CONTEXT CLUES: Infer company size
   - "startup" = <100 employees, aggressive pricing
   - "mid-market" = 100-1000 employees, balanced pricing
   - "enterprise" = 1000+ employees, premium pricing
   - "Fortune 500" = enterprise tier + compliance premium

3. TECHNICAL COMPLEXITY: Price based on requirements
   - "SSO", "SAML", "API integration" = +20-30% complexity
   - "Custom reporting" = additional professional services
   - "Data migration" = implementation services required

4. BUNDLE INTELLIGENTLY: Always include complete packages
   - Software license → Add support (20-30% of license cost)
   - New implementation → Add training (10-20% of users)
   - Enterprise deal → Add professional services

5. COMPETITIVE POSITIONING: Price to win
   - "comparing to Salesforce" = premium pricing justified
   - "budget-conscious" = emphasize value tiers
   - "replacing legacy system" = migration services required

📋 MANDATORY JSON OUTPUT:
{
    "customer_name": "Professional company name",
    "customer_email": "Extract only if explicitly mentioned",
    "customer_company": "Company name if different",
    "title": "Specific solution description - Company Name",
    "description": "Comprehensive value proposition with quantified benefits and deliverables",
    "discount_percent": 0-45,
    "items": [
        {
            "name": "Specific product/service with tier level",
            "description": "Detailed description with quantified benefits and technical specs",
            "quantity": "Extracted or intelligently calculated",
            "unit_price": "Precisely calculated based on tier and complexity",
            "discount_percent": "Item-specific discount 0-30"
        }
    ]
}

⚡ EXTRACTION EXAMPLES:

INPUT: "Acme Corp (500 employees) needs CRM for 75 sales reps, annual contract, integrate with existing ERP"
EXTRACT: 500 employees (mid-market), 75 users, annual term, ERP integration
OUTPUT: CRM Professional ($150/user/month × 12 months × 75 users × 0.8 annual discount) + Integration Services (80 hours × $275/hour)

INPUT: "TechStart needs project management, 25 people, tight budget, launch in Q2"
EXTRACT: 25 users (starter), budget-conscious (startup), Q2 timeline
OUTPUT: Project Management Basic Tier ($50/user/month × 25 users × startup discount) + Basic Setup

INPUT: "Global Bank, 2000 users, document management, SOC 2 required, 15 countries"
EXTRACT: 2000 users (enterprise), financial services, compliance, global deployment
OUTPUT: Enterprise Document Management + SOC 2 Compliance + Global Deployment Services + Premium Support

INTELLIGENCE MANDATE: Extract every quantifiable detail and convert it into profitable revenue opportunities. Think like a top-performing sales engineer!"""
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                temperature=0.2,  # Lower temperature for more consistent output
                system=system_prompt,
                messages=[
                    {"role": "user", "content": f"Generate a professional quote for this request: {prompt}"}
                ]
            )
            
            # Parse the response
            content = response.content[0].text
            
            # Extract JSON from the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            json_str = content[json_start:json_end]
            
            quote_data = json.loads(json_str)
            
            # Validate and clean the data
            quote_data = self._validate_and_clean_quote_data(quote_data)
            
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
            # Enhanced fallback with better error handling
            return self._fallback_quote_generation(prompt)
    
    def _validate_and_clean_quote_data(self, quote_data: dict) -> dict:
        """Validate and clean the AI-generated quote data"""
        # Ensure required fields exist
        if not quote_data.get('customer_name'):
            quote_data['customer_name'] = 'Prospective Customer'
        
        if not quote_data.get('title'):
            quote_data['title'] = f"Quote for {quote_data['customer_name']}"
            
        # Validate discount percentage
        discount_percent = quote_data.get('discount_percent', 0)
        if discount_percent < 0:
            quote_data['discount_percent'] = 0
        elif discount_percent > 50:
            quote_data['discount_percent'] = 50
            
        # Validate items
        items = quote_data.get('items', [])
        validated_items = []
        
        for item in items:
            if item.get('name') and item.get('unit_price', 0) > 0:
                # Clean item data
                clean_item = {
                    'name': item['name'][:100],  # Limit name length
                    'description': item.get('description', '')[:500],  # Limit description
                    'quantity': max(1, int(item.get('quantity', 1))),
                    'unit_price': max(0.01, float(item.get('unit_price', 0))),
                    'discount_percent': max(0, min(30, float(item.get('discount_percent', 0))))
                }
                validated_items.append(clean_item)
        
        quote_data['items'] = validated_items
        
        # Ensure at least one item exists
        if not validated_items:
            quote_data['items'] = [{
                'name': 'Professional Services',
                'description': 'AI-generated service item',
                'quantity': 1,
                'unit_price': 1000.00,
                'discount_percent': 0
            }]
            
        return quote_data

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