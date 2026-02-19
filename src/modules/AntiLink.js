/**
 * ALL-STAR BOT v2.0 - Anti-Link Module
 * Detects and removes links from messages
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { db } from '../database/Database.js';

export class AntiLink {
  constructor() {
    this.logger = new Logger('ANTI-LINK');
    
    // URL detection patterns
    this.patterns = [
      // Standard URLs
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
      
      // URLs without protocol
      /www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
      
      // Shortened URLs
      /(bit\.ly|tinyurl\.com|goo\.gl|ow\.ly|t\.co|short\.link)\/\S+/gi,
      
      // WhatsApp group links
      /chat\.whatsapp\.com\/[a-zA-Z0-9]+/gi,
      
      // Telegram links
      /t\.me\/[a-zA-Z0-9_]+/gi,
      
      // Discord invites
      /discord\.(gg|com\/invite)\/[a-zA-Z0-9]+/gi,
      
      // Social media handles that look like links
      /(instagram\.com|facebook\.com|twitter\.com|tiktok\.com|youtube\.com)\/\S+/gi,
      
      // Domain patterns without protocol
      /[a-zA-Z0-9-]+\.(com|net|org|id|co\.id|xyz|me|info|biz|io|dev|app)\b/gi
    ];

    // Whitelist domains (tidak akan di-detect sebagai violation)
    this.whitelist = [
      'docs.google.com',
      'drive.google.com',
      'github.com',
      'stackoverflow.com'
    ];
  }

  /**
   * Detect links in message
   * @param {string} message - Message text
   * @returns {Object} Detection result
   */
  detect(message) {
    try {
      if (!message || typeof message !== 'string') {
        return {
          detected: false,
          links: []
        };
      }

      const foundLinks = [];
      const lowerMessage = message.toLowerCase();

      // Check each pattern
      for (const pattern of this.patterns) {
        const matches = message.match(pattern);
        if (matches) {
          matches.forEach(link => {
            // Check if link is whitelisted
            const isWhitelisted = this.whitelist.some(domain => 
              link.toLowerCase().includes(domain)
            );

            if (!isWhitelisted && !foundLinks.includes(link)) {
              foundLinks.push(link);
            }
          });
        }
      }

      const detected = foundLinks.length > 0;

      if (detected) {
        this.logger.warn(`Links detected: ${foundLinks.join(', ')}`);
      }

      return {
        detected,
        links: foundLinks,
        count: foundLinks.length
      };

    } catch (error) {
      this.logger.error('Error detecting links:', error);
      return {
        detected: false,
        links: []
      };
    }
  }

  /**
   * Handle link violation
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @param {string} sender - Sender JID
   * @param {Object} messageKey - Message key
   * @param {Array} links - Detected links
   */
  async handle(bot, groupId, sender, messageKey, links) {
    try {
      const senderNumber = sender.split('@')[0];
      const groupSettings = db.getGroupSettings(groupId);
      const defenseMode = groupSettings.defenseMode || db.getDefenseMode();

      // Get defense mode action
      const modeConfig = this.getDefenseModeConfig(defenseMode);

      // Delete message
      await bot.deleteMessage(groupId, messageKey);
      this.logger.info(`Deleted message with link from ${senderNumber}`);

      // Apply action based on defense mode
      if (modeConfig.action === 'warn') {
        // Add warning
        const warnCount = await db.addWarn(senderNumber);
        const maxWarn = 3;

        // Send warning message
        let warningMessage = `⚠️ *ANTI-LINK VIOLATION*\n\n`;
        warningMessage += `User: @${senderNumber}\n`;
        warningMessage += `Reason: Link detected\n`;
        warningMessage += `Warning: ${warnCount}/${maxWarn}\n\n`;

        if (warnCount >= maxWarn) {
          warningMessage += `Maximum warnings reached. User will be kicked.`;
          
          // Kick user
          await bot.kickParticipant(groupId, [sender]);
          await db.resetWarn(senderNumber);
          
          this.logger.security('Kick', senderNumber, 'Max warnings (anti-link)', 'SYSTEM');
        } else {
          warningMessage += `Links are not allowed in this group.\n`;
          warningMessage += `Next violation: ${maxWarn - warnCount} warnings remaining`;
        }

        await bot.sendMessage(groupId, {
          text: warningMessage,
          mentions: [sender]
        });

      } else if (modeConfig.action === 'mute') {
        // Mute user
        await db.addMute(senderNumber, 10, 'Anti-link violation');

        const muteMessage = `🔇 *USER MUTED*\n\n`;
        muteMessage += `User: @${senderNumber}\n`;
        muteMessage += `Duration: 10 minutes\n`;
        muteMessage += `Reason: Link detected\n\n`;
        muteMessage += `Links are not allowed in this group.`;

        await bot.sendMessage(groupId, {
          text: muteMessage,
          mentions: [sender]
        });

        this.logger.security('Mute', senderNumber, 'Anti-link violation', 'SYSTEM');

      } else if (modeConfig.action === 'kick') {
        // Kick immediately
        await bot.kickParticipant(groupId, [sender]);

        const kickMessage = `🚫 *USER KICKED*\n\n`;
        kickMessage += `User: @${senderNumber}\n`;
        kickMessage += `Reason: Link detected\n\n`;
        kickMessage += `Links are strictly prohibited in this group.`;

        await bot.sendMessage(groupId, {
          text: kickMessage,
          mentions: [sender]
        });

        this.logger.security('Kick', senderNumber, 'Anti-link violation', 'SYSTEM');
      }

      // Log to statistics
      await db.incrementViolation('antiLink');

    } catch (error) {
      this.logger.error('Error handling link violation:', error);
    }
  }

  /**
   * Get defense mode configuration
   * @param {string} mode - Defense mode (NORMAL, STRICT, LOCKDOWN)
   * @returns {Object} Configuration
   */
  getDefenseModeConfig(mode) {
    const configs = {
      'NORMAL': {
        action: 'warn',
        severity: 'low'
      },
      'STRICT': {
        action: 'mute',
        severity: 'medium'
      },
      'LOCKDOWN': {
        action: 'kick',
        severity: 'high'
      }
    };

    return configs[mode] || configs['NORMAL'];
  }

  /**
   * Check if group has anti-link enabled
   * @param {string} groupId - Group JID
   * @returns {boolean}
   */
  isEnabled(groupId) {
    const settings = db.getGroupSettings(groupId);
    return settings.antiLink !== false;
  }

  /**
   * Enable anti-link for group
   * @param {string} groupId - Group JID
   */
  async enable(groupId) {
    await db.updateGroupSetting(groupId, 'antiLink', true);
    this.logger.info(`Anti-link enabled for group: ${groupId}`);
  }

  /**
   * Disable anti-link for group
   * @param {string} groupId - Group JID
   */
  async disable(groupId) {
    await db.updateGroupSetting(groupId, 'antiLink', false);
    this.logger.info(`Anti-link disabled for group: ${groupId}`);
  }

  /**
   * Add domain to whitelist
   * @param {string} domain - Domain to whitelist
   */
  addToWhitelist(domain) {
    if (!this.whitelist.includes(domain)) {
      this.whitelist.push(domain);
      this.logger.info(`Domain added to whitelist: ${domain}`);
    }
  }

  /**
   * Remove domain from whitelist
   * @param {string} domain - Domain to remove
   */
  removeFromWhitelist(domain) {
    const index = this.whitelist.indexOf(domain);
    if (index > -1) {
      this.whitelist.splice(index, 1);
      this.logger.info(`Domain removed from whitelist: ${domain}`);
    }
  }

  /**
   * Get whitelist domains
   * @returns {Array} Whitelist domains
   */
  getWhitelist() {
    return [...this.whitelist];
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL string
   * @returns {string} Domain
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'http://' + url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if URL is safe
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isSafeURL(url) {
    const domain = this.extractDomain(url);
    return this.whitelist.some(whitelisted => domain.includes(whitelisted));
  }
}

// Export singleton instance
export const antiLink = new AntiLink();