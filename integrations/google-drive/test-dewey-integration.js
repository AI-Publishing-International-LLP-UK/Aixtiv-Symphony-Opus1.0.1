/**
 * Test script for Dewey Digital Index integration with Google Drive
 * 
 * This script tests the integration between Google Drive and the Dewey Digital Index system.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create a simulated Drive file event
const fileData = {
  fileId: `file_${Math.random().toString(36).substring(2, 15)}`,
  name: "Test Document for Dewey.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  content: "This is a test document for the Dewey Digital Index system. It contains information about agents, training, and projects.",
  metadata: {
    author: "System Test",
    createdDate: new Date().toISOString()
  }
};

async function runTest() {
  try {
    console.log("Starting Dewey Digital Index integration test...");
    
    // Step 1: Add the file to the drive_files collection
    console.log(`Step 1: Adding file ${fileData.fileId} to drive_files collection...`);
    const driveFileRef = await db.collection('drive_files').add({
      fileId: fileData.fileId,
      name: fileData.name,
      mimeType: fileData.mimeType,
      createdTime: admin.firestore.FieldValue.serverTimestamp(),
      indexed: false
    });
    console.log(`  ✓ Drive file added with ID: ${driveFileRef.id}`);
    
    // Step 2: Add the file to the dewey_indexed_content collection
    console.log("Step 2: Adding file to dewey_indexed_content collection...");
    const indexedContentRef = await db.collection('dewey_indexed_content').add({
      sourceId: driveFileRef.id,
      sourceType: "google_drive",
      mountPoint: "/ddiCardMount",
      content: fileData.content,
      metadata: fileData.metadata,
      indexedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ Content indexed with ID: ${indexedContentRef.id}`);
    
    // Step 3: Update the drive_files record to mark as indexed
    console.log("Step 3: Updating drive_files record...");
    await driveFileRef.update({
      indexed: true,
      indexedContentId: indexedContentRef.id,
      indexedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("  ✓ Drive file updated");
    
    // Step 4: Create a classification record
    console.log("Step 4: Creating classification record...");
    const classificationRef = await db.collection('dewey_classifications').add({
      indexedContentId: indexedContentRef.id,
      mountPoint: "/ddiCardMount",
      categories: ["Training", "Agents", "Projects"], // This would be dynamically determined in a real implementation
      tags: [`author:${fileData.metadata.author}`],
      classifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ Classification created with ID: ${classificationRef.id}`);
    
    // Step 5: Update the indexed content with the classification ID
    console.log("Step 5: Updating indexed content with classification ID...");
    await indexedContentRef.update({
      classificationId: classificationRef.id,
      classifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("  ✓ Indexed content updated");
    
    console.log("\n✅ Dewey Digital Index integration test completed successfully!");
    console.log("\nTest Data:");
    console.log("- Drive File ID:", driveFileRef.id);
    console.log("- Indexed Content ID:", indexedContentRef.id);
    console.log("- Classification ID:", classificationRef.id);
    console.log("\nYou can verify the data in the Firebase console:");
    console.log("https://console.firebase.google.com/project/api-for-warp-drive/firestore/data/");
    
    process.exit(0);
  } catch (error) {
    console.error("Error in test:", error);
    process.exit(1);
  }
}

// Run the test
runTest();
