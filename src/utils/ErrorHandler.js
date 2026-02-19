/**
 * ALL-STAR BOT v2.0 - Error Handler
 * Global error handling and recovery system
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from './Logger.js';
import { db } from '../database/Database.js';

export class ErrorHandler {
  constructor() {
    this.logger = new Logger('ERROR-HANDLER');
    this.errorCount = 0;
    this.errorThreshold = 10;
    this.errorWindow = 60000; // 1 minute
    this.recentErrors = [];
  }

  /**
   * Handle error with context
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @param {Object} additionalInfo - Additional information
   */
  async handle(error, context = 'Unknown', additionalInfo = {}) {
    try {
      this.logger.error(`Error in ${context}:`, error);

      // Track error
      this.trackError(error, context);

      // Log to database
      await this.logToDatabase(error, context, additionalInfo);

      // Check if critical
      if (this.isCriticalError(error)) {
        await this.handleCriticalError(error, context);
      }

      // Check error rate
      if (this.isErrorRateHigh()) {
        await this.handleHighErrorRate();
      }

    } catch (handlingError) {
      this.logger.critical('Error in error handler:', handlingError);
    }
  }

  /**
   * Track error occurrence
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  trackError(error, context) {
    this.errorCount++;
    
    this.recentErrors.push({
      timestamp: Date.now(),
      message: error.message,
      context,
      stack: error.stack
    });

    // Clean old errors
    const cutoff = Date.now() - this.errorWindow;
    this.recentErrors = this.recentErrors.filter(e => e.timestamp > cutoff);
  }

  /**
   * Log error to database
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @param {Object} additionalInfo - Additional information
   */
  async logToDatabase(error, context, additionalInfo) {
    try {
      await db.logError({
        message: error.message,
        stack: error.stack,
        context,
        additionalInfo,
        timestamp: Date.now()
      });
    } catch (dbError) {
      this.logger.error('Failed to log error to database:', dbError);
    }
  }

  /**
   * Check if error is critical
   * @param {Error} error - Error object
   * @returns {boolean}
   */
  isCriticalError(error) {
    const criticalPatterns = [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /Cannot read property/i,
      /undefined is not a function/i,
      /Maximum call stack/i,
      /Out of memory/i,
      /Database/i,
      /Authentication/i
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Handle critical error
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  async handleCriticalError(error, context) {
    this.logger.critical(`Critical error detected in ${context}`);

    // Notify author
    if (global.botInstance) {
      const message = this.formatCriticalErrorMessage(error, context);
      await global.botInstance.sendMessageToAuthor(message);
    }
  }

  /**
   * Format critical error message
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @returns {string} Formatted message
   */
  formatCriticalErrorMessage(error, context) {
    return `🚨 *CRITICAL ERROR*

Context: ${context}
Error: ${error.message}

Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

Stack trace logged. Please check immediately.`;
  }

  /**
   * Check if error rate is high
   * @returns {boolean}
   */
  isErrorRateHigh() {
    return this.recentErrors.length >= this.errorThreshold;
  }

  /**
   * Handle high error rate
   */
  async handleHighErrorRate() {
    this.logger.critical(`High error rate detected: ${this.recentErrors.length} errors in ${this.errorWindow/1000}s`);

    // Notify author
    if (global.botInstance) {
      const message = `⚠️ *HIGH ERROR RATE*

Errors: ${this.recentErrors.length} in last minute
Threshold: ${this.errorThreshold}

Recent errors:
${this.recentErrors.slice(-3).map(e => `• ${e.context}: ${e.message}`).join('\n')}

System may need attention.`;

      await global.botInstance.sendMessageToAuthor(message);
    }
  }

  /**
   * Try to recover from error
   * @param {Error} error - Error object
   * @param {Function} recoveryFn - Recovery function
   * @returns {Promise<boolean>} Recovery success
   */
  async tryRecover(error, recoveryFn) {
    try {
      this.logger.info('Attempting error recovery...');
      await recoveryFn();
      this.logger.info('Recovery successful');
      return true;
    } catch (recoveryError) {
      this.logger.error('Recovery failed:', recoveryError);
      return false;
    }
  }

  /**
   * Wrap function with error handling
   * @param {Function} fn - Function to wrap
   * @param {string} context - Context name
   * @returns {Function} Wrapped function
   */
  wrap(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.handle(error, context, { args });
        throw error;
      }
    };
  }

  /**
   * Safe execute function
   * @param {Function} fn - Function to execute
   * @param {string} context - Context name
   * @param {*} defaultValue - Default value on error
   * @returns {Promise<*>} Result or default value
   */
  async safeExecute(fn, context, defaultValue = null) {
    try {
      return await fn();
    } catch (error) {
      await this.handle(error, context);
      return defaultValue;
    }
  }

  /**
   * Get error statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.recentErrors.length,
      errorRate: (this.recentErrors.length / (this.errorWindow / 1000)).toFixed(2),
      topErrors: this.getTopErrors(),
      isHighRate: this.isErrorRateHigh()
    };
  }

  /**
   * Get top error types
   * @returns {Array} Top errors
   */
  getTopErrors() {
    const errorCounts = {};

    for (const error of this.recentErrors) {
      const key = `${error.context}: ${error.message.substring(0, 50)}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }

    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
  }

  /**
   * Reset error tracking
   */
  reset() {
    this.errorCount = 0;
    this.recentErrors = [];
    this.logger.info('Error tracking reset');
  }

  /**
   * Clear old errors
   */
  cleanup() {
    const cutoff = Date.now() - this.errorWindow;
    const beforeCount = this.recentErrors.length;
    
    this.recentErrors = this.recentErrors.filter(e => e.timestamp > cutoff);
    
    const cleaned = beforeCount - this.recentErrors.length;
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} old error records`);
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Periodic cleanup every 5 minutes
setInterval(() => {
  errorHandler.cleanup();
}, 300000);
