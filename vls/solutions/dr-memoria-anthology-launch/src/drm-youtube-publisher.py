"""
YouTube Publishing Pipeline for Dr. Memoria's Anthology system.
Converts creative works to YouTube-compatible formats and publishes videos.
"""

import os
import asyncio
import json
import tempfile
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import logging
from pathlib import Path
import httplib2
from dotenv import load_dotenv

# Google API libraries
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Local models
from models import (
    CreativeWork, 
    CreativeContribution, 
    ContributionType, 
    ContentType,
    WorkStatus,
    PublishingConfig,
    PublishingResult,
    PublishingPlatform
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# YouTube API configuration
YOUTUBE_CLIENT_ID = os.getenv('YOUTUBE_CLIENT_ID')
YOUTUBE_CLIENT_SECRET = os.getenv('YOUTUBE_CLIENT_SECRET')
YOUTUBE_REDIRECT_URI = os.getenv('YOUTUBE_REDIRECT_URI')
YOUTUBE_TOKEN_FILE = os.getenv('YOUTUBE_TOKEN_FILE', 'youtube_token.json')
YOUTUBE_API_SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 
                     'https://www.googleapis.com/auth/youtube']


class YouTubePublisher:
    """Publishes creative works to YouTube"""
    
    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None, 
                redirect_uri: Optional[str] = None, token_file: Optional[str] = None):
        """Initialize YouTube publisher with API credentials"""
        self.client_id = client_id or YOUTUBE_CLIENT_ID
        self.client_secret = client_secret or YOUTUBE_CLIENT_SECRET
        self.redirect_uri = redirect_uri or YOUTUBE_REDIRECT_URI
        self.token_file = token_file or YOUTUBE_TOKEN_FILE
        self.credentials = None
        self.youtube = None
    
    async def authenticate(self) -> None:
        """Authenticate with YouTube API"""
        try:
            # Check if token file exists
            if os.path.exists(self.token_file):
                with open(self.token_file, 'r') as token:
                    creds_data = json.load(token)
                    self.credentials = Credentials.from_authorized_user_info(
                        creds_data, YOUTUBE_API_SCOPES)
            
            # If credentials don't exist or are invalid, get new ones
            if not self.credentials or not self.credentials.valid:
                if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                    self.credentials.refresh(Request())
                else:
                    # This part would be different in a web application
                    flow = InstalledAppFlow.from_client_config(
                        {
                            "installed": {
                                "client_id": self.client_id,
                                "client_secret": self.client_secret,
                                "redirect_uris": [self.redirect_uri],
                                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                                "token_uri": "https://oauth2.googleapis.com/token"
                            }
                        },
                        YOUTUBE_API_SCOPES
                    )
                    self.credentials = flow.run_local_server(port=0)
                
                # Save the credentials for the next run
                with open(self.token_file, 'w') as token:
                    token.write(self.credentials.to_json())
            
            # Build the YouTube API client
            self.youtube = build('youtube', 'v3', credentials=self.credentials)
            logger.info("YouTube API authentication successful")
        
        except Exception as e:
            logger.error(f"YouTube API authentication error: {e}")
            raise
    
    async def prepare_content(self, work: CreativeWork) -> Dict[str, Any]:
        """
        Prepare creative work content for YouTube publishing
        """
        # Consolidate contributions into a script
        script = self._create_video_script(work)
        
        # Generate video metadata
        metadata = self._create_video_metadata(work)
        
        # Generate video description with attribution
        description = self._create_video_description(work)
        
        return {
            "script": script,
            "metadata": metadata,
            "description": description
        }
    
    def _create_video_script(self, work: CreativeWork) -> str:
        """Create a video script from the creative work"""
        # In a real implementation, this would include intelligent processing
        # For MVP, we'll simply concatenate the contributions with formatting
        
        script_parts = []
        
        # Add title and introduction
        script_parts.append(f"# {work.title}\n\n")
        
        # Process each contribution
        for contribution in work.contributions:
            if contribution.contribution_type == ContributionType.HUMAN:
                # Human contributions are featured prominently
                script_parts.append(contribution.content)
            else:
                # AI contributions are integrated but clearly marked
                script_parts.append(f"Additional perspective: {contribution.content}")
        
        # Add attribution footer
        script_parts.append("\n\nThis content was created using the Roark 5.0 Authorship Model, "
                          "which emphasizes human creative leadership with AI assistance.")
        script_parts.append("Published by AI Publishing International LLP.")
        
        return "\n\n".join(script_parts)
    
    def _create_video_metadata(self, work: CreativeWork) -> Dict[str, Any]:
        """Create metadata for the YouTube video"""
        # Extract tags from work content
        tags = work.tags.copy() if work.tags else []
        
        # Add default tags if needed
        if not tags or len(tags) < 5:
            default_tags = ["AI collaboration", "Roark 5.0", "Dr. Memoria", "AI Publishing"]
            tags.extend([tag for tag in default_tags if tag not in tags])
            tags = tags[:15]  # Limit to 15 tags
        
        # Determine category
        # YouTube category IDs: https://developers.google.com/youtube/v3/docs/videoCategories
        category_mapping = {
            ContentType.ARTICLE: 27,  # Education
            ContentType.BLOG_POST: 27,  # Education
            ContentType.BOOK: 27,  # Education
            ContentType.COURSE: 27,  # Education
            ContentType.VIDEO: 27,  # Education
            ContentType.PODCAST: 27,  # Education
            ContentType.SOCIAL_MEDIA: 24,  # Entertainment
        }
        category = category_mapping.get(work.content_type, 27)  # Default to Education
        
        return {
            "title": work.title,
            "tags": tags,
            "categoryId": category
        }
    
    def _create_video_description(self, work: CreativeWork) -> str:
        """Create a description for the YouTube video with attribution"""
        # Get the first contribution as summary (usually the initial concept)
        summary = work.contributions[0].content if work.contributions else ""
        if len(summary) > 500:
            summary = summary[:497] + "..."
        
        # Calculate contribution percentages for attribution
        percentages = work.calculate_contribution_percentages()
        human_percentage = percentages.get(ContributionType.HUMAN, 0) * 100
        ai_percentage = percentages.get(ContributionType.AI, 0) * 100
        
        # Build description
        description_parts = []
        description_parts.append(summary)
        description_parts.append("\n\n---\n")
        description_parts.append(f"Created using the Roark 5.0 Authorship Model")
        description_parts.append(f"Human Contribution: {human_percentage:.1f}%")
        description_parts.append(f"AI Assistance: {ai_percentage:.1f}%")
        description_parts.append("\nThis content maintains human creative leadership while leveraging AI capabilities.")
        description_parts.append("\nPublished by AI Publishing International LLP")
        
        # Add creative passport reference if available
        if work.creative_passport and work.creative_passport.blockchain_transaction_id:
            description_parts.append(f"\nVerified on blockchain: {work.creative_passport.blockchain_transaction_id}")
        
        return "\n".join(description_parts)
    
    async def create_video(self, work: CreativeWork, output_dir: Optional[str] = None) -> str:
        """
        Create a video from the creative work
        
        In a full implementation, this would use text-to-speech and video generation.
        For the MVP, we'll create a simple text slide video.
        
        Returns:
            Path to the generated video file
        """
        # In a production system, this would integrate with video generation tools
        # For the MVP, we'll create a placeholder file
        
        output_dir = output_dir or tempfile.gettempdir()
        os.makedirs(output_dir, exist_ok=True)
        
        # Create a placeholder video file
        video_file = os.path.join(output_dir, f"{work.work_id}.mp4")
        
        # In a real implementation, we would generate the actual video here
        # For the MVP, we're creating an empty file for demonstration
        with open(video_file, 'w') as f:
            f.write(f"This is a placeholder for the actual video content for: {work.title}")
        
        return video_file
    
    async def _get_or_create_playlist(self, title: str, description: str) -> str:
        """
        Get or create a YouTube playlist
        
        Returns:
            Playlist ID
        """
        if not self.youtube:
            await self.authenticate()
        
        # Check if playlist already exists
        playlists_request = self.youtube.playlists().list(
            part="snippet",
            mine=True,
            maxResults=50
        )
        playlists_response = playlists_request.execute()
        
        for playlist in playlists_response.get("items", []):
            if playlist["snippet"]["title"] == title:
                return playlist["id"]
        
        # Create new playlist
        playlist_response = self.youtube.playlists().insert(
            part="snippet,status",
            body={
                "snippet": {
                    "title": title,
                    "description": description
                },
                "status": {
                    "privacyStatus": "public"
                }
            }
        ).execute()
        
        return playlist_response["id"]
    
    async def add_to_playlist(self, video_id: str, playlist_id: str) -> None:
        """Add video to a playlist"""
        if not self.youtube:
            await self.authenticate()
        
        self.youtube.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": playlist_id,
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
    
    async def publish(self, work: CreativeWork, config: Optional[PublishingConfig] = None) -> PublishingResult:
        """
        Publish the creative work to YouTube
        
        Args:
            work: The creative work to publish
            config: Optional publishing configuration
        
        Returns:
            Publishing result with URL and success status
        """
        try:
            if not self.youtube:
                await self.authenticate()
            
            # Prepare content and metadata
            prepared_content = await self.prepare_content(work)
            
            # Create video file
            video_file = await self.create_video(work)
            
            # Set up default config if not provided
            default_config = PublishingConfig(
                platform=PublishingPlatform.YOUTUBE,
                title=prepared_content["metadata"]["title"],
                tags=prepared_content["metadata"]["tags"],
                visibility="public"
            )
            
            # Merge with provided config
            if config:
                if config.title:
                    default_config.title = config.title
                if config.tags:
                    default_config.tags = config.tags
                if config.visibility:
                    default_config.visibility = config.visibility
                if config.platform_specific:
                    default_config.platform_specific = config.platform_specific
            
            config = default_config
            
            # Initialize the upload
            media = MediaFileUpload(video_file, mimetype='video/mp4', resumable=True)
            
            # Apply playlist setting if provided
            playlist_id = None
            if config.platform_specific and 'playlist' in config.platform_specific:
                playlist_name = config.platform_specific['playlist']
                playlist_desc = config.platform_specific.get('playlist_description', 'AI Publishing International content')
                playlist_id = await self._get_or_create_playlist(playlist_name, playlist_desc)
            
            # Execute the upload
            request = self.youtube.videos().insert(
                part="snippet,status",
                body={
                    "snippet": {
                        "title": config.title,
                        "description": prepared_content["description"],
                        "tags": config.tags,
                        "categoryId": prepared_content["metadata"]["categoryId"]
                    },
                    "status": {
                        "privacyStatus": config.visibility,
                        "selfDeclaredMadeForKids": False
                    }
                },
                media_body=media
            )
            
            logger.info(f"Uploading video: {config.title}")
            response = request.execute()
            
            # Add to playlist if applicable
            if playlist_id:
                await self.add_to_playlist(response["id"], playlist_id)
            
            # Clean up temporary file
            if os.path.exists(video_file):
                os.remove(video_file)
            
            # Create result
            result = PublishingResult(
                platform=PublishingPlatform.YOUTUBE,
                success=True,
                url=f"https://www.youtube.com/watch?v={response['id']}",
                platform_id=response["id"],
                analytics_url=f"https://studio.youtube.com/video/{response['id']}/analytics",
                timestamp=datetime.now()
            )
            
            logger.info(f"Successfully published to YouTube: {result.url}")
            return result
            
        except Exception as e:
            logger.error(f"YouTube publishing error: {e}")
            return PublishingResult(
                platform=PublishingPlatform.YOUTUBE,
                success=False,
                error=str(e),
                timestamp=datetime.now()
            )


