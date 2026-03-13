/**
 * DeviceLinkingService - Mobile TLS client for connecting to Desktop
 *
 * Handles:
 * - Connection to Desktop server
 * - Sending task requests (image validation, image inversion, counter updates)
 * - Receiving and parsing responses
 * - Auto-reconnect on network drops (exponential backoff, max 30 s)
 * - Stable device identity (UUID persisted in AsyncStorage)
 * - Connection change notifications for reactive UI
 */

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { ZelaraTLS } = NativeModules;
import { ZelaraPinnedWebSocket } from './ZelaraPinnedWebSocket';

const DEVICE_ID_KEY = 'zelara_device_id';

interface TaskRequest {
  taskId: string;
  taskType: string;
  payload: Record<string, any>;
  timestamp: string;
}

interface TaskResponse {
  taskId: string;
  success: boolean;
  result: any;
  timestamp: string;
}

interface ConnectionInfo {
  ips: string[];
  port: number;
  token: string;
  cert?: string;
}

class DeviceLinkingService {
  private connection: WebSocket | ZelaraPinnedWebSocket | null = null;
  private connectionInfo: ConnectionInfo | null = null;
  private connected: boolean = false;
  private pendingRequests: Map<string, (response: TaskResponse) => void> = new Map();
  private certFingerprint: string | undefined;

  // Stable per-device UUID, persisted across app restarts.
  private deviceId: string | null = null;

  // Credentials from the last successful connect — used for auto-reconnect.
  private lastKnownCredentials: ConnectionInfo | null = null;

