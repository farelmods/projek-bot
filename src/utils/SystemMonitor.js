/**
 * ALL-STAR BOT v2.0 - System Monitor
 * Real-time system resource monitoring
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import moment from 'moment-timezone';
import si from 'systeminformation';
import os from 'os';
import { Logger } from './Logger.js';
import { config } from '../config/BotConfig.js';

export class SystemMonitor {
  constructor() {
    this.logger = new Logger('SYSTEM-MONITOR');
    this.startTime = Date.now();
    this.restartCount = 0;
    this.lastCheck = null;
    this.alertSent = {
      cpu: false,
      ram: false,
      disk: false
    };
    this.monitoringInterval = null;
  }

  async initialize() {
    this.logger.info('Initializing system monitor...');
    await this.startMonitoring();
    this.logger.info('System monitor initialized');
  }

  async startMonitoring() {
    const interval = config.get('monitoring.interval') * 1000; // Convert to milliseconds
    
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);
  }

  async performHealthCheck() {
    try {
      const systemInfo = await this.getSystemInfo();
      this.lastCheck = Date.now();

      const cpuUsage = systemInfo.cpu.usage;
      const ramPercentage = systemInfo.memory.percentage;
      const diskPercentage = systemInfo.disk.percentage;

      // Check CPU
      if (cpuUsage > config.get('monitoring.cpu.critical')) {
        await this.handleCriticalLoad('CPU', cpuUsage);
      } else if (cpuUsage > config.get('monitoring.cpu.threshold')) {
        await this.handleHighLoad('CPU', cpuUsage);
      } else {
        this.alertSent.cpu = false;
      }

      // Check RAM
      if (ramPercentage > config.get('monitoring.ram.critical')) {
        await this.handleCriticalLoad('RAM', ramPercentage);
      } else if (ramPercentage > config.get('monitoring.ram.threshold')) {
        await this.handleHighLoad('RAM', ramPercentage);
      } else {
        this.alertSent.ram = false;
      }

      // Check Disk
      if (diskPercentage > config.get('monitoring.disk.critical')) {
        await this.handleCriticalLoad('DISK', diskPercentage);
      } else if (diskPercentage > config.get('monitoring.disk.threshold')) {
        await this.handleHighLoad('DISK', diskPercentage);
      } else {
        this.alertSent.disk = false;
      }

      // Log health check (debug only)
      this.logger.debug(`Health Check: CPU ${cpuUsage.toFixed(2)}% | RAM ${ramPercentage.toFixed(2)}% | DISK ${diskPercentage.toFixed(2)}%`);

    } catch (error) {
      this.logger.error('Error during health check:', error);
    }
  }

  async handleHighLoad(resource, percentage) {
    if (this.alertSent[resource.toLowerCase()]) return;

    this.logger.warn(`⚠️  HIGH ${resource} USAGE: ${percentage.toFixed(2)}%`);
    
    // Send alert to author
    if (global.botInstance) {
      const message = this.formatHighLoadAlert(resource, percentage);
      await global.botInstance.sendMessageToAuthor(message);
    }

    this.alertSent[resource.toLowerCase()] = true;
  }

  async handleCriticalLoad(resource, percentage) {
    this.logger.critical(`🚨 CRITICAL ${resource} USAGE: ${percentage.toFixed(2)}%`);

    // Send critical alert to author
    if (global.botInstance) {
      const message = this.formatCriticalLoadAlert(resource, percentage);
      await global.botInstance.sendMessageToAuthor(message);
    }

    // Auto restart if enabled
    if (config.get('monitoring.autoRestart')) {
      const maxRestarts = config.get('monitoring.maxRestartAttempts');
      
      if (this.restartCount < maxRestarts) {
        this.logger.warn(`Initiating auto restart (attempt ${this.restartCount + 1}/${maxRestarts})...`);
        await this.performAutoRestart(`${resource} usage critical: ${percentage.toFixed(2)}%`);
      } else {
        this.logger.critical('Max restart attempts reached. Manual intervention required.');
      }
    }
  }

  async performAutoRestart(reason) {
    try {
      this.restartCount++;
      const downtime = Date.now();

      this.logger.info('Performing auto restart...');

      // Notify author before restart
      if (global.botInstance) {
        await global.botInstance.sendMessageToAuthor(
          `🔄 AUTO RESTART INITIATED\n\nReason: ${reason}\nRestart attempt: ${this.restartCount}\n\nBot will reconnect shortly...`
        );
      }

      // Graceful shutdown and restart
      if (global.botInstance) {
        await global.botInstance.restart();
      }

      const uptimeAfter = Date.now() - downtime;

      // Notify restart complete
      if (global.botInstance) {
        const message = this.formatRestartNotification(reason, uptimeAfter);
        await global.botInstance.sendMessageToAuthor(message);
      }

      this.logger.info('Auto restart completed successfully');

    } catch (error) {
      this.logger.error('Error during auto restart:', error);
    }
  }

  async getSystemInfo() {
    const [cpu, mem, disk, currentLoad] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad()
    ]);

    const totalDisk = disk.reduce((acc, d) => acc + d.size, 0);
    const usedDisk = disk.reduce((acc, d) => acc + d.used, 0);

    return {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed,
        usage: currentLoad.currentLoad
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        percentage: (mem.used / mem.total) * 100,
        totalMemMb: mem.total / 1024 / 1024,
        usedMemMb: mem.used / 1024 / 1024,
        freeMemMb: mem.free / 1024 / 1024
      },
      disk: {
        total: totalDisk,
        used: usedDisk,
        free: totalDisk - usedDisk,
        percentage: (usedDisk / totalDisk) * 100,
        totalGb: totalDisk / 1024 / 1024 / 1024,
        usedGb: usedDisk / 1024 / 1024 / 1024
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      bot: {
        uptime: this.getUptime(),
        restartCount: this.restartCount
      }
    };
  }

  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatHighLoadAlert(resource, percentage) {
    return `📡 SYSTEM ALERT

⚠️ LOAD HIGH DETECTED

${resource === 'CPU' ? 'CPU' : resource === 'RAM' ? 'RAM' : 'Disk'} : ${percentage.toFixed(2)}%

Status: 🟡 HIGH LOAD
Action: Monitoring aktif
Time  : ${this.getCurrentTime()}`;
  }

  formatCriticalLoadAlert(resource, percentage) {
    return `🚨 CRITICAL ALERT

⚠️ ${resource} USAGE CRITICAL

${resource === 'CPU' ? 'CPU' : resource === 'RAM' ? 'RAM' : 'Disk'} : ${percentage.toFixed(2)}%

Status: 🔴 CRITICAL
Action: Auto restart will be initiated
Time  : ${this.getCurrentTime()}`;
  }

  formatRestartNotification(reason, downtime) {
    return `🔄 SYSTEM RESTARTED

Bot baru saja melakukan restart otomatis.

🕒 ${this.getCurrentTime()}
⏱ Downtime : ${downtime < 1000 ? downtime + ' ms' : (downtime / 1000).toFixed(2) + ' detik'}
🔁 Restart ke : ${this.restartCount}
📶 Status   : Online kembali

Reason: ${reason}`;
  }

  getCurrentTime() {
  return moment()
    .tz(config.get('system.timezone'))
    .format('DD MMM YYYY - HH:mm:ss [WIB]');
}

  async getSystemReport() {
    const systemInfo = await this.getSystemInfo();
    
    return `╭━━━〔 📡 SYSTEM STATUS REPORT 〕━━━⬣
┃ 🤖 Bot Name     : ${config.get('bot.name')}
┃ 🖥 Server       : ${config.get('panel.server')}
┃ 🕒 Time         : ${this.getCurrentTime()}
┃ 📶 Uptime       : ${systemInfo.bot.uptime}
┃ 🔄 Restart Count: ${systemInfo.bot.restartCount}
┣━━━━━━━━━━━━━━━━━━━━
┃ 📊 PANEL STATUS
┃ 🧠 CPU Usage    : ${systemInfo.cpu.usage.toFixed(2)}%
┃ 💾 RAM Usage    : ${systemInfo.memory.usedMemMb.toFixed(0)} MB / ${systemInfo.memory.totalMemMb.toFixed(0)} MB (${systemInfo.memory.percentage.toFixed(2)}%)
┃ 📦 Disk Usage   : ${systemInfo.disk.usedGb.toFixed(2)} GB / ${systemInfo.disk.totalGb.toFixed(2)} GB (${systemInfo.disk.percentage.toFixed(2)}%)
┃ 🌐 Ping         : ${await this.getPing()} ms
┃ 🔥 Load Status  : ${this.getLoadStatus(systemInfo)}
┣━━━━━━━━━━━━━━━━━━━━
┃ 📡 CONNECTION
┃ WhatsApp        : ${global.botInstance?.isConnected() ? '🟢 Connected' : '🔴 Disconnected'}
┃ Database        : 🟢 Active
┃ API             : ${config.get('ai.enabled') ? '🟢 Active' : '🟡 Disabled'}
╰━━━━━━━━━━━━━━━━━━━━⬣`;
  }

  getLoadStatus(systemInfo) {
    const cpu = systemInfo.cpu.usage;
    const ram = systemInfo.memory.percentage;
    const disk = systemInfo.disk.percentage;
    
    const maxUsage = Math.max(cpu, ram, disk);
    
    if (maxUsage > 90) return '🔴 Critical';
    if (maxUsage > 70) return '🟡 High';
    if (maxUsage > 50) return '🟠 Medium';
    return '🟢 Normal';
  }

  async getPing() {
    const start = Date.now();
    try {
      await si.currentLoad();
      return Date.now() - start;
    } catch {
      return 0;
    }
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.logger.info('System monitoring stopped');
    }
  }
}