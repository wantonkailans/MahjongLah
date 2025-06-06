import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Import your existing screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen.tsx'; // Assuming this is correct path

// Import the StartGameScreen (where you key in usernames)
import StartGameScreen from './screens/StartGameScreen';

// Import the new DiceRollGameScreen
import DiceRollGameScreen from './screens/DiceRollGameScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      {/* You can manage the status bar color here if needed */}
      <StatusBar style="light" backgroundColor="#0A360A" /> 
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

        {/* StartGameScreen: User inputs player names here */}
        <Stack.Screen name="StartGame" component={StartGameScreen} options={{ headerShown: false }} />

        {/* DiceRollGame: The new screen for dice rolling and banker announcement */}
        <Stack.Screen name="DiceRollGame" component={DiceRollGameScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}