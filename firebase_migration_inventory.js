#!/usr/bin/env node

/**
 * Firebase Migration Pre-flight Analysis Script
 * Generates comprehensive inventory of Firebase dependencies, Firestore paths, auth calls, and function triggers
 * Part of ASOOS Firebase → Cloudflare migration baseline
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ASOOS_ROOT = '/Users/as/asoos';
const OUTPUT_CSV = 'firebase_migration_inventory.csv';
const OUTPUT_JSON = 'firebase_migration_inventory.json';
const DEPENDENCY_GRAPH = 'firebase_dependency_graph.json';

// Firebase patterns to detect
const FIREBASE_PATTERNS = {
  imports: [
    /import.*firebase/g,
    /from ['"]firebase/g,
    /@firebase\//g,
    /require\(['"]firebase/g,
  ],
  firestore: [
    /getFirestore/g,
    /collection\(/g,
    /doc\(/g,
    /addDoc\(/g,
    /setDoc\(/g,
    /updateDoc\(/g,
    /deleteDoc\(/g,
    /getDocs\(/g,
    /getDoc\(/g,
    /onSnapshot\(/g,
    /query\(/g,
    /where\(/g,
    /orderBy\(/g,
    /limit\(/g,
  ],
  auth: [
    /getAuth/g,
    /onAuthStateChanged/g,
    /signInWith/g,
    /signOut/g,
    /createUser/g,
    /GoogleAuthProvider/g,
    /OAuthProvider/g,
    /EmailAuthProvider/g,
  ],
  functions: [
    /functions\./g,
    /onCall\(/g,
    /onRequest\(/g,
    /onWrite\(/g,
    /onCreate\(/g,
    /onUpdate\(/g,
    /onDelete\(/g,
    /firestore\(\)/g,
  ],
  config: [
    /firebaseConfig/g,
    /initializeApp/g,
    /getApps/g,
  ],
};

// Critical files to flag
const CRITICAL_FILES = [
  'core/as-auth-service.ts',
  'connectors/',
  'integration-gateway/',
  'auth/',
  'backend/',
  'functions/',
];

class FirebaseInventoryAnalyzer {
  constructor() {
    this.inventory = [];
    this.dependencyGraph = {};
    this.criticalFiles = [];
    this.stats = {
      totalFiles: 0,
      firebaseFiles: 0,
      criticalFiles: 0,
      importCount: 0,
      firestoreCalls: 0,
      authCalls: 0,
      functionTriggers: 0,
    };
  }

  async analyze() {
    console.log('🔍 Starting Firebase Migration Pre-flight Analysis...');
    console.log('=' .repeat(60));

    try {
      // Scan directory structure
      await this.scanDirectory(ASOOS_ROOT);

      // Generate dependency graph
      this.generateDependencyGraph();

      // Identify critical files
      this.identifyCriticalFiles();

      // Generate reports
      await this.generateCSVReport();
      await this.generateJSONReport();
      await this.generateDependencyGraphReport();

      // Display summary
      this.displaySummary();

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }

  async scanDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);

        try {
          const stat = fs.statSync(fullPath);

          // Skip node_modules, .git, and other excluded directories
          if (this.shouldSkipDirectory(entry)) {
            continue;
          }

          if (stat.isDirectory()) {
            await this.scanDirectory(fullPath);
          } else if (this.isTargetFile(entry)) {
            await this.analyzeFile(fullPath);
          }
        } catch (statError) {
          // Skip files that can't be accessed (broken symlinks, permission issues, etc.)
          console.warn(`⚠️  Skipping inaccessible path: ${fullPath}`);
          continue;
        }
      }
    } catch (dirError) {
      console.warn(`⚠️  Could not read directory: ${dirPath}`);
      return;
    }
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      '.cache',
      'FIREBASE_CLEANUP_ARCHIVE',
      'FIREBASE_MIGRATION_ARCHIVE',
      'backup',
      'backups',
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  isTargetFile(fileName) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml', '.py'];
    return extensions.some(ext => fileName.endsWith(ext));
  }

  async analyzeFile(filePath) {
    this.stats.totalFiles++;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(ASOOS_ROOT, filePath);

      const analysis = {
        file: relativePath,
        fullPath: filePath,
        size: fs.statSync(filePath).size,
        modified: fs.statSync(filePath).mtime,
        hasFirebase: false,
        patterns: {
          imports: [],
          firestore: [],
          auth: [],
          functions: [],
          config: [],
        },
        isCritical: false,
        migrationComplexity: 'LOW',
        dependencies: [],
      };

      // Check for Firebase patterns
      for (const [category, patterns] of Object.entries(FIREBASE_PATTERNS)) {
        for (const pattern of patterns) {
          const matches = content.match(pattern);
          if (matches) {
            analysis.hasFirebase = true;
            analysis.patterns[category] = matches;

            // Update stats
            switch (category) {
              case 'imports':
                this.stats.importCount += matches.length;
                break;
              case 'firestore':
                this.stats.firestoreCalls += matches.length;
                break;
              case 'auth':
                this.stats.authCalls += matches.length;
                break;
              case 'functions':
                this.stats.functionTriggers += matches.length;
                break;
            }
          }
        }
      }

      // Determine migration complexity
      if (analysis.hasFirebase) {
        analysis.migrationComplexity = this.calculateMigrationComplexity(analysis);
        this.inventory.push(analysis);
        this.stats.firebaseFiles++;
      }

      // Check if critical file
      if (this.isCriticalFile(relativePath)) {
        analysis.isCritical = true;
        this.criticalFiles.push(analysis);
        this.stats.criticalFiles++;
      }

    } catch (error) {
      console.warn(`⚠️  Warning: Could not analyze ${filePath}: ${error.message}`);
    }
  }

  calculateMigrationComplexity(analysis) {
    let complexity = 0;

    // Weight different Firebase features
    complexity += analysis.patterns.imports.length * 1;
    complexity += analysis.patterns.firestore.length * 3;
    complexity += analysis.patterns.auth.length * 2;
    complexity += analysis.patterns.functions.length * 4;
    complexity += analysis.patterns.config.length * 2;

    if (complexity >= 20) return 'CRITICAL';
    if (complexity >= 10) return 'HIGH';
    if (complexity >= 5) return 'MEDIUM';
    return 'LOW';
  }

  isCriticalFile(relativePath) {
    return CRITICAL_FILES.some(criticalPath =>
      relativePath.includes(criticalPath)
    );
  }

  generateDependencyGraph() {
    console.log('📊 Generating dependency graph...');

    for (const item of this.inventory) {
      this.dependencyGraph[item.file] = {
        complexity: item.migrationComplexity,
        dependencies: this.extractDependencies(item),
        isCritical: item.isCritical,
        firebaseUsage: {
          imports: item.patterns.imports.length,
          firestore: item.patterns.firestore.length,
          auth: item.patterns.auth.length,
          functions: item.patterns.functions.length,
          config: item.patterns.config.length,
        },
      };
    }
  }

  extractDependencies(analysis) {
    // Simple dependency extraction based on import statements
    const dependencies = [];

    for (const importMatch of analysis.patterns.imports) {
      if (importMatch.includes('firebase/')) {
        const match = importMatch.match(/firebase\/(\w+)/);
        if (match) {
          dependencies.push(match[1]);
        }
      }
    }

    return [...new Set(dependencies)];
  }

  identifyCriticalFiles() {
    console.log('🚨 Identifying critical files...');

    // Sort by complexity and Firebase usage
    this.criticalFiles.sort((a, b) => {
      const aScore = Object.values(a.patterns).flat().length;
      const bScore = Object.values(b.patterns).flat().length;
      return bScore - aScore;
    });
  }

  async generateCSVReport() {
    console.log('📄 Generating CSV report...');

    const headers = [
      'File',
      'Size (bytes)',
      'Modified',
      'Migration Complexity',
      'Is Critical',
      'Firebase Imports',
      'Firestore Calls',
      'Auth Calls',
      'Function Triggers',
      'Config References',
    ];

    const rows = this.inventory.map(item => [
      item.file,
      item.size,
      item.modified.toISOString(),
      item.migrationComplexity,
      item.isCritical,
      item.patterns.imports.length,
      item.patterns.firestore.length,
      item.patterns.auth.length,
      item.patterns.functions.length,
      item.patterns.config.length,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    fs.writeFileSync(OUTPUT_CSV, csvContent);
    console.log(`✅ CSV report saved to: ${OUTPUT_CSV}`);
  }

  async generateJSONReport() {
    console.log('📄 Generating JSON report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.stats,
      inventory: this.inventory,
      criticalFiles: this.criticalFiles.slice(0, 10), // Top 10 critical files
      recommendations: this.generateRecommendations(),
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2));
    console.log(`✅ JSON report saved to: ${OUTPUT_JSON}`);
  }

  async generateDependencyGraphReport() {
    console.log('📄 Generating dependency graph...');

    const graphReport = {
      timestamp: new Date().toISOString(),
      nodes: Object.keys(this.dependencyGraph).length,
      graph: this.dependencyGraph,
      migrationOrder: this.generateMigrationOrder(),
    };

    fs.writeFileSync(DEPENDENCY_GRAPH, JSON.stringify(graphReport, null, 2));
    console.log(`✅ Dependency graph saved to: ${DEPENDENCY_GRAPH}`);
  }

  generateMigrationOrder() {
    // Generate recommended migration order based on dependencies and complexity
    const files = Object.keys(this.dependencyGraph);

    return files.sort((a, b) => {
      const aData = this.dependencyGraph[a];
      const bData = this.dependencyGraph[b];

      // Critical files first, then by complexity
      if (aData.isCritical && !bData.isCritical) return -1;
      if (!aData.isCritical && bData.isCritical) return 1;

      const complexityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
      return complexityOrder[aData.complexity] - complexityOrder[bData.complexity];
    });
  }

  generateRecommendations() {
    const recommendations = [];

    // High-priority recommendations based on findings
    if (this.stats.authCalls > 50) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Authentication',
        message: 'Heavy Firebase Auth usage detected. Plan comprehensive Cloudflare Access migration.',
        affectedFiles: this.inventory.filter(item => item.patterns.auth.length > 0).length,
      });
    }

    if (this.stats.firestoreCalls > 100) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Database',
        message: 'Extensive Firestore usage detected. Database migration will be complex.',
        affectedFiles: this.inventory.filter(item => item.patterns.firestore.length > 0).length,
      });
    }

    if (this.stats.functionTriggers > 20) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Functions',
        message: 'Multiple Firebase Functions detected. Plan Cloudflare Workers migration.',
        affectedFiles: this.inventory.filter(item => item.patterns.functions.length > 0).length,
      });
    }

    return recommendations;
  }

  displaySummary() {
    console.log('\n📊 FIREBASE MIGRATION PRE-FLIGHT ANALYSIS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`📁 Total Files Scanned: ${this.stats.totalFiles}`);
    console.log(`🔥 Files with Firebase: ${this.stats.firebaseFiles}`);
    console.log(`🚨 Critical Files: ${this.stats.criticalFiles}`);
    console.log(`📦 Firebase Imports: ${this.stats.importCount}`);
    console.log(`🗄️  Firestore Calls: ${this.stats.firestoreCalls}`);
    console.log(`🔐 Auth Calls: ${this.stats.authCalls}`);
    console.log(`⚡ Function Triggers: ${this.stats.functionTriggers}`);
    console.log('');

    console.log('🏆 TOP CRITICAL FILES:');
    this.criticalFiles.slice(0, 5).forEach((file, index) => {
      const totalCalls = Object.values(file.patterns).flat().length;
      console.log(`  ${index + 1}. ${file.file} (${file.migrationComplexity}, ${totalCalls} Firebase calls)`);
    });

    console.log('\n📋 MIGRATION COMPLEXITY BREAKDOWN:');
    const complexityCount = this.inventory.reduce((acc, item) => {
      acc[item.migrationComplexity] = (acc[item.migrationComplexity] || 0) + 1;
      return acc;
    }, {});

    Object.entries(complexityCount).forEach(([complexity, count]) => {
      console.log(`  ${complexity}: ${count} files`);
    });

    console.log('\n📄 REPORTS GENERATED:');
    console.log(`  📊 CSV Inventory: ${OUTPUT_CSV}`);
    console.log(`  📋 JSON Report: ${OUTPUT_JSON}`);
    console.log(`  🕸️  Dependency Graph: ${DEPENDENCY_GRAPH}`);
    console.log('');
    console.log('✅ Pre-flight analysis complete!');
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new FirebaseInventoryAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = FirebaseInventoryAnalyzer;
