"""
Compliance Checker module for Dr. Memoria's Anthology system.
Checks content for compliance with platform guidelines and regulations.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from models import CreativeWork, ContentType

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ComplianceChecker:
    """Checks content for compliance with platform guidelines and regulations"""
    
    def __init__(self, content_generator: 'ContentGenerator'):
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
