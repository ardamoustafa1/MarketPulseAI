import { AppState, AppStateStatus, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:8000/api/v1/ws';

const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL_MS = 25000; // 25 seconds — well within typical 30s server timeout

export class MarketPulseWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: any = null;
  private _isIntentionalClose = false;
  private subscriptions = new Set<string>();
  private sessionVersion = 0;

  public onMessage: ((data: any) => void) | null = null;
  public onConnectionChange: ((connected: boolean) => void) | null = null;

  /**
   * Initialize lifecycle listeners. Call once on app mount.
   */
  init() {
    if (this.appStateSubscription) {
      return;
    }
    // Listen for app foreground/background transitions
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Teardown all listeners. Call on app unmount / logout.
   */
  destroy() {
    this.sessionVersion += 1;
    this._isIntentionalClose = true;
    this.stopHeartbeat();
    this.stopReconnectTimer();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.ws?.close();
    this.ws = null;
    this.subscriptions.clear();
    this.onConnectionChange?.(false);
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      // App came back to foreground — reconnect if socket is dead
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.reconnectAttempts = 0; // Reset backoff since user is actively using app
        this.connect();
      }
    } else if (nextState === 'background') {
      // Gracefully close to avoid zombie sockets on the backend
      this._isIntentionalClose = true;
      this.stopHeartbeat();
      this.stopReconnectTimer();
      this.ws?.close();
    }
  };

  async connect() {
    // Prevent duplicate connections
    if (this.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) return;
    
    const connectVersion = this.sessionVersion;
    const token = await SecureStore.getItemAsync('access_token');
    if (connectVersion !== this.sessionVersion || !token) {
      this.onConnectionChange?.(false);
      return;
    }

    this._isIntentionalClose = false;
    this.stopReconnectTimer();

    try {
      const normalizedBaseUrl = WS_BASE_URL.endsWith('/') ? WS_BASE_URL.slice(0, -1) : WS_BASE_URL;
      this.ws = new WebSocket(`${normalizedBaseUrl}/`, undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      if (connectVersion !== this.sessionVersion) {
        this.ws?.close();
        return;
      }
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onConnectionChange?.(true);
      if (this.subscriptions.size > 0) {
        this.safeSend({ action: 'subscribe', payload: { assets: Array.from(this.subscriptions) } });
      }
    };

    this.ws.onmessage = (event) => {
      if (connectVersion !== this.sessionVersion) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        // Backend pong responses are silently consumed
        if (data.event === 'pong') return;
        this.onMessage?.(data);
      } catch (e) {
        // Malformed JSON — silently ignore
      }
    };

    this.ws.onerror = () => {
      // onerror is always followed by onclose, so we handle reconnect there
    };

    this.ws.onclose = () => {
      if (connectVersion !== this.sessionVersion) {
        return;
      }
      this.stopHeartbeat();
      this.onConnectionChange?.(false);
      
      if (!this._isIntentionalClose) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    
    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    this.stopReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.safeSend({ action: 'ping' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private stopReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private safeSend(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // Avoid INVALID_STATE_ERR during rapid socket state changes.
    }
  }

  subscribe(assets: string[]) {
    const incoming = assets.map((asset) => asset.toUpperCase());
    const newlyAdded = incoming.filter((asset) => !this.subscriptions.has(asset));
    newlyAdded.forEach((asset) => this.subscriptions.add(asset));
    if (newlyAdded.length > 0) {
      this.safeSend({ action: 'subscribe', payload: { assets: newlyAdded } });
    }
  }

  unsubscribe(assets: string[]) {
    const outgoing = assets.map((asset) => asset.toUpperCase()).filter((asset) => this.subscriptions.has(asset));
    outgoing.forEach((asset) => this.subscriptions.delete(asset));
    if (outgoing.length > 0) {
      this.safeSend({
        action: 'unsubscribe',
        payload: { assets: outgoing },
      });
    }
  }

  disconnect() {
    this.destroy();
  }
}

export const wsClient = new MarketPulseWebSocket();
