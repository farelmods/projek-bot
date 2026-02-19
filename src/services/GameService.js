/**
 * ALL-STAR BOT v2.0 - Game Service
 * Manages game sessions and state
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';

export class GameService {
  constructor() {
    this.logger = new Logger('GAME-SERVICE');
    this.activeSessions = new Map();
    // Format: { gameId: { type, players, state, startTime, lastActivity } }
  }

  /**
   * Create new game session
   * @param {string} gameType - Type of game
   * @param {string} groupId - Group ID
   * @param {Array} players - Player JIDs
   * @returns {string} Game ID
   */
  createSession(gameType, groupId, players) {
    const gameId = `${groupId}_${Date.now()}`;
    
    this.activeSessions.set(gameId, {
      type: gameType,
      groupId,
      players,
      state: {},
      startTime: Date.now(),
      lastActivity: Date.now(),
      status: 'active'
    });

    this.logger.info(`Game session created: ${gameType} in ${groupId}`);
    return gameId;
  }

  /**
   * Get game session
   * @param {string} gameId - Game ID
   * @returns {Object|null} Game session
   */
  getSession(gameId) {
    return this.activeSessions.get(gameId) || null;
  }

  /**
   * Get active game in group
   * @param {string} groupId - Group ID
   * @returns {Object|null} Game session
   */
  getActiveGameInGroup(groupId) {
    for (const [gameId, session] of this.activeSessions.entries()) {
      if (session.groupId === groupId && session.status === 'active') {
        return { gameId, ...session };
      }
    }
    return null;
  }

  /**
   * Update game state
   * @param {string} gameId - Game ID
   * @param {Object} newState - New game state
   */
  updateState(gameId, newState) {
    const session = this.activeSessions.get(gameId);
    if (session) {
      session.state = { ...session.state, ...newState };
      session.lastActivity = Date.now();
      this.activeSessions.set(gameId, session);
    }
  }

  /**
   * Check if player is in game
   * @param {string} gameId - Game ID
   * @param {string} playerJid - Player JID
   * @returns {boolean}
   */
  isPlayerInGame(gameId, playerJid) {
    const session = this.activeSessions.get(gameId);
    return session ? session.players.includes(playerJid) : false;
  }

  /**
   * End game session
   * @param {string} gameId - Game ID
   * @param {string} reason - End reason
   */
  endSession(gameId, reason = 'completed') {
    const session = this.activeSessions.get(gameId);
    if (session) {
      session.status = 'ended';
      session.endTime = Date.now();
      session.endReason = reason;
      
      this.logger.info(`Game session ended: ${gameId} (${reason})`);
      
      // Remove after 5 minutes
      setTimeout(() => {
        this.activeSessions.delete(gameId);
      }, 300000);
    }
  }

  /**
   * Get player's current game
   * @param {string} playerJid - Player JID
   * @returns {Object|null} Game session
   */
  getPlayerGame(playerJid) {
    for (const [gameId, session] of this.activeSessions.entries()) {
      if (session.players.includes(playerJid) && session.status === 'active') {
        return { gameId, ...session };
      }
    }
    return null;
  }

  /**
   * Clean up inactive sessions
   */
  cleanup() {
    const timeout = 3600000; // 1 hour
    const now = Date.now();
    let cleanedCount = 0;

    for (const [gameId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > timeout) {
        this.endSession(gameId, 'timeout');
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} inactive game sessions`);
    }
  }

  /**
   * Get active sessions count
   * @returns {number}
   */
  getActiveCount() {
    let count = 0;
    for (const session of this.activeSessions.values()) {
      if (session.status === 'active') count++;
    }
    return count;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStatistics() {
    const stats = {
      totalSessions: this.activeSessions.size,
      activeSessions: this.getActiveCount(),
      byType: {}
    };

    for (const session of this.activeSessions.values()) {
      if (session.status === 'active') {
        stats.byType[session.type] = (stats.byType[session.type] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Format game info
   * @param {string} gameId - Game ID
   * @returns {string} Formatted info
   */
  formatGameInfo(gameId) {
    const session = this.activeSessions.get(gameId);
    if (!session) return 'Game not found';

    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    const players = session.players.map(p => `@${p.split('@')[0]}`).join(', ');

    return `🎮 *GAME INFO*

Type: ${session.type}
Players: ${players}
Duration: ${duration}s
Status: ${session.status}`;
  }
}

// Export singleton instance
export const gameService = new GameService();

// Periodic cleanup every 10 minutes
setInterval(() => {
  gameService.cleanup();
}, 600000);
