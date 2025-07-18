import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Import your existing screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen.tsx';
import ProfileScreen from './screens/ProfileScreen';
import ChipCountingScreen from './screens/ChipCountingScreen';

// Import the StartGameScreen (where you key in usernames)
import StartGameScreen from './screens/StartGameScreen.js';

// Import the NEW DetermineBankerScreen
import DetermineBankerScreen from './screens/DetermineBankerScreen.js';

import DiceRollGameScreen from './screens/DiceRollGameScreen.js';
import MahjongAnalyzerScreen from './screens/MahjongAnalyzerScreen';
import SearchScreen from './screens/SearchScreen.js';
import LeaderboardScreen from './screens/LeaderboardScreen.js';

// Import the NEW MessagingScreen
import MessagingScreen from './screens/MessagingScreen.js';

// Import the NEW ChatScreen
import ChatScreen from './screens/ChatScreen.js';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      {/* You can manage the status bar color here if needed */}
      <StatusBar style="light" backgroundColor="#0A360A" />
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="StartGame" component={StartGameScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DetermineBanker" component={DetermineBankerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DiceRollGame" component={DiceRollGameScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChipCounting" component={ChipCountingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MahjongAnalyzer" component={MahjongAnalyzerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Messaging" component={MessagingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}