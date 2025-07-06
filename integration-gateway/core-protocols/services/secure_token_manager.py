import os
import time
import json
import logging
import platform
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pathlib import Path
from threading import Lock
from dataclasses import dataclass
from functools import wraps
from cryptography.fernet import Fernet
from abc import ABC, abstractmethod

# Platform-specific imports
try:
    import keyring  # For macOS Keychain and Windows Credential Manager
except ImportError:
    keyring = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PlatformType(Enum):
    MACOS = "macos"
    WINDOWS = "windows"
    IOS = "ios"
    ANDROID = "android"
    UNKNOWN = "unknown"

@dataclass
class TokenMetadata:
    tenant_id: str
    created_at: float
    expires_at: float
    last_accessed: float
    access_count: int
    
class RateLimiter:
    def __init__(self, max_requests: int, time_window: float):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = {}
        self.lock = Lock()
        
    def is_allowed(self, key: str) -> bool:
        with self.lock:
            now = time.time()
            if key not in self.requests:
                self.requests[key] = []
            
            # Remove old requests
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if now - req_time <= self.time_window
            ]
            
            if len(self.requests[key]) >= self.max_requests:
                return False
                
            self.requests[key].append(now)
            return True

class SecureStorageBackend(ABC):
    @abstractmethod
    def store(self, key: str, value: str) -> None:
        pass
        
    @abstractmethod
    def retrieve(self, key: str) -> Optional[str]:
        pass
        
    @abstractmethod
    def delete(self, key: str) -> None:
        pass

class KeyringStorage(SecureStorageBackend):
    def __init__(self, service_name: str = "AIXTIVTokenManager"):
        self.service_name = service_name
        
    def store(self, key: str, value: str) -> None:
        keyring.set_password(self.service_name, key, value)
        
    def retrieve(self, key: str) -> Optional[str]:
        return keyring.get_password(self.service_name, key)
        
    def delete(self, key: str) -> None:
        keyring.delete_password(self.service_name, key)

class SecureTokenManager:
    def __init__(
        self,
        encryption_key: Optional[str] = None,
        max_requests: int = 100,
        time_window: float = 60.0
    ):
        # Initialize encryption
        self.fernet = Fernet(
            encryption_key.encode() if encryption_key
            else Fernet.generate_key()
        )
        
        # Initialize rate limiter
        self.rate_limiter = RateLimiter(max_requests, time_window)
        
        # Initialize platform-specific storage
        self.platform = self._detect_platform()
        self.storage = self._init_storage()
        
        # Initialize locks for thread safety
        self.token_lock = Lock()
        
        # Initialize audit log
        self.audit_logger = logging.getLogger("token_audit")
        self._setup_audit_logging()
        
    def _detect_platform(self) -> PlatformType:
        system = platform.system().lower()
        if system == "darwin":
            return PlatformType.MACOS
        elif system == "windows":
            return PlatformType.WINDOWS
        # Add mobile detection logic here
        return PlatformType.UNKNOWN
        
    def _init_storage(self) -> SecureStorageBackend:
        if self.platform in [PlatformType.MACOS, PlatformType.WINDOWS]:
            return KeyringStorage()
        # Add other platform storage implementations
        raise NotImplementedError(f"Platform {self.platform} not supported")
        
    def _setup_audit_logging(self) -> None:
        audit_handler = logging.FileHandler("token_audit.log")
        audit_handler.setFormatter(
            logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        )
        self.audit_logger.addHandler(audit_handler)
        
    def _rate_limit_decorator(func):
        @wraps(func)
        def wrapper(self, tenant_id: str, *args, **kwargs):
            if not self.rate_limiter.is_allowed(tenant_id):
                raise Exception("Rate limit exceeded for tenant")
            return func(self, tenant_id, *args, **kwargs)
        return wrapper
        
    def _get_storage_key(self, tenant_id: str, token_id: str) -> str:
        return f"{tenant_id}:{token_id}"
        
    @_rate_limit_decorator
    def store_token(
        self,
        tenant_id: str,
        token_id: str,
        token_value: str,
        expires_in: Optional[float] = None
    ) -> None:
        with self.token_lock:
            storage_key = self._get_storage_key(tenant_id, token_id)
            
            # Create token metadata
            now = time.time()
            metadata = TokenMetadata(
                tenant_id=tenant_id,
                created_at=now,
                expires_at=now + expires_in if expires_in else float('inf'),
                last_accessed=now,
                access_count=0
            )
            
            # Encrypt token and metadata
            encrypted_data = self.fernet.encrypt(
                json.dumps({
                    "value": token_value,
                    "metadata": metadata.__dict__
                }).encode()
            )
            
            # Store encrypted data
            self.storage.store(storage_key, encrypted_data.decode())
            
            # Audit log
            self.audit_logger.info(
                f"Token stored - Tenant: {tenant_id}, Token ID: {token_id}"
            )
            
    @_rate_limit_decorator
    def retrieve_token(
        self,
        tenant_id: str,
        token_id: str
    ) -> Optional[str]:
        with self.token_lock:
            storage_key = self._get_storage_key(tenant_id, token_id)
            encrypted_data = self.storage.retrieve(storage_key)
            
            if not encrypted_data:
                return None
                
            # Decrypt and verify
            try:
                decrypted_data = json.loads(
                    self.fernet.decrypt(encrypted_data.encode())
                )
                
                # Update metadata
                metadata = TokenMetadata(**decrypted_data["metadata"])
                if metadata.expires_at <= time.time():
                    self.storage.delete(storage_key)
                    return None
                    
                metadata.last_accessed = time.time()
                metadata.access_count += 1
                
                # Re-encrypt with updated metadata
                self.storage.store(
                    storage_key,
                    self.fernet.encrypt(
                        json.dumps({
                            "value": decrypted_data["value"],
                            "metadata": metadata.__dict__
                        }).encode()
                    ).decode()
                )
                
                # Audit log
                self.audit_logger.info(
                    f"Token retrieved - Tenant: {tenant_id}, "
                    f"Token ID: {token_id}"
                )
                
                return decrypted_data["value"]
            except Exception as e:
                self.audit_logger.error(
                    f"Token retrieval failed - Tenant: {tenant_id}, "
                    f"Token ID: {token_id}, Error: {str(e)}"
                )
                return None
                
    @_rate_limit_decorator
    def delete_token(self, tenant_id: str, token_id: str) -> None:
        with self.token_lock:
            storage_key = self._get_storage_key(tenant_id, token_id)
            self.storage.delete(storage_key)
            
            # Audit log
            self.audit_logger.info(
                f"Token deleted - Tenant: {tenant_id}, Token ID: {token_id}"
            )
            
    def get_token_metadata(
        self,
        tenant_id: str,
        token_id: str
    ) -> Optional[TokenMetadata]:
        with self.token_lock:
            storage_key = self._get_storage_key(tenant_id, token_id)
            encrypted_data = self.storage.retrieve(storage_key)
            
            if not encrypted_data:
                return None
                
            try:
                decrypted_data = json.loads(
                    self.fernet.decrypt(encrypted_data.encode())
                )
                return TokenMetadata(**decrypted_data["metadata"])
            except Exception:
                return None

