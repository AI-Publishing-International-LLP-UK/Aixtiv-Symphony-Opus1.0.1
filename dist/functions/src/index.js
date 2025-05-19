/**
 * ASOOS Integration Gateway - Firebase Functions
 * These functions provide integration between Aixtiv Symphony and various services
 */

import * from 'firebase-functions/v2';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { SpeechClient } from '@google-cloud/speech';

// Export SallyPort Auth Functions
export * from './sallyport-auth';

// Export LangChain Integration Functions
export * from './langchain-integration';

// Export Q4D-Lenz Integration Functions
export * from './q4d-lenz-integration';

// Export Career Expertise Framework Functions
export * from './career-expertise-framework';

// Setup Text-to-Speech client
const textToSpeechClient = new TextToSpeechClient();

// Setup Speech-to-Text client
const speechToTextClient = new SpeechClient();

// Text-to-Speech Functions for us-west1 region
export const listTtsVoices = functions.https.onCall(
  {
    region: 'us-west1',
  },
  async (request) => {
    try {
      const languageCode = request.data?.languageCode || 'en-US';
      functions.logger.info('Listing TTS voices', { languageCode });
      
      const [response] = await textToSpeechClient.listVoices({ languageCode });
      return { voices: response.voices || [] };
    } catch (error) {
      functions.logger.error('Error listing TTS voices', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error listing TTS voices'
      );
    }
  }
);

export const convertTextToSpeech = functions.https.onCall(
  {
    region: 'us-west1',
  },
  async (request) => {
    try {
      const text = request.data?.text || 'No text provided';
      const voice = request.data?.voice || 'en-US-Wavenet-F';
      const languageCode = request.data?.languageCode || 'en-US';
      
      functions.logger.info('Converting text to speech', {
        text,
        voice,
        languageCode,
      });
      
      const [result] = await textToSpeechClient.synthesizeSpeech({
        input: { text },
        voice: { name, languageCode },
        audioConfig: { audioEncoding: 'MP3' },
      });
      
      // Return since we can't directly return binary data
      // Check the type of audioContent and handle accordingly
      let base64Content = null;
      if (result.audioContent) {
        // If it's already a string, it might be base64 already
        if (typeof result.audioContent === 'string') {
          base64Content = result.audioContent;
        } else {
          // Otherwise assume it's a Uint8Array or Buffer-compatible
          base64Content = Buffer.from(result.audioContent).toString('base64');
        }
      }
      
      return { audioContent: base64Content };
    } catch (error) {
      functions.logger.error('Error converting text to speech', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error converting text to speech'
      );
    }
  }
);

export const convertSsmlToSpeech = functions.https.onCall(
  {
    region: 'us-west1',
  },
  async (request) => {
    try {
      const ssml = request.data?.ssml || 'No text provided';
      const voice = request.data?.voice || 'en-US-Wavenet-F';
      const languageCode = request.data?.languageCode || 'en-US';
      
      functions.logger.info('Converting SSML to speech', {
        ssml,
        voice,
        languageCode,
      });
      
      const [result] = await textToSpeechClient.synthesizeSpeech({
        input: { ssml },
        voice: { name, languageCode },
        audioConfig: { audioEncoding: 'MP3' },
      });
      
      // Return since we can't directly return binary data
      // Check the type of audioContent and handle accordingly
      let base64Content = null;
      if (result.audioContent) {
        // If it's already a string, it might be base64 already
        if (typeof result.audioContent === 'string') {
          base64Content = result.audioContent;
        } else {
          // Otherwise assume it's a Uint8Array or Buffer-compatible
          base64Content = Buffer.from(result.audioContent).toString('base64');
        }
      }
      
      return { audioContent: base64Content };
    } catch (error) {
      functions.logger.error('Error converting SSML to speech', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error converting SSML to speech'
      );
    }
  }
);

// Speech-to-Text Functions for us-west1 region
export const speechToText = functions.https.onCall(
  {
    region: 'us-west1',
  },
  async (request) => {
    try {
      // Get audio content
      const audioContent = request.data?.audioContent;
      const languageCode = request.data?.languageCode || 'en-US';
      const encoding = request.data?.encoding || 'LINEAR16';
      const sampleRateHertz = request.data?.sampleRateHertz || 16000;
      const alternativeLanguageCodes = request.data?.alternativeLanguageCodes || [];
      
      if (!audioContent) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Audio content is required'
        );
      }
      
      functions.logger.info('Converting speech to text', {
        languageCode,
        encoding,
        sampleRateHertz,
        alternativeLanguageCodes,
      });
      
      // Configure the request
      const config = {
        languageCode,
        encoding,
        sampleRateHertz,
        alternativeLanguageCodes,
        model: 'default',
        enableAutomaticPunctuation,
        enableWordTimeOffsets,
      };
      
      // Decode base64
      const audio = {
        content,
      };
      
      // Perform speech recognition
      const [response] = await speechToTextClient.recognize({
        config,
        audio,
      });
      
      // Process the results
      const transcriptions = response.results.map(result => ({
        transcript,
        confidence,
      }));
      
      return { transcriptions };
    } catch (error) {
      functions.logger.error('Error converting speech to text', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error converting speech to text'
      );
    }
  }
);

// Add the streaming API for longer audio files
export const streamingSpeechToText = functions.https.onCall(
  {
    region: 'us-west1',
    timeoutSeconds, // 9 minutes for longer processing
  },
  async (request) => {
    try {
      // Get audio content of base64 chunks
      const audioChunks = request.data?.audioChunks || [];
      const languageCode = request.data?.languageCode || 'en-US';
      const encoding = request.data?.encoding || 'LINEAR16';
      const sampleRateHertz = request.data?.sampleRateHertz || 16000;
      
      if (!audioChunks.length) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Audio chunks are required'
        );
      }
      
      functions.logger.info('Processing streaming speech to text', {
        chunkCount,
      });
      
      // Configure the request
      const config = {
        languageCode,
        encoding,
        sampleRateHertz,
        model: 'default',
        enableAutomaticPunctuation,
        enableWordTimeOffsets,
      };
      
      // Process each chunk
      const transcriptionResults = [];
      
      for (const chunk of audioChunks) {
        const audio = {
          content,
        };
        
        const [response] = await speechToTextClient.recognize({
          config,
          audio,
        });
        
        response.results.forEach(result => {
          transcriptionResults.push({
            transcript,
            confidence,
          });
        });
      }
      
      return { transcriptions: transcriptionResults };
    } catch (error) {
      functions.logger.error('Error with streaming speech to text', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error with streaming speech to text'
      );
    }
  }
);