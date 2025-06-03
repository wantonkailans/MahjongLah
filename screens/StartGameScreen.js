import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native'; // Import Alert for popups
import { useNavigation } from '@react-navigation/native';

export default function StartGameScreen() {
  const navigation = useNavigation();

  // for each username input
  const [username1, setUsername1] = useState('');
  const [username2, setUsername2] = useState('');
  const [username3, setUsername3] = useState('');
  const [username4, setUsername4] = useState(''); // 4 players

  const handleStartGamePress = () => {
    //check if all usernames are entered
    if (!username1 || !username2 || !username3 || !username4) {
      Alert.alert('Missing Input', 'Please enter a username for all players.');
      return;
    }

    const players = [username1, username2, username3, username4];
    console.log('Starting game with players:', players);

    // Navigate to the actual game play screen, passing player names
    navigation.navigate('GamePlayScreen', { players: players });
    // Make sure 'GamePlayScreen' is registered in your Stack.Navigator in App.js/App.tsx
  };

  return (
    <View style={styles.container}>
      {/* Header section (similar to your HomeScreen) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 28, color: 'white' }}>☰</Text> {/* Or a back arrow icon */}
        </TouchableOpacity>
        <Image
          source={require('../assets/images/mahjonglah!.png')} // Adjust path if logo is in a different folder
          style={styles.headerLogo}
          resizeMode="contain"
        />
        {/* User profile icon */}
        <Image
          source={require('../assets/images/boy1.png')} // Assuming you have a profile icon
          style={styles.profileIcon}
          resizeMode="contain"
        />
      </View>

      {/* Input fields for usernames */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Username"
          placeholderTextColor="#999"
          value={username1}
          onChangeText={setUsername1}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter Username"
          placeholderTextColor="#999"
          value={username2}
          onChangeText={setUsername2}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter Username"
          placeholderTextColor="#999"
          value={username3}
          onChangeText={setUsername3}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter Username"
          placeholderTextColor="#999"
          value={username4}
          onChangeText={setUsername4}
        />
      </View>

      {/* Start Game Button */}
      <TouchableOpacity style={styles.startButton} onPress={handleStartGamePress}>
        <Text style={styles.startButtonText}>Start Game!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#357C3C', // Your app's green background color
    alignItems: 'center', // Center content horizontally
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Adjust for status bar
    paddingBottom: 20,
    backgroundColor: '#357C3C', // Same as container or slightly different
  },
  headerIcon: {
    // Styles for your menu/back button icon
  },
  headerLogo: {
    width: 100, // Adjust size
    height: 100, // Adjust size
    // You might need a transparent logo here as well
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20, // To make it circular
    backgroundColor: 'white', // Example background if icon is a placeholder
  },
  inputContainer: {
    width: '85%', // Adjust width as needed
    marginTop: 40,
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20, // Space between inputs
    // Add shadow for depth like in your screenshot
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#FFD700', // Gold/Yellow color from your screenshot
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginTop: 20,
    width: '85%', // Match input width
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});