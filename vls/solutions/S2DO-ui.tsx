import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';

// Mock data - in a real app, this would come from your SD20 service
const pendingActions = [
  {
    id: 'action-123',
    action: 'S2DO:Review:Content',
    description: 'Review blog post about blockchain technology',
    initiator: {
      name: 'Content Assistant AI',
      isAgent: true
    },
    metadata: {
      createdAt: Date.now() - 3600000,
      priority: 'high',
      domain: 'Content'
    }
  },
  {
    id: 'action-456',
    action: 'S2DO:Approve:Budget',
    description: 'Approve Q2 marketing budget',
    initiator: {
      name: 'John Manager',
      isAgent: false
    },
    metadata: {
      createdAt: Date.now() - 7200000,
      priority: 'critical',
      domain: 'Finance'
    }
  },
  {
    id: 'action-789',
    action: 'S2DO:Verify:Compliance',
    description: 'Verify GDPR compliance for new user data collection',
    initiator: {
      name: 'Compliance Bot',
      isAgent: true
    },
    metadata: {
      createdAt: Date.now() - 14400000,
      priority: 'medium',
      domain: 'Legal'
    }
  }
];

// Main component
const SD20Dashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [scannerActive, setScannerActive] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  
  // Format the action for display
  const formatAction = (action) => {
    return action.replace('S2DO:', '').replace(':', ' ');
  };
  
  // Handle scanning a QR code
  const handleScan = (data) => {
    setScannerActive(false);
    
    // In a real app, this would process the QR code data
    alert(`QR Code scanned: ${data}`);
  };
  
  // Render action priority indicator
  const renderPriority = (priority) => {
    const colors = {
      low: 'bg-gray-200 text-gray-800',
      medium: 'bg-blue-200 text-blue-800',
      high: 'bg-orange-200 text-orange-800',
      critical: 'bg-red-200 text-red-800'
    };
    
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };
  
  // Render avatar with agent indicator
  const renderAvatar = (initiator) => {
    return (
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
          {initiator.name.charAt(0)}
        </div>
        {initiator.isAgent && (
          <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" 
               title="AI Agent">
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SD20 Dashboard</h1>
        <p className="text-gray-600">Manage verification requests and completed actions</p>
      </div>
      
      {/* Action tabs */}
      <div className="flex border-b mb-4">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Actions
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed Actions
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'nfts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('nfts')}
        >
          Achievement NFTs
        </button>
      </div>
      
      {/* Scan button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {activeTab === 'pending' ? 'Actions Requiring Your Verification' : 
           activeTab === 'completed' ? 'Recently Completed Actions' : 
           'Your Achievement NFTs'}
        </h2>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
          onClick={() => setScannerActive(true)}
        >
          <Camera size={18} className="mr-2" />
          Scan to Verify
        </button>
      </div>
      
      {/* Action list */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingActions.map(action => (
            <div 
              key={action.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedAction(action)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  {renderAvatar(action.initiator)}
                  <span className="ml-2 font-medium text-gray-900">{formatAction(action.action)}</span>
                </div>
                {renderPriority(action.metadata.priority)}
              </div>
              <p className="text-gray-600 mb-2">{action.description}</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>From: {action.initiator.name}</span>
                <span>
                  {new Date(action.metadata.createdAt).toLocaleTimeString()} · {action.metadata.domain}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTab === 'completed' && (
        <div className="text-center py-8 text-gray-500">
          <p>Completed actions will appear here</p>
        </div>
      )}
      
      {activeTab === 'nfts' && (
        <div className="text-center py-8 text-gray-500">
          <p>Your achievement NFTs will appear here</p>
        </div>
      )}
      
      {/* Action detail modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">{formatAction(selectedAction.action)}</h3>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSelectedAction(null)}
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="font-medium text-gray-800">Description</p>
              <p className="text-gray-600">{selectedAction.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="font-medium text-gray-800">Initiator</p>
                <div className="flex items-center">
                  {renderAvatar(selectedAction.initiator)}
                  <span className="ml-2 text-gray-600">{selectedAction.initiator.name}</span>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-800">Domain</p>
                <p className="text-gray-600">{selectedAction.metadata.domain}</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Created</p>
                <p className="text-gray-600">{new Date(selectedAction.metadata.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">Priority</p>
                <p className="text-gray-600">{renderPriority(selectedAction.metadata.priority)}</p>
              </div>
            </div>
            
            <div className="border-t pt-4 flex justify-end space-x-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                onClick={() => setSelectedAction(null)}
              >
                Reject
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => {
                  alert(`Action ${selectedAction.id} approved!`);
                  setSelectedAction(null);
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* QR Scanner modal */}
      {scannerActive && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">Scan SD20 QR Code</h3>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setScannerActive(false)}
              >
                ×
              </button>
            </div>
            
            <div className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center mb-4">
              {/* In a real app, this would be a camera view */}
              <Camera size={64} className="text-gray-400" />
            </div>
            
            <p className="text-center text-gray-600 mb-4">
              Point your camera at an SD20 QR code to verify an action
            </p>
            
            <div className="flex justify-center">
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => handleScan('mock-qr-data')}
              >
                Simulate Successful Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SD20Dashboard;
