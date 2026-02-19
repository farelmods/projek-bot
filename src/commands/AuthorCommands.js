/**
 * ALL-STAR BOT v2.0 - Author Commands
 * Commands for author (highest privilege)
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../config/BotConfig.js';
import { db } from '../database/Database.js';
import { defenseEngine } from '../modules/DefenseEngine.js';

const logger = new Logger('AUTHOR-COMMANDS');

/**
 * Bot Info Command - Show detailed system status
 */
export const botinfo = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  try {
    if (global.systemMonitor) {
      const report = await global.systemMonitor.getSystemReport();
      await bot.sendMessage(from, { text: report });
    } else {
      await bot.sendMessage(from, {
        text: '❌ System monitor not available.'
      });
    }
  } catch (error) {
    logger.error('BotInfo command error:', error);
    await bot.sendMessage(from, {
      text: '❌ Error getting system info.'
    });
  }
};

/**
 * Add Owner Command
 */
export const addowner = async (bot, msg, args, messageInfo) => {
  const { from, sender, quoted, messageContent } = messageInfo;

  let targetNumber = null;

  // Get target from mention or quoted message
  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length > 0) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *ADD OWNER*\n\nUsage: ${config.get('bot.prefix')}addowner @user\natau reply pesan user`
    });
    return;
  }

  // Check if already owner or author
  if (db.isAuthor(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ User ini adalah Author.'
    });
    return;
  }

  if (db.isOwner(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ User sudah menjadi Owner.'
    });
    return;
  }

  // Add owner
  await db.addOwner(targetNumber);

  await bot.sendMessage(from, {
    text: `✅ *OWNER ADDED*\n\nUser @${targetNumber} berhasil ditambahkan sebagai Owner.\n\nUser sekarang memiliki akses Owner commands.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.info(`Owner added: ${targetNumber}`);
};

/**
 * Delete Owner Command
 */
export const delowner = async (bot, msg, args, messageInfo) => {
  const { from, quoted } = messageInfo;

  let targetNumber = null;

  // Get target from mention or quoted message
  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length > 0) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *DELETE OWNER*\n\nUsage: ${config.get('bot.prefix')}delowner @user\natau reply pesan user`
    });
    return;
  }

  // Check if is owner
  if (!db.isOwner(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ User bukan Owner.'
    });
    return;
  }

  // Remove owner
  await db.removeOwner(targetNumber);

  await bot.sendMessage(from, {
    text: `✅ *OWNER REMOVED*\n\nUser @${targetNumber} telah dihapus dari Owner.\n\nUser kehilangan akses Owner commands.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.info(`Owner removed: ${targetNumber}`);
};

/**
 * Self Mode Command - Restrict bot to author only
 */
export const self = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  await db.setBotMode('SELF');

  const message = `🔒 *BOT MODE CHANGED*

Mode: SELF
Status: Active

Only the author can use bot commands now.

Use ${config.get('bot.prefix')}public to revert.`;

  await bot.sendMessage(from, { text: message });

  logger.info('Bot mode changed to SELF');
};

/**
 * Public Mode Command - Allow all users
 */
export const publicMode = {
  name: 'public',
  execute: async (bot, msg, args, messageInfo) => {
    const { from } = messageInfo;

    await db.setBotMode('PUBLIC');

    const message = `🌍 *BOT MODE CHANGED*

Mode: PUBLIC
Status: Active

The bot is now available for all users.`;

    await bot.sendMessage(from, { text: message });

    logger.info('Bot mode changed to PUBLIC');
  }
};

/**
 * Defense Mode Command
 */
