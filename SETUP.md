# App-Mobile Setup Instructions

This file contains instructions for setting up the React Native mobile app scaffold.

## Status

**Repository initialized** - React Native scaffold pending

## Next Steps

1. **Initialize React Native app**:
   ```bash
   cd apps/mobile
   npx react-native@latest init ZelaraMobile --template react-native-template-typescript
   # Move contents up one level
   mv ZelaraMobile/* .
   rmdir ZelaraMobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Link to core packages**:
   ```bash
   npm install ../../src/packages/shared
   npm install ../../src/packages/skill-tree
   npm install ../../src/packages/state
   npm install ../../src/packages/device-linking
   ```

4. **Install additional dependencies**:
   ```bash
   npm install @react-navigation/native @react-navigation/stack
   npm install react-native-camera react-native-qrcode-scanner
   npm install @react-native-async-storage/async-storage
   ```

5. **Test development build**:
   ```bash
   # iOS
   npx react-native run-ios

   # Android
   npx react-native run-android
   ```

## Why Not Auto-Generated?

React Native CLI requires project setup. This should be run manually by developer or in next session.

## Architecture

Once scaffolded:
- **UI**: React components with TypeScript
- **Navigation**: Stack navigation for module switching
- **Camera**: QR scanning and image capture
- **Storage**: AsyncStorage adapter for local data
- **Device Linking**: Client for connecting to Desktop
