import * as functions from "firebase-functions/v2";
import {TextToSpeechClient} from "@google-cloud/text-to-speech";

// Setup client
const textToSpeechClient = new TextToSpeechClient();

// Text-to-Speech Functions for us-west1 region
export const listTtsVoices = functions.https.onCall({
  region: "us-west1",
}, async (request) => {
  try {
    const languageCode = request.data?.languageCode || "en-US";

    functions.logger.info("Listing TTS voices", {languageCode});

    const [response] = await textToSpeechClient.listVoices({languageCode});
    return {voices: response.voices || []};
  } catch (error) {
    functions.logger.error("Error listing TTS voices", error);
    throw new functions.https.HttpsError("internal", "Error listing TTS voices");
  }
});

export const convertTextToSpeech = functions.https.onCall({
  region: "us-west1",
}, async (request) => {
  try {
    const text = request.data?.text || "No text provided";
    const voice = request.data?.voice || "en-US-Wavenet-F";
    const languageCode = request.data?.languageCode || "en-US";

    functions.logger.info("Converting text to speech", {
      text, voice, languageCode,
    });

    const [result] = await textToSpeechClient.synthesizeSpeech({
      input: {text},
      voice: {name: voice, languageCode},
      audioConfig: {audioEncoding: "MP3"},
    });

    // Return as base64 since we can't directly return binary data
    // Check the type of audioContent and handle accordingly
    let base64Content = null;
    if (result.audioContent) {
      // If it's already a string, it might be base64 already
      if (typeof result.audioContent === "string") {
        base64Content = result.audioContent;
      } else {
        // Otherwise assume it's a Uint8Array or Buffer-compatible
        base64Content = Buffer.from(result.audioContent).toString("base64");
      }
    }
    return {audioContent: base64Content};
  } catch (error) {
    functions.logger.error("Error converting text to speech", error);
    throw new functions.https.HttpsError("internal", "Error converting text to speech");
  }
});

export const convertSsmlToSpeech = functions.https.onCall({
  region: "us-west1",
}, async (request) => {
  try {
    const ssml = request.data?.ssml || "<speak>No text provided</speak>";
    const voice = request.data?.voice || "en-US-Wavenet-F";
    const languageCode = request.data?.languageCode || "en-US";

    functions.logger.info("Converting SSML to speech", {
      ssml, voice, languageCode,
    });

    const [result] = await textToSpeechClient.synthesizeSpeech({
      input: {ssml},
      voice: {name: voice, languageCode},
      audioConfig: {audioEncoding: "MP3"},
    });

    // Return as base64 since we can't directly return binary data
    // Check the type of audioContent and handle accordingly
    let base64Content = null;
    if (result.audioContent) {
      // If it's already a string, it might be base64 already
      if (typeof result.audioContent === "string") {
        base64Content = result.audioContent;
      } else {
        // Otherwise assume it's a Uint8Array or Buffer-compatible
        base64Content = Buffer.from(result.audioContent).toString("base64");
      }
    }
    return {audioContent: base64Content};
  } catch (error) {
    functions.logger.error("Error converting SSML to speech", error);
    throw new functions.https.HttpsError("internal", "Error converting SSML to speech");
  }
});