export const defense = async (bot, msg, args, messageInfo) => {
  const { from, isGroup, groupId } = messageInfo;

  if (args.length === 0) {
    const currentMode = isGroup ? defenseEngine.getDefenseMode(groupId) : db.getDefenseMode();
    
    await bot.sendMessage(from, {
      text: `🛡️ *DEFENSE MODE*\n\nCurrent: ${currentMode}\n\nAvailable modes:\n• NORMAL - Standard protection\n• STRICT - Enhanced protection\n• LOCKDOWN - Maximum security\n\nUsage: ${config.get('bot.prefix')}defense <mode>`
    });
    return;
  }

  const mode = args[0].toUpperCase();
  const validModes = ['NORMAL', 'STRICT', 'LOCKDOWN'];

  if (!validModes.includes(mode)) {
    await bot.sendMessage(from, {
      text: `❌ Invalid mode. Choose: ${validModes.join(', ')}`
    });
    return;
  }

  if (isGroup) {
    await defenseEngine.setDefenseMode(groupId, mode);
  } else {
    await db.setDefenseMode(mode);
  }

  const modeEmoji = mode === 'NORMAL' ? '🟢' : mode === 'STRICT' ? '🟡' : '🔴';

  await bot.sendMessage(from, {
    text: `${modeEmoji} *DEFENSE MODE UPDATED*\n\nMode: ${mode}\nStatus: Active\n\nSecurity level adjusted.`
  });

  logger.info(`Defense mode changed to ${mode}`);
};

/**
 * Disable User Command
 */
export const disable = async (bot, msg, args, messageInfo) => {
  const { from, quoted } = messageInfo;

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length > 0) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *DISABLE USER*\n\nUsage: ${config.get('bot.prefix')}disable @user\natau reply pesan user`
    });
    return;
  }

  // Cannot disable author/owner
  if (db.isAuthorOrOwner(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ Cannot disable Author/Owner.'
    });
    return;
  }

  await db.addDisabled(targetNumber);

  await bot.sendMessage(from, {
    text: `✅ *USER DISABLED*\n\nUser @${targetNumber} has been disabled.\n\nUser cannot use any bot commands.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Disable', targetNumber, 'Disabled by author', 'AUTHOR');
};

/**
 * Undisable User Command
 */
export const undisable = async (bot, msg, args, messageInfo) => {
  const { from, quoted } = messageInfo;

  let targetNumber = null;

  if (quoted && quoted.participant) {
    targetNumber = quoted.participant.split('@')[0];
  } else if (args.length > 0) {
    targetNumber = args[0].replace(/\D/g, '');
  }

  if (!targetNumber) {
    await bot.sendMessage(from, {
      text: `❌ *UNDISABLE USER*\n\nUsage: ${config.get('bot.prefix')}undisable @user\natau reply pesan user`
    });
    return;
  }

  if (!db.isDisabled(targetNumber)) {
    await bot.sendMessage(from, {
      text: '❌ User tidak dalam status disabled.'
    });
    return;
  }

  await db.removeDisabled(targetNumber);

  await bot.sendMessage(from, {
    text: `✅ *USER ENABLED*\n\nUser @${targetNumber} has been enabled.\n\nUser can now use bot commands.`,
    mentions: [targetNumber + '@s.whatsapp.net']
  });

  logger.security('Enable', targetNumber, 'Enabled by author', 'AUTHOR');
};

/**
 * List Disabled Users Command
 */
export const listdisable = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  const disabledUsers = db.getDisabledList();

  if (disabledUsers.length === 0) {
    await bot.sendMessage(from, {
      text: 'ℹ️ No disabled users.'
    });
    return;
  }

  let message = `🚫 *DISABLED USERS*\n\nTotal: ${disabledUsers.length}\n\n`;
  
  disabledUsers.forEach((number, index) => {
    message += `${index + 1}. @${number}\n`;
  });

  await bot.sendMessage(from, {
    text: message,
    mentions: disabledUsers.map(n => n + '@s.whatsapp.net')
  });
};

/**
 * Add Defense (Protect Group) Command
 */
