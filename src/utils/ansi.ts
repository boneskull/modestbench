/**
 * ANSI Color Codes and Terminal Utilities
 *
 * Shared ANSI escape codes for colored terminal output. Used across reporters
 * and CLI commands for consistent visual styling.
 */

/**
 * ANSI color codes for terminal output
 */
export const colors = {
  bold: '\x1b[1m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
  brightMagenta: '\x1b[95m',
  brightRed: '\x1b[91m',
  brightWhite: '\x1b[97m',
  brightYellow: '\x1b[93m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  underline: '\x1b[4m',
  white: '\x1b[37m',
} as const;

/**
 * CP437-inspired ANSI art characters
 */
export const ansiChars = {
  approx: '≈',
  // Block elements for gradients
  block: {
    dark: '▓',
    full: '█',
    light: '░',
    medium: '▒',
  },
  bullet: '•',
  // Symbols
  checkmark: '√',
  cross: '×',
  plusMinus: '±',
  smallSquare: '▪',
} as const;

/**
 * Apply ANSI color to text
 *
 * @param color - Color name from the colors object
 * @param text - Text to colorize
 * @returns Colorized text with reset code
 */
export const colorize = (color: keyof typeof colors, text: string): string => {
  return `${colors[color]}${text}${colors.reset}`;
};
