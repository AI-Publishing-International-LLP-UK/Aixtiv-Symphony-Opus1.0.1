import jwt
import time
import requests
from datetime import datetime, timedelta
from typing import Optional
import os

class GitHubAppService:
    def __init__(self):
        self.app_id = os.getenv('GITHUB_APP_ID')
        self.installation_id = os.getenv('GITHUB_APP_INSTALLATION_ID')
        self.private_key_path = os.getenv('GITHUB_APP_PRIVATE_KEY_PATH')
        self.api_base_url = "https://api.github.com"
        self._installation_token = None
        self._token_expires_at = None

    def _load_private_key(self) -> str:
        """Load the private key for GitHub App authentication."""
        try:
            with open(self.private_key_path, 'r') as key_file:
                return key_file.read()
        except FileNotFoundError:
            raise RuntimeError(f"GitHub App private key not found at {self.private_key_path}")
        except IOError as e:
            raise RuntimeError(f"Failed to read GitHub App private key: {str(e)}")

    def generate_jwt(self) -> str:
        now = datetime.utcnow()
        payload = {
            'iat': int(now.timestamp()),
            'exp': int((now + timedelta(minutes=10)).timestamp()),
            'iss': self.app_id
        }
        private_key = self._load_private_key()
        return jwt.encode(payload, private_key, algorithm='RS256')

    def get_installation_token(self) -> str:
        """Get a valid installation token, refreshing if necessary."""
        if self._is_token_valid():
            return self._installation_token

        jwt_token = self.generate_jwt()
        response = requests.post(
            f"{self.api_base_url}/app/installations/{self.installation_id}/access_tokens",
            headers={
                'Authorization': f'Bearer {jwt_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
        )
        response.raise_for_status()
        data = response.json()
        
        self._installation_token = data['token']
        self._token_expires_at = datetime.strptime(data['expires_at'], '%Y-%m-%dT%H:%M:%SZ')
        return self._installation_token

    def _get_headers(self) -> dict:
        """Get authenticated headers for GitHub API requests."""
        return {
            'Authorization': f'token {self.get_installation_token()}',
            'Accept': 'application/vnd.github.v3+json'
        }

    def create_issue(self, repo_owner: str, repo_name: str, title: str, body: str) -> dict:
        """Create a new issue in the specified repository."""
        try:
            response = requests.post(
                f"{self.api_base_url}/repos/{repo_owner}/{repo_name}/issues",
                headers=self._get_headers(),
                json={'title': title, 'body': body}
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to create issue: {str(e)}")

    def create_comment(self, repo_owner: str, repo_name: str, issue_number: int, body: str) -> dict:
        url = f"{self.api_base_url}/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments"
        response = requests.post(
            url,
            headers=self.get_headers(),
            json={'body': body}
        )
        response.raise_for_status()
        return response.json()

    def get_repository(self, repo_owner: str, repo_name: str) -> dict:
        url = f"{self.api_base_url}/repos/{repo_owner}/{repo_name}"
        response = requests.get(
            url,
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()

