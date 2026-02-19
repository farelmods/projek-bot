/**
 * ALL-STAR BOT v2.0 - Bot Core
 * Main bot engine and connection handler
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import readline from 'readline';
import chalk from 'chalk';
import moment from 'moment-timezone';

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { GroupHandler } from '../handlers/GroupHandler.js';
import { ConnectionHandler } from '../handlers/ConnectionHandler.js';

export class BotCore {
  constructor() {
    this.logger = new Logger('BOT-CORE');
    this.sock = null;
    this.store = null;
    this.msgCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.get('session.maxReconnectAttempts');
    this.pairingCode = null;
    this.handlers = {};
  }

  async initialize() {
    try {
      this.logger.info('Initializing Bot Core...');

      // Initialize database
      await db.initialize();
      this.logger.info('✅ Database initialized');

      // Initialize message store
      this.store = makeInMemoryStore({ 
        logger: pino({ level: 'silent' })
      });
      this.logger.info('✅ Message store initialized');

      // Initialize handlers
      this.messageHandler = new MessageHandler(this);
      this.groupHandler = new GroupHandler(this);
      this.connectionHandler = new ConnectionHandler(this);
      this.logger.info('✅ Handlers initialized');

      this.logger.info('Bot Core initialization complete');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize bot core:', error);
      throw error;
    }
  }

  async start() {
    try {
      this.logger.info('Starting bot connection...');

      // Get authentication state
      const { state, saveCreds } = await useMultiFileAuthState(
        config.get('paths.session')
      );

      // Get latest Baileys version
      const { version, isLatest } = await fetchLatestBaileysVersion();
      this.logger.info(`Using WA version: ${version.join('.')}, isLatest: ${isLatest}`);

      // Create socket connection
      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !config.get('pairing.enabled'),
        browser: Browsers.ubuntu('Chrome'),
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
          const msg = await this.store.loadMessage(key.remoteJid, key.id);
          return msg?.message || { conversation: '' };
        },
        markOnlineOnConnect: true,
        syncFullHistory: false,
        defaultQueryTimeoutMs: config.get('session.requestTimeout'),
        retryRequestDelayMs: config.get('session.reconnectInterval')
      });

      // Bind store to socket
      this.store?.bind(this.sock.ev);

      // Setup pairing code if enabled
      if (config.get('pairing.enabled') && !this.sock.authState.creds.registered) {
        await this.setupPairingCode();
      }

      // Setup event handlers
      this.setupEventHandlers(saveCreds);

      return true;
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async setupPairingCode() {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log(chalk.yellow('\n🔐 Pairing Code Mode'));
      console.log(chalk.cyan('📱 Please enter your WhatsApp number:'));
      console.log(chalk.gray('   Format: 62812345678910 (without + or spaces)\n'));

      rl.question(chalk.white('Number: '), async (phoneNumber) => {
        rl.close();

        phoneNumber = phoneNumber.trim().replace(/[^0-9]/g, '');

        if (!phoneNumber) {
          console.log(chalk.red('❌ Invalid phone number'));
          process.exit(1);
        }

        if (!phoneNumber.startsWith('62')) {
          console.log(chalk.red('❌ Number must start with 62 (Indonesia)'));
          process.exit(1);
        }

        try {
          console.log(chalk.blue('\n⏳ Requesting pairing code...'));
          
          const code = await this.sock.requestPairingCode(phoneNumber);
          this.pairingCode = code;

          console.log(chalk.green('\n✅ Pairing Code Generated!'));
          console.log(chalk.yellow('━'.repeat(50)));
          console.log(chalk.white.bold(`   YOUR PAIRING CODE: ${chalk.cyan.bold(code)}`));
          console.log(chalk.yellow('━'.repeat(50)));
          console.log(chalk.gray('\n📝 Instructions:'));
          console.log(chalk.gray('   1. Open WhatsApp on your phone'));
          console.log(chalk.gray('   2. Go to Settings > Linked Devices'));
          console.log(chalk.gray('   3. Tap "Link a Device"'));
          console.log(chalk.gray('   4. Select "Link with phone number instead"'));
          console.log(chalk.gray('   5. Enter the code above'));
          console.log(chalk.gray('\n⏳ Waiting for connection...\n'));

          this.logger.info(`Pairing code generated for ${phoneNumber}: ${code}`);
        } catch (error) {
          console.log(chalk.red('\n❌ Failed to generate pairing code'));
          console.log(chalk.red(`Error: ${error.message}`));
          this.logger.error('Pairing code generation failed:', error);
          process.exit(1);
        }
      });
    } catch (error) {
      this.logger.error('Pairing code setup failed:', error);
      throw error;
    }
  }

  setupEventHandlers(saveCreds) {
    // Connection updates
    this.sock.ev.on('connection.update', async (update) => {
      await this.connectionHandler.handleConnectionUpdate(update, saveCreds);
    });

    // Credentials update
    this.sock.ev.on('creds.update', saveCreds);

    // Messages
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const msg of messages) {
          await this.messageHandler.handleMessage(msg);
        }
      }
    });

    // Group updates
    this.sock.ev.on('group-participants.update', async (update) => {
      await this.groupHandler.handleParticipantsUpdate(update);
    });

    // Group metadata updates
    this.sock.ev.on('groups.update', async (updates) => {
      await this.groupHandler.handleGroupUpdate(updates);
    });

    this.logger.info('Event handlers registered');
  }

  async sendMessageToAuthor(text) {
    try {
      const authorNumber = config.get('bot.author.number') + '@s.whatsapp.net';
      await this.sendMessage(authorNumber, { text });
      return true;
    } catch (error) {
      this.logger.error('Failed to send message to author:', error);
      return false;
    }
  }

  async sendMessage(jid, content, options = {}) {
    try {
      return await this.sock.sendMessage(jid, content, options);
    } catch (error) {
      this.logger.error(`Failed to send message to ${jid}:`, error);
      throw error;
    }
  }

  async sendTextMessage(jid, text) {
    return await this.sendMessage(jid, { text });
  }

  async sendImageMessage(jid, imageBuffer, caption = '') {
    return await this.sendMessage(jid, {
      image: imageBuffer,
      caption
    });
  }

  async sendVideoMessage(jid, videoBuffer, caption = '') {
    return await this.sendMessage(jid, {
      video: videoBuffer,
      caption
    });
  }

  async sendAudioMessage(jid, audioBuffer) {
    return await this.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: 'audio/mp4'
    });
  }

  async sendStickerMessage(jid, stickerBuffer) {
    return await this.sendMessage(jid, {
      sticker: stickerBuffer
    });
  }

  async sendDocumentMessage(jid, documentBuffer, filename, mimetype) {
    return await this.sendMessage(jid, {
      document: documentBuffer,
      fileName: filename,
      mimetype
    });
  }

  async deleteMessage(jid, messageKey) {
    try {
      await this.sock.sendMessage(jid, { delete: messageKey });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete message:', error);
      return false;
    }
  }

  async reactToMessage(jid, messageKey, emoji) {
    try {
      await this.sock.sendMessage(jid, {
        react: {
          text: emoji,
          key: messageKey
        }
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to react to message:', error);
      return false;
    }
  }

  async getGroupMetadata(groupJid) {
    try {
      return await this.sock.groupMetadata(groupJid);
    } catch (error) {
      this.logger.error('Failed to get group metadata:', error);
      return null;
    }
  }

  async getGroupParticipants(groupJid) {
    try {
      const metadata = await this.getGroupMetadata(groupJid);
      return metadata?.participants || [];
    } catch (error) {
      this.logger.error('Failed to get group participants:', error);
      return [];
    }
  }

  async kickParticipant(groupJid, participants) {
    try {
      await this.sock.groupParticipantsUpdate(groupJid, participants, 'remove');
      this.logger.info(`Kicked ${participants.length} participant(s) from ${groupJid}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to kick participant:', error);
      return false;
    }
  }

  async promoteParticipant(groupJid, participants) {
    try {
      await this.sock.groupParticipantsUpdate(groupJid, participants, 'promote');
      this.logger.info(`Promoted ${participants.length} participant(s) in ${groupJid}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to promote participant:', error);
      return false;
    }
  }

  async demoteParticipant(groupJid, participants) {
    try {
      await this.sock.groupParticipantsUpdate(groupJid, participants, 'demote');
      this.logger.info(`Demoted ${participants.length} participant(s) in ${groupJid}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to demote participant:', error);
      return false;
    }
  }

  async updateGroupSubject(groupJid, subject) {
    try {
      await this.sock.groupUpdateSubject(groupJid, subject);
      return true;
    } catch (error) {
      this.logger.error('Failed to update group subject:', error);
      return false;
    }
  }

  async updateGroupDescription(groupJid, description) {
    try {
      await this.sock.groupUpdateDescription(groupJid, description);
      return true;
    } catch (error) {
      this.logger.error('Failed to update group description:', error);
      return false;
    }
  }

  async leaveGroup(groupJid) {
    try {
      await this.sock.groupLeave(groupJid);
      this.logger.info(`Left group: ${groupJid}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to leave group:', error);
      return false;
    }
  }

  isConnected() {
    return this.connected && this.sock !== null;
  }

  async restart() {
    try {
      this.logger.info('Restarting bot...');
      
      // Increment restart count
      await db.incrementRestartCount();
      
      // Close current connection
      if (this.sock) {
        this.sock.end(undefined);
      }
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start again
      await this.start();
      
      this.logger.info('Bot restarted successfully');
    } catch (error) {
      this.logger.error('Failed to restart bot:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down bot gracefully...');
      
      // Stop system monitoring
      if (global.systemMonitor) {
        global.systemMonitor.stop();
      }
      
      // Create final backup
      await db.createBackup();
      
      // Close connection
      if (this.sock) {
        this.sock.end(undefined);
      }
      
      this.logger.info('Bot shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  async emergencyShutdown() {
    try {
      this.logger.critical('Emergency shutdown initiated');
      
      // Send alert to author
      await this.sendMessageToAuthor('🚨 EMERGENCY SHUTDOWN\n\nBot encountered critical error and had to shutdown.');
      
      // Force close
      if (this.sock) {
        this.sock.end(undefined);
      }
      
    } catch (error) {
      this.logger.error('Error during emergency shutdown:', error);
    }
  }

  getUptime() {
    if (global.systemMonitor) {
      return global.systemMonitor.getUptime();
    }
    return '0s';
  }
}