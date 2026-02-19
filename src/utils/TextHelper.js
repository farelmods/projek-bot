/**
 * ALL-STAR BOT v2.0 - Text Helper
 * Utilities for text processing and manipulation
 * 
 * @author Liand (@Liand_fullstackdev)
 */

export class TextHelper {
  /**
   * Capitalize first letter
   * @param {string} text - Text to capitalize
   * @returns {string} Capitalized text
   */
  static capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Capitalize each word
   * @param {string} text - Text to capitalize
   * @returns {string} Title cased text
   */
  static titleCase(text) {
    if (!text) return '';
    return text.split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  /**
   * Convert to uppercase
   * @param {string} text - Text to convert
   * @returns {string} Uppercase text
   */
  static upper(text) {
    return text ? text.toUpperCase() : '';
  }

  /**
   * Convert to lowercase
   * @param {string} text - Text to convert
   * @returns {string} Lowercase text
   */
  static lower(text) {
    return text ? text.toLowerCase() : '';
  }

  /**
   * Remove extra whitespace
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  static clean(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Count words
   * @param {string} text - Text to count
   * @returns {number} Word count
   */
  static wordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }

  /**
   * Count characters
   * @param {string} text - Text to count
   * @param {boolean} includeSpaces - Include spaces in count
   * @returns {number} Character count
   */
  static charCount(text, includeSpaces = true) {
    if (!text) return 0;
    return includeSpaces ? text.length : text.replace(/\s/g, '').length;
  }

  /**
   * Truncate text
   * @param {string} text - Text to truncate
   * @param {number} length - Max length
   * @param {string} suffix - Suffix to add
   * @returns {string} Truncated text
   */
  static truncate(text, length = 100, suffix = '...') {
    if (!text || text.length <= length) return text;
    return text.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Reverse text
   * @param {string} text - Text to reverse
   * @returns {string} Reversed text
   */
  static reverse(text) {
    if (!text) return '';
    return text.split('').reverse().join('');
  }

  /**
   * Check if text contains substring (case insensitive)
   * @param {string} text - Text to search in
   * @param {string} search - Text to search for
   * @returns {boolean}
   */
  static contains(text, search) {
    if (!text || !search) return false;
    return text.toLowerCase().includes(search.toLowerCase());
  }

  /**
   * Replace all occurrences
   * @param {string} text - Text to process
   * @param {string} search - Text to replace
   * @param {string} replacement - Replacement text
   * @returns {string} Processed text
   */
  static replaceAll(text, search, replacement) {
    if (!text) return '';
    return text.split(search).join(replacement);
  }

  /**
   * Remove special characters
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  static removeSpecialChars(text) {
    if (!text) return '';
    return text.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  /**
   * Extract numbers from text
   * @param {string} text - Text to process
   * @returns {Array} Array of numbers
   */
  static extractNumbers(text) {
    if (!text) return [];
    const matches = text.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  }

  /**
   * Extract URLs from text
   * @param {string} text - Text to process
   * @returns {Array} Array of URLs
   */
  static extractURLs(text) {
    if (!text) return [];
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlPattern);
    return matches || [];
  }

  /**
   * Extract emails from text
   * @param {string} text - Text to process
   * @returns {Array} Array of emails
   */
  static extractEmails(text) {
    if (!text) return [];
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailPattern);
    return matches || [];
  }

  /**
   * Slugify text (for URLs)
   * @param {string} text - Text to slugify
   * @returns {string} Slugified text
   */
  static slugify(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Pad text
   * @param {string} text - Text to pad
   * @param {number} length - Total length
   * @param {string} char - Padding character
   * @param {string} side - Padding side (left/right/both)
   * @returns {string} Padded text
   */
  static pad(text, length, char = ' ', side = 'both') {
    if (!text) text = '';
    if (text.length >= length) return text;

    const padLength = length - text.length;

    if (side === 'left') {
      return char.repeat(padLength) + text;
    } else if (side === 'right') {
      return text + char.repeat(padLength);
    } else {
      const leftPad = Math.floor(padLength / 2);
      const rightPad = padLength - leftPad;
      return char.repeat(leftPad) + text + char.repeat(rightPad);
    }
  }

  /**
   * Repeat text
   * @param {string} text - Text to repeat
   * @param {number} times - Number of times
   * @returns {string} Repeated text
   */
  static repeat(text, times) {
    if (!text || times <= 0) return '';
    return text.repeat(times);
  }

  /**
   * Check if text is empty
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static isEmpty(text) {
    return !text || text.trim().length === 0;
  }

  /**
   * Check if text is numeric
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static isNumeric(text) {
    return !isNaN(parseFloat(text)) && isFinite(text);
  }

  /**
   * Check if text is alphanumeric
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  static isAlphanumeric(text) {
    return /^[a-zA-Z0-9]+$/.test(text);
  }

  /**
   * Split text into sentences
   * @param {string} text - Text to split
   * @returns {Array} Array of sentences
   */
  static splitSentences(text) {
    if (!text) return [];
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
  }

  /**
   * Split text into paragraphs
   * @param {string} text - Text to split
   * @returns {Array} Array of paragraphs
   */
  static splitParagraphs(text) {
    if (!text) return [];
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }

  /**
   * Wrap text to specified width
   * @param {string} text - Text to wrap
   * @param {number} width - Line width
   * @returns {string} Wrapped text
   */
  static wrap(text, width = 80) {
    if (!text) return '';
    
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > width) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }

    if (currentLine) lines.push(currentLine.trim());
    return lines.join('\n');
  }

  /**
   * Remove diacritics (accents)
   * @param {string} text - Text to process
   * @returns {string} Text without diacritics
   */
  static removeDiacritics(text) {
    if (!text) return '';
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHTML(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Unescape HTML special characters
   * @param {string} text - Text to unescape
   * @returns {string} Unescaped text
   */
  static unescapeHTML(text) {
    if (!text) return '';
    const map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'"
    };
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, m => map[m]);
  }

  /**
   * Generate random string
   * @param {number} length - String length
   * @param {string} charset - Character set
   * @returns {string} Random string
   */
  static random(length = 10, charset = 'alphanumeric') {
    const charsets = {
      numeric: '0123456789',
      alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      alphanumeric: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      hex: '0123456789abcdef'
    };

    const chars = charsets[charset] || charsets.alphanumeric;
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Calculate text similarity (Levenshtein distance)
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  static similarity(text1, text2) {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;

    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const textHelper = TextHelper;
