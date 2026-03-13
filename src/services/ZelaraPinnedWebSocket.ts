/**
 * ZelaraPinnedWebSocket — drop-in WebSocket wrapper backed by ZelaraWebSocketModule.
 *
 * Used on Android only (where React Native's built-in WebSocket bypasses the custom
 * OkHttp factory in new-arch Bridgeless mode). This class creates WebSocket connections
 * through our native module which owns its own OkHttpClient with cert pinning support.
 *
 * Exposes the same subset of the WebSocket API that DeviceLinkingService uses:
 * onopen, onclose, onerror, onmessage, send(), close()
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

const { ZelaraWebSocket } = NativeModules;

let _connectionCounter = 0;
let _emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (!_emitter) {
    _emitter = new NativeEventEmitter(ZelaraWebSocket);
  }
  return _emitter;
}

export class ZelaraPinnedWebSocket {
  private id: string;
  private subscription: ReturnType<NativeEventEmitter['addListener']> | null = null;

  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string, fingerprint?: string) {
    this.id = `zwss_${++_connectionCounter}_${Date.now()}`;

    this.subscription = getEmitter().addListener('ZelaraWebSocketEvent', (event) => {
      if (event.id !== this.id) return;

      switch (event.type) {
        case 'onOpen':
          this.onopen?.();
          break;
        case 'onMessage':
          this.onmessage?.({ data: event.data });
          break;
        case 'onClose':
          this.subscription?.remove();
          this.subscription = null;
          this.onclose?.();
          break;
        case 'onError':
          this.subscription?.remove();
          this.subscription = null;
          this.onerror?.({ message: event.data });
          break;
      }
    });

    ZelaraWebSocket.connect(this.id, url, fingerprint ?? null);
  }

  send(message: string): void {
    ZelaraWebSocket.send(this.id, message);
  }

  close(): void {
    this.subscription?.remove();
    this.subscription = null;
    ZelaraWebSocket.close(this.id);
  }
}
