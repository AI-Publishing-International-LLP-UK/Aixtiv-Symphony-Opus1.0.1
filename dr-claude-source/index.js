const Anthropic = require('@anthropic-ai/sdk');

exports.drClaude = async (req, res) => {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const instance_id = process.env.INSTANCE_ID || '01';
    const squadron = process.env.SQUADRON || '04';
    
    // MongoDB HRAICRMS integration
    const user_count = process.env.USER_COUNT || '562000';
    const agent_target = process.env.AGENT_TARGET || '505000';

    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Squadron ${squadron} Dr. Claude ${instance_id}: ${req.body.message || 'HRAICRMS integration test'}`
      }]
    });

    res.json({
      instance: `dr-claude-${instance_id}`,
      squadron: squadron,
      provider: 'anthropic',
      user_count: user_count,
      agent_target: agent_target,
      response: message.content[0].text,
      mongodb_hraicrms: 'operational'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
