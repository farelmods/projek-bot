/**
 * ALL-STAR BOT v2.0 - Database Manager
 * LowDB implementation with backup and recovery
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';

export class Database {
  constructor() {
    this.logger = new Logger('DATABASE');
    this.dbPath = path.resolve(process.cwd(), config.get('database.path'));
    this.backupPath = path.resolve(process.cwd(), config.get('database.backupPath'));
    this.db = null;
    this.defaultData = this.getDefaultData();
  }

  async initialize() {
    try {
      this.logger.info('Initializing database...');
      
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Ensure backup directory exists
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
      }

      // Initialize LowDB
      const adapter = new JSONFile(this.dbPath);
      this.db = new Low(adapter, this.defaultData);

      // Read database
      await this.db.read();

      // Initialize default data if database is empty
      if (!this.db.data || Object.keys(this.db.data).length === 0) {
        this.db.data = this.defaultData;
        await this.db.write();
        this.logger.info('Database initialized with default data');
      }

      this.logger.info('Database initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  getDefaultData() {
    return {
      // Bot Configuration
      config: {
        botMode: 'PUBLIC', // PUBLIC or SELF
        defenseMode: 'NORMAL', // NORMAL, STRICT, LOCKDOWN
        version: config.get('bot.version')
      },

      // Users
      users: {
        authors: [config.get('bot.author.number')],
        owners: [],
        blacklisted: [],
        disabled: [],
        muted: {}, // { number: { until: timestamp, reason: '' } }
        warned: {}, // { number: warnCount }
        cooldowns: {} // { number: { command: timestamp } }
      },

      // Groups
      groups: {
        whitelisted: [],
        protected: [],
        shareTargets: [],
        settings: {} // { groupId: { antiLink: true, antiSpam: true, ... } }
      },

      // Statistics
      statistics: {
        commands: {},
        violations: {},
        activeMembersCache: {} // { groupId: { active: [], inactive: [], lastCheck: timestamp } }
      },

      // Game Data
      games: {
        players: {},
        sessions: {}
      },

      // Features State
      features: {
        antiLink: true,
        antiSpam: true,
        antiToxic: true,
        antiVirtex: true,
        welcome: true,
        goodbye: true,
        ai: config.get('ai.enabled'),
        game: config.get('features.game'),
        quotes: config.get('features.quotes'),
        downloadMusic: config.get('features.downloadMusic'),
        downloadTiktok: config.get('features.downloadTiktok'),
        sticker: config.get('features.sticker'),
        geoRestriction: true
      },

      // System Data
      system: {
        startTime: Date.now(),
        restartCount: 0,
        lastBackup: null,
        errorLog: []
      }
    };
  }

  // Generic get/set methods
  get(path) {
    const keys = path.split('.');
    let value = this.db.data;
    
    for (const key of keys) {
      if (value === undefined || value === null) return null;
      value = value[key];
    }
    
    return value;
  }

  async set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.db.data;
    
    for (const key of keys) {
      if (!target[key]) target[key] = {};
      target = target[key];
    }
    
    target[lastKey] = value;
    await this.db.write();
  }

  // User Management
  isAuthor(number) {
    return this.get('users.authors')?.includes(number) || false;
  }

  isOwner(number) {
    return this.get('users.owners')?.includes(number) || false;
  }

  isAuthorOrOwner(number) {
    return this.isAuthor(number) || this.isOwner(number);
  }

  async addOwner(number) {
    const owners = this.get('users.owners') || [];
    if (!owners.includes(number)) {
      owners.push(number);
      await this.set('users.owners', owners);
      this.logger.info(`Owner added: ${number}`);
      return true;
    }
    return false;
  }

  async removeOwner(number) {
    const owners = this.get('users.owners') || [];
    const index = owners.indexOf(number);
    if (index > -1) {
      owners.splice(index, 1);
      await this.set('users.owners', owners);
      this.logger.info(`Owner removed: ${number}`);
      return true;
    }
    return false;
  }

  isBlacklisted(number) {
    return this.get('users.blacklisted')?.includes(number) || false;
  }

  async addBlacklist(number) {
    const blacklist = this.get('users.blacklisted') || [];
    if (!blacklist.includes(number)) {
      blacklist.push(number);
      await this.set('users.blacklisted', blacklist);
      this.logger.security('Blacklist', number, 'Added to blacklist', 'SYSTEM');
      return true;
    }
    return false;
  }

  async removeBlacklist(number) {
    const blacklist = this.get('users.blacklisted') || [];
    const index = blacklist.indexOf(number);
    if (index > -1) {
      blacklist.splice(index, 1);
      await this.set('users.blacklisted', blacklist);
      this.logger.security('Unblacklist', number, 'Removed from blacklist', 'SYSTEM');
      return true;
    }
    return false;
  }

  isDisabled(number) {
    return this.get('users.disabled')?.includes(number) || false;
  }

  async addDisabled(number) {
    const disabled = this.get('users.disabled') || [];
    if (!disabled.includes(number)) {
      disabled.push(number);
      await this.set('users.disabled', disabled);
      return true;
    }
    return false;
  }

  async removeDisabled(number) {
    const disabled = this.get('users.disabled') || [];
    const index = disabled.indexOf(number);
    if (index > -1) {
      disabled.splice(index, 1);
      await this.set('users.disabled', disabled);
      return true;
    }
    return false;
  }

  getDisabledList() {
    return this.get('users.disabled') || [];
  }

  // Mute Management
  isMuted(number) {
    const muted = this.get(`users.muted.${number}`);
    if (!muted) return false;
    
    if (Date.now() > muted.until) {
      this.removeMute(number);
      return false;
    }
    
    return true;
  }

  async addMute(number, duration, reason = 'No reason provided') {
    const until = Date.now() + (duration * 60 * 1000); // duration in minutes
    await this.set(`users.muted.${number}`, { until, reason });
    this.logger.security('Mute', number, reason, 'SYSTEM');
  }

  async removeMute(number) {
    const muted = this.get('users.muted') || {};
    delete muted[number];
    await this.set('users.muted', muted);
    this.logger.security('Unmute', number, 'Mute removed', 'SYSTEM');
  }

  getMuteInfo(number) {
    return this.get(`users.muted.${number}`) || null;
  }

  // Warning Management
  getWarnCount(number) {
    return this.get(`users.warned.${number}`) || 0;
  }

  async addWarn(number) {
    const count = this.getWarnCount(number) + 1;
    await this.set(`users.warned.${number}`, count);
    this.logger.security('Warn', number, `Warning ${count}/${config.get('security.maxWarn')}`, 'SYSTEM');
    return count;
  }

  async removeWarn(number) {
    const count = Math.max(0, this.getWarnCount(number) - 1);
    if (count === 0) {
      const warned = this.get('users.warned') || {};
      delete warned[number];
      await this.set('users.warned', warned);
    } else {
      await this.set(`users.warned.${number}`, count);
    }
    return count;
  }

  async resetWarn(number) {
    const warned = this.get('users.warned') || {};
    delete warned[number];
    await this.set('users.warned', warned);
  }

  // Cooldown Management
  isOnCooldown(number, command) {
    const cooldown = this.get(`users.cooldowns.${number}.${command}`);
    if (!cooldown) return false;
    
    const remaining = cooldown - Date.now();
    if (remaining <= 0) {
      this.removeCooldown(number, command);
      return false;
    }
    
    return remaining;
  }

  async setCooldown(number, command, duration = null) {
    const cooldownTime = duration || config.get('security.cooldownCommand');
    const until = Date.now() + (cooldownTime * 1000);
    
    const cooldowns = this.get(`users.cooldowns.${number}`) || {};
    cooldowns[command] = until;
    await this.set(`users.cooldowns.${number}`, cooldowns);
  }

  async removeCooldown(number, command) {
    const cooldowns = this.get(`users.cooldowns.${number}`) || {};
    delete cooldowns[command];
    await this.set(`users.cooldowns.${number}`, cooldowns);
  }

  // Group Management
  isWhitelisted(groupId) {
    return this.get('groups.whitelisted')?.includes(groupId) || false;
  }

  async addWhitelist(groupId) {
    const whitelist = this.get('groups.whitelisted') || [];
    if (!whitelist.includes(groupId)) {
      whitelist.push(groupId);
      await this.set('groups.whitelisted', whitelist);
      return true;
    }
    return false;
  }

  async removeWhitelist(groupId) {
    const whitelist = this.get('groups.whitelisted') || [];
    const index = whitelist.indexOf(groupId);
    if (index > -1) {
      whitelist.splice(index, 1);
      await this.set('groups.whitelisted', whitelist);
      return true;
    }
    return false;
  }

  isProtected(groupId) {
    return this.get('groups.protected')?.includes(groupId) || false;
  }

  async addProtected(groupId) {
    const protected = this.get('groups.protected') || [];
    if (!protected.includes(groupId)) {
      protected.push(groupId);
      await this.set('groups.protected', protected);
      // Initialize default group settings
      await this.setGroupSettings(groupId, this.getDefaultGroupSettings());
      return true;
    }
    return false;
  }

  async removeProtected(groupId) {
    const protected = this.get('groups.protected') || [];
    const index = protected.indexOf(groupId);
    if (index > -1) {
      protected.splice(index, 1);
      await this.set('groups.protected', protected);
      return true;
    }
    return false;
  }

  isShareTarget(groupId) {
    return this.get('groups.shareTargets')?.includes(groupId) || false;
  }

  async addShareTarget(groupId) {
    const targets = this.get('groups.shareTargets') || [];
    if (!targets.includes(groupId)) {
      targets.push(groupId);
      await this.set('groups.shareTargets', targets);
      return true;
    }
    return false;
  }

  async removeShareTarget(groupId) {
    const targets = this.get('groups.shareTargets') || [];
    const index = targets.indexOf(groupId);
    if (index > -1) {
      targets.splice(index, 1);
      await this.set('groups.shareTargets', targets);
      return true;
    }
    return false;
  }

  getShareTargets() {
    return this.get('groups.shareTargets') || [];
  }

  getDefaultGroupSettings() {
    return {
      antiLink: true,
      antiSpam: true,
      antiToxic: true,
      antiVirtex: true,
      welcome: true,
      goodbye: true,
      geoRestriction: true,
      defenseMode: 'NORMAL'
    };
  }

  getGroupSettings(groupId) {
    return this.get(`groups.settings.${groupId}`) || this.getDefaultGroupSettings();
  }

  async setGroupSettings(groupId, settings) {
    await this.set(`groups.settings.${groupId}`, settings);
  }

  async updateGroupSetting(groupId, key, value) {
    const settings = this.getGroupSettings(groupId);
    settings[key] = value;
    await this.setGroupSettings(groupId, settings);
  }

  // Feature Management
  isFeatureEnabled(feature) {
    return this.get(`features.${feature}`) || false;
  }

  async setFeature(feature, enabled) {
    await this.set(`features.${feature}`, enabled);
    this.logger.info(`Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Bot Mode
  getBotMode() {
    return this.get('config.botMode') || 'PUBLIC';
  }

  async setBotMode(mode) {
    await this.set('config.botMode', mode);
    this.logger.info(`Bot mode changed to ${mode}`);
  }

  // Defense Mode
  getDefenseMode() {
    return this.get('config.defenseMode') || 'NORMAL';
  }

  async setDefenseMode(mode) {
    await this.set('config.defenseMode', mode);
    this.logger.info(`Defense mode changed to ${mode}`);
  }

  // Statistics
  async incrementCommandUsage(command) {
    const count = this.get(`statistics.commands.${command}`) || 0;
    await this.set(`statistics.commands.${command}`, count + 1);
  }

  async incrementViolation(type) {
    const count = this.get(`statistics.violations.${type}`) || 0;
    await this.set(`statistics.violations.${type}`, count + 1);
  }

  // Backup
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupPath, `backup-${timestamp}.json`);
      
      const data = JSON.stringify(this.db.data, null, 2);
      fs.writeFileSync(backupFile, data);
      
      await this.set('system.lastBackup', Date.now());
      this.logger.info(`Backup created: ${backupFile}`);
      
      // Clean old backups (keep last 7)
      this.cleanOldBackups(7);
      
      return backupFile;
    } catch (error) {
      this.logger.error('Failed to create backup:', error);
      throw error;
    }
  }
cleanOldBackups(keepCount) {
    try {
      const files = fs.readdirSync(this.backupPath)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(this.backupPath, f),
          time: fs.statSync(path.join(this.backupPath, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Delete old backups
      files.slice(keepCount).forEach(file => {
        fs.unlinkSync(file.path);
        this.logger.debug(`Deleted old backup: ${file.name}`);
      });
    } catch (error) {
      this.logger.error('Failed to clean old backups:', error);
    }
  }

  async restoreFromBackup(backupFile) {
    try {
      const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      this.db.data = data;
      await this.db.write();
      this.logger.info(`Database restored from: ${backupFile}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to restore backup:', error);
      throw error;
    }
  }

  // System
  async incrementRestartCount() {
    const count = this.get('system.restartCount') || 0;
    await this.set('system.restartCount', count + 1);
    return count + 1;
  }

  async logError(error) {
    const errorLog = this.get('system.errorLog') || [];
    errorLog.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack
    });
    
    // Keep only last 100 errors
    if (errorLog.length > 100) {
      errorLog.shift();
    }
    
    await this.set('system.errorLog', errorLog);
  }
}

// Export singleton
export const db = new Database();