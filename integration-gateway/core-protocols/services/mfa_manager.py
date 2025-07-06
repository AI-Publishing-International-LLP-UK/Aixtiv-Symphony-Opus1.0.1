from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import hmac
import json
import logging
import os
import pyotp
import secrets
import time
from typing import Dict, List, Optional, Set, Tuple, Union
from cryptography.fernet import Fernet

class MFAMethod(Enum):
    TOTP = "totp"
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"

class MFAStatus(Enum):
    ENABLED = "enabled"
    DISABLED = "disabled"
    PENDING = "pending"

@dataclass
class MFAConfig:
    tenant_id: str
    user_id: str
    methods: Set[MFAMethod]
    backup_codes: List[str]
    status: MFAStatus
    created_at: datetime
    updated_at: datetime
    settings: Dict

class PlatformSecureStorage(ABC):
    @abstractmethod
    def store(self, key: str, value: str) -> None:
        pass
    
    @abstractmethod
    def retrieve(self, key: str) -> Optional[str]:
        pass
    
    @abstractmethod
    def delete(self, key: str) -> None:
        pass

class MFAProvider(ABC):
    @abstractmethod
    async def generate_challenge(self, user_id: str) -> str:
        pass
    
    @abstractmethod
    async def verify_challenge(self, user_id: str, code: str) -> bool:
        pass

class TOTPProvider(MFAProvider):
    def __init__(self, secret_key: Optional[str] = None):
        self.secret_key = secret_key or pyotp.random_base32()
        self.totp = pyotp.TOTP(self.secret_key)
    
    async def generate_challenge(self, user_id: str) -> str:
        return self.secret_key
    
    async def verify_challenge(self, user_id: str, code: str) -> bool:
        return self.totp.verify(code)

class RateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: Dict[str, List[float]] = {}
    
    def check_rate_limit(self, key: str) -> bool:
        now = time.time()
        if key not in self.attempts:
            self.attempts[key] = []
        
        # Clean up old attempts
        self.attempts[key] = [t for t in self.attempts[key] 
                            if now - t < self.window_seconds]
        
        if len(self.attempts[key]) >= self.max_attempts:
            return False
        
        self.attempts[key].append(now)
        return True

class MFAManager:
    def __init__(self, 
                platform_storage: PlatformSecureStorage,
                encryption_key: Optional[bytes] = None):
        self.storage = platform_storage
        self.encryption_key = encryption_key or Fernet.generate_key()
        self.fernet = Fernet(self.encryption_key)
        self.rate_limiter = RateLimiter()
        self.logger = logging.getLogger(__name__)
        
        # Provider instances
        self.providers: Dict[MFAMethod, MFAProvider] = {
            MFAMethod.TOTP: TOTPProvider()
        }
    
    def _get_storage_key(self, tenant_id: str, user_id: str) -> str:
        return f"mfa:{tenant_id}:{user_id}"
    
    def _encrypt(self, data: str) -> str:
        return self.fernet.encrypt(data.encode()).decode()
    
    def _decrypt(self, data: str) -> str:
        return self.fernet.decrypt(data.encode()).decode()
    
    def generate_backup_codes(self, count: int = 8) -> List[str]:
        return [secrets.token_hex(4) for _ in range(count)]
    
    async def setup_mfa(self, 
                    tenant_id: str,
                    user_id: str,
                    method: MFAMethod) -> Tuple[str, List[str]]:
        if not self.rate_limiter.check_rate_limit(f"setup:{tenant_id}:{user_id}"):
            raise ValueError("Rate limit exceeded for MFA setup")
        
        provider = self.providers.get(method)
        if not provider:
            raise ValueError(f"Unsupported MFA method: {method}")
        
        challenge = await provider.generate_challenge(user_id)
        backup_codes = self.generate_backup_codes()
        
        config = MFAConfig(
            tenant_id=tenant_id,
            user_id=user_id,
            methods={method},
            backup_codes=[hashlib.sha256(code.encode()).hexdigest() 
                        for code in backup_codes],
            status=MFAStatus.PENDING,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            settings={"challenge": challenge}
        )
        
        storage_key = self._get_storage_key(tenant_id, user_id)
        encrypted_config = self._encrypt(json.dumps(config.__dict__))
        self.storage.store(storage_key, encrypted_config)
        
        self.logger.info(f"MFA setup initiated for user {user_id} in tenant {tenant_id}")
        return challenge, backup_codes
    
    async def verify_mfa(self,
                    tenant_id: str,
                    user_id: str,
                    method: MFAMethod,
                    code: str) -> bool:
        if not self.rate_limit_check(f"verify:{tenant_id}:{user_id}"):
            raise ValueError("Rate limit exceeded for MFA verification")
        
        storage_key = self._get_storage_key(tenant_id, user_id)
        encrypted_config = self.storage.retrieve(storage_key)
        if not encrypted_config:
            raise ValueError("MFA not configured for user")
        
        config_dict = json.loads(self._decrypt(encrypted_config))
        config = MFAConfig(**config_dict)
        
        # Check if code is a backup code
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        if code_hash in config.backup_codes:
            config.backup_codes.remove(code_hash)
            updated_config = self._encrypt(json.dumps(config.__dict__))
            self.storage.store(storage_key, updated_config)
            self.logger.info(f"Backup code used for user {user_id} in tenant {tenant_id}")
            return True
        
        provider = self.providers.get(method)
        if not provider:
            raise ValueError(f"Unsupported MFA method: {method}")
        
        is_valid = await provider.verify_challenge(user_id, code)
        self.logger.info(
            f"MFA verification {'successful' if is_valid else 'failed'} "
            f"for user {user_id} in tenant {tenant_id}"
        )
        return is_valid
    
    def disable_mfa(self, tenant_id: str, user_id: str) -> None:
        storage_key = self._get_storage_key(tenant_id, user_id)
        self.storage.delete(storage_key)
        self.logger.info(f"MFA disabled for user {user_id} in tenant {tenant_id}")
    
    def get_mfa_status(self, tenant_id: str, user_id: str) -> Optional[MFAConfig]:
        storage_key = self._get_storage_key(tenant_id, user_id)
        encrypted_config = self.storage.retrieve(storage_key)
        if not encrypted_config:
            return None
        
        config_dict = json.loads(self._decrypt(encrypted_config))
        return MFAConfig(**config_dict)

