/**
 * BLEDiscoveryService - Mobile BLE scanner for Zelara Desktop auto-discovery
 *
 * Scans for Desktop BLE advertisements (service UUID: a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6).
 * On discovery, parses IP + port from manufacturer data and hands off to DeviceLinkingService.
 *
 * Advertisement manufacturer data format (company ID 0xFFFE):
 *   Bytes 0–1 : Company ID  (little-endian, 0xFE 0xFF)
 *   Bytes 2–5 : IPv4 address (big-endian octets)
 *   Bytes 6–7 : Port number  (big-endian u16)
 *
 * Uses react-native-ble-plx. QR pairing (DevicePairingScreen) always works as a fallback.
 * If BLE is not supported or permissions are denied, this service is a no-op.
 */

import { BleManager, State as BleState } from 'react-native-ble-plx';
import DeviceLinkingService from './DeviceLinkingService';

// Zelara service UUID — must match ZELARA_SERVICE_UUID in ble_advertising.rs
const ZELARA_SERVICE_UUID = 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6';

// Company ID encoded little-endian (0xFFFE → bytes [0xFE, 0xFF])
const ZELARA_COMPANY_ID_BYTES = [0xfe, 0xff];

class BLEDiscoveryService {
  private manager: BleManager | null = null;
  private scanning = false;

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Start scanning for Desktop BLE advertisements.
   * Call once at app startup. Safe to call multiple times (no-op if already scanning).
   * Automatically stops scanning once a successful WSS connection is established.
   * Restarts scanning after a disconnect so the IP can be re-discovered.
   */
  startScan(): void {
    if (this.scanning) return;

    // Lazily create BleManager — constructor starts the BLE stack
    if (!this.manager) {
      this.manager = new BleManager();
    }

    // Wait for BLE to be powered on before scanning
    const subscription = this.manager.onStateChange((state) => {
      if (state === BleState.PoweredOn) {
        subscription.remove();
        this.doScan();
      }
    }, true /* emitCurrentState */);
  }

  /** Stop an active scan. Called automatically after a successful connection. */
  stopScan(): void {
    if (!this.scanning || !this.manager) return;
    this.manager.stopDeviceScan();
    this.scanning = false;
    console.log('[BLEDiscovery] Scan stopped');
  }

  /** Destroy the BLE manager. Call on app teardown if needed. */
  destroy(): void {
    this.stopScan();
    this.manager?.destroy();
    this.manager = null;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private doScan(): void {
    if (!this.manager) return;

    console.log('[BLEDiscovery] Scanning for Zelara Desktop...');
    this.scanning = true;

    this.manager.startDeviceScan(
      [ZELARA_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.warn('[BLEDiscovery] Scan error:', error.message);
          this.scanning = false;
          return;
        }

        if (!device || !device.manufacturerData) return;

        const parsed = this.parseManufacturerData(device.manufacturerData);
        if (!parsed) return;

        const { ip, port } = parsed;
        console.log(`[BLEDiscovery] Found Desktop at ${ip}:${port} (RSSI: ${device.rssi})`);

        // Stop scanning before connecting to avoid redundant callbacks
        this.stopScan();

        // Connect via WSS. BLE token is skipped (Desktop accepts BLE by proximity).
        // After disconnect, restart BLE scanning so the IP can be re-discovered.
        DeviceLinkingService.connect([ip], port, '', undefined, 'ble')
          .then(() => DeviceLinkingService.sendHandshake())
          .then(() => {
            console.log('[BLEDiscovery] Connected to Desktop via BLE');
            // Re-start BLE scan on disconnect so we can reconnect if IP changes
            DeviceLinkingService.onConnectionChange((connected) => {
              if (!connected) {
                console.log('[BLEDiscovery] Disconnected — restarting BLE scan');
                this.startScan();
              }
            });
          })
          .catch((err: any) => {
            console.warn('[BLEDiscovery] WSS connection failed:', err.message);
            // Restart scan to try again
            this.startScan();
          });
      },
    );
  }

  /**
   * Decode base64 manufacturer data and extract IP + port.
   * Returns null if the data doesn't match the Zelara format.
   *
   * Expected layout (after base64 decode):
   *   [0] [1]  Company ID low/high byte (0xFE 0xFF = 0xFFFE little-endian)
   *   [2]–[5]  IPv4 octets
   *   [6] [7]  Port high/low byte (big-endian)
   */
  private parseManufacturerData(base64Data: string): { ip: string; port: number } | null {
    try {
      const bytes = Buffer.from(base64Data, 'base64');

      // Validate minimum length and company ID
      if (bytes.length < 8) return null;
      if (bytes[0] !== ZELARA_COMPANY_ID_BYTES[0] || bytes[1] !== ZELARA_COMPANY_ID_BYTES[1]) {
        return null;
      }

      const ip = `${bytes[2]}.${bytes[3]}.${bytes[4]}.${bytes[5]}`;
      const port = (bytes[6] << 8) | bytes[7];

      // Basic sanity checks
      if (port < 1 || port > 65535) return null;
      if (ip.startsWith('0.') || ip === '0.0.0.0') return null;

      return { ip, port };
    } catch {
      return null;
    }
  }
}

export default new BLEDiscoveryService();
