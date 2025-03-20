#!/usr/bin/env groovy

/**
 * Infrastructure Management Pipeline
 * 
 * This pipeline handles infrastructure provisioning, updates, and maintenance
 * using Terraform. It supports multiple environments and infrastructure components.
 *
 * The pipeline includes stages for:
 * - Infrastructure planning (terraform plan)
 * - Approval gate for changes
 * - Applying changes (terraform apply)
 * - Validation of deployed infrastructure
 *
 * Supported infrastructure components:
 * - Cloud resources (GCP, AWS, Azure)
 * - Networking (VPC, subnets, firewalls)
 * - Databases (Cloud SQL, managed databases)
 * - Kubernetes clusters (GKE, EKS, AKS)
 */

// Pipeline parameters for customization
properties([
    parameters([
        choice(
            choices: ['dev', 'staging', 'production'],
            description: 'Target environment for infrastructure changes',
            name: 'ENVIRONMENT'
        ),
        choice(
            choices: ['cloud', 'network', 'database', 'kubernetes', 'all'],
            description: 'Infrastructure component to update',
            name: 'COMPONENT'
        ),
        booleanParam(
            defaultValue: false,
            description: 'Force apply changes without approval (use with caution)',
            name: 'FORCE_APPLY'
        ),
        string(
            defaultValue: '',
            description: 'Terraform workspace to use (defaults to environment name if empty)',
            name: 'TERRAFORM_WORKSPACE'
        ),
        text(
            defaultValue: '',
            description: 'Additional Terraform variables (in format: key1=value1,key2=value2)',
            name: 'TERRAFORM_VARS'
        )
    ])
])

