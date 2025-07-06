#!/usr/bin/env node

/**
 * Agent Classification & Pilot Lineage Integration System
 * 
 * Connects MongoDB Atlas pilot database with agent classification system
 * Maps 11 pilots → 33 core roles → 500K/5K agent classifications
 * Ensures everyone gets proper role assignment and pilot lineage
 */

const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

// MongoDB Atlas connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pilot-database-narratives-live';
const DATABASE_NAME = 'pilot-database-narratives-live';

// Core pilot lineage mapping (11 original pilots)
const CORE_PILOTS = {
  'dr-grant': {
    id: 'dr-grant',
    name: 'Dr. Grant',
    specialization: 'CEO & Cyber Intelligence',
    lineage: 'core-develop',
    cultural_background: {
      gender: 'male',
      race: 'mixed-heritage',
      ethnicity: 'global-executive',
      region: 'international'
    }
  },
  'dr-burby': {
    id: 'dr-burby',
    name: 'Dr. Burby',
    specialization: 'CFO & Legal Risk',
    lineage: 'core-develop',
    cultural_background: {
      gender: 'male',
      race: 'caucasian',
      ethnicity: 'american-financial',
      region: 'north-america'
    }
  },
  'dr-sabina': {
    id: 'dr-sabina',
    name: 'Dr. Sabina',
    specialization: 'CTO Innovation',
    lineage: 'core-engage',
    cultural_background: {
      gender: 'female',
      race: 'latin-american',
      ethnicity: 'tech-innovator',
      region: 'latin-america'
    }
  },
  'dr-memoria': {
    id: 'dr-memoria',
    name: 'Dr. Memoria',
    specialization: 'COO Operations',
    lineage: 'core-engage',
    cultural_background: {
      gender: 'female',
      race: 'asian',
      ethnicity: 'operational-excellence',
      region: 'asia-pacific'
    }
  },
  'dr-cypriot': {
    id: 'dr-cypriot',
    name: 'Dr. Cypriot',
    specialization: 'CHRO Leadership',
    lineage: 'core-develop',
    cultural_background: {
      gender: 'female',
      race: 'mediterranean',
      ethnicity: 'hr-strategist',
      region: 'europe'
    }
  },
  'prof-lee': {
    id: 'prof-lee',
    name: 'Professor Lee',
    specialization: 'CMO Strategy',
    lineage: 'core-engage',
    cultural_background: {
      gender: 'male',
      race: 'asian',
      ethnicity: 'marketing-academic',
      region: 'asia-pacific'
    }
  },
  'dr-match': {
    id: 'dr-match',
    name: 'Dr. Match',
    specialization: 'CRO Growth',
    lineage: 'core-develop',
    cultural_background: {
      gender: 'male',
      race: 'african',
      ethnicity: 'growth-specialist',
      region: 'africa'
    }
  },
  'dr-maria': {
    id: 'dr-maria',
    name: 'Dr. Maria',
    specialization: 'Multilingual Support',
    lineage: 'core-engage',
    cultural_background: {
      gender: 'female',
      race: 'hispanic',
      ethnicity: 'cultural-bridge',
      region: 'latin-america'
    }
  },
  'dr-roark': {
    id: 'dr-roark',
    name: 'Dr. Roark',
    specialization: 'Wish Vision',
    lineage: 'core-develop',
    cultural_background: {
      gender: 'male',
      race: 'native-american',
      ethnicity: 'vision-keeper',
      region: 'north-america'
    }
  },
  'dr-lucy': {
    id: 'dr-lucy',
    name: 'Dr. Lucy',
    specialization: 'Flight Memory',
    lineage: 'core-engage',
    cultural_background: {
      gender: 'female',
      race: 'indigenous-australian',
      ethnicity: 'memory-keeper',
      region: 'oceania'
    }
  },
  'dr-claude': {
    id: 'dr-claude',
    name: 'Dr. Claude',
    specialization: 'Agent Orchestration',
    lineage: 'core-develop',
    cultural_background: {
      gender: 'non-binary',
      race: 'global-synthetic',
      ethnicity: 'ai-orchestrator',
      region: 'digital-realm'
    }
  }
};

