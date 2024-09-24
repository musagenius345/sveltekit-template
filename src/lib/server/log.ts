import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import getAllUrlParams from '$lib/_helpers/getAllUrlParams';
import parseTrack from '$lib/_helpers/parseTrack';
import parseMessage from '$lib/_helpers/parseMessage';
import { DOMAIN } from '$lib/config/constants';

const LOG_DIR: string = path.join(process.cwd(), 'logs');
const LOG_FILE: string = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);
const WRITE_BUFFER: string[] = [];
const BUFFER_SIZE: number = 10; // Number of logs to buffer before writing
const FLUSH_INTERVAL: number = 5000; // Flush interval in milliseconds

interface LogData {
  timestamp: string;
  level: 'info' | 'error';
  method: string;
  path: string;
  status: number;
  timeInMs: number;
  user?: string;
  userId?: string;
  referer?: string;
  error?: unknown;
  errorId?: string;
  errorStackTrace?: string;
  [key: string]: unknown;
}

interface Event {
	request: {
	  method: string;
	  headers: {
		get(name: string): string | null;
	  };
	};
	url: {
	  pathname: string;
	  search?: string;
	};
	locals?: {
	  startTimer?: number;
	  user?: {
		email?: string;
		userId?: string;
	  };
	  error?: unknown;
	  errorId?: string;
	  errorStackTrace?: string;
	  message?: unknown;
	  track?: unknown;
	};
  }

// Ensure log directory exists
fs.mkdir(LOG_DIR, { recursive: true }).catch(console.error);

async function flushLogs(): Promise<void> {
  if (WRITE_BUFFER.length === 0) return;

  const logsToWrite = WRITE_BUFFER.splice(0, WRITE_BUFFER.length);
  try {
    await fs.appendFile(LOG_FILE, logsToWrite.join('\n') + '\n');
  } catch (err) {
    console.error('Failed to write logs:', err);
  }
}

setInterval(flushLogs, FLUSH_INTERVAL);

process.on('exit', () => {
  flushLogs().catch(console.error);
});

export default async function log(statusCode: number, event: Event): Promise<void> {
  const startTime = performance.now();
  try {
    const level: LogData['level'] = statusCode >= 400 ? 'error' : 'info';
    const { error, errorId, errorStackTrace } = event?.locals || {};
    
    const urlParams = event?.url?.search ? await getAllUrlParams(event.url.search) : {};
    const messageEvents = event?.locals?.message ? await parseMessage(event.locals.message) : {};
    const trackEvents = event?.locals?.track ? await parseTrack(event.locals.track) : {};

    let referer: string | undefined = undefined;
    const refererHeader = event.request.headers.get('referer');
    if (refererHeader) {
      const refererUrl = new URL(refererHeader);
      referer = (refererUrl.hostname === 'localhost' || refererUrl.hostname === DOMAIN) 
        ? refererUrl.pathname 
        : refererHeader;
    }

    const logData: LogData = {
      timestamp: new Date().toISOString(),
      level,
      method: event.request.method,
      path: event.url.pathname,
      status: statusCode,
      timeInMs: performance.now() - (event?.locals?.startTimer || startTime),
      user: event?.locals?.user?.email,
      userId: event?.locals?.user?.userId,
      referer,
      error,
      errorId,
      errorStackTrace,
      ...urlParams,
      ...messageEvents,
      ...trackEvents
    };

    WRITE_BUFFER.push(JSON.stringify(logData));

    if (WRITE_BUFFER.length >= BUFFER_SIZE) {
      await flushLogs();
    }

  } catch (err) {
    console.error(`Error Logger: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    const endTime = performance.now();
    console.log(`Logging took ${endTime - startTime} milliseconds`);
  }
}