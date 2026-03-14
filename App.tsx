import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import RecyclingTaskScreen from './src/screens/RecyclingTaskScreen';
import DevicePairingScreen from './src/screens/DevicePairingScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import TestingScreen from './src/screens/TestingScreen';
import BLEDiscoveryService from './src/services/BLEDiscoveryService';

export type RootStackParamList = {
  Home: undefined;
  RecyclingTask: undefined;
  DevicePairing: undefined;
  Finance: undefined;
  Testing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  useEffect(() => {
    // Start BLE scanning at app launch so Desktop can be discovered automatically.
    // No-op if BLE is unavailable or permissions are denied — QR pairing still works.
    BLEDiscoveryService.startScan();

    return () => {
      BLEDiscoveryService.destroy();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2c3e50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Zelara' }}
        />
        <Stack.Screen
          name="RecyclingTask"
          component={RecyclingTaskScreen}
          options={{ title: 'Recycling Task' }}
        />
        <Stack.Screen
          name="DevicePairing"
          component={DevicePairingScreen}
          options={{ title: 'Device Pairing' }}
        />
        <Stack.Screen
          name="Finance"
          component={FinanceScreen}
          options={{ title: 'Finance' }}
        />
        <Stack.Screen
          name="Testing"
          component={TestingScreen}
          options={{ title: 'Testing' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