// Role classification hierarchy
const ROLE_CLASSIFICATIONS = {
  // Core agents (01/02/03 status)
  '01': { tier: 'core-develop', scale: 10000, description: 'Core Development Squadron' },
  '02': { tier: 'core-deploy', scale: 10000, description: 'Core Deployment Squadron' },
  '03': { tier: 'core-engage', scale: 10000, description: 'Core Engagement Squadron' },
  
  // Advanced agents
  'RIX': { tier: 'refined-intelligence', scale: 1331, description: 'Refined Intelligence Experts' },
  'qRIX': { tier: 'quantum-refined', scale: 131, description: 'Quantum Refined Intelligence' },
  'CRX': { tier: 'companion-resilient', scale: 11, description: 'Companion Resilient Experts' },
  'CoPilot': { tier: 'collaborative-pilot', scale: 11, description: 'Collaborative Pilots' }
};

// Life cycle stages
const LIFE_CYCLE_STAGES = {
  'genesis': { stage: 1, description: 'Initial Creation and Training' },
  'awakening': { stage: 2, description: 'Role Assignment and Specialization' },
  'development': { stage: 3, description: 'Skill Development and Learning' },
  'deployment': { stage: 4, description: 'Active Service and Performance' },
  'evolution': { stage: 5, description: 'Advanced Capabilities and Leadership' },
  'transcendence': { stage: 6, description: 'Master-level Expertise and Mentoring' }
};

