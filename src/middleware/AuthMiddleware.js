/**
 * ALL-STAR BOT v2.0 - Authentication Middleware
 * Handles authentication and authorization for commands
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';

export class AuthMiddleware {
  constructor() {
    this.logger = new Logger('AUTH-MIDDLEWARE');
  }

  /**
   * Check if user has permission to execute command
   * @param {string} sender - User JID
   * @param {string} command - Command name
   * @param {string} requiredRole - Required role (author/owner/user)
   * @returns {Object} Authorization result
   */
  async checkAuth(sender, command, requiredRole = 'user') {
    try {
      const senderNumber = sender.split('@')[0];

      // Check if user is disabled
      if (db.isDisabled(senderNumber)) {
        return {
          authorized: false,
          reason: 'disabled',
          message: '❌ Anda telah kena disable oleh author.'
        };
      }

      // Check if user is blacklisted
      if (db.isBlacklisted(senderNumber)) {
        return {
          authorized: false,
          reason: 'blacklisted',
          message: '🚫 Anda ada di blacklist. Tidak bisa menggunakan bot.'
        };
      }

      // Check bot mode
      const botMode = db.getBotMode();
      if (botMode === 'SELF') {
        if (!db.isAuthor(senderNumber)) {
          return {
            authorized: false,
            reason: 'self_mode',
            message: `🤖 BOT STATUS\n\nMode   : SELF\nStatus : Active\n\nOnly the author can use bot commands.`
          };
        }
      }

      // Check role-based permissions
      const roleCheck = this.checkRole(senderNumber, requiredRole);
      if (!roleCheck.authorized) {
        return roleCheck;
      }

      // All checks passed
      return {
        authorized: true,
        role: roleCheck.role,
        senderNumber
      };

    } catch (error) {
      this.logger.error('Error in auth check:', error);
      return {
        authorized: false,
        reason: 'error',
        message: '❌ Terjadi error saat memeriksa permission.'
      };
    }
  }

  /**
   * Check user role
   * @param {string} number - Phone number
   * @param {string} requiredRole - Required role
   * @returns {Object} Role check result
   */
  checkRole(number, requiredRole) {
    const isAuthor = db.isAuthor(number);
    const isOwner = db.isOwner(number);

    let userRole = 'user';
    if (isAuthor) userRole = 'author';
    else if (isOwner) userRole = 'owner';

    // Role hierarchy: author > owner > user
    const roleHierarchy = {
      'author': 3,
      'owner': 2,
      'user': 1
    };

    const userLevel = roleHierarchy[userRole];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      let message = '';
      
      if (requiredRole === 'author') {
        message = '👑 Command ini hanya untuk Author.';
      } else if (requiredRole === 'owner') {
        message = '🔧 Command ini hanya untuk Owner dan Author.';
      }

      return {
        authorized: false,
        reason: 'insufficient_role',
        message,
        userRole,
        requiredRole
      };
    }

    return {
      authorized: true,
      role: userRole
    };
  }

  /**
   * Check if user can execute specific command
   * @param {string} sender - User JID
   * @param {string} command - Command name
   * @returns {Object} Command permission result
   */
  async checkCommandPermission(sender, command) {
    const commandPermissions = this.getCommandPermissions();
    const requiredRole = commandPermissions[command] || 'user';

    return await this.checkAuth(sender, command, requiredRole);
  }

  /**
   * Get command permissions mapping
   * @returns {Object} Command to role mapping
   */
  getCommandPermissions() {
    return {
      // Author only commands
      'botinfo': 'author',
      'addowner': 'author',
      'delowner': 'author',
      'addauthor': 'author',
      'self': 'author',
      'public': 'author',
      'disable': 'author',
      'undisable': 'author',
      'listdisable': 'author',
      'defense': 'author',
      'addshare': 'author',
      'share': 'author',
      'broadcast': 'author',
      'eval': 'author',
      'exec': 'author',
      'restart': 'author',
      'shutdown': 'author',
      'backup': 'author',
      'restore': 'author',

      // Owner commands
      'adddefense': 'owner',
      'removedefense': 'owner',
      'mute': 'owner',
      'unmute': 'owner',
      'warn': 'owner',
      'unwarn': 'owner',
      'resetwarn': 'owner',
      'kick': 'owner',
      'promote': 'owner',
      'demote': 'owner',
      'blacklist': 'owner',
      'unblacklist': 'owner',
      'on': 'owner',
      'off': 'owner',
      'sambut': 'owner',
      'ucapan': 'owner',
      'add-list-grup': 'owner',
      'info-grup': 'owner',
      'getlink': 'owner',
      'revoke': 'owner',
      'tagall': 'owner',
      'hidetag': 'owner',

      // General commands (all users)
      'menu': 'user',
      'start': 'user',
      'help': 'user',
      'ping': 'user',
      'intro': 'user',
      'ai': 'user',
      'quotes': 'user',
      'game': 'user',
      'joingame': 'user',
      'brat': 'user',
      'sticker': 'user',
      'toimg': 'user',
      'download-music': 'user',
      'download-tiktok': 'user'
    };
  }

  /**
   * Check if sender is author
   * @param {string} sender - User JID
   * @returns {boolean}
   */
  isAuthor(sender) {
    const number = sender.split('@')[0];
    return db.isAuthor(number);
  }

  /**
   * Check if sender is owner
   * @param {string} sender - User JID
   * @returns {boolean}
   */
  isOwner(sender) {
    const number = sender.split('@')[0];
    return db.isOwner(number);
  }

  /**
   * Check if sender is author or owner
   * @param {string} sender - User JID
   * @returns {boolean}
   */
  isAuthorOrOwner(sender) {
    const number = sender.split('@')[0];
    return db.isAuthorOrOwner(number);
  }

  /**
   * Check if bot is in self mode
   * @returns {boolean}
   */
  isSelfMode() {
    return db.getBotMode() === 'SELF';
  }

  /**
   * Check if user has access in self mode
   * @param {string} sender - User JID
   * @returns {boolean}
   */
  hasAccessInSelfMode(sender) {
    if (!this.isSelfMode()) return true;
    return this.isAuthor(sender);
  }

  /**
   * Get user role as string
   * @param {string} sender - User JID
   * @returns {string} Role name
   */
  getUserRole(sender) {
    const number = sender.split('@')[0];
    
    if (db.isAuthor(number)) return 'Author';
    if (db.isOwner(number)) return 'Owner';
    return 'Member';
  }

  /**
   * Format permission denied message
   * @param {string} command - Command name
   * @param {string} requiredRole - Required role
   * @param {string} userRole - User's current role
   * @returns {string} Formatted message
   */
  formatPermissionDeniedMessage(command, requiredRole, userRole) {
    const messages = {
      author: `👑 *PERMISSION DENIED*

Command: ${config.get('bot.prefix')}${command}
Required: Author
Your role: ${userRole}

This command is restricted to the bot author only.`,

      owner: `🔧 *PERMISSION DENIED*

Command: ${config.get('bot.prefix')}${command}
Required: Owner/Author
Your role: ${userRole}

This command requires Owner or Author permission.

Contact admin to get access.`,

      disabled: `❌ *ACCESS DENIED*

Your account has been disabled by the author.

Contact: @${config.get('bot.author.number')}`,

      blacklisted: `🚫 *BLACKLISTED*

Your number is blacklisted and cannot use this bot.

Contact admin for more information.`,

      self_mode: `🤖 *BOT STATUS*

Mode   : SELF
Status : Active

The bot is currently in SELF mode.
Only the author can execute commands.`
    };

    return messages[requiredRole] || messages.owner;
  }

  /**
   * Log authentication attempt
   * @param {string} sender - User JID
   * @param {string} command - Command name
   * @param {boolean} success - Auth success
   * @param {string} reason - Failure reason
   */
  logAuthAttempt(sender, command, success, reason = '') {
    const number = sender.split('@')[0];
    const status = success ? 'ALLOWED' : 'DENIED';
    const reasonStr = reason ? ` (${reason})` : '';

    this.logger.info(`Auth ${status}: ${number} -> ${command}${reasonStr}`);

    if (!success) {
      this.logger.security(
        'Auth Denied',
        number,
        `Command: ${command}, Reason: ${reason}`,
        'SYSTEM'
      );
    }
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();