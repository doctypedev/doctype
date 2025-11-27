/**
 * Simple CLI logger with colored output
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  SUCCESS = 'success',
  DEBUG = 'debug',
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

/**
 * CLI Logger for formatted console output
 */
export class Logger {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Log an error message
   */
  public error(message: string, ...args: unknown[]): void {
    console.error(`${colors.red}✗${colors.reset} ${message}`, ...args);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, ...args: unknown[]): void {
    console.warn(`${colors.yellow}⚠${colors.reset} ${message}`, ...args);
  }

  /**
   * Log an info message
   */
  public info(message: string, ...args: unknown[]): void {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`, ...args);
  }

  /**
   * Log a success message
   */
  public success(message: string, ...args: unknown[]): void {
    console.log(`${colors.green}✓${colors.reset} ${message}`, ...args);
  }

  /**
   * Log a debug message (only in verbose mode)
   */
  public debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      console.log(`${colors.gray}[DEBUG]${colors.reset} ${message}`, ...args);
    }
  }

  /**
   * Log a plain message without prefix
   */
  public log(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  }

  /**
   * Log a section header
   */
  public header(message: string): void {
    console.log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}\n`);
  }

  /**
   * Log a divider line
   */
  public divider(): void {
    console.log(colors.gray + '─'.repeat(60) + colors.reset);
  }

  /**
   * Create a new line
   */
  public newline(): void {
    console.log();
  }

  /**
   * Format text with color
   */
  public static color(text: string, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`;
  }

  /**
   * Format text as bold
   */
  public static bold(text: string): string {
    return `${colors.bold}${text}${colors.reset}`;
  }

  /**
   * Format file path
   */
  public static path(filePath: string): string {
    return `${colors.cyan}${filePath}${colors.reset}`;
  }

  /**
   * Format symbol name
   */
  public static symbol(symbolName: string): string {
    return `${colors.magenta}${symbolName}${colors.reset}`;
  }

  /**
   * Format hash (shortened)
   */
  public static hash(hash: string, length: number = 8): string {
    return `${colors.gray}${hash.substring(0, length)}${colors.reset}`;
  }
}