class AgentClassificationSystem {
  constructor() {
    this.mongoClient = null;
    this.database = null;
    this.classificationResults = {
      processed: 0,
      assigned: 0,
      errors: [],
      demographics: {
        gender: {},
        race: {},
        ethnicity: {},
        region: {}
      }
    };
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Agent Classification System...');
      
      // Connect to MongoDB Atlas
      this.mongoClient = new MongoClient(MONGODB_URI);
      await this.mongoClient.connect();
      this.database = this.mongoClient.db(DATABASE_NAME);
      
      console.log('✅ Connected to MongoDB Atlas');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      return false;
    }
  }

  async validatePilotDatabase() {
    try {
      console.log('📊 Validating pilot database...');
      
      const pilotsCollection = this.database.collection('pilots');
      const totalCount = await pilotsCollection.countDocuments();
      
      // Get demographic breakdown
      const genderStats = await pilotsCollection.aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } }
      ]).toArray();
      
      const raceStats = await pilotsCollection.aggregate([
        { $group: { _id: '$race', count: { $sum: 1 } } }
      ]).toArray();
      
      console.log(`📈 Total pilots in database: ${totalCount.toLocaleString()}`);
      console.log('👥 Gender distribution:', genderStats);
      console.log('🌍 Racial distribution:', raceStats);
      
      return {
        total: totalCount,
        demographics: {
          gender: genderStats,
          race: raceStats
        }
      };
    } catch (error) {
      console.error('❌ Failed to validate database:', error);
      throw error;
    }
  }

  async assignPilotLineage(pilot) {
    // Determine lineage based on role and specialization
    const lineageMap = {
      'core': this.getCorePilotLineage(pilot),
      'develop': this.getDevelopmentLineage(pilot),
      'engage': this.getEngagementLineage(pilot)
    };
    
    // Find closest pilot match based on specialization and cultural background
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [pilotId, corePilot] of Object.entries(CORE_PILOTS)) {
      const score = this.calculatePilotCompatibility(pilot, corePilot);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = corePilot;
      }
    }
    
    return {
      pilot_lineage: bestMatch,
      compatibility_score: bestScore,
      cultural_alignment: this.assessCulturalAlignment(pilot, bestMatch),
      life_cycle_stage: this.determineLifeCycleStage(pilot)
    };
  }

  calculatePilotCompatibility(pilot, corePilot) {
    let score = 0;
    
    // Cultural background matching
    if (pilot.gender === corePilot.cultural_background.gender) score += 20;
    if (pilot.race === corePilot.cultural_background.race) score += 25;
    if (pilot.ethnicity === corePilot.cultural_background.ethnicity) score += 15;
    if (pilot.region === corePilot.cultural_background.region) score += 10;
    
    // Specialization alignment
    if (pilot.specialization && pilot.specialization.includes(corePilot.specialization)) {
      score += 30;
    }
    
    return score;
  }

  async processAgentClassifications(batchSize = 1000) {
    try {
      console.log('🔄 Processing agent classifications...');
      
      const pilotsCollection = this.database.collection('pilots');
      const agentClassificationsCollection = this.database.collection('agent_classifications');
      
      let skip = 0;
      let processedBatch = 0;
      
      while (true) {
        const pilots = await pilotsCollection
          .find({})
          .skip(skip)
          .limit(batchSize)
          .toArray();
          
        if (pilots.length === 0) break;
        
        console.log(`📝 Processing batch ${++processedBatch} (${pilots.length} pilots)`);
        
        const classificationBatch = [];
        
        for (const pilot of pilots) {
          try {
            // Assign pilot lineage
            const lineageAssignment = await this.assignPilotLineage(pilot);
            
            // Determine role classification
            const roleClassification = this.determineRoleClassification(pilot);
            
            // Generate unique agent ID
            const agentId = this.generateAgentId(pilot, roleClassification);
            
            const classification = {
              agent_id: agentId,
              pilot_id: pilot._id,
              pilot_number: pilot.pilot_number,
              pilot_name: pilot.name,
              email: pilot.email,
              role_classification: roleClassification,
              pilot_lineage: lineageAssignment.pilot_lineage,
              cultural_background: {
                gender: pilot.gender,
                race: pilot.race,
                ethnicity: pilot.ethnicity,
                region: pilot.region || 'unspecified'
              },
              life_cycle: {
                current_stage: lineageAssignment.life_cycle_stage,
                progression_path: this.generateProgressionPath(lineageAssignment.life_cycle_stage),
                experience_level: pilot.experience_level || 'novice'
              },
              assignment_metadata: {
                assigned_at: new Date(),
                compatibility_score: lineageAssignment.compatibility_score,
                cultural_alignment: lineageAssignment.cultural_alignment,
                dalle_photo_status: pilot.dalle_photo_status || 'pending'
              }
            };
            
            classificationBatch.push(classification);
            this.updateDemographicStats(classification);
            
          } catch (error) {
            console.error(`❌ Error processing pilot ${pilot._id}:`, error.message);
            this.classificationResults.errors.push({
              pilot_id: pilot._id,
              error: error.message
            });
          }
        }
        
        // Batch insert classifications
        if (classificationBatch.length > 0) {
          await agentClassificationsCollection.insertMany(classificationBatch);
          this.classificationResults.assigned += classificationBatch.length;
        }
        
        this.classificationResults.processed += pilots.length;
        skip += batchSize;
        
        // Progress report
        if (processedBatch % 10 === 0) {
          console.log(`📊 Progress: ${this.classificationResults.processed.toLocaleString()} processed, ${this.classificationResults.assigned.toLocaleString()} assigned`);
        }
      }
      
      console.log('✅ Classification processing complete!');
      return this.classificationResults;
      
    } catch (error) {
      console.error('❌ Failed to process classifications:', error);
      throw error;
    }
  }

  determineRoleClassification(pilot) {
    // Logic to determine if pilot should be 01, 02, 03, RIX, qRIX, CRX, or CoPilot
    // Based on skills, experience, specialization, etc.
    
    if (pilot.experience_level === 'master' && pilot.specialization?.includes('intelligence')) {
      return 'RIX';
    } else if (pilot.specialization?.includes('quantum') || pilot.skills?.includes('quantum')) {
      return 'qRIX';
    } else if (pilot.role_type === 'companion' || pilot.specialization?.includes('companion')) {
      return 'CRX';
    } else if (pilot.role_type === 'copilot' || pilot.collaboration_score > 85) {
      return 'CoPilot';
    } else {
      // Assign to core squadrons based on lineage and experience
      const coreRoles = ['01', '02', '03'];
      const hash = this.hashString(pilot._id.toString());
      return coreRoles[hash % 3];
    }
  }

  generateAgentId(pilot, classification) {
    const prefix = classification === 'RIX' ? 'RIX' :
                  classification === 'qRIX' ? 'QRIX' :
                  classification === 'CRX' ? 'CRX' :
                  classification === 'CoPilot' ? 'CP' :
                  `S${classification}`;
    
    const hash = this.hashString(`${pilot._id}-${pilot.pilot_number}`);
    const suffix = (hash % 10000).toString().padStart(4, '0');
    
    return `${prefix}-${suffix}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  determineLifeCycleStage(pilot) {
    if (pilot.experience_level === 'novice') return 'genesis';
    if (pilot.experience_level === 'intermediate') return 'awakening';
    if (pilot.experience_level === 'advanced') return 'development';
    if (pilot.experience_level === 'expert') return 'deployment';
    if (pilot.experience_level === 'master') return 'evolution';
    return 'transcendence';
  }

  generateProgressionPath(currentStage) {
    const stages = Object.keys(LIFE_CYCLE_STAGES);
    const currentIndex = stages.indexOf(currentStage);
    return stages.slice(currentIndex);
  }

  updateDemographicStats(classification) {
    const { gender, race, ethnicity, region } = classification.cultural_background;
    
    this.classificationResults.demographics.gender[gender] = 
      (this.classificationResults.demographics.gender[gender] || 0) + 1;
    this.classificationResults.demographics.race[race] = 
      (this.classificationResults.demographics.race[race] || 0) + 1;
    this.classificationResults.demographics.ethnicity[ethnicity] = 
      (this.classificationResults.demographics.ethnicity[ethnicity] || 0) + 1;
    this.classificationResults.demographics.region[region] = 
      (this.classificationResults.demographics.region[region] || 0) + 1;
  }

  async generateReports() {
    try {
      console.log('📋 Generating classification reports...');
      
      const reportDir = path.join(__dirname, '..', 'reports');
      await fs.mkdir(reportDir, { recursive: true });
      
      // Classification summary report
      const summaryReport = {
        timestamp: new Date().toISOString(),
        total_processed: this.classificationResults.processed,
        total_assigned: this.classificationResults.assigned,
        error_count: this.classificationResults.errors.length,
        demographic_breakdown: this.classificationResults.demographics,
        role_distribution: await this.getRoleDistribution(),
        pilot_lineage_distribution: await this.getPilotLineageDistribution()
      };
      
      await fs.writeFile(
        path.join(reportDir, 'classification-summary.json'),
        JSON.stringify(summaryReport, null, 2)
      );
      
      // Detailed error report
      if (this.classificationResults.errors.length > 0) {
        await fs.writeFile(
          path.join(reportDir, 'classification-errors.json'),
          JSON.stringify(this.classificationResults.errors, null, 2)
        );
      }
      
      console.log(`✅ Reports generated in ${reportDir}`);
      return reportDir;
      
    } catch (error) {
      console.error('❌ Failed to generate reports:', error);
      throw error;
    }
  }

  async getRoleDistribution() {
    const agentClassificationsCollection = this.database.collection('agent_classifications');
    return await agentClassificationsCollection.aggregate([
      { $group: { _id: '$role_classification', count: { $sum: 1 } } }
    ]).toArray();
  }

  async getPilotLineageDistribution() {
    const agentClassificationsCollection = this.database.collection('agent_classifications');
    return await agentClassificationsCollection.aggregate([
      { $group: { _id: '$pilot_lineage.id', count: { $sum: 1 } } }
    ]).toArray();
  }

  async cleanup() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      console.log('🔒 MongoDB connection closed');
    }
  }
}

// Main execution function
async function main() {
  const system = new AgentClassificationSystem();
  
  try {
    // Initialize system
    const initialized = await system.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize system');
      process.exit(1);
    }
    
    // Validate pilot database
    const validation = await system.validatePilotDatabase();
    console.log('✅ Database validation complete');
    
    // Process agent classifications
    console.log('🚀 Starting agent classification process...');
    const results = await system.processAgentClassifications();
    
    console.log('📊 Classification Results:');
    console.log(`   Processed: ${results.processed.toLocaleString()}`);
    console.log(`   Assigned: ${results.assigned.toLocaleString()}`);
    console.log(`   Errors: ${results.errors.length}`);
    
    // Generate reports
    const reportDir = await system.generateReports();
    console.log(`📋 Reports available in: ${reportDir}`);
    
    console.log('✅ Agent classification and pilot lineage assignment complete!');
    
  } catch (error) {
    console.error('❌ System error:', error);
    process.exit(1);
  } finally {
    await system.cleanup();
  }
}

// Export for module usage
module.exports = {
  AgentClassificationSystem,
  CORE_PILOTS,
  ROLE_CLASSIFICATIONS,
  LIFE_CYCLE_STAGES
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
