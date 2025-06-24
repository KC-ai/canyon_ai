# Canyon.ai Technology Stack

## Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS 3.3+
- **Components**: Shadcn/ui + Radix UI
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **State Management**: React useState/useEffect + Custom hooks
- **HTTP Client**: Fetch API with custom wrapper

## Backend Stack
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.11+
- **Data Validation**: Pydantic 2.5+
- **HTTP Client**: httpx
- **AI Integration**: Anthropic Claude API
- **Environment**: python-dotenv
- **ASGI Server**: Uvicorn

## Database & Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth)
- **Real-time**: Supabase Real-time subscriptions
- **File Storage**: Supabase Storage (if needed)
- **Row-Level Security**: Supabase RLS policies

## Development Tools
- **Package Manager**: npm (frontend), pip/poetry (backend)
- **Linting**: ESLint + Prettier (frontend), Black + isort (backend)
- **Type Checking**: TypeScript (frontend), mypy (backend)
- **Testing**: Jest + React Testing Library (frontend), pytest (backend)

## Deployment
- **Frontend**: Vercel (auto-deploy from GitHub)
- **Backend**: Railway (auto-deploy from GitHub)
- **Database**: Supabase (managed)
- **Monitoring**: Built-in platform monitoring + Sentry (optional)

## Environment Configuration
- **Development**: Local servers with hot reload
- **Staging**: Preview deployments on feature branches
- **Production**: Main branch auto-deployment
- **Environment Variables**: Separate .env files per environment