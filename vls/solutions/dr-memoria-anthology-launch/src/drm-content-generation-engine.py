"""
Content Generation Engine for Dr. Memoria's Anthology system.
Implements the Roark 5.0 Authorship Model for human-AI collaboration.
"""

import asyncio
import os
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime
import logging
from dotenv import load_dotenv

# Load local models
from models import (
    CreativeWork, 
    CreativeContribution, 
    ContributionType, 
    ContentType,
    WorkStatus
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Set constants
MAX_AI_CONTRIBUTION_PERCENTAGE = float(os.getenv('MAX_AI_CONTRIBUTION_PERCENTAGE', '0.3'))
MIN_HUMAN_CONTRIBUTION_PERCENTAGE = float(os.getenv('MIN_HUMAN_CONTRIBUTION_PERCENTAGE', '0.7'))


class LLMProvider:
    """Base class for LLM providers with common interface"""
    
    async def generate_content(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate content based on prompt"""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def generate_variations(self, content: str, count: int = 3) -> List[str]:
        """Generate variations of the provided content"""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def extract_insights(self, content: str) -> Dict[str, Any]:
        """Extract insights and key points from content"""
        raise NotImplementedError("Subclasses must implement this method")


class OpenAIProvider(LLMProvider):
    """OpenAI implementation of LLM provider"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4"):
        """Initialize OpenAI provider with API key and model"""
        import openai
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        openai.api_key = self.api_key
        self.openai = openai
        self.model = model
    
    async def generate_content(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate content using OpenAI API"""
        try:
            response = await self.openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a creative assistant following the Roark 5.0 Authorship Model, which emphasizes human creative leadership with AI assistance."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI content generation error: {e}")
            raise
    
    async def generate_variations(self, content: str, count: int = 3) -> List[str]:
        """Generate variations of the provided content using OpenAI API"""
        try:
            prompt = f"""
            Please provide {count} different variations of the following content, 
            maintaining the same key points but varying the style, structure, or approach:
            
            {content}
            """
            
            response = await self.openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a creative assistant that generates variations of content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.8
            )
            
            result = response.choices[0].message.content.strip()
            
            # Parse variations (simple approach)
            variations = []
            for i in range(1, count + 1):
                if f"Variation {i}:" in result:
                    parts = result.split(f"Variation {i}:")
                    if i < count and f"Variation {i+1}:" in parts[1]:
                        variation = parts[1].split(f"Variation {i+1}:")[0].strip()
                    else:
                        variation = parts[1].strip()
                    variations.append(variation)
            
            # If parsing fails, just split by double newlines
            if not variations or len(variations) < count:
                variations = result.split("\n\n")[:count]
            
            return variations[:count]  # Ensure we return exactly the requested count
            
        except Exception as e:
            logger.error(f"OpenAI variation generation error: {e}")
            raise
    
    async def extract_insights(self, content: str) -> Dict[str, Any]:
        """Extract insights and key points from content using OpenAI API"""
        try:
            prompt = f"""
            Please analyze the following content and extract:
            1. Main themes
            2. Key points
            3. Tone and style
            4. Target audience
            5. Potential improvements
            
            Content:
            {content}
            
            Return your analysis as structured data that could be parsed as JSON.
            """
            
            response = await self.openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an analytical assistant that extracts insights from content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.2
            )
            
            result = response.choices[0].message.content.strip()
            
            # Try to parse as JSON
            import json
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                # If not valid JSON, return as raw text
                return {
                    "raw_analysis": result,
                    "error": "Could not parse as JSON"
                }
            
        except Exception as e:
            logger.error(f"OpenAI insight extraction error: {e}")
            raise


class AnthropicProvider(LLMProvider):
    """Anthropic Claude implementation of LLM provider"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-2"):
        """Initialize Anthropic provider with API key and model"""
        import anthropic
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        self.anthropic = anthropic
        self.client = anthropic.Client(api_key=self.api_key)
        self.model = model
    
    async def generate_content(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate content using Anthropic API"""
        try:
            response = self.client.completion(
                prompt=f"{self.anthropic.HUMAN_PROMPT} {prompt}{self.anthropic.AI_PROMPT}",
                model=self.model,
                max_tokens_to_sample=max_tokens,
                temperature=0.7
            )
            return response.completion.strip()
        except Exception as e:
            logger.error(f"Anthropic content generation error: {e}")
            raise
    
    async def generate_variations(self, content: str, count: int = 3) -> List[str]:
        """Generate variations of the provided content using Anthropic API"""
        try:
            prompt = f"""
            Please provide {count} different variations of the following content, 
            maintaining the same key points but varying the style, structure, or approach:
            
            {content}
            """
            
            response = self.client.completion(
                prompt=f"{self.anthropic.HUMAN_PROMPT} {prompt}{self.anthropic.AI_PROMPT}",
                model=self.model,
                max_tokens_to_sample=2000,
                temperature=0.8
            )
            
            result = response.completion.strip()
            
            # Parse variations (simple approach)
            variations = []
            for i in range(1, count + 1):
                if f"Variation {i}:" in result:
                    parts = result.split(f"Variation {i}:")
                    if i < count and f"Variation {i+1}:" in parts[1]:
                        variation = parts[1].split(f"Variation {i+1}:")[0].strip()
                    else:
                        variation = parts[1].strip()
                    variations.append(variation)
            
            # If parsing fails, just split by double newlines
            if not variations or len(variations) < count:
                variations = result.split("\n\n")[:count]
            
            return variations[:count]  # Ensure we return exactly the requested count
            
        except Exception as e:
            logger.error(f"Anthropic variation generation error: {e}")
            raise
    
    async def extract_insights(self, content: str) -> Dict[str, Any]:
        """Extract insights and key points from content using Anthropic API"""
        try:
            prompt = f"""
            Please analyze the following content and extract:
            1. Main themes
            2. Key points
            3. Tone and style
            4. Target audience
            5. Potential improvements
            
            Content:
            {content}
            
            Return your analysis as structured data that could be parsed as JSON.
            """
            
            response = self.client.completion(
                prompt=f"{self.anthropic.HUMAN_PROMPT} {prompt}{self.anthropic.AI_PROMPT}",
                model=self.model,
                max_tokens_to_sample=1000,
                temperature=0.2
            )
            
            result = response.completion.strip()
            
            # Try to parse as JSON
            import json
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                # If not valid JSON, return as raw text
                return {
                    "raw_analysis": result,
                    "error": "Could not parse as JSON"
                }
            
        except Exception as e:
            logger.error(f"Anthropic insight extraction error: {e}")
            raise


class LLMProviderFactory:
    """Factory for creating LLM providers"""
    
    @staticmethod
    def create_provider(provider_name: str, **kwargs) -> LLMProvider:
        """Create an LLM provider instance based on provider name"""
        if provider_name.lower() == "openai":
            return OpenAIProvider(**kwargs)
        elif provider_name.lower() == "anthropic":
            return AnthropicProvider(**kwargs)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider_name}")


class EthicalValidator:
    """Validates content for ethical considerations and originality"""
    
    def __init__(self, llm_provider: LLMProvider):
        self.llm_provider = llm_provider
    
    async def validate_originality(self, content: str) -> Tuple[bool, float, Optional[str]]:
        """
        Validate the originality of content
        
        Returns:
            Tuple of (is_original, originality_score, error_message)
        """
        try:
            prompt = f"""
            Please evaluate the following content for originality on a scale of 0.0 to 1.0,
            where 1.0 is completely original and 0.0 is completely unoriginal or plagiarized.
            
            Consider factors like uniqueness of ideas, creativity, and distinctive voice.
            
            Content to evaluate:
            {content}
            
            Return your evaluation as a JSON object with:
            1. originality_score (float between 0 and 1)
            2. reasoning (string explaining your evaluation)
            3. potential_concerns (any specific concerns about originality)
            """
            
            result_text = await self.llm_provider.generate_content(prompt)
            
            # Try to parse as JSON
            import json
            try:
                result = json.loads(result_text)
                originality_score = float(result.get("originality_score", 0))
                concerns = result.get("potential_concerns")
                
                # Consider original if score is above threshold and no major concerns
                is_original = originality_score >= 0.7 and not concerns
                error_message = concerns if concerns else None
                
                return (is_original, originality_score, error_message)
            except (json.JSONDecodeError, ValueError):
                # If parsing fails, assume validation failed
                return (False, 0.0, "Failed to evaluate originality")
                
        except Exception as e:
            logger.error(f"Originality validation error: {e}")
            return (False, 0.0, str(e))
    
    async def validate_ethical_compliance(self, content: str) -> Tuple[bool, Optional[str]]:
        """
        Validate content for ethical compliance (bias, harmful content, etc.)
        
        Returns:
            Tuple of (is_compliant, error_message)
        """
        try:
            prompt = f"""
            Please evaluate the following content for ethical issues including:
            - Harmful or dangerous content
            - Hate speech or discrimination
            - Misinformation
            - Privacy violations
            - Intellectual property violations
            - Biased or unfair representations
            
            Content to evaluate:
            {content}
            
            Return your evaluation as a JSON object with:
            1. is_compliant (boolean)
            2. issues (array of specific issues found, or empty if none)
            3. reasoning (string explaining your evaluation)
            """
            
            result_text = await self.llm_provider.generate_content(prompt)
            
            # Try to parse as JSON
            import json
            try:
                result = json.loads(result_text)
                is_compliant = result.get("is_compliant", False)
                issues = result.get("issues", [])
                
                error_message = None
                if issues:
                    error_message = "; ".join(issues)
                
                return (is_compliant, error_message)
            except json.JSONDecodeError:
                # If parsing fails, assume validation failed
                return (False, "Failed to evaluate ethical compliance")
                
        except Exception as e:
            logger.error(f"Ethical compliance validation error: {e}")
            return (False, str(e))
    
    async def validate_content(self, content: str) -> Dict[str, Any]:
        """
        Run all validations on content
        
        Returns:
            Dict with validation results
        """
        originality_result = await self.validate_originality(content)
        ethical_result = await self.validate_ethical_compliance(content)
        
        is_valid = originality_result[0] and ethical_result[0]
        
        return {
            "is_valid": is_valid,
            "originality": {
                "is_original": originality_result[0],
                "score": originality_result[1],
                "concerns": originality_result[2]
            },
            "ethical_compliance": {
                "is_compliant": ethical_result[0],
                "issues": ethical_result[1]
            }
        }


class ContentGenerator:
    """Core content generation engine implementing Roark 5.0 Authorship Model"""
    
    def __init__(self, primary_provider: LLMProvider, fallback_provider: Optional[LLMProvider] = None):
        """Initialize with primary and optional fallback LLM provider"""
        self.primary_provider = primary_provider
        self.fallback_provider = fallback_provider
        self.ethical_validator = EthicalValidator(primary_provider)
    
    async def _get_provider(self) -> LLMProvider:
        """Get available provider with fallback logic"""
        try:
            # Simple connection test
            await self.primary_provider.generate_content("test", max_tokens=5)
            return self.primary_provider
        except Exception as e:
            logger.warning(f"Primary provider failed: {e}")
            if self.fallback_provider:
                logger.info("Falling back to secondary provider")
                return self.fallback_provider
            else:
                raise ValueError("No available LLM provider")
    
    async def initiate_creative_project(self, owner_id: str, initial_concept: str, 
                                       content_type: ContentType) -> CreativeWork:
        """
        Start a new creative project with initial concept
        Follows Roark 5.0 Authorship Model requiring human creative leadership
        """
        # Validate that the initial concept is original and human-driven
        validation = await self.ethical_validator.validate_content(initial_concept)
        
        if not validation["is_valid"]:
            concerns = []
            if not validation["originality"]["is_original"]:
                concerns.append(f"Originality concerns: {validation['originality']['concerns']}")
            if not validation["ethical_compliance"]["is_compliant"]:
                concerns.append(f"Ethical concerns: {validation['ethical_compliance']['issues']}")
            
            raise ValueError(f"Initial concept validation failed: {'; '.join(concerns)}")
        
        # Create title from concept
        title = await self._generate_title_from_concept(initial_concept)
        
        # Create new creative work
        work = CreativeWork(
            owner_id=owner_id,
            title=title,
            content_type=content_type
        )
        
        # Add initial concept as first human contribution
        initial_contribution = CreativeContribution(
            contributor_id=owner_id,
            contribution_type=ContributionType.HUMAN,
            content=initial_concept
        )
        
        work.add_contribution(initial_contribution)
        return work
    
    async def _generate_title_from_concept(self, concept: str) -> str:
        """Generate a title based on the initial concept"""
        try:
            provider = await self._get_provider()
            prompt = f"""
            Please create a concise, engaging title for content based on this concept:
            
            {concept}
            
            Return only the title, no additional explanation.
            """
            
            title = await provider.generate_content(prompt, max_tokens=50)
            
            # Clean up title (remove quotes, etc.)
            title = title.strip('"\'')
            
            # Limit title length
            if len(title) > 100:
                title = title[:97] + "..."
                
            return title
        except Exception as e:
            logger.error(f"Title generation error: {e}")
            # Generate simple title from first line as fallback
            first_line = concept.split("\n")[0].strip()
            return first_line[:50] + ("..." if len(first_line) > 50 else "")
    
    async def generate_ai_suggestions(self, work: CreativeWork, 
                                     max_suggestions: int = 3) -> List[str]:
        """
        Generate AI suggestions for the creative work
        These are presented to the human creator for consideration
        """
        try:
            provider = await self._get_provider()
            
            # Combine all existing contributions to create context
            contributions_text = "\n\n".join([
                f"[{c.contribution_type.value.upper()}]: {c.content}" 
                for c in work.contributions
            ])
            
            prompt = f"""
            You are assisting with a creative work following the Roark 5.0 Authorship Model,
            which emphasizes human creative leadership with AI as a collaborative tool.
            
            The work is a {work.content_type.value} titled "{work.title}".
            
            Here are the existing contributions:
            
            {contributions_text}
            
            Please provide {max_suggestions} helpful suggestions to enhance this work.
            Each suggestion should be substantive and continue the creative direction.
            
            Format each suggestion as "Suggestion X: [Your suggestion]"
            """
            
            result = await provider.generate_content(prompt, max_tokens=2000)
            
            # Parse suggestions
            suggestions = []
            for i in range(1, max_suggestions + 1):
                if f"Suggestion {i}:" in result:
                    parts = result.split(f"Suggestion {i}:")
                    if i < max_suggestions and f"Suggestion {i+1}:" in parts[1]:
                        suggestion = parts[1].split(f"Suggestion {i+1}:")[0].strip()
                    else:
                        suggestion = parts[1].strip()
                    suggestions.append(suggestion)
            
            # If parsing fails, just split by double newlines
            if not suggestions or len(suggestions) < max_suggestions:
                import re
                # Split by double newline or numbered patterns
                suggestions = re.split(r'\n\n|\d+\.\s+', result)
                suggestions = [s.strip() for s in suggestions if s.strip()]
            
            return suggestions[:max_suggestions]
        except Exception as e:
            logger.error(f"AI suggestion generation error: {e}")
            raise
    
    async def add_human_contribution(self, work: CreativeWork, contributor_id: str, 
                                    content: str) -> CreativeWork:
        """
        Add a human contribution to the creative work
        This is a key part of maintaining human creative leadership
        """
        # Validate content
        validation = await self.ethical_validator.validate_content(content)
        
        if not validation["is_valid"]:
            concerns = []
            if not validation["originality"]["is_original"]:
                concerns.append(f"Originality concerns: {validation['originality']['concerns']}")
            if not validation["ethical_compliance"]["is_compliant"]:
                concerns.append(f"Ethical concerns: {validation['ethical_compliance']['issues']}")
            
            raise ValueError(f"Human contribution validation failed: {'; '.join(concerns)}")
        
        # Add contribution
        contribution = CreativeContribution(
            contributor_id=contributor_id,
            contribution_type=ContributionType.HUMAN,
            content=content
        )
        
        work.add_contribution(contribution)
        return work
    
    async def add_ai_contribution(self, work: CreativeWork, content: str) -> CreativeWork:
        """
        Add an AI contribution to the creative work
        """
        # Check if adding this AI contribution would exceed maximum AI percentage
        percentages = work.calculate_contribution_percentages()
        current_ai_percentage = percentages.get(ContributionType.AI, 0)
        future_count = len(work.contributions) + 1
        future_ai_count = len(work.get_ai_contributions()) + 1
        future_ai_percentage = future_ai_count / future_count
        
        if future_ai_percentage > MAX_AI_CONTRIBUTION_PERCENTAGE:
            raise ValueError(
                f"Adding this AI contribution would exceed the maximum allowed AI contribution percentage "
                f"({MAX_AI_CONTRIBUTION_PERCENTAGE*100}%). More human contributions are required."
            )
        
        # Validate content
        validation = await self.ethical_validator.validate_content(content)
        
        if not validation["is_valid"]:
            concerns = []
            if not validation["originality"]["is_original"]:
                concerns.append(f"Originality concerns: {validation['originality']['concerns']}")
            if not validation["ethical_compliance"]["is_compliant"]:
                concerns.append(f"Ethical concerns: {validation['ethical_compliance']['issues']}")
            
            raise ValueError(f"AI contribution validation failed: {'; '.join(concerns)}")
        
        # Add contribution
        contribution = CreativeContribution(
            contributor_id="ai_assistant",
            contribution_type=ContributionType.AI,
            content=content
        )
        
        work.add_contribution(contribution)
        return work
    
    async def finalize_creative_work(self, work: CreativeWork) -> CreativeWork:
        """
        Finalize the creative work and prepare for blockchain registration
        """
        # Ensure minimum human contribution percentage is met
        percentages = work.calculate_contribution_percentages()
        human_percentage = percentages.get(ContributionType.HUMAN, 0)
        
        if human_percentage < MIN_HUMAN_CONTRIBUTION_PERCENTAGE:
            raise ValueError(
                f"Human contribution percentage ({human_percentage*100:.1f}%) is below the minimum "
                f"required ({MIN_HUMAN_CONTRIBUTION_PERCENTAGE*100}%) for the Roark 5.0 Authorship Model."
            )
        
        # Calculate originality score by evaluating the consolidated content
        consolidated_content = self._consolidate_content(work)
        validation = await self.ethical_validator.validate_content(consolidated_content)
        originality_score = validation["originality"]["score"]
        
        # Generate creative passport
        work.generate_creative_passport(originality_score)
        
        # Set status to reviewing
        work.status = WorkStatus.REVIEWING
        
        return work
    
    def _consolidate_content(self, work: CreativeWork) -> str:
        """
        Consolidate all contributions into a single piece of content
        """
        return "\n\n".join([contribution.content for contribution in work.contributions])
    
    async def estimate_cost(self, work: CreativeWork) -> Dict[str, Any]:
        """
        Estimate the cost of generating this creative work
        """
        # This is a simplified cost estimation model
        # Real implementation would be more sophisticated
        total_tokens = sum([len(c.content.split()) * 1.3 for c in work.contributions])
        
        # Calculate AI vs human breakdown
        ai_tokens = sum([len(c.content.split()) * 1.3 for c in work.get_ai_contributions()])
        human_tokens = total_tokens - ai_tokens
        
        # Approximate costs (very simplified)
        openai_cost_per_1k = 0.03  # Example rate
        claude_cost_per_1k = 0.025  # Example rate
        
        openai_cost = (ai_tokens / 1000) * openai_cost_per_1k
        claude_cost = (ai_tokens / 1000) * claude_cost_per_1k
        
        return {
            "total_tokens": int(total_tokens),
            "ai_tokens": int(ai_tokens),
            "human_tokens": int(human_tokens),
            "estimated_costs": {
                "openai": round(openai_cost, 3),
                "claude": round(claude_cost, 3)
            }
        }


# Example usage
async def main():
    try:
        # Initialize LLM providers
        openai_provider = OpenAIProvider()
        anthropic_provider = AnthropicProvider()
        
        # Create content generator with fallback
        generator = ContentGenerator(
            primary_provider=openai_provider,
            fallback_provider=anthropic_provider
        )
        
        # Initialize a creative work
        initial_concept = "An exploration of how AI and humans can collaborate on creative projects while maintaining human creative leadership and originality."
        
        work = await generator.initiate_creative_project(
            owner_id="user123",
            initial_concept=initial_concept,
            content_type=ContentType.ARTICLE
        )
        
        print(f"New creative work: {work.title}")
        print(f"Status: {work.status}")
        
        # Generate AI suggestions
        suggestions = await generator.generate_ai_suggestions(work)
        print(f"\nAI suggestions:")
        for i, suggestion in enumerate(suggestions):
            print(f"Suggestion {i+1}: {suggestion[:100]}...")
        
        # Add an AI contribution (typically chosen by human)
        if suggestions:
            await generator.add_ai_contribution(work, suggestions[0])
        
        # Add a human contribution
        await generator.add_human_contribution(
            work,
            contributor_id="user123",
            content="Human creators bring unique perspectives and creative vision that AI cannot replicate. The best collaborative outcomes occur when humans provide creative direction and AI assists with generation and refinement."
        )
        
        # Finalize work
        finalized_work = await generator.finalize_creative_work(work)
        
        print(f"\nFinalized work: {finalized_work.title}")
        print(f"Status: {finalized_work.status}")
        print(f"Contributions: {len(finalized_work.contributions)}")
        print(f"Human contribution: {finalized_work.calculate_contribution_percentages()[ContributionType.HUMAN] * 100:.1f}%")
        print(f"Originality score: {finalized_work.creative_passport.originality_score}")
        
        # Estimate cost
        cost_estimate = await generator.estimate_cost(work)
        print(f"\nEstimated cost: ${cost_estimate['estimated_costs']['openai']:.3f}")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
