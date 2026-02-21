import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type DevicePairingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DevicePairing'
>;

interface Props {
  navigation: DevicePairingScreenNavigationProp;
}

const DevicePairingScreen: React.FC<Props> = ({ navigation }) => {
  const [scanning, setScanning] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState<any[]>([]);

  const scanQRCode = () => {
    // TODO: Implement QR scanner
    Alert.alert(
      'QR Scanner',
      'QR scanner integration pending. This will scan the QR code from your Desktop app.',
    );
  };

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
});

export default DevicePairingScreen;
