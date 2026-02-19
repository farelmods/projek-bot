/**
 * ALL-STAR BOT v2.0 - Advanced Logging System
 * Professional logging with Winston and daily rotation
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import chalk from 'chalk';
import moment from 'moment-timezone';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors } = winston.format;

export class Logger {
  constructor(module = 'SYSTEM') {
    this.module = module;
    this.ensureLogDirectory();
    this.logger = this.createLogger();
  }

  ensureLogDirectory() {
    const logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  createLogger() {
    const customFormat = printf(({ level, message, timestamp, stack, module }) => {
      const ts = moment(timestamp).tz(process.env.TIMEZONE || 'Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
      const mod = module || this.module;
      
      if (stack) {
        return `[${ts}] [${level.toUpperCase()}] [${mod}] ${message}\n${stack}`;
      }
      
      return `[${ts}] [${level.toUpperCase()}] [${mod}] ${message}`;
    });

    const consoleFormat = printf(({ level, message, timestamp, module }) => {
      const ts = moment(timestamp).tz(process.env.TIMEZONE || 'Asia/Jakarta').format('HH:mm:ss');
      const mod = module || this.module;
      
      let levelColor;
      switch (level) {
        case 'error':
          levelColor = chalk.red.bold(level.toUpperCase());
          break;
        case 'warn':
          levelColor = chalk.yellow.bold(level.toUpperCase());
          break;
        case 'info':
          levelColor = chalk.blue.bold(level.toUpperCase());
          break;
        case 'debug':
          levelColor = chalk.gray.bold(level.toUpperCase());
          break;
        default:
          levelColor = chalk.white.bold(level.toUpperCase());
      }
      
      return `${chalk.gray(ts)} ${levelColor} ${chalk.cyan(`[${mod}]`)} ${message}`;
    });

    // Transport untuk semua log
    const allLogsTransport = new DailyRotateFile({
      filename: path.join('logs', 'all-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        customFormat
      )
    });

    // Transport untuk error log
    const errorLogsTransport = new DailyRotateFile({
      level: 'error',
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        customFormat
      )
    });

    // Transport untuk command log
    const commandLogsTransport = new DailyRotateFile({
      filename: path.join('logs', 'command-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      format: combine(
        timestamp(),
        customFormat
      )
    });

    // Transport untuk security log
    const securityLogsTransport = new DailyRotateFile({
      filename: path.join('logs', 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      format: combine(
        timestamp(),
        customFormat
      )
    });

    // Console transport
    const consoleTransport = new winston.transports.Console({
      format: combine(
        timestamp(),
        consoleFormat
      )
    });

    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      defaultMeta: { module: this.module },
      transports: [
        allLogsTransport,
        errorLogsTransport,
        consoleTransport
      ]
    });

    // Store specialized transports
    this.commandLogger = winston.createLogger({
      level: 'info',
      defaultMeta: { module: this.module },
      transports: [commandLogsTransport]
    });

    this.securityLogger = winston.createLogger({
      level: 'info',
      defaultMeta: { module: this.module },
      transports: [securityLogsTransport]
    });

    return logger;
  }

  info(message, ...args) {
    this.logger.info(this.formatMessage(message, args));
  }

  warn(message, ...args) {
    this.logger.warn(this.formatMessage(message, args));
  }

  error(message, ...args) {
    this.logger.error(this.formatMessage(message, args));
  }

  debug(message, ...args) {
    if (process.env.DEBUG_MODE === 'true') {
      this.logger.debug(this.formatMessage(message, args));
    }
  }

  critical(message, ...args) {
    const formattedMessage = `🚨 CRITICAL: ${this.formatMessage(message, args)}`;
    this.logger.error(formattedMessage);
  }

  command(user, command, group = 'DM') {
    const message = `User: ${user} | Command: ${command} | Group: ${group}`;
    this.commandLogger.info(message, { module: 'COMMAND' });
  }

  security(action, target, reason, executor) {
    const message = `Action: ${action} | Target: ${target} | Reason: ${reason} | Executor: ${executor}`;
    this.securityLogger.info(message, { module: 'SECURITY' });
  }

  formatMessage(message, args) {
    if (args.length === 0) return message;
    
    return `${message} ${args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    }).join(' ')}`;
  }

  // Specialized logging methods
  logCommand(data) {
    const { sender, command, group, success, error } = data;
    const status = success ? '✅ SUCCESS' : '❌ FAILED';
    const errorMsg = error ? ` | Error: ${error}` : '';
    
    this.command(sender, command, group);
    this.info(`${status} Command: ${command} | User: ${sender}${errorMsg}`);
  }

  logSecurity(data) {
    const { action, target, reason, executor, group } = data;
    this.security(action, target, reason, executor);
    this.warn(`🛡️  Security Action: ${action} | Target: ${target} | Group: ${group} | Reason: ${reason}`);
  }

  logError(context, error) {
    this.error(`❌ Error in ${context}:`, error.message);
    if (error.stack) {
      this.debug('Stack trace:', error.stack);
    }
  }

  logSystemEvent(event, details = {}) {
    const detailsStr = Object.keys(details).length > 0 
      ? ` | Details: ${JSON.stringify(details)}` 
      : '';
    this.info(`⚙️  System Event: ${event}${detailsStr}`);
  }

  logPerformance(operation, duration) {
    const durationStr = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
    this.debug(`⚡ Performance: ${operation} completed in ${durationStr}`);
  }

  // Create child logger with different module name
  child(moduleName) {
    return new Logger(moduleName);
  }
}

// Export singleton for general use
export const logger = new Logger('SYSTEM');