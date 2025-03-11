import chalk from "chalk";

class Logger {
    constructor(options = {}) {
        this.level = options.level || "info";
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    _shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }

    _formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.map(arg => {
            if (typeof arg === "object") {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(" ");

        return `${timestamp} [${level.toUpperCase()}] ${message} ${formattedArgs}`.trim();
    }

    debug(message, ...args) {
        if (this._shouldLog("debug")) {
            console.log(chalk.gray(this._formatMessage("debug", message, ...args)));
        }
    }

    info(message, ...args) {
        if (this._shouldLog("info")) {
            console.log(chalk.blue(this._formatMessage("info", message, ...args)));
        }
    }

    warn(message, ...args) {
        if (this._shouldLog("warn")) {
            console.log(chalk.yellow(this._formatMessage("warn", message, ...args)));
        }
    }

    error(message, ...args) {
        if (this._shouldLog("error")) {
            console.error(chalk.red(this._formatMessage("error", message, ...args)));
        }
    }

    table(data) {
        if (this._shouldLog("info")) {
            console.table(data);
        }
    }
}

const logger = new Logger();
export { Logger };
export default logger;
