#!/usr/bin/env node

const { Firestore } = require('@google-cloud/firestore');

// Use the default credentials from the environment
// or use GOOGLE_APPLICATION_CREDENTIALS environment variable
const projectId = process.env.GCP_PROJECT_ID || 'api-for-warp-drive';
const firestore = new Firestore({
  projectId,
});

async function listCollectionsAndDocuments() {
  console.log(`Connecting to Firestore in project: ${projectId}`);
  console.log('Listing all collections and a sample of documents from each...\n');

  try {
    // Get all collections
    const collections = await firestore.listCollections();
    
    if (collections.length === 0) {
      console.log('No collections found in the Firestore database.');
      return;
    }

    console.log(`Found ${collections.length} collections:\n`);

    // Process each collection
    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`Collection: ${collectionName}`);
      
      // Get a sample of documents (limit to 5)
      const snapshot = await collection.limit(5).get();
      
      if (snapshot.empty) {
        console.log('  No documents found in this collection.');
      } else {
        console.log(`  Found ${snapshot.size} documents (showing up to 5):`);
        
        snapshot.forEach(doc => {
          console.log(`  - Document ID: ${doc.id}`);
          console.log('    Data:', JSON.stringify(doc.data(), null, 2).substring(0, 200) + '...');
          console.log();
        });
      }
      
      // Get total count of documents in collection
      const countSnapshot = await collection.count().get();
      console.log(`  Total documents in collection: ${countSnapshot.data().count}`);
      console.log('---------------------------------------------------');
    }
  } catch (error) {
    console.error('Error connecting to Firestore:', error);
    process.exit(1);
  }
}

// Execute the function
listCollectionsAndDocuments()
  .then(() => console.log('Finished listing Firestore collections and documents.'))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

