# Frontend-Backend Integration Testing Guide

## Overview
This guide helps you test the complete integration between the Canyon CPQ frontend and backend through Supabase.

## Prerequisites
1. Backend running on http://localhost:8000
2. Frontend running on http://localhost:3000
3. Supabase project configured

## Testing Steps

### 1. Frontend Authentication
1. Open the frontend at http://localhost:3000
2. Click "Sign in with Google" to authenticate
3. You should be redirected to the dashboard after successful login

### 2. Verify Token in Browser
1. Open browser Developer Tools (F12)
2. Go to Application → Local Storage → http://localhost:3000
3. Look for the Supabase auth token (usually under key like `sb-hdcsxkxohgtpitfljqhx-auth-token`)
4. Copy the `access_token` value from the JSON

### 3. Test API with Real Token
Use the token from step 2 to test the API:

```bash
# Replace YOUR_TOKEN with the actual token from browser
curl -X GET http://localhost:8000/api/test/protected \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Persona: ae"
```

### 4. Create a Quote through Frontend
1. In the dashboard, click "Create New Quote"
2. Fill in the quote details:
   - Customer Name: Test Company
   - Title: Test Quote
   - Add at least one item
3. Click "Save Draft"
4. Check browser Network tab to see the API request/response

### 5. Verify Quote Creation
```bash
# Get all quotes for the authenticated user
curl -X GET http://localhost:8000/api/quotes/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Persona: ae"
```

### 6. Submit Quote for Approval
1. Find the quote in the dashboard
2. Click "Submit for Approval"
3. This should create workflow steps based on discount rules

### 7. Check Workflow Steps
```bash
# Get quote with workflow details (replace QUOTE_ID)
curl -X GET http://localhost:8000/api/quotes/QUOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Persona: ae"
```

## Common Issues and Solutions

### Issue: 401 Unauthorized
- **Cause**: Token expired or invalid
- **Solution**: Log out and log in again in the frontend

### Issue: 403 Forbidden
- **Cause**: Wrong persona for the action
- **Solution**: Ensure X-User-Persona header matches the required role

### Issue: Quote Creation Fails
- **Cause**: Database constraints or serialization issues
- **Solution**: Check backend logs at `/Users/kashyap/canyon/backend/logs/app.log`

### Issue: Workflow Not Created
- **Cause**: Quote not properly submitted
- **Solution**: Ensure quote status changes from 'draft' to 'pending_*'

## Testing Different Personas

### Account Executive (ae)
- Can create, edit, submit quotes
- Can only see their own quotes

### Deal Desk (deal_desk)
- Sees quotes pending their approval
- Can approve/reject quotes

### CRO (cro)
- Sees quotes with 15%+ discount pending approval
- Can approve/reject quotes

### Legal (legal)
- Sees quotes after other approvals
- Final approval before customer

## Debugging Tips

1. **Check Backend Logs**:
   ```bash
   tail -f /Users/kashyap/canyon/backend/logs/app.log
   ```

2. **Monitor Network Requests**:
   - Use browser DevTools Network tab
   - Check request headers and responses

3. **Verify Database State**:
   - Use Supabase dashboard to check tables
   - Verify quotes, workflow_steps tables

4. **Test with curl**:
   - Use the test commands above
   - Add `-v` flag for verbose output

## Expected Flow

1. User logs in → Gets Supabase JWT
2. Frontend stores token → Sends with API requests
3. Backend validates token → Extracts user info
4. Quote created → Stored in Supabase
5. Quote submitted → Workflow steps created
6. Approvers see pending quotes → Based on persona
7. All approvals complete → Quote marked as approved