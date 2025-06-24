from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api import quotes

app = FastAPI(title="Canyon CPQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Canyon CPQ API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/test/protected")
async def protected_endpoint(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = authorization.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Token missing")
    
    return {
        "message": "This is a protected endpoint - authenticated!",
        "status": "success",
        "token_received": True,
        "token_length": len(token)
    }

app.include_router(quotes.router, prefix="/api/quotes", tags=["quotes"])