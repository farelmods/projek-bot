/**
 * ALL-STAR BOT v2.0 - Group Handler
 * Handles all group-related events
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';
import { defenseEngine } from '../modules/DefenseEngine.js';
import moment from 'moment-timezone';

export class GroupHandler {
  constructor(botCore) {
    this.bot = botCore;
    this.logger = new Logger('GROUP-HANDLER');
  }

  async handleParticipantsUpdate(update) {
    try {
      const { id: groupId, participants, action } = update;

      // Check if group is whitelisted or protected
      if (!db.isWhitelisted(groupId) && !db.isProtected(groupId)) {
        return;
      }

      const groupSettings = db.getGroupSettings(groupId);

      switch (action) {
        case 'add':
          await this.handleMemberJoin(groupId, participants, groupSettings);
          break;

        case 'remove':
        case 'leave':
          await this.handleMemberLeave(groupId, participants, groupSettings);
          break;

        case 'promote':
          await this.handleMemberPromote(groupId, participants);
          break;

        case 'demote':
          await this.handleMemberDemote(groupId, participants);
          break;
      }

    } catch (error) {
      this.logger.error('Error handling participants update:', error);
    }
  }

  async handleMemberJoin(groupId, participants, groupSettings) {
    try {
      // Check if welcome message is enabled
      if (!groupSettings.welcome) return;

      const metadata = await this.bot.getGroupMetadata(groupId);
      if (!metadata) return;

      for (const participant of participants) {
        const number = participant.split('@')[0];

        // Run defense checks for new member
        const defenseCheck = await defenseEngine.checkNewMember(this.bot, groupId, participant);
        
        if (defenseCheck.blocked) {
          // Member was kicked by defense system
          this.logger.info(`New member ${number} blocked by defense system: ${defenseCheck.reason}`);
          continue;
        }

        // Send welcome message
        const welcomeMessage = this.generateWelcomeMessage(
          participant,
          metadata.subject,
          metadata.participants.length
        );

        await this.bot.sendMessage(groupId, {
          text: welcomeMessage,
          mentions: [participant]
        });

        this.logger.info(`Welcome message sent to ${number} in ${groupId}`);
      }

    } catch (error) {
      this.logger.error('Error handling member join:', error);
    }
  }

  async handleMemberLeave(groupId, participants, groupSettings) {
    try {
      // Check if goodbye message is enabled
      if (!groupSettings.goodbye) return;

      const metadata = await this.bot.getGroupMetadata(groupId);
      if (!metadata) return;

      for (const participant of participants) {
        const number = participant.split('@')[0];

        const goodbyeMessage = this.generateGoodbyeMessage(
          participant,
          metadata.participants.length
        );

        await this.bot.sendMessage(groupId, {
          text: goodbyeMessage,
          mentions: [participant]
        });

        this.logger.info(`Goodbye message sent for ${number} in ${groupId}`);
      }

    } catch (error) {
      this.logger.error('Error handling member leave:', error);
    }
  }

  async handleMemberPromote(groupId, participants) {
    try {
      this.logger.info(`Members promoted in ${groupId}: ${participants.join(', ')}`);
    } catch (error) {
      this.logger.error('Error handling member promote:', error);
    }
  }

  async handleMemberDemote(groupId, participants) {
    try {
      this.logger.info(`Members demoted in ${groupId}: ${participants.join(', ')}`);
    } catch (error) {
      this.logger.error('Error handling member demote:', error);
    }
  }

  async handleGroupUpdate(updates) {
    try {
      for (const update of updates) {
        const { id: groupId, subject, desc, announce } = update;

        if (subject) {
          this.logger.info(`Group ${groupId} subject changed to: ${subject}`);
        }

        if (desc !== undefined) {
          this.logger.info(`Group ${groupId} description updated`);
        }

        if (announce !== undefined) {
          this.logger.info(`Group ${groupId} announce mode: ${announce ? 'ON' : 'OFF'}`);
        }
      }
    } catch (error) {
      this.logger.error('Error handling group update:', error);
    }
  }

  generateWelcomeMessage(participant, groupName, memberCount) {
    const number = participant.split('@')[0];
    
    return `👋 Halo @${number}!

Selamat datang di *${groupName}* 🚀
Tempat para developer belajar, sharing, dan berkembang bersama.

📌 Jangan lupa:
• Baca deskripsi grup
• Saling menghargai sesama member
• Setelah bergabung harap intro dengan ketik ${config.get('bot.prefix')}intro

Selamat ngoding dan semoga bug menjauh 😆

👥 Jumlah member: ${memberCount}`;
  }

  generateGoodbyeMessage(participant, memberCount) {
    const number = participant.split('@')[0];
    
    return `📢 Info:
@${number} telah keluar dari grup, selamat tinggal.

Total member sekarang: ${memberCount}`;
  }

  // Helper: Get active and inactive members
  async getActiveMembersStats(groupId) {
    try {
      const metadata = await this.bot.getGroupMetadata(groupId);
      if (!metadata) return null;

      // This is a simplified version
      // In production, you'd track message activity
      const total = metadata.participants.length;
      const admins = metadata.participants.filter(p => p.admin).length;

      return {
        total,
        admins,
        members: total - admins,
        active: 0, // Would need activity tracking
        inactive: 0 // Would need activity tracking
      };

    } catch (error) {
      this.logger.error('Error getting active members stats:', error);
      return null;
    }
  }

  // Helper: Format group info
  async getGroupInfo(groupId) {
    try {
      const metadata = await this.bot.getGroupMetadata(groupId);
      if (!metadata) return null;

      const stats = await this.getActiveMembersStats(groupId);
      const settings = db.getGroupSettings(groupId);

      return {
        name: metadata.subject,
        description: metadata.desc || 'No description',
        participants: metadata.participants.length,
        admins: metadata.participants.filter(p => p.admin).length,
        created: metadata.creation,
        isProtected: db.isProtected(groupId),
        isShareTarget: db.isShareTarget(groupId),
        settings,
        stats
      };

    } catch (error) {
      this.logger.error('Error getting group info:', error);
      return null;
    }
  }
}
