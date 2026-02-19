/**
 * ALL-STAR BOT v2.0 - Bot Configuration Manager
 * Manages all bot configuration with validation and type safety
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BotConfig {
  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  loadConfiguration() {
    return {
      // Bot Information
      bot: {
        name: process.env.BOT_NAME || 'ALL-STAR',
        version: process.env.BOT_VERSION || '2.0.0',
        prefix: process.env.BOT_PREFIX || '.',
        alternativePrefix: process.env.ALTERNATIVE_PREFIX || '/',
        author: {
          name: process.env.AUTHOR_NAME || 'Liand',
          number: process.env.AUTHOR_NUMBER || '6282382734762'
        }
      },

      // Panel Information
      panel: {
        name: process.env.PANEL_NAME || 'VPS-01',
        server: process.env.SERVER_NAME || 'Singapore-SG1'
      },

      // Claude AI Configuration
      ai: {
        enabled: process.env.ENABLE_AI === 'true',
        apiKey: process.env.CLAUDE_API_KEY || '',
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 1000,
        personality: this.getAIPersonality(),
        rateLimit: {
          perUser: 5,
          perMinute: 20,
          cooldown: 30
        }
      },

      // System Configuration
      system: {
        nodeEnv: process.env.NODE_ENV || 'production',
        port: parseInt(process.env.PORT) || 3000,
        timezone: process.env.TIMEZONE || 'Asia/Jakarta'
      },

      // Database Configuration
      database: {
        path: process.env.DB_PATH || './src/database/data.json',
        backupPath: process.env.BACKUP_PATH || './backups/',
        backupInterval: parseInt(process.env.BACKUP_INTERVAL) || 24,
        autoBackup: process.env.ENABLE_AUTO_BACKUP === 'true'
      },

      // Security Configuration
      security: {
        maxWarn: parseInt(process.env.MAX_WARN) || 3,
        muteDurationSpam: parseInt(process.env.MUTE_DURATION_SPAM) || 10,
        cooldownCommand: parseInt(process.env.COOLDOWN_COMMAND) || 20,
        antiSpamThreshold: parseInt(process.env.ANTI_SPAM_THRESHOLD) || 5,
        antiSpamTime: parseInt(process.env.ANTI_SPAM_TIME) || 10,
        maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH) || 250,
        geoRestriction: {
          enabled: true,
          allowedCountries: ['62'], // Indonesia only
          autoKick: true
        }
      },

      // Defense Mode Configuration
      defense: {
        defaultMode: process.env.DEFAULT_DEFENSE_MODE || 'NORMAL',
        modes: {
          NORMAL: {
            antiSpam: { threshold: 5, time: 10, action: 'warn' },
            antiToxic: { enabled: true, action: 'warn' },
            antiLink: { enabled: true, action: 'delete' },
            antiVirtex: { threshold: 250, action: 'delete' },
            mentionFlood: { threshold: 5, action: 'warn' },
            foreignNumber: { action: 'warn' }
          },
          STRICT: {
            antiSpam: { threshold: 3, time: 10, action: 'mute' },
            antiToxic: { enabled: true, action: 'delete' },
            antiLink: { enabled: true, action: 'kick' },
            antiVirtex: { threshold: 150, action: 'kick' },
            mentionFlood: { threshold: 3, action: 'kick' },
            foreignNumber: { action: 'kick' }
          },
          LOCKDOWN: {
            antiSpam: { threshold: 2, time: 5, action: 'kick' },
            antiToxic: { enabled: true, action: 'kick' },
            antiLink: { enabled: true, action: 'kick' },
            antiVirtex: { threshold: 100, action: 'kick' },
            mentionFlood: { threshold: 2, action: 'kick' },
            foreignNumber: { action: 'kick' },
            shadowMute: { enabled: true },
            adminOnly: { enabled: false }
          }
        }
      },

      // Rate Limiting Configuration
      rateLimit: {
        points: parseInt(process.env.RATE_LIMIT_POINTS) || 10,
        duration: parseInt(process.env.RATE_LIMIT_DURATION) || 60,
        globalLimit: parseInt(process.env.GLOBAL_RATE_LIMIT) || 50
      },

      // Resource Monitoring Configuration
      monitoring: {
        cpu: {
          threshold: parseInt(process.env.CPU_THRESHOLD) || 85,
          critical: 95
        },
        ram: {
          threshold: parseInt(process.env.RAM_THRESHOLD) || 90,
          critical: 95
        },
        disk: {
          threshold: parseInt(process.env.DISK_THRESHOLD) || 85,
          critical: 95
        },
        interval: parseInt(process.env.MONITORING_INTERVAL) || 60,
        autoRestart: process.env.AUTO_RESTART_ON_HIGH_LOAD === 'true',
        autoRestartThreshold: parseInt(process.env.AUTO_RESTART_THRESHOLD) || 95,
        maxRestartAttempts: parseInt(process.env.MAX_RESTART_ATTEMPTS) || 5
      },

      // Logging Configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '14d',
        debugMode: process.env.DEBUG_MODE === 'true',
        verbose: process.env.VERBOSE_LOGGING === 'true'
      },

      // Feature Toggles
      features: {
        ai: process.env.ENABLE_AI === 'true',
        game: process.env.ENABLE_GAME === 'true',
        quotes: process.env.ENABLE_QUOTES === 'true',
        downloadMusic: process.env.ENABLE_DOWNLOAD_MUSIC === 'true',
        downloadTiktok: process.env.ENABLE_DOWNLOAD_TIKTOK === 'true',
        sticker: process.env.ENABLE_STICKER === 'true'
      },

      // Session Configuration
      session: {
        name: process.env.SESSION_NAME || 'all-star-session',
        maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10,
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
        reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL) || 5000,
        maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 10
      },

      // Pairing Code Configuration
      pairing: {
        enabled: process.env.USE_PAIRING_CODE === 'true',
        timeout: parseInt(process.env.PAIRING_CODE_TIMEOUT) || 60000,
        maxRetries: parseInt(process.env.PAIRING_CODE_RETRY) || 3
      },

      // External Services
      external: {
        musicDownloadApi: process.env.MUSIC_DOWNLOAD_API || '',
        tiktokDownloadApi: process.env.TIKTOK_DOWNLOAD_API || '',
        quoteApi: process.env.QUOTE_API || 'https://api.quotable.io/random'
      },

      // Paths
      paths: {
        root: path.resolve(__dirname, '../..'),
        session: path.resolve(__dirname, '../../session'),
        logs: path.resolve(__dirname, '../../logs'),
        temp: path.resolve(__dirname, '../../temp'),
        assets: path.resolve(__dirname, '../../assets'),
        database: path.resolve(__dirname, '../database')
      }
    };
  }

  getAIPersonality() {
    return `Kamu adalah AI assistant untuk ALL-STAR Bot, bot moderasi dan keamanan grup WhatsApp enterprise-grade yang dikembangkan oleh Liand (@Liand_fullstackdev).

KEPRIBADIAN:
- Profesional namun ramah
- Cerdas dan informatif
- Responsif dan membantu
- Menggunakan Bahasa Indonesia yang baik dan benar
- Sesekali menggunakan emoji untuk membuat percakapan lebih hidup

TUGAS:
- Menjawab pertanyaan umum tentang teknologi, programming, dan topik lainnya
- Memberikan informasi yang akurat dan terpercaya
- Membantu user dengan penjelasan yang mudah dipahami
- TIDAK memberikan informasi tentang cara bypass sistem keamanan
- TIDAK membantu aktivitas ilegal atau berbahaya

BATASAN:
- Tidak memberikan informasi pribadi user lain
- Tidak membantu dalam pembuatan konten berbahaya
- Tidak memberikan medical atau legal advice

GAYA BICARA:
- Gunakan bahasa yang santai namun tetap sopan
- Hindari kata-kata kasar atau tidak pantas
- Berikan penjelasan yang terstruktur dan mudah dipahami`;
  }

  validateConfiguration() {
    const required = [
      'bot.name',
      'bot.version',
      'bot.author.number'
    ];

    for (const key of required) {
      const value = this.getNestedValue(this.config, key);
      if (!value) {
        throw new Error(`Missing required configuration: ${key}`);
      }
    }

    // Validate Claude API Key if AI is enabled
    if (this.config.ai.enabled && !this.config.ai.apiKey) {
      console.warn('⚠️  Warning: AI is enabled but CLAUDE_API_KEY is not set');
      this.config.ai.enabled = false;
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  get(key) {
    return this.getNestedValue(this.config, key);
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, k) => {
      if (!current[k]) current[k] = {};
      return current[k];
    }, this.config);
    
    target[lastKey] = value;
  }

  getAll() {
    return { ...this.config };
  }

  // Get defense mode configuration
  getDefenseMode(mode) {
    return this.config.defense.modes[mode] || this.config.defense.modes.NORMAL;
  }

  // Check if feature is enabled
  isFeatureEnabled(feature) {
    return this.config.features[feature] === true;
  }

  // Get AI personality prompt
  getAIPrompt() {
    return this.config.ai.personality;
  }
}

// Export singleton instance
export const config = new BotConfig();