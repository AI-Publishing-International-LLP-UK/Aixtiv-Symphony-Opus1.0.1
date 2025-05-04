#!/usr/bin/env groovy

/**
 * Backup and Disaster Recovery Pipeline
 * 
 * This pipeline handles comprehensive backup processes and disaster recovery testing
 * for various system components including databases, file storage, and configurations.
 * 
 * Features:
 * - Scheduled automatic backups with configurable frequency
 * - Multi-target backup support (databases, file systems, config files)
 * - Backup validation and integrity checks
 * - Backup retention policy management
 * - Disaster recovery testing and simulation
 * - Notifications via Slack and email
 * - Detailed logging and reporting
 * 
 * Author: Dr. Lucy Automation
 */

// Pipeline parameters for flexible configuration
properties([
    parameters([
        choice(
            name: 'BACKUP_TYPE',
            choices: ['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'CONFIG_ONLY', 'DATABASE_ONLY', 'STORAGE_ONLY'],
            description: 'Type of backup to perform'
        ),
        choice(
            name: 'ENVIRONMENT',
            choices: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'],
            description: 'Target environment for backup operations'
        ),
        booleanParam(
            name: 'PERFORM_VALIDATION',
            defaultValue: true,
            description: 'Whether to validate backups after creation'
        ),
        booleanParam(
            name: 'RUN_DISASTER_RECOVERY_TEST',
            defaultValue: false,
            description: 'Whether to perform disaster recovery testing (caution: resource intensive)'
        ),
        choice(
            name: 'RETENTION_POLICY',
            choices: ['7_DAYS', '30_DAYS', '90_DAYS', '1_YEAR', 'CUSTOM'],
            description: 'Retention policy for backups'
        ),
        string(
            name: 'CUSTOM_RETENTION_DAYS',
            defaultValue: '14',
            description: 'Custom retention period in days (only used if RETENTION_POLICY is CUSTOM)'
        ),
        string(
            name: 'BACKUP_STORAGE_LOCATION',
            defaultValue: 'gs://api-for-warp-drive-backups/',
            description: 'Google Cloud Storage location for backup files'
        ),
        string(
            name: 'NOTIFICATION_EMAIL',
            defaultValue: 'drlucyautomation@coaching2100.com',
            description: 'Email address for notifications'
        ),
        string(
            name: 'SLACK_CHANNEL',
            defaultValue: '#git-lucy',
            description: 'Slack channel for notifications'
        )
    ]),
    pipelineTriggers([
        // Schedule backups to run automatically
        // This cron expression runs the pipeline daily at 1 AM
        cron('0 1 * * *')
    ])
])

// Global variables
def backupTimestamp = new Date().format('yyyyMMdd-HHmmss')
def backupSuccessful = false
def validationSuccessful = false
def drTestSuccessful = false
def backupFiles = []
def drlucy_credentials = 'drlucy-service-account'

pipeline {
    agent {
        // Use a Jenkins agent with necessary backup tools installed
        label 'backup-agent'
    }
    
    options {
        // Pipeline-specific options
        timeout(time: 8, unit: 'HOURS') // Maximum runtime for complex DR tests
        disableConcurrentBuilds() // Prevent concurrent backup jobs
        ansiColor('xterm') // Colorized output in Jenkins console
    }
    
    environment {
        // Environment variables
        BACKUP_ID = "${params.ENVIRONMENT}_${params.BACKUP_TYPE}_${backupTimestamp}"
        BACKUP_ROOT_DIR = "${params.BACKUP_STORAGE_LOCATION}/${params.ENVIRONMENT}/${backupTimestamp}"
        GOOGLE_APPLICATION_CREDENTIALS = credentials('drlucy-service-account-key')
        BACKUP_LOG_FILE = "backup_${backupTimestamp}.log"
        CLOUD_PROJECT = "api-for-warp-drive"
    }
    
    stages {
        stage('Initialize') {
            steps {
                // Setup and initialization
                script {
                    // Notify start of backup process
                    sendNotification(
                        "🚀 Starting ${params.BACKUP_TYPE} backup for ${params.ENVIRONMENT} environment",
                        "Backup process initiated with ID: ${BACKUP_ID}"
                    )
                    
                    // Log backup start
                    sh """
                        echo "===== BACKUP PROCESS STARTED =====" > ${BACKUP_LOG_FILE}
                        echo "Timestamp: ${backupTimestamp}" >> ${BACKUP_LOG_FILE}
                        echo "Backup ID: ${BACKUP_ID}" >> ${BACKUP_LOG_FILE}
                        echo "Backup Type: ${params.BACKUP_TYPE}" >> ${BACKUP_LOG_FILE}
                        echo "Environment: ${params.ENVIRONMENT}" >> ${BACKUP_LOG_FILE}
                        echo "=================================" >> ${BACKUP_LOG_FILE}
                    """
                    
                    // Authenticate with Google Cloud using DrLucyAutomation
                    withCredentials([file(credentialsId: drlucy_credentials, variable: 'GOOGLE_CREDENTIALS')]) {
                        sh """
                            gcloud auth activate-service-account DrLucyAutomation@api-for-warp-drive.iam.gserviceaccount.com --key-file=${GOOGLE_CREDENTIALS}
                            gcloud config set project ${CLOUD_PROJECT}
                        """
                    }
                    
                    // Create backup directory structure
                    sh """
                        gsutil mb -p ${CLOUD_PROJECT} ${params.BACKUP_STORAGE_LOCATION} || echo "Bucket already exists"
                        echo "Creating backup directory structure in GCS" >> ${BACKUP_LOG_FILE}
                        gsutil cp ${BACKUP_LOG_FILE} ${BACKUP_ROOT_DIR}/${BACKUP_LOG_FILE}
                    """
                }
            }
        }
        
        stage('Database Backup') {
            when {
                expression { return params.BACKUP_TYPE in ['FULL', 'DATABASE_ONLY'] }
            }
            steps {
                script {
                    // Backup all relevant databases based on environment
                    echo "Starting database backup for ${params.ENVIRONMENT} environment"
                    
                    // Detect databases to backup based on environment
                    def databases = getDatabaseList(params.ENVIRONMENT)
                    
                    // Log the databases to be backed up
                    sh """
                        echo "==== DATABASE BACKUP STARTED ====" >> ${BACKUP_LOG_FILE}
                        echo "Databases to backup: ${databases.join(', ')}" >> ${BACKUP_LOG_FILE}
                    """
                    
                    // Backup each database
                    databases.each { db ->
                        try {
                            def dbBackupFile = "${BACKUP_ROOT_DIR}/databases/${db}_${backupTimestamp}.sql.gz"
                            backupFiles.add(dbBackupFile)
                            
                            echo "Backing up database: ${db}"
                            sh """
                                echo "Backing up database: ${db}" >> ${BACKUP_LOG_FILE}
                                
                                # Create directories if they don't exist
                                gsutil cp ${BACKUP_LOG_FILE} ${BACKUP_ROOT_DIR}/databases/ || gsutil mb ${BACKUP_ROOT_DIR}/databases/
                                
                                # Handle different database types
                                if [[ "${db}" == *"postgres"* ]]; then
                                    # PostgreSQL backup
                                    PGPASSWORD=\${DB_PASSWORD} pg_dump -h \${DB_HOST} -U \${DB_USER} -d \${db} | gzip > temp_${db}.sql.gz
                                    gsutil cp temp_${db}.sql.gz ${dbBackupFile}
                                    rm temp_${db}.sql.gz
                                elif [[ "${db}" == *"mysql"* ]]; then
                                    # MySQL backup
                                    mysqldump -h \${DB_HOST} -u \${DB_USER} -p\${DB_PASSWORD} \${db} | gzip > temp_${db}.sql.gz
                                    gsutil cp temp_${db}.sql.gz ${dbBackupFile}
                                    rm temp_${db}.sql.gz
                                elif [[ "${db}" == *"mongo"* ]]; then
                                    # MongoDB backup
                                    mongodump --host \${DB_HOST} --username \${DB_USER} --password \${DB_PASSWORD} --db \${db} --archive=temp_${db}.gz --gzip
                                    gsutil cp temp_${db}.gz ${dbBackupFile}
                                    rm temp_${db}.gz
                                elif [[ "${db}" == *"firestore"* ]]; then
                                    # Firestore backup
                                    gcloud firestore export ${dbBackupFile} --collection-ids="$(gcloud firestore collections list --format='value(collection_id)' | tr '\n' ',')"
                                fi
                                
                                echo "Completed backup of database: ${db}" >> ${BACKUP_LOG_FILE}
                            """
                        } catch (Exception e) {
                            echo "Error backing up database ${db}: ${e.message}"
                            sh "echo 'ERROR: Failed to backup database ${db}: ${e.message}' >> ${BACKUP_LOG_FILE}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                    
                    sh "echo '==== DATABASE BACKUP COMPLETED ====' >> ${BACKUP_LOG_FILE}"
                }
            }
        }
        
        stage('File Storage Backup') {
            when {
                expression { return params.BACKUP_TYPE in ['FULL', 'STORAGE_ONLY'] }
            }
            steps {
                script {
                    echo "Starting file storage backup for ${params.ENVIRONMENT} environment"
                    
                    // Detect storage locations to backup based on environment
                    def storageLocations = getStorageLocations(params.ENVIRONMENT)
                    
                    // Log the storage locations to be backed up
                    sh """
                        echo "==== FILE STORAGE BACKUP STARTED ====" >> ${BACKUP_LOG_FILE}
                        echo "Storage locations to backup: ${storageLocations.join(', ')}" >> ${BACKUP_LOG_FILE}
                    """
                    
                    // Backup each storage location
                    storageLocations.each { location ->
                        try {
                            def storageBackupFile = "${BACKUP_ROOT_DIR}/storage/${location.replaceAll('/', '_')}_${backupTimestamp}.tar.gz"
                            backupFiles.add(storageBackupFile)
                            
                            echo "Backing up storage location: ${location}"
                            sh """
                                echo "Backing up storage location: ${location}" >> ${BACKUP_LOG_FILE}
                                
                                # Create directories if they don't exist
                                gsutil cp ${BACKUP_LOG_FILE} ${BACKUP_ROOT_DIR}/storage/ || gsutil mb ${BACKUP_ROOT_DIR}/storage/
                                
                                # Handle different storage types
                                if [[ "${location}" == gs://* ]]; then
                                    # Google Cloud Storage backup
                                    gsutil -m cp -r ${location}/* ${BACKUP_ROOT_DIR}/storage/
                                elif [[ "${location}" == s3://* ]]; then
                                    # AWS S3 backup
                                    aws s3 sync ${location} ./temp_storage/
                                    tar -czf temp_storage.tar.gz ./temp_storage/
                                    gsutil cp temp_storage.tar.gz ${storageBackupFile}
                                    rm -rf ./temp_storage/ temp_storage.tar.gz
                                else
                                    # Local file system backup
                                    tar -czf temp_storage.tar.gz ${location}
                                    gsutil cp temp_storage.tar.gz ${storageBackupFile}
                                    rm temp_storage.tar.gz
                                fi
                                
                                echo "Completed backup of storage location: ${location}" >> ${BACKUP_LOG_FILE}
                            """
                        } catch (Exception e) {
                            echo "Error backing up storage location ${location}: ${e.message}"
                            sh "echo 'ERROR: Failed to backup storage location ${location}: ${e.message}' >> ${BACKUP_LOG_FILE}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                    
                    sh "echo '==== FILE STORAGE BACKUP COMPLETED ====' >> ${BACKUP_LOG_FILE}"
                }
            }
        }
        
        stage('Configuration Backup') {
            when {
                expression { return params.BACKUP_TYPE in ['FULL', 'CONFIG_ONLY'] }
            }
            steps {
                script {
                    echo "Starting configuration backup for ${params.ENVIRONMENT} environment"
                    
                    // Detect configurations to backup based on environment
                    def configItems = getConfigItems(params.ENVIRONMENT)
                    
                    // Log the configurations to be backed up
                    sh """
                        echo "==== CONFIGURATION BACKUP STARTED ====" >> ${BACKUP_LOG_FILE}
                        echo "Configurations to backup: ${configItems.join(', ')}" >> ${BACKUP_LOG_FILE}
                    """
                    
                    // Backup each configuration
                    configItems.each { config ->
                        try {
                            def configBackupFile = "${BACKUP_ROOT_DIR}/configs/${config.replaceAll('/', '_')}_${backupTimestamp}.json"
                            backupFiles.add(configBackupFile)
                            
                            echo "Backing up configuration: ${config}"
                            sh """
                                echo "Backing up configuration: ${config}" >> ${BACKUP_LOG_FILE}
                                
                                # Create directories if they don't exist
                                gsutil cp ${BACKUP_LOG_FILE} ${BACKUP_ROOT_DIR}/configs/ || gsutil mb ${BACKUP_ROOT_DIR}/configs/
                                
                                # Handle different configuration types
                                if [[ "${config}" == *"kubernetes"* ]]; then
                                    # Kubernetes configurations backup
                                    kubectl get all --all-namespaces -o json > temp_k8s_config.json
                                    gsutil cp temp_k8s_config.json ${configBackupFile}
                                    rm temp_k8s_config.json
                                elif [[ "${config}" == *"firebase"* ]]; then
                                    # Firebase configurations backup
                                    firebase --project=${CLOUD_PROJECT} functions:config:get > temp_firebase_config.json
                                    gsutil cp temp_firebase_config.json ${configBackupFile}
                                    rm temp_firebase_config.json
                                elif [[ "${config}" == *"secretmanager"* ]]; then
                                    # Secret Manager backup (metadata only, not secret values)
                                    gcloud secrets list --project=${CLOUD_PROJECT} --format=json > temp_secrets.json
                                    gsutil cp temp_secrets.json ${configBackupFile}
                                    rm temp_secrets.json
                                elif [[ "${config}" == *"cloudrun"* ]]; then
                                    # Cloud Run configurations backup
                                    gcloud run services describe ${config.split('/').last()} --format=json > temp_cloudrun_config.json
                                    gsutil cp temp_cloudrun_config.

