## **File 7: `docs/development-workflow.md`**

```markdown
# Development Workflow

## Environment Setup
1. Clone repository
2. Set up backend virtual environment
3. Install frontend dependencies
4. Configure environment variables
5. Set up Supabase project
6. Initialize database schema

## Development Commands
```bash
# Backend (Terminal 1)
cd canyon_ai/backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000

# Frontend (Terminal 2)  
cd canyon_ai/frontend
npm run dev

# Database (if running locally)
supabase start
```

# Git Workflow

- **Feature branches**: `feature/quote-creation`
- **Bug fixes**: `bugfix/workflow-drag-drop`
- **Releases**: `release/v1.0.0`
- Pull requests required for main branch
- Automated testing on PR creation

---

# Testing Strategy

- Unit tests for all business logic functions
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for critical user flows
- Mock external services (Claude API, Supabase)

---

# Deployment Process

- Push to feature branch triggers preview deployment
- Merge to main triggers production deployment
- **Backend**: Railway auto-deployment
- **Frontend**: Vercel auto-deployment
- **Database migrations**: Manual via Supabase dashboard

---

# Code Review Checklist

- [ ] Follows TypeScript/Python typing standards
- [ ] Includes proper error handling
- [ ] Has appropriate tests
- [ ] Updates documentation if needed
- [ ] Follows security best practices
- [ ] Performance considerations addressed