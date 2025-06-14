import asyncio
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from infrastructure.terraform_manager import TerraformManager
from data.pinecone_manager import PineconeManager
from data.hybrid_store_manager import HybridStoreManager
from data.google_drive_lakes_manager import GoogleDriveLakesManager, DataLakeConfig
from social.firebase_social_manager import FirebaseSocialManager
from web.platform_integration_manager import PlatformIntegrationManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class OrchestratorConfig:
    project_id: str
    environment: str
    terraform_workspace: str
    pinecone_api_key: str
    firebase_config: Dict
    blockchain_config: Dict
    web_platform_configs: Dict
    data_lakes_config: Dict[str, DataLakeConfig]

class PlatformOrchestrator:
    def __init__(self, config: OrchestratorConfig):
        self.config = config
        self.terraform_mgr = TerraformManager(
            workspace=config.terraform_workspace,
            project_id=config.project_id
        )
        self.pinecone_mgr = PineconeManager(
            api_key=config.pinecone_api_key
        )
        self.hybrid_store_mgr = HybridStoreManager(
            firebase_config=config.firebase_config,
            blockchain_config=config.blockchain_config
        )
        self.social_mgr = FirebaseSocialManager(
            config=config.firebase_config
        )
        self.platform_mgr = PlatformIntegrationManager(
            configs=config.web_platform_configs
        )
        self.lakes_mgr = GoogleDriveLakesManager()
        self.logger = logger

    async def initialize(self):
        """Initialize all platform components"""
        try:
            await asyncio.gather(
                self.terraform_mgr.initialize(),
                self.pinecone_mgr.initialize(),
                self.hybrid_store_mgr.initialize(),
                self.social_mgr.initialize(),
                self.platform_mgr.initialize(),
                self.lakes_mgr.initialize(self.config.data_lakes_config)
            )
            self.logger.info("Platform initialization complete")
        except Exception as e:
            self.logger.error(f"Platform initialization failed: {str(e)}")
            raise

    async def deploy_infrastructure(self):
        """Deploy infrastructure using Terraform"""
        try:
            return await self.terraform_mgr.apply()
        except Exception as e:
            self.logger.error(f"Infrastructure deployment failed: {str(e)}")
            raise

    async def store_embeddings(self, texts: List[str], namespace: str):
        """Store embeddings in Pinecone"""
        try:
            return await self.pinecone_mgr.upsert_embeddings(texts, namespace)
        except Exception as e:
            self.logger.error(f"Embedding storage failed: {str(e)}")
            raise

    async def hybrid_data_operation(self, operation: str, data: Dict):
        """Perform hybrid data operation across Firestore and Blockchain"""
        try:
            return await self.hybrid_store_mgr.execute_operation(operation, data)
        except Exception as e:
            self.logger.error(f"Hybrid data operation failed: {str(e)}")
            raise

    async def manage_social_features(self, action: str, data: Dict):
        """Manage social features through Firebase"""
        try:
            return await self.social_mgr.execute_action(action, data)
        except Exception as e:
            self.logger.error(f"Social feature management failed: {str(e)}")
            raise

    async def deploy_web_platform(self, platform: str, template: Dict):
        """Deploy to specific web platform"""
        try:
            return await self.platform_mgr.deploy(platform, template)
        except Exception as e:
            self.logger.error(f"Web platform deployment failed: {str(e)}")
            raise

    async def health_check(self) -> Dict[str, bool]:
        """Check health of all platform components"""
        try:
            results = await asyncio.gather(
                self.terraform_mgr.health_check(),
                self.pinecone_mgr.health_check(),
                self.hybrid_store_mgr.health_check(),
                self.social_mgr.health_check(),
                self.platform_mgr.health_check()
            )
            return {
                "terraform": results[0],
                "pinecone": results[1],
                "hybrid_store": results[2],
                "social": results[3],
                "web_platform": results[4]
            }
        except Exception as e:
            self.logger.error(f"Health check failed: {str(e)}")
            raise

