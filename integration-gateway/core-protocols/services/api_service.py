from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.security import OAuth2AuthorizationCodeBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
import os
from typing import List, Optional, Dict
import time
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize FastAPI app
app = FastAPI(
    title="Webhook Management API",
    description="API for managing OAuth tokens and webhook subscriptions",
    version="1.0.0"
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 configuration
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    tokenUrl="token",
    authorizationUrl="authorize"
)

# Models
class WebhookSubscription(BaseModel):
    id: Optional[str]
    url: HttpUrl
    events: List[str]
    secret: Optional[str]
    description: Optional[str]
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str

# Authentication middleware
async def verify_token(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return token

# Rate limiting decorator
@app.middleware("http")
async def add_rate_limit_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Rate-Limit-Limit"] = "100"
    response.headers["X-Rate-Limit-Remaining"] = "99"
    response.headers["X-Rate-Limit-Reset"] = str(int(time.time() + 3600))
    return response

# OAuth endpoints
@app.post("/token", response_model=TokenResponse)
@limiter.limit("5/minute")
async def token_endpoint(request: Request):
    # OAuth token generation logic here
    return {
        "access_token": "generated_token",
        "token_type": "bearer",
        "expires_in": 3600,
        "refresh_token": "refresh_token"
    }

@app.post("/token/refresh", response_model=TokenResponse)
@limiter.limit("5/minute")
async def refresh_token(request: Request):
    # Token refresh logic here
    pass

# Webhook subscription endpoints
@app.post("/webhooks", response_model=WebhookSubscription)
async def create_webhook(
    subscription: WebhookSubscription,
    token: str = Depends(verify_token)
):
    # Create webhook subscription
    return subscription

@app.get("/webhooks", response_model=List[WebhookSubscription])
async def list_webhooks(token: str = Depends(verify_token)):
    # List webhook subscriptions
    return []

@app.get("/webhooks/{webhook_id}", response_model=WebhookSubscription)
async def get_webhook(webhook_id: str, token: str = Depends(verify_token)):
    # Get specific webhook
    pass

@app.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str, token: str = Depends(verify_token)):
    # Delete webhook subscription
    return {"status": "deleted"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)

