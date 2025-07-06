#!/usr/bin/env python3
"""
USPTO Patent Filing Verification Script
Verifies that patents have been actually filed with the USPTO
"""

import json
import requests
import time
from datetime import datetime

def load_filing_results():
    """Load the filing results from our JSON file"""
    with open('Diamond-SAO-patent-filing-00-44/USPTO_Filing_Results_SAO_00_44.json', 'r') as f:
        return json.load(f)

def verify_public_search(application_number):
    """
    Check USPTO Public PAIR for application status
    Note: This uses the public search API which may have delays
    """
    base_url = "https://ped.uspto.gov/api/queries"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    # Search by application number
    payload = {
        "searchText": application_number,
        "fl": "*",
        "mm": "100%",
        "df": "patentTitle",
        "qf": "appEarlyPubNumber applId appLocation appType appStatus_txt appConfrNumber appCustNumber appGrpArtNumber appCls appSubCls appEntityStatus_txt patentNumber patentTitle primaryInventor firstNamedApplicant appExamName appExamPrefrdName appAttrDockNumber appPCTNumber appIntlPubNumber wipoEarlyPubNumber pctAppType firstInventorFile appClsSubCls rankAndInventorsList",
        "facet": "true",
        "sort": "applId desc",
        "start": "0"
    }
    
    try:
        response = requests.post(base_url, json=payload, headers=headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get('queryResults') and data['queryResults'].get('searchResponse'):
                docs = data['queryResults']['searchResponse'].get('response', {}).get('docs', [])
                if docs:
                    return {
                        'found': True,
                        'status': docs[0].get('appStatus_txt', 'Unknown'),
                        'title': docs[0].get('patentTitle', 'Unknown'),
                        'app_id': docs[0].get('applId', 'Unknown')
                    }
        return {'found': False, 'error': f'Status code: {response.status_code}'}
    except Exception as e:
        return {'found': False, 'error': str(e)}

def verify_patent_application_data(confirmation_number):
    """
    Alternative method using Patent Application Data API
    """
    base_url = f"https://developer.uspto.gov/ibd-api/v1/patent/application"
    
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'ASOOS-Patent-Verifier/1.0'
    }
    
    params = {
        'searchText': confirmation_number,
        'start': 0,
        'rows': 1
    }
    
    try:
        response = requests.get(base_url, params=params, headers=headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get('response') and data['response'].get('docs'):
                doc = data['response']['docs'][0]
                return {
                    'found': True,
                    'patent_number': doc.get('patentNumber', 'Pending'),
                    'app_number': doc.get('applicationNumber', 'Unknown'),
                    'status': doc.get('applicationStatus', 'Unknown')
                }
        return {'found': False, 'error': f'Status code: {response.status_code}'}
    except Exception as e:
        return {'found': False, 'error': str(e)}

def main():
    print("USPTO Patent Filing Verification")
    print("=" * 50)
    print()
    
    # Load filing results
    filing_data = load_filing_results()
    
    print(f"Filing Date: {filing_data['filing_date']}")
    print(f"Customer Number: {filing_data['customer_number']}")
    print(f"Total Patents: {filing_data['total_patents']}")
    print(f"Success Rate: {filing_data['success_rate']}")
    print()
    
    # Check a sample of patents
    print("Verifying sample patents...")
    print("-" * 50)
    
    # Check first 3 patents as examples
    for i, patent in enumerate(filing_data['patents'][:3]):
        print(f"\nPatent {i+1}: {patent['patent_id']}")
        print(f"Title: {patent['title']}")
        print(f"Application: {patent['application']}")
        print(f"Confirmation: {patent['confirmation']}")
        print(f"Status in JSON: {patent['status']}")
        
        # Try to verify via public search
        print("Checking USPTO Public Search...")
        result = verify_public_search(patent['application'])
        
        if result['found']:
            print(f"✅ Found in USPTO: Status = {result['status']}")
        else:
            print(f"❌ Not found in public search: {result.get('error', 'Unknown error')}")
            
        # Small delay to avoid rate limiting
        time.sleep(2)
    
    print("\n" + "=" * 50)
    print("\nIMPORTANT NOTES:")
    print("1. USPTO public databases may have 1-7 day delays for new filings")
    print("2. Patent applications filed on July 4, 2025 may not appear immediately")
    print("3. Check Patent Center directly for real-time status")
    print("4. Confirmation numbers starting with 'PCT' indicate successful submission")
    print("\nTo verify manually:")
    print("1. Go to https://patentcenter.uspto.gov")
    print("2. Log in with customer number 208576")
    print("3. Check 'My Applications' for real-time status")

if __name__ == "__main__":
    main()
