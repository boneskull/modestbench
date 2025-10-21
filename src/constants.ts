/**
 * Supported benchmark file extensions
 */
export const BENCHMARK_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.mjs',
  '.mts',
  '.ts',
]);

/**
 * Glob pattern fragment for benchmark file extensions. Example:
 * ".bench.{js,mjs,cjs,ts,mts,cts}"
 */
export const BENCHMARK_FILE_PATTERN = `.bench.{${Array.from(
  BENCHMARK_FILE_EXTENSIONS,
)
  .map((ext) => ext.slice(1))
  .join(',')}}`;
