import type { MenuItem } from '@/types/menu'

export const adminMenuItems: MenuItem[] = [
  {
    title: 'Dashboard Overview',
    icon: 'dashboard',
    path: '/dashboard'
  },
  {
    title: 'Visionary Voices Network',
    icon: 'network',
    children: [
      {
        title: 'AI Executive Coaches',
        children: [
          {
            title: 'Enterprise Level',
            path: '/network/executive/enterprise'
          },
          {
            title: 'Advanced Level',
            path: '/network/executive/advanced'
          },
          {
            title: 'Foundation Level',
            path: '/network/executive/foundation'
          }
        ]
      },
      {
        title: 'AI Non-Executive Coaches',
        children: [
          {
            title: 'Senior Level',
            path: '/network/non-executive/senior'
          },
          {
            title: 'Associate Level',
            path: '/network/non-executive/associate'
          }
        ]
      },
      {
        title: 'AI Speakers',
        children: [
          {
            title: 'Global Expert',
            path: '/network/speakers/global'
          },
          {
            title: 'Industry Specialist',
            path: '/network/speakers/industry'
          },
          {
            title: 'Domain Authority',
            path: '/network/speakers/domain'
          }
        ]
      },
      {
        title: 'AI Influencers',
        children: [
          {
            title: 'Thought Leadership',
            path: '/network/influencers/thought'
          },
          {
            title: 'Industry Impact',
            path: '/network/influencers/impact'
          },
          {
            title: 'Innovation Voice',
            path: '/network/influencers/innovation'
          }
        ]
      }
    ]
  },
  {
    title: 'AI Corporate Specialists',
    icon: 'corporate',
    children: [
      {
        title: 'Dr. Grant',
        subtitle: 'CEO Advisory & Intelligence',
        path: '/specialists/dr-grant',
        meta: {
          role: 'CEO Advisory',
          expertise: ['Strategic Leadership', 'Corporate Intelligence']
        }
      },
      {
        title: 'Dr. Burby',
        subtitle: 'CFO Excellence & Risk',
        path: '/specialists/dr-burby',
        meta: {
          role: 'CFO Advisory',
          expertise: ['Financial Strategy', 'Risk Management']
        }
      },
      {
        title: 'Dr. Sabena',
        subtitle: 'CTO Innovation',
        path: '/specialists/dr-sabena',
        meta: {
          role: 'Technology Leadership',
          expertise: ['Digital Innovation', 'Tech Strategy']
        }
      },
      {
        title: 'Dr. Memoria',
        subtitle: 'COO Operations',
        path: '/specialists/dr-memoria',
        meta: {
          role: 'Operations Excellence',
          expertise: ['Process Optimization', 'Operational Efficiency']
        }
      },
      {
        title: 'Dr. Cypriot',
        subtitle: 'CHRO Leadership',
        path: '/specialists/dr-cypriot',
        meta: {
          role: 'HR Strategy',
          expertise: ['Talent Management', 'Organizational Development']
        }
      },
      {
        title: 'Professor Lee',
        subtitle: 'CMO Strategy',
        path: '/specialists/prof-lee',
        meta: {
          role: 'Marketing Leadership',
          expertise: ['Brand Strategy', 'Market Intelligence']
        }
      },
      {
        title: 'Dr. Match',
        subtitle: 'CRO Growth',
        path: '/specialists/dr-match',
        meta: {
          role: 'Revenue Strategy',
          expertise: ['Growth Optimization', 'Business Development']
        }
      }
    ]
  },
  {
    title: 'Specialist Features',
    icon: 'features',
    children: [
      {
        title: 'AI Personality Management',
        path: '/features/personality'
      },
      {
        title: 'Domain Expertise Configuration',
        path: '/features/expertise'
      },
      {
        title: 'Interaction Analytics',
        path: '/features/analytics'
      },
      {
        title: 'Knowledge Base Updates',
        path: '/features/knowledge'
      }
    ]
  },
  {
    title: 'Alumni/Coachees',
    icon: 'users',
    children: [
      {
        title: 'Progress Journey',
        path: '/alumni/progress'
      },
      {
        title: 'Development Plans',
        path: '/alumni/development'
      },
      {
        title: 'Engagement History',
        path: '/alumni/engagement'
      },
      {
        title: 'Success Metrics',
        path: '/alumni/metrics'
      }
    ]
  },
  {
    title: 'System Settings',
    icon: 'settings',
    children: [
      {
        title: 'Security Configuration',
        path: '/settings/security'
      },
      {
        title: 'Access Control',
        path: '/settings/access'
      },
      {
        title: 'Performance Monitoring',
        path: '/settings/monitoring'
      },
      {
        title: 'System Integration',
        path: '/settings/integration'
      }
    ]
  }
]

