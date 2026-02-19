/**
 * ALL-STAR BOT v2.0 - Main Entry Point
 * Enterprise-Grade WhatsApp Security & Moderation Bot
 * 
 * @author Liand (@Liand_fullstackdev)
 * @version 2.0.0
 * @license MIT
 */

import 'dotenv/config';
import chalk from 'chalk';
import figlet from 'figlet';
import { BotCore } from './src/core/BotCore.js';
import { Logger } from './src/utils/Logger.js';
import { SystemMonitor } from './src/utils/SystemMonitor.js';
import { validateEnvironment } from './src/utils/EnvironmentValidator.js';
import { gameService } from './src/services/GameService.js';
import { backupManager } from './src/utils/Backup.js';
import { cleanupManager } from './src/utils/Cleanup.js';

// Initialize Logger
const logger = new Logger('MAIN');

// Banner Display
function displayBanner() {
  console.clear();
  console.log(chalk.cyan(figlet.textSync('ALL-STAR', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  })));
  
  console.log(chalk.green('═'.repeat(70)));
  console.log(chalk.white.bold(`  Enterprise-Grade WhatsApp Security & Moderation Bot`));
  console.log(chalk.yellow(`  Version: ${process.env.BOT_VERSION || '2.0.0'}`));
  console.log(chalk.cyan(`  Author: ${process.env.AUTHOR_NAME || 'Liand'} (@Liand_fullstackdev)`));
  console.log(chalk.magenta(`  Panel: ${process.env.PANEL_NAME || 'Unknown'}`));
  console.log(chalk.green('═'.repeat(70)));
  console.log('');
}

// Global Error Handlers
process.on('uncaughtException', (error) => {
  logger.critical('Uncaught Exception detected:', error);
  console.error(chalk.red.bold('❌ CRITICAL ERROR - Uncaught Exception:'), error);
  
  // Attempt graceful shutdown
  if (global.botInstance) {
    global.botInstance.emergencyShutdown();
  }
  
  // Exit after 3 seconds
  setTimeout(() => {
    process.exit(1);
  }, 3000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  console.error(chalk.red.bold('⚠️  Unhandled Promise Rejection:'), reason);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  console.log(chalk.yellow('\n⚠️  Shutting down gracefully...'));
  
  if (global.botInstance) {
    await global.botInstance.shutdown();
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  console.log(chalk.yellow('\n⚠️  Shutting down gracefully...'));
  
  if (global.botInstance) {
    await global.botInstance.shutdown();
  }
  
  process.exit(0);
});

// Main Bootstrap Function
async function bootstrap() {
  try {
    displayBanner();
    
    logger.info('Starting ALL-STAR Bot initialization...');
    console.log(chalk.blue('🚀 Initializing ALL-STAR Bot...'));
    
    // Step 1: Validate Environment
    console.log(chalk.cyan('📋 Step 1: Validating environment configuration...'));
    const envValidation = validateEnvironment();
    
    if (!envValidation.valid) {
      logger.error('Environment validation failed:', envValidation.errors);
      console.error(chalk.red.bold('❌ Environment validation failed:'));
      envValidation.errors.forEach(err => {
        console.error(chalk.red(`   - ${err}`));
      });
      process.exit(1);
    }
    
    console.log(chalk.green('✅ Environment validation passed\n'));
    
    // Step 2: Initialize System Monitor
    console.log(chalk.cyan('📊 Step 2: Initializing system monitor...'));
    const systemMonitor = new SystemMonitor();
    await systemMonitor.initialize();
    global.systemMonitor = systemMonitor;
    console.log(chalk.green('✅ System monitor initialized\n'));
    
    // Step 2.5: Initialize GameService, Backup, and Cleanup
    console.log(chalk.cyan('🎮 Step 2.5: Initializing services...'));
    global.gameService = gameService;
    await backupManager.initialize();
    await cleanupManager.initialize();
    console.log(chalk.green('✅ Services initialized\n'));
    
    // Step 3: Initialize Bot Core
    console.log(chalk.cyan('🤖 Step 3: Initializing bot core...'));
    const bot = new BotCore();
    global.botInstance = bot;
    
    await bot.initialize();
    console.log(chalk.green('✅ Bot core initialized\n'));
    
    // Step 4: Start Bot
    console.log(chalk.cyan('🔌 Step 4: Connecting to WhatsApp...'));
    await bot.start();
    
    console.log(chalk.green.bold('\n✨ ALL-STAR Bot is now ONLINE and ready!\n'));
    logger.info('ALL-STAR Bot started successfully');
    
    // Display System Info
    const systemInfo = await systemMonitor.getSystemInfo();
    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.white.bold('📡 SYSTEM STATUS'));
    console.log(chalk.gray(`   CPU: ${systemInfo.cpu.usage.toFixed(2)}%`));
    console.log(chalk.gray(`   RAM: ${systemInfo.memory.usedMemMb.toFixed(0)} MB / ${systemInfo.memory.totalMemMb.toFixed(0)} MB (${systemInfo.memory.percentage.toFixed(2)}%)`));
    console.log(chalk.gray(`   Disk: ${systemInfo.disk.percentage.toFixed(2)}% used`));
    console.log(chalk.gray(`   Node: ${systemInfo.node.version}`));
    console.log(chalk.gray(`   Platform: ${systemInfo.node.platform}`));
    console.log(chalk.gray('─'.repeat(70)));
    console.log('');
    
  } catch (error) {
    logger.critical('Failed to start bot:', error);
    console.error(chalk.red.bold('\n❌ FATAL ERROR - Failed to start bot:'));
    console.error(chalk.red(error.message));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

// Start the bot
bootstrap();

// Export for testing purposes
export default bootstrap;