import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Image,
    Alert // React Native Alert for simple, non-blocking messages
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Make sure you have this installed

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

// --- IMPORTANT: Replace with your actual Firebase project credentials ---
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

export default function DiceRollGameScreen({ route, navigation }) {
    // Extract initial game data passed via navigation params
    const { initialPlayers, gameSessionId: initialGameSessionId } = route.params;

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
                            setUserId(firebaseAuth.currentUser?.uid || `anon-${Math.random().toString(36).substring(2, 15)}`);
                        } catch (error) {
                            console.error("DiceRollGameScreen: Firebase authentication error:", error);
                            setFirebaseError("Failed to authenticate. Check network and Firebase config.");
                            setUserId(`anon-${Math.random().toString(36).substring(2, 15)}`);
                        }
                    }
                    setIsAuthReady(true);
                });

                return () => unsubscribe();
            } catch (e) {
                console.error("DiceRollGameScreen: Firebase initialization error:", e);
                setFirebaseError("Failed to initialize Firebase. Check config.");
                setIsAuthReady(true);
            }
        } else {
            console.warn("DiceRollGameScreen: Firebase config is missing or has placeholders. Running without cloud persistence.");
            setFirebaseError("Firebase config is missing/incorrect. Real-time updates will NOT work.");
            setIsAuthReady(true);
            setUserId(`anon-${Math.random().toString(36).substring(2, 15)}`);
        }
    }, []);

    // Game logic states
    const [players, setPlayers] = useState(initialPlayers || []);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [gameSessionId, setGameSessionId] = useState(initialGameSessionId);

    // Modal state for banker announcement
    const [isBankerModalVisible, setIsBankerModalVisible] = useState(false);
    const [bankerInfo, setBankerInfo] = useState(null);
    const [distributorInfo, setDistributorInfo] = useState(null);

    // State to hold the current player's dice roll for local display (not persisted until roll button is pressed)
    const [currentRollsDisplay, setCurrentRollsDisplay] = useState({});

    // Set initial message when component mounts with player data
    useEffect(() => {
        if (players.length > 0) {
            setMessage(`It's ${players[0].name}'s turn to roll!`);
        }
        // Initialize currentRollsDisplay for all players to '?'
        const initialRolls = {};
        players.forEach(player => {
            initialRolls[player.id] = player.roll !== null ? player.roll : '?';
        });
        setCurrentRollsDisplay(initialRolls);
    }, [players]);

    // Utility functions for messages
    const showMessage = useCallback((msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
    }, []);

    const hideMessageBox = useCallback(() => {
        setMessage('');
    }, []);

    // Dice rolling function
    const rollDice = () => Math.floor(Math.random() * 6) + 1;

    // Function to update Firebase with player's roll
    const updatePlayerRollInFirestore = async (playerId, rollValue) => {
        if (!isAuthReady || !db || !gameSessionId) {
            console.warn("DiceRollGameScreen: Firestore not ready or game session not set. Cannot update player roll.");
            showMessage("Game not ready for updates. Please check Firebase config.", "error");
            return;
        }
        const gameDocRef = doc(db, publicGameCollectionPath, gameSessionId);
        try {
            const docSnap = await getDoc(gameDocRef);
            if (docSnap.exists()) {
                const gameData = docSnap.data();
                const updatedPlayers = gameData.players.map(p => {
                    if (p.id === playerId) {
                        return { ...p, roll: rollValue, hasRolled: true };
                    }
                    return p;
                });
                await updateDoc(gameDocRef, { players: updatedPlayers });
            } else {
                console.error("DiceRollGameScreen: Game session document not found for update.");
                showMessage("Game session data missing. Cannot save roll.", "error");
            }
        } catch (error) {
            console.error("DiceRollGameScreen: Error updating player roll in Firestore:", error);
            showMessage("Failed to save roll to cloud. Please check network/rules.", "error");
        }
    };

    // Handle a player rolling the dice
    const handlePlayerRoll = useCallback(async (playerToRollId) => {
        const playerIndex = players.findIndex(p => p.id === playerToRollId);
        if (playerIndex === -1 || playerIndex !== currentPlayerIndex) {
            return; // Not the current player's turn or player not found
        }

        const newRoll = rollDice();
        // Update local display immediately
        setCurrentRollsDisplay(prev => ({ ...prev, [playerToRollId]: newRoll }));

        const updatedPlayers = players.map((p, idx) =>
            idx === playerIndex ? { ...p, roll: newRoll, hasRolled: true } : p
        );
        setPlayers(updatedPlayers); // Update local state for player data

        await updatePlayerRollInFirestore(playerToRollId, newRoll); // Update Firestore

        hideMessageBox();
        const allRolled = updatedPlayers.every(p => p.hasRolled);

        if (!allRolled) {
            let nextPlayerFound = false;
            let nextIdx = currentPlayerIndex;
            for (let i = 0; i < updatedPlayers.length; i++) {
                const checkIdx = (currentPlayerIndex + 1 + i) % updatedPlayers.length;
                if (!updatedPlayers[checkIdx].hasRolled) {
                    nextIdx = checkIdx;
                    nextPlayerFound = true;
                    break;
                }
            }
            if (nextPlayerFound) {
                 setCurrentPlayerIndex(nextIdx);
                 showMessage(`It's ${updatedPlayers[nextIdx].name}'s turn to roll!`);
            }
        }
    }, [players, currentPlayerIndex, db, isAuthReady, gameSessionId, showMessage, hideMessageBox, updatePlayerRollInFirestore]);

    // Resolve dice rolls (determine banker or ties)
    const resolveDiceRolls = useCallback(async (currentPlayersState) => {
        const sortedPlayers = [...currentPlayersState].sort((a, b) => b.roll - a.roll);

        const highestRoll = sortedPlayers[0].roll;
        const winners = sortedPlayers.filter(p => p.roll === highestRoll);

        if (winners.length === 1) {
            // Single winner (banker)
            const banker = winners[0];
            const originalPlayerOrderString = await AsyncStorage.getItem('originalPlayerOrder');
            let originalOrderPlayers = [];
            if (originalPlayerOrderString) {
                originalOrderPlayers = JSON.parse(originalPlayerOrderString);
            }

            let distributor = null;
            if (originalOrderPlayers && originalOrderPlayers.length > 0) {
                const bankerIndex = originalOrderPlayers.findIndex(p => p.id === banker.id);
                if (bankerIndex !== -1) {
                    const distributorIndex = (bankerIndex + 1) % originalOrderPlayers.length;
                    distributor = originalOrderPlayers[distributorIndex];
                }
            }
            if (!distributor) { // Fallback
                distributor = sortedPlayers[1] || sortedPlayers[0];
            }

            setBankerInfo(banker);
            setDistributorInfo(distributor);
            setIsBankerModalVisible(true);
            hideMessageBox(); // Hide any other messages

        } else {
            const tiedPlayersNames = winners.map(p => p.name).join(', ');
            showMessage(`It's a tie between ${tiedPlayersNames} with a roll of ${highestRoll}! You need to roll again.`);

            const resetTiedPlayers = winners.map(p => ({
                id: p.id,
                name: p.name,
                roll: null,
                hasRolled: false
            }));
            setPlayers(resetTiedPlayers); // Reset roles for tied players
            setCurrentPlayerIndex(0); // Start rolling from the first tied player
            // Also reset local roll displays for tied players
            const resetRollsDisplay = {};
            resetTiedPlayers.forEach(p => { resetRollsDisplay[p.id] = '?'; });
            setCurrentRollsDisplay(resetRollsDisplay);
        }
    }, [showMessage]);

    // Firebase Firestore onSnapshot Listener for real-time updates
    useEffect(() => {
        if (!isAuthReady || !db || !gameSessionId) {
            if (firebaseError === null) {
                setFirebaseError("Firebase or game session not fully ready. Real-time updates may be limited.");
            }
            return;
        }

        const gameDocRef = doc(db, publicGameCollectionPath, gameSessionId);
        const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const gameData = docSnap.data();
                if (gameData && gameData.players) {
                    const updatedPlayersFromFirestore = gameData.players;

                    // Update local state if there's a meaningful change from Firestore
                    if (JSON.stringify(players) !== JSON.stringify(updatedPlayersFromFirestore)) {
                        setPlayers(updatedPlayersFromFirestore);

                        // Also update currentRollsDisplay from Firestore data for consistency
                        const newRollsDisplay = {};
                        updatedPlayersFromFirestore.forEach(player => {
                            newRollsDisplay[player.id] = player.roll !== null ? player.roll : '?';
                        });
                        setCurrentRollsDisplay(newRollsDisplay);
                    }

                    const allRolledFromFirestore = updatedPlayersFromFirestore.every(p => p.hasRolled);

                    if (allRolledFromFirestore) {
                        resolveDiceRolls(updatedPlayersFromFirestore);
                    } else {
                        const currentLocalPlayer = players[currentPlayerIndex];
                        const currentFirestorePlayer = updatedPlayersFromFirestore.find(p => p.id === currentLocalPlayer?.id);

                        if (currentFirestorePlayer?.hasRolled && !currentLocalPlayer?.hasRolled) {
                             let nextPlayerFound = false;
                             let nextIdx = currentPlayerIndex;
                             for (let i = 0; i < updatedPlayersFromFirestore.length; i++) {
                                 const checkIdx = (currentPlayerIndex + i) % updatedPlayersFromFirestore.length;
                                 if (!updatedPlayersFromFirestore[checkIdx].hasRolled) {
                                     nextIdx = checkIdx;
                                     nextPlayerFound = true;
                                     break;
                                 }
                             }
                             if (nextPlayerFound) {
                                 setCurrentPlayerIndex(nextIdx);
                                 showMessage(`It's ${updatedPlayersFromFirestore[nextIdx].name}'s turn to roll!`);
                             }
                        }
                    }
                }
            } else {
                console.warn("DiceRollGameScreen: Game session document does not exist in Firestore.");
                setFirebaseError("Game session not found. Real-time updates failed.");
            }
        }, (error) => {
            console.error("DiceRollGameScreen: Error listening to game session updates:", error);
            showMessage("Real-time updates failed. Please check your network or Firebase rules.", "error");
            setFirebaseError(`Real-time updates failed: ${error.message}.`);
        });

        return () => unsubscribe();
    }, [isAuthReady, db, gameSessionId, showMessage, players, currentPlayerIndex, resolveDiceRolls, firebaseError]);

    // Render loading indicator while Firebase is initializing
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
        <View style={styles.fullScreenContainer}> {/* Added fullScreenContainer for consistent background */}
            {/* Header section */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
                    <Text style={styles.headerIconText}>☰</Text>
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

            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Roll the dice !</Text>
                {players.map((player, index) => (
                    <View
                        key={player.id}
                        style={[
                            styles.playerCard,
                            index === currentPlayerIndex && styles.currentPlayerCard
                        ]}
                    >
                        <Image
                            source={require('../assets/images/boy1.png')} // Placeholder avatar, replace with actual player avatars
                            style={styles.playerAvatar}
                            resizeMode="contain"
                        />
                        <Text style={styles.playerCardName}>{player.name}</Text>
                        <TouchableOpacity
                            style={[
                                styles.rollButton,
                                (player.hasRolled || index !== currentPlayerIndex) && styles.disabledButton
                            ]}
                            onPress={() => handlePlayerRoll(player.id)}
                            disabled={player.hasRolled || index !== currentPlayerIndex}
                        >
                            <Text style={styles.rollButtonText}>Roll the dice!</Text>
                            {/* Display roll value next to button after it's rolled */}
                            {currentRollsDisplay[player.id] !== '?' && (
                                <Text style={styles.rollValueDisplay}>{currentRollsDisplay[player.id]}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ))}
                {message ? <Text style={[styles.messageBox, styles[`messageBox_${messageType}`]]}>{message}</Text> : null}
                {firebaseError && <Text style={styles.errorText}>{firebaseError}</Text>}

                <TouchableOpacity
                    style={styles.playNowButton}
                    onPress={() => {
                        // This button is for when all players have rolled and a decision is made,
                        // or if you want a separate button to proceed after messages.
                        // In the screenshot, this button appears at the end.
                        // I'll make it conditionally visible when a banker is set or after ties are resolved.
                        // For now, it always shows, adjust visibility based on your game flow.
                        Alert.alert("Game State", "This button typically appears after rolls are complete or a tie is resolved.");
                    }}
                >
                    <Text style={styles.playNowButtonText}>Play now !</Text>
                </TouchableOpacity>


                {/* Banker Announcement Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isBankerModalVisible}
                    onRequestClose={() => {
                        setIsBankerModalVisible(false);
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Banker Announced!</Text>
                            {bankerInfo && (
                                <View style={styles.modalPlayerInfo}>
                                    <Image source={require('../assets/images/boy1.png')} style={styles.modalAvatar} /> {/* Placeholder avatar */}
                                    <Text style={styles.modalPlayerName}>{bankerInfo.name}</Text>
                                </View>
                            )}
                            {bankerInfo && <Text style={styles.modalMessage}>{bankerInfo.name} is the Banker!</Text>}

                            {distributorInfo && (
                                <View style={[styles.modalPlayerInfo, { marginTop: 10 }]}>
                                    <Image source={require('../assets/images/boy1.png')} style={styles.modalAvatar} /> {/* Placeholder avatar */}
                                    <Text style={styles.modalPlayerName}>{distributorInfo.name}</Text>
                                </View>
                            )}
                            {distributorInfo && <Text style={styles.modalMessage}>{distributorInfo.name} count 8 from the right and distribute to everyone.</Text>}

                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => {
                                    setIsBankerModalVisible(false);
                                    Alert.alert("Next Phase", "Proceeding to the next game phase: Tile Distribution!");
                                }}
                            >
                                <Text style={styles.buttonText}>Play now!</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
}

