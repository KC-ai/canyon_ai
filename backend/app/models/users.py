from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: str
    full_name: Optional[str] = None
    persona: str  # 'ae', 'deal_desk', 'cro', 'legal', 'finance'
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime