# Backend Structure - FastAPI

## Directory Organization
canyon_ai/backend/
├── app/
│   ├── init.py
│   ├── main.py                     # FastAPI app initialization
│   ├── api/                        # API route handlers
│   │   ├── init.py
│   │   ├── auth.py                 # Authentication endpoints
│   │   ├── quotes.py               # Quote CRUD operations
│   │   ├── workflows.py            # Workflow management
│   │   ├── analytics.py            # Analytics endpoints
│   │   └── llm.py                  # Claude AI integration
│   ├── models/                     # Pydantic data models
│   │   ├── init.py
│   │   ├── quotes.py               # Quote-related models
│   │   ├── workflows.py            # Workflow models
│   │   ├── users.py                # User models
│   │   └── analytics.py            # Analytics models
│   ├── services/                   # Business logic layer
│   │   ├── init.py
│   │   ├── quote_service.py        # Quote business logic
│   │   ├── workflow_service.py     # Workflow business logic
│   │   ├── llm_service.py          # Claude AI integration
│   │   ├── analytics_service.py    # Analytics calculations
│   │   └── notification_service.py # Email/notification logic
│   ├── core/                       # Core configuration
│   │   ├── init.py
│   │   ├── config.py               # Settings and environment vars
│   │   ├── database.py             # Supabase client setup
│   │   ├── security.py             # Authentication utilities
│   │   └── exceptions.py           # Custom exception classes
│   └── utils/                      # Utility functions
│       ├── init.py
│       ├── helpers.py              # General helper functions
│       ├── validators.py           # Custom validation functions
│       └── formatters.py           # Data formatting utilities
├── tests/                          # Test files
│   ├── init.py
│   ├── test_quotes.py
│   ├── test_workflows.py
│   └── test_llm.py
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variables template
├── .gitignore
└── README.md

## API Design Patterns
- RESTful endpoints with proper HTTP methods
- Consistent response format: `{"data": {...}, "message": "...", "status": "success"}`
- Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Request/response models with Pydantic validation
- Async/await for all database operations
- Dependency injection for database and auth

## Business Logic Organization
- Services contain all business rules and validation
- API routes are thin layers that call services
- Models define data structure and validation only
- Core modules handle cross-cutting concerns
- Utils contain pure functions with no side effects

## Error Handling Strategy
- Custom exception classes for different error types
- Global exception handler for consistent error responses
- Detailed logging for debugging
- User-friendly error messages
- Proper HTTP status code mapping