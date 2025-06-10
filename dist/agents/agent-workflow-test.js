// AGENT-DRIVEN EXECUTION FRAMEWORK - TEST SCRIPT
// This script demonstrates how to use the agent-driven-execution.js framework

// Import the framework and required classes from agent-driven-execution.js
const {
  // Utility functions
  generateUUID,

  // Enums and constants
  WorkflowStatus,
  ApprovalStatus,
  AgentStatus,
  AutomatedIntegrationStatus,
  ApprovalType,
  SecurityImpactLevel,
  AutonomyLevel,

  // Classes
  AgentRegistry,
  CapabilityRegistry,
  ExecutionEngine,
  SecurityService,
  BlockchainApprovalService,
  S2DOGovernanceEngine,
  AgentDrivenExecutionFramework,
} = require('./agent-driven-execution.js');

// Execute all tests asynchronously
async function runTests() {
  console.log('Starting Agent Workflow Tests...');

  try {
    //====================================================================================
    // STEP 1: Setup - Create instances of all required dependencies
    //====================================================================================
    console.log('\n1. Setting up framework dependencies...');

    // Create instances of all required services
    const agentRegistry = new AgentRegistry();
    const capabilityRegistry = new CapabilityRegistry();
    const executionEngine = new ExecutionEngine();
    const securityService = new SecurityService();
    const blockchainApproval = new BlockchainApprovalService();
    const s2doGovernance = new S2DOGovernanceEngine();

    // Extend AgentRegistry with mock agents for testing
    agentRegistry.getAgents = async () => {
      return [
        {
          id: 'agent-1',
          name: 'Data Analysis Agent',
          capabilities: ['DATA_PROCESSING', 'STATISTICAL_ANALYSIS'],
          status: AgentStatus.ACTIVE,
        },
        {
          id: 'agent-2',
          name: 'Visualization Agent',
          capabilities: ['DATA_VISUALIZATION', 'REPORT_GENERATION'],
          status: AgentStatus.ACTIVE,
        },
        {
          id: 'agent-3',
          name: 'Security Scanning Agent',
          capabilities: ['VULNERABILITY_SCANNING', 'COMPLIANCE_CHECK'],
          status: AgentStatus.ACTIVE,
        },
      ];
    };

    // Initialize the framework with our dependencies
    const framework = new AgentDrivenExecutionFramework(
      agentRegistry,
      capabilityRegistry,
      executionEngine,
      securityService,
      blockchainApproval,
      s2doGovernance
    );

    console.log('✅ Framework initialized with dependencies');

    //====================================================================================
    // STEP 2: Define a sample workflow for testing
    //====================================================================================
    console.log('\n2. Creating sample workflow definition...');

    // Create a sample workflow definition
    const workflowDefinition = {
      id: generateUUID(),
      name: 'Data Analysis and Reporting Workflow',
      description: 'Analyzes data sources and generates a security report',
      version: '1.0',
      owner: 'test-user',
      autonomyLevel: AutonomyLevel.MILESTONE_SUPERVISED,

      // Define workflow steps
      steps: [
        {
          id: 'step-1',
          name: 'Data Collection',
          description: 'Collect data from various sources',
          capabilities: ['DATA_PROCESSING'],
          parameters: {
            dataSources: ['logs', 'metrics', 'alerts'],
          },
        },
        {
          id: 'step-2',
          name: 'Data Analysis',
          description: 'Analyze collected data for insights',
          capabilities: ['STATISTICAL_ANALYSIS'],
          parameters: {
            analysisType: 'security',
            depth: 'comprehensive',
          },
        },
        {
          id: 'step-3',
          name: 'Security Compliance Check',
          description: 'Verify compliance with security standards',
          capabilities: ['COMPLIANCE_CHECK'],
          parameters: {
            standards: ['ISO27001', 'NIST'],
          },
        },
        {
          id: 'step-4',
          name: 'Report Generation',
          description: 'Generate a comprehensive report',
          capabilities: ['REPORT_GENERATION'],
          parameters: {
            format: 'pdf',
            includeExecutiveSummary: true,
          },
        },
      ],

      // Define security policy
      securityPolicy: {
        requiredApprovalLevel: 'MANAGER',
        dataClassification: 'CONFIDENTIAL',
        executionConstraints: [
          {
            type: 'TIME_WINDOW',
            parameters: {
              startTime: '09:00',
              endTime: '17:00',
              timezone: 'UTC',
            },
          },
          {
            type: 'RESOURCE_LIMIT',
            parameters: {
              maxCpuUtilization: 80,
              maxMemoryUsageMB: 4096,
            },
          },
        ],
      },
    };

    console.log(`✅ Created workflow definition: ${workflowDefinition.name}`);

    //====================================================================================
    // STEP 3: Test createAgentWorkflow() - Create an executable workflow
    //====================================================================================
    console.log('\n3. Testing createAgentWorkflow()...');

    // Define execution context
    const executionContext = {
      requestorId: 'user-123',
      purpose: 'Testing the framework',
      environment: 'development',
    };

    // Create the workflow
    const workflow = await framework.createAgentWorkflow(
      workflowDefinition,
      executionContext
    );

    console.log(`✅ Created workflow with ID: ${workflow.id}`);
    console.log(`   Status: ${workflow.status}`);
    console.log(`   Number of agents: ${workflow.agents.length}`);

    if (workflow.approvalInfo) {
      console.log(`   Requires approval: Yes`);
      console.log(`   Approval transaction ID: ${workflow.approvalInfo.id}`);
      console.log(`   Approval status: ${workflow.approvalInfo.status}`);
    } else {
      console.log(`   Requires approval: No`);
    }

    //====================================================================================
    // STEP 4: Test executeAgentWorkflow() - Execute the workflow
    //====================================================================================
    console.log('\n4. Testing executeAgentWorkflow()...');

    // Define execution parameters
    const executionParams = {
      input: {
        dataSource: 'sample-data.json',
        outputFormat: 'detailed',
      },
      options: {
        timeout: 3600,
        priority: 'normal',
      },
    };

    try {
      // Execute the workflow
      const executionResult = await framework.executeAgentWorkflow(
        workflow.id,
        executionParams
      );

      console.log(`✅ Executed workflow ${workflow.id}`);
      console.log(`   Status: ${executionResult.status}`);
      console.log(`   Timestamp: ${executionResult.timestamp}`);
      console.log(`   Security score: ${executionResult.securityScore}`);
      console.log(`   Compliance score: ${executionResult.complianceScore}`);
    } catch (error) {
      if (error.message === 'Workflow execution not approved') {
        console.log(`⚠️ Workflow requires approval before execution`);
        // In a real scenario, you would need to approve the workflow via the blockchain service
        // For this test, we'll simulate approval by directly modifying the workflow object
        console.log('   Simulating workflow approval...');

        // Update the workflow status (in a real system, this would happen through blockchain)
        workflow.status = WorkflowStatus.READY;
        if (workflow.approvalInfo) {
          workflow.approvalInfo.status = ApprovalStatus.APPROVED;
        }

        // Now try executing the workflow again
        const executionResult = await framework.executeAgentWorkflow(
          workflow.id,
          executionParams
        );

        console.log(`✅ Executed workflow after approval: ${workflow.id}`);
        console.log(`   Status: ${executionResult.status}`);
        console.log(`   Timestamp: ${executionResult.timestamp}`);
      } else {
        console.error('❌ Error executing workflow:', error);
        throw error;
      }
    }

    //====================================================================================
    // STEP 5: Test validateExecutionResults() - Validate the workflow results
    //====================================================================================
    console.log('\n5. Testing validateExecutionResults()...');

    // Mock results from workflow execution
    const results = {
      dataPointsProcessed: 1250,
      insightsGenerated: 42,
      complianceIssues: 3,
      reportGenerated: true,
      reportUrl: 'https://example.com/reports/sample-report.pdf',
    };

    // Validate the results
    const validationResult = await framework.validateExecutionResults(
      workflow.id,
      results
    );

    console.log(`✅ Validated execution results`);
    console.log(`   Valid: ${validationResult.valid}`);
    console.log(`   Score: ${validationResult.score}`);
    console.log(`   Timestamp: ${validationResult.timestamp}`);

    //====================================================================================
    // STEP 6: Test complete execution flow
    //====================================================================================
    console.log('\n6. Demonstrating complete workflow lifecycle...');

    // Create a new workflow definition with higher autonomy for full automation
    const automatedWorkflow = {
      ...workflowDefinition,
      id: generateUUID(),
      name: 'Fully Automated Workflow',
      autonomyLevel: AutonomyLevel.FULLY_AUTONOMOUS,
      securityPolicy: {
        ...workflowDefinition.securityPolicy,
        requiredApprovalLevel: 'NONE',
      },
    };

    console.log(`   Creating automated workflow: ${automatedWorkflow.name}`);

    // Create and execute the workflow in a single flow
    const automatedWorkflowInstance = await framework.createAgentWorkflow(
      automatedWorkflow,
      executionContext
    );

    console.log(`   Workflow created with ID: ${automatedWorkflowInstance.id}`);
    console.log(`   Status: ${automatedWorkflowInstance.status}`);

    // Execute the workflow
    const automatedResult = await framework.executeAgentWorkflow(
      automatedWorkflowInstance.id,
      executionParams
    );

    console.log(`   Workflow executed with status: ${automatedResult.status}`);

    // Validate the results
    const automatedValidation = await framework.validateExecutionResults(
      automatedWorkflowInstance.id,
      results
    );

    console.log(
      `   Results validated with score: ${automatedValidation.score}`
    );

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// The classes and constants are already imported at the top of the file

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
