/**
 * Speech Service
 * Provides client-side access to Text-to-Speech and Speech-to-Text services
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

export 

export 

/**
 * Speech Service for Text-to-Speech and Speech-to-Text
 */
class SpeechService {
  functions = getFunctions(undefined, 'us-west1');

  /**
   * Convert text to speech
   * @param text The text to convert to speech
   * @param options Options for text-to-speech conversion
   * @returns Base64-encoded audio data
   */
  async textToSpeech(text, options= {}){
    const convertTextToSpeech = httpsCallable(this.functions, 'convertTextToSpeech');
    
    const result = await convertTextToSpeech({
      text,
      voice: options.voice || 'en-US-Wavenet-F',
      languageCode: options.languageCode || 'en-US',
    });
    
    const { audioContent } = result.data as { audioContent: string };
    return audioContent;
  }

  /**
   * Convert SSML to speech
   * @param ssml The SSML to convert to speech
   * @param options Options for text-to-speech conversion
   * @returns Base64-encoded audio data
   */
  async ssmlToSpeech(ssml, options= {}){
    const convertSsmlToSpeech = httpsCallable(this.functions, 'convertSsmlToSpeech');
    
    const result = await convertSsmlToSpeech({
      ssml,
      voice: options.voice || 'en-US-Wavenet-F',
      languageCode: options.languageCode || 'en-US',
    });
    
    const { audioContent } = result.data as { audioContent: string };
    return audioContent;
  }

  /**
   * List available voices
   * @param languageCode The language code to filter voices by
   * @returns List of available voices
   */
  async listVoices(languageCode?){
    const listTtsVoices = httpsCallable(this.functions, 'listTtsVoices');
    
    const result = await listTtsVoices({
      languageCode: languageCode || 'en-US',
    });
    
    const { voices } = result.data as { voices: VoiceInfo[] };
    return voices;
  }

  /**
   * Convert speech to text
   * @param audioContent Base64-encoded audio data
   * @param options Options for speech-to-text conversion
   * @returns Transcription results
   */
  async speechToText(
    audioContent, 
    options= {}
  ){ transcript; confidence: number }[]> {
    const speechToText = httpsCallable(this.functions, 'speechToText');
    
    const result = await speechToText({
      audioContent,
      languageCode: options.languageCode || 'en-US',
      encoding: options.encoding || 'LINEAR16',
      sampleRateHertz,
      alternativeLanguageCodes,
    });
    
    const { transcriptions } = result.data as {
      transcriptions: { transcript; confidence: number }[];
    };
    
    return transcriptions;
  }

  /**
   * Stream audio for speech-to-text conversion
   * @param audioChunks Array of base64-encoded audio chunks
   * @param options Options for speech-to-text conversion
   * @returns Transcription results
   */
  async streamingSpeechToText(
    audioChunks, 
    options= {}
  ){ transcript; confidence: number }[]> {
    const streamingSpeechToText = httpsCallable(
      this.functions,
      'streamingSpeechToText'
    );
    
    const result = await streamingSpeechToText({
      audioChunks,
      languageCode: options.languageCode || 'en-US',
      encoding: options.encoding || 'LINEAR16',
      sampleRateHertz,
    });
    
    const { transcriptions } = result.data as {
      transcriptions: { transcript; confidence: number }[];
    };
    
    return transcriptions;
  }
  
  /**
   * Capture audio from the microphone and convert to text
   * @param options Options for speech-to-text conversion
   * @returns Promise that resolves with the transcription
   */
  captureAndTranscribe(options= {}){
    return new Promise((resolve, reject) => {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        reject(new Error('MediaRecorder is not supported in this browser'));
        return;
      }
      
      let mediaRecorder;
      const audioChunks= [];
      
      // Request microphone access
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Create media recorder
          mediaRecorder = new MediaRecorder(stream);
          
          // Listen for data available events
          mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
              audioChunks.push(event.data);
            }
          });
          
          // Listen for stop event
          mediaRecorder.addEventListener('stop', async () => {
            try {
              // Convert audio blobs to base64
              const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
              const reader = new FileReader();
              
              reader.onloadend = async () => {
                try {
                  // Extract base64 data
                  const base64Audio = (reader.result
                    .split(',')[1];
                  
                  // Send to speech-to-text
                  const transcriptions = await this.speechToText(
                    base64Audio,
                    options
                  );
                  
                  // Get the transcript with highest confidence
                  const bestTranscription = transcriptions.reduce(
                    (best, current) => {
                      return current.confidence > best.confidence 
                        ? current 
                        ;
                    },
                    { transcript: '', confidence: 0 }
                  );
                  
                  resolve(bestTranscription.transcript);
                } catch (error) {
                  reject(error);
                }
              };
              
              reader.onerror = error => {
                reject(error);
              };
              
              reader.readAsDataURL(audioBlob);
              
              // Stop all tracks
              stream.getTracks().forEach(track => track.stop());
            } catch (error) {
              reject(error);
            }
          });
          
          // Start recording
          mediaRecorder.start();
          
          // Record for 10 seconds or until stopped externally
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 10000);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
  
  /**
   * Play audio from base64-encoded data
   * @param audioContent Base64-encoded audio data
   * @returns Promise that resolves when the audio finishes playing
   */
  playAudio(audioContent){
    return new Promise((resolve, reject) => {
      try {
        // Create an audio element
        const audio = new Audio();
        
        // Set the source to the base64 data
        audio.src = `data:audio/mp3;base64,${audioContent}`;
        
        // Listen for ended event
        audio.addEventListener('ended', () => {
          resolve();
        });
        
        // Listen for error event
        audio.addEventListener('error', error => {
          reject(error);
        });
        
        // Play the audio
        audio.play();
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const speechService = new SpeechService();
export default speechService;