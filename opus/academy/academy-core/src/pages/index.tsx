import React, { useState, useEffect } from 'react';
import { useStore, useAcademyStore } from '../../../../e-commerce/store/StoreContext';

const HomePage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Mock authentication function (would be replaced with actual OAuth)
  const handleAuthLogin = (provider: string) => {
    // In a real implementation, this would redirect to OAuth provider
    console.log(`Authenticating with ${provider}`);
    // For demo purposes, simulate successful authentication
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Academy Module</h1>
      
      {!isAuthenticated ? (
        <div className="auth-form" style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Login to Access</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => handleAuthLogin('Google')}
              style={{ 
                backgroundColor: '#4285F4', 
                color: 'white', 
                padding: '12px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '16px' }}>Sign in with Google</span>
            </button>
            
            <button 
              onClick={() => handleAuthLogin('LinkedIn')}
              style={{ 
                backgroundColor: '#0A66C2', 
                color: 'white', 
                padding: '12px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '16px' }}>Sign in with LinkedIn</span>
            </button>
            
            <button 
              onClick={() => handleAuthLogin('Microsoft')}
              style={{ 
                backgroundColor: '#00A4EF', 
                color: 'white', 
                padding: '12px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '16px' }}>Sign in with Microsoft</span>
            </button>
          </div>
          
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
            Click any button to simulate authentication
          </p>
        </div>
      ) : (
        <div className="academy-content" style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Welcome to the AIXTIV Symphony Academy</h2>
            <button 
              onClick={handleLogout}
              style={{ 
                backgroundColor: '#f44336', 
                color: 'white', 
                padding: '8px 12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
          
          <p>You have successfully authenticated and can now access all academy content.</p>
          
          <div style={{ marginTop: '20px' }}>
            <h3>Available Courses</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              <li style={{ 
                padding: '15px', 
                marginBottom: '10px', 
                backgroundColor: 'white', 
                borderRadius: '4px',
                border: '1px solid #ddd' 
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Introduction to AIXTIV Symphony</h4>
                <p style={{ margin: 0 }}>Learn the basics of the AIXTIV Symphony platform and its capabilities.</p>
              </li>
              <li style={{ 
                padding: '15px', 
                marginBottom: '10px', 
                backgroundColor: 'white', 
                borderRadius: '4px',
                border: '1px solid #ddd' 
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Advanced Visualization Techniques</h4>
                <p style={{ margin: 0 }}>Master the visualization center and create immersive experiences.</p>
              </li>
              <li style={{ 
                padding: '15px', 
                marginBottom: '10px', 
                backgroundColor: 'white', 
                borderRadius: '4px',
                border: '1px solid #ddd' 
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Dr. Memoria Anthology Integration</h4>
                <p style={{ margin: 0 }}>Connect your learning journey with the Dr. Memoria Anthology system.</p>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
