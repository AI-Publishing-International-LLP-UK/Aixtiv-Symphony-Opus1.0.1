import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const MemoriaArchitectureOverview = () => {
  const [selectedComponent, setSelectedComponent] = useState(null);

  const architectureComponents = [
    {
      name: 'Content Generation Engine',
      complexity: 90,
      readiness: 85,
      description:
        'Implements Roark 5.0 Authorship Model with advanced ethical validation and multi-provider LLM support.',
      key_features: [
        'Ethical content validation',
        'Human creative leadership enforcement',
        'Multi-provider LLM integration',
        'Originality scoring',
      ],
    },
    {
      name: 'Multi-Platform Publishing',
      complexity: 85,
      readiness: 75,
      description:
        'Coordinated publishing across diverse platforms with adaptive content formatting.',
      key_features: [
        'Platform-specific content adaptation',
        'Compliance checking',
        'Analytics-driven publishing',
        'Cross-platform campaign management',
      ],
    },
    {
      name: 'Error Resilience System',
      complexity: 80,
      readiness: 90,
      description:
        'Advanced error tracking, categorization, and automatic recovery mechanisms.',
      key_features: [
        'Detailed error logging',
        'Automatic recovery strategies',
        'System health monitoring',
        'Multi-level error categorization',
      ],
    },
    {
      name: 'Analytics & Learning Engine',
      complexity: 75,
      readiness: 80,
      description:
        'Comprehensive performance analysis and user preference learning system.',
      key_features: [
        'Cross-platform performance tracking',
        'User preference adaptation',
        'Trend analysis',
        'Recommendation generation',
      ],
    },
    {
      name: 'Blockchain IP Management',
      complexity: 70,
      readiness: 60,
      description:
        'Intellectual property tracking and creative work registration system.',
      key_features: [
        'Creative passport generation',
        'Originality verification',
        'IP ownership tracking',
        'Blockchain integration',
      ],
    },
  ];

  const handleComponentSelect = component => {
    setSelectedComponent(component);
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Dr. Memoria's Anthology System Architecture
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={architectureComponents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ payload }) => {
                  if (payload && payload.length) {
                    const component = payload[0].payload;
                    return (
                      <div className="bg-white p-4 rounded shadow">
                        <h3 className="font-bold text-lg">{component.name}</h3>
                        <p className="text-sm text-gray-600">
                          {component.description}
                        </p>
                        <div className="mt-2">
                          <strong>Complexity:</strong> {component.complexity}
                          /100
                          <br />
                          <strong>Readiness:</strong> {component.readiness}/100
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                dataKey="complexity"
                fill="#8884d8"
                name="Complexity"
                onClick={data => handleComponentSelect(data)}
              />
              <Bar
                dataKey="readiness"
                fill="#82ca9d"
                name="Readiness"
                onClick={data => handleComponentSelect(data)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">
            {selectedComponent ? selectedComponent.name : 'Component Details'}
          </h3>

          {selectedComponent ? (
            <div>
              <p className="text-gray-600 mb-4">
                {selectedComponent.description}
              </p>

              <h4 className="font-bold text-lg mb-2">Key Features:</h4>
              <ul className="list-disc list-inside space-y-2">
                {selectedComponent.key_features.map((feature, index) => (
                  <li key={index} className="text-gray-700">
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <strong>Complexity:</strong>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full"
                      style={{ width: `${selectedComponent.complexity}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <strong>Readiness:</strong>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div
                      className="bg-green-600 h-2.5 rounded-full"
                      style={{ width: `${selectedComponent.readiness}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">
              Click on a bar in the chart to see detailed component information.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <h3 className="text-xl font-semibold mb-4">Implementation Strategy</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Modular Architecture</h4>
            <p>
              Loosely coupled components with clear interfaces and dependency
              injection
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Multi-Provider Support</h4>
            <p>Flexible integration of multiple LLM and publishing platforms</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Ethical AI First</h4>
            <p>
              Rigorous validation, human creative leadership, and originality
              enforcement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoriaArchitectureOverview;
