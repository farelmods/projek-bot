/**
 * ALL-STAR BOT v2.0 - Owner Commands
 * Commands for group owners and moderators
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';
import { validationMiddleware } from '../middleware/ValidationMiddleware.js';

const logger = new Logger('OWNER-COMMANDS');

/**
 * Mute User Command
 */
export const mute = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  let targetNumber = null;
  let duration = 10; // Default 10 minutes

  // Get target from quoted or mention
  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
    if (args.length > 0) {
      duration = validationMiddleware.parseDuration(args[0]);
    }
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
    if (args.length >= 2) {
      duration = validationMiddleware.parseDuration(args[1]);
    }
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *MUTE USER*\n\nUsage: ${config.get('bot.prefix')}mute @user <waktu>\n\nContoh:\n${config.get('bot.prefix')}mute @user 10m\n${config.get('bot.prefix')}mute @user 1h\n\nAtau reply pesan dengan waktu.`
    });
    return;
  }

  // Cannot mute author/owner
  if (db.isAuthorOrOwner(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ Tidak bisa mute Author/Owner.'
    });
    return;
  }

  // Mute user
  await db.addMute(targetNumber, duration, 'Muted by owner');

  await bot.sendMessage(from, {
    text: `🔇 *USER MUTED*\n\nUser: @${targetNumber}\nDuration: ${duration} minutes\n\nUser tidak bisa mengirim pesan.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Mute', targetNumber, `${duration} minutes`, sender.split('@')[0]);
};

/**
 * Unmute User Command
 */
export const unmute = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *UNMUTE USER*\n\nUsage: ${config.get('bot.prefix')}unmute @user\natau reply pesan user`
    });
    return;
  }

  if (!db.isMuted(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ User tidak dalam status mute.'
    });
    return;
  }

  await db.removeMute(targetNumber);

  await bot.sendMessage(from, {
    text: `🔊 *USER UNMUTED*\n\nUser: @${targetNumber}\n\nUser bisa mengirim pesan kembali.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Unmute', targetNumber, 'Unmuted by owner', sender.split('@')[0]);
};

/**
 * Warn User Command
 */
