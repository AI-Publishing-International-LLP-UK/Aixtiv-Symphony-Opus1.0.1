#!/usr/bin/env groovy

/**
 * CI/CD Pipeline for Dr. Lucy Automation
 * 
 * This pipeline handles the complete CI/CD process including:
 * - Code checkout
 * - Dependency installation
 * - Building
 * - Testing
 * - Security scanning
 * - Multi-environment deployment (dev, staging, production)
 * - Post-deployment verification
 *
 * Authentication is performed using the DrLucyAutomation service account
 */

pipeline {
    agent any
    
    // Configure global options
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
    }
    
    // Environment variables
    environment {
        DRLA_SERVICE_ACCOUNT = credentials('drla-service-account-key')
        PROJECT_ID = 'api-for-warp-drive'
        NOTIFICATION_CHANNEL = '#git-lucy'
        DOCKER_REGISTRY = 'us-west1-docker.pkg.dev/api-for-warp-drive/drlucy-automation'
        APP_NAME = 'drlucy-app'
    }
    
    // Parameters that can be customized when triggering the pipeline
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'production'], description: 'Deployment environment')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip running tests')
        booleanParam(name: 'SKIP_SECURITY_SCAN', defaultValue: false, description: 'Skip security scanning')
        string(name: 'BRANCH_NAME', defaultValue: 'main', description: 'Branch to build and deploy')
        string(name: 'VERSION', defaultValue: '', description: 'Version to deploy (leave empty for auto-versioning)')
    }
    
    stages {
        // Authentication stage
        stage('Authenticate') {
            steps {
                script {
                    // Authenticate with Google Cloud using the DrLucyAutomation service account
                    sh '''
                        echo "${DRLA_SERVICE_ACCOUNT}" > /tmp/drla-key.json
                        gcloud auth activate-service-account --key-file=/tmp/drla-key.json
                        gcloud config set project ${PROJECT_ID}
                    '''
                    
                    // Send notification of pipeline start
                    slackSend(
                        channel: "${NOTIFICATION_CHANNEL}",
                        color: '#0000FF',
                        message: "🚀 *CI/CD Pipeline Started*: ${currentBuild.fullDisplayName}\nEnvironment: ${params.ENVIRONMENT}\nBranch: ${params.BRANCH_NAME}"
                    )
                }
            }
        }
        
        // Code checkout stage
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "${params.BRANCH_NAME}"]],
                    doGenerateSubmoduleConfigurations: false,
                    extensions: [[$class: 'CleanBeforeCheckout']],
                    userRemoteConfigs: [[
                        credentialsId: 'github-credentials',
                        url: 'https://github.com/AI-Publishing-International-LLP-UK/Aixtiv-Symphony-Opus1.0.1.git'
                    ]]
                ])
                
                script {
                    // Set version if not provided
                    if (!params.VERSION) {
                        env.BUILD_VERSION = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    } else {
                        env.BUILD_VERSION = params.VERSION
                    }
                    
                    echo "Building version: ${env.BUILD_VERSION}"
                }
            }
        }
        
        // Install dependencies stage
        stage('Install Dependencies') {
            steps {
                script {
                    // Detect package manager and install dependencies
                    if (fileExists('package.json')) {
                        sh '''
                            if [ -f "yarn.lock" ]; then
                                yarn install --frozen-lockfile
                            else
                                npm ci
                            fi
                        '''
                    } else if (fileExists('pom.xml')) {
                        sh 'mvn dependency:resolve'
                    } else if (fileExists('build.gradle')) {
                        sh './gradlew dependencies'
                    } else if (fileExists('requirements.txt')) {
                        sh 'pip install -r requirements.txt'
                    } else {
                        echo "No known dependency file found"
                    }
                }
            }
        }
        
        // Build stage
        stage('Build') {
            steps {
                script {
                    // Build based on detected project type
                    if (fileExists('package.json')) {
                        sh '''
                            if [ -f "yarn.lock" ]; then
                                yarn build
                            else
                                npm run build
                            fi
                        '''
                    } else if (fileExists('pom.xml')) {
                        sh 'mvn package -DskipTests'
                    } else if (fileExists('build.gradle')) {
                        sh './gradlew build -x test'
                    } else if (fileExists('requirements.txt')) {
                        echo "Python build not needed"
                    } else {
                        error "No known build system found"
                    }
                    
                    // Build Docker image
                    sh """
                        docker build -t ${DOCKER_REGISTRY}/${APP_NAME}:${env.BUILD_VERSION} .
                        docker tag ${DOCKER_REGISTRY}/${APP_NAME}:${env.BUILD_VERSION} ${DOCKER_REGISTRY}/${APP_NAME}:latest
                    """
                }
            }
        }
        
        // Test stage
        stage('Test') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            if (fileExists('package.json')) {
                                sh '''
                                    if [ -f "yarn.lock" ]; then
                                        yarn test:unit
                                    else
                                        npm run test:unit
                                    fi
                                '''
                            } else if (fileExists('pom.xml')) {
                                sh 'mvn test'
                            } else if (fileExists('build.gradle')) {
                                sh './gradlew test'
                            } else if (fileExists('requirements.txt')) {
                                sh 'pytest tests/unit'
                            }
                        }
                    }
                    post {
                        always {
                            junit '**/test-results/unit/**/*.xml'
                        }
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        script {
                            if (fileExists('package.json')) {
                                sh '''
                                    if [ -f "yarn.lock" ]; then
                                        yarn test:integration
                                    else
                                        npm run test:integration
                                    fi
                                '''
                            } else if (fileExists('pom.xml')) {
                                sh 'mvn verify -DskipUnitTests'
                            } else if (fileExists('build.gradle')) {
                                sh './gradlew integrationTest'
                            } else if (fileExists('requirements.txt')) {
                                sh 'pytest tests/integration'
                            }
                        }
                    }
                    post {
                        always {
                            junit '**/test-results/integration/**/*.xml'
                        }
                    }
                }
                
                stage('Code Coverage') {
                    steps {
                        script {
                            if (fileExists('package.json')) {
                                sh '''
                                    if [ -f "yarn.lock" ]; then
                                        yarn coverage
                                    else
                                        npm run coverage
                                    fi
                                '''
                            } else if (fileExists('pom.xml')) {
                                sh 'mvn jacoco:report'
                            } else if (fileExists('build.gradle')) {
                                sh './gradlew jacocoTestReport'
                            }
                        }
                    }
                    post {
                        success {
                            publishCoverage(
                                adapters: [
                                    istanbulCoberturaAdapter('coverage/cobertura-coverage.xml')
                                ]
                            )
                        }
                    }
                }
            }
        }
        
        // Security scanning stage
        stage('Security Scan') {
            when {
                expression { return !params.SKIP_SECURITY_SCAN }
            }
            parallel {
                stage('SAST') {
                    steps {
                        script {
                            // Static Application Security Testing
                            sh 'sonar-scanner'
                        }
                    }
                }
                
                stage('Dependency Scan') {
                    steps {
                        script {
                            // Scan dependencies for vulnerabilities
                            if (fileExists('package.json')) {
                                sh 'npm audit --json || true'
                            } else if (fileExists('pom.xml')) {
                                sh 'mvn dependency-check:check'
                            } else if (fileExists('build.gradle')) {
                                sh './gradlew dependencyCheckAnalyze'
                            }
                        }
                    }
                }
                
                stage('Container Scan') {
                    steps {
                        script {
                            // Scan docker container for vulnerabilities
                            sh "trivy image ${DOCKER_REGISTRY}/${APP_NAME}:${env.BUILD_VERSION}"
                        }
                    }
                }
            }
        }
        
        // Push Docker image stage
        stage('Push Image') {
            steps {
                script {
                    // Authenticate with Google Container Registry/Artifact Registry
                    sh '''
                        gcloud auth configure-docker us-west1-docker.pkg.dev
                    '''
                    
                    // Push the Docker image
                    sh """
                        docker push ${DOCKER_REGISTRY}/${APP_NAME}:${env.BUILD_VERSION}
                        docker push ${DOCKER_REGISTRY}/${APP_NAME}:latest
                    """
                }
            }
        }
        
        // Deployment stages for different environments
        stage('Deploy to Dev') {
            when {
                expression { return params.ENVIRONMENT == 'dev' }
            }
            steps {
                script {
                    // Deploy to development environment
                    sh '''
                        gcloud run deploy ${APP_NAME}-dev \\
                            --image ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION} \\
                            --region us-west1 \\
                            --platform managed \\
                            --allow-unauthenticated \\
                            --service-account drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com \\
                            --set-env-vars="NODE_ENV=development"
                    '''
                    
                    // Store the deployment URL
                    env.DEPLOY_URL = sh(
                        script: 'gcloud run services describe ${APP_NAME}-dev --region us-west1 --format="value(status.url)"',
                        returnStdout: true
                    ).trim()
                    
                    echo "Deployed to: ${env.DEPLOY_URL}"
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                expression { return params.ENVIRONMENT == 'staging' }
            }
            steps {
                script {
                    // Deploy to staging environment
                    sh '''
                        gcloud run deploy ${APP_NAME}-staging \\
                            --image ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION} \\
                            --region us-west1 \\
                            --platform managed \\
                            --service-account drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com \\
                            --set-env-vars="NODE_ENV=staging"
                    '''
                    
                    // Store the deployment URL
                    env.DEPLOY_URL = sh(
                        script: 'gcloud run services describe ${APP_NAME}-staging --region us-west1 --format="value(status.url)"',
                        returnStdout: true
                    ).trim()
                    
                    echo "Deployed to: ${env.DEPLOY_URL}"
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                expression { return params.ENVIRONMENT == 'production' }
            }
            steps {
                // Require manual approval for production deployments
                timeout(time: 1, unit: 'HOURS') {
                    input message: 'Approve production deployment?', ok: 'Deploy'
                }
                
                script {
                    // Deploy to production environment
                    sh '''
                        gcloud run deploy ${APP_NAME} \\
                            --image ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION} \\
                            --region us-west1 \\
                            --platform managed \\
                            --service-account drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com \\
                            --set-env-vars="NODE_ENV=production" \\
                            --min-instances=1
                    '''
                    
                    // Store the deployment URL
                    env.DEPLOY_URL = sh(
                        script: 'gcloud run services describe ${APP_NAME} --region us-west1 --format="value(status.url)"',
                        returnStdout: true
                    ).trim()
                    
                    echo "Deployed to: ${env.DEPLOY_URL}"
                }
            }
        }
        
        // Post-deployment verification stage
        stage('Verify Deployment') {
            steps {
                script {
                    // Wait for deployment to stabilize
                    sleep 30
                    
                    // Perform health check on deployed service
                    def responseCode = sh(
                        script: "curl -s -o /dev/null -w \"%{http_code}\" ${env.DEPLOY_URL}/health",
                        returnStdout: true
                    ).trim()
                    
                    if (responseCode != "200") {
                        error "Health check failed with response code: ${responseCode}"
                    }
                    
                    // Run smoke tests against deployed service
                    sh """
                        echo "Running smoke tests against ${env.DEPLOY_URL}"
                        
                        # Example smoke test commands
                        if [ -f "yarn.lock" ]; then
                            ENDPOINT=${env.DEPLOY_URL} yarn test:smoke
                        else
                            ENDPOINT=${env.DEPLOY_URL} npm run test:smoke
                        fi
                    """
                }
            }
        }
    }
    
    // Post-pipeline actions
    post {
        success {
            script {
                slackSend(
                    channel: "${NOTIFICATION_CHANNEL}",
                    color: '#00FF00',
                    message: """
                        ✅ *CI/CD Pipeline Successful*: ${currentBuild.fullDisplayName}
                        Environment: ${params.ENVIRONMENT}
                        Version: ${env.BUILD_VERSION}
                        Deployment URL: ${env.DEPLOY_URL}
                    """
                )
                
                // Create GitHub release for production deployments
                if (params.ENVIRONMENT == 'production') {
                    sh """
                        gh release create v${env.BUILD_VERSION} \\

