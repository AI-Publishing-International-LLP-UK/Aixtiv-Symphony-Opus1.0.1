const express = require('express');
const router = express.Router();
const { aiRewardsWebhook } = require('./aiRewards');

// Achievement webhook routes
router.post('/expert-level', async (req, res) => {
  req.body.achievement = {
    type: 'EXPERT_LEVEL',
    details: {
      humanHours: 10000,
      agentHours: 100,
      reward: {
        aiTokens: 1000,
        nftType: 'ExpertLevel',
        congratulations: ['VisionLakeCommander', 'BacasuMayor']
      }
    }
  };
  await aiRewardsWebhook(req, res);
});

router.post('/solution-cert', async (req, res) => {
  req.body.achievement = {
    type: 'SOLUTION_CERTIFICATE',
    details: {
      solution: req.body.solution,
      reward: {
        aiTokens: 500,
        nftType: 'SolutionCertificate',
        congratulations: ['DrLucy_CompassField']
      }
    }
  };
  await aiRewardsWebhook(req, res);
});

router.post('/lifecycle-cert', async (req, res) => {
  req.body.achievement = {
    type: 'LIFECYCLE_CERTIFICATE',
    details: {
      lifecycle: req.body.lifecycle,
      reward: {
        aiTokens: 500,
        nftType: 'LifecycleCertificate',
        congratulations: ['DrLucy_CompassField']
      }
    }
  };
  await aiRewardsWebhook(req, res);
});

router.post('/knowledge-app', async (req, res) => {
  req.body.achievement = {
    type: 'KNOWLEDGE_APPLICATION',
    details: {
      diDcCard: req.body.cardId,
      application: req.body.application,
      reward: {
        aiTokens: 100,
        nftType: 'KnowledgeApplication',
        congratulations: ['DrLucy_CompassField']
      }
    }
  };
  await aiRewardsWebhook(req, res);
});

module.exports = router;

