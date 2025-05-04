/**
 * Dr. Lucy Automation - Comprehensive Automated Testing Pipeline
 * 
 * This pipeline script executes a variety of tests including:
 * - Unit Tests
 * - Integration Tests
 * - UI/End-to-End Tests
 * - Performance Tests
 * - Accessibility Tests
 * - Security Tests
 * 
 * The pipeline is highly parameterized to allow flexibility in test execution
 * and can be triggered for different environments.
 */

pipeline {
    agent {
        // Use kubernetes for dynamic agent allocation
        kubernetes {
            yaml """
                apiVersion: v1
                kind: Pod
                metadata:
                  labels:
                    jenkins: drlucy-testing-agent
                spec:
                  containers:
                  - name: jnlp
                    image: jenkins/inbound-agent:alpine
                  - name: nodejs
                    image: node:18-alpine
                    command: ['cat']
                    tty: true
                  - name: maven
                    image: maven:3.9-eclipse-temurin-17
                    command: ['cat']
                    tty: true
                  - name: docker
                    image: docker:latest
                    command: ['cat']
                    tty: true
                    volumeMounts:
                    - name: docker-sock
                      mountPath: /var/run/docker.sock
                  - name: k6
                    image: grafana/k6:latest
                    command: ['cat']
                    tty: true
                  - name: lighthouse
                    image: femtopixel/google-lighthouse:latest
                    command: ['cat']
                    tty: true
                  - name: zap
                    image: owasp/zap2docker-stable:latest
                    command: ['cat']
                    tty: true
                  volumes:
                  - name: docker-sock
                    hostPath:
                      path: /var/run/docker.sock
                """
        }
    }

    parameters {
        // Environment selection
        choice(
            name: 'TARGET_ENVIRONMENT', 
            choices: ['development', 'staging', 'production'], 
            description: 'Which environment to run tests against'
        )
        
        // Test type selection (multiple)
        booleanParam(name: 'RUN_UNIT_TESTS', defaultValue: true, description: 'Run unit tests')
        booleanParam(name: 'RUN_INTEGRATION_TESTS', defaultValue: true, description: 'Run integration tests')
        booleanParam(name: 'RUN_E2E_TESTS', defaultValue: false, description: 'Run UI/End-to-End tests')
        booleanParam(name: 'RUN_PERFORMANCE_TESTS', defaultValue: false, description: 'Run performance tests')
        booleanParam(name: 'RUN_ACCESSIBILITY_TESTS', defaultValue: false, description: 'Run accessibility tests')
        booleanParam(name: 'RUN_SECURITY_TESTS', defaultValue: false, description: 'Run security tests')
        
        // Test scope selection
        string(name: 'TEST_SCOPE', defaultValue: 'all', description: 'Scope of tests to run (e.g., "all", component name, or test tag)')
        
        // Timeout settings
        string(name: 'TEST_TIMEOUT', defaultValue: '30', description: 'Test execution timeout in minutes')
        
        // Slack notification channel
        string(name: 'SLACK_CHANNEL', defaultValue: 'git-lucy', description: 'Slack channel for notifications')
        
        // Email notification recipients
        string(name: 'EMAIL_RECIPIENTS', defaultValue: '', description: 'Comma-separated list of email recipients for test reports')
    }

    environment {
        // Environment-specific URLs and credentials
        DEV_APP_URL = 'https://dev.example.com'
        STAGING_APP_URL = 'https://staging.example.com'
        PROD_APP_URL = 'https://prod.example.com'
        
        // Service account credentials
        GOOGLE_CREDENTIALS = credentials('drla-service-account')
        
        // Test reports directory
        TEST_REPORTS_DIR = "${WORKSPACE}/test-reports"
        
        // Dynamic environment URL based on parameter
        APP_URL = "${params.TARGET_ENVIRONMENT == 'production' ? PROD_APP_URL : params.TARGET_ENVIRONMENT == 'staging' ? STAGING_APP_URL : DEV_APP_URL}"
    }

    options {
        // Pipeline options
        timeout(time: "${params.TEST_TIMEOUT}", unit: 'MINUTES')
        ansiColor('xterm')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Initialize') {
            steps {
                // Checkout code
                checkout scm
                
                // Create reports directory
                sh "mkdir -p ${TEST_REPORTS_DIR}"
                
                // Display build information
                echo "Running tests against: ${params.TARGET_ENVIRONMENT}"
                echo "Application URL: ${APP_URL}"
                echo "Selected test types: ${getSelectedTestTypes()}"
                
                // Authenticate with Google Cloud
                container('nodejs') {
                    sh '''
                        echo "${GOOGLE_CREDENTIALS}" > /tmp/service-account.json
                        export GOOGLE_APPLICATION_CREDENTIALS=/tmp/service-account.json
                        gcloud auth activate-service-account --key-file=/tmp/service-account.json
                    '''
                }
                
                // Notify test start
                sendNotification(
                    "🔄 Dr. Lucy Automation: Testing started on *${params.TARGET_ENVIRONMENT}*",
                    "Running test suite: ${getSelectedTestTypes()}"
                )
            }
        }

        stage('Unit Tests') {
            when {
                expression { return params.RUN_UNIT_TESTS }
            }
            steps {
                container('nodejs') {
                    echo "Running unit tests for ${params.TEST_SCOPE}"
                    
                    // Install dependencies
                    sh 'npm ci'
                    
                    // Run unit tests with coverage
                    sh """
                        npm run test:unit ${params.TEST_SCOPE != 'all' ? '-- -t ' + params.TEST_SCOPE : ''} \
                        --coverage \
                        --ci \
                        --reporters=default --reporters=jest-junit
                    """
                    
                    // Save test report
                    sh "mkdir -p ${TEST_REPORTS_DIR}/unit && cp junit.xml ${TEST_REPORTS_DIR}/unit/"
                }
            }
            post {
                always {
                    junit "${TEST_REPORTS_DIR}/unit/junit.xml"
                }
            }
        }

        stage('Integration Tests') {
            when {
                expression { return params.RUN_INTEGRATION_TESTS }
            }
            steps {
                container('nodejs') {
                    echo "Running integration tests for ${params.TEST_SCOPE}"
                    
                    // Set up test database if needed
                    sh '''
                        if [ -f "scripts/setup-test-db.sh" ]; then
                            chmod +x scripts/setup-test-db.sh
                            ./scripts/setup-test-db.sh
                        fi
                    '''
                    
                    // Run integration tests
                    sh """
                        npm run test:integration ${params.TEST_SCOPE != 'all' ? '-- -t ' + params.TEST_SCOPE : ''} \
                        --ci \
                        --reporters=default --reporters=jest-junit
                    """
                    
                    // Save test report
                    sh "mkdir -p ${TEST_REPORTS_DIR}/integration && cp junit.xml ${TEST_REPORTS_DIR}/integration/"
                }
            }
            post {
                always {
                    junit "${TEST_REPORTS_DIR}/integration/junit.xml"
                }
            }
        }

        stage('UI/End-to-End Tests') {
            when {
                expression { return params.RUN_E2E_TESTS }
            }
            steps {
                container('nodejs') {
                    echo "Running E2E tests against ${APP_URL}"
                    
                    // Install Playwright browsers
                    sh 'npx playwright install --with-deps'
                    
                    // Run E2E tests
                    sh """
                        BASE_URL=${APP_URL} \
                        npx playwright test ${params.TEST_SCOPE != 'all' ? params.TEST_SCOPE : ''} \
                        --reporter=dot,junit
                    """
                    
                    // Save test report and artifacts
                    sh """
                        mkdir -p ${TEST_REPORTS_DIR}/e2e
                        cp test-results/junit.xml ${TEST_REPORTS_DIR}/e2e/
                        cp -r test-results/screenshots ${TEST_REPORTS_DIR}/e2e/ || true
                        cp -r test-results/videos ${TEST_REPORTS_DIR}/e2e/ || true
                    """
                }
            }
            post {
                always {
                    junit "${TEST_REPORTS_DIR}/e2e/junit.xml"
                    archiveArtifacts artifacts: "${TEST_REPORTS_DIR}/e2e/**/*", allowEmptyArchive: true
                }
            }
        }

        stage('Performance Tests') {
            when {
                expression { return params.RUN_PERFORMANCE_TESTS }
            }
            steps {
                container('k6') {
                    echo "Running performance tests against ${APP_URL}"
                    
                    // Run K6 performance tests
                    sh """
                        k6 run \
                        -e TARGET_URL=${APP_URL} \
                        --out json=results.json \
                        ./tests/performance/load-test.js
                    """
                    
                    // Save test report
                    sh "mkdir -p ${TEST_REPORTS_DIR}/performance && cp results.json ${TEST_REPORTS_DIR}/performance/"
                    
                    // Create a simple HTML report
                    sh """
                        echo '<html><body><pre>' > ${TEST_REPORTS_DIR}/performance/report.html
                        cat results.json >> ${TEST_REPORTS_DIR}/performance/report.html
                        echo '</pre></body></html>' >> ${TEST_REPORTS_DIR}/performance/report.html
                    """
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: "${TEST_REPORTS_DIR}/performance/**/*", allowEmptyArchive: true
                }
            }
        }

        stage('Accessibility Tests') {
            when {
                expression { return params.RUN_ACCESSIBILITY_TESTS }
            }
            steps {
                container('lighthouse') {
                    echo "Running accessibility tests against ${APP_URL}"
                    
                    // Run Lighthouse accessibility audit
                    sh """
                        mkdir -p ${TEST_REPORTS_DIR}/accessibility
                        lighthouse \
                          --output=json,html \
                          --output-path=${TEST_REPORTS_DIR}/accessibility/report \
                          --only-categories=accessibility \
                          --chrome-flags="--headless --no-sandbox --disable-gpu" \
                          ${APP_URL}
                    """
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: "${TEST_REPORTS_DIR}/accessibility/**/*", allowEmptyArchive: true
                    
                    // Parse and check accessibility score
                    script {
                        def accessibilityScore = sh(
                            script: "cat ${TEST_REPORTS_DIR}/accessibility/report.json | jq '.categories.accessibility.score * 100'",
                            returnStdout: true
                        ).trim()
                        
                        echo "Accessibility score: ${accessibilityScore}%"
                        
                        if (accessibilityScore.toFloat() < 90) {
                            currentBuild.result = 'UNSTABLE'
                            echo "⚠️ Accessibility score below threshold (90%)"
                        }
                    }
                }
            }
        }

        stage('Security Tests') {
            when {
                expression { return params.RUN_SECURITY_TESTS }
            }
            steps {
                parallel {
                    // Static Application Security Testing (SAST)
                    stage('SAST') {
                        steps {
                            container('nodejs') {
                                echo "Running SAST"
                                
                                // Dependency scanning
                                sh """
                                    mkdir -p ${TEST_REPORTS_DIR}/security/sast
                                    npm audit --json > ${TEST_REPORTS_DIR}/security/sast/npm-audit.json || true
                                """
                                
                                // Custom security rules scanning
                                sh """
                                    npx eslint \
                                      --no-eslintrc \
                                      --config .eslintrc.security.js \
                                      --format json \
                                      --output-file ${TEST_REPORTS_DIR}/security/sast/eslint-results.json \
                                      . || true
                                """
                            }
                        }
                    }
                    
                    // Dynamic Application Security Testing (DAST)
                    stage('DAST') {
                        steps {
                            container('zap') {
                                echo "Running DAST against ${APP_URL}"
                                
                                // Run OWASP ZAP security scan
                                sh """
                                    mkdir -p ${TEST_REPORTS_DIR}/security/dast
                                    zap-baseline.py \
                                      -t ${APP_URL} \
                                      -g gen.conf \
                                      -r ${TEST_REPORTS_DIR}/security/dast/zap-report.html \
                                      -J ${TEST_REPORTS_DIR}/security/dast/zap-report.json \
                                      || true
                                """
                            }
                        }
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: "${TEST_REPORTS_DIR}/security/**/*", allowEmptyArchive: true
                    
                    // Parse and check for critical vulnerabilities
                    script {
                        try {
                            def npmAuditHigh = sh(
                                script: "cat ${TEST_REPORTS_DIR}/security/sast/npm-audit.json | jq '.metadata.vulnerabilities.high // 0'",
                                returnStdout: true
                            ).trim()
                            
                            def npmAuditCritical = sh(
                                script: "cat ${TEST_REPORTS_DIR}/security/sast/npm-audit.json | jq '.metadata.vulnerabilities.critical // 0'",
                                returnStdout: true
                            ).trim()
                            
                            echo "Security scan found ${npmAuditHigh} high and ${npmAuditCritical} critical vulnerabilities"
                            
                            if (npmAuditCritical.toInteger() > 0) {
                                currentBuild.result = 'UNSTABLE'
                                echo "⚠️ Critical vulnerabilities detected"
                            }
                        } catch (Exception e) {
                            echo "Error parsing security reports: ${e.message}"
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            // Generate and publish combined test report
            script {
                sh """
                    echo '<html><head><title>Test Report Summary</title></head><body>' > ${TEST_REPORTS_DIR}/index.html
                    echo '<h1>Dr. Lucy Automation Test Results</h1>' >> ${TEST_REPORTS_DIR}/index.html
                    echo '<p>Environment: ${params.TARGET_ENVIRONMENT}</p>' >> ${TEST_REPORTS_DIR}/index.html
                    echo '<p>Build: ${BUILD_NUMBER}</p>' >> ${TEST_REPORTS_DIR}/index.

