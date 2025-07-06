const fs = require('fs');
const path = require('path');

const categories = {
  "100": { name: "Leadership & Coaching", sites: 8, prefix: "lead-coach" },
  "200": { name: "Government & Civic Engagement", sites: 9, prefix: "gov-civic" },
  "300": { name: "Community Culture", sites: 8, prefix: "comm-culture" },
  "320": { name: "Digital Art & Cultural Experiences", sites: 7, prefix: "digital-art" },
  "400": { name: "Bacasu Springs: City of Agents Tech Stack", sites: 12, prefix: "bacasu-tech" },
  "410": { name: "2100 Corporate & Brand", sites: 10, prefix: "2100-corp" },
  "420": { name: "Ethical Retail & Consumer Goods", sites: 12, prefix: "eth-retail" },
  "500": { name: "Finance, Risk & Data Governance", sites: 4, prefix: "fin-risk" },
  "600": { name: "Third Sector & NGOs", sites: 6, prefix: "third-sector" },
  "620": { name: "Foundations & Philanthropy", sites: 8, prefix: "philanthropy" },
  "700": { name: "Academia & Research Centers", sites: 5, prefix: "academia" },
  "800": { name: "Vision Lake Pilots", sites: 13, prefix: "vl-pilots" },
  "810": { name: "Super Agents & RIX", sites: 6, prefix: "super-agents" },
  "900": { name: "Life at Vision Lake", sites: 11, prefix: "life-vl" }
};

function generateSiteConfig(prefix, index) {
  return {
    target: `${prefix}-${index}`,
    site: `${prefix}-${index}`,
    public: `public/${prefix}`,
    ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
    rewrites: [{
      source: "**",
      destination: "/index.html"
    }],
    headers: [{
      source: "**/*.@(js|css)",
      headers: [{
        key: "Cache-Control",
        value: "max-age=31536000"
      }]
    }, {
      source: "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
      headers: [{
        key: "Cache-Control",
        value: "max-age=31536000"
      }]
    }, {
      source: "index.html",
      headers: [{
        key: "Cache-Control",
        value: "no-cache, no-store, must-revalidate"
      }]
    }]
  };
}

function generateAllSites() {
  const sites = [];
  
  // Generate sites for each category
  Object.entries(categories).forEach(([id, category]) => {
    for (let i = 1; i <= category.sites; i++) {
      sites.push(generateSiteConfig(category.prefix, i));
    }
  });

  return sites;
}

function generateFirebaseConfig() {
  const config = {
    hosting: {
      sites: generateAllSites()
    },
    functions: {
      source: "functions",
      runtime: "nodejs20"
    }
  };

  return config;
}

// Generate and write the configuration
const config = generateFirebaseConfig();
fs.writeFileSync(
  path.join(__dirname, '..', 'firebase.json'),
  JSON.stringify(config, null, 2)
);

console.log(`Generated Firebase configuration with ${Object.values(categories).reduce((sum, cat) => sum + cat.sites, 0)} sites.`);