// Define node to run on
node {
    // Environment variables
    def workspace = params.TERRAFORM_WORKSPACE ?: params.ENVIRONMENT
    def infraPath = "terraform/${params.COMPONENT}"
    if (params.COMPONENT == 'all') {
        infraPath = "terraform"
    }
    
    // Service account for authentication
    def serviceAccount = 'DrLucyAutomation'
    
    // Start pipeline execution
    stage('Preparation') {
        // Clean workspace
        cleanWs()
        
        // Checkout code
        checkout scm
        
        // Display information about the build
        echo "Building infrastructure for ${params.ENVIRONMENT} environment"
        echo "Component: ${params.COMPONENT}"
        echo "Terraform workspace: ${workspace}"
        
        // Authenticate with service account
        withCredentials([file(credentialsId: 'drla-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
            sh """
                gcloud auth activate-service-account ${serviceAccount}@api-for-warp-drive.iam.gserviceaccount.com --key-file=${GOOGLE_APPLICATION_CREDENTIALS}
                gcloud config set project api-for-warp-drive
            """
        }
    }

    stage('Initialize Terraform') {
        dir(infraPath) {
            // Initialize Terraform
            sh "terraform init -backend-config=env/${params.ENVIRONMENT}/backend.tfvars"
            
            // Select or create workspace
            sh "terraform workspace select ${workspace} || terraform workspace new ${workspace}"
            
            // Validate Terraform files
            sh "terraform validate"
        }
    }
    
    stage('Plan Infrastructure Changes') {
        dir(infraPath) {
            // Prepare variable arguments
            def varArgs = ""
            if (params.TERRAFORM_VARS) {
                params.TERRAFORM_VARS.split(',').each { varPair ->
                    def parts = varPair.split('=')
                    if (parts.size() == 2) {
                        varArgs += " -var '${parts[0].trim()}=${parts[1].trim()}'"
                    }
                }
            }
            
            // Run terraform plan and capture the output
            sh "terraform plan -out=tfplan ${varArgs} -var-file=env/${params.ENVIRONMENT}/terraform.tfvars"
            
            // Show plan for review
            sh "terraform show -no-color tfplan > tfplan.txt"
            def planChanges = readFile('tfplan.txt').trim()
            
            // Log changes to console
            echo "Terraform Plan Changes:"
            echo planChanges
            
            // Save plan as artifact
            archiveArtifacts artifacts: 'tfplan.txt', allowEmptyArchive: true
            
            // Analyze plan for destructive changes
            def hasDestructiveChanges = sh(
                script: "grep -E '\\s*[-~]\\s*' tfplan.txt | wc -l",
                returnStdout: true
            ).trim().toInteger() > 0
            
            // Set environment variables for later stages
            env.HAS_CHANGES = sh(
                script: "grep -E '(Plan:|No changes)' tfplan.txt",
                returnStatus: true
            ) == 0 ? 'true' : 'false'
            
            env.HAS_DESTRUCTIVE_CHANGES = hasDestructiveChanges ? 'true' : 'false'
            
            // Notify about destructive changes
            if (hasDestructiveChanges && params.ENVIRONMENT == 'production') {
                echo "WARNING: Destructive changes detected in production environment!"
                
                // Notify Slack about destructive changes
                slackSend(
                    channel: '#infrastructure-alerts',
                    color: 'danger',
                    message: "⚠️ *DESTRUCTIVE CHANGES DETECTED* ⚠️\nPipeline: ${env.JOB_NAME} #${env.BUILD_NUMBER}\nEnvironment: ${params.ENVIRONMENT}\nComponent: ${params.COMPONENT}\nSee: ${env.BUILD_URL}"
                )
            }
        }
    }
    
    stage('Approval Gate') {
        // Skip approval if no changes or force apply is enabled
        if (env.HAS_CHANGES == 'false' || params.FORCE_APPLY) {
            echo "No changes to apply or force apply enabled. Skipping approval."
            return
        }
        
        // Different approval rules based on environment
        if (params.ENVIRONMENT == 'production' || env.HAS_DESTRUCTIVE_CHANGES == 'true') {
            // Require manual approval for production or destructive changes
            timeout(time: 24, unit: 'HOURS') {
                input(
                    message: "Do you want to apply the Terraform plan to ${params.ENVIRONMENT}?",
                    ok: "Apply Changes"
                )
            }
        } else if (params.ENVIRONMENT == 'staging') {
            // Less stringent approval for staging
            timeout(time: 4, unit: 'HOURS') {
                input(
                    message: "Do you want to apply the Terraform plan to staging?",
                    ok: "Apply Changes"
                )
            }
        } else {
            // No approval needed for dev
            echo "Development environment changes don't require approval."
        }
    }
    
    stage('Apply Infrastructure Changes') {
        dir(infraPath) {
            // Check if there are changes to apply
            if (env.HAS_CHANGES == 'false') {
                echo "No changes to apply."
                return
            }
            
            // Apply the Terraform plan
            try {
                sh "terraform apply -auto-approve tfplan"
                
                // Notify about successful application
                slackSend(
                    channel: '#infrastructure-updates',
                    color: 'good',
                    message: "✅ *Infrastructure Changes Applied*\nPipeline: ${env.JOB_NAME} #${env.BUILD_NUMBER}\nEnvironment: ${params.ENVIRONMENT}\nComponent: ${params.COMPONENT}\nSee: ${env.BUILD_URL}"
                )
            } catch (Exception e) {
                // Notify about failed application
                slackSend(
                    channel: '#infrastructure-alerts',
                    color: 'danger',
                    message: "❌ *Infrastructure Apply Failed*\nPipeline: ${env.JOB_NAME} #${env.BUILD_NUMBER}\nEnvironment: ${params.ENVIRONMENT}\nComponent: ${params.COMPONENT}\nError: ${e.message}\nSee: ${env.BUILD_URL}"
                )
                throw e
            }
        }
    }
    
    stage('Validate Infrastructure') {
        dir(infraPath) {
            // Export Terraform outputs
            sh "terraform output -json > outputs.json"
            
            // Read outputs for validation
            def outputs = readJSON file: 'outputs.json'
            
            // Validate based on component type
            switch(params.COMPONENT) {
                case 'kubernetes':
                    validateKubernetesCluster(outputs)
                    break
                case 'database':
                    validateDatabases(outputs)
                    break
                case 'network':
                    validateNetworking(outputs)
                    break
                case 'cloud':
                    validateCloudResources(outputs)
                    break
                case 'all':
                    echo "Running comprehensive validation for all components..."
                    // Run relevant validations based on detected outputs
                    if (outputs.containsKey('kubernetes_endpoint')) {
                        validateKubernetesCluster(outputs)
                    }
                    if (outputs.containsKey('database_connection')) {
                        validateDatabases(outputs)
                    }
                    // Add other validations as needed
                    break
            }
            
            // Create validation report
            sh "echo 'Infrastructure validation completed at \$(date)' > validation-report.txt"
            sh "echo 'Environment: ${params.ENVIRONMENT}' >> validation-report.txt"
            sh "echo 'Component: ${params.COMPONENT}' >> validation-report.txt"
            
            // Archive validation report
            archiveArtifacts artifacts: 'validation-report.txt', allowEmptyArchive: true
        }
    }
    
    stage('Update Documentation') {
        // Update infrastructure documentation
        sh "mkdir -p docs/infrastructure/${params.ENVIRONMENT}"
        
        dir(infraPath) {
            // Generate Terraform documentation
            sh "terraform show -json > tf-state.json"
            
            // Write documentation for the current state
            sh """
                echo '# Infrastructure Documentation' > ../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md
                echo '' >> ../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md
                echo 'Last updated: \$(date)' >> ../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md
                echo 'Updated by: Dr. Lucy Automation' >> ../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md
                echo '' >> ../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md
                echo '## Resources' >> ../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md
                terraform state list | sort >> ../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md
            """
            
            // Archive documentation
            archiveArtifacts artifacts: "../../docs/infrastructure/${params.ENVIRONMENT}/${params.COMPONENT}.md", allowEmptyArchive: true
        }
    }
}

// Validation functions for different component types
def validateKubernetesCluster(outputs) {
    echo "Validating Kubernetes cluster..."
    
    // If we have kubernetes endpoint in outputs, use it for validation
    if (outputs.containsKey('kubernetes_endpoint')) {
        def endpoint = outputs.kubernetes_endpoint.value
        echo "Kubernetes API endpoint: ${endpoint}"
        
        // Auth with service account
        withCredentials([file(credentialsId: 'drla-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
            // Get cluster credentials
            sh "gcloud container clusters get-credentials ${outputs.kubernetes_name.value} --region ${outputs.kubernetes_region.value} --project api-for-warp-drive"
            
            // Basic validation - check if API server is responding
            sh "kubectl cluster-info"
            
            // Check essential components
            sh "kubectl get nodes -o wide"
            sh "kubectl get pods -n kube-system"
            
            // Verify workload capacity
            sh "kubectl describe nodes | grep -A 5 'Allocatable:'"
        }
    } else {
        echo "No Kubernetes endpoint found in Terraform outputs. Skipping detailed validation."
    }
}

def validateDatabases(outputs) {
    echo "Validating database deployments..."
    
    // If we have database connection details in outputs, use them for validation
    if (outputs.containsKey('database_connection')) {
        def connection = outputs.database_connection.value
        echo "Database connection: ${connection}"
        
        // For Cloud SQL or similar, we might just check connectivity
        withCredentials([file(credentialsId: 'drla-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
            // Example check for Cloud SQL connectivity
            if (outputs.containsKey('database_instance_name')) {
                sh "gcloud sql instances describe ${outputs.database_instance_name.value} --format='value(state)' | grep -q RUNNABLE"
            }
        }
    } else {
        echo "No database connection found in Terraform outputs. Skipping detailed validation."
    }
}

def validateNetworking(outputs) {
    echo "Validating network configuration..."
    
    // Validate VPC and subnets
    withCredentials([file(credentialsId: 'drla-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        if (outputs.containsKey('vpc_name')) {
            def vpcName = outputs.vpc_name.value
            
            // Check VPC exists and is properly configured
            sh "gcloud compute networks describe ${vpcName} --project api-for-warp-drive --format='value(name)'"
            
            // Check firewall rules
            sh "gcloud compute firewall-rules list --filter='network=${vpcName}' --project api-for-warp-drive"
        }
    }
}

def validateCloudResources(outputs) {
    echo "Validating cloud resources..."
    
    // General cloud resource validation
    withCredentials([file(credentialsId: 'drla-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        // Check compute resources if applicable
        if (outputs.containsKey('compute_instances')) {
            def instances = outputs.compute_instances.value
            sh "gcloud compute instances list --filter='name:(${instances.join('|')})' --project api-for-warp-drive"
        }
        
        // Check storage buckets if applicable
        if (outputs.containsKey('storage_buckets')) {
            def buckets = outputs.storage_buckets.value
            sh "gcloud storage ls -p api-for-warp-drive | grep -E '(${buckets.join('|')})'"
        }
    }
}

