#!/usr/bin/env groovy

/**
 * Script to securely fetch a secret from Google Cloud Secret Manager for Jenkins pipelines
 *
 * @param secretName The name of the secret in Google Cloud Secret Manager
 * @param projectId  The Google Cloud project ID
 * @return The secret value as a string or null if the secret could not be retrieved
 */
def fetchSecret(String secretName, String projectId = 'api-for-warp-drive') {
    def result = null
    
    // Create a temporary credential file path
    def tmpDir = pwd(tmp: true)
    def credentialFile = "${tmpDir}/gcp-key.json"
    
    try {
        // Store the GCP key from Jenkins credentials to a temporary file
        withCredentials([file(credentialsId: 'gcp-service-account-key', variable: 'GCP_KEY_FILE')]) {
            sh "cp ${GCP_KEY_FILE} ${credentialFile}"
        }
        
        // Activate service account and fetch the secret
        withEnv(["GOOGLE_APPLICATION_CREDENTIALS=${credentialFile}"]) {
            echo "🔐 Fetching secret '${secretName}' from Google Cloud Secret Manager..."
            
            // Set a timeout to avoid hanging indefinitely
            timeout(time: 30, unit: 'SECONDS') {
                // Fetch the secret using the gcloud command
                result = sh(
                    script: "gcloud --quiet secrets versions access latest --secret=${secretName} --project=${projectId}",
                    returnStdout: true
                ).trim()
            }
            
            echo "✅ Secret successfully retrieved"
        }
    } catch (Exception e) {
        echo "❌ Failed to retrieve secret '${secretName}': ${e.getMessage()}"
        result = null
    } finally {
        // Clean up the temporary credential file
        if (fileExists(credentialFile)) {
            sh "rm -f ${credentialFile}"
        }
    }
    
    return result
}

return this
