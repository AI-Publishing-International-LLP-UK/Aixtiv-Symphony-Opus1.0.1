            title="How AI is Transforming Content Creation",
            content_type=ContentType.ARTICLE,
            owner_id="user123",
            initial_content="""
            Artificial intelligence is revolutionizing how we create, distribute, and consume content. 
            From automated writing assistants to AI-generated videos, the landscape of content creation 
            is undergoing a profound transformation. This article explores the current state of AI in content 
            creation and what it means for creators, publishers, and audiences.
            
            # The Rise of AI Content Generation
            
            Recent advances in large language models have made it possible to generate human-quality text 
            at scale. These models can now write articles, social media posts, marketing copy, and even creative 
            fiction with minimal human input. Similarly, AI image and video generation tools are creating visual 
            content that was previously impossible without specialized skills and expensive software.
            
            # Multi-Platform Publishing
            
            The challenge for modern content creators isn't just creating quality content, but distributing it 
            effectively across numerous platforms. Each platform has its own format requirements, audience 
            expectations, and optimal publishing strategies. AI systems are now helping to automatically adapt 
            content for different platforms, ensuring maximum reach and engagement.
            
            # Analytics and Optimization
            
            Beyond creation and distribution, AI is transforming how we measure and optimize content 
            performance. Advanced analytics can now predict which content will perform best on which 
            platforms, and even suggest modifications to improve engagement.
            
            # The Future of AI-Assisted Content
            
            As these technologies continue to evolve, we're moving toward a future where AI handles the 
            repetitive aspects of content creation and distribution, freeing humans to focus on strategy, 
            creativity, and the uniquely human aspects of communication. The most successful content 
            creators will be those who learn to effectively collaborate with AI systems, leveraging their 
            strengths while adding the human touch that still differentiates the best content.
            """,
            target_platforms=["medium", "linkedin", "twitter", "youtube"]
        )
        
        # Create a multi-platform campaign
        campaign_results = await dr_memoria.create_multi_platform_campaign(
            console.log('%c📝/Users/as/Downloads/drm02-memoria-anthology-framework.py:', 'color: cyan', {});
            title="AI Content Creation Series",
            content=work.contributions[0].content,
            owner_id="user123",
            platforms=["youtube", "linkedin", "twitter", "medium"],
            content_type=ContentType.ARTICLE,
            schedule_strategy="sequential"
        )
        
        print(f"Created campaign: {campaign_results['campaign']['id']}")
        print(f"Execution status: {campaign_results['execution_results']['overall_status']}")
        
        # Create a content pipeline
        pipeline = await dr_memoria.create_and_schedule_pipeline(
            name="Weekly AI Content Pipeline",
            owner_id="user123",
            source_type="article",
            target_platforms=["youtube", "linkedin", "twitter"],
            schedule_type="weekly",
            schedule_time="10:00"
        )
        
        print(f"Created pipeline: {pipeline['id']}")
        print(f"Schedule: {pipeline['schedule']['type']} at {pipeline['schedule']['time']}")
        
        # Analyze user performance
        performance = await dr_memoria.analyze_user_performance("user123", days=90)
        
        print("Performance analysis:")
        print(f"Total works: {performance['performance_summary']['total_works']}")
        print(f"Best platform: {performance['performance_summary']['best_platform']}")
        print(f"Best content type: {performance['performance_summary']['best_content_type']}")
        print("Top recommendations:")
        for i, rec in enumerate(performance['recommendations'][:3], 1):
            print(f"{i}. {rec}")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
        """Get analytics for an InVideo video"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return {"error": "Authentication failed"}
            
            # In a real implementation, this would use InVideo's API
            # For now, return simulated analytics
            import random
            
            return {
                "video_id": content_id,
                "period_days": days,
                "views": random.randint(50, 500),
                "engagement_rate": round(random.uniform(0.3, 0.7), 2),
                "click_through_rate": round(random.uniform(0.05, 0.2), 2),
                "social_shares": random.randint(5, 30),
                "conversion_rate": round(random.uniform(0.01, 0.1), 3)
            }
            
        except Exception as e:
            error_message = f"InVideo analytics error: {e}"
            logger.error(error_message)
            return {"error": error_message}


# ======== CI/CD Integration ========

class ContentCICD:
    """Continuous Integration/Continuous Deployment for content workflows"""
    
    def __init__(
        self,
        content_generator: ContentGenerator,
        publishing_coordinator: PublishingCoordinator,
        analytics_engine: AnalyticsEngine,
        compliance_checker: ComplianceChecker
    ):
        self.content_generator = content_generator
        self.publishing_coordinator = publishing_coordinator
        self.analytics_engine = analytics_engine
        self.compliance_checker = compliance_checker
        self.pipelines = {}  # pipeline_id -> pipeline_config
    
    async def create_pipeline(
        self,
        name: str,
        owner_id: str,
        source_type: str,
        target_platforms: List[str],
        schedule: Optional[Dict[str, Any]] = None,
        content_transformations: Optional[List[Dict[str, Any]]] = None,
        compliance_checks: bool = True,
        approval_required: bool = True,
        notifications: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a content CI/CD pipeline
        
        Args:
            name: Pipeline name
            owner_id: Owner of the pipeline
            source_type: Content source type
            target_platforms: Target platforms to publish to
            schedule: Optional scheduling configuration
            content_transformations: List of content transformations to apply
            compliance_checks: Whether to run compliance checks
            approval_required: Whether approval is required before publishing
            notifications: Notification settings
            
        Returns:
            Dict with pipeline configuration
        """
        pipeline_id = f"pipeline_{int(time.time())}_{hash(name) % 10000:04d}"
        
        pipeline = {
            "id": pipeline_id,
            "name": name,
            "owner_id": owner_id,
            "source_type": source_type,
            "target_platforms": target_platforms,
            "schedule": schedule or {"type": "manual"},
            "content_transformations": content_transformations or [],
            "compliance_checks": compliance_checks,
            "approval_required": approval_required,
            "notifications": notifications or {"enabled": False},
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "runs": []
        }
        
        self.pipelines[pipeline_id] = pipeline
        return pipeline
    
    async def run_pipeline(
        self,
        pipeline_id: str,
        input_work: CreativeWork
    ) -> Dict[str, Any]:
        """
        Run a content pipeline on a work
        
        Args:
            pipeline_id: Pipeline ID to run
            input_work: Input creative work
            
        Returns:
            Dict with run results
        """
        if pipeline_id not in self.pipelines:
            return {
                "error": f"Pipeline {pipeline_id} not found"
            }
        
        pipeline = self.pipelines[pipeline_id]
        
        run_id = f"run_{int(time.time())}"
        run_results = {
            "id": run_id,
            "pipeline_id": pipeline_id,
            "work_id": input_work.id,
            "status": "running",
            "started_at": datetime.now().isoformat(),
            "stages": [],
            "output": {},
            "errors": []
        }
        
        # Add to pipeline runs
        pipeline["runs"].append(run_id)
        
        try:
            # 1. Apply content transformations
            transformed_work = await self._apply_transformations(input_work, pipeline["content_transformations"])
            
            run_results["stages"].append({
                "name": "content_transformation",
                "status": "completed",
                "details": {
                    "transformations_applied": len(pipeline["content_transformations"]),
                    "completed_at": datetime.now().isoformat()
                }
            })
            
            # 2. Run compliance checks if enabled
            compliance_results = {}
            if pipeline["compliance_checks"]:
                for platform in pipeline["target_platforms"]:
                    compliance_result = await self.compliance_checker.check_compliance(
                        transformed_work, platform
                    )
                    compliance_results[platform] = compliance_result
                
                # Check if all platforms passed compliance
                compliant = all(result["overall_compliant"] for result in compliance_results.values())
                
                run_results["stages"].append({
                    "name": "compliance_check",
                    "status": "completed" if compliant else "failed",
                    "details": {
                        "compliant": compliant,
                        "platform_results": {p: {"compliant": r["overall_compliant"]} for p, r in compliance_results.items()},
                        "completed_at": datetime.now().isoformat()
                    }
                })
                
                # Stop if not compliant and approval not allowed
                if not compliant and pipeline["approval_required"]:
                    run_results["status"] = "needs_approval"
                    run_results["output"]["compliance_issues"] = {
                        p: r["flags"] for p, r in compliance_results.items() if not r["overall_compliant"]
                    }
                    return run_results
            
            # 3. Wait for approval if required
            if pipeline["approval_required"]:
                run_results["status"] = "needs_approval"
                run_results["stages"].append({
                    "name": "approval",
                    "status": "waiting",
                    "details": {
                        "requested_at": datetime.now().isoformat()
                    }
                })
                return run_results
            
            # 4. Publish to target platforms
            publish_results = await self.publishing_coordinator.publish_to_platforms(
                transformed_work, pipeline["target_platforms"]
            )
            
            # Check if all publications succeeded
            successful = all(result["success"] for result in publish_results.values())
            
            run_results["stages"].append({
                "name": "publishing",
                "status": "completed" if successful else "partially_completed",
                "details": {
                    "successful": successful,
                    "platform_results": publish_results,
                    "completed_at": datetime.now().isoformat()
                }
            })
            
            # 5. Set final status
            if successful:
                run_results["status"] = "completed"
            else:
                run_results["status"] = "completed_with_issues"
                run_results["errors"] = [
                    {"platform": p, "error": r["error"]}
                    for p, r in publish_results.items() if not r["success"]
                ]
            
            # 6. Send notifications if enabled
            if pipeline["notifications"]["enabled"]:
                await self._send_pipeline_notification(pipeline, run_results)
            
            # 7. Store output information
            run_results["output"]["publications"] = {
                p: {"content_id": r["content_id"], "url": self._get_content_url(p, r["content_id"])}
                for p, r in publish_results.items() if r["success"]
            }
            
            # 8. Set completion time
            run_results["completed_at"] = datetime.now().isoformat()
            
            return run_results
        
        except Exception as e:
            error_message = f"Pipeline execution error: {e}"
            logger.error(error_message)
            
            run_results["status"] = "failed"
            run_results["errors"].append({"error": error_message})
            run_results["completed_at"] = datetime.now().isoformat()
            
            return run_results
    
    async def approve_pipeline_run(
        self,
        pipeline_id: str,
        run_id: str,
        approver_id: str,
        approval_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Approve a pipeline run that is waiting for approval
        
        Args:
            pipeline_id: Pipeline ID
            run_id: Run ID to approve
            approver_id: ID of the approver
            approval_notes: Optional approval notes
            
        Returns:
            Dict with updated run results
        """
        if pipeline_id not in self.pipelines:
            return {
                "error": f"Pipeline {pipeline_id} not found"
            }
        
        # In a real implementation, this would retrieve the run from storage
        # For now, we'll return a simulated result
        
        return {
            "id": run_id,
            "pipeline_id": pipeline_id,
            "status": "approved",
            "approver_id": approver_id,
            "approval_notes": approval_notes,
            "approved_at": datetime.now().isoformat(),
            "next_steps": "Run will proceed to publishing stage"
        }
    
    async def _apply_transformations(
        self,
        work: CreativeWork,
        transformations: List[Dict[str, Any]]
    ) -> CreativeWork:
        """Apply content transformations to a work"""
        # Create a copy to avoid modifying the original
        transformed_work = CreativeWork(
            owner_id=work.owner_id,
            title=work.title,
            content_type=work.content_type,
            status=work.status,
            created_at=work.created_at,
            updated_at=datetime.now(),
            metadata=work.metadata.copy(),
            tags=work.tags.copy(),
            target_platforms=work.target_platforms.copy() if work.target_platforms else []
        )
        
        # Copy original contributions
        for contrib in work.contributions:
            transformed_work.contributions.append(contrib)
        
        # Apply each transformation
        for transform in transformations:
            transform_type = transform.get("type")
            
            if transform_type == "format":
                # Format content for specific platforms
                for platform in transform.get("platforms", []):
                    platform_content = await self.content_generator.generate_content_for_platform(
                        transformed_work, platform, transformed_work.content_type, transformed_work.owner_id
                    )
                    
                    contribution = Contribution(
                        contributor_id="system",
                        content=json.dumps(platform_content) if isinstance(platform_content, dict) else platform_content,
                        content_type=transformed_work.content_type,
                        metadata={"platform": platform, "transformation": "format"}
                    )
                    
                    transformed_work.contributions.append(contribution)
            
            elif transform_type == "summarize":
                # Summarize content
                consolidated_content = self.content_generator._consolidate_content(transformed_work)
                provider = await self.content_generator._get_provider()
                
                prompt = f"""
                Summarize the following content in {transform.get('length', 500)} words:
                
                {consolidated_content[:5000]}
                
                Return only the summary, no introduction or explanation.
                """
                
                summary = await provider.generate_content(prompt, max_tokens=1000)
                
                contribution = Contribution(
                    contributor_id="system",
                    content=summary,
                    content_type=ContentType.TEXT,
                    metadata={"transformation": "summarize"}
                )
                
                transformed_work.contributions.append(contribution)
            
            elif transform_type == "translate":
                # Translate content
                target_language = transform.get("language", "en")
                consolidated_content = self.content_generator._consolidate_content(transformed_work)
                provider = await self.content_generator._get_provider()
                
                prompt = f"""
                Translate the following content to {target_language}:
                
                {consolidated_content[:5000]}
                
                Return only the translated content.
                """
                
                translation = await provider.generate_content(prompt, max_tokens=2000)
                
                contribution = Contribution(
                    contributor_id="system",
                    content=translation,
                    content_type=transformed_work.content_type,
                    metadata={"transformation": "translate", "language": target_language}
                )
                
                transformed_work.contributions.append(contribution)
            
            elif transform_type == "optimize":
                # Optimize content for specific metrics
                metrics = transform.get("metrics", ["engagement"])
                consolidated_content = self.content_generator._consolidate_content(transformed_work)
                provider = await self.content_generator._get_provider()
                
                prompt = f"""
                Optimize the following content for {', '.join(metrics)}:
                
                {consolidated_content[:5000]}
                
                Return only the optimized content.
                """
                
                optimized = await provider.generate_content(prompt, max_tokens=2000)
                
                contribution = Contribution(
                    contributor_id="system",
                    content=optimized,
                    content_type=transformed_work.content_type,
                    metadata={"transformation": "optimize", "metrics": metrics}
                )
                
                transformed_work.contributions.append(contribution)
        
        return transformed_work
    
    async def _send_pipeline_notification(
        self,
        pipeline: Dict[str, Any],
        run_results: Dict[str, Any]
    ):
        """Send notification about pipeline run results"""
        # In a real implementation, this would send emails, Slack messages, etc.
        # For now, just log the notification
        notification = {
            "pipeline": pipeline["name"],
            "run_id": run_results["id"],
            "status": run_results["status"],
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Pipeline notification: {notification}")
    
    def _get_content_url(self, platform: str, content_id: str) -> str:
        """Get URL for published content"""
        # Platform-specific URL templates
        url_templates = {
            "youtube": f"https://www.youtube.com/watch?v={content_id}",
            "twitter": f"https://twitter.com/user/status/{content_id}",
            "linkedin": f"https://www.linkedin.com/feed/update/{content_id}",
            "instagram": f"https://www.instagram.com/p/{content_id}/",
            "facebook": f"https://www.facebook.com/{content_id}",
            "tiktok": f"https://www.tiktok.com/@user/video/{content_id}",
            "medium": f"https://medium.com/p/{content_id}",
            "kdp": f"https://www.amazon.com/dp/{content_id}",
            "coursera": f"https://www.coursera.org/learn/{content_id}",
            "synthesia": f"https://share.synthesia.io/{content_id}",
            "invideo": f"https://app.invideo.io/videos/{content_id}"
        }
        
        return url_templates.get(platform.lower(), f"{platform}:{content_id}")
    
    def get_pipeline(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Get pipeline configuration by ID"""
        return self.pipelines.get(pipeline_id)
    
    def list_pipelines(self, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all pipelines, optionally filtered by owner"""
        if owner_id:
            return [p for p in self.pipelines.values() if p["owner_id"] == owner_id]
        else:
            return list(self.pipelines.values())
    
    async def schedule_pipeline(
        self,
        pipeline_id: str,
        schedule_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Set up scheduling for a pipeline
        
        Args:
            pipeline_id: Pipeline ID to schedule
            schedule_config: Schedule configuration
            
        Returns:
            Dict with updated pipeline
        """
        if pipeline_id not in self.pipelines:
            return {
                "error": f"Pipeline {pipeline_id} not found"
            }
        
        pipeline = self.pipelines[pipeline_id]
        
        # Update schedule configuration
        pipeline["schedule"] = schedule_config
        
        return pipeline


# ======== Putting it All Together: Dr. Memoria's Anthology System ========

class DrMemoriaAnthology:
    """Main class for Dr. Memoria's Anthology System"""
    
    def __init__(self):
        # Set up LLM providers
        self.primary_provider = self._create_primary_llm_provider()
        self.fallback_provider = self._create_fallback_llm_provider()
        
        # Content generator
        self.content_generator = ContentGenerator(
            primary_provider=self.primary_provider,
            fallback_provider=self.fallback_provider
        )
        
        # Initialize publishers
        self.publishers = self._initialize_publishers()
        
        # Publishing coordinator
        self.publishing_coordinator = PublishingCoordinator(
            publishers=self.publishers
        )
        
        # Analytics engine
        self.analytics_engine = AnalyticsEngine(
            publishers=self.publishers
        )
        
        # Scheduler
        self.scheduler = PublishingScheduler(
            publishing_coordinator=self.publishing_coordinator,
            analytics_engine=self.analytics_engine
        )
        
        # Compliance checker
        self.compliance_checker = ComplianceChecker(
            content_generator=self.content_generator
        )
        
        # User preference learner
        self.preference_learner = UserPreferenceLearner(
            analytics_engine=self.analytics_engine
        )
        
        # Multi-modal content generator
        self.multi_modal_generator = MultiModalContentGenerator(
            content_generator=self.content_generator
        )
        
        # Multi-platform coordinator
        self.multi_platform_coordinator = MultiPlatformCoordinator(
            content_generator=self.content_generator,
            publishing_coordinator=self.publishing_coordinator,
            analytics_engine=self.analytics_engine,
            compliance_checker=self.compliance_checker,
            scheduler=self.scheduler
        )
        
        # CI/CD system
        self.content_cicd = ContentCICD(
            content_generator=self.content_generator,
            publishing_coordinator=self.publishing_coordinator,
            analytics_engine=self.analytics_engine,
            compliance_checker=self.compliance_checker
        )
    
    def _create_primary_llm_provider(self) -> LLMProvider:
        """Create the primary LLM provider"""
        # In a real implementation, this would initialize a specific provider
        # For now, return a placeholder provider
        class PlaceholderProvider(LLMProvider):
            async def generate_content(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.7) -> str:
                # This would call an actual API in a real implementation
                return f"Generated content for: {prompt[:50]}..."
            
            async def generate_image_prompt(self, content: str, style: Optional[str] = None) -> str:
                # This would call an actual API in a real implementation
                return f"Image prompt for: {content[:50]}..."
        
        return PlaceholderProvider()
    
    def _create_fallback_llm_provider(self) -> LLMProvider:
        """Create the fallback LLM provider"""
        # Similar to primary, but could be a different provider
        return self._create_primary_llm_provider()
    
    def _initialize_publishers(self) -> Dict[str, ContentPublisher]:
        """Initialize all platform publishers"""
        publishers = {}
        
        # YouTube publisher
        publishers["youtube"] = YouTubePublisher(
            content_generator=self.content_generator,
            credentials_file="youtube_credentials.json"
        )
        
        # Add other platform publishers
        # Twitter, LinkedIn, etc.
        
        # Advanced publishers
        publishers["kdp"] = KDPPublisher(
            content_generator=self.content_generator,
            credentials_file="kdp_credentials.json"
        )
        
        publishers["coursera"] = CourseraPublisher(
            content_generator=self.content_generator,
            credentials_file="coursera_credentials.json"
        )
        
        publishers["synthesia"] = SynthesiaPublisher(
            content_generator=self.content_generator,
            api_key="PLACEHOLDER_API_KEY"
        )
        
        publishers["invideo"] = InVideoPublisher(
            content_generator=self.content_generator,
            api_key="PLACEHOLDER_API_KEY"
        )
        
        return publishers
    
    async def create_content(
        self,
        title: str,
        content_type: ContentType,
        owner_id: str,
        initial_content: Optional[str] = None,
        target_platforms: Optional[List[str]] = None
    ) -> CreativeWork:
        """
        Create a new creative work
        
        Args:
            title: Title of the work
            content_type: Type of content
            owner_id: Owner of the work
            initial_content: Optional initial content
            target_platforms: Optional list of target platforms
            
        Returns:
            New CreativeWork instance
        """
        work = CreativeWork(
            owner_id=owner_id,
            title=title,
            content_type=content_type,
            target_platforms=target_platforms or []
        )
        
        if initial_content:
            # Add initial contribution
            contribution = Contribution(
                contributor_id=owner_id,
                content=initial_content,
                content_type=content_type
            )
            work.contributions.append(contribution)
        
        return work
    
    async def publish_to_all_platforms(
        self,
        work: CreativeWork,
        check_compliance: bool = True,
        schedule_optimal: bool = False
    ) -> Dict[str, Any]:
        """
        Publish a work to all configured target platforms
        
        Args:
            work: The work to publish
            check_compliance: Whether to check compliance first
            schedule_optimal: Whether to schedule at optimal times
            
        Returns:
            Dict with publishing results
        """
        results = {}
        
        # Check compliance if requested
        if check_compliance:
            compliance_issues = {}
            for platform in work.target_platforms:
                compliance_result = await self.compliance_checker.check_compliance(
                    work, platform
                )
                
                if not compliance_result["overall_compliant"]:
                    if "compliance_issues" not in results:
                        results["compliance_issues"] = {}
                    
                    compliance_issues[platform] = {
                        "flags": compliance_result["flags"],
                        "required_changes": compliance_result["required_changes"]
                    }
            
            if compliance_issues:
                results["compliance_issues"] = compliance_issues
                results["status"] = "compliance_failed"
                return results
        
        # Schedule or publish immediately
        if schedule_optimal:
            scheduling_results = {}
            
            for platform in work.target_platforms:
                optimal_time = self.analytics_engine.get_optimal_publishing_time(
                    platform, work.content_type, work.owner_id
                )
                
                scheduled = self.scheduler.schedule_publication(
                    work, optimal_time, [platform]
                )
                
                scheduling_results[platform] = {
                    "scheduled": scheduled,
                    "time": optimal_time.isoformat() if scheduled else None
                }
            
            results["scheduling"] = scheduling_results
            results["status"] = "scheduled"
        else:
            # Publish immediately
            publishing_results = await self.publishing_coordinator.publish_to_platforms(
                work, work.target_platforms
            )
            
            results["publishing"] = publishing_results
            
            # Determine overall status
            if all(result["success"] for result in publishing_results.values()):
                results["status"] = "published"
            elif any(result["success"] for result in publishing_results.values()):
                results["status"] = "partially_published"
            else:
                results["status"] = "publication_failed"
        
        return results
    
    async def create_multi_platform_campaign(
        self,
        title: str,
        content: str,
        owner_id: str,
        platforms: List[str],
        content_type: ContentType = ContentType.ARTICLE,
        schedule_strategy: str = "sequential"
    ) -> Dict[str, Any]:
        """
        Create and execute a multi-platform campaign
        
        Args:
            title: Campaign title
            content: Core content
            owner_id: Campaign owner
            platforms: Target platforms
            content_type: Content type
            schedule_strategy: 'simultaneous' or 'sequential'
            
        Returns:
            Dict with campaign results
        """
        # Create base work
        base_work = await self.create_content(
            title=title,
            content_type=content_type,
            owner_id=owner_id,
            initial_content=content,
            target_platforms=platforms
        )
        
        # Create campaign
        campaign = await self.multi_platform_coordinator.create_multi_platform_campaign(
            base_work=base_work,
            platforms=platforms,
            schedule_strategy=schedule_strategy
        )
        
        # Execute campaign
        results = await self.multi_platform_coordinator.execute_campaign(campaign)
        
        return {
            "campaign": campaign,
            "execution_results": results
        }
    
    async def create_and_schedule_pipeline(
        self,
        name: str,
        owner_id: str,
        source_type: str,
        target_platforms: List[str],
        schedule_type: str = "daily",
        schedule_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create and schedule a content pipeline
        
        Args:
            name: Pipeline name
            owner_id: Owner ID
            source_type: Content source type
            target_platforms: Target platforms
            schedule_type: Schedule type ('daily', 'weekly', 'monthly')
            schedule_time: Optional time (HH:MM)
            
        Returns:
            Dict with pipeline configuration
        """
        # Create schedule config
        if not schedule_time:
            # Default to noon
            schedule_time = "12:00"
        
        schedule_config = {
            "type": schedule_type,
            "time": schedule_time,
            "enabled": True
        }
        
        # Create content transformations
        transformations = [
            {
                "type": "format",
                "platforms": target_platforms
            },
            {
                "type": "optimize",
                "metrics": ["engagement", "conversion"]
            }
        ]
        
        # Create pipeline
        pipeline = await self.content_cicd.create_pipeline(
            name=name,
            owner_id=owner_id,
            source_type=source_type,
            target_platforms=target_platforms,
            schedule=schedule_config,
            content_transformations=transformations,
            compliance_checks=True,
            approval_required=True,
            notifications={"enabled": True, "channels": ["email"]}
        )
        
        return pipeline
    
    async def analyze_user_performance(
        self,
        user_id: str,
        days: int = 90
    ) -> Dict[str, Any]:
        """
        Analyze a user's content performance across platforms
        
        Args:
            user_id: User ID to analyze
            days: Number of days to analyze
            
        Returns:
            Dict with performance analysis
        """
        # In a real implementation, this would fetch the user's works
        # For now, return a simulated analysis
        
        analysis = {
            "user_id": user_id,
            "period_days": days,
            "performance_summary": {
                "total_works": 25,
                "total_platforms": 5,
                "engagement_trend": "increasing",
                "best_platform": "youtube",
                "best_content_type": "video"
            },
            "platform_performance": {},
            "content_type_performance": {},
            "recommendations": []
        }
        
        # Simulate platform performance
        for platform in ["youtube", "twitter", "linkedin", "instagram", "medium"]:
            analysis["platform_performance"][platform] = {
                "works_count": self._random_int(3, 15),
                "engagement_rate": self._random_float(1.0, 10.0),
                "best_performing_work": f"Work title for {platform}",
                "growth_rate": self._random_float(-5.0, 15.0)
            }
        
        # Simulate content type performance
        for content_type in ["video", "article", "image", "audio"]:
            analysis["content_type_performance"][content_type] = {
                "works_count": self._random_int(2, 10),
                "average_engagement": self._random_float(1.0, 10.0),
                "best_platform": self._random_item(["youtube", "twitter", "linkedin"]),
                "completion_rate": self._random_float(60.0, 95.0)
            }
        
        # Add recommendations
        analysis["recommendations"] = [
            "Focus more on video content as it shows 30% higher engagement",
            "Post on LinkedIn during morning hours (9-11 AM) for optimal reach",
            "Increase posting frequency on YouTube from weekly to twice weekly",
            "Consider repurposing popular YouTube content for Instagram to expand reach",
            "Add more interactive elements to increase engagement across platforms"
        ]
        
        # Get user preferences if available
        user_prefs = self.preference_learner.get_user_preferences(user_id)
        if user_prefs:
            analysis["learned_preferences"] = {
                "platform_preferences": user_prefs.platform_preferences,
                "content_preferences": user_prefs.content_preferences,
                "style_preferences": user_prefs.style_preferences
            }
            
            # Add preference-based recommendations
            content_recommendations = self.preference_learner.get_content_recommendations(user_id)
            analysis["preference_based_recommendations"] = content_recommendations
        
        return analysis
    
    def _random_int(self, min_val: int, max_val: int) -> int:
        """Generate a random integer within range"""
        import random
        return random.randint(min_val, max_val)
    
    def _random_float(self, min_val: float, max_val: float) -> float:
        """Generate a random float within range"""
        import random
        return round(random.uniform(min_val, max_val), 1)
    
    def _random_item(self, items: List[Any]) -> Any:
        """Select a random item from a list"""
        import random
        return random.choice(items)


# Example usage
async def main():
    try:
        # Initialize Dr. Memoria's Anthology System
        dr_memoria = DrMemoriaAnthology()
        
        # Create a new creative work
        work = await dr_memoria.create_content(
            title="How AI is Transforming Content Creation",
            content_type=ContentType.ARTICLE,        Create an audio script (podcast or narration) based on the following content.
        
        Include:
        - Clear introduction
        - Conversational tone
        - Natural speaking rhythm (avoid complex sentences)
        - Audio cues where relevant
        - Closing summary
        {style_guide}
        
        Content to transform:
        {content[:1500]}
        
        Return as JSON with "script" (full script), "duration" (estimated minutes), 
        "segments" (array of timed segments), and "audio_notes" (voice tone, music suggestions).
        """
        
        audio_content_text = await provider.generate_content(prompt, max_tokens=1500)
        
        # Parse JSON response
        try:
            audio_content = json.loads(audio_content_text)
        except json.JSONDecodeError:
            # If not valid JSON, create a basic structure
            audio_content = {
                "script": audio_content_text,
                "duration": "3-5 minutes",
                "segments": [],
                "audio_notes": "Clear, conversational delivery"
            }
        
        return {
            "content": audio_content,
            "mode": "audio",
            "format": "script"
        }
    
    async def _generate_infographic_content(
        self,
        content: str,
        provider: LLMProvider,
        user_prefs: Optional[UserPreference] = None
    ) -> Dict[str, Any]:
        """Generate infographic content"""
        style_guide = ""
        if user_prefs and "infographic_style" in user_prefs.style_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.style_preferences['infographic_style']}"
        
        prompt = f"""
        Create an infographic outline based on the following content.
        
        Include:
        - Title and subtitle
        - Key statistics or data points
        - Visual element descriptions
        - Flow or organization
        - Color scheme suggestions
        {style_guide}
        
        Content to transform:
        {content[:1500]}
        
        Return as JSON with "title", "sections" (array of content sections), 
        "data_points" (key statistics), "visual_elements" (descriptions of charts, icons, etc.),
        and "design_notes" (color scheme, style suggestions).
        """
        
        infographic_content_text = await provider.generate_content(prompt, max_tokens=1500)
        
        # Parse JSON response
        try:
            infographic_content = json.loads(infographic_content_text)
        except json.JSONDecodeError:
            # If not valid JSON, create a basic structure
            infographic_content = {
                "title": "Infographic: Key Concepts",
                "sections": [],
                "data_points": [],
                "visual_elements": [],
                "design_notes": "Clean, modern design with clear typography"
            }
        
        return {
            "content": infographic_content,
            "mode": "infographic",
            "format": "outline"
        }


# ======== Advanced Platform Publishers ========

class KDPPublisher(ContentPublisher):
    """Publisher for Amazon Kindle Direct Publishing"""
    
    def __init__(self, content_generator: ContentGenerator, credentials_file: str = 'kdp_credentials.json'):
        super().__init__(content_generator)
        self.credentials_file = credentials_file
        self.client = None
    
    async def authenticate(self) -> bool:
        """Authenticate with KDP API"""
        try:
            # In a real implementation, this would use Amazon's API
            # For now, simulate successful authentication
            self.client = "kdp_client"
            return True
        except Exception as e:
            logger.error(f"KDP authentication error: {e}")
            return False
    
    async def format_for_platform(self, work: CreativeWork) -> Dict[str, Any]:
        """Format a creative work for KDP publishing"""
        provider = await self.content_generator._get_provider()
        consolidated_content = self.content_generator._consolidate_content(work)
        
        prompt = f"""
        Format the following content as a Kindle e-book.
        
        Include:
        - Title page
        - Table of contents
        - Chapters with clear headings
        - About the author section
        - Bibliography/references if applicable
        
        Also provide:
        - Book description (500 characters max)
        - Keywords (up to 7)
        - Categories (up to 2)
        - Target audience
        
        Content to format:
        {consolidated_content[:2000]}...
        
        Return in JSON format with keys: title, description, keywords, categories, audience, and formatted_content.
        """
        
        try:
            result_text = await provider.generate_content(prompt, max_tokens=3000)
            
            # Parse JSON response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If not valid JSON, extract components manually
                result = {
                    "title": work.title,
                    "description": consolidated_content[:500],
                    "keywords": [],
                    "categories": ["Non-fiction"],
                    "audience": "General",
                    "formatted_content": consolidated_content
                }
            
            return result
            
        except Exception as e:
            logger.error(f"KDP formatting error: {e}")
            # Fallback to basic formatting
            return {
                "title": work.title,
                "description": consolidated_content[:500],
                "keywords": [],
                "categories": ["Non-fiction"],
                "audience": "General",
                "formatted_content": consolidated_content
            }
    
    async def publish(
        self,
        work: CreativeWork,
        media_path: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Publish a work to KDP"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return False, None, "Authentication failed"
            
            # Format work for KDP
            formatted_content = await self.format_for_platform(work)
            
            # In a real implementation, this would use Amazon's API
            # For now, simulate successful publication
            kdp_id = f"kdp_{int(time.time())}"
            
            # Update work status
            work.status = WorkStatus.PUBLISHED
            work.metadata = {
                "platform": "kdp",
                "kdp_id": kdp_id,
                "publish_date": datetime.now().isoformat(),
                "url": f"https://www.amazon.com/dp/{kdp_id}"
            }
            
            return True, kdp_id, None
            
        except Exception as e:
            error_message = f"KDP publishing error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def publish_draft(self, work: CreativeWork) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Create a draft publication for review"""
        try:
            # Format work for KDP
            formatted_content = await self.format_for_platform(work)
            
            # Create draft data
            draft_data = {
                "platform": "kdp",
                "title": formatted_content["title"],
                "description": formatted_content["description"],
                "keywords": formatted_content["keywords"],
                "categories": formatted_content["categories"],
                "audience": formatted_content["audience"],
                "draft_created": datetime.now().isoformat(),
                "status": "draft"
            }
            
            # Update work with draft data
            work.metadata = {
                "kdp_draft": draft_data
            }
            
            return True, draft_data, None
            
        except Exception as e:
            error_message = f"KDP draft creation error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def update_metadata(self, content_id: str, updates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Update metadata for an existing KDP publication"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return False, "Authentication failed"
            
            # In a real implementation, this would use Amazon's API
            # For now, simulate successful update
            return True, None
            
        except Exception as e:
            error_message = f"KDP metadata update error: {e}"
            logger.error(error_message)
            return False, error_message
    
    async def get_analytics(self, content_id: str, days: int = 28) -> Dict[str, Any]:
        """Get analytics for a KDP publication"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return {"error": "Authentication failed"}
            
            # In a real implementation, this would use Amazon's API
            # For now, return simulated analytics
            import random
            
            return {
                "kdp_id": content_id,
                "period_days": days,
                "sales": random.randint(10, 100),
                "pages_read": random.randint(1000, 10000),
                "royalties": round(random.uniform(10.0, 100.0), 2),
                "rankings": {
                    "overall": random.randint(10000, 100000),
                    "categories": {
                        "category1": random.randint(100, 1000),
                        "category2": random.randint(50, 500)
                    }
                },
                "reviews": {
                    "count": random.randint(1, 20),
                    "average_rating": round(random.uniform(3.5, 5.0), 1)
                }
            }
            
        except Exception as e:
            error_message = f"KDP analytics error: {e}"
            logger.error(error_message)
            return {"error": error_message}


class CourseraPublisher(ContentPublisher):
    """Publisher for Coursera content"""
    
    def __init__(self, content_generator: ContentGenerator, credentials_file: str = 'coursera_credentials.json'):
        super().__init__(content_generator)
        self.credentials_file = credentials_file
        self.client = None
    
    async def authenticate(self) -> bool:
        """Authenticate with Coursera API"""
        try:
            # In a real implementation, this would use Coursera's API
            # For now, simulate successful authentication
            self.client = "coursera_client"
            return True
        except Exception as e:
            logger.error(f"Coursera authentication error: {e}")
            return False
    
    async def format_for_platform(self, work: CreativeWork) -> Dict[str, Any]:
        """Format a creative work for Coursera publishing"""
        provider = await self.content_generator._get_provider()
        consolidated_content = self.content_generator._consolidate_content(work)
        
        prompt = f"""
        Format the following content as a Coursera course outline.
        
        Include:
        - Course title
        - Course description
        - Learning objectives
        - Target audience
        - Modules (4-6 weeks of content)
        - Module descriptions
        - Key topics for each module
        - Assessment suggestions
        
        Content to format:
        {consolidated_content[:2000]}...
        
        Return in JSON format with keys: course_title, description, objectives, audience, modules, and assessments.
        """
        
        try:
            result_text = await provider.generate_content(prompt, max_tokens=3000)
            
            # Parse JSON response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If not valid JSON, create a basic structure
                result = {
                    "course_title": work.title,
                    "description": consolidated_content[:500],
                    "objectives": [],
                    "audience": "General",
                    "modules": [
                        {
                            "title": "Module 1: Introduction",
                            "description": "Introduction to the topic",
                            "topics": ["Overview", "Basic concepts", "History"]
                        }
                    ],
                    "assessments": ["Quiz", "Final project"]
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Coursera formatting error: {e}")
            # Fallback to basic formatting
            return {
                "course_title": work.title,
                "description": consolidated_content[:500],
                "objectives": [],
                "audience": "General",
                "modules": [],
                "assessments": []
            }
    
    async def publish(
        self,
        work: CreativeWork,
        media_path: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Publish a work to Coursera"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return False, None, "Authentication failed"
            
            # Format work for Coursera
            formatted_content = await self.format_for_platform(work)
            
            # In a real implementation, this would use Coursera's API
            # For now, simulate successful publication
            coursera_id = f"course_{int(time.time())}"
            
            # Update work status
            work.status = WorkStatus.PUBLISHED
            work.metadata = {
                "platform": "coursera",
                "coursera_id": coursera_id,
                "publish_date": datetime.now().isoformat(),
                "url": f"https://www.coursera.org/learn/{coursera_id}"
            }
            
            return True, coursera_id, None
            
        except Exception as e:
            error_message = f"Coursera publishing error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def publish_draft(self, work: CreativeWork) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Create a draft publication for review"""
        try:
            # Format work for Coursera
            formatted_content = await self.format_for_platform(work)
            
            # Create draft data
            draft_data = {
                "platform": "coursera",
                "course_title": formatted_content["course_title"],
                "description": formatted_content["description"],
                "objectives": formatted_content["objectives"],
                "audience": formatted_content["audience"],
                "modules": formatted_content["modules"],
                "draft_created": datetime.now().isoformat(),
                "status": "draft"
            }
            
            # Update work with draft data
            work.metadata = {
                "coursera_draft": draft_data
            }
            
            return True, draft_data, None
            
        except Exception as e:
            error_message = f"Coursera draft creation error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def update_metadata(self, content_id: str, updates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Update metadata for an existing Coursera publication"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return False, "Authentication failed"
            
            # In a real implementation, this would use Coursera's API
            # For now, simulate successful update
            return True, None
            
        except Exception as e:
            error_message = f"Coursera metadata update error: {e}"
            logger.error(error_message)
            return False, error_message
    
    async def get_analytics(self, content_id: str, days: int = 28) -> Dict[str, Any]:
        """Get analytics for a Coursera publication"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return {"error": "Authentication failed"}
            
            # In a real implementation, this would use Coursera's API
            # For now, return simulated analytics
            import random
            
            return {
                "coursera_id": content_id,
                "period_days": days,
                "enrollments": random.randint(100, 1000),
                "active_learners": random.randint(50, 500),
                "completion_rate": round(random.uniform(0.1, 0.5), 2),
                "average_rating": round(random.uniform(3.5, 5.0), 1),
                "revenue": round(random.uniform(100.0, 1000.0), 2),
                "forum_activity": random.randint(10, 100),
                "top_countries": [
                    {"country": "USA", "percentage": round(random.uniform(0.2, 0.4), 2)},
                    {"country": "India", "percentage": round(random.uniform(0.1, 0.3), 2)},
                    {"country": "UK", "percentage": round(random.uniform(0.05, 0.15), 2)}
                ]
            }
            
        except Exception as e:
            error_message = f"Coursera analytics error: {e}"
            logger.error(error_message)
            return {"error": error_message}


# ======== Integration with Video AI Services ========

class SynthesiaPublisher(ContentPublisher):
    """Publisher for Synthesia.io AI video generation"""
    
    def __init__(
        self, 
        content_generator: ContentGenerator, 
        api_key: str = None,
        default_avatar: str = "anna"
    ):
        super().__init__(content_generator)
        self.api_key = api_key
        self.default_avatar = default_avatar
        self.client = None
    
    async def authenticate(self) -> bool:
        """Authenticate with Synthesia API"""
        try:
            # In a real implementation, this would use Synthesia's API
            # For now, simulate successful authentication
            if not self.api_key:
                return False
                
            self.client = "synthesia_client"
            return True
        except Exception as e:
            logger.error(f"Synthesia authentication error: {e}")
            return False
    
    async def format_for_platform(self, work: CreativeWork) -> Dict[str, Any]:
        """Format a creative work for Synthesia publishing"""
        provider = await self.content_generator._get_provider()
        consolidated_content = self.content_generator._consolidate_content(work)
        
        prompt = f"""
        Format the following content as a script for an AI presenter video.
        
        Guidelines:
        - Break into short scenes/segments (30-60 seconds each)
        - Use natural, conversational language
        - Include presenter instructions in [brackets]
        - Suggest on-screen text or graphics
        - Keep total length under 5 minutes
        
        Content to convert:
        {consolidated_content[:2000]}...
        
        Return in JSON format with keys: title, description, scenes (array of scene objects with 'script' and 'notes' fields), 
        and suggestions for visuals.
        """
        
        try:
            result_text = await provider.generate_content(prompt, max_tokens=2000)
            
            # Parse JSON response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If not valid JSON, create a basic structure
                result = {
                    "title": work.title,
                    "description": consolidated_content[:200],
                    "scenes": [
                        {
                            "script": consolidated_content[:500],
                            "notes": "Standard delivery"
                        }
                    ],
                    "visuals": ["Title card", "Key points as bullet points"]
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Synthesia formatting error: {e}")
            # Fallback to basic formatting
            return {
                "title": work.title,
                "description": consolidated_content[:200],
                "scenes": [
                    {
                        "script": consolidated_content[:500],
                        "notes": "Standard delivery"
                    }
                ],
                "visuals": []
            }
    
    async def publish(
        self,
        work: CreativeWork,
        media_path: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Generate and publish a video with Synthesia"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return False, None, "Authentication failed"
            
            # Format work for Synthesia
            formatted_content = await self.format_for_platform(work)
            
            # Extract avatar preferences
            avatar_id = self.default_avatar
            if "synthesia_preferences" in work.metadata:
                avatar_id = work.metadata["synthesia_preferences"].get("avatar_id", self.default_avatar)
            
            # Prepare script
            full_script = ""
            for scene in formatted_content.get("scenes", []):
                full_script += scene.get("script", "") + "\n\n"
            
            # In a real implementation, this would call Synthesia's API
            # For example:
            # video_params = {
            #     "title": formatted_content["title"],
            #     "avatar": avatar_id,
            #     "script": full_script,
            #     "background": "office",
            #     "videoFormat": "16:9"
            # }
            # response = requests.post(
            #     "https://api.synthesia.io/v1/videos",
            #     headers={"Authorization": f"Bearer {self.api_key}"},
            #     json=video_params
            # )
            # video_id = response.json().get("id")
            
            # For now, simulate successful video creation
            video_id = f"synthesia_{int(time.time())}"
            
            # Update work status
            work.status = WorkStatus.PUBLISHED
            work.metadata = {
                "platform": "synthesia",
                "video_id": video_id,
                "publish_date": datetime.now().isoformat(),
                "url": f"https://share.synthesia.io/{video_id}"
            }
            
            return True, video_id, None
            
        except Exception as e:
            error_message = f"Synthesia publishing error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def publish_draft(self, work: CreativeWork) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Create a draft publication for review"""
        try:
            # Format work for Synthesia
            formatted_content = await self.format_for_platform(work)
            
            # Create draft data
            draft_data = {
                "platform": "synthesia",
                "title": formatted_content["title"],
                "description": formatted_content["description"],
                "scenes": formatted_content["scenes"],
                "avatar_id": self.default_avatar,
                "draft_created": datetime.now().isoformat(),
                "status": "draft"
            }
            
            # Update work with draft data
            work.metadata = {
                "synthesia_draft": draft_data
            }
            
            return True, draft_data, None
            
        except Exception as e:
            error_message = f"Synthesia draft creation error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def update_metadata(self, content_id: str, updates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Update metadata for an existing Synthesia video"""
        # Synthesia doesn't typically allow updating videos after creation
        return False, "Synthesia doesn't support updating existing videos"
    
    async def get_analytics(self, content_id: str, days: int = 28) -> Dict[str, Any]:
        """Get analytics for a Synthesia video"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return {"error": "Authentication failed"}
            
            # In a real implementation, this would use Synthesia's API
            # For now, return simulated analytics
            import random
            
            return {
                "video_id": content_id,
                "period_days": days,
                "views": random.randint(100, 1000),
                "completion_rate": round(random.uniform(0.5, 0.9), 2),
                "shares": random.randint(5, 50),
                "downloads": random.randint(2, 20)
            }
            
        except Exception as e:
            error_message = f"Synthesia analytics error: {e}"
            logger.error(error_message)
            return {"error": error_message}


class InVideoPublisher(ContentPublisher):
    """Publisher for InVideo AI video generation"""
    
    def __init__(
        self, 
        content_generator: ContentGenerator, 
        api_key: str = None,
        default_template: str = "business"
    ):
        super().__init__(content_generator)
        self.api_key = api_key
        self.default_template = default_template
        self.client = None
    
    async def authenticate(self) -> bool:
        """Authenticate with InVideo API"""
        try:
            # In a real implementation, this would use InVideo's API
            # For now, simulate successful authentication
            if not self.api_key:
                return False
                
            self.client = "invideo_client"
            return True
        except Exception as e:
            logger.error(f"InVideo authentication error: {e}")
            return False
    
    async def format_for_platform(self, work: CreativeWork) -> Dict[str, Any]:
        """Format a creative work for InVideo publishing"""
        provider = await self.content_generator._get_provider()
        consolidated_content = self.content_generator._consolidate_content(work)
        
        prompt = f"""
        Format the following content for an InVideo automated video creation.
        
        Guidelines:
        - Break content into 10-15 second scene segments
        - Include text for each scene (1-2 sentences max per scene)
        - Suggest media type for each scene (stock video, image, text animation)
        - Include a compelling intro and outro
        - Total video length: 1-3 minutes
        
        Content to convert:
        {consolidated_content[:2000]}...
        
        Return in JSON format with keys: title, description, scenes (array of scene objects with 'text', 'duration', and 'media_type' fields), 
        and style_notes.
        """
        
        try:
            result_text = await provider.generate_content(prompt, max_tokens=2000)
            
            # Parse JSON response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If not valid JSON, create a basic structure
                result = {
                    "title": work.title,
                    "description": consolidated_content[:200],
                    "scenes": [
                        {
                            "text": work.title,
                            "duration": 5,
                            "media_type": "text_animation"
                        },
                        {
                            "text": consolidated_content[:100],
                            "duration": 10,
                            "media_type": "stock_video"
                        }
                    ],
                    "style_notes": "Modern, corporate style"
                }
            
            return result
            
        except Exception as e:
            logger.error(f"InVideo formatting error: {e}")
            # Fallback to basic formatting
            return {
                "title": work.title,
                "description": consolidated_content[:200],
                "scenes": [],
                "style_notes": "Standard style"
            }
    
    async def publish(
        self,
        work: CreativeWork,
        media_path: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Generate and publish a video with InVideo"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return False, None, "Authentication failed"
            
            # Format work for InVideo
            formatted_content = await self.format_for_platform(work)
            
            # Extract template preferences
            template_id = self.default_template
            if "invideo_preferences" in work.metadata:
                template_id = work.metadata["invideo_preferences"].get("template_id", self.default_template)
            
            # In a real implementation, this would call InVideo's API
            # For example:
            # video_params = {
            #     "title": formatted_content["title"],
            #     "template": template_id,
            #     "scenes": formatted_content["scenes"]
            # }
            # response = requests.post(
            #     "https://api.invideo.io/v1/videos",
            #     headers={"Authorization": f"Bearer {self.api_key}"},
            #     json=video_params
            # )
            # video_id = response.json().get("id")
            
            # For now, simulate successful video creation
            video_id = f"invideo_{int(time.time())}"
            
            # Update work status
            work.status = WorkStatus.PUBLISHED
            work.metadata = {
                "platform": "invideo",
                "video_id": video_id,
                "publish_date": datetime.now().isoformat(),
                "url": f"https://app.invideo.io/videos/{video_id}"
            }
            
            return True, video_id, None
            
        except Exception as e:
            error_message = f"InVideo publishing error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def publish_draft(self, work: CreativeWork) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Create a draft publication for review"""
        try:
            # Format work for InVideo
            formatted_content = await self.format_for_platform(work)
            
            # Create draft data
            draft_data = {
                "platform": "invideo",
                "title": formatted_content["title"],
                "description": formatted_content["description"],
                "scenes": formatted_content["scenes"],
                "template_id": self.default_template,
                "draft_created": datetime.now().isoformat(),
                "status": "draft"
            }
            
            # Update work with draft data
            work.metadata = {
                "invideo_draft": draft_data
            }
            
            return True, draft_data, None
            
        except Exception as e:
            error_message = f"InVideo draft creation error: {e}"
            logger.error(error_message)
            return False, None, error_message
    
    async def update_metadata(self, content_id: str, updates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Update metadata for an existing InVideo video"""
        try:
            # Ensure authenticated
            if not self.client:
                authenticated = await self.authenticate()
                if not authenticated:
                    return False, "Authentication failed"
            
            # In a real implementation, this would use InVideo's API
            # For now, simulate successful update
            return True, None
            
        except Exception as e:
            error_message = f"InVideo metadata update error: {e}"
            logger.error(error_message)
            return False, error_message
    
    async def get_analytics(self, content_id: str, days: int = 28) -> Dict[str, Any]:
        """Get analytics for an InVideo video""""""
Dr. Memoria's Anthology System
Core Framework for AI Automated Done-For-You Solutions

This module defines the core architecture and interfaces for the Dr. Memoria's
Anthology system, providing a unified framework for automated content creation,
publishing, and analytics across multiple platforms.
"""

import os
import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple, Union
from datetime import datetime, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ======== Core Data Models ========

class ContentType(Enum):
    """Types of content that can be created and published"""
    TEXT = "text"
    ARTICLE = "article"
    BLOG = "blog"
    SOCIAL = "social"
    EMAIL = "email"
    VIDEO = "video"
    AUDIO = "audio"
    PODCAST = "podcast"
    IMAGE = "image"
    INFOGRAPHIC = "infographic"
    PRESENTATION = "presentation"
    MIXED = "mixed"


class WorkStatus(Enum):
    """Status of a creative work in the system"""
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    FAILED = "failed"


class Contribution:
    """A single contribution to a creative work"""
    
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


# ======== Compliance System ========

class ComplianceChecker:
    """Checks content for compliance with platform guidelines and regulations"""
    
    def __init__(self, content_generator: ContentGenerator):
        self.content_generator = content_generator
        self.platform_guidelines = self._load_platform_guidelines()
        self.regulatory_requirements = self._load_regulatory_requirements()
    
    def _load_platform_guidelines(self) -> Dict[str, Dict[str, Any]]:
        """Load platform-specific guidelines"""
        # In a real implementation, this would load from a database or API
        # For now, return a simplified structure
        return {
            "youtube": {
                "prohibited_content": [
                    "violence",
                    "hate_speech",
                    "harassment",
                    "dangerous_activities",
                    "misinformation"
                ],
                "restricted_content": [
                    "controversial_issues",
                    "sensitive_topics",
                    "adult_themes"
                ],
                "monetization_requirements": [
                    "family_friendly",
                    "original_content",
                    "commercial_use_allowed"
                ]
            },
            "twitter": {
                "prohibited_content": [
                    "violence",
                    "hate_speech",
                    "harassment",
                    "illegal_activities"
                ],
                "restricted_content": [
                    "sensitive_media",
                    "controversial_topics"
                ],
                "hashtag_guidelines": [
                    "relevant_only",
                    "not_excessive"
                ]
            },
            # Add other platforms as needed
        }
    
    def _load_regulatory_requirements(self) -> Dict[str, List[str]]:
        """Load regulatory requirements by jurisdiction"""
        # In a real implementation, this would load from a database or API
        return {
            "global": [
                "no_copyright_infringement",
                "no_trademark_violation",
                "no_defamation"
            ],
            "usa": [
                "ftc_disclosure_requirements",
                "data_privacy_compliance"
            ],
            "eu": [
                "gdpr_compliance",
                "dsa_compliance"
            ]
        }
    
    async def check_compliance(
        self,
        work: CreativeWork,
        platform: str,
        jurisdiction: str = "global"
    ) -> Dict[str, Any]:
        """
        Check content for compliance with platform guidelines and regulations
        
        Args:
            work: The creative work to check
            platform: Target platform
            jurisdiction: Regulatory jurisdiction
            
        Returns:
            Dict with compliance check results
        """
        consolidated_content = self.content_generator._consolidate_content(work)
        
        results = {
            "platform_compliance": await self._check_platform_compliance(consolidated_content, platform),
            "regulatory_compliance": await self._check_regulatory_compliance(consolidated_content, jurisdiction),
            "overall_compliant": True,
            "warnings": [],
            "flags": [],
            "required_changes": []
        }
        
        # Check if any platform issues were found
        if not results["platform_compliance"]["compliant"]:
            results["overall_compliant"] = False
            results["flags"].extend(results["platform_compliance"]["flags"])
            results["required_changes"].extend(results["platform_compliance"]["changes"])
        else:
            results["warnings"].extend(results["platform_compliance"]["warnings"])
        
        # Check if any regulatory issues were found
        if not results["regulatory_compliance"]["compliant"]:
            results["overall_compliant"] = False
            results["flags"].extend(results["regulatory_compliance"]["flags"])
            results["required_changes"].extend(results["regulatory_compliance"]["changes"])
        else:
            results["warnings"].extend(results["regulatory_compliance"]["warnings"])
        
        return results
    
    async def _check_platform_compliance(
        self,
        content: str,
        platform: str
    ) -> Dict[str, Any]:
        """Check content against platform guidelines"""
        platform_lower = platform.lower()
        
        result = {
            "compliant": True,
            "flags": [],
            "warnings": [],
            "changes": []
        }
        
        # Get platform guidelines
        if platform_lower not in self.platform_guidelines:
            result["warnings"].append(f"No specific guidelines available for {platform}. Using general standards.")
            return result
        
        guidelines = self.platform_guidelines[platform_lower]
        
        # In a real implementation, this would use AI/ML to check content
        # For now, we'll simulate some basic keyword checks
        provider = await self.content_generator._get_provider()
        
        # Check for prohibited content
        prompt = f"""
        Analyze the following content for any issues that would violate {platform}'s guidelines.
        
        Specifically check for these prohibited topics:
        {', '.join(guidelines.get('prohibited_content', []))}
        
        Also flag any of these restricted topics that may require a content warning:
        {', '.join(guidelines.get('restricted_content', []))}
        
        Content to analyze:
        {content[:2000]}
        
        Return a JSON object with:
        1. "compliant": Boolean indicating if content complies with guidelines
        2. "flags": Array of serious issues that would prevent publishing
        3. "warnings": Array of minor issues that may restrict reach but allow publishing
        4. "changes": Array of suggested changes to make content compliant
        """
        
        try:
            check_result = await provider.generate_content(prompt, max_tokens=1000)
            
            # Parse the result
            try:
                check_data = json.loads(check_result)
                result.update(check_data)
            except json.JSONDecodeError:
                # If parsing fails, assume manual review needed
                result["compliant"] = False
                result["warnings"].append("Unable to automatically check compliance. Manual review required.")
                
        except Exception as e:
            logger.error(f"Compliance check error: {e}")
            result["warnings"].append(f"Error during compliance check: {str(e)}")
        
        return result
    
    async def _check_regulatory_compliance(
        self,
        content: str,
        jurisdiction: str
    ) -> Dict[str, Any]:
        """Check content against regulatory requirements"""
        jurisdiction_lower = jurisdiction.lower()
        
        result = {
            "compliant": True,
            "flags": [],
            "warnings": [],
            "changes": []
        }
        
        # Get regulatory requirements
        requirements = []
        if "global" in self.regulatory_requirements:
            requirements.extend(self.regulatory_requirements["global"])
        
        if jurisdiction_lower in self.regulatory_requirements:
            requirements.extend(self.regulatory_requirements[jurisdiction_lower])
        
        if not requirements:
            result["warnings"].append(f"No specific regulatory requirements found for {jurisdiction}.")
            return result
        
        # In a real implementation, this would use AI/ML to check content
        # For now, we'll simulate some basic checks
        provider = await self.content_generator._get_provider()
        
        prompt = f"""
        Analyze the following content for any issues that would violate regulatory requirements.
        
        Check against these requirements:
        {', '.join(requirements)}
        
        Content to analyze:
        {content[:2000]}
        
        Return a JSON object with:
        1. "compliant": Boolean indicating if content complies with regulations
        2. "flags": Array of serious issues that would prevent publishing
        3. "warnings": Array of minor issues to be aware of
        4. "changes": Array of suggested changes to make content compliant
        """
        
        try:
            check_result = await provider.generate_content(prompt, max_tokens=1000)
            
            # Parse the result
            try:
                check_data = json.loads(check_result)
                result.update(check_data)
            except json.JSONDecodeError:
                # If parsing fails, assume manual review needed
                result["compliant"] = False
                result["warnings"].append("Unable to automatically check regulatory compliance. Manual review required.")
                
        except Exception as e:
            logger.error(f"Regulatory compliance check error: {e}")
            result["warnings"].append(f"Error during regulatory compliance check: {str(e)}")
        
        return result


# ======== Multi-Platform Management System ========

class MultiPlatformCoordinator:
    """Coordinates content across multiple platforms"""
    
    def __init__(
        self,
        content_generator: ContentGenerator,
        publishing_coordinator: PublishingCoordinator,
        analytics_engine: AnalyticsEngine,
        compliance_checker: ComplianceChecker,
        scheduler: PublishingScheduler
    ):
        self.content_generator = content_generator
        self.publishing_coordinator = publishing_coordinator
        self.analytics_engine = analytics_engine
        self.compliance_checker = compliance_checker
        self.scheduler = scheduler
    
    async def create_multi_platform_campaign(
        self,
        base_work: CreativeWork,
        platforms: List[str],
        schedule_strategy: str = "sequential",
        interval_hours: int = 24,
        check_compliance: bool = True
    ) -> Dict[str, Any]:
        """
        Create and schedule a multi-platform campaign from a base work
        
        Args:
            base_work: The base creative work to adapt for multiple platforms
            platforms: List of target platforms
            schedule_strategy: 'simultaneous' or 'sequential'
            interval_hours: Hours between publications for sequential strategy
            check_compliance: Whether to check compliance before scheduling
            
        Returns:
            Dict with campaign details
        """
        campaign = {
            "id": f"campaign_{int(time.time())}",
            "base_work_id": base_work.id,
            "title": base_work.title,
            "platforms": platforms,
            "schedule_strategy": schedule_strategy,
            "platform_works": {},
            "schedule": {},
            "compliance": {},
            "status": "draft"
        }
        
        # Create platform-specific versions
        for platform in platforms:
            try:
                # Generate platform-specific content
                platform_content = await self.content_generator.generate_content_for_platform(
                    base_work, platform, base_work.content_type, base_work.owner_id
                )
                
                # Create platform-specific work
                platform_work = CreativeWork(
                    owner_id=base_work.owner_id,
                    title=platform_content.get("title", base_work.title),
                    content_type=base_work.content_type,
                    target_platforms=[platform],
                    metadata={"source_work_id": base_work.id, "campaign_id": campaign["id"]}
                )
                
                # Add contribution with platform content
                contribution = Contribution(
                    contributor_id="system",
                    content=json.dumps(platform_content) if isinstance(platform_content, dict) else platform_content,
                    content_type=base_work.content_type,
                    metadata={"platform": platform}
                )
                platform_work.contributions.append(contribution)
                
                # Add to campaign
                campaign["platform_works"][platform] = {
                    "work_id": platform_work.id,
                    "title": platform_work.title,
                    "status": platform_work.status.value
                }
                
                # Check compliance if enabled
                if check_compliance:
                    compliance_result = await self.compliance_checker.check_compliance(
                        platform_work, platform
                    )
                    campaign["compliance"][platform] = {
                        "compliant": compliance_result["overall_compliant"],
                        "flags": compliance_result["flags"],
                        "warnings": compliance_result["warnings"]
                    }
                    
                    # Update work status if not compliant
                    if not compliance_result["overall_compliant"]:
                        platform_work.status = WorkStatus.IN_REVIEW
                        campaign["platform_works"][platform]["status"] = platform_work.status.value
                
            except Exception as e:
                logger.error(f"Error creating content for {platform}: {e}")
                campaign["platform_works"][platform] = {
                    "error": str(e),
                    "status": "failed"
                }
        
        # Create publication schedule
        if schedule_strategy == "simultaneous":
            # Schedule all platforms at the optimal time for the primary platform
            primary_platform = platforms[0] if platforms else None
            if primary_platform:
                optimal_time = self.analytics_engine.get_optimal_publishing_time(
                    primary_platform, base_work.content_type, base_work.owner_id
                )
                
                for platform in platforms:
                    campaign["schedule"][platform] = optimal_time.isoformat()
        else:
            # Schedule sequentially based on platform-specific optimal times
            current_time = datetime.now()
            
            for i, platform in enumerate(platforms):
                # Get optimal time, but ensure it's after current_time + interval
                optimal_time = self.analytics_engine.get_optimal_publishing_time(
                    platform, base_work.content_type, base_work.owner_id
                )
                
                scheduled_time = max(
                    optimal_time,
                    current_time + timedelta(hours=i * interval_hours)
                )
                
                campaign["schedule"][platform] = scheduled_time.isoformat()
        
        campaign["status"] = "ready"
        return campaign
    
    async def execute_campaign(
        self,
        campaign: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a multi-platform campaign
        
        Args:
            campaign: Campaign definition from create_multi_platform_campaign
            
        Returns:
            Dict with execution results
        """
        results = {
            "campaign_id": campaign["id"],
            "platform_results": {},
            "overall_status": "in_progress"
        }
        
        # Process each platform
        for platform, work_info in campaign["platform_works"].items():
            # Skip if there was an error creating content
            if "error" in work_info:
                results["platform_results"][platform] = {
                    "status": "skipped",
                    "reason": f"Content creation failed: {work_info['error']}"
                }
                continue
            
            # Skip if not compliant
            if platform in campaign["compliance"] and not campaign["compliance"][platform]["compliant"]:
                results["platform_results"][platform] = {
                    "status": "skipped",
                    "reason": "Content not compliant with platform guidelines"
                }
                continue
            
            # Get scheduled time
            scheduled_time = None
            if platform in campaign["schedule"]:
                try:
                    scheduled_time = datetime.fromisoformat(campaign["schedule"][platform])
                except (ValueError, TypeError):
                    scheduled_time = None
            
            # TODO: In a real implementation, fetch the work from a database
            # For now, we'll assume we have a mock function
            work = self._get_work_by_id(work_info["work_id"])
            
            if work:
                # If time to publish now
                if scheduled_time is None or scheduled_time <= datetime.now():
                    try:
                        # Publish directly
                        success, content_id, error = await self._publish_to_platform(work, platform)
                        
                        if success:
                            results["platform_results"][platform] = {
                                "status": "published",
                                "content_id": content_id,
                                "url": self._get_content_url(platform, content_id)
                            }
                        else:
                            results["platform_results"][platform] = {
                                "status": "failed",
                                "error": error
                            }
                    except Exception as e:
                        results["platform_results"][platform] = {
                            "status": "error",
                            "error": str(e)
                        }
                else:
                    # Schedule for later
                    try:
                        # Schedule publication
                        scheduled = self.scheduler.schedule_publication(work, scheduled_time, [platform])
                        
                        if scheduled:
                            results["platform_results"][platform] = {
                                "status": "scheduled",
                                "scheduled_time": scheduled_time.isoformat()
                            }
                        else:
                            results["platform_results"][platform] = {
                                "status": "scheduling_failed",
                                "error": "Failed to schedule publication"
                            }
                    except Exception as e:
                        results["platform_results"][platform] = {
                            "status": "scheduling_error",
                            "error": str(e)
                        }
            else:
                results["platform_results"][platform] = {
                    "status": "error",
                    "error": f"Work with ID {work_info['work_id']} not found"
                }
        
        # Determine overall status
        statuses = [result["status"] for result in results["platform_results"].values()]
        
        if all(status == "published" for status in statuses):
            results["overall_status"] = "completed"
        elif any(status == "published" for status in statuses):
            results["overall_status"] = "partially_completed"
        elif all(status == "scheduled" for status in statuses):
            results["overall_status"] = "scheduled"
        elif any(status == "scheduled" for status in statuses):
            results["overall_status"] = "partially_scheduled"
        else:
            results["overall_status"] = "failed"
        
        return results
    
    async def _publish_to_platform(
        self,
        work: CreativeWork,
        platform: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Publish a work to a platform using the publishing coordinator"""
        # This would use the publishing coordinator in a real implementation
        # For now, return a simulated result
        success = True  # Simulate successful publication
        content_id = f"{platform}_{int(time.time())}"
        error = None
        
        return success, content_id, error
    
    def _get_content_url(self, platform: str, content_id: str) -> str:
        """Get URL for published content"""
        # Platform-specific URL templates
        url_templates = {
            "youtube": f"https://www.youtube.com/watch?v={content_id}",
            "twitter": f"https://twitter.com/user/status/{content_id}",
            "linkedin": f"https://www.linkedin.com/feed/update/{content_id}",
            "instagram": f"https://www.instagram.com/p/{content_id}/",
            "facebook": f"https://www.facebook.com/{content_id}",
            "tiktok": f"https://www.tiktok.com/@user/video/{content_id}",
            "medium": f"https://medium.com/p/{content_id}"
        }
        
        return url_templates.get(platform.lower(), f"{platform}:{content_id}")
    
    def _get_work_by_id(self, work_id: str) -> Optional[CreativeWork]:
        """Mock function to get a work by ID - in a real implementation, this would fetch from a database"""
        # Return a simulated work
        return CreativeWork(
            owner_id="user123",
            title="Simulated Work",
            content_type=ContentType.ARTICLE,
            status=WorkStatus.DRAFT
        )
    
    async def track_campaign_performance(
        self,
        campaign_id: str,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Track performance of a multi-platform campaign
        
        Args:
            campaign_id: ID of the campaign to track
            days: Number of days to analyze
            
        Returns:
            Dict with performance analysis across platforms
        """
        # In a real implementation, fetch the campaign from a database
        # For now, return a simulated analysis
        performance = {
            "campaign_id": campaign_id,
            "period_days": days,
            "total_reach": 0,
            "total_engagement": 0,
            "platform_performance": {},
            "cross_platform_insights": [],
            "recommendations": []
        }
        
        # Simulate platform performances
        platforms = ["youtube", "twitter", "linkedin", "instagram"]
        total_reach = 0
        total_engagement = 0
        
        for platform in platforms:
            # Simulate platform metrics
            reach = int(self._simulate_metric(1000, 10000))
            engagement = int(reach * self._simulate_metric(0.01, 0.1))
            engagement_rate = round(engagement / reach * 100, 2) if reach > 0 else 0
            
            performance["platform_performance"][platform] = {
                "reach": reach,
                "engagement": engagement,
                "engagement_rate": engagement_rate,
                "best_performing_metric": self._get_random_best_metric(platform),
                "worst_performing_metric": self._get_random_worst_metric(platform)
            }
            
            total_reach += reach
            total_engagement += engagement
        
        performance["total_reach"] = total_reach
        performance["total_engagement"] = total_engagement
        performance["overall_engagement_rate"] = round(total_engagement / total_reach * 100, 2) if total_reach > 0 else 0
        
        # Add cross-platform insights
        performance["cross_platform_insights"] = [
            "Content is receiving better engagement on visual platforms compared to text-heavy platforms.",
            "Earlier publications in the campaign are driving traffic to later publications.",
            "Audience demographics show significant overlap between YouTube and Instagram."
        ]
        
        # Add recommendations
        performance["recommendations"] = [
            "Consider creating more visual content as it's performing better across platforms.",
            "Future campaigns should lead with Instagram content to build momentum.",
            "Increase cross-platform references to drive traffic between platforms."
        ]
        
        return performance
    
    def _simulate_metric(self, min_val: float, max_val: float) -> float:
        """Generate a simulated metric value"""
        import random
        return random.uniform(min_val, max_val)
    
    def _get_random_best_metric(self, platform: str) -> Dict[str, Any]:
        """Get a random best performing metric for a platform"""
        metrics = {
            "youtube": ["watch_time", "click_through_rate", "subscription_rate", "comment_rate"],
            "twitter": ["retweet_rate", "click_rate", "reply_rate", "follower_growth"],
            "linkedin": ["comment_rate", "share_rate", "click_rate", "connection_growth"],
            "instagram": ["save_rate", "comment_rate", "follow_rate", "story_completion_rate"]
        }
        
        import random
        platform_metrics = metrics.get(platform.lower(), ["engagement_rate", "reach"])
        metric = random.choice(platform_metrics)
        
        return {
            "name": metric,
            "value": round(self._simulate_metric(0.1, 0.3), 2),
            "comparison": f"{round(self._simulate_metric(10, 30), 1)}% above average"
        }
    
    def _get_random_worst_metric(self, platform: str) -> Dict[str, Any]:
        """Get a random worst performing metric for a platform"""
        metrics = {
            "youtube": ["skip_rate", "dislike_rate", "audience_retention", "card_click_rate"],
            "twitter": ["unfollow_rate", "mute_rate", "block_rate", "negative_sentiment"],
            "linkedin": ["hide_post_rate", "dwell_time", "negative_reactions", "unfollow_rate"],
            "instagram": ["unfollow_rate", "negative_sentiment", "swipe_away_rate", "report_rate"]
        }
        
        import random
        platform_metrics = metrics.get(platform.lower(), ["bounce_rate", "negative_sentiment"])
        metric = random.choice(platform_metrics)
        
        return {
            "name": metric,
            "value": round(self._simulate_metric(0.05, 0.15), 2),
            "comparison": f"{round(self._simulate_metric(5, 15), 1)}% below average"
        }


# ======== User Preference Learning System ========

class UserPreferenceLearner:
    """Learns user preferences from content performance and feedback"""
    
    def __init__(
        self,
        analytics_engine: AnalyticsEngine,
        user_preferences: Dict[str, UserPreference] = None
    ):
        self.analytics_engine = analytics_engine
        self.user_preferences = user_preferences or {}
    
    async def learn_from_performance(
        self,
        work: CreativeWork,
        performance_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Learn preferences from content performance
        
        Args:
            work: The work that was published
            performance_data: Performance analytics for the work
            
        Returns:
            Dict with updated preference insights
        """
        user_id = work.owner_id
        
        # Create user preference if it doesn't exist
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = UserPreference(user_id=user_id)
        
        user_pref = self.user_preferences[user_id]
        
        # Extract insights from performance data
        insights = {
            "content_type_performance": {},
            "platform_performance": {},
            "timing_insights": {},
            "style_insights": {},
            "preference_updates": {}
        }
        
        # Analyze content type performance
        if work.content_type:
            content_type = work.content_type.value
            
            # Update content type preferences
            if content_type not in user_pref.content_preferences:
                user_pref.content_preferences[content_type] = {
                    "performance_score": 0,
                    "sample_count": 0,
                    "last_performance": None
                }
            
            # Calculate performance score
            performance_score = self._calculate_performance_score(performance_data)
            
            # Update running average
            current = user_pref.content_preferences[content_type]
            total_score = current["performance_score"] * current["sample_count"]
            new_count = current["sample_count"] + 1
            new_avg = (total_score + performance_score) / new_count
            
            # Update preferences
            user_pref.content_preferences[content_type]["performance_score"] = new_avg
            user_pref.content_preferences[content_type]["sample_count"] = new_count
            user_pref.content_preferences[content_type]["last_performance"] = performance_score
            
            # Add to insights
            insights["content_type_performance"][content_type] = {
                "current_score": performance_score,
                "average_score": new_avg,
                "sample_count": new_count
            }
            
            insights["preference_updates"]["content_type"] = {
                "type": content_type,
                "score": new_avg
            }
        
        # Analyze platform performance
        if "platform_performance" in performance_data:
            for platform, platform_data in performance_data["platform_performance"].items():
                # Initialize platform in preferences if needed
                if platform not in user_pref.platform_preferences:
                    user_pref.platform_preferences[platform] = {
                        "performance_score": 0,
                        "sample_count": 0,
                        "optimal_posting_times": [],
                        "content_type_performance": {}
                    }
                
                # Calculate platform performance score
                platform_score = self._calculate_platform_score(platform_data)
                
                # Update running average
                current = user_pref.platform_preferences[platform]
                total_score = current["performance_score"] * current["sample_count"]
                new_count = current["sample_count"] + 1
                new_avg = (total_score + platform_score) / new_count
                
                # Update preferences
                user_pref.platform_preferences[platform]["performance_score"] = new_avg
                user_pref.platform_preferences[platform]["sample_count"] = new_count
                
                # Track content type performance on this platform
                if work.content_type:
                    content_type = work.content_type.value
                    if content_type not in user_pref.platform_preferences[platform]["content_type_performance"]:
                        user_pref.platform_preferences[platform]["content_type_performance"][content_type] = {
                            "score": 0,
                            "count": 0
                        }
                    
                    # Update content type score for this platform
                    platform_content = user_pref.platform_preferences[platform]["content_type_performance"][content_type]
                    platform_content["score"] = (platform_content["score"] * platform_content["count"] + platform_score) / (platform_content["count"] + 1)
                    platform_content["count"] += 1
                
                # Add to insights
                insights["platform_performance"][platform] = {
                    "current_score": platform_score,
                    "average_score": new_avg,
                    "sample_count": new_count
                }
                
                insights["preference_updates"]["platform"] = {
                    "platform": platform,
                    "score": new_avg
                }
        
        # Analyze timing insights
        if "publications" in work.metadata:
            for platform, pub_data in work.metadata["publications"].items():
                if "timestamp" in pub_data:
                    try:
                        pub_time = datetime.fromisoformat(pub_data["timestamp"])
                        hour = pub_time.hour
                        
                        # Initialize schedule preferences if needed
                        if "schedule_preferences" not in user_pref.platform_preferences.get(platform, {}):
                            if platform not in user_pref.platform_preferences:
                                user_pref.platform_preferences[platform] = {}
                            
                            user_pref.platform_preferences[platform]["schedule_preferences"] = {
                                "hour_performance": {},
                                "preferred_hours": []
                            }
                        
                        # Get performance for this platform
                        platform_score = 0
                        if platform in performance_data.get("platform_performance", {}):
                            platform_score = self._calculate_platform_score(
                                performance_data["platform_performance"][platform]
                            )
                        
                        # Update hour performance
                        schedule_prefs = user_pref.platform_preferences[platform]["schedule_preferences"]
                        
                        if str(hour) not in schedule_prefs["hour_performance"]:
                            schedule_prefs["hour_performance"][str(hour)] = {
                                "score": 0,
                                "count": 0
                            }
                        
                        hour_perf = schedule_prefs["hour_performance"][str(hour)]
                        hour_perf["score"] = (hour_perf["score"] * hour_perf["count"] + platform_score) / (hour_perf["count"] + 1)
                        hour_perf["count"] += 1
                        
                        # Update preferred hours (top 3)
                        hour_scores = [(int(h), data["score"]) for h, data in schedule_prefs["hour_performance"].items()]
                        top_hours = sorted(hour_scores, key=lambda x: x[1], reverse=True)[:3]
                        schedule_prefs["preferred_hours"] = [h for h, _ in top_hours]
                        
                        # Add to insights
                        if "timing_insights" not in insights:
                            insights["timing_insights"] = {}
                        
                        if platform not in insights["timing_insights"]:
                            insights["timing_insights"][platform] = {}
                        
                        insights["timing_insights"][platform][hour] = {
                            "score": hour_perf["score"],
                            "count": hour_perf["count"]
                        }
                        
                        insights["preference_updates"]["timing"] = {
                            "platform": platform,
                            "preferred_hours": schedule_prefs["preferred_hours"]
                        }
                        
                    except (ValueError, TypeError):
                        pass
        
        # Update user preference timestamp
        user_pref.updated_at = datetime.now()
        
        return insights
    
    async def process_explicit_feedback(
        self,
        user_id: str,
        feedback: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process explicit user feedback to update preferences
        
        Args:
            user_id: User ID to update preferences for
            feedback: Feedback data
            
        Returns:
            Dict with updated preference insights
        """
        # Create user preference if it doesn't exist
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = UserPreference(user_id=user_id)
        
        user_pref = self.user_preferences[user_id]
        updates = {}
        
        # Process content type preferences
        if "content_type_preferences" in feedback:
            for content_type, score in feedback["content_type_preferences"].items():
                if content_type not in user_pref.content_preferences:
                    user_pref.content_preferences[content_type] = {
                        "performance_score": 0,
                        "sample_count": 0,
                        "user_preference": None
                    }
                
                # Update user preference
                user_pref.content_preferences[content_type]["user_preference"] = score
                
                # Add to updates
                if "content_type" not in updates:
                    updates["content_type"] = {}
                
                updates["content_type"][content_type] = score
        
        # Process platform preferences
        if "platform_preferences" in feedback:
            for platform, platform_data in feedback["platform_preferences"].items():
                if platform not in user_pref.platform_preferences:
                    user_pref.platform_preferences[platform] = {}
                
                # Update platform preferences
                for key, value in platform_data.items():
                    user_pref.platform_preferences[platform][key] = value
                
                # Add to updates
                if "platform" not in updates:
                    updates["platform"] = {}
                
                updates["platform"][platform] = platform_data
        
        # Process style preferences
        if "style_preferences" in feedback:
            user_pref.style_preferences.update(feedback["style_preferences"])
            updates["style"] = feedback["style_preferences"]
        
        # Process schedule preferences
        if "schedule_preferences" in feedback:
            for platform, schedule_data in feedback["schedule_preferences"].items():
                if platform not in user_pref.platform_preferences:
                    user_pref.platform_preferences[platform] = {}
                
                if "schedule_preferences" not in user_pref.platform_preferences[platform]:
                    user_pref.platform_preferences[platform]["schedule_preferences"] = {}
                
                # Update schedule preferences
                user_pref.platform_preferences[platform]["schedule_preferences"].update(schedule_data)
                
                # Add to updates
                if "schedule" not in updates:
                    updates["schedule"] = {}
                
                updates["schedule"][platform] = schedule_data
        
        # Update user preference timestamp
        user_pref.updated_at = datetime.now()
        
        return {
            "user_id": user_id,
            "updates": updates
        }
    
    def _calculate_performance_score(self, performance_data: Dict[str, Any]) -> float:
        """Calculate overall performance score from analytics data"""
        # Simple scoring based on engagement rate
        if "overall_engagement_rate" in performance_data:
            # Scale engagement rate to 0-100 score
            return min(100, performance_data["overall_engagement_rate"] * 20)
        
        # If no overall rate, average platform rates
        elif "platform_performance" in performance_data:
            platform_scores = []
            for platform, data in performance_data["platform_performance"].items():
                if "engagement_rate" in data:
                    platform_scores.append(data["engagement_rate"])
            
            if platform_scores:
                avg_rate = sum(platform_scores) / len(platform_scores)
                return min(100, avg_rate * 20)
        
        # Default score if no engagement data
        return 50.0
    
    def _calculate_platform_score(self, platform_data: Dict[str, Any]) -> float:
        """Calculate platform-specific performance score"""
        # Simple scoring based on engagement rate
        if "engagement_rate" in platform_data:
            # Scale engagement rate to 0-100 score
            return min(100, platform_data["engagement_rate"] * 20)
        
        # Default score if no engagement data
        return 50.0
    
    def get_user_preferences(self, user_id: str) -> Optional[UserPreference]:
        """Get user preferences by ID"""
        return self.user_preferences.get(user_id)
    
    def get_content_recommendations(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Get content recommendations based on user preferences
        
        Args:
            user_id: User ID to get recommendations for
            
        Returns:
            Dict with content recommendations
        """
        user_pref = self.get_user_preferences(user_id)
        if not user_pref:
            return {
                "user_id": user_id,
                "error": "No preferences found for user"
            }
        
        recommendations = {
            "user_id": user_id,
            "recommended_content_types": [],
            "recommended_platforms": [],
            "optimal_posting_times": {},
            "style_recommendations": {}
        }
        
        # Recommend content types
        content_scores = []
        for content_type, data in user_pref.content_preferences.items():
            # Prefer user-specified preferences if available
            if "user_preference" in data and data["user_preference"] is not None:
                score = data["user_preference"]
            else:
                score = data.get("performance_score", 0)
            
            content_scores.append((content_type, score))
        
        # Sort by score
        sorted_content = sorted(content_scores, key=lambda x: x[1], reverse=True)
        recommendations["recommended_content_types"] = [
            {"type": ct, "score": score} for ct, score in sorted_content[:3]
        ]
        
        # Recommend platforms
        platform_scores = []
        for platform, data in user_pref.platform_preferences.items():
            score = data.get("performance_score", 0)
            platform_scores.append((platform, score))
        
        # Sort by score
        sorted_platforms = sorted(platform_scores, key=lambda x: x[1], reverse=True)
        recommendations["recommended_platforms"] = [
            {"platform": p, "score": score} for p, score in sorted_platforms[:3]
        ]
        
        # Get optimal posting times
        for platform, data in user_pref.platform_preferences.items():
            if "schedule_preferences" in data and "preferred_hours" in data["schedule_preferences"]:
                preferred_hours = data["schedule_preferences"]["preferred_hours"]
                if preferred_hours:
                    recommendations["optimal_posting_times"][platform] = preferred_hours
        
        # Style recommendations
        if user_pref.style_preferences:
            recommendations["style_recommendations"] = user_pref.style_preferences
        
        return recommendations


# ======== Multi-Modal Content Generator ========

class MultiModalContentGenerator:
    """Generates multi-modal content combining text, images, and video"""
    
    def __init__(
        self,
        content_generator: ContentGenerator,
        user_preferences: Dict[str, UserPreference] = None
    ):
        self.content_generator = content_generator
        self.user_preferences = user_preferences or {}
    
    async def generate_multi_modal_content(
        self,
        work: CreativeWork,
        target_modes: List[str],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate multi-modal content from a base work
        
        Args:
            work: Base creative work
            target_modes: List of target modes (e.g., "text", "image", "video", "audio")
            user_id: Optional user ID for preferences
            
        Returns:
            Dict with multi-modal content
        """
        result = {
            "work_id": work.id,
            "title": work.title,
            "modes": {}
        }
        
        # Consolidate base content
        base_content = self.content_generator._consolidate_content(work)
        
        # Get user preferences if available
        user_prefs = None
        if user_id and user_id in self.user_preferences:
            user_prefs = self.user_preferences[user_id]
        
        # Generate content for each mode
        for mode in target_modes:
            try:
                mode_result = await self._generate_mode_content(
                    base_content, mode, user_prefs
                )
                result["modes"][mode] = mode_result
            except Exception as e:
                logger.error(f"Error generating {mode} content: {e}")
                result["modes"][mode] = {
                    "error": str(e)
                }
        
        return result
    
    async def _generate_mode_content(
        self,
        content: str,
        mode: str,
        user_prefs: Optional[UserPreference] = None
    ) -> Dict[str, Any]:
        """Generate content for a specific mode"""
        provider = await self.content_generator._get_provider()
        
        mode_generators = {
            "text": self._generate_text_content,
            "image": self._generate_image_content,
            "video": self._generate_video_content,
            "audio": self._generate_audio_content,
            "infographic": self._generate_infographic_content
        }
        
        if mode.lower() in mode_generators:
            generator = mode_generators[mode.lower()]
            return await generator(content, provider, user_prefs)
        else:
            return {
                "error": f"Unsupported mode: {mode}"
            }
    
    async def _generate_text_content(
        self,
        content: str,
        provider: LLMProvider,
        user_prefs: Optional[UserPreference] = None
    ) -> Dict[str, Any]:
        """Generate text content"""
        style_guide = ""
        if user_prefs and "text_style" in user_prefs.style_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.style_preferences['text_style']}"
        
        prompt = f"""
        Transform the following content into a well-formatted text document.
        
        Format with:
        - Clear introduction
        - Well-structured body with headings and subheadings
        - Concise conclusion
        - Key takeaways or action items
        {style_guide}
        
        Content to transform:
        {content}
        
        Return the formatted text content only.
        """
        
        formatted_text = await provider.generate_content(prompt, max_tokens=2000)
        
        return {
            "content": formatted_text,
            "mode": "text",
            "format": "markdown"
        }
    
    async def _generate_image_content(
        self,
        content: str,
        provider: LLMProvider,
        user_prefs: Optional[UserPreference] = None
    ) -> Dict[str, Any]:
        """Generate image prompt content"""
        style_guide = ""
        if user_prefs and "image_style" in user_prefs.style_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.style_preferences['image_style']}"
        
        prompt = f"""
        Create 3-5 detailed image prompts based on the following content.
        Each prompt should be suitable for an AI image generation system.
        
        Guidelines:
        - Include visual details (style, composition, lighting, colors)
        - Focus on key concepts from the content
        - Make each image prompt unique and complementary to others
        - Include a brief description of how each image relates to the content
        {style_guide}
        
        Content to visualize:
        {content[:1500]}
        
        Return as JSON with an array of objects, each with "prompt" and "description" fields.
        """
        
        image_prompts_text = await provider.generate_content(prompt, max_tokens=1500)
        
        # Parse JSON response
        try:
            image_prompts = json.loads(image_prompts_text)
        except json.JSONDecodeError:
            # If not valid JSON, create a basic structure
            image_prompts = [
                {
                    "prompt": "Image visualizing the main concept from the content",
                    "description": "Represents the key idea from the provided content"
                }
            ]
        
        return {
            "prompts": image_prompts,
            "mode": "image",
            "format": "prompt"
        }
    
    async def _generate_video_content(
        self,
        content: str,
        provider: LLMProvider,
        user_prefs: Optional[UserPreference] = None
    ) -> Dict[str, Any]:
        """Generate video script content"""
        style_guide = ""
        if user_prefs and "video_style" in user_prefs.style_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.style_preferences['video_style']}"
        
        prompt = f"""
        Create a video script based on the following content.
        
        Include:
        - Opening hook
        - Clear narration
        - Visual descriptions
        - B-roll suggestions
        - Call to action
        {style_guide}
        
        Content to transform:
        {content[:1500]}
        
        Return as JSON with "script" (full script), "scenes" (array of scene descriptions), 
        "duration" (estimated minutes), and "visual_notes" (filming/editing suggestions).
        """
        
        video_content_text = await provider.generate_content(prompt, max_tokens=2000)
        
        # Parse JSON response
        try:
            video_content = json.loads(video_content_text)
        except json.JSONDecodeError:
            # If not valid JSON, create a basic structure
            video_content = {
                "script": video_content_text,
                "scenes": [],
                "duration": "3-5 minutes",
                "visual_notes": "Standard filming with clear audio"
            }
        
        return {
            "content": video_content,
            "mode": "video",
            "format": "script"
        }
    
    async def _generate_audio_content(
        self,
        content: str,
        provider: LLMProvider,
        user_prefs: Optional[UserPreference] = None
    ) -> Dict[str, Any]:
        """Generate audio script content"""
        style_guide = ""
        if user_prefs and "audio_style" in user_prefs.style_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.style_preferences['audio_style']}"
        
        prompt = f"""
        Create an audio script (podcast or narration) based on __init__(
        self,
        contributor_id: str,
        content: str,
        content_type: ContentType,
        timestamp: datetime = None,
        metadata: Dict[str, Any] = None
    ):
        self.contributor_id = contributor_id
        self.content = content
        self.content_type = content_type
        self.timestamp = timestamp or datetime.now()
        self.metadata = metadata or {}


class CreativeWork:
    """A creative work consisting of multiple contributions"""
    
    def __init__(
        self,
        owner_id: str,
        title: str,
        content_type: ContentType,
        contributions: List[Contribution] = None,
        status: WorkStatus = WorkStatus.DRAFT,
        created_at: datetime = None,
        updated_at: datetime = None,
        metadata: Dict[str, Any] = None,
        tags: List[str] = None,
        target_platforms: List[str] = None,
        schedule_time: Optional[datetime] = None
    ):
        self.id = f"work_{int(time.time())}_{hash(title) % 10000:04d}"
        self.owner_id = owner_id
        self.title = title
        self.content_type = content_type
        self.contributions = contributions or []
        self.status = status
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
        self.metadata = metadata or {}
        self.tags = tags or []
        self.target_platforms = target_platforms or []
        self.schedule_time = schedule_time


class AnalyticsData:
    """Analytics data for a published work"""
    
    def __init__(
        self,
        work_id: str,
        platform: str,
        timestamp: datetime = None,
        metrics: Dict[str, Any] = None
    ):
        self.work_id = work_id
        self.platform = platform
        self.timestamp = timestamp or datetime.now()
        self.metrics = metrics or {}


class UserPreference:
    """User preferences for content creation and publishing"""
    
    def __init__(
        self,
        user_id: str,
        content_preferences: Dict[str, Any] = None,
        platform_preferences: Dict[str, Any] = None,
        schedule_preferences: Dict[str, Any] = None,
        style_preferences: Dict[str, Any] = None,
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        self.user_id = user_id
        self.content_preferences = content_preferences or {}
        self.platform_preferences = platform_preferences or {}
        self.schedule_preferences = schedule_preferences or {}
        self.style_preferences = style_preferences or {}
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()


# ======== Content Generation ========

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate_content(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.7) -> str:
        """Generate content using the LLM provider"""
        pass
    
    @abstractmethod
    async def generate_image_prompt(self, content: str, style: Optional[str] = None) -> str:
        """Generate an image prompt based on content"""
        pass


class ContentGenerator:
    """Generates content using LLM providers"""
    
    def __init__(
        self,
        primary_provider: LLMProvider,
        fallback_provider: Optional[LLMProvider] = None,
        user_preferences: Optional[Dict[str, UserPreference]] = None
    ):
        self.primary_provider = primary_provider
        self.fallback_provider = fallback_provider
        self.user_preferences = user_preferences or {}
    
    async def _get_provider(self) -> LLMProvider:
        """Get the current LLM provider to use"""
        # For now, just return the primary provider
        # In a more advanced implementation, this could switch between providers
        # based on availability, cost, or specific requirements
        return self.primary_provider
    
    def _consolidate_content(self, work: CreativeWork) -> str:
        """Consolidate multiple contributions into a single content string"""
        consolidated = f"# {work.title}\n\n"
        
        # Sort contributions by timestamp
        sorted_contributions = sorted(work.contributions, key=lambda c: c.timestamp)
        
        # Append each contribution
        for contrib in sorted_contributions:
            consolidated += f"{contrib.content}\n\n"
        
        return consolidated
    
    async def generate_content_for_platform(
        self,
        work: CreativeWork,
        platform: str,
        content_type: ContentType,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate content specifically formatted for a target platform
        
        Args:
            work: The creative work to format
            platform: Target platform (e.g., "youtube", "twitter", "linkedin")
            content_type: Desired content type for the output
            user_id: Optional user ID to fetch preferences
            
        Returns:
            Dict containing formatted content for the platform
        """
        provider = await self._get_provider()
        
        # Get user preferences if available
        user_prefs = None
        if user_id and user_id in self.user_preferences:
            user_prefs = self.user_preferences[user_id]
        
        # Consolidate existing content
        base_content = self._consolidate_content(work)
        
        # Build platform-specific prompt
        platform_prompts = {
            "youtube": self._build_youtube_prompt,
            "twitter": self._build_twitter_prompt,
            "linkedin": self._build_linkedin_prompt,
            "instagram": self._build_instagram_prompt,
            "facebook": self._build_facebook_prompt,
            "tiktok": self._build_tiktok_prompt,
            "blog": self._build_blog_prompt,
            "email": self._build_email_prompt,
            "podcast": self._build_podcast_prompt
        }
        
        # Use platform-specific prompt builder if available, otherwise use generic
        if platform.lower() in platform_prompts:
            prompt_builder = platform_prompts[platform.lower()]
            prompt = prompt_builder(base_content, content_type, user_prefs)
        else:
            prompt = self._build_generic_prompt(base_content, platform, content_type, user_prefs)
        
        # Generate content
        try:
            result_text = await provider.generate_content(prompt, max_tokens=3000)
            
            # Try to parse JSON response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # If not valid JSON, create a basic structure
                result = {
                    "title": work.title,
                    "content": result_text,
                    "platform": platform,
                    "content_type": content_type.value
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Content generation error: {e}")
            # Return basic structure on failure
            return {
                "title": work.title,
                "content": base_content,
                "platform": platform,
                "content_type": content_type.value,
                "error": str(e)
            }
    
    def _build_youtube_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for YouTube content generation"""
        style_guide = ""
        if user_prefs and "youtube_style" in user_prefs.platform_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.platform_preferences['youtube_style']}"
            
        return f"""
        Convert the following content into a video script format suitable for YouTube.
        Include sections for:
        1. Introduction
        2. Main content (broken into logical segments)
        3. Conclusion
        4. Call to action
        
        Also provide:
        - A catchy title (70 characters max)
        - Video description (5000 characters max)
        - Tags (up to 500 characters total)
        - Thumbnail concept
        {style_guide}
        
        Content to convert:
        {content}
        
        Return in JSON format with keys: title, description, tags, thumbnail_concept, and script.
        """
    
    def _build_twitter_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for Twitter content generation"""
        style_guide = ""
        if user_prefs and "twitter_style" in user_prefs.platform_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.platform_preferences['twitter_style']}"
            
        return f"""
        Create a Twitter thread based on the following content.
        
        Guidelines:
        - First tweet should be attention-grabbing
        - Thread should be 3-7 tweets long
        - Each tweet must be 280 characters or less
        - Include hashtags in the final tweet (max 3)
        - Include a clear call-to-action
        {style_guide}
        
        Content to convert:
        {content}
        
        Return in JSON format with an array of "tweets" and suggested "hashtags".
        """
    
    def _build_linkedin_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for LinkedIn content generation"""
        style_guide = ""
        if user_prefs and "linkedin_style" in user_prefs.platform_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.platform_preferences['linkedin_style']}"
            
        return f"""
        Create a professional LinkedIn post based on the following content.
        
        Guidelines:
        - Start with a strong hook
        - Use professional tone and language
        - Format with line breaks for readability
        - Include 3-5 relevant hashtags
        - Maximum length: 3000 characters
        - Include a question or call-to-action to encourage engagement
        {style_guide}
        
        Content to convert:
        {content}
        
        Return in JSON format with keys: "post_text", "hashtags", and "image_suggestion".
        """
    
    def _build_instagram_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for Instagram content generation"""
        # Instagram prompt implementation
        pass
    
    def _build_facebook_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for Facebook content generation"""
        # Facebook prompt implementation
        pass
    
    def _build_tiktok_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for TikTok content generation"""
        # TikTok prompt implementation
        pass
    
    def _build_blog_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for blog content generation"""
        # Blog prompt implementation
        pass
    
    def _build_email_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for email content generation"""
        # Email prompt implementation
        pass
    
    def _build_podcast_prompt(
        self,
        content: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a prompt for podcast content generation"""
        # Podcast prompt implementation
        pass
    
    def _build_generic_prompt(
        self,
        content: str,
        platform: str,
        content_type: ContentType,
        user_prefs: Optional[UserPreference] = None
    ) -> str:
        """Build a generic prompt for content generation"""
        style_guide = ""
        if user_prefs and "general_style" in user_prefs.style_preferences:
            style_guide = f"\nStyle preferences: {user_prefs.style_preferences['general_style']}"
            
        return f"""
        Reformat the following content for {platform} as {content_type.value}.
        
        Guidelines:
        - Adapt to the typical format, tone, and style for {platform}
        - Optimize for engagement on this platform
        - Include appropriate metadata (tags, descriptions, etc.)
        {style_guide}
        
        Content to convert:
        {content}
        
        Return in JSON format with appropriate keys for the platform and content type.
        """


# ======== Content Publishers ========

class ContentPublisher(ABC):
    """Abstract base class for platform-specific publishers"""
    
    def __init__(self, content_generator: ContentGenerator):
        self.content_generator = content_generator
    
    @abstractmethod
    async def authenticate(self) -> bool:
        """Authenticate with the platform API"""
        pass
    
    @abstractmethod
    async def format_for_platform(self, work: CreativeWork) -> Dict[str, Any]:
        """Format a creative work for the specific platform"""
        pass
    
    @abstractmethod
    async def publish(self, work: CreativeWork, media_path: Optional[str] = None) -> Tuple[bool, Optional[str], Optional[str]]:
        """Publish a work to the platform"""
        pass
    
    @abstractmethod
    async def publish_draft(self, work: CreativeWork) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Create a draft publication for review"""
        pass
    
    @abstractmethod
    async def update_metadata(self, content_id: str, updates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Update metadata for an existing publication"""
        pass
    
    @abstractmethod
    async def get_analytics(self, content_id: str, days: int = 28) -> Dict[str, Any]:
        """Get analytics for a publication"""
        pass


class PublishingCoordinator:
    """Coordinates publishing across multiple platforms"""
    
    def __init__(self, publishers: Dict[str, ContentPublisher]):
        self.publishers = publishers
    
    async def publish_to_platforms(
        self,
        work: CreativeWork,
        platforms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Publish a work to multiple platforms
        
        Args:
            work: The creative work to publish
            platforms: List of platforms to publish to (if None, use work.target_platforms)
            
        Returns:
            Dict containing results for each platform
        """
        if platforms is None:
            platforms = work.target_platforms
        
        results = {}
        
        for platform in platforms:
            if platform in self.publishers:
                publisher = self.publishers[platform]
                
                # Format content for this platform
                formatted_work = await self._format_for_platform(work, platform, publisher)
                
                # Publish to platform
                success, content_id, error = await publisher.publish(formatted_work)
                
                # Store result
                results[platform] = {
                    "success": success,
                    "content_id": content_id,
                    "error": error
                }
                
                # Update work metadata with publication info
                if success and content_id:
                    if "publications" not in work.metadata:
                        work.metadata["publications"] = {}
                    
                    work.metadata["publications"][platform] = {
                        "id": content_id,
                        "timestamp": datetime.now().isoformat(),
                        "url": self._get_content_url(platform, content_id)
                    }
            else:
                results[platform] = {
                    "success": False,
                    "error": f"No publisher found for platform: {platform}"
                }
        
        # Update work status if published to at least one platform
        if any(result["success"] for result in results.values()):
            work.status = WorkStatus.PUBLISHED
            work.updated_at = datetime.now()
        
        return results
    
    async def _format_for_platform(
        self,
        work: CreativeWork,
        platform: str,
        publisher: ContentPublisher
    ) -> CreativeWork:
        """
        Format a work for a specific platform
        
        Args:
            work: The original creative work
            platform: Target platform
            publisher: Publisher for the platform
            
        Returns:
            New CreativeWork instance formatted for the platform
        """
        # Create a new work object to avoid modifying the original
        formatted_work = CreativeWork(
            owner_id=work.owner_id,
            title=work.title,
            content_type=work.content_type,
            status=work.status,
            created_at=work.created_at,
            updated_at=datetime.now(),
            metadata=work.metadata.copy(),
            tags=work.tags.copy(),
            target_platforms=[platform]
        )
        
        # Format content for platform
        platform_content = await publisher.format_for_platform(work)
        
        # Create a new contribution with the formatted content
        contribution = Contribution(
            contributor_id="system",
            content=json.dumps(platform_content) if isinstance(platform_content, dict) else platform_content,
            content_type=work.content_type,
            timestamp=datetime.now(),
            metadata={"platform": platform}
        )
        
        # Add the contribution to the formatted work
        formatted_work.contributions.append(contribution)
        
        return formatted_work
    
    def _get_content_url(self, platform: str, content_id: str) -> str:
        """
        Get the URL for published content based on platform and ID
        
        Args:
            platform: The platform where content was published
            content_id: The ID of the published content
            
        Returns:
            URL to the published content
        """
        url_templates = {
            "youtube": f"https://www.youtube.com/watch?v={content_id}",
            "twitter": f"https://twitter.com/user/status/{content_id}",
            "linkedin": f"https://www.linkedin.com/feed/update/{content_id}",
            "instagram": f"https://www.instagram.com/p/{content_id}/",
            "facebook": f"https://www.facebook.com/{content_id}",
            "tiktok": f"https://www.tiktok.com/@user/video/{content_id}",
            "medium": f"https://medium.com/p/{content_id}"
        }
        
        return url_templates.get(platform.lower(), f"{platform}:{content_id}")


# ======== Scheduling System ========

class PublishingScheduler:
    """Schedules content for publication"""
    
    def __init__(
        self,
        publishing_coordinator: PublishingCoordinator,
        analytics_engine: Optional['AnalyticsEngine'] = None
    ):
        self.publishing_coordinator = publishing_coordinator
        self.analytics_engine = analytics_engine
        self.scheduled_works = {}  # work_id -> (datetime, platforms)
    
    def schedule_publication(
        self,
        work: CreativeWork,
        scheduled_time: datetime,
        platforms: Optional[List[str]] = None
    ) -> bool:
        """
        Schedule a work for publication
        
        Args:
            work: The work to schedule
            scheduled_time: When to publish
            platforms: Platforms to publish to (None = use work.target_platforms)
            
        Returns:
            True if scheduled successfully
        """
        if scheduled_time <= datetime.now():
            return False
        
        work.status = WorkStatus.SCHEDULED
        work.schedule_time = scheduled_time
        
        if platforms:
            work.target_platforms = platforms
        
        self.scheduled_works[work.id] = (scheduled_time, work.target_platforms)
        
        return True
    
    def get_optimal_publishing_time(
        self,
        platform: str,
        content_type: ContentType,
        user_id: Optional[str] = None
    ) -> datetime:
        """
        Determine the optimal time to publish content
        
        Args:
            platform: Target platform
            content_type: Type of content
            user_id: Optional user ID for personalized recommendations
            
        Returns:
            Recommended publishing datetime
        """
        # If analytics engine is available, use it to determine optimal time
        if self.analytics_engine:
            return self.analytics_engine.get_optimal_publishing_time(platform, content_type, user_id)
        
        # Otherwise, use basic heuristics
        now = datetime.now()
        
        # Simple platform-specific time recommendations
        platform_times = {
            "linkedin": 9,  # 9 AM
            "twitter": 12,  # 12 PM
            "instagram": 15,  # 3 PM
            "facebook": 13,  # 1 PM
            "youtube": 17,  # 5 PM
            "tiktok": 19,  # 7 PM
        }
        
        # Default to noon if platform not in dict
        hour = platform_times.get(platform.lower(), 12)
        
        # Set to tomorrow at the specified hour
        tomorrow = now + timedelta(days=1)
        optimal_time = datetime(
            tomorrow.year, tomorrow.month, tomorrow.day, hour, 0, 0
        )
        
        return optimal_time
    
    async def process_due_publications(self) -> Dict[str, Any]:
        """
        Process all publications that are due
        
        Returns:
            Dict with results for each processed work
        """
        now = datetime.now()
        results = {}
        
        # Find works due for publication
        due_works = {
            work_id: (scheduled_time, platforms)
            for work_id, (scheduled_time, platforms) in self.scheduled_works.items()
            if scheduled_time <= now
        }
        
        # Process each due work
        for work_id, (_, platforms) in due_works.items():
            # TODO: In a real implementation, fetch the work from a database
            # For now, assume we have a mock function
            work = self._get_work_by_id(work_id)
            
            if work:
                # Publish to platforms
                result = await self.publishing_coordinator.publish_to_platforms(work, platforms)
                results[work_id] = result
                
                # Remove from scheduled works
                if work_id in self.scheduled_works:
                    del self.scheduled_works[work_id]
        
        return results
    
    def _get_work_by_id(self, work_id: str) -> Optional[CreativeWork]:
        """
        Mock function to get a work by ID
        In a real implementation, this would fetch from a database
        """
        # This is just a placeholder
        return None


# ======== Analytics Engine ========

class AnalyticsEngine:
    """Processes and analyzes content performance"""
    
    def __init__(
        self,
        publishers: Dict[str, ContentPublisher],
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
    
    defdef _add_overall_insights(
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