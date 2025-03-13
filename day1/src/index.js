require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors());

// API version
const API_VERSION = '1.0.0';

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint for basic verification 
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Integration Gateway is running',
    service: 'integration-gateway',
    version: '1.0.0'
  });
});

// Version endpoint
app.get('/version', (req, res) => {
  res.status(200).json({
    version: API_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Test data endpoint
app.post('/api/data', (req, res) => {
  try {
    const data = req.body;
    res.status(200).json({
      success: true,
      message: 'Data received successfully',
      data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to process data',
      error: error.message
    });
  }
});

// Error handling for 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

app.listen(port, () => {
  console.log(`Integration Gateway listening on port ${port}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

