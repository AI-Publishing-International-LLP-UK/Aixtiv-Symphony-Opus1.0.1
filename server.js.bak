const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Vision Lake MCP Production',
    customer_number: '208576',
    timestamp: new Date().toISOString()
  });
});

// MCP Discovery endpoint
app.get('/.well-known/mcp', (req, res) => {
  res.json({
    server_info: {
      name: 'Vision Lake MCP Server',
      version: '1.0.0',
      description: 'Production MCP server for patent filing'
    },
    status: 'operational',
    customer_number: '208576'
  });
});

// OAuth Authorization Endpoints
app.get('/authorize', (req, res) => {
  // Redirect to the proper OAuth authorize endpoint
  const queryString = new URLSearchParams(req.query).toString();
  res.redirect(`/oauth/authorize?${queryString}`);
});

app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, state, scope } = req.query;
  
  res.json({
    access_token: 'vl-mcp-token-208576',
    token_type: 'Bearer',
    customer_number: '208576',
    authorized: true,
    scope: scope || 'patent_filing',
    redirect_uri: redirect_uri,
    state: state,
    expires_in: 3600,
    system: 'Vision Lake MCP Production'
  });
});

app.post('/oauth/token', express.json(), (req, res) => {
  res.json({
    access_token: 'vl-mcp-token-208576',
    token_type: 'Bearer',
    customer_number: '208576',
    expires_in: 3600,
    scope: 'patent_filing'
  });
});

// Patent filing endpoint
app.post('/patents/file', (req, res) => {
  const { patentId, customerNumber, title } = req.body;
  
  res.json({
    status: 'production_filing_ready',
    patentId: patentId,
    customerNumber: customerNumber,
    title: title,
    system: 'Vision Lake MCP Production',
    timestamp: new Date().toISOString()
  });
});

// Server-Sent Events endpoint for Claude MCP
app.get('/sse', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type'
  });

  // Send initial connection event
  res.write('event: connected\n');
  res.write('data: {"type": "connected", "server": "Vision Lake MCP", "customer": "208576", "version": "1.0.0"}\n\n');

  // Send capabilities
  const capabilities = {
    type: 'capabilities',
    tools: [
      {
        name: 'patent_search',
        description: 'Search patent database for prior art and existing patents',
        parameters: {
          query: { type: 'string', description: 'Patent search query' },
          category: { type: 'string', description: 'Patent category' }
        }
      },
      {
        name: 'file_patent',
        description: 'File a new patent application',
        parameters: {
          title: { type: 'string', description: 'Patent title' },
          description: { type: 'string', description: 'Patent description' },
          inventor: { type: 'string', description: 'Inventor name' }
        }
      }
    ],
    resources: [
      {
        name: 'patent_status',
        description: 'Get current patent filing status',
        uri: 'visionlake://patents/status'
      }
    ]
  };

  res.write('event: capabilities\n');
  res.write(`data: ${JSON.stringify(capabilities)}\n\n`);

  // Keep connection alive with periodic pings
  const pingInterval = setInterval(() => {
    res.write('event: ping\n');
    res.write('data: {"type": "ping", "timestamp": "' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(pingInterval);
    console.log('SSE connection closed');
  });
});

app.listen(port, () => {
  console.log(`Vision Lake MCP Production Server running on port ${port}`);
  console.log('Available endpoints:');
  console.log('  Health: /health');
  console.log('  MCP Discovery: /.well-known/mcp');
  console.log('  OAuth Authorize: /oauth/authorize');
  console.log('  OAuth Token: /oauth/token');
  console.log('  SSE Stream: /sse');
  console.log('  Patent Filing: /patents/file');
});
