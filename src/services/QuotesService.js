/**
 * ALL-STAR BOT v2.0 - Quote Service
 * Provides random inspirational quotes
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import axios from 'axios';
import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';

export class QuoteService {
  constructor() {
    this.logger = new Logger('QUOTE-SERVICE');
    
    // Fallback quotes if API fails
    this.fallbackQuotes = [
      {
        text: "The only way to do great work is to love what you do.",
        author: "Steve Jobs"
      },
      {
        text: "Innovation distinguishes between a leader and a follower.",
        author: "Steve Jobs"
      },
      {
        text: "Code is like humor. When you have to explain it, it's bad.",
        author: "Cory House"
      },
      {
        text: "First, solve the problem. Then, write the code.",
        author: "John Johnson"
      },
      {
        text: "Simplicity is the soul of efficiency.",
        author: "Austin Freeman"
      },
      {
        text: "Make it work, make it right, make it fast.",
        author: "Kent Beck"
      },
      {
        text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
        author: "Martin Fowler"
      },
      {
        text: "The best error message is the one that never shows up.",
        author: "Thomas Fuchs"
      },
      {
        text: "Programming isn't about what you know; it's about what you can figure out.",
        author: "Chris Pine"
      },
      {
        text: "The function of good software is to make the complex appear to be simple.",
        author: "Grady Booch"
      },
      {
        text: "Talk is cheap. Show me the code.",
        author: "Linus Torvalds"
      },
      {
        text: "Don't comment bad code—rewrite it.",
        author: "Brian W. Kernighan"
      },
      {
        text: "Testing leads to failure, and failure leads to understanding.",
        author: "Burt Rutan"
      },
      {
        text: "It's not a bug – it's an undocumented feature.",
        author: "Anonymous"
      },
      {
        text: "The best way to predict the future is to invent it.",
        author: "Alan Kay"
      },
      {
        text: "In order to be irreplaceable, one must always be different.",
        author: "Coco Chanel"
      },
      {
        text: "Java is to JavaScript what car is to Carpet.",
        author: "Chris Heilmann"
      },
      {
        text: "Perfect is the enemy of good.",
        author: "Voltaire"
      },
      {
        text: "Fix the cause, not the symptom.",
        author: "Steve Maguire"
      },
      {
        text: "Controlling complexity is the essence of computer programming.",
        author: "Brian Kernighan"
      }
    ];

    // API configuration
    this.apiUrl = config.get('external.quoteApi');
  }

  /**
   * Get random quote
   * @returns {Promise<Object>} Quote object with text and author
   */
  async getRandomQuote() {
    try {
      // Try to fetch from API
      if (this.apiUrl) {
        const response = await axios.get(this.apiUrl, {
          timeout: 5000
        });

        if (response.data && response.data.content && response.data.author) {
          return {
            text: response.data.content,
            author: response.data.author
          };
        }
      }

      // Fallback to local quotes
      return this.getRandomFallbackQuote();

    } catch (error) {
      this.logger.warn('Failed to fetch quote from API, using fallback:', error.message);
      return this.getRandomFallbackQuote();
    }
  }

  /**
   * Get random quote from fallback list
   * @returns {Object} Quote object
   */
  getRandomFallbackQuote() {
    const randomIndex = Math.floor(Math.random() * this.fallbackQuotes.length);
    return this.fallbackQuotes[randomIndex];
  }

  /**
   * Get programming quote
   * @returns {Object} Programming-related quote
   */
  getProgrammingQuote() {
    const programmingQuotes = this.fallbackQuotes.filter(q => 
      q.text.toLowerCase().includes('code') ||
      q.text.toLowerCase().includes('programming') ||
      q.text.toLowerCase().includes('software')
    );

    if (programmingQuotes.length === 0) {
      return this.getRandomFallbackQuote();
    }

    const randomIndex = Math.floor(Math.random() * programmingQuotes.length);
    return programmingQuotes[randomIndex];
  }

  /**
   * Get motivational quote
   * @returns {Object} Motivational quote
   */
  getMotivationalQuote() {
    const motivationalQuotes = this.fallbackQuotes.filter(q =>
      !q.text.toLowerCase().includes('code') &&
      !q.text.toLowerCase().includes('bug')
    );

    if (motivationalQuotes.length === 0) {
      return this.getRandomFallbackQuote();
    }

    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    return motivationalQuotes[randomIndex];
  }

  /**
   * Add custom quote
   * @param {string} text - Quote text
   * @param {string} author - Quote author
   */
  addQuote(text, author) {
    this.fallbackQuotes.push({ text, author });
    this.logger.info(`Quote added: ${author}`);
  }

  /**
   * Get total quotes count
   * @returns {number} Total quotes
   */
  getTotalQuotes() {
    return this.fallbackQuotes.length;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalQuotes: this.fallbackQuotes.length,
      apiConfigured: !!this.apiUrl
    };
  }
}

// Export singleton instance
export const quoteService = new QuoteService();
