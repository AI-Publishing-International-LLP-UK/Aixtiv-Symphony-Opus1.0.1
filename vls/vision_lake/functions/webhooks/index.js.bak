const express = require('express');
const rewardRoutes = require('./rewardRoutes');

const app = express();
app.use(express.json());

// Mount reward routes
app.use('/rewards', rewardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    services: {
      drCypriot: process.env.DR_CYPRIOT_ENDPOINT ? 'configured' : 'missing',
      towerChain: process.env.TOWER_CHAIN_ENDPOINT ? 'configured' : 'missing',
      queenMint: process.env.QUEEN_MINT_ENDPOINT ? 'configured' : 'missing'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = app;

