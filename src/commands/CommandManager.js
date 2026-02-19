/**
 * ALL-STAR BOT v2.0 - Command Manager
 * Central command registry and dispatcher
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { cooldownMiddleware } from '../middleware/CooldownMiddleware.js';
import { validationMiddleware } from '../middleware/ValidationMiddleware.js';
import { db } from '../database/Database.js';

// Import command modules
import * as authorCommands from './AuthorCommands.js';
import * as ownerCommands from './OwnerCommands.js';
import * as generalCommands from './GeneralCommands.js';

export class CommandManager {
  constructor() {
    this.logger = new Logger('COMMAND-MANAGER');
    this.commands = new Map();
    this.aliases = new Map();
    
    // Register all commands
    this.registerCommands();
  }

  /**
   * Register all commands from command modules
   */
  registerCommands() {
    this.logger.info('Registering commands...');

    // Register author commands
    this.registerCommandModule(authorCommands, 'author');

    // Register owner commands
    this.registerCommandModule(ownerCommands, 'owner');

    // Register general commands
    this.registerCommandModule(generalCommands, 'user');

    this.logger.info(`Registered ${this.commands.size} commands with ${this.aliases.size} aliases`);
  }

  /**
   * Register commands from a module
   * @param {Object} module - Command module
   * @param {string} defaultRole - Default required role
   */
  registerCommandModule(module, defaultRole) {
    for (const [name, command] of Object.entries(module)) {
      if (typeof command === 'function') {
        this.register({
          name,
          execute: command,
          role: defaultRole,
          aliases: []
        });
      } else if (typeof command === 'object' && command.execute) {
        this.register({
          name,
          ...command,
          role: command.role || defaultRole
        });
      }
    }
  }

  /**
   * Register a single command
   * @param {Object} command - Command configuration
   */
  register(command) {
    const { name, aliases = [], ...config } = command;

    // Store command
    this.commands.set(name, {
      name,
      ...config
    });

    // Register aliases
    if (aliases && aliases.length > 0) {
      for (const alias of aliases) {
        this.aliases.set(alias, name);
      }
    }
  }

  /**
   * Execute command
   * @param {string} commandName - Command name
   * @param {Object} bot - Bot instance
   * @param {Object} msg - Message object
   * @param {Array} args - Command arguments
   * @param {Object} messageInfo - Message information
   * @returns {Promise<boolean>} Success status
   */
  async execute(commandName, bot, msg, args, messageInfo) {
    try {
      // Resolve alias
      const actualCommand = this.aliases.get(commandName) || commandName;

      // Get command
      const command = this.commands.get(actualCommand);

      if (!command) {
        // Command not found
        return false;
      }

      const { from, sender } = messageInfo;
      const senderNumber = sender.split('@')[0];

      // Log command execution attempt
      this.logger.command(senderNumber, actualCommand, messageInfo.isGroup ? 'GROUP' : 'DM');

      // === MIDDLEWARE PIPELINE ===

      // 1. Authentication Check
      const authResult = await authMiddleware.checkAuth(sender, actualCommand, command.role);
      
      if (!authResult.authorized) {
        await bot.sendMessage(from, {
          text: authResult.message
        });
        
        authMiddleware.logAuthAttempt(sender, actualCommand, false, authResult.reason);
        return false;
      }

      authMiddleware.logAuthAttempt(sender, actualCommand, true);

      // 2. Cooldown Check
      const cooldownResult = await cooldownMiddleware.checkCooldown(sender, actualCommand);
      
      if (cooldownResult.onCooldown) {
        await bot.sendMessage(from, {
          text: cooldownResult.message
        });
        return false;
      }

      // 3. Validation Check
      const validationResult = validationMiddleware.validateCommand(
        actualCommand,
        args,
        messageInfo
      );

      if (!validationResult.valid) {
        await bot.sendMessage(from, {
          text: validationResult.message
        });
        return false;
      }

      // 4. Global Rate Limit Check
      const rateLimitResult = cooldownMiddleware.checkGlobalRateLimit(sender);
      
      if (rateLimitResult.limited) {
        await bot.sendMessage(from, {
          text: rateLimitResult.message
        });
        return false;
      }

      // === EXECUTE COMMAND ===

      const startTime = Date.now();

      await command.execute(bot, msg, args, messageInfo);

      const executionTime = Date.now() - startTime;

      // Log successful execution
      this.logger.info(`Command executed: ${actualCommand} by ${senderNumber} (${executionTime}ms)`);
      await db.incrementCommandUsage(actualCommand);

      // Apply cooldown
      await cooldownMiddleware.applyCooldown(sender, actualCommand);

      return true;

    } catch (error) {
      this.logger.error(`Error executing command ${commandName}:`, error);
      
      // Send error message to user
      try {
        await bot.sendMessage(messageInfo.from, {
          text: `❌ *ERROR*\n\nTerjadi error saat menjalankan command.\n\nError: ${error.message}`
        });
      } catch (sendError) {
        this.logger.error('Failed to send error message:', sendError);
      }

      // Log error to database
      await db.logError(error);

      return false;
    }
  }

  /**
   * Check if command exists
   * @param {string} commandName - Command name
   * @returns {boolean}
   */
  has(commandName) {
    return this.commands.has(commandName) || this.aliases.has(commandName);
  }

  /**
   * Get command info
   * @param {string} commandName - Command name
   * @returns {Object|null} Command info
   */
  get(commandName) {
    const actualCommand = this.aliases.get(commandName) || commandName;
    return this.commands.get(actualCommand) || null;
  }

  /**
   * Get all commands for a role
   * @param {string} role - Role (author/owner/user)
   * @returns {Array} Commands
   */
  getCommandsByRole(role) {
    const commands = [];
    
    for (const [name, command] of this.commands) {
      if (command.role === role) {
        commands.push({ name, ...command });
      }
    }

    return commands;
  }

  /**
   * Get all command names
   * @returns {Array} Command names
   */
  getAllCommands() {
    return Array.from(this.commands.keys());
  }

  /**
   * Get command statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalCommands: this.commands.size,
      totalAliases: this.aliases.size,
      commandsByRole: {
        author: this.getCommandsByRole('author').length,
        owner: this.getCommandsByRole('owner').length,
        user: this.getCommandsByRole('user').length
      }
    };
  }

  /**
   * Reload commands (useful for development)
   */
  async reload() {
    this.logger.info('Reloading commands...');
    this.commands.clear();
    this.aliases.clear();
    this.registerCommands();
    this.logger.info('Commands reloaded successfully');
  }
}

// Export singleton instance
export const commandManager = new CommandManager();
