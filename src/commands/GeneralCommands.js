/**
 * ALL-STAR BOT v2.0 - General Commands
 * Commands available to all users
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';
import moment from 'moment-timezone';

const logger = new Logger('GENERAL-COMMANDS');

/**
 * Menu/Start Command - Show bot menu
 */
export const menu = async (bot, msg, args, messageInfo) => {
  const { from, sender } = messageInfo;
  const senderNumber = sender.split('@')[0];
  
  const isAuthor = db.isAuthor(senderNumber);
  const isOwner = db.isOwner(senderNumber);
  
  const defenseMode = db.getDefenseMode();
  const uptime = global.systemMonitor ? global.systemMonitor.getUptime() : '0s';

  let message = `╔══════════════════════════╗
║        👑 ALL-STAR        ║
╠══════════════════════════╣
║ 👑 Author      : ${config.get('bot.author.name')}
║ 💬 Bot Mode    : ${db.getBotMode()}
║ 🛡 Defense     : ${defenseMode}
║ 📦 Version     : v${config.get('bot.version')}
║ ⚡ Status      : Online
║ ⏳ Uptime      : ${uptime}
╠══════════════════════════╣
║ 📖 Description :
║ ALL-STAR adalah sistem
║ keamanan & moderasi pintar
║ yang dirancang untuk menjaga
║ stabilitas dan ketertiban grup.
╚══════════════════════════╝

`;

  if (isAuthor) {
    message += `╔═══〔 👑 Author Commands 〕═══╗
║ ${config.get('bot.prefix')}menu - Show this menu
║ ${config.get('bot.prefix')}botinfo - System status
║ ${config.get('bot.prefix')}addowner - Add owner
║ ${config.get('bot.prefix')}delowner - Remove owner
║ ${config.get('bot.prefix')}adddefense - Protect group
║ ${config.get('bot.prefix')}addshare - Add share target
║ ${config.get('bot.prefix')}self - Self mode
║ ${config.get('bot.prefix')}public - Public mode
║ ${config.get('bot.prefix')}defense <mode> - Change defense
║ ${config.get('bot.prefix')}disable - Disable user
║ ${config.get('bot.prefix')}undisable - Enable user
║ ${config.get('bot.prefix')}share <msg> - Broadcast
║ ${config.get('bot.prefix')}restart - Restart bot
╚══════════════════════════╝

`;
  }

  if (isOwner || isAuthor) {
    message += `╔═══〔 🔧 Owner Commands 〕═══╗
║ ${config.get('bot.prefix')}mute - Mute user
║ ${config.get('bot.prefix')}unmute - Unmute user
║ ${config.get('bot.prefix')}warn - Warn user
║ ${config.get('bot.prefix')}kick - Kick user
║ ${config.get('bot.prefix')}promote - Make admin
║ ${config.get('bot.prefix')}demote - Remove admin
║ ${config.get('bot.prefix')}blacklist - Blacklist user
║ ${config.get('bot.prefix')}on <feature> - Enable feature
║ ${config.get('bot.prefix')}off <feature> - Disable feature
║ ${config.get('bot.prefix')}info-grup - Group info
╚══════════════════════════╝

`;
  }

  message += `╔═══〔 🎮 General Commands 〕═══╗
║ ${config.get('bot.prefix')}intro - Introduction format
║ ${config.get('bot.prefix')}ai <question> - Ask AI
║ ${config.get('bot.prefix')}quotes - Random quote
║ ${config.get('bot.prefix')}ping - Check latency
╚══════════════════════════╝

⚡ Bot by @Liand_fullstackdev`;

  await bot.sendMessage(from, { text: message });
};

// Alias for menu
export const start = menu;
export const help = menu;

/**
 * Ping Command - Check bot latency
 */
export const ping = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;
  
  const start = Date.now();
  const sent = await bot.sendMessage(from, { text: '🏓 Pinging...' });
  const latency = Date.now() - start;

  await bot.sendMessage(from, {
    text: `🏓 *PONG!*\n\nLatency: ${latency}ms\nStatus: ${latency < 100 ? '🟢 Excellent' : latency < 300 ? '🟡 Good' : '🔴 Slow'}`,
    edit: sent.key
  });
};

/**
 * Intro Command - Show introduction format
 */
export const intro = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  const message = `╔══════════════════════╗
       『  INTRO 』
╚══════════════════════╝

➤ Nama Lengkap :
➤ Nama Panggilan :
➤ Umur :
➤ Kota :
➤ Hobi :
➤ Alasan Join :

Silakan isi format di atas untuk memperkenalkan diri! 😊`;

  await bot.sendMessage(from, { text: message });
};

/**
 * AI Command - Ask Claude AI
 */
