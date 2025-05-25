/**
 * Dr. Burby Voice Synthesis API Client
 * 
 * This module provides a complete implementation for calling the Dr. Burby 
 * voice synthesis API hosted on Firebase Functions.
 */

/**
 * Synthesize speech using Dr. Burby's voice
 * 
 * @param {string} text - The text to be converted to speech
 * @param {Object} options - Optional configuration
 * @param {string} options.apiKey - API key for authentication
 * @param {number} options.pitch - Voice pitch adjustment (-20.0 to 20.0, default: -2.0)
 * @param {number} options.speakingRate - Speaking rate (0.25 to 4.0, default: 0.9)
 * @param {string} options.voiceName - Voice name (default: "en-US-WaveNet-D")
 * @param {string} options.apiEndpoint - Custom API endpoint
 * @returns {Promise<Blob>} - Audio blob that can be played or downloaded
 */
async function synthesizeDrBurbyVoice(text, options = {}) {
  // Default values
  const apiKey = options.apiKey || "YOUR_API_KEY"; // Replace with your actual API key
  const pitch = options.pitch !== undefined ? options.pitch : -2.0;
  const speakingRate = options.speakingRate !== undefined ? options.speakingRate : 0.9;
  const voiceName = options.voiceName || "en-US-WaveNet-D";
  const apiEndpoint = options.apiEndpoint || 
    "https://us-central1-api-2100-cool.cloudfunctions.net/synthesizeSpeech";

  // Validate input
  if (!text || typeof text !== 'string') {
    throw new Error("Text parameter is required and must be a string");
  }

  // Prepare request payload
  const payload = {
    text: text,
    auth: apiKey,
    voice: {
      name: voiceName,
      languageCode: "en-US",
      ssmlGender: "MALE"
    },
    audioConfig: {
      audioEncoding: "MP3",
      pitch: pitch,
      speakingRate: speakingRate
    }
  };

  try {
    // Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(payload)
    });

    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voice synthesis failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    // Return audio as a blob
    return await response.blob();
  } catch (error) {
    console.error("Error synthesizing Dr. Burby voice:", error);
    throw error;
  }
}

/**
 * Play audio from Dr. Burby voice synthesis
 * 
 * @param {string} text - The text to be spoken
 * @param {Object} options - Optional configuration (same as synthesizeDrBurbyVoice)
 * @returns {Promise<HTMLAudioElement>} - The audio element that's playing
 */
async function playDrBurbyVoice(text, options = {}) {
  try {
    const audioBlob = await synthesizeDrBurbyVoice(text, options);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Clean up object URL after audio is loaded
    audio.addEventListener('canplaythrough', () => {
      audio.play();
    });
    
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    });
    
    return audio;
  } catch (error) {
    console.error("Error playing Dr. Burby voice:", error);
    throw error;
  }
}

/**
 * Download audio file from Dr. Burby voice synthesis
 * 
 * @param {string} text - The text to be converted to speech
 * @param {string} filename - The name for the downloaded file
 * @param {Object} options - Optional configuration (same as synthesizeDrBurbyVoice)
 * @returns {Promise<void>}
 */
async function downloadDrBurbyVoice(text, filename = "dr-burby-speech.mp3", options = {}) {
  try {
    const audioBlob = await synthesizeDrBurbyVoice(text, options);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(audioBlob);
    downloadLink.download = filename;
    
    // Append to document, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up object URL
    setTimeout(() => {
      URL.revokeObjectURL(downloadLink.href);
    }, 100);
  } catch (error) {
    console.error("Error downloading Dr. Burby voice:", error);
    throw error;
  }
}

/**
 * Check if the Dr. Burby voice service is available
 * 
 * @param {string} apiEndpoint - Base endpoint of the voice service
 * @returns {Promise<boolean>} - Whether the service is available
 */
async function checkDrBurbyVoiceServiceStatus(apiEndpoint = "https://us-central1-api-2100-cool.cloudfunctions.net") {
  try {
    const statusEndpoint = `${apiEndpoint}/voiceServiceStatus`;
    const response = await fetch(statusEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return false;
    }
    
    const statusData = await response.json();
    return statusData.status === 'online';
  } catch (error) {
    console.error("Error checking Dr. Burby voice service status:", error);
    return false;
  }
}

// Usage examples:

/* Example 1: Basic usage - Play speech
async function demo() {
  try {
    await playDrBurbyVoice(
      "Hello, this is Dr. Burby. I'm here to assist you with AI and business strategy.",
      { apiKey: "your_actual_api_key" }
    );
    console.log("Audio is playing...");
  } catch (error) {
    console.error("Demo failed:", error);
  }
}
*/

/* Example 2: Download audio file
async function downloadDemo() {
  try {
    await downloadDrBurbyVoice(
      "This is an important message from Dr. Burby about your AI implementation strategy.",
      "important-message.mp3",
      { 
        apiKey: "your_actual_api_key",
        pitch: -1.5,            // Slightly less deep
        speakingRate: 0.85      // Slightly slower
      }
    );
    console.log("Download initiated");
  } catch (error) {
    console.error("Download demo failed:", error);
  }
}
*/

// Export functions for use in other modules
export {
  synthesizeDrBurbyVoice,
  playDrBurbyVoice,
  downloadDrBurbyVoice,
  checkDrBurbyVoiceServiceStatus
};

