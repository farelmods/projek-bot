/**
 * ALL-STAR BOT v2.0 - Tic Tac Toe Game
 * Classic 3x3 Tic Tac Toe game
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { GameBase } from './GameBase.js';

export class TicTacToe extends GameBase {
  constructor() {
    super('TicTacToe', 2, 2);
  }

  /**
   * Initialize game state
   * @param {Array} players - Player JIDs
   * @returns {Promise<Object>} Initial state
   */
  async initialize(players) {
    return {
      board: [
        [' ', ' ', ' '],
        [' ', ' ', ' '],
        [' ', ' ', ' ']
      ],
      players: players,
      currentPlayer: 0,
      symbols: ['❌', '⭕'],
      moves: [],
      status: 'playing'
    };
  }

  /**
   * Send start message
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {Array} players - Player JIDs
   * @param {string} gameId - Game ID
   */
  async sendStartMessage(bot, groupId, players, gameId) {
    const player1 = `@${players[0].split('@')[0]}`;
    const player2 = `@${players[1].split('@')[0]}`;

    const message = `🎮 *TIC TAC TOE STARTED!*

${player1} (❌) vs ${player2} (⭕)

${this.renderBoard({ board: [[' ',' ',' '],[' ',' ',' '],[' ',' ',' ']] })}

${player1} goes first!

How to play: Reply dengan posisi (1-9)
Example: 5 (untuk center)

 1 │ 2 │ 3
───┼───┼───
 4 │ 5 │ 6
───┼───┼───
 7 │ 8 │ 9`;

    await bot.sendMessage(groupId, {
      text: message,
      mentions: players
    });
  }

  /**
   * Validate move
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {number} move - Position (1-9)
   * @returns {Promise<boolean>} Is valid
   */
  async validateMove(state, playerJid, move) {
    // Check if it's player's turn
    const playerIndex = state.players.indexOf(playerJid);
    if (playerIndex !== state.currentPlayer) {
      return false;
    }

    // Check if move is valid number
    const position = parseInt(move);
    if (isNaN(position) || position < 1 || position > 9) {
      return false;
    }

    // Convert position to row/col
    const row = Math.floor((position - 1) / 3);
    const col = (position - 1) % 3;

    // Check if position is empty
    return state.board[row][col] === ' ';
  }

  /**
   * Apply move to game state
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {number} move - Position (1-9)
   * @returns {Promise<Object>} New state
   */
  async applyMove(state, playerJid, move) {
    const position = parseInt(move);
    const row = Math.floor((position - 1) / 3);
    const col = (position - 1) % 3;

    const newBoard = state.board.map(r => [...r]);
    newBoard[row][col] = state.symbols[state.currentPlayer];

    return {
      ...state,
      board: newBoard,
      currentPlayer: (state.currentPlayer + 1) % 2,
      moves: [...state.moves, { player: playerJid, move, position }]
    };
  }

  /**
   * Check game result
   * @param {Object} state - Current state
   * @returns {Promise<Object>} Result
   */
  async checkResult(state) {
    const board = state.board;

    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] !== ' ' && 
          board[i][0] === board[i][1] && 
          board[i][1] === board[i][2]) {
        const winnerIndex = state.symbols.indexOf(board[i][0]);
        return {
          gameOver: true,
          winner: state.players[winnerIndex],
          winningLine: `row-${i}`,
          draw: false
        };
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] !== ' ' && 
          board[0][i] === board[1][i] && 
          board[1][i] === board[2][i]) {
        const winnerIndex = state.symbols.indexOf(board[0][i]);
        return {
          gameOver: true,
          winner: state.players[winnerIndex],
          winningLine: `col-${i}`,
          draw: false
        };
      }
    }

    // Check diagonals
    if (board[0][0] !== ' ' && 
        board[0][0] === board[1][1] && 
        board[1][1] === board[2][2]) {
      const winnerIndex = state.symbols.indexOf(board[0][0]);
      return {
        gameOver: true,
        winner: state.players[winnerIndex],
        winningLine: 'diag-1',
        draw: false
      };
    }

    if (board[0][2] !== ' ' && 
        board[0][2] === board[1][1] && 
        board[1][1] === board[2][0]) {
      const winnerIndex = state.symbols.indexOf(board[0][2]);
      return {
        gameOver: true,
        winner: state.players[winnerIndex],
        winningLine: 'diag-2',
        draw: false
      };
    }

    // Check for draw
    const isFull = board.every(row => row.every(cell => cell !== ' '));
    if (isFull) {
      return {
        gameOver: true,
        winner: null,
        draw: true
      };
    }

    // Game continues
    return {
      gameOver: false,
      winner: null,
      draw: false
    };
  }

  /**
   * Render game board
   * @param {Object} state - Current state
   * @returns {string} Board representation
   */
  renderBoard(state) {
    const board = state.board;
    
    return `
 ${board[0][0]} │ ${board[0][1]} │ ${board[0][2]}
───┼───┼───
 ${board[1][0]} │ ${board[1][1]} │ ${board[1][2]}
───┼───┼───
 ${board[2][0]} │ ${board[2][1]} │ ${board[2][2]}`;
  }

  /**
   * Get game instructions
   * @returns {string} Instructions
   */
  getInstructions() {
    return `🎮 *TIC TAC TOE*

How to play:
1. Game dimainkan oleh 2 pemain
2. Player 1 menggunakan ❌, Player 2 menggunakan ⭕
3. Reply dengan nomor posisi (1-9) untuk menaruh simbol
4. Tujuan: Buat 3 simbol berurutan (horizontal, vertical, atau diagonal)
5. Jika board penuh tanpa pemenang = DRAW

Position guide:
 1 │ 2 │ 3
───┼───┼───
 4 │ 5 │ 6
───┼───┼───
 7 │ 8 │ 9

Start game: .tictactoe @player2`;
  }

  /**
   * Format move result message
   * @param {Object} state - Current state
   * @param {Object} result - Move result
   * @returns {string} Formatted message
   */
  formatMoveMessage(state, result) {
    let message = `🎮 *TIC TAC TOE*\n\n`;
    message += this.renderBoard(state);
    message += '\n\n';

    if (result.gameOver) {
      if (result.draw) {
        message += `🤝 *DRAW!*\n\nNo winner this time!`;
      } else {
        const winner = `@${result.winner.split('@')[0]}`;
        message += `🏆 *WINNER: ${winner}!*\n\nCongratulations!`;
      }
    } else {
      const currentPlayer = `@${state.players[state.currentPlayer].split('@')[0]}`;
      const symbol = state.symbols[state.currentPlayer];
      message += `Turn: ${currentPlayer} (${symbol})`;
    }

    return message;
  }
}

// Export singleton instance
export const ticTacToe = new TicTacToe();
