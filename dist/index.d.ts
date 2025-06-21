/**
 * Aixtiv Symphony Integration Gateway
 *
 * This is the main entry point for the Aixtiv Symphony Integration Gateway.
 * It combines the integration gateway functionality with the API functionality.
 */
import { Express } from 'express';
import { AgentManager } from './agents/AgentManager';
export declare const agentManager: AgentManager;
export declare function createUnifiedServer(): Express;
export default createUnifiedServer;
