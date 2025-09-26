const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const colors = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'INFO';
    this.logFile = path.join(logsDir, 'app.log');
    this.errorFile = path.join(logsDir, 'error.log');
  }

  log(level, message, meta = {}) {
    if (logLevels[level] <= logLevels[this.level]) {
      const timestamp = new Date().toISOString();
      const logMessage = {
        timestamp,
        level,
        message,
        ...meta
      };

      // Console output with colors
      const coloredMessage = `${colors[level]}[${timestamp}] ${level}: ${message}${colors.RESET}`;
      // eslint-disable-next-line no-console
      console.log(coloredMessage);

      // File output
      const fileMessage = JSON.stringify(logMessage) + '\n';
      try {
        fs.appendFileSync(this.logFile, fileMessage);
        if (level === 'ERROR') {
          fs.appendFileSync(this.errorFile, fileMessage);
        }
      } catch (_) {
        // Ignore file write errors in restricted environments
      }
    }
  }

  error(message, meta = {}) { this.log('ERROR', message, meta); }
  warn(message, meta = {}) { this.log('WARN', message, meta); }
  info(message, meta = {}) { this.log('INFO', message, meta); }
  debug(message, meta = {}) { this.log('DEBUG', message, meta); }
}

module.exports = new Logger();
