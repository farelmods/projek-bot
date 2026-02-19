/**
 * ALL-STAR BOT v2.0 - AI Service
 * Claude AI integration for intelligent responses
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';

export class AIService {
  constructor() {
    this.logger = new Logger('AI-SERVICE');
    
    // Initialize Anthropic client
    if (config.get('ai.apiKey')) {
      this.client = new Anthropic({
        apiKey: config.get('ai.apiKey')
      });
    } else {
      this.client = null;
      this.logger.warn('Claude API key not configured');
    }

    // Rate limiting per user
    this.userRateLimits = new Map();
    // Format: { userId: { count: number, resetTime: timestamp } }

    this.rateLimitConfig = config.get('ai.rateLimit');
  }

  /**
   * Chat with Claude AI
   * @param {string} message - User message
   * @param {string} userId - User ID for rate limiting
   * @returns {Promise<string>} AI response
   */
  async chat(message, userId) {
    try {
      // Check if AI is enabled
      if (!this.client) {
        throw new Error('AI service is not configured');
      }

      // Check rate limit
      if (!this.checkRateLimit(userId)) {
        throw new Error('rate limit exceeded');
      }

      // Prepare messages
      const messages = [
        {
          role: 'user',
          content: message
        }
      ];

      // Call Claude API
      const response = await this.client.messages.create({
        model: config.get('ai.model'),
        max_tokens: config.get('ai.maxTokens'),
        messages: messages,
        system: config.getAIPrompt()
      });

      // Extract response text
      const responseText = response.content[0].text;

      // Update rate limit
      this.updateRateLimit(userId);

      this.logger.info(`AI response generated for user: ${userId}`);

      return responseText;

    } catch (error) {
      this.logger.error('AI chat error:', error);
      
      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      } else if (error.message.includes('API key')) {
        throw new Error('API key error. Please contact administrator.');
      } else {
        throw new Error('Failed to get AI response. Please try again.');
      }
    }
  }

  /**
   * Check if user is within rate limit
   * @param {string} userId - User ID
   * @returns {boolean} Whether user can make request
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.userRateLimits.get(userId);

    if (!userLimit) {
      return true;
    }

    // Reset if time window passed
    if (now > userLimit.resetTime) {
      this.userRateLimits.delete(userId);
      return true;
    }

    // Check if under limit
    return userLimit.count < this.rateLimitConfig.perUser;
  }

  /**
   * Update rate limit for user
   * @param {string} userId - User ID
   */
  updateRateLimit(userId) {
    const now = Date.now();
    const resetTime = now + (this.rateLimitConfig.cooldown * 1000);

    const userLimit = this.userRateLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // New rate limit window
      this.userRateLimits.set(userId, {
        count: 1,
        resetTime
      });
    } else {
      // Increment count
      userLimit.count++;
      this.userRateLimits.set(userId, userLimit);
    }
  }

  /**
   * Get remaining requests for user
   * @param {string} userId - User ID
   * @returns {number} Remaining requests
   */
  getRemainingRequests(userId) {
    const userLimit = this.userRateLimits.get(userId);

    if (!userLimit || Date.now() > userLimit.resetTime) {
      return this.rateLimitConfig.perUser;
    }

    return Math.max(0, this.rateLimitConfig.perUser - userLimit.count);
  }

  /**
   * Check if AI service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.client !== null && config.get('ai.enabled');
  }

  /**
   * Cleanup old rate limit data
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, limit] of this.userRateLimits.entries()) {
      if (now > limit.resetTime) {
        this.userRateLimits.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limits`);
    }
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      activeUsers: this.userRateLimits.size,
      available: this.isAvailable(),
      model: config.get('ai.model'),
      rateLimit: this.rateLimitConfig
    };
  }
}

// Export singleton instance
export const aiService = new AIService();

// Periodic cleanup every 5 minutes
setInterval(() => {
  aiService.cleanup();
}, 300000);
