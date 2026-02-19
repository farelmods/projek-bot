/**
 * ALL-STAR BOT v2.0 - Anti-Virtex Module
 * Detects and blocks crash messages and virtex
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';

export class AntiVirtex {
  constructor() {
    this.logger = new Logger('ANTI-VIRTEX');
    
    // Detection settings
    this.settings = {
      maxLength: config.get('security.maxMessageLength') || 250,
      repeatedCharThreshold: 50,
      emojiThreshold: 30,
      invisibleCharThreshold: 20
    };

    // Known virtex patterns
    this.virtexPatterns = [
      // Repeated unicode characters
      /[\u0300-\u036f\u0483-\u0489]{10,}/g,
      // Invisible characters
      /[\u200b-\u200f\u202a-\u202e\u2060-\u2069]{5,}/g,
      // Excessive emojis
      /([\u{1F600}-\u{1F64F}]){20,}/gu,
      // Zero-width characters
      /[\u200B\u200C\u200D\uFEFF]{5,}/g
    ];
  }

  /**
   * Detect virtex in message
   * @param {string} message - Message content
   * @returns {Object} Detection result
   */
  detect(message) {
    try {
      if (!message || typeof message !== 'string') {
        return {
          detected: false,
          type: 'none'
        };
      }

      // Check message length
      const lengthCheck = this.checkLength(message);
      if (lengthCheck.detected) {
        return lengthCheck;
      }

      // Check repeated characters
      const repeatedCheck = this.checkRepeatedCharacters(message);
      if (repeatedCheck.detected) {
        return repeatedCheck;
      }

      // Check emoji flooding
      const emojiCheck = this.checkEmojiFlood(message);
      if (emojiCheck.detected) {
        return emojiCheck;
      }

      // Check invisible characters
      const invisibleCheck = this.checkInvisibleCharacters(message);
      if (invisibleCheck.detected) {
        return invisibleCheck;
      }

      // Check known virtex patterns
      const patternCheck = this.checkVirtexPatterns(message);
      if (patternCheck.detected) {
        return patternCheck;
      }

      return {
        detected: false,
        type: 'none'
      };

    } catch (error) {
      this.logger.error('Error detecting virtex:', error);
      return {
        detected: false,
        type: 'none'
      };
    }
  }

  /**
   * Check message length
   * @param {string} message - Message content
   * @returns {Object} Check result
   */
  checkLength(message) {
    const length = message.length;
    
    if (length > this.settings.maxLength) {
      this.logger.warn(`Long message detected: ${length} characters`);
      
      return {
        detected: true,
        type: 'excessive_length',
        length,
        maxLength: this.settings.maxLength,
        severity: this.calculateLengthSeverity(length)
      };
    }

    return { detected: false };
  }

  /**
   * Calculate severity based on length
   * @param {number} length - Message length
   * @returns {string} Severity level
   */
  calculateLengthSeverity(length) {
    if (length > 1000) return 'critical';
    if (length > 500) return 'high';
    if (length > 250) return 'medium';
    return 'low';
  }

  /**
   * Check for repeated characters
   * @param {string} message - Message content
   * @returns {Object} Check result
   */
  checkRepeatedCharacters(message) {
    // Find sequences of repeated characters
    const repeatedPattern = /(.)\1{9,}/g;
    const matches = message.match(repeatedPattern);

    if (matches && matches.length > 0) {
      const longestRepeat = Math.max(...matches.map(m => m.length));

      if (longestRepeat >= this.settings.repeatedCharThreshold) {
        this.logger.warn(`Repeated characters detected: ${longestRepeat} times`);

        return {
          detected: true,
          type: 'repeated_characters',
          character: matches[0].charAt(0),
          count: longestRepeat,
          severity: 'high'
        };
      }
    }

    return { detected: false };
  }

  /**
   * Check for emoji flooding
   * @param {string} message - Message content
   * @returns {Object} Check result
   */
  checkEmojiFlood(message) {
    // Count emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = message.match(emojiRegex);
    const emojiCount = emojis ? emojis.length : 0;

    if (emojiCount >= this.settings.emojiThreshold) {
      this.logger.warn(`Emoji flood detected: ${emojiCount} emojis`);

      return {
        detected: true,
        type: 'emoji_flood',
        count: emojiCount,
        severity: 'medium'
      };
    }

    return { detected: false };
  }

  /**
   * Check for invisible characters
   * @param {string} message - Message content
   * @returns {Object} Check result
   */
  checkInvisibleCharacters(message) {
    // Detect zero-width and invisible characters
    const invisibleChars = [
      '\u200B', // Zero Width Space
      '\u200C', // Zero Width Non-Joiner
      '\u200D', // Zero Width Joiner
      '\uFEFF', // Zero Width No-Break Space
      '\u2060', // Word Joiner
      '\u180E'  // Mongolian Vowel Separator
    ];

    let invisibleCount = 0;
    for (const char of invisibleChars) {
      const regex = new RegExp(char, 'g');
      const matches = message.match(regex);
      if (matches) {
        invisibleCount += matches.length;
      }
    }

    if (invisibleCount >= this.settings.invisibleCharThreshold) {
      this.logger.warn(`Invisible characters detected: ${invisibleCount} chars`);

      return {
        detected: true,
        type: 'invisible_characters',
        count: invisibleCount,
        severity: 'high'
      };
    }

    return { detected: false };
  }

  /**
   * Check against known virtex patterns
   * @param {string} message - Message content
   * @returns {Object} Check result
   */
  checkVirtexPatterns(message) {
    for (const pattern of this.virtexPatterns) {
      if (pattern.test(message)) {
        this.logger.warn(`Known virtex pattern detected`);

        return {
          detected: true,
          type: 'virtex_pattern',
          severity: 'critical'
        };
      }
    }

    return { detected: false };
  }

  /**
   * Handle virtex violation
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @param {string} sender - Sender JID
   * @param {Object} messageKey - Message key
   * @param {Object} virtexInfo - Virtex detection info
   */
  async handle(bot, groupId, sender, messageKey, virtexInfo) {
    try {
      const senderNumber = sender.split('@')[0];
      const groupSettings = db.getGroupSettings(groupId);
      const defenseMode = groupSettings.defenseMode || db.getDefenseMode();

      // Delete message immediately
      await bot.deleteMessage(groupId, messageKey);
      this.logger.info(`Deleted virtex message from ${senderNumber}`);

      // Get action based on severity and defense mode
      const action = this.determineAction(virtexInfo.severity, defenseMode);

      // Format virtex type for message
      const virtexTypeText = this.formatVirtexType(virtexInfo.type);

      if (action === 'warn') {
        // Add warning
        const warnCount = await db.addWarn(senderNumber);
        const maxWarn = 3;

        let message = `⚠️ *ANTI-VIRTEX VIOLATION*\n\n`;
        message += `User: @${senderNumber}\n`;
        message += `Type: ${virtexTypeText}\n`;
        message += `Warning: ${warnCount}/${maxWarn}\n\n`;

        if (warnCount >= maxWarn) {
          message += `Maximum warnings reached. User will be kicked.`;
          
          await bot.kickParticipant(groupId, [sender]);
          await db.resetWarn(senderNumber);
          
          this.logger.security('Kick', senderNumber, 'Max warnings (virtex)', 'SYSTEM');
        } else {
          message += `Please avoid sending long or spam messages.\n`;
          message += `Remaining warnings: ${maxWarn - warnCount}`;
        }

        await bot.sendMessage(groupId, {
          text: message,
          mentions: [sender]
        });

      } else if (action === 'kick') {
        // Kick immediately (critical virtex)
        await bot.kickParticipant(groupId, [sender]);

        let message = `🚫 *USER KICKED*\n\n`;
        message += `User: @${senderNumber}\n`;
        message += `Reason: ${virtexTypeText}\n\n`;
        message += `Virtex and crash messages are strictly prohibited.`;

        await bot.sendMessage(groupId, {
          text: message,
          mentions: [sender]
        });

        this.logger.security('Kick', senderNumber, `Virtex: ${virtexInfo.type}`, 'SYSTEM');
      }

      // Log to statistics
      await db.incrementViolation('antiVirtex');

    } catch (error) {
      this.logger.error('Error handling virtex violation:', error);
    }
  }

  /**
   * Format virtex type for display
   * @param {string} type - Virtex type
   * @returns {string} Formatted type
   */
  formatVirtexType(type) {
    const types = {
      'excessive_length': 'Message Too Long',
      'repeated_characters': 'Repeated Characters',
      'emoji_flood': 'Emoji Flooding',
      'invisible_characters': 'Invisible Characters',
      'virtex_pattern': 'Virtex Pattern',
      'none': 'Unknown'
    };

    return types[type] || 'Virtex Detected';
  }

  /**
   * Determine action based on severity and defense mode
   * @param {string} severity - Severity level
   * @param {string} defenseMode - Defense mode
   * @returns {string} Action to take
   */
  determineAction(severity, defenseMode) {
    if (severity === 'critical') {
      return 'kick'; // Always kick for critical
    }

    const actionMatrix = {
      'NORMAL': {
        'low': 'warn',
        'medium': 'warn',
        'high': 'warn'
      },
      'STRICT': {
        'low': 'warn',
        'medium': 'warn',
        'high': 'kick'
      },
      'LOCKDOWN': {
        'low': 'warn',
        'medium': 'kick',
        'high': 'kick'
      }
    };

    return actionMatrix[defenseMode]?.[severity] || 'warn';
  }

  /**
   * Check if group has anti-virtex enabled
   * @param {string} groupId - Group JID
   * @returns {boolean}
   */
  isEnabled(groupId) {
    const settings = db.getGroupSettings(groupId);
    return settings.antiVirtex !== false;
  }

  /**
   * Enable anti-virtex for group
   * @param {string} groupId - Group JID
   */
  async enable(groupId) {
    await db.updateGroupSetting(groupId, 'antiVirtex', true);
    this.logger.info(`Anti-virtex enabled for group: ${groupId}`);
  }

  /**
   * Disable anti-virtex for group
   * @param {string} groupId - Group JID
   */
  async disable(groupId) {
    await db.updateGroupSetting(groupId, 'antiVirtex', false);
    this.logger.info(`Anti-virtex disabled for group: ${groupId}`);
  }

  /**
   * Update detection settings
   * @param {Object} newSettings - New settings
   */
  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    this.logger.info('Anti-virtex settings updated:', newSettings);
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      maxLength: this.settings.maxLength,
      patterns: this.virtexPatterns.length
    };
  }
}

// Export singleton instance
export const antiVirtex = new AntiVirtex();
