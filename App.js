import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar'; // You can keep this import, though not directly used in the navigator setup
import { StyleSheet, Text, View } from 'react-native'; // You can keep these imports too

// Import your existing screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen.tsx';

// Import the new StartGameScreen
import StartGameScreen from './screens/StartGameScreen'; // Make sure this path is correct!

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

        {/* Add the StartGameScreen here */}
        {/* We'll name it "StartGame" so you can navigate to it using navigation.navigate('StartGame') */}
        <Stack.Screen name="StartGame" component={StartGameScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}