export const warn = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *WARN USER*\n\nUsage: ${config.get('bot.prefix')}warn @user\natau reply pesan user`
    });
    return;
  }

  // Cannot warn author/owner
  if (db.isAuthorOrOwner(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ Tidak bisa warn Author/Owner.'
    });
    return;
  }

  const warnCount = await db.addWarn(targetNumber);
  const maxWarn = 3;

  let message = `⚠️ *USER WARNED*\n\nUser: @${targetNumber}\nWarning: ${warnCount}/${maxWarn}\n\n`;

  if (warnCount >= maxWarn) {
    message += `Maximum warnings reached.\nUser will be kicked.`;
    
    // Kick user
    await bot.kickParticipant(groupId, [targetNumber + '@s.whatsapp.net']);
    await db.resetWarn(targetNumber);
    
    logger.security('Kick', targetNumber, 'Max warnings reached', sender.split('@')[0]);
  } else {
    message += `Remaining warnings: ${maxWarn - warnCount}`;
  }

  await bot.sendMessage(from, {
    text: message,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Warn', targetNumber, `Warning ${warnCount}/${maxWarn}`, sender.split('@')[0]);
};

/**
 * Unwarn User Command
 */
export const unwarn = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *UNWARN USER*\n\nUsage: ${config.get('bot.prefix')}unwarn @user\natau reply pesan user`
    });
    return;
  }

  const currentWarns = db.getWarnCount(targetNumber);

  if (currentWarns === 0) {
    await bot.sendMessage(from, {
      text: '❌ User tidak memiliki warning.'
    });
    return;
  }

  const newWarnCount = await db.removeWarn(targetNumber);

  await bot.sendMessage(from, {
    text: `✅ *WARNING REMOVED*\n\nUser: @${targetNumber}\nWarnings: ${newWarnCount}/3\n\nSatu warning telah dihapus.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Unwarn', targetNumber, `Warning reduced to ${newWarnCount}`, sender.split('@')[0]);
};

/**
 * Reset Warn Command
 */
export const resetwarn = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *RESET WARN*\n\nUsage: ${config.get('bot.prefix')}resetwarn @user\natau reply pesan user`
    });
    return;
  }

  await db.resetWarn(targetNumber);

  await bot.sendMessage(from, {
    text: `✅ *WARNINGS RESET*\n\nUser: @${targetNumber}\n\nSemua warning telah dihapus.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('ResetWarn', targetNumber, 'All warnings cleared', sender.split('@')[0]);
};

/**
 * Kick User Command
 */
export const kick = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  // Check if bot is admin
  if (!await validationMiddleware.isBotAdmin(bot, groupId)) {
    await bot.sendMessage(from, {
      text: '❌ Bot harus menjadi admin untuk kick user.'
    });
    return;
  }

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *KICK USER*\n\nUsage: ${config.get('bot.prefix')}kick @user\natau reply pesan user`
    });
    return;
  }

  // Cannot kick author/owner
  if (db.isAuthorOrOwner(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ Tidak bisa kick Author/Owner.'
    });
    return;
  }

  await bot.kickParticipant(groupId, [targetNumber + '@s.whatsapp.net']);

  await bot.sendMessage(from, {
    text: `🚫 *USER KICKED*\n\nUser: @${targetNumber}\n\nUser telah dikeluarkan dari grup.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Kick', targetNumber, 'Kicked by owner', sender.split('@')[0]);
};

/**
 * Promote User Command
 */
export const promote = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  if (!await validationMiddleware.isBotAdmin(bot, groupId)) {
    await bot.sendMessage(from, {
      text: '❌ Bot harus menjadi admin untuk promote user.'
    });
    return;
  }

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *PROMOTE USER*\n\nUsage: ${config.get('bot.prefix')}promote @user\natau reply pesan user`
    });
    return;
  }

  await bot.promoteParticipant(groupId, [targetNumber + '@s.whatsapp.net']);

  await bot.sendMessage(from, {
    text: `👑 *USER PROMOTED*\n\nUser: @${targetNumber}\n\nUser sekarang menjadi admin grup.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.info(`User promoted: ${targetNumber} by ${sender.split('@')[0]}`);
};

/**
 * Demote User Command
 */
export const demote = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  if (!await validationMiddleware.isBotAdmin(bot, groupId)) {
    await bot.sendMessage(from, {
      text: '❌ Bot harus menjadi admin untuk demote user.'
    });
    return;
  }

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *DEMOTE USER*\n\nUsage: ${config.get('bot.prefix')}demote @user\natau reply pesan user`
    });
    return;
  }

  await bot.demoteParticipant(groupId, [targetNumber + '@s.whatsapp.net']);

  await bot.sendMessage(from, {
    text: `👤 *USER DEMOTED*\n\nUser: @${targetNumber}\n\nUser sekarang menjadi member biasa.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.info(`User demoted: ${targetNumber} by ${sender.split('@')[0]}`);
};

/**
 * Blacklist User Command
 */
export const blacklist = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted } = messageInfo;

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *BLACKLIST USER*\n\nUsage: ${config.get('bot.prefix')}blacklist @user\natau reply pesan user`
    });
    return;
  }

  // Cannot blacklist author/owner
  if (db.isAuthorOrOwner(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ Tidak bisa blacklist Author/Owner.'
    });
    return;
  }

  await db.addBlacklist(targetNumber);

  await bot.sendMessage(from, {
    text: `🚫 *USER BLACKLISTED*\n\nUser: @${targetNumber}\n\nUser tidak bisa masuk grup yang diproteksi.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Blacklist', targetNumber, 'Blacklisted by owner', sender.split('@')[0]);
};

/**
 * Unblacklist User Command
 */
export const unblacklist = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted } = messageInfo;

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length >= 1) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *UNBLACKLIST USER*\n\nUsage: ${config.get('bot.prefix')}unblacklist @user\natau reply pesan user`
    });
    return;
  }

  if (!db.isBlacklisted(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ User tidak ada di blacklist.'
    });
    return;
  }

  await db.removeBlacklist(targetNumber);

  await bot.sendMessage(from, {
    text: `✅ *USER UNBLACKLISTED*\n\nUser: @${targetNumber}\n\nUser bisa masuk grup kembali.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Unblacklist', targetNumber, 'Unblacklisted by owner', sender.split('@')[0]);
};

/**
 * Info Grup Command
 */
export const infoGrup = {
  name: 'info-grup',
  aliases: ['groupinfo', 'infogrup'],
  execute: async (bot, msg, args, messageInfo) => {
    const { from, isGroup, groupId } = messageInfo;

    if (!isGroup) {
      await bot.sendMessage(from, {
        text: '❌ Command ini hanya bisa digunakan di grup.'
      });
      return;
    }

    const metadata = await bot.getGroupMetadata(groupId);
    const participants = metadata.participants;
    
    const adminCount = participants.filter(p => p.admin).length;
    const memberCount = participants.length - adminCount;
    
    const isProtected = db.isProtected(groupId);
    const isShareTarget = db.isShareTarget(groupId);
    const defenseMode = db.getGroupSettings(groupId).defenseMode || 'NORMAL';

    const message = `📊 *GROUP INFORMATION*

Name: ${metadata.subject}
ID: ${groupId}
Created: ${new Date(metadata.creation * 1000).toLocaleDateString('id-ID')}

👥 Members: ${participants.length}
   • Admins: ${adminCount}
   • Members: ${memberCount}

🛡️ Protection: ${isProtected ? '✅ Active' : '❌ Inactive'}
📢 Share Target: ${isShareTarget ? '✅ Yes' : '❌ No'}
🔒 Defense Mode: ${defenseMode}

Description:
${metadata.desc || 'No description'}`;

    await bot.sendMessage(from, { text: message });
  }
};
