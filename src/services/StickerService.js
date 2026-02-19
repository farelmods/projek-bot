/**
 * ALL-STAR BOT v2.0 - Sticker Service
 * Service for creating stickers
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import sharp from 'sharp';
import { Logger } from '../utils/Logger.js';

export class StickerService {
  constructor() {
    this.logger = new Logger('STICKER-SERVICE');
  }

  /**
   * Create Brat-style sticker
   * @param {string} text - Text to put on sticker
   * @returns {Promise<Buffer>} Sticker buffer in WebP format
   */
  async createBratSticker(text) {
    try {
      this.logger.info(`Creating brat sticker with text: ${text}`);

      // Brat aesthetic: chartreuse green background (#8ACE00)
      const width = 512;
      const height = 512;
      const backgroundColor = { r: 138, g: 206, b: 0 };

      // Create base image
      const svgImage = `
        <svg width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="rgb(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b})"/>
          <text 
            x="50%" 
            y="50%" 
            font-family="Arial Black, sans-serif" 
            font-size="48" 
            font-weight="bold"
            fill="black" 
            text-anchor="middle" 
            dominant-baseline="middle"
            style="text-transform: lowercase;">
            ${this.escapeXml(text)}
          </text>
        </svg>
      `;

      // Convert to WebP sticker format
      const sticker = await sharp(Buffer.from(svgImage))
        .resize(512, 512, {
          fit: 'contain',
          background: backgroundColor
        })
        .webp()
        .toBuffer();

      this.logger.info('Brat sticker created successfully');

      return sticker;

    } catch (error) {
      this.logger.error('Brat sticker creation error:', error);
      throw error;
    }
  }

  /**
   * Convert image to sticker
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Buffer>} Sticker buffer in WebP format
   */
  async imageToSticker(imageBuffer) {
    try {
      this.logger.info('Converting image to sticker');

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();

      // Process image
      const sticker = await sharp(imageBuffer)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .webp()
        .toBuffer();

      this.logger.info('Image converted to sticker successfully');

      return sticker;

    } catch (error) {
      this.logger.error('Image to sticker conversion error:', error);
      throw error;
    }
  }

  /**
   * Create text sticker with custom style
   * @param {string} text - Text content
   * @param {Object} options - Style options
   * @returns {Promise<Buffer>} Sticker buffer
   */
  async createTextSticker(text, options = {}) {
    try {
      const {
        backgroundColor = { r: 255, g: 255, b: 255 },
        textColor = 'black',
        fontSize = 48,
        fontFamily = 'Arial'
      } = options;

      const width = 512;
      const height = 512;

      const svgImage = `
        <svg width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="rgb(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b})"/>
          <text 
            x="50%" 
            y="50%" 
            font-family="${fontFamily}" 
            font-size="${fontSize}" 
            fill="${textColor}" 
            text-anchor="middle" 
            dominant-baseline="middle">
            ${this.escapeXml(text)}
          </text>
        </svg>
      `;

      const sticker = await sharp(Buffer.from(svgImage))
        .resize(512, 512)
        .webp()
        .toBuffer();

      return sticker;

    } catch (error) {
      this.logger.error('Text sticker creation error:', error);
      throw error;
    }
  }

  /**
   * Add text overlay to image
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} text - Text to overlay
   * @param {Object} options - Text options
   * @returns {Promise<Buffer>} Sticker with text overlay
   */
  async addTextToImage(imageBuffer, text, options = {}) {
    try {
      const {
        position = 'bottom',
        fontSize = 36,
        textColor = 'white',
        backgroundColor = 'rgba(0,0,0,0.5)'
      } = options;

      // Calculate position
      let yPosition;
      switch (position) {
        case 'top':
          yPosition = '10%';
          break;
        case 'middle':
          yPosition = '50%';
          break;
        case 'bottom':
        default:
          yPosition = '90%';
          break;
      }

      const svgOverlay = `
        <svg width="512" height="512">
          <rect x="0" y="${yPosition}" width="512" height="${fontSize + 20}" fill="${backgroundColor}"/>
          <text 
            x="50%" 
            y="${yPosition}" 
            font-family="Arial" 
            font-size="${fontSize}" 
            fill="${textColor}" 
            text-anchor="middle" 
            dominant-baseline="middle">
            ${this.escapeXml(text)}
          </text>
        </svg>
      `;

      const sticker = await sharp(imageBuffer)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .composite([{
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0
        }])
        .webp()
        .toBuffer();

      return sticker;

    } catch (error) {
      this.logger.error('Text overlay error:', error);
      throw error;
    }
  }

  /**
   * Escape XML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Validate image buffer
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<boolean>} Is valid image
   */
  async isValidImage(buffer) {
    try {
      await sharp(buffer).metadata();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get image dimensions
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<Object>} Width and height
   */
  async getImageDimensions(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      this.logger.error('Get image dimensions error:', error);
      throw error;
    }
  }

  /**
   * Create circular sticker
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Buffer>} Circular sticker
   */
  async createCircularSticker(imageBuffer) {
    try {
      const circleRadius = 256;

      const circle = Buffer.from(
        `<svg><circle cx="${circleRadius}" cy="${circleRadius}" r="${circleRadius}" /></svg>`
      );

      const sticker = await sharp(imageBuffer)
        .resize(512, 512)
        .composite([{
          input: circle,
          blend: 'dest-in'
        }])
        .webp()
        .toBuffer();

      return sticker;

    } catch (error) {
      this.logger.error('Circular sticker error:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      outputFormat: 'image/webp',
      maxDimensions: { width: 512, height: 512 }
    };
  }
}

// Export singleton instance
export const stickerService = new StickerService();
