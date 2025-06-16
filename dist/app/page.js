"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const firms = [
    'Goldman Sachs',
    'JPMorgan Chase',
    'Morgan Stanley',
    'Bank of America',
    'Wells Fargo',
    'Citigroup'
];
function Home() {
    const [selectedFirm, setSelectedFirm] = (0, react_1.useState)('');
    return (<div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-600 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center text-white">
        <h1 className="text-6xl font-bold mb-6">Vision Lake</h1>
        <p className="text-xl mb-4">AI-Powered Financial Workflow Simulation Platform</p>
        <p className="text-lg mb-8 opacity-90">
          Experience the future of financial operations with our live AI squadron demonstrations
        </p>
        
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Select Your Firm for Demo Access</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {firms.map((firm) => (<button key={firm} onClick={() => setSelectedFirm(firm)} className={`p-4 rounded-lg border-2 transition-all duration-200 ${selectedFirm === firm
                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-100'
                : 'border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50'}`}>
                {firm}
              </button>))}
          </div>
          
          {selectedFirm && (<link_1.default href={`/preview/${encodeURIComponent(selectedFirm)}`} className="inline-block bg-yellow-400 text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors duration-200">
              Enter Vision Lake Demo for {selectedFirm}
            </link_1.default>)}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">🤖 AI Squadrons</h3>
            <p className="opacity-90">Watch autonomous AI agents collaborate on complex financial workflows in real-time</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">⚡ 10x Speed</h3>
            <p className="opacity-90">Experience accelerated simulations showing months of work completed in minutes</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">🔒 Secure Testing</h3>
            <p className="opacity-90">All demonstrations use synthetic data with no exposure to proprietary systems</p>
          </div>
        </div>
      </div>
    </div>);
}
