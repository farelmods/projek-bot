/**
 * ALL-STAR BOT v2.0 - Date Helper
 * Utilities for date and time operations
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import moment from 'moment-timezone';
import { config } from '../config/BotConfig.js';

export class DateHelper {
  /**
   * Get current timestamp
   * @returns {number} Current timestamp
   */
  static now() {
    return Date.now();
  }

  /**
   * Get current date formatted
   * @param {string} format - Date format
   * @returns {string} Formatted date
   */
  static currentDate(format = 'YYYY-MM-DD') {
    return moment().tz(config.get('system.timezone')).format(format);
  }

  /**
   * Get current time formatted
   * @param {string} format - Time format
   * @returns {string} Formatted time
   */
  static currentTime(format = 'HH:mm:ss') {
    return moment().tz(config.get('system.timezone')).format(format);
  }

  /**
   * Get current datetime formatted
   * @param {string} format - Datetime format
   * @returns {string} Formatted datetime
   */
  static currentDateTime(format = 'YYYY-MM-DD HH:mm:ss') {
    return moment().tz(config.get('system.timezone')).format(format);
  }

  /**
   * Format timestamp to date
   * @param {number} timestamp - Unix timestamp
   * @param {string} format - Date format
   * @returns {string} Formatted date
   */
  static formatTimestamp(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
    return moment(timestamp).tz(config.get('system.timezone')).format(format);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Relative time
   */
  static timeAgo(timestamp) {
    return moment(timestamp).tz(config.get('system.timezone')).fromNow();
  }

  /**
   * Get time until (e.g., "in 2 hours")
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Time until
   */
  static timeUntil(timestamp) {
    return moment(timestamp).tz(config.get('system.timezone')).toNow();
  }

  /**
   * Add time to timestamp
   * @param {number} timestamp - Base timestamp
   * @param {number} amount - Amount to add
   * @param {string} unit - Time unit (minutes, hours, days)
   * @returns {number} New timestamp
   */
  static addTime(timestamp, amount, unit = 'minutes') {
    return moment(timestamp).add(amount, unit).valueOf();
  }

  /**
   * Subtract time from timestamp
   * @param {number} timestamp - Base timestamp
   * @param {number} amount - Amount to subtract
   * @param {string} unit - Time unit
   * @returns {number} New timestamp
   */
  static subtractTime(timestamp, amount, unit = 'minutes') {
    return moment(timestamp).subtract(amount, unit).valueOf();
  }

  /**
   * Get difference between two timestamps
   * @param {number} timestamp1 - First timestamp
   * @param {number} timestamp2 - Second timestamp
   * @param {string} unit - Unit for difference
   * @returns {number} Difference
   */
  static diff(timestamp1, timestamp2, unit = 'milliseconds') {
    return moment(timestamp1).diff(moment(timestamp2), unit);
  }

  /**
   * Check if timestamp is in the past
   * @param {number} timestamp - Timestamp to check
   * @returns {boolean}
   */
  static isPast(timestamp) {
    return timestamp < Date.now();
  }

  /**
   * Check if timestamp is in the future
   * @param {number} timestamp - Timestamp to check
   * @returns {boolean}
   */
  static isFuture(timestamp) {
    return timestamp > Date.now();
  }

  /**
   * Check if timestamp is today
   * @param {number} timestamp - Timestamp to check
   * @returns {boolean}
   */
  static isToday(timestamp) {
    return moment(timestamp).tz(config.get('system.timezone')).isSame(moment(), 'day');
  }

  /**
   * Check if timestamp is yesterday
   * @param {number} timestamp - Timestamp to check
   * @returns {boolean}
   */
  static isYesterday(timestamp) {
    return moment(timestamp).tz(config.get('system.timezone')).isSame(moment().subtract(1, 'day'), 'day');
  }

  /**
   * Get start of day timestamp
   * @param {number} timestamp - Base timestamp
   * @returns {number} Start of day timestamp
   */
  static startOfDay(timestamp = Date.now()) {
    return moment(timestamp).tz(config.get('system.timezone')).startOf('day').valueOf();
  }

  /**
   * Get end of day timestamp
   * @param {number} timestamp - Base timestamp
   * @returns {number} End of day timestamp
   */
  static endOfDay(timestamp = Date.now()) {
    return moment(timestamp).tz(config.get('system.timezone')).endOf('day').valueOf();
  }

  /**
   * Parse duration string (e.g., "10m", "2h", "1d")
   * @param {string} durationStr - Duration string
   * @returns {number} Duration in milliseconds
   */
  static parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([mhd])$/i);
    
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Format duration in milliseconds to readable string
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get uptime string from start timestamp
   * @param {number} startTime - Start timestamp
   * @returns {string} Uptime string
   */
  static getUptime(startTime) {
    const uptimeMs = Date.now() - startTime;
    return this.formatDuration(uptimeMs);
  }

  /**
   * Get day name from timestamp
   * @param {number} timestamp - Timestamp
   * @returns {string} Day name
   */
  static getDayName(timestamp = Date.now()) {
    return moment(timestamp).tz(config.get('system.timezone')).format('dddd');
  }

  /**
   * Get month name from timestamp
   * @param {number} timestamp - Timestamp
   * @returns {string} Month name
   */
  static getMonthName(timestamp = Date.now()) {
    return moment(timestamp).tz(config.get('system.timezone')).format('MMMM');
  }

  /**
   * Get week number
   * @param {number} timestamp - Timestamp
   * @returns {number} Week number
   */
  static getWeekNumber(timestamp = Date.now()) {
    return moment(timestamp).tz(config.get('system.timezone')).week();
  }

  /**
   * Check if date is weekend
   * @param {number} timestamp - Timestamp
   * @returns {boolean}
   */
  static isWeekend(timestamp = Date.now()) {
    const day = moment(timestamp).tz(config.get('system.timezone')).day();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Get time remaining until timestamp
   * @param {number} futureTimestamp - Future timestamp
   * @returns {Object} Time remaining object
   */
  static getTimeRemaining(futureTimestamp) {
    const now = Date.now();
    const diff = futureTimestamp - now;

    if (diff <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return {
      expired: false,
      days,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60,
      total: diff
    };
  }

  /**
   * Create scheduled timestamp
   * @param {string} time - Time string (HH:mm)
   * @param {string} date - Date string (YYYY-MM-DD) or 'today', 'tomorrow'
   * @returns {number} Scheduled timestamp
   */
  static createScheduledTime(time, date = 'today') {
    const [hours, minutes] = time.split(':').map(Number);
    
    let targetDate;
    if (date === 'today') {
      targetDate = moment().tz(config.get('system.timezone'));
    } else if (date === 'tomorrow') {
      targetDate = moment().tz(config.get('system.timezone')).add(1, 'day');
    } else {
      targetDate = moment(date).tz(config.get('system.timezone'));
    }

    targetDate.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

    return targetDate.valueOf();
  }

  /**
   * Get timezone name
   * @returns {string} Timezone name
   */
  static getTimezone() {
    return config.get('system.timezone');
  }

  /**
   * Convert to different timezone
   * @param {number} timestamp - Timestamp
   * @param {string} timezone - Target timezone
   * @param {string} format - Format string
   * @returns {string} Formatted time in target timezone
   */
  static convertTimezone(timestamp, timezone, format = 'YYYY-MM-DD HH:mm:ss') {
    return moment(timestamp).tz(timezone).format(format);
  }

  /**
   * Get calendar format (Today, Yesterday, etc.)
   * @param {number} timestamp - Timestamp
   * @returns {string} Calendar format
   */
  static calendar(timestamp) {
    return moment(timestamp).tz(config.get('system.timezone')).calendar();
  }

  /**
   * Get human readable date
   * @param {number} timestamp - Timestamp
   * @returns {string} Human readable date
   */
  static humanDate(timestamp) {
    if (this.isToday(timestamp)) {
      return 'Hari ini, ' + moment(timestamp).tz(config.get('system.timezone')).format('HH:mm');
    } else if (this.isYesterday(timestamp)) {
      return 'Kemarin, ' + moment(timestamp).tz(config.get('system.timezone')).format('HH:mm');
    } else {
      return moment(timestamp).tz(config.get('system.timezone')).format('DD MMM YYYY, HH:mm');
    }
  }

  /**
   * Sleep/delay function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const dateHelper = DateHelper;
