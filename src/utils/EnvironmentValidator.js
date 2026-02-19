/**
 * ALL-STAR BOT v2.0 - Environment Validator
 * Validates all required environment variables
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import fs from 'fs';
import path from 'path';

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check if .env file exists
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    errors.push('.env file not found. Please copy .env.example to .env and configure it.');
    return { valid: false, errors, warnings };
  }

  // Required variables
  const required = [
    'BOT_NAME',
    'BOT_VERSION',
    'AUTHOR_NUMBER'
  ];

  // Check required variables
  for (const variable of required) {
    if (!process.env[variable]) {
      errors.push(`Missing required environment variable: ${variable}`);
    }
  }

  // Validate AUTHOR_NUMBER format
  if (process.env.AUTHOR_NUMBER) {
    const number = process.env.AUTHOR_NUMBER;
    if (!/^62\d{9,13}$/.test(number)) {
      errors.push('AUTHOR_NUMBER must be in format: 62xxxxxxxxxx (Indonesian number)');
    }
  }

  // Check Claude AI configuration if enabled
  if (process.env.ENABLE_AI === 'true') {
    if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY === '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') {
      warnings.push('AI is enabled but CLAUDE_API_KEY is not properly configured. AI features will be disabled.');
    }
  }

  // Validate numeric values
  const numericVars = [
    'MAX_WARN',
    'MUTE_DURATION_SPAM',
    'COOLDOWN_COMMAND',
    'ANTI_SPAM_THRESHOLD',
    'CPU_THRESHOLD',
    'RAM_THRESHOLD'
  ];

  for (const variable of numericVars) {
    if (process.env[variable]) {
      const value = parseInt(process.env[variable]);
      if (isNaN(value) || value < 0) {
        errors.push(`${variable} must be a positive number`);
      }
    }
  }

  // Check database path
  if (process.env.DB_PATH) {
    const dbDir = path.dirname(path.resolve(process.cwd(), process.env.DB_PATH));
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (error) {
        errors.push(`Cannot create database directory: ${dbDir}`);
      }
    }
  }

  // Check backup path
  if (process.env.BACKUP_PATH) {
    const backupDir = path.resolve(process.cwd(), process.env.BACKUP_PATH);
    if (!fs.existsSync(backupDir)) {
      try {
        fs.mkdirSync(backupDir, { recursive: true });
      } catch (error) {
        warnings.push(`Cannot create backup directory: ${backupDir}. Auto backup may fail.`);
      }
    }
  }

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 18) {
    errors.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  }

  // Validate timezone
  if (process.env.TIMEZONE) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: process.env.TIMEZONE });
    } catch (error) {
      warnings.push(`Invalid timezone: ${process.env.TIMEZONE}. Using default Asia/Jakarta.`);
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function createEnvExample() {
  const envExample = `# ALL-STAR BOT v2.0 - Configuration File
# Created by: Liand (@Liand_fullstackdev)

BOT_NAME=ALL-STAR
BOT_VERSION=2.0.0
AUTHOR_NUMBER=6282382734762

CLAUDE_API_KEY=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
ENABLE_AI=true

# Add other configuration as needed
`;

  const envPath = path.resolve(process.cwd(), '.env.example');
  fs.writeFileSync(envPath, envExample);
  console.log('✅ .env.example created');
}