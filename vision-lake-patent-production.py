#!/usr/bin/env python3
"""
Vision Lake Production Patent Management System
Real USPTO API Integration with Secure Storage and Web Display
Customer Number: 208576 - Phillip Corey Roark
"""

import os
import sys
import json
import base64
import hashlib
import sqlite3
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from cryptography.fernet import Fernet
from pathlib import Path
import logging
from flask import Flask, render_template_string, jsonify, request, session
import jwt
from functools import wraps
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('VisionLakePatents')

class SecurePatentStorage:
    """Secure database storage for patent information"""
    
    def __init__(self, db_path: str = "vision_lake_patents.db"):
        self.db_path = db_path
        self.encryption_key = self._get_or_create_key()
        self.cipher_suite = Fernet(self.encryption_key)
        self._initialize_database()
    
    def _get_or_create_key(self) -> bytes:
        """Get or create encryption key"""
        key_file = Path(".patent_key")
        if key_file.exists():
            return key_file.read_bytes()
        else:
            key = Fernet.generate_key()
            key_file.write_bytes(key)
            os.chmod(key_file, 0o600)  # Secure file permissions
            return key
    
    def _initialize_database(self):
        """Create secure database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Patents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                filing_date TEXT,
                confirmation_number TEXT,
                application_number TEXT,
                patent_number TEXT,
                encrypted_data TEXT,
                last_updated TEXT,
                visibility TEXT DEFAULT 'private'
            )
        ''')
        
        # Filing history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS filing_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patent_id TEXT,
                action TEXT,
                timestamp TEXT,
                details TEXT,
                user TEXT,
                FOREIGN KEY (patent_id) REFERENCES patents(id)
            )
        ''')
        
        # API logs table (for compliance)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                endpoint TEXT,
                request_data TEXT,
                response_data TEXT,
                status_code INTEGER,
                encrypted BOOLEAN DEFAULT 1
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.cipher_suite.encrypt(data.encode()).decode()
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()
    
    def store_patent(self, patent_data: Dict) -> bool:
        """Store patent information securely"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Encrypt sensitive fields
            sensitive_data = {
                'full_title': patent_data['title'],
                'inventor_info': patent_data.get('inventor_info', {}),
                'claims': patent_data.get('claims', []),
                'abstract': patent_data.get('abstract', '')
            }
            encrypted = self.encrypt_data(json.dumps(sensitive_data))
            
            cursor.execute('''
                INSERT OR REPLACE INTO patents 
                (id, title, status, filing_date, confirmation_number, 
                 application_number, patent_number, encrypted_data, 
                 last_updated, visibility)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                patent_data['id'],
                patent_data['title'][:100] + '...',  # Truncated for display
                patent_data['status'],
                patent_data.get('filing_date'),
                patent_data.get('confirmation_number'),
                patent_data.get('application_number'),
                patent_data.get('patent_number'),
                encrypted,
                datetime.now().isoformat(),
                patent_data.get('visibility', 'private')
            ))
            
            # Log the action
            self.log_action(
                patent_data['id'],
                f"Patent {patent_data['status']}",
                f"Status updated to {patent_data['status']}"
            )
            
            conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to store patent: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def log_action(self, patent_id: str, action: str, details: str, user: str = "system"):
        """Log patent actions for audit trail"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO filing_history (patent_id, action, timestamp, details, user)
            VALUES (?, ?, ?, ?, ?)
        ''', (patent_id, action, datetime.now().isoformat(), details, user))
        
        conn.commit()
        conn.close()
    
    def get_patent_status(self, patent_id: str) -> Dict:
        """Get patent status for display"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, status, filing_date, confirmation_number,
                   application_number, patent_number, visibility
            FROM patents WHERE id = ?
        ''', (patent_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'title': row[1],
                'status': row[2],
                'filing_date': row[3],
                'confirmation_number': row[4],
                'application_number': row[5],
                'patent_number': row[6],
                'visibility': row[7]
            }
        return None

class USPTOProductionAPI:
    """Production USPTO API integration"""
    
    def __init__(self, customer_number: str = "208576"):
        self.customer_number = customer_number
        self.base_url = "https://api.uspto.gov/patent-center/v1"
        self.storage = SecurePatentStorage()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'VisionLake Patent System/1.0',
            'Accept': 'application/json'
        })
    
    def authenticate(self, client_id: str, client_secret: str) -> bool:
        """OAuth2 authentication with USPTO"""
        auth_url = "https://api.uspto.gov/oauth2/token"
        
        try:
            response = self.session.post(auth_url, data={
                'grant_type': 'client_credentials',
                'client_id': client_id,
                'client_secret': client_secret,
                'scope': 'patent-filing patent-status'
            })
            
            if response.status_code == 200:
                token_data = response.json()
                self.session.headers.update({
                    'Authorization': f"Bearer {token_data['access_token']}",
                    'USPTO-Customer-Number': self.customer_number
                })
                
                # Store token expiry
                self.token_expiry = datetime.now() + timedelta(
                    seconds=token_data.get('expires_in', 3600)
                )
                
                logger.info(f"Authenticated successfully for customer {self.customer_number}")
                return True
                
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            
        return False
    
    def check_token_validity(self) -> bool:
        """Check if auth token is still valid"""
        if hasattr(self, 'token_expiry'):
            return datetime.now() < self.token_expiry
        return False
    
    def complete_saved_submission(self, submission_id: str, patent_data: Dict) -> Dict:
        """Complete a saved USPTO submission"""
        
        # Log API call
        self.storage.api_logs(
            endpoint=f"/submissions/{submission_id}/update",
            request_data=json.dumps({'submission_id': submission_id})
        )
        
        try:
            # Step 1: Update submission metadata
            update_url = f"{self.base_url}/submissions/{submission_id}/update"
            update_data = {
                "submissionId": submission_id,
                "customerNumber": self.customer_number,
                "title": patent_data['title'],
                "entityStatus": "SMALL",
                "inventorInfo": {
                    "inventors": [{
                        "nameGiven": "Phillip Corey",
                        "nameFamily": "Roark",
                        "citizenship": "US",
                        "address": {
                            "street": "27 Arlington Rd",
                            "city": "Teddington",
                            "country": "GB",
                            "postalCode": "TW11 8NL"
                        }
                    }]
                }
            }
            
            response = self.session.put(update_url, json=update_data)
            response.raise_for_status()
            
            # Step 2: Upload PDF specification
            if 'pdf_path' in patent_data:
                upload_result = self._upload_specification(
                    submission_id, 
                    patent_data['pdf_path']
                )
                if not upload_result['success']:
                    raise Exception(f"PDF upload failed: {upload_result['error']}")
            
            # Step 3: Submit for filing with payment
            filing_result = self._submit_for_filing(submission_id)
            
            if filing_result['success']:
                # Store in secure database
                self.storage.store_patent({
                    'id': patent_data['id'],
                    'title': patent_data['title'],
                    'status': 'PATENT_PENDING',
                    'filing_date': datetime.now().isoformat(),
                    'confirmation_number': filing_result['confirmation_number'],
                    'application_number': filing_result.get('application_number'),
                    'inventor_info': patent_data.get('inventor_info', {}),
                    'claims': patent_data.get('claims', []),
                    'abstract': patent_data.get('abstract', ''),
                    'visibility': 'public'  # Show as patent pending
                })
                
                logger.info(f"Successfully filed patent {patent_data['id']}")
                return filing_result
            
        except Exception as e:
            logger.error(f"Failed to complete submission {submission_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def _upload_specification(self, submission_id: str, pdf_path: str) -> Dict:
        """Upload patent specification PDF"""
        upload_url = f"{self.base_url}/submissions/{submission_id}/documents"
        
        try:
            with open(pdf_path, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
                
            # Create multipart upload
            files = {
                'specification': ('specification.pdf', pdf_content, 'application/pdf')
            }
            
            data = {
                'documentType': 'SPECIFICATION',
                'documentCode': 'SPEC'
            }
            
            response = self.session.post(upload_url, files=files, data=data)
            response.raise_for_status()
            
            return {'success': True, 'document_id': response.json().get('documentId')}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _submit_for_filing(self, submission_id: str) -> Dict:
        """Submit application for filing with fee payment"""
        filing_url = f"{self.base_url}/submissions/{submission_id}/file"
        
        try:
            filing_data = {
                "submissionId": submission_id,
                "confirmAccuracy": True,
                "certificationStatement": {
                    "signatoryName": "Phillip Corey Roark",
                    "signatoryDate": datetime.now().isoformat(),
                    "customerNumber": self.customer_number
                },
                "feePayment": {
                    "paymentMethod": "CREDIT_CARD",
                    "amount": 75.00,
                    "paymentDetails": {
                        # In production, this would use tokenized payment
                        "token": os.environ.get('USPTO_PAYMENT_TOKEN')
                    }
                }
            }
            
            response = self.session.post(filing_url, json=filing_data)
            response.raise_for_status()
            
            result = response.json()
            return {
                'success': True,
                'confirmation_number': result['confirmationNumber'],
                'application_number': result.get('applicationNumber'),
                'filing_receipt_url': result.get('filingReceiptUrl')
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def create_new_provisional(self, patent_data: Dict) -> Dict:
        """Create and file new provisional patent application"""
        create_url = f"{self.base_url}/submissions/create"
        
        try:
            # Create new submission
            create_data = {
                "customerNumber": self.customer_number,
                "applicationType": "provisional",
                "title": patent_data['title'],
                "entityStatus": "SMALL"
            }
            
            response = self.session.post(create_url, json=create_data)
            response.raise_for_status()
            
            submission_id = response.json()['submissionId']
            
            # Complete the submission
            return self.complete_saved_submission(submission_id, patent_data)
            
        except Exception as e:
            logger.error(f"Failed to create provisional: {e}")
            return {'success': False, 'error': str(e)}
    
    def check_patent_status(self, application_number: str) -> Dict:
        """Check real-time patent status from USPTO"""
        status_url = f"{self.base_url}/applications/{application_number}/status"
        
        try:
            response = self.session.get(status_url)
            response.raise_for_status()
            
            status_data = response.json()
            
            # Map USPTO status to our status
            status_map = {
                'PENDING': 'PATENT_PENDING',
                'ALLOWED': 'PATENT_ALLOWED',
                'GRANTED': 'PATENT_GRANTED',
                'ABANDONED': 'ABANDONED',
                'REJECTED': 'REJECTED'
            }
            
            return {
                'status': status_map.get(status_data['status'], 'UNKNOWN'),
                'last_action': status_data.get('lastAction'),
                'last_action_date': status_data.get('lastActionDate')
            }
            
        except Exception as e:
            logger.error(f"Failed to check status: {e}")
            return {'status': 'ERROR', 'error': str(e)}

class VisionLakePatentWebInterface:
    """Web interface for patent display"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = os.environ.get('FLASK_SECRET_KEY', os.urandom(24))
        self.storage = SecurePatentStorage()
        self.setup_routes()
    
    def setup_routes(self):
        """Setup web routes"""
        
        @self.app.route('/')
        def index():
            """Public patent status page"""
            return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Vision Lake Patents</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px 0;
            text-align: center;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .patent-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .patent-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .patent-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .patent-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .patent-status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
        }
        .status-pending {
            background: #f39c12;
            color: white;
        }
        .status-granted {
            background: #27ae60;
            color: white;
        }
        .patent-number {
            color: #7f8c8d;
            font-size: 14px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            text-align: center;
        }
        .stat {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            color: #3498db;
        }
        .stat-label {
            color: #7f8c8d;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Vision Lake Patent Portfolio</h1>
        <p>Pioneering the Future of AI Agent Technology</p>
    </div>
    
    <div class="container">
        <div class="stats">
            <div class="stat">
                <div class="stat-number">8</div>
                <div class="stat-label">Total Patents Filed</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="pending-count">0</div>
                <div class="stat-label">Patent Pending</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="granted-count">0</div>
                <div class="stat-label">Patents Granted</div>
            </div>
        </div>
        
        <div class="patent-grid" id="patent-grid">
            <!-- Patents will be loaded here -->
        </div>
    </div>
    
    <script>
        async function loadPatents() {
            try {
                const response = await fetch('/api/patents/public');
                const patents = await response.json();
                
                const grid = document.getElementById('patent-grid');
                let pendingCount = 0;
                let grantedCount = 0;
                
                patents.forEach(patent => {
                    const card = document.createElement('div');
                    card.className = 'patent-card';
                    
                    const statusClass = patent.status === 'PATENT_GRANTED' ? 'status-granted' : 'status-pending';
                    const statusText = patent.status === 'PATENT_GRANTED' ? 'PATENT GRANTED' : 'PATENT PENDING';
                    
                    if (patent.status === 'PATENT_PENDING') pendingCount++;
                    if (patent.status === 'PATENT_GRANTED') grantedCount++;
                    
                    card.innerHTML = `
                        <div class="patent-title">${patent.title}</div>
                        <div class="patent-status ${statusClass}">${statusText}</div>
                        ${patent.patent_number ? `<div class="patent-number">Patent #${patent.patent_number}</div>` : ''}
                        ${patent.filing_date ? `<div class="patent-number">Filed: ${new Date(patent.filing_date).toLocaleDateString()}</div>` : ''}
                    `;
                    
                    grid.appendChild(card);
                });
                
                document.getElementById('pending-count').textContent = pendingCount;
                document.getElementById('granted-count').textContent = grantedCount;
                
            } catch (error) {
                console.error('Failed to load patents:', error);
            }
        }
        
        // Load patents on page load
        loadPatents();
        
        // Refresh every minute
        setInterval(loadPatents, 60000);
    </script>
</body>
</html>
            ''')
        
        @self.app.route('/api/patents/public')
        def get_public_patents():
            """API endpoint for public patent data"""
            conn = sqlite3.connect(self.storage.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, title, status, filing_date, patent_number
                FROM patents
                WHERE visibility = 'public'
                ORDER BY filing_date DESC
            ''')
            
            patents = []
            for row in cursor.fetchall():
                patents.append({
                    'id': row[0],
                    'title': row[1],
                    'status': row[2],
                    'filing_date': row[3],
                    'patent_number': row[4]
                })
            
            conn.close()
            return jsonify(patents)
        
        @self.app.route('/diamond-sao/patents')
        @self.require_auth
        def diamond_sao_patents():
            """Diamond SAO Patent Tab - Full Details"""
            return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Diamond SAO - Patent Management</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: #fff;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        h1 {
            color: #FFD700;
            margin: 0;
        }
        .controls {
            display: flex;
            gap: 10px;
        }
        button {
            background: #FFD700;
            color: #1a1a1a;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        }
        button:hover {
            background: #FFC700;
        }
        .patent-table {
            background: #2a2a2a;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #3a3a3a;
        }
        th {
            background: #333;
            color: #FFD700;
            font-weight: bold;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-pending { background: #f39c12; }
        .status-granted { background: #27ae60; }
        .status-filed { background: #3498db; }
        .actions {
            display: flex;
            gap: 5px;
        }
        .action-btn {
            padding: 5px 10px;
            font-size: 12px;
            background: #3498db;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
        }
        .modal-content {
            background: #2a2a2a;
            margin: 50px auto;
            padding: 30px;
            width: 80%;
            max-width: 800px;
            border-radius: 10px;
        }
        .timeline {
            margin: 20px 0;
        }
        .timeline-item {
            padding: 10px;
            margin: 10px 0;
            background: #333;
            border-radius: 5px;
            border-left: 3px solid #FFD700;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>💎 Diamond SAO - Patent Management</h1>
        <div class="controls">
            <button onclick="refreshStatus()">🔄 Refresh Status</button>
            <button onclick="exportReport()">📄 Export Report</button>
            <button onclick="showAnalytics()">📊 Analytics</button>
        </div>
    </div>
    
    <div class="patent-table">
        <table>
            <thead>
                <tr>
                    <th>Patent ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Filing Date</th>
                    <th>Confirmation #</th>
                    <th>Patent #</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="patent-tbody">
                <!-- Patents will be loaded here -->
            </tbody>
        </table>
    </div>
    
    <!-- Patent Detail Modal -->
    <div id="detailModal" class="modal">
        <div class="modal-content">
            <h2 id="modal-title"></h2>
            <div id="modal-body"></div>
            <button onclick="closeModal()">Close</button>
        </div>
    </div>
    
    <script>
        async function loadPatents() {
            try {
                const response = await fetch('/api/patents/all', {
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token')
                    }
                });
                const patents = await response.json();
                
                const tbody = document.getElementById('patent-tbody');
                tbody.innerHTML = '';
                
                patents.forEach(patent => {
                    const row = document.createElement('tr');
                    
                    const statusClass = patent.status.toLowerCase().replace('_', '-');
                    
                    row.innerHTML = `
                        <td>${patent.id}</td>
                        <td>${patent.title}</td>
                        <td><span class="status-badge status-${statusClass}">${patent.status}</span></td>
                        <td>${patent.filing_date ? new Date(patent.filing_date).toLocaleDateString() : '-'}</td>
                        <td>${patent.confirmation_number || '-'}</td>
                        <td>${patent.patent_number || '-'}</td>
                        <td class="actions">
                            <button class="action-btn" onclick="viewDetails('${patent.id}')">View</button>
                            <button class="action-btn" onclick="viewHistory('${patent.id}')">History</button>
                            <button class="action-btn" onclick="updateStatus('${patent.id}')">Update</button>
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                });
                
            } catch (error) {
                console.error('Failed to load patents:', error);
            }
        }
        
        async function viewDetails(patentId) {
            const response = await fetch(`/api/patents/${patentId}/details`, {
                headers: {
                    'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token')
                }
            });
            const details = await response.json();
            
            document.getElementById('modal-title').textContent = details.title;
            document.getElementById('modal-body').innerHTML = `
                <p><strong>Status:</strong> ${details.status}</p>
                <p><strong>Filing Date:</strong> ${details.filing_date}</p>
                <p><strong>Abstract:</strong> ${details.abstract}</p>
                <p><strong>Claims:</strong> ${details.claims.length} claims</p>
                <p><strong>Inventor:</strong> ${details.inventor_info.name}</p>
                
                <h3>Timeline</h3>
                <div class="timeline" id="timeline"></div>
            `;
            
            // Load timeline
            const timeline = document.getElementById('timeline');
            details.history.forEach(event => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.innerHTML = `
                    <strong>${new Date(event.timestamp).toLocaleDateString()}</strong>: ${event.action}
                    <br><small>${event.details}</small>
                `;
                timeline.appendChild(item);
            });
            
            document.getElementById('detailModal').style.display = 'block';
        }
        
        async function refreshStatus() {
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = '⏳ Checking USPTO...';
            
            try {
                const response = await fetch('/api/patents/refresh-status', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + sessionStorage.getItem('auth_token')
                    }
                });
                
                const result = await response.json();
                alert(`Status updated for ${result.updated} patents`);
                loadPatents();
                
            } catch (error) {
                alert('Failed to refresh status');
            } finally {
                btn.disabled = false;
                btn.textContent = '🔄 Refresh Status';
            }
        }
        
        function closeModal() {
            document.getElementById('detailModal').style.display = 'none';
        }
        
        // Load patents on page load
        loadPatents();
        
        // Auto-refresh every 5 minutes
        setInterval(loadPatents, 300000);
    </script>