export const adddefense = async (bot, msg, args, messageInfo) => {
  const { from, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  if (db.isProtected(groupId)) {
    await bot.sendMessage(from, {
      text: '❌ Grup sudah dalam proteksi.'
    });
    return;
  }

  await db.addProtected(groupId);
  await defenseEngine.enableAllModules(groupId);

  const metadata = await bot.getGroupMetadata(groupId);

  await bot.sendMessage(from, {
    text: `🛡️ *DEFENSE ACTIVATED*\n\nGroup: ${metadata.subject}\nStatus: Protected\n\nSemua sistem keamanan aktif:\n✅ Anti-Link\n✅ Anti-Spam\n✅ Anti-Toxic\n✅ Anti-Virtex\n✅ Geo-Restriction`
  });

  logger.info(`Defense activated for group: ${groupId}`);
};

/**
 * Add Share Target Command
 */
export const addshare = async (bot, msg, args, messageInfo) => {
  const { from, isGroup, groupId } = messageInfo;

  if (!isGroup) {
    await bot.sendMessage(from, {
      text: '❌ Command ini hanya bisa digunakan di grup.'
    });
    return;
  }

  if (db.isShareTarget(groupId)) {
    await bot.sendMessage(from, {
      text: '❌ Grup sudah menjadi share target.'
    });
    return;
  }

  await db.addShareTarget(groupId);

  const metadata = await bot.getGroupMetadata(groupId);

  await bot.sendMessage(from, {
    text: `📢 *SHARE TARGET ADDED*\n\nGroup: ${metadata.subject}\n\nGrup akan menerima broadcast messages.`
  });

  logger.info(`Share target added: ${groupId}`);
};

/**
 * Share/Broadcast Command
 */
export const share = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  const message = args.join(' ');

  if (!message) {
    await bot.sendMessage(from, {
      text: `❌ *SHARE MESSAGE*\n\nUsage: ${config.get('bot.prefix')}share <message>\n\nBroadcast message to all share targets.`
    });
    return;
  }

  const shareTargets = db.getShareTargets();

  if (shareTargets.length === 0) {
    await bot.sendMessage(from, {
      text: '❌ Tidak ada share target yang terdaftar.'
    });
    return;
  }

  await bot.sendMessage(from, {
    text: `📢 Broadcasting to ${shareTargets.length} groups...`
  });

  let success = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const groupId of shareTargets) {
    try {
      await bot.sendMessage(groupId, {
        text: `📢 *BROADCAST MESSAGE*\n\n${message}\n\n_From: ${config.get('bot.author.name')}_`
      });
      success++;
      
      // Cooldown between messages
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      failed++;
      logger.error(`Failed to broadcast to ${groupId}:`, error);
    }
  }

  const executionTime = Math.floor((Date.now() - startTime) / 1000);

  const report = `=== BROADCAST REPORT ===

Status        : SUCCESS
Total Groups  : ${shareTargets.length}
Success       : ${success}
Failed        : ${failed}
Execution Time: ${executionTime} seconds
Date          : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;

  await bot.sendMessage(from, { text: report });

  logger.info(`Broadcast completed: ${success}/${shareTargets.length}`);
};

/**
 * Restart Bot Command
 */
export const restart = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  await bot.sendMessage(from, {
    text: '🔄 Restarting bot...\n\nPlease wait.'
  });

  logger.info('Bot restart initiated by author');

  setTimeout(async () => {
    await bot.restart();
  }, 2000);
};

/**
 * Backup Database Command
 */
export const backup = async (bot, msg, args, messageInfo) => {
  const { from } = messageInfo;

  await bot.sendMessage(from, {
    text: '💾 Creating backup...'
  });

  try {
    const backupFile = await db.createBackup();
    
    await bot.sendMessage(from, {
      text: `✅ *BACKUP CREATED*\n\nFile: ${backupFile}\n\nBackup berhasil dibuat.`
    });

    logger.info('Manual backup created');

  } catch (error) {
    logger.error('Backup error:', error);
    await bot.sendMessage(from, {
      text: '❌ Gagal membuat backup.'
    });
  }
};
