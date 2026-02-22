import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import RecyclingTaskScreen from './src/screens/RecyclingTaskScreen';
import DevicePairingScreen from './src/screens/DevicePairingScreen';
import FinanceScreen from './src/screens/FinanceScreen';

export type RootStackParamList = {
  Home: undefined;
  RecyclingTask: undefined;
  DevicePairing: undefined;
  Finance: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
