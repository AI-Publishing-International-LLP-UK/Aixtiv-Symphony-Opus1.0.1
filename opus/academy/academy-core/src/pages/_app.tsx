import React, { useState, useEffect } from 'react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { StoreProvider } from '../../../e-commerce/store/StoreContext';
import { AcademyStoreIntegration } from '../../../e-commerce/store/integration/AcademyStoreIntegration';

// Define a layout component to include the store integration
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    isAuthenticated: boolean;
    academyAccess: boolean;
  } | null>(null);

  // Simulate loading the user from localStorage or an API
  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setCurrentUser({
            ...parsedUser,
            academyAccess: true // Assume all logged-in users have academy access for now
          });
        } catch (e) {
          console.error('Failed to parse saved user:', e);
        }
      }
    }
  }, []);

  // Handle authentication requirements
  const handleAuthRequired = () => {
    alert('Please log in to continue');
    // You would typically redirect to a login page here
  };

  return (
    <div className="academy-layout">
      <main className="academy-main">
        {children}
      </main>
      <aside className="academy-sidebar">
        <AcademyStoreIntegration 
          showFeaturedOnly={true}
          maxProducts={2}
          currentUser={currentUser}
          onAuthRequired={handleAuthRequired}
        />
      </aside>
      <style jsx>{`
        .academy-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #f7f9fc;
        }
        
        @media (min-width: 1024px) {
          .academy-layout {
            flex-direction: row;
          }
        }
        
        .academy-main {
          flex: 1;
          padding: 20px;
        }
        
        .academy-sidebar {
          width: 100%;
          padding: 20px;
          background-color: white;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.05);
        }
        
        @media (min-width: 1024px) {
          .academy-sidebar {
            width: 350px;
            height: 100vh;
            overflow-y: auto;
            position: sticky;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
};

function AcademyApp({ Component, pageProps }: AppProps) {
  return (
    <StoreProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </StoreProvider>
  );
}

export default AcademyApp;
