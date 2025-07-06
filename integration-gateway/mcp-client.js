#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/studio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

class IntegrationGatewayMCPServer {
    constructor() {
        this.server = new Server({
            name: 'asoos-integration-gateway',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });

        this.setupToolHandlers();
        this.setupErrorHandler();
    }

    setupErrorHandler() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };

        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'test_gateway_connection',
                        description: 'Test connection to the integration gateway',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                endpoint: {
                                    type: 'string',
                                    description: 'Gateway endpoint to test',
                                    default: '/'
                                }
                            }
                        }
                    },
                    {
                        name: 'get_civilization_status',
                        description: 'Get current civilization status from the gateway',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'test_gateway_connection':
                        return await this.testGatewayConnection(args?.endpoint || '/');
                    
                    case 'get_civilization_status':
                        return await this.getCivilizationStatus();
                    
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`
                        }
                    ],
                    isError: true
                };
            }
        });
    }

    async testGatewayConnection(endpoint) {
        const gatewayUrl = process.env.INTEGRATION_GATEWAY_URL;
        const oauthToken = process.env.OAUTH_TOKEN;

        if (!gatewayUrl) {
            throw new Error('INTEGRATION_GATEWAY_URL environment variable not set');
        }

        const url = `${gatewayUrl}${endpoint}`;
        const headers = {};
        
        if (oauthToken) {
            headers['Authorization'] = `Bearer ${oauthToken}`;
        }

        try {
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `Gateway connection successful!\nStatus: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Failed to connect to gateway: ${error.message}`);
        }
    }

    async getCivilizationStatus() {
        const gatewayUrl = process.env.INTEGRATION_GATEWAY_URL;
        const oauthToken = process.env.OAUTH_TOKEN;

        if (!gatewayUrl) {
            throw new Error('INTEGRATION_GATEWAY_URL environment variable not set');
        }

        const url = `${gatewayUrl}/civilization/status`;
        const headers = {};
        
        if (oauthToken) {
            headers['Authorization'] = `Bearer ${oauthToken}`;
        }

        try {
            const response = await fetch(url, { headers });
            const data = await response.json();
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `Civilization Status:\n${JSON.stringify(data, null, 2)}`
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Failed to get civilization status: ${error.message}`);
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('ASOOS Integration Gateway MCP Server running on stdio');
    }
}

const server = new IntegrationGatewayMCPServer();
server.run().catch(console.error);
