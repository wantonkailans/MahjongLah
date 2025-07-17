import React, { useState, useEffect } from 'react';
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
// --- Crucial Firebase Imports ---
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const StartGameScreen = () => {
  const navigation = useNavigation();

  // State for current authenticated user and their profile image
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Existing states for game setup
  const [player1Username, setPlayer1Username] = useState('');
  const [player2Username, setPlayer2Username] = useState('');
  const [player3Username, setPlayer3Username] = useState('');
  const [player4Username, setPlayer4Username] = useState('');
  const [loading, setLoading] = useState(false);

  // Existing states for username validation
  const [validationResults, setValidationResults] = useState({});
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [missingUsernames, setMissingUsernames] = useState([]);
  const [foundUsernames, setFoundUsernames] = useState([]);

  // useEffect hook to handle Firebase authentication state and fetch profile
  useEffect(() => {
    console.log('StartGameScreen: useEffect triggered for auth state change observer setup.');
    setIsProfileLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('StartGameScreen: onAuthStateChanged callback received. User:', currentUser ? currentUser.uid : 'null (signed out)');
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('StartGameScreen: User document found. Profile data:', userData);
            setProfileImage(userData.profileImage || null);
          } else {
            console.log('StartGameScreen: No user document found for UID:', currentUser.uid);
            setProfileImage(null);
          }
        } catch (error) {
          console.error('StartGameScreen: Error fetching user profile image from Firestore:', error);
          setProfileImage(null);
        } finally {
          setIsProfileLoading(false);
          console.log('StartGameScreen: Profile loading finished.');
        }
      } else {
        console.log('StartGameScreen: User signed out. Clearing user and profile image states.');
        setUser(null);
        setProfileImage(null);
        setIsProfileLoading(false);
      }
    });

    return () => {
      console.log('StartGameScreen: Unsubscribing from Firebase auth state changes.');
      unsubscribe();
    };
  }, []);

  // Function to check if a username exists in Firebase
  const checkUsernameExists = async (username) => {
    try {
      console.log(`Checking username in Firebase: ${username}`);
      
      // Query the users collection for documents where username field matches
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // User found - get the first matching document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        console.log(`✅ Username "${username}" found with data:`, userData);
        return {
          found: true,
          userData: userData,
          userId: userDoc.id
        };
      } else {
        console.log(`❌ Username "${username}" NOT found in Firebase`);
        return {
          found: false,
          userData: null,
          userId: null
        };
      }
    } catch (error) {
      console.error(`Error checking username "${username}":`, error);
      throw error;
    }
  };

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
      console.log('Starting username validation with Firebase...');

      const foundPlayers = [];
      const missingUsernamesList = [];
      const foundUsernamesList = [];
      const results = {};

      // Check each username against Firebase
      for (const username of enteredUsernames) {
        console.log(`Checking username: ${username}`);

        try {
          const result = await checkUsernameExists(username);
          
          if (result.found) {
            console.log(`✅ Username "${username}" found`);
            foundUsernamesList.push(username);
            results[username] = { found: true, status: 'found' };
            foundPlayers.push({
              id: result.userId,
              name: username,
              userData: result.userData,
              chips: 1000, // Default chips for game
              originalIndex: enteredUsernames.indexOf(username)
            });
          } else {
            console.log(`❌ Username "${username}" NOT found`);
            missingUsernamesList.push(username);
            results[username] = { found: false, status: 'not_found' };
          }
        } catch (error) {
          console.error(`Error validating username "${username}":`, error);
          // Treat as not found on error
          missingUsernamesList.push(username);
          results[username] = { found: false, status: 'error' };
        }
      }

      setValidationResults(results);
      setMissingUsernames(missingUsernamesList);
      setFoundUsernames(foundUsernamesList);
      setShowValidationResults(true);

      console.log('Found players (formatted):', foundPlayers);
      console.log('Missing usernames:', missingUsernamesList);

      if (missingUsernamesList.length > 0) {
        console.log('Some usernames not found - showing validation results');
        setLoading(false);
        return;
      }

      console.log('✅ All usernames validated. Navigating to DetermineBankerScreen...');

      // Navigate to DetermineBanker screen with the validated players
      navigation.navigate('DetermineBanker', {
        players: foundPlayers,
      });

    } catch (error) {
      console.error("❌ Error validating usernames:", error);
      Alert.alert('Error', `Failed to validate usernames. Please try again.\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  console.log('StartGameScreen: Component rendering.');

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
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Profile')}>
          {isProfileLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <Image
              source={require('../assets/images/boy1.png')}
              style={styles.profileImage}
            />
          )}
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

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
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
    borderWidth: 1,
    borderColor: '#fff',
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