'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface WorkflowTask {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed';
  agent: string;
  progress: number;
}

export default function PreviewFirmPage() {
  const params = useParams();
  const firm = decodeURIComponent(params.firm as string);
  const [tasks, setTasks] = useState<WorkflowTask[]>([
    { id: '1', title: 'Risk Assessment Analysis', status: 'completed', agent: 'AI-Agent-Alpha', progress: 100 },
    { id: '2', title: 'Portfolio Optimization', status: 'processing', agent: 'AI-Agent-Beta', progress: 67 },
    { id: '3', title: 'Compliance Review', status: 'processing', agent: 'AI-Agent-Gamma', progress: 34 },
    { id: '4', title: 'Market Data Integration', status: 'pending', agent: 'AI-Agent-Delta', progress: 0 },
    { id: '5', title: 'Client Report Generation', status: 'pending', agent: 'AI-Agent-Epsilon', progress: 0 }
  ]);
  
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      
      // Simulate task progress
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.status === 'processing' && task.progress < 100) {
            const newProgress = Math.min(task.progress + Math.random() * 5, 100);
            return {
              ...task,
              progress: newProgress,
              status: newProgress === 100 ? 'completed' : 'processing'
            };
          }
          if (task.status === 'pending' && Math.random() < 0.1) {
            return { ...task, status: 'processing', progress: 5 };
          }
          return task;
        })
      );
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'pending': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const totalTasks = tasks.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Vision Lake Pilot Access Granted</h1>
            <p className="text-xl text-gray-300">
              Live AI Squadron Demo for <span className="text-yellow-400 font-semibold">{firm}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono">{time.toLocaleTimeString()}</p>
            <p className="text-sm text-gray-400">Simulation Time: 10x Speed</p>
          </div>
        </div>
        
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Task Progress</h3>
            <p className="text-3xl font-bold text-green-400">{completedTasks}/{totalTasks}</p>
            <p className="text-sm text-gray-400">Workflows Completed</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Active Agents</h3>
            <p className="text-3xl font-bold text-blue-400">5</p>
            <p className="text-sm text-gray-400">AI Squadrons Deployed</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Efficiency Gain</h3>
            <p className="text-3xl font-bold text-yellow-400">10x</p>
            <p className="text-sm text-gray-400">Speed Multiplier</p>
          </div>
        </div>
        
        {/* Live Workflow Monitor */}
        <div className="bg-gray-800/30 backdrop-blur-md rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Live Workflow Monitor</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-gray-400">Assigned to: {task.agent}</p>
                  </div>
                  <span className={`font-bold ${getStatusColor(task.status)}`}>
                    {task.status.toUpperCase()}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-1">{Math.round(task.progress)}% Complete</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Security Notice */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">🔒 Security Notice</h3>
          <p className="text-gray-300">
            This is a controlled demonstration environment. All data shown is synthetic and anonymized. 
            No proprietary systems, client data, or confidential business logic are exposed during this simulation.
          </p>
        </div>
        
        {/* Navigation */}
        <div className="flex justify-center">
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
          >
            ← Return to Vision Lake Main
          </Link>
        </div>
      </div>
    </div>
  );
}

