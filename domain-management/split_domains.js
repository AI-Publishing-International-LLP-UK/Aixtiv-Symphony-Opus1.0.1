const fs = require('fs');
const path = require('path');

// Read the all_domains.txt file
const allDomainsPath = path.join('/Users/as/asoos/domain-management', 'all_domains.txt');
const domains = fs.readFileSync(allDomainsPath, 'utf8')
  .split('\n')
  .filter(domain => domain.trim().length > 0); // Filter out empty lines

// Split domains into batches of 10
const batchSize = 10;
const batches = [];
for (let i = 0; i < domains.length; i += batchSize) {
  batches.push(domains.slice(i, i + batchSize));
}

// Write each batch to a separate file
batches.forEach((batch, index) => {
  const batchNumber = index + 1;
  const batchFileName = `batch${batchNumber}.txt`;
  const batchFilePath = path.join('/Users/as/asoos/domain-management', batchFileName);
  
  fs.writeFileSync(batchFilePath, batch.join('\n'));
  console.log(`Created ${batchFileName} with ${batch.length} domains`);
});

console.log(`Split ${domains.length} domains into ${batches.length} batch files`);

