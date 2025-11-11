// Structured logger with channels and export functionality

import type { LogLevel, LogChannel, LogEntry } from './types';

export interface LoggerOptions {
  bufferSize?: number;
  throttleMs?: Record<LogChannel, number>;
}

export interface Logger {
  log(level: LogLevel, channel: LogChannel, message: string, data?: any, ballId?: number): void;
  trace(channel: LogChannel, message: string, data?: any, ballId?: number): void;
  debug(channel: LogChannel, message: string, data?: any, ballId?: number): void;
  info(channel: LogChannel, message: string, data?: any, ballId?: number): void;
  warn(channel: LogChannel, message: string, data?: any, ballId?: number): void;
  error(channel: LogChannel, message: string, data?: any, ballId?: number): void;
  exportLogs(): string;
  clearLogs(): void;
  getLogs(): LogEntry[];
}

class RingBuffer<T> {
  private buffer: T[];
  private size: number;
  private head: number = 0;
  private count: number = 0;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Array(size);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) {
      this.count++;
    }
  }

  getAll(): T[] {
    const result: T[] = [];
    const start = this.count === this.size ? this.head : 0;
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[(start + i) % this.size]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }
}

export function makeLogger(opts: LoggerOptions = {}): Logger {
  const bufferSize = opts.bufferSize ?? 10000;
  const throttleMs = opts.throttleMs ?? {
    PHYS: 16, // ~60fps
    ROW: 0,
    HIT: 0,
    STEER: 16,
    MAG: 16,
    LAND: 0,
    INIT: 0,
    CFG: 0,
  };

  const buffer = new RingBuffer<LogEntry>(bufferSize);
  const lastLogTime: Record<string, number> = {};
  let stepCounter = 0;

  function shouldThrottle(channel: LogChannel): boolean {
    const throttle = throttleMs[channel];
    if (throttle === 0) return false;

    const key = channel;
    const now = Date.now();
    const last = lastLogTime[key] ?? 0;
    if (now - last < throttle) {
      return true;
    }
    lastLogTime[key] = now;
    return false;
  }

  function log(
    level: LogLevel,
    channel: LogChannel,
    message: string,
    data?: any,
    ballId?: number
  ): void {
    if (shouldThrottle(channel)) return;

    const entry: LogEntry = {
      level,
      channel,
      message,
      data,
      timestamp: Date.now(),
      step: stepCounter++,
      ballId,
    };

    buffer.push(entry);

    // Console output for important channels
    if (channel === 'LAND' || channel === 'INIT' || channel === 'ROW' || channel === 'HIT') {
      const prefix = `[${channel}]`;
      const ballPrefix = ballId !== undefined ? `[Ball#${ballId}]` : '';
      console.log(`${prefix}${ballPrefix} ${message}`, data ?? '');
    }
  }

  return {
    log(level, channel, message, data, ballId) {
      log(level, channel, message, data, ballId);
    },
    trace(channel, message, data, ballId) {
      log('trace', channel, message, data, ballId);
    },
    debug(channel, message, data, ballId) {
      log('debug', channel, message, data, ballId);
    },
    info(channel, message, data, ballId) {
      log('info', channel, message, data, ballId);
    },
    warn(channel, message, data, ballId) {
      log('warn', channel, message, data, ballId);
    },
    error(channel, message, data, ballId) {
      log('error', channel, message, data, ballId);
    },
    exportLogs(): string {
      return JSON.stringify(buffer.getAll(), null, 2);
    },
    clearLogs(): void {
      buffer.clear();
    },
    getLogs(): LogEntry[] {
      return buffer.getAll();
    },
  };
}