export const ai = async (bot, msg, args, messageInfo) => {
  const { from, sender } = messageInfo;

  if (!config.get('ai.enabled')) {
    await bot.sendMessage(from, {
      text: '❌ Fitur AI saat ini tidak aktif.'
    });
    return;
  }

  const question = args.join(' ');

  if (!question) {
    await bot.sendMessage(from, {
      text: `❌ *AI COMMAND*\n\nUsage: ${config.get('bot.prefix')}ai <pertanyaan>\n\nContoh: ${config.get('bot.prefix')}ai Apa itu programming?`
    });
    return;
  }

  // Send typing indicator
  await bot.sendMessage(from, { text: '🤖 AI sedang berpikir...' });

  try {
    // Import AI service dynamically
    const { aiService } = await import('../services/AIService.js');
    
    const senderNumber = sender.split('@')[0];
    const response = await aiService.chat(question, senderNumber);

    await bot.sendMessage(from, {
      text: `🤖 *CLAUDE AI*\n\n${response}\n\n_Powered by Anthropic_`
    });

  } catch (error) {
    logger.error('AI command error:', error);
    
    let errorMessage = '❌ Terjadi error saat memproses pertanyaan.';
    
    if (error.message.includes('rate limit')) {
      errorMessage = '⏳ Rate limit reached. Tunggu beberapa saat.';
    } else if (error.message.includes('API key')) {
      errorMessage = '❌ AI service tidak dikonfigurasi dengan benar.';
    }

    await bot.sendMessage(from, { text: errorMessage });
  }
};

/**
 * Quotes Command - Get random inspirational quote
 */
export const quotes = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  if (!config.get('features.quotes')) {
    await bot.sendMessage(from, {
      text: '❌ Fitur quotes saat ini tidak aktif.'
    });
    return;
  }

  await bot.sendMessage(from, { text: '📖 Mengambil quote...' });

  try {
    // Import quote service dynamically
    const { quoteService } = await import('../services/QuoteService.js');
    
    const quote = await quoteService.getRandomQuote();

    const message = `📖 *QUOTE OF THE DAY*\n\n"${quote.text}"\n\n— ${quote.author}`;

    await bot.sendMessage(from, { text: message });

  } catch (error) {
    logger.error('Quotes command error:', error);
    await bot.sendMessage(from, {
      text: '❌ Gagal mengambil quote. Coba lagi nanti.'
    });
  }
};

/**
 * Game Command - Show available games
 */
export const game = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  if (!config.get('features.game')) {
    await bot.sendMessage(from, {
      text: '❌ Fitur game saat ini tidak aktif.'
    });
    return;
  }

  const message = `🎮 *AVAILABLE GAMES*

1. Tic Tac Toe
   ${config.get('bot.prefix')}tictactoe @user

2. Truth or Dare
   ${config.get('bot.prefix')}tod

3. Quiz
   ${config.get('bot.prefix')}quiz

4. Trivia
   ${config.get('bot.prefix')}trivia

Pilih game dan mainkan bersama teman! 🎲`;

  await bot.sendMessage(from, { text: message });
};

/**
 * Download Music Command
 */
export const downloadMusic = {
  name: 'download-music',
  aliases: ['dlmusic', 'music'],
  execute: async (bot, msg, args, messageInfo) => {
    const { from } = messageInfo;

    if (!config.get('features.downloadMusic')) {
      await bot.sendMessage(from, {
        text: '❌ Fitur download music saat ini tidak aktif.'
      });
      return;
    }

    if (args.length === 0) {
      await bot.sendMessage(from, {
        text: `❌ *DOWNLOAD MUSIC*\n\nUsage: ${config.get('bot.prefix')}download-music <url>\n\nSupported: YouTube, Spotify, SoundCloud`
      });
      return;
    }

    const url = args[0];

    await bot.sendMessage(from, { 
      text: '🎵 Mendownload music...\n\nMohon tunggu, proses mungkin memakan waktu beberapa saat.' 
    });

    try {
      const { downloadService } = await import('../services/DownloadService.js');
      
      const result = await downloadService.downloadMusic(url);

      await bot.sendAudioMessage(from, result.buffer);
      
      logger.info(`Music downloaded: ${url}`);

    } catch (error) {
      logger.error('Download music error:', error);
      await bot.sendMessage(from, {
        text: '❌ Gagal mendownload music. Pastikan URL valid.'
      });
    }
  }
};

/**
 * Download TikTok Command
 */
export const downloadTiktok = {
  name: 'download-tiktok',
  aliases: ['dltiktok', 'tiktok', 'tt'],
  execute: async (bot, msg, args, messageInfo) => {
    const { from } = messageInfo;

    if (!config.get('features.downloadTiktok')) {
      await bot.sendMessage(from, {
        text: '❌ Fitur download TikTok saat ini tidak aktif.'
      });
      return;
    }

    if (args.length === 0) {
      await bot.sendMessage(from, {
        text: `❌ *DOWNLOAD TIKTOK*\n\nUsage: ${config.get('bot.prefix')}download-tiktok <url>\n\nDownload video TikTok tanpa watermark.`
      });
      return;
    }

    const url = args[0];

    await bot.sendMessage(from, { 
      text: '📹 Mendownload video TikTok...\n\nMohon tunggu.' 
    });

    try {
      const { downloadService } = await import('../services/DownloadService.js');
      
      const result = await downloadService.downloadTiktok(url);

      await bot.sendVideoMessage(from, result.buffer, result.caption);
      
      logger.info(`TikTok downloaded: ${url}`);

    } catch (error) {
      logger.error('Download TikTok error:', error);
      await bot.sendMessage(from, {
        text: '❌ Gagal mendownload video. Pastikan URL TikTok valid.'
      });
    }
  }
};

