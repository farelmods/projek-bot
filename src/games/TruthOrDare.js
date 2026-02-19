/**
 * ALL-STAR BOT v2.0 - Truth or Dare Game
 * Classic Truth or Dare party game
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { GameBase } from './GameBase.js';

export class TruthOrDare extends GameBase {
  constructor() {
    super('TruthOrDare', 2, 10);
    
    // Truth questions database
    this.truths = [
      "Apa rahasia terbesar yang pernah kamu simpan?",
      "Siapa crush kamu saat ini?",
      "Apa hal paling memalukan yang pernah kamu lakukan?",
      "Kapan terakhir kali kamu berbohong dan kenapa?",
      "Apa hal yang paling kamu sesali?",
      "Siapa orang yang paling kamu kagumi?",
      "Apa mimpi terbesarmu?",
      "Apa ketakutan terbesarmu?",
      "Pernah kah kamu menyukai 2 orang sekaligus?",
      "Apa hal terburuk yang pernah kamu katakan tentang seseorang?",
      "Siapa mantan yang paling tidak bisa kamu lupakan?",
      "Apa kebiasaan burukmu yang ingin kamu hilangkan?",
      "Pernah kah kamu selingkuh?",
      "Apa yang paling kamu tidak suka dari dirimu?",
      "Siapa yang akan kamu pilih jika harus memilih di grup ini?",
      "Apa pencapaian yang paling kamu banggakan?",
      "Pernah kah kamu mengintip chat orang lain?",
      "Apa kebohongan terbesar yang pernah kamu katakan?",
      "Siapa orang terakhir yang kamu stalk di sosmed?",
      "Apa yang akan kamu lakukan jika besok adalah hari terakhirmu?"
    ];

    // Dare challenges database
    this.dares = [
      "Kirim voice note dengan suara lucu",
      "Ubah nama grup menjadi sesuatu yang lucu selama 1 jam",
      "Kirim foto selfie dengan ekspresi paling aneh",
      "Telepon orang tua dan bilang kamu cinta mereka",
      "Posting status 'Aku ganteng/cantik banget' dan biarkan 1 jam",
      "Kirim pesan ke crush kamu: 'Lagi apa?'",
      "Bernyanyi lagu favorit dan kirim voice note",
      "Kirim sticker paling cringe yang kamu punya",
      "Chat mantan dan tanya 'Lagi sama siapa sekarang?'",
      "Ubah PP WA kamu dengan foto masa kecil selama 1 hari",
      "Ceritakan joke paling tidak lucu yang kamu tahu",
      "Tirukan suara hewan dan kirim voice note",
      "Kirim pesan random 'I love you' ke 3 kontak",
      "Dance dan kirim videonya",
      "Kirim foto terakhir di gallery kamu",
      "Bilang 'Aku sayang kamu' ke 5 orang di grup ini",
      "Traktir semua orang di grup ini (virtual)",
      "Posting twit/story 'Siapa yang mau jadi pacar aku?'",
      "Chat gebetan dan tanya 'Udah makan belum?'",
      "Kirim meme paling lucu yang kamu punya"
      "Chat crush mu,dan kirim bukti nya ke grup"
    ];
  }

  /**
   * Initialize game state
   * @param {Array} players - Player JIDs
   * @returns {Promise<Object>} Initial state
   */
  async initialize(players) {
    // Shuffle players for turn order
    const shuffledPlayers = [...players].sort(() => 0.5 - Math.random());
    
    return {
      players: shuffledPlayers,
      currentPlayer: 0,
      rounds: 0,
      maxRounds: players.length * 2, // 2 turns per player
      history: [],
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
    const playerMentions = players.map(p => `@${p.split('@')[0]}`).join(', ');

    const message = `🎭 *TRUTH OR DARE STARTED!*

Players: ${playerMentions}

Get ready for some fun! 😈

Game will start in 3 seconds...`;

    await bot.sendMessage(groupId, {
      text: message,
      mentions: players
    });

    // Start first turn
    setTimeout(async () => {
      await this.startTurn(bot, groupId, gameId);
    }, 3000);
  }

  /**
   * Start player's turn
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {string} gameId - Game ID
   */
  async startTurn(bot, groupId, gameId) {
    const session = global.gameService?.getSession(gameId);
    if (!session) return;

    const state = session.state;
    const currentPlayerJid = state.players[state.currentPlayer];
    const playerMention = `@${currentPlayerJid.split('@')[0]}`;

    const message = `🎯 *YOUR TURN!*

${playerMention}, pilih:

🗣️ Truth - Jawab pertanyaan jujur
😈 Dare - Lakukan tantangan

Reply dengan: truth atau dare`;

    await bot.sendMessage(groupId, {
      text: message,
      mentions: [currentPlayerJid]
    });
  }

  /**
   * Validate move (choice: truth or dare)
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {string} move - Choice (truth/dare)
   * @returns {Promise<boolean>} Is valid
   */
  async validateMove(state, playerJid, move) {
    // Check if it's player's turn
    const currentPlayerJid = state.players[state.currentPlayer];
    if (playerJid !== currentPlayerJid) {
      return false;
    }

    // Check if valid choice
    const choice = move.toLowerCase();
    return choice === 'truth' || choice === 'dare';
  }

  /**
   * Apply move (give truth/dare)
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {string} move - Choice
   * @returns {Promise<Object>} New state
   */
  async applyMove(state, playerJid, move) {
    const choice = move.toLowerCase();
    const item = choice === 'truth' 
      ? this.getRandomTruth()
      : this.getRandomDare();

    // Record in history
    state.history.push({
      player: playerJid,
      choice,
      item,
      round: state.rounds
    });

    // Move to next player
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
    state.rounds++;

    return state;
  }

  /**
   * Get random truth question
   * @returns {string} Truth question
   */
  getRandomTruth() {
    return this.truths[Math.floor(Math.random() * this.truths.length)];
  }

  /**
   * Get random dare challenge
   * @returns {string} Dare challenge
   */
  getRandomDare() {
    return this.dares[Math.floor(Math.random() * this.dares.length)];
  }

  /**
   * Check game result
   * @param {Object} state - Current state
   * @returns {Promise<Object>} Result
   */
  async checkResult(state) {
    if (state.rounds >= state.maxRounds) {
      return {
        gameOver: true,
        winner: null,
        draw: true
      };
    }

    return {
      gameOver: false,
      winner: null,
      draw: false
    };
  }

  /**
   * Format game response
   * @param {Object} state - Current state
   * @param {Object} lastMove - Last move made
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {string} gameId - Game ID
   */
  async sendResponse(bot, groupId, gameId, state, lastMove) {
    const playerMention = `@${lastMove.player.split('@')[0]}`;
    const emoji = lastMove.choice === 'truth' ? '🗣️' : '😈';

    let message = `${emoji} *${lastMove.choice.toUpperCase()}*\n\n`;
    message += `${playerMention}, ${lastMove.item}`;

    await bot.sendMessage(groupId, {
      text: message,
      mentions: [lastMove.player]
    });

    // Check if game over
    const result = await this.checkResult(state);
    
    if (result.gameOver) {
      await this.endGame(bot, groupId, gameId, state);
    } else {
      // Next turn after 5 seconds
      setTimeout(async () => {
        await this.startTurn(bot, groupId, gameId);
      }, 5000);
    }
  }

  /**
   * End game
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {string} gameId - Game ID
   * @param {Object} state - Game state
   */
  async endGame(bot, groupId, gameId, state) {
    let message = `🎭 *TRUTH OR DARE ENDED!*\n\n`;
    message += `Total rounds: ${state.rounds}\n\n`;
    message += `Thanks for playing! 🎉\n\n`;
    message += `Game summary:\n`;
    
    const truthCount = state.history.filter(h => h.choice === 'truth').length;
    const dareCount = state.history.filter(h => h.choice === 'dare').length;
    
    message += `🗣️ Truths: ${truthCount}\n`;
    message += `😈 Dares: ${dareCount}`;

    await bot.sendMessage(groupId, { text: message });

    global.gameService?.endSession(gameId, 'completed');
  }

  /**
   * Get instructions
   * @returns {string} Instructions
   */
  getInstructions() {
    return `🎭 *TRUTH OR DARE*

How to play:
1. Game dimainkan secara bergantian
2. Setiap giliran, pilih Truth atau Dare
3. Truth: Jawab pertanyaan dengan jujur
4. Dare: Lakukan tantangan yang diberikan
5. Game berlanjut sampai semua dapat giliran

Rules:
• Jawab/lakukan dengan jujur
• No skip!
• Have fun! 😄

Start game: .truthordare atau .tod`;
  }

  /**
   * Add custom truth
   * @param {string} truth - Truth question
   */
  addTruth(truth) {
    this.truths.push(truth);
  }

  /**
   * Add custom dare
   * @param {string} dare - Dare challenge
   */
  addDare(dare) {
    this.dares.push(dare);
  }
}

// Export singleton instance
export const truthOrDare = new TruthOrDare();
