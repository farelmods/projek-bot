/**
 * ALL-STAR BOT v2.0 - Anti-Toxic Module
 * Advanced profanity and toxic language detection
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { db } from '../database/Database.js';

export class AntiToxic {
  constructor() {
    this.logger = new Logger('ANTI-TOXIC');
    
    // Indonesian bad words database
    this.badWords = [
      // Tier 1: Very offensive
      'anjing', 'babi', 'kontol', 'memek', 'bangsat', 'jancok', 'jembut',
      'ngentot', 'ngewe', 'colmek', 'coli', 'peju', 'pepek', 'titit',
      'tolol', 'goblok', 'kampret', 'asu', 'bajingan', 'brengsek',
      'tai', 'taik', 'tetek', 'kimak', 'monyet', 'idiot', 'bodoh',
      
      // Tier 2: Offensive
      'yatim', 'anj', 'bgst', 'bngst', 'mmk', 'ktl', 'jnck',
      'goblog', 'gblk', 'tlol', 'anjir', 'anjrit', 'sial',
      'sialan', 'kunyuk', 'bego', 'dungu', 'pantek', 'panteq',
      
      // Tier 3: Mild but toxic
      'noob', 'nub', 'bacot', 'bacod', 'bakcot', 'brengsek',
      'kampang', 'jelek', 'cupu', 'cacat', 'sinting', 'gila'
    ];

    // Character substitution map for detection
    this.substitutions = {
      'a': ['4', '@', 'а', 'а́'],
      'i': ['1', '!', '|', 'і', 'і́'],
      'o': ['0', 'о', 'о́'],
      'e': ['3', 'е', 'е́'],
      'l': ['1', '|', 'і'],
      's': ['$', '5'],
      't': ['7', '+'],
      'g': ['9', '6'],
      'b': ['8'],
      'z': ['2']
    };

    // Regex patterns for advanced detection
    this.patterns = this.buildPatterns();
  }

  /**
   * Build detection patterns from bad words
   * @returns {Array} Regex patterns
   */
  buildPatterns() {
    return this.badWords.map(word => {
      // Create pattern that handles:
      // 1. Character substitution (a -> 4, @ etc)
      // 2. Extra spaces (a n j i n g)
      // 3. Repeated characters (aaanjing)
      // 4. Case insensitive
      
      let pattern = '';
      for (const char of word) {
        const subs = this.substitutions[char] || [];
        const allChars = [char, char.toUpperCase(), ...subs];
        const charPattern = `[${allChars.join('')}]`;
        // Allow 0-3 extra characters (spaces, dots, etc) between each letter
        pattern += `${charPattern}[\\s\\W]{0,3}`;
      }
      
      return new RegExp(pattern, 'gi');
    });
  }

  /**
   * Detect toxic language in message
   * @param {string} message - Message content
   * @returns {Object} Detection result
   */
  detect(message) {
    try {
      if (!message || typeof message !== 'string') {
        return {
          detected: false,
          words: []
        };
      }

      const foundWords = [];
      const normalizedMessage = this.normalizeMessage(message);

      // Check against patterns
      for (let i = 0; i < this.patterns.length; i++) {
        const pattern = this.patterns[i];
        const badWord = this.badWords[i];
        
        if (pattern.test(normalizedMessage)) {
          if (!foundWords.includes(badWord)) {
            foundWords.push(badWord);
          }
        }
      }

      // Additional check: exact word matching after normalization
      const words = normalizedMessage.toLowerCase().split(/\s+/);
      for (const word of words) {
        const cleanWord = this.cleanWord(word);
        if (this.badWords.includes(cleanWord) && !foundWords.includes(cleanWord)) {
          foundWords.push(cleanWord);
        }
      }

      const detected = foundWords.length > 0;

      if (detected) {
        this.logger.warn(`Toxic words detected: ${foundWords.join(', ')}`);
      }

      return {
        detected,
        words: foundWords,
        count: foundWords.length,
        severity: this.calculateSeverity(foundWords)
      };

    } catch (error) {
      this.logger.error('Error detecting toxic content:', error);
      return {
        detected: false,
        words: []
      };
    }
  }

  /**
   * Normalize message for better detection
   * @param {string} message - Original message
   * @returns {string} Normalized message
   */
  normalizeMessage(message) {
    let normalized = message.toLowerCase();
    
    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Normalize common substitutions
    const replacements = {
      '4': 'a', '@': 'a',
      '1': 'i', '!': 'i', '|': 'i',
      '0': 'o',
      '3': 'e',
      '$': 's', '5': 's',
      '7': 't', '+': 't',
      '8': 'b'
    };
    
    for (const [sub, original] of Object.entries(replacements)) {
      normalized = normalized.replace(new RegExp(sub, 'g'), original);
    }
    
    return normalized;
  }

  /**
   * Clean word from special characters
   * @param {string} word - Word to clean
   * @returns {string} Cleaned word
   */
  cleanWord(word) {
    return word.replace(/[^a-z0-9]/gi, '').toLowerCase();
  }

  /**
   * Calculate severity of toxic content
   * @param {Array} words - Found bad words
   * @returns {string} Severity level
   */
  calculateSeverity(words) {
    if (words.length === 0) return 'none';
    
    // Check against tier 1 (very offensive)
    const tier1Words = this.badWords.slice(0, 15);
    const hasTier1 = words.some(word => tier1Words.includes(word));
    
    if (hasTier1 || words.length >= 3) return 'high';
    if (words.length >= 2) return 'medium';
    return 'low';
  }

  /**
   * Handle toxic content violation
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @param {string} sender - Sender JID
   * @param {Object} messageKey - Message key
   * @param {Object} toxicInfo - Toxic detection info
   */
  async handle(bot, groupId, sender, messageKey, toxicInfo) {
    try {
      const senderNumber = sender.split('@')[0];
      const groupSettings = db.getGroupSettings(groupId);
      const defenseMode = groupSettings.defenseMode || db.getDefenseMode();

      // Get defense mode configuration
      const modeConfig = this.getDefenseModeConfig(defenseMode);

      // Delete message
      await bot.deleteMessage(groupId, messageKey);
      this.logger.info(`Deleted toxic message from ${senderNumber}`);

      // Determine action based on severity and defense mode
      const action = this.determineAction(toxicInfo.severity, defenseMode);

      if (action === 'warn') {
        // Add warning
        const warnCount = await db.addWarn(senderNumber);
        const maxWarn = 3;

        let message = `⚠️ *ANTI-TOXIC VIOLATION*\n\n`;
        message += `User: @${senderNumber}\n`;
        message += `Severity: ${toxicInfo.severity.toUpperCase()}\n`;
        message += `Warning: ${warnCount}/${maxWarn}\n\n`;

        if (warnCount >= maxWarn) {
          message += `Maximum warnings reached. User will be kicked.`;
          
          await bot.kickParticipant(groupId, [sender]);
          await db.resetWarn(senderNumber);
          
          this.logger.security('Kick', senderNumber, 'Max warnings (toxic)', 'SYSTEM');
        } else {
          message += `Please maintain respectful communication.\n`;
          message += `Remaining warnings: ${maxWarn - warnCount}`;
        }

        await bot.sendMessage(groupId, {
          text: message,
          mentions: [sender]
        });

      } else if (action === 'mute') {
        // Mute user
        const muteDuration = 10;
        await db.addMute(senderNumber, muteDuration, 'Toxic language');

        let message = `🔇 *USER MUTED*\n\n`;
        message += `User: @${senderNumber}\n`;
        message += `Duration: ${muteDuration} minutes\n`;
        message += `Reason: Toxic language detected\n\n`;
        message += `Please maintain respectful communication.`;

        await bot.sendMessage(groupId, {
          text: message,
          mentions: [sender]
        });

        this.logger.security('Mute', senderNumber, 'Toxic language', 'SYSTEM');

      } else if (action === 'kick') {
        // Kick immediately
        await bot.kickParticipant(groupId, [sender]);

        let message = `🚫 *USER KICKED*\n\n`;
        message += `User: @${senderNumber}\n`;
        message += `Reason: Severe toxic language\n\n`;
        message += `Toxic behavior is not tolerated in this group.`;

        await bot.sendMessage(groupId, {
          text: message,
          mentions: [sender]
        });

        this.logger.security('Kick', senderNumber, 'Toxic language', 'SYSTEM');
      }

      // Log to statistics
      await db.incrementViolation('antiToxic');

    } catch (error) {
      this.logger.error('Error handling toxic violation:', error);
    }
  }

  /**
   * Determine action based on severity and defense mode
   * @param {string} severity - Severity level
   * @param {string} defenseMode - Defense mode
   * @returns {string} Action to take
   */
  determineAction(severity, defenseMode) {
    const actionMatrix = {
      'NORMAL': {
        'low': 'warn',
        'medium': 'warn',
        'high': 'warn'
      },
      'STRICT': {
        'low': 'warn',
        'medium': 'mute',
        'high': 'mute'
      },
      'LOCKDOWN': {
        'low': 'mute',
        'medium': 'kick',
        'high': 'kick'
      }
    };

    return actionMatrix[defenseMode]?.[severity] || 'warn';
  }

  /**
   * Get defense mode configuration
   * @param {string} mode - Defense mode
   * @returns {Object} Configuration
   */
  getDefenseModeConfig(mode) {
    const configs = {
      'NORMAL': {
        autoDelete: true,
        severity: 'low'
      },
      'STRICT': {
        autoDelete: true,
        severity: 'medium'
      },
      'LOCKDOWN': {
        autoDelete: true,
        severity: 'high'
      }
    };

    return configs[mode] || configs['NORMAL'];
  }

  /**
   * Check if group has anti-toxic enabled
   * @param {string} groupId - Group JID
   * @returns {boolean}
   */
  isEnabled(groupId) {
    const settings = db.getGroupSettings(groupId);
    return settings.antiToxic !== false;
  }

  /**
   * Enable anti-toxic for group
   * @param {string} groupId - Group JID
   */
  async enable(groupId) {
    await db.updateGroupSetting(groupId, 'antiToxic', true);
    this.logger.info(`Anti-toxic enabled for group: ${groupId}`);
  }

  /**
   * Disable anti-toxic for group
   * @param {string} groupId - Group JID
   */
  async disable(groupId) {
    await db.updateGroupSetting(groupId, 'antiToxic', false);
    this.logger.info(`Anti-toxic disabled for group: ${groupId}`);
  }

  /**
   * Add word to blacklist
   * @param {string} word - Word to add
   */
  addBadWord(word) {
    const cleanedWord = this.cleanWord(word.toLowerCase());
    if (!this.badWords.includes(cleanedWord)) {
      this.badWords.push(cleanedWord);
      this.patterns = this.buildPatterns();
      this.logger.info(`Bad word added: ${cleanedWord}`);
    }
  }

  /**
   * Remove word from blacklist
   * @param {string} word - Word to remove
   */
  removeBadWord(word) {
    const cleanedWord = this.cleanWord(word.toLowerCase());
    const index = this.badWords.indexOf(cleanedWord);
    if (index > -1) {
      this.badWords.splice(index, 1);
      this.patterns = this.buildPatterns();
      this.logger.info(`Bad word removed: ${cleanedWord}`);
    }
  }

  /**
   * Get bad words list
   * @returns {Array} Bad words
   */
  getBadWords() {
    return [...this.badWords];
  }

  /**
   * Censor text by replacing bad words
   * @param {string} text - Text to censor
   * @returns {string} Censored text
   */
  censorText(text) {
    let censored = text;
    
    for (const word of this.badWords) {
      const pattern = new RegExp(`\\b${word}\\b`, 'gi');
      censored = censored.replace(pattern, '*'.repeat(word.length));
    }
    
    return censored;
  }

  /**
   * Check if text contains toxic content
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  isToxic(text) {
    return this.detect(text).detected;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalBadWords: this.badWords.length,
      totalPatterns: this.patterns.length
    };
  }
}

// Export singleton instance
export const antiToxic = new AntiToxic();