/**
 * Brat Sticker Command
 */
export const brat = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  if (!config.get('features.sticker')) {
    await bot.sendMessage(from, {
      text: '❌ Fitur sticker saat ini tidak aktif.'
    });
    return;
  }

  const text = args.join(' ');

  if (!text) {
    await bot.sendMessage(from, {
      text: `❌ *BRAT STICKER*\n\nUsage: ${config.get('bot.prefix')}brat <text>\n\nContoh: ${config.get('bot.prefix')}brat Hello World`
    });
    return;
  }

  await bot.sendMessage(from, { text: '🎨 Membuat sticker...' });

  try {
    const { stickerService } = await import('../services/StickerService.js');
    
    const sticker = await stickerService.createBratSticker(text);

    await bot.sendStickerMessage(from, sticker);
    
    logger.info(`Brat sticker created: ${text}`);

  } catch (error) {
    logger.error('Brat sticker error:', error);
    await bot.sendMessage(from, {
      text: '❌ Gagal membuat sticker.'
    });
  }
};

/**
 * Info Command - General bot info
 */
export const info = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  const message = `ℹ️ *ALL-STAR BOT INFO*

Version: ${config.get('bot.version')}
Author: ${config.get('bot.author.name')}
Created by: @Liand_fullstackdev

ALL-STAR adalah bot WhatsApp enterprise-grade untuk keamanan dan moderasi grup.

Features:
• 3-Level Defense System
• AI Integration (Claude)
• Auto Moderation
• Real-time Monitoring
• Advanced Security

Type ${config.get('bot.prefix')}menu untuk daftar command.`;

  await bot.sendMessage(from, { text: message });
};

/**
 * TicTacToe Game Command
 */
export const tictactoe = async (bot, msg, args, messageInfo) => {
  const { from, sender, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Game hanya bisa dimainkan di grup.'
    });
    return;
  }

  // Import game dynamically
  const { ticTacToe } = await import('../games/TicTacToe.js');

  // Get player 2 from args or quoted message
  let player2 = null;
  
  if (messageInfo.quoted && messageInfo.quoted.participant) {
    player2 = messageInfo.quoted.participant;
  } else if (args.length > 0) {
    const mention = args[0].replace('@', '').replace(/\D/g, '');
    player2 = mention + '@s.whatsapp.net';
  }

  if (!player2) {
    await bot.sendMessage(from, {
      text: `❌ *TIC TAC TOE*\n\nUsage: ${config.get('bot.prefix')}tictactoe @player2\n\nAtau reply pesan player 2`
    });
    return;
  }

  try {
    const gameId = await ticTacToe.start(bot, groupId, [sender, player2]);
    logger.info(`TicTacToe game started: ${gameId}`);
  } catch (error) {
    logger.error('TicTacToe start error:', error);
    await bot.sendMessage(from, {
      text: `❌ Error: ${error.message}`
    });
  }
};

/**
 * Quiz Game Command
 */
export const quizGame = {
  name: 'quiz',
  execute: async (bot, msg, args, messageInfo) => {
    const { from, sender, isGroup, groupId } = messageInfo;

    if (!isGroup) {
      await bot.sendMessage(from, {
        text: '❌ Quiz hanya bisa dimainkan di grup.'
      });
      return;
    }

    const { quiz } = await import('../games/Quiz.js');

    try {
      const gameId = await quiz.start(bot, groupId, [sender]);
      logger.info(`Quiz game started: ${gameId}`);
    } catch (error) {
      logger.error('Quiz start error:', error);
      await bot.sendMessage(from, {
        text: `❌ Error: ${error.message}`
      });
    }
  }
};

/**
 * Truth or Dare Game Command
 */
export const truthordare = async (bot, msg, args, messageInfo) => {
  const { from, sender, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Truth or Dare hanya bisa dimainkan di grup.'
    });
    return;
  }

  const { truthOrDare } = await import('../games/TruthOrDare.js');

  // Get all participants mentioned or current participants
  const players = [sender];
  
  // Add more players from mentions if any
  const mentions = args.filter(arg => arg.startsWith('@'));
  mentions.forEach(mention => {
    const number = mention.replace('@', '').replace(/\D/g, '');
    const jid = number + '@s.whatsapp.net';
    if (!players.includes(jid)) {
      players.push(jid);
    }
  });

  if (players.length < 2) {
    await bot.sendMessage(from, {
      text: `❌ *TRUTH OR DARE*\n\nMinimal 2 pemain!\n\nUsage: ${config.get('bot.prefix')}truthordare @player2 @player3 ...`
    });
    return;
  }

  try {
    const gameId = await truthOrDare.start(bot, groupId, players);
    logger.info(`Truth or Dare game started: ${gameId}`);
  } catch (error) {
    logger.error('Truth or Dare start error:', error);
    await bot.sendMessage(from, {
      text: `❌ Error: ${error.message}`
    });
  }
};

// Alias for truthordare
export const tod = truthordare;