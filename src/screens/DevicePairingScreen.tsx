import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
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

const DevicePairingScreen: React.FC<Props> = ({ navigation }) => {
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState<DeviceInfo[]>([]);

  const scanQRCode = () => {
    setScanning(true);
  };

  const onQRCodeRead = async (e: any) => {
    if (!e || !e.data) return;

    // Parse QR code data (format: zelara://pair?ip=192.168.1.100&port=8765&token=abc123)
    try {
      const url = new URL(e.data);

      if (url.protocol !== 'zelara:' || url.hostname !== 'pair') {
        Alert.alert('Invalid QR Code', 'Please scan a valid Zelara pairing QR code');
        setScanning(false);
        return;
      }

      const ip = url.searchParams.get('ip');
      const port = url.searchParams.get('port');
      const token = url.searchParams.get('token');

      if (!ip || !port || !token) {
        Alert.alert('Invalid QR Code', 'Missing pairing information');
        setScanning(false);
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

        setLinkedDevices([...linkedDevices, newDevice]);

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
      }
    } catch (error) {
      console.error('QR parse error:', error);
      Alert.alert('Error', 'Failed to parse QR code');
      setScanning(false);
      setConnecting(false);
    }
  };

  if (connecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Connecting to Desktop...</Text>
      </View>
    );
  }

  if (scanning) {
    return (
      <View style={styles.scannerContainer}>
        <QRCodeScanner
          onRead={onQRCodeRead}
          flashMode={RNCamera.Constants.FlashMode.auto}
          topContent={
            <View style={styles.scannerTop}>
              <Text style={styles.scannerTitle}>Scan Desktop QR Code</Text>
              <Text style={styles.scannerInstructions}>
                Point your camera at the QR code on your Desktop app
              </Text>
            </View>
          }
          bottomContent={
            <TouchableOpacity
              style={styles.scannerCancelButton}
              onPress={() => setScanning(false)}>
              <Text style={styles.scannerCancelText}>Cancel</Text>
            </TouchableOpacity>
          }
        />
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
  },
  scannerTop: {
    padding: 20,
    backgroundColor: '#fff',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  scannerInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scannerCancelButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    margin: 20,
    borderRadius: 8,
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
