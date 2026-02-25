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
   * Connect to Desktop server
   */
  async connect(ip: string, port: number, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For MVP, use WebSocket instead of TCP/TLS (simpler for React Native)
        // In production, use react-native-tcp-socket with TLS
        const ws = new WebSocket(`ws://${ip}:${port}`);

        ws.onopen = () => {
          console.log('Connected to Desktop');
          this.connection = ws;
          this.connectionInfo = { ip, port, token };
          this.connected = true;
          resolve();
        };

        ws.onerror = (error) => {
          console.error('Connection error:', error);
          this.connected = false;
          reject(new Error('Failed to connect to Desktop'));
        };

        ws.onclose = () => {
          console.log('Disconnected from Desktop');
          this.connected = false;
          this.connection = null;
        };

        ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.connected) {
            ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
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
