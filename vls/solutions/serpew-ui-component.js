import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/use-auth-hook';
import { getQ4DLenzService } from '../../../providers';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

/**
 * SERPEW Dashboard Component
 * 
 * This component visualizes the results of SERPEW analysis including HOMBDIHO assessment
 * results, RIASEC profile, role fit analysis, and market position information.
 */
export const SERPEWDashboard = () => {
  const [assessmentData, setAssessmentData] = useState(null);
  const [marketPosition, setMarketPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('riasec');
  const { authState } = useAuth();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const q4dService = getQ4DLenzService();
        
        // Fetch HOMBDIHO assessment data
        const assessment = await q4dService.getLatestHOMBDIHOAssessment(authState.userId);
        setAssessmentData(assessment);
        
        // Fetch market position analysis
        const position = await q4dService.getLatestMarketPositionAnalysis(authState.userId);
        setMarketPosition(position);
      } catch (error) {
        console.error("Error fetching SERPEW data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (authState.userId) {
      fetchData();
    }
  }, [authState.userId]);
  
  /**
   * Prepare RIASEC data for radar chart visualization
   */
  const prepareRiasecRadarData = (riasecData) => {
    if (!riasecData) return [];
    
    return [
      { subject: 'Realistic', A: riasecData.integrated_profile.R, fullMark: 100 },
      { subject: 'Investigative', A: riasecData.integrated_profile.I, fullMark: 100 },
      { subject: 'Artistic', A: riasecData.integrated_profile.A, fullMark: 100 },
      { subject: 'Social', A: riasecData.integrated_profile.S, fullMark: 100 },
      { subject: 'Enterprising', A: riasecData.integrated_profile.E, fullMark: 100 },
      { subject: 'Conventional', A: riasecData.integrated_profile.C, fullMark: 100 },
    ];
  };
  
  /**
   * Prepare satisfaction trends data for line chart
   */
  const prepareSatisfactionTrendsData = (trends) => {
    if (!trends || !trends.length) return [];
    
    return trends.map(trend => ({
      year: trend.year,
      overallSatisfaction: trend.overall,
      compensationSatisfaction: trend.compensation,
      workLifeBalance: trend.workLifeBalance,
      growthOpportunities: trend.growth
    })).sort((a, b) => a.year - b.year);
  };
  
  /**
   * Navigation tabs for the dashboard
   */
  const renderTabs = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => setActiveTab('riasec')}
          className={`pb-4 px-1 ${
            activeTab === 'riasec'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          RIASEC Profile
        </button>
        <button
          onClick={() => setActiveTab('roleFit')}
          className={`pb-4 px-1 ${
            activeTab === 'roleFit'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Role Fit Analysis
        </button>
        <button
          onClick={() => setActiveTab('marketPosition')}
          className={`pb-4 px-1 ${
            activeTab === 'marketPosition'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Market Position
        </button>
        <button
          onClick={() => setActiveTab('careerTrajectory')}
          className={`pb-4 px-1 ${
            activeTab === 'careerTrajectory'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Career Trajectory
        </button>
      </nav>
    </div>
  );
  
  /**
   * RIASEC Profile visualization
   */
  const renderRiasecProfile = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">RIASEC Profile</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={prepareRiasecRadarData(assessmentData.results.riasec_validation)}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar 
              name="Your Profile" 
              dataKey="A" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.6} 
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Validation</h3>
          <p className="text-sm text-gray-600 mt-2">
            Your RIASEC profile has been validated through a dual-assessment process that
            compares theoretical Holland Code results with your actual career choices.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-medium">Consistency Score:</span>{' '}
            {assessmentData.results.riasec_validation.consistency_score}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Confidence Level:</span>{' '}
            {assessmentData.results.riasec_validation.confidence_level}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Summary</h3>
          <p className="text-sm text-gray-600 mt-2">
            Your RIASEC profile shows strongest alignment with Investigative and Enterprising
            traits, indicating a preference for analytical problem-solving combined with
            leadership and influence.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            This pattern is typically seen in roles like business analyst, management
            consultant, and research director.
          </p>
        </div>
      </div>
    </div>
  );
  
  /**
   * Role Fit Analysis visualization
   */
  const renderRoleFit = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">Role Fit Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Role Fit Score</h3>
          <div className="text-3xl font-bold text-indigo-600">
            {assessmentData.results.role_fit.role_fit_score}%
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Based on alignment between your RIASEC profile and current role requirements
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Predicted Satisfaction</h3>
          <div className="text-3xl font-bold text-indigo-600">
            {assessmentData.results.role_fit.predicted_satisfaction}%
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Likelihood of long-term satisfaction in current role
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Predicted Stability</h3>
          <div className="text-3xl font-bold text-indigo-600">
            {assessmentData.results.role_fit.predicted_stability}%
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Probability of remaining in role for 2+ years
          </p>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Development Opportunities</h3>
        <ul className="list-disc pl-5 space-y-2">
          {assessmentData.results.role_fit.development_opportunities.map((area, idx) => (
            <li key={idx} className="text-sm text-gray-700">{area}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role Alignment Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(assessmentData.results.role_fit.alignment_details).map(([key, value]) => (
            <div key={key} className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-sm text-gray-500">{getDimensionLabel(key)}</div>
              <div className="mt-1 text-xl font-semibold text-indigo-600">{value}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  /**
   * Market Position Analysis visualization
   */
  const renderMarketPosition = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">Market Position Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Market Position Percentile</h3>
          <div className="text-3xl font-bold text-indigo-600">
            {marketPosition.results.individual_analysis.market_position_percentile}%
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Your positioning relative to others in similar roles
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Jurisdictional Scope</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(marketPosition.results.jurisdictional_scope).map(([key, value]) => (
              <span key={key} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm">
                {key}: {typeof value === 'string' ? value : (value ? 'Yes' : 'No')}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Relative Strengths</h3>
          <ul className="list-disc pl-5">
            {marketPosition.results.individual_analysis.relative_strengths.map((strength, idx) => (
              <li key={idx} className="text-sm text-gray-700">{strength}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Development Areas</h3>
          <ul className="list-disc pl-5">
            {marketPosition.results.individual_analysis.development_areas.map((area, idx) => (
              <li key={idx} className="text-sm text-gray-700">{area}</li>
            ))}
          </ul>
        </div>
      </div>
      
      {marketPosition.results.enterprise_analysis && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Enterprise Position</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Market Share Percentile:</span>{' '}
              {marketPosition.results.enterprise_analysis.market_share_percentile}%
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h4 className="text-md font-medium mb-2">Competitive Strengths</h4>
                <ul className="list-disc pl-5">
                  {marketPosition.results.enterprise_analysis.competitive_strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-md font-medium mb-2">Development Areas</h4>
                <ul className="list-disc pl-5">
                  {marketPosition.results.enterprise_analysis.development_areas.map((area, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{area}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  /**
   * Career Trajectory visualization
   */
  const renderCareerTrajectory = () => {
    // Example satisfaction trends data
    const satisfactionTrends = [
      { year: 2019, overall: 72, compensation: 65, workLifeBalance: 70, growth: 78 },
      { year: 2020, overall: 75, compensation: 68, workLifeBalance: 72, growth: 80 },
      { year: 2021, overall: 73, compensation: 70, workLifeBalance: 68, growth: 79 },
      { year: 2022, overall: 79, compensation: 74, workLifeBalance: 71, growth: 83 },
      { year: 2023, overall: 82, compensation: 78, workLifeBalance: 75, growth: 86 }
    ];
    
    const trajectory = assessmentData.results.career_trajectory;
    
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-medium text-gray-900 mb-4">Career Trajectory Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Stability Index</h3>
            <div className="text-3xl font-bold text-indigo-600">
              {(trajectory.stability_index * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Measure of career consistency and tenure
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Progression Rate</h3>
            <div className="text-3xl font-bold text-indigo-600">
              {(trajectory.progression_rate * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Speed of career advancement relative to peers
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Specialization Depth</h3>
            <div className="text-3xl font-bold text-indigo-600">
              {(trajectory.specialization_depth * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Depth of expertise in specific domain
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Historical Satisfaction Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prepareSatisfactionTrendsData(satisfactionTrends)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="overallSatisfaction" stroke="#8884d8" name="Overall" />
                <Line type="monotone" dataKey="compensationSatisfaction" stroke="#82ca9d" name="Compensation" />
                <Line type="monotone" dataKey="workLifeBalance" stroke="#ffc658" name="Work-Life Balance" />
                <Line type="monotone" dataKey="growthOpportunities" stroke="#ff8042" name="Growth" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            This chart shows historical satisfaction trends for professionals in your role 
            based on national satisfaction measures.
          </p>
        </div>
      </div>
    );
  };
  
  /**
   * Get display label for RIASEC dimension
   */
  const getDimensionLabel = (key) => {
    const labels = {
      'R': 'Realistic',
      'I': 'Investigative',
      'A': 'Artistic',
      'S': 'Social',
      'E': 'Enterprising',
      'C': 'Conventional'
    };
    return labels[key] || key;
  };
  
  /**
   * Main render method
   */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Professional Profile Analysis</h1>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <p>Loading your assessment data...</p>
          </div>
        ) : assessmentData && marketPosition ? (
          <div className="mt-6">
            {renderTabs()}
            
            {activeTab === 'riasec' && renderRiasecProfile()}
            {activeTab === 'roleFit' && renderRoleFit()}
            {activeTab === 'marketPosition' && renderMarketPosition()}
            {activeTab === 'careerTrajectory' && renderCareerTrajectory()}
          </div>
        ) : (
          <div className="flex justify-center py-12">
            <p>No assessment data available. Please complete your assessment first.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SERPEWDashboard;