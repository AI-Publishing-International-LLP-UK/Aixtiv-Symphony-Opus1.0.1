const functions = require("firebase-functions");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
const cors = require("cors")({ origin: true });
const fs = require("fs");
const util = require("util");
const path = require("path");
const os = require("os");

// Initialize the Text-to-Speech client
const client = new TextToSpeechClient();

/**
 * Firebase function to synthesize speech using Dr. Burby's voice (WaveNet-D)
 * This function accepts a POST request with a JSON body containing:
 * - text: The text to convert to speech
 * - pitch: (optional) Voice pitch (-20.0 to 20.0, default is -2.0)
 * - speakingRate: (optional) Speaking rate (0.25 to 4.0, default is 0.9)
 * - auth: (required) Authentication token
 */
exports.synthesizeSpeech = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "1GB",
    // Authentication is required - set up proper IAM roles in Firebase Console
    invoker: "public", // Can change to specific service accounts or users
  })
  .https.onRequest(async (req, res) => {
    // Enable CORS for specified origins
    return cors(req, res, async () => {
      try {
        // Check request method
        if (req.method !== "POST") {
          return res.status(405).send({ error: "Method not allowed. Please use POST." });
        }

        // Validate request body
        const { text, pitch = -2.0, speakingRate = 0.9, auth } = req.body;

        // Basic authentication check - replace with your actual auth logic
        if (!auth || auth !== functions.config().drburby.api_key) {
          console.warn("Authentication failed for voice synthesis request");
          return res.status(403).send({ error: "Unauthorized access. Please provide valid credentials." });
        }

        // Validate text input
        if (!text || typeof text !== "string" || text.trim().length === 0) {
          return res.status(400).send({ error: "Invalid text input. Please provide non-empty text." });
        }
        
        // Validate pitch and speaking rate parameters
        if (pitch < -20.0 || pitch > 20.0) {
          return res.status(400).send({ error: "Pitch must be between -20.0 and 20.0" });
        }
        
        if (speakingRate < 0.25 || speakingRate > 4.0) {
          return res.status(400).send({ error: "Speaking rate must be between 0.25 and 4.0" });
        }

        // Log the request (remove sensitive info in production)
        console.log(`Generating speech for text of length: ${text.length} characters`);

        // Set up request to Google Cloud TTS API
        const request = {
          input: { text },
          voice: {
            languageCode: "en-US",
            name: "en-US-WaveNet-D",  // The specific WaveNet-D voice
            ssmlGender: "MALE",
          },
          audioConfig: {
            audioEncoding: "MP3",
            pitch: pitch,              // Deep, authoritative voice
            speakingRate: speakingRate // Slightly slower for clarity
          },
        };

        // Call the Google Cloud TTS API
        const [response] = await client.synthesizeSpeech(request);
        
        // Create temporary file path for the audio
        const tempFilePath = path.join(os.tmpdir(), `dr-burby-${Date.now()}.mp3`);
        
        // Write audio content to temporary file
        await util.promisify(fs.writeFile)(tempFilePath, response.audioContent, "binary");
        
        // Set response headers
        res.set("Content-Type", "audio/mpeg");
        res.set("Content-Disposition", "attachment; filename=dr-burby-voice.mp3");
        
        // Send the file as the response
        res.sendFile(tempFilePath, {
          headers: { "Content-Type": "audio/mpeg" }
        }, (err) => {
          if (err) {
            console.error("Error sending audio file:", err);
            return res.status(500).send({ error: "Error delivering audio file" });
          }
          
          // Clean up the temporary file
          fs.unlink(tempFilePath, (unlinkErr) => {
            if (unlinkErr) console.error("Error removing temporary file:", unlinkErr);
          });
        });
        
      } catch (error) {
        // Handle and log any errors
        console.error("Error in Dr. Burby voice synthesis:", error);
        
        // Determine appropriate error status and message
        let status = 500;
        let message = "An unexpected error occurred during speech synthesis.";
        
        if (error.code) {
          // Handle specific Google Cloud API errors
          switch (error.code) {
            case 8:
            case "8":
            case "RESOURCE_EXHAUSTED":
              status = 429;
              message = "Resource limits exceeded. Please try again later.";
              break;
            case 16:
            case "16":
            case "UNAUTHENTICATED":
              status = 401;
              message = "API authentication failed. Please check your credentials.";
              break;
            default:
              message = `API Error: ${error.message || error.details || "Unknown error"}`;
          }
        }
        
        // Send error response
        return res.status(status).send({
          error: message,
          requestId: req.headers["x-request-id"] || "UNKNOWN",
          timestamp: new Date().toISOString()
        });
      }
    });
  });

/**
 * Helper function to get the health status of the voice service
 * This can be used for monitoring and health checks
 */
exports.voiceServiceStatus = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Simple ping to Google Cloud TTS API to check connectivity
      await client.listVoices({ languageCode: "en-US" });
      
      // Send success response
      return res.status(200).send({
        status: "healthy",
        service: "Dr. Burby Voice Service",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      });
    } catch (error) {
      console.error("Health check failed:", error);
      
      // Send error response
      return res.status(500).send({
        status: "unhealthy",
        service: "Dr. Burby Voice Service",
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });
});

/**
 * Deploy instructions:
 * 1. Ensure Google Cloud Text-to-Speech API is enabled for your project
 * 2. Set up authentication with proper IAM roles
 * 3. Set the API key in Firebase Config:
 *    firebase functions:config:set drburby.api_key="YOUR_SECRET_KEY"
 * 4. Deploy with:
 *    firebase deploy --only functions:synthesizeSpeech,functions:voiceServiceStatus
 * 
 * Usage example:
 * POST https://us-central1-api-2100-cool.cloudfunctions.net/synthesizeSpeech
 * Content-Type: application/json
 * {
 *   "text": "Hello, this is Dr. Burby speaking. I'm here to assist you with AI and business strategy.",
 *   "auth": "YOUR_API_KEY"
 * }
 */

