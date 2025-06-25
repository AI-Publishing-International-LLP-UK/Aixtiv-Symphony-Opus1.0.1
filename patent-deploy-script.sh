#!/bin/bash

# Vision Lake Patent System Deployment Script
# This script deploys the patent system to your server

echo "🚀 Vision Lake Patent System Deployment"
echo "======================================"

# Configuration
REPO_URL="https://github.com/YOUR_USERNAME/vision-lake-patents.git"
DEPLOY_DIR="/var/www/patents.visionlake.ai"
DOMAIN="patents.visionlake.ai"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# 1. Clone or update repository
echo -e "\n1. Setting up repository..."
if [ -d "$DEPLOY_DIR" ]; then
    cd "$DEPLOY_DIR"
    git pull origin main
    check_status "Repository updated"
else
    git clone "$REPO_URL" "$DEPLOY_DIR"
    check_status "Repository cloned"
    cd "$DEPLOY_DIR"
fi

# 2. Create Python virtual environment
echo -e "\n2. Setting up Python environment..."
python3 -m venv venv
check_status "Virtual environment created"

source venv/bin/activate
check_status "Virtual environment activated"

# 3. Install dependencies
echo -e "\n3. Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
check_status "Dependencies installed"

# 4. Set up environment variables
echo -e "\n4. Setting up environment variables..."
cat > .env << EOF
# USPTO Configuration
USPTO_CUSTOMER_NUMBER=208576
USPTO_API_KEY=your-uspto-api-key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost/visionlake_patents

# Application Configuration
FLASK_APP=vision-lake-patent-production.py
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)

# Domain Configuration
DOMAIN=$DOMAIN
EOF
check_status "Environment variables created"

# 5. Set up database
echo -e "\n5. Setting up database..."
python << EOF
from vision_lake_patent_production import db
db.create_all()
print("Database tables created successfully")
EOF
check_status "Database initialized"

# 6. Create systemd service
echo -e "\n6. Creating systemd service..."
sudo tee /etc/systemd/system/visionlake-patents.service > /dev/null << EOF
[Unit]
Description=Vision Lake Patent System
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$DEPLOY_DIR
Environment="PATH=$DEPLOY_DIR/venv/bin"
ExecStart=$DEPLOY_DIR/venv/bin/python vision-lake-patent-production.py

[Install]
WantedBy=multi-user.target
EOF
check_status "Systemd service created"

# 7. Create Nginx configuration
echo -e "\n7. Setting up Nginx..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /static {
        alias $DEPLOY_DIR/static;
    }
}
EOF
check_status "Nginx configuration created"

# 8. Enable and start services
echo -e "\n8. Starting services..."
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo systemctl reload nginx
check_status "Nginx reloaded"

sudo systemctl enable visionlake-patents
sudo systemctl start visionlake-patents
check_status "Patent system service started"

# 9. Set up SSL with Let's Encrypt
echo -e "\n9. Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@visionlake.ai
check_status "SSL certificate installed"

# 10. Create deployment info
echo -e "\n10. Creating deployment info..."
cat > deployment-info.txt << EOF
Vision Lake Patent System Deployment
====================================
Date: $(date)
Domain: https://$DOMAIN
Repository: $REPO_URL
Deploy Directory: $DEPLOY_DIR

Patent Links:
- https://$DOMAIN/rix-career-architecture
- https://$DOMAIN/s2do-governance
- https://$DOMAIN/queen-mint-mark
- https://$DOMAIN/vision-lake-ecosystem
- https://$DOMAIN/timeliners-compression
- https://$DOMAIN/credential-ladder
- https://$DOMAIN/lens-trust-system
- https://$DOMAIN/fms-memory-stack

Service Status:
$(sudo systemctl status visionlake-patents --no-pager)
EOF

echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
echo "Visit https://$DOMAIN to view your Vision Lake Patent System"
echo "Deployment details saved to: deployment-info.txt"