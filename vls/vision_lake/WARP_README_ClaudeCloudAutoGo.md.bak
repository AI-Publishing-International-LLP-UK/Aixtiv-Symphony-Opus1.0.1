
# Warp Auto-Go Setup: Claude to Cloud Build for VisionLake

## Purpose
Enable Claude to push production-grade code updates through Cloud Build using Firebase Functions, with Warp managing IAM and memory context setup.

---

## STEP 1: Service Account
- Create a GCP IAM service account with roles:
  - Cloud Build Editor
  - Cloud Functions Developer
  - Storage Admin
- Store the service account key securely and link it to Claude's runtime environment.

---

## STEP 2: Cloud Build Trigger
- Use the included `visionlake_cloudbuild.yaml` to configure a Git-based trigger for auto-deployment from branches like `main` or `interface-demo`.

---

## STEP 3: Firestore Memory Context
- Set up Firestore collection: `agentPulseMemory`
- Use the provided schema to log real-time agent system metrics.
- Claude can query this for memory context and decision augmentation.

---

## STEP 4: Firebase Function Deployment
- Claude will deploy functions using:
  `gcloud functions deploy agentPulsePanel --runtime nodejs20 --trigger-http --allow-unauthenticated --region=us-west1 --source=functions`

---

## Optional: Pinecone Memory Index
- Enable Pinecone integration using Claude’s embedding functions.
- Use domain Dewey codes as vector tags.

---

## Result
Claude will autonomously:
- Write and commit deployable code
- Trigger builds via Git
- Deploy to Cloud Functions
- Update memory state in Firestore
- Operate under Warp’s auto-go protocol with zero interruptions

---

🚀 Ready for execution.
