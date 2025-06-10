/**
 * Agent Skills Component
 * Demonstrates how to use LangChain for agent capabilities
 */

import React, { useState, useCallback, useEffect } from 'react';
import useLangChain from '../services/hooks/useLangChain';
import { useMCP } from '../ap/hooks/useMCP';
import { useSallyPortAuth } from '../auth/hooks/useSallyPortAuth';
import speechService from '../services/speech-service';



/**
 * Agent Skills Component
 * Demonstrates AI agent with LangChain and MCP
 */
const AgentSkills= ({
  agentId,
  userId,
  knowledgeIndex = 'aixtiv-docs',
  useVoice = false,
  languageCode = 'en-US',
  voiceName = 'en-US-Wavenet-F',
  initialMessage = '',
}) => {
  // LangChain hook
  const {
    runPrompt,
    runConversation,
    answerWithContext,
    generateSessionId,
    loading,
  } = useLangChain();
  
  // MCP hook for agent communication
  const { 
    sendMessage, 
    getMessageHistory, 
    coherenceLevel,
    updateStateMatrix,
  } = useMCP();
  
  // Auth hook
  const { user } = useSallyPortAuth();
  
  // Local state
  const [sessionId] = useState(() => generateSessionId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialMessage);
  const [processing, setProcessing] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  
  // Initialize agent
  useEffect(() => {
    const setupAgent = async () => {
      try {
        // Prepare agent with LangChain prompt
        const agentPrompt = `
          You are an Aixtiv Symphony AI assistant named {agentName}.
          Your role is to provide helpful, accurate, and friendly responses.
          Your coherence level is currently {coherenceLevel}.
          
          Respond to the user in a way that demonstrates your capabilities.
        `;
        
        const agentConfig = await runPrompt({
          prompt,
          input: {
            agentName,
            coherenceLevel,
          },
        });
        
        // Register agent response in MCP
        await sendMessage(
          agentId,
          userId,
          agentConfig,
          'response',
          { initialized, sessionId }
        );
        
        setAgentReady(true);
        
        // Add initial message if provided
        if (initialMessage) {
          handleSendMessage(initialMessage);
        }
      } catch (error) {
        console.error('Failed to initialize agent:', error);
      }
    };
    
    setupAgent();
  }, [agentId, userId, coherenceLevel, sessionId, sendMessage, runPrompt, initialMessage]);
  
  // Send message to agent
  const handleSendMessage = useCallback(
    async (message=> {
      if (!message.trim() || processing || !agentReady) {
        return;
      }
      
      setProcessing(true);
      
      try {
        // Add user message to messages
        const userMessage = {
          role: 'user',
          content,
          timestamp,
        };
        
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        
        // Reset input
        setInput('');
        
        // Send message to MCP
        await sendMessage(
          userId,
          agentId,
          message,
          'instruction',
          { sessionId }
        );
        
        // Update state matrix
        await updateStateMatrix({
          type: 'user_message',
          message,
          timestamp,
        });
        
        // Process with LangChain
        let response;
        
        if (knowledgeIndex) {
          // Use knowledge retrieval if index is provided
          response = await answerWithContext(message, knowledgeIndex);
        } else {
          // Use conversation memory
          const conversationResult = await runConversation({
            prompt: `
              You are an AI assistant named ${agentId}. 
              Your coherence level is ${coherenceLevel.toFixed(2)}.
              
              Current conversation:
              {chat_history}
              
              Human: {input}
              AI:
            `,
            input: { input: message },
            sessionId,
          });
          
          response = conversationResult.response;
        }
        
        // Add agent response to messages
        const agentMessage = {
          role: 'agent',
          content,
          timestamp,
        };
        
        setMessages((prevMessages) => [...prevMessages, agentMessage]);
        
        // Send agent response to MCP
        await sendMessage(
          agentId,
          userId,
          response,
          'response',
          { sessionId }
        );
        
        // Speak response if voice is enabled
        if (useVoice) {
          const audioContent = await speechService.textToSpeech(
            response,
            { languageCode, voice: voiceName }
          );
          
          await speechService.playAudio(audioContent);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      } finally {
        setProcessing(false);
      }
    },
    [
      processing,
      agentReady,
      userId,
      agentId,
      sessionId,
      knowledgeIndex,
      coherenceLevel,
      answerWithContext,
      runConversation,
      sendMessage,
      updateStateMatrix,
      useVoice,
      languageCode,
      voiceName,
    ]
  );
  
  // Handle voice input
  const handleVoiceInput = useCallback(async () => {
    if (processing || !useVoice) {
      return;
    }
    
    try {
      setProcessing(true);
      
      // Capture speech and convert to text
      const transcript = await speechService.captureAndTranscribe({
        languageCode,
      });
      
      // Set
      setInput(transcript);
      
      // Send message
      await handleSendMessage(transcript);
    } catch (error) {
      console.error('Error with voice input:', error);
    } finally {
      setProcessing(false);
    }
  }, [processing, useVoice, languageCode, handleSendMessage]);
  
  return (
    
      
        {agentId}
        
          Coherence: {coherenceLevel.toFixed(2)}
          
            {agentReady ? 'Ready' : 'Initializing...'}
          
        
      
      
      
        {messages.map((message, index) => (
          
            
              {message.content}
            
            
              {message.timestamp.toLocaleTimeString()}
            
          
        ))}
        
        {(processing || langchainLoading) && (
          Processing...
        )}
      
      
      
         setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={processing || !agentReady}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage(input);
            }
          }}
        />
        
         handleSendMessage(input)}
          disabled={!input.trim() || processing || !agentReady}
        >
          Send
        
        
        {useVoice && (
          
            🎤
          
        )}
      
    
  );
};

export default AgentSkills;