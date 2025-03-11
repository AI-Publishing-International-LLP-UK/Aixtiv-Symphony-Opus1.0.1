"""
Core data models for Dr. Memoria's Anthology system.
These models represent the foundation of the content creation and publishing workflow.
"""

from typing import List, Dict, Any, Optional, Union
from enum import Enum
from datetime import datetime
import uuid
from pydantic import BaseModel, Field


class ContributionType(str, Enum):
    """Types of contributions to a creative work"""
    HUMAN = "human"
    AI = "ai"


class ContentType(str, Enum):
    """Types of content that can be created"""
    ARTICLE = "article"
    BLOG_POST = "blog_post"
    BOOK = "book"
    COURSE = "course"
    VIDEO = "video"
    PODCAST = "podcast"
    SOCIAL_MEDIA = "social_media"


class PublishingPlatform(str, Enum):
    """Supported publishing platforms"""
    YOUTUBE = "youtube"
    KINDLE = "kindle"
    COURSERA = "coursera"
    MEDIUM = "medium"
    WORDPRESS = "wordpress"
    WEBSITE = "website"


class WorkStatus(str, Enum):
    """Status of a creative work"""
    DRAFT = "draft"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CreativeContribution(BaseModel):
    """
    Represents a single contribution to a creative work,
    following the Roark 5.0 Authorship Model.
    """
    contribution_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contributor_id: str
    contribution_type: ContributionType
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class CreativePassport(BaseModel):
    """
    Digital passport for a creative work, used for blockchain registration
    and verification of ownership and contribution.
    """
    unique_identifier: str
    title: str
    owner_id: str
    content_type: ContentType
    creation_timestamp: datetime
    last_updated_timestamp: datetime
    human_contribution_percentage: float
    ai_contribution_percentage: float
    originality_score: float
    contributor_count: int
    blockchain_transaction_id: Optional[str] = None
    blockchain_registration_timestamp: Optional[datetime] = None
    qr_approval_hash: Optional[str] = None
    qr_approval_timestamp: Optional[datetime] = None


class CreativeWork(BaseModel):
    """
    Represents a complete creative work with all its contributions
    and metadata for publishing and verification.
    """
    work_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    title: str
    content_type: ContentType
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    status: WorkStatus = WorkStatus.DRAFT
    contributions: List[CreativeContribution] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    creative_passport: Optional[CreativePassport] = None
    published_urls: Dict[PublishingPlatform, str] = Field(default_factory=dict)
    revenue_data: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }
    
    def add_contribution(self, contribution: CreativeContribution):
        """Add a contribution to the creative work"""
        self.contributions.append(contribution)
        self.updated_at = datetime.now()
    
    def get_human_contributions(self) -> List[CreativeContribution]:
        """Get all human contributions to the work"""
        return [c for c in self.contributions if c.contribution_type == ContributionType.HUMAN]
    
    def get_ai_contributions(self) -> List[CreativeContribution]:
        """Get all AI contributions to the work"""
        return [c for c in self.contributions if c.contribution_type == ContributionType.AI]
    
    def calculate_contribution_percentages(self) -> Dict[ContributionType, float]:
        """Calculate the percentage of human vs AI contributions"""
        total = len(self.contributions)
        if total == 0:
            return {ContributionType.HUMAN: 0, ContributionType.AI: 0}
        
        human_count = len(self.get_human_contributions())
        ai_count = len(self.get_ai_contributions())
        
        return {
            ContributionType.HUMAN: human_count / total,
            ContributionType.AI: ai_count / total
        }
    
    def generate_creative_passport(self, originality_score: float) -> CreativePassport:
        """Generate a creative passport for blockchain registration"""
        contribution_percentages = self.calculate_contribution_percentages()
        
        passport = CreativePassport(
            unique_identifier=self.work_id,
            title=self.title,
            owner_id=self.owner_id,
            content_type=self.content_type,
            creation_timestamp=self.created_at,
            last_updated_timestamp=self.updated_at,
            human_contribution_percentage=contribution_percentages[ContributionType.HUMAN],
            ai_contribution_percentage=contribution_percentages[ContributionType.AI],
            originality_score=originality_score,
            contributor_count=len(set([c.contributor_id for c in self.contributions]))
        )
        
        self.creative_passport = passport
        return passport


class PublishingConfig(BaseModel):
    """Configuration for publishing to a specific platform"""
    platform: PublishingPlatform
    title: Optional[str] = None  # Override default title if needed
    description: Optional[str] = None  # Override default description if needed
    tags: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    visibility: str = "public"  # public, private, unlisted
    platform_specific: Dict[str, Any] = Field(default_factory=dict)


class PublishingResult(BaseModel):
    """Result of a publishing operation"""
    platform: PublishingPlatform
    success: bool
    url: Optional[str] = None
    platform_id: Optional[str] = None  # ID on the platform (video ID, etc.)
    timestamp: datetime = Field(default_factory=datetime.now)
    error: Optional[str] = None
    analytics_url: Optional[str] = None
