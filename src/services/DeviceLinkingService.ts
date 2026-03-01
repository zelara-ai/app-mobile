/**
 * DeviceLinkingService - Mobile TLS client for connecting to Desktop
 *
 * Handles:
 * - Connection to Desktop server
 * - Sending task requests (image validation)
 * - Receiving and parsing responses
 */

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
  ip: string;
  port: number;
  token: string;
}

class DeviceLinkingService {
  private connection: WebSocket | null = null;
  private connectionInfo: ConnectionInfo | null = null;
  private connected: boolean = false;
  private pendingRequests: Map<string, (response: TaskResponse) => void> = new Map();

  /**
   * Connect to Desktop server, trying each IP in order until one succeeds.
   * This handles cases where the QR code embeds multiple interface IPs
   * (e.g., main WiFi + hotspot adapter).
   */
  async connect(ips: string | string[], port: number, token: string): Promise<void> {
    const ipList = Array.isArray(ips) ? ips : [ips];
    const errors: string[] = [];

    for (const ip of ipList) {
      try {
        await this.connectToSingle(ip, port, token);
        return; // success
      } catch (err: any) {
        errors.push(`${ip}: ${err.message}`);
      }
    }

    throw new Error(`Could not connect to Desktop. Tried:\n${errors.join('\n')}`);
  }

  /**
   * Attempt a WebSocket connection to a single IP with a 3-second timeout.
   */
  private connectToSingle(ip: string, port: number, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      try {
        const ws = new WebSocket(`ws://${ip}:${port}`);

        const timer = setTimeout(() => {
          ws.close();
          settle(() => reject(new Error('Connection timeout')));
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timer);
          console.log(`Connected to Desktop at ${ip}:${port}`);
          this.connection = ws;
          this.connectionInfo = { ip, port, token };
          this.connected = true;

          ws.onclose = () => {
            console.log('Disconnected from Desktop');
            this.connected = false;
            this.connection = null;
          };

          ws.onmessage = (event) => {
            this.handleMessage(event.data);
          };

          settle(() => resolve());
        };

        ws.onerror = (event: any) => {
          clearTimeout(timer);
          console.error(`WebSocket error connecting to ${ip}:${port}`, event?.message || event);
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
   * Disconnect from Desktop
   */
  disconnect(): void {
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
      // Store callback for this request
      this.pendingRequests.set(taskId, (response: TaskResponse) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.result.error || 'Inversion failed'));
        }
      });

      // Send request
      try {
        this.connection!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(taskId);
        reject(error);
      }

      // Timeout after 30 seconds
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
        token: this.connectionInfo!.token, // Include token for verification
      },
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      // Store callback for this request
      this.pendingRequests.set(taskId, (response: TaskResponse) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.result.error || 'Validation failed'));
        }
      });

      // Send request
      try {
        this.connection!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(taskId);
        reject(error);
      }

      // Timeout after 30 seconds
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
   * Handle incoming message from Desktop
   */
  private handleMessage(data: string): void {
    try {
      const response: TaskResponse = JSON.parse(data);

      // Find pending request callback
      const callback = this.pendingRequests.get(response.taskId);
      if (callback) {
        callback(response);
        this.pendingRequests.delete(response.taskId);
      }
    } catch (error) {
      console.error('Failed to parse response:', error);
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
export default new DeviceLinkingService();
