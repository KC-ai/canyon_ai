from typing import List, Dict
from datetime import datetime, timedelta
from app.core.database import get_supabase_client
from app.core.logging_config import get_logger

logger = get_logger("analytics_service")

class AnalyticsService:
    def __init__(self):
        self.client = get_supabase_client()
    
    async def get_dashboard_metrics(self, user_id: str, persona: str) -> Dict:
        """Calculate dashboard metrics"""
        try:
            if persona == 'ae':
                # Get metrics for AE's own quotes
                quotes = self.client.table('quotes').select('*').eq('user_id', user_id).execute()
            else:
                # Get metrics for approver's pending quotes
                quotes = self.client.table('quotes').select('*').eq('status', f'pending_{persona}').execute()
            
            total_quotes = len(quotes.data)
            total_value = sum(float(q['total_amount']) for q in quotes.data)
            
            # Status breakdown
            status_counts = {}
            for quote in quotes.data:
                status = quote['status']
                status_counts[status] = status_counts.get(status, 0) + 1
            
            return {
                'total_quotes': total_quotes,
                'total_value': total_value,
                'status_breakdown': status_counts,
                'avg_quote_value': total_value / total_quotes if total_quotes > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard metrics: {str(e)}")
            return {
                'total_quotes': 0,
                'total_value': 0,
                'status_breakdown': {},
                'avg_quote_value': 0
            }
    
    async def get_approval_time_metrics(self) -> List[Dict]:
        """Calculate average approval times by persona"""
        try:
            # Query completed workflow steps
            steps = self.client.table('workflow_steps')\
                .select('*')\
                .eq('status', 'approved')\
                .execute()
            
            # Calculate average time by persona
            persona_times = {}
            for step in steps.data:
                if step['completed_at'] and step['assigned_at']:
                    persona = step['persona']
                    assigned = datetime.fromisoformat(step['assigned_at'].replace('Z', '+00:00'))
                    completed = datetime.fromisoformat(step['completed_at'].replace('Z', '+00:00'))
                    time_taken = (completed - assigned).total_seconds() / 3600
                    
                    if persona not in persona_times:
                        persona_times[persona] = []
                    persona_times[persona].append(time_taken)
            
            # Calculate averages
            results = []
            for persona, times in persona_times.items():
                results.append({
                    'persona': persona,
                    'avg_hours': sum(times) / len(times),
                    'total_approvals': len(times)
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get approval time metrics: {str(e)}")
            return []