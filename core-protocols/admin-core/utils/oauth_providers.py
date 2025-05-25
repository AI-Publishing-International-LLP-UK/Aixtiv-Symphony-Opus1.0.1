from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional
import json
import time
from datetime import datetime, timedelta

class AuthFlowType(Enum):
    OAUTH2_CODE = "oauth2_code"
    CLIENT_CREDENTIALS = "client_credentials"
    SERVICE_ACCOUNT = "service_account"
    DEVICE_CODE = "device_code"
    APP_TOKEN = "app_token"

@dataclass
class OAuth2Token:
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None
    scope: Optional[str] = None
    created_at: float = time.time()

    @property
    def is_expired(self) -> bool:
        return time.time() > (self.created_at + self.expires_in - 300)  # 5 min buffer

class OAuth2Provider(ABC):
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        scopes: List[str],
        auth_flow: AuthFlowType
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.scopes = scopes
        self.auth_flow = auth_flow
        self.token: Optional[OAuth2Token] = None

    @abstractmethod
    async def authenticate(self) -> OAuth2Token:
        """Perform authentication flow and return token"""
        pass

    @abstractmethod
    async def refresh(self, token: OAuth2Token) -> OAuth2Token:
        """Refresh an expired token"""
        pass

    @abstractmethod
    def validate_scopes(self, scopes: List[str]) -> bool:
        """Validate requested scopes against provider capabilities"""
        pass

class GoogleAuthProvider(OAuth2Provider):
    AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        scopes: List[str],
        auth_flow: AuthFlowType,
        service_account_key: Optional[Dict] = None,
        workspace_domain: Optional[str] = None
    ):
        super().__init__(client_id, client_secret, scopes, auth_flow)
        self.service_account_key = service_account_key
        self.workspace_domain = workspace_domain
        
    async def authenticate(self) -> OAuth2Token:
        if self.auth_flow == AuthFlowType.SERVICE_ACCOUNT:
            return await self._authenticate_service_account()
        elif self.auth_flow == AuthFlowType.OAUTH2_CODE:
            return await self._authenticate_oauth2()
        elif self.auth_flow == AuthFlowType.CLIENT_CREDENTIALS:
            return await self._authenticate_adc()
        raise ValueError(f"Unsupported auth flow: {self.auth_flow}")

    async def _authenticate_service_account(self) -> OAuth2Token:
        if not self.service_account_key:
            raise ValueError("Service account key required")
        # Implement JWT assertion flow for service accounts
        # Sign JWT with service account key
        # Exchange JWT for access token
        pass

    async def _authenticate_oauth2(self) -> OAuth2Token:
        # Implement standard OAuth2 code flow
        # Generate authorization URL
        # Handle callback with auth code
        # Exchange code for tokens
        pass

    async def _authenticate_adc(self) -> OAuth2Token:
        # Implement Application Default Credentials flow
        # Check env vars and metadata server
        # Fall back to user credentials if available
        pass

    async def refresh(self, token: OAuth2Token) -> OAuth2Token:
        if not token.refresh_token:
            return await self.authenticate()
        # Implement token refresh logic
        pass

    def validate_scopes(self, scopes: List[str]) -> bool:
        valid_scopes = {
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/userinfo.email",
            # Add other valid Google scopes
        }
        return all(scope in valid_scopes for scope in scopes)

class GitHubAuthProvider(OAuth2Provider):
    AUTH_ENDPOINT = "https://github.com/login/oauth/authorize"
    TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token"
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        scopes: List[str],
        auth_flow: AuthFlowType,
        app_id: Optional[str] = None,
        private_key: Optional[str] = None,
        installation_id: Optional[str] = None
    ):
        super().__init__(client_id, client_secret, scopes, auth_flow)
        self.app_id = app_id
        self.private_key = private_key
        self.installation_id = installation_id

    async def authenticate(self) -> OAuth2Token:
        if self.auth_flow == AuthFlowType.APP_TOKEN:
            return await self._authenticate_github_app()
        elif self.auth_flow == AuthFlowType.OAUTH2_CODE:
            return await self._authenticate_oauth_app()
        elif self.auth_flow == AuthFlowType.CLIENT_CREDENTIALS:
            return await self._authenticate_pat()
        raise ValueError(f"Unsupported auth flow: {self.auth_flow}")

    async def _authenticate_github_app(self) -> OAuth2Token:
        if not all([self.app_id, self.private_key, self.installation_id]):
            raise ValueError("GitHub App credentials required")
        # Implement GitHub App authentication
        # Generate JWT for app
        # Get installation access token
        pass

    async def _authenticate_oauth_app(self) -> OAuth2Token:
        # Implement standard OAuth flow for GitHub
        # Generate authorization URL
        # Handle callback with temporary code
        # Exchange for access token
        pass

    async def _authenticate_pat(self) -> OAuth2Token:
        # Handle personal access token flow
        # Validate token permissions
        pass

    async def refresh(self, token: OAuth2Token) -> OAuth2Token:
        # GitHub tokens don't support refresh
        # Get new token based on flow type
        return await self.authenticate()

    def validate_scopes(self, scopes: List[str]) -> bool:
        valid_scopes = {
            "repo", "workflow", "admin:org",
            "user", "project", "notifications",
            # Add other valid GitHub scopes
        }
        return all(scope in valid_scopes for scope in scopes)

