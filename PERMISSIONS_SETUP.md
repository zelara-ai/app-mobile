# Native Permissions Setup for Camera & QR Scanner

This document outlines the required permissions configuration for iOS and Android platforms.

## iOS Setup

### 1. Update Info.plist

Add the following keys to `ios/ZelaraMobile/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Zelara needs access to your camera to capture photos of recycling items for validation</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Zelara needs access to your photo library to save recycling task photos</string>
<key>NSMicrophoneUsageDescription</key>
<string>Required by camera library but not used by Zelara</string>
```

### 2. Install Pods

```bash
cd ios
pod install
cd ..
```

## Android Setup

### 1. Update AndroidManifest.xml

Add the following permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 2. Request Runtime Permissions

The libraries (`react-native-vision-camera` and `react-native-camera`) handle runtime permission requests automatically.

## Post-Installation

After configuring permissions:

1. **iOS**:
   ```bash
   npm run ios
   ```

2. **Android**:
   ```bash
   npm run android
   ```

## Testing

1. Open the app
2. Navigate to "Recycling Task"
3. Tap "Take Photo" - should prompt for camera permission
4. Navigate to "Device Pairing"
5. Tap "Scan QR Code" - should open QR scanner

## Troubleshooting

### iOS
- **Permission denied**: Check Info.plist has correct keys
- **Camera not opening**: Run `pod install` in ios/ directory
- **Build errors**: Clean build folder in Xcode

### Android
- **Permission denied**: Check AndroidManifest.xml
- **Camera not opening**: Check CAMERA permission is added
- **Build errors**: Run `./gradlew clean` in android/ directory

## Dependencies

- `react-native-vision-camera`: Photo capture
- `react-native-camera`: QR scanning
- `react-native-qrcode-scanner`: QR code scanner wrapper
- `react-native-fs`: File system access for image reading

All dependencies are already added to package.json. Run `npm install` to install them.
