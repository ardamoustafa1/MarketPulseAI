/**
 * Lightweight funnel / screen logging. Wire to analytics backend or forward from infra.
 */
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from '../api/client';

const ANALYTICS_QUEUE_KEY = 'analytics_event_queue_v1';

type AnalyticsEvent = {
  name: string;
  params?: Record<string, unknown>;
  ts: string;
  attempts: number;
  nextRetryAt: number;
};

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

export function logScreen(name: string, params?: Record<string, unknown>) {
  if (__DEV__) {
    console.log('[analytics:screen]', name, params);
  }
  void enqueueEvent({
    name: `screen_${name.toLowerCase()}`,
    params,
    ts: new Date().toISOString(),
    attempts: 0,
    nextRetryAt: 0,
  });
}

export function logEvent(name: string, params?: Record<string, unknown>) {
  if (__DEV__) {
    console.log('[analytics:event]', name, params);
  }
  void enqueueEvent({
    name,
    params,
    ts: new Date().toISOString(),
    attempts: 0,
    nextRetryAt: 0,
  });
}

async function readQueue(): Promise<AnalyticsEvent[]> {
  try {
    const raw = await SecureStore.getItemAsync(ANALYTICS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.name === 'string')
      .map((item) => ({
        name: String(item.name),
        params: typeof item.params === 'object' && item.params ? item.params : {},
        ts: typeof item.ts === 'string' ? item.ts : new Date().toISOString(),
        attempts: typeof item.attempts === 'number' ? item.attempts : 0,
        nextRetryAt: typeof item.nextRetryAt === 'number' ? item.nextRetryAt : 0,
      }));
  } catch {
    return [];
  }
}

async function writeQueue(events: AnalyticsEvent[]): Promise<void> {
  await SecureStore.setItemAsync(ANALYTICS_QUEUE_KEY, JSON.stringify(events.slice(-200)));
}

async function enqueueEvent(event: AnalyticsEvent): Promise<void> {
  const current = await readQueue();
  current.push(event);
  await writeQueue(current);
}

export async function flushAnalyticsQueue(): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) return;

  const token = await SecureStore.getItemAsync('access_token');
  if (!token) return;

  const remaining: AnalyticsEvent[] = [];
  const now = Date.now();
  const processBatch = queue.slice(0, 30);
  const carryOver = queue.slice(30);
  for (const event of processBatch) {
    if (event.nextRetryAt > now) {
      remaining.push(event);
      continue;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/strategy/events`,
        { name: event.name, params: { ...(event.params ?? {}), ts: event.ts } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      const nextAttempts = (event.attempts ?? 0) + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        continue;
      }
      const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (nextAttempts - 1), MAX_BACKOFF_MS);
      remaining.push({
        ...event,
        attempts: nextAttempts,
        nextRetryAt: now + backoff,
      });
    }
  }
  await writeQueue([...remaining, ...carryOver]);
}
