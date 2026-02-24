# Zelara Mobile App

Mobile application for Zelara built with React Native (TypeScript).

## Quick Start

### Running the App

**Option A: VS Code Terminal (Easiest)**
```bash
cd apps/mobile
npm install
npm run android
```

**Option B: Android Studio + Metro (Recommended for native debugging)**
1. **Start Metro bundler** (in terminal):
   ```bash
   cd apps/mobile
   npm run start
   ```
2. **Run app** in Android Studio: Click ▶️ or `Shift + F10`

> **Important:** When using Android Studio, Metro does NOT start automatically. Always run `npm run start` first. See [Development Setup Guide](wikis/Development-Setup.md) for detailed instructions.

### Troubleshooting

**Error: "Unable to load script"**
- **Cause:** Metro bundler not running
- **Fix:** Run `npm run start` in separate terminal, then reload app

**More help:** See [Development Setup Guide](wikis/Development-Setup.md) for:
- VS Code debugging setup
- Android Studio workflow explained
- Common errors and solutions
- Build configuration details

## Overview

The mobile app is the primary user interface for daily tasks:
- **Camera Integration**: Capture recycling photos, scan QR codes
- **Device Pairing**: Connect to Desktop for CV processing
- **Task Management**: Complete recycling tasks, track progress
- **Module Access**: Access unlocked modules (finance, productivity, etc.)

## Tech Stack

- **Framework**: React Native 0.76.6 + TypeScript
- **Architecture**: New Architecture enabled ([Fabric](https://reactnative.dev/docs/the-new-architecture/landing-page) + TurboModules)
- **JS Engine**: Hermes
- **Navigation**: React Navigation (Native Stack)
- **State**: React Context + @zelara packages
- **Storage**: AsyncStorage (local-first)
- **Shared Logic**: @zelara packages from core

## Documentation

- [Development Setup Guide](wikis/Development-Setup.md) - Complete debugging and workflow guide
- [Android Studio Build Setup](wikis/Android-Studio-Build-Setup.md) - Build configuration, automated Metro, troubleshooting
- [Permissions Setup](PERMISSIONS_SETUP.md) - Camera and storage permissions
- [Technical Wiki](wikis/) - Architecture and planning docs