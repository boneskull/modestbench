/**
 * ModestBench Progress Manager
 * 
 * Tracks execution progress, estimates completion times, and manages
 * progress callbacks for real-time updates during benchmark runs.
 */

import type {
  BenchmarkRun,
  ProgressState,
  ProgressManager,
} from '../types/index.js';

/**
 * Progress calculation utilities
 */
interface ProgressMetrics {
  readonly startTime: number;
  readonly estimatedTotal: number;
  readonly currentThroughput: number;
  readonly recentTimings: number[];
}

/**
 * Progress callback function type
 */
type ProgressCallback = (state: ProgressState) => void;

/**
 * Default progress manager implementation
 */
export class ModestBenchProgressManager implements ProgressManager {
  private state: ProgressState;
  private callbacks: ProgressCallback[] = [];
  private metrics: ProgressMetrics | null = null;
  private lastUpdate = 0;
  private readonly maxRecentTimings = 10;
  private readonly updateThrottleMs = 100; // Limit updates to avoid spam

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Initialize progress tracking for a benchmark run
   */
  initialize(run: BenchmarkRun): void {
    // Calculate totals from the run structure
    let totalFiles = run.files.length;
    let totalSuites = 0;
    let totalTasks = 0;

    // If we have detailed run information, calculate actual totals
    for (const file of run.files) {
      for (const suite of file.suites) {
        totalSuites++;
        totalTasks += suite.tasks.length;
      }
    }

    this.state = {
      filesCompleted: 0,
      totalFiles,
      suitesCompleted: 0,
      totalSuites,
      tasksCompleted: 0,
      totalTasks,
      elapsed: 0,
      percentage: 0,
    };

    this.metrics = {
      startTime: Date.now(),
      estimatedTotal: totalTasks, // Use tasks as the primary progress unit
      currentThroughput: 0,
      recentTimings: [],
    };

    this.lastUpdate = Date.now();
    this.notifyCallbacks();
  }

