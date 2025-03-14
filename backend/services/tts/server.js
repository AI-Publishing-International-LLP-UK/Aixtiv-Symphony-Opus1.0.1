const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const ttsService = require('./tts-service');
const logger = require('../../monitoring/logger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('combined')); // HTTP request logging

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'tts-service' });
});

// TTS Endpoints
app.post('/synthesize', async (req, res) => {
  try {
    const { text, voice = 'en-US-Neural2-F' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    logger.info(`Synthesizing speech for text with length: ${text.length}`);
    
    const audioContent = await ttsService.synthesizeSpeech(text, voice);
    
    res.set('Content-Type', 'audio/mp3');
    res.status(200).send(audioContent);
  } catch (error) {
    logger.error(`Error synthesizing speech: ${error.message}`);
    res.status(500).json({ error: 'Failed to synthesize speech', details: error.message });
  }
});

// Voice list endpoint
app.get('/voices', async (req, res) => {
  try {
    const voices = await ttsService.listVoices();
    res.status(200).json(voices);
  } catch (error) {
    logger.error(`Error listing voices: ${error.message}`);
    res.status(500).json({ error: 'Failed to list voices', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    error: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`TTS service running on port ${PORT}`);
});

module.exports = app; // Export for testing

