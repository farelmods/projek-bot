/**
 * ALL-STAR BOT v2.0 - Defense Engine
 * Coordinates all security modules with priority-based execution
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { db } from '../database/Database.js';
import { antiLink } from './AntiLink.js';
import { antiSpam } from './AntiSpam.js';
import { antiToxic } from './AntiToxic.js';
import { antiVirtex } from './AntiVirtex.js';
import { geoRestriction } from './GeoRestriction.js';

export class DefenseEngine {
  constructor() {
    this.logger = new Logger('DEFENSE-ENGINE');
    
    // Register all security modules with priority
    this.modules = [
      { 
        name: 'antiVirtex', 
        instance: antiVirtex, 
        priority: 1,
        checkOnNewMember: false
      },
      { 
        name: 'antiToxic', 
        instance: antiToxic, 
        priority: 2,
        checkOnNewMember: false
      },
      { 
        name: 'antiLink', 
        instance: antiLink, 
        priority: 3,
        checkOnNewMember: false
      },
      { 
        name: 'antiSpam', 
        instance: antiSpam, 
        priority: 4,
        checkOnNewMember: false
      },
      { 
        name: 'geoRestriction', 
        instance: geoRestriction, 
        priority: 5,
        checkOnNewMember: true
      }
    ];

    // Sort by priority (lower number = higher priority)
    this.modules.sort((a, b) => a.priority - b.priority);

    // Statistics
    this.stats = {
      totalChecks: 0,
      violations: 0,
      blocked: 0
    };
  }

  /**
   * Check message against all defense modules
   * @param {Object} bot - Bot instance
   * @param {Object} msg - Message object
   * @param {Object} messageInfo - Message information
   * @returns {Promise<Object>} Check result
   */
  async checkMessage(bot, msg, messageInfo) {
    try {
      const { from, sender, messageContent, isGroup, groupId } = messageInfo;

      // Don't check if not in protected group
      if (isGroup && !db.isProtected(groupId)) {
        return { blocked: false };
      }

      // Don't check messages from author/owner
      const senderNumber = sender.split('@')[0];
      if (db.isAuthorOrOwner(senderNumber)) {
        return { blocked: false };
      }

      // Don't check bot's own messages
      if (sender === bot.sock.user.id) {
        return { blocked: false };
      }

      this.stats.totalChecks++;

      // Run modules in priority order
      for (const module of this.modules) {
        // Check if module is enabled for this group
        if (!module.instance.isEnabled(groupId)) {
          continue;
        }

        // Run module detection
        const detection = await this.runModuleDetection(
          module,
          messageContent,
          sender,
          messageInfo
        );

        if (detection.detected) {
          this.logger.warn(`${module.name} violation detected from ${senderNumber}`);
          this.stats.violations++;

          // Handle the violation
          await this.handleViolation(
            bot,
            module,
            groupId,
            sender,
            msg.key,
            detection
          );

          this.stats.blocked++;

          return {
            blocked: true,
            module: module.name,
            detection,
            action: 'handled'
          };
        }
      }

      // No violations detected
      return { blocked: false };

    } catch (error) {
      this.logger.error('Error in defense engine check:', error);
      return { blocked: false, error: error.message };
    }
  }

  /**
   * Run detection for specific module
   * @param {Object} module - Module configuration
   * @param {string} messageContent - Message content
   * @param {string} sender - Sender JID
   * @param {Object} messageInfo - Message information
   * @returns {Promise<Object>} Detection result
   */
  async runModuleDetection(module, messageContent, sender, messageInfo) {
    try {
      switch (module.name) {
        case 'antiVirtex':
          return module.instance.detect(messageContent);

        case 'antiToxic':
          return module.instance.detect(messageContent);

        case 'antiLink':
          return module.instance.detect(messageContent);

        case 'antiSpam':
          return module.instance.detect(
            sender,
            messageContent,
            Date.now()
          );

        case 'geoRestriction':
          // Geo-restriction is checked on member join, not on messages
          return { detected: false };

        default:
          return { detected: false };
      }
    } catch (error) {
      this.logger.error(`Error in ${module.name} detection:`, error);
      return { detected: false };
    }
  }

  /**
   * Handle violation detected by module
   * @param {Object} bot - Bot instance
   * @param {Object} module - Module configuration
   * @param {string} groupId - Group JID
   * @param {string} sender - Sender JID
   * @param {Object} messageKey - Message key
   * @param {Object} detection - Detection result
   */
  async handleViolation(bot, module, groupId, sender, messageKey, detection) {
    try {
      switch (module.name) {
        case 'antiVirtex':
          await module.instance.handle(bot, groupId, sender, messageKey, detection);
          break;

        case 'antiToxic':
          await module.instance.handle(bot, groupId, sender, messageKey, detection);
          break;

        case 'antiLink':
          await module.instance.handle(bot, groupId, sender, messageKey, detection.links);
          break;

        case 'antiSpam':
          await module.instance.handle(bot, groupId, sender, detection);
          break;

        default:
          this.logger.warn(`No handler for module: ${module.name}`);
      }

      this.logger.info(`Violation handled by ${module.name}`);

    } catch (error) {
      this.logger.error(`Error handling ${module.name} violation:`, error);
    }
  }

  /**
   * Check new member against restrictions
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @param {string} participant - Participant JID
   * @returns {Promise<Object>} Check result
   */
  async checkNewMember(bot, groupId, participant) {
    try {
      // Don't check if not in protected group
      if (!db.isProtected(groupId)) {
        return { blocked: false };
      }

      const phoneNumber = participant.split('@')[0];

      // Don't check author/owner
      if (db.isAuthorOrOwner(phoneNumber)) {
        return { blocked: false };
      }

      // Check blacklist
      if (db.isBlacklisted(phoneNumber)) {
        await bot.kickParticipant(groupId, [participant]);
        await bot.sendMessage(groupId, {
          text: `🚫 User @${phoneNumber} dikick karena ada di blacklist.`,
          mentions: [participant]
        });
        this.logger.security('Kick', phoneNumber, 'Blacklisted', 'SYSTEM');
        return { blocked: true, reason: 'blacklisted' };
      }

      // Run geo-restriction check
      const geoCheck = geoRestriction.detect(phoneNumber);
      if (!geoCheck.allowed && geoRestriction.isEnabled(groupId)) {
        await geoRestriction.handle(bot, groupId, participant);
        return { 
          blocked: true, 
          reason: 'geo_restriction',
          country: geoCheck.country
        };
      }

      return { blocked: false };

    } catch (error) {
      this.logger.error('Error checking new member:', error);
      return { blocked: false, error: error.message };
    }
  }

  /**
   * Get defense mode for group
   * @param {string} groupId - Group JID
   * @returns {string} Defense mode
   */
  getDefenseMode(groupId) {
    const settings = db.getGroupSettings(groupId);
    return settings.defenseMode || db.getDefenseMode();
  }

  /**
   * Set defense mode for group
   * @param {string} groupId - Group JID
   * @param {string} mode - Defense mode (NORMAL, STRICT, LOCKDOWN)
   */
  async setDefenseMode(groupId, mode) {
    const validModes = ['NORMAL', 'STRICT', 'LOCKDOWN'];
    
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid defense mode: ${mode}`);
    }

    await db.updateGroupSetting(groupId, 'defenseMode', mode);
    this.logger.info(`Defense mode set to ${mode} for group: ${groupId}`);
  }

  /**
   * Enable all defense modules for group
   * @param {string} groupId - Group JID
   */
  async enableAllModules(groupId) {
    for (const module of this.modules) {
      await module.instance.enable(groupId);
    }
    this.logger.info(`All defense modules enabled for group: ${groupId}`);
  }

  /**
   * Disable all defense modules for group
   * @param {string} groupId - Group JID
   */
  async disableAllModules(groupId) {
    for (const module of this.modules) {
      await module.instance.disable(groupId);
    }
    this.logger.info(`All defense modules disabled for group: ${groupId}`);
  }

  /**
   * Enable specific module
   * @param {string} groupId - Group JID
   * @param {string} moduleName - Module name
   */
  async enableModule(groupId, moduleName) {
    const module = this.modules.find(m => m.name === moduleName);
    
    if (!module) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    await module.instance.enable(groupId);
    this.logger.info(`${moduleName} enabled for group: ${groupId}`);
  }

  /**
   * Disable specific module
   * @param {string} groupId - Group JID
   * @param {string} moduleName - Module name
   */
  async disableModule(groupId, moduleName) {
    const module = this.modules.find(m => m.name === moduleName);
    
    if (!module) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    await module.instance.disable(groupId);
    this.logger.info(`${moduleName} disabled for group: ${groupId}`);
  }

  /**
   * Get module status for group
   * @param {string} groupId - Group JID
   * @returns {Object} Module statuses
   */
  getModuleStatus(groupId) {
    const status = {};
    
    for (const module of this.modules) {
      status[module.name] = module.instance.isEnabled(groupId);
    }

    return status;
  }

  /**
   * Get defense statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      modules: this.modules.map(m => ({
        name: m.name,
        priority: m.priority
      }))
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalChecks: 0,
      violations: 0,
      blocked: 0
    };
    this.logger.info('Defense statistics reset');
  }

  /**
   * Get available modules
   * @returns {Array} Module names
   */
  getAvailableModules() {
    return this.modules.map(m => m.name);
  }

  /**
   * Check if module exists
   * @param {string} moduleName - Module name
   * @returns {boolean}
   */
  hasModule(moduleName) {
    return this.modules.some(m => m.name === moduleName);
  }
}

// Export singleton instance
export const defenseEngine = new DefenseEngine();