  // Auto-reconnect state
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Subscribers for connection state changes (reactive UI support)
  private connectionListeners: Array<(connected: boolean) => void> = [];

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Subscribe to connection state changes. Returns an unsubscribe function.
   */
  onConnectionChange(cb: (connected: boolean) => void): () => void {
    this.connectionListeners.push(cb);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== cb);
    };
  }

  /**
   * Connect to Desktop server, trying each IP in order until one succeeds.
   * This handles cases where the QR code embeds multiple interface IPs
   * (e.g., main WiFi + hotspot adapter).
   */
  async connect(ips: string | string[], port: number, token: string, cert?: string): Promise<void> {
    this.certFingerprint = cert;
    console.log('[DeviceLinking] connect() cert fingerprint:', cert ?? 'none (TrustAll)', '| len:', cert?.length);

    // On Android, ZelaraWebSocketModule handles cert pinning directly via its own OkHttpClient.
    // For HTTP requests (not WebSocket), also update ZelaraOkHttpFactory via ZelaraTLS.
    // On iOS, NSAllowsLocalNetworking handles the bypass; cert pinning is a future task.
    if (cert && ZelaraTLS?.setPinnedCert) {
      ZelaraTLS.setPinnedCert(cert);
    }

    const ipList = Array.isArray(ips) ? ips : [ips];
    console.log('[DeviceLinking] Trying IPs:', ipList);
    const errors: string[] = [];

    for (const ip of ipList) {
      console.log(`[DeviceLinking] Attempting ${ip}:${port}`);
      try {
        await this.connectToSingle(ip, port, token, cert);
        // Store credentials for auto-reconnect
        this.lastKnownCredentials = { ips: ipList, port, token, cert };
        return; // success
      } catch (err: any) {
        console.log(`[DeviceLinking] ${ip} failed: ${err.message}`);
        errors.push(`${ip}: ${err.message}`);
      }
    }

    throw new Error(`Could not connect to Desktop. Tried:\n${errors.join('\n')}`);
  }

  /**
   * Attempt a WebSocket connection to a single IP with a 3-second timeout.
   */
  private connectToSingle(ip: string, port: number, token: string, cert?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      try {
        // On Android, use ZelaraWebSocketModule (owns its own OkHttpClient with cert pinning).
        // On iOS, fall back to native WebSocket (NSAllowsLocalNetworking handles the bypass).
        const ws: WebSocket | ZelaraPinnedWebSocket =
          Platform.OS === 'android' && NativeModules.ZelaraWebSocket
            ? new ZelaraPinnedWebSocket(`wss://${ip}:${port}`, cert ?? this.certFingerprint)
            : new WebSocket(`wss://${ip}:${port}`);

        const timer = setTimeout(() => {
          ws.close();
          settle(() => reject(new Error('Connection timeout')));
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timer);
          console.log(`[DeviceLinking] Connected to Desktop at ${ip}:${port}`);
          this.connection = ws;
          this.connectionInfo = { ips: [ip], port, token };
          this.connected = true;
          this.reconnectAttempt = 0;

          // Persistent close handler — clears state and schedules reconnect.
          ws.onclose = () => {
            console.log('[DeviceLinking] Disconnected from Desktop');
            this.connected = false;
            this.connection = null;
            this.notifyConnectionChange(false);
            this.scheduleReconnect();
          };

          // Persistent error handler — handles abrupt drops (e.g., airplane mode).
          // Without this, an onerror on an established connection would go unhandled.
          ws.onerror = (event: any) => {
            console.error('[DeviceLinking] Connection error on established socket:', event?.message ?? event);
            this.connected = false;
            this.connection = null;
            this.notifyConnectionChange(false);
            this.scheduleReconnect();
          };

          ws.onmessage = (event) => {
            this.handleMessage(event.data);
          };

          settle(() => resolve());
        };

        ws.onerror = (event: any) => {
          clearTimeout(timer);
          console.error(`[DeviceLinking] WebSocket error connecting to ${ip}:${port}`, event?.message || event);
          settle(() => reject(new Error('Connection refused')));
        };

        ws.onclose = () => {
          clearTimeout(timer);
          settle(() => reject(new Error('Connection closed')));
        };
      } catch (error: any) {
        settle(() => reject(error));
      }
    });
  }

  /**
   * Disconnect from Desktop and cancel any pending reconnect.
   */
  disconnect(): void {
    this.cancelReconnect();
    this.lastKnownCredentials = null; // prevent auto-reconnect after explicit disconnect
    if (this.connection) {
      this.connection.close();
      this.connection = null;
      this.connected = false;
      this.connectionInfo = null;
    }
  }

  /**
   * Check if connected to Desktop
   */
  isConnected(): boolean {
    return this.connected && this.connection !== null;
  }

  /**
   * Get the IP of the currently connected Desktop, or null if not connected.
   * Used by the BLE Discovery Preview to display what BLE would have shared.
   */
  getDesktopIp(): string | null {
    return this.connectionInfo?.ips[0] ?? null;
  }

  /**
   * Returns the stable device ID (UUID), loading/creating it as needed.
   */
  async getDeviceId(): Promise<string> {
    return this.getOrCreateDeviceId();
  }

  // ─── Task Methods ──────────────────────────────────────────────────────────

  /**
   * Send image inversion test request to Desktop
   */
  async sendImageInversionTest(base64Image: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Desktop');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const request: TaskRequest = {
      taskId,
      taskType: 'image_inversion_test',
      payload: {
        imageData: base64Image,
        token: this.connectionInfo!.token,
      },
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(taskId, (response: TaskResponse) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.result.error || 'Inversion failed'));
        }
      });

      try {
        this.connection!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(taskId);
        reject(error);
      }

      setTimeout(() => {
        if (this.pendingRequests.has(taskId)) {
          this.pendingRequests.delete(taskId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Send image validation request to Desktop
   */
  async sendImageValidation(base64Image: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Desktop');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const request: TaskRequest = {
      taskId,
      taskType: 'image_validation',
      payload: {
        imageData: base64Image,
        token: this.connectionInfo!.token,
      },
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(taskId, (response: TaskResponse) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.result.error || 'Validation failed'));
        }
      });

      try {
        this.connection!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(taskId);
        reject(error);
      }

      setTimeout(() => {
        if (this.pendingRequests.has(taskId)) {
          this.pendingRequests.delete(taskId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Send counter value to Desktop (fire-and-forget; called every second while connected)
   */
  async sendCounterUpdate(value: number): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Desktop');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const request: TaskRequest = {
      taskId,
      taskType: 'counter_update',
      payload: {
        value,
        token: this.connectionInfo!.token,
      },
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(taskId, (response: TaskResponse) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.result.error || 'Counter update failed'));
        }
      });

      try {
        this.connection!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(taskId);
        reject(error);
      }

      setTimeout(() => {
        if (this.pendingRequests.has(taskId)) {
          this.pendingRequests.delete(taskId);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Send handshake to Desktop immediately after WebSocket connects.
   * Resolves only after Desktop confirms registration. Must be called
   * before any other task to ensure device registration happens at
   * connection time rather than when the first counter/image task fires.
   *
   * Includes the stable device_id so Desktop can deduplicate reconnects.
   */
  async sendHandshake(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Desktop');
    }

    const deviceId = await this.getOrCreateDeviceId();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const request: TaskRequest = {
      taskId,
      taskType: 'handshake',
      payload: {
        token: this.connectionInfo!.token,
        device_id: deviceId,
      },
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(taskId, (response: TaskResponse) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.result?.error || 'Handshake failed'));
        }
      });

      try {
        this.connection!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(taskId);
        reject(error);
      }

      setTimeout(() => {
        if (this.pendingRequests.has(taskId)) {
          this.pendingRequests.delete(taskId);
          reject(new Error('Handshake timeout'));
        }
      }, 5000);
    });
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private handleMessage(data: string): void {
    try {
      const response: TaskResponse = JSON.parse(data);
      const callback = this.pendingRequests.get(response.taskId);
      if (callback) {
        callback(response);
        this.pendingRequests.delete(response.taskId);
      }
    } catch (error) {
      console.error('[DeviceLinking] Failed to parse response:', error);
    }
  }

  private notifyConnectionChange(connected: boolean): void {
    for (const cb of this.connectionListeners) {
      try { cb(connected); } catch {}
    }
  }

  /**
   * Schedule a reconnect attempt using exponential backoff (2s → 4s → 8s … 30s max).
   * No-ops if credentials are unavailable or a timer is already pending.
   */
  private scheduleReconnect(): void {
    if (!this.lastKnownCredentials || this.reconnectTimer) return;

    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempt), 30000);
    console.log(`[DeviceLinking] Scheduling reconnect attempt ${this.reconnectAttempt + 1} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempt++;

      const creds = this.lastKnownCredentials;
      if (!creds) return; // disconnect() was called while timer was pending

      console.log(`[DeviceLinking] Reconnect attempt ${this.reconnectAttempt} — trying ${creds.ips.join(', ')}`);
      try {
        await this.connect(creds.ips, creds.port, creds.token, creds.cert);
        await this.sendHandshake();
        this.reconnectAttempt = 0;
        console.log('[DeviceLinking] Reconnected successfully');
        this.notifyConnectionChange(true);
      } catch (err: any) {
        console.log(`[DeviceLinking] Reconnect failed: ${err.message}`);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
  }

  /**
   * Load or generate the persistent device UUID from AsyncStorage.
   */
  private async getOrCreateDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;
    try {
      const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (stored) {
        this.deviceId = stored;
        return stored;
      }
    } catch {}
    // Generate a new UUID
    const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    this.deviceId = newId;
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    } catch {}
    return newId;
  }
}

// Singleton instance
export default new DeviceLinkingService();
