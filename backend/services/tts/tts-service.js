const textToSpeech = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');
const logger = require('../../monitoring/logger');
const client = new textToSpeech.TextToSpeechClient();
const storage = new Storage();

/**
 * Service to handle Text-to-Speech functionality
 */
class TTSService {
  constructor() {
    this.bucketName = process.env.STORAGE_BUCKET || 'api-for-warp-drive.appspot.com'; // Your default Firebase Storage bucket
  }

  /**
   * Convert text to speech and store in Firebase Storage
   * @param {string} text - The text to convert to speech
   * @param {Object} options - Options for the TTS conversion
   * @returns {Promise<Object>} - Object containing the URL of the audio file
   */
  async textToSpeech(text, options = {}) {
    try {
      // Default TTS request options
      const request = {
        input: { text },
        voice: options.voice || {
          languageCode: 'en-US',
          ssmlGender: 'NEUTRAL',
          name: 'en-US-Neural2-F'
        },
        audioConfig: options.audioConfig || {
          audioEncoding: 'MP3'
        }
      };

      // Perform the text-to-speech request
      const [response] = await client.synthesizeSpeech(request);

      // Generate a unique filename
      const fileName = `tts-${Date.now()}.mp3`;
      const filePath = options.storagePath ? `${options.storagePath}/${fileName}` : `tts/${fileName}`;

      // Upload to Firebase Storage
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      await file.save(response.audioContent, {
        metadata: {
          contentType: 'audio/mp3'
        }
      });

      // Make file publicly accessible
      await file.makePublic();
      
      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;

      return {
        success: true,
        audioUrl: publicUrl,
        fileName,
        filePath
      };
    } catch (error) {
      logger.error(`TTS error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List available voices
   * @param {string} languageCode - Language code for which to list voices
   * @returns {Promise<Object>} - Object containing the list of available voices
   */
  async listVoices(languageCode = 'en-US') {
    try {
      const [response] = await client.listVoices({ languageCode });
      return {
        success: true,
        voices: response.voices
      };
    } catch (error) {
      logger.error(`Error listing voices: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert SSML text to speech and store in Firebase Storage
   * @param {string} ssml - The SSML text to convert to speech
   * @param {Object} options - Options for the TTS conversion
   * @returns {Promise<Object>} - Object containing the URL of the audio file
   */
  async ssmlToSpeech(ssml, options = {}) {
    try {
      // Default TTS request options with SSML input
      const request = {
        input: { ssml },
        voice: options.voice || {
          languageCode: 'en-US',
          ssmlGender: 'NEUTRAL',
          name: 'en-US-Neural2-F'
        },
        audioConfig: options.audioConfig || {
          audioEncoding: 'MP3'
        }
      };

      // The rest of the process is the same as textToSpeech
      const [response] = await client.synthesizeSpeech(request);

      const fileName = `tts-ssml-${Date.now()}.mp3`;
      const filePath = options.storagePath ? `${options.storagePath}/${fileName}` : `tts/${fileName}`;

      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      await file.save(response.audioContent, {
        metadata: {
          contentType: 'audio/mp3'
        }
      });

      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;

      return {
        success: true,
        audioUrl: publicUrl,
        fileName,
        filePath
      };
    } catch (error) {
      logger.error(`SSML TTS error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// // Create a single instance of the service
const ttsService = new TTSService();

/**
 * Synthesize speech from text or SSML
 * @param {string} text - The text or SSML to convert to speech
 * @param {Object} options - Voice and audio configuration options
 * @returns {Promise<Object>} - Object containing the URL of the audio file or error
 */
const synthesizeSpeech = async (text, options = {}) => {
  try {
    if (!text) {
      return { 
        success: false, 
        error: 'Text is required for speech synthesis' 
      };
    }
    
    logger.info(`Synthesizing speech for text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    
    // Determine if the input is SSML based on tags
    const isSSML = text.includes('<speak>') && text.includes('</speak>');
    
    const result = isSSML 
      ? await ttsService.ssmlToSpeech(text, options)
      : await ttsService.textToSpeech(text, options);
      
    return result;
  } catch (error) {
    logger.error(`Error in synthesizeSpeech: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * List available TTS voices
 * @param {string} languageCode - The language code to filter voices by
 * @returns {Promise<Object>} - Object containing the list of available voices or error
 */
const listVoices = async (languageCode = 'en-US') => {
  try {
    logger.info(`Listing voices for language code: ${languageCode}`);
    
    const result = await ttsService.listVoices(languageCode);
    
    return result;
  } catch (error) {
    logger.error(`Error in listVoices: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Export a clean interface for server.js to use
module.exports = {
  // Main functionality
  synthesizeSpeech,
  listVoices,
  
  // Direct access to the service instance for advanced use cases
  service: ttsService,
  
  // Direct access to individual methods for convenience
  textToSpeech: ttsService.textToSpeech.bind(ttsService),
  ssmlToSpeech: ttsService.ssmlToSpeech.bind(ttsService)
};
