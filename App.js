import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import HOSEScreen from './screens/HOSEScreen';
import BlankScreen from './screens/BlankScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Drawer.Navigator
          initialRouteName="HOSE"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            drawerStyle: {
              backgroundColor: '#f8f9fa',
              width: 280,
            },
            drawerActiveTintColor: '#007AFF',
            drawerInactiveTintColor: '#666',
            drawerLabelStyle: {
              fontSize: 16,
              fontWeight: '600',
            },
          }}
        >
          <Drawer.Screen 
            name="HOSE" 
            component={HOSEScreen}
            options={{
              title: 'HOSE Stock Comparison',
              drawerLabel: '🏢 HOSE (Working)',
              headerTitle: 'HOSE Stock Exchange',
            }}
          />
          <Drawer.Screen 
            name="HNX" 
            component={BlankScreen}
            options={{
              title: 'HNX Stock Comparison',
              drawerLabel: '🏛️ HNX (Development)',
              headerTitle: 'HNX Stock Exchange',
              headerStyle: {
                backgroundColor: '#3B82F6',
              },
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
} 