/**
 * ModestBench History Storage
 * 
 * File-based storage system for benchmark run history and results.
 * Provides querying, cleanup, and export capabilities for historical data.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import type {
  BenchmarkRun,
  HistoryStorage,
  HistoryQuery,
  RetentionPolicy,
  CleanupResult,
} from '../types/index.js';

/**
 * Index entry for stored benchmark runs
 */
interface IndexEntry {
  readonly id: string;
  readonly date: Date;
  readonly summary: string;
  readonly filename: string;
  readonly sizeBytes: number;
  readonly tags: string[];
}

/**
 * Storage index structure
 */
interface StorageIndex {
  readonly version: string;
  readonly created: Date;
  readonly lastModified: Date;
  readonly entries: IndexEntry[];
}

/**
 * File-based history storage implementation
 */
export class FileHistoryStorage implements HistoryStorage {
  private readonly storageDir: string;
  private readonly indexFile: string;
  private readonly maxFileSize: number;
  private index: StorageIndex | null = null;

  constructor(options: {
    storageDir?: string;
    maxFileSize?: number;
  } = {}) {
    this.storageDir = options.storageDir || join(process.cwd(), '.modestbench', 'history');
    this.indexFile = join(this.storageDir, 'index.json');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    
    this.ensureStorageDir();
  }