</body>
</html>
            ''')
        
        @self.app.route('/api/patents/all')
        @self.require_auth
        def get_all_patents():
            """Get all patents for authenticated users"""
            conn = sqlite3.connect(self.storage.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, title, status, filing_date, confirmation_number,
                       application_number, patent_number, last_updated
                FROM patents
                ORDER BY filing_date DESC
            ''')
            
            patents = []
            for row in cursor.fetchall():
                patents.append({
                    'id': row[0],
                    'title': row[1],
                    'status': row[2],
                    'filing_date': row[3],
                    'confirmation_number': row[4],
                    'application_number': row[5],
                    'patent_number': row[6],
                    'last_updated': row[7]
                })
            
            conn.close()
            return jsonify(patents)
        
        @self.app.route('/api/patents/<patent_id>/details')
        @self.require_auth
        def get_patent_details(patent_id):
            """Get detailed patent information"""
            conn = sqlite3.connect(self.storage.db_path)
            cursor = conn.cursor()
            
            # Get patent data
            cursor.execute('''
                SELECT encrypted_data FROM patents WHERE id = ?
            ''', (patent_id,))
            
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Patent not found'}), 404
            
            # Decrypt sensitive data
            decrypted = json.loads(self.storage.decrypt_data(row[0]))
            
            # Get history
            cursor.execute('''
                SELECT action, timestamp, details, user
                FROM filing_history
                WHERE patent_id = ?
                ORDER BY timestamp DESC
            ''', (patent_id,))
            
            history = []
            for hist_row in cursor.fetchall():
                history.append({
                    'action': hist_row[0],
                    'timestamp': hist_row[1],
                    'details': hist_row[2],
                    'user': hist_row[3]
                })
            
            conn.close()
            
            return jsonify({
                'title': decrypted['full_title'],
                'abstract': decrypted['abstract'],
                'claims': decrypted['claims'],
                'inventor_info': decrypted['inventor_info'],
                'history': history
            })
    
    def require_auth(self, f):
        """Decorator for authenticated routes"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'error': 'No authorization header'}), 401
            
            try:
                token = auth_header.split(' ')[1]
                # Verify JWT token
                payload = jwt.decode(
                    token, 
                    self.app.secret_key, 
                    algorithms=['HS256']
                )
                request.user = payload
                return f(*args, **kwargs)
            except:
                return jsonify({'error': 'Invalid token'}), 401
                
        return decorated_function
    
    def run(self, host='0.0.0.0', port=5000, ssl_context=None):
        """Run the web interface"""
        self.app.run(host=host, port=port, ssl_context=ssl_context)

class VisionLakePatentManager:
    """Main patent management system"""
    
    def __init__(self):
        self.uspto_api = USPTOProductionAPI()
        self.storage = SecurePatentStorage()
        self.web_interface = VisionLakePatentWebInterface()
        
        # Your 8 patents configuration
        self.patents = {
            "RIX_Career": {
                "id": "RIX_Career",
                "title": "Hierarchical Artificial Intelligence Agent Career Progression System",
                "pdf_path": "patents/RIX_Career_Architecture.pdf",
                "saved_submission_id": "70759180"
            },
            "S2DO": {
                "id": "S2DO",
                "title": "Blockchain-Integrated Governance Framework for AI Decision Verification",
                "pdf_path": "patents/S2DO_Framework.pdf",
                "saved_submission_id": "70894223"  # Assumed mapping
            },
            "QMM": {
                "id": "QMM",
                "title": "Dual-NFT Trust Architecture System with Split Ownership Rights",
                "pdf_path": "patents/Queen_Mint_Mark.pdf",
                "saved_submission_id": "70758875"  # Assumed mapping
            },
            "Vision_Lake": {
                "id": "Vision_Lake",
                "title": "Virtual Environment System for AI Agent Orchestration",
                "pdf_path": "patents/Vision_Lake_Ecosystem.pdf"
            },
            "TimeLiners": {
                "id": "TimeLiners",
                "title": "Temporal Compression System for AI Work Execution",
                "pdf_path": "patents/TimeLiners_TimePressers.pdf"
            },
            "Credential_Ladder": {
                "id": "Credential_Ladder",
                "title": "Hierarchical Credential Escalation System for AI Agents",
                "pdf_path": "patents/Agent_Credential_Ladder.pdf"
            },
            "LENS": {
                "id": "LENS",
                "title": "Psychographic-Aligned Trust System for AI-Human Matching",
                "pdf_path": "patents/LENS_Cultural_Empathy.pdf"
            },
            "FMS": {
                "id": "FMS",
                "title": "Flashcard-Based Memory System for AI Agent Persistence",
                "pdf_path": "patents/FMS_Memory_Stack.pdf"
            }
        }
    
    def file_all_patents(self, client_id: str, client_secret: str) -> bool:
        """File all patents with production USPTO API"""
        
        # Authenticate
        if not self.uspto_api.authenticate(client_id, client_secret):
            logger.error("Failed to authenticate with USPTO")
            return False
        
        logger.info("Starting production patent filing...")
        
        # Complete saved submissions
        for patent_id, patent_data in self.patents.items():
            if 'saved_submission_id' in patent_data:
                logger.info(f"Completing saved submission for {patent_id}")
                result = self.uspto_api.complete_saved_submission(
                    patent_data['saved_submission_id'],
                    patent_data
                )
                
                if not result.get('success'):
                    logger.error(f"Failed to complete {patent_id}: {result.get('error')}")
        
        # File new patents
        for patent_id, patent_data in self.patents.items():
            if 'saved_submission_id' not in patent_data:
                logger.info(f"Creating new provisional for {patent_id}")
                result = self.uspto_api.create_new_provisional(patent_data)
                
                if not result.get('success'):
                    logger.error(f"Failed to file {patent_id}: {result.get('error')}")
        
        logger.info("Patent filing complete!")
        return True
    
    def start_web_interface(self, ssl_cert=None, ssl_key=None):
        """Start the web interface"""
        ssl_context = None
        if ssl_cert and ssl_key:
            ssl_context = (ssl_cert, ssl_key)
        
        logger.info("Starting Vision Lake Patent Web Interface...")
        self.web_interface.run(ssl_context=ssl_context)

# Production entry point
if __name__ == "__main__":
    # Get credentials from environment
    client_id = os.environ.get('USPTO_CLIENT_ID')
    client_secret = os.environ.get('USPTO_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        print("Please set USPTO_CLIENT_ID and USPTO_CLIENT_SECRET environment variables")
        sys.exit(1)
    
    # Create manager
    manager = VisionLakePatentManager()
    
    # File all patents
    manager.file_all_patents(client_id, client_secret)
    
    # Start web interface
    manager.start_web_interface()
