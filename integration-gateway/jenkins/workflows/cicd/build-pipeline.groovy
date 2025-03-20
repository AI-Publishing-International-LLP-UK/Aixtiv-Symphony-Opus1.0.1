#!/usr/bin/env groovy

/**
 * Build Pipeline
 *
 * This pipeline handles the build process for Node.js 20 applications,
 * including dependency installation, testing, code quality checks,
 * and Docker image creation.
 *
 * Authentication is handled through the DrLucyAutomation service account.
 */

// Pipeline parameters for customization
properties([
    parameters([
        string(
            defaultValue: 'main',
            description: 'Git branch to build',
            name: 'BRANCH'
        ),
        choice(
            choices: ['development', 'staging', 'production'],
            description: 'Target environment',
            name: 'ENVIRONMENT'
        ),
        choice(
            choices: ['standard', 'quick', 'full'],
            description: 'Build type (standard, quick = no tests, full = with extra validation)',
            name: 'BUILD_TYPE'
        ),
        booleanParam(
            defaultValue: true,
            description: 'Push Docker image after building',
            name: 'PUSH_IMAGE'
        ),
        booleanParam(
            defaultValue: true,
            description: 'Send notifications on completion',
            name: 'NOTIFY'
        )
    ])
])

// Node to run the pipeline on
node {
    // Environment variables
    def appName = 'integration-gateway'
    def nodeVersion = '20.10.0'  // Specify Node 20 version
    def imageTag = "${params.ENVIRONMENT}-${env.BUILD_NUMBER}"
    def serviceAccount = 'drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com'
    def dockerRegistry = 'gcr.io/api-for-warp-drive'
    
    // Store information about the build
    def buildInfo = [
        'startTime': new Date().format("yyyy-MM-dd HH:mm:ss", TimeZone.getTimeZone('UTC')),
        'success': false,
        'duration': 0
    ]
    
    try {
        stage('Checkout') {
            // Clean workspace before checkout
            cleanWs()
            
            // Checkout the code
            checkout([
                $class: 'GitSCM',
                branches: [[name: "refs/heads/${params.BRANCH}"]],
                doGenerateSubmoduleConfigurations: false,
                extensions: [[$class: 'CleanBeforeCheckout']],
                submoduleCfg: [],
                userRemoteConfigs: [[
                    credentialsId: 'git-credentials',
                    url: 'https://github.com/your-org/integration-gateway.git'
                ]]
            ])
            
            // Save the commit information
            buildInfo['commit'] = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
            buildInfo['commitMessage'] = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
            buildInfo['author'] = sh(script: 'git log -1 --pretty=%an', returnStdout: true).trim()
            
            echo "Building commit: ${buildInfo.commit}"
            echo "Commit message: ${buildInfo.commitMessage}"
            echo "Author: ${buildInfo.author}"
        }
        
        stage('Setup Node.js') {
            // Use nvm to install and use the correct Node.js version
            sh """
                export NVM_DIR="\$HOME/.nvm"
                [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
                nvm install ${nodeVersion}
                nvm use ${nodeVersion}
                node --version
                npm --version
            """
            
            echo "Node.js ${nodeVersion} setup complete"
        }
        
        stage('Authenticate') {
            // Authenticate with Google Cloud using the DrLucyAutomation service account
            withCredentials([file(credentialsId: 'drla-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                sh """
                    gcloud auth activate-service-account ${serviceAccount} --key-file=${GOOGLE_APPLICATION_CREDENTIALS}
                    gcloud config set project api-for-warp-drive
                    gcloud auth configure-docker gcr.io -q
                """
            }
            
            echo "Authenticated as ${serviceAccount}"
        }
        
        stage('Install Dependencies') {
            // Use Corepack for better package manager handling (Node 20 feature)
            sh """
                corepack enable
                npm ci
            """
            
            // Check for security vulnerabilities if doing a full build
            if (params.BUILD_TYPE == 'full') {
                sh 'npm audit --production'
            }
            
            echo "Dependencies installed successfully"
        }
        
        stage('Code Quality') {
            // Skip for quick builds
            if (params.BUILD_TYPE == 'quick') {
                echo "Skipping code quality checks for quick build"
                return
            }
            
            // Run linting
            sh 'npm run lint'
            
            // Run TypeScript compiler in verification mode
            sh 'npm run check-types'
            
            echo "Code quality checks passed"
        }
        
        stage('Build') {
            // Build the application
            sh 'npm run build'
            
            // Archive the build artifacts
            archiveArtifacts artifacts: 'dist/**/*', allowEmptyArchive: false
            
            echo "Build completed successfully"
        }
        
        stage('Test') {
            // Skip for quick builds
            if (params.BUILD_TYPE == 'quick') {
                echo "Skipping tests for quick build"
                return
            }
            
            try {
                // Run unit tests with coverage
                // Node 20 has improved V8 coverage, so use c8 instead of nyc/istanbul if available
                sh '''
                    if npm list -g c8 > /dev/null 2>&1; then
                        c8 npm test
                    else
                        npm run test:coverage
                    fi
                '''
                
                // Generate test reports
                junit 'test-results/*.xml'
                
                // If doing a full build, run integration tests too
                if (params.BUILD_TYPE == 'full') {
                    sh 'npm run test:integration'
                }
                
                echo "Tests completed successfully"
            } catch (Exception e) {
                if (params.ENVIRONMENT == 'production') {
                    // Fail the build if tests fail in production
                    throw e
                } else {
                    // Just warn for non-production environments
                    echo "WARNING: Tests failed but continuing build for ${params.ENVIRONMENT}"
                }
            }
        }
        
        stage('Docker Image') {
            // Build the Docker image with Node 20 base image
            def imageName = "${dockerRegistry}/${appName}:${imageTag}"
            
            sh """
                docker build -t ${imageName} \
                    --build-arg NODE_VERSION=${nodeVersion} \
                    --build-arg NODE_ENV=${params.ENVIRONMENT} \
                    --build-arg BUILD_NUMBER=${env.BUILD_NUMBER} \
                    .
            """
            
            // Push the image if requested
            if (params.PUSH_IMAGE) {
                sh "docker push ${imageName}"
                
                // Also tag as latest for the environment
                sh """
                    docker tag ${imageName} ${dockerRegistry}/${appName}:${params.ENVIRONMENT}-latest
                    docker push ${dockerRegistry}/${appName}:${params.ENVIRONMENT}-latest
                """
                
                echo "Docker image pushed to ${imageName}"
            } else {
                echo "Docker image built but not pushed"
            }
            
            // Store the image info
            buildInfo['imageTag'] = imageTag
            buildInfo['imageName'] = imageName
            buildInfo['nodeVersion'] = nodeVersion
        }
        
        // Mark the build as successful
        buildInfo['success'] = true
        currentBuild.result = 'SUCCESS'
        
    } catch (Exception e) {
        currentBuild.result = 'FAILURE'
        echo "Build failed: ${e.message}"
        throw e
    } finally {
        // Calculate build duration
        def endTime = new Date()
        def duration = (endTime.time - new Date(buildInfo.startTime).time) / 1000
        buildInfo['duration'] = duration
        buildInfo['endTime'] = endTime.format("yyyy-MM-dd HH:mm:ss", TimeZone.getTimeZone('UTC'))
        
        // Send notifications if enabled
        if (params.NOTIFY) {
            def status = buildInfo.success ? 'SUCCESS' : 'FAILURE'
            def color = buildInfo.success ? 'good' : 'danger'
            
            // Slack notification
            slackSend(
                channel: '#build-notifications',
                color: color,
                message: """
                *Build ${env.BUILD_NUMBER} - ${status}*
                Branch: ${params.BRANCH}
                Environment: ${params.ENVIRONMENT}
                Build Type: ${params.BUILD_TYPE}
                Node.js: ${nodeVersion}
                Duration: ${buildInfo.duration} seconds
                Commit: ${buildInfo.commit}
                Image: ${buildInfo.imageName ?: 'N/A'}
                """
            )
        }
        
        // Generate build report
        writeFile file: 'build-report.json', text: groovy.json.JsonOutput.toJson(buildInfo)
        archiveArtifacts artifacts: 'build-report.json', allowEmptyArchive: false
    }
}

#!/usr/bin/env groovy

/**
 * Comprehensive Build Pipeline
 * 
 * This pipeline handles the build process for projects with support for multiple programming languages.
 * It includes stages for code checkout, dependency installation, static code analysis, building,
 * unit testing, code coverage analysis, and packaging.
 *
 * The pipeline automatically detects the programming language (Node.js, Java, Python)
 * and adjusts the build process accordingly.
 *
 * Service Account: DrLucyAutomation (drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com)
 */

// Pipeline parameters for customization
properties([
    parameters([
        string(
            defaultValue: 'main',
            description: 'Git branch to build',
            name: 'BRANCH'
        ),
        choice(
            choices: ['development', 'staging', 'production'],
            description: 'Target environment for the build',
            name: 'ENVIRONMENT'
        ),
        choice(
            choices: ['auto-detect', 'nodejs', 'java', 'python'],
            description: 'Programming language (auto-detect will determine based on project files)',
            name: 'LANGUAGE'
        ),
        choice(
            choices: ['standard', 'optimized', 'debug'],
            description: 'Type of build to perform',
            name: 'BUILD_TYPE'
        ),
        booleanParam(
            defaultValue: true,
            description: 'Run static code analysis',
            name: 'RUN_STATIC_ANALYSIS'
        ),
        booleanParam(
            defaultValue: true,
            description: 'Run unit tests',
            name: 'RUN_TESTS'
        ),
        booleanParam(
            defaultValue: true,
            description: 'Build and publish Docker image',
            name: 'BUILD_DOCKER'
        ),
        string(
            defaultValue: '',
            description: 'SonarQube project key (leave empty to use default)',
            name: 'SONAR_PROJECT_KEY'
        ),
        booleanParam(
            defaultValue: true,
            description: 'Send notifications to Slack',
            name: 'NOTIFY_SLACK'
        ),
        booleanParam(
            defaultValue: true,
            description: 'Send notifications to email',
            name: 'NOTIFY_EMAIL'
        ),
        text(
            defaultValue: '',
            description: 'Additional build arguments (in format: key1=value1,key2=value2)',
            name: 'BUILD_ARGS'
        )
    ])
])

// Global variables
def projectLanguage = 'nodejs' // Default language, will be updated during detection
def buildVersion = ''
def buildTimestamp = new Date().format('yyyyMMdd-HHmmss')
def dockerImageTag = ''
def testResults = [:]
def coverageResults = [:]
def sonarQubeResults = [:]
def buildSuccess = true

// Node definition
node {
    // Environment variables
    env.ENVIRONMENT = params.ENVIRONMENT
    env.BUILD_TYPE = params.BUILD_TYPE
    
    // Service account email for authentication
    def serviceAccountEmail = 'drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com'

    // Pipeline execution
    try {
        stage('Initialize') {
            // Display information about the build
            echo "Starting build pipeline with Dr. Lucy Automation"
            echo "Branch: ${params.BRANCH}"
            echo "Environment: ${params.ENVIRONMENT}"
            echo "Build Type: ${params.BUILD_TYPE}"
            
            // Clean workspace
            cleanWs()
            
            // Create build ID and timestamp
            env.BUILD_ID = "${env.JOB_NAME}-${env.BUILD_NUMBER}-${buildTimestamp}"
            echo "Build ID: ${env.BUILD_ID}"
        }
        
        stage('Checkout') {
            // Checkout code from SCM
            checkout([
                $class: 'GitSCM',
                branches: [[name: params.BRANCH]],
                extensions: [[$class: 'CleanBeforeCheckout']],
                userRemoteConfigs: scm.userRemoteConfigs
            ])
            
            // Extract version information from project
            if (fileExists('package.json')) {
                buildVersion = sh(script: "grep -m1 '\"version\":' package.json | cut -d '\"' -f 4", returnStdout: true).trim()
            } else if (fileExists('pom.xml')) {
                buildVersion = sh(script: "grep -m1 '<version>' pom.xml | sed 's/.*<version>\\(.*\\)<\\/version>.*/\\1/'", returnStdout: true).trim()
            } else if (fileExists('setup.py')) {
                buildVersion = sh(script: "grep -m1 'version=' setup.py | cut -d \"'\" -f 2", returnStdout: true).trim() 
            } else {
                buildVersion = env.BUILD_NUMBER
            }
            
            echo "Build version: ${buildVersion}"
            env.BUILD_VERSION = buildVersion
            
            // Set Docker image tag
            dockerImageTag = "${env.ENVIRONMENT}-${buildVersion}-${buildTimestamp}"
            env.DOCKER_TAG = dockerImageTag
        }
        
        stage('Detect Language') {
            if (params.LANGUAGE == 'auto-detect') {
                echo "Auto-detecting programming language..."
                
                // Node.js detection
                if (fileExists('package.json')) {
                    projectLanguage = 'nodejs'
                }
                // Java detection
                else if (fileExists('pom.xml') || fileExists('build.gradle')) {
                    projectLanguage = 'java'
                }
                // Python detection
                else if (fileExists('requirements.txt') || fileExists('setup.py') || fileExists('Pipfile')) {
                    projectLanguage = 'python'
                }
                else {
                    echo "Could not detect language. Defaulting to Node.js"
                    projectLanguage = 'nodejs'
                }
            } else {
                projectLanguage = params.LANGUAGE
            }
            
            echo "Detected/Selected language: ${projectLanguage}"
            env.PROJECT_LANGUAGE = projectLanguage
        }
        
        stage('Authenticate') {
            // Authenticate with Google Cloud using the DrLucyAutomation service account
            withCredentials([file(credentialsId: 'drla-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                sh """
                    gcloud auth activate-service-account ${serviceAccountEmail} --key-file=${GOOGLE_APPLICATION_CREDENTIALS}
                    gcloud config set project api-for-warp-drive
                """
            }
        }
        
        stage('Install Dependencies') {
            echo "Installing dependencies for ${projectLanguage}..."
            
            switch(projectLanguage) {
                case 'nodejs':
                    // Check if using npm or yarn
                    if (fileExists('yarn.lock')) {
                        sh 'yarn install'
                    } else {
                        sh 'npm ci'
                    }
                    break
                    
                case 'java':
                    // Check if using Maven or Gradle
                    if (fileExists('pom.xml')) {
                        sh 'mvn dependency:go-offline'
                    } else if (fileExists('build.gradle')) {
                        sh './gradlew dependencies'
                    }
                    break
                    
                case 'python':
                    // Check which package manager to use
                    if (fileExists('Pipfile')) {
                        sh 'pipenv install --dev'
                    } else if (fileExists('poetry.lock')) {
                        sh 'poetry install'
                    } else {
                        sh 'pip install -r requirements.txt'
                        if (fileExists('requirements-dev.txt')) {
                            sh 'pip install -r requirements-dev.txt'
                        }
                    }
                    break
            }
            
            echo "Dependencies installed successfully."
        }
        
        if (params.RUN_STATIC_ANALYSIS) {
            stage('Static Code Analysis') {
                echo "Running static code analysis..."
                
                // Language-specific linting
                switch(projectLanguage) {
                    case 'nodejs':
                        if (fileExists('package.json')) {
                            def hasLintScript = sh(script: "grep -q '\"lint\"' package.json", returnStatus: true) == 0
                            if (hasLintScript) {
                                sh 'npm run lint'
                            } else {
                                echo "No lint script found in package.json, skipping linting."
                            }
                        }
                        break
                        
                    case 'java':
                        if (fileExists('pom.xml')) {
                            sh 'mvn checkstyle:check'
                        } else if (fileExists('build.gradle')) {
                            sh './gradlew checkstyleMain'
                        }
                        break
                        
                    case 'python':
                        sh 'pylint --output-format=parseable --reports=no --exit-zero $(find . -name "*.py" | grep -v "__pycache__") > pylint-report.txt || true'
                        archiveArtifacts artifacts: 'pylint-report.txt', allowEmptyArchive: true
                        break
                }
                
                // SonarQube analysis
                withSonarQubeEnv('SonarQube') {
                    def sonarProjectKey = params.SONAR_PROJECT_KEY ?: "${env.JOB_NAME}"
                    
                    switch(projectLanguage) {
                        case 'nodejs':
                            sh """
                                sonar-scanner \
                                -Dsonar.projectKey=${sonarProjectKey} \
                                -Dsonar.projectName='${env.JOB_NAME}' \
                                -Dsonar.projectVersion=${buildVersion} \
                                -Dsonar.sources=. \
                                -Dsonar.exclusions=node_modules/**,**/*.test.js,**/*.spec.js,coverage/**
                            """
                            break
                            
                        case 'java':
                            if (fileExists('pom.xml')) {
                                sh "mvn sonar:sonar -Dsonar.projectKey=${sonarProjectKey}"
                            } else if (fileExists('build.gradle')) {
                                sh "./gradlew sonarqube -Dsonar.projectKey=${sonarProjectKey}"
                            }
                            break
                            
                        case 'python':
                            sh """
                                sonar-scanner \
                                -Dsonar.projectKey=${sonarProjectKey} \
                                -Dsonar.projectName='${env.JOB_NAME}' \
                                -Dsonar.projectVersion=${buildVersion} \
                                -Dsonar.sources=. \
                                -Dsonar.python.coverage.reportPaths=coverage.xml \
                                -Dsonar.python.xunit.reportPath=test-results.xml
                            """
                            break
                    }
                    
                    echo "SonarQube analysis completed."
                }
                
                // Wait for quality gate
                timeout(time: 5, unit: 'MINUTES') {
                    def qg = waitForQualityGate()
                    sonarQubeResults = [status: qg.status, message: "Quality Gate: ${qg.status}"]
                    
                    echo "SonarQube Quality Gate: ${qg.status}"
                    if (qg.status != 'OK') {
                        echo "SonarQube quality gate failed: ${qg.status}"
                        // Don't fail the build, just warn
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Build') {
            echo "Building project with ${projectLanguage}..."
            
            // Parse build arguments
            def buildArgs = [:]
            if (params.BUILD_ARGS) {
                params.BUILD_ARGS.split(',').each { arg ->
                    def parts = arg.split('=')
                    if (parts.size() == 2) {
                        buildArgs[parts[0].trim()] = parts[1].trim()
                    }
                }
            }
            
            // Set build-specific arguments based on build type
            switch(params.BUILD_TYPE) {
                case 'optimized':
                    buildArgs['OPTIMIZE'] = 'true'
                    buildArgs['DEBUG'] = 'false'
                    break
                case 'debug':
                    buildArgs['DEBUG'] = 'true'
                    buildArgs['OPTIMIZE'] = 'false'
                    break
                default: // standard
                    buildArgs['DEBUG'] = 'false'
                    buildArgs['OPTIMIZE'] = 'false'
                    break
            }
            
            // Build the project based on language
            switch(projectLanguage) {
                case 'nodejs':
                    if (fileExists('package.json')) {
                        def hasBuildScript = sh(script: "grep -q '\"build\"' package.json", returnStatus: true) == 0
                        if (hasBuildScript) {
                            sh 'npm run build'
                        } else {
                            echo "No build script found in package.json, skipping build step."
                        }
                    }
                    break
                    
                case 'java':
                    if (fileExists('pom.xml')) {
                        // Pass build arguments to Maven
                        def mvnArgs = buildArgs.collect { k, v -> "-D${k}=${v}" }.join(' ')
                        sh "mvn clean package ${mvnArgs} -DskipTests"
                    } else if (fileExists('build.gradle')) {
                        // Pass build arguments to Gradle
                        def gradleArgs = buildArgs.collect { k, v -> "-P${k}=${v}" }.join(' ')
                        sh "./gradlew clean build ${gradleArgs} -x test"
                    }
                    break
                    
                case 'python':
                    // For Python, we might need to create a distributable package
                    if (fileExists('setup.py')) {
                        sh 'python setup.py bdist_wheel'
                    } else {
                        echo "No setup.py found, skipping Python package build."
                    }
                    break
            }
            
            echo "Build completed successfully."
        }
        
        if (params.RUN_TESTS) {
            stage('Run Tests') {
                echo "Running tests for ${projectLanguage}..."
                
                // Keep track of whether tests are successful
                def testsSuccessful = true
                
                try {
                    switch(projectLanguage) {
                        case 'nodejs':
                            if (fileExists('package.json')) {
                                def hasTestScript = sh(script: "grep -q '\"test\"' package.json", returnStatus: true) == 0
                                if (hasTestScript) {
                                    sh 'npm test'
                                    
                                    // Collect Jest test reports if they exist
                                    if (fileExists('test-results.xml')) {
                                        junit 'test-results.xml'
                                    }
                                    
                                    // Collect coverage reports
                                    if (fileExists('coverage/lcov.info')) {
                                        sh 'npx lcov-summary coverage/lcov.

