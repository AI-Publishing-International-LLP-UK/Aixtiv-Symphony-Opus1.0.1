#!/usr/bin/env python3
"""
GoDaddy DNS Management Script
Customer #: 116648682

This script provides functionality to manage DNS records for GoDaddy domains
through their REST API. It supports batch operations for TXT, A, and CNAME records.
"""

import requests
import json
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'godaddy_dns_updates_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("GoDaddy_DNS_Manager")

@dataclass
class GoDaddyConfig:
    """Configuration class for GoDaddy API access"""
    api_key: str
    api_secret: str
    domain: str
    customer_id: str = "116648682"
    api_url: str = "https://api.godaddy.com/v1"

    def __post_init__(self):
        self.headers = {
            "Authorization": f"sso-key {self.api_key}:{self.api_secret}",
            "Content-Type": "application/json",
            "X-Shopper-Id": self.customer_id
        }

class GoDaddyDNS:
    def __init__(self, config: GoDaddyConfig):
        """
        Initialize the DNS manager with the provided configuration.
        
        Args:
            config: GoDaddyConfig object containing API credentials and domain info
        """
        self.config = config
        self.base_url = f"{config.api_url}/domains/{config.domain}/records"

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> requests.Response:
        """
        Make an HTTP request to the GoDaddy API.
        
        Args:
            method: HTTP method (GET, PUT, POST, DELETE)
            endpoint: API endpoint
            data: Request payload
            
        Returns:
            Response object from the API
            
        Raises:
            requests.exceptions.RequestException: If the API request fails
        """
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.config.headers,
                json=data
            )
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {str(e)}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response content: {e.response.text}")
            raise

    def add_txt_record(self, name: str, value: str, ttl: int = 600) -> bool:
        """
        Add a TXT record to the domain.
        
        Args:
            name: Record name (e.g., '@' for root, 'www' for subdomain)
            value: TXT record value
            ttl: Time to live in seconds (default: 600)
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            data = [{
                "type": "TXT",
                "name": name,
                "data": value,
                "ttl": ttl
            }]
            self._make_request("PUT", "TXT", data)
            logger.info(f"Successfully added TXT record: {name}")
            return True
        except Exception as e:
            logger.error(f"Failed to add TXT record {name}: {str(e)}")
            return False

    def add_a_record(self, name: str, ip_address: str, ttl: int = 600) -> bool:
        """
        Add an A record to the domain.
        
        Args:
            name: Record name (e.g., '@' for root, 'www' for subdomain)
            ip_address: IPv4 address
            ttl: Time to live in seconds (default: 600)
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            data = [{
                "type": "A",
                "name": name,
                "data": ip_address,
                "ttl": ttl
            }]
            self._make_request("PUT", "A", data)
            logger.info(f"Successfully added A record: {name} -> {ip_address}")
            return True
        except Exception as e:
            logger.error(f"Failed to add A record {name}: {str(e)}")
            return False

    def add_cname_record(self, name: str, target: str, ttl: int = 600) -> bool:
        """
        Add a CNAME record to the domain.
        
        Args:
            name: Record name (e.g., 'www' for subdomain)
            target: Target domain name
            ttl: Time to live in seconds (default: 600)
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            data = [{
                "type": "CNAME",
                "name": name,
                "data": target,
                "ttl": ttl
            }]
            self._make_request("PUT", "CNAME", data)
            logger.info(f"Successfully added CNAME record: {name} -> {target}")
            return True
        except Exception as e:
            logger.error(f"Failed to add CNAME record {name}: {str(e)}")
            return False

def batch_update_records(config: GoDaddyConfig, records: List[Dict]) -> None:
    """
    Perform batch updates of DNS records.
    
    Args:
        config: GoDaddyConfig object containing API credentials and domain info
        records: List of record dictionaries to process
    
    Example records format:
    [
        {"type": "TXT", "name": "@", "value": "google-site-verification=example"},
        {"type": "A", "name": "www", "value": "192.0.2.1"},
        {"type": "CNAME", "name": "blog", "value": "www.domain.com"}
    ]
    """
    dns_manager = GoDaddyDNS(config)
    
    for record in records:
        record_type = record["type"].upper()
        name = record["name"]
        value = record["value"]
        ttl = record.get("ttl", 600)
        
        try:
            if record_type == "TXT":
                dns_manager.add_txt_record(name, value, ttl)
            elif record_type == "A":
                dns_manager.add_a_record(name, value, ttl)
            elif record_type == "CNAME":
                dns_manager.add_cname_record(name, value, ttl)
            else:
                logger.warning(f"Unsupported record type: {record_type}")
        except Exception as e:
            logger.error(f"Failed to add {record_type} record: {str(e)}")

if __name__ == "__main__":
    # Example configuration
    config = GoDaddyConfig(
        api_key="YOUR_API_KEY",
        api_secret="YOUR_API_SECRET",
        domain="coaching2100.com"
    )
    
    # Example batch update for Google domain verification and Cloud Run setup
    records = [
        {
            "type": "TXT",
            "name": "@",
            "value": "google-site-verification=YOUR_VERIFICATION_CODE"
        },
        {
            "type": "CNAME",
            "name": "vision",
            "value": "ghs.googlehosted.com"  # Cloud Run domain mapping
        }
    ]
    
    batch_update_records(config, records)