  /**
   * Update progress state
   */
  update(updates: Partial<ProgressState>): void {
    const now = Date.now();
    
    // Throttle updates to avoid excessive callbacks
    if (now - this.lastUpdate < this.updateThrottleMs) {
      return;
    }

    // Calculate elapsed time
    const elapsed = this.metrics ? now - this.metrics.startTime : 0;

    // Apply updates
    this.state = {
      ...this.state,
      ...updates,
      elapsed,
      percentage: this.calculatePercentage(updates),
    };

    // Update metrics for completion estimation
    this.updateMetrics(now);
    
    this.lastUpdate = now;
    this.notifyCallbacks();
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * Estimate completion time
   */
  estimateCompletion(): Date | null {
    if (!this.metrics || this.state.totalTasks === 0 || this.state.tasksCompleted === 0) {
      return null;
    }

    const remainingTasks = this.state.totalTasks - this.state.tasksCompleted;
    
    if (remainingTasks <= 0) {
      return new Date(); // Already complete
    }

    // Calculate average throughput from recent timings
    const throughput = this.calculateThroughput();
    
    if (throughput <= 0) {
      return null; // Can't estimate with no throughput data
    }

    const estimatedRemainingMs = (remainingTasks / throughput) * 1000;
    return new Date(Date.now() + estimatedRemainingMs);
  }

  /**
   * Register a callback for progress updates
   */
  onProgress(callback: ProgressCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Clean up progress tracking resources
   */
  cleanup(): void {
    this.callbacks = [];
    this.metrics = null;
    this.state = this.createInitialState();
  }

  /**
   * Remove a progress callback
   */
  removeCallback(callback: ProgressCallback): boolean {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      this.callbacks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Force an immediate progress update (bypassing throttling)
   */
  forceUpdate(): void {
    const oldThrottle = this.lastUpdate;
    this.lastUpdate = 0; // Reset throttle
    this.update({}); // Trigger update with no changes
    this.lastUpdate = oldThrottle; // Restore throttle timing
  }

  /**
   * Get detailed progress metrics
   */
  getMetrics(): {
    throughput: number;
    estimatedCompletion: Date | null;
    elapsedMs: number;
    remainingTasks: number;
  } | null {
    if (!this.metrics) {
      return null;
    }

    const throughput = this.calculateThroughput();
    const estimatedCompletion = this.estimateCompletion();
    const elapsedMs = Date.now() - this.metrics.startTime;
    const remainingTasks = Math.max(0, this.state.totalTasks - this.state.tasksCompleted);

    return {
      throughput,
      estimatedCompletion,
      elapsedMs,
      remainingTasks,
    };
  }

  /**
   * Create initial progress state
   */
  private createInitialState(): ProgressState {
    return {
      filesCompleted: 0,
      totalFiles: 0,
      suitesCompleted: 0,
      totalSuites: 0,
      tasksCompleted: 0,
      totalTasks: 0,
      elapsed: 0,
      percentage: 0,
    };
  }

  /**
   * Calculate progress percentage from current state
   */
  private calculatePercentage(updates: Partial<ProgressState>): number {
    const currentState = { ...this.state, ...updates };
    
    if (currentState.totalTasks === 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (currentState.tasksCompleted / currentState.totalTasks) * 100));
  }

  /**
   * Update throughput metrics
   */
  private updateMetrics(now: number): void {
    if (!this.metrics) {
      return;
    }

    // Track timing for throughput calculation
    const elapsed = now - this.metrics.startTime;
    if (elapsed > 0 && this.state.tasksCompleted > 0) {
      const currentThroughput = this.state.tasksCompleted / (elapsed / 1000); // tasks per second
      
      // Add to recent timings for moving average
      this.metrics.recentTimings.push(currentThroughput);
      
      // Keep only the most recent timings
      if (this.metrics.recentTimings.length > this.maxRecentTimings) {
        this.metrics.recentTimings.shift();
      }

      this.metrics = {
        ...this.metrics,
        currentThroughput,
      };
    }
  }

  /**
   * Calculate average throughput from recent measurements
   */
  private calculateThroughput(): number {
    if (!this.metrics || this.metrics.recentTimings.length === 0) {
      return 0;
    }

    // Use moving average of recent throughput measurements
    const sum = this.metrics.recentTimings.reduce((acc, timing) => acc + timing, 0);
    return sum / this.metrics.recentTimings.length;
  }

  /**
   * Notify all registered callbacks of progress changes
   */
  private notifyCallbacks(): void {
    if (this.callbacks.length === 0) {
      return;
    }

    const state = this.getState();
    
    // Call callbacks safely with error handling
    for (const callback of this.callbacks) {
      try {
        callback(state);
      } catch (error) {
        // Log callback errors but don't stop progress tracking
        console.error('Progress callback error:', error);
      }
    }
  }

  /**
   * Set the current file being processed
   */
  setCurrentFile(file: string): void {
    this.update({ currentFile: file });
  }

  /**
   * Set the current suite being processed  
   */
  setCurrentSuite(suite: string): void {
    this.update({ currentSuite: suite });
  }

  /**
   * Set the current task being processed
   */
  setCurrentTask(task: string): void {
    this.update({ currentTask: task });
  }

  /**
   * Increment the completed files counter
   */
  incrementFiles(): void {
    this.update({ filesCompleted: this.state.filesCompleted + 1 });
  }

  /**
   * Increment the completed suites counter
   */
  incrementSuites(): void {
    this.update({ suitesCompleted: this.state.suitesCompleted + 1 });
  }

  /**
   * Increment the completed tasks counter
   */
  incrementTasks(): void {
    this.update({ tasksCompleted: this.state.tasksCompleted + 1 });
  }

  /**
   * Check if the run is complete
   */
  isComplete(): boolean {
    return this.state.tasksCompleted >= this.state.totalTasks && this.state.totalTasks > 0;
  }

  /**
   * Get progress as a fraction (0.0 to 1.0)
   */
  getProgressFraction(): number {
    return this.state.percentage / 100;
  }

  /**
   * Format elapsed time as human-readable string
   */
  getFormattedElapsed(): string {
    const seconds = Math.floor(this.state.elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format estimated remaining time as human-readable string
   */
  getFormattedEstimate(): string | null {
    const completion = this.estimateCompletion();
    if (!completion) {
      return null;
    }

    const remaining = completion.getTime() - Date.now();
    if (remaining <= 0) {
      return 'Complete';
    }

    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `~${hours}h ${minutes % 60}m remaining`;
    } else if (minutes > 0) {
      return `~${minutes}m ${seconds % 60}s remaining`;
    } else {
      return `~${seconds}s remaining`;
    }
  }
}