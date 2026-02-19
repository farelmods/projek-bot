/**
 * ALL-STAR BOT v2.0 - Broadcast Service
 * Service for broadcasting messages to multiple groups
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { db } from '../database/Database.js';
import { config } from '../config/BotConfig.js';

export class BroadcastService {
  constructor() {
    this.logger = new Logger('BROADCAST-SERVICE');
    this.broadcasting = false;
    this.broadcastQueue = [];
    this.cooldownBetweenMessages = 10000; // 10 seconds between messages
  }

  /**
   * Broadcast message to share targets
   * @param {Object} bot - Bot instance
   * @param {string} message - Message to broadcast
   * @param {string} authorJid - Author JID
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcast(bot, message, authorJid) {
    try {
      if (this.broadcasting) {
        throw new Error('Broadcast already in progress');
      }

      this.broadcasting = true;
      this.logger.info('Starting broadcast...');

      const shareTargets = db.getShareTargets();

      if (shareTargets.length === 0) {
        throw new Error('No share targets configured');
      }

      const result = {
        total: shareTargets.length,
        success: 0,
        failed: 0,
        failedGroups: [],
        startTime: Date.now(),
        endTime: null
      };

      // Send to author first
      await bot.sendMessage(authorJid, {
        text: `📢 *BROADCAST STARTED*\n\nBroadcasting to ${shareTargets.length} groups...\n\nPlease wait.`
      });

      // Broadcast to each group
      for (const groupId of shareTargets) {
        try {
          const broadcastMessage = this.formatBroadcastMessage(message);

          await bot.sendMessage(groupId, {
            text: broadcastMessage
          });

          result.success++;
          this.logger.info(`Broadcast sent to: ${groupId}`);

          // Cooldown between messages
          await this.sleep(this.cooldownBetweenMessages);

        } catch (error) {
          result.failed++;
          result.failedGroups.push(groupId);
          this.logger.error(`Failed to broadcast to ${groupId}:`, error);
        }
      }

      result.endTime = Date.now();
      this.broadcasting = false;

      // Send result report to author
      await this.sendReport(bot, authorJid, result);

      this.logger.info(`Broadcast completed: ${result.success}/${result.total} successful`);

      return result;

    } catch (error) {
      this.broadcasting = false;
      this.logger.error('Broadcast error:', error);
      throw error;
    }
  }

  /**
   * Format broadcast message
   * @param {string} message - Original message
   * @returns {string} Formatted message
   */
  formatBroadcastMessage(message) {
    return `📢 *BROADCAST MESSAGE*

${message}

━━━━━━━━━━━━━━━━━━━━
From: ${config.get('bot.author.name')}
Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;
  }

  /**
   * Send broadcast report
   * @param {Object} bot - Bot instance
   * @param {string} authorJid - Author JID
   * @param {Object} result - Broadcast result
   */
  async sendReport(bot, authorJid, result) {
    const duration = Math.floor((result.endTime - result.startTime) / 1000);
    const successRate = ((result.success / result.total) * 100).toFixed(1);

    let report = `📊 *BROADCAST REPORT*

Status        : ${result.failed === 0 ? '✅ SUCCESS' : '⚠️ PARTIAL'}
Total Groups  : ${result.total}
Success       : ${result.success} (${successRate}%)
Failed        : ${result.failed}
Duration      : ${duration} seconds
Time          : ${new Date(result.endTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;

    if (result.failedGroups.length > 0) {
      report += `\n\n*Failed Groups:*\n`;
      result.failedGroups.forEach((groupId, index) => {
        report += `${index + 1}. ${groupId.substring(0, 20)}...\n`;
      });
    }

    await bot.sendMessage(authorJid, { text: report });
  }

  /**
   * Broadcast to specific groups
   * @param {Object} bot - Bot instance
   * @param {string} message - Message to broadcast
   * @param {Array} groupIds - Target group IDs
   * @param {string} authorJid - Author JID
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastToGroups(bot, message, groupIds, authorJid) {
    try {
      if (this.broadcasting) {
        throw new Error('Broadcast already in progress');
      }

      this.broadcasting = true;

      const result = {
        total: groupIds.length,
        success: 0,
        failed: 0,
        failedGroups: [],
        startTime: Date.now(),
        endTime: null
      };

      for (const groupId of groupIds) {
        try {
          await bot.sendMessage(groupId, {
            text: this.formatBroadcastMessage(message)
          });

          result.success++;
          await this.sleep(this.cooldownBetweenMessages);

        } catch (error) {
          result.failed++;
          result.failedGroups.push(groupId);
          this.logger.error(`Failed to broadcast to ${groupId}:`, error);
        }
      }

      result.endTime = Date.now();
      this.broadcasting = false;

      await this.sendReport(bot, authorJid, result);

      return result;

    } catch (error) {
      this.broadcasting = false;
      throw error;
    }
  }

  /**
   * Send announcement to all protected groups
   * @param {Object} bot - Bot instance
   * @param {string} announcement - Announcement message
   * @param {string} authorJid - Author JID
   * @returns {Promise<Object>} Broadcast result
   */
  async announceToProtectedGroups(bot, announcement, authorJid) {
    try {
      const protectedGroups = db.getProtectedGroups();

      const message = `📢 *SYSTEM ANNOUNCEMENT*

${announcement}

━━━━━━━━━━━━━━━━━━━━
This is an important announcement from the bot administrator.`;

      return await this.broadcastToGroups(bot, message, protectedGroups, authorJid);

    } catch (error) {
      this.logger.error('Announcement error:', error);
      throw error;
    }
  }

  /**
   * Schedule broadcast (placeholder for future implementation)
   * @param {Object} options - Schedule options
   */
  async scheduleBroadcast(options) {
    // TODO: Implement scheduled broadcasts
    this.logger.info('Scheduled broadcast requested:', options);
    throw new Error('Scheduled broadcasts not yet implemented');
  }

  /**
   * Check if currently broadcasting
   * @returns {boolean}
   */
  isBroadcasting() {
    return this.broadcasting;
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set cooldown between messages
   * @param {number} ms - Cooldown in milliseconds
   */
  setCooldown(ms) {
    this.cooldownBetweenMessages = ms;
    this.logger.info(`Broadcast cooldown set to ${ms}ms`);
  }

  /**
   * Get broadcast statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      isBroadcasting: this.broadcasting,
      cooldown: this.cooldownBetweenMessages,
      queueLength: this.broadcastQueue.length
    };
  }
}

// Export singleton instance
export const broadcastService = new BroadcastService();
