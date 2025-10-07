/**
 * ModestBench Utility Types
 *
 * Defines utility types, helper functions, and common type transformations
 * used throughout the ModestBench system.
 */

/**
 * Makes all properties in T deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Makes all properties in T deeply partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extracts keys from T that have values assignable to U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Makes specified keys K in T required
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Makes specified keys K in T optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Represents a function that may be async or sync
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Represents a function that can be called with arguments
 */
export type Callable<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown,
> = (...args: TArgs) => TReturn;

/**
 * Represents an async function
 */
export type AsyncCallable<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown,
> = (...args: TArgs) => Promise<TReturn>;

/**
 * Event listener function type
 */
export type EventListener<TData = unknown> = (
  data: TData
) => MaybePromise<void>;

/**
 * Disposable resource interface
 */
export interface Disposable {
  dispose(): MaybePromise<void>;
}

/**
 * Event emitter interface
 */
export interface EventEmitter<
  TEvents extends Record<string, unknown> = Record<string, unknown>,
> {
  on<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): void;
  off<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): void;
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  once<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): void;
}

/**
 * Branded type for creating nominal types
 */
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

/**
 * File path brand for type safety
 */
export type FilePath = Brand<string, 'FilePath'>;

/**
 * Directory path brand for type safety
 */
export type DirectoryPath = Brand<string, 'DirectoryPath'>;

/**
 * URL brand for type safety
 */
export type Url = Brand<string, 'Url'>;

/**
 * Timestamp in nanoseconds
 */
export type NanoTimestamp = Brand<number, 'NanoTimestamp'>;

/**
 * Timestamp in milliseconds
 */
export type MilliTimestamp = Brand<number, 'MilliTimestamp'>;

/**
 * Duration in nanoseconds
 */
export type NanoDuration = Brand<number, 'NanoDuration'>;

/**
 * Duration in milliseconds
 */
export type MilliDuration = Brand<number, 'MilliDuration'>;

/**
 * Percentage value (0-100)
 */
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Bytes count
 */
export type Bytes = Brand<number, 'Bytes'>;

/**
 * Task identifier
 */
export type TaskId = Brand<string, 'TaskId'>;

/**
 * Suite identifier
 */
export type SuiteId = Brand<string, 'SuiteId'>;

/**
 * Run identifier
 */
export type RunId = Brand<string, 'RunId'>;

/**
 * Git commit hash
 */
export type CommitHash = Brand<string, 'CommitHash'>;

/**
 * Environment variable name
 */
export type EnvVar = Brand<string, 'EnvVar'>;

/**
 * JSON string representation
 */
export type JsonString = Brand<string, 'JsonString'>;

/**
 * CSV string representation
 */
export type CsvString = Brand<string, 'CsvString'>;

/**
 * YAML string representation
 */
export type YamlString = Brand<string, 'YamlString'>;

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/**
 * Option type for values that may not exist
 */
export type Option<T> = T | null | undefined;

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Tuple with at least one element
 */
export type AtLeastOne<T> = [T, ...T[]];

/**
 * String that is not empty
 */
export type NonEmptyString = Brand<string, 'NonEmptyString'>;

/**
 * Positive number (> 0)
 */
export type PositiveNumber = Brand<number, 'PositiveNumber'>;

/**
 * Non-negative number (>= 0)
 */
export type NonNegativeNumber = Brand<number, 'NonNegativeNumber'>;

/**
 * Integer number
 */
export type Integer = Brand<number, 'Integer'>;

/**
 * Port number (1-65535)
 */
export type Port = Brand<number, 'Port'>;

/**
 * Configuration that can be serialized to JSON
 */
export type SerializableConfig = {
  readonly [K in string]:
    | string
    | number
    | boolean
    | null
    | SerializableConfig
    | readonly SerializableConfig[]
    | readonly (string | number | boolean | null)[];
};

/**
 * Error with additional context
 */
export interface ContextualError extends Error {
  readonly context?: Record<string, unknown>;
  readonly code?: string;
  readonly severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Timing information
 */
export interface TimingInfo {
  readonly start: MilliTimestamp;
  readonly end: MilliTimestamp;
  readonly duration: MilliDuration;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  readonly rss: Bytes;
  readonly heapTotal: Bytes;
  readonly heapUsed: Bytes;
  readonly external: Bytes;
  readonly arrayBuffers: Bytes;
}

/**
 * System resource usage
 */
export interface ResourceUsage {
  readonly memory: MemoryUsage;
  readonly cpu: {
    readonly user: number;
    readonly system: number;
  };
  readonly timing: TimingInfo;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
}

/**
 * Cache interface
 */
export interface Cache<TKey = string, TValue = unknown> {
  get(key: TKey): Option<TValue>;
  set(key: TKey, value: TValue, ttl?: number): void;
  has(key: TKey): boolean;
  delete(key: TKey): boolean;
  clear(): void;
  size(): number;
}

/**
 * Async iterator interface
 */
export interface AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

/**
 * Stream interface
 */
export interface Stream<T> extends AsyncIterable<T> {
  pipe<U>(transform: (value: T) => U): Stream<U>;
  filter(predicate: (value: T) => boolean): Stream<T>;
  take(count: number): Stream<T>;
  skip(count: number): Stream<T>;
  toArray(): Promise<T[]>;
}

/**
 * Builder pattern interface
 */
export interface Builder<T> {
  build(): T;
}

/**
 * Factory interface for creating instances
 */
export interface Factory<T, TOptions = unknown> {
  create(options?: TOptions): T;
}

/**
 * Validator interface
 */
export interface Validator<T> {
  validate(value: unknown): value is T;
  validateAsync(value: unknown): Promise<boolean>;
}

/**
 * Serializer interface
 */
export interface Serializer<T, TSerialized = string> {
  serialize(value: T): TSerialized;
  deserialize(serialized: TSerialized): T;
}

/**
 * Type predicate for checking if value is not null or undefined
 */
export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * Type predicate for checking if value is a non-empty string
 */
export const isNonEmptyString = (value: unknown): value is NonEmptyString => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Type predicate for checking if value is a positive number
 */
export const isPositiveNumber = (value: unknown): value is PositiveNumber => {
  return typeof value === 'number' && value > 0 && !Number.isNaN(value);
};

/**
 * Type predicate for checking if value is a non-negative number
 */
export const isNonNegativeNumber = (
  value: unknown
): value is NonNegativeNumber => {
  return typeof value === 'number' && value >= 0 && !Number.isNaN(value);
};

/**
 * Type predicate for checking if value is an integer
 */
export const isInteger = (value: unknown): value is Integer => {
  return typeof value === 'number' && Number.isInteger(value);
};

/**
 * Type predicate for checking if array is non-empty
 */
export const isNonEmptyArray = <T>(value: T[]): value is NonEmptyArray<T> => {
  return value.length > 0;
};

/**
 * Creates a Result success value
 */
export const success = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

/**
 * Creates a Result error value
 */
export const failure = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

/**
 * Type assertion that a value is defined (throws if not)
 */
export const assertDefined = <T>(
  value: T | null | undefined,
  message?: string
): T => {
  if (!isDefined(value)) {
    throw new Error(message ?? 'Value is null or undefined');
  }
  return value;
};

/**
 * Creates a branded type value
 */
export const brand = <T, TBrand extends string>(value: T): Brand<T, TBrand> => {
  return value as Brand<T, TBrand>;
};

/**
 * Removes brand from a branded type
 */
export const unbrand = <T, TBrand extends string>(
  value: Brand<T, TBrand>
): T => {
  return value as T;
};
