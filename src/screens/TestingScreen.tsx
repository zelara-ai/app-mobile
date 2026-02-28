import React, { useState, useRef } from 'react';
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
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import DeviceLinkingService from '../services/DeviceLinkingService';

const TestingScreen: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ original: string; inverted: string } | null>(null);
  const [isConnected, setIsConnected] = useState(DeviceLinkingService.isConnected());
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const takePhoto = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos');
        return;
      }
    }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (!camera.current) return;
    try {
      const photo = await camera.current.takePhoto({ flash: 'off' });
      setImageUri(`file://${photo.path}`);
      setShowCamera(false);
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const testImageInversion = async () => {
    if (!DeviceLinkingService.isConnected()) {
      Alert.alert('Not Connected', 'Please link a Desktop device first in the Device Pairing screen');
      return;
    }

    if (!imageUri) {
      Alert.alert('No Photo', 'Please take a photo first');
      return;
    }

    setTesting(true);
    try {
      const base64Image = await RNFS.readFile(imageUri.replace('file://', ''), 'base64');
      const result = await DeviceLinkingService.sendImageInversionTest(base64Image);

      setTestResult({
        original: base64Image,
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

  // Full-screen camera view
  if (showCamera) {
    if (!device) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>No camera device found</Text>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setShowCamera(false)}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={showCamera}
          photo={true}
        />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
            Take a photo, send it to Desktop, and see the color-inverted result on both devices
          </Text>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          )}

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { marginBottom: 8 }]}
            onPress={takePhoto}>
            <Text style={styles.buttonText}>
              {imageUri ? 'Retake Photo' : 'Take Photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testImageInversion}
            disabled={testing || !isConnected || !imageUri}>
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {!isConnected
                  ? 'Connect Desktop First'
                  : !imageUri
                  ? 'Take a Photo First'
                  : 'Run Image Inversion Test'}
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
                      source={{ uri: `data:image/jpeg;base64,${testResult.original}` }}
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
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 24,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#e0e0e0',
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#9b59b6',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    width: 140,
    height: 140,
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
