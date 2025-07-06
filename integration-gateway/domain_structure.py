import pandas as pd
from collections import defaultdict
import json

# Category to Firebase target mapping
category_to_target = {
    "950": "ai-pub",
    "100": "lead-coach",
    "200": "gov-civic",
    "300": "comm-culture",
    "320": "digital-art",
    "400": "bacasu-tech",
    "410": "2100-corp",
    "420": "eth-retail",
    "500": "fin-risk",
    "600": "third-sector",
    "620": "philanthropy",
    "700": "academia",
    "800": "vl-pilots",
    "810": "super-agents",
    "900": "life-vl"
}

# Category structure with site counts
structure = [
    ("950", "Global Infrastructure", ["AIPublishingInternational.co.uk", "AIPublishingInternational.com", "aipub.co.uk", "2100.company"]),
    ("100", "Leadership & Coaching", 8),
    ("200", "Government & Civic Engagement", 9),
    ("300", "Community Culture", 8),
    ("320", "Digital Art & Cultural Experiences", 7),
    ("400", "Bacasu Springs: City of Agents", 12),
    ("410", "2100 Corporate & Brand", 10),
    ("420", "Ethical Retail & Consumer Goods", 12),
    ("500", "Finance, Risk & Data Governance", 4),
    ("600", "Third Sector & NGOs", 6),
    ("620", "Foundations & Philanthropy", 8),
    ("700", "Academia & Research Centers", 5),
    ("800", "Vision Lake Pilots", 13),
    ("810", "Super Agents & RIX", 6),
    ("900", "Life at Vision Lake", 11)
]

# Create a dictionary to hold domains for each category
category_domains = defaultdict(list)

# Function to generate site ID
def generate_site_id(category_id, site_number):
    target = category_to_target[category_id]
    return f"{target}-site-{site_number}"

# Function to add domains to a category
def add_domains_to_category(category_id, domains):
    category_domains[category_id].extend(domains)

# Read domains from file
with open('domains/custom-domains.txt', 'r') as f:
    current_category = None
    for line in f:
        line = line.strip()
        if line.startswith('#'):
            # Extract category ID if present in comment
            for cat_id, _, _ in structure:
                if cat_id in line:
                    current_category = cat_id
                    break
        elif line and not line.startswith('#'):
            if current_category:
                add_domains_to_category(current_category, [line])

# Generate Firebase configuration
def generate_firebase_config():
    hosting_configs = []
    for category_id, name, count in structure:
        target = category_to_target[category_id]
        if isinstance(count, int):
            for i in range(1, count + 1):
                site_id = generate_site_id(category_id, i)
                hosting_configs.append({
                    "target": site_id,
                    "public": f"public/{target}",
                    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
                    "rewrites": [{"source": "**", "destination": "/index.html"}],
                    "headers": [
                        {
                            "source": "**/*.@(js|css)",
                            "headers": [{"key": "Cache-Control", "value": "max-age=31536000"}]
                        },
                        {
                            "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
                            "headers": [{"key": "Cache-Control", "value": "max-age=31536000"}]
                        },
                        {
                            "source": "index.html",
                            "headers": [{"key": "Cache-Control", "value": "no-cache, no-store, must-revalidate"}]
                        }
                    ]
                })

    return {"hosting": hosting_configs}

# Generate and save Firebase configuration
firebase_config = generate_firebase_config()
with open('firebase.json', 'w') as f:
    json.dump(firebase_config, f, indent=2)

# Print summary
print("\nFirebase Hosting Configuration Generated:")
for category_id, name, count in structure:
    if isinstance(count, int):
        print(f"{name} ({category_id}): {count} sites")
        for i in range(1, count + 1):
            print(f"  - {generate_site_id(category_id, i)}")

