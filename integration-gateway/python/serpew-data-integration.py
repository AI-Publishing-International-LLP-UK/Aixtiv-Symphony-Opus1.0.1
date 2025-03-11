# /vls/core/q4d-lenz/professional/serpew/data-foundation/coaching2100_connector.py

import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
import json
import feedparser
import datetime
import hashlib
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, List, Any, Optional

class Coaching2100Connector:
    """
    Connector for accessing COACHING2100 Google Drive data and RSS feeds.
    
    This provides secure access to the proprietary COACHING2100 content repository,
    which contains coaching resources, career development materials, and RSS feeds.
    """
    def __init__(self):
        self.drive_service = None
        self.rss_processor = None
        self.feed_cache = {}
        self.db = None
        self.category_folders = {}
    
    async def initialize(self, credentials):
        """
        Initialize connection to COACHING2100 Google Drive and RSS feeds.
        
        Args:
            credentials: Dictionary containing authentication credentials
            
        Returns:
            Boolean indicating successful initialization
        """
        # Set up Google Drive API client
        self.credentials = service_account.Credentials.from_service_account_info(
            credentials,
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        
        self.drive_service = build('drive', 'v3', credentials=self.credentials)
        
        # Initialize RSS processor
        self.rss_processor = RSSProcessor()
        
        # Initialize Firestore connection
        if not firebase_admin._apps:
            cred = credentials.Certificate(credentials.get('firebase_credentials'))
            firebase_app = firebase_admin.initialize_app(cred, {
                'projectId': 'api-for-warp-drive'
            })
            self.db = firestore.client(app=firebase_app)
        else:
            self.db = firestore.client()
        
        # Validate connection by fetching root folder
        try:
            root_folder = self.drive_service.files().get(
                fileId=credentials.get('root_folder_id')
            ).execute()
            
            # Load category folder mapping
            await self._load_category_folders()
            
            return root_folder is not None
        except Exception as e:
            print(f"Error initializing Coaching2100Connector: {str(e)}")
            return False
    
    async def _load_category_folders(self):
        """Load category folders from Firestore configuration"""
        config_doc = self.db.collection('configurations').document('coaching2100_categories').get()
        
        if config_doc.exists:
            self.category_folders = config_doc.to_dict().get('folders', {})
        else:
            # Initialize with default categories
            self.category_folders = {
                'leadership': '',
                'career_development': '',
                'personal_growth': '',
                'team_management': '',
                'executive_coaching': ''
            }
            
            # Create configuration document
            self.db.collection('configurations').document('coaching2100_categories').set({
                'folders': self.category_folders,
                'created_at': firestore.SERVER_TIMESTAMP
            })
    
    async def fetch_coaching_materials(self, category, limit=50):
        """
        Fetch coaching materials from specified category.
        
        Args:
            category: Material category to fetch
            limit: Maximum number of items to return
            
        Returns:
            List of file metadata objects
        """
        if category not in self.category_folders:
            raise ValueError(f"Unknown category: {category}")
            
        folder_id = self.category_folders.get(category)
        if not folder_id:
            raise ValueError(f"No folder configured for category: {category}")
        
        # Query Google Drive for relevant files
        query = f"'{folder_id}' in parents and trashed = false"
        files = self.drive_service.files().list(
            q=query,
            pageSize=limit,
            fields="files(id, name, mimeType, description, createdTime, modifiedTime)"
        ).execute()
        
        # Update cache timestamps in Firestore
        batch = self.db.batch()
        for file in files.get('files', []):
            file_ref = self.db.collection('coaching2100_materials').document(file['id'])
            batch.set(file_ref, {
                'id': file['id'],
                'name': file['name'],
                'mimeType': file['mimeType'],
                'category': category,
                'createdTime': file['createdTime'],
                'modifiedTime': file['modifiedTime'],
                'accessed_at': firestore.SERVER_TIMESTAMP
            }, merge=True)
        
        batch.commit()
        
        return files.get('files', [])
    
    async def get_all_feed_ids(self):
        """Get all registered RSS feed IDs"""
        feeds_ref = self.db.collection('coaching2100_feeds')
        feeds = feeds_ref.stream()
        
        return [feed.id for feed in feeds]
    
    async def fetch_feed_content(self, feed_id):
        """
        Fetch RSS feed content by ID.
        
        Args:
            feed_id: Unique identifier for the feed
            
        Returns:
            RSS feed content
        """
        # Get feed URL from Firestore
        feed_doc = self.db.collection('coaching2100_feeds').document(feed_id).get()
        
        if not feed_doc.exists:
            raise ValueError(f"Feed not found: {feed_id}")
            
        feed_data = feed_doc.to_dict()
        feed_url = feed_data.get('url')
        
        # Check cache
        if feed_id in self.feed_cache:
            cache_entry = self.feed_cache[feed_id]
            now = datetime.datetime.now()
            cache_time = datetime.datetime.fromisoformat(cache_entry['last_updated'])
            
            # If cache is fresh (less than 30 minutes old), return cached data
            if (now - cache_time).total_seconds() < 1800:
                return cache_entry['content']
        
        # Fetch fresh feed content
        feed_content = feedparser.parse(feed_url)
        
        # Update cache
        self.feed_cache[feed_id] = {
            'last_updated': datetime.datetime.now().isoformat(),
            'content': feed_content
        }
        
        # Update access timestamp in Firestore
        self.db.collection('coaching2100_feeds').document(feed_id).update({
            'last_accessed': firestore.SERVER_TIMESTAMP
        })
        
        return feed_content
    
    async def process_rss_feeds(self, feed_ids=None):
        """
        Process all or specified RSS feeds from COACHING2100.
        
        Args:
            feed_ids: Optional list of feed IDs to process
            
        Returns:
            Dictionary mapping feed IDs to processed items
        """
        # If no feed IDs specified, process all known feeds
        if feed_ids is None:
            feed_ids = await self.get_all_feed_ids()
        
        feed_data = {}
        for feed_id in feed_ids:
            try:
                feed_content = await self.fetch_feed_content(feed_id)
                processed_items = self.rss_processor.process_feed(feed_content)
                
                feed_data[feed_id] = processed_items
                
                # Store processed items in Firestore
                await self._store_feed_items(feed_id, processed_items)
                
                # Update cache
                self.feed_cache[feed_id] = {
                    'last_updated': datetime.datetime.now().isoformat(),
                    'items': processed_items
                }
            except Exception as e:
                print(f"Error processing feed {feed_id}: {str(e)}")
                feed_data[feed_id] = {"error": str(e)}
        
        return feed_data
    
    async def _store_feed_items(self, feed_id, items):
        """Store processed feed items in Firestore"""
        batch = self.db.batch()
        
        for item in items:
            # Create stable ID based on item link or title
            if 'link' in item:
                item_id = hashlib.md5(item['link'].encode()).hexdigest()
            else:
                item_id = hashlib.md5(item['title'].encode()).hexdigest()
            
            # Add feed ID to item data
            item['feed_id'] = feed_id
            item['processed_at'] = firestore.SERVER_TIMESTAMP
            
            # Add to batch
            item_ref = self.db.collection('coaching2100_feed_items').document(item_id)
            batch.set(item_ref, item, merge=True)
        
        # Commit the batch
        batch.commit()
    
    async def download_file(self, file_id):
        """
        Download a file from Google Drive.
        
        Args:
            file_id: Google Drive file ID
            
        Returns:
            File content as bytes
        """
        request = self.drive_service.files().get_media(fileId=file_id)
        
        file_io = io.BytesIO()
        downloader = MediaIoBaseDownload(file_io, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        # Record download in Firestore
        self.db.collection('coaching2100_downloads').add({
            'file_id': file_id,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return file_io.getvalue()


class RSSProcessor:
    """Utility class for processing RSS feeds"""
    
    def process_feed(self, feed_content):
        """
        Process RSS feed content into standardized format.
        
        Args:
            feed_content: Raw feedparser content
            
        Returns:
            List of standardized feed items
        """
        processed_items = []
        
        for entry in feed_content.entries:
            # Extract content
            content = ""
            if 'content' in entry:
                content = entry.content[0].value
            elif 'summary' in entry:
                content = entry.summary
            
            # Create standardized item
            item = {
                'title': entry.get('title', ''),
                'link': entry.get('link', ''),
                'published': entry.get('published', ''),
                'author': entry.get('author', ''),
                'content': content,
                'categories': entry.get('categories', [])
            }
            
            processed_items.append(item)
        
        return processed_items


# /vls/core/q4d-lenz/professional/serpew/data-foundation/sector_standards_database.py

class SectorStandardsDatabase:
    """
    Provides access to national and international sector standards databases.
    
    This connector manages access to standardized sector information, regulatory
    requirements, and best practices across various industries and jurisdictions.
    """
    def __init__(self):
        self.db_connection = None
        self.standards_cache = {}
        self.sectors_hierarchy = {}
    
    async def initialize(self, credentials):
        """
        Initialize connection to sector standards databases.
        
        Args:
            credentials: Dictionary containing database credentials
            
        Returns:
            Boolean indicating successful initialization
        """
        try:
            # Use your database connector of choice (e.g., SQLAlchemy, aiohttp, etc.)
            # This is a simplified example
            self.db_connection = await create_database_connection(
                credentials.get('connection_string'),
                credentials.get('username'),
                credentials.get('password')
            )
            
            # Load sector hierarchy for navigating standards
            self.sectors_hierarchy = await self.load_sector_hierarchy()
            
            return self.db_connection is not None
        except Exception as e:
            print(f"Error initializing SectorStandardsDatabase: {str(e)}")
            return False
    
    async def load_sector_hierarchy(self):
        """
        Load the hierarchical relationship between sectors and subsectors.
        
        Returns:
            Dictionary representing sector hierarchy
        """
        query = """
        SELECT sector_id, sector_name, parent_sector_id, sector_level, 
               sector_code, jurisdiction
        FROM sector_hierarchy
        ORDER BY sector_level, sector_name
        """
        result = await self.db_connection.execute(query)
        rows = await result.fetchall()
        
        # Organize into hierarchical structure
        hierarchy = {}
        for row in rows:
            sector_id = row['sector_id']
            hierarchy[sector_id] = {
                'name': row['sector_name'],
                'parent_id': row['parent_sector_id'],
                'level': row['sector_level'],
                'code': row['sector_code'],
                'jurisdiction': row['jurisdiction'],
                'children': []
            }
        
        # Build parent-child relationships
        for sector_id, sector in hierarchy.items():
            parent_id = sector['parent_id']
            if parent_id and parent_id in hierarchy:
                hierarchy[parent_id]['children'].append(sector_id)
        
        return hierarchy
    
    async def get_standards_for_sector(self, sector_id, jurisdiction=None):
        """
        Retrieve standards for a specific sector, optionally filtered by jurisdiction.
        
        Args:
            sector_id: Unique identifier for the sector
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            List of standards for the specified sector
        """
        # Check cache first
        cache_key = f"{sector_id}:{jurisdiction or 'all'}"
        if cache_key in self.standards_cache:
            return self.standards_cache[cache_key]
        
        # Build query
        query = """
        SELECT standard_id, standard_name, standard_code, description,
               certification_requirements, skill_requirements, standard_level,
               jurisdiction, effective_date, expiry_date
        FROM sector_standards
        WHERE sector_id = :sector_id
        """
        params = {'sector_id': sector_id}
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
        
        # Execute query
        result = await self.db_connection.execute(query, params)
        standards = await result.fetchall()
        
        # Format and cache results
        formatted_standards = [dict(standard) for standard in standards]
        self.standards_cache[cache_key] = formatted_standards
        
        return formatted_standards
    
    async def search_sectors(self, search_term, jurisdiction=None):
        """
        Search for sectors matching the search term.
        
        Args:
            search_term: Term to search for
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            List of matching sectors
        """
        query = """
        SELECT sector_id, sector_name, sector_code, sector_level, jurisdiction
        FROM sector_hierarchy
        WHERE sector_name LIKE :search_pattern
        """
        params = {'search_pattern': f"%{search_term}%"}
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
        
        result = await self.db_connection.execute(query, params)
        sectors = await result.fetchall()
        
        return [dict(sector) for sector in sectors]
    
    async def get_compliance_requirements(self, sector_id, jurisdiction=None):
        """
        Get compliance requirements for a specific sector and jurisdiction.
        
        Args:
            sector_id: Unique identifier for the sector
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            List of compliance requirements
        """
        query = """
        SELECT requirement_id, requirement_name, description, requirement_type,
               regulatory_authority, compliance_deadline, penalty_for_non_compliance
        FROM compliance_requirements
        WHERE sector_id = :sector_id
        """
        params = {'sector_id': sector_id}
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
        
        result = await self.db_connection.execute(query, params)
        requirements = await result.fetchall()
        
        return [dict(req) for req in requirements]


# /vls/core/q4d-lenz/professional/serpew/data-foundation/job_definitions_database.py

class JobDefinitionsDatabase:
    """
    Provides access to national and international job dictionaries and definitions.
    
    This connector manages access to standardized job information, including
    skill requirements, career paths, and classification codes.
    """
    def __init__(self):
        self.job_db = None
        self.definitions_cache = {}
    
    async def initialize(self, credentials):
        """
        Initialize connection to job definitions database.
        
        Args:
            credentials: Dictionary containing database credentials
            
        Returns:
            Boolean indicating successful initialization
        """
        try:
            # Connect to database
            self.job_db = await create_database_connection(
                credentials.get('job_db_connection'),
                credentials.get('job_db_username'),
                credentials.get('job_db_password')
            )
            
            return self.job_db is not None
        except Exception as e:
            print(f"Error initializing JobDefinitionsDatabase: {str(e)}")
            return False
    
    async def get_job_definition(self, job_code, jurisdiction=None):
        """
        Retrieve standardized job definition from national/international dictionaries.
        
        Args:
            job_code: Standard job code
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            Dictionary containing job definition
        """
        # Check cache first
        cache_key = f"{job_code}:{jurisdiction or 'all'}"
        if cache_key in self.definitions_cache:
            return self.definitions_cache[cache_key]
        
        # Build query
        query = """
        SELECT job_code, job_title, description, required_skills, 
               required_education, typical_experience, career_path, sector_id,
               jurisdiction, holland_code, o_net_code, isco_code, job_family
        FROM job_definitions
        WHERE job_code = :job_code
        """
        params = {'job_code': job_code}
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
        
        # Execute query
        result = await self.job_db.execute(query, params)
        job = await result.fetchone()
        
        if not job:
            return None
        
        # Convert to dictionary and enhance with additional data
        job_dict = dict(job)
        
        # Add research findings
        job_dict['research_findings'] = await self.get_research_for_job(job_code)
        
        # Add satisfaction metrics
        job_dict['satisfaction_metrics'] = await self.get_satisfaction_metrics(job_code, jurisdiction)
        
        # Cache the result
        self.definitions_cache[cache_key] = job_dict
        
        return job_dict
    
    async def search_jobs(self, search_term, jurisdiction=None):
        """
        Search for jobs matching the search term.
        
        Args:
            search_term: Term to search for
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            List of matching job definitions
        """
        query = """
        SELECT job_code, job_title, jurisdiction, sector_id
        FROM job_definitions
        WHERE job_title LIKE :search_pattern OR description LIKE :search_pattern
        """
        params = {'search_pattern': f"%{search_term}%"}
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
        
        result = await self.job_db.execute(query, params)
        jobs = await result.fetchall()
        
        return [dict(job) for job in jobs]
    
    async def get_research_for_job(self, job_code):
        """
        Retrieve historical research related to this job and personality factors.
        
        Args:
            job_code: Standard job code
            
        Returns:
            List of research studies related to the job
        """
        query = """
        SELECT study_id, study_title, publication_year, authors, methodology,
               key_findings, sample_size, personality_factors, correlation_strength
        FROM personality_career_research
        WHERE related_job_codes LIKE :job_pattern
        ORDER BY publication_year DESC
        """
        params = {'job_pattern': f'%{job_code}%'}
        
        result = await self.job_db.execute(query, params)
        studies = await result.fetchall()
        
        return [dict(study) for study in studies]
    
    async def get_satisfaction_metrics(self, job_code, jurisdiction=None):
        """
        Retrieve satisfaction metrics for a specific job role.
        
        Args:
            job_code: Standard job code
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            List of satisfaction metrics over time
        """
        query = """
        SELECT metric_year, overall_satisfaction, autonomy_satisfaction,
               compensation_satisfaction, work_life_balance, growth_opportunities,
               job_security, peer_relationships, management_quality, sample_size,
               jurisdiction, measurement_methodology
        FROM career_satisfaction_metrics
        WHERE job_code = :job_code
        """
        params = {'job_code': job_code}
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
        
        query += " ORDER BY metric_year DESC"
        
        result = await self.job_db.execute(query, params)
        metrics = await result.fetchall()
        
        return [dict(metric) for metric in metrics]
    
    async def get_career_path(self, job_code, jurisdiction=None):
        """
        Get standard career path for a job code.
        
        Args:
            job_code: Standard job code
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            Dictionary with previous and next career steps
        """
        query = """
        SELECT previous_roles, next_roles, lateral_moves, 
               typical_progression_timeline
        FROM career_paths
        WHERE job_code = :job_code
        """
        params = {'job_code': job_code}
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
        
        result = await self.job_db.execute(query, params)
        path = await result.fetchone()
        
        if not path:
            return None
            
        return dict(path)


# /vls/core/q4d-lenz/professional/serpew/data-foundation/personality_studies_archive.py

class PersonalityStudiesArchive:
    """
    Provides access to 100+ years of research related to personality and career choice.
    
    This connector manages access to historical research on personality assessments,
    career satisfaction correlations, and vocational psychology studies.
    """
    def __init__(self):
        self.research_db = None
        self.studies_cache = {}
    
    async def initialize(self, credentials):
        """
        Initialize connection to personality studies archive.
        
        Args:
            credentials: Dictionary containing database credentials
            
        Returns:
            Boolean indicating successful initialization
        """
        try:
            # Connect to research database
            self.research_db = await create_database_connection(
                credentials.get('research_db_connection'),
                credentials.get('research_db_username'),
                credentials.get('research_db_password')
            )
            
            return self.research_db is not None
        except Exception as e:
            print(f"Error initializing PersonalityStudiesArchive: {str(e)}")
            return False
    
    async def search_studies(self, search_terms, start_year=None, end_year=None, limit=50):
        """
        Search for studies matching the search terms.
        
        Args:
            search_terms: List of terms to search for
            start_year: Optional start year filter
            end_year: Optional end year filter
            limit: Maximum number of results to return
            
        Returns:
            List of matching studies
        """
        # Construct search conditions
        search_condition = " OR ".join([
            f"study_title LIKE '%{term}%'" for term in search_terms
        ])
        
        query = f"""
        SELECT study_id, study_title, publication_year, authors, methodology,
               abstract, key_findings, sample_size, personality_factors
        FROM personality_career_studies
        WHERE ({search_condition})
        """
        
        params = {}
        
        # Add year range if provided
        if start_year:
            query += " AND publication_year >= :start_year"
            params['start_year'] = start_year
            
        if end_year:
            query += " AND publication_year <= :end_year"
            params['end_year'] = end_year
            
        # Add limit
        query += f" ORDER BY publication_year DESC LIMIT {limit}"
        
        result = await self.research_db.execute(query, params)
        studies = await result.fetchall()
        
        return [dict(study) for study in studies]
    
    async def get_study_details(self, study_id):
        """
        Get detailed information about a specific study.
        
        Args:
            study_id: Unique identifier for the study
            
        Returns:
            Dictionary containing study details
        """
        # Check cache first
        if study_id in self.studies_cache:
            return self.studies_cache[study_id]
        
        query = """
        SELECT s.*, 
               GROUP_CONCAT(DISTINCT f.finding_text) AS findings,
               GROUP_CONCAT(DISTINCT m.measurement_name) AS measurements
        FROM personality_career_studies s
        LEFT JOIN study_findings f ON s.study_id = f.study_id
        LEFT JOIN study_measurements m ON s.study_id = m.study_id
        WHERE s.study_id = :study_id
        GROUP BY s.study_id
        """
        
        result = await self.research_db.execute(query, {'study_id': study_id})
        study = await result.fetchone()
        
        if not study:
            return None
            
        study_dict = dict(study)
        
        # Format concatenated fields
        if study_dict.get('findings'):
            study_dict['findings'] = study_dict['findings'].split(',')
            
        if study_dict.get('measurements'):
            study_dict['measurements'] = study_dict['measurements'].split(',')
        
        # Cache the result
        self.studies_cache[study_id] = study_dict
        
        return study_dict
    
    async def get_correlations_by_factor(self, personality_factor, job_family=None):
        """
        Get correlations between a personality factor and job satisfaction.
        
        Args:
            personality_factor: Personality factor to analyze
            job_family: Optional job family filter
            
        Returns:
            Dictionary containing correlation data
        """
        query = """
        SELECT job_family, AVG(correlation_coefficient) as avg_correlation,
               COUNT(*) as study_count
        FROM personality_job_correlations
        WHERE personality_factor = :personality_factor
        """
        
        params = {'personality_factor': personality_factor}
        
        if job_family:
            query += " AND job_family = :job_family"
            params['job_family'] = job_family
            
        query += " GROUP BY job_family ORDER BY avg_correlation DESC"
        
        result = await self.research_db.execute(query, params)
        correlations = await result.fetchall()
        
        return [dict(corr) for corr in correlations]


# /vls/core/q4d-lenz/professional/serpew/data-foundation/career_satisfaction_metrics.py

class CareerSatisfactionMetrics:
    """
    Provides access to career choice satisfaction measures by national standards.
    
    This connector manages access to standardized metrics for job satisfaction,
    career fulfillment, and workplace happiness across various roles and jurisdictions.
    """
    def __init__(self):
        self.satisfaction_db = None
        self.metrics_cache = {}
    
    async def initialize(self, credentials):
        """
        Initialize connection to career satisfaction metrics database.
        
        Args:
            credentials: Dictionary containing database credentials
            
        Returns:
            Boolean indicating successful initialization
        """
        try:
            # Connect to satisfaction metrics database
            self.satisfaction_db = await create_database_connection(
                credentials.get('satisfaction_db_connection'),
                credentials.get('satisfaction_db_username'),
                credentials.get('satisfaction_db_password')
            )
            
            return self.satisfaction_db is not None
        except Exception as e:
            print(f"Error initializing CareerSatisfactionMetrics: {str(e)}")
            return False
    
    async def get_satisfaction_trends(self, job_code, jurisdiction=None, years=10):
        """
        Get satisfaction trends for a specific job over time.
        
        Args:
            job_code: Standard job code
            jurisdiction: Optional jurisdiction filter
            years: Number of years to include in trend
            
        Returns:
            List of satisfaction metrics over the specified period
        """
        # Calculate start year
        current_year = datetime.datetime.now().year
        start_year = current_year - years
        
        query = """
        SELECT metric_year, overall_satisfaction, autonomy_satisfaction,
               compensation_satisfaction, work_life_balance, growth_opportunities,
               job_security, peer_relationships, management_quality
        FROM career_satisfaction_metrics
        WHERE job_code = :job_code AND metric_year >= :start_year
        """
        
        params = {
            'job_code': job_code,
            'start_year': start_year
        }
        
        if jurisdiction:
            query += " AND jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
            
        query += " ORDER BY metric_year ASC"
        
        result = await self.satisfaction_db.execute(query, params)
        metrics = await result.fetchall()
        
        return [dict(metric) for metric in metrics]
    
    async def compare_satisfaction_across_jobs(self, job_codes, jurisdiction=None):
        """
        Compare satisfaction metrics across multiple jobs.
        
        Args:
            job_codes: List of job codes to compare
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            Dictionary mapping job codes to satisfaction metrics
        """
        if not job_codes:
            return {}
            
        # Build query with dynamic IN clause
        placeholders = ', '.join(['?'] * len(job_codes))
        query = f"""
        SELECT job_code, job_title, AVG(overall_satisfaction) as avg_satisfaction,
               AVG(compensation_satisfaction) as avg_compensation_satisfaction,
               AVG(work_life_balance) as avg_work_life_balance,
               AVG(growth_opportunities) as avg_growth_opportunities,
               COUNT(*) as measurement_count
        FROM career_satisfaction_metrics
        JOIN job_definitions USING (job_code)
        WHERE job_code IN ({placeholders})
        """
        
        params = job_codes.copy()
        
        if jurisdiction:
            query += " AND jurisdiction = ?"
            params.append(jurisdiction)
            
        query += " GROUP BY job_code, job_title"
        
        result = await self.satisfaction_db.execute(query, params)
        comparisons = await result.fetchall()
        
        return {comp['job_code']: dict(comp) for comp in comparisons}
    
    async def get_satisfaction_by_personality(self, holland_code, jurisdiction=None):
        """
        Get satisfaction metrics filtered by Holland Code.
        
        Args:
            holland_code: Six-letter Holland Code
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            List of jobs with highest satisfaction for the given Holland Code
        """
        # Parse Holland Code to get top two letters
        primary = holland_code[0:1]
        secondary = holland_code[1:2]
        
        query = """
        SELECT m.job_code, j.job_title, AVG(m.overall_satisfaction) as avg_satisfaction,
               j.holland_code, COUNT(*) as measurement_count
        FROM career_satisfaction_metrics m
        JOIN job_definitions j USING (job_code)
        WHERE j.holland_code LIKE :primary_pattern
        OR j.holland_code LIKE :secondary_pattern
        """
        
        params = {
            'primary_pattern': f'{primary}%',
            'secondary_pattern': f'%{secondary}%'
        }
        
        if jurisdiction:
            query += " AND m.jurisdiction = :jurisdiction"
            params['jurisdiction'] = jurisdiction
            
        query += " GROUP BY m.job_code, j.job_title ORDER BY avg_satisfaction DESC LIMIT 20"
        
        result = await self.satisfaction_db.execute(query, params)
        jobs = await result.fetchall()
        
        return [dict(job) for job in jobs]


# Helper function for database connections

async def create_database_connection(connection_string, username, password):
    """
    Create a database connection.
    
    This is a placeholder implementation - replace with your actual database connector.
    
    Args:
        connection_string: Database connection string
        username: Database username
        password: Database password
        
    Returns:
        Database connection object
    """
    # This is a simplified placeholder - implement with actual database library
    # For example, with aiosqlite, asyncpg, aiomysql, etc.
    
    # Example with asyncpg (PostgreSQL):
    # import asyncpg
    # return await asyncpg.connect(
    #     host=connection_string,
    #     user=username,
    #     password=password,
    #     database='career_database'
    # )
    
    # For demonstration, return a mock connection object
    class MockConnection:
        async def execute(self, query, params=None):
            class MockResult:
                async def fetchall(self):
                    return []
                    
                async def fetchone(self):
                    return None
                    
            return MockResult()
            
    return MockConnection()
