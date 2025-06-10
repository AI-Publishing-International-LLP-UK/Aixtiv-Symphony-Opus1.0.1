"""
Analytics Engine module for Dr. Memoria's Anthology system.
Processes and analyzes content performance across platforms.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple, Union
from datetime import datetime, timedelta

from models import CreativeWork, ContentType, WorkStatus, UserPreference

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Processes and analyzes content performance"""
    
    def __init__(
        self,
        publishers: Dict[str, 'ContentPublisher'],
        user_preferences: Dict[str, UserPreference] = None
    ):
        self.publishers = publishers
        self.user_preferences = user_preferences or {}
        self.analytics_cache = {}  # work_id_platform -> (timestamp, data)
    
    async def collect_analytics(
        self,
        work: CreativeWork,
        platforms: Optional[List[str]] = None,
        days: int = 28
    ) -> Dict[str, Any]:
        """
        Collect analytics data for a work across platforms
        
        Args:
            work: The work to collect analytics for
            platforms: Platforms to collect from (None = use work.metadata["publications"])
            days: Number of days to analyze
            
        Returns:
            Dict with analytics data by platform
        """
        if platforms is None:
            if "publications" in work.metadata:
                platforms = list(work.metadata["publications"].keys())
            else:
                return {}
        
        results = {}
        
        for platform in platforms:
            if platform in self.publishers:
                publisher = self.publishers[platform]
                
                # Get content ID for this platform
                content_id = None
                if "publications" in work.metadata and platform in work.metadata["publications"]:
                    content_id = work.metadata["publications"][platform].get("id")
                
                if content_id:
                    # Get analytics from publisher
                    analytics = await publisher.get_analytics(content_id, days)
                    results[platform] = analytics
                    
                    # Cache analytics
                    cache_key = f"{work.id}_{platform}"
                    self.analytics_cache[cache_key] = (datetime.now(), analytics)
            else:
                results[platform] = {"error": f"No publisher found for platform: {platform}"}
        
        return results
    
    def analyze_performance(
        self,
        work: CreativeWork,
        analytics_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze performance of content across platforms
        
        Args:
            work: The work to analyze
            analytics_data: Analytics data from collect_analytics
            
        Returns:
            Dict with performance analysis
        """
        analysis = {
            "work_id": work.id,
            "title": work.title,
            "overall_performance": "unknown",
            "platform_performance": {},
            "insights": [],
            "recommendations": []
        }
        
        # Simple platform-specific metrics to track
        platform_metrics = {
            "youtube": ["views", "likes", "comments", "shares", "engagement_rate"],
            "twitter": ["impressions", "likes", "retweets", "replies", "engagement_rate"],
            "linkedin": ["impressions", "reactions", "comments", "shares", "clicks"],
            "instagram": ["impressions", "likes", "comments", "saves", "shares"],
            "facebook": ["reach", "reactions", "comments", "shares", "clicks"]
        }
        
        # Process each platform's analytics
        for platform, data in analytics_data.items():
            if "error" in data:
                continue
                
            platform_analysis = {
                "metrics": {},
                "performance": "unknown",
                "insights": []
            }
            
            # Extract key metrics for the platform
            if platform.lower() in platform_metrics:
                for metric in platform_metrics[platform.lower()]:
                    if metric in data:
                        platform_analysis["metrics"][metric] = data[metric]
            
            # Determine performance level
            if "engagement_rate" in data:
                if data["engagement_rate"] > 5.0:
                    platform_analysis["performance"] = "excellent"
                elif data["engagement_rate"] > 3.0:
                    platform_analysis["performance"] = "good"
                elif data["engagement_rate"] > 1.0:
                    platform_analysis["performance"] = "average"
                else:
                    platform_analysis["performance"] = "below_average"
            
            # Add platform-specific insights
            self._add_platform_insights(platform, data, platform_analysis)
            
            # Add to overall analysis
            analysis["platform_performance"][platform] = platform_analysis
        
        # Determine overall performance
        performances = [p["performance"] for p in analysis["platform_performance"].values()
                        if p["performance"] != "unknown"]
        
        if performances:
            perf_scores = {
                "excellent": 4,
                "good": 3,
                "average": 2,
                "below_average": 1
            }
            
            avg_score = sum(perf_scores.get(p, 0) for p in performances) / len(performances)
            
            if avg_score > 3.5:
                analysis["overall_performance"] = "excellent"
            elif avg_score > 2.5:
                analysis["overall_performance"] = "good"
            elif avg_score > 1.5:
                analysis["overall_performance"] = "average"
            else:
                analysis["overall_performance"] = "below_average"
        
        # Generate overall insights and recommendations
        self._add_overall_insights(work, analytics_data, analysis)
        self._generate_recommendations(work, analytics_data, analysis)
        
        return analysis
    
    def _add_platform_insights(
        self,
        platform: str,
        data: Dict[str, Any],
        analysis: Dict[str, Any]
    ):
        """Add platform-specific insights to analysis"""
        insights = []
        
        # YouTube insights
        if platform.lower() == "youtube":
            if "views" in data and "engagement_rate" in data:
                if data["views"] > 1000 and data["engagement_rate"] < 2.0:
                    insights.append("High views but low engagement suggests the content may be attracting viewers but not resonating deeply.")
            
            if "average_view_duration" in data and "video_length" in data:
                retention = data["average_view_duration"] / data["video_length"]
                if retention < 0.3:
                    insights.append("Low retention rate suggests viewers are dropping off early. Consider shortening videos or improving the opening hook.")
        
        # Twitter insights
        elif platform.lower() == "twitter":
            if "impressions" in data and "engagement_rate" in data:
                if data["impressions"] > 5000 and data["engagement_rate"] < 1.0:
                    insights.append("Tweet is getting visibility but lacks engagement. Consider more compelling or question-based content.")
            
            if "retweets" in data and "likes" in data:
                if data["retweets"] > data["likes"] * 2:
                    insights.append("High retweet-to-like ratio suggests content is shareable but not necessarily personally connecting.")
        
        # Add insights to analysis
        analysis["insights"] = insights
    
    def _add_overall_insights(
        self,
        work: CreativeWork,
        analytics_data: Dict[str, Any],
        analysis: Dict[str, Any]
    ):
        """Add overall insights across platforms to analysis"""
        insights = []
        
        # Find best and worst performing platforms
        performances = {}
        for platform, platform_analysis in analysis["platform_performance"].items():
            if platform_analysis["performance"] != "unknown":
                performances[platform] = platform_analysis["performance"]
        
        if performances:
            # Get best platform
            best_platform = max(performances.items(), key=lambda x: {
                "excellent": 4, "good": 3, "average": 2, "below_average": 1
            }[x[1]])
            
            # Get worst platform
            worst_platform = min(performances.items(), key=lambda x: {
                "excellent": 4, "good": 3, "average": 2, "below_average": 1
            }[x[1]])
            
            # Add insight about platform performance
            if best_platform[0] != worst_platform[0]:
                insights.append(f"Content performs best on {best_platform[0]} and worst on {worst_platform[0]}. Consider optimizing content for {worst_platform[0]} or shifting focus to {best_platform[0]}.")
        
        # Look for content type patterns
        if work.content_type == ContentType.VIDEO:
            video_platforms = ["youtube", "tiktok", "instagram"]
            video_performance = [p for p in performances.keys() if p.lower() in video_platforms]
            if video_performance:
                insights.append(f"Video content is being published across {len(video_performance)} platforms. Consider repurposing video content for other platforms.")
        
        # Analyze time patterns
        if "publications" in work.metadata:
            pub_times = {}
            for platform, pub_data in work.metadata["publications"].items():
                if "timestamp" in pub_data:
                    try:
                        pub_time = datetime.fromisoformat(pub_data["timestamp"])
                        pub_times[platform] = pub_time
                    except (ValueError, TypeError):
                        pass
            
            if pub_times:
                # Find earliest and latest publications
                earliest = min(pub_times.values())
                latest = max(pub_times.values())
                time_diff = latest - earliest
                
                if time_diff.days > 0:
                    insights.append(f"Content was published across platforms over a span of {time_diff.days} days. Consider more synchronized publishing for greater impact.")
        
        # Add overall insights to analysis
        analysis["insights"] = insights
    
    def _generate_recommendations(
        self,
        work: CreativeWork,
        analytics_data: Dict[str, Any],
        analysis: Dict[str, Any]
    ):
        """Generate recommendations based on analytics"""
        recommendations = []
        
        # Content optimization recommendations
        if analysis["overall_performance"] in ["below_average", "average"]:
            recommendations.append("Consider revising content format to be more engaging. Focus on stronger hooks and clearer calls to action.")
        
        # Platform-specific recommendations
        for platform, platform_analysis in analysis["platform_performance"].items():
            if platform_analysis["performance"] == "below_average":
                if platform.lower() == "youtube":
                    recommendations.append(f"For YouTube: Optimize video length and improve thumbnails to increase click-through rate.")
                elif platform.lower() == "twitter":
                    recommendations.append(f"For Twitter: Use more engaging questions and trending hashtags to boost engagement.")
                elif platform.lower() == "linkedin":
                    recommendations.append(f"For LinkedIn: Add more professional insights and industry-specific data to improve credibility.")
            
        # Cross-platform recommendations
        if len(analysis["platform_performance"]) > 1:
            good_platforms = [p for p, pa in analysis["platform_performance"].items()
                            if pa["performance"] in ["good", "excellent"]]
            if good_platforms:
                recommendations.append(f"Content performs well on {', '.join(good_platforms)}. Consider focusing more resources on these platforms.")
        
        # Timing recommendations
        recommendations.append("Analyze publishing times to identify optimal posting schedule for each platform.")
        
        # Future content recommendations
        if work.content_type in [ContentType.VIDEO, ContentType.AUDIO]:
            recommendations.append("For future content, consider creating shorter segments for social media promotion.")
        
        # Add recommendations to analysis
        analysis["recommendations"] = recommendations
    
    def get_optimal_publishing_time(
        self,
        platform: str,
        content_type: ContentType,
        user_id: Optional[str] = None
    ) -> datetime:
        """
        Determine the optimal time to publish content based on analytics
        
        Args:
            platform: Target platform
            content_type: Type of content
            user_id: Optional user ID for personalized recommendations
            
        Returns:
            Recommended publishing datetime
        """
        now = datetime.now()
        
        # Check user preferences first
        if user_id and user_id in self.user_preferences:
            user_prefs = self.user_preferences[user_id]
            if "schedule_preferences" in user_prefs and platform in user_prefs.schedule_preferences:
                pref_hours = user_prefs.schedule_preferences.get(platform, {}).get("preferred_hours", [])
                if pref_hours:
                    # Use the next preferred hour
                    current_hour = now.hour
                    next_hours = [h for h in pref_hours if h > current_hour]
                    if next_hours:
                        next_hour = min(next_hours)
                        return datetime(now.year, now.month, now.day, next_hour, 0, 0)
                    else:
                        # Use first preferred hour tomorrow
                        next_hour = min(pref_hours)
                        tomorrow = now + timedelta(days=1)
                        return datetime(tomorrow.year, tomorrow.month, tomorrow.day, next_hour, 0, 0)
        
        # Platform-specific best times based on content type
        platform_times = {
            "youtube": {
                ContentType.VIDEO: 15,  # 3 PM
                ContentType.LIVESTREAM: 19,  # 7 PM
                "default": 17  # 5 PM
            },
            "twitter": {
                ContentType.TEXT: 12,  # 12 PM
                ContentType.IMAGE: 13,  # 1 PM
                "default": 12  # 12 PM
            },
            "linkedin": {
                ContentType.ARTICLE: 9,  # 9 AM
                ContentType.TEXT: 11,  # 11 AM
                "default": 10  # 10 AM
            },
            "instagram": {
                ContentType.IMAGE: 12,  # 12 PM
                ContentType.VIDEO: 15,  # 3 PM
                "default": 14  # 2 PM
            },
            "facebook": {
                ContentType.TEXT: 13,  # 1 PM
                ContentType.VIDEO: 15,  # 3 PM
                "default": 14  # 2 PM
            },
            "tiktok": {
                ContentType.VIDEO: 19,  # 7 PM
                "default": 20  # 8 PM
            }
        }
        
        # Get platform-specific times
        if platform.lower() in platform_times:
            platform_dict = platform_times[platform.lower()]
            if content_type in platform_dict:
                hour = platform_dict[content_type]
            else:
                hour = platform_dict["default"]
        else:
            # Default to noon
            hour = 12
        
        # Set to tomorrow at the specified hour if it's past that hour today
        if now.hour >= hour:
            tomorrow = now + timedelta(days=1)
            optimal_time = datetime(tomorrow.year, tomorrow.month, tomorrow.day, hour, 0, 0)
        else:
            optimal_time = datetime(now.year, now.month, now.day, hour, 0, 0)
        
        return optimal_time
    
    def analyze_trends(
        self,
        user_id: Optional[str] = None,
        content_types: Optional[List[ContentType]] = None,
        platforms: Optional[List[str]] = None,
        days: int = 90
    ) -> Dict[str, Any]:
        """
        Analyze trends across content and platforms
        
        Args:
            user_id: Optional user ID to filter by owner
            content_types: Optional list of content types to analyze
            platforms: Optional list of platforms to analyze
            days: Number of days to look back
            
        Returns:
            Dict with trend analysis
        """
        # This would typically query a database for all relevant works
        # For now, we'll return a simulated analysis
        
        trends = {
            "top_performing_content_types": [],
            "top_performing_platforms": [],
            "engagement_trends": {},
            "content_length_impact": {},
            "posting_time_impact": {},
            "recommendations": []
        }
        
        # Simulate analysis based on content types
        if content_types:
            # Simulate performance scores for content types
            type_scores = {ct: self._simulate_score() for ct in content_types}
            sorted_types = sorted(type_scores.items(), key=lambda x: x[1], reverse=True)
            trends["top_performing_content_types"] = [
                {"type": ct.value, "score": score} for ct, score in sorted_types
            ]
            
            # Add recommendations based on content type analysis
            best_type = sorted_types[0][0] if sorted_types else None
            if best_type:
                trends["recommendations"].append(
                    f"Focus on creating more {best_type.value} content as it shows the highest engagement rates."
                )
        
        # Simulate analysis based on platforms
        if platforms:
            # Simulate performance scores for platforms
            platform_scores = {p: self._simulate_score() for p in platforms}
            sorted_platforms = sorted(platform_scores.items(), key=lambda x: x[1], reverse=True)
            trends["top_performing_platforms"] = [
                {"platform": p, "score": score} for p, score in sorted_platforms
            ]
            
            # Add recommendations based on platform analysis
            best_platform = sorted_platforms[0][0] if sorted_platforms else None
            if best_platform:
                trends["recommendations"].append(
                    f"Prioritize content for {best_platform} as it shows the highest return on investment."
                )
        
        # Simulate engagement trends over time
        if platforms:
            for platform in platforms:
                trends["engagement_trends"][platform] = self._simulate_time_series(days)
            
            trends["recommendations"].append(
                "Engagement appears to be trending upward on weekends. Consider scheduling more content for weekend release."
            )
        
        # Simulate content length impact
        content_lengths = ["short", "medium", "long"]
        for length in content_lengths:
            trends["content_length_impact"][length] = self._simulate_score()
        
        # Determine best content length
        best_length = max(trends["content_length_impact"].items(), key=lambda x: x[1])[0]
        trends["recommendations"].append(
            f"{best_length.capitalize()} form content is performing best. Consider adapting content strategy accordingly."
        )
        
        # Simulate posting time impact
        time_slots = ["morning", "afternoon", "evening"]
        for slot in time_slots:
            trends["posting_time_impact"][slot] = self._simulate_score()
        
        # Determine best posting time
        best_time = max(trends["posting_time_impact"].items(), key=lambda x: x[1])[0]
        trends["recommendations"].append(
            f"Content posted during the {best_time} shows higher engagement. Optimize publishing schedule accordingly."
        )
        
        return trends
    
    def _simulate_score(self) -> float:
        """Generate a simulated performance score between 0 and 100"""
        import random
        return round(random.uniform(60, 95), 1)
    
    def _simulate_time_series(self, days: int) -> List[Dict[str, Any]]:
        """Generate a simulated time series for trends"""
        import random
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Generate daily data points
        time_series = []
        current_date = start_date
        base_value = random.uniform(70, 80)
        
        while current_date <= end_date:
            # Higher engagement on weekends
            weekend_boost = 15 if current_date.weekday() >= 5 else 0
            
            # Random daily fluctuation
            daily_change = random.uniform(-5, 5)
            
            # Slight upward trend over time
            trend_factor = (current_date - start_date).days / days * 10
            
            value = base_value + weekend_boost + daily_change + trend_factor
            value = max(0, min(100, value))  # Ensure between 0 and 100
            
            time_series.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "value": round(value, 1)
            })
            
            current_date += timedelta(days=1)
        
        return time_series
