import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure you have this installed

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// --- IMPORTANT: Replace with your actual Firebase project credentials ---
// You can find this information in your Firebase project settings (Project settings -> General -> Your apps -> Firebase SDK snippet -> Config)
const __app_id = 'your-app-id'; // e.g., 'mahjong-lah-12345'
const __firebase_config = JSON.stringify({
  apiKey: "AIzaSyDabtH7TdXn5VZEw78YhWG3a9jwzpI5-Q8",
  authDomain: "mahjonglah-3578b.firebaseapp.com",
  projectId: "mahjonglah-3578b",
  storageBucket: "mahjonglah-3578b.appspot.com",
  messagingSenderId: "1088969242730",
  appId: "1:1088969242730:web:55063706d641b8ed27b213",
  measurementId: "G-333ECQVTLM"
});
const __initial_auth_token = null; // Leave null unless you have a specific custom token for initial auth
// --- End Firebase Config ---

export default function StartGameScreen() {
    const navigation = useNavigation();

    // Firebase state management
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState('anonymous');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [firebaseError, setFirebaseError] = useState(null);

    // Firestore collection path for public game sessions
    const publicGameCollectionPath = `/artifacts/${__app_id}/public/data/gameSessions`;

    // Firebase Initialization Effect
    useEffect(() => {
        const firebaseConfig = JSON.parse(__firebase_config);

        // Check if Firebase config is actually provided and not just placeholders
        if (Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
            try {
                const firebaseApp = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(firebaseApp);
                const firebaseAuth = getAuth(firebaseApp);
                setApp(firebaseApp);
                setDb(firestoreDb);
                setAuth(firebaseAuth);

                const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        try {
                            if (__initial_auth_token) {
                                await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                            } else {
                                await signInAnonymously(firebaseAuth);
                            }
                            // Ensure userId is set, fallback to random if auth.currentUser is null (e.g., if signInAnonymously fails silently)
                            setUserId(firebaseAuth.currentUser?.uid || `anon-${Math.random().toString(36).substring(2, 15)}`);
                        } catch (error) {
                            console.error("StartGameScreen: Firebase authentication error during sign-in:", error);
                            setFirebaseError("Failed to authenticate. Check network and Firebase config.");
                            setUserId(`anon-${Math.random().toString(36).substring(2, 15)}`); // Fallback random ID
                        }
                    }
                    setIsAuthReady(true); // Firebase auth process is considered "ready" after this initial check
                });

                return () => unsubscribe(); // Clean up auth listener on unmount
            } catch (e) {
                console.error("StartGameScreen: Firebase initialization error:", e);
                setFirebaseError("Failed to initialize Firebase. Check your project configuration.");
                setIsAuthReady(true); // Still set ready to allow UI to render even with error
            }
        } else {
            console.warn("StartGameScreen: Firebase config is missing or has placeholders. Running without cloud persistence.");
            setFirebaseError("Firebase config is missing/incorrect. Game data will NOT be saved to the cloud.");
            setIsAuthReady(true);
            setUserId(`anon-${Math.random().toString(36).substring(2, 15)}`); // Generate random ID if no Firebase
        }
    }, []);

    // State for individual username inputs
    const [username1, setUsername1] = useState('');
    const [username2, setUsername2] = useState('');
    const [username3, setUsername3] = useState('');
    const [username4, setUsername4] = useState('');

    const handleStartGamePress = async () => {
        // 1. Validate usernames
        if (!username1.trim() || !username2.trim() || !username3.trim() || !username4.trim()) {
            Alert.alert(
                'Missing Input',
                'Please enter a username for all players to start the game.'
            );
            return; // Stop execution if validation fails
        }

        // 2. Prepare player data in the required format for the DiceRollGameScreen
        const initialPlayers = [
            { id: `player1-${Math.random().toString(36).substring(2, 15)}`, name: username1.trim(), roll: null, hasRolled: false },
            { id: `player2-${Math.random().toString(36).substring(2, 15)}`, name: username2.trim(), roll: null, hasRolled: false },
            { id: `player3-${Math.random().toString(36).substring(2, 15)}`, name: username3.trim(), roll: null, hasRolled: false },
            { id: `player4-${Math.random().toString(36).substring(2, 15)}`, name: username4.trim(), roll: null, hasRolled: false },
        ];

        // 3. Store the original player order locally using AsyncStorage
        try {
            await AsyncStorage.setItem('originalPlayerOrder', JSON.stringify(initialPlayers.map(p => ({ id: p.id, name: p.name }))));
        } catch (e) {
            console.error("StartGameScreen: Error saving original player order to AsyncStorage:", e);
        }

        // 4. Generate a unique game session ID
        const newGameSessionId = `game-${Date.now()}`;

        // 5. Attempt to save the initial game state to Firebase Firestore
        // This will only run if Firebase is successfully initialized. Errors will be alerted but navigation will proceed.
        if (isAuthReady && db) {
            const gameDocRef = doc(db, publicGameCollectionPath, newGameSessionId);
            try {
                await setDoc(gameDocRef, {
                    gameId: newGameSessionId,
                    status: 'dice_rolling',
                    players: initialPlayers.map(p => ({ // Only store necessary data to Firestore
                        id: p.id,
                        name: p.name,
                        roll: p.roll,
                        hasRolled: p.hasRolled
                    })),
                    createdAt: new Date().toISOString(),
                    createdBy: userId
                });
            } catch (error) {
                console.error("StartGameScreen: Error initializing game session in Firestore:", error);
                Alert.alert(
                    "Firestore Error",
                    "Failed to save game data to the cloud. Please check your network connection and Firebase rules. Game will proceed locally.",
                    [{ text: 'OK' }]
                );
            }
        } else {
            // This alert shows if Firebase was never ready (e.g., config error)
            Alert.alert(
                "Firebase Not Ready",
                "Game data will not be saved to the cloud. Please ensure Firebase config is correct. Proceeding for local testing.",
                [{ text: 'OK' }]
            );
        }

        // 6. Navigate to the DiceRollGame screen, passing necessary data
        // This navigation will always occur if username validation passes,
        // allowing the game to start even if cloud persistence has issues.
        navigation.navigate('DiceRollGame', { initialPlayers: initialPlayers, gameSessionId: newGameSessionId });
    };

    // Show loading indicator while Firebase is initializing
    if (!isAuthReady) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Initializing Game Services...</Text>
                {firebaseError && <Text style={styles.errorText}>{firebaseError}</Text>}
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Header section */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
                    <Text style={{ fontSize: 28, color: 'white' }}>☰</Text>
                </TouchableOpacity>
                <Image
                    source={require('../assets/images/mahjonglah!.png')} // Adjust path if logo is in a different folder
                    style={styles.headerLogo}
                    resizeMode="contain"
                />
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
                    placeholder="Enter Username for Player 1"
                    placeholderTextColor="#E0F2E0" // Light green for dark theme
                    value={username1}
                    onChangeText={setUsername1}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Enter Username for Player 2"
                    placeholderTextColor="#E0F2E0" // Light green for dark theme
                    value={username2}
                    onChangeText={setUsername2}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Enter Username for Player 3"
                    placeholderTextColor="#E0F2E0" // Light green for dark theme
                    value={username3}
                    onChangeText={setUsername3}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Enter Username for Player 4"
                    placeholderTextColor="#E0F2E0" // Light green for dark theme
                    value={username4}
                    onChangeText={setUsername4}
                />
            </View>

            {/* Start Game Button */}
            <TouchableOpacity style={styles.startButton} onPress={handleStartGamePress}>
                <Text style={styles.startButtonText}>Start Game!</Text>
            </TouchableOpacity>
            {/* Display Firebase errors/warnings below the button if any */}
            {firebaseError && <Text style={styles.errorText}>{firebaseError}</Text>}
        </ScrollView>
    );
}

// --- StyleSheet for React Native Components (Dark Green Theme) ---
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#0A360A', // Dark Green
        alignItems: 'center',
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A360A', // Dark Green
    },
    loadingText: {
        color: '#E0F2E0', // Light Green
        marginTop: 10,
        fontSize: 16,
    },
    errorText: {
        color: '#F8D7DA', // Light Red for errors
        marginTop: 10,
        fontSize: 14,
        textAlign: 'center',
        marginHorizontal: 20,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50, // Adjust for status bar
        paddingBottom: 20,
        backgroundColor: '#0A360A', // Dark Green
    },
    headerIcon: {
        // Styles for your menu/back button icon
    },
    headerLogo: {
        width: 100,
        height: 100,
    },
    profileIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0F2E0', // Light Green for profile icon background
    },
    inputContainer: {
        width: '85%',
        marginTop: 40,
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#1A4314', // Darker Green background for inputs
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#E0F2E0', // Light Green text for inputs
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    startButton: {
        backgroundColor: '#FFD700', // Gold/Yellow color
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 40,
        marginTop: 20,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 5,
    },
    startButtonText: {
        color: '#1A4314', // Dark green text for the button
        fontSize: 18,
        fontWeight: 'bold',
    },
});
