import {
  type BenchmarkEngine,
  BenchmarkFileLoader,
  CompositeReporter,
  type ConfigurationManager,
  CsvReporter,
  FileHistoryStorage,
  type FileLoader,
  type HistoryStorage,
  HumanReporter,
  JsonReporter,
  modestbench,
  ModestBenchConfigurationManager,
  ModestBenchProgressManager,
  ModestBenchReporterRegistry,
  type ProgressManager,
  type Reporter,
  TinybenchEngine,
} from 'modestbench';
import { describe, it } from 'node:test';
import { expectAssignable, expectType } from 'tsd';

describe('Exported Classes and Functions', () => {
  describe('Engine', () => {
    it('should export TinybenchEngine as constructable class', () => {
      const configManager = new ModestBenchConfigurationManager();
      const fileLoader = new BenchmarkFileLoader();
      const progressManager = new ModestBenchProgressManager();
      const reporterRegistry = new ModestBenchReporterRegistry();
      const historyStorage = new FileHistoryStorage();

      const engine = new TinybenchEngine({
        configManager,
        fileLoader,
        historyStorage,
        progressManager,
        reporterRegistry,
      });

      expectType<TinybenchEngine>(engine);
      expectAssignable<BenchmarkEngine>(engine);
    });

    it('should export modestbench bootstrap function', () => {
      const engine = modestbench();
      expectAssignable<BenchmarkEngine>(engine);
    });
  });

  describe('Configuration', () => {
    it('should export ModestBenchConfigurationManager as constructable', () => {
      const manager = new ModestBenchConfigurationManager();
      expectType<ModestBenchConfigurationManager>(manager);
      expectAssignable<ConfigurationManager>(manager);
    });
  });

  describe('Progress Tracking', () => {
    it('should export ModestBenchProgressManager as constructable', () => {
      const manager = new ModestBenchProgressManager();
      expectType<ModestBenchProgressManager>(manager);
      expectAssignable<ProgressManager>(manager);
    });
  });

  describe('File Loading', () => {
    it('should export BenchmarkFileLoader as constructable', () => {
      const loader = new BenchmarkFileLoader();
      expectType<BenchmarkFileLoader>(loader);
      expectAssignable<FileLoader>(loader);
    });
  });

  describe('Reporters', () => {
    it('should export HumanReporter as constructable', () => {
      const reporter = new HumanReporter();
      expectType<HumanReporter>(reporter);
      expectAssignable<Reporter>(reporter);
    });

    it('should export JsonReporter as constructable', () => {
      const reporter = new JsonReporter();
      expectType<JsonReporter>(reporter);
      expectAssignable<Reporter>(reporter);
    });

    it('should export CsvReporter as constructable', () => {
      const reporter = new CsvReporter();
      expectType<CsvReporter>(reporter);
      expectAssignable<Reporter>(reporter);
    });

    it('should export CompositeReporter as constructable', () => {
      const reporters: Reporter[] = [new HumanReporter()];
      const reporter = new CompositeReporter(reporters);
      expectType<CompositeReporter>(reporter);
      expectAssignable<Reporter>(reporter);
    });

    it('should export ModestBenchReporterRegistry as constructable', () => {
      const registry = new ModestBenchReporterRegistry();
      expectType<ModestBenchReporterRegistry>(registry);
    });
  });

  describe('Storage', () => {
    it('should export FileHistoryStorage as constructable', () => {
      const storage = new FileHistoryStorage();
      expectType<FileHistoryStorage>(storage);
      expectAssignable<HistoryStorage>(storage);
    });
  });
});
