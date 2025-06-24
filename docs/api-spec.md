## **File 6: `docs/api-spec.md`**

```markdown
# API Specification

## Authentication
All API endpoints require Bearer token authentication via Supabase JWT.

### Headers
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json

## Base URL
- Development: `http://localhost:8000`
- Production: `https://canyon-api.railway.app`

## Endpoints

### Quotes API
GET    /api/quotes              # List all quotes for user
POST   /api/quotes              # Create new quote
GET    /api/quotes/{id}         # Get specific quote
PUT    /api/quotes/{id}         # Update quote
DELETE /api/quotes/{id}         # Delete quote

### Workflows API
GET    /api/workflows/{id}                    # Get workflow details
PUT    /api/workflows/{id}/steps             # Update workflow steps
POST   /api/workflows/{id}/steps/{order}/approve  # Approve step
POST   /api/workflows/{id}/steps/{order}/reject   # Reject step

### LLM API
POST   /api/llm/generate-quote   # Generate quote from natural language

### Analytics API
GET    /api/analytics/summary              # Overall metrics
GET    /api/analytics/approval-times       # Approval time by persona
GET    /api/analytics/quote-stages         # Quote distribution by stage
GET    /api/analytics/trends              # Historical trends

## Response Format
```json
{
  "data": {...},
  "message": "Success message",
  "status": "success|error"
}

## Error Response Format
```json
{
  "detail": "Error description",
  "status_code": 400,
  "type": "validation_error"
}

## Request/Response Examples
See individual API endpoint files for detailed examples.