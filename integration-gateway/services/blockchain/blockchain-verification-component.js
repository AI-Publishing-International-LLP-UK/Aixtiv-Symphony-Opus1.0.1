"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
// Mock API service - would be replaced with actual Firebase API in production
const api = {
    getVerificationStats: () => __awaiter(void 0, void 0, void 0, function* () {
        // Simulate API call
        yield new Promise(resolve => setTimeout(resolve, 1000));
        return {
            agents: {
                total: 125,
                verified: 118,
                pending: 5,
                failed: 2
            },
            flights: {
                total: 2450,
                verified: 2398,
                pending: 47,
                failed: 5
            },
            deliverables: {
                total: 1835,
                verified: 1790,
                pending: 41,
                failed: 4
            },
            nfts: {
                total: 78,
                verified: 78,
                pending: 0,
                failed: 0
            },
            lastSync: new Date().toISOString(),
            syncHistory: [
                { date: '2025-02-20', verified: 4125, repaired: 12, failed: 2 },
                { date: '2025-02-21', verified: 4135, repaired: 15, failed: 1 },
                { date: '2025-02-22', verified: 4148, repaired: 8, failed: 3 },
                { date: '2025-02-23', verified: 4155, repaired: 10, failed: 0 },
                { date: '2025-02-24', verified: 4170, repaired: 5, failed: 1 },
                { date: '2025-02-25', verified: 4182, repaired: 7, failed: 0 },
                { date: '2025-02-26', verified: 4198, repaired: 9, failed: 2 },
                { date: '2025-02-27', verified: 4211, repaired: 3, failed: 1 },
                { date: '2025-02-28', verified: 4229, repaired: 6, failed: 0 }
            ]
        };
    }),
    getRecentDiscrepancies: () => __awaiter(void 0, void 0, void 0, function* () {
        // Simulate API call
        yield new Promise(resolve => setTimeout(resolve, 800));
        return [
            {
                id: 'disc_123',
                collection: 'flights',
                documentId: 'flight_1234567',
                timestamp: '2025-02-27T12:34:56Z',
                status: 'repaired',
                discrepancyType: 'status_mismatch'
            },
            {
                id: 'disc_124',
                collection: 'agents',
                documentId: 'agent_dr_sabina03',
                timestamp: '2025-02-26T09:12:34Z',
                status: 'failed',
                discrepancyType: 'missing_blockchain'
            },
            {
                id: 'disc_125',
                collection: 'deliverables',
                documentId: 'deliv_89012',
                timestamp: '2025-02-28T14:22:10Z',
                status: 'pending',
                discrepancyType: 'data_mismatch'
            }
        ];
    }),
    startVerification: (collection, documentId) => __awaiter(void 0, void 0, void 0, function* () {
        // Simulate API call
        yield new Promise(resolve => setTimeout(resolve, 1200));
        return {
            success: true,
            status: 'verification_started'
        };
    })
};
// Colors
const COLORS = {
    verified: '#10B981', // Green
    pending: '#F59E0B', // Yellow
    failed: '#EF4444', // Red
    repaired: '#3B82F6', // Blue
    total: '#6366F1' // Indigo
};
const BlockchainVerificationDashboard = () => {
    const [stats, setStats] = (0, react_1.useState)(null);
    const [discrepancies, setDiscrepancies] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [verifyingItem, setVerifyingItem] = (0, react_1.useState)(null);
    const [activeIndex, setActiveIndex] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        const fetchData = () => __awaiter(void 0, void 0, void 0, function* () {
            setLoading(true);
            try {
                const [statsData, discrepanciesData] = yield Promise.all([
                    api.getVerificationStats(),
                    api.getRecentDiscrepancies()
                ]);
                setStats(statsData);
                setDiscrepancies(discrepanciesData);
            }
            catch (error) {
                console.error('Error fetching blockchain data:', error);
            }
            finally {
                setLoading(false);
            }
        });
        fetchData();
        // Refresh data every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);
    const handleVerify = (collection, documentId) => __awaiter(void 0, void 0, void 0, function* () {
        setVerifyingItem(`${collection}/${documentId}`);
        try {
            yield api.startVerification(collection, documentId);
            // Refresh discrepancies
            const newDiscrepancies = yield api.getRecentDiscrepancies();
            setDiscrepancies(newDiscrepancies);
        }
        catch (error) {
            console.error('Error starting verification:', error);
        }
        finally {
            setVerifyingItem(null);
        }
    });
    const handlePieEnter = (_, index) => {
        setActiveIndex(index);
    };
    const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
        return (<g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#888">
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#333" className="text-xl font-bold">
          {value}
        </text>
        <text x={cx} y={cy} dy={25} textAnchor="middle" fill="#999">
          {`(${(percent * 100).toFixed(1)}%)`}
        </text>
        <recharts_1.Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 5} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
      </g>);
    };
    // If data is still loading, show skeleton loader
    if (loading) {
        return (<div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (<div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      </div>);
    }
    // Calculate summary data for pie chart
    const summaryData = stats ? [
        { name: 'Verified', value: stats.agents.verified + stats.flights.verified + stats.deliverables.verified + stats.nfts.verified },
        { name: 'Pending', value: stats.agents.pending + stats.flights.pending + stats.deliverables.pending + stats.nfts.pending },
        { name: 'Failed', value: stats.agents.failed + stats.flights.failed + stats.deliverables.failed + stats.nfts.failed }
    ] : [];
    return (<div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center space-x-2 mb-6">
        <lucide_react_1.Shield className="h-6 w-6 text-indigo-600"/>
        <h2 className="text-xl font-bold text-gray-800">Blockchain Verification Dashboard</h2>
      </div>
      
      {stats && (<>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Agents Card */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Agents</p>
                  <p className="text-2xl font-bold">{stats.agents.total}</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <lucide_react_1.Shield className="h-6 w-6 text-indigo-600"/>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs">{stats.agents.verified}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                  <span className="text-xs">{stats.agents.pending}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs">{stats.agents.failed}</span>
                </div>
              </div>
            </div>
            
            {/* Flights Card */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Flights</p>
                  <p className="text-2xl font-bold">{stats.flights.total}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <lucide_react_1.Shield className="h-6 w-6 text-blue-600"/>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs">{stats.flights.verified}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                  <span className="text-xs">{stats.flights.pending}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs">{stats.flights.failed}</span>
                </div>
              </div>
            </div>
            
            {/* Deliverables Card */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Deliverables</p>
                  <p className="text-2xl font-bold">{stats.deliverables.total}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <lucide_react_1.Shield className="h-6 w-6 text-green-600"/>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs">{stats.deliverables.verified}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                  <span className="text-xs">{stats.deliverables.pending}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs">{stats.deliverables.failed}</span>
                </div>
              </div>
            </div>
            
            {/* NFTs Card */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Agent NFTs</p>
                  <p className="text-2xl font-bold">{stats.nfts.total}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <lucide_react_1.Shield className="h-6 w-6 text-purple-600"/>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs">{stats.nfts.verified}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                  <span className="text-xs">{stats.nfts.pending}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs">{stats.nfts.failed}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Verification Status Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Verification Status</h3>
              <div className="h-64">
                <recharts_1.ResponsiveContainer width="100%" height="100%">
                  <recharts_1.PieChart>
                    <recharts_1.Pie activeIndex={activeIndex} activeShape={renderActiveShape} data={summaryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" onMouseEnter={handlePieEnter}>
                      {summaryData.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={index === 0 ? COLORS.verified : index === 1 ? COLORS.pending : COLORS.failed}/>))}
                    </recharts_1.Pie>
                    <recharts_1.Tooltip />
                    <recharts_1.Legend layout="horizontal" verticalAlign="bottom" align="center" formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}/>
                  </recharts_1.PieChart>
                </recharts_1.ResponsiveContainer>
              </div>
            </div>
            
            {/* Sync History Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Sync History</h3>
              <div className="h-64">
                <recharts_1.ResponsiveContainer width="100%" height="100%">
                  <recharts_1.BarChart data={stats.syncHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                    <recharts_1.XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                    <recharts_1.YAxis tick={{ fontSize: 12 }}/>
                    <recharts_1.Tooltip formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]} labelFormatter={(label) => `Date: ${label}`}/>
                    <recharts_1.Legend />
                    <recharts_1.Bar dataKey="verified" fill={COLORS.verified} name="Verified"/>
                    <recharts_1.Bar dataKey="repaired" fill={COLORS.repaired} name="Repaired"/>
                    <recharts_1.Bar dataKey="failed" fill={COLORS.failed} name="Failed"/>
                  </recharts_1.BarChart>
                </recharts_1.ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Recent Discrepancies */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recent Discrepancies</h3>
              <div className="text-sm text-gray-500 flex items-center">
                <lucide_react_1.Clock className="h-4 w-4 mr-1"/>
                Last Sync: {new Date(stats.lastSync).toLocaleString()}
              </div>
            </div>
            
            {discrepancies.length === 0 ? (<div className="flex flex-col items-center justify-center py-6 text-center">
                <lucide_react_1.ShieldCheck className="h-12 w-12 text-green-500 mb-2"/>
                <p className="text-gray-600">No discrepancies found. All records are in sync!</p>
              </div>) : (<div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collection
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document ID
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issue Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detected
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {discrepancies.map((item) => (<tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.collection === 'agents' && <div className="w-6 h-6 flex-shrink-0 text-indigo-600"><lucide_react_1.Shield size={16}/></div>}
                            {item.collection === 'flights' && <div className="w-6 h-6 flex-shrink-0 text-blue-600"><lucide_react_1.Shield size={16}/></div>}
                            {item.collection === 'deliverables' && <div className="w-6 h-6 flex-shrink-0 text-green-600"><lucide_react_1.Shield size={16}/></div>}
                            <div className="ml-2">
                              <div className="text-sm font-medium text-gray-900">
                                {item.collection.charAt(0).toUpperCase() + item.collection.slice(1)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="font-mono">{item.documentId}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.discrepancyType.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${item.status === 'repaired' ? 'bg-green-100 text-green-800' :
                        item.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleVerify(item.collection, item.documentId)} className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none flex items-center justify-center" disabled={verifyingItem === `${item.collection}/${item.documentId}`}>
                            {verifyingItem === `${item.collection}/${item.documentId}` ? (<>
                                <lucide_react_1.RefreshCcw className="h-4 w-4 mr-1 animate-spin"/>
                                Verifying...
                              </>) : (<>
                                <lucide_react_1.ArrowDownUp className="h-4 w-4 mr-1"/>
                                Verify
                              </>)}
                          </button>
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>)}
          </div>
        </>)}
    </div>);
};
exports.default = BlockchainVerificationDashboard;
