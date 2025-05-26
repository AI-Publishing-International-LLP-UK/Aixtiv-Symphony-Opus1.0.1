// File: src/contexts/UserContext.js
import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [userInfo, setUserInfo] = useState({
    uuid: "00001",
    name: "Mr. Phillip Corey Roark",
    role: "CEO / Principal"
  });

  const [copilotInfo, setCopilotInfo] = useState({
    id: "0001",
    name: "QB Lucy",
    status: "Active"
  });

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo, copilotInfo, setCopilotInfo }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

// File: src/contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('default');
  
  // Theme based on Coaching 2100 brandbook
  const themeColors = {
    primary: '#0bb1bb',
    secondary: '#c7b299',
    black: '#000000',
    white: '#ffffff',
    gradientStart: '#FFD700',
    gradientMiddle: '#c7b299',
    gradientEnd: '#50C878'
  };

  // Load font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    document.body.style.fontFamily = 'Montserrat, sans-serif';
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ themeColors, currentTheme, setCurrentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// File: src/contexts/ChatContext.js
import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const userMessage = chatInput;
      setMessages([...messages, { text: userMessage, sender: 'user' }]);
      setChatInput('');
      
      // This would be replaced with actual API call to LLM
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: `Response to: ${userMessage}`, 
          sender: 'ai' 
        }]);
        
        // Simulate speaking if enabled
        if (audioEnabled) {
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 3000);
        }
      }, 1000);
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // This would be replaced with actual speech recognition
      setTimeout(() => {
        setChatInput('How do I integrate with Slack?');
        setIsListening(false);
      }, 3000);
    }
  };

  return (
    <ChatContext.Provider 
      value={{ 
        messages, 
        setMessages, 
        chatInput, 
        setChatInput, 
        isListening, 
        setIsListening,
        isSpeaking,
        setIsSpeaking,
        audioEnabled,
        setAudioEnabled,
        handleSendMessage,
        toggleListening
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}

// File: src/components/Sidebar/SidebarIcon.js
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function SidebarIcon({ item, isSelected, onClick }) {
  const { themeColors } = useTheme();
  
  return (
    <div
      onClick={onClick}
      className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-all duration-300 group relative ${
        isSelected ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-80'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <defs>
          <linearGradient id={`gradient${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={themeColors.gradientStart} stopOpacity={1} />
            <stop offset="50%" stopColor={themeColors.gradientMiddle} stopOpacity={0.8} />
            <stop offset="100%" stopColor={themeColors.gradientEnd} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        {item.isTriangle ? 
          <path d="M12 2L22 20H2L12 2z" stroke={`url(#gradient${item.id})`} strokeWidth="2" fill="none"/> :
          <circle cx="12" cy="12" r="10" stroke={`url(#gradient${item.id})`} strokeWidth="2" fill="none"/>
        }
      </svg>
      
      {/* Icon inside */}
      {item.icon && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          {item.icon}
        </div>
      )}
      
      {/* Tooltip that appears on hover */}
      <div className="absolute left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50">
        <div className="font-bold">{item.name}</div>
        <div>{item.desc}</div>
      </div>
    </div>
  );
}

// File: src/components/Sidebar/Sidebar.js
import React from 'react';
import { MessageSquare, Target, Users, Code, Share2, BookOpen } from 'lucide-react';
import SidebarIcon from './SidebarIcon';

export default function Sidebar({ selectedIcon, setSelectedIcon, toggleAcademyMode }) {
  const sidebarItems = [
    { id: 1, name: 'Communication', desc: 'Automated Communication', icon: <MessageSquare size={18} /> },
    { id: 2, name: 'Growth', desc: 'Growth Revenues', icon: <Target size={18} /> },
    { id: 3, name: 'Services', desc: 'Client Services Innovation', icon: <Users size={18} /> },
    { id: 4, name: 'Automation', desc: 'Organizational Automation', icon: <Code size={18} /> },
    { id: 5, name: 'ROI', desc: 'ROI Dashboard', icon: <Share2 size={18} /> },
    { id: 6, name: 'Wish', desc: 'Your Wish', icon: <BookOpen size={18} /> },
    { id: 7, name: 'Academy', desc: 'Learning & Training', isTriangle: true, icon: null }
  ];

  return (
    <div className="w-14 bg-black flex flex-col items-center justify-center pb-6">
      <div className="flex flex-col items-center space-y-8">
        {sidebarItems.map((item) => (
          <SidebarIcon
            key={item.id}
            item={item}
            isSelected={selectedIcon === item.id}
            onClick={() => item.id === 7 ? toggleAcademyMode() : setSelectedIcon(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// File: src/components/Header/Header.js
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

export default function Header() {
  const { themeColors } = useTheme();
  const { userInfo } = useUser();

  return (
    <div className="h-16 bg-black text-white flex items-center justify-between px-6">
      <div className="font-bold text-2xl tracking-wide" style={{ color: themeColors.primary }}>
        ASOOS
      </div>
      <div className="text-right">
        <div className="font-bold text-lg">{userInfo.name}</div>
        <div className="text-sm" style={{ color: themeColors.primary }}>{userInfo.role}</div>
      </div>
    </div>
  );
}

// File: src/components/Chat/ChatInput.js
import React from 'react';
import { Mic, Send, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';

export default function ChatInput() {
  const { themeColors } = useTheme();
  const { 
    chatInput, 
    setChatInput, 
    isListening, 
    audioEnabled, 
    setAudioEnabled, 
    handleSendMessage, 
    toggleListening 
  } = useChat();

  return (
    <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
      <button 
        onClick={toggleListening}
        className={`p-2 rounded-full transition-colors ${
          isListening 
            ? 'bg-red-100 text-red-500 hover:bg-red-200' 
            : 'text-gray-500 hover:text-cyan-500'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
        style={{
          color: isListening ? undefined : themeColors.primary
        }}
      >
        <Mic className="w-6 h-6" />
      </button>
      
      <input
        type="text"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        placeholder={isListening ? 'Listening...' : 'Type your message...'}
        className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-cyan-500"
        disabled={isListening}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
          }
        }}
      />
      
      <button
        className="p-2 text-gray-500 transition-colors"
        onClick={() => setAudioEnabled(!audioEnabled)}
        title={audioEnabled ? 'Mute responses' : 'Enable audio responses'}
        style={{
          color: themeColors.primary
        }}
      >
        {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
      </button>
      
      <button
        onClick={handleSendMessage}
        disabled={!chatInput.trim() && !isListening}
        className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        style={{
          backgroundColor: chatInput.trim() || isListening ? themeColors.primary : undefined
        }}
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}

// File: src/components/Chat/MessageList.js
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';

export default function MessageList() {
  const { themeColors } = useTheme();
  const { messages } = useChat();

  return (
    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
      {messages.map((msg, index) => (
        <div key={index} className={`max-w-[70%] ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}>
          <div 
            className={`rounded-xl p-3 ${
              msg.sender === 'user' 
                ? 'text-white' 
                : 'bg-gray-100'
            }`}
            style={{
              backgroundColor: msg.sender === 'user' ? themeColors.primary : undefined
            }}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}

// File: src/components/Chat/ChatArea.js
import React from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

export default function ChatArea() {
  return (
    <div className="flex-1 flex flex-col bg-white p-6">
      <MessageList />
      <ChatInput />
    </div>
  );
}

// File: src/components/RightPanel/CopilotHeader.js
import React from 'react';
import { Globe } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useChat } from '../../contexts/ChatContext';

export default function CopilotHeader({ currentLanguage }) {
  const { themeColors } = useTheme();
  const { copilotInfo } = useUser();
  const { isSpeaking } = useChat();

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center">
        <div className="relative w-12 h-12 mr-3" title={`${copilotInfo.name} - Your AI Copilot`}>
          <svg viewBox="0 0 100 100" className={`${isSpeaking ? 'animate-pulse' : ''}`}>
            <defs>
              <linearGradient id="hexAgentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={themeColors.primary} stopOpacity={0.8} />
                <stop offset="50%" stopColor={themeColors.primary} stopOpacity={0.9} />
                <stop offset="100%" stopColor={themeColors.primary} stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <path 
              d="M50 0 L95 25 L95 75 L50 100 L5 75 L5 25 Z" 
              stroke={themeColors.primary}
              strokeWidth="2" 
              fill="url(#hexAgentGradient)"
            />
            <circle cx="50" cy="35" r="10" fill="white" />
            <path d="M30 70 Q50 90 70 70" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        </div>
        
        <div>
          <div className="font-semibold">{copilotInfo.name}</div>
          <div className="text-xs text-gray-500">Copilot: {copilotInfo.status}</div>
        </div>
      </div>
      
      <div className="flex items-center text-xs text-gray-500">
        <Globe size={14} className="mr-1" />
        {currentLanguage.split('-')[0].toUpperCase()}
      </div>
    </div>
  );
}

// File: src/components/RightPanel/ExpandablePanel.js
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ExpandablePanel({ 
  title, 
  isExpanded, 
  onToggle, 
  children 
}) {
  const { themeColors } = useTheme();

  return (
    <div className="m-4 bg-white rounded-lg shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 border-b cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <h3 className="font-bold" style={{ color: themeColors.primary }}>{title}</h3>
        <div className="text-gray-500">
          {isExpanded ? '▼' : '▶️'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

// File: src/components/RightPanel/S2DOPanel.js
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ExpandablePanel from './ExpandablePanel';

export default function S2DOPanel({ isExpanded, onToggle }) {
  const { themeColors } = useTheme();

  return (
    <ExpandablePanel
      title="S2DO's"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: themeColors.primary }}></div>
          <span className="text-sm">Update sales dashboard with Q3 results</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: themeColors.primary }}></div>
          <span className="text-sm">Schedule review meeting with marketing team</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: themeColors.primary }}></div>
          <span className="text-sm">Finalize integration with new CRM system</span>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-bold text-sm mb-2" style={{ color: themeColors.primary }}>Quick Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-500">Open Tasks</div>
            <div className="text-lg font-bold">12</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-500">In Progress</div>
            <div className="text-lg font-bold">5</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-500">Completed Today</div>
            <div className="text-lg font-bold">7</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-500">System Health</div>
            <div className="text-lg font-bold text-green-500">98%</div>
          </div>
        </div>
      </div>
    </ExpandablePanel>
  );
}

// File: src/components/RightPanel/ProjectsPanel.js
import React from 'react';
import ExpandablePanel from './ExpandablePanel';

export default function ProjectsPanel({ isExpanded, onToggle }) {
  return (
    <ExpandablePanel
      title="Phillip's Aixtiv Projects"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        <div className="flex justify-between border-b pb-2">
          <span className="text-sm font-medium">Symphony Integration</span>
          <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded">In Progress</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-sm font-medium">Market Analysis Report</span>
          <span className="text-xs bg-green-100 text-green-800 py-1 px-2 rounded">Completed</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-sm font-medium">Client Presentation</span>
          <span className="text-xs bg-yellow-100 text-yellow-800 py-1 px-2 rounded">Pending</span>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-4 flex justify-between items-center">
        <span>Last updated: Today, 10:42 AM</span>
        <button className="text-blue-600 hover:text-blue-800">View All Projects</button>
      </div>
    </ExpandablePanel>
  );
}

// File: src/components/RightPanel/RightPanel.js
import React, { useState } from 'react';
import CopilotHeader from './CopilotHeader';
import S2DOPanel from './S2DOPanel';
import ProjectsPanel from './ProjectsPanel';
import ExpandablePanel from './ExpandablePanel';

export default function RightPanel({ currentLanguage }) {
  const [expandedPanel, setExpandedPanel] = useState('S2DO');

  return (
    <div className="w-96 bg-gray-50 flex flex-col">
      <CopilotHeader currentLanguage={currentLanguage} />
      
      <S2DOPanel 
        isExpanded={expandedPanel === 'S2DO'}
        onToggle={() => setExpandedPanel(expandedPanel === 'S2DO' ? null : 'S2DO')}
      />
      
      <ProjectsPanel
        isExpanded={expandedPanel === 'Projects'}
        onToggle={() => setExpandedPanel(expandedPanel === 'Projects' ? null : 'Projects')}
      />
      
      <ExpandablePanel
        title="Strategic Executive Projects"
        isExpanded={expandedPanel === 'Strategic'}
        onToggle={() => setExpandedPanel(expandedPanel === 'Strategic' ? null : 'Strategic')}
      >
        <div className="space-y-2">
          <div className="flex justify-between border-b pb-2">
            <span className="text-sm font-medium">AI Implementation Strategy</span>
            <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded">Phase 2</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-sm font-medium">Digital Transformation</span>
            <span className="text-xs bg-purple-100 text-purple-800 py-1 px-2 rounded">Planning</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-sm font-medium">2026 Growth Initiative</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 py-1 px-2 rounded">Research</span>
          </div>
        </div>
      </ExpandablePanel>
      
      <ExpandablePanel
        title="Learning Resources"
        isExpanded={expandedPanel === 'Learning'}
        onToggle={() => setExpandedPanel(expandedPanel === 'Learning' ? null : 'Learning')}
      >
        <div className="space-y-2">
          <div className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
            <div className="text-sm font-medium">AI Leadership Masterclass</div>
            <div className="text-xs text-gray-500">Strategic implementation frameworks</div>
          </div>
          <div className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
            <div className="text-sm font-medium">Executive Communication</div>
            <div className="text-xs text-gray-500">Advanced techniques & case studies</div>
          </div>
          <div className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
            <div className="text-sm font-medium">Future of Work Symposium</div>
            <div className="text-xs text-gray-500">Recordings & presentation materials</div>
          </div>
        </div>
      </ExpandablePanel>
    </div>
  );
}

// File: src/components/IntegrationBar/IntegrationIcon.js
import React from 'react';

export default function IntegrationIcon({ item, index, category }) {
  return (
    <div
      key={`${category}-${index}`}
      className="w-5 h-5 mx-1 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 group relative"
      title={item.name}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <defs>
          <linearGradient id={`integrationGradient-${category}-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={item.gradient?.[0] || '#FFD700'} stopOpacity={1} />
            <stop offset="50%" stopColor={item.gradient?.[1] || '#c7b299'} stopOpacity={0.8} />
            <stop offset="100%" stopColor={item.gradient?.[2] || '#50C878'} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" stroke={`url(#integrationGradient-${category}-${index})`} strokeWidth="2" fill="none"/>
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-600" style={{ fontSize: '8px' }}>
        {item.icon}
      </div>
      
      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-20">
        {item.name}
      </div>
    </div>
  );
}

// File: src/components/IntegrationBar/IntegrationBar.js
import React from 'react';
import { Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import IntegrationIcon from './IntegrationIcon';

export default function IntegrationBar({ setShowSettings, setShowIntegrations }) {
  const { themeColors } = useTheme();
  
  const integrationCategories = [
    {
      name: 'Productivity',
      items: [
        { name: 'Zapier', icon: 'Z' },
        { name: 'Slack', icon: 'S' },
        { name: 'Asana', icon: 'A' }
      ]
    },
    {
      name: 'Dev',
      items: [
        { name: 'GitHub', icon: 'G', gradient: ['#4169e1', '#6b8cde', '#a3b8eb'] },
        { name: 'GitLab', icon: 'GL', gradient: ['#4169e1', '#6b8cde', '#a3b8eb'] },
        { name: 'Jira', icon: 'J', gradient: ['#4169e1', '#6b8cde', '#a3b8eb'] }
      ]
    },
    {
      name: 'LLMs',
      items: [
        { name: 'GPT-4', icon: 'G4', gradient: ['#006850', '#00997a', '#00cca3'] },
        { name: 'Claude', icon: 'C', gradient: ['#006850', '#00997a', '#00cca3'] },
        { name: 'Gemini', icon: 'GM', gradient: ['#006850', '#00997a', '#00cca3'] },
        { name: 'Llama', icon: 'L3', gradient: ['#006850', '#00997a', '#00cca3'] }
      ]
    }
  ];

  return (
    <div className="h-16 bg-gray-100 flex items-center justify-between px-4">
      <div 
        className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:opacity-90 transition-colors"
        onClick={() => setShowSettings(true)}
        style={{ backgroundColor: themeColors.primary }}
      >
        <Settings className="w-5 h-5 text-white" />
      </div>
    
      <div className="flex-1 flex items-center space-x-6 overflow-x-auto justify-center">
        {integrationCategories.map((category, catIndex) => (
          <React.Fragment key={category.name}>
            {catIndex > 0 && <div className="h-6 border-r border-gray-300"></div>}
            
            <div className="flex items-center">
              <div className="text-xs font-medium text-gray-500 mr-2">{category.name}:</div>
              {category.items.map((item, idx) => (
                <IntegrationIcon 
                  key={`${category.name}-${idx}`} 
                  item={item} 
                  index={idx} 
                  category={category.name.toLowerCase()} 
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
      
      <button 
        onClick={() => setShowIntegrations(true)}
        className="flex flex-col items-center justify-center w-20 h-10 rounded-full text-white hover:opacity-90 transition-colors text-xs ml-4"
        style={{ backgroundColor: themeColors.primary }}
      >
        <span>Integration</span>
        <span>Gateway</span>
      </button>
    </div>
  );
}

// File: src/App.js
import React, { useState } from 'react';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import ChatArea from './components/Chat/ChatArea';
import RightPanel from './components/RightPanel/RightPanel';
import IntegrationBar from './components/IntegrationBar/IntegrationBar';
import IntegrationsPage from './pages/IntegrationsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [academyMode, setAcademyMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');

  const toggleAcademyMode = () => {
    setAcademyMode(!academyMode);
  };

  // If showing integrations page, render that
  if (showIntegrations) {
    return (
      <ThemeProvider>
        <IntegrationsPage setShowIntegrations={setShowIntegrations} />
      </ThemeProvider>
    );
  }

  // If showing settings page, render that
  if (showSettings) {
    return (
      <ThemeProvider>
        <UserProvider>
          <SettingsPage 
            setShowSettings={setShowSettings}
            currentLanguage={currentLanguage}
            setCurrentLanguage={setCurrentLanguage}
          />
        </UserProvider>
      </ThemeProvider>
    );
  }

  // Main interface
  return (
    <ThemeProvider>
      <UserProvider>
        <ChatProvider>
          <div className="flex h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
            <Sidebar 
              selectedIcon={selectedIcon} 
              setSelectedIcon={setSelectedIcon} 
              toggleAcademyMode={toggleAcademyMode} 
            />

            <div className="flex-1 flex flex-col">
              <Header />

              <div className="flex-1 flex">
                <ChatArea />
                <RightPanel currentLanguage={currentLanguage} />
              </div>

              <IntegrationBar 
                setShowSettings={setShowSettings} 
                setShowIntegrations={setShowIntegrations} 
              />
            </div>
          </div>
        </ChatProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
