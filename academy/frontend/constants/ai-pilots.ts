export interface ApiConfiguration {
  endpoint: string
  version: string
  accessLevel: string
  rateLimit: string
  tokenExpiry: string
}

export interface AIPilot {
  id: string
  name: string
  title: string
  specializations: string[]
  knowledgeDomains: string[]
  apiConfig: ApiConfiguration
}

export const AI_PILOTS: AIPilot[] = [
  {
    id: 'dr-grant-01',
    name: 'Dr. Grant 01',
    title: 'CEOs Companion, Advisory & Cyber Intelligence Leader',
    specializations: [
      'Strategic Leadership',
      'Corporate Governance',
      'Executive Decision Making',
      'Business Intelligence',
      'Risk Management'
    ],
    knowledgeDomains: [
      'Corporate Strategy',
      'Board Relations',
      'Stakeholder Management',
      'Executive Communications',
      'Digital Transformation'
    ],
    apiConfig: {
      endpoint: 'api.coaching2100.ai/v1/specialists/dr-grant',
      version: '1.0.0',
      accessLevel: 'Enterprise',
      rateLimit: '1000 requests/min',
      tokenExpiry: '24 hours'
    }
  },
  {
    id: 'dr-burby',
    name: 'Dr. Burby',
    title: 'CFO Excellence & Fiduciary/Legal Risk',
    specializations: [
      'Financial Strategy',
      'Risk Management',
      'Legal Compliance',
      'Corporate Finance',
      'Regulatory Affairs'
    ],
    knowledgeDomains: [
      'Financial Planning',
      'Risk Assessment',
      'Legal Framework',
      'Regulatory Compliance',
      'Corporate Governance'
    ],
    apiConfig: {
      endpoint: 'api.coaching2100.ai/v1/specialists/dr-burby',
      version: '1.0.0',
      accessLevel: 'Enterprise',
      rateLimit: '1000 requests/min',
      tokenExpiry: '24 hours'
    }
  },
  {
    id: 'dr-sabena',
    name: 'Dr. Sabena',
    title: 'CTO Innovation',
    specializations: [
      'Technology Strategy',
      'Digital Innovation',
      'IT Infrastructure',
      'Data Analytics',
      'Emerging Technologies'
    ],
    knowledgeDomains: [
      'Technical Leadership',
      'Innovation Management',
      'Digital Transformation',
      'Technology Architecture',
      'AI/ML Integration'
    ],
    apiConfig: {
      endpoint: 'api.coaching2100.ai/v1/specialists/dr-sabena',
      version: '1.0.0',
      accessLevel: 'Enterprise',
      rateLimit: '1000 requests/min',
      tokenExpiry: '24 hours'
    }
  },
  {
    id: 'dr-memoria',
    name: 'Dr. Memoria',
    title: 'COO Operations',
    specializations: [
      'Operations Management',
      'Process Optimization',
      'Supply Chain',
      'Quality Control',
      'Organizational Efficiency'
    ],
    knowledgeDomains: [
      'Operational Excellence',
      'Business Process Management',
      'Resource Optimization',
      'Performance Metrics',
      'Change Management'
    ],
    apiConfig: {
      endpoint: 'api.coaching2100.ai/v1/specialists/dr-memoria',
      version: '1.0.0',
      accessLevel: 'Enterprise',
      rateLimit: '1000 requests/min',
      tokenExpiry: '24 hours'
    }
  },
  {
    id: 'dr-cypriot',
    name: 'Dr. Cypriot',
    title: 'CHRO Leadership',
    specializations: [
      'HR Strategy',
      'Talent Management',
      'Organizational Development',
      'Culture Building',
      'Employee Experience'
    ],
    knowledgeDomains: [
      'Leadership Development',
      'Workforce Planning',
      'Change Management',
      'Performance Management',
      'Employee Relations'
    ],
    apiConfig: {
      endpoint: 'api.coaching2100.ai/v1/specialists/dr-cypriot',
      version: '1.0.0',
      accessLevel: 'Enterprise',
      rateLimit: '1000 requests/min',
      tokenExpiry: '24 hours'
    }
  },
  {
    id: 'prof-lee',
    name: 'Professor Lee',
    title: 'CMO Strategy',
    specializations: [
      'Marketing Strategy',
      'Brand Development',
      'Digital Marketing',
      'Customer Experience',
      'Market Analysis'
    ],
    knowledgeDomains: [
      'Strategic Marketing',
      'Brand Management',
      'Market Intelligence',
      'Customer Insights',
      'Digital Transformation'
    ],
    apiConfig: {
      endpoint: 'api.coaching2100.ai/v1/specialists/prof-lee',
      version: '1.0.0',
      accessLevel: 'Enterprise',
      rateLimit: '1000 requests/min',
      tokenExpiry: '24 hours'
    }
  },
  {
    id: 'dr-match',
    name: 'Dr. Match',
    title: 'CRO Growth',
    specializations: [
      'Revenue Strategy',
      'Growth Optimization',
      'Sales Leadership',
      'Business Development',
      'Market Expansion'
    ],
    knowledgeDomains: [
      'Revenue Operations',
      'Growth Strategy',
      'Sales Management',
      'Market Development',
      'Customer Success'
    ],
    apiConfig: {
      endpoint: 'api.coaching2100.ai/v1/specialists/dr-match',
      version: '1.0.0',
      accessLevel: 'Enterprise',
      rateLimit: '1000 requests/min',
      tokenExpiry: '24 hours'
    }
  }
]
