const winston = require('winston');
const chalk = require('chalk');
const { table } = require('table');
const fs = require('fs');
const path = require('path');

// Custom format for masking sensitive data
const maskSensitiveData = winston.format((info) => {
    const masked = { ...info };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credentials'];
    
    const maskValue = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                maskValue(obj[key]);
            } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                obj[key] = '********';
            }
        }
    };

    maskValue(masked);
    return masked;
})();

// Custom format for colorizing log levels
const levelColorizer = winston.format((info) => {
    const colors = {
        debug: 'blue',
        info: 'green',
        warn: 'yellow',
        error: 'red'
    };
    
    info.levelColored = chalk[colors[info.level]](info.level.toUpperCase());
    return info;
})();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        maskSensitiveData,
        levelColorizer,
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, levelColored, message, ...rest }) => {
            let output = `${timestamp} [${levelColored}]: ${message}`;
            
            if (Object.keys(rest).length > 0) {
                const meta = { ...rest };
                delete meta.level;
                output += `\n${JSON.stringify(meta, null, 2)}`;
            }
            
            return output;
        })
    ),
    transports: [
        // Console transport with colored output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // File transport for persistent logging
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log')
        })
    ]
});

// Add utility methods for common logging patterns
logger.table = (data, columns) => {
    if (!Array.isArray(data)) {
        logger.warn('Table data must be an array');
        return;
    }

    const tableData = [columns || Object.keys(data[0])];
    data.forEach(item => {
        tableData.push(columns ? columns.map(col => item[col]) : Object.values(item));
    });

    logger.info('\n' + table(tableData));
};

logger.json = (data, indent = 2) => {
    try {
        const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, indent);
        logger.info('\n' + formatted);
    } catch (error) {
        logger.error('Failed to format JSON data', { error });
    }
};

logger.startOperation = (message) => {
    logger.info(`🚀 ${message}`);
    return new Date();
};

logger.endOperation = (startTime, message) => {
    const duration = new Date() - startTime;
    logger.info(`✅ ${message} (${duration}ms)`);
};

logger.progress = (current, total, message) => {
    const percentage = Math.round((current / total) * 100);
    logger.info(`${message}: ${percentage}% (${current}/${total})`);
};

module.exports = logger;

