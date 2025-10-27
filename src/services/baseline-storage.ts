import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  BaselineReference,
  BaselineStorage,
  BaselineSummaryData,
  BenchmarkRun,
  TaskId,
} from '../types/core.js';

import { validateBaselineStorage } from '../config/budget-schema.js';
import { StorageError } from '../errors/storage.js';
import { createTaskId } from '../types/core.js';

/**
 * Service for managing named baselines
 *
 * @packageDocumentation
 */
export class BaselineStorageService {
  private readonly storageDir: string;

  private readonly storageFile: string;

  constructor(storageDir: string = '.') {
    this.storageDir = storageDir;
    this.storageFile = join(storageDir, '.modestbench.baselines.json');
  }

  /**
   * Delete a baseline
   */
  async deleteBaseline(name: string): Promise<void> {
    let storage = await this.loadStorage();

    if (storage.baselines[name]) {
      delete storage.baselines[name];

      // Clear default if it was the deleted baseline
      if (storage.default === name) {
        storage = { ...storage, default: undefined };
      }

      await this.saveStorage(storage);
    }
  }

  /**
   * Get a baseline by name
   */
  async getBaseline(name: string): Promise<BaselineReference | null> {
    const storage = await this.loadStorage();
    return storage.baselines[name] ?? null;
  }

  /**
   * Get default baseline name
   */
  async getDefault(): Promise<null | string> {
    const storage = await this.loadStorage();
    return storage.default ?? null;
  }

  /**
   * List all baselines
   */
  async listBaselines(): Promise<BaselineReference[]> {
    const storage = await this.loadStorage();
    return Object.values(storage.baselines).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }

  /**
   * Resolve baseline name (use provided or fall back to default)
   */
  async resolveBaselineName(name?: string): Promise<null | string> {
    if (name) {
      return name;
    }

    return await this.getDefault();
  }

  /**
   * Save a benchmark run as a named baseline
   */
  async saveBaseline(
    name: string,
    run: BenchmarkRun,
    metadata?: {
      branch?: string;
      commit?: string;
    },
  ): Promise<void> {
    const storage = await this.loadStorage();

    const baseline: BaselineReference = {
      branch: metadata?.branch,
      commit: metadata?.commit,
      date:
        run.startTime instanceof Date ? run.startTime : new Date(run.startTime),
      name,
      runId: run.id,
      summary: this.extractSummary(run),
    };

    storage.baselines[name] = baseline;

    await this.saveStorage(storage);
  }

  /**
   * Set default baseline
   */
  async setDefault(name: string): Promise<void> {
    let storage = await this.loadStorage();

    if (!storage.baselines[name]) {
      throw new StorageError(
        `Baseline "${name}" does not exist. Cannot set as default.`,
      );
    }

    storage = { ...storage, default: name };
    await this.saveStorage(storage);
  }

  /**
   * Extract task summary from benchmark run
   */
  private extractSummary(
    run: BenchmarkRun,
  ): Record<TaskId, BaselineSummaryData> {
    const summary: Record<TaskId, BaselineSummaryData> = {};

    for (const file of run.files) {
      for (const suite of file.suites) {
        for (const task of suite.tasks) {
          if (!task.error) {
            const taskId = createTaskId(file.filePath, suite.name, task.name);
            summary[taskId] = {
              mean: task.mean,
              opsPerSecond: task.opsPerSecond,
              p99: task.p99,
            };
          }
        }
      }
    }

    return summary;
  }

  /**
   * Load baseline storage from disk
   */
  private async loadStorage(): Promise<BaselineStorage> {
    if (!existsSync(this.storageFile)) {
      return {
        baselines: {},
        version: '1.0.0',
      };
    }

    try {
      const content = await readFile(this.storageFile, 'utf-8');
      const data = JSON.parse(content) as unknown;
      return validateBaselineStorage(data);
    } catch (error) {
      throw new StorageError(
        `Failed to load baseline storage from ${this.storageFile}`,
        { cause: error },
      );
    }
  }

  /**
   * Save baseline storage to disk
   */
  private async saveStorage(storage: BaselineStorage): Promise<void> {
    try {
      // Ensure directory exists
      if (!existsSync(this.storageDir)) {
        await mkdir(this.storageDir, { recursive: true });
      }

      const content = JSON.stringify(storage, null, 2);
      await writeFile(this.storageFile, content, 'utf-8');
    } catch (error) {
      throw new StorageError(
        `Failed to save baseline storage to ${this.storageFile}`,
        { cause: error },
      );
    }
  }
}
