import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Camera, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import DeviceLinkingService from '../services/DeviceLinkingService';

type DevicePairingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DevicePairing'
>;

interface Props {
  navigation: DevicePairingScreenNavigationProp;
}

interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
}

const LINKED_DEVICES_KEY = '@zelara_linked_devices';

const DevicePairingScreen: React.FC<Props> = ({ navigation }) => {
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState<DeviceInfo[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const { hasPermission, requestPermission } = useCameraPermission();

  // Load linked devices from AsyncStorage on mount
  useEffect(() => {
    loadLinkedDevices();
  }, []);

  const loadLinkedDevices = async () => {
    try {
      const stored = await AsyncStorage.getItem(LINKED_DEVICES_KEY);
      if (stored) {
        const devices: DeviceInfo[] = JSON.parse(stored);
        setLinkedDevices(devices);
      }
    } catch (error) {
      console.error('Failed to load linked devices:', error);
    }
  };

  const saveLinkedDevices = async (devices: DeviceInfo[]) => {
    try {
      await AsyncStorage.setItem(LINKED_DEVICES_KEY, JSON.stringify(devices));
    } catch (error) {
      console.error('Failed to save linked devices:', error);
    }
  };

  const handleQRCodeScanned = async (qrData: string) => {
    if (hasScanned) return; // Prevent multiple scans
    setHasScanned(true);

    // Parse QR code data (format: zelara://pair?ip=192.168.1.100&port=8765&token=abc123)
    try {
      // Manual parsing since React Native doesn't support URLSearchParams
      if (!qrData.startsWith('zelara://pair?')) {
        Alert.alert('Invalid QR Code', 'Please scan a valid Zelara pairing QR code', [
          { text: 'OK', onPress: () => { setHasScanned(false); } }
        ]);
        return;
      }

      // Extract query string
      const queryString = qrData.split('?')[1];
      if (!queryString) {
        Alert.alert('Invalid QR Code', 'Missing pairing information', [
          { text: 'OK', onPress: () => { setHasScanned(false); } }
        ]);
        return;
      }

      // Parse query parameters manually (URLSearchParams not available in RN)
      const params: Record<string, string> = {};
      queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });

      const ip = params.ip;
      const port = params.port;
      const token = params.token;

      if (!ip || !port || !token) {
        Alert.alert('Invalid QR Code', 'Missing pairing information (ip, port, or token)', [
          { text: 'OK', onPress: () => { setHasScanned(false); } }
        ]);
        return;
      }

      setScanning(false);
      setConnecting(true);

      try {
        // Connect to Desktop via WebSocket
        await DeviceLinkingService.connect(ip, parseInt(port, 10), token);

        const newDevice: DeviceInfo = {
          id: Date.now().toString(),
          name: `Desktop (${ip})`,
          platform: 'desktop',
        };

        const updatedDevices = [...linkedDevices, newDevice];
        setLinkedDevices(updatedDevices);
        await saveLinkedDevices(updatedDevices);

        Alert.alert(
          'Device Linked!',
          `Successfully connected to Desktop at ${ip}:${port}`,
        );
      } catch (error: any) {
        console.error('Connection error:', error);
        Alert.alert(
          'Connection Failed',
          error.message || 'Failed to connect to Desktop',
        );
      } finally {
        setConnecting(false);
        setHasScanned(false);
      }
    } catch (error) {
      console.error('QR parse error:', error);
      Alert.alert('Error', 'Failed to parse QR code', [
        { text: 'OK', onPress: () => { setHasScanned(false); } }
      ]);
      setScanning(false);
      setConnecting(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        handleQRCodeScanned(codes[0].value);
      }
    },
  });

  const scanQRCode = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to scan QR codes',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setHasScanned(false);
    setScanning(true);
  };

  if (connecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Connecting to Desktop...</Text>
      </View>
    );
  }

  if (scanning && hasPermission) {
    const devices = Camera.getAvailableCameraDevices();
    const device = devices.find(d => d.position === 'back') || devices[0];

    if (!device) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No camera available</Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setScanning(false)}>
            <Text style={styles.scanButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerTop}>
            <Text style={styles.scannerTitle}>Scan Desktop QR Code</Text>
            <Text style={styles.scannerInstructions}>
              Point your camera at the QR code on your Desktop app
            </Text>
          </View>
          <View style={styles.scannerFrame} />
          <View style={styles.scannerBottom}>
            <TouchableOpacity
              style={styles.scannerCancelButton}
              onPress={() => setScanning(false)}>
              <Text style={styles.scannerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Device Linking</Text>
        <Text style={styles.instructions}>
          Link your mobile device to your Desktop for advanced processing (CV models, complex calculations).
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Link:</Text>
          <Text style={styles.stepText}>1. Open Zelara Desktop app</Text>
          <Text style={styles.stepText}>2. Generate QR code in Device Linking section</Text>
          <Text style={styles.stepText}>3. Tap "Scan QR Code" below</Text>
          <Text style={styles.stepText}>4. Point camera at QR code</Text>
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={scanQRCode}>
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Devices ({linkedDevices.length})</Text>
          {linkedDevices.length === 0 ? (
            <Text style={styles.emptyText}>No devices linked yet</Text>
          ) : (
            linkedDevices.map((device, index) => (
              <View key={index} style={styles.deviceCard}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.devicePlatform}>{device.platform}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Benefits of Linking:</Text>
          <Text style={styles.infoText}>• Faster image validation</Text>
          <Text style={styles.infoText}>• More accurate CV models</Text>
          <Text style={styles.infoText}>• Sync your progress across devices</Text>
          <Text style={styles.infoText}>• Offload heavy processing</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
  },
  scanButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  deviceCard: {
    padding: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  devicePlatform: {
    fontSize: 14,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  // Scanner styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  scannerTop: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  scannerInstructions: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  scannerFrame: {
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerBottom: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  scannerCancelButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  scannerCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default DevicePairingScreen;
