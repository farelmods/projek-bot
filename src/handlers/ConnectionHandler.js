/**
 * ALL-STAR BOT v2.0 - Connection Handler
 * Handles WhatsApp connection events
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Boom } from '@hapi/boom';
import { DisconnectReason } from '@whiskeysockets/baileys';
import chalk from 'chalk';
import moment from 'moment-timezone';
import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';

export class ConnectionHandler {
  constructor(botCore) {
    this.bot = botCore;
    this.logger = new Logger('CONNECTION');
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.get('session.maxReconnectAttempts');
    this.isFirstConnection = true;
  }

  async handleConnectionUpdate(update, saveCreds) {
    const { connection, lastDisconnect, qr } = update;

    // QR Code handling (if not using pairing code)
    if (qr && !config.get('pairing.enabled')) {
      this.logger.info('QR Code received');
      console.log(chalk.yellow('\n📱 Scan QR Code below to connect:\n'));
    }

    // Connection established
    if (connection === 'open') {
      this.bot.connected = true;
      this.reconnectAttempts = 0;
      
      console.log(chalk.green('\n✅ Connection Established!'));
      this.logger.info('WhatsApp connection established successfully');

      // Send startup notification to author
      if (this.isFirstConnection) {
        await this.sendStartupNotification();
        this.isFirstConnection = false;
      } else {
        await this.sendReconnectNotification();
      }
    }

    // Connection closed
    if (connection === 'close') {
      this.bot.connected = false;
      
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(chalk.red('\n❌ Connection closed'));
      this.logger.warn(`Connection closed with status: ${statusCode}`);

      if (shouldReconnect) {
        await this.handleReconnection(statusCode);
      } else {
        console.log(chalk.yellow('\n⚠️  Logged out. Please delete session folder and restart.'));
        this.logger.warn('Bot logged out. Session needs to be refreshed.');
        process.exit(0);
      }
    }

    // Connection updating
    if (connection === 'connecting') {
      console.log(chalk.blue('\n⏳ Connecting to WhatsApp...'));
      this.logger.info('Connecting to WhatsApp...');
    }
  }

  async handleReconnection(statusCode) {
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log(chalk.red('\n❌ Max reconnection attempts reached. Exiting...'));
      this.logger.critical('Max reconnection attempts reached');
      
      // Send critical alert to author
      await this.sendCriticalAlert('Max reconnection attempts reached. Manual intervention required.');
      
      process.exit(1);
    }

    const reconnectDelay = Math.min(5000 * this.reconnectAttempts, 30000);
    
    console.log(chalk.yellow(`\n⏳ Reconnecting in ${reconnectDelay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`));
    this.logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Send reconnection alert
    if (this.reconnectAttempts === 1) {
      await this.sendReconnectionAlert(statusCode);
    }

    await new Promise(resolve => setTimeout(resolve, reconnectDelay));
    await this.bot.start();
  }

  async sendStartupNotification() {
    try {
      const defenseMode = db.getDefenseMode();
      const currentTime = moment().tz(config.get('system.timezone')).format('DD MMM YYYY - HH:mm:ss [WIB]');
      
      const message = `╔════════════════════════╗
║   🚀 ALL-STAR ONLINE   ║
╠════════════════════════╣
║ 🤖 System      : ACTIVE
║ 👑 Author      : ${config.get('bot.author.name')}
║ 💻 Panel       : ${config.get('panel.name')}
║ 🛡 Defense     : ${defenseMode}
║ ⚡ Connection  : Stable
║ 🕒 Connected   : ${currentTime}
╚════════════════════════╝

✨ ALL-STAR siap menjaga stabilitas sistem.

Ketik ${config.get('bot.prefix')}menu untuk melihat daftar command.`;

      await this.bot.sendMessageToAuthor(message);
      this.logger.info('Startup notification sent to author');
    } catch (error) {
      this.logger.error('Failed to send startup notification:', error);
    }
  }

  async sendReconnectNotification() {
    try {
      const currentTime = moment().tz(config.get('system.timezone')).format('DD MMM YYYY - HH:mm:ss [WIB]');
      
      const message = `🔄 RECONNECTION SUCCESS

Bot berhasil tersambung kembali.

🕒 ${currentTime}
📶 Status : Online
⚡ Connection : Stable

Semua sistem berjalan normal.`;

      await this.bot.sendMessageToAuthor(message);
      this.logger.info('Reconnection notification sent to author');
    } catch (error) {
      this.logger.error('Failed to send reconnection notification:', error);
    }
  }

  async sendReconnectionAlert(statusCode) {
    try {
      const currentTime = moment().tz(config.get('system.timezone')).format('DD MMM YYYY - HH:mm:ss [WIB]');
      
      const message = `⚠️ CONNECTION LOST

Bot kehilangan koneksi ke WhatsApp.

Status Code: ${statusCode}
Time: ${currentTime}

🔄 Attempting to reconnect...`;

      await this.bot.sendMessageToAuthor(message);
      this.logger.warn('Reconnection alert sent to author');
    } catch (error) {
      this.logger.error('Failed to send reconnection alert:', error);
    }
  }

  async sendCriticalAlert(message) {
    try {
      const currentTime = moment().tz(config.get('system.timezone')).format('DD MMM YYYY - HH:mm:ss [WIB]');
      
      const alertMessage = `🚨 CRITICAL ALERT

${message}

Time: ${currentTime}
Status: OFFLINE

Please check the server immediately.`;

      await this.bot.sendMessageToAuthor(alertMessage);
      this.logger.critical('Critical alert sent to author');
    } catch (error) {
      this.logger.error('Failed to send critical alert:', error);
    }
  }

  getDisconnectReason(statusCode) {
    const reasons = {
      [DisconnectReason.badSession]: 'Bad Session',
      [DisconnectReason.connectionClosed]: 'Connection Closed',
      [DisconnectReason.connectionLost]: 'Connection Lost',
      [DisconnectReason.connectionReplaced]: 'Connection Replaced',
      [DisconnectReason.loggedOut]: 'Logged Out',
      [DisconnectReason.restartRequired]: 'Restart Required',
      [DisconnectReason.timedOut]: 'Timed Out'
    };

    return reasons[statusCode] || 'Unknown Reason';
  }
}