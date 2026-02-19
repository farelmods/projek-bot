/**
 * ALL-STAR BOT v2.0 - Geo-Restriction Module
 * Restricts group access to Indonesian numbers only
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from '../utils/Logger.js';
import { db } from '../database/Database.js';

export class GeoRestriction {
  constructor() {
    this.logger = new Logger('GEO-RESTRICTION');
    
    // Allowed country codes
    this.allowedCountries = ['62']; // Indonesia only
    
    // Whitelist for exceptions (e.g., important foreign contacts)
    this.whitelist = new Set();
  }

  /**
   * Detect if phone number is allowed
   * @param {string} phoneNumber - Phone number (without @ and domain)
   * @returns {Object} Detection result
   */
  detect(phoneNumber) {
    try {
      // Remove any non-digit characters
      const cleanNumber = phoneNumber.replace(/\D/g, '');

      // Check if in whitelist
      if (this.whitelist.has(cleanNumber)) {
        return {
          allowed: true,
          reason: 'whitelisted',
          country: this.getCountryFromNumber(cleanNumber)
        };
      }

      // Check if starts with allowed country code
      const isAllowed = this.allowedCountries.some(code => 
        cleanNumber.startsWith(code)
      );

      const country = this.getCountryFromNumber(cleanNumber);

      if (!isAllowed) {
        this.logger.warn(`Foreign number detected: ${cleanNumber} (${country})`);
      }

      return {
        allowed: isAllowed,
        reason: isAllowed ? 'allowed_country' : 'foreign_country',
        country,
        phoneNumber: cleanNumber
      };

    } catch (error) {
      this.logger.error('Error detecting geo-restriction:', error);
      return {
        allowed: true,
        reason: 'error'
      };
    }
  }

  /**
   * Get country from phone number
   * @param {string} phoneNumber - Phone number
   * @returns {string} Country name
   */
  getCountryFromNumber(phoneNumber) {
    const countryMap = {
      '62': 'Indonesia',
      '1': 'USA/Canada',
      '44': 'UK',
      '91': 'India',
      '86': 'China',
      '81': 'Japan',
      '82': 'South Korea',
      '65': 'Singapore',
      '60': 'Malaysia',
      '66': 'Thailand',
      '63': 'Philippines',
      '84': 'Vietnam'
    };

    for (const [code, country] of Object.entries(countryMap)) {
      if (phoneNumber.startsWith(code)) {
        return country;
      }
    }

    return 'Unknown';
  }

  /**
   * Handle geo-restriction violation
   * @param {Object} bot - Bot instance
   * @param {string} groupId - Group JID
   * @param {string} participant - Participant JID
   */
  async handle(bot, groupId, participant) {
    try {
      const phoneNumber = participant.split('@')[0];
      const detection = this.detect(phoneNumber);

      // Kick user
      await bot.kickParticipant(groupId, [participant]);

      // Send notification
      let message = `🚫 *GEO-RESTRICTION VIOLATION*\n\n`;
      message += `User: @${phoneNumber}\n`;
      message += `Country: ${detection.country}\n`;
      message += `Reason: Foreign Number\n\n`;
      message += `This group only allows Indonesian numbers (+62).`;

      await bot.sendMessage(groupId, {
        text: message,
        mentions: [participant]
      });

      this.logger.security(
        'Kick',
        phoneNumber,
        `Geo-restriction: ${detection.country}`,
        'SYSTEM'
      );

      // Log to statistics
      await db.incrementViolation('geoRestriction');

    } catch (error) {
      this.logger.error('Error handling geo-restriction violation:', error);
    }
  }

  /**
   * Check if group has geo-restriction enabled
   * @param {string} groupId - Group JID
   * @returns {boolean}
   */
  isEnabled(groupId) {
    const settings = db.getGroupSettings(groupId);
    return settings.geoRestriction !== false;
  }

  /**
   * Enable geo-restriction for group
   * @param {string} groupId - Group JID
   */
  async enable(groupId) {
    await db.updateGroupSetting(groupId, 'geoRestriction', true);
    this.logger.info(`Geo-restriction enabled for group: ${groupId}`);
  }

  /**
   * Disable geo-restriction for group
   * @param {string} groupId - Group JID
   */
  async disable(groupId) {
    await db.updateGroupSetting(groupId, 'geoRestriction', false);
    this.logger.info(`Geo-restriction disabled for group: ${groupId}`);
  }

  /**
   * Add number to whitelist
   * @param {string} phoneNumber - Phone number to whitelist
   */
  addToWhitelist(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    this.whitelist.add(cleanNumber);
    this.logger.info(`Number added to geo-restriction whitelist: ${cleanNumber}`);
  }

  /**
   * Remove number from whitelist
   * @param {string} phoneNumber - Phone number to remove
   */
  removeFromWhitelist(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    this.whitelist.delete(cleanNumber);
    this.logger.info(`Number removed from geo-restriction whitelist: ${cleanNumber}`);
  }

  /**
   * Check if number is whitelisted
   * @param {string} phoneNumber - Phone number
   * @returns {boolean}
   */
  isWhitelisted(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return this.whitelist.has(cleanNumber);
  }

  /**
   * Get whitelist
   * @returns {Array} Whitelisted numbers
   */
  getWhitelist() {
    return Array.from(this.whitelist);
  }

  /**
   * Add allowed country code
   * @param {string} countryCode - Country code (e.g., '1', '44')
   */
  addAllowedCountry(countryCode) {
    if (!this.allowedCountries.includes(countryCode)) {
      this.allowedCountries.push(countryCode);
      this.logger.info(`Country code added to allowed list: ${countryCode}`);
    }
  }

  /**
   * Remove allowed country code
   * @param {string} countryCode - Country code
   */
  removeAllowedCountry(countryCode) {
    const index = this.allowedCountries.indexOf(countryCode);
    if (index > -1) {
      this.allowedCountries.splice(index, 1);
      this.logger.info(`Country code removed from allowed list: ${countryCode}`);
    }
  }

  /**
   * Get allowed countries
   * @returns {Array} Allowed country codes
   */
  getAllowedCountries() {
    return [...this.allowedCountries];
  }

  /**
   * Check if country is allowed
   * @param {string} countryCode - Country code
   * @returns {boolean}
   */
  isCountryAllowed(countryCode) {
    return this.allowedCountries.includes(countryCode);
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      allowedCountries: this.allowedCountries.length,
      whitelistedNumbers: this.whitelist.size
    };
  }
}

// Export singleton instance
export const geoRestriction = new GeoRestriction();
