/**
 * ALL-STAR BOT v2.0 - Message Helper
 * Utilities for message formatting and processing
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { config } from '../config/BotConfig.js';

export class MessageHelper {
  /**
   * Format phone number for display
   * @param {string} number - Phone number
   * @returns {string} Formatted number
   */
  static formatPhoneNumber(number) {
    const clean = number.replace(/\D/g, '');
    
    if (clean.startsWith('62')) {
      // Indonesian format: +62 812-3456-7890
      return `+${clean.slice(0, 2)} ${clean.slice(2, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
    }
    
    return `+${clean}`;
  }

  /**
   * Format duration from minutes to readable string
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration
   */
  static formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} menit`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return remainingMinutes > 0 
        ? `${hours} jam ${remainingMinutes} menit`
        : `${hours} jam`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return remainingHours > 0
      ? `${days} hari ${remainingHours} jam`
      : `${days} hari`;
  }

  /**
   * Format timestamp to readable date
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted date
   */
  static formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      timeZone: config.get('system.timezone'),
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format file size to readable string
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  static formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Extract mentions from message
   * @param {string} message - Message text
   * @returns {Array} Array of mentioned numbers
   */
  static extractMentions(message) {
    const mentionPattern = /@(\d+)/g;
    const matches = message.matchAll(mentionPattern);
    
    const mentions = [];
    for (const match of matches) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  /**
   * Create mention string
   * @param {string} number - Phone number
   * @returns {string} Mention string
   */
  static createMention(number) {
    return `@${number.replace(/\D/g, '')}`;
  }

  /**
   * Create JID from phone number
   * @param {string} number - Phone number
   * @returns {string} WhatsApp JID
   */
  static createJID(number) {
    const clean = number.replace(/\D/g, '');
    return `${clean}@s.whatsapp.net`;
  }

  /**
   * Extract number from JID
   * @param {string} jid - WhatsApp JID
   * @returns {string} Phone number
   */
  static extractNumber(jid) {
    return jid.split('@')[0];
  }

  /**
   * Check if message is from group
   * @param {string} jid - Message JID
   * @returns {boolean}
   */
  static isGroupMessage(jid) {
    return jid.endsWith('@g.us');
  }

  /**
   * Truncate long text
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  static truncate(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Split long message into chunks
   * @param {string} message - Long message
   * @param {number} chunkSize - Size of each chunk
   * @returns {Array} Array of message chunks
   */
  static splitMessage(message, chunkSize = 4000) {
    const chunks = [];
    let currentChunk = '';

    const lines = message.split('\n');

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If single line is too long, split it
        if (line.length > chunkSize) {
          for (let i = 0; i < line.length; i += chunkSize) {
            chunks.push(line.substring(i, i + chunkSize));
          }
        } else {
          currentChunk = line + '\n';
        }
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Escape markdown characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeMarkdown(text) {
    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`');
  }

  /**
   * Format error message
   * @param {string} command - Command name
   * @param {string} error - Error message
   * @returns {string} Formatted error
   */
  static formatError(command, error) {
    return `❌ *ERROR*\n\nCommand: ${config.get('bot.prefix')}${command}\nError: ${error}\n\nSilakan coba lagi atau hubungi admin.`;
  }

  /**
   * Format success message
   * @param {string} action - Action performed
   * @param {string} details - Additional details
   * @returns {string} Formatted success message
   */
  static formatSuccess(action, details = '') {
    let message = `✅ *SUCCESS*\n\nAction: ${action}`;
    if (details) {
      message += `\n\n${details}`;
    }
    return message;
  }

  /**
   * Format info message
   * @param {string} title - Title
   * @param {Object} data - Data to display
   * @returns {string} Formatted info
   */
  static formatInfo(title, data) {
    let message = `ℹ️ *${title.toUpperCase()}*\n\n`;
    
    for (const [key, value] of Object.entries(data)) {
      message += `${key}: ${value}\n`;
    }
    
    return message;
  }

  /**
   * Create progress bar
   * @param {number} current - Current value
   * @param {number} total - Total value
   * @param {number} length - Bar length
   * @returns {string} Progress bar
   */
  static createProgressBar(current, total, length = 10) {
    const percentage = (current / total) * 100;
    const filled = Math.round((current / total) * length);
    const empty = length - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${percentage.toFixed(1)}%`;
  }

  /**
   * Format list with numbers
   * @param {Array} items - List items
   * @returns {string} Numbered list
   */
  static formatNumberedList(items) {
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }

  /**
   * Format list with bullets
   * @param {Array} items - List items
   * @returns {string} Bulleted list
   */
  static formatBulletList(items) {
    return items.map(item => `• ${item}`).join('\n');
  }

  /**
   * Create table from data
   * @param {Array} headers - Table headers
   * @param {Array} rows - Table rows
   * @returns {string} Formatted table
   */
  static createTable(headers, rows) {
    const colWidths = headers.map((header, i) => {
      const maxWidth = Math.max(
        header.length,
        ...rows.map(row => String(row[i]).length)
      );
      return maxWidth + 2;
    });

    const separator = colWidths.map(w => '─'.repeat(w)).join('┼');
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join('│');
    const dataRows = rows.map(row => 
      row.map((cell, i) => String(cell).padEnd(colWidths[i])).join('│')
    );

    return [
      headerRow,
      separator,
      ...dataRows
    ].join('\n');
  }

  /**
   * Highlight text
   * @param {string} text - Text to highlight
   * @returns {string} Highlighted text
   */
  static highlight(text) {
    return `*${text}*`;
  }

  /**
   * Create box around text
   * @param {string} text - Text to box
   * @param {string} char - Border character
   * @returns {string} Boxed text
   */
  static createBox(text, char = '═') {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length));
    
    const top = char.repeat(maxLength + 4);
    const content = lines.map(line => `║ ${line.padEnd(maxLength)} ║`);
    const bottom = char.repeat(maxLength + 4);
    
    return ['╔' + top + '╗', ...content, '╚' + bottom + '╝'].join('\n');
  }

  /**
   * Clean message content
   * @param {string} message - Message to clean
   * @returns {string} Cleaned message
   */
  static cleanMessage(message) {
    return message
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get message preview
   * @param {string} message - Full message
   * @param {number} length - Preview length
   * @returns {string} Message preview
   */
  static getPreview(message, length = 50) {
    const cleaned = this.cleanMessage(message);
    return this.truncate(cleaned, length);
  }
}

export const messageHelper = MessageHelper;
