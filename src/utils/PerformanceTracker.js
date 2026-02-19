/**
 * ALL-STAR BOT v2.0 - Performance Tracker
 * Tracks and monitors bot performance metrics
 * 
 * @author Liand (@Liand_fullstackdev)
 */

import { Logger } from './Logger.js';

export class PerformanceTracker {
  constructor() {
    this.logger = new Logger('PERFORMANCE-TRACKER');
    
    // Track operation times
    this.operations = new Map();
    // Format: { operationName: [durations] }
    
    // Track averages
    this.averages = new Map();
    
    // Track slow operations
    this.slowOperations = [];
    this.slowThreshold = 1000; // 1 second
    
    // Track memory usage
    this.memorySnapshots = [];
    this.maxSnapshots = 100;
  }

  /**
   * Start tracking an operation
   * @param {string} operationName - Operation name
   * @returns {Function} End function
   */
  start(operationName) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return () => {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      
      this.record(operationName, duration, startMemory, endMemory);
      
      return duration;
    };
  }

  /**
   * Record operation performance
   * @param {string} operationName - Operation name
   * @param {number} duration - Duration in ms
   * @param {Object} startMemory - Start memory usage
   * @param {Object} endMemory - End memory usage
   */
  record(operationName, duration, startMemory = null, endMemory = null) {
    // Record duration
    if (!this.operations.has(operationName)) {
      this.operations.set(operationName, []);
    }
    
    const durations = this.operations.get(operationName);
    durations.push(duration);
    
    // Keep only last 100 records
    if (durations.length > 100) {
      durations.shift();
    }
    
    // Update average
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    this.averages.set(operationName, average);
    
    // Track slow operations
    if (duration > this.slowThreshold) {
      this.slowOperations.push({
        operation: operationName,
        duration,
        timestamp: Date.now(),
        memoryDelta: endMemory ? {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        } : null
      });
      
      // Keep only last 50 slow operations
      if (this.slowOperations.length > 50) {
        this.slowOperations.shift();
      }
      
      this.logger.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
    }
  }

  /**
   * Take memory snapshot
   */
  takeMemorySnapshot() {
    const memoryUsage = process.memoryUsage();
    
    this.memorySnapshots.push({
      timestamp: Date.now(),
      ...memoryUsage
    });
    
    // Keep only last N snapshots
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }
  }

  /**
   * Get average duration for operation
   * @param {string} operationName - Operation name
   * @returns {number} Average duration in ms
   */
  getAverage(operationName) {
    return this.averages.get(operationName) || 0;
  }

  /**
   * Get all averages
   * @returns {Object} All averages
   */
  getAllAverages() {
    const result = {};
    for (const [name, avg] of this.averages.entries()) {
      result[name] = Math.round(avg);
    }
    return result;
  }

  /**
   * Get slowest operations
   * @param {number} limit - Number of results
   * @returns {Array} Slowest operations
   */
  getSlowestOperations(limit = 10) {
    return [...this.slowOperations]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get performance report
   * @returns {string} Formatted report
   */
  getReport() {
    const averages = this.getAllAverages();
    const slowOps = this.getSlowestOperations(5);
    
    let report = `⚡ *PERFORMANCE REPORT*\n\n`;
    
    // Average operation times
    report += `📊 *Average Times:*\n`;
    const sortedAvgs = Object.entries(averages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedAvgs.length > 0) {
      sortedAvgs.forEach(([name, avg]) => {
        const status = avg < 100 ? '🟢' : avg < 500 ? '🟡' : '🔴';
        report += `${status} ${name}: ${avg}ms\n`;
      });
    } else {
      report += `No data yet\n`;
    }
    
    // Slow operations
    if (slowOps.length > 0) {
      report += `\n⚠️ *Recent Slow Operations:*\n`;
      slowOps.forEach(op => {
        report += `• ${op.operation}: ${op.duration}ms\n`;
      });
    }
    
    // Memory usage
    const currentMemory = process.memoryUsage();
    report += `\n💾 *Current Memory:*\n`;
    report += `Heap Used: ${this.formatBytes(currentMemory.heapUsed)}\n`;
    report += `Heap Total: ${this.formatBytes(currentMemory.heapTotal)}\n`;
    report += `External: ${this.formatBytes(currentMemory.external)}\n`;
    
    return report;
  }

  /**
   * Get memory trend
   * @returns {Object} Memory trend data
   */
  getMemoryTrend() {
    if (this.memorySnapshots.length < 2) {
      return {
        trend: 'stable',
        change: 0
      };
    }
    
    const recent = this.memorySnapshots.slice(-10);
    const first = recent[0].heapUsed;
    const last = recent[recent.length - 1].heapUsed;
    const change = ((last - first) / first) * 100;
    
    let trend = 'stable';
    if (change > 10) trend = 'increasing';
    else if (change < -10) trend = 'decreasing';
    
    return {
      trend,
      change: change.toFixed(2),
      snapshots: recent.length
    };
  }

  /**
   * Get performance statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const memoryTrend = this.getMemoryTrend();
    
    return {
      totalOperations: this.operations.size,
      totalRecords: Array.from(this.operations.values())
        .reduce((sum, arr) => sum + arr.length, 0),
      slowOperations: this.slowOperations.length,
      memoryTrend: memoryTrend.trend,
      memoryChange: memoryTrend.change + '%'
    };
  }

  /**
   * Format bytes to readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Clear all tracking data
   */
  clear() {
    this.operations.clear();
    this.averages.clear();
    this.slowOperations = [];
    this.memorySnapshots = [];
    this.logger.info('Performance tracking data cleared');
  }

  /**
   * Set slow operation threshold
   * @param {number} threshold - Threshold in ms
   */
  setSlowThreshold(threshold) {
    this.slowThreshold = threshold;
    this.logger.info(`Slow operation threshold set to ${threshold}ms`);
  }

  /**
   * Export performance data
   * @returns {Object} Performance data
   */
  export() {
    return {
      averages: this.getAllAverages(),
      slowOperations: this.slowOperations,
      memorySnapshots: this.memorySnapshots,
      statistics: this.getStatistics(),
      exportedAt: Date.now()
    };
  }

  /**
   * Get top N slowest operations by name
   * @param {number} limit - Number of results
   * @returns {Array} Top slow operations
   */
  getTopSlowOperations(limit = 5) {
    const avgArray = Array.from(this.averages.entries())
      .map(([name, avg]) => ({ name, average: avg }))
      .sort((a, b) => b.average - a.average)
      .slice(0, limit);
    
    return avgArray;
  }

  /**
   * Analyze performance issues
   * @returns {Object} Analysis result
   */
  analyze() {
    const issues = [];
    const warnings = [];
    
    // Check for slow operations
    const topSlow = this.getTopSlowOperations(5);
    topSlow.forEach(op => {
      if (op.average > 1000) {
        issues.push(`${op.name} is very slow (avg ${Math.round(op.average)}ms)`);
      } else if (op.average > 500) {
        warnings.push(`${op.name} is slow (avg ${Math.round(op.average)}ms)`);
      }
    });
    
    // Check memory trend
    const memoryTrend = this.getMemoryTrend();
    if (memoryTrend.trend === 'increasing' && parseFloat(memoryTrend.change) > 20) {
      issues.push(`Memory usage increasing rapidly (${memoryTrend.change}%)`);
    }
    
    // Check current memory
    const currentMemory = process.memoryUsage();
    const heapPercent = (currentMemory.heapUsed / currentMemory.heapTotal) * 100;
    if (heapPercent > 90) {
      issues.push(`Heap usage very high (${heapPercent.toFixed(1)}%)`);
    } else if (heapPercent > 75) {
      warnings.push(`Heap usage high (${heapPercent.toFixed(1)}%)`);
    }
    
    return {
      issues,
      warnings,
      status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy'
    };
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker();

// Take memory snapshot every 5 minutes
setInterval(() => {
  performanceTracker.takeMemorySnapshot();
}, 300000);
