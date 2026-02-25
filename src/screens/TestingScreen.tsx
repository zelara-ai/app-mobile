import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import DeviceLinkingService from '../services/DeviceLinkingService';

const TestingScreen: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ original: string; inverted: string } | null>(null);
  const [isConnected, setIsConnected] = useState(DeviceLinkingService.isConnected());

  const testImageInversion = async () => {
    if (!DeviceLinkingService.isConnected()) {
      Alert.alert('Not Connected', 'Please link a Desktop device first in the Device Pairing screen');
      return;
    }

    setTesting(true);
    try {
      // Use a simple test image (1x1 red pixel)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

      const result = await DeviceLinkingService.sendImageInversionTest(testImageBase64);

      setTestResult({
        original: testImageBase64,
        inverted: result.invertedImage,
      });

      Alert.alert('Success', result.message || 'Image inverted successfully!');
    } catch (error: any) {
      console.error('Image inversion test failed:', error);
      Alert.alert('Test Failed', error.message || 'Failed to invert image');
    } finally {
      setTesting(false);
    }
  };

  const checkConnection = () => {
    const connected = DeviceLinkingService.isConnected();
    setIsConnected(connected);
    Alert.alert(
      'Connection Status',
      connected ? 'Connected to Desktop' : 'Not connected to Desktop'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Testing Module</Text>
        <Text style={styles.subtitle}>
          Diagnostic tools for device communication and image processing
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected to Desktop' : 'Not connected'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={checkConnection}>
            <Text style={styles.buttonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Image Processing Test</Text>
          <Text style={styles.description}>
            Send a test image to Desktop, invert it, and receive the result back
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testImageInversion}
            disabled={testing || !isConnected}>
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isConnected ? 'Run Image Inversion Test' : 'Connect Desktop First'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {testResult && (
          <Modal
            visible={!!testResult}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setTestResult(null)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Image Inversion Test Result</Text>

                <View style={styles.imageComparisonContainer}>
                  <View style={styles.imageSection}>
                    <Text style={styles.imageLabel}>Original</Text>
                    <Image
                      source={{ uri: `data:image/png;base64,${testResult.original}` }}
                      style={styles.testImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.imageSection}>
                    <Text style={styles.imageLabel}>Inverted</Text>
                    <Image
                      source={{ uri: `data:image/png;base64,${testResult.inverted}` }}
                      style={styles.testImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setTestResult(null)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>About Testing Module</Text>
          <Text style={styles.infoText}>
            This module provides diagnostic tools for validating device-to-device
            communication and image processing pipelines.
          </Text>
          <Text style={styles.infoText}>
            {'\n'}Use these tests during development to ensure features work correctly
            across mobile and desktop platforms.
          </Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#27ae60',
  },
  disconnected: {
    backgroundColor: '#e74c3c',
  },
  statusText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#9b59b6',
  },
  secondaryButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    lineHeight: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageComparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  imageSection: {
    alignItems: 'center',
    flex: 1,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  testImage: {
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  modalCloseButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TestingScreen;
