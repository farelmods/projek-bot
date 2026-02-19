/**
 * ALL-STAR BOT v2.0 - Backup Manager
 * Automated backup system for database
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import fs from 'fs';
import path from 'path';
import { Logger } from './Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';

export class BackupManager {
  constructor() {
    this.logger = new Logger('BACKUP-MANAGER');
    this.backupPath = path.resolve(process.cwd(), config.get('database.backupPath'));
    this.backupInterval = null;
    this.isRunning = false;
  }

  /**
   * Initialize backup manager
   */
  async initialize() {
    try {
      this.logger.info('Initializing backup manager...');

      // Ensure backup directory exists
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
        this.logger.info('Backup directory created');
      }

      // Start automatic backup if enabled
      if (config.get('database.autoBackup')) {
        await this.startAutomaticBackup();
      }

      this.logger.info('Backup manager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize backup manager:', error);
      throw error;
    }
  }

  /**
   * Start automatic backup schedule
   */
  async startAutomaticBackup() {
    if (this.isRunning) {
      this.logger.warn('Automatic backup is already running');
      return;
    }

    const intervalHours = config.get('database.backupInterval');
    const intervalMs = intervalHours * 60 * 60 * 1000;

    this.logger.info(`Starting automatic backup every ${intervalHours} hours`);

    // Create initial backup
    await this.createBackup();

    // Schedule periodic backups
    this.backupInterval = setInterval(async () => {
      await this.createBackup();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop automatic backup
   */
  stopAutomaticBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      this.isRunning = false;
      this.logger.info('Automatic backup stopped');
    }
  }

  /**
   * Create database backup
   * @returns {Promise<string>} Backup file path
   */
  async createBackup() {
    try {
      this.logger.info('Creating database backup...');

      const backupFile = await db.createBackup();

      this.logger.info(`Backup created: ${backupFile}`);

      // Notify author if bot is running
      if (global.botInstance) {
        await global.botInstance.sendMessageToAuthor(
          `💾 *AUTO BACKUP*\n\nDatabase backup created successfully.\n\nFile: ${path.basename(backupFile)}\nTime: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
        );
      }

      return backupFile;
    } catch (error) {
      this.logger.error('Backup creation failed:', error);

      // Notify author about failure
      if (global.botInstance) {
        await global.botInstance.sendMessageToAuthor(
          `❌ *BACKUP FAILED*\n\nFailed to create database backup.\n\nError: ${error.message}\nTime: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
        );
      }

      throw error;
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupFile - Backup file name or path
   * @returns {Promise<boolean>} Success status
   */
  async restoreBackup(backupFile) {
    try {
      this.logger.info(`Restoring backup: ${backupFile}`);

      // Resolve full path if only filename provided
      let fullPath = backupFile;
      if (!path.isAbsolute(backupFile)) {
        fullPath = path.join(this.backupPath, backupFile);
      }

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error('Backup file not found');
      }

      // Restore backup
      await db.restoreFromBackup(fullPath);

      this.logger.info('Backup restored successfully');

      // Notify author
      if (global.botInstance) {
        await global.botInstance.sendMessageToAuthor(
          `✅ *BACKUP RESTORED*\n\nDatabase restored from backup.\n\nFile: ${path.basename(fullPath)}\nTime: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
        );
      }

      return true;
    } catch (error) {
      this.logger.error('Backup restoration failed:', error);

      if (global.botInstance) {
        await global.botInstance.sendMessageToAuthor(
          `❌ *RESTORE FAILED*\n\nFailed to restore backup.\n\nError: ${error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * List all available backups
   * @returns {Array} List of backup files with info
   */
  listBackups() {
    try {
      if (!fs.existsSync(this.backupPath)) {
        return [];
      }

      const files = fs.readdirSync(this.backupPath)
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .map(file => {
          const fullPath = path.join(this.backupPath, file);
          const stats = fs.statSync(fullPath);

          return {
            name: file,
            path: fullPath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      this.logger.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete old backups, keeping only recent ones
   * @param {number} keepCount - Number of backups to keep
   */
  cleanOldBackups(keepCount = 7) {
    try {
      this.logger.info(`Cleaning old backups, keeping last ${keepCount}...`);

      const backups = this.listBackups();

      if (backups.length <= keepCount) {
        this.logger.info('No old backups to clean');
        return;
      }

      const toDelete = backups.slice(keepCount);
      let deletedCount = 0;

      for (const backup of toDelete) {
        try {
          fs.unlinkSync(backup.path);
          deletedCount++;
          this.logger.debug(`Deleted old backup: ${backup.name}`);
        } catch (error) {
          this.logger.error(`Failed to delete backup ${backup.name}:`, error);
        }
      }

      this.logger.info(`Cleaned ${deletedCount} old backups`);
    } catch (error) {
      this.logger.error('Failed to clean old backups:', error);
    }
  }

  /**
   * Delete specific backup
   * @param {string} backupFile - Backup file name
   * @returns {boolean} Success status
   */
  deleteBackup(backupFile) {
    try {
      const fullPath = path.join(this.backupPath, backupFile);

      if (!fs.existsSync(fullPath)) {
        throw new Error('Backup file not found');
      }

      fs.unlinkSync(fullPath);
      this.logger.info(`Backup deleted: ${backupFile}`);

      return true;
    } catch (error) {
      this.logger.error('Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Get latest backup
   * @returns {Object|null} Latest backup info
   */
  getLatestBackup() {
    const backups = this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * Get backup statistics
   * @returns {Object} Backup statistics
   */
  getStatistics() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const latest = backups.length > 0 ? backups[0] : null;

    return {
      totalBackups: backups.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      latestBackup: latest ? {
        name: latest.name,
        created: latest.created,
        size: latest.size
      } : null,
      isAutoBackupRunning: this.isRunning,
      backupInterval: config.get('database.backupInterval')
    };
  }

  /**
   * Check backup integrity
   * @param {string} backupFile - Backup file to check
   * @returns {Promise<boolean>} Is valid backup
   */
  async checkIntegrity(backupFile) {
    try {
      const fullPath = path.join(this.backupPath, backupFile);

      if (!fs.existsSync(fullPath)) {
        return false;
      }

      // Try to parse JSON
      const content = fs.readFileSync(fullPath, 'utf-8');
      JSON.parse(content);

      return true;
    } catch (error) {
      this.logger.error(`Backup integrity check failed for ${backupFile}:`, error);
      return false;
    }
  }

  /**
   * Get backup info
   * @param {string} backupFile - Backup file name
   * @returns {Object|null} Backup information
   */
  getBackupInfo(backupFile) {
    try {
      const fullPath = path.join(this.backupPath, backupFile);

      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(content);

      return {
        name: backupFile,
        path: fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        version: data.config?.version || 'unknown',
        recordCount: this.countRecords(data)
      };
    } catch (error) {
      this.logger.error('Failed to get backup info:', error);
      return null;
    }
  }

  /**
   * Count records in backup data
   * @param {Object} data - Backup data
   * @returns {Object} Record counts
   */
  countRecords(data) {
    return {
      users: Object.keys(data.users?.cooldowns || {}).length,
      groups: (data.groups?.whitelisted?.length || 0) + (data.groups?.protected?.length || 0),
      blacklisted: data.users?.blacklisted?.length || 0,
      muted: Object.keys(data.users?.muted || {}).length
    };
  }
}

// Export singleton instance
export const backupManager = new BackupManager();