// --- StyleSheet for React Native Components (Dark Green Theme with New UI) ---
const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#357C3C', // Deep Green background for the entire screen
    },
    container: {
        flexGrow: 1,
        backgroundColor: 'white', // White background for the main card area
        alignItems: 'center',
        padding: 20, // Padding around the white card
        borderRadius: 15,
        marginHorizontal: 20, // Margins from screen edges
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#357C3C', // Dark Green
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
        fontWeight: 'bold',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50, // Adjust for status bar
        paddingBottom: 20,
        backgroundColor: '#357C3C', // Dark Green header background
    },
    headerIcon: {
        // Styles for your menu/back button icon
    },
    headerIconText: { // Added for the '☰' icon
        fontSize: 28,
        color: 'white',
    },
    headerLogo: {
        width: 100,
        height: 100,
    },
    profileIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white', // White background for profile icon
        borderWidth: 1,
        borderColor: '#E0F2E0',
    },
    title: {
        color: '#357C3C', // Dark Green for title on white background
        fontSize: 24,
        marginBottom: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    // Input styles (not used in this screen, but keeping for theme consistency if needed)
    input: {
        backgroundColor: '#E0F2E0',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    button: { // General button style, used by modal button
        backgroundColor: '#FFD700', // Gold/Yellow button
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
        marginTop: 10,
    },
    buttonText: {
        color: '#357C3C', // Dark Green text for buttons
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    playerCard: {
        backgroundColor: 'white', // White card background
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1, // Subtle border
        borderColor: '#E0F2E0', // Light green border
    },
    currentPlayerCard: {
        borderWidth: 2,
        borderColor: '#357C3C', // Dark green highlight for current player
        shadowColor: '#357C3C',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    playerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 2,
        borderColor: '#FFD700', // Yellow border for avatar
        backgroundColor: '#F0F0F0', // Placeholder background
    },
    playerCardName: {
        fontSize: 18,
        color: '#333', // Dark text on white card
        flex: 1, // Allows name to take available space
        fontWeight: '500',
    },
    rollButton: {
        backgroundColor: '#77DD77', // A slightly lighter green for the button
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        flexDirection: 'row', // To align text and roll value
        alignItems: 'center',
        justifyContent: 'center',
    },
    rollButtonText: {
        color: 'white', // White text on green button
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 5, // Space between text and roll value
    },
    rollValueDisplay: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5, // Space between text and roll value
    },
    disabledButton: {
        backgroundColor: '#A0A0A0', // Gray for disabled buttons
    },
    messageBox: {
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        fontSize: 16,
        textAlign: 'center',
        width: '100%',
    },
    messageBox_info: {
        backgroundColor: '#FDFDD0', // Very light yellow for info
        color: '#6A5F01', // Darker yellow text
        borderColor: '#EFEF88',
        borderWidth: 1,
    },
    messageBox_success: {
        backgroundColor: '#D1FFD1', // Light green for success
        color: '#1A4314', // Dark green text
        borderColor: '#A0E0A0',
        borderWidth: 1,
    },
    messageBox_error: {
        backgroundColor: '#FFD1D1', // Light red for error
        color: '#A01010', // Dark red text
        borderColor: '#E0A0A0',
        borderWidth: 1,
    },
    playNowButton: {
        backgroundColor: '#FFD700', // Gold/Yellow
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
        marginTop: 30, // Increased margin
        width: '85%', // Match card width
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 5,
    },
    playNowButtonText: {
        color: '#357C3C', // Dark Green text
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white', // White background for modal
        padding: 30,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
        width: '90%',
        maxWidth: 450,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        color: '#357C3C', // Dark Green title on white modal
        marginBottom: 15,
        fontWeight: 'bold',
    },
    modalPlayerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    modalAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#FFD700', // Yellow border
    },
    modalPlayerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333', // Dark text
    },
    modalMessage: {
        fontSize: 16,
        color: '#555', // Greyish text
        marginBottom: 10,
        lineHeight: 22,
        textAlign: 'center',
    },
});
