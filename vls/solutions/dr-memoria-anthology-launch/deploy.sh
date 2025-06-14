#!/bin/bash
# Deployment script for Dr. Memoria's Anthology Launch

set -e  # Exit on error

echo "🚀 Starting deployment for Dr. Memoria's Anthology Launch..."

# Set the GCP project and region
echo "Setting GCP project to api-for-warp-drive in region us-west1..."
firebase use api-for-warp-drive
export GOOGLE_CLOUD_REGION=us-west1

# Setup Firebase target for Dr. Memoria's Anthology
echo "Setting up Firebase hosting target for Dr. Memoria's Anthology..."
firebase target:apply hosting dr-memoria-anthology-launch dr-memoria-anthology-launch

# Source directory for Dr. Memoria's Anthology
SOURCE_DIR="functions"
PUBLIC_DIR="public"

# Ensure public directory exists
mkdir -p ${PUBLIC_DIR}

# Copy static web content if applicable
if [ -d "${SOURCE_DIR}/public" ]; then
  echo "Copying static web content..."
  cp -r ${SOURCE_DIR}/public/* ${PUBLIC_DIR}/
fi

# If there's no index.html, create a simple one
if [ ! -f "${PUBLIC_DIR}/index.html" ]; then
  echo "Creating basic index.html..."
  cat > ${PUBLIC_DIR}/index.html << 'HTML_EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dr. Memoria's Anthology Launch</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .tagline {
      font-style: italic;
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 40px;
    }
    h2 {
      color: #3498db;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .feature {
      background: #f9f9f9;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin-bottom: 20px;
    }
    .feature h3 {
      margin-top: 0;
      color: #2980b9;
    }
    footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #7f8c8d;
    }
    .buttons {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      background: #3498db;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #2980b9;
    }
    .btn.secondary {
      background: #2c3e50;
    }
    .btn.secondary:hover {
      background: #1a252f;
    }
  </style>
</head>
<body>
  <header>
    <h1>Dr. Memoria's Anthology Launch</h1>
    <div class="tagline">AI-Assisted Publishing with Human Creative Leadership</div>
    <div class="buttons">
      <a href="#" class="btn">Access Dashboard</a>
      <a href="#" class="btn secondary">Learn More</a>
    </div>
  </header>

  <div class="section">
    <h2>About Dr. Memoria's Anthology</h2>
    <p>Dr. Memoria's Anthology is a sophisticated AI-assisted publishing system powered by Firebase Cloud Functions. The platform facilitates human-AI collaborative content creation with a strong emphasis on ethical considerations, human creative leadership, and transparent attribution.</p>
  </div>

  <div class="section">
    <h2>Key Features</h2>
    
    <div class="feature">
      <h3>Roark 5.0 Authorship Model</h3>
      <p>Manages human-AI collaborative content creation with strict controls maintaining human creative sovereignty (minimum 70% human contribution required).</p>
    </div>
    
    <div class="feature">
      <h3>CIG (Code is Gold) Framework</h3>
      <p>Validates content integrity, originality, and ethical compliance through our proprietary verification system.</p>
    </div>
    
    <div class="feature">
      <h3>Blockchain Integration</h3>
      <p>Registers content ownership on the blockchain with NFT generation for permanent attribution and proof of authorship.</p>
    </div>
    
    <div class="feature">
      <h3>Multi-Platform Publishing</h3>
      <p>Enables seamless publishing to platforms like YouTube, Kindle, and Coursera with format-appropriate optimization.</p>
    </div>
    
    <div class="feature">
      <h3>CRX Integration</h3>
      <p>Connects with our CRX concierge system for enhanced user experience and personalized content recommendations.</p>
    </div>
    
    <div class="feature">
      <h3>Dr. Match Bid Suite</h3>
      <p>Integrates with Dr. Match's bid suite for optimized content monetization and market placement strategies.</p>
    </div>
  </div>

  <div class="section">
    <h2>How It Works</h2>
    <p>Dr. Memoria's Anthology maintains the highest standards of creative integrity in the age of AI collaboration while providing a seamless publishing experience:</p>
    <ol>
      <li><strong>Content Creation</strong>: Authors provide their creative input and direction, maintaining at least 70% human contribution</li>
      <li><strong>AI Assistance</strong>: Our system provides enhancement suggestions, formatting, and research assistance</li>
      <li><strong>CIG Verification</strong>: All content is verified for originality, ethical compliance, and attribution integrity</li>
      <li><strong>Blockchain Registration</strong>: Content is registered on the blockchain with proper attribution</li>
      <li><strong>Multi-Platform Publishing</strong>: Content is formatted and distributed to selected platforms</li>
      <li><strong>CRX Concierge</strong>: CRX services provide ongoing support and optimization</li>
    </ol>
  </div>

  <footer>
    <p>© 2025 Dr. Memoria's Anthology | AI Publishing International LLP UK</p>
    <p>All content maintains transparent human and AI attribution through the Roark 5.0 Authorship model</p>
  </footer>
</body>
</html>
HTML_EOL
fi

# Deploy Firebase Cloud Functions
echo "Deploying Firebase functions to region us-west1..."
cd ${SOURCE_DIR}
npm install
firebase deploy --only functions --project api-for-warp-drive --region us-west1

# Deploy hosting - return to the root directory
cd ..
echo "Deploying hosting for Dr. Memoria's Anthology Launch..."
firebase deploy --only hosting:dr-memoria-anthology-launch --project api-for-warp-drive

echo "✅ Deployment complete!"
echo "Your Dr. Memoria's Anthology Launch site should now be accessible at:"
echo "  - Firebase URL: https://dr-memoria-anthology-launch.web.app"

echo ""
echo "To set up the custom domain (if needed):"
echo "  1. In the Firebase Console, go to Hosting > Add custom domain"
echo "  2. Connect the domain drmemoria.anthology.com"
echo "  3. Follow the verification steps"

echo ""
echo "To check your deployment, visit: https://dr-memoria-anthology-launch.web.app"
