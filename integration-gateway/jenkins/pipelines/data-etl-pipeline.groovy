#!/usr/bin/env groovy

/**
 * Data Processing and ETL Pipeline for Dr. Lucy Automation
 *
 * This pipeline handles data extraction, transformation, and loading operations
 * from various sources to target systems. It supports scheduled runs and 
 * provides comprehensive error handling with notifications.
 *
 * The pipeline is parameterized to support different data sources, destinations,
 * and processing options.
 */

pipeline {
    agent {
        // Use a pre-configured agent with necessary data processing tools
        label 'data-processing'
    }

    // Pipeline parameters to make it configurable
    parameters {
        choice(name: 'DATA_SOURCE_TYPE', choices: ['database', 'api', 'file', 's3', 'gcs', 'bigquery'], description: 'Source of the data to extract')
        string(name: 'SOURCE_LOCATION', defaultValue: '', description: 'Location/endpoint/path of the source data')
        choice(name: 'DESTINATION_TYPE', choices: ['database', 'data_warehouse', 'file', 's3', 'gcs', 'bigquery'], description: 'Destination for processed data')
        string(name: 'DESTINATION_LOCATION', defaultValue: '', description: 'Location/endpoint/path for the destination')
        choice(name: 'PROCESSING_TYPE', choices: ['full_load', 'incremental', 'delta'], description: 'Type of data processing to perform')
        string(name: 'TRANSFORMATION_RULES', defaultValue: 'default', description: 'Transformation ruleset to apply')
        booleanParam(name: 'ENABLE_DATA_VALIDATION', defaultValue: true, description: 'Enable data validation steps')
        booleanParam(name: 'ENABLE_DATA_QUALITY_CHECKS', defaultValue: true, description: 'Enable data quality checks')
        string(name: 'NOTIFICATION_EMAILS', defaultValue: 'datateam@example.com', description: 'Email addresses for notifications')
        choice(name: 'ENVIRONMENT', choices: ['development', 'staging', 'production'], description: 'Environment for the ETL process')
    }

    // Set environment variables
    environment {
        // Using the Dr. Lucy Automation service account
        GOOGLE_CLOUD_KEYFILE_JSON = credentials('drla-service-account-key')
        DRLA_SERVICE_ACCOUNT = 'DrLucyAutomation@api-for-warp-drive.iam.gserviceaccount.com'
        
        // Date variables for file naming and tracking
        PIPELINE_START_TIME = sh(script: 'date "+%Y%m%d_%H%M%S"', returnStdout: true).trim()
        PIPELINE_DATE = sh(script: 'date "+%Y-%m-%d"', returnStdout: true).trim()
        
        // Log and report directories
        LOG_DIR = "${WORKSPACE}/logs/${PIPELINE_START_TIME}"
        REPORT_DIR = "${WORKSPACE}/reports/${PIPELINE_START_TIME}"
        
        // ETL processing variables
        ETL_JOB_ID = "${env.JOB_NAME}_${env.BUILD_NUMBER}_${PIPELINE_START_TIME}"
        DATA_BATCH_SIZE = '10000'  // Default batch size for processing
    }

    // Pipeline stages
    stages {
        stage('Initialize') {
            steps {
                echo "Initializing Data ETL Pipeline - Job ID: ${ETL_JOB_ID}"
                
                // Create directories for logs and reports
                sh "mkdir -p ${LOG_DIR} ${REPORT_DIR}"
                
                // Record start time and parameters
                sh """
                echo "ETL Job Started at: \$(date)" > ${LOG_DIR}/job_info.log
                echo "Parameters:" >> ${LOG_DIR}/job_info.log
                echo "  DATA_SOURCE_TYPE: ${params.DATA_SOURCE_TYPE}" >> ${LOG_DIR}/job_info.log
                echo "  SOURCE_LOCATION: ${params.SOURCE_LOCATION}" >> ${LOG_DIR}/job_info.log
                echo "  DESTINATION_TYPE: ${params.DESTINATION_TYPE}" >> ${LOG_DIR}/job_info.log
                echo "  DESTINATION_LOCATION: ${params.DESTINATION_LOCATION}" >> ${LOG_DIR}/job_info.log
                echo "  PROCESSING_TYPE: ${params.PROCESSING_TYPE}" >> ${LOG_DIR}/job_info.log
                echo "  ENVIRONMENT: ${params.ENVIRONMENT}" >> ${LOG_DIR}/job_info.log
                """
                
                // Authenticate with Google Cloud using Dr. Lucy Automation service account
                sh """
                gcloud auth activate-service-account ${DRLA_SERVICE_ACCOUNT} --key-file=${GOOGLE_CLOUD_KEYFILE_JSON}
                gcloud config set project api-for-warp-drive
                """
            }
        }
        
        stage('Source Connection Validation') {
            steps {
                echo "Validating connection to data source: ${params.DATA_SOURCE_TYPE} at ${params.SOURCE_LOCATION}"
                
                script {
                    // Switch based on source type to validate connection
                    switch(params.DATA_SOURCE_TYPE) {
                        case 'database':
                            sh "python3 ${WORKSPACE}/scripts/validate_db_connection.py --connection-string='${params.SOURCE_LOCATION}' --log-file=${LOG_DIR}/source_validation.log"
                            break
                        case 'api':
                            sh "curl -s -o ${LOG_DIR}/api_response.json -w '%{http_code}' ${params.SOURCE_LOCATION} > ${LOG_DIR}/api_status.log"
                            sh "if [ \$(cat ${LOG_DIR}/api_status.log) -ne 200 ]; then echo 'API connection failed'; exit 1; fi"
                            break
                        case 's3':
                            sh "aws s3 ls ${params.SOURCE_LOCATION} --summarize > ${LOG_DIR}/s3_validation.log"
                            break
                        case 'gcs':
                            sh "gsutil ls ${params.SOURCE_LOCATION} > ${LOG_DIR}/gcs_validation.log"
                            break
                        case 'bigquery':
                            sh "bq show --format=prettyjson ${params.SOURCE_LOCATION} > ${LOG_DIR}/bq_validation.log"
                            break
                        case 'file':
                            sh "if [ ! -f ${params.SOURCE_LOCATION} ]; then echo 'File not found'; exit 1; fi"
                            break
                        default:
                            error "Unsupported data source type: ${params.DATA_SOURCE_TYPE}"
                    }
                    
                    echo "Source connection validation successful"
                }
            }
        }

        stage('Data Extraction') {
            steps {
                echo "Extracting data from ${params.DATA_SOURCE_TYPE} source: ${params.SOURCE_LOCATION}"
                
                script {
                    // Create a directory for raw extracted data
                    sh "mkdir -p ${WORKSPACE}/data/raw"
                    
                    // Set extraction parameters based on the processing type
                    def extractionParams = ""
                    if (params.PROCESSING_TYPE == 'incremental') {
                        extractionParams = "--incremental --last-run-file=${WORKSPACE}/data/last_run_timestamp.txt"
                    } else if (params.PROCESSING_TYPE == 'delta') {
                        extractionParams = "--delta --change-tracking-column=updated_at"
                    }
                    
                    // Execute extraction based on source type
                    switch(params.DATA_SOURCE_TYPE) {
                        case 'database':
                            sh "python3 ${WORKSPACE}/scripts/extract_from_db.py --connection-string='${params.SOURCE_LOCATION}' --output-dir=${WORKSPACE}/data/raw ${extractionParams} > ${LOG_DIR}/extraction.log 2>&1"
                            break
                        case 'api':
                            sh "python3 ${WORKSPACE}/scripts/extract_from_api.py --api-url='${params.SOURCE_LOCATION}' --output-dir=${WORKSPACE}/data/raw ${extractionParams} > ${LOG_DIR}/extraction.log 2>&1"
                            break
                        case 's3':
                            sh "aws s3 sync ${params.SOURCE_LOCATION} ${WORKSPACE}/data/raw/ > ${LOG_DIR}/extraction.log 2>&1"
                            break
                        case 'gcs':
                            sh "gsutil -m cp -r ${params.SOURCE_LOCATION}/* ${WORKSPACE}/data/raw/ > ${LOG_DIR}/extraction.log 2>&1"
                            break
                        case 'bigquery':
                            sh "bq extract --destination_format=AVRO ${params.SOURCE_LOCATION} ${WORKSPACE}/data/raw/extract_*.avro > ${LOG_DIR}/extraction.log 2>&1"
                            break
                        case 'file':
                            sh "cp ${params.SOURCE_LOCATION} ${WORKSPACE}/data/raw/ > ${LOG_DIR}/extraction.log 2>&1"
                            break
                        default:
                            error "Unsupported data source type: ${params.DATA_SOURCE_TYPE}"
                    }
                    
                    // Count extracted records for logging
                    sh "echo 'Extracted data statistics:' > ${LOG_DIR}/extraction_stats.log"
                    sh "find ${WORKSPACE}/data/raw -type f -name '*.csv' -o -name '*.json' -o -name '*.avro' | xargs wc -l >> ${LOG_DIR}/extraction_stats.log || true"
                    
                    echo "Data extraction completed"
                }
            }
        }
        
        stage('Data Validation') {
            when {
                expression { return params.ENABLE_DATA_VALIDATION }
            }
            steps {
                echo "Validating extracted data"
                
                script {
                    // Create a directory for validation reports
                    sh "mkdir -p ${REPORT_DIR}/validation"
                    
                    // Run data validation checks
                    sh """
                    python3 ${WORKSPACE}/scripts/validate_data.py \
                        --input-dir=${WORKSPACE}/data/raw \
                        --rules-file=${WORKSPACE}/config/${params.TRANSFORMATION_RULES}_validation_rules.json \
                        --report-dir=${REPORT_DIR}/validation \
                        --log-file=${LOG_DIR}/data_validation.log
                    """
                    
                    // Check if validation passed based on the exit code of the script
                    def validationExitCode = sh(script: "if [ -f ${REPORT_DIR}/validation/validation_failed.flag ]; then echo 1; else echo 0; fi", returnStdout: true).trim()
                    
                    if (validationExitCode == "1") {
                        // If validation fails, provide detailed reporting but continue the pipeline
                        echo "WARNING: Data validation detected issues. See validation reports for details."
                        // Create a summary of validation issues
                        sh "cat ${REPORT_DIR}/validation/summary.txt || echo 'No validation summary available' > ${LOG_DIR}/validation_summary.log"
                    } else {
                        echo "Data validation passed successfully"
                    }
                }
            }
        }

        stage('Data Cleansing') {
            steps {
                echo "Cleansing extracted data"
                
                script {
                    // Create directory for cleansed data
                    sh "mkdir -p ${WORKSPACE}/data/cleansed"
                    
                    // Run data cleansing process
                    sh """
                    python3 ${WORKSPACE}/scripts/cleanse_data.py \
                        --input-dir=${WORKSPACE}/data/raw \
                        --output-dir=${WORKSPACE}/data/cleansed \
                        --rules-file=${WORKSPACE}/config/${params.TRANSFORMATION_RULES}_cleansing_rules.json \
                        --log-file=${LOG_DIR}/data_cleansing.log
                    """
                    
                    // Generate cleansing statistics
                    sh """
                    echo "Data cleansing statistics:" > ${LOG_DIR}/cleansing_stats.log
                    python3 ${WORKSPACE}/scripts/generate_cleansing_stats.py \
                        --input-dir=${WORKSPACE}/data/raw \
                        --cleansed-dir=${WORKSPACE}/data/cleansed \
                        --output-file=${REPORT_DIR}/cleansing_stats.json >> ${LOG_DIR}/cleansing_stats.log
                    """
                    
                    echo "Data cleansing completed"
                }
            }
        }
        
        stage('Data Transformation') {
            steps {
                echo "Transforming data according to business rules: ${params.TRANSFORMATION_RULES}"
                
                script {
                    // Create directory for transformed data
                    sh "mkdir -p ${WORKSPACE}/data/transformed"
                    
                    // Run data transformation with specified rules
                    sh """
                    python3 ${WORKSPACE}/scripts/transform_data.py \
                        --input-dir=${WORKSPACE}/data/cleansed \
                        --output-dir=${WORKSPACE}/data/transformed \
                        --rules-file=${WORKSPACE}/config/${params.TRANSFORMATION_RULES}_transformation_rules.json \
                        --batch-size=${DATA_BATCH_SIZE} \
                        --log-file=${LOG_DIR}/data_transformation.log
                    """
                    
                    // Generate transformation metrics
                    sh """
                    python3 ${WORKSPACE}/scripts/generate_transformation_metrics.py \
                        --input-dir=${WORKSPACE}/data/cleansed \
                        --transformed-dir=${WORKSPACE}/data/transformed \
                        --output-file=${REPORT_DIR}/transformation_metrics.json
                    """
                    
                    echo "Data transformation completed"
                }
            }
        }
        
        stage('Data Quality Checks') {
            when {
                expression { return params.ENABLE_DATA_QUALITY_CHECKS }
            }
            steps {
                echo "Performing data quality checks on transformed data"
                
                script {
                    // Create directory for quality check reports
                    sh "mkdir -p ${REPORT_DIR}/quality"
                    
                    // Run data quality checks
                    sh """
                    python3 ${WORKSPACE}/scripts/check_data_quality.py \
                        --input-dir=${WORKSPACE}/data/transformed \
                        --rules-file=${WORKSPACE}/config/${params.TRANSFORMATION_RULES}_quality_rules.json \
                        --report-dir=${REPORT_DIR}/quality \
                        --log-file=${LOG_DIR}/data_quality.log
                    """
                    
                    // Check if quality checks passed and decide whether to proceed
                    def qualityChecksPassed = sh(script: "if [ -f ${REPORT_DIR}/quality/failed_checks.json ]; then cat ${REPORT_DIR}/quality/failed_checks.json | jq 'length'; else echo 0; fi", returnStdout: true).trim()
                    
                    if (qualityChecksPassed != "0") {
                        echo "WARNING: Data quality checks found issues. See quality check reports for details."
                        
                        // For production, we might want to abort the pipeline if quality is below threshold
                        if (params.ENVIRONMENT == 'production') {
                            def severeIssues = sh(script: "cat ${REPORT_DIR}/quality/failed_checks.json | jq '[.[] | select(.severity==\"high\")] | length'", returnStdout: true).trim()
                            
                            if (severeIssues != "0") {
                                error "Aborting pipeline due to severe data quality issues in production environment"
                            }
                        }
                    } else {
                        echo "All data quality checks passed"
                    }
                }

