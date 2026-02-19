/**
 * ALL-STAR BOT v2.0 - Anti-Spam Module
 * Detects and prevents message spam
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';

export class AntiSpam {
  constructor() {
    this.logger = new Logger('ANTI-SPAM');
    
    // Track user messages
    this.messageTracker = new Map();
    // Format: { userId: [{ timestamp, content }] }
    
    // Spam detection settings
    this.settings = {
      timeWindow: config.get('security.antiSpamTime') * 1000, // Convert to ms
      messageThreshold: config.get('security.antiSpamThreshold'),
      duplicateThreshold: 3, // Same message repeated
      characterFloodThreshold: 10 // Same character repeated
    };
  }

  /**
   * Detect spam in user messages
   * @param {string} sender - Sender JID
   * @param {string} messageContent - Message content
   * @param {number} timestamp - Message timestamp
   * @returns {Object} Detection result
   */
  detect(sender, messageContent, timestamp = Date.now()) {
    try {
      const senderNumber = sender.split('@')[0];

      // Initialize tracker for user if not exists
      if (!this.messageTracker.has(senderNumber)) {
        this.messageTracker.set(senderNumber, []);
      }

      const userMessages = this.messageTracker.get(senderNumber);

      // Clean old messages outside time window
      const recentMessages = userMessages.filter(
        msg => timestamp - msg.timestamp < this.settings.timeWindow
      );

      // Add current message
      recentMessages.push({ timestamp, content: messageContent });
      this.messageTracker.set(senderNumber, recentMessages);

      // Check different spam patterns
      const rapidFire = this.detectRapidFire(recentMessages);
      const duplicate = this.detectDuplicate(recentMessages);
      const characterFlood = this.detectCharacterFlood(messageContent);

      const isSpam = rapidFire.detected || duplicate.detected || characterFlood.detected;

      if (isSpam) {
        this.logger.warn(`Spam detected from ${senderNumber}: ${this.getSpamType(rapidFire, duplicate, characterFlood)}`);
      }

      return {
        detected: isSpam,
        type: this.getSpamType(rapidFire, duplicate, characterFlood),
        details: {
          rapidFire,
          duplicate,
          characterFlood
        },
        messageCount: recentMessages.length,
        timeWindow: this.settings.timeWindow / 1000
      };

    } catch (error) {
      this.logger.error('Error detecting spam:', error);
      return {
        detected: false,
        type: 'none'
      };
    }
  }

  /**
   * Detect rapid-fire messages
   * @param {Array} messages - User messages
   * @returns {Object} Detection result
   */
  detectRapidFire(messages) {
    const count = messages.length;
    const detected = count >= this.settings.messageThreshold;

    return {
      detected,
      messageCount: count,
      threshold: this.settings.messageThreshold
    };
  }

  /**
   * Detect duplicate messages
   * @param {Array} messages - User messages
   * @returns {Object} Detection result
   */
  detectDuplicate(messages) {
    if (messages.length < 2) {
      return { detected: false };
    }

    // Group messages by content
    const contentCounts = {};
    messages.forEach(msg => {
      const content = msg.content.toLowerCase().trim();
      contentCounts[content] = (contentCounts[content] || 0) + 1;
    });

    // Find max duplicate count
    const maxDuplicates = Math.max(...Object.values(contentCounts));
    const detected = maxDuplicates >= this.settings.duplicateThreshold;

    return {
      detected,
      duplicateCount: maxDuplicates,
      threshold: this.settings.duplicateThreshold
    };
  }

  /**
   * Detect character flooding
   * @param {string} message - Message content
   * @returns {Object} Detection result
   */
  detectCharacterFlood(message) {
    if (!message) {
      return { detected: false };
    }

    // Check for repeated characters (e.g., "aaaaaaa", "!!!!!!")
    const repeatedPattern = /(.)\1{9,}/g;
    const matches = message.match(repeatedPattern);

    if (matches) {
      return {
        detected: true,
        pattern: matches[0].charAt(0),
        count: matches[0].length
      };
    }

    return { detected: false };
  }

  /**
   * Get spam type from detection results
   * @param {Object} rapidFire - Rapid fire detection
   * @param {Object} duplicate - Duplicate detection
   * @param {Object} characterFlood - Character flood detection
   * @returns {string} Spam type
   */
  getSpamType(rapidFire, duplicate, characterFlood) {
    if (rapidFire.detected) return 'rapid_fire';
    if (duplicate.detected) return 'duplicate';
    if (characterFlood.detected) return 'character_flood';
    return 'none';
  }

  /**
   * Handle spam violation
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @param {string} sender - Sender JID
   * @param {Object} spamInfo - Spam detection info
   */
  async handle(bot, groupId, sender, spamInfo) {
    try {
      const senderNumber = sender.split('@')[0];
      const groupSettings = db.getGroupSettings(groupId);
      const defenseMode = groupSettings.defenseMode || db.getDefenseMode();

      // Get defense mode configuration
      const modeConfig = this.getDefenseModeConfig(defenseMode);

      // Mute user
      const muteDuration = modeConfig.muteDuration || 10;
      await db.addMute(senderNumber, muteDuration, `Anti-spam: ${spamInfo.type}`);

      // Format spam type for message
      const spamTypeText = this.formatSpamType(spamInfo.type);

      // Send notification
      let message = `🔇 *ANTI-SPAM VIOLATION*\n\n`;
      message += `User: @${senderNumber}\n`;
      message += `Type: ${spamTypeText}\n`;
      message += `Duration: ${muteDuration} minutes\n\n`;
      message += `Please avoid spamming messages.`;

      await bot.sendMessage(groupId, {
        text: message,
        mentions: [sender]
      });

      // Log action
      this.logger.security(
        'Mute',
        senderNumber,
        `Anti-spam violation: ${spamInfo.type}`,
        'SYSTEM'
      );

      // Clear user's message tracker
      this.messageTracker.delete(senderNumber);

      // Log to statistics
      await db.incrementViolation('antiSpam');

    } catch (error) {
      this.logger.error('Error handling spam violation:', error);
    }
  }

  /**
   * Format spam type for display
   * @param {string} type - Spam type
   * @returns {string} Formatted type
   */
  formatSpamType(type) {
    const types = {
      'rapid_fire': 'Rapid Fire Messages',
      'duplicate': 'Duplicate Messages',
      'character_flood': 'Character Flooding',
      'none': 'Unknown'
    };

    return types[type] || 'Spam';
  }

  /**
   * Get defense mode configuration
   * @param {string} mode - Defense mode
   * @returns {Object} Configuration
   */
  getDefenseModeConfig(mode) {
    const configs = {
      'NORMAL': {
        muteDuration: 10,
        autoDelete: false
      },
      'STRICT': {
        muteDuration: 30,
        autoDelete: true
      },
      'LOCKDOWN': {
        muteDuration: 60,
        autoDelete: true
      }
    };

    return configs[mode] || configs['NORMAL'];
  }

  /**
   * Check if group has anti-spam enabled
   * @param {string} groupId - Group JID
   * @returns {boolean}
   */
  isEnabled(groupId) {
    const settings = db.getGroupSettings(groupId);
    return settings.antiSpam !== false;
  }

  /**
   * Enable anti-spam for group
   * @param {string} groupId - Group JID
   */
  async enable(groupId) {
    await db.updateGroupSetting(groupId, 'antiSpam', true);
    this.logger.info(`Anti-spam enabled for group: ${groupId}`);
  }

  /**
   * Disable anti-spam for group
   * @param {string} groupId - Group JID
   */
  async disable(groupId) {
    await db.updateGroupSetting(groupId, 'antiSpam', false);
    this.logger.info(`Anti-spam disabled for group: ${groupId}`);
  }

  /**
   * Clear user's message history
   * @param {string} sender - Sender JID
   */
  clearUserHistory(sender) {
    const senderNumber = sender.split('@')[0];
    this.messageTracker.delete(senderNumber);
    this.logger.debug(`Cleared message history for ${senderNumber}`);
  }

  /**
   * Get user's message statistics
   * @param {string} sender - Sender JID
   * @returns {Object} Statistics
   */
  getUserStats(sender) {
    const senderNumber = sender.split('@')[0];
    const messages = this.messageTracker.get(senderNumber) || [];

    return {
      messageCount: messages.length,
      timeWindow: this.settings.timeWindow / 1000,
      threshold: this.settings.messageThreshold,
      isTracked: messages.length > 0
    };
  }

  /**
   * Cleanup old tracking data
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [number, messages] of this.messageTracker.entries()) {
      const recentMessages = messages.filter(
        msg => now - msg.timestamp < this.settings.timeWindow * 2
      );

      if (recentMessages.length === 0) {
        this.messageTracker.delete(number);
        cleanedCount++;
      } else {
        this.messageTracker.set(number, recentMessages);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} user message trackers`);
    }
  }

  /**
   * Get tracking statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      trackedUsers: this.messageTracker.size,
      totalMessages: Array.from(this.messageTracker.values())
        .reduce((sum, msgs) => sum + msgs.length, 0),
      settings: this.settings
    };
  }

  /**
   * Update spam detection settings
   * @param {Object} newSettings - New settings
   */
  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    this.logger.info('Anti-spam settings updated:', newSettings);
  }
}

// Export singleton instance
export const antiSpam = new AntiSpam();

// Periodic cleanup every 5 minutes
setInterval(() => {
  antiSpam.cleanup();
}, 300000);