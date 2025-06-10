"use strict";
/**
 * ASOOS Integration Gateway - Firebase Functions
 * These functions provide integration between Aixtiv Symphony and various services
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamingSpeechToText = exports.speechToText = exports.convertSsmlToSpeech = exports.convertTextToSpeech = exports.listTtsVoices = void 0;
const functions = require("firebase-functions/v2");
const text_to_speech_1 = require("@google-cloud/text-to-speech");
const speech_1 = require("@google-cloud/speech");
// Export SallyPort Auth Functions
__exportStar(require("./sallyport-auth"), exports);
// Export LangChain Integration Functions
__exportStar(require("./langchain-integration"), exports);
// Export Q4D-Lenz Integration Functions
__exportStar(require("./q4d-lenz-integration"), exports);
// Export Career Expertise Framework Functions
__exportStar(require("./career-expertise-framework"), exports);
// Setup Text-to-Speech client
const textToSpeechClient = new text_to_speech_1.TextToSpeechClient();
// Setup Speech-to-Text client
const speechToTextClient = new speech_1.SpeechClient();
// Text-to-Speech Functions for us-west1 region
exports.listTtsVoices = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    var _a;
    try {
        const languageCode = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.languageCode) || 'en-US';
        functions.logger.info('Listing TTS voices', { languageCode });
        const [response] = await textToSpeechClient.listVoices({ languageCode });
        return { voices: response.voices || [] };
    }
    catch (error) {
        functions.logger.error('Error listing TTS voices', error);
        throw new functions.https.HttpsError('internal', 'Error listing TTS voices');
    }
});
exports.convertTextToSpeech = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    var _a, _b, _c;
    try {
        const text = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.text) || 'No text provided';
        const voice = ((_b = request.data) === null || _b === void 0 ? void 0 : _b.voice) || 'en-US-Wavenet-F';
        const languageCode = ((_c = request.data) === null || _c === void 0 ? void 0 : _c.languageCode) || 'en-US';
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
            }
            else {
                // Otherwise assume it's a Uint8Array or Buffer-compatible
                base64Content = Buffer.from(result.audioContent).toString('base64');
            }
        }
        return { audioContent: base64Content };
    }
    catch (error) {
        functions.logger.error('Error converting text to speech', error);
        throw new functions.https.HttpsError('internal', 'Error converting text to speech');
    }
});
exports.convertSsmlToSpeech = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    var _a, _b, _c;
    try {
        const ssml = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.ssml) || '<speak>No text provided</speak>';
        const voice = ((_b = request.data) === null || _b === void 0 ? void 0 : _b.voice) || 'en-US-Wavenet-F';
        const languageCode = ((_c = request.data) === null || _c === void 0 ? void 0 : _c.languageCode) || 'en-US';
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
            }
            else {
                // Otherwise assume it's a Uint8Array or Buffer-compatible
                base64Content = Buffer.from(result.audioContent).toString('base64');
            }
        }
        return { audioContent: base64Content };
    }
    catch (error) {
        functions.logger.error('Error converting SSML to speech', error);
        throw new functions.https.HttpsError('internal', 'Error converting SSML to speech');
    }
});
// Speech-to-Text Functions for us-west1 region
exports.speechToText = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    var _a, _b, _c, _d, _e;
    try {
        // Get audio content as base64
        const audioContent = (_a = request.data) === null || _a === void 0 ? void 0 : _a.audioContent;
        const languageCode = ((_b = request.data) === null || _b === void 0 ? void 0 : _b.languageCode) || 'en-US';
        const encoding = ((_c = request.data) === null || _c === void 0 ? void 0 : _c.encoding) || 'LINEAR16';
        const sampleRateHertz = ((_d = request.data) === null || _d === void 0 ? void 0 : _d.sampleRateHertz) || 16000;
        const alternativeLanguageCodes = ((_e = request.data) === null || _e === void 0 ? void 0 : _e.alternativeLanguageCodes) || [];
        if (!audioContent) {
            throw new functions.https.HttpsError('invalid-argument', 'Audio content is required');
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
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
        };
        // Decode base64
        const audio = {
            content: audioContent,
        };
        // Perform speech recognition
        const [response] = await speechToTextClient.recognize({
            config,
            audio,
        });
        // Process the results
        const transcriptions = response.results.map(result => ({
            transcript: result.alternatives[0].transcript,
            confidence: result.alternatives[0].confidence,
        }));
        return { transcriptions };
    }
    catch (error) {
        functions.logger.error('Error converting speech to text', error);
        throw new functions.https.HttpsError('internal', 'Error converting speech to text');
    }
});
// Add the streaming API for longer audio files
exports.streamingSpeechToText = functions.https.onCall({
    region: 'us-west1',
    timeoutSeconds: 540, // 9 minutes for longer processing
}, async (request) => {
    var _a, _b, _c, _d;
    try {
        // Get audio content as array of base64 chunks
        const audioChunks = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.audioChunks) || [];
        const languageCode = ((_b = request.data) === null || _b === void 0 ? void 0 : _b.languageCode) || 'en-US';
        const encoding = ((_c = request.data) === null || _c === void 0 ? void 0 : _c.encoding) || 'LINEAR16';
        const sampleRateHertz = ((_d = request.data) === null || _d === void 0 ? void 0 : _d.sampleRateHertz) || 16000;
        if (!audioChunks.length) {
            throw new functions.https.HttpsError('invalid-argument', 'Audio chunks are required');
        }
        functions.logger.info('Processing streaming speech to text', {
            chunkCount: audioChunks.length,
            languageCode,
            encoding,
            sampleRateHertz,
        });
        // Configure the request
        const config = {
            languageCode,
            encoding,
            sampleRateHertz,
            model: 'default',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
        };
        // Process each chunk
        const transcriptionResults = [];
        for (const chunk of audioChunks) {
            const audio = {
                content: chunk,
            };
            const [response] = await speechToTextClient.recognize({
                config,
                audio,
            });
            response.results.forEach(result => {
                transcriptionResults.push({
                    transcript: result.alternatives[0].transcript,
                    confidence: result.alternatives[0].confidence,
                });
            });
        }
        return { transcriptions: transcriptionResults };
    }
    catch (error) {
        functions.logger.error('Error with streaming speech to text', error);
        throw new functions.https.HttpsError('internal', 'Error with streaming speech to text');
    }
});
//# sourceMappingURL=index.js.map