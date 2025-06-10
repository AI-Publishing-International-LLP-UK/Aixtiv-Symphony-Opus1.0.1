import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ArrowDownUp,
  Search,
  RefreshCcw,
} from 'lucide-react';

// Mock API service - would be replaced with actual Firebase API in production
const api = {
  getVerificationStats=> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      agents: {
        total,
        verified,
        pending,
        failed,
      },
      flights: {
        total,
        verified,
        pending,
        failed,
      },
      deliverables: {
        total,
        verified,
        pending,
        failed,
      },
      nfts: {
        total,
        verified,
        pending,
        failed,
      },
      lastSync,
      syncHistory: [
        { date: '2025-02-20', verified, repaired, failed: 2 },
        { date: '2025-02-21', verified, repaired, failed: 1 },
        { date: '2025-02-22', verified, repaired, failed: 3 },
        { date: '2025-02-23', verified, repaired, failed: 0 },
        { date: '2025-02-24', verified, repaired, failed: 1 },
        { date: '2025-02-25', verified, repaired, failed: 0 },
        { date: '2025-02-26', verified, repaired, failed: 2 },
        { date: '2025-02-27', verified, repaired, failed: 1 },
        { date: '2025-02-28', verified, repaired, failed: 0 },
      ],
    };
  },
  getRecentDiscrepancies=> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    return [
      {
        id: 'disc_123',
        collection: 'flights',
        documentId: 'flight_1234567',
        timestamp: '2025-02-27T12:34:56Z',
        status: 'repaired',
        discrepancyType: 'status_mismatch',
      },
      {
        id: 'disc_124',
        collection: 'agents',
        documentId: 'agent_dr_sabina03',
        timestamp: '2025-02-26T09:12:34Z',
        status: 'failed',
        discrepancyType: 'missing_blockchain',
      },
      {
        id: 'disc_125',
        collection: 'deliverables',
        documentId: 'deliv_89012',
        timestamp: '2025-02-28T14:22:10Z',
        status: 'pending',
        discrepancyType: 'data_mismatch',
      },
    ];
  },
  startVerification=> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
      success,
      status: 'verification_started',
    };
  },
};

// Colors
const COLORS = {
  verified: '#10B981', // Green
  pending: '#F59E0B', // Yellow
  failed: '#EF4444', // Red
  repaired: '#3B82F6', // Blue
  total: '#6366F1', // Indigo
};