export const menuItems = [
  {
    name: 'backoffices/user',
    label: 'Users',
    path: '/users'
  },
  {
    name: 'backoffices/courses',
    label: 'Courses',
    path: '/courses'
  },
  {
    name: 'backoffices/activity',
    label: 'Activities',
    path: '/activity'
  },
  {
    name: 'backoffices/advertisement',
    label: 'Advertisement',
    path: '/advertisement'
  },
  {
    name: 'backoffices/live-section',
    label: 'Live Section',
    path: '/live'
  },
  {
    name: 'backoffices/collaboration',
    label: 'Human Collaboration',
    path: '/collaboration'
  },
  {
    name: 'backoffices/skills',
    label: 'Skills',
    path: '/skills'
  },
  {
    name: 'backoffices/organization',
    label: 'Organization',
    path: '/organization'
  },
  {
    name: 'backoffices/conference',
    label: 'Conference',
    path: '/conference'
  },
  {
    name: 'backoffices/webinars',
    label: 'Webinar',
    path: '/webinar'
  },
  {
    name: 'backoffices/orders',
    label: 'Orders',
    path: '/orders'
  },
  {
    name: 'backoffices/products',
    label: 'Products',
    path: '/products'
  },
  {
    name: 'backoffices/product-category',
    label: 'Product Category',
    path: '/product-category'
  },
  {
    name: 'backoffices/product-vendor',
    label: 'Product Vendor',
    path: '/product-vendor'
  },
  {
    name: 'usertype',
    label: 'User Type',
    path: '/usertype'
  },
  {
    name: 'occupation',
    label: 'Occupation',
    path: '/occupation'
  },
  {
    name: 'industry',
    label: 'Industry',
    path: '/industry'
  },
  {
    name: 'backoffices/activity/types/all',
    label: 'Interests',
    path: '/interests'
  },
  {
    name: '/backoffices/activity',
    label: 'Activity Types',
    path: '/activity-types'
  },
  {
    name: '/Blacklist',
    label: 'Blacklist',
    path: '/blacklist'
  },
  {
    name: 'backoffices/ai-pilots',
    label: 'AI Pilots',
    path: '/ai-pilots',
    children: [
      {
        name: 'backoffices/ai-pilots/executive',
        label: 'Executive Coaches',
        path: '/ai-pilots/executive',
        children: [
          {
            name: 'backoffices/ai-pilots/executive/enterprise',
            label: 'Level 1 - Enterprise',
            path: '/ai-pilots/executive/enterprise'
          },
          {
            name: 'backoffices/ai-pilots/executive/advanced',
            label: 'Level 2 - Advanced',
            path: '/ai-pilots/executive/advanced'
          },
          {
            name: 'backoffices/ai-pilots/executive/foundation',
            label: 'Level 3 - Foundation',
            path: '/ai-pilots/executive/foundation'
          }
        ]
      },
      {
        name: 'backoffices/ai-pilots/specialists',
        label: 'Corporate Specialists',
        path: '/ai-pilots/specialists',
        children: [
          {
            name: 'backoffices/ai-pilots/specialists/dr-grant',
            label: 'Dr. Grant - CEO Advisory',
            path: '/ai-pilots/specialists/dr-grant'
          },
          {
            name: 'backoffices/ai-pilots/specialists/dr-burby',
            label: 'Dr. Burby - CFO Excellence',
            path: '/ai-pilots/specialists/dr-burby'
          },
          {
            name: 'backoffices/ai-pilots/specialists/dr-sabena',
            label: 'Dr. Sabena - CTO Innovation',
            path: '/ai-pilots/specialists/dr-sabena'
          },
          {
            name: 'backoffices/ai-pilots/specialists/dr-memoria',
            label: 'Dr. Memoria - COO Operations',
            path: '/ai-pilots/specialists/dr-memoria'
          },
          {
            name: 'backoffices/ai-pilots/specialists/dr-cypriot',
            label: 'Dr. Cypriot - CHRO Leadership',
            path: '/ai-pilots/specialists/dr-cypriot'
          },
          {
            name: 'backoffices/ai-pilots/specialists/prof-lee',
            label: 'Professor Lee - CMO Strategy',
            path: '/ai-pilots/specialists/prof-lee'
          },
          {
            name: 'backoffices/ai-pilots/specialists/dr-match',
            label: 'Dr. Match - CRO Growth',
            path: '/ai-pilots/specialists/dr-match'
          }
        ]
      },
      {
        name: 'backoffices/ai-pilots/management',
        label: 'Management',
        path: '/ai-pilots/management',
        children: [
          {
            name: 'backoffices/ai-pilots/management/personality',
            label: 'AI Personality Management',
            path: '/ai-pilots/management/personality'
          },
          {
            name: 'backoffices/ai-pilots/management/expertise',
            label: 'Domain Expertise Config',
            path: '/ai-pilots/management/expertise'
          },
          {
            name: 'backoffices/ai-pilots/management/analytics',
            label: 'Interaction Analytics',
            path: '/ai-pilots/management/analytics'
          },
          {
            name: 'backoffices/ai-pilots/management/knowledge',
            label: 'Knowledge Base Updates',
            path: '/ai-pilots/management/knowledge'
          }
        ]
      }
    ]
  }
]
