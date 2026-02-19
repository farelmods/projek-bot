/**
 * ALL-STAR BOT v2.0 - File Helper
 * Utilities for file operations
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import fs from 'fs';
import path from 'path';
import { Logger } from './Logger.js';

export class FileHelper {
  constructor() {
    this.logger = new Logger('FILE-HELPER');
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path
   * @returns {boolean}
   */
  static exists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   * @param {string} filePath - File path
   * @param {string} encoding - File encoding
   * @returns {string|Buffer} File content
   */
  static read(filePath, encoding = 'utf-8') {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Write file content
   * @param {string} filePath - File path
   * @param {string|Buffer} content - Content to write
   * @param {string} encoding - File encoding
   */
  static write(filePath, content, encoding = 'utf-8') {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, encoding);
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * Append to file
   * @param {string} filePath - File path
   * @param {string} content - Content to append
   */
  static append(filePath, content) {
    try {
      fs.appendFileSync(filePath, content);
    } catch (error) {
      throw new Error(`Failed to append to file: ${error.message}`);
    }
  }

  /**
   * Delete file
   * @param {string} filePath - File path
   */
  static delete(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Copy file
   * @param {string} source - Source path
   * @param {string} destination - Destination path
   */
  static copy(source, destination) {
    try {
      const dir = path.dirname(destination);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.copyFileSync(source, destination);
    } catch (error) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Move file
   * @param {string} source - Source path
   * @param {string} destination - Destination path
   */
  static move(source, destination) {
    try {
      this.copy(source, destination);
      this.delete(source);
    } catch (error) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  /**
   * Get file size
   * @param {string} filePath - File path
   * @returns {number} Size in bytes
   */
  static getSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get file extension
   * @param {string} filePath - File path
   * @returns {string} Extension
   */
  static getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Get file name without extension
   * @param {string} filePath - File path
   * @returns {string} File name
   */
  static getNameWithoutExtension(filePath) {
    const ext = path.extname(filePath);
    const base = path.basename(filePath);
    return base.slice(0, base.length - ext.length);
  }

  /**
   * List files in directory
   * @param {string} dirPath - Directory path
   * @param {string} extension - Filter by extension (optional)
   * @returns {Array} File list
   */
  static listFiles(dirPath, extension = null) {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      let files = fs.readdirSync(dirPath);

      if (extension) {
        const ext = extension.startsWith('.') ? extension : `.${extension}`;
        files = files.filter(f => path.extname(f).toLowerCase() === ext);
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * Create directory
   * @param {string} dirPath - Directory path
   */
  static createDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  /**
   * Delete directory
   * @param {string} dirPath - Directory path
   * @param {boolean} recursive - Delete recursively
   */
  static deleteDirectory(dirPath, recursive = false) {
    try {
      if (fs.existsSync(dirPath)) {
        if (recursive) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        } else {
          fs.rmdirSync(dirPath);
        }
      }
    } catch (error) {
      throw new Error(`Failed to delete directory: ${error.message}`);
    }
  }

  /**
   * Check if path is directory
   * @param {string} dirPath - Path to check
   * @returns {boolean}
   */
  static isDirectory(dirPath) {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   * @param {string} filePath - File path
   * @returns {Object} File stats
   */
  static getStats(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Read JSON file
   * @param {string} filePath - File path
   * @returns {Object} Parsed JSON
   */
  static readJSON(filePath) {
    try {
      const content = this.read(filePath);
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read JSON file: ${error.message}`);
    }
  }

  /**
   * Write JSON file
   * @param {string} filePath - File path
   * @param {Object} data - Data to write
   * @param {boolean} pretty - Pretty print
   */
  static writeJSON(filePath, data, pretty = true) {
    try {
      const content = pretty 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
      
      this.write(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write JSON file: ${error.message}`);
    }
  }

  /**
   * Get temp file path
   * @param {string} extension - File extension
   * @returns {string} Temp file path
   */
  static getTempPath(extension = '.tmp') {
    const tmpDir = path.join(process.cwd(), 'temp');
    this.createDirectory(tmpDir);
    
    const filename = `temp_${Date.now()}${extension}`;
    return path.join(tmpDir, filename);
  }

  /**
   * Clean temp files
   * @param {number} maxAge - Max age in ms
   */
  static cleanTempFiles(maxAge = 3600000) {
    try {
      const tmpDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tmpDir)) return;

      const files = fs.readdirSync(tmpDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(tmpDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get directory size
   * @param {string} dirPath - Directory path
   * @returns {number} Total size in bytes
   */
  static getDirectorySize(dirPath) {
    try {
      let totalSize = 0;

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Format file size to readable string
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  static formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  static ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Safe file operation with retry
   * @param {Function} operation - Operation to perform
   * @param {number} retries - Number of retries
   * @returns {Promise<*>} Operation result
   */
  static async safeOperation(operation, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}

export const fileHelper = FileHelper;
