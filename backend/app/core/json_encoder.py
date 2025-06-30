import json
from decimal import Decimal
from datetime import datetime, date
from uuid import UUID
from typing import Any

class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle special types"""
    
    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            # Convert Decimal to float for JSON serialization
            return float(obj)
        elif isinstance(obj, UUID):
            # Convert UUID to string
            return str(obj)
        elif isinstance(obj, (datetime, date)):
            # Convert datetime/date to ISO format string
            return obj.isoformat()
        elif hasattr(obj, 'model_dump'):
            # Handle Pydantic models
            return obj.model_dump()
        elif hasattr(obj, '__dict__'):
            # Handle other objects with __dict__
            return obj.__dict__
        
        return super().default(obj)

def json_serial(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, UUID):
        return str(obj)
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    
    raise TypeError(f"Type {type(obj)} not serializable")