const BlockchainVerificationDashboard = () => {
  const [stats, setStats] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingItem, setVerifyingItem] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, discrepanciesData] = await Promise.all([
          api.getVerificationStats(),
          api.getRecentDiscrepancies(),
        ]);

        setStats(statsData);
        setDiscrepancies(discrepanciesData);
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (collection, documentId) => {
    setVerifyingItem(`${collection}/${documentId}`);

    try {
      await api.startVerification(collection, documentId);

      // Refresh discrepancies
      const newDiscrepancies = await api.getRecentDiscrepancies();
      setDiscrepancies(newDiscrepancies);
    } catch (error) {
      console.error('Error starting verification:', error);
    } finally {
      setVerifyingItem(null);
    }
  };

  const handlePieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const renderActiveShape = props => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value,
    } = props;

    return (
      
        
          {payload.name}
        
        
          {value}
        
        
          {`(${(percent * 100).toFixed(1)}%)`}
        
        
      
    );
  };

  // If data is still loading, show skeleton loader
  if (loading) {
    return (
      
        
          
          
        

        
          {[1, 2, 3, 4].map(i => (
            
          ))}
        

        
          
          
        
      
    );
  }

  // Calculate summary data for pie chart
  const summaryData = stats
    ? [
        {
          name: 'Verified',
          value:
            stats.agents.verified +
            stats.flights.verified +
            stats.deliverables.verified +
            stats.nfts.verified,
        },
        {
          name: 'Pending',
          value:
            stats.agents.pending +
            stats.flights.pending +
            stats.deliverables.pending +
            stats.nfts.pending,
        },
        {
          name: 'Failed',
          value:
            stats.agents.failed +
            stats.flights.failed +
            stats.deliverables.failed +
            stats.nfts.failed,
        },
      ]
    ;

  return (
    
      
        
        
          Blockchain Verification Dashboard
        
      

      {stats && (
        <>
          
            {/* Agents Card */}
            
              
                
                  Agents
                  {stats.agents.total}
                
                
                  
                
              
              
                
                  
                  {stats.agents.verified}
                
                
                  
                  {stats.agents.pending}
                
                
                  
                  {stats.agents.failed}
                
              
            

            {/* Flights Card */}
            
              
                
                  Flights
                  {stats.flights.total}
                
                
                  
                
              
              
                
                  
                  {stats.flights.verified}
                
                
                  
                  {stats.flights.pending}
                
                
                  
                  {stats.flights.failed}
                
              
            

            {/* Deliverables Card */}
            
              
                
                  
                    Deliverables
                  
                  
                    {stats.deliverables.total}
                  
                
                
                  
                
              
              
                
                  
                  {stats.deliverables.verified}
                
                
                  
                  {stats.deliverables.pending}
                
                
                  
                  {stats.deliverables.failed}
                
              
            

            {/* NFTs Card */}
            
              
                
                  
                    Agent NFTs
                  
                  {stats.nfts.total}
                
                
                  
                
              
              
                
                  
                  {stats.nfts.verified}
                
                
                  
                  {stats.nfts.pending}
                
                
                  
                  {stats.nfts.failed}
                
              
            
          

          
            {/* Verification Status Chart */}
            
              
                Verification Status
              
              
                
                  
                    
                      {summaryData.map((entry, index) => (
                        
                      ))}
                    
                    
                     (
                        {value}
                      )}
                    />
                  
                
              
            

            {/* Sync History Chart */}
            
              Sync History
              
                
                  
                    
                    
                    
                     [
                        value,
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]}
                      labelFormatter={label => `Date: ${label}`}
                    />
                    
                    
                    
                    
                  
                
              
            
          

          {/* Recent Discrepancies */}
          
            
              Recent Discrepancies
              
                
                Last Sync: {new Date(stats.lastSync).toLocaleString()}
              
            

            {discrepancies.length === 0 ? (
              
                
                
                  No discrepancies found. All records are in sync!
                
              
            ) ="overflow-x-auto">
                
                  
                    
                      
                        Collection
                      
                      
                        Document ID
                      
                      
                        Issue Type
                      
                      
                        Status
                      
                      
                        Detected
                      
                      
                        Actions
                      
                    
                  
                  
                    {discrepancies.map(item => (
                      
                        
                          
                            {item.collection === 'agents' && (
                              
                                
                              
                            )}
                            {item.collection === 'flights' && (
                              
                                
                              
                            )}
                            {item.collection === 'deliverables' && (
                              
                                
                              
                            )}
                            
                              
                                {item.collection.charAt(0).toUpperCase() +
                                  item.collection.slice(1)}
                              
                            
                          
                        
                        
                          {item.documentId}
                        
                        
                          
                            {item.discrepancyType.replace('_', ' ')}
                          
                        
                        
                          
                            {item.status}
                          
                        
                        
                          {new Date(item.timestamp).toLocaleString()}
                        
                        
                          
                              handleVerify(item.collection, item.documentId)
                            }
                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none flex items-center justify-center"
                            disabled={
                              verifyingItem ===
                              `${item.collection}/${item.documentId}`
                            }
                          >
                            {verifyingItem ===
                            `${item.collection}/${item.documentId}` ? (
                              <>
                                
                                Verifying...
                              
                            ) ="h-4 w-4 mr-1" />
                                Verify
                              
                            )}
                          
                        
                      
                    ))}
                  
                
              
            )}
          
        
      )}
    
  );
};

export default BlockchainVerificationDashboard;
