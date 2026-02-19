/**
 * ALL-STAR BOT v2.0 - Cooldown Middleware
 * Manages command cooldowns and rate limiting
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';

export class CooldownMiddleware {
  constructor() {
    this.logger = new Logger('COOLDOWN-MIDDLEWARE');
    this.globalCooldowns = new Map(); // Global rate limiting
    this.spamTracker = new Map(); // Spam detection
  }

  /**
   * Check if user is on cooldown for command
   * @param {string} sender - User JID
   * @param {string} command - Command name
   * @returns {Object} Cooldown check result
   */
  async checkCooldown(sender, command) {
    try {
      const senderNumber = sender.split('@')[0];

      // Author and Owner bypass cooldown
      if (db.isAuthorOrOwner(senderNumber)) {
        return {
          onCooldown: false,
          canExecute: true,
          remaining: 0
        };
      }

      // Check database cooldown
      const cooldownRemaining = db.isOnCooldown(senderNumber, command);

      if (cooldownRemaining) {
        const seconds = Math.ceil(cooldownRemaining / 1000);
        
        this.logger.debug(`Cooldown active for ${senderNumber}: ${command} (${seconds}s remaining)`);

        return {
          onCooldown: true,
          canExecute: false,
          remaining: cooldownRemaining,
          remainingSeconds: seconds,
          message: this.formatCooldownMessage(command, seconds)
        };
      }

      return {
        onCooldown: false,
        canExecute: true,
        remaining: 0
      };

    } catch (error) {
      this.logger.error('Error checking cooldown:', error);
      return {
        onCooldown: false,
        canExecute: true,
        remaining: 0
      };
    }
  }

  /**
   * Apply cooldown to user for command
   * @param {string} sender - User JID
   * @param {string} command - Command name
   * @param {number} duration - Cooldown duration in seconds (optional)
   */
  async applyCooldown(sender, command, duration = null) {
    try {
      const senderNumber = sender.split('@')[0];

      // Don't apply cooldown to author/owner
      if (db.isAuthorOrOwner(senderNumber)) {
        return;
      }

      // Get cooldown duration
      const cooldownTime = duration || this.getCooldownDuration(command);

      // Set cooldown in database
      await db.setCooldown(senderNumber, command, cooldownTime);

      this.logger.debug(`Cooldown applied: ${senderNumber} -> ${command} (${cooldownTime}s)`);

    } catch (error) {
      this.logger.error('Error applying cooldown:', error);
    }
  }

  /**
   * Get cooldown duration for specific command
   * @param {string} command - Command name
   * @returns {number} Duration in seconds
   */
  getCooldownDuration(command) {
    // Custom cooldowns for specific commands
    const customCooldowns = {
      'ai': 30,           // AI commands need longer cooldown
      'download-music': 60,
      'download-tiktok': 60,
      'share': 600,       // 10 minutes for broadcast
      'broadcast': 600,
      'game': 5,
      'joingame': 3,
      'quotes': 10,
      'sticker': 5,
      'brat': 5
    };

    // Return custom cooldown or default
    return customCooldowns[command] || config.get('security.cooldownCommand');
  }

  /**
   * Check global rate limit
   * @param {string} sender - User JID
   * @returns {Object} Rate limit check result
   */
  checkGlobalRateLimit(sender) {
    try {
      const senderNumber = sender.split('@')[0];

      // Bypass for author/owner
      if (db.isAuthorOrOwner(senderNumber)) {
        return {
          limited: false,
          canExecute: true
        };
      }

      const now = Date.now();
      const timeWindow = 60000; // 1 minute
      const maxRequests = 10;

      if (!this.globalCooldowns.has(senderNumber)) {
        this.globalCooldowns.set(senderNumber, []);
      }

      const requests = this.globalCooldowns.get(senderNumber);
      
      // Remove old requests outside time window
      const recentRequests = requests.filter(time => now - time < timeWindow);
      this.globalCooldowns.set(senderNumber, recentRequests);

      // Check if exceeded limit
      if (recentRequests.length >= maxRequests) {
        this.logger.warn(`Global rate limit exceeded: ${senderNumber}`);
        
        return {
          limited: true,
          canExecute: false,
          message: '⏳ *RATE LIMIT*\n\nAnda mengirim command terlalu cepat.\nTunggu 1 menit sebelum mencoba lagi.'
        };
      }

      // Add current request
      recentRequests.push(now);
      this.globalCooldowns.set(senderNumber, recentRequests);

      return {
        limited: false,
        canExecute: true
      };

    } catch (error) {
      this.logger.error('Error checking global rate limit:', error);
      return {
        limited: false,
        canExecute: true
      };
    }
  }

  /**
   * Check for spam behavior
   * @param {string} sender - User JID
   * @returns {Object} Spam check result
   */
  checkSpamBehavior(sender) {
    try {
      const senderNumber = sender.split('@')[0];

      // Bypass for author/owner
      if (db.isAuthorOrOwner(senderNumber)) {
        return {
          isSpam: false,
          shouldBlock: false
        };
      }

      const now = Date.now();
      const spamWindow = config.get('security.antiSpamTime') * 1000; // Convert to ms
      const spamThreshold = config.get('security.antiSpamThreshold');

      if (!this.spamTracker.has(senderNumber)) {
        this.spamTracker.set(senderNumber, []);
      }

      const messages = this.spamTracker.get(senderNumber);
      
      // Remove old messages outside spam window
      const recentMessages = messages.filter(time => now - time < spamWindow);
      this.spamTracker.set(senderNumber, recentMessages);

      // Check if exceeded spam threshold
      if (recentMessages.length >= spamThreshold) {
        this.logger.warn(`Spam detected: ${senderNumber} (${recentMessages.length} messages in ${spamWindow/1000}s)`);
        
        return {
          isSpam: true,
          shouldBlock: true,
          messageCount: recentMessages.length,
          timeWindow: spamWindow / 1000
        };
      }

      // Add current message
      recentMessages.push(now);
      this.spamTracker.set(senderNumber, recentMessages);

      return {
        isSpam: false,
        shouldBlock: false,
        messageCount: recentMessages.length
      };

    } catch (error) {
      this.logger.error('Error checking spam behavior:', error);
      return {
        isSpam: false,
        shouldBlock: false
      };
    }
  }

  /**
   * Reset cooldown for user
   * @param {string} sender - User JID
   * @param {string} command - Command name (optional, if null resets all)
   */
  async resetCooldown(sender, command = null) {
    try {
      const senderNumber = sender.split('@')[0];

      if (command) {
        await db.removeCooldown(senderNumber, command);
        this.logger.info(`Cooldown reset: ${senderNumber} -> ${command}`);
      } else {
        // Reset all cooldowns for user
        const cooldowns = db.get(`users.cooldowns.${senderNumber}`) || {};
        for (const cmd in cooldowns) {
          await db.removeCooldown(senderNumber, cmd);
        }
        this.logger.info(`All cooldowns reset: ${senderNumber}`);
      }

    } catch (error) {
      this.logger.error('Error resetting cooldown:', error);
    }
  }

  /**
   * Clear expired cooldowns (maintenance)
   */
  async clearExpiredCooldowns() {
    try {
      const cooldowns = db.get('users.cooldowns') || {};
      const now = Date.now();
      let clearedCount = 0;

      for (const [number, commands] of Object.entries(cooldowns)) {
        for (const [command, timestamp] of Object.entries(commands)) {
          if (timestamp < now) {
            await db.removeCooldown(number, command);
            clearedCount++;
          }
        }
      }

      if (clearedCount > 0) {
        this.logger.debug(`Cleared ${clearedCount} expired cooldowns`);
      }

    } catch (error) {
      this.logger.error('Error clearing expired cooldowns:', error);
    }
  }

  /**
   * Format cooldown message
   * @param {string} command - Command name
   * @param {number} seconds - Remaining seconds
   * @returns {string} Formatted message
   */
  formatCooldownMessage(command, seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    let timeStr = '';
    if (minutes > 0) {
      timeStr = `${minutes} menit ${remainingSeconds} detik`;
    } else {
      timeStr = `${seconds} detik`;
    }

    return `⏳ *COOLDOWN ACTIVE*

Command: ${config.get('bot.prefix')}${command}
Remaining: ${timeStr}

Tunggu sebentar sebelum menggunakan command ini lagi.`;
  }

  /**
   * Get cooldown statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      activeCooldowns: this.globalCooldowns.size,
      spamTrackers: this.spamTracker.size,
      totalTracked: this.globalCooldowns.size + this.spamTracker.size
    };
  }

  /**
   * Cleanup old tracking data
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Cleanup global cooldowns
    for (const [number, requests] of this.globalCooldowns.entries()) {
      const recent = requests.filter(time => now - time < maxAge);
      if (recent.length === 0) {
        this.globalCooldowns.delete(number);
      } else {
        this.globalCooldowns.set(number, recent);
      }
    }

    // Cleanup spam tracker
    for (const [number, messages] of this.spamTracker.entries()) {
      const recent = messages.filter(time => now - time < maxAge);
      if (recent.length === 0) {
        this.spamTracker.delete(number);
      } else {
        this.spamTracker.set(number, recent);
      }
    }

    this.logger.debug('Cooldown tracking data cleaned up');
  }
}

// Export singleton instance
export const cooldownMiddleware = new CooldownMiddleware();

// Periodic cleanup every 10 minutes
setInterval(() => {
  cooldownMiddleware.cleanup();
  cooldownMiddleware.clearExpiredCooldowns();
}, 600000);