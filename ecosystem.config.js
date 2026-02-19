/**
 * ALL-STAR BOT v2.0 - PM2 Configuration
 * Production deployment configuration
 * 
 * @author Liand (@Liand_fullstackdev)
 */

module.exports = {
  apps: [
    {
      name: 'all-star-bot',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      wait_ready: false,
      exp_backoff_restart_delay: 100,
      
      // Advanced options
      node_args: '--max-old-space-size=2048',
      
      // Environment specific configurations
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/liand/all-star-bot.git',
      path: '/var/www/all-star-bot',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};