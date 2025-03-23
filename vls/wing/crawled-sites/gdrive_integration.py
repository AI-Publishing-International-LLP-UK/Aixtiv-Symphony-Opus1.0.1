#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Google Drive Integration Module

This module provides a comprehensive integration with Google Drive API,
allowing for authentication, folder creation/management, file uploads/downloads,
and search functionality. It is designed specifically for use with the
pr@coaching2100.com account.

Usage:
    - Initialize the GoogleDriveManager class
    - Use the provided methods to interact with Google Drive
    - See the main function for usage examples

Requirements:
    - google-api-python-client
    - google-auth-httplib2
    - google-auth-oauthlib

Author: Coaching2100 Team
"""

# Standard library imports
import os
import io
import pickle
import logging
from typing import List, Dict, Optional, Union, Any, Tuple

# Third-party imports
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('gdrive_integration')


class GoogleDriveManager:
    """
    A class to manage Google Drive operations including authentication,
    folder management, file operations, and search functionality.
    """

    # Google Drive API scopes
    SCOPES = ['https://www.googleapis.com/auth/drive']
    
    # File types and MIME types
    MIME_TYPES = {
        'folder': 'application/vnd.google-apps.folder',
        'pdf': 'application/pdf',
        'csv': 'text/csv',
        'doc': 'application/vnd.google-apps.document',
        'sheet': 'application/vnd.google-apps.spreadsheet',
        'json': 'application/json',
        'text': 'text/plain',
    }

    def __init__(self, credentials_path: str = 'credentials.json', token_path: str = 'token.pickle'):
        """
        Initialize the GoogleDriveManager with paths to credential files.

        Args:
            credentials_path (str): Path to the Google API credentials file
            token_path (str): Path to store/retrieve the authentication token
        """
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = None
        self.authenticate()
        logger.info("GoogleDriveManager initialized")

    def authenticate(self) -> None:
        """
        Authenticate with Google Drive API using OAuth2.
        
        The function will try to use existing token if available,
        otherwise it will initiate a new authentication flow.
        """
        creds = None

        # Check if token file exists and load credentials from it
        if os.path.exists(self.token_path):
            try:
                with open(self.token_path, 'rb') as token:
                    creds = pickle.load(token)
                logger.info("Loaded credentials from token file")
            except Exception as e:
                logger.error(f"Error loading token: {e}")

        # If credentials don't exist or are invalid, create new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                    logger.info("Refreshed expired credentials")
                except Exception as e:
                    logger.error(f"Error refreshing credentials: {e}")
                    creds = None
            
            # If still no valid credentials, run the OAuth flow
            if not creds:
                try:
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path, self.SCOPES)
                    creds = flow.run_local_server(port=0)
                    logger.info("Created new credentials via OAuth flow")
                except Exception as e:
                    logger.error(f"Error in authentication flow: {e}")
                    raise
                
            # Save the credentials for future use
            try:
                with open(self.token_path, 'wb') as token:
                    pickle.dump(creds, token)
                logger.info("Saved credentials to token file")
            except Exception as e:
                logger.error(f"Error saving token: {e}")

        # Build the Drive service
        try:
            self.service = build('drive', 'v3', credentials=creds)
            logger.info("Google Drive service built successfully")
        except Exception as e:
            logger.error(f"Failed to build Drive service: {e}")
            raise

    def create_folder(self, folder_name: str, parent_id: Optional[str] = None) -> str:
        """
        Create a new folder in Google Drive.
        
        Args:
            folder_name (str): Name of the folder to create
            parent_id (str, optional): ID of the parent folder. If None, creates in root
            
        Returns:
            str: ID of the created folder
        """
        try:
            file_metadata = {
                'name': folder_name,
                'mimeType': self.MIME_TYPES['folder'],
            }
            
            if parent_id:
                file_metadata['parents'] = [parent_id]
                
            folder = self.service.files().create(
                body=file_metadata,
                fields='id'
            ).execute()
            
            folder_id = folder.get('id')
            logger.info(f"Created folder '{folder_name}' with ID: {folder_id}")
            return folder_id
            
        except HttpError as e:
            logger.error(f"Error creating folder '{folder_name}': {e}")
            raise

    def find_folder(self, folder_name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """
        Find a folder by name in Google Drive.
        
        Args:
            folder_name (str): Name of the folder to find
            parent_id (str, optional): ID of the parent folder to search in
            
        Returns:
            str or None: ID of the found folder or None if not found
        """
        try:
            query = f"mimeType='{self.MIME_TYPES['folder']}' and name='{folder_name}' and trashed=false"
            
            if parent_id:
                query += f" and '{parent_id}' in parents"
                
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            items = results.get('files', [])
            
            if not items:
                logger.info(f"Folder '{folder_name}' not found")
                return None
                
            folder_id = items[0].get('id')
            logger.info(f"Found folder '{folder_name}' with ID: {folder_id}")
            return folder_id
            
        except HttpError as e:
            logger.error(f"Error finding folder '{folder_name}': {e}")
            raise

    def get_or_create_folder(self, folder_name: str, parent_id: Optional[str] = None) -> str:
        """
        Get a folder by name, or create it if it doesn't exist.
        
        Args:
            folder_name (str): Name of the folder to find or create
            parent_id (str, optional): ID of the parent folder
            
        Returns:
            str: ID of the found or created folder
        """
        folder_id = self.find_folder(folder_name, parent_id)
        
        if folder_id is None:
            folder_id = self.create_folder(folder_name, parent_id)
            logger.info(f"Created new folder '{folder_name}' with ID: {folder_id}")
        else:
            logger.info(f"Using existing folder '{folder_name}' with ID: {folder_id}")
            
        return folder_id

    def upload_file(self, file_path: str, file_name: Optional[str] = None, 
                    parent_id: Optional[str] = None, mime_type: Optional[str] = None) -> str:
        """
        Upload a file to Google Drive.
        
        Args:
            file_path (str): Path to the file to upload
            file_name (str, optional): Name to use for the file in Drive. If None, uses the original filename
            parent_id (str, optional): ID of the parent folder. If None, uploads to root
            mime_type (str, optional): MIME type of the file. If None, it will be guessed
            
        Returns:
            str: ID of the uploaded file
        """
        try:
            if file_name is None:
                file_name = os.path.basename(file_path)
                
            file_metadata = {
                'name': file_name,
            }
            
            if parent_id:
                file_metadata['parents'] = [parent_id]
                
            if not mime_type:
                extension = os.path.splitext(file_path)[1].lower()[1:]
                mime_type = self.MIME_TYPES.get(extension, 'application/octet-stream')
                
            media = MediaFileUpload(
                file_path,
                mimetype=mime_type,
                resumable=True
            )
            
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            file_id = file.get('id')
            logger.info(f"Uploaded file '{file_name}' with ID: {file_id}")
            return file_id
            
        except HttpError as e:
            logger.error(f"Error uploading file '{file_path}': {e}")
            raise
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            raise

    def download_file(self, file_id: str, output_path: str) -> bool:
        """
        Download a file from Google Drive.
        
        Args:
            file_id (str): ID of the file to download
            output_path (str): Path where the file should be saved
            
        Returns:
            bool: True if download was successful
        """
        try:
            request = self.service.files().get_media(fileId=file_id)
            
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
                logger.info(f"Download progress: {int(status.progress() * 100)}%")
                
            # Write the file to disk
            fh.seek(0)
            with open(output_path, 'wb') as f:
                f.write(fh.read())
                
            logger.info(f"Downloaded file with ID: {file_id} to {output_path}")
            return True
            
        except HttpError as e:
            logger.error(f"Error downloading file with ID '{file_id}': {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error downloading file: {e}")
            return False

    def delete_file(self, file_id: str) -> bool:
        """
        Delete a file from Google Drive.
        
        Args:
            file_id (str): ID of the file to delete
            
        Returns:
            bool: True if deletion was successful
        """
        try:
            self.service.files().delete(fileId=file_id).execute()
            logger.info(f"Deleted file with ID: {file_id}")
            return True
            
        except HttpError as e:
            logger.error(f"Error deleting file with ID '{file_id}': {e}")
            return False

    def search_files(self, query: str, max_results: int = 10) -> List[Dict[str, str]]:
        """
        Search for files in Google Drive.
        
        Args:
            query (str): Search query string
            max_results (int, optional): Maximum number of results to return
            
        Returns:
            list: List of dictionaries containing file information
        """
        try:
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, mimeType, createdTime, modifiedTime)',
                pageSize=max_results
            ).execute()
            
            items = results.get('files', [])
            
            if not items:
                logger.info("No files found matching the query")
                return []
                
            logger.info(f"Found {len(items)} files matching the query")
            return items
            
        except HttpError as e:
            logger.error(f"Error searching for files: {e}")
            return []

    def list_folder_contents(self, folder_id: str) -> List[Dict[str, str]]:
        """
        List all files and folders within a specific folder.
        
        Args:
            folder_id (str): ID of the folder to list contents from
            
        Returns:
            list: List of dictionaries containing file/folder information
        """
        try:
            query = f"'{folder_id}' in parents and trashed=false"
            
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, mimeType, createdTime, modifiedTime)'
            ).execute()
            
            items = results.get('files', [])
            
            if not items:
                logger.info(f"No files found in folder with ID: {folder_id}")
                return []
                
            logger.info(f"Found {len(items)} items in folder with ID: {folder_id}")
            return items
            
        except HttpError as e:
            logger.error(f"Error listing folder contents: {e}")
            return []

    def share_file(self, file_id: str, email: str, role: str = 'reader') -> bool:
        """
        Share a file with another user.
        
        Args:
            file_id (str): ID of the file to share
            email (str): Email address of the user to share with
            role (str): Role to grant (reader, writer, commenter, or owner)
            
        Returns:
            bool: True if sharing was successful
        """
        try:
            batch = self.service.new_batch_http_request()
            
            user_permission = {
                'type': 'user',
                'role': role,
                'emailAddress': email
            }
            
            batch.add(
                self.service.permissions().create(
                    fileId=file_id,
                    body=user_permission,
                    fields='id',
                    sendNotificationEmail=True
                )
            )
            
            batch.execute()
            logger.info(f"Shared file {file_id} with {email} as {role}")
            return True
            
        except HttpError as e:
            logger.error(f"Error sharing file {file_id} with {email}: {e}")
            return False


def main():
    """
    Demonstrate usage of the GoogleDriveManager class.
    
    This function shows examples of how to use the various methods
    of the GoogleDriveManager class for common Google Drive operations.
    """
    # Initialize the GoogleDriveManager
    try:
        gdrive = GoogleDriveManager(
            credentials_path='credentials.json',
            token_path='token.pickle'
        )
        print("Successfully authenticated with Google Drive")
    except Exception as e:
        print(f"Authentication failed: {e}")
        return

    # Example: Create folder structure
    print("\n1. Creating folder structure:")
    try:
        # Create a main folder
        main_folder_id = gdrive.get_or_create_folder("Coaching2100_Files")
        print(f"  Main folder ID: {main_folder_id}")
        
        # Create subfolders
        docs_folder_id = gdrive.create_folder("Documents", main_folder_id)
        print(f"  Documents folder ID: {docs_folder_id}")
        
        images_folder_id = gdrive.create_folder("Images", main_folder_id)
        print(f"  Images folder ID: {images_folder_id}")
    except Exception as e:
        print(f"  Error creating folders: {e}")

    # Example: Upload files
    print("\n2. Uploading files:")
    try:
        # For this example, we'll create a simple text file to upload
        with open("sample.txt", "w") as f:
            f.write("This is a sample file for Google Drive upload test.")
        
        # Upload the file to the Documents folder
        file_id = gdrive.upload_file(
            file_path="sample.txt",
            file_name="Sample Document.txt",
            parent_id=docs_folder_id,
            mime_type="text/plain"
        )
        print(f"  Uploaded file ID: {file_id}")
        
        # Save the file_id for later examples
        sample_file_id = file_id
    except Exception as e:
        print(f"  Error uploading file: {e}")
        sample_file_id = None

    # Example: Search for files
    print("\n3. Searching for files:")
    try:
        # Search for text files
        query = "mimeType='text/plain' and trashed=false"
        results = gdrive.search_files(query, max_results=5)
        
        print(f"  Found {len(results)} text files:")
        for item in results:
            print(f"  - {item['name']} (ID: {item['id']})")
            
        # Search for files by name
        query = "name contains 'Sample' and trashed=false"
        results = gdrive.search_files(query, max_results=5)
        
        print(f"\n  Found {len(results)} files with 'Sample' in the name:")
        for item in results:
            print(f"  - {item['name']} (ID: {item['id']})")
    except Exception as e:
        print(f"  Error searching files: {e}")

    # Example: List folder contents
    print("\n4. Listing folder contents:")
    try:
        # List contents of the main folder
        items = gdrive.list_folder_contents(main_folder_id)
        
        print(f"  Contents of main folder (ID: {main_folder_id}):")
        for item in items:
            item_type = "Folder" if item['mimeType'] == gdrive.MIME_TYPES['folder'] else "File"
            print(f"  - [{item_type}] {item['name']} (ID: {item['id']})")
    except Exception as e:
        print(f"  Error listing folder contents: {e}")

    # Example: Download a file
    print("\n5. Downloading a file:")
    if sample_file_id:
        try:
            download_path = "downloaded_sample.txt"
            success = gdrive.download_file(sample_file_id, download_path)
            
            if success:
                print(f"  Successfully downloaded file to {download_path}")
                # Verify the contents
                with open(download_path, "r") as f:
                    content = f.read()
                print(f"  File content: {content}")
            else:
                print("  Download failed")
        except Exception as e:
            print(f"  Error downloading file: {e}")
    else:
        print("  No sample file ID available for download")

    # Example: Share a file
    print("\n6. Sharing a file:")
    if sample_file_id:
        try:
            # This is just an example - replace with a real email address to test
            email = "colleague@example.com"
            success = gdrive.share_file(sample_file_id, email, role="reader")
            
            if success:
                print(f"  Successfully shared file with {email}")
            else:
                print(f"  Failed to share file with {email}")
        except Exception as e:
            print(f"  Error sharing file: {e}")
    else:
        print("  No sample file ID available for sharing")

    # Example: Delete a file
    print("\n7. Deleting a file:")
    if sample_file_id:
        try:
            success = gdrive.delete_file(sample_file_id)
            
            if success:
                print(f"  Successfully deleted file with ID: {sample_file_id}")
            else:
                print(f"  Failed to delete file with ID: {sample_file_id}")
                
            # Clean up the local files
            try:
                if os.path.exists("sample.txt"):
                    os.remove("sample.txt")
                if os.path.exists("downloaded_sample.txt"):
                    os.remove("downloaded_sample.txt")
                print("  Cleaned up local files")
            except Exception as clean_error:
                print(f"  Error cleaning up local files: {clean_error}")
        except Exception as e:
            print(f"  Error deleting file: {e}")
    else:
        print("  No sample file ID available for deletion")

    print("\nGoogle Drive integration demonstration completed.")


if __name__ == "__main__":
    main()
