import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type RecyclingTaskScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RecyclingTask'
>;

interface Props {
  navigation: RecyclingTaskScreenNavigationProp;
}

const RecyclingTaskScreen: React.FC<Props> = ({ navigation }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
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
      const photo = await camera.current.takePhoto({
        flash: 'off',
      });

      setImageUri(`file://${photo.path}`);
      setShowCamera(false);
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const validateImage = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please take a photo first');
      return;
    }

    setValidating(true);
    try {
      // Convert image to base64
      const base64Image = await RNFS.readFile(imageUri.replace('file://', ''), 'base64');

      // TODO: Send to linked Desktop for validation
      // For now, simulate validation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock success result
      Alert.alert(
        'Validation Success!',
        'Paper bag with recyclable items detected. You earned 10 points!',
        [
          {
            text: 'OK',
            onPress: () => {
              // TODO: Award points via ProgressStorage
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert('Error', 'Failed to validate image');
    } finally {
      setValidating(false);
    }
  };

  if (showCamera) {
    if (!device) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>No camera device found</Text>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => setShowCamera(false)}>
            <Text style={styles.photoButtonText}>Cancel</Text>
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
          <TouchableOpacity
            style={styles.captureButton}
            onPress={capturePhoto}>
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
        <Text style={styles.title}>Recycling Task</Text>
        <Text style={styles.instructions}>
          Take a photo of your paper bag with recyclable items.
        </Text>

        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>No photo taken</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>
            {imageUri ? 'Retake Photo' : 'Take Photo'}
          </Text>
        </TouchableOpacity>

        {imageUri && (
          <TouchableOpacity
            style={[styles.validateButton, validating && styles.buttonDisabled]}
            onPress={validateImage}
            disabled={validating}>
            {validating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.validateButtonText}>Validate & Earn Points</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Requirements:</Text>
          <Text style={styles.infoText}>• Use a paper bag (not plastic)</Text>
          <Text style={styles.infoText}>• Contains paper/cardboard items</Text>
          <Text style={styles.infoText}>• Clear, well-lit photo</Text>
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
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  photoButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  validateButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 100,
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
    backgroundColor: '#3498db',
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
});

export default RecyclingTaskScreen;
