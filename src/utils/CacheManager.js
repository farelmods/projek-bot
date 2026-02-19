/**
 * ALL-STAR BOT v2.0 - Cache Manager
 * In-memory cache with TTL support
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from './Logger.js';

export class CacheManager {
  constructor() {
    this.logger = new Logger('CACHE-MANAGER');
    this.cache = new Map();
    // Format: { key: { value, expires, accessed, hits } }
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    this.defaultTTL = 3600000; // 1 hour
    this.maxSize = 1000; // Maximum cache entries
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in ms
   * @returns {boolean} Success status
   */
  set(key, value, ttl = this.defaultTTL) {
    try {
      // Check cache size limit
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }

      const expires = ttl > 0 ? Date.now() + ttl : null;
      
      this.cache.set(key, {
        value,
        expires,
        accessed: Date.now(),
        hits: 0,
        size: this.estimateSize(value)
      });

      this.stats.sets++;
      return true;

    } catch (error) {
      this.logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  get(key) {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check expiration
      if (entry.expires && Date.now() > entry.expires) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access time and hits
      entry.accessed = Date.now();
      entry.hits++;
      this.cache.set(key, entry);

      this.stats.hits++;
      return entry.value;

    } catch (error) {
      this.logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.info(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Get or set cache value
   * @param {string} key - Cache key
   * @param {Function} fn - Function to get value if not cached
   * @param {number} ttl - Time to live
   * @returns {Promise<*>} Value
   */
  async getOrSet(key, fn, ttl = this.defaultTTL) {
    let value = this.get(key);
    
    if (value !== null) {
      return value;
    }

    try {
      value = await fn();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      this.logger.error('Cache getOrSet error:', error);
      throw error;
    }
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let oldestKey = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessed < oldestAccess) {
        oldestAccess = entry.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.logger.debug(`Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * Clean expired entries
   * @returns {number} Number of entries cleaned
   */
  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }

    return {
      entries: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      hitRate: hitRate + '%',
      totalSize: this.formatBytes(totalSize)
    };
  }

  /**
   * Get detailed cache info
   * @returns {Array} Cache entries info
   */
  getInfo() {
    const info = [];

    for (const [key, entry] of this.cache.entries()) {
      info.push({
        key,
        size: entry.size,
        hits: entry.hits,
        expires: entry.expires ? new Date(entry.expires) : null,
        accessed: new Date(entry.accessed),
        ttl: entry.expires ? entry.expires - Date.now() : null
      });
    }

    return info.sort((a, b) => b.hits - a.hits);
  }

  /**
   * Get most accessed entries
   * @param {number} limit - Number of results
   * @returns {Array} Top entries
   */
  getTopEntries(limit = 10) {
    return this.getInfo()
      .slice(0, limit)
      .map(entry => ({
        key: entry.key,
        hits: entry.hits,
        size: this.formatBytes(entry.size)
      }));
  }

  /**
   * Estimate size of value
   * @param {*} value - Value to estimate
   * @returns {number} Estimated size in bytes
   */
  estimateSize(value) {
    try {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'string') return value.length * 2;
      if (typeof value === 'number') return 8;
      if (typeof value === 'boolean') return 4;
      if (Buffer.isBuffer(value)) return value.length;
      
      // For objects, use JSON string length as approximation
      return JSON.stringify(value).length * 2;
    } catch {
      return 0;
    }
  }

  /**
   * Format bytes to readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Set default TTL
   * @param {number} ttl - TTL in ms
   */
  setDefaultTTL(ttl) {
    this.defaultTTL = ttl;
    this.logger.info(`Default TTL set to ${ttl}ms`);
  }

  /**
   * Set max cache size
   * @param {number} size - Max size
   */
  setMaxSize(size) {
    this.maxSize = size;
    this.logger.info(`Max cache size set to ${size}`);
  }

  /**
   * Get keys matching pattern
   * @param {string} pattern - Search pattern (regex)
   * @returns {Array} Matching keys
   */
  keys(pattern = null) {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) return allKeys;
    
    const regex = new RegExp(pattern);
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Get all values
   * @returns {Array} All cached values
   */
  values() {
    const values = [];
    for (const entry of this.cache.values()) {
      values.push(entry.value);
    }
    return values;
  }

  /**
   * Update TTL for existing entry
   * @param {string} key - Cache key
   * @param {number} ttl - New TTL in ms
   * @returns {boolean} Success status
   */
  updateTTL(key, ttl) {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    entry.expires = ttl > 0 ? Date.now() + ttl : null;
    this.cache.set(key, entry);
    
    return true;
  }

  /**
   * Get remaining TTL for entry
   * @param {string} key - Cache key
   * @returns {number|null} Remaining TTL in ms
   */
  getTTL(key) {
    const entry = this.cache.get(key);
    
    if (!entry || !entry.expires) return null;
    
    const remaining = entry.expires - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Export cache data
   * @returns {Object} Cache data
   */
  export() {
    const data = {};
    
    for (const [key, entry] of this.cache.entries()) {
      data[key] = {
        value: entry.value,
        expires: entry.expires,
        hits: entry.hits
      };
    }
    
    return data;
  }

  /**
   * Import cache data
   * @param {Object} data - Cache data to import
   */
  import(data) {
    this.clear();
    
    for (const [key, entry] of Object.entries(data)) {
      const ttl = entry.expires ? entry.expires - Date.now() : 0;
      if (ttl > 0) {
        this.set(key, entry.value, ttl);
      }
    }
    
    this.logger.info(`Imported ${Object.keys(data).length} cache entries`);
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Clean expired entries every 10 minutes
setInterval(() => {
  cacheManager.cleanExpired();
}, 600000);
