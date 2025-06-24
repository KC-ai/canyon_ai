# Frontend Structure - Next.js

## Directory Organization
canyon_ai/frontend/
├── app/                                   # Next.js 14 App Router
│   ├── globals.css                        # Global styles
│   ├── layout.tsx                         # Root layout component
│   ├── page.tsx                           # Landing page
│   ├── loading.tsx                        # Global loading component
│   ├── error.tsx                          # Global error component
│   ├── not-found.tsx                      # 404 page
│   ├── (auth)/                            # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx                   # Login page
│   │   └── layout.tsx                     # Auth layout
│   └── (dashboard)/                       # Protected dashboard routes
│       ├── layout.tsx                     # Dashboard layout with sidebar
│       ├── page.tsx                       # Dashboard home
│       ├── quotes/
│       │   ├── page.tsx                   # Quotes list
│       │   ├── create/
│       │   │   └── page.tsx               # Create quote page
│       │   └── [id]/
│       │       ├── page.tsx               # Quote detail
│       │       └── edit/
│       │           └── page.tsx           # Edit quote
│       └── insights/
│           └── page.tsx                   # Analytics dashboard
├── components/                             # Reusable components
│   ├── ui/                                # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/                            # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileMenu.tsx
│   ├── quotes/                            # Quote-related components
│   │   ├── QuotesList.tsx
│   │   ├── QuoteCard.tsx
│   │   ├── QuoteForm.tsx
│   │   └── QuoteDetails.tsx
│   ├── workflows/                         # Workflow components
│   │   ├── WorkflowBuilder.tsx
│   │   ├── WorkflowStepCard.tsx
│   │   ├── WorkflowProgress.tsx
│   │   └── DragDropProvider.tsx
│   ├── charts/                            # Analytics components
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   └── LineChart.tsx
│   └── forms/                             # Form components
│       ├── QuoteItemForm.tsx
│       ├── CustomerForm.tsx
│       └── WorkflowStepForm.tsx
├── lib/                                   # Utility libraries
│   ├── api.ts                            # API client and methods
│   ├── supabase.ts                       # Supabase client setup
│   ├── auth.ts                           # Authentication utilities
│   ├── utils.ts                          # General utilities (cn, formatters)
│   ├── validations.ts                    # Zod validation schemas
│   └── constants.ts                      # App constants
├── hooks/                                 # Custom React hooks
│   ├── useAuth.ts                        # Authentication hook
│   ├── useQuotes.ts                      # Quotes data management
│   ├── useWorkflows.ts                   # Workflow management
│   ├── useRealtimeQuotes.ts              # Real-time subscriptions
│   └── useLocalStorage.ts                # Local storage management
├── types/                                 # TypeScript type definitions
│   ├── index.ts                          # Main type exports
│   ├── quotes.ts                         # Quote-related types
│   ├── workflows.ts                      # Workflow types
│   ├── auth.ts                           # Authentication types
│   └── analytics.ts                      # Analytics types
├── styles/                                # Additional styles
│   └── components.css                    # Component-specific styles
├── public/                                # Static assets
│   ├── images/
│   └── icons/
├── .env.local                            # Environment variables
├── .env.example                          # Environment variables template
├── next.config.js                        # Next.js configuration
├── tailwind.config.js                    # Tailwind CSS configuration
├── tsconfig.json                         # TypeScript configuration
├── package.json                          # Dependencies and scripts
└── README.md

## Component Design Patterns
- Functional components with TypeScript
- Custom hooks for data fetching and state management
- Proper prop typing with interfaces
- Error boundaries for error handling
- Suspense for loading states
- Memoization for performance optimization

## State Management Strategy
- Local state with useState for component-specific data
- Custom hooks for shared state logic
- Context providers for global state (auth, theme)
- Supabase real-time for live data updates
- Form state with React Hook Form
- Optimistic updates with rollback capability

## Styling Guidelines
- Tailwind CSS utility classes for styling
- Shadcn/ui components for consistent design
- CSS modules for component-specific styles
- Responsive design with mobile-first approach
- Dark mode support (future enhancement)
- Consistent spacing and color schemes