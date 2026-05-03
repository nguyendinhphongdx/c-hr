import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private logLevel: LogLevel;

  constructor(private configService: ConfigService) {
    const level = this.configService.get<string>('app.logLevel', 'info');
    this.logLevel = level as LogLevel;
  }

  log(message: string, context?: string) {
    this.printLog(LogLevel.INFO, message, context);
  }
  error(message: string, trace?: string, context?: string) {
    this.printLog(LogLevel.ERROR, message, context, trace);
  }
  warn(message: string, context?: string) {
    this.printLog(LogLevel.WARN, message, context);
  }
  debug(message: string, context?: string) {
    if (this.shouldLog(LogLevel.DEBUG)) this.printLog(LogLevel.DEBUG, message, context);
  }
  verbose(message: string, context?: string) {
    if (this.shouldLog(LogLevel.VERBOSE)) this.printLog(LogLevel.VERBOSE, message, context);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
      LogLevel.VERBOSE,
    ];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private printLog(level: LogLevel, message: string, context?: string, trace?: string) {
    const timestamp = new Date().toLocaleString('en-US', { hour12: false });
    const colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      green: '\x1b[32m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
    };

    let levelColor = colors.reset;
    const levelLabel = level.toUpperCase().padEnd(7);
    switch (level) {
      case LogLevel.ERROR:
        levelColor = colors.red;
        break;
      case LogLevel.WARN:
        levelColor = colors.yellow;
        break;
      case LogLevel.INFO:
        levelColor = colors.green;
        break;
      case LogLevel.DEBUG:
        levelColor = colors.blue;
        break;
      case LogLevel.VERBOSE:
        levelColor = colors.magenta;
        break;
    }

    const contextStr = context ? `${colors.cyan}[${context}]${colors.reset}` : '';
    const line = `${colors.gray}${timestamp}${colors.reset} ${levelColor}${levelLabel}${colors.reset} ${contextStr} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(line);
        if (trace) console.error(trace);
        break;
      case LogLevel.WARN:
        console.warn(line);
        break;
      case LogLevel.DEBUG:
      case LogLevel.VERBOSE:
        console.debug(line);
        break;
      default:
        console.log(line);
    }
  }
}