  /**
   * Save a benchmark run to storage
   */
  async saveRun(run: BenchmarkRun): Promise<void> {
    try {
      this.ensureStorageDir();
      
      // Generate filename based on run ID and timestamp
      const filename = this.generateFilename(run);
      const filePath = join(this.storageDir, filename);
      
      // Serialize the run data
      const data = JSON.stringify(run, null, 2);
      
      // Check file size limit
      if (Buffer.byteLength(data, 'utf8') > this.maxFileSize) {
        throw new Error(`Benchmark run data exceeds maximum file size of ${this.maxFileSize} bytes`);
      }
      
      // Write the run data
      writeFileSync(filePath, data, 'utf8');
      
      // Update the index
      await this.updateIndex(run, filename, Buffer.byteLength(data, 'utf8'));
      
    } catch (error) {
      throw new Error(`Failed to save benchmark run: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load a specific benchmark run
   */
  async loadRun(id: string): Promise<BenchmarkRun | null> {
    try {
      const index = await this.loadIndex();
      const entry = index.entries.find(e => e.id === id);
      
      if (!entry) {
        return null;
      }
      
      const filePath = join(this.storageDir, entry.filename);
      
      if (!existsSync(filePath)) {
        // File missing, clean up index
        await this.removeFromIndex(id);
        return null;
      }
      
      const data = readFileSync(filePath, 'utf8');
      const run = JSON.parse(data) as BenchmarkRun;
      
      // Validate the loaded run
      if (!this.isValidBenchmarkRun(run)) {
        throw new Error(`Invalid benchmark run data in file ${entry.filename}`);
      }
      
      return run;
      
    } catch (error) {
      throw new Error(`Failed to load benchmark run ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Query historical runs
   */
  async queryRuns(query: HistoryQuery): Promise<BenchmarkRun[]> {
    try {
      const index = await this.loadIndex();
      let filteredEntries = [...index.entries];
      
      // Apply filters
      if (query.since) {
        filteredEntries = filteredEntries.filter(e => e.date >= query.since!);
      }
      
      if (query.until) {
        filteredEntries = filteredEntries.filter(e => e.date <= query.until!);
      }
      
      if (query.pattern) {
        const regex = new RegExp(query.pattern, 'i');
        filteredEntries = filteredEntries.filter(e => regex.test(e.summary));
      }
      
      if (query.tags && query.tags.length > 0) {
        filteredEntries = filteredEntries.filter(e => 
          query.tags!.some(tag => e.tags.includes(tag))
        );
      }
      
      // Apply sorting
      const sortBy = query.sortBy || 'date';
      const sort = query.sort || 'desc';
      
      filteredEntries.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = a.date.getTime() - b.date.getTime();
            break;
          case 'name':
            comparison = a.summary.localeCompare(b.summary);
            break;
          default:
            comparison = a.date.getTime() - b.date.getTime();
        }
        
        return sort === 'desc' ? -comparison : comparison;
      });
      
      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || filteredEntries.length;
      const paginatedEntries = filteredEntries.slice(offset, offset + limit);
      
      // Load the actual runs
      const runs: BenchmarkRun[] = [];
      for (const entry of paginatedEntries) {
        const run = await this.loadRun(entry.id);
        if (run) {
          runs.push(run);
        }
      }
      
      return runs;
      
    } catch (error) {
      throw new Error(`Failed to query benchmark runs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get index of all stored runs
   */
  async getIndex(): Promise<Array<{ id: string; date: Date; summary: string }>> {
    try {
      const index = await this.loadIndex();
      return index.entries.map(entry => ({
        id: entry.id,
        date: entry.date,
        summary: entry.summary,
      }));
    } catch (error) {
      throw new Error(`Failed to get storage index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up old data according to retention policy
   */
  async cleanup(policy: RetentionPolicy): Promise<CleanupResult> {
    try {
      const index = await this.loadIndex();
      const entriesToRemove: IndexEntry[] = [];
      let totalSize = 0;
      
      // Calculate current storage metrics
      for (const entry of index.entries) {
        totalSize += entry.sizeBytes;
      }
      
      // Sort entries by date (oldest first) for cleanup
      const sortedEntries = [...index.entries].sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Apply retention policies
      for (const entry of sortedEntries) {
        let shouldRemove = false;
        
        // Check max age
        if (policy.maxAge && Date.now() - entry.date.getTime() > policy.maxAge) {
          shouldRemove = true;
        }
        
        // Check max runs count (remove oldest)
        if (policy.maxRuns && (index.entries.length - entriesToRemove.length) > policy.maxRuns) {
          shouldRemove = true;
        }
        
        // Check max size (remove oldest until under limit)
        if (policy.maxSize && totalSize > policy.maxSize) {
          shouldRemove = true;
          totalSize -= entry.sizeBytes;
        }
        
        if (shouldRemove) {
          entriesToRemove.push(entry);
        }
      }
      
      // Remove files and update index
      const removedFiles: string[] = [];
      let freedBytes = 0;
      
      for (const entry of entriesToRemove) {
        const filePath = join(this.storageDir, entry.filename);
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            removedFiles.push(entry.filename);
            freedBytes += entry.sizeBytes;
          }
          await this.removeFromIndex(entry.id);
        } catch (error) {
          // Log but continue with other deletions
          console.warn(`Failed to remove file ${entry.filename}: ${error}`);
        }
      }
      
      return {
        removedRuns: entriesToRemove.length,
        freedBytes,
        removedFiles,
      };
      
    } catch (error) {
      throw new Error(`Failed to cleanup storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export historical data
   */
  async export(format: 'json' | 'csv', query?: HistoryQuery): Promise<string> {
    try {
      const runs = await this.queryRuns(query || {});
      
      if (format === 'json') {
        return JSON.stringify(runs, null, 2);
      } else if (format === 'csv') {
        return this.exportToCsv(runs);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to export data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDir(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Generate filename for a benchmark run
   */
  private generateFilename(run: BenchmarkRun): string {
    const timestamp = run.startTime.toISOString().replace(/[:.]/g, '-');
    const hash = createHash('md5').update(run.id).digest('hex').substring(0, 8);
    return `run-${timestamp}-${hash}.json`;
  }

  /**
   * Load the storage index
   */
  private async loadIndex(): Promise<StorageIndex> {
    if (this.index) {
      return this.index;
    }
    
    if (!existsSync(this.indexFile)) {
      this.index = {
        version: '1.0.0',
        created: new Date(),
        lastModified: new Date(),
        entries: [],
      };
      await this.saveIndex();
      return this.index!; // We just assigned it, so it's not null
    }
    
    try {
      const data = readFileSync(this.indexFile, 'utf8');
      const parsed = JSON.parse(data);
      
      // Convert date strings back to Date objects
      this.index = {
        ...parsed,
        created: new Date(parsed.created),
        lastModified: new Date(parsed.lastModified),
        entries: parsed.entries.map((entry: any) => ({
          ...entry,
          date: new Date(entry.date),
        })),
      };
      
      return this.index!; // We just assigned it, so it's not null
    } catch (error) {
      throw new Error(`Failed to load storage index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save the storage index
   */
  private async saveIndex(): Promise<void> {
    if (!this.index) {
      return;
    }
    
    try {
      this.index = {
        ...this.index,
        lastModified: new Date(),
      };
      
      const data = JSON.stringify(this.index, null, 2);
      writeFileSync(this.indexFile, data, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save storage index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update index with a new run
   */
  private async updateIndex(run: BenchmarkRun, filename: string, sizeBytes: number): Promise<void> {
    const index = await this.loadIndex();
    
    const entry: IndexEntry = {
      id: run.id,
      date: run.startTime,
      summary: this.generateSummary(run),
      filename,
      sizeBytes,
      tags: run.tags || [],
    };
    
    // Remove existing entry if it exists
    const existingIndex = index.entries.findIndex(e => e.id === run.id);
    if (existingIndex >= 0) {
      index.entries.splice(existingIndex, 1);
    }
    
    // Add new entry
    index.entries.push(entry);
    
    // Update index
    this.index = index;
    await this.saveIndex();
  }

  /**
   * Remove an entry from the index
   */
  private async removeFromIndex(id: string): Promise<void> {
    const index = await this.loadIndex();
    const entryIndex = index.entries.findIndex(e => e.id === id);
    
    if (entryIndex >= 0) {
      index.entries.splice(entryIndex, 1);
      this.index = index;
      await this.saveIndex();
    }
  }

  /**
   * Generate a human-readable summary for a run
   */
  private generateSummary(run: BenchmarkRun): string {
    const fileCount = run.files.length;
    const taskCount = run.summary.totalTasks;
    const failedCount = run.summary.failedTasks;
    
    if (failedCount > 0) {
      return `${fileCount} files, ${taskCount} tasks (${failedCount} failed)`;
    } else {
      return `${fileCount} files, ${taskCount} tasks`;
    }
  }

  /**
   * Validate that an object is a valid BenchmarkRun
   */
  private isValidBenchmarkRun(obj: any): obj is BenchmarkRun {
    return obj &&
           typeof obj.id === 'string' &&
           Array.isArray(obj.files) &&
           obj.startTime &&
           obj.endTime &&
           obj.environment &&
           obj.summary;
  }

  /**
   * Export runs to CSV format
   */
  private exportToCsv(runs: BenchmarkRun[]): string {
    const headers = [
      'runId',
      'startTime',
      'endTime',
      'duration',
      'files',
      'suites',
      'tasks',
      'passed',
      'failed',
      'nodeVersion',
      'platform',
      'arch',
      'gitCommit',
      'gitBranch',
    ];
    
    const rows = runs.map(run => [
      run.id,
      run.startTime.toISOString(),
      run.endTime.toISOString(),
      run.duration.toString(),
      run.summary.totalFiles.toString(),
      run.summary.totalSuites.toString(),
      run.summary.totalTasks.toString(),
      run.summary.passedTasks.toString(),
      run.summary.failedTasks.toString(),
      run.environment.nodeVersion,
      run.environment.platform,
      run.environment.arch,
      run.git?.commit || '',
      run.git?.branch || '',
    ]);
    
    const csvLines = [headers, ...rows];
    return csvLines.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * Get storage directory path
   */
  getStorageDir(): string {
    return this.storageDir;
  }

  /**
   * Get total storage size in bytes
   */
  async getStorageSize(): Promise<number> {
    try {
      const index = await this.loadIndex();
      return index.entries.reduce((total, entry) => total + entry.sizeBytes, 0);
    } catch {
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalRuns: number;
    totalSize: number;
    oldestRun?: Date | undefined;
    newestRun?: Date | undefined;
  }> {
    try {
      const index = await this.loadIndex();
      const dates = index.entries.map(e => e.date).sort((a, b) => a.getTime() - b.getTime());
      
      return {
        totalRuns: index.entries.length,
        totalSize: index.entries.reduce((total, entry) => total + entry.sizeBytes, 0),
        oldestRun: dates[0],
        newestRun: dates[dates.length - 1],
      };
    } catch {
      return { totalRuns: 0, totalSize: 0 };
    }
  }
}