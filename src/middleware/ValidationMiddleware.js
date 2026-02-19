/**
 * ALL-STAR BOT v2.0 - Validation Middleware
 * Validates command inputs and arguments
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';

export class ValidationMiddleware {
  constructor() {
    this.logger = new Logger('VALIDATION-MIDDLEWARE');
  }

  /**
   * Validate command arguments
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   * @param {Object} messageInfo - Message information
   * @returns {Object} Validation result
   */
  validateCommand(command, args, messageInfo) {
    try {
      const requirements = this.getCommandRequirements(command);
      
      if (!requirements) {
        // No specific requirements for this command
        return {
          valid: true
        };
      }

      const errors = [];

      // Check minimum arguments
      if (requirements.minArgs && args.length < requirements.minArgs) {
        errors.push(`Command memerlukan minimal ${requirements.minArgs} argument.`);
      }

      // Check maximum arguments
      if (requirements.maxArgs && args.length > requirements.maxArgs) {
        errors.push(`Command menerima maksimal ${requirements.maxArgs} argument.`);
      }

      // Check if requires group
      if (requirements.groupOnly && !messageInfo.isGroup) {
        errors.push('Command ini hanya bisa digunakan di grup.');
      }

      // Check if requires quoted message
      if (requirements.requiresQuoted && !messageInfo.quoted) {
        errors.push('Command ini memerlukan reply pesan.');
      }

      // Custom validation
      if (requirements.validate) {
        const customValidation = requirements.validate(args, messageInfo);
        if (!customValidation.valid) {
          errors.push(...customValidation.errors);
        }
      }

      if (errors.length > 0) {
        return {
          valid: false,
          errors,
          usage: requirements.usage,
          message: this.formatValidationError(command, errors, requirements.usage)
        };
      }

      return {
        valid: true
      };

    } catch (error) {
      this.logger.error('Error validating command:', error);
      return {
        valid: false,
        errors: ['Terjadi error saat validasi command.']
      };
    }
  }

  /**
   * Get command requirements
   * @param {string} command - Command name
   * @returns {Object|null} Requirements object
   */
  getCommandRequirements(command) {
    const requirements = {
      // Author Commands
      'addowner': {
        minArgs: 0,
        groupOnly: false,
        requiresQuoted: false,
        usage: `${config.get('bot.prefix')}addowner @user atau reply pesan user`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin dijadikan owner.']
            };
          }
          return { valid: true };
        }
      },

      'delowner': {
        minArgs: 0,
        requiresQuoted: false,
        usage: `${config.get('bot.prefix')}delowner @user atau reply pesan user`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin dihapus dari owner.']
            };
          }
          return { valid: true };
        }
      },

      'disable': {
        minArgs: 0,
        usage: `${config.get('bot.prefix')}disable @user atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-disable.']
            };
          }
          return { valid: true };
        }
      },

      'defense': {
        minArgs: 1,
        maxArgs: 1,
        usage: `${config.get('bot.prefix')}defense <NORMAL|STRICT|LOCKDOWN>`,
        validate: (args) => {
          const validModes = ['NORMAL', 'STRICT', 'LOCKDOWN'];
          if (!validModes.includes(args[0].toUpperCase())) {
            return {
              valid: false,
              errors: [`Mode defense harus: ${validModes.join(', ')}`]
            };
          }
          return { valid: true };
        }
      },

      'share': {
        minArgs: 1,
        usage: `${config.get('bot.prefix')}share <pesan>`,
        validate: (args) => {
          if (args.join(' ').trim().length === 0) {
            return {
              valid: false,
              errors: ['Pesan tidak boleh kosong.']
            };
          }
          return { valid: true };
        }
      },

      // Owner Commands
      'mute': {
        minArgs: 0,
        groupOnly: true,
        usage: `${config.get('bot.prefix')}mute @user <waktu> atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-mute.']
            };
          }
          
          // Check time format if provided
          const timeArg = info.quoted ? args[0] : args[1];
          if (timeArg && !this.isValidDuration(timeArg)) {
            return {
              valid: false,
              errors: ['Format waktu tidak valid. Contoh: 10m, 1h, 1d']
            };
          }
          
          return { valid: true };
        }
      },

      'unmute': {
        minArgs: 0,
        groupOnly: true,
        requiresQuoted: false,
        usage: `${config.get('bot.prefix')}unmute @user atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-unmute.']
            };
          }
          return { valid: true };
        }
      },

      'warn': {
        minArgs: 0,
        groupOnly: true,
        usage: `${config.get('bot.prefix')}warn @user atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-warn.']
            };
          }
          return { valid: true };
        }
      },

      'kick': {
        minArgs: 0,
        groupOnly: true,
        usage: `${config.get('bot.prefix')}kick @user atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-kick.']
            };
          }
          return { valid: true };
        }
      },

      'promote': {
        minArgs: 0,
        groupOnly: true,
        usage: `${config.get('bot.prefix')}promote @user atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-promote.']
            };
          }
          return { valid: true };
        }
      },

      'demote': {
        minArgs: 0,
        groupOnly: true,
        usage: `${config.get('bot.prefix')}demote @user atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-demote.']
            };
          }
          return { valid: true };
        }
      },

      'blacklist': {
        minArgs: 0,
        usage: `${config.get('bot.prefix')}blacklist @user atau reply pesan`,
        validate: (args, info) => {
          if (args.length === 0 && !info.quoted) {
            return {
              valid: false,
              errors: ['Mention user atau reply pesan user yang ingin di-blacklist.']
            };
          }
          return { valid: true };
        }
      },

      'on': {
        minArgs: 1,
        maxArgs: 1,
        usage: `${config.get('bot.prefix')}on <feature>`,
        validate: (args) => {
          if (args[0].trim().length === 0) {
            return {
              valid: false,
              errors: ['Sebutkan fitur yang ingin diaktifkan. Contoh: anti-link']
            };
          }
          return { valid: true };
        }
      },

      'off': {
        minArgs: 1,
        maxArgs: 1,
        usage: `${config.get('bot.prefix')}off <feature>`,
        validate: (args) => {
          if (args[0].trim().length === 0) {
            return {
              valid: false,
              errors: ['Sebutkan fitur yang ingin dinonaktifkan. Contoh: anti-spam']
            };
          }
          return { valid: true };
        }
      },

      // General Commands
      'ai': {
        minArgs: 1,
        usage: `${config.get('bot.prefix')}ai <pertanyaan>`,
        validate: (args) => {
          const question = args.join(' ').trim();
          if (question.length === 0) {
            return {
              valid: false,
              errors: ['Pertanyaan tidak boleh kosong.']
            };
          }
          if (question.length > 500) {
            return {
              valid: false,
              errors: ['Pertanyaan terlalu panjang. Maksimal 500 karakter.']
            };
          }
          return { valid: true };
        }
      },

      'brat': {
        minArgs: 1,
        usage: `${config.get('bot.prefix')}brat <teks>`,
        validate: (args) => {
          const text = args.join(' ').trim();
          if (text.length === 0) {
            return {
              valid: false,
              errors: ['Teks tidak boleh kosong.']
            };
          }
          if (text.length > 50) {
            return {
              valid: false,
              errors: ['Teks terlalu panjang. Maksimal 50 karakter.']
            };
          }
          return { valid: true };
        }
      },

      'download-music': {
        minArgs: 1,
        usage: `${config.get('bot.prefix')}download-music <url>`,
        validate: (args) => {
          const url = args[0];
          if (!this.isValidURL(url)) {
            return {
              valid: false,
              errors: ['URL tidak valid. Masukkan URL yang benar.']
            };
          }
          return { valid: true };
        }
      },

      'download-tiktok': {
        minArgs: 1,
        usage: `${config.get('bot.prefix')}download-tiktok <url>`,
        validate: (args) => {
          const url = args[0];
          if (!this.isValidURL(url)) {
            return {
              valid: false,
              errors: ['URL tidak valid. Masukkan URL TikTok yang benar.']
            };
          }
          return { valid: true };
        }
      }
    };

    return requirements[command] || null;
  }

  /**
   * Validate phone number format
   * @param {string} number - Phone number
   * @returns {boolean}
   */
  isValidPhoneNumber(number) {
    // Indonesian phone number format: 62xxxxx (without +)
    return /^62\d{9,13}$/.test(number);
  }

  /**
   * Validate URL format
   * @param {string} url - URL string
   * @returns {boolean}
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate duration format (e.g., 10m, 1h, 1d)
   * @param {string} duration - Duration string
   * @returns {boolean}
   */
  isValidDuration(duration) {
    return /^\d+[mhd]$/i.test(duration);
  }

  /**
   * Parse duration to minutes
   * @param {string} duration - Duration string (e.g., 10m, 1h, 1d)
   * @returns {number} Minutes
   */
  parseDuration(duration) {
    const match = duration.match(/^(\d+)([mhd])$/i);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'm': return value;
      case 'h': return value * 60;
      case 'd': return value * 60 * 24;
      default: return 0;
    }
  }

  /**
   * Format validation error message
   * @param {string} command - Command name
   * @param {Array} errors - Error messages
   * @param {string} usage - Usage string
   * @returns {string} Formatted message
   */
  formatValidationError(command, errors, usage) {
    let message = `❌ *VALIDATION ERROR*\n\n`;
    message += `Command: ${config.get('bot.prefix')}${command}\n\n`;
    message += `*Errors:*\n`;
    
    errors.forEach((error, index) => {
      message += `${index + 1}. ${error}\n`;
    });

    if (usage) {
      message += `\n*Usage:*\n${usage}`;
    }

    return message;
  }

  /**
   * Extract mentioned users from message
   * @param {Object} messageInfo - Message information
   * @returns {Array} Array of user JIDs
   */
  extractMentions(messageInfo) {
    const mentions = [];

    // Check for mentions in args
    if (messageInfo.args) {
      messageInfo.args.forEach(arg => {
        if (arg.startsWith('@')) {
          const number = arg.slice(1).replace(/\D/g, '');
          if (this.isValidPhoneNumber(number)) {
            mentions.push(number + '@s.whatsapp.net');
          }
        }
      });
    }

    // Check for quoted message
    if (messageInfo.quoted) {
      const quotedSender = messageInfo.quoted.participant || messageInfo.quoted.key?.participant;
      if (quotedSender) {
        mentions.push(quotedSender);
      }
    }

    return mentions;
  }

  /**
   * Validate group admin permission
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @param {string} userJid - User JID
   * @returns {Promise<boolean>}
   */
  async isGroupAdmin(bot, groupId, userJid) {
    try {
      const metadata = await bot.getGroupMetadata(groupId);
      const participant = metadata.participants.find(p => p.id === userJid);
      return participant?.admin !== null;
    } catch (error) {
      this.logger.error('Error checking group admin:', error);
      return false;
    }
  }

  /**
   * Validate bot admin permission
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @returns {Promise<boolean>}
   */
  async isBotAdmin(bot, groupId) {
    try {
      const botJid = bot.sock.user.id;
      return await this.isGroupAdmin(bot, groupId, botJid);
    } catch (error) {
      this.logger.error('Error checking bot admin:', error);
      return false;
    }
  }
}

// Export singleton instance
export const validationMiddleware = new ValidationMiddleware();