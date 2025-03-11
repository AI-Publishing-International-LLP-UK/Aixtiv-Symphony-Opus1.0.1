pipeline {
    agent any

    environment {
        // Define environment variables
        NODE_VERSION = '18'
        NEWMAN_VERSION = '5.3.2'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Environment') {
            steps {
                // Install Node.js and Newman if not available
                sh '''
                    # Check if Node.js is installed, if not use NVM
                    if ! command -v node &> /dev/null; then
                        echo "Node.js not found, installing via NVM..."
                        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
                        export NVM_DIR="$HOME/.nvm"
                        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                        nvm install ${NODE_VERSION}
                        nvm use ${NODE_VERSION}
                    fi
                    
                    # Install Newman and reporters
                    npm install -g newman@${NEWMAN_VERSION} newman-reporter-htmlextra
                    
                    # Create results directory
                    mkdir -p results
                '''
            }
        }
        
        stage('Run API Tests') {
            steps {
                sh '''
                    newman run ASOOS_API_Postman_Collection.json \
                        --environment ASOOS_API_Environment.json \
                        --reporters cli,htmlextra,json \
                        --reporter-htmlextra-export results/newman-report.html \
                        --reporter-json-export results/newman-results.json
                '''
            }
        }

        stage('Process Test Results') {
            steps {
                script {
                    // Read and process test results
                    def testResults = readJSON file: 'results/newman-results.json'
                    def totalTests = testResults.run.stats.assertions.total
                    def failedTests = testResults.run.stats.assertions.failed
                    
                    echo "Total tests run: ${totalTests}"
                    echo "Failed tests: ${failedTests}"
                    
                    // Fail the build if there are test failures
                    if (failedTests > 0) {
                        currentBuild.result = 'FAILURE'
                        error "API Tests failed with ${failedTests} failures."
                    }
                }
            }
        }
    }
    
    post {
        always {
            // Archive test results
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
            
            // Generate HTML report
            publishHTML target: [
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'results',
                reportFiles: 'newman-report.html',
                reportName: 'API Test Report'
            ]
        }
        
        success {
            echo 'API Tests completed successfully!'
        }
        
        failure {
            echo 'API Tests failed! Please check the test results.'
        }
    }
}

