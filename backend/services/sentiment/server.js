const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sentimentAnalysis } = require('./sentiment-service');

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 8080;

// Apply middleware
app.use(helmet()); // Adds security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('combined')); // HTTP request logging

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'sentiment-analysis' });
});

// Sentiment analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Missing required parameter: text' 
      });
    }
    
    const result = await sentimentAnalysis(text);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({ 
      error: 'Failed to analyze sentiment',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Sentiment Analysis Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

