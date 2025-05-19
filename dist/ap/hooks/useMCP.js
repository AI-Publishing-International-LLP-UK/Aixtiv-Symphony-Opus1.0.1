/**
 * MCP (Model Context Protocol) React Hook
 * Provides easy access to MCP functionality in React components
 * Version: 2.0.0
 */

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { 
  ModelContextProtocol, 
  MCPConfig, 
  AgentConfig, 
  MessageContext, 
  createMCP
} from '../model-context-protocol';

/**
 * MCP Hook Context Interface
 */
) => MessageContext[];
  
  /** Register a new agent */
  registerAgent: (agent=> Promise;
  
  /** Get coherence level */
  coherenceLevel;
  
  /** Update state matrix */
  updateStateMatrix: (newState=> Promise;
}

/**
 * Default MCP context value
 */
const defaultMCPContext= {
  mcp,
  isInitialized,
  error,
  agents,
  sendMessage=> {
    throw new Error('MCP not initialized');
  },
  receiveMessages=> {
    throw new Error('MCP not initialized');
  },
  getMessageHistory=> [],
  registerAgent=> false,
  coherenceLevel,
  updateStateMatrix=> ({}),
};

/**
 * MCP Context
 */
const MCPContext = createContext(defaultMCPContext);

/**
 * MCP Provider Props
 */


/**
 * MCP Provider Component
 */
export const MCPProvider= ({
  children,
  config,
  autoInitialize = true,
}) => {
  const [mcp, setMCP] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [coherenceLevel, setCoherenceLevel] = useState(0);
  
  /**
   * Initialize MCP
   */
  const initialize = useCallback(async () => {
    try {
      setError(null);
      
      const mcpInstance = createMCP(config);
      setMCP(mcpInstance);
      
      const initResult = await mcpInstance.initialize();
      setIsInitialized(true);
      setCoherenceLevel(initResult.coherenceLevel);
      
      // Load agents
      setAgents(mcpInstance.listAgents());
      
      return true;
    } catch (err) {
      setError(err;
      return false;
    }
  }, [config]);
  
  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }
  }, [autoInitialize, initialize]);
  
  /**
   * Send a message to an agent
   */
  const sendMessage = useCallback(
    async (
      senderId,
      recipientId,
      message,
      contextType: MessageContext['type'] = 'instruction',
      metadata= {}
    )=> {
      if (!mcp || !isInitialized) {
        throw new Error('MCP not initialized');
      }
      
      return mcp.sendMessage(senderId, recipientId, message, contextType, metadata);
    },
    [mcp, isInitialized]
  );
  
  /**
   * Receive messages for an agent
   */
  const receiveMessages = useCallback(
    async (agentId)=> {
      if (!mcp || !isInitialized) {
        throw new Error('MCP not initialized');
      }
      
      return mcp.receiveMessages(agentId);
    },
    [mcp, isInitialized]
  );
  
  /**
   * Get message history
   */
  const getMessageHistory = useCallback(
    (filterOptions?: {
      senderId?;
      recipientId?;
      type?: MessageContext['type'];
      limit?;
    }) => {
      if (!mcp || !isInitialized) {
        return [];
      }
      
      return mcp.getMessageHistory(filterOptions);
    },
    [mcp, isInitialized]
  );
  
  /**
   * Register a new agent
   */
  const registerAgent = useCallback(
    async (agent)=> {
      if (!mcp || !isInitialized) {
        throw new Error('MCP not initialized');
      }
      
      const success = await mcp.registerAgent(agent);
      
      if (success) {
        setAgents(mcp.listAgents());
      }
      
      return success;
    },
    [mcp, isInitialized]
  );
  
  /**
   * Update state matrix
   */
  const updateStateMatrix = useCallback(
    async (newState)=> {
      if (!mcp || !isInitialized) {
        throw new Error('MCP not initialized');
      }
      
      const result = await mcp.updateStateMatrix(newState);
      setCoherenceLevel(result.coherenceLevel);
      
      return result;
    },
    [mcp, isInitialized]
  );
  
  /**
   * Context value
   */
  const value= {
    mcp,
    isInitialized,
    error,
    agents,
    sendMessage,
    receiveMessages,
    getMessageHistory,
    registerAgent,
    coherenceLevel,
    updateStateMatrix,
  };
  
  return {children};
};

/**
 * Use MCP Hook
 */
export const useMCP = () => {
  const context = useContext(MCPContext);
  
  if (context === undefined) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  
  return context;
};

/**
 * MCP Configuration Hook Props
 */


/**
 * MCP Configuration Hook
 */
export const useMCPConfig = (props= {}) => {
  const {
    autoPollInterval = 5000,
    agentId,
    onMessageReceived,
    stateUpdateInterval = 10000,
  } = props;
  
  const { 
    receiveMessages, 
    updateStateMatrix,
    isInitialized
  } = useMCP();
  
  /**
   * Auto-poll for messages
   */
  useEffect(() => {
    if (!isInitialized || !agentId || !autoPollInterval) {
      return () => {};
    }
    
    const pollMessages = async () => {
      try {
        const messages = await receiveMessages(agentId);
        
        if (messages.length > 0 && onMessageReceived) {
          onMessageReceived(messages);
        }
      } catch (error) {
        console.error('Failed to poll for messages:', error);
      }
    };
    
    // Poll immediately
    pollMessages();
    
    // Set up polling interval
    const intervalId = setInterval(pollMessages, autoPollInterval);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [isInitialized, agentId, autoPollInterval, onMessageReceived, receiveMessages]);
  
  /**
   * Auto-update state matrix
   */
  useEffect(() => {
    if (!isInitialized || !stateUpdateInterval) {
      return () => {};
    }
    
    const updateState = async () => {
      try {
        await updateStateMatrix({
          type: 'periodic_update',
          timestamp,
        });
      } catch (error) {
        console.error('Failed to update state matrix:', error);
      }
    };
    
    // Set up update interval
    const intervalId = setInterval(updateState, stateUpdateInterval);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [isInitialized, stateUpdateInterval, updateStateMatrix]);
};

export default useMCP;