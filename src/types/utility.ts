/**
 * ModestBench Utility Types
 *
 * Defines utility types, helper functions, and common type transformations used
 * throughout the ModestBench system.
 */

/**
 * Represents an async function
 */
export type AsyncCallable<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown,
> = (...args: TArgs) => Promise<TReturn>;

/**
 * Async iterator interface
 */
export interface AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

/**
 * Tuple with at least one element
 */
export type AtLeastOne<T> = [T, ...T[]];

/**
 * Branded type for creating nominal types
 */
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

/**
 * Builder pattern interface
 */
export interface Builder<T> {
  build(): T;
}

/**
 * Bytes count
 */
export type Bytes = Brand<number, 'Bytes'>;

/**
 * Cache interface
 */
export interface Cache<TKey = string, TValue = unknown> {
  clear(): void;
  delete(key: TKey): boolean;
  get(key: TKey): Option<TValue>;
  has(key: TKey): boolean;
  set(key: TKey, value: TValue, ttl?: number): void;
  size(): number;
}

/**
 * Represents a function that can be called with arguments
 */
export type Callable<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown,
> = (...args: TArgs) => TReturn;

/**
 * Git commit hash
 */
export type CommitHash = Brand<string, 'CommitHash'>;

/**
 * Error with additional context
 */
export interface ContextualError extends Error {
  readonly code?: string;
  readonly context?: Record<string, unknown>;
  readonly severity?: 'critical' | 'high' | 'low' | 'medium';
}

/**
 * CSV string representation
 */
export type CsvString = Brand<string, 'CsvString'>;

/**
 * Makes all properties in T deeply partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all properties in T deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Directory path brand for type safety
 */
export type DirectoryPath = Brand<string, 'DirectoryPath'>;

/**
 * Disposable resource interface
 */
export interface Disposable {
  dispose(): MaybePromise<void>;
}

/**
 * Environment variable name
 */
export type EnvVar = Brand<string, 'EnvVar'>;

/**
 * Event emitter interface
 */
export interface EventEmitter<
  TEvents extends Record<string, unknown> = Record<string, unknown>,
> {
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  off<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>,
  ): void;
  on<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>,
  ): void;
  once<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>,
  ): void;
}

/**
 * Event listener function type
 */
export type EventListener<TData = unknown> = (
  data: TData,
) => MaybePromise<void>;

/**
 * Factory interface for creating instances
 */
export interface Factory<T, TOptions = unknown> {
  create(options?: TOptions): T;
}

/**
 * File path brand for type safety
 */
export type FilePath = Brand<string, 'FilePath'>;

/**
 * Integer number
 */
export type Integer = Brand<number, 'Integer'>;

/**
 * JSON string representation
 */
export type JsonString = Brand<string, 'JsonString'>;

/**
 * Extracts keys from T that have values assignable to U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
}

/**
 * Represents a function that may be async or sync
 */
export type MaybePromise<T> = Promise<T> | T;

/**
 * Memory usage information
 */
export interface MemoryUsage {
  readonly arrayBuffers: Bytes;
  readonly external: Bytes;
  readonly heapTotal: Bytes;
  readonly heapUsed: Bytes;
  readonly rss: Bytes;
}

/**
 * Duration in milliseconds
 */
export type MillisecondDuration = Brand<number, 'MillisecondDuration'>;

/**
 * Timestamp in milliseconds
 */
export type MillisecondTimestamp = Brand<number, 'MillisecondTimestamp'>;

/**
 * Duration in nanoseconds
 */
export type NanoDuration = Brand<number, 'NanoDuration'>;

/**
 * Timestamp in nanoseconds
 */
export type NanosecondTimestamp = Brand<number, 'NanoTimestamp'>;

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * String that is not empty
 */
export type NonEmptyString = Brand<string, 'NonEmptyString'>;

/**
 * Non-negative number (>= 0)
 */
export type NonNegativeNumber = Brand<number, 'NonNegativeNumber'>;

/**
 * Option type for values that may not exist
 */
export type Option<T> = null | T | undefined;

/**
 * Makes specified keys K in T optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Percentage value (0-100)
 */
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Port number (1-65535)
 */
export type Port = Brand<number, 'Port'>;

/**
 * Positive number (> 0)
 */
export type PositiveNumber = Brand<number, 'PositiveNumber'>;

/**
 * Makes specified keys K in T required
 */
export type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> & T;

/**
 * System resource usage
 */
export interface ResourceUsage {
  readonly cpu: {
    readonly system: number;
    readonly user: number;
  };
  readonly memory: MemoryUsage;
  readonly timing: TimingInfo;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { readonly data: T; readonly success: true }
  | { readonly error: E; readonly success: false };

/**
 * Configuration that can be serialized to JSON
 */
export type SerializableConfig = {
  readonly [K in string]:
    | boolean
    | null
    | number
    | readonly (boolean | null | number | string)[]
    | readonly SerializableConfig[]
    | SerializableConfig
    | string;
};

/**
 * Serializer interface
 */
export interface Serializer<T, TSerialized = string> {
  deserialize(serialized: TSerialized): T;
  serialize(value: T): TSerialized;
}

/**
 * Stream interface
 */
export interface Stream<T> extends AsyncIterable<T> {
  filter(predicate: (value: T) => boolean): Stream<T>;
  pipe<U>(transform: (value: T) => U): Stream<U>;
  skip(count: number): Stream<T>;
  take(count: number): Stream<T>;
  toArray(): Promise<T[]>;
}

/**
 * Suite identifier
 */
export type SuiteId = Brand<string, 'SuiteId'>;

/**
 * Timing information
 */
export interface TimingInfo {
  readonly duration: MillisecondDuration;
  readonly end: MillisecondTimestamp;
  readonly start: MillisecondTimestamp;
}

/**
 * URL brand for type safety
 */
export type Url = Brand<string, 'Url'>;

/**
 * Validator interface
 */
export interface Validator<T> {
  validate(value: unknown): value is T;
  validateAsync(value: unknown): Promise<boolean>;
}

/**
 * YAML string representation
 */
export type YamlString = Brand<string, 'YamlString'>;

/**
 * Type predicate for checking if value is not null or undefined
 */
export const isDefined = <T>(value: null | T | undefined): value is T => {
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
  value: unknown,
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
  data,
  success: true,
});

/**
 * Creates a Result error value
 */
export const failure = <E>(error: E): Result<never, E> => ({
  error,
  success: false,
});

/**
 * Type assertion that a value is defined (throws if not)
 */
export const assertDefined = <T>(
  value: null | T | undefined,
  message?: string,
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
  value: Brand<T, TBrand>,
): T => {
  return value as T;
};
