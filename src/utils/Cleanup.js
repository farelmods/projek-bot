/**
 * ALL-STAR BOT v2.0 - Cleanup Manager
 * Handles periodic cleanup and maintenance tasks
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from './Logger.js';
import { fileHelper } from './FileHelper.js';
import { db } from '../database/Database.js';
import path from 'path';

export class CleanupManager {
  constructor() {
    this.logger = new Logger('CLEANUP-MANAGER');
    this.cleanupInterval = null;
    this.isRunning = false;
    
    // Cleanup configuration
    this.config = {
      tempFilesAge: 3600000, // 1 hour
      logFilesAge: 604800000, // 7 days
      backupKeep: 7, // Keep last 7 backups
      cleanupInterval: 3600000 // Run every hour
    };
  }

  /**
   * Initialize cleanup manager
   */
  async initialize() {
    try {
      this.logger.info('Initializing cleanup manager...');

      // Run initial cleanup
      await this.runCleanup();

      // Schedule periodic cleanup
      this.startAutoCleanup();

      this.logger.info('Cleanup manager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize cleanup manager:', error);
      throw error;
    }
  }

  /**
   * Start automatic cleanup schedule
   */
  startAutoCleanup() {
    if (this.isRunning) {
      this.logger.warn('Auto cleanup is already running');
      return;
    }

    this.logger.info(`Starting auto cleanup (every ${this.config.cleanupInterval / 60000} minutes)`);

    this.cleanupInterval = setInterval(async () => {
      await this.runCleanup();
    }, this.config.cleanupInterval);

    this.isRunning = true;
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.isRunning = false;
      this.logger.info('Auto cleanup stopped');
    }
  }

  /**
   * Run all cleanup tasks
   * @returns {Promise<Object>} Cleanup result
   */
  async runCleanup() {
    try {
      this.logger.info('Running cleanup tasks...');

      const result = {
        tempFiles: 0,
        oldLogs: 0,
        oldBackups: 0,
        expiredCooldowns: 0,
        expiredMutes: 0,
        errors: []
      };

      // Clean temp files
      try {
        result.tempFiles = await this.cleanTempFiles();
      } catch (error) {
        result.errors.push('temp files: ' + error.message);
      }

      // Clean old logs
      try {
        result.oldLogs = await this.cleanOldLogs();
      } catch (error) {
        result.errors.push('logs: ' + error.message);
      }

      // Clean old backups
      try {
        result.oldBackups = await this.cleanOldBackups();
      } catch (error) {
        result.errors.push('backups: ' + error.message);
      }

      // Clean expired cooldowns
      try {
        result.expiredCooldowns = await this.cleanExpiredCooldowns();
      } catch (error) {
        result.errors.push('cooldowns: ' + error.message);
      }

      // Clean expired mutes
      try {
        result.expiredMutes = await this.cleanExpiredMutes();
      } catch (error) {
        result.errors.push('mutes: ' + error.message);
      }

      this.logger.info('Cleanup completed:', result);

      return result;

    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean temporary files
   * @returns {Promise<number>} Number of files cleaned
   */
  async cleanTempFiles() {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      
      if (!fileHelper.exists(tempDir)) {
        return 0;
      }

      const files = fileHelper.listFiles(tempDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fileHelper.getStats(filePath);

        if (stats && now - stats.modified.getTime() > this.config.tempFilesAge) {
          fileHelper.delete(filePath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info(`Cleaned ${cleaned} temp files`);
      }

      return cleaned;

    } catch (error) {
      this.logger.error('Error cleaning temp files:', error);
      return 0;
    }
  }

  /**
   * Clean old log files
   * @returns {Promise<number>} Number of files cleaned
   */
  async cleanOldLogs() {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      
      if (!fileHelper.exists(logsDir)) {
        return 0;
      }

      const files = fileHelper.listFiles(logsDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        // Skip current log files
        if (file.includes(new Date().toISOString().split('T')[0])) {
          continue;
        }

        const filePath = path.join(logsDir, file);
        const stats = fileHelper.getStats(filePath);

        if (stats && now - stats.modified.getTime() > this.config.logFilesAge) {
          fileHelper.delete(filePath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info(`Cleaned ${cleaned} old log files`);
      }

      return cleaned;

    } catch (error) {
      this.logger.error('Error cleaning log files:', error);
      return 0;
    }
  }

  /**
   * Clean old backup files
   * @returns {Promise<number>} Number of files cleaned
   */
  async cleanOldBackups() {
    try {
      const backupDir = path.join(process.cwd(), 'backups');
      
      if (!fileHelper.exists(backupDir)) {
        return 0;
      }

      const files = fileHelper.listFiles(backupDir, '.json')
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          stats: fileHelper.getStats(path.join(backupDir, file))
        }))
        .filter(f => f.stats)
        .sort((a, b) => b.stats.created.getTime() - a.stats.created.getTime());

      // Keep only last N backups
      const toDelete = files.slice(this.config.backupKeep);
      
      toDelete.forEach(file => {
        fileHelper.delete(file.path);
      });

      if (toDelete.length > 0) {
        this.logger.info(`Cleaned ${toDelete.length} old backups`);
      }

      return toDelete.length;

    } catch (error) {
      this.logger.error('Error cleaning backups:', error);
      return 0;
    }
  }

  /**
   * Clean expired cooldowns from database
   * @returns {Promise<number>} Number of cooldowns cleaned
   */
  async cleanExpiredCooldowns() {
    try {
      const cooldowns = db.get('users.cooldowns') || {};
      const now = Date.now();
      let cleaned = 0;

      for (const [number, commands] of Object.entries(cooldowns)) {
        for (const [command, timestamp] of Object.entries(commands)) {
          if (timestamp < now) {
            await db.removeCooldown(number, command);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        this.logger.debug(`Cleaned ${cleaned} expired cooldowns`);
      }

      return cleaned;

    } catch (error) {
      this.logger.error('Error cleaning cooldowns:', error);
      return 0;
    }
  }

  /**
   * Clean expired mutes from database
   * @returns {Promise<number>} Number of mutes cleaned
   */
  async cleanExpiredMutes() {
    try {
      const mutes = db.get('users.muted') || {};
      const now = Date.now();
      let cleaned = 0;

      for (const [number, data] of Object.entries(mutes)) {
        if (data.until && data.until < now) {
          await db.removeMute(number);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.debug(`Cleaned ${cleaned} expired mutes`);
      }

      return cleaned;

    } catch (error) {
      this.logger.error('Error cleaning mutes:', error);
      return 0;
    }
  }

  /**
   * Get cleanup statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      isRunning: this.isRunning,
      interval: this.config.cleanupInterval / 60000 + ' minutes',
      config: this.config
    };
  }

  /**
   * Update cleanup configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    this.logger.info('Cleanup configuration updated:', newConfig);

    // Restart if running
    if (this.isRunning) {
      this.stopAutoCleanup();
      this.startAutoCleanup();
    }
  }

  /**
   * Force cleanup now
   * @returns {Promise<Object>} Cleanup result
   */
  async forceCleanup() {
    this.logger.info('Force cleanup triggered');
    return await this.runCleanup();
  }

  /**
   * Get cleanup report
   * @returns {string} Formatted report
   */
  getReport() {
    const stats = this.getStatistics();

    let report = `🧹 *CLEANUP STATUS*\n\n`;
    report += `Status: ${stats.isRunning ? '✅ Running' : '❌ Stopped'}\n`;
    report += `Interval: ${stats.interval}\n\n`;
    report += `*Configuration:*\n`;
    report += `Temp Files Age: ${stats.config.tempFilesAge / 3600000}h\n`;
    report += `Log Files Age: ${stats.config.logFilesAge / 86400000}d\n`;
    report += `Backups Keep: ${stats.config.backupKeep}\n`;

    return report;
  }
}

// Export singleton instance
export const cleanupManager = new CleanupManager();
