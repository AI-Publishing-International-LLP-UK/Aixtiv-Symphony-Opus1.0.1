'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.convertSsmlToSpeech =
  exports.convertTextToSpeech =
  exports.listTtsVoices =
    void 0;
const functions = require('firebase-functions/v2');
const text_to_speech_1 = require('@google-cloud/text-to-speech');
// Setup client
const textToSpeechClient = new text_to_speech_1.TextToSpeechClient();
// Text-to-Speech Functions for us-west1 region
exports.listTtsVoices = functions.https.onCall(
  {
    region: 'us-west1',
  },
  async request => {
    var _a;
    try {
      const languageCode =
        ((_a = request.data) === null || _a === void 0
          ? void 0
          : _a.languageCode) || 'en-US';
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
exports.convertTextToSpeech = functions.https.onCall(
  {
    region: 'us-west1',
  },
  async request => {
    var _a, _b, _c;
    try {
      const text =
        ((_a = request.data) === null || _a === void 0 ? void 0 : _a.text) ||
        'No text provided';
      const voice =
        ((_b = request.data) === null || _b === void 0 ? void 0 : _b.voice) ||
        'en-US-Wavenet-F';
      const languageCode =
        ((_c = request.data) === null || _c === void 0
          ? void 0
          : _c.languageCode) || 'en-US';
      functions.logger.info('Converting text to speech', {
        text,
        voice,
        languageCode,
      });
      const [result] = await textToSpeechClient.synthesizeSpeech({
        input: { text },
        voice: { name: voice, languageCode },
        audioConfig: { audioEncoding: 'MP3' },
      });
      // Return as base64 since we can't directly return binary data
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
exports.convertSsmlToSpeech = functions.https.onCall(
  {
    region: 'us-west1',
  },
  async request => {
    var _a, _b, _c;
    try {
      const ssml =
        ((_a = request.data) === null || _a === void 0 ? void 0 : _a.ssml) ||
        '<speak>No text provided</speak>';
      const voice =
        ((_b = request.data) === null || _b === void 0 ? void 0 : _b.voice) ||
        'en-US-Wavenet-F';
      const languageCode =
        ((_c = request.data) === null || _c === void 0
          ? void 0
          : _c.languageCode) || 'en-US';
      functions.logger.info('Converting SSML to speech', {
        ssml,
        voice,
        languageCode,
      });
      const [result] = await textToSpeechClient.synthesizeSpeech({
        input: { ssml },
        voice: { name: voice, languageCode },
        audioConfig: { audioEncoding: 'MP3' },
      });
      // Return as base64 since we can't directly return binary data
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
//# sourceMappingURL=index.js.map