class VideoFormatter:
    """Formats creative works for video publishing"""
    
    async def format_for_video(self, work: CreativeWork) -> Dict[str, Any]:
        """
        Format creative work for video presentation
        
        Returns:
            Dict with script, segments, visuals, etc.
        """
        # For MVP, this is a simplified implementation
        # A full implementation would include advanced formatting and storyboarding
        
        script = []
        segments = []
        
        # Add title
        script.append(f"# {work.title}\n")
        segments.append({
            "type": "title",
            "content": work.title,
            "duration": 5  # seconds
        })
        
        # Process contributions
        for i, contribution in enumerate(work.contributions):
            # Skip the first contribution if it was just used to create the work
            if i == 0 and len(contribution.content) < 100:
                continue
                
            # Format the contribution
            formatted_content = self._format_contribution(contribution)
            script.append(formatted_content)
            
            # Break into segments (simplified for MVP)
            paragraphs = formatted_content.split("\n\n")
            for j, paragraph in enumerate(paragraphs):
                if not paragraph.strip():
                    continue
                    
                segments.append({
                    "type": "content",
                    "content": paragraph,
                    "duration": min(20, 5 + len(paragraph) // 50),  # Simplified duration calculation
                    "contributor_type": contribution.contribution_type.value
                })
        
        # Add closing
        script.append("\n\nThis content was created using the Roark 5.0 Authorship Model, "
                     "which emphasizes human creative leadership with AI assistance.")
        segments.append({
            "type": "closing",
            "content": "Created with Roark 5.0 Authorship Model",
            "duration": 5
        })
        
        return {
            "script": "\n\n".join(script),
            "segments": segments,
            "estimated_duration": sum(segment["duration"] for segment in segments)
        }
    
    def _format_contribution(self, contribution: CreativeContribution) -> str:
        """Format a contribution for the video script"""
        if contribution.contribution_type == ContributionType.HUMAN:
            return contribution.content
        else:
            return f"AI Perspective:\n{contribution.content}"


class YouTubeAnalytics:
    """Retrieves and analyzes YouTube performance metrics"""
    
    def __init__(self, publisher: YouTubePublisher):
        """Initialize with YouTube publisher for authentication"""
        self.publisher = publisher
    
    async def get_video_metrics(self, video_id: str) -> Dict[str, Any]:
        """
        Get performance metrics for a specific video
        
        Returns:
            Dict with views, likes, comments, etc.
        """
        try:
            if not self.publisher.youtube:
                await self.publisher.authenticate()
            
            # Get video statistics
            video_response = self.publisher.youtube.videos().list(
                part="statistics",
                id=video_id
            ).execute()
            
            if not video_response["items"]:
                return {
                    "error": "Video not found",
                    "metrics": {}
                }
            
            statistics = video_response["items"][0]["statistics"]
            
            # Transform the response into a more friendly format
            metrics = {
                "views": int(statistics.get("viewCount", 0)),
                "likes": int(statistics.get("likeCount", 0)),
                "comments": int(statistics.get("commentCount", 0)),
                "favorites": int(statistics.get("favoriteCount", 0))
            }
            
            return {
                "video_id": video_id,
                "metrics": metrics,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"YouTube analytics error: {e}")
            return {
                "error": str(e),
                "metrics": {}
            }


# Example usage
async def main():
    try:
        # Create a test creative work
        work = CreativeWork(
            owner_id="test_user",
            title="Understanding the Roark 5.0 Authorship Model",
            content_type=ContentType.VIDEO
        )
        
        # Add contributions
        work.add_contribution(CreativeContribution(
            contributor_id="test_user",
            contribution_type=ContributionType.HUMAN,
            content="The Roark 5.0 Authorship Model represents a new paradigm in human-AI collaboration for creative works. It emphasizes human creative leadership while leveraging AI capabilities for enhancement and refinement."
        ))
        
        work.add_contribution(CreativeContribution(
            contributor_id="ai_assistant",
            contribution_type=ContributionType.AI,
            content="This model ensures that AI remains a tool for human creativity rather than replacing it. By maintaining a minimum human contribution threshold, the model preserves the essential human elements of creativity, originality, and vision."
        ))
        
        work.add_contribution(CreativeContribution(
            contributor_id="test_user",
            contribution_type=ContributionType.HUMAN,
            content="Through structured collaboration between human authors and AI systems, the Roark 5.0 model produces content that combines human creative direction with AI-enhanced capabilities, resulting in higher quality outputs while maintaining ethical standards."
        ))
        
        # Initialize video formatter
        formatter = VideoFormatter()
        formatted_content = await formatter.format_for_video(work)
        
        print(f"Formatted video content with {len(formatted_content['segments'])} segments")
        print(f"Estimated duration: {formatted_content['estimated_duration']} seconds")
        
        # To test actual publishing, uncomment this code and configure YouTube API credentials
        """
        # Initialize YouTube publisher
        publisher = YouTubePublisher()
        
        # Authenticate
        await publisher.authenticate()
        
        # Publish to YouTube
        publishing_config = PublishingConfig(
            platform=PublishingPlatform.YOUTUBE,
            visibility="private",  # Use private for testing
            platform_specific={
                "playlist": "AI Publishing Test"
            }
        )
        
        result = await publisher.publish(work, publishing_config)
        
        if result.success:
            print(f"Successfully published to YouTube: {result.url}")
            
            # Get analytics
            analytics = YouTubeAnalytics(publisher)
            metrics = await analytics.get_video_metrics(result.platform_id)
            print(f"Initial metrics: {metrics['metrics']}")
        else:
            print(f"Publishing failed: {result.error}")
        """
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
