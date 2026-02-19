/**
 * ALL-STAR BOT v2.0 - Message Handler
 * Processes all incoming messages and commands
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';
import { defenseEngine } from '../modules/DefenseEngine.js';
import { commandManager } from '../commands/CommandManager.js';
import moment from 'moment-timezone';

export class MessageHandler {
  constructor(botCore) {
    this.bot = botCore;
    this.logger = new Logger('MESSAGE-HANDLER');
  }

  async handleMessage(msg) {
    try {
      // Extract message info
      const messageInfo = this.extractMessageInfo(msg);
      
      if (!messageInfo) return;

      const { 
        from, 
        sender, 
        messageType, 
        messageContent, 
        isGroup, 
        groupId, 
        isCommand,
        command,
        args,
        quoted
      } = messageInfo;

      // Ignore messages from bot itself
      if (sender === this.bot.sock.user.id) return;

      // Check if sender is blacklisted
      if (db.isBlacklisted(sender.split('@')[0])) {
        this.logger.security('Blocked message from blacklisted user', sender, 'Blacklisted', 'SYSTEM');
        return;
      }

      // Check if sender is disabled
      if (db.isDisabled(sender.split('@')[0])) {
        if (isCommand) {
          await this.bot.sendMessage(from, {
            text: '❌ Anda telah kena disable oleh author.'
          });
        }
        return;
      }

      // Check bot mode (SELF/PUBLIC)
      const botMode = db.getBotMode();
      if (botMode === 'SELF') {
        const senderNumber = sender.split('@')[0];
        if (!db.isAuthor(senderNumber)) {
          if (isCommand) {
            await this.bot.sendMessage(from, {
              text: `🤖 BOT STATUS

Mode   : SELF
Status : Active

Only the author can use bot commands.`
            });
          }
          return;
        }
      }

      // Check whitelist for groups
      if (isGroup) {
        if (!db.isWhitelisted(groupId) && !db.isProtected(groupId)) {
          // Group not whitelisted or protected, ignore messages
          return;
        }

        // Check if sender is muted
        const senderNumber = sender.split('@')[0];
        if (db.isMuted(senderNumber)) {
          await this.bot.deleteMessage(from, msg.key);
          this.logger.security('Deleted message from muted user', sender, 'Muted', 'SYSTEM');
          return;
        }

        // Run defense modules if group is protected
        if (db.isProtected(groupId)) {
          const shouldBlock = await this.runDefenseModules(msg, messageInfo);
          if (shouldBlock) {
            return; // Message blocked by defense system
          }
        }
      }

      // Handle commands
      if (isCommand) {
        await this.handleCommand(msg, messageInfo);
        return;
      }

      // Check if user is in an active game (only in groups)
      if (isGroup && global.gameService) {
        const activeGame = global.gameService.getPlayerGame(sender);
        if (activeGame) {
          await this.handleGameMove(msg, messageInfo, activeGame);
        }
      }

    } catch (error) {
      this.logger.error('Error handling message:', error);
      await db.logError(error);
    }
  }

  extractMessageInfo(msg) {
    try {
      const from = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const groupId = isGroup ? from : null;

      // Extract message content
      const messageType = Object.keys(msg.message || {})[0];
      let messageContent = '';

      if (messageType === 'conversation') {
        messageContent = msg.message.conversation;
      } else if (messageType === 'extendedTextMessage') {
        messageContent = msg.message.extendedTextMessage.text;
      } else if (messageType === 'imageMessage') {
        messageContent = msg.message.imageMessage.caption || '';
      } else if (messageType === 'videoMessage') {
        messageContent = msg.message.videoMessage.caption || '';
      }

      // Check if message is a command
      const prefix = config.get('bot.prefix');
      const altPrefix = config.get('bot.alternativePrefix');
      const isCommand = messageContent.startsWith(prefix) || messageContent.startsWith(altPrefix);

      let command = '';
      let args = [];

      if (isCommand) {
        const usedPrefix = messageContent.startsWith(prefix) ? prefix : altPrefix;
        const withoutPrefix = messageContent.slice(usedPrefix.length).trim();
        const split = withoutPrefix.split(/\s+/);
        command = split[0].toLowerCase();
        args = split.slice(1);
      }

      // Get quoted message
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;

      return {
        from,
        sender,
        messageType,
        messageContent,
        isGroup,
        groupId,
        isCommand,
        command,
        args,
        quoted,
        messageKey: msg.key,
        pushName: msg.pushName || 'User'
      };

    } catch (error) {
      this.logger.error('Error extracting message info:', error);
      return null;
    }
  }

  async runDefenseModules(msg, messageInfo) {
    try {
      // Run defense engine check
      const result = await defenseEngine.checkMessage(this.bot, msg, messageInfo);
      
      if (result.blocked) {
        this.logger.warn(`Message blocked by ${result.module} for ${messageInfo.sender}`);
        return true; // Block message
      }
      
      return false; // Allow message
    } catch (error) {
      this.logger.error('Error in defense modules:', error);
      return false;
    }
  }

  async handleCommand(msg, messageInfo) {
    const { from, sender, command, args } = messageInfo;
    const senderNumber = sender.split('@')[0];

    try {
      // Check if command exists
      if (!commandManager.has(command)) {
        // Command not found, ignore silently
        return;
      }

      // Execute command through CommandManager (includes middleware)
      const success = await commandManager.execute(
        command,
        this.bot,
        msg,
        args,
        messageInfo
      );

      if (success) {
        this.logger.info(`Command executed: ${command} by ${senderNumber}`);
      }

    } catch (error) {
      this.logger.error(`Error executing command ${command}:`, error);
      
      await this.bot.sendMessage(from, {
        text: '❌ Terjadi error saat menjalankan command.'
      });
    }
  }

  // Helper method to check if user is admin in group
  async isAdmin(groupJid, userJid) {
    try {
      const metadata = await this.bot.getGroupMetadata(groupJid);
      const participant = metadata.participants.find(p => p.id === userJid);
      return participant?.admin !== null;
    } catch (error) {
      return false;
    }
  }

  // Helper method to check if bot is admin in group
  async isBotAdmin(groupJid) {
    try {
      const botJid = this.bot.sock.user.id;
      return await this.isAdmin(groupJid, botJid);
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle game move
   * @param {Object} msg - Message object
   * @param {Object} messageInfo - Message information
   * @param {Object} activeGame - Active game session
   */
  async handleGameMove(msg, messageInfo, activeGame) {
    try {
      const { from, sender, messageContent } = messageInfo;
      const { gameId, type } = activeGame;

      this.logger.info(`Processing ${type} move from ${sender}: ${messageContent}`);

      // Import the appropriate game
      let game;
      switch (type) {
        case 'TicTacToe':
          const { ticTacToe } = await import('../games/TicTacToe.js');
          game = ticTacToe;
          break;
        case 'Quiz':
          const { quiz } = await import('../games/Quiz.js');
          game = quiz;
          break;
        case 'TruthOrDare':
          const { truthOrDare } = await import('../games/TruthOrDare.js');
          game = truthOrDare;
          break;
        default:
          return;
      }

      // Process the move
      const result = await game.processMove(this.bot, gameId, sender, messageContent);

      // For TicTacToe, send board update
      if (type === 'TicTacToe' && game.formatMoveMessage) {
        const session = global.gameService.getSession(gameId);
        if (session) {
          const moveMessage = game.formatMoveMessage(session.state, result);
          await this.bot.sendMessage(from, {
            text: moveMessage,
            mentions: session.state.players
          });
        }
      }

      // For TruthOrDare, send response
      if (type === 'TruthOrDare' && game.sendResponse) {
        const session = global.gameService.getSession(gameId);
        if (session && session.state.history.length > 0) {
          const lastMove = session.state.history[session.state.history.length - 1];
          await game.sendResponse(this.bot, from, gameId, session.state, lastMove);
        }
      }

    } catch (error) {
      this.logger.error('Error handling game move:', error);
      // Don't send error to avoid spam in group
    }
  }
}