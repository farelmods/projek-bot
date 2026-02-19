/**
 * ALL-STAR BOT v2.0 - Game Base Class
 * Base class for all game implementations
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { gameService } from '../services/GameService.js';

export class GameBase {
  constructor(gameType, minPlayers = 1, maxPlayers = 2) {
    this.gameType = gameType;
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
    this.logger = new Logger(`GAME-${gameType.toUpperCase()}`);
  }

  /**
   * Start new game
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {Array} players - Player JIDs
   * @returns {Promise<string>} Game ID
   */
  async start(bot, groupId, players) {
    try {
      // Validate player count
      if (players.length < this.minPlayers) {
        throw new Error(`Need at least ${this.minPlayers} players`);
      }
      if (players.length > this.maxPlayers) {
        throw new Error(`Maximum ${this.maxPlayers} players allowed`);
      }

      // Check if players are already in a game
      for (const player of players) {
        const currentGame = gameService.getPlayerGame(player);
        if (currentGame) {
          throw new Error('One or more players are already in a game');
        }
      }

      // Create game session
      const gameId = gameService.createSession(this.gameType, groupId, players);

      // Initialize game state
      const initialState = await this.initialize(players);
      gameService.updateState(gameId, initialState);

      // Send start message
      await this.sendStartMessage(bot, groupId, players, gameId);

      this.logger.info(`Game started: ${gameId}`);
      return gameId;

    } catch (error) {
      this.logger.error('Error starting game:', error);
      throw error;
    }
  }

  /**
   * Initialize game state (override in subclass)
   * @param {Array} players - Player JIDs
   * @returns {Promise<Object>} Initial state
   */
  async initialize(players) {
    return {
      currentPlayer: 0,
      players: players,
      moves: [],
      status: 'playing'
    };
  }

  /**
   * Send start message (override in subclass)
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {Array} players - Player JIDs
   * @param {string} gameId - Game ID
   */
  async sendStartMessage(bot, groupId, players, gameId) {
    const playerMentions = players.map(p => `@${p.split('@')[0]}`).join(', ');
    await bot.sendMessage(groupId, {
      text: `🎮 *${this.gameType.toUpperCase()} STARTED!*\n\nPlayers: ${playerMentions}\n\nGame ID: ${gameId}`,
      mentions: players
    });
  }

  /**
   * Process player move
   * @param {Object} bot - Bot instance
   * @param {string} gameId - Game ID
   * @param {string} playerJid - Player JID
   * @param {*} move - Player move
   * @returns {Promise<Object>} Move result
   */
  async processMove(bot, gameId, playerJid, move) {
    try {
      const session = gameService.getSession(gameId);
      if (!session) {
        throw new Error('Game not found');
      }

      // Validate player
      if (!session.players.includes(playerJid)) {
        throw new Error('Not a player in this game');
      }

      // Check if game is active
      if (session.status !== 'active') {
        throw new Error('Game is not active');
      }

      // Validate move
      const isValid = await this.validateMove(session.state, playerJid, move);
      if (!isValid) {
        throw new Error('Invalid move');
      }

      // Apply move
      const newState = await this.applyMove(session.state, playerJid, move);
      gameService.updateState(gameId, newState);

      // Check for winner
      const result = await this.checkResult(newState);
      
      if (result.gameOver) {
        gameService.endSession(gameId, 'completed');
      }

      return result;

    } catch (error) {
      this.logger.error('Error processing move:', error);
      throw error;
    }
  }

  /**
   * Validate move (override in subclass)
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {*} move - Move to validate
   * @returns {Promise<boolean>} Is valid
   */
  async validateMove(state, playerJid, move) {
    return true;
  }

  /**
   * Apply move to game state (override in subclass)
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {*} move - Move to apply
   * @returns {Promise<Object>} New state
   */
  async applyMove(state, playerJid, move) {
    return {
      ...state,
      moves: [...state.moves, { player: playerJid, move }]
    };
  }

  /**
   * Check game result (override in subclass)
   * @param {Object} state - Current state
   * @returns {Promise<Object>} Result
   */
  async checkResult(state) {
    return {
      gameOver: false,
      winner: null,
      draw: false
    };
  }

  /**
   * Render game board (override in subclass)
   * @param {Object} state - Current state
   * @returns {string} Board representation
   */
  renderBoard(state) {
    return 'Game board';
  }

  /**
   * Get game instructions (override in subclass)
   * @returns {string} Instructions
   */
  getInstructions() {
    return `How to play ${this.gameType}`;
  }

  /**
   * End game
   * @param {Object} bot - Bot instance
   * @param {string} gameId - Game ID
   * @param {string} reason - End reason
   */
  async end(bot, gameId, reason = 'completed') {
    try {
      const session = gameService.getSession(gameId);
      if (!session) return;

      gameService.endSession(gameId, reason);

      await bot.sendMessage(session.groupId, {
        text: `🎮 Game ended: ${reason}`
      });

      this.logger.info(`Game ended: ${gameId} (${reason})`);

    } catch (error) {
      this.logger.error('Error ending game:', error);
    }
  }

  /**
   * Format result message
   * @param {Object} result - Game result
   * @param {Array} players - Player JIDs
   * @returns {string} Formatted message
   */
  formatResultMessage(result, players) {
    if (result.draw) {
      return `🎮 *GAME OVER - DRAW!*\n\nGood game everyone!`;
    } else if (result.winner) {
      const winnerMention = `@${result.winner.split('@')[0]}`;
      return `🎮 *GAME OVER*\n\n🏆 Winner: ${winnerMention}\n\nCongratulations!`;
    } else {
      return `🎮 *GAME OVER*`;
    }
  }
}
