import os
import json
import time
from typing import Optional, Dict, Any
import aiohttp
import asyncio
from dataclasses import dataclass
from abc import ABC, abstractmethod
from urllib.parse import urlencode

@dataclass
class OAuthConfig:
    client_id: str
    client_secret: str
    redirect_uri: str
    auth_url: str
    token_url: str
    scopes: list[str]

class OAuthToken:
    def __init__(self, access_token: str, refresh_token: str, expires_in: int):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = time.time() + expires_in
        
    @property
    def expired(self) -> bool:
        return time.time() >= self.expires_at

class OAuthProvider(ABC):
    def __init__(self, config: OAuthConfig):
        self.config = config
        self.token: Optional[OAuthToken] = None
        
    @abstractmethod
    async def get_authorization_url(self) -> str:
        pass
        
    @abstractmethod
    async def fetch_token(self, code: str) -> OAuthToken:
        pass
        
    @abstractmethod
    async def refresh_token(self) -> None:
        pass
        
    async def get_valid_token(self) -> str:
        if self.token is None:
            raise ValueError("Not authenticated")
        if self.token.expired:
            await self.refresh_token()
        return self.token.access_token

class GoogleOAuth(OAuthProvider):
    def __init__(self):
        config = OAuthConfig(
            client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
            redirect_uri="http://localhost:8080/callback",
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=["https://www.googleapis.com/auth/userinfo.profile"]
        )
        super().__init__(config)
        
    async def get_authorization_url(self) -> str:
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "scope": " ".join(self.config.scopes),
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }
        return f"{self.config.auth_url}?{urlencode(params)}"
        
    async def fetch_token(self, code: str) -> OAuthToken:
        async with aiohttp.ClientSession() as session:
            data = {
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.config.redirect_uri
            }
            async with session.post(self.config.token_url, data=data) as resp:
                if resp.status != 200:
                    raise ValueError(f"Token fetch failed: {await resp.text()}")
                token_data = await resp.json()
                self.token = OAuthToken(
                    token_data["access_token"],
                    token_data["refresh_token"],
                    token_data["expires_in"]
                )
                return self.token
                
    async def refresh_token(self) -> None:
        if not self.token or not self.token.refresh_token:
            raise ValueError("No refresh token available")
            
        async with aiohttp.ClientSession() as session:
            data = {
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "refresh_token": self.token.refresh_token,
                "grant_type": "refresh_token"
            }
            async with session.post(self.config.token_url, data=data) as resp:
                if resp.status != 200:
                    raise ValueError(f"Token refresh failed: {await resp.text()}")
                token_data = await resp.json()
                self.token = OAuthToken(
                    token_data["access_token"],
                    self.token.refresh_token,  # Keep existing refresh token
                    token_data["expires_in"]
                )

class GitHubOAuth(OAuthProvider):
    def __init__(self):
        config = OAuthConfig(
            client_id=os.getenv("GITHUB_CLIENT_ID", ""),
            client_secret=os.getenv("GITHUB_CLIENT_SECRET", ""),
            redirect_uri="http://localhost:8080/callback",
            auth_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            scopes=["repo", "user"]
        )
        super().__init__(config)
        
    async def get_authorization_url(self) -> str:
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "scope": " ".join(self.config.scopes),
            "state": "random_state_string"  # In production, use secure random string
        }
        return f"{self.config.auth_url}?{urlencode(params)}"
        
    async def fetch_token(self, code: str) -> OAuthToken:
        async with aiohttp.ClientSession() as session:
            headers = {"Accept": "application/json"}
            data = {
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "code": code,
                "redirect_uri": self.config.redirect_uri
            }
            async with session.post(self.config.token_url, headers=headers, data=data) as resp:
                if resp.status != 200:
                    raise ValueError(f"Token fetch failed: {await resp.text()}")
                token_data = await resp.json()
                self.token = OAuthToken(
                    token_data["access_token"],
                    "",  # GitHub doesn't provide refresh tokens
                    60 * 60  # GitHub tokens typically don't expire
                )
                return self.token
                
    async def refresh_token(self) -> None:
        # GitHub's OAuth tokens don't expire by default
        pass

class OAuthExample:
    def __init__(self):
        self.google_oauth = GoogleOAuth()
        self.github_oauth = GitHubOAuth()
        
    async def demonstrate_google_flow(self):
        try:
            # 1. Get authorization URL
            auth_url = await self.google_oauth.get_authorization_url()
            print(f"Visit this URL to authorize: {auth_url}")
            
            # 2. Get authorization code (simulated here)
            code = input("Enter the authorization code: ")
            
            # 3. Exchange code for token
            token = await self.google_oauth.fetch_token(code)
            print(f"Received access token: {token.access_token[:10]}...")
            
            # 4. Make an API call
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {token.access_token}"}
                async with session.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers=headers
                ) as resp:
                    user_info = await resp.json()
                    print(f"User info: {json.dumps(user_info, indent=2)}")
                    
        except Exception as e:
            print(f"Error in Google OAuth flow: {str(e)}")
            
    async def demonstrate_github_flow(self):
        try:
            # 1. Get authorization URL
            auth_url = await self.github_oauth.get_authorization_url()
            print(f"Visit this URL to authorize: {auth_url}")
            
            # 2. Get authorization code (simulated here)
            code = input("Enter the authorization code: ")
            
            # 3. Exchange code for token
            token = await self.github_oauth.fetch_token(code)
            print(f"Received access token: {token.access_token[:10]}...")
            
            # 4. Make an API call
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {token.access_token}",
                    "Accept": "application/vnd.github.v3+json"
                }
                async with session.get(
                    "https://api.github.com/user",
                    headers=headers
                ) as resp:
                    user_info = await resp.json()
                    print(f"User info: {json.dumps(user_info, indent=2)}")
                    
        except Exception as e:
            print(f"Error in GitHub OAuth flow: {str(e)}")

async def main():
    example = OAuthExample()
    
    print("Demonstrating Google OAuth flow...")
    await example.demonstrate_google_flow()
    
    print("\nDemonstrating GitHub OAuth flow...")
    await example.demonstrate_github_flow()

if __name__ == "__main__":
    asyncio.run(main())

