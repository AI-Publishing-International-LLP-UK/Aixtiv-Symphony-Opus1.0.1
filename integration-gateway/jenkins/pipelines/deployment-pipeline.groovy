/**
 * Jenkins Pipeline for Multi-Environment Deployment with Validation, Approvals, and Rollback
 *
 * This pipeline provides a comprehensive, secure deployment process across multiple environments
 * (development, staging, production) with validation steps, manual approvals, and
 * automated rollback capabilities.
 *
 * Features:
 * - Multi-environment support with environment-specific configurations
 * - Pre-deployment validation checks
 * - Database migration handling
 * - Incremental deployment with health checks
 * - Post-deployment verification
 * - Automated monitoring and rollback capabilities
 * - Integration with notification systems
 * - Security scanning during deployment process
 * 
 * Author: DrLucyAutomation service account
 */

pipeline {
    agent any
    
    // Environment variables used throughout the pipeline
    environment {
        SERVICE_ACCOUNT = credentials('drla-service-account')
        DEPLOY_TIMEOUT = '30'
        SLACK_CHANNEL = '#deployments'
        MONITORING_PERIOD = '10' // minutes to monitor after deployment
        APP_NAME = 'myapp'
        PROJECT_ID = 'api-for-warp-drive'
    }
    
    // Parameters that can be specified when triggering the pipeline
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'production'], description: 'Deployment target environment')
        string(name: 'VERSION', defaultValue: 'latest', description: 'Version tag to deploy')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip pre-deployment tests')
        booleanParam(name: 'PERFORM_DB_MIGRATION', defaultValue: true, description: 'Perform database migrations')
        booleanParam(name: 'ENABLE_AUTO_ROLLBACK', defaultValue: true, description: 'Enable automatic rollback on failure')
        string(name: 'DEPLOYMENT_DESCRIPTION', defaultValue: '', description: 'Description for this deployment')
    }
    
    options {
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }
    
    stages {
        // Initialize the pipeline with authentication and setup
        stage('Initialize') {
            steps {
                script {
                    // Set environment-specific configurations
                    switch(params.ENVIRONMENT) {
                        case 'dev':
                            env.DEPLOY_NAMESPACE = 'development'
                            env.REPLICAS = '1'
                            env.REQUIRES_APPROVAL = 'false'
                            break
                        case 'staging':
                            env.DEPLOY_NAMESPACE = 'staging'
                            env.REPLICAS = '2'
                            env.REQUIRES_APPROVAL = 'false'
                            break
                        case 'production':
                            env.DEPLOY_NAMESPACE = 'production'
                            env.REPLICAS = '3'
                            env.REQUIRES_APPROVAL = 'true'
                            break
                        default:
                            error "Invalid environment specified: ${params.ENVIRONMENT}"
                    }
                    
                    // Authenticate with service account
                    sh '''
                        echo "${SERVICE_ACCOUNT}" > service-account-key.json
                        gcloud auth activate-service-account --key-file=service-account-key.json
                        gcloud config set project ${PROJECT_ID}
                        kubectl config use-context gke_${PROJECT_ID}_us-west1_${DEPLOY_NAMESPACE}-cluster
                    '''
                    
                    // Log deployment start
                    def deploymentDetails = """
                        Environment: ${params.ENVIRONMENT}
                        Version: ${params.VERSION}
                        Initiated by: ${env.BUILD_USER ?: 'DrLucyAutomation'}
                        Description: ${params.DEPLOYMENT_DESCRIPTION ?: 'No description provided'}
                    """
                    
                    // Notify deployment start
                    slackSend(
                        channel: "${SLACK_CHANNEL}",
                        color: '#36a64f',
                        message: "🚀 *DEPLOYMENT STARTED*\n${deploymentDetails}"
                    )
                    
                    // Create a deployment record
                    sh "echo '${deploymentDetails}' > deployment_record.txt"
                    sh "echo 'Deployment ID: ${env.BUILD_NUMBER}' >> deployment_record.txt"
                    sh "date >> deployment_record.txt"
                }
            }
        }
        
        // Pre-deployment validation stage
        stage('Pre-Deployment Validation') {
            when {
                expression { !params.SKIP_TESTS }
            }
            parallel {
                stage('Configuration Validation') {
                    steps {
                        script {
                            echo "Validating deployment configurations for ${params.ENVIRONMENT} environment"
                            
                            // Validate Kubernetes manifests
                            sh """
                                kubectl kustomize k8s/overlays/${params.ENVIRONMENT} > generated_manifests.yaml
                                kubeval --kubernetes-version 1.22.0 generated_manifests.yaml
                            """
                            
                            // Validate environment-specific configuration
                            sh """
                                # Check for required config files
                                test -f "config/${params.ENVIRONMENT}.yaml" || (echo "Missing config file for ${params.ENVIRONMENT}" && exit 1)
                                
                                # Validate config schema
                                yamllint -c .yamllint.yml "config/${params.ENVIRONMENT}.yaml"
                            """
                        }
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        script {
                            echo "Running security scan on deployment artifacts"
                            
                            // Scan container images for vulnerabilities
                            sh """
                                # Pull the image to be deployed
                                docker pull ${env.APP_NAME}:${params.VERSION}
                                
                                # Run Trivy scan
                                trivy image --severity HIGH,CRITICAL --exit-code 1 ${env.APP_NAME}:${params.VERSION} || true
                                
                                # Generate scan report
                                trivy image --format json --output trivy-results.json ${env.APP_NAME}:${params.VERSION}
                            """
                            
                            // Archive security scan results
                            archiveArtifacts artifacts: 'trivy-results.json', allowEmptyArchive: true
                        }
                    }
                }
                
                stage('Dependency Check') {
                    steps {
                        script {
                            echo "Validating dependencies for ${params.VERSION}"
                            
                            // Check for deprecated or vulnerable dependencies
                            sh """
                                # Pull dependency information
                                docker run --rm ${env.APP_NAME}:${params.VERSION} npm list --json > dependencies.json
                                
                                # Check for outdated dependencies (information only)
                                docker run --rm ${env.APP_NAME}:${params.VERSION} npm outdated --json > outdated_dependencies.json || true
                            """
                            
                            // Archive dependency reports
                            archiveArtifacts artifacts: '*dependencies.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        // Get deployment approval if required
        stage('Deployment Approval') {
            when {
                expression { env.REQUIRES_APPROVAL == 'true' }
            }
            steps {
                script {
                    // Send notification for approval
                    slackSend(
                        channel: "${SLACK_CHANNEL}",
                        color: '#f2c744',
                        message: "⏱ *APPROVAL NEEDED*\nDeployment to ${params.ENVIRONMENT} environment requires approval.\nPlease check Jenkins at ${env.BUILD_URL}"
                    )
                    
                    // Wait for approval
                    timeout(time: 24, unit: 'HOURS') {
                        input(
                            message: "Deploy to ${params.ENVIRONMENT}?",
                            ok: "Yes, deploy!",
                            submitterParameter: "APPROVER"
                        )
                    }
                    
                    // Record approver
                    sh "echo 'Approved by: ${APPROVER}' >> deployment_record.txt"
                    
                    // Notify of approval
                    slackSend(
                        channel: "${SLACK_CHANNEL}",
                        color: '#36a64f',
                        message: "✅ *DEPLOYMENT APPROVED*\nDeployment to ${params.ENVIRONMENT} approved by ${APPROVER}"
                    )
                }
            }
        }
        
        // Handle database migrations
        stage('Database Migration') {
            when {
                expression { params.PERFORM_DB_MIGRATION }
            }
            steps {
                script {
                    echo "Running database migrations for ${params.ENVIRONMENT} environment"
                    
                    // Take database backup before migration
                    sh """
                        # Create timestamp for backup
                        TIMESTAMP=\$(date +%Y%m%d%H%M%S)
                        
                        # Backup database
                        gcloud sql export sql ${params.ENVIRONMENT}-db \\
                            gs://${PROJECT_ID}-db-backups/${params.ENVIRONMENT}/pre-deploy-\${TIMESTAMP}.sql \\
                            --database=main
                            
                        echo "Database backup created at gs://${PROJECT_ID}-db-backups/${params.ENVIRONMENT}/pre-deploy-\${TIMESTAMP}.sql"
                        echo "Backup ID: pre-deploy-\${TIMESTAMP}" > migration_backup_id.txt
                    """
                    
                    try {
                        // Run migrations
                        sh """
                            # Apply migrations using migration container
                            kubectl run migration-job \\
                                --image=${env.APP_NAME}-migrations:${params.VERSION} \\
                                --restart=Never \\
                                --env="DB_ENV=${params.ENVIRONMENT}" \\
                                --namespace=${env.DEPLOY_NAMESPACE}
                                
                            # Wait for migration to complete
                            kubectl wait --for=condition=complete job/migration-job \\
                                --namespace=${env.DEPLOY_NAMESPACE} \\
                                --timeout=${DEPLOY_TIMEOUT}m
                                
                            # Get migration logs
                            kubectl logs job/migration-job -n ${env.DEPLOY_NAMESPACE} > migration_logs.txt
                        """
                        
                        // Archive migration logs
                        archiveArtifacts artifacts: 'migration_logs.txt', allowEmptyArchive: true
                        
                        // Notify on successful migration
                        slackSend(
                            channel: "${SLACK_CHANNEL}",
                            color: '#36a64f',
                            message: "✅ *DB MIGRATION SUCCESSFUL*\nDatabase migration for ${params.ENVIRONMENT} completed successfully."
                        )
                    } catch (Exception e) {
                        // Notify on failed migration
                        slackSend(
                            channel: "${SLACK_CHANNEL}",
                            color: '#ff0000',
                            message: "❌ *DB MIGRATION FAILED*\nDatabase migration for ${params.ENVIRONMENT} failed: ${e.message}"
                        )
                        
                        // Restore from backup if migration fails
                        sh """
                            BACKUP_ID=\$(cat migration_backup_id.txt)
                            echo "Restoring database from backup \${BACKUP_ID}"
                            
                            gcloud sql import sql ${params.ENVIRONMENT}-db \\
                                gs://${PROJECT_ID}-db-backups/${params.ENVIRONMENT}/\${BACKUP_ID}.sql \\
                                --database=main
                        """
                        
                        error "Database migration failed: ${e.message}"
                    }
                }
            }
        }
        
        // Deploy to the target environment
        stage('Deploy') {
            steps {
                script {
                    echo "Deploying to ${params.ENVIRONMENT} environment"
                    
                    // Store current deployment info for potential rollback
                    sh """
                        kubectl get deployment ${env.APP_NAME} -n ${env.DEPLOY_NAMESPACE} -o yaml > previous_deployment.yaml || echo "No previous deployment found"
                    """
                    
                    try {
                        // Apply Kubernetes manifests
                        sh """
                            # Apply using Kustomize
                            kubectl apply -k k8s/overlays/${params.ENVIRONMENT} --record
                            
                            # Set container image version
                            kubectl set image deployment/${env.APP_NAME} \\
                                ${env.APP_NAME}=${env.APP_NAME}:${params.VERSION} \\
                                -n ${env.DEPLOY_NAMESPACE}
                                
                            # Scale deployment
                            kubectl scale deployment/${env.APP_NAME} \\
                                --replicas=${env.REPLICAS} \\
                                -n ${env.DEPLOY_NAMESPACE}
                                
                            # Wait for rollout to complete
                            kubectl rollout status deployment/${env.APP_NAME} \\
                                -n ${env.DEPLOY_NAMESPACE} \\
                                --timeout=${DEPLOY_TIMEOUT}m
                        """
                        
                        // Record deployment details
                        sh """
                            echo "Deployment completed at \$(date)" >> deployment_record.txt
                            kubectl get deployment ${env.APP_NAME} -n ${env.DEPLOY_NAMESPACE} -o wide >> deployment_record.txt
                        """
                        
                        // Notify successful deployment
                        slackSend(
                            channel: "${SLACK_CHANNEL}",
                            color: '#36a64f',
                            message: "✅ *DEPLOYMENT SUCCESSFUL*\nDeployment to ${params.ENVIRONMENT} completed successfully.\nVersion: ${params.VERSION}"
                        )
                    } catch (Exception e) {
                        // Notify deployment failure
                        slackSend(
                            channel: "${SLACK_CHANNEL}",
                            color: '#ff0000',
                            message: "❌ *DEPLOYMENT FAILED*\nDeployment to ${params.ENVIRONMENT} failed: ${e.message}"
                        )
                        
                        error "Deployment failed: ${e.message}"
                    }
                }
            }
        }
        
        // Verify the deployment
        stage('Post-Deployment Verification') {
            parallel {
                stage('Basic Health Check') {
                    steps {
                        script {
                            echo "Running health checks for ${params.ENVIRONMENT} deployment"
                            
                            // Get service URL based on environment
                            def serviceUrl = sh(
                                script: "kubectl get svc ${env.APP_NAME} -n ${env.DEPLOY_NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}'",
                                returnStdout: true
                            ).trim()
                            
                            // Perform health checks
                            sh """
                                # Wait for service to be accessible
                                timeout ${DEPLOY_TIMEOUT}m bash -c 'until curl -s ${serviceUrl}/health; do sleep 10; done'
                                
                                # Check API endpoints
                                curl -s ${serviceUrl}/api/status > api_status.json
                                
                                # Validate API response
                                jq '.status == "ok"' api_status.json
                            """
                            
                            // Archive health check results
                            archiveArtifacts artifacts: 'api_status.json', allowEmptyArchive: true
                        }
                    }
                }
                
                stage('Functional Tests') {
                    steps {
                        script {
                

