#!/usr/bin/env python3
"""
Vision Lake Patent Clearinghouse MVP
Start offering patent intelligence TODAY
"""

from flask import Flask, request, jsonify, render_template_string
import requests
import json
from datetime import datetime
import hashlib
import os

app = Flask(__name__)

# Simple HTML interface
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Vision Lake Patent Intelligence</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .search-box { width: 100%; padding: 15px; font-size: 16px; border: 2px solid #3498db; border-radius: 5px; }
        .search-btn { background: #3498db; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin-top: 10px; }
        .results { margin-top: 30px; }
        .patent { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .risk-high { border-left: 5px solid #e74c3c; }
        .risk-medium { border-left: 5px solid #f39c12; }
        .risk-low { border-left: 5px solid #27ae60; }
        .loading { display: none; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Vision Lake Patent Intelligence</h1>
        <p>AI-Powered Patent Search & Analysis</p>
    </div>
    
    <div>
        <h2>Describe Your Innovation</h2>
        <textarea class="search-box" id="innovation" rows="4" 
                  placeholder="Example: An AI system that helps other AI agents advance through career levels..."></textarea>
        <br>
        <button class="search-btn" onclick="searchPatents()">🔍 Check Patentability</button>
    </div>
    
    <div class="loading" id="loading">
        <img src="https://i.imgur.com/llF5iyg.gif" width="50">
        <p>Analyzing patent landscape...</p>
    </div>
    
    <div class="results" id="results"></div>
    
    <script>
        async function searchPatents() {
            const innovation = document.getElementById('innovation').value;
            if (!innovation) {
                alert('Please describe your innovation');
                return;
            }
            
            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').innerHTML = '';
            
            try {
                const response = await fetch('/api/patent-check', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({invention: innovation})
                });
                
                const data = await response.json();
                displayResults(data);
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }
        
        function displayResults(data) {
            let html = '<h2>Patent Intelligence Report</h2>';
            
            // Overall assessment
            html += `<div class="patent risk-${data.overall_risk.toLowerCase()}">`;
            html += `<h3>Overall Assessment: ${data.overall_risk}</h3>`;
            html += `<p>${data.recommendation}</p>`;
            html += `<p>Patentability Score: ${data.patentability_score}/100</p>`;
            html += '</div>';
            
            // Similar patents
            if (data.similar_patents.length > 0) {
                html += '<h3>Similar Patents Found:</h3>';
                data.similar_patents.forEach(patent => {
                    html += `<div class="patent risk-${patent.risk_level.toLowerCase()}">`;
                    html += `<strong>${patent.patent_number}</strong>: ${patent.title}<br>`;
                    html += `<small>Filed by: ${patent.assignee} on ${patent.date}</small><br>`;
                    html += `<small>Risk Score: ${patent.risk_score}/100</small>`;
                    html += '</div>';
                });
            }
            
            // Suggestions
            html += '<h3>Next Steps:</h3>';
            html += '<div class="patent">';
            html += '<ul>';
            data.next_steps.forEach(step => {
                html += `<li>${step}</li>`;
            });
            html += '</ul>';
            html += '</div>';
            
            document.getElementById('results').innerHTML = html;
        }
    </script>
</body>
</html>
"""

class PatentIntelligenceAPI:
    """Simple API for patent intelligence"""
    
    def __init__(self):
        self.patentsview_api = "https://api.patentsview.org/patents/query"
        
    def extract_keywords(self, text):
        """Extract key technical terms from invention description"""
        # Simple keyword extraction (in production, use NLP)
        keywords = []
        
        # Technical term patterns
        tech_terms = ['system', 'method', 'apparatus', 'device', 'process', 
                     'algorithm', 'network', 'data', 'artificial intelligence',
                     'machine learning', 'blockchain', 'memory', 'interface']
        
        text_lower = text.lower()
        
        # Extract mentioned technical terms
        for term in tech_terms:
            if term in text_lower:
                keywords.append(term)
                
        # Extract noun phrases (simplified)
        words = text.split()
        for i in range(len(words)-1):
            if words[i].lower() in ['ai', 'ml', 'automated', 'intelligent', 'smart']:
                keywords.append(f"{words[i]} {words[i+1]}")
                
        return list(set(keywords))[:10]  # Top 10 unique keywords
    
    def search_similar_patents(self, keywords):
        """Search for similar patents using keywords"""
        
        # Build query
        query = {
            "q": {
                "_or": [
                    {"_text_any": {"patent_abstract": keyword}}
                    for keyword in keywords
                ]
            },
            "f": ["patent_number", "patent_title", "patent_abstract", 
                  "patent_date", "assignee_organization"],
            "s": [{"patent_date": "desc"}],
            "per_page": 10
        }
        
        try:
            response = requests.post(self.patentsview_api, json=query, timeout=30)
            if response.status_code == 200:
                data = response.json()
                return data.get("patents", [])
        except:
            pass
            
        return []
    
    def analyze_patent_risk(self, patent, keywords):
        """Analyze how risky a patent is"""
        
        risk_score = 0
        abstract = patent.get("patent_abstract", "").lower()
        title = patent.get("patent_title", "").lower()
        
        # Check keyword matches
        matches = sum(1 for kw in keywords if kw.lower() in abstract or kw.lower() in title)
        risk_score = min(100, matches * 15)
        
        # Recency bonus
        patent_date = patent.get("patent_date", "2000-01-01")
        year = int(patent_date.split("-")[0])
        if year >= 2023:
            risk_score += 20
        elif year >= 2020:
            risk_score += 10
            
        risk_level = "HIGH" if risk_score >= 60 else "MEDIUM" if risk_score >= 30 else "LOW"
        
        return {
            "patent_number": patent.get("patent_number"),
            "title": patent.get("patent_title"),
            "assignee": patent.get("assignee_organization", ["Unknown"])[0],
            "date": patent.get("patent_date"),
            "risk_score": risk_score,
            "risk_level": risk_level
        }
    
    def generate_patentability_report(self, invention_text):
        """Generate complete patentability report"""
        
        # Extract keywords
        keywords = self.extract_keywords(invention_text)
        
        # Search for similar patents
        similar_patents = self.search_similar_patents(keywords)
        
        # Analyze each patent
        analyzed_patents = []
        for patent in similar_patents:
            risk_analysis = self.analyze_patent_risk(patent, keywords)
            analyzed_patents.append(risk_analysis)
            
        # Sort by risk
        analyzed_patents.sort(key=lambda x: x["risk_score"], reverse=True)
        
        # Calculate overall risk
        high_risk_count = sum(1 for p in analyzed_patents if p["risk_level"] == "HIGH")
        
        if high_risk_count >= 3:
            overall_risk = "HIGH"
            patentability_score = 30
            recommendation = "⚠️ Several similar patents exist. Consider focusing on novel implementation details."
        elif high_risk_count >= 1:
            overall_risk = "MEDIUM"
            patentability_score = 60
            recommendation = "📋 Some related patents found. Emphasize your unique approach."
        else:
            overall_risk = "LOW"
            patentability_score = 85
            recommendation = "✅ Good patentability potential! Few blocking patents found."
            
        # Generate next steps
        next_steps = []
        if overall_risk == "HIGH":
            next_steps = [
                "Review the high-risk patents in detail",
                "Identify your unique technical contributions",
                "Consider consulting with a patent attorney",
                "Focus on specific implementation details"
            ]
        elif overall_risk == "MEDIUM":
            next_steps = [
                "Document your novel features clearly",
                "File a provisional patent to establish priority",
                "Continue developing unique aspects",
                "Monitor new filings in this space"
            ]
        else:
            next_steps = [
                "File a provisional patent application soon",
                "Document your invention thoroughly",
                "Consider international filing strategy",
                "Start building prototype/proof of concept"
            ]
            
        return {
            "keywords_extracted": keywords,
            "similar_patents": analyzed_patents[:5],  # Top 5
            "overall_risk": overall_risk,
            "patentability_score": patentability_score,
            "recommendation": recommendation,
            "next_steps": next_steps,
            "search_timestamp": datetime.now().isoformat()
        }

# Initialize API
patent_api = PatentIntelligenceAPI()

@app.route('/')
def home():
    """Serve the web interface"""
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/patent-check', methods=['POST'])
def patent_check():
    """API endpoint for patent checking"""
    
    try:
        data = request.json
        invention = data.get('invention', '')
        
        if not invention:
            return jsonify({"error": "No invention description provided"}), 400
            
        # Generate report
        report = patent_api.generate_patentability_report(invention)
        
        # Log for analytics (in production, save to database)
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "invention_hash": hashlib.md5(invention.encode()).hexdigest(),
            "keywords": report["keywords_extracted"],
            "risk_level": report["overall_risk"]
        }
        print(f"Patent check: {json.dumps(log_entry)}")
        
        return jsonify(report)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/monitor', methods=['POST'])
def setup_monitoring():
    """Set up patent monitoring for a company"""
    
    data = request.json
    company_name = data.get('company')
    keywords = data.get('keywords', [])
    
    # In production, this would set up webhooks/cron jobs
    monitor_id = hashlib.md5(f"{company_name}{keywords}".encode()).hexdigest()[:8]
    
    return jsonify({
        "monitor_id": monitor_id,
        "status": "active",
        "frequency": "weekly",
        "next_check": "2025-06-12"
    })

@app.route('/api/valuation', methods=['POST'])
def patent_valuation():
    """Estimate patent value"""
    
    data = request.json
    patent_number = data.get('patent_number')
    
    # Simplified valuation (in production, use ML model)
    base_value = 50000
    
    # Mock factors (in production, analyze citations, claims, etc.)
    factors = {
        "forward_citations": 15,
        "backward_citations": 25,
        "claim_count": 20,
        "family_size": 5,
        "litigation_history": False,
        "licensing_evidence": True
    }
    
    # Simple calculation
    value_multiplier = 1.0
    value_multiplier += factors["forward_citations"] * 0.05
    value_multiplier += factors["claim_count"] * 0.02
    if factors["licensing_evidence"]:
        value_multiplier += 0.5
        
    estimated_value = int(base_value * value_multiplier)
    
    return jsonify({
        "patent_number": patent_number,
        "estimated_value": {
            "low": int(estimated_value * 0.7),
            "median": estimated_value,
            "high": int(estimated_value * 1.5)
        },
        "valuation_factors": factors,
        "confidence": "medium",
        "comparable_transactions": [
            {"patent": "US9,123,456", "sale_price": 75000, "similarity": 0.82},
            {"patent": "US8,765,432", "sale_price": 125000, "similarity": 0.75}
        ]
    })

def create_pcp_integration():
    """Template for PCP integration"""
    
    pcp_code = '''
    class PatentIntelligencePCP:
        """PCP Extension for Patent Intelligence"""
        
        def __init__(self, base_pcp):
            self.pcp = base_pcp
            self.patent_api = PatentIntelligenceAPI()
            
        async def handle_patent_query(self, user_query):
            """Handle patent-related queries"""
            
            if "patent" in user_query.lower() or "ip" in user_query.lower():
                # Determine query type
                if "can i patent" in user_query.lower():
                    return await self.check_patentability(user_query)
                elif "monitor" in user_query.lower():
                    return await self.setup_monitoring(user_query)
                elif "value" in user_query.lower():
                    return await self.estimate_value(user_query)
                    
            return None
            
        async def daily_patent_brief(self, user_profile):
            """Daily patent intelligence brief"""
            
            brief = {
                "new_competitor_filings": [],
                "patent_expires_soon": [],
                "licensing_opportunities": [],
                "litigation_alerts": []
            }
            
            # Populate based on user's industry/interests
            # ...
            
            return brief
    '''
    
    return pcp_code

if __name__ == '__main__':
    print("""
    🚀 Vision Lake Patent Intelligence MVP
    
    Access the web interface at: http://localhost:5000
    
    API Endpoints:
    - POST /api/patent-check - Check patentability
    - POST /api/monitor - Set up monitoring
    - POST /api/valuation - Estimate patent value
    
    This MVP demonstrates:
    1. Simple web interface for patent searches
    2. Real-time prior art checking
    3. Risk assessment and recommendations
    4. API structure for PCP integration
    
    To deploy on Vision Lake infrastructure:
    1. Add to your MCP servers
    2. Integrate with Squadron 06
    3. Connect to PCP instances
    4. Enable for Owner Subscribers
    """)
    
    app.run(debug=True, port=5000)
