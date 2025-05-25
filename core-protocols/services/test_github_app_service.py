import pytest
import os
from unittest.mock import patch, mock_open
from datetime import datetime, timedelta
from github_app_service import GitHubAppService

MOCK_PRIVATE_KEY = """
-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEA1234567890
... (test key content)
-----END RSA PRIVATE KEY-----
"""

@pytest.fixture
def github_app_service():
    # Set up test environment variables
    os.environ['GITHUB_APP_ID'] = '12345'
    os.environ['GITHUB_APP_INSTALLATION_ID'] = '67890'
    os.environ['GITHUB_APP_PRIVATE_KEY_PATH'] = '/path/to/key.pem'
    
    service = GitHubAppService()
    yield service
    
    # Clean up
    del os.environ['GITHUB_APP_ID']
    del os.environ['GITHUB_APP_INSTALLATION_ID']
    del os.environ['GITHUB_APP_PRIVATE_KEY_PATH']

@pytest.fixture
def mock_responses():
    with patch('requests.post') as mock_post, \
        patch('requests.get') as mock_get:
        
        # Mock installation token response
        mock_post.return_value.json.return_value = {
            'token': 'ghs_mock_installation_token',
            'expires_at': (datetime.utcnow() + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        }
        mock_post.return_value.raise_for_status.return_value = None
        
        # Mock repository response
        mock_get.return_value.json.return_value = {
            'id': 123456789,
            'name': 'test-repo',
            'full_name': 'test-owner/test-repo'
        }
        mock_get.return_value.raise_for_status.return_value = None
        
        yield mock_post, mock_get

def test_jwt_generation(github_app_service):
    with patch('builtins.open', mock_open(read_data=MOCK_PRIVATE_KEY)):
        jwt_token = github_app_service.generate_jwt()
        assert jwt_token is not None
        assert isinstance(jwt_token, str)

def test_installation_token(github_app_service, mock_responses):
    mock_post, _ = mock_responses
    with patch('builtins.open', mock_open(read_data=MOCK_PRIVATE_KEY)):
        token = github_app_service.get_installation_token()
        assert token == 'ghs_mock_installation_token'
        mock_post.assert_called_once()

def test_get_repository(github_app_service, mock_responses):
    _, mock_get = mock_responses
    with patch('builtins.open', mock_open(read_data=MOCK_PRIVATE_KEY)):
        repo = github_app_service.get_repository('test-owner', 'test-repo')
        assert repo['name'] == 'test-repo'
        assert repo['full_name'] == 'test-owner/test-repo'
        mock_get.assert_called_once()

def test_create_issue(github_app_service, mock_responses):
    mock_post, _ = mock_responses
    mock_post.return_value.json.return_value = {
        'number': 1,
        'title': 'Test Issue',
        'body': 'Test Body'
    }
    
    with patch('builtins.open', mock_open(read_data=MOCK_PRIVATE_KEY)):
        issue = github_app_service.create_issue(
            'test-owner',
            'test-repo',
            'Test Issue',
            'Test Body'
        )
        assert issue['number'] == 1
        assert issue['title'] == 'Test Issue'
        assert mock_post.call_count > 0

