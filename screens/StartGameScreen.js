import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const StartGameScreen = () => {
  const navigation = useNavigation();
  
  const [player1Username, setPlayer1Username] = useState('');
  const [player2Username, setPlayer2Username] = useState('');
  const [player3Username, setPlayer3Username] = useState('');
  const [player4Username, setPlayer4Username] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New states for validation feedback
  const [validationResults, setValidationResults] = useState({});
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [missingUsernames, setMissingUsernames] = useState([]);
  const [foundUsernames, setFoundUsernames] = useState([]);

  const handleStartGame = async () => {
    console.log('=== START GAME VALIDATION ===');
    
    // Reset previous validation results
    setValidationResults({});
    setShowValidationResults(false);
    setMissingUsernames([]);
    setFoundUsernames([]);

    const enteredUsernames = [player1Username, player2Username, player3Username, player4Username].filter(Boolean);
    console.log('Entered usernames:', enteredUsernames);
    
    if (enteredUsernames.length !== 4) {
      Alert.alert('Error', 'Please enter usernames for all 4 players.');
      return;
    }

    const uniqueEnteredUsernames = new Set(enteredUsernames.map(name => name.toLowerCase()));
    if (uniqueEnteredUsernames.size !== 4) {
      Alert.alert('Error', 'Player usernames must be unique for this game session.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Starting username validation...');
      
      // Import Firebase here to catch any import errors
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      console.log('Firebase imports successful, db:', db);
      
      const usersRef = collection(db, 'users');
      const foundPlayers = [];
      const missingUsernamesList = [];
      const foundUsernamesList = [];
      const results = {};

      // Check each username
      for (const username of enteredUsernames) {
        console.log(`Checking username: ${username}`);
        
        try {
          const q = query(usersRef, where('username', '==', username.toLowerCase()));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            console.log(`❌ Username "${username}" NOT found`);
            missingUsernamesList.push(username);
            results[username] = { found: false, status: 'not_found' };
          } else {
            console.log(`✅ Username "${username}" found`);
            foundUsernamesList.push(username);
            results[username] = { found: true, status: 'found' };
            
            querySnapshot.forEach(doc => {
              foundPlayers.push({ 
                uid: doc.id, 
                username: doc.data().username,
                displayName: doc.data().displayName || doc.data().username 
              });
            });
          }
        } catch (userError) {
          console.error(`Error checking username ${username}:`, userError);
          missingUsernamesList.push(username);
          results[username] = { found: false, status: 'error' };
        }
      }

      // Update state with validation results
      setValidationResults(results);
      setMissingUsernames(missingUsernamesList);
      setFoundUsernames(foundUsernamesList);
      setShowValidationResults(true);

      console.log('Found players:', foundPlayers);
      console.log('Missing usernames:', missingUsernamesList);

      // If some usernames don't exist, show the results but don't navigate
      if (missingUsernamesList.length > 0) {
        console.log('Some usernames not found - showing validation results');
        setLoading(false);
        return;
      }

      console.log('✅ All usernames validated. Navigating to DiceRollGame...');
      
      // All usernames exist, navigate to dice roll screen
      navigation.navigate('DiceRollGame', { players: foundPlayers });

    } catch (error) {
      console.error("❌ Error validating usernames:", error);
      Alert.alert('Error', `Failed to validate usernames. Please try again.\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Simple test to make sure the component renders
  console.log('StartGameScreen rendering...');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Image
          source={require('../assets/images/mahjonglah!.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.headerButton}>
          <Image
            source={require('../assets/images/boy1.png')}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.gameSetupCard}>
          <Text style={styles.gameSetupTitle}>Enter Player Usernames</Text>
          <Text style={styles.gameSetupSubtitle}>Please enter the usernames of all 4 players</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Player 1 Username"
            placeholderTextColor="#999"
            value={player1Username}
            onChangeText={setPlayer1Username}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Player 2 Username"
            placeholderTextColor="#999"
            value={player2Username}
            onChangeText={setPlayer2Username}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Player 3 Username"
            placeholderTextColor="#999"
            value={player3Username}
            onChangeText={setPlayer3Username}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Player 4 Username"
            placeholderTextColor="#999"
            value={player4Username}
            onChangeText={setPlayer4Username}
            autoCapitalize="none"
          />
          
          <TouchableOpacity 
            style={[styles.startButton, loading && styles.buttonDisabled]} 
            onPress={handleStartGame}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.startButtonText}>Let's Begin!</Text>
            )}
          </TouchableOpacity>

          {/* Validation Results Section */}
          {showValidationResults && (
            <View style={styles.validationContainer}>
              <Text style={styles.validationTitle}>Validation Results</Text>
              
              {foundUsernames.length > 0 && (
                <View style={styles.foundUsersSection}>
                  <Text style={styles.foundUsersTitle}>✅ Found Users:</Text>
                  {foundUsernames.map((username, index) => (
                    <View key={index} style={styles.foundUserItem}>
                      <Text style={styles.foundUserText}>{username}</Text>
                    </View>
                  ))}
                </View>
              )}

              {missingUsernames.length > 0 && (
                <View style={styles.missingUsersSection}>
                  <Text style={styles.missingUsersTitle}>❌ Users Not Found:</Text>
                  {missingUsernames.map((username, index) => (
                    <View key={index} style={styles.missingUserItem}>
                      <Text style={styles.missingUserText}>{username}</Text>
                    </View>
                  ))}
                  
                  <View style={styles.instructionBox}>
                    <Text style={styles.instructionTitle}>What to do next:</Text>
                    <Text style={styles.instructionText}>
                      The users listed above need to create accounts first before they can play.
                    </Text>
                    <Text style={styles.instructionText}>
                      Please ask them to sign up using the app, then try starting the game again.
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.tryAgainButton}
                    onPress={() => {
                      setShowValidationResults(false);
                      setValidationResults({});
                      setMissingUsernames([]);
                      setFoundUsernames([]);
                    }}
                  >
                    <Text style={styles.tryAgainButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>🏠</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('Search pressed')}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>🔍</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('Profile pressed')}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navTextIcon}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#004d00',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
  },
  headerButton: {
    padding: 5,
  },
  headerIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  scrollViewContent: {
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  gameSetupCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 25,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gameSetupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  gameSetupSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  startButton: {
    width: '100%',
    backgroundColor: '#F8B100',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  navIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextIcon: {
    fontSize: 24,
    color: '#666',
  },
  // Validation Results Styles
  validationContainer: {
    width: '100%',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  validationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004d00',
    marginBottom: 15,
    textAlign: 'center',
  },
  foundUsersSection: {
    marginBottom: 15,
  },
  foundUsersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 10,
  },
  foundUserItem: {
    backgroundColor: '#d4edda',
    padding: 8,
    borderRadius: 6,
    marginBottom: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  foundUserText: {
    color: '#155724',
    fontWeight: '500',
  },
  missingUsersSection: {
    marginTop: 10,
  },
  missingUsersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  missingUserItem: {
    backgroundColor: '#f8d7da',
    padding: 8,
    borderRadius: 6,
    marginBottom: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  missingUserText: {
    color: '#721c24',
    fontWeight: '500',
  },
  instructionBox: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#F8B100',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 5,
  },
  tryAgainButton: {
    backgroundColor: '#004d00',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StartGameScreen;