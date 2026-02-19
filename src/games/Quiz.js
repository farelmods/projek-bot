/**
 * ALL-STAR BOT v2.0 - Quiz Game
 * Interactive quiz game with multiple choice questions
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { GameBase } from './GameBase.js';

export class Quiz extends GameBase {
  constructor() {
    super('Quiz', 1, 10);
    
    // Quiz questions database
    this.questions = [
      {
        question: "Apa ibukota Indonesia?",
        options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
        correct: 0,
        category: "geography"
      },
      {
        question: "Siapa presiden pertama Indonesia?",
        options: ["Soekarno", "Soeharto", "Habibie", "Megawati"],
        correct: 0,
        category: "history"
      },
      {
        question: "Berapa hasil dari 15 + 27?",
        options: ["40", "42", "43", "45"],
        correct: 1,
        category: "math"
      },
      {
        question: "Bahasa pemrograman apa yang digunakan untuk web development?",
        options: ["Python", "JavaScript", "C++", "Java"],
        correct: 1,
        category: "technology"
      },
      {
        question: "Planet terdekat dengan matahari adalah?",
        options: ["Venus", "Mars", "Merkurius", "Bumi"],
        correct: 2,
        category: "science"
      },
      {
        question: "Berapa jumlah provinsi di Indonesia?",
        options: ["34", "35", "36", "38"],
        correct: 3,
        category: "geography"
      },
      {
        question: "Siapa penemu bola lampu?",
        options: ["Newton", "Einstein", "Edison", "Tesla"],
        correct: 2,
        category: "history"
      },
      {
        question: "Apa singkatan dari HTML?",
        options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language"],
        correct: 0,
        category: "technology"
      },
      {
        question: "Berapa hasil dari 8 x 9?",
        options: ["63", "72", "81", "90"],
        correct: 1,
        category: "math"
      },
      {
        question: "Negara manakah yang memiliki populasi terbanyak?",
        options: ["India", "China", "USA", "Indonesia"],
        correct: 0,
        category: "geography"
      }
    ];
  }

  /**
   * Initialize game state
   * @param {Array} players - Player JIDs
   * @returns {Promise<Object>} Initial state
   */
  async initialize(players) {
    // Select random questions
    const selectedQuestions = this.selectRandomQuestions(5);
    
    return {
      players: players,
      questions: selectedQuestions,
      currentQuestion: 0,
      scores: players.reduce((acc, player) => {
        acc[player] = 0;
        return acc;
      }, {}),
      answers: {},
      status: 'playing',
      timeLimit: 30 // seconds per question
    };
  }

  /**
   * Select random questions
   * @param {number} count - Number of questions
   * @returns {Array} Selected questions
   */
  selectRandomQuestions(count) {
    const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, this.questions.length));
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

    const message = `🎯 *QUIZ GAME STARTED!*

Players: ${playerMentions}
Questions: 5
Time per question: 30 seconds

Get ready! First question coming up...`;

    await bot.sendMessage(groupId, {
      text: message,
      mentions: players
    });

    // Send first question after 3 seconds
    setTimeout(async () => {
      await this.sendQuestion(bot, groupId, gameId);
    }, 3000);
  }

  /**
   * Send current question
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {string} gameId - Game ID
   */
  async sendQuestion(bot, groupId, gameId) {
    const session = global.gameService?.getSession(gameId);
    if (!session) return;

    const state = session.state;
    const question = state.questions[state.currentQuestion];

    if (!question) {
      // Quiz completed
      await this.endQuiz(bot, groupId, gameId);
      return;
    }

    const questionNumber = state.currentQuestion + 1;
    const totalQuestions = state.questions.length;

    let message = `❓ *QUESTION ${questionNumber}/${totalQuestions}*\n\n`;
    message += `${question.question}\n\n`;
    
    question.options.forEach((option, index) => {
      message += `${String.fromCharCode(65 + index)}. ${option}\n`;
    });

    message += `\n⏱️ Time limit: ${state.timeLimit} seconds`;
    message += `\n\nReply dengan huruf pilihan (A/B/C/D)`;

    await bot.sendMessage(groupId, { text: message });

    // Set timeout for question
    setTimeout(async () => {
      await this.nextQuestion(bot, groupId, gameId);
    }, state.timeLimit * 1000);
  }

  /**
   * Validate move (answer)
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {string} move - Answer (A/B/C/D)
   * @returns {Promise<boolean>} Is valid
   */
  async validateMove(state, playerJid, move) {
    // Check if player already answered current question
    const questionKey = `q${state.currentQuestion}`;
    if (state.answers[playerJid]?.[questionKey]) {
      return false;
    }

    // Check if valid answer
    const answer = move.toUpperCase();
    return ['A', 'B', 'C', 'D'].includes(answer);
  }

  /**
   * Apply move (record answer)
   * @param {Object} state - Current state
   * @param {string} playerJid - Player JID
   * @param {string} move - Answer
   * @returns {Promise<Object>} New state
   */
  async applyMove(state, playerJid, move) {
    const questionKey = `q${state.currentQuestion}`;
    const answerIndex = move.toUpperCase().charCodeAt(0) - 65;
    const question = state.questions[state.currentQuestion];
    const isCorrect = answerIndex === question.correct;

    // Record answer
    if (!state.answers[playerJid]) {
      state.answers[playerJid] = {};
    }
    state.answers[playerJid][questionKey] = {
      answer: answerIndex,
      correct: isCorrect,
      timestamp: Date.now()
    };

    // Update score if correct
    if (isCorrect) {
      state.scores[playerJid]++;
    }

    return state;
  }

  /**
   * Move to next question
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {string} gameId - Game ID
   */
  async nextQuestion(bot, groupId, gameId) {
    const session = global.gameService?.getSession(gameId);
    if (!session) return;

    const state = session.state;
    
    // Show answer for current question
    await this.showAnswer(bot, groupId, state);

    // Move to next question
    state.currentQuestion++;
    global.gameService?.updateState(gameId, state);

    // Small delay before next question
    setTimeout(async () => {
      if (state.currentQuestion < state.questions.length) {
        await this.sendQuestion(bot, groupId, gameId);
      } else {
        await this.endQuiz(bot, groupId, gameId);
      }
    }, 3000);
  }

  /**
   * Show answer for current question
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {Object} state - Game state
   */
  async showAnswer(bot, groupId, state) {
    const question = state.questions[state.currentQuestion];
    const correctAnswer = String.fromCharCode(65 + question.correct);

    let message = `✅ *CORRECT ANSWER*\n\n`;
    message += `${correctAnswer}. ${question.options[question.correct]}\n\n`;

    // Show who answered correctly
    const correctPlayers = [];
    for (const [playerJid, answers] of Object.entries(state.answers)) {
      const questionKey = `q${state.currentQuestion}`;
      if (answers[questionKey]?.correct) {
        correctPlayers.push(playerJid);
      }
    }

    if (correctPlayers.length > 0) {
      message += `🎉 Correct: ${correctPlayers.map(p => `@${p.split('@')[0]}`).join(', ')}`;
    } else {
      message += `😔 No one got it right!`;
    }

    await bot.sendMessage(groupId, {
      text: message,
      mentions: correctPlayers
    });
  }

  /**
   * End quiz and show results
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group ID
   * @param {string} gameId - Game ID
   */
  async endQuiz(bot, groupId, gameId) {
    const session = global.gameService?.getSession(gameId);
    if (!session) return;

    const state = session.state;

    // Sort players by score
    const rankings = Object.entries(state.scores)
      .sort((a, b) => b[1] - a[1])
      .map(([playerJid, score]) => ({
        player: playerJid,
        score
      }));

    let message = `🏆 *QUIZ RESULTS*\n\n`;
    
    rankings.forEach((rank, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
      const player = `@${rank.player.split('@')[0]}`;
      message += `${medal} ${player}: ${rank.score}/${state.questions.length}\n`;
    });

    message += `\n🎉 Congratulations to all players!`;

    await bot.sendMessage(groupId, {
      text: message,
      mentions: rankings.map(r => r.player)
    });

    global.gameService?.endSession(gameId, 'completed');
  }

  /**
   * Check game result
   * @param {Object} state - Current state
   * @returns {Promise<Object>} Result
   */
  async checkResult(state) {
    // Quiz doesn't end until all questions answered
    // Handled by nextQuestion and endQuiz
    return {
      gameOver: false,
      winner: null,
      draw: false
    };
  }

  /**
   * Get instructions
   * @returns {string} Instructions
   */
  getInstructions() {
    return `🎯 *QUIZ GAME*

How to play:
1. Quiz dimainkan bersama-sama di grup
2. Setiap pertanyaan memiliki 4 pilihan (A, B, C, D)
3. Reply dengan huruf pilihan Anda
4. Waktu per pertanyaan: 30 detik
5. Yang menjawab paling banyak benar menang!

Categories:
• Geography
• History
• Math
• Technology
• Science

Start quiz: .quiz`;
  }

  /**
   * Add custom question
   * @param {Object} question - Question object
   */
  addQuestion(question) {
    this.questions.push(question);
  }
}

// Export singleton instance
export const quiz = new Quiz();
