from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Optional, Any
from dataclasses import dataclass

class AuthType(Enum):
    OAUTH = "oauth"
    API_KEY = "api_key"
    JWT = "jwt"

class AuthenticationModel(ABC):
    @abstractmethod
    def authenticate(self) -> bool:
        pass

    @abstractmethod
    def get_credentials(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def refresh(self) -> bool:
        pass

class OAuthModel(AuthenticationModel):
    def __init__(self, client_id: str, client_secret: str, scope: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.scope = scope
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def authenticate(self) -> bool:
        # Implement OAuth authentication flow
        # This would typically involve a token request to an auth server
        return True

    def get_credentials(self) -> Dict[str, Any]:
        return {
            "type": "oauth",
            "access_token": self.access_token,
            "scope": self.scope
        }

    def refresh(self) -> bool:
        # Implement token refresh logic
        return True

class APIKeyModel(AuthenticationModel):
    def __init__(self, api_key: str):
        self.api_key = api_key

    def authenticate(self) -> bool:
        # Validate API key format and possibly check against a service
        return bool(self.api_key)

    def get_credentials(self) -> Dict[str, Any]:
        return {
            "type": "api_key",
            "key": self.api_key
        }

    def refresh(self) -> bool:
        # API keys typically don't need refresh
        return True

class JWTModel(AuthenticationModel):
    def __init__(self, private_key: str, issuer: str):
        self.private_key = private_key
        self.issuer = issuer
        self.token: Optional[str] = None

    def authenticate(self) -> bool:
        # Implement JWT signing and validation
        return True

    def get_credentials(self) -> Dict[str, Any]:
        return {
            "type": "jwt",
            "token": self.token,
            "issuer": self.issuer
        }

    def refresh(self) -> bool:
        # Generate a new JWT if needed
        return True

@dataclass
class ServiceAccountConfig:
    auth_type: AuthType
    credentials: Dict[str, Any]
    name: str
    tenant_id: Optional[str] = None

class ServiceAccountProvider:
    def __init__(self):
        self._auth_model: Optional[AuthenticationModel] = None
        self._config: Optional[ServiceAccountConfig] = None

    @staticmethod
    def create_auth_model(config: ServiceAccountConfig) -> AuthenticationModel:
        if config.auth_type == AuthType.OAUTH:
            return OAuthModel(
                config.credentials["client_id"],
                config.credentials["client_secret"],
                config.credentials["scope"]
            )
        elif config.auth_type == AuthType.API_KEY:
            return APIKeyModel(config.credentials["api_key"])
        elif config.auth_type == AuthType.JWT:
            return JWTModel(
                config.credentials["private_key"],
                config.credentials["issuer"]
            )
        raise ValueError(f"Unsupported auth type: {config.auth_type}")

    def configure(self, config: ServiceAccountConfig) -> bool:
        self._config = config
        self._auth_model = self.create_auth_model(config)
        return self._auth_model.authenticate()

    def switch_auth_model(self, new_config: ServiceAccountConfig) -> bool:
        return self.configure(new_config)

    def get_current_credentials(self) -> Dict[str, Any]:
        if not self._auth_model:
            raise RuntimeError("No authentication model configured")
        return self._auth_model.get_credentials()

    def refresh_credentials(self) -> bool:
        if not self._auth_model:
            raise RuntimeError("No authentication model configured")
        return self._auth_model.refresh()

    @property
    def is_authenticated(self) -> bool:
        return bool(self._auth_model and self._auth_model.authenticate())

    @property
    def current_config(self) -> Optional[ServiceAccountConfig]:
        return self